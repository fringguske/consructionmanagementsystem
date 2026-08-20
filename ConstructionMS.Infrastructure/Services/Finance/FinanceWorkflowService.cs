namespace ConstructionMS.Infrastructure.Services.Finance;

using ConstructionMS.Application.Common;
using ConstructionMS.Application.DTOs.Finance;
using ConstructionMS.Application.Services.Auth;
using ConstructionMS.Application.Services.Finance;
using ConstructionMS.Domain.Entities;
using ConstructionMS.Infrastructure.Common;
using ConstructionMS.Infrastructure.Data;
using ConstructionMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System.Data;

public sealed class FinanceWorkflowService : IFinanceWorkflowService
{
    public const decimal CeoExceptionThreshold = 500_000m;
    private static readonly string[] ActiveInvoiceStatuses =
    [
        InvoiceStatuses.PendingReview, InvoiceStatuses.Matched, InvoiceStatuses.AwaitingCeoApproval,
        InvoiceStatuses.ReadyForAuthorization, InvoiceStatuses.Authorized, InvoiceStatuses.Paid
    ];

    private readonly AppDbContext _db;
    private readonly IActorRoleResolver _roles;
    private readonly ControlEventWriter _events;

    public FinanceWorkflowService(AppDbContext db, IActorRoleResolver roles)
    {
        _db = db;
        _roles = roles;
        _events = new ControlEventWriter(db);
    }

    public async Task<PaginatedResult<SupplierInvoiceResponseDto>> GetInvoicesAsync(
        int page, int pageSize, int actorUserId, string actorRole, int? projectId = null, string? status = null)
    {
        await RequireAnyRoleAsync(actorUserId, actorRole, "Procurement Officer", "Finance Officer", "Cashier", "CEO", "Auditor");
        var query = _db.SupplierInvoices.AsNoTracking();
        if (actorRole is not ("CEO" or "Auditor") && !await CanVerifyAllProjectsAsync(actorUserId))
            query = query.Where(item => _db.UserProjectAssignments.Any(assignment => assignment.UserId == actorUserId && assignment.ProjectId == item.ProjectId && assignment.IsActive));
        if (projectId.HasValue) query = query.Where(item => item.ProjectId == projectId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(item => item.Status == status.Trim());
        var pagination = Pagination.Normalize(page, pageSize);
        var total = await query.CountAsync();
        var items = await InvoiceQuery(query).OrderByDescending(item => item.CapturedAt).ThenByDescending(item => item.Id)
            .Skip(pagination.Offset).Take(pagination.PageSize).ToListAsync();
        return Page(items.Select(ToDto).ToList(), total, pagination.Page, pagination.PageSize);
    }

    public async Task<SupplierInvoiceResponseDto> CreateInvoiceAsync(
        CreateSupplierInvoiceRequestDto request, int actorUserId, string actorRole)
    {
        await RequireRoleAsync(actorUserId, actorRole, "Procurement Officer");
        var invoiceNumber = InputNormalizer.RequiredText(request.InvoiceNumber, nameof(request.InvoiceNumber), maximumLength: 100).ToUpperInvariant();
        var quantity = InputNormalizer.Positive(request.Quantity, nameof(request.Quantity), 18, 3);
        var unitPrice = InputNormalizer.Positive(request.UnitPrice, nameof(request.UnitPrice), 18, 2);
        var amount = InputNormalizer.Positive(request.Amount, nameof(request.Amount), 18, 2);
        var document = InputNormalizer.OptionalText(request.DocumentReference, nameof(request.DocumentReference), 500);
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var order = await _db.PurchaseOrders.Include(item => item.Lines).Include(item => item.Requisition)
            .SingleOrDefaultAsync(item => item.Id == request.PurchaseOrderId)
            ?? throw new KeyNotFoundException("The purchase order was not found.");
        if (order.Status != PurchaseOrderWorkflowStates.Issued) throw new InvalidOperationException("An invoice can be captured only for an issued purchase order.");
        await RequireProjectAccessAsync(actorUserId, order.ProjectId);
        var line = order.Lines.Single();
        var acceptedQuantity = await _db.GoodsReceipts
            .Where(item => item.PurchaseOrderId == order.Id)
            .SumAsync(item => (decimal?)item.AcceptedQuantity) ?? 0;
        if (acceptedQuantity != line.Quantity)
            throw new InvalidOperationException("The full purchase-order quantity must be accepted by Stores before its supplier invoice can enter Finance review.");
        if (await _db.SupplierInvoices.AnyAsync(item => item.PurchaseOrderId == order.Id && ActiveInvoiceStatuses.Contains(item.Status)))
            throw new InvalidOperationException("This purchase order already has a live supplier invoice.");
        if (await _db.SupplierInvoices.AnyAsync(item => item.SupplierId == order.SupplierId && item.InvoiceNumber == invoiceNumber))
            throw new InvalidOperationException("That supplier invoice number is already recorded.");
        var now = DateTime.UtcNow;
        var invoice = new SupplierInvoice
        {
            InvoiceNumber = invoiceNumber, PurchaseOrderId = order.Id, ProjectId = order.ProjectId,
            SupplierId = order.SupplierId, Quantity = quantity, UnitPrice = unitPrice, Amount = amount,
            DocumentReference = document, CapturedByUserId = actorUserId, CapturedAt = now, Status = InvoiceStatuses.PendingReview
        };
        _db.SupplierInvoices.Add(invoice);
        await _db.SaveChangesAsync();
        await _events.AppendAsync(Chain(order.RequisitionId), order.RequisitionId, order.ProjectId, "SupplierInvoice", invoice.Id,
            invoice.InvoiceNumber, "InvoiceCaptured", actorUserId, actorRole, new { quantity, unitPrice, amount, document }, now);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await LoadInvoiceAsync(invoice.Id);
    }

    public async Task<SupplierInvoiceResponseDto> ReviewInvoiceAsync(
        long id, ReviewInvoiceRequestDto request, int actorUserId, string actorRole)
    {
        await RequireRoleAsync(actorUserId, actorRole, "Finance Officer");
        var notes = InputNormalizer.OptionalText(request.Notes, nameof(request.Notes), 1_000);
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var invoice = await _db.SupplierInvoices.Include(item => item.PurchaseOrder).ThenInclude(order => order.Lines)
            .SingleOrDefaultAsync(item => item.Id == id) ?? throw new KeyNotFoundException("The supplier invoice was not found.");
        if (invoice.Status != InvoiceStatuses.PendingReview) throw new InvalidOperationException("Only a pending invoice can be matched.");
        if (invoice.CapturedByUserId == actorUserId) throw new UnauthorizedAccessException("The invoice capturer cannot perform the independent Finance match.");
        await RequireProjectAccessAsync(actorUserId, invoice.ProjectId);
        var line = invoice.PurchaseOrder.Lines.Single();
        var accepted = await _db.GoodsReceipts.Where(item => item.PurchaseOrderId == invoice.PurchaseOrderId).SumAsync(item => (decimal?)item.AcceptedQuantity) ?? 0;
        var quantityMatches = invoice.Quantity == accepted;
        var priceMatches = invoice.UnitPrice == line.UnitPrice;
        var amountMatches = invoice.Amount == decimal.Round(invoice.Quantity * invoice.UnitPrice, 2, MidpointRounding.AwayFromZero);
        var allMatch = quantityMatches && priceMatches && amountMatches;
        var now = DateTime.UtcNow;
        invoice.ReceivedQuantitySnapshot = accepted;
        invoice.ReviewedByUserId = actorUserId;
        invoice.ReviewedAt = now;
        invoice.MatchNotes = notes;
        invoice.Status = !allMatch
            ? InvoiceStatuses.Mismatch
            : invoice.Amount > CeoExceptionThreshold
                ? InvoiceStatuses.AwaitingCeoApproval
                : InvoiceStatuses.ReadyForAuthorization;
        await _events.AppendAsync(Chain(invoice.PurchaseOrder.RequisitionId), invoice.PurchaseOrder.RequisitionId,
            invoice.ProjectId, "SupplierInvoice", invoice.Id, invoice.InvoiceNumber,
            allMatch ? (invoice.Status == InvoiceStatuses.AwaitingCeoApproval ? "InvoiceMatchedCeoException" : "InvoiceMatched") : "InvoiceMismatch",
            actorUserId, actorRole, new { quantityMatches, priceMatches, amountMatches, accepted, notes }, now);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await LoadInvoiceAsync(id);
    }

    public async Task<SupplierInvoiceResponseDto> RecordCeoDecisionAsync(
        long id, CeoInvoiceDecisionRequestDto request, int actorUserId, string actorRole)
    {
        await RequireRoleAsync(actorUserId, actorRole, "CEO");
        var notes = InputNormalizer.RequiredText(request.Notes, nameof(request.Notes), 3, 1_000);
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var invoice = await _db.SupplierInvoices.Include(item => item.PurchaseOrder)
            .SingleOrDefaultAsync(item => item.Id == id) ?? throw new KeyNotFoundException("The supplier invoice was not found.");
        if (invoice.Status != InvoiceStatuses.AwaitingCeoApproval) throw new InvalidOperationException("This invoice is not awaiting a CEO exception decision.");
        if (invoice.ReviewedByUserId == actorUserId || invoice.CapturedByUserId == actorUserId)
            throw new UnauthorizedAccessException("The source or Finance reviewer cannot make the CEO exception decision.");
        var now = DateTime.UtcNow;
        invoice.CeoDecisionByUserId = actorUserId; invoice.CeoDecision = request.Approve ? "Approved" : "Rejected";
        invoice.CeoDecisionNotes = notes; invoice.CeoDecisionAt = now;
        invoice.Status = request.Approve ? InvoiceStatuses.ReadyForAuthorization : InvoiceStatuses.Rejected;
        await _events.AppendAsync(Chain(invoice.PurchaseOrder.RequisitionId), invoice.PurchaseOrder.RequisitionId, invoice.ProjectId,
            "SupplierInvoice", invoice.Id, invoice.InvoiceNumber, request.Approve ? "CeoExceptionApproved" : "CeoExceptionRejected",
            actorUserId, actorRole, new { notes }, now);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await LoadInvoiceAsync(id);
    }

    public async Task<SupplierInvoiceResponseDto> AuthorizePaymentAsync(
        long id, AuthorizePaymentRequestDto request, int actorUserId, string actorRole)
    {
        await RequireRoleAsync(actorUserId, actorRole, "Finance Officer");
        var notes = InputNormalizer.OptionalText(request.Notes, nameof(request.Notes), 1_000);
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var invoice = await _db.SupplierInvoices.Include(item => item.PurchaseOrder)
            .SingleOrDefaultAsync(item => item.Id == id) ?? throw new KeyNotFoundException("The supplier invoice was not found.");
        if (invoice.Status != InvoiceStatuses.ReadyForAuthorization) throw new InvalidOperationException("The invoice has not passed all required matching and exception checks.");
        if (invoice.ReviewedByUserId != actorUserId)
            throw new UnauthorizedAccessException("The Finance Officer who completed the documented match must authorize the locked result.");
        await RequireProjectAccessAsync(actorUserId, invoice.ProjectId);
        var now = DateTime.UtcNow;
        var authorization = new PaymentAuthorization
        {
            AuthorizationNumber = Reference("AUT", now), SupplierInvoiceId = invoice.Id, Amount = invoice.Amount,
            AuthorizedByUserId = actorUserId, Notes = notes, AuthorizedAt = now
        };
        _db.PaymentAuthorizations.Add(authorization);
        invoice.Status = InvoiceStatuses.Authorized;
        await _db.SaveChangesAsync();
        await _events.AppendAsync(Chain(invoice.PurchaseOrder.RequisitionId), invoice.PurchaseOrder.RequisitionId, invoice.ProjectId,
            "PaymentAuthorization", authorization.Id, authorization.AuthorizationNumber, "PaymentAuthorized",
            actorUserId, actorRole, new { authorization.Amount, notes }, now);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await LoadInvoiceAsync(id);
    }

    public async Task<PaginatedResult<PaymentAuthorizationResponseDto>> GetAuthorizationsAsync(
        int page, int pageSize, int actorUserId, string actorRole, bool unpaidOnly = false)
    {
        await RequireAnyRoleAsync(actorUserId, actorRole, "Finance Officer", "Cashier", "CEO", "Auditor");
        var query = _db.PaymentAuthorizations.AsNoTracking();
        if (actorRole is not ("CEO" or "Auditor") && !await CanVerifyAllProjectsAsync(actorUserId))
            query = query.Where(item => _db.UserProjectAssignments.Any(assignment => assignment.UserId == actorUserId && assignment.ProjectId == item.SupplierInvoice.ProjectId && assignment.IsActive));
        if (unpaidOnly) query = query.Where(item => !_db.Payments.Any(payment => payment.PaymentAuthorizationId == item.Id));
        var pagination = Pagination.Normalize(page, pageSize);
        var total = await query.CountAsync();
        var items = await AuthorizationQuery(query).OrderByDescending(item => item.AuthorizedAt)
            .Skip(pagination.Offset).Take(pagination.PageSize).ToListAsync();
        return Page(items.Select(ToDto).ToList(), total, pagination.Page, pagination.PageSize);
    }

    public async Task<PaymentResponseDto> ExecutePaymentAsync(
        long authorizationId, ExecutePaymentRequestDto request, int actorUserId, string actorRole)
    {
        await RequireRoleAsync(actorUserId, actorRole, "Cashier");
        var method = InputNormalizer.RequiredText(request.Method, nameof(request.Method), maximumLength: 30);
        if (method is not ("BankTransfer" or "MPesa" or "Cheque" or "Cash"))
            throw new ArgumentException("Payment method must be BankTransfer, MPesa, Cheque, or Cash.");
        var externalReference = InputNormalizer.RequiredText(request.ExternalReference, nameof(request.ExternalReference), maximumLength: 100).ToUpperInvariant();
        var evidence = InputNormalizer.OptionalText(request.EvidenceReference, nameof(request.EvidenceReference), 500);
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var authorization = await _db.PaymentAuthorizations.Include(item => item.SupplierInvoice).ThenInclude(item => item.PurchaseOrder)
            .SingleOrDefaultAsync(item => item.Id == authorizationId) ?? throw new KeyNotFoundException("The payment authorization was not found.");
        if (authorization.SupplierInvoice.Status != InvoiceStatuses.Authorized) throw new InvalidOperationException("This authorization is not available for payment.");
        if (authorization.AuthorizedByUserId == actorUserId) throw new UnauthorizedAccessException("The Finance authorizer cannot execute the payment.");
        await RequireProjectAccessAsync(actorUserId, authorization.SupplierInvoice.ProjectId);
        if (await _db.Payments.AnyAsync(item => item.PaymentAuthorizationId == authorization.Id)) throw new InvalidOperationException("This authorization has already been paid.");
        if (await _db.Payments.AnyAsync(item => item.ExternalReference == externalReference)
            || await _db.PettyCashDisbursements.AnyAsync(item => item.ExternalReference == externalReference))
            throw new InvalidOperationException("That external payment reference is already recorded.");
        var now = DateTime.UtcNow;
        var payment = new Payment
        {
            PaymentNumber = Reference("PAY", now), PaymentAuthorizationId = authorization.Id, Amount = authorization.Amount,
            Method = method, ExternalReference = externalReference, EvidenceReference = evidence,
            PaidByUserId = actorUserId, PaidAt = now
        };
        _db.Payments.Add(payment);
        authorization.SupplierInvoice.Status = InvoiceStatuses.Paid;
        await _db.SaveChangesAsync();
        var receipt = new PaymentReceipt
        {
            ReceiptNumber = Reference("RCT", now), PaymentId = payment.Id, Amount = payment.Amount,
            IssuedByUserId = actorUserId, IssuedAt = now
        };
        _db.PaymentReceipts.Add(receipt);
        await _events.AppendAsync(Chain(authorization.SupplierInvoice.PurchaseOrder.RequisitionId),
            authorization.SupplierInvoice.PurchaseOrder.RequisitionId, authorization.SupplierInvoice.ProjectId,
            "Payment", payment.Id, payment.PaymentNumber, "PaymentExecuted", actorUserId, actorRole,
            new { payment.Amount, method, externalReference, receipt.ReceiptNumber, evidence }, now);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await LoadPaymentAsync(payment.Id);
    }

    public async Task<PaginatedResult<PaymentResponseDto>> GetPaymentsAsync(int page, int pageSize, int actorUserId, string actorRole)
    {
        await RequireAnyRoleAsync(actorUserId, actorRole, "Finance Officer", "Cashier", "CEO", "Auditor");
        var query = _db.Payments.AsNoTracking();
        if (actorRole is not ("CEO" or "Auditor") && !await CanVerifyAllProjectsAsync(actorUserId))
            query = query.Where(item => _db.UserProjectAssignments.Any(assignment => assignment.UserId == actorUserId && assignment.ProjectId == item.PaymentAuthorization.SupplierInvoice.ProjectId && assignment.IsActive));
        var pagination = Pagination.Normalize(page, pageSize);
        var total = await query.CountAsync();
        var items = await PaymentQuery(query).OrderByDescending(item => item.PaidAt)
            .Skip(pagination.Offset).Take(pagination.PageSize).ToListAsync();
        return Page(items.Select(ToDto).ToList(), total, pagination.Page, pagination.PageSize);
    }

    public async Task<PaginatedResult<ControlEventResponseDto>> GetControlEventsAsync(
        int page, int pageSize, int actorUserId, string actorRole, int? projectId = null, int? requisitionId = null)
    {
        await RequireAnyRoleAsync(actorUserId, actorRole, "CEO", "Auditor");
        var controlQuery = _db.ControlEvents.AsNoTracking();
        if (projectId.HasValue) controlQuery = controlQuery.Where(item => item.ProjectId == projectId.Value);
        if (requisitionId.HasValue) controlQuery = controlQuery.Where(item => item.RequisitionId == requisitionId.Value);
        var controls = await controlQuery.Include(item => item.Project).Include(item => item.ActorUser)
            .Select(item => new ControlEventResponseDto
            {
                ChainKey = item.ChainKey, SequenceNumber = item.SequenceNumber, RequisitionId = item.RequisitionId,
                ProjectId = item.ProjectId, ProjectName = item.Project.Name, EntityType = item.EntityType, EntityId = item.EntityId,
                ReferenceNumber = item.ReferenceNumber, EventType = item.EventType, ActorName = item.ActorUser.FullName,
                ActorRole = item.ActorRole,
                MaterialName = item.Requisition == null ? null : item.Requisition.Material.Name,
                MaterialUnit = item.Requisition == null ? null : item.Requisition.Material.Unit,
                RequestedQuantity = item.Requisition == null ? null : item.Requisition.Quantity,
                DetailsJson = item.DetailsJson, OccurredAt = item.OccurredAt, EventHash = item.EventHash
            }).ToListAsync();

        var reqQuery = _db.RequisitionApprovalEvents.AsNoTracking().AsQueryable();
        if (projectId.HasValue) reqQuery = reqQuery.Where(item => item.Requisition.ProjectId == projectId.Value);
        if (requisitionId.HasValue) reqQuery = reqQuery.Where(item => item.RequisitionId == requisitionId.Value);
        var requisitions = await reqQuery.Select(item => new ControlEventResponseDto
        {
            ChainKey = "REQ-" + item.RequisitionId, SequenceNumber = item.SequenceNumber, RequisitionId = item.RequisitionId,
            ProjectId = item.Requisition.ProjectId, ProjectName = item.Requisition.Project.Name, EntityType = "Requisition", EntityId = item.RequisitionId,
            ReferenceNumber = "MR-" + item.RequisitionId, EventType = item.EventType, ActorName = item.ActorUser.FullName,
            ActorRole = item.ActorRole, MaterialName = item.Requisition.Material.Name,
            MaterialUnit = item.Requisition.Material.Unit, RequestedQuantity = item.Requisition.Quantity,
            DetailsJson = item.EventDataJson, OccurredAt = item.OccurredAt, EventHash = item.EventHash
        }).ToListAsync();

        var sourcingQuery = _db.SourcingRoundEvents.AsNoTracking().AsQueryable();
        if (projectId.HasValue) sourcingQuery = sourcingQuery.Where(item => item.SourcingRound.Requisition.ProjectId == projectId.Value);
        if (requisitionId.HasValue) sourcingQuery = sourcingQuery.Where(item => item.SourcingRound.RequisitionId == requisitionId.Value);
        var sourcing = await sourcingQuery.Select(item => new ControlEventResponseDto
        {
            ChainKey = "REQ-" + item.SourcingRound.RequisitionId, SequenceNumber = 1000 + (int)item.Id,
            RequisitionId = item.SourcingRound.RequisitionId, ProjectId = item.SourcingRound.Requisition.ProjectId,
            ProjectName = item.SourcingRound.Requisition.Project.Name, EntityType = "SourcingRound", EntityId = item.SourcingRoundId,
            ReferenceNumber = "SRC-" + item.SourcingRoundId, EventType = item.EventType, ActorName = item.ActorUser.FullName,
            ActorRole = item.ActorRole, MaterialName = item.SourcingRound.Requisition.Material.Name,
            MaterialUnit = item.SourcingRound.Requisition.Material.Unit, RequestedQuantity = item.SourcingRound.Requisition.Quantity,
            DetailsJson = item.Notes, OccurredAt = item.OccurredAt, EventHash = string.Empty
        }).ToListAsync();

        var poQuery = _db.PurchaseOrderEvents.AsNoTracking().AsQueryable();
        if (projectId.HasValue) poQuery = poQuery.Where(item => item.PurchaseOrder.ProjectId == projectId.Value);
        if (requisitionId.HasValue) poQuery = poQuery.Where(item => item.PurchaseOrder.RequisitionId == requisitionId.Value);
        var orders = await poQuery.Select(item => new ControlEventResponseDto
        {
            ChainKey = "REQ-" + item.PurchaseOrder.RequisitionId, SequenceNumber = 2000 + (int)item.Id,
            RequisitionId = item.PurchaseOrder.RequisitionId, ProjectId = item.PurchaseOrder.ProjectId,
            ProjectName = item.PurchaseOrder.Project.Name, EntityType = "PurchaseOrder", EntityId = item.PurchaseOrderId,
            ReferenceNumber = item.PurchaseOrder.PurchaseOrderNumber, EventType = item.EventType, ActorName = item.ActorUser.FullName,
            ActorRole = item.ActorRole, MaterialName = item.PurchaseOrder.Requisition.Material.Name,
            MaterialUnit = item.PurchaseOrder.Requisition.Material.Unit, RequestedQuantity = item.PurchaseOrder.Requisition.Quantity,
            DetailsJson = item.DetailsJson, OccurredAt = item.OccurredAt, EventHash = string.Empty
        }).ToListAsync();

        var all = requisitions.Concat(sourcing).Concat(orders).Concat(controls)
            .OrderByDescending(item => item.OccurredAt).ThenByDescending(item => item.SequenceNumber).ToList();
        var pagination = Pagination.Normalize(page, pageSize);
        return Page(all.Skip(pagination.Offset).Take(pagination.PageSize).ToList(), all.Count, pagination.Page, pagination.PageSize);
    }

    private static IQueryable<SupplierInvoice> InvoiceQuery(IQueryable<SupplierInvoice> query) => query
        .Include(item => item.PurchaseOrder).ThenInclude(order => order.Lines).ThenInclude(line => line.Material)
        .Include(item => item.PurchaseOrder).ThenInclude(order => order.Requisition)
        .Include(item => item.Project).Include(item => item.Supplier).Include(item => item.CapturedByUser)
        .Include(item => item.ReviewedByUser).Include(item => item.CeoDecisionByUser)
        .Include(item => item.PurchaseOrder)
        .AsSplitQuery();

    private async Task<SupplierInvoiceResponseDto> LoadInvoiceAsync(long id)
    {
        var invoice = await InvoiceQuery(_db.SupplierInvoices.AsNoTracking()).SingleAsync(item => item.Id == id);
        var authorization = await AuthorizationQuery(_db.PaymentAuthorizations.AsNoTracking().Where(item => item.SupplierInvoiceId == id)).SingleOrDefaultAsync();
        var payment = authorization is null ? null : await PaymentQuery(_db.Payments.AsNoTracking().Where(item => item.PaymentAuthorizationId == authorization.Id)).SingleOrDefaultAsync();
        return ToDto(invoice, authorization, payment);
    }

    private static SupplierInvoiceResponseDto ToDto(SupplierInvoice invoice) => ToDto(invoice, null, null);

    private static SupplierInvoiceResponseDto ToDto(SupplierInvoice invoice, PaymentAuthorization? authorization, Payment? payment)
    {
        var line = invoice.PurchaseOrder.Lines.Single();
        var accepted = invoice.ReceivedQuantitySnapshot ?? 0;
        return new SupplierInvoiceResponseDto
        {
            Id = invoice.Id, InvoiceNumber = invoice.InvoiceNumber, PurchaseOrderId = invoice.PurchaseOrderId,
            PurchaseOrderNumber = invoice.PurchaseOrder.PurchaseOrderNumber, RequisitionId = invoice.PurchaseOrder.RequisitionId,
            ProjectId = invoice.ProjectId, ProjectName = invoice.Project.Name, SupplierId = invoice.SupplierId,
            SupplierName = invoice.Supplier.Name, MaterialName = line.Material.Name, MaterialUnit = line.Material.Unit,
            OrderedQuantity = line.Quantity, OrderedUnitPrice = line.UnitPrice, AcceptedQuantity = accepted,
            Quantity = invoice.Quantity, UnitPrice = invoice.UnitPrice, Amount = invoice.Amount,
            DocumentReference = invoice.DocumentReference, Status = invoice.Status,
            QuantityMatches = invoice.ReviewedAt.HasValue && invoice.Quantity == accepted,
            PriceMatches = invoice.ReviewedAt.HasValue && invoice.UnitPrice == line.UnitPrice,
            AmountMatches = invoice.ReviewedAt.HasValue && invoice.Amount == decimal.Round(invoice.Quantity * invoice.UnitPrice, 2, MidpointRounding.AwayFromZero),
            RequiresCeoApproval = invoice.Amount > CeoExceptionThreshold, MatchNotes = invoice.MatchNotes,
            CapturedByName = invoice.CapturedByUser.FullName, CapturedAt = invoice.CapturedAt,
            ReviewedByName = invoice.ReviewedByUser?.FullName, ReviewedAt = invoice.ReviewedAt,
            CeoDecision = invoice.CeoDecision, CeoDecisionNotes = invoice.CeoDecisionNotes, CeoDecisionAt = invoice.CeoDecisionAt,
            Authorization = authorization is null ? null : ToDto(authorization),
            Payment = payment is null ? null : ToDto(payment)
        };
    }

    private static IQueryable<PaymentAuthorization> AuthorizationQuery(IQueryable<PaymentAuthorization> query) => query
        .Include(item => item.AuthorizedByUser).Include(item => item.SupplierInvoice).ThenInclude(item => item.Supplier)
        .Include(item => item.SupplierInvoice).ThenInclude(item => item.Project);
    private static PaymentAuthorizationResponseDto ToDto(PaymentAuthorization item) => new()
    {
        Id = item.Id, AuthorizationNumber = item.AuthorizationNumber, SupplierInvoiceId = item.SupplierInvoiceId,
        Amount = item.Amount, SupplierName = item.SupplierInvoice.Supplier.Name, ProjectName = item.SupplierInvoice.Project.Name,
        AuthorizedByName = item.AuthorizedByUser.FullName, Notes = item.Notes, AuthorizedAt = item.AuthorizedAt,
        IsPaid = item.SupplierInvoice.Status == InvoiceStatuses.Paid
    };

    private static IQueryable<Payment> PaymentQuery(IQueryable<Payment> query) => query
        .Include(item => item.PaidByUser).Include(item => item.PaymentAuthorization)
        .Include(item => item.PaymentAuthorization).ThenInclude(item => item.SupplierInvoice)
        .Include(item => item.Receipt)
        .AsSplitQuery();
    private async Task<PaymentResponseDto> LoadPaymentAsync(long id) => ToDto(await PaymentQuery(_db.Payments.AsNoTracking()).SingleAsync(item => item.Id == id));
    private static PaymentResponseDto ToDto(Payment item)
    {
        return new PaymentResponseDto
        {
            Id = item.Id, PaymentNumber = item.PaymentNumber, PaymentAuthorizationId = item.PaymentAuthorizationId,
            Amount = item.Amount, Method = item.Method, ExternalReference = item.ExternalReference,
            EvidenceReference = item.EvidenceReference, PaidByName = item.PaidByUser.FullName, PaidAt = item.PaidAt,
            ReceiptNumber = item.Receipt?.ReceiptNumber ?? string.Empty
        };
    }

    private async Task RequireRoleAsync(int userId, string claimedRole, string requiredRole) => await RequireAnyRoleAsync(userId, claimedRole, requiredRole);
    private async Task RequireAnyRoleAsync(int userId, string claimedRole, params string[] allowed)
    {
        var actor = await _roles.ResolveAsync(userId);
        if (actor is null || actor.EffectiveRole != claimedRole || !allowed.Contains(actor.EffectiveRole))
            throw new UnauthorizedAccessException($"This action requires one of these roles: {string.Join(", ", allowed)}.");
    }
    private async Task RequireProjectAccessAsync(int userId, int projectId)
    {
        if (!await CanVerifyAllProjectsAsync(userId)
            && !await _db.UserProjectAssignments.AsNoTracking().AnyAsync(item => item.UserId == userId && item.ProjectId == projectId && item.IsActive))
            throw new UnauthorizedAccessException("You are not assigned to this project.");
    }
    private async Task<bool> CanVerifyAllProjectsAsync(int userId) =>
        (await _roles.ResolveAsync(userId))?.CanSwitchRoles == true;
    private static string Reference(string prefix, DateTime now) => $"{prefix}-{now:yyMMdd}-{Guid.NewGuid():N}"[..30];
    private static string Chain(int requisitionId) => $"REQ-{requisitionId}";
    private static PaginatedResult<T> Page<T>(IReadOnlyList<T> items, int total, int page, int pageSize) => new()
    { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
}

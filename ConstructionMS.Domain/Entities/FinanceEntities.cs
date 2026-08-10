namespace ConstructionMS.Domain.Entities;

public static class InvoiceStatuses
{
    public const string PendingReview = "PendingReview";
    public const string Matched = "Matched";
    public const string Mismatch = "Mismatch";
    public const string AwaitingCeoApproval = "AwaitingCeoApproval";
    public const string ReadyForAuthorization = "ReadyForAuthorization";
    public const string Authorized = "Authorized";
    public const string Paid = "Paid";
    public const string Returned = "Returned";
    public const string Rejected = "Rejected";
}

/// <summary>Immutable supplier invoice source, reviewed against the PO and accepted GRNs.</summary>
public sealed class SupplierInvoice
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? DocumentReference { get; set; }
    public int CapturedByUserId { get; set; }
    public User CapturedByUser { get; set; } = null!;
    public DateTime CapturedAt { get; set; }
    public string Status { get; set; } = InvoiceStatuses.PendingReview;
    public decimal? ReceivedQuantitySnapshot { get; set; }
    public string? MatchNotes { get; set; }
    public int? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? CeoDecisionByUserId { get; set; }
    public User? CeoDecisionByUser { get; set; }
    public string? CeoDecision { get; set; }
    public string? CeoDecisionNotes { get; set; }
    public DateTime? CeoDecisionAt { get; set; }
}

/// <summary>Finance authority for one locked invoice amount.</summary>
public sealed class PaymentAuthorization
{
    public long Id { get; set; }
    public string AuthorizationNumber { get; set; } = string.Empty;
    public long SupplierInvoiceId { get; set; }
    public SupplierInvoice SupplierInvoice { get; set; } = null!;
    public decimal Amount { get; set; }
    public int AuthorizedByUserId { get; set; }
    public User AuthorizedByUser { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTime AuthorizedAt { get; set; }
}

/// <summary>Immutable evidence that Cashier executed a Finance-authorized instruction.</summary>
public sealed class Payment
{
    public long Id { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public long PaymentAuthorizationId { get; set; }
    public PaymentAuthorization PaymentAuthorization { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public string? EvidenceReference { get; set; }
    public int PaidByUserId { get; set; }
    public User PaidByUser { get; set; } = null!;
    public DateTime PaidAt { get; set; }
    public PaymentReceipt? Receipt { get; set; }
}

/// <summary>System receipt tied one-to-one to an executed payment.</summary>
public sealed class PaymentReceipt
{
    public long Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public long PaymentId { get; set; }
    public Payment Payment { get; set; } = null!;
    public decimal Amount { get; set; }
    public int IssuedByUserId { get; set; }
    public User IssuedByUser { get; set; } = null!;
    public DateTime IssuedAt { get; set; }
}

/// <summary>Hash-linked, append-only event used for CEO and Auditor cross-module trace.</summary>
public sealed class ControlEvent
{
    public long Id { get; set; }
    public string ChainKey { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
    public int? RequisitionId { get; set; }
    public Requisition? Requisition { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string EntityType { get; set; } = string.Empty;
    public long EntityId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public int ActorUserId { get; set; }
    public User ActorUser { get; set; } = null!;
    public string ActorRole { get; set; } = string.Empty;
    public string? DetailsJson { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? PreviousEventHash { get; set; }
    public string EventHash { get; set; } = string.Empty;
}

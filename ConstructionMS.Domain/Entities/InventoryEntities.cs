namespace ConstructionMS.Domain.Entities;

public static class MaterialIssueStatuses
{
    public const string AwaitingConfirmation = "AwaitingConfirmation";
    public const string Confirmed = "Confirmed";
    public const string Disputed = "Disputed";
}

public static class StockTransferStatuses
{
    public const string PendingDispatch = "PendingDispatch";
    public const string InTransit = "InTransit";
    public const string Received = "Received";
    public const string Disputed = "Disputed";
}

public static class StockCountStatuses
{
    public const string AwaitingReview = "AwaitingReview";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

/// <summary>Independent evidence that a Storekeeper physically received an issued PO line.</summary>
public sealed class GoodsReceipt
{
    public long Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public int PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public int PurchaseOrderLineId { get; set; }
    public PurchaseOrderLine PurchaseOrderLine { get; set; } = null!;
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal DeliveredQuantity { get; set; }
    public decimal AcceptedQuantity { get; set; }
    public decimal RejectedQuantity { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string DeliveryNoteReference { get; set; } = string.Empty;
    public string? EvidenceReference { get; set; }
    public string? DiscrepancyNotes { get; set; }
    public int ReceivedByUserId { get; set; }
    public User ReceivedByUser { get; set; } = null!;
    public DateTime ReceivedAt { get; set; }
}

/// <summary>Current store balance. Every change is backed by an immutable ledger entry.</summary>
public sealed class StockBalance
{
    public long Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal QuantityOnHand { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Append-only proof of every quantity entering or leaving a project store.</summary>
public sealed class StockLedgerEntry
{
    public long Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public string MovementType { get; set; } = string.Empty;
    public decimal QuantityDelta { get; set; }
    public decimal BalanceAfter { get; set; }
    public string ReferenceType { get; set; } = string.Empty;
    public long ReferenceId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public int ActorUserId { get; set; }
    public User ActorUser { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTime OccurredAt { get; set; }
}

/// <summary>Material released by a Storekeeper against one approved Foreman requisition.</summary>
public sealed class MaterialIssue
{
    public long Id { get; set; }
    public string IssueNumber { get; set; } = string.Empty;
    public int RequisitionId { get; set; }
    public Requisition Requisition { get; set; } = null!;
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal QuantityIssued { get; set; }
    public int IssuedByUserId { get; set; }
    public User IssuedByUser { get; set; } = null!;
    public int IssuedToUserId { get; set; }
    public User IssuedToUser { get; set; } = null!;
    public string Status { get; set; } = MaterialIssueStatuses.AwaitingConfirmation;
    public string? Notes { get; set; }
    public DateTime IssuedAt { get; set; }
    public int? ConfirmedByUserId { get; set; }
    public User? ConfirmedByUser { get; set; }
    public decimal? ConfirmedQuantity { get; set; }
    public string? ConfirmationNotes { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public ICollection<MaterialUsageRecord> UsageRecords { get; set; } = [];
}

/// <summary>Append-only Foreman record of material used or wasted after issue.</summary>
public sealed class MaterialUsageRecord
{
    public long Id { get; set; }
    public long MaterialIssueId { get; set; }
    public MaterialIssue MaterialIssue { get; set; } = null!;
    public string UsageType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string PurposeOrReason { get; set; } = string.Empty;
    public string? EvidenceReference { get; set; }
    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;
    public DateTime RecordedAt { get; set; }
}

/// <summary>Dual-confirmed material movement between project stores.</summary>
public sealed class StockTransfer
{
    public long Id { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public int FromProjectId { get; set; }
    public Project FromProject { get; set; } = null!;
    public int ToProjectId { get; set; }
    public Project ToProject { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = StockTransferStatuses.PendingDispatch;
    public int RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;
    public DateTime RequestedAt { get; set; }
    public int? DispatchedByUserId { get; set; }
    public User? DispatchedByUser { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public int? ReceivedByUserId { get; set; }
    public User? ReceivedByUser { get; set; }
    public decimal? ReceivedQuantity { get; set; }
    public string? ReceiptNotes { get; set; }
    public DateTime? ReceivedAt { get; set; }
}

/// <summary>Physical count submitted by Stores and independently decided by a Supervisor.</summary>
public sealed class StockCount
{
    public long Id { get; set; }
    public string CountNumber { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal SystemQuantity { get; set; }
    public decimal CountedQuantity { get; set; }
    public decimal Variance { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = StockCountStatuses.AwaitingReview;
    public int CountedByUserId { get; set; }
    public User CountedByUser { get; set; } = null!;
    public DateTime CountedAt { get; set; }
    public int? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

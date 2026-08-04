using Microsoft.EntityFrameworkCore;
using ConstructionMS.Domain.Entities;

namespace ConstructionMS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private const string NormalizedEmailSql =
        "lower(btrim(\"Email\", ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13)))";

    private const string NormalizedKraPinSql =
        "nullif(upper(btrim(\"KraPin\", ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13))), '')";

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        GuardAppendOnlyEvidence();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        GuardAppendOnlyEvidence();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Requisition> Requisitions => Set<Requisition>();
    public DbSet<UserProjectAssignment> UserProjectAssignments => Set<UserProjectAssignment>();
    public DbSet<EngineerTechnicalCheck> EngineerTechnicalChecks => Set<EngineerTechnicalCheck>();
    public DbSet<RequisitionApprovalEvent> RequisitionApprovalEvents => Set<RequisitionApprovalEvent>();
    public DbSet<CostCode> CostCodes => Set<CostCode>();
    public DbSet<ProjectBudget> ProjectBudgets => Set<ProjectBudget>();
    public DbSet<ProjectBudgetAllocation> ProjectBudgetAllocations => Set<ProjectBudgetAllocation>();
    public DbSet<ProjectProgressVerification> ProjectProgressVerifications => Set<ProjectProgressVerification>();
    public DbSet<SourcingRound> SourcingRounds => Set<SourcingRound>();
    public DbSet<SourcingRoundEvent> SourcingRoundEvents => Set<SourcingRoundEvent>();
    public DbSet<SupplierQuote> SupplierQuotes => Set<SupplierQuote>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<PurchaseOrderEvent> PurchaseOrderEvents => Set<PurchaseOrderEvent>();

    private void GuardAppendOnlyEvidence()
    {
        GuardAssignmentHistory();
        GuardPurchaseOrderCommercialFields();

        var changedEvidence = ChangeTracker.Entries()
            .FirstOrDefault(entry =>
                entry.State is EntityState.Modified or EntityState.Deleted
                && entry.Entity is EngineerTechnicalCheck
                    or RequisitionApprovalEvent
                    or ProjectBudget
                    or ProjectBudgetAllocation
                    or ProjectProgressVerification
                    or SupplierQuote
                    or SourcingRoundEvent
                    or PurchaseOrderLine
                    or PurchaseOrderEvent);

        if (changedEvidence is not null)
        {
            throw new InvalidOperationException(
                $"{changedEvidence.Metadata.ClrType.Name} is append-only and cannot be modified or deleted.");
        }
    }

    private void GuardPurchaseOrderCommercialFields()
    {
        var protectedProperties = new[]
        {
            nameof(PurchaseOrder.PurchaseOrderNumber),
            nameof(PurchaseOrder.ProjectId),
            nameof(PurchaseOrder.RequisitionId),
            nameof(PurchaseOrder.SupplierId),
            nameof(PurchaseOrder.SupplierQuoteId),
            nameof(PurchaseOrder.CreatedByUserId),
            nameof(PurchaseOrder.CreatedAt)
        };

        foreach (var entry in ChangeTracker.Entries<PurchaseOrder>()
                     .Where(entry => entry.State == EntityState.Modified))
        {
            if (protectedProperties.Any(property => entry.Property(property).IsModified))
            {
                throw new InvalidOperationException(
                    "Purchase-order commercial source fields are immutable; cancel and create a replacement PO.");
            }
        }
    }

    private void GuardAssignmentHistory()
    {
        foreach (var entry in ChangeTracker.Entries<UserProjectAssignment>())
        {
            if (entry.State == EntityState.Deleted)
            {
                throw new InvalidOperationException(
                    "Project-assignment periods cannot be deleted.");
            }

            if (entry.State != EntityState.Modified)
            {
                continue;
            }

            var original = entry.OriginalValues;
            var current = entry.CurrentValues;
            var isValidClosure = original.GetValue<bool>(nameof(UserProjectAssignment.IsActive))
                && !current.GetValue<bool>(nameof(UserProjectAssignment.IsActive))
                && original.GetValue<DateTime?>(nameof(UserProjectAssignment.EndedAt)) is null
                && current.GetValue<DateTime?>(nameof(UserProjectAssignment.EndedAt)) is not null
                && original.GetValue<int>(nameof(UserProjectAssignment.UserId))
                    == current.GetValue<int>(nameof(UserProjectAssignment.UserId))
                && original.GetValue<int>(nameof(UserProjectAssignment.ProjectId))
                    == current.GetValue<int>(nameof(UserProjectAssignment.ProjectId))
                && original.GetValue<int?>(nameof(UserProjectAssignment.AssignedByUserId))
                    == current.GetValue<int?>(nameof(UserProjectAssignment.AssignedByUserId))
                && original.GetValue<DateTime>(nameof(UserProjectAssignment.CreatedAt))
                    == current.GetValue<DateTime>(nameof(UserProjectAssignment.CreatedAt));

            if (!isValidClosure)
            {
                throw new InvalidOperationException(
                    "An assignment period may only transition once from active to ended.");
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var seedProjectDate = new DateOnly(2026, 1, 1);

        ConfigureRoles(modelBuilder, seedDate);
        ConfigureUsers(modelBuilder);
        ConfigureProjects(modelBuilder, seedDate, seedProjectDate);
        ConfigureMaterials(modelBuilder);
        ConfigureSuppliers(modelBuilder);
        ConfigureRequisitions(modelBuilder);
        ConfigureUserProjectAssignments(modelBuilder);
        ConfigureEngineerTechnicalChecks(modelBuilder);
        ConfigureRequisitionApprovalEvents(modelBuilder);
        ConfigureCostCodes(modelBuilder);
        ConfigureProjectBudgets(modelBuilder);
        ConfigureProjectBudgetAllocations(modelBuilder);
        ConfigureProjectProgressVerifications(modelBuilder);
        ConfigureSourcingRounds(modelBuilder);
        ConfigureSourcingRoundEvents(modelBuilder);
        ConfigureSupplierQuotes(modelBuilder);
        ConfigurePurchaseOrders(modelBuilder);
        ConfigurePurchaseOrderLines(modelBuilder);
        ConfigurePurchaseOrderEvents(modelBuilder);
    }

    private static void ConfigureRoles(ModelBuilder modelBuilder, DateTime seedDate)
    {
        var roles = modelBuilder.Entity<Role>();

        roles.Property(role => role.RoleName).HasMaxLength(80);
        roles.Property(role => role.Description).HasMaxLength(300);
        roles.HasIndex(role => role.RoleName).IsUnique();

        roles.HasData(
            new Role
            {
                Id = 1,
                RoleName = "CEO",
                Description = "Executive oversight and high-value approvals; no routine transaction entry",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 2,
                RoleName = "Supervisor",
                Description = "Coordinates assigned projects and approves work within delegated limits",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 3,
                RoleName = "Engineer",
                Description = "Verifies technical requirements and construction progress",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 4,
                RoleName = "Foreman",
                Description = "Requests materials and records their use on site",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 5,
                RoleName = "Cashier",
                Description = "Executes approved payments and records payment evidence",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 6,
                RoleName = "Storekeeper",
                Description = "Receives, safeguards, issues and counts inventory",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 7,
                RoleName = "Procurement Officer",
                Description = "Sources suppliers and prepares purchase orders",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 8,
                RoleName = "Auditor",
                Description = "Read-only oversight of transactions and audit evidence",
                CreatedAt = seedDate
            },
            new Role
            {
                Id = 9,
                RoleName = "Finance Officer",
                Description = "Performs three-way matching and independently authorizes payments",
                CreatedAt = seedDate
            });
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        var users = modelBuilder.Entity<User>();

        users.Property(user => user.FullName).HasMaxLength(150);
        users.Property(user => user.PhoneNumber).HasMaxLength(30);
        users.Property(user => user.Email).HasMaxLength(254);
        users.Property(user => user.PasswordHash).HasMaxLength(255);
        users.Property<string>("NormalizedEmail")
            .HasComputedColumnSql(NormalizedEmailSql, stored: true);
        users.HasIndex("NormalizedEmail")
            .IsUnique();

        users.HasOne(user => user.Role)
            .WithMany()
            .HasForeignKey(user => user.RoleId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureProjects(
        ModelBuilder modelBuilder,
        DateTime seedDate,
        DateOnly seedProjectDate)
    {
        var projects = modelBuilder.Entity<Project>();

        projects.Property(project => project.Name).HasMaxLength(150);
        projects.Property(project => project.Location).HasMaxLength(300);
        projects.Property(project => project.Budget).HasPrecision(18, 2);
        projects.Property(project => project.Status).HasMaxLength(30);
        projects.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_Projects_Budget_NonNegative",
                "\"Budget\" <> 'NaN'::numeric AND \"Budget\" >= 0");
            table.HasCheckConstraint(
                "CK_Projects_DateRange",
                "\"EndDate\" IS NULL OR \"EndDate\" >= \"StartDate\"");
        });

        projects.HasData(
            new Project { Id = 1, Name = "Gilgal 1", Budget = 0, StartDate = seedProjectDate, Status = "Active", CreatedAt = seedDate },
            new Project { Id = 2, Name = "Gilgal 2", Budget = 0, StartDate = seedProjectDate, Status = "Active", CreatedAt = seedDate },
            new Project { Id = 3, Name = "SNEP HQ", Budget = 0, StartDate = seedProjectDate, Status = "Active", CreatedAt = seedDate },
            new Project { Id = 4, Name = "Church", Budget = 0, StartDate = seedProjectDate, Status = "Active", CreatedAt = seedDate }
        );
    }

    private static void ConfigureMaterials(ModelBuilder modelBuilder)
    {
        var materials = modelBuilder.Entity<Material>();

        materials.Property(material => material.Name).HasMaxLength(150);
        materials.Property(material => material.Category).HasMaxLength(100);
        materials.Property(material => material.Unit).HasMaxLength(30);
        materials.Property(material => material.StandardPrice).HasPrecision(18, 2);
        materials.Property(material => material.ReorderLevel).HasPrecision(18, 3);
        materials.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_Materials_StandardPrice_NonNegative",
                "\"StandardPrice\" <> 'NaN'::numeric AND \"StandardPrice\" >= 0");
            table.HasCheckConstraint(
                "CK_Materials_ReorderLevel_NonNegative",
                "\"ReorderLevel\" <> 'NaN'::numeric AND \"ReorderLevel\" >= 0");
        });
    }

    private static void ConfigureSuppliers(ModelBuilder modelBuilder)
    {
        var suppliers = modelBuilder.Entity<Supplier>();

        suppliers.Property(supplier => supplier.Name).HasMaxLength(200);
        suppliers.Property(supplier => supplier.ContactPerson).HasMaxLength(150);
        suppliers.Property(supplier => supplier.PhoneNumber).HasMaxLength(30);
        suppliers.Property(supplier => supplier.Email).HasMaxLength(254);
        suppliers.Property(supplier => supplier.KraPin).HasMaxLength(20);
        suppliers.Property(supplier => supplier.MpesaNumber).HasMaxLength(30);
        suppliers.Property(supplier => supplier.Category).HasMaxLength(100);
        suppliers.Property<string>("NormalizedKraPin")
            .HasComputedColumnSql(NormalizedKraPinSql, stored: true)
            .IsRequired(false);
        suppliers.HasIndex("NormalizedKraPin").IsUnique();
    }

    private static void ConfigureRequisitions(ModelBuilder modelBuilder)
    {
        var requisitions = modelBuilder.Entity<Requisition>();

        requisitions.Property(requisition => requisition.Status).HasMaxLength(40);
        requisitions.Property(requisition => requisition.Notes).HasMaxLength(1_000);
        requisitions.Property(requisition => requisition.Purpose).HasMaxLength(500);
        requisitions.Property(requisition => requisition.Quantity).HasPrecision(18, 3);
        requisitions.Property(requisition => requisition.WorkflowRevision).IsConcurrencyToken();
        requisitions.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_Requisitions_Quantity_Positive",
                "\"Quantity\" <> 'NaN'::numeric AND \"Quantity\" > 0");
            table.HasCheckConstraint(
                "CK_Requisitions_Status_Valid",
                "\"Status\" IN ('AwaitingTechnicalCheck', 'AwaitingSupervisorDecision', " +
                "'ReturnedForRevision', 'Approved', 'Rejected')");
            table.HasCheckConstraint(
                "CK_Requisitions_ActionFields_Consistent",
                "(\"Status\" IN ('AwaitingTechnicalCheck', 'AwaitingSupervisorDecision', " +
                "'ReturnedForRevision') AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) " +
                "OR (\"Status\" IN ('Approved', 'Rejected') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");
            table.HasCheckConstraint(
                "CK_Requisitions_Actors_Distinct",
                "\"ApprovedByUserId\" IS NULL OR \"ApprovedByUserId\" <> \"RequestedByUserId\"");
            table.HasCheckConstraint(
                "CK_Requisitions_Purpose_NotBlank",
                "length(btrim(\"Purpose\")) > 0");
            table.HasCheckConstraint(
                "CK_Requisitions_WorkflowRevision_Positive",
                "\"WorkflowRevision\" >= 1");
        });

        requisitions.HasOne(requisition => requisition.Project)
            .WithMany()
            .HasForeignKey(requisition => requisition.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        requisitions.HasOne(requisition => requisition.Material)
            .WithMany()
            .HasForeignKey(requisition => requisition.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        requisitions.HasOne(requisition => requisition.CostCode)
            .WithMany()
            .HasForeignKey(requisition => requisition.CostCodeId)
            .OnDelete(DeleteBehavior.Restrict);

        requisitions.HasOne(requisition => requisition.RequestedByUser)
            .WithMany()
            .HasForeignKey(requisition => requisition.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        requisitions.HasOne(requisition => requisition.ApprovedByUser)
            .WithMany()
            .HasForeignKey(requisition => requisition.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureEngineerTechnicalChecks(ModelBuilder modelBuilder)
    {
        var checks = modelBuilder.Entity<EngineerTechnicalCheck>();

        checks.Property(check => check.Outcome).HasMaxLength(30);
        checks.Property(check => check.Comments).HasMaxLength(1_000);
        checks.HasIndex(check => new { check.RequisitionId, check.RequisitionRevision })
            .IsUnique();
        checks.ToTable(table => table.HasCheckConstraint(
            "CK_EngineerTechnicalChecks_Outcome",
            "\"Outcome\" IN ('Verified', 'RevisionRequired')"));

        checks.HasOne(check => check.Requisition)
            .WithMany(requisition => requisition.TechnicalChecks)
            .HasForeignKey(check => check.RequisitionId)
            .OnDelete(DeleteBehavior.Restrict);

        checks.HasOne(check => check.EngineerUser)
            .WithMany()
            .HasForeignKey(check => check.EngineerUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureRequisitionApprovalEvents(ModelBuilder modelBuilder)
    {
        var events = modelBuilder.Entity<RequisitionApprovalEvent>();

        events.Property(item => item.EventType).HasMaxLength(50);
        events.Property(item => item.ActorRole).HasMaxLength(80);
        events.Property(item => item.FromStatus).HasMaxLength(40);
        events.Property(item => item.ToStatus).HasMaxLength(40);
        events.Property(item => item.Comments).HasMaxLength(1_000);
        events.Property(item => item.EventDataJson).HasColumnType("jsonb");
        events.Property(item => item.PreviousEventHash).HasMaxLength(64);
        events.Property(item => item.EventHash).HasMaxLength(64);
        events.HasIndex(item => new { item.RequisitionId, item.SequenceNumber })
            .IsUnique();
        events.HasIndex(item => item.EventHash).IsUnique();

        events.HasOne(item => item.Requisition)
            .WithMany(requisition => requisition.ApprovalEvents)
            .HasForeignKey(item => item.RequisitionId)
            .OnDelete(DeleteBehavior.Restrict);

        events.HasOne(item => item.ActorUser)
            .WithMany()
            .HasForeignKey(item => item.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCostCodes(ModelBuilder modelBuilder)
    {
        var costCodes = modelBuilder.Entity<CostCode>();

        costCodes.Property(costCode => costCode.Code).HasMaxLength(30);
        costCodes.Property(costCode => costCode.Name).HasMaxLength(150);
        costCodes.HasIndex(costCode => new { costCode.ProjectId, costCode.Code }).IsUnique();

        costCodes.HasOne(costCode => costCode.Project)
            .WithMany()
            .HasForeignKey(costCode => costCode.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureProjectBudgets(ModelBuilder modelBuilder)
    {
        var budgets = modelBuilder.Entity<ProjectBudget>();

        budgets.Property(budget => budget.ApprovedAmount).HasPrecision(18, 2);
        budgets.Property(budget => budget.ApprovalSource).HasMaxLength(30);
        budgets.Property(budget => budget.Notes).HasMaxLength(1_000);
        budgets.HasIndex(budget => new { budget.ProjectId, budget.CreatedAt });
        budgets.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_ProjectBudgets_ApprovedAmount_NonNegative",
                "\"ApprovedAmount\" <> 'NaN'::numeric AND \"ApprovedAmount\" >= 0");
            table.HasCheckConstraint(
                "CK_ProjectBudgets_ApprovalSource",
                "(\"ApprovalSource\" = 'CEOApproval' AND \"ApprovedByUserId\" IS NOT NULL) OR " +
                "(\"ApprovalSource\" = 'LegacyImport' AND \"ApprovedByUserId\" IS NULL)");
        });

        budgets.HasOne(budget => budget.Project)
            .WithMany()
            .HasForeignKey(budget => budget.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        budgets.HasOne(budget => budget.ApprovedByUser)
            .WithMany()
            .HasForeignKey(budget => budget.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureProjectBudgetAllocations(ModelBuilder modelBuilder)
    {
        var allocations = modelBuilder.Entity<ProjectBudgetAllocation>();

        allocations.Property(allocation => allocation.AllocatedAmount).HasPrecision(18, 2);
        allocations.HasIndex(allocation => new
        {
            allocation.ProjectBudgetId,
            allocation.CostCodeId
        }).IsUnique();
        allocations.ToTable(table => table.HasCheckConstraint(
            "CK_ProjectBudgetAllocations_Amount_NonNegative",
            "\"AllocatedAmount\" <> 'NaN'::numeric AND \"AllocatedAmount\" >= 0"));

        allocations.HasOne(allocation => allocation.ProjectBudget)
            .WithMany(budget => budget.Allocations)
            .HasForeignKey(allocation => allocation.ProjectBudgetId)
            .OnDelete(DeleteBehavior.Restrict);

        allocations.HasOne(allocation => allocation.CostCode)
            .WithMany()
            .HasForeignKey(allocation => allocation.CostCodeId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureProjectProgressVerifications(ModelBuilder modelBuilder)
    {
        var verifications = modelBuilder.Entity<ProjectProgressVerification>();

        verifications.Property(verification => verification.PercentageComplete).HasPrecision(5, 2);
        verifications.Property(verification => verification.WorkSummary).HasMaxLength(2_000);
        verifications.Property(verification => verification.EvidenceReference).HasMaxLength(500);
        verifications.HasIndex(verification => new
        {
            verification.ProjectId,
            verification.VerifiedAt
        });
        verifications.ToTable(table => table.HasCheckConstraint(
            "CK_ProjectProgressVerifications_Percentage",
            "\"PercentageComplete\" <> 'NaN'::numeric AND " +
            "\"PercentageComplete\" >= 0 AND \"PercentageComplete\" <= 100"));

        verifications.HasOne(verification => verification.Project)
            .WithMany()
            .HasForeignKey(verification => verification.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        verifications.HasOne(verification => verification.VerifiedByUser)
            .WithMany()
            .HasForeignKey(verification => verification.VerifiedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureSourcingRounds(ModelBuilder modelBuilder)
    {
        var rounds = modelBuilder.Entity<SourcingRound>();

        rounds.Property(round => round.Status).HasMaxLength(30);
        rounds.Property(round => round.Notes).HasMaxLength(1_000);
        rounds.HasIndex(round => round.RequisitionId)
            .HasDatabaseName("UX_SourcingRounds_Current_Requisition")
            .HasFilter("\"Status\" IN ('Open', 'Awarded')")
            .IsUnique();
        rounds.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_SourcingRounds_Status",
                "\"Status\" IN ('Open', 'Awarded', 'Closed', 'Cancelled')");
            table.HasCheckConstraint(
                "CK_SourcingRounds_ClosedAt",
                "(\"Status\" = 'Open' AND \"ClosedAt\" IS NULL) OR " +
                "(\"Status\" <> 'Open' AND \"ClosedAt\" IS NOT NULL)");
        });

        rounds.HasOne(round => round.Requisition)
            .WithMany()
            .HasForeignKey(round => round.RequisitionId)
            .OnDelete(DeleteBehavior.Restrict);

        rounds.HasOne(round => round.CreatedByUser)
            .WithMany()
            .HasForeignKey(round => round.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureSourcingRoundEvents(ModelBuilder modelBuilder)
    {
        var events = modelBuilder.Entity<SourcingRoundEvent>();

        events.Property(item => item.ActorRole).HasMaxLength(80);
        events.Property(item => item.EventType).HasMaxLength(50);
        events.Property(item => item.FromStatus).HasMaxLength(30);
        events.Property(item => item.ToStatus).HasMaxLength(30);
        events.Property(item => item.Notes).HasMaxLength(1_000);
        events.HasIndex(item => new { item.SourcingRoundId, item.OccurredAt });

        events.HasOne(item => item.SourcingRound)
            .WithMany(round => round.Events)
            .HasForeignKey(item => item.SourcingRoundId)
            .OnDelete(DeleteBehavior.Restrict);
        events.HasOne(item => item.ActorUser)
            .WithMany()
            .HasForeignKey(item => item.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureSupplierQuotes(ModelBuilder modelBuilder)
    {
        var quotes = modelBuilder.Entity<SupplierQuote>();

        quotes.Property(quote => quote.QuoteReference).HasMaxLength(100);
        quotes.Property(quote => quote.QuantityOffered).HasPrecision(18, 3);
        quotes.Property(quote => quote.UnitPrice).HasPrecision(18, 2);
        quotes.Property(quote => quote.StandardPriceSnapshot).HasPrecision(18, 2);
        quotes.Property(quote => quote.Notes).HasMaxLength(1_000);
        quotes.HasIndex(quote => new { quote.SourcingRoundId, quote.SupplierId }).IsUnique();
        quotes.HasIndex(quote => new { quote.SourcingRoundId, quote.QuoteReference }).IsUnique();
        quotes.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_SupplierQuotes_Quantity_Positive",
                "\"QuantityOffered\" <> 'NaN'::numeric AND \"QuantityOffered\" > 0");
            table.HasCheckConstraint(
                "CK_SupplierQuotes_UnitPrice_Positive",
                "\"UnitPrice\" <> 'NaN'::numeric AND \"UnitPrice\" > 0");
            table.HasCheckConstraint(
                "CK_SupplierQuotes_StandardPriceSnapshot_NonNegative",
                "\"StandardPriceSnapshot\" <> 'NaN'::numeric AND \"StandardPriceSnapshot\" >= 0");
        });

        quotes.HasOne(quote => quote.SourcingRound)
            .WithMany(round => round.Quotes)
            .HasForeignKey(quote => quote.SourcingRoundId)
            .OnDelete(DeleteBehavior.Restrict);

        quotes.HasOne(quote => quote.Supplier)
            .WithMany()
            .HasForeignKey(quote => quote.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        quotes.HasOne(quote => quote.RecordedByUser)
            .WithMany()
            .HasForeignKey(quote => quote.RecordedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigurePurchaseOrders(ModelBuilder modelBuilder)
    {
        var orders = modelBuilder.Entity<PurchaseOrder>();

        orders.Property(order => order.PurchaseOrderNumber).HasMaxLength(20);
        orders.Property(order => order.Status).HasMaxLength(30);
        orders.Property(order => order.DeliveryLocation).HasMaxLength(300);
        orders.Property(order => order.Notes).HasMaxLength(1_000);
        orders.HasIndex(order => order.PurchaseOrderNumber).IsUnique();
        orders.HasIndex(order => order.SupplierQuoteId)
            .HasDatabaseName("UX_PurchaseOrders_Live_SupplierQuote")
            .HasFilter("\"Status\" IN ('Draft', 'Submitted', 'Approved', 'Issued')")
            .IsUnique();
        orders.HasIndex(order => order.RequisitionId)
            .HasDatabaseName("UX_PurchaseOrders_Live_Requisition")
            .HasFilter("\"Status\" IN ('Draft', 'Submitted', 'Approved', 'Issued')")
            .IsUnique();
        orders.HasIndex(order => new { order.ProjectId, order.Status });
        orders.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_PurchaseOrders_Status",
                "\"Status\" IN ('Draft', 'Submitted', 'Approved', 'Issued', 'Rejected', 'Cancelled')");
            table.HasCheckConstraint(
                "CK_PurchaseOrders_Actors_Distinct",
                "(\"ApprovedByUserId\" IS NULL OR \"ApprovedByUserId\" <> \"CreatedByUserId\") AND " +
                "(\"RejectedByUserId\" IS NULL OR \"RejectedByUserId\" <> \"CreatedByUserId\")");
            table.HasCheckConstraint(
                "CK_PurchaseOrders_CancellationActor",
                "\"Status\" <> 'Cancelled' OR " +
                "((\"ApprovedAt\" IS NOT NULL OR (\"SubmittedAt\" IS NOT NULL AND \"RejectedAt\" IS NULL)) " +
                "AND \"CancelledByUserId\" <> \"CreatedByUserId\") OR " +
                "((\"ApprovedAt\" IS NULL AND (\"SubmittedAt\" IS NULL OR \"RejectedAt\" IS NOT NULL)) " +
                "AND \"CancelledByUserId\" = \"CreatedByUserId\")");
            table.HasCheckConstraint(
                "CK_PurchaseOrders_WorkflowFields",
                "(\"Status\" = 'Draft' AND \"SubmittedAt\" IS NULL AND \"ApprovedAt\" IS NULL " +
                "AND \"ApprovedByUserId\" IS NULL AND \"IssuedAt\" IS NULL AND \"IssuedByUserId\" IS NULL " +
                "AND \"RejectedAt\" IS NULL AND \"RejectedByUserId\" IS NULL AND \"CancelledAt\" IS NULL " +
                "AND \"CancelledByUserId\" IS NULL) OR " +
                "(\"Status\" = 'Submitted' AND \"SubmittedAt\" IS NOT NULL AND \"ApprovedAt\" IS NULL " +
                "AND \"ApprovedByUserId\" IS NULL AND \"IssuedAt\" IS NULL AND \"IssuedByUserId\" IS NULL " +
                "AND \"RejectedAt\" IS NULL AND \"RejectedByUserId\" IS NULL AND \"CancelledAt\" IS NULL " +
                "AND \"CancelledByUserId\" IS NULL) OR " +
                "(\"Status\" = 'Approved' AND \"SubmittedAt\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL " +
                "AND \"ApprovedByUserId\" IS NOT NULL AND \"IssuedAt\" IS NULL AND \"IssuedByUserId\" IS NULL " +
                "AND \"RejectedAt\" IS NULL AND \"RejectedByUserId\" IS NULL AND \"CancelledAt\" IS NULL " +
                "AND \"CancelledByUserId\" IS NULL) OR " +
                "(\"Status\" = 'Issued' AND \"SubmittedAt\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL " +
                "AND \"ApprovedByUserId\" IS NOT NULL AND \"IssuedAt\" IS NOT NULL AND \"IssuedByUserId\" IS NOT NULL " +
                "AND \"RejectedAt\" IS NULL AND \"RejectedByUserId\" IS NULL AND \"CancelledAt\" IS NULL " +
                "AND \"CancelledByUserId\" IS NULL) OR " +
                "(\"Status\" = 'Rejected' AND \"SubmittedAt\" IS NOT NULL AND \"ApprovedAt\" IS NULL " +
                "AND \"ApprovedByUserId\" IS NULL AND \"IssuedAt\" IS NULL AND \"IssuedByUserId\" IS NULL " +
                "AND \"RejectedAt\" IS NOT NULL AND \"RejectedByUserId\" IS NOT NULL AND \"CancelledAt\" IS NULL " +
                "AND \"CancelledByUserId\" IS NULL) OR " +
                "(\"Status\" = 'Cancelled' AND \"CancelledAt\" IS NOT NULL " +
                "AND \"CancelledByUserId\" IS NOT NULL AND \"IssuedAt\" IS NULL AND \"IssuedByUserId\" IS NULL)"
            );
        });

        orders.HasOne(order => order.Project)
            .WithMany()
            .HasForeignKey(order => order.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.Requisition)
            .WithMany()
            .HasForeignKey(order => order.RequisitionId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.Supplier)
            .WithMany()
            .HasForeignKey(order => order.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.SupplierQuote)
            .WithMany()
            .HasForeignKey(order => order.SupplierQuoteId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.CreatedByUser)
            .WithMany()
            .HasForeignKey(order => order.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.ApprovedByUser)
            .WithMany()
            .HasForeignKey(order => order.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.IssuedByUser)
            .WithMany()
            .HasForeignKey(order => order.IssuedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.RejectedByUser)
            .WithMany()
            .HasForeignKey(order => order.RejectedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        orders.HasOne(order => order.CancelledByUser)
            .WithMany()
            .HasForeignKey(order => order.CancelledByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigurePurchaseOrderLines(ModelBuilder modelBuilder)
    {
        var lines = modelBuilder.Entity<PurchaseOrderLine>();

        lines.Property(line => line.Quantity).HasPrecision(18, 3);
        lines.Property(line => line.UnitPrice).HasPrecision(18, 2);
        lines.HasIndex(line => line.RequisitionId);
        lines.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_PurchaseOrderLines_Quantity_Positive",
                "\"Quantity\" <> 'NaN'::numeric AND \"Quantity\" > 0");
            table.HasCheckConstraint(
                "CK_PurchaseOrderLines_UnitPrice_Positive",
                "\"UnitPrice\" <> 'NaN'::numeric AND \"UnitPrice\" > 0");
        });

        lines.HasOne(line => line.PurchaseOrder)
            .WithMany(order => order.Lines)
            .HasForeignKey(line => line.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);
        lines.HasOne(line => line.Requisition)
            .WithMany()
            .HasForeignKey(line => line.RequisitionId)
            .OnDelete(DeleteBehavior.Restrict);
        lines.HasOne(line => line.Material)
            .WithMany()
            .HasForeignKey(line => line.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigurePurchaseOrderEvents(ModelBuilder modelBuilder)
    {
        var events = modelBuilder.Entity<PurchaseOrderEvent>();

        events.Property(item => item.ActorRole).HasMaxLength(80);
        events.Property(item => item.EventType).HasMaxLength(50);
        events.Property(item => item.FromStatus).HasMaxLength(30);
        events.Property(item => item.ToStatus).HasMaxLength(30);
        events.Property(item => item.Notes).HasMaxLength(1_000);
        events.Property(item => item.DetailsJson).HasMaxLength(4_000);
        events.HasIndex(item => new { item.PurchaseOrderId, item.OccurredAt });

        events.HasOne(item => item.PurchaseOrder)
            .WithMany(order => order.Events)
            .HasForeignKey(item => item.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);
        events.HasOne(item => item.ActorUser)
            .WithMany()
            .HasForeignKey(item => item.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureUserProjectAssignments(ModelBuilder modelBuilder)
    {
        var assignments = modelBuilder.Entity<UserProjectAssignment>();

        assignments.HasIndex(assignment => new { assignment.UserId, assignment.ProjectId })
            .IsUnique()
            .HasFilter("\"IsActive\" = TRUE");
        assignments.HasIndex(assignment => new { assignment.ProjectId, assignment.IsActive });
        assignments.ToTable(table => table.HasCheckConstraint(
            "CK_UserProjectAssignments_ActivePeriod",
            "(\"IsActive\" = TRUE AND \"EndedAt\" IS NULL) OR " +
            "(\"IsActive\" = FALSE AND \"EndedAt\" IS NOT NULL)"));

        assignments.HasOne(assignment => assignment.User)
            .WithMany()
            .HasForeignKey(assignment => assignment.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        assignments.HasOne(assignment => assignment.Project)
            .WithMany()
            .HasForeignKey(assignment => assignment.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        assignments.HasOne(assignment => assignment.AssignedByUser)
            .WithMany()
            .HasForeignKey(assignment => assignment.AssignedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

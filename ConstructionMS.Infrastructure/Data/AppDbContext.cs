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

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Requisition> Requisitions => Set<Requisition>();

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

        requisitions.Property(requisition => requisition.Status).HasMaxLength(30);
        requisitions.Property(requisition => requisition.Notes).HasMaxLength(1_000);
        requisitions.Property(requisition => requisition.Quantity).HasPrecision(18, 3);
        requisitions.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_Requisitions_Quantity_Positive",
                "\"Quantity\" <> 'NaN'::numeric AND \"Quantity\" > 0");
            table.HasCheckConstraint(
                "CK_Requisitions_Status_Valid",
                "\"Status\" IN ('Pending', 'Approved', 'Rejected')");
            table.HasCheckConstraint(
                "CK_Requisitions_ActionFields_Consistent",
                "(\"Status\" = 'Pending' AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) " +
                "OR (\"Status\" IN ('Approved', 'Rejected') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");
            table.HasCheckConstraint(
                "CK_Requisitions_Actors_Distinct",
                "\"ApprovedByUserId\" IS NULL OR \"ApprovedByUserId\" <> \"RequestedByUserId\"");
        });

        requisitions.HasOne(requisition => requisition.Project)
            .WithMany()
            .HasForeignKey(requisition => requisition.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        requisitions.HasOne(requisition => requisition.Material)
            .WithMany()
            .HasForeignKey(requisition => requisition.MaterialId)
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
}

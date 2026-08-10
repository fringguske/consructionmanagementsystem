using ConstructionMS.Infrastructure.Data;
using ConstructionMS.Api.Common;
using ConstructionMS.Application.Configuration;
using ConstructionMS.Application.Services.Auth;
using ConstructionMS.Application.Services.Dashboard;
using ConstructionMS.Application.Services.Materials;
using ConstructionMS.Application.Services.Inventory;
using ConstructionMS.Application.Services.Finance;
using ConstructionMS.Application.Services.Projects;
using ConstructionMS.Application.Services.PurchaseOrders;
using ConstructionMS.Application.Services.Requisitions;
using ConstructionMS.Application.Services.Roles;
using ConstructionMS.Application.Services.Suppliers;
using ConstructionMS.Application.Services.Users;
using ConstructionMS.Application.DTOs.Users;
using ConstructionMS.Infrastructure.Services.Auth;
using ConstructionMS.Infrastructure.Services.Dashboard;
using ConstructionMS.Infrastructure.Services.Materials;
using ConstructionMS.Infrastructure.Services.Inventory;
using ConstructionMS.Infrastructure.Services.Finance;
using ConstructionMS.Infrastructure.Services.Projects;
using ConstructionMS.Infrastructure.Services.PurchaseOrders;
using ConstructionMS.Infrastructure.Services.Requisitions;
using ConstructionMS.Infrastructure.Services.Roles;
using ConstructionMS.Infrastructure.Services.Suppliers;
using ConstructionMS.Infrastructure.Services.Users;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "The DefaultConnection connection string is required. " +
        "Use .NET user secrets for local development or the " +
        "ConnectionStrings__DefaultConnection environment variable when deployed.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddOptions<ItVerificationOptions>()
    .Bind(builder.Configuration.GetSection(ItVerificationOptions.SectionName))
    .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.TesterUsername),
        "ItVerification:TesterUsername is required when IT verification is enabled.")
    .ValidateOnStart();

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    // The default KnownProxies collection trusts loopback only, matching the
    // same-host nginx deployment. Add explicit proxy IPs in code/config if the
    // reverse proxy is ever moved to another host.
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = builder.Environment.IsDevelopment()
            ? "ConstructionMS.Auth"
            : "__Host-ConstructionMS.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
        options.Events.OnValidatePrincipal = async context =>
        {
            var idValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(idValue, out var userId))
            {
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme);
                return;
            }

            var cookieRole = context.Principal?.FindFirstValue(ClaimTypes.Role);
            var resolver = context.HttpContext.RequestServices
                .GetRequiredService<IActorRoleResolver>();
            var currentUser = await resolver.ResolveAsync(
                userId,
                cookieRole,
                context.HttpContext.RequestAborted);
            if (currentUser is null)
            {
                // Deactivation and role changes revoke the old session immediately.
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme);
                return;
            }

            var cookieName = context.Principal?.FindFirstValue(ClaimTypes.Name);
            var cookieEmail = context.Principal?.FindFirstValue(ClaimTypes.Email);
            if (!string.Equals(cookieName, currentUser.FullName, StringComparison.Ordinal)
                || !string.Equals(cookieEmail, currentUser.Email, StringComparison.OrdinalIgnoreCase))
            {
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Name, currentUser.FullName),
                    new Claim(ClaimTypes.Email, currentUser.Email),
                    new Claim(ClaimTypes.Role, currentUser.EffectiveRole)
                };
                context.ReplacePrincipal(new ClaimsPrincipal(new ClaimsIdentity(
                    claims,
                    CookieAuthenticationDefaults.AuthenticationScheme)));
                context.ShouldRenew = true;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    if (allowedOrigins.Length > 0)
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    }
}));

builder.Services.AddScoped<
    ConstructionMS.Application.Services.Auth.IAuthenticationService,
    ConstructionMS.Infrastructure.Services.Auth.AuthenticationService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentActorContext, HttpCurrentActorContext>();
builder.Services.AddScoped<IActorRoleResolver, ActorRoleResolver>();
builder.Services.AddScoped<IAccessRequestService, AccessRequestService>();
builder.Services.AddScoped<IUserProjectAssignmentService, UserProjectAssignmentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IMaterialService, MaterialService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<ISupplierOnboardingService, SupplierOnboardingService>();
builder.Services.AddScoped<IRequisitionWorkflowService, RequisitionWorkflowService>();
builder.Services.AddScoped<ISourcingService, SourcingService>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IInventoryWorkflowService, InventoryWorkflowService>();
builder.Services.AddScoped<IFinanceWorkflowService, FinanceWorkflowService>();

var app = builder.Build();

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/v1/health/live", () => Results.Ok(new { status = "alive" }))
    .AllowAnonymous();
app.MapGet("/api/v1/health", async (
        AppDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken) =>
    {
        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken))
            {
                return Results.Json(
                    new { status = "not_ready", reason = "database_unavailable" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var pendingMigrations = await db.Database
                .GetPendingMigrationsAsync(cancellationToken);
            var pendingCount = pendingMigrations.Count();
            return pendingCount == 0
                ? Results.Ok(new { status = "ready" })
                : Results.Json(
                    new { status = "not_ready", reason = "database_migrations_pending", pendingCount },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
        }
        catch (Exception exception)
        {
            loggerFactory.CreateLogger("Readiness")
                .LogError(exception, "Database readiness check failed.");
            return Results.Json(
                new { status = "not_ready", reason = "database_check_failed" },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    })
    .AllowAnonymous();
app.MapControllers();

if (args.Contains("--bootstrap-administrator", StringComparer.Ordinal))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pendingMigrations = await db.Database.GetPendingMigrationsAsync();
    if (pendingMigrations.Any())
    {
        throw new InvalidOperationException(
            "Apply all database migrations before running --bootstrap-administrator.");
    }

    if (await db.Users.AnyAsync())
    {
        throw new InvalidOperationException(
            "Administrator bootstrap is permitted only while the Users table is empty.");
    }

    var administratorRoleId = await db.Roles
        .Where(role => role.RoleName == "Administrator")
        .Select(role => role.Id)
        .SingleAsync();
    var bootstrapSection = builder.Configuration.GetSection("Bootstrap:Administrator");
    var username = bootstrapSection["Username"];
    var fullName = bootstrapSection["FullName"];
    var email = bootstrapSection["Email"];
    var phoneNumber = bootstrapSection["PhoneNumber"];
    var password = bootstrapSection["Password"];
    if (string.IsNullOrWhiteSpace(username)
        || string.IsNullOrWhiteSpace(fullName)
        || string.IsNullOrWhiteSpace(email)
        || string.IsNullOrWhiteSpace(phoneNumber)
        || string.IsNullOrWhiteSpace(password))
    {
        throw new InvalidOperationException(
            "Bootstrap:Administrator:Username, FullName, Email, PhoneNumber and Password are all required. " +
            "Supply them through the deployment secret store, never committed settings.");
    }

    var users = scope.ServiceProvider.GetRequiredService<IUserService>();
    await users.CreateAsync(new CreateUserRequestDto
    {
        Username = username,
        FullName = fullName,
        Email = email,
        PhoneNumber = phoneNumber,
        Password = password,
        RoleId = administratorRoleId
    });
    Console.WriteLine("The initial Administrator account was created. Remove the bootstrap secrets now.");
    return;
}

app.Run();

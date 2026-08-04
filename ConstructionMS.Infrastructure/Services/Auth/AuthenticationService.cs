namespace ConstructionMS.Infrastructure.Services.Auth;

using ConstructionMS.Application.DTOs.Auth;
using ConstructionMS.Application.Services.Auth;
using ConstructionMS.Infrastructure.Common;
using ConstructionMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public sealed class AuthenticationService : IAuthenticationService
{
    private const string NormalizedEmailProperty = "NormalizedEmail";
    // A valid BCrypt hash used only to keep unknown-email work comparable to
    // wrong-password work. It is not an application credential.
    private const string DummyPasswordHash =
        "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    private readonly AppDbContext _db;
    private readonly ILogger<AuthenticationService> _logger;

    public AuthenticationService(AppDbContext db, ILogger<AuthenticationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<CurrentUserDto?> AuthenticateAsync(LoginRequestDto request)
    {
        var normalizedEmail = InputNormalizer.Email(request.Email, nameof(request.Email));
        var user = await _db.Users
            .Include(candidate => candidate.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate =>
                candidate.IsActive
                && EF.Property<string>(candidate, NormalizedEmailProperty) == normalizedEmail);

        if (user is null)
        {
            BCrypt.Net.BCrypt.Verify(request.Password, DummyPasswordHash);
            return null;
        }

        try
        {
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return null;
            }
        }
        catch (BCrypt.Net.SaltParseException exception)
        {
            // A damaged legacy hash must fail closed without disclosing account state.
            _logger.LogError(exception, "User {UserId} has an invalid password hash.", user.Id);
            return null;
        }

        return await BuildCurrentUserAsync(user.Id, user.FullName, user.Email, user.Role.RoleName);
    }

    public async Task<CurrentUserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users
            .Include(candidate => candidate.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == userId && candidate.IsActive);

        return user is null
            ? null
            : await BuildCurrentUserAsync(user.Id, user.FullName, user.Email, user.Role.RoleName);
    }

    private async Task<CurrentUserDto> BuildCurrentUserAsync(
        int userId,
        string fullName,
        string email,
        string role)
    {
        var projectQuery = _db.Projects.AsNoTracking();
        if (role is not "CEO" and not "Auditor")
        {
            projectQuery = projectQuery.Where(project =>
                _db.UserProjectAssignments.Any(assignment =>
                    assignment.UserId == userId
                    && assignment.ProjectId == project.Id
                    && assignment.IsActive));
        }

        var projects = await projectQuery
            .OrderBy(project => project.Id)
            .Select(project => new AssignedProjectDto { Id = project.Id, Name = project.Name })
            .ToListAsync();

        return new CurrentUserDto
        {
            Id = userId,
            FullName = fullName,
            Email = email,
            Role = role,
            Projects = projects
        };
    }
}

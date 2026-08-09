namespace ConstructionMS.Infrastructure.Services.Users;

using ConstructionMS.Application.Common;
using ConstructionMS.Application.DTOs.Users;
using ConstructionMS.Application.Services.Users;
using ConstructionMS.Domain.Entities;
using ConstructionMS.Infrastructure.Common;
using ConstructionMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>Persists users and hashes passwords with BCrypt.</summary>
public class UserService : IUserService
{
    private const int PasswordWorkFactor = 12;
    private const string NormalizedUsernameProperty = "NormalizedUsername";
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<PaginatedResult<UserResponseDto>> GetAllAsync(int page, int pageSize)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var query = _db.Users
            .Include(u => u.Role)
            .AsNoTracking();

        var totalCount = await query.CountAsync();

        var entities = await query
            .OrderBy(u => u.Id)
            .Skip(pagination.Offset)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PaginatedResult<UserResponseDto>
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<UserResponseDto?> GetByIdAsync(int id)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        return user is null ? null : ToDto(user);
    }

    public async Task<UserResponseDto> CreateAsync(CreateUserRequestDto dto)
    {
        var email = InputNormalizer.Email(dto.Email, nameof(dto.Email));
        var username = InputNormalizer.Username(dto.Username, nameof(dto.Username));

        if (await _db.Users.AnyAsync(user =>
                EF.Property<string>(user, NormalizedUsernameProperty) == username)
            || await _db.AccessRequests.AnyAsync(request =>
                EF.Property<string>(request, NormalizedUsernameProperty) == username))
        {
            throw new InvalidOperationException("A user with that username already exists.");
        }

        if (!await _db.Roles.AnyAsync(role => role.Id == dto.RoleId))
        {
            throw new ArgumentException("The selected role does not exist.", nameof(dto.RoleId));
        }

        var user = new User
        {
            Username = username,
            FullName = InputNormalizer.RequiredText(dto.FullName, nameof(dto.FullName), 2, 150),
            Email = email,
            PhoneNumber = InputNormalizer.RequiredText(
                dto.PhoneNumber,
                nameof(dto.PhoneNumber),
                maximumLength: 30),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                InputNormalizer.Password(dto.Password, nameof(dto.Password), 12, 72, 72),
                workFactor: PasswordWorkFactor),
            RoleId = dto.RoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await _db.Entry(user).Reference(u => u.Role).LoadAsync();

        return ToDto(user);
    }

    public async Task<UserResponseDto?> UpdateAsync(int id, UpdateUserRequestDto dto)
    {
        var user = await _db.Users.FindAsync(id);

        if (user is null) return null;

        var email = InputNormalizer.Email(dto.Email, nameof(dto.Email));
        var username = InputNormalizer.Username(dto.Username, nameof(dto.Username));

        if (await _db.Users.AnyAsync(existing =>
                existing.Id != id
                && EF.Property<string>(existing, NormalizedUsernameProperty) == username)
            || await _db.AccessRequests.AnyAsync(request =>
                request.ApprovedUserId != id
                && EF.Property<string>(request, NormalizedUsernameProperty) == username))
        {
            throw new InvalidOperationException("A user with that username already exists.");
        }

        if (!await _db.Roles.AnyAsync(role => role.Id == dto.RoleId))
        {
            throw new ArgumentException("The selected role does not exist.", nameof(dto.RoleId));
        }

        if (user.RoleId != dto.RoleId)
        {
            var currentRole = await _db.Roles
                .Where(role => role.Id == user.RoleId)
                .Select(role => role.RoleName)
                .SingleAsync();
            var nextRole = await _db.Roles
                .Where(role => role.Id == dto.RoleId)
                .Select(role => role.RoleName)
                .SingleAsync();
            if (currentRole is "CEO" or "Administrator"
                && nextRole != currentRole
                && user.IsActive
                && await CountActiveUsersInRoleAsync(currentRole) <= 1)
            {
                throw new InvalidOperationException(
                    $"The final active {currentRole} cannot be moved to another role.");
            }
        }

        user.FullName = InputNormalizer.RequiredText(dto.FullName, nameof(dto.FullName), 2, 150);
        user.Username = username;
        user.Email = email;
        user.PhoneNumber = InputNormalizer.RequiredText(
            dto.PhoneNumber,
            nameof(dto.PhoneNumber),
            maximumLength: 30);
        user.RoleId = dto.RoleId;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id)
            ?? throw new InvalidOperationException("User was saved but could not be retrieved.");
    }

    public async Task<bool> SetActiveStatusAsync(int id, bool isActive)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;

        if (!isActive && user.IsActive)
        {
            var protectedRole = await _db.Roles
                .Where(role => role.Id == user.RoleId
                    && (role.RoleName == "CEO" || role.RoleName == "Administrator"))
                .Select(role => role.RoleName)
                .SingleOrDefaultAsync();
            if (protectedRole is not null
                && await CountActiveUsersInRoleAsync(protectedRole) <= 1)
            {
                throw new InvalidOperationException(
                    $"The final active {protectedRole} cannot be deactivated.");
            }
        }

        user.IsActive = isActive;
        await _db.SaveChangesAsync();
        return true;
    }

    private Task<int> CountActiveUsersInRoleAsync(string roleName) =>
        _db.Users.CountAsync(candidate =>
            candidate.IsActive && candidate.Role.RoleName == roleName);

    private static UserResponseDto ToDto(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        FullName = u.FullName,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
        RoleId = u.RoleId,
        RoleName = u.Role?.RoleName ?? string.Empty
    };
}

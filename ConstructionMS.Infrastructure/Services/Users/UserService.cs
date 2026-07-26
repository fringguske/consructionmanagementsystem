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
    private const string NormalizedEmailProperty = "NormalizedEmail";
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

        if (await _db.Users.AnyAsync(user =>
                EF.Property<string>(user, NormalizedEmailProperty) == email))
        {
            throw new InvalidOperationException("A user with that email address already exists.");
        }

        if (!await _db.Roles.AnyAsync(role => role.Id == dto.RoleId))
        {
            throw new ArgumentException("The selected role does not exist.", nameof(dto.RoleId));
        }

        var user = new User
        {
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

        if (await _db.Users.AnyAsync(existing =>
                existing.Id != id
                && EF.Property<string>(existing, NormalizedEmailProperty) == email))
        {
            throw new InvalidOperationException("A user with that email address already exists.");
        }

        if (!await _db.Roles.AnyAsync(role => role.Id == dto.RoleId))
        {
            throw new ArgumentException("The selected role does not exist.", nameof(dto.RoleId));
        }

        user.FullName = InputNormalizer.RequiredText(dto.FullName, nameof(dto.FullName), 2, 150);
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

        user.IsActive = isActive;
        await _db.SaveChangesAsync();
        return true;
    }

    private static UserResponseDto ToDto(User u) => new()
    {
        Id = u.Id,
        FullName = u.FullName,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
        RoleId = u.RoleId,
        RoleName = u.Role?.RoleName ?? string.Empty
    };
}

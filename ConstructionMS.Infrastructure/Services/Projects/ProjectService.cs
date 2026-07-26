namespace ConstructionMS.Infrastructure.Services.Projects;

using ConstructionMS.Application.Common;
using ConstructionMS.Application.DTOs.Projects;
using ConstructionMS.Application.Services.Projects;
using ConstructionMS.Domain.Entities;
using ConstructionMS.Infrastructure.Common;
using ConstructionMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>EF Core implementation of IProjectService.</summary>
public class ProjectService : IProjectService
{
    private readonly AppDbContext _db;

    private static readonly string[] AllowedStatuses =
        ["Active", "On Hold", "Completed", "Cancelled"];

    public ProjectService(AppDbContext db) => _db = db;

    public async Task<PaginatedResult<ProjectResponseDto>> GetAllAsync(int page, int pageSize)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var query = _db.Projects.AsNoTracking();
        var totalCount = await query.CountAsync();

        var entities = await query
            .OrderBy(p => p.Id)
            .Skip(pagination.Offset)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PaginatedResult<ProjectResponseDto>
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<ProjectResponseDto?> GetByIdAsync(int id)
    {
        var project = await _db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return project is null ? null : ToDto(project);
    }

    public async Task<ProjectResponseDto> CreateAsync(CreateProjectRequestDto dto)
    {
        var status = NormalizeStatus(dto.Status)
            ?? throw new ArgumentException(GetInvalidStatusMessage(dto.Status), nameof(dto.Status));

        ValidateSchedule(dto.StartDate, dto.EndDate);

        var project = new Project
        {
            Name = InputNormalizer.RequiredText(dto.Name, nameof(dto.Name), 2, 150),
            Location = InputNormalizer.OptionalText(dto.Location, nameof(dto.Location), 300),
            Budget = InputNormalizer.NonNegative(dto.Budget, nameof(dto.Budget), 18, 2),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();
        return ToDto(project);
    }

    public async Task<(ProjectResponseDto? dto, string? error)> UpdateAsync(int id, UpdateProjectRequestDto dto)
    {
        var status = NormalizeStatus(dto.Status);
        if (status is null)
        {
            return (null, GetInvalidStatusMessage(dto.Status));
        }

        if (dto.StartDate == default)
        {
            return (null, "StartDate is required.");
        }

        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
        {
            return (null, "EndDate cannot be earlier than StartDate.");
        }

        if (dto.Budget < 0)
        {
            return (null, "Budget cannot be negative.");
        }

        if (!DecimalPrecision.Fits(dto.Budget, 18, 2))
        {
            return (null, "Budget must fit within 18 digits and 2 decimal places.");
        }

        var project = await _db.Projects.FindAsync(id);
        if (project is null) return (null, null);

        project.Name = InputNormalizer.RequiredText(dto.Name, nameof(dto.Name), 2, 150);
        project.Location = InputNormalizer.OptionalText(dto.Location, nameof(dto.Location), 300);
        project.Budget = dto.Budget;
        project.StartDate = dto.StartDate;
        project.EndDate = dto.EndDate;
        project.Status = status;

        await _db.SaveChangesAsync();
        return (ToDto(project), null);
    }

    private static string? NormalizeStatus(string? status) =>
        AllowedStatuses.FirstOrDefault(allowed =>
            string.Equals(allowed, status?.Trim(), StringComparison.OrdinalIgnoreCase));

    private static string GetInvalidStatusMessage(string? status)
    {
        var allowed = string.Join(", ", AllowedStatuses.Select(value => $"\"{value}\""));
        return $"Invalid status \"{status}\". Allowed values: {allowed}.";
    }

    private static void ValidateSchedule(DateOnly startDate, DateOnly? endDate)
    {
        if (startDate == default)
        {
            throw new ArgumentException("StartDate is required.", nameof(startDate));
        }

        if (endDate.HasValue && endDate.Value < startDate)
        {
            throw new ArgumentException("EndDate cannot be earlier than StartDate.", nameof(endDate));
        }
    }

    private static ProjectResponseDto ToDto(Project p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Location = p.Location,
        Budget = p.Budget,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        Status = p.Status,
        CreatedAt = p.CreatedAt
    };
}

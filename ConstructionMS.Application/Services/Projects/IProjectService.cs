namespace ConstructionMS.Application.Services.Projects;

using ConstructionMS.Application.Common;
using ConstructionMS.Application.DTOs.Projects;

/// <summary>Business operations for construction projects.</summary>
public interface IProjectService
{
    Task<PaginatedResult<ProjectResponseDto>> GetAllAsync(int page, int pageSize);
    Task<ProjectResponseDto?> GetByIdAsync(int id);
    Task<ProjectResponseDto> CreateAsync(CreateProjectRequestDto dto);

    /// <summary>
    /// Updates project details. Returns null if not found.
    /// Returns an error string if the Status value is invalid.
    /// </summary>
    Task<(ProjectResponseDto? dto, string? error)> UpdateAsync(int id, UpdateProjectRequestDto dto);
}

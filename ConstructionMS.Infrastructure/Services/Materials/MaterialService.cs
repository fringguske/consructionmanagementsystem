namespace ConstructionMS.Infrastructure.Services.Materials;

using ConstructionMS.Application.Common;
using ConstructionMS.Application.DTOs.Materials;
using ConstructionMS.Application.Services.Materials;
using ConstructionMS.Domain.Entities;
using ConstructionMS.Infrastructure.Common;
using ConstructionMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>EF Core implementation of IMaterialService.</summary>
public class MaterialService : IMaterialService
{
    private readonly AppDbContext _db;

    public MaterialService(AppDbContext db) => _db = db;

    public async Task<PaginatedResult<MaterialResponseDto>> GetAllAsync(int page, int pageSize)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var query = _db.Materials.AsNoTracking();
        var totalCount = await query.CountAsync();

        var entities = await query
            .OrderBy(m => m.Name)
            .ThenBy(m => m.Id)
            .Skip(pagination.Offset)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PaginatedResult<MaterialResponseDto>
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<MaterialResponseDto?> GetByIdAsync(int id)
    {
        var material = await _db.Materials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        return material is null ? null : ToDto(material);
    }

    public async Task<MaterialResponseDto> CreateAsync(CreateMaterialRequestDto dto)
    {
        var material = new Material
        {
            Name = InputNormalizer.RequiredText(dto.Name, nameof(dto.Name), 2, 150),
            Category = InputNormalizer.OptionalText(dto.Category, nameof(dto.Category), 100),
            Unit = InputNormalizer.RequiredText(dto.Unit, nameof(dto.Unit), maximumLength: 30),
            StandardPrice = InputNormalizer.NonNegative(dto.StandardPrice, nameof(dto.StandardPrice), 18, 2),
            ReorderLevel = InputNormalizer.NonNegative(dto.ReorderLevel, nameof(dto.ReorderLevel), 18, 3),
            CreatedAt = DateTime.UtcNow
        };

        _db.Materials.Add(material);
        await _db.SaveChangesAsync();
        return ToDto(material);
    }

    public async Task<MaterialResponseDto?> UpdateAsync(int id, UpdateMaterialRequestDto dto)
    {
        var material = await _db.Materials.FindAsync(id);
        if (material is null) return null;

        material.Name = InputNormalizer.RequiredText(dto.Name, nameof(dto.Name), 2, 150);
        material.Category = InputNormalizer.OptionalText(dto.Category, nameof(dto.Category), 100);
        material.Unit = InputNormalizer.RequiredText(dto.Unit, nameof(dto.Unit), maximumLength: 30);
        material.StandardPrice = InputNormalizer.NonNegative(dto.StandardPrice, nameof(dto.StandardPrice), 18, 2);
        material.ReorderLevel = InputNormalizer.NonNegative(dto.ReorderLevel, nameof(dto.ReorderLevel), 18, 3);

        await _db.SaveChangesAsync();
        return ToDto(material);
    }

    private static MaterialResponseDto ToDto(Material m) => new()
    {
        Id = m.Id,
        Name = m.Name,
        Category = m.Category,
        Unit = m.Unit,
        StandardPrice = m.StandardPrice,
        ReorderLevel = m.ReorderLevel,
        CreatedAt = m.CreatedAt
    };
}

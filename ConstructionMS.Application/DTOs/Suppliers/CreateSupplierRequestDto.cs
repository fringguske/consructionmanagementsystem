namespace ConstructionMS.Application.DTOs.Suppliers;

using System.ComponentModel.DataAnnotations;

/// <summary>Request body for POST /api/suppliers.</summary>
public class CreateSupplierRequestDto
{
    /// <summary>Registered business name. Required.</summary>
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    public string? ContactPerson { get; set; }

    [StringLength(30), Phone]
    public string? PhoneNumber { get; set; }

    [StringLength(254), EmailAddress]
    public string? Email { get; set; }

    [StringLength(20)]
    public string? KraPin { get; set; }

    [StringLength(30), Phone]
    public string? MpesaNumber { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }
}

namespace ConstructionMS.Application.DTOs.Auth;

public sealed class CurrentUserDto
{
    public int Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string ActualRole { get; init; } = string.Empty;
    public bool CanSwitchRoles { get; init; }
    public IReadOnlyList<string> AvailableRoles { get; init; } = [];
    public IReadOnlyList<AssignedProjectDto> Projects { get; init; } = [];
}

public sealed class AssignedProjectDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

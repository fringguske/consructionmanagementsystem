namespace ConstructionMS.Application.DTOs.Dashboard;

using ConstructionMS.Application.DTOs.Auth;

public sealed class DashboardResponseDto
{
    public CurrentUserDto User { get; init; } = new();
    public int VisibleProjectCount { get; init; }
    public int PendingRequisitionCount { get; init; }
    public int ApprovedRequisitionCount { get; init; }
}

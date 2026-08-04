namespace ConstructionMS.Infrastructure.Services.Dashboard;

using ConstructionMS.Application.DTOs.Dashboard;
using ConstructionMS.Application.Services.Auth;
using ConstructionMS.Application.Services.Dashboard;
using ConstructionMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public sealed class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly IAuthenticationService _authenticationService;

    public DashboardService(AppDbContext db, IAuthenticationService authenticationService)
    {
        _db = db;
        _authenticationService = authenticationService;
    }

    public async Task<DashboardResponseDto> GetAsync(int userId)
    {
        var user = await _authenticationService.GetCurrentUserAsync(userId)
            ?? throw new UnauthorizedAccessException("The authenticated user is inactive or no longer exists.");

        var visibleProjectIds = user.Projects.Select(project => project.Id).ToArray();
        var requisitions = _db.Requisitions
            .AsNoTracking()
            .Where(requisition => visibleProjectIds.Contains(requisition.ProjectId));

        return new DashboardResponseDto
        {
            User = user,
            VisibleProjectCount = visibleProjectIds.Length,
            PendingRequisitionCount = await requisitions.CountAsync(requisition =>
                requisition.Status == "Pending"
                || requisition.Status == "AwaitingTechnicalCheck"
                || requisition.Status == "AwaitingSupervisorDecision"
                || requisition.Status == "ReturnedForRevision"),
            ApprovedRequisitionCount = await requisitions.CountAsync(requisition =>
                requisition.Status == "Approved")
        };
    }
}

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace ConstructionMS.Api.Common;

public sealed class ApiExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, message) = exception switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, exception.Message),
            ArgumentException => (StatusCodes.Status400BadRequest, exception.Message),
            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "This record changed after it was opened. Refresh and try again."),
            DbUpdateException => (
                StatusCodes.Status409Conflict,
                "The change conflicts with an existing or protected database record."),
            InvalidOperationException => (StatusCodes.Status409Conflict, exception.Message),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected server error occurred.")
        };

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled API exception for {Path}", httpContext.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Rejected API request for {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(
            ApiResponse<object>.Fail(message),
            cancellationToken);
        return true;
    }
}

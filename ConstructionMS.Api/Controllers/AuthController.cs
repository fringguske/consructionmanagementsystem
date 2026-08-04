using System.Security.Claims;
using ConstructionMS.Api.Common;
using ConstructionMS.Application.DTOs.Auth;
using ApplicationAuthenticationService = ConstructionMS.Application.Services.Auth.IAuthenticationService;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ConstructionMS.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly ApplicationAuthenticationService _authenticationService;

    public AuthController(ApplicationAuthenticationService authenticationService) =>
        _authenticationService = authenticationService;

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var user = await _authenticationService.AuthenticateAsync(request);
        if (user is null)
        {
            return Unauthorized(ApiResponse<CurrentUserDto>.Fail("Invalid email or password."));
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var properties = new AuthenticationProperties
        {
            AllowRefresh = true,
            IsPersistent = false,
            IssuedUtc = DateTimeOffset.UtcNow,
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
        };

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            properties);

        return Ok(ApiResponse<CurrentUserDto>.Ok(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _authenticationService.GetCurrentUserAsync(User.GetRequiredUserId());
        return user is null
            ? Unauthorized(ApiResponse<CurrentUserDto>.Fail("The authenticated user is inactive."))
            : Ok(ApiResponse<CurrentUserDto>.Ok(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}

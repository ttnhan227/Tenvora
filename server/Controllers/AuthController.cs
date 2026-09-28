using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth-rate-limit")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (!result.Success)
            return Unauthorized(result);

        return Ok(result);
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Credential))
            return UnprocessableEntity(ApiResult<AuthResponse>.Fail("Google credential is required."));

        var result = await _authService.GoogleLoginAsync(request);
        if (!result.Success)
        {
            if (result.Message.Contains("not configured", StringComparison.OrdinalIgnoreCase))
                return StatusCode(StatusCodes.Status503ServiceUnavailable, result);
            if (result.Message.Contains("inactive", StringComparison.OrdinalIgnoreCase))
                return StatusCode(StatusCodes.Status403Forbidden, result);
            if (result.Message.Contains("already", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("Sign in with your password", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("does not match", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("linked to another", StringComparison.OrdinalIgnoreCase))
                return Conflict(result);
            return Unauthorized(result);
        }

        return Ok(result);
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        if (!result.Success)
            return Unauthorized(result);

        return Ok(result);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        Guid userId = Guid.Empty;
        if (User.Identity?.IsAuthenticated == true)
        {
            try { userId = User.GetUserId(); } catch { /* ignore if missing */ }
        }
        var result = await _authService.LogoutAsync(userId, request?.RefreshToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.GetUserId();
        var result = await _authService.GetProfileAsync(userId);
        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    [Authorize]
    [HttpPost("set-password")]
    [HttpPost("change-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        var userId = User.GetUserId();
        var result = await _authService.SetPasswordAsync(userId, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "TenantAdmin")]
    [HttpPost("onboarding")]
    public async Task<IActionResult> CompleteOnboarding([FromBody] CompleteOnboardingRequest request)
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        var result = await _authService.CompleteOnboardingAsync(userId, tenantId, request);
        if (!result.Success)
        {
            if (result.Message.Contains("already complete", StringComparison.OrdinalIgnoreCase))
                return Conflict(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "TenantAdmin")]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        var result = await _authService.UpdateSettingsAsync(userId, tenantId, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}

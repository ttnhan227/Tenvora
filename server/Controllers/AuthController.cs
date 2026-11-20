using System.Security.Claims;
using System.Security.Cryptography;
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
    private const string AccessCookieName = "tenvora_access_token";
    private const string RefreshCookieName = "tenvora_refresh_token";
    private const string CsrfCookieName = "XSRF-TOKEN";

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    private (bool Secure, SameSiteMode SameSite) ResolveCookieSecurity()
    {
        var configuredSameSite = Environment.GetEnvironmentVariable("AUTH_COOKIE_SAMESITE");
        var sameSite = string.Equals(configuredSameSite, "None", StringComparison.OrdinalIgnoreCase)
            ? SameSiteMode.None
            : SameSiteMode.Lax;

        var isHttps = Request.IsHttps
            || string.Equals(Request.Headers["X-Forwarded-Proto"].FirstOrDefault(), "https", StringComparison.OrdinalIgnoreCase)
            || sameSite == SameSiteMode.None;

        return (isHttps, sameSite);
    }

    private void SetAuthCookies(AuthResponse auth)
    {
        if (HttpContext is null) return;
        var (secure, sameSite) = ResolveCookieSecurity();

        Response.Cookies.Append(AccessCookieName, auth.AccessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddHours(2)
        });

        Response.Cookies.Append(RefreshCookieName, auth.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/api/auth",
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });

        EnsureCsrfCookie(secure, sameSite);
    }

    private void EnsureCsrfCookie(bool secure, SameSiteMode sameSite)
    {
        if (HttpContext is null) return;
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        Response.Cookies.Append(CsrfCookieName, token, new CookieOptions
        {
            HttpOnly = false,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

    private void ClearAuthCookies()
    {
        if (HttpContext is null) return;
        var (secure, sameSite) = ResolveCookieSecurity();

        Response.Cookies.Delete(AccessCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/"
        });
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/api/auth"
        });
        Response.Cookies.Delete(CsrfCookieName, new CookieOptions
        {
            HttpOnly = false,
            Secure = secure,
            SameSite = sameSite,
            Path = "/"
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        if (!result.Success)
            return BadRequest(result);

        if (result.Data is not null)
            SetAuthCookies(result.Data);

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (!result.Success)
            return Unauthorized(result);

        if (result.Data is not null)
            SetAuthCookies(result.Data);

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

        if (result.Data is not null)
            SetAuthCookies(result.Data);

        return Ok(result);
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? request)
    {
        var refreshToken = !string.IsNullOrWhiteSpace(request?.RefreshToken)
            ? request.RefreshToken
            : HttpContext?.Request.Cookies[RefreshCookieName];

        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(ApiResult<AuthResponse>.Fail("Refresh token is required."));

        var result = await _authService.RefreshTokenAsync(new RefreshTokenRequest(refreshToken));
        if (!result.Success)
            return Unauthorized(result);

        if (result.Data is not null)
            SetAuthCookies(result.Data);

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
        var refreshToken = !string.IsNullOrWhiteSpace(request?.RefreshToken)
            ? request.RefreshToken
            : HttpContext?.Request.Cookies[RefreshCookieName];

        var result = await _authService.LogoutAsync(userId, refreshToken);
        ClearAuthCookies();
        if (HttpContext is not null)
        {
            Response.Headers["Clear-Site-Data"] = "\"cookies\", \"storage\"";
        }
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

        if (HttpContext is not null
            && Request.Cookies.ContainsKey(AccessCookieName)
            && !Request.Cookies.ContainsKey(CsrfCookieName))
        {
            var (secure, sameSite) = ResolveCookieSecurity();
            EnsureCsrfCookie(secure, sameSite);
        }

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

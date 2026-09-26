using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly TokenService _tokenService;
    private readonly IGoogleAuthValidator _googleValidator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext context,
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IRefreshTokenRepository refreshTokenRepository,
        TokenService tokenService,
        IGoogleAuthValidator googleValidator,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _context = context;
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _googleValidator = googleValidator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        // Validate password strength
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 12)
            return ApiResult<AuthResponse>.Fail("Password must be at least 12 characters long.");
        if (!request.Password.Any(c => char.IsUpper(c)) || !request.Password.Any(c => char.IsLower(c)) || !request.Password.Any(c => char.IsDigit(c)))
            return ApiResult<AuthResponse>.Fail("Password must contain uppercase, lowercase, and numeric characters.");

        var email = request.Email.Trim().ToLowerInvariant();
        var company = request.CompanyName.Trim();
        await using var write = await FinancialWriteScope.BeginAsync(_context, Guid.Empty);
        var emailAlreadyRegistered = await _context.Users.AnyAsync(u => u.Email.ToLower() == email);
        if (emailAlreadyRegistered)
        {
            return ApiResult<AuthResponse>.Fail("Email already registered.");
        }

        var companyExists = await _context.Tenants.AnyAsync(t => t.CompanyName == company);
        if (companyExists)
        {
            return ApiResult<AuthResponse>.Fail("Company name already exists.");
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = request.CompanyName.Trim(),
            ApiKey = Guid.NewGuid().ToString("N"),
            PlanType = "Business",
            BaseCurrency = string.IsNullOrWhiteSpace(request.BaseCurrency) ? "USD" : request.BaseCurrency.Trim().ToUpperInvariant(),
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            HasPassword = true,
            Role = "TenantAdmin",
            IsActive = true,
            PreferredCurrency = tenant.BaseCurrency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _tenantRepository.AddAsync(tenant);
        await _userRepository.AddAsync(user);

        var response = await BuildAuthResponseAsync(user, tenant.CompanyName);
        if (write != null) await write.CommitAsync();
        return response;
    }

    public async Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (user is not null && !user.HasPassword)
        {
            return ApiResult<AuthResponse>.Fail("This account was created with Google. Please sign in with Google or set a password in your account settings.");
        }

        if (user is null || !PasswordHasher.Verify(user.PasswordHash, request.Password))
        {
            return ApiResult<AuthResponse>.Fail("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Your account is inactive. Contact your organization administrator.");
        }

        return await BuildAuthResponseAsync(user, user.Tenant?.CompanyName ?? string.Empty);
    }

    public async Task<ApiResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Credential))
        {
            return ApiResult<AuthResponse>.Fail("Google credential is required.");
        }

        var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
            ?? _configuration["GoogleAuth:ClientId"]
            ?? _configuration["GOOGLE_CLIENT_ID"]
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(clientId))
        {
            return ApiResult<AuthResponse>.Fail("Google sign-in is not configured.");
        }

        GoogleAuthPayload claims;
        try
        {
            claims = await _googleValidator.ValidateAsync(request.Credential.Trim(), clientId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google credential verification failed.");
            return ApiResult<AuthResponse>.Fail("Invalid Google credential.");
        }

        if (string.IsNullOrWhiteSpace(claims.Subject) || string.IsNullOrWhiteSpace(claims.Email) || !claims.EmailVerified)
        {
            return ApiResult<AuthResponse>.Fail("Google account email is not verified.");
        }

        var googleSub = claims.Subject;
        var email = claims.Email.Trim().ToLowerInvariant();

        await using var write = await FinancialWriteScope.BeginAsync(_context, Guid.Empty);

        var user = await _userRepository.GetByGoogleSubAsync(googleSub);
        if (user is null)
        {
            user = await _userRepository.GetByEmailAsync(email);
            if (user is not null)
            {
                var googleIsAuthoritative = email.EndsWith("@gmail.com", StringComparison.OrdinalIgnoreCase) || !string.IsNullOrWhiteSpace(claims.HostedDomain);
                if (!googleIsAuthoritative)
                {
                    return ApiResult<AuthResponse>.Fail("Sign in with your password before linking this Google account.");
                }

                if (!string.IsNullOrEmpty(user.GoogleSub) && user.GoogleSub != googleSub)
                {
                    return ApiResult<AuthResponse>.Fail("This email is linked to another Google account.");
                }

                user.GoogleSub = googleSub;
                await _userRepository.UpdateAsync(user);
            }
            else
            {
                var name = !string.IsNullOrWhiteSpace(claims.Name) ? claims.Name.Trim() : email.Split('@')[0];
                var companyName = $"{name}'s Business";

                if (await _context.Tenants.AnyAsync(t => t.CompanyName == companyName))
                {
                    companyName = $"{companyName} ({Guid.NewGuid().ToString("N")[..4]})";
                }

                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    CompanyName = companyName,
                    ApiKey = Guid.NewGuid().ToString("N"),
                    PlanType = "Business",
                    BaseCurrency = "USD",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                user = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Tenant = tenant,
                    Email = email,
                    GoogleSub = googleSub,
                    PasswordHash = PasswordHasher.Hash(Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")),
                    HasPassword = false,
                    Role = "TenantAdmin",
                    IsActive = true,
                    PreferredCurrency = tenant.BaseCurrency,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _tenantRepository.AddAsync(tenant);
                await _userRepository.AddAsync(user);
            }
        }

        if (!user.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<AuthResponse>.Fail("Google account identity does not match the linked user.");
        }

        if (!user.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Your account is inactive. Contact your organization administrator.");
        }

        var response = await BuildAuthResponseAsync(user, user.Tenant?.CompanyName ?? string.Empty);
        if (write != null) await write.CommitAsync();
        return response;
    }

    public async Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_context, Guid.Empty);
        var token = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken);
        if (token is null || token.Revoked || token.ExpiresAt <= DateTime.UtcNow || token.User is null || !token.User.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Refresh token is invalid or expired.");
        }

        token.Revoked = true;
        var newRefreshToken = _tokenService.CreateRefreshToken(token.UserId);
        var rawRefreshToken = newRefreshToken.Token;
        newRefreshToken.Token = TokenService.HashRefreshToken(rawRefreshToken);
        await _refreshTokenRepository.AddAsync(newRefreshToken);

        var accessToken = _tokenService.CreateAccessToken(token.User);
        var response = new AuthResponse(
            accessToken,
            rawRefreshToken,
            token.User.Id,
            token.User.TenantId,
            token.User.Email,
            token.User.Role,
            token.User.Tenant?.CompanyName ?? string.Empty,
            token.User.PreferredCurrency,
            token.User.GoogleLinked,
            token.User.HasPassword
        );

        if (write != null) await write.CommitAsync();
        return ApiResult<AuthResponse>.Ok(response);
    }

    public async Task<ApiResult<UserProfileResponse>> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return ApiResult<UserProfileResponse>.Fail("User not found.");
        }

        var profile = new UserProfileResponse(
            user.Id,
            user.TenantId,
            user.Email,
            user.Role,
            user.IsActive,
            user.PreferredCurrency,
            user.Tenant?.CompanyName ?? string.Empty,
            user.GoogleLinked,
            user.HasPassword
        );

        return ApiResult<UserProfileResponse>.Ok(profile);
    }

    public async Task<ApiResult> SetPasswordAsync(Guid userId, SetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.NewPassword) || request.NewPassword.Length < 12)
        {
            return ApiResult.Fail("Password must be at least 12 characters long.");
        }
        if (!request.NewPassword.Any(char.IsUpper) || !request.NewPassword.Any(char.IsLower) || !request.NewPassword.Any(char.IsDigit))
        {
            return ApiResult.Fail("Password must contain uppercase, lowercase, and numeric characters.");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return ApiResult.Fail("User not found.");
        }

        if (user.HasPassword)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return ApiResult.Fail("Current password is required.");
            }
            if (!PasswordHasher.Verify(user.PasswordHash, request.CurrentPassword))
            {
                return ApiResult.Fail("Current password is incorrect.");
            }
        }

        await using var write = await FinancialWriteScope.BeginAsync(_context, Guid.Empty);
        user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
        user.HasPassword = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
        if (write != null) await write.CommitAsync();

        return ApiResult.Ok("Password updated successfully.");
    }

    private async Task<ApiResult<AuthResponse>> BuildAuthResponseAsync(User user, string companyName)
    {
        var accessToken = _tokenService.CreateAccessToken(user);
        var refreshToken = _tokenService.CreateRefreshToken(user.Id);
        var rawRefreshToken = refreshToken.Token;
        refreshToken.Token = TokenService.HashRefreshToken(rawRefreshToken);
        await _refreshTokenRepository.AddAsync(refreshToken);

        var response = new AuthResponse(
            accessToken,
            rawRefreshToken,
            user.Id,
            user.TenantId,
            user.Email,
            user.Role,
            companyName,
            user.PreferredCurrency,
            user.GoogleLinked,
            user.HasPassword
        );

        return ApiResult<AuthResponse>.Ok(response);
    }
}

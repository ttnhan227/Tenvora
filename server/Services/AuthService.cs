using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VeriSpend.Api.Common;
using VeriSpend.Api.Data;
using VeriSpend.Api.Dtos.Auth;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class AuthService : IAuthService
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly TokenService _tokenService;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        IDbContextFactory<AppDbContext> contextFactory,
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IRefreshTokenRepository refreshTokenRepository,
        TokenService tokenService,
        IOptions<JwtSettings> jwtSettings)
    {
        _contextFactory = contextFactory;
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        using var bypassContext = _contextFactory.CreateDbContext();
        var emailAlreadyRegistered = await bypassContext.Users
            .FromSqlRaw("SELECT * FROM public.\"Users\" WHERE \"Email\" = {0}", request.Email)
            .AnyAsync();
        if (emailAlreadyRegistered)
        {
            return ApiResult<AuthResponse>.Fail("Email already registered.");
        }

        var companyExists = await bypassContext.Tenants
            .FromSqlRaw("SELECT * FROM public.\"Tenants\" WHERE \"CompanyName\" = {0}", request.CompanyName)
            .AnyAsync();
        if (companyExists)
        {
            return ApiResult<AuthResponse>.Fail("Company name already exists.");
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = request.CompanyName,
            ApiKey = Guid.NewGuid().ToString("N"),
            PlanType = "Standard",
            MaxSpendLimit = 2_000_000m,
            BaseCurrency = "USD"
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = "Owner",
            IsActive = true,
            InviteToken = null,
            InviteTokenExpiresAt = null,
            TenantId = tenant.Id,
            Tenant = tenant,
            PreferredCurrency = "USD"
        };

        await using var transaction = await _tenantRepository.BeginTransactionAsync();
        try
        {
            await _tenantRepository.ExecuteSqlRawAsync(
                "SELECT set_config('app.current_tenant_id', @p0, true)",
                tenant.Id.ToString());

            await _tenantRepository.AddAsync(tenant);
            await _userRepository.AddAsync(user);
            await _tenantRepository.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return await BuildAuthResponseAsync(user);
    }

    public async Task<ApiResult<AuthResponse>> CreateDemoAsync()
    {
        var demoId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = demoId,
            CompanyName = $"Aperture Operations · {demoId.ToString("N")[..6].ToUpperInvariant()}",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            IsDemo = true,
            DemoExpiresAt = DateTime.UtcNow.AddHours(8)
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"owner+{demoId:N}@demo.verispend.app",
            PasswordHash = PasswordHasher.Hash(Guid.NewGuid().ToString("N")),
            Role = "Owner",
            IsActive = true,
            TenantId = tenant.Id,
            Tenant = tenant,
            PreferredCurrency = "USD"
        };

        StarterWorkspaceFactory.Populate(tenant, user, DateTime.UtcNow);
        await using var transaction = await _tenantRepository.BeginTransactionAsync();
        try
        {
            await _tenantRepository.ExecuteSqlRawAsync("SELECT set_config('app.current_tenant_id', @p0, true)", tenant.Id.ToString());
            await _tenantRepository.AddAsync(tenant);
            await _userRepository.AddAsync(user);
            await _tenantRepository.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return await BuildAuthResponseAsync(user);
    }

    public async Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user is null || !PasswordHasher.Verify(user.PasswordHash, request.Password))
        {
            return ApiResult<AuthResponse>.Fail("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Your account is inactive. Contact your Owner.");
        }

        return await BuildAuthResponseAsync(user);
    }

    public async Task<ApiResult<AuthResponse>> AcceptInviteAsync(AcceptInviteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResult<AuthResponse>.Fail("Invite token and password are required.");
        }

        if (request.Password.Length < 8)
        {
            return ApiResult<AuthResponse>.Fail("Password must be at least 8 characters.");
        }

        var user = await _userRepository.GetByInviteTokenAsync(request.Token.Trim());
        if (user is null || !user.InviteTokenExpiresAt.HasValue || user.InviteTokenExpiresAt.Value < DateTime.UtcNow)
        {
            return ApiResult<AuthResponse>.Fail("Invite token is invalid or expired.");
        }

        using var transaction = await _userRepository.BeginTransactionAsync();
        try
        {
            await _userRepository.ExecuteSqlRawAsync(
                "SELECT set_config('app.current_tenant_id', @p0, true)",
                user.TenantId.ToString());

            user.PasswordHash = PasswordHasher.Hash(request.Password);
            user.IsActive = true;
            user.InviteToken = null;
            user.InviteTokenExpiresAt = null;
            await _userRepository.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return await BuildAuthResponseAsync(user);
    }

    public async Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        using var bypassContext = _contextFactory.CreateDbContext();
        var token = await bypassContext.RefreshTokens
            .FromSqlRaw("SELECT * FROM public.\"RefreshTokens\" WHERE \"Token\" = {0}", request.RefreshToken)
            .Include(rt => rt.User)
            .ThenInclude(u => u.Tenant)
            .FirstOrDefaultAsync();

        if (token is null || token.Revoked || token.ExpiresAt <= DateTime.UtcNow || token.User is null || !token.User.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Refresh token is invalid or expired.");
        }

        token.Revoked = true;
        var newRefreshToken = _tokenService.CreateRefreshToken(token.UserId);
        await _refreshTokenRepository.AddAsync(newRefreshToken);
        await _refreshTokenRepository.SaveChangesAsync();

        var accessToken = _tokenService.CreateAccessToken(token.User);
        var profile = ToProfileResponse(token.User);
        var response = new AuthResponse(accessToken, newRefreshToken.Token, DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes), profile);

        return ApiResult<AuthResponse>.Ok(response);
    }

    public async Task<ApiResult<UserProfileResponse>> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return ApiResult<UserProfileResponse>.Fail("User not found.");
        }

        return ApiResult<UserProfileResponse>.Ok(ToProfileResponse(user));
    }

    public async Task<ApiResult> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return ApiResult.Fail("User not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.PreferredCurrency))
        {
            user.PreferredCurrency = request.PreferredCurrency.ToUpperInvariant();
        }

        await _userRepository.SaveChangesAsync();
        return ApiResult.Ok();
    }

    public async Task<ApiResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return ApiResult.Fail("User not found.");
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return ApiResult.Fail("Current and new password are required.");
        }

        if (!PasswordHasher.Verify(user.PasswordHash, request.CurrentPassword))
        {
            return ApiResult.Fail("Current password is incorrect.");
        }

        if (request.NewPassword.Length < 8)
        {
            return ApiResult.Fail("New password must be at least 8 characters.");
        }

        if (PasswordHasher.Verify(user.PasswordHash, request.NewPassword))
        {
            return ApiResult.Fail("New password must be different from the current password.");
        }

        user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
        await _userRepository.SaveChangesAsync();

        return ApiResult.Ok();
    }

    private async Task<ApiResult<AuthResponse>> BuildAuthResponseAsync(User user)
    {
        var accessToken = _tokenService.CreateAccessToken(user);
        var refreshToken = _tokenService.CreateRefreshToken(user.Id);
        await _refreshTokenRepository.AddAsync(refreshToken);
        await _refreshTokenRepository.SaveChangesAsync();

        var profile = ToProfileResponse(user);
        var response = new AuthResponse(accessToken, refreshToken.Token, DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes), profile);
        return ApiResult<AuthResponse>.Ok(response);
    }

    private UserProfileResponse ToProfileResponse(User user)
    {
        return new UserProfileResponse(
            user.Id,
            user.Email,
            user.Role,
            user.TenantId,
            user.Tenant?.CompanyName ?? string.Empty,
            user.Tenant?.PlanType ?? string.Empty,
            user.PreferredCurrency);
    }
}

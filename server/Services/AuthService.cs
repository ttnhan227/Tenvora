using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
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

    public AuthService(
        AppDbContext context,
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IRefreshTokenRepository refreshTokenRepository,
        TokenService tokenService)
    {
        _context = context;
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
    }

    public async Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        var emailAlreadyRegistered = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailAlreadyRegistered)
        {
            return ApiResult<AuthResponse>.Fail("Email already registered.");
        }

        var companyExists = await _context.Tenants.AnyAsync(t => t.CompanyName == request.CompanyName);
        if (companyExists)
        {
            return ApiResult<AuthResponse>.Fail("Company name already exists.");
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = request.CompanyName.Trim(),
            ApiKey = Guid.NewGuid().ToString("N"),
            PlanType = "Enterprise",
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
            Role = "TenantAdmin",
            IsActive = true,
            PreferredCurrency = tenant.BaseCurrency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _tenantRepository.AddAsync(tenant);
        await _userRepository.AddAsync(user);

        // Seed initial system operating account
        var opAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            AccountNumber = $"OP-{tenant.Id.ToString("N")[..6].ToUpperInvariant()}-{tenant.BaseCurrency}",
            AccountType = AccountTypes.Asset,
            Currency = tenant.BaseCurrency,
            CachedBalance = 1_000_000m,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.Accounts.AddAsync(opAccount);
        await _context.SaveChangesAsync();

        return await BuildAuthResponseAsync(user, tenant.CompanyName);
    }

    public async Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
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

    public async Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken);
        if (token is null || token.Revoked || token.ExpiresAt <= DateTime.UtcNow || token.User is null || !token.User.IsActive)
        {
            return ApiResult<AuthResponse>.Fail("Refresh token is invalid or expired.");
        }

        token.Revoked = true;
        var newRefreshToken = _tokenService.CreateRefreshToken(token.UserId);
        await _refreshTokenRepository.AddAsync(newRefreshToken);

        var accessToken = _tokenService.CreateAccessToken(token.User);
        var response = new AuthResponse(
            accessToken,
            newRefreshToken.Token,
            token.User.Id,
            token.User.TenantId,
            token.User.Email,
            token.User.Role,
            token.User.Tenant?.CompanyName ?? string.Empty
        );

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
            user.Tenant?.CompanyName ?? string.Empty
        );

        return ApiResult<UserProfileResponse>.Ok(profile);
    }

    private async Task<ApiResult<AuthResponse>> BuildAuthResponseAsync(User user, string companyName)
    {
        var accessToken = _tokenService.CreateAccessToken(user);
        var refreshToken = _tokenService.CreateRefreshToken(user.Id);
        await _refreshTokenRepository.AddAsync(refreshToken);

        var response = new AuthResponse(
            accessToken,
            refreshToken.Token,
            user.Id,
            user.TenantId,
            user.Email,
            user.Role,
            companyName
        );

        return ApiResult<AuthResponse>.Ok(response);
    }
}

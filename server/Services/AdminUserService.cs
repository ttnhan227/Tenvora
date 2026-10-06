using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;
using Tenvora.Api.Data;

namespace Tenvora.Api.Services;

public sealed class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _userRepository;
    private readonly AppDbContext _context;

    public AdminUserService(IUserRepository userRepository, AppDbContext context)
    {
        _userRepository = userRepository;
        _context = context;
    }

    public async Task<ApiResult<AdminUserResponse>> CreateUserAsync(Guid tenantId, AdminCreateUserRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_context, tenantId);
        if (!new[] { "TenantAdmin", "OperationsManager", "ReadOnly" }.Contains(request.Role))
            return ApiResult<AdminUserResponse>.Fail("Choose a supported workspace role.");
        var existing = await _userRepository.GetByEmailAndTenantAsync(request.Email.Trim().ToLowerInvariant(), tenantId);
        if (existing != null)
        {
            return ApiResult<AdminUserResponse>.Fail("A user with this email already exists in your organization.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            HasPassword = true,
            Role = request.Role,
            IsActive = true,
            PreferredCurrency = request.PreferredCurrency ?? "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        if (write != null) await write.CommitAsync();

        return ApiResult<AdminUserResponse>.Ok(new AdminUserResponse(
            user.Id,
            user.Email,
            user.Role,
            user.IsActive,
            user.PreferredCurrency,
            user.CreatedAt,
            user.GoogleLinked
        ));
    }

    public async Task<ApiResult<List<AdminUserResponse>>> GetUsersAsync(Guid tenantId)
    {
        var users = await _userRepository.GetAllByTenantAsync(tenantId);
        var response = users.Select(u => new AdminUserResponse(
            u.Id,
            u.Email,
            u.Role,
            u.IsActive,
            u.PreferredCurrency,
            u.CreatedAt,
            u.GoogleLinked
        )).ToList();

        return ApiResult<List<AdminUserResponse>>.Ok(response);
    }

    public async Task<ApiResult> ToggleUserActiveAsync(Guid tenantId, Guid userId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_context, tenantId);
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || user.TenantId != tenantId)
        {
            return ApiResult.Fail("User not found.");
        }

        if (user.IsActive && user.Role == "TenantAdmin")
        {
            var users = await _userRepository.GetAllByTenantAsync(tenantId);
            var otherActiveAdmins = users.Count(u => u.Role == "TenantAdmin" && u.IsActive && u.Id != userId);
            if (otherActiveAdmins == 0)
            {
                return ApiResult.Fail("Cannot deactivate the only active TenantAdmin.");
            }
        }

        user.IsActive = !user.IsActive;
        await _userRepository.UpdateAsync(user);
        if (write != null) await write.CommitAsync();

        return ApiResult.Ok();
    }
}

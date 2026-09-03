using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public sealed class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _userRepository;

    public AdminUserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<ApiResult<AdminUserResponse>> CreateUserAsync(Guid tenantId, AdminCreateUserRequest request)
    {
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
            Role = request.Role,
            IsActive = true,
            PreferredCurrency = request.PreferredCurrency ?? "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        return ApiResult<AdminUserResponse>.Ok(new AdminUserResponse(
            user.Id,
            user.Email,
            user.Role,
            user.IsActive,
            user.PreferredCurrency,
            user.CreatedAt
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
            u.CreatedAt
        )).ToList();

        return ApiResult<List<AdminUserResponse>>.Ok(response);
    }

    public async Task<ApiResult> ToggleUserActiveAsync(Guid tenantId, Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || user.TenantId != tenantId)
        {
            return ApiResult.Fail("User not found.");
        }

        user.IsActive = !user.IsActive;
        await _userRepository.UpdateAsync(user);

        return ApiResult.Ok();
    }
}

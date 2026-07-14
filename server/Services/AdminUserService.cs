using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Admin;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class AdminUserService : IAdminUserService
{
    private static readonly TimeSpan InviteLifetime = TimeSpan.FromDays(7);
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Manager",
        "Member",
    };

    private readonly IUserRepository _userRepository;

    public AdminUserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<ApiResult<IEnumerable<TenantUserResponse>>> GetTenantUsersAsync(Guid tenantId)
    {
        var users = await _userRepository.GetByTenantIdAsync(tenantId);
        var response = users.Select(ToResponse).ToArray();
        return ApiResult<IEnumerable<TenantUserResponse>>.Ok(response);
    }

    public async Task<ApiResult<InviteTenantUserResponse>> InviteTenantUserAsync(Guid tenantId, InviteTenantUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return ApiResult<InviteTenantUserResponse>.Fail("Email is required.");
        }

        if (!AllowedRoles.Contains(request.Role))
        {
            return ApiResult<InviteTenantUserResponse>.Fail("Role must be Manager or Member.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _userRepository.EmailExistsAsync(normalizedEmail))
        {
            return ApiResult<InviteTenantUserResponse>.Fail("Email already registered.");
        }

        var inviteToken = Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.Add(InviteLifetime);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = string.Empty,
            Role = NormalizeRole(request.Role),
            IsActive = false,
            InviteToken = inviteToken,
            InviteTokenExpiresAt = expiresAt,
            TenantId = tenantId,
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

var inviteUrl = $"/accept-invite?token={inviteToken}";
            var response = new InviteTenantUserResponse(user.Id, user.Email, user.Role, expiresAt);
        return ApiResult<InviteTenantUserResponse>.Ok(response);
    }

    public async Task<ApiResult<TenantUserResponse>> UpdateUserRoleAsync(Guid tenantId, Guid targetUserId, Guid actorUserId, UpdateUserRoleRequest request)
    {
        if (!AllowedRoles.Contains(request.Role))
        {
            return ApiResult<TenantUserResponse>.Fail("Role must be Owner, Manager, or Member.");
        }

        var user = await _userRepository.GetByIdAndTenantAsync(targetUserId, tenantId);
        if (user is null)
        {
            return ApiResult<TenantUserResponse>.Fail("User not found.");
        }

        if (user.Id == actorUserId)
        {
            return ApiResult<TenantUserResponse>.Fail("You cannot edit your own role.");
        }

        var newRole = NormalizeRole(request.Role);
        var isDemotingOwner = user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) && !newRole.Equals("Owner", StringComparison.OrdinalIgnoreCase);

        if (isDemotingOwner)
        {
            var ownerCount = await _userRepository.CountByRoleAsync(tenantId, "Owner");
            if (ownerCount <= 1)
            {
                return ApiResult<TenantUserResponse>.Fail("At least one Owner is required per tenant.");
            }
        }

        user.Role = newRole;
        await _userRepository.SaveChangesAsync();

        return ApiResult<TenantUserResponse>.Ok(ToResponse(user));
    }

    public async Task<ApiResult<TenantUserResponse>> UpdateUserStatusAsync(Guid tenantId, Guid targetUserId, Guid actorUserId, UpdateUserStatusRequest request)
    {
        var user = await _userRepository.GetByIdAndTenantAsync(targetUserId, tenantId);
        if (user is null)
        {
            return ApiResult<TenantUserResponse>.Fail("User not found.");
        }

        if (user.Id == actorUserId && !request.IsActive)
        {
            return ApiResult<TenantUserResponse>.Fail("You cannot deactivate your own account.");
        }

        var isDeactivatingOwner = user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) && !request.IsActive;
        if (isDeactivatingOwner)
        {
            var activeOwners = (await _userRepository.GetByTenantIdAsync(tenantId))
                .Count(candidate => candidate.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) && candidate.IsActive);

            if (activeOwners <= 1)
            {
                return ApiResult<TenantUserResponse>.Fail("At least one active Owner is required per tenant.");
            }
        }

        user.IsActive = request.IsActive;
        await _userRepository.SaveChangesAsync();
        return ApiResult<TenantUserResponse>.Ok(ToResponse(user));
    }

    private static TenantUserResponse ToResponse(User user)
    {
        var invitationPending = !user.IsActive
            && !string.IsNullOrWhiteSpace(user.InviteToken)
            && user.InviteTokenExpiresAt.HasValue
            && user.InviteTokenExpiresAt.Value >= DateTime.UtcNow;

        return new TenantUserResponse(user.Id, user.Email, user.Role, user.IsActive, invitationPending);
    }

    private static string NormalizeRole(string role)
    {
        if (role.Equals("Owner", StringComparison.OrdinalIgnoreCase)) return "Owner";
        if (role.Equals("Manager", StringComparison.OrdinalIgnoreCase)) return "Manager";
        return "Member";
    }
}

using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Admin;

namespace VeriSpend.Api.Services;

public interface IAdminUserService
{
    Task<ApiResult<IEnumerable<TenantUserResponse>>> GetTenantUsersAsync(Guid tenantId);
    Task<ApiResult<InviteTenantUserResponse>> InviteTenantUserAsync(Guid tenantId, InviteTenantUserRequest request);
    Task<ApiResult<TenantUserResponse>> UpdateUserRoleAsync(Guid tenantId, Guid targetUserId, Guid actorUserId, UpdateUserRoleRequest request);
    Task<ApiResult<TenantUserResponse>> UpdateUserStatusAsync(Guid tenantId, Guid targetUserId, Guid actorUserId, UpdateUserStatusRequest request);
}

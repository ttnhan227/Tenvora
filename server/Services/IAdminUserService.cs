using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAdminUserService
{
    Task<ApiResult<AdminUserResponse>> CreateUserAsync(Guid tenantId, AdminCreateUserRequest request);
    Task<ApiResult<List<AdminUserResponse>>> GetUsersAsync(Guid tenantId);
    Task<ApiResult> ToggleUserActiveAsync(Guid tenantId, Guid userId);
}

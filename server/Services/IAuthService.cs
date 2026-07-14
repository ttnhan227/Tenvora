using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Auth;

namespace VeriSpend.Api.Services;

public interface IAuthService
{
    Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResult<AuthResponse>> AcceptInviteAsync(AcceptInviteRequest request);
    Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ApiResult<UserProfileResponse>> GetProfileAsync(Guid userId);
    Task<ApiResult> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<ApiResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
}

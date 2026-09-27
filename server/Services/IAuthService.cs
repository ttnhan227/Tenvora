using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAuthService
{
    Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request);
    Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ApiResult> LogoutAsync(Guid userId, string? refreshToken = null);
    Task<ApiResult<UserProfileResponse>> GetProfileAsync(Guid userId);
    Task<ApiResult> SetPasswordAsync(Guid userId, SetPasswordRequest request);
    Task<ApiResult<UserProfileResponse>> CompleteOnboardingAsync(Guid userId, Guid tenantId, CompleteOnboardingRequest request);
    Task<ApiResult<UserProfileResponse>> UpdateSettingsAsync(Guid userId, Guid tenantId, UpdateSettingsRequest request);
}

using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAuthService
{
    Task<ApiResult<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResult<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ApiResult<UserProfileResponse>> GetProfileAsync(Guid userId);
}

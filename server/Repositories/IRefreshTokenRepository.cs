using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task AddAsync(RefreshToken token);
    Task RevokeUserTokensAsync(Guid userId);
}

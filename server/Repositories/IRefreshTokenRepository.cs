using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task AddAsync(RefreshToken refreshToken);
    Task SaveChangesAsync();
}

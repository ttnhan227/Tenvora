using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task AddAsync(RefreshToken refreshToken);
    Task SaveChangesAsync();
}

#can you read this code and explain what it does? Lilith
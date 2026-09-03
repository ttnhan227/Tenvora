using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface IIdempotencyRepository
{
    Task<IdempotencyRecord?> GetAsync(Guid tenantId, string key);
    Task<bool> TryCreateAsync(IdempotencyRecord record);
    Task UpdateAsync(IdempotencyRecord record);
}

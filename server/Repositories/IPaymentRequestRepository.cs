using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface IPaymentRequestRepository
{
    Task<PaymentRequest?> GetByIdAsync(Guid tenantId, Guid id);
    Task<PaymentRequest?> GetByIdempotencyKeyAsync(Guid tenantId, string idempotencyKey);
    Task<List<PaymentRequest>> GetAllAsync(Guid tenantId, string? status = null);
    Task AddAsync(PaymentRequest request);
    Task UpdateAsync(PaymentRequest request);
}

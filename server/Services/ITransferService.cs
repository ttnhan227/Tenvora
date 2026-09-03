using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface ITransferService
{
    Task<CreatePaymentResponse> ExecuteTransferAsync(Guid tenantId, string idempotencyKey, CreateTransferRequest request, string? actorEmail = null);
    Task<CreatePaymentResponse> ReverseTransactionAsync(Guid tenantId, Guid transactionId, string? reason = null, string? actorEmail = null);
    Task<TransactionResponse?> GetTransactionByIdAsync(Guid tenantId, Guid transactionId);
    Task<List<TransactionResponse>> GetTransactionsAsync(Guid tenantId, string? status = null, int limit = 100);
}

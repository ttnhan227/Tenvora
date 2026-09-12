using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IInvoiceService
{
    Task<ApiResult<List<InvoiceSummaryDto>>> GetInvoicesAsync(Guid tenantId, string? status = null, Guid? clientId = null);
    Task<ApiResult<InvoiceSummaryDto>> GetInvoiceByIdAsync(Guid tenantId, Guid invoiceId);
    Task<ApiResult<InvoiceStatsDto>> GetInvoiceStatsAsync(Guid tenantId);
    Task<ApiResult<InvoiceSummaryDto>> CreateInvoiceAsync(Guid tenantId, CreateInvoiceRequest request);
    Task<ApiResult<InvoiceSummaryDto>> SendInvoiceAsync(Guid tenantId, Guid invoiceId);
    Task<ApiResult<InvoiceSummaryDto>> PayInvoiceAsync(Guid tenantId, Guid invoiceId, PayInvoiceRequest request);
    Task<ApiResult<bool>> DeleteInvoiceAsync(Guid tenantId, Guid invoiceId);
}

using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IBusinessService
{
    Task<ApiResult<List<BusinessCustomerDto>>> GetCustomersAsync(Guid tenantId, string? search, string? status);
    Task<ApiResult<BusinessCustomerDetailDto>> GetCustomerAsync(Guid tenantId, Guid customerId);
    Task<ApiResult<BusinessCustomerDto>> CreateCustomerAsync(Guid tenantId, CreateBusinessCustomerRequest request);
    Task<ApiResult<BusinessCustomerDto>> UpdateCustomerAsync(Guid tenantId, Guid customerId, UpdateBusinessCustomerRequest request);

    Task<ApiResult<List<ProductDto>>> GetProductsAsync(Guid tenantId, string? search, bool? active);
    Task<ApiResult<ProductDto>> GetProductAsync(Guid tenantId, Guid productId);
    Task<ApiResult<ProductDto>> CreateProductAsync(Guid tenantId, CreateProductRequest request);
    Task<ApiResult<ProductDto>> UpdateProductAsync(Guid tenantId, Guid productId, UpdateProductRequest request);

    Task<ApiResult<List<SaleSummaryDto>>> GetSalesAsync(Guid tenantId, string? search, Guid? customerId, DateTime? from, DateTime? to);
    Task<ApiResult<SaleSummaryDto>> GetSaleAsync(Guid tenantId, Guid saleId);
    Task<ApiResult<SaleSummaryDto>> CreateSaleAsync(Guid tenantId, string idempotencyKey, CreateSaleRequest request);
    Task<ApiResult<SaleSummaryDto>> RecordPaymentAsync(Guid tenantId, Guid saleId, string idempotencyKey, RecordBusinessPaymentRequest request);
    Task<ApiResult<SaleSummaryDto>> VoidSaleAsync(Guid tenantId, Guid saleId);

    Task<ApiResult<CustomerAccountPaymentResultDto>> RecordCustomerAccountPaymentAsync(Guid tenantId, Guid customerId, string idempotencyKey, RecordCustomerAccountPaymentRequest request);

    Task<ApiResult<List<SupplierDto>>> GetSuppliersAsync(Guid tenantId, string? search, string? status);
    Task<ApiResult<SupplierDetailDto>> GetSupplierAsync(Guid tenantId, Guid supplierId);
    Task<ApiResult<SupplierDto>> CreateSupplierAsync(Guid tenantId, CreateSupplierRequest request);
    Task<ApiResult<SupplierDto>> UpdateSupplierAsync(Guid tenantId, Guid supplierId, UpdateSupplierRequest request);
    Task<ApiResult<List<PurchaseDto>>> GetPurchasesAsync(Guid tenantId, string? search, Guid? supplierId, DateTime? from, DateTime? to);
    Task<ApiResult<PurchaseDto>> GetPurchaseAsync(Guid tenantId, Guid purchaseId);
    Task<ApiResult<PurchaseDto>> CreatePurchaseAsync(Guid tenantId, string idempotencyKey, CreatePurchaseRequest request);
    Task<ApiResult<PurchaseDto>> RecordPurchasePaymentAsync(Guid tenantId, Guid purchaseId, string idempotencyKey, RecordPurchasePaymentRequest request);
    Task<ApiResult<PurchaseDto>> VoidPurchaseAsync(Guid tenantId, Guid purchaseId);
    Task<ApiResult<List<BusinessExpenseDto>>> GetBusinessExpensesAsync(Guid tenantId, string? search, string? category, DateTime? from, DateTime? to);
    Task<ApiResult<BusinessExpenseDto>> CreateBusinessExpenseAsync(Guid tenantId, string idempotencyKey, CreateBusinessExpenseRequest request);
    Task<ApiResult<BusinessExpenseDto>> UpdateBusinessExpenseAsync(Guid tenantId, Guid expenseId, UpdateBusinessExpenseRequest request);
    Task<ApiResult> DeleteBusinessExpenseAsync(Guid tenantId, Guid expenseId);
    Task<ApiResult<BusinessDashboardDto>> GetDashboardAsync(Guid tenantId, string? period = "today", DateTime? from = null, DateTime? to = null);
}

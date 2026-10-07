using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IBusinessService
{
    Task<ApiResult<List<BusinessCustomerDto>>> GetCustomersAsync(Guid tenantId, string? search, string? status);
    Task<ApiResult<PagedResult<BusinessCustomerDto>>> GetCustomersPagedAsync(Guid tenantId, string? search, string? status, int page, int pageSize);
    Task<ApiResult<BusinessCustomerDetailDto>> GetCustomerAsync(Guid tenantId, Guid customerId);
    Task<ApiResult<CustomerStatementDto>> GetCustomerStatementAsync(Guid tenantId, Guid customerId, DateTime? from, DateTime? to);
    Task<ApiResult<BusinessCustomerDto>> CreateCustomerAsync(Guid tenantId, CreateBusinessCustomerRequest request);
    Task<ApiResult<BusinessCustomerDto>> UpdateCustomerAsync(Guid tenantId, Guid customerId, UpdateBusinessCustomerRequest request);
    Task<ApiResult<RecordDeletionResultDto>> DeleteCustomerAsync(Guid tenantId, Guid customerId);

    Task<ApiResult<List<ProductDto>>> GetProductsAsync(Guid tenantId, string? search, bool? active);
    Task<ApiResult<PagedResult<ProductDto>>> GetProductsPagedAsync(Guid tenantId, string? search, bool? active, int page, int pageSize);
    Task<ApiResult<ProductDto>> GetProductAsync(Guid tenantId, Guid productId);
    Task<ApiResult<ProductDto>> CreateProductAsync(Guid tenantId, CreateProductRequest request);
    Task<ApiResult<ProductDto>> UpdateProductAsync(Guid tenantId, Guid productId, UpdateProductRequest request);
    Task<ApiResult<RecordDeletionResultDto>> DeleteProductAsync(Guid tenantId, Guid productId);

    Task<ApiResult<StockAdjustmentDto>> CreateStockAdjustmentAsync(Guid tenantId, Guid? userId, CreateStockAdjustmentRequest request, string? idempotencyKey = null);
    Task<ApiResult<List<StockAdjustmentDto>>> GetStockAdjustmentsAsync(Guid tenantId, Guid? productId);

    Task<ApiResult<List<SaleSummaryDto>>> GetSalesAsync(Guid tenantId, string? search, Guid? customerId, DateTime? from, DateTime? to);
    Task<ApiResult<PagedResult<SaleSummaryDto>>> GetSalesPagedAsync(Guid tenantId, string? search, Guid? customerId, DateTime? from, DateTime? to, int page, int pageSize);
    Task<ApiResult<SaleSummaryDto>> GetSaleAsync(Guid tenantId, Guid saleId);
    Task<ApiResult<SaleSummaryDto>> CreateSaleAsync(Guid tenantId, string idempotencyKey, CreateSaleRequest request);
    Task<ApiResult<SaleSummaryDto>> RecordPaymentAsync(Guid tenantId, Guid saleId, string idempotencyKey, RecordBusinessPaymentRequest request);
    Task<ApiResult<SaleSummaryDto>> ReverseSalePaymentAsync(Guid tenantId, Guid saleId, Guid paymentId, Guid? userId, ReversePaymentRequest request);
    Task<ApiResult<SaleSummaryDto>> VoidSaleAsync(Guid tenantId, Guid saleId, Guid? userId = null, VoidSaleRequest? request = null);

    Task<ApiResult<CustomerAccountPaymentResultDto>> RecordCustomerAccountPaymentAsync(Guid tenantId, Guid customerId, string idempotencyKey, RecordCustomerAccountPaymentRequest request);

    Task<ApiResult<List<SupplierDto>>> GetSuppliersAsync(Guid tenantId, string? search, string? status);
    Task<ApiResult<PagedResult<SupplierDto>>> GetSuppliersPagedAsync(Guid tenantId, string? search, string? status, int page, int pageSize);
    Task<ApiResult<SupplierDetailDto>> GetSupplierAsync(Guid tenantId, Guid supplierId);
    Task<ApiResult<SupplierDto>> CreateSupplierAsync(Guid tenantId, CreateSupplierRequest request);
    Task<ApiResult<SupplierDto>> UpdateSupplierAsync(Guid tenantId, Guid supplierId, UpdateSupplierRequest request);
    Task<ApiResult<RecordDeletionResultDto>> DeleteSupplierAsync(Guid tenantId, Guid supplierId);

    Task<ApiResult<List<PurchaseDto>>> GetPurchasesAsync(Guid tenantId, string? search, Guid? supplierId, DateTime? from, DateTime? to);
    Task<ApiResult<PagedResult<PurchaseDto>>> GetPurchasesPagedAsync(Guid tenantId, string? search, Guid? supplierId, DateTime? from, DateTime? to, int page, int pageSize);
    Task<ApiResult<PurchaseDto>> GetPurchaseAsync(Guid tenantId, Guid purchaseId);
    Task<ApiResult<PurchaseDto>> CreatePurchaseAsync(Guid tenantId, string idempotencyKey, CreatePurchaseRequest request);
    Task<ApiResult<PurchaseDto>> RecordPurchasePaymentAsync(Guid tenantId, Guid purchaseId, string idempotencyKey, RecordPurchasePaymentRequest request);
    Task<ApiResult<PurchaseDto>> ReversePurchasePaymentAsync(Guid tenantId, Guid purchaseId, Guid paymentId, Guid? userId, ReversePaymentRequest request);
    Task<ApiResult<PurchaseDto>> VoidPurchaseAsync(Guid tenantId, Guid purchaseId, Guid? userId = null, VoidPurchaseRequest? request = null);

    Task<ApiResult<List<BusinessExpenseDto>>> GetBusinessExpensesAsync(Guid tenantId, string? search, string? category, DateTime? from, DateTime? to);
    Task<ApiResult<PagedResult<BusinessExpenseDto>>> GetBusinessExpensesPagedAsync(Guid tenantId, string? search, string? category, DateTime? from, DateTime? to, int page, int pageSize);
    Task<ApiResult<BusinessExpenseDto>> CreateBusinessExpenseAsync(Guid tenantId, string idempotencyKey, CreateBusinessExpenseRequest request);
    Task<ApiResult<BusinessExpenseDto>> UpdateBusinessExpenseAsync(Guid tenantId, Guid expenseId, UpdateBusinessExpenseRequest request);
    Task<ApiResult> DeleteBusinessExpenseAsync(Guid tenantId, Guid expenseId);
    Task<ApiResult<BusinessDashboardDto>> GetDashboardAsync(Guid tenantId, string? period = "today", DateTime? from = null, DateTime? to = null);
}

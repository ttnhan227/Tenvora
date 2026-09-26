using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record BusinessCustomerDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes,
    string Status,
    string Currency,
    decimal TotalSales,
    decimal TotalPaid,
    decimal OutstandingBalance,
    int SalesCount,
    DateTime CreatedAt
);

public record BusinessCustomerDetailDto(
    BusinessCustomerDto Customer,
    List<SaleSummaryDto> Sales,
    List<BusinessPaymentDto> Payments
);

public record CreateBusinessCustomerRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(50)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email,
    [MaxLength(300)] string? Address,
    [MaxLength(1000)] string? Notes
);

public record UpdateBusinessCustomerRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(50)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email,
    [MaxLength(300)] string? Address,
    [MaxLength(1000)] string? Notes,
    [RegularExpression("Active|Archived")] string Status = "Active"
);

public record ProductDto(
    Guid Id,
    string Name,
    string? Sku,
    string Unit,
    decimal DefaultPrice,
    string Currency,
    bool IsActive,
    string? Notes,
    DateTime CreatedAt
);

public record CreateProductRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(100)] string? Sku,
    [Required, MaxLength(40)] string Unit,
    decimal DefaultPrice,
    [MaxLength(1000)] string? Notes
);

public record UpdateProductRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(100)] string? Sku,
    [Required, MaxLength(40)] string Unit,
    decimal DefaultPrice,
    bool IsActive,
    [MaxLength(1000)] string? Notes
);

public record CreateSaleItemRequest(Guid ProductId, decimal Quantity, decimal? UnitPrice = null);

public record CreateSaleRequest(
    Guid CustomerId,
    [MinLength(1)] List<CreateSaleItemRequest> Items,
    decimal PaymentAmount = 0m,
    [MaxLength(50)] string PaymentMethod = "Other",
    [MaxLength(1000)] string? Notes = null,
    DateTime? SoldAt = null
);

public record RecordBusinessPaymentRequest(
    decimal Amount,
    [MaxLength(50)] string Method = "Other",
    [MaxLength(200)] string? Reference = null,
    [MaxLength(1000)] string? Notes = null,
    DateTime? PaidAt = null
);

public record SaleItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineTotal
);

public record BusinessPaymentDto(
    Guid Id,
    Guid SaleId,
    string SaleNumber,
    Guid CustomerId,
    decimal Amount,
    string Currency,
    string Method,
    string? Reference,
    string? Notes,
    DateTime PaidAt
);

public record SaleSummaryDto(
    Guid Id,
    string SaleNumber,
    Guid CustomerId,
    string CustomerName,
    string Currency,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingBalance,
    string PaymentStatus,
    string Status,
    string? Notes,
    DateTime SoldAt,
    DateTime CreatedAt,
    List<SaleItemDto> Items,
    List<BusinessPaymentDto> Payments
);

public record SupplierDto(Guid Id, string Name, string? Phone, string? Email, string? Address, string? Notes,
    string Status, string Currency, decimal TotalPurchases, decimal TotalPaid, decimal OutstandingBalance,
    int PurchaseCount, DateTime CreatedAt);

public record SupplierDetailDto(SupplierDto Supplier, List<PurchaseDto> Purchases, List<PurchasePaymentDto> Payments);

public record CreateSupplierRequest([Required, MaxLength(200)] string Name, [MaxLength(50)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email, [MaxLength(300)] string? Address, [MaxLength(1000)] string? Notes);

public record UpdateSupplierRequest([Required, MaxLength(200)] string Name, [MaxLength(50)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email, [MaxLength(300)] string? Address, [MaxLength(1000)] string? Notes,
    [RegularExpression("Active|Archived")] string Status = "Active");

public record CreatePurchaseItemRequest([MaxLength(200)] string Description, [MaxLength(40)] string Unit,
    decimal Quantity, decimal UnitCost, Guid? ProductId = null);

public record CreatePurchaseRequest(Guid SupplierId, [MinLength(1)] List<CreatePurchaseItemRequest> Items,
    decimal PaymentAmount = 0m, [MaxLength(50)] string PaymentMethod = "Other",
    [MaxLength(1000)] string? Notes = null, DateTime? PurchasedAt = null);

public record RecordPurchasePaymentRequest(decimal Amount, [MaxLength(50)] string Method = "Other",
    [MaxLength(200)] string? Reference = null, [MaxLength(1000)] string? Notes = null, DateTime? PaidAt = null);

public record PurchaseItemDto(Guid Id, Guid? ProductId, string Description, string Unit, decimal Quantity,
    decimal UnitCost, decimal LineTotal);

public record PurchasePaymentDto(Guid Id, Guid PurchaseId, string PurchaseNumber, Guid SupplierId, decimal Amount,
    string Currency, string Method, string? Reference, string? Notes, DateTime PaidAt);

public record PurchaseDto(Guid Id, string PurchaseNumber, Guid SupplierId, string SupplierName, string Currency,
    decimal TotalAmount, decimal PaidAmount, decimal OutstandingBalance, string PaymentStatus, string Status,
    string? Notes, DateTime PurchasedAt, DateTime CreatedAt, List<PurchaseItemDto> Items,
    List<PurchasePaymentDto> Payments);

public record CreateBusinessExpenseRequest([Required, MaxLength(50)] string Category, decimal Amount,
    DateTime? ExpenseDate = null, [MaxLength(1000)] string? Description = null);

public record BusinessExpenseDto(Guid Id, string Category, decimal Amount, string Currency, string? Description,
    DateTime ExpenseDate, DateTime CreatedAt);

public record BusinessActivityDto(string Type, Guid Id, string Title, string Detail, decimal Amount, DateTime OccurredAt);

public record BusinessDashboardDto(string Currency, decimal TodaySales, decimal TodayPayments, decimal TodayPurchases,
    decimal TodaySupplierPayments, decimal TodayExpenses, decimal OutstandingCustomers, decimal OutstandingSuppliers,
    List<BusinessCustomerDto> UnpaidCustomers, List<SupplierDto> UnpaidSuppliers,
    List<BusinessActivityDto> RecentActivity);

using System;
using System.Collections.Generic;

namespace Tenvora.Dtos;

public record SearchCustomerDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Email,
    decimal TotalDebt,
    string Status
);

public record SearchProductDto(
    Guid Id,
    string Name,
    string? Sku,
    decimal SellingPrice,
    decimal StockQuantity,
    string Unit,
    bool TrackInventory,
    bool IsActive
);

public record SearchSaleDto(
    Guid Id,
    string SaleNumber,
    string? CustomerName,
    decimal TotalAmount,
    decimal PaidAmount,
    string Status,
    DateTime CreatedAt
);

public record SearchPurchaseDto(
    Guid Id,
    string PurchaseNumber,
    string? SupplierName,
    decimal TotalAmount,
    decimal PaidAmount,
    string Status,
    DateTime CreatedAt
);

public record SearchResultDto(
    string Query,
    List<SearchCustomerDto> Customers,
    List<SearchProductDto> Products,
    List<SearchSaleDto> Sales,
    List<SearchPurchaseDto> Purchases
);

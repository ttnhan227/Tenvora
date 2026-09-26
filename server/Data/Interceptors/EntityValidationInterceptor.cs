using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Data.Interceptors;

public sealed class EntityValidationInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    { Validate(eventData.Context); return base.SavingChanges(eventData, result); }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
        InterceptionResult<int> result, CancellationToken cancellationToken = default)
    { Validate(eventData.Context); return base.SavingChangesAsync(eventData, result, cancellationToken); }

    private static void Validate(DbContext? context)
    {
        if (context == null) return;
        foreach (var entry in context.ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            Validator.ValidateObject(entry.Entity, new ValidationContext(entry.Entity), true);
            switch (entry.Entity)
            {
                case Product product when product.DefaultPrice < 0:
                    throw new ValidationException("Product price cannot be negative.");
                case Sale sale when sale.TotalAmount <= 0:
                    throw new ValidationException("Sale total must be positive.");
                case SaleItem item when item.Quantity <= 0 || item.UnitPrice < 0 || item.LineTotal < 0:
                    throw new ValidationException("Sale items require a positive quantity and non-negative price.");
                case Payment payment when payment.Amount <= 0:
                    throw new ValidationException("Customer payment amount must be positive.");
                case Purchase purchase when purchase.TotalAmount <= 0:
                    throw new ValidationException("Purchase total must be positive.");
                case PurchaseItem item when item.Quantity <= 0 || item.UnitCost < 0 || item.LineTotal < 0:
                    throw new ValidationException("Purchase items require a positive quantity and non-negative cost.");
                case PurchasePayment payment when payment.Amount <= 0:
                    throw new ValidationException("Supplier payment amount must be positive.");
                case BusinessExpense expense when expense.Amount <= 0:
                    throw new ValidationException("Expense amount must be positive.");
            }
        }
    }
}

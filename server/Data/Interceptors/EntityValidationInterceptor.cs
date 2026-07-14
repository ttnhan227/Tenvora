using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Data.Interceptors;

public sealed class EntityValidationInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, 
        InterceptionResult<int> result)
    {
        ValidateEntities(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, 
        InterceptionResult<int> result, 
        CancellationToken cancellationToken = default)
    {
        ValidateEntities(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void ValidateEntities(DbContext? context)
    {
        if (context == null) return;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            var entity = entry.Entity;
            
            // Execute standard Data Annotations validations
            var validationContext = new ValidationContext(entity);
            Validator.ValidateObject(entity, validationContext, validateAllProperties: true);

            // Execute custom Business Entity Rules for Expenses
            if (entity is Expense expense)
            {
                if (expense.Amount <= 0)
                {
                    throw new ValidationException($"Data Integrity Gate: Expense amount ({expense.Amount}) must be positive and greater than 0.");
                }
                
                if (string.IsNullOrWhiteSpace(expense.Merchant))
                {
                    throw new ValidationException("Data Integrity Gate: Merchant is a required field.");
                }

                if (string.IsNullOrWhiteSpace(expense.Category))
                {
                    throw new ValidationException("Data Integrity Gate: Category is a required field.");
                }

                // Protect against future dates (with a 24h timezone buffer)
                if (expense.Date > DateTime.UtcNow.AddDays(1))
                {
                    throw new ValidationException("Data Integrity Gate: Expense date cannot be set in the future.");
                }
            }
        }
    }
}

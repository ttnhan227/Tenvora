using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Data.Interceptors;

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

            // Execute custom Financial Integrity Rules
            if (entity is PaymentRequest paymentRequest)
            {
                if (paymentRequest.Amount <= 0)
                    throw new ValidationException($"Financial Integrity Gate: PaymentRequest amount ({paymentRequest.Amount}) must be strictly positive.");
                if (string.IsNullOrWhiteSpace(paymentRequest.Currency) || paymentRequest.Currency.Length != 3)
                    throw new ValidationException("Financial Integrity Gate: Currency must be a 3-letter ISO-4217 code.");
            }
            else if (entity is Transaction tx)
            {
                if (tx.Amount <= 0)
                    throw new ValidationException($"Financial Integrity Gate: Transaction amount ({tx.Amount}) must be strictly positive.");
                if (string.IsNullOrWhiteSpace(tx.Currency) || tx.Currency.Length != 3)
                    throw new ValidationException("Financial Integrity Gate: Currency must be a 3-letter ISO-4217 code.");
            }
            else if (entity is LedgerEntry entryLine)
            {
                if (entryLine.DebitAmount < 0 || entryLine.CreditAmount < 0)
                    throw new ValidationException("Financial Integrity Gate: Ledger amounts cannot be negative.");
                if (entryLine.DebitAmount == 0 && entryLine.CreditAmount == 0)
                    throw new ValidationException("Financial Integrity Gate: Ledger entry must have either a non-zero Debit or Credit amount.");
                if (entryLine.DebitAmount > 0 && entryLine.CreditAmount > 0)
                    throw new ValidationException("Financial Integrity Gate: A single ledger line cannot have both Debit and Credit amounts.");
            }
            else if (entity is Account account)
            {
                if (string.IsNullOrWhiteSpace(account.Currency) || account.Currency.Length != 3)
                    throw new ValidationException("Financial Integrity Gate: Account currency must be a 3-letter ISO-4217 code.");
            }
        }
    }
}

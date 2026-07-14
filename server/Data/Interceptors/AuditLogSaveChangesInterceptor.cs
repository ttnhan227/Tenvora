using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Data.Interceptors;

public sealed class AuditLogSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, 
        InterceptionResult<int> result)
    {
        OnBeforeSaveChanges(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, 
        InterceptionResult<int> result, 
        CancellationToken cancellationToken = default)
    {
        OnBeforeSaveChanges(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void OnBeforeSaveChanges(DbContext? context)
    {
        if (context == null) return;

        context.ChangeTracker.DetectChanges();
        var auditLogs = new List<AuditLog>();

        // Safely extract the current user credentials from HttpContext
        var httpContext = _httpContextAccessor.HttpContext;
        var performedBy = httpContext?.User?.Identity?.Name 
            ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "System / Auto-Auditor";

        foreach (var entry in context.ChangeTracker.Entries<Expense>())
        {
            if (entry.State is EntityState.Detached or EntityState.Unchanged)
                continue;

            var expense = entry.Entity;
            var action = entry.State switch
            {
                EntityState.Added => "Created",
                EntityState.Deleted => "Deleted",
                EntityState.Modified => expense.IsDeleted ? "Deleted" : "Updated",
                _ => "Updated"
            };

            string? oldValue = null;
            string? newValue = null;
            var changesList = new List<string>();

            if (entry.State == EntityState.Modified)
            {
                var originalSnapshot = new Dictionary<string, object?>();
                var currentSnapshot = new Dictionary<string, object?>();

                foreach (var prop in entry.Properties)
                {
                    if (prop.Metadata.Name is nameof(Expense.Id) or nameof(Expense.CreatedAt) or nameof(Expense.UpdatedAt) or nameof(Expense.TenantId) or nameof(Expense.UserId))
                        continue;

                    if (prop.IsModified)
                    {
                        var before = prop.OriginalValue;
                        var after = prop.CurrentValue;

                        if (!Equals(before, after))
                        {
                            originalSnapshot[prop.Metadata.Name] = before;
                            currentSnapshot[prop.Metadata.Name] = after;
                            changesList.Add($"{prop.Metadata.Name}: {before} -> {after}");
                        }
                    }
                }

                if (changesList.Count == 0)
                    continue; // Skip logs if no audited values actually modified

                oldValue = JsonSerializer.Serialize(originalSnapshot);
                newValue = JsonSerializer.Serialize(currentSnapshot);
            }
            else if (entry.State == EntityState.Added)
            {
                newValue = JsonSerializer.Serialize(new
                {
                    expense.Id,
                    expense.Amount,
                    expense.Currency,
                    expense.Merchant,
                    expense.Category,
                    expense.Description,
                    expense.Status,
                    expense.Flagged,
                    expense.FlagReason
                });
                changesList.Add($"Expense created with Amount {expense.Amount} {expense.Currency} at Merchant {expense.Merchant}");
            }

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                ExpenseId = expense.Id,
                Action = action,
                PerformedBy = performedBy,
                Timestamp = DateTime.UtcNow,
                OldValue = oldValue,
                NewValue = newValue,
                Notes = string.Join(" | ", changesList)
            };

            auditLogs.Add(auditLog);
        }

        if (auditLogs.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditLogs);
        }
    }
}

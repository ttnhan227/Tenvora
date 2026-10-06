using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data.Interceptors;

public sealed class AuditLogSaveChangesInterceptor : SaveChangesInterceptor
{
    private const string StoredImageMarker = "[stored image omitted]";
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
        if (context == null || context is AppDbContext { ErasingAccount: true }) return;

        context.ChangeTracker.DetectChanges();
        var auditLogs = new List<AuditLog>();

        var httpContext = _httpContextAccessor.HttpContext;
        var performedBy = httpContext?.User?.Identity?.Name 
            ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "System / Auto-Auditor";
            
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var aiActionId = httpContext?.Items["Tenvora.AiActionId"] is Guid actionId ? actionId : (Guid?)null;
        var userId = httpContext?.Items["Tenvora.AiActorId"] is Guid aiActorId
            ? aiActorId
            : Guid.TryParse(httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var actorId)
                ? actorId
                : (Guid?)null;

        // Process business records while excluding authentication and audit infrastructure.
        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State is EntityState.Detached or EntityState.Unchanged)
                continue;

            if (entry.Entity is AuditLog or RefreshToken)
                continue; // Skip infrastructure / log tables

            var entityType = entry.Entity.GetType().Name;
            var primaryKey = entry.Property("Id").CurrentValue?.ToString() ?? Guid.NewGuid().ToString();
            var proposal = entry.Entity as AiAction;
            var effectiveAiActionId = aiActionId ?? proposal?.Id;
            var isAiAction = effectiveAiActionId.HasValue;
            
            // Extract TenantId if available
            var tenantIdProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "TenantId");
            var tenantId = tenantIdProp?.CurrentValue is Guid tId ? tId : Guid.Empty;

            var action = entry.State switch
            {
                EntityState.Added => "Created",
                EntityState.Deleted => "Deleted",
                EntityState.Modified => "Updated",
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
                    if (prop.Metadata.Name is "Id" or "CreatedAt" or "UpdatedAt" or "RowVersion" or "PasswordHash" or "ApiKey" or "InviteToken")
                        continue;

                    if (prop.IsModified)
                    {
                        var before = prop.OriginalValue;
                        var after = prop.CurrentValue;

                        if (!Equals(before, after))
                        {
                            if (IsImageProperty(prop.Metadata.Name))
                            {
                                var hadImage = HasStoredImage(before);
                                var hasImage = HasStoredImage(after);
                                originalSnapshot[prop.Metadata.Name] = hadImage ? StoredImageMarker : null;
                                currentSnapshot[prop.Metadata.Name] = hasImage ? StoredImageMarker : null;
                                changesList.Add($"{prop.Metadata.Name}: {ImageState(hadImage)} -> {ImageState(hasImage)}");
                            }
                            else
                            {
                                originalSnapshot[prop.Metadata.Name] = before;
                                currentSnapshot[prop.Metadata.Name] = after;
                                changesList.Add($"{prop.Metadata.Name}: {before} -> {after}");
                            }
                        }
                    }
                }

                if (changesList.Count == 0)
                    continue;

                oldValue = JsonSerializer.Serialize(originalSnapshot);
                newValue = JsonSerializer.Serialize(currentSnapshot);
            }
            else if (entry.State == EntityState.Added)
            {
                var currentSnapshot = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (prop.Metadata.Name is not "PasswordHash" and not "ApiKey" and not "InviteToken")
                    {
                        currentSnapshot[prop.Metadata.Name] = IsImageProperty(prop.Metadata.Name) && HasStoredImage(prop.CurrentValue)
                            ? StoredImageMarker
                            : prop.CurrentValue;
                    }
                }
                newValue = JsonSerializer.Serialize(currentSnapshot);
                changesList.Add($"{entityType} created with Id {primaryKey}");
            }

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                EntityType = entityType,
                EntityId = primaryKey,
                Action = action,
                PerformedBy = performedBy,
                Timestamp = DateTime.UtcNow,
                OldValue = oldValue,
                NewValue = newValue,
                Notes = Truncate(string.Join(" | ", changesList), 1000),
                IpAddress = ipAddress,
                Origin = isAiAction ? "AI" : "Manual",
                AiActionId = effectiveAiActionId,
                ConfirmationRequired = isAiAction ? proposal?.RequiresConfirmation ?? true : null,
                ConfirmationGiven = isAiAction ? proposal?.ConfirmedAt.HasValue ?? aiActionId.HasValue : null
            };

            auditLogs.Add(auditLog);
        }

        if (auditLogs.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditLogs);
        }
    }

    private static bool IsImageProperty(string name) =>
        name.EndsWith("ImageDataUrl", StringComparison.Ordinal);

    private static bool HasStoredImage(object? value) =>
        value is string text && !string.IsNullOrWhiteSpace(text);

    private static string ImageState(bool present) => present ? "present" : "empty";

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}

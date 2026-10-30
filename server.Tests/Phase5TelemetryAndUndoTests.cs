using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Localization;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Tenvora.Dtos;
using Xunit;

namespace Tenvora.Tests;

public sealed class Phase5TelemetryAndUndoTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(AppDbContext db, BusinessService business, AiActionService actions, Guid tenantId, Guid userId)> SetupAsync()
    {
        var db = Db();
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Phase 5 Test Tenant",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });

        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "admin@phase5.com",
            PasswordHash = "hash",
            Role = "TenantAdmin",
            FullName = "Admin User"
        });

        await db.SaveChangesAsync();

        var localizer = new AppLocalizer();
        var business = new BusinessService(db);
        var httpContext = new DefaultHttpContext();
        var actions = new AiActionService(db, null!, business, new HttpContextAccessor { HttpContext = httpContext }, null, localizer);

        return (db, business, actions, tenantId, userId);
    }

    [Fact]
    public async Task UndoAsync_WhenSaleExecuted_RollsBackSaleAndMarksActionUndone()
    {
        var (db, business, actions, tenantId, userId) = await SetupAsync();

        var customer = (await business.CreateCustomerAsync(tenantId, new("Customer Undo", "0900000001", null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Item Undo", "IU-1", "pcs", 100000m, null))).Data!;

        var sale = (await business.CreateSaleAsync(tenantId, Guid.NewGuid().ToString(), new CreateSaleRequest(
            customer.Id,
            [new CreateSaleItemRequest(product.Id, 2, 100000m)],
            50000m,
            "Cash",
            "Test sale",
            DateTime.UtcNow))).Data!;

        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = "sale",
            Status = AiActionStatuses.Executed,
            RequiresConfirmation = false,
            SourceText = "bán 2 Item Undo cho Customer Undo",
            PayloadJson = JsonSerializer.Serialize(new { CustomerId = customer.Id, ProductId = product.Id, Quantity = 2m, UnitPrice = 100000m }),
            AffectedEntityType = "Sale",
            AffectedEntityId = sale.Id,
            IdempotencyKey = Guid.NewGuid().ToString(),
            ExecutedAt = DateTime.UtcNow
        };
        db.AiActions.Add(action);
        await db.SaveChangesAsync();

        // Perform Undo
        var undoResult = await actions.UndoAsync(tenantId, userId, action.Id, "TenantAdmin");

        Assert.True(undoResult.Success);
        Assert.Equal(AiActionStatuses.Undone, undoResult.Data!.Status);

        // Verify action state in DB
        var reloadedAction = await db.AiActions.FirstAsync(a => a.Id == action.Id);
        Assert.Equal(AiActionStatuses.Undone, reloadedAction.Status);

        // Verify sale was voided in DB
        var reloadedSale = await db.Sales.FirstAsync(s => s.Id == sale.Id);
        Assert.Equal("Voided", reloadedSale.Status);
    }

    [Fact]
    public async Task UndoAsync_WhenExpenseExecuted_DeletesExpenseAndMarksActionUndone()
    {
        var (db, business, actions, tenantId, userId) = await SetupAsync();

        var expense = (await business.CreateBusinessExpenseAsync(tenantId, Guid.NewGuid().ToString(), new CreateBusinessExpenseRequest(
            "Utilities",
            75000m,
            DateTime.UtcNow,
            "Office electricity"))).Data!;

        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = "expense",
            Status = AiActionStatuses.Executed,
            RequiresConfirmation = false,
            SourceText = "chi 75k tiền điện",
            PayloadJson = JsonSerializer.Serialize(new { Category = "Utilities", Amount = 75000m }),
            AffectedEntityType = "Expense",
            AffectedEntityId = expense.Id,
            IdempotencyKey = Guid.NewGuid().ToString(),
            ExecutedAt = DateTime.UtcNow
        };
        db.AiActions.Add(action);
        await db.SaveChangesAsync();

        // Perform Undo
        var undoResult = await actions.UndoAsync(tenantId, userId, action.Id, "TenantAdmin");

        Assert.True(undoResult.Success);
        Assert.Equal(AiActionStatuses.Undone, undoResult.Data!.Status);

        // Verify expense is deleted
        var expenseInDb = await db.BusinessExpenses.FirstOrDefaultAsync(e => e.Id == expense.Id);
        Assert.Null(expenseInDb);
    }

    [Fact]
    public async Task UndoAsync_WhenWindowExpired_FailsWithUndoWindowExpired()
    {
        var (db, _, actions, tenantId, userId) = await SetupAsync();

        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = "expense",
            Status = AiActionStatuses.Executed,
            RequiresConfirmation = false,
            SourceText = "chi 50k",
            PayloadJson = "{}",
            AffectedEntityType = "Expense",
            AffectedEntityId = Guid.NewGuid(),
            IdempotencyKey = Guid.NewGuid().ToString(),
            ExecutedAt = DateTime.UtcNow.AddMinutes(-20) // Expired (>15 mins)
        };
        db.AiActions.Add(action);
        await db.SaveChangesAsync();

        var undoResult = await actions.UndoAsync(tenantId, userId, action.Id, "TenantAdmin");

        Assert.False(undoResult.Success);
        Assert.Contains("15-minute", undoResult.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UndoAsync_WhenAlreadyUndone_Fails()
    {
        var (db, _, actions, tenantId, userId) = await SetupAsync();

        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = "expense",
            Status = AiActionStatuses.Undone,
            RequiresConfirmation = false,
            SourceText = "chi 50k",
            PayloadJson = "{}",
            AffectedEntityType = "Expense",
            AffectedEntityId = Guid.NewGuid(),
            IdempotencyKey = Guid.NewGuid().ToString(),
            ExecutedAt = DateTime.UtcNow
        };
        db.AiActions.Add(action);
        await db.SaveChangesAsync();

        var undoResult = await actions.UndoAsync(tenantId, userId, action.Id, "TenantAdmin");

        Assert.False(undoResult.Success);
        Assert.Contains("already been undone", undoResult.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task TelemetryController_RecordEventAndGetSummary_CalculatesMetricsCorrectly()
    {
        var db = Db();
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var controller = new TelemetryController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim("tenant_id", tenantId.ToString()),
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim(ClaimTypes.Role, "TenantAdmin")
                    ], "TestAuth"))
                }
            }
        };

        // Record Event 1: Accepted without edits
        await controller.RecordEvent(new RecordTelemetryEventRequest
        {
            EventType = "DraftConfirmed",
            Intent = "purchase",
            DurationMs = 4000,
            FieldsCorrectedCount = 0,
            AcceptedWithoutEdits = true,
            IsError = false
        }, default);

        // Record Event 2: Accepted with 2 edits
        await controller.RecordEvent(new RecordTelemetryEventRequest
        {
            EventType = "DraftConfirmed",
            Intent = "expense",
            DurationMs = 6000,
            FieldsCorrectedCount = 2,
            AcceptedWithoutEdits = false,
            IsError = false
        }, default);

        // Record Event 3: Error
        await controller.RecordEvent(new RecordTelemetryEventRequest
        {
            EventType = "CaptureFailed",
            Intent = "purchase",
            DurationMs = 1000,
            FieldsCorrectedCount = 0,
            AcceptedWithoutEdits = false,
            IsError = true,
            ErrorMessage = "Image OCR failed"
        }, default);

        // Fetch Summary
        var actionResult = await controller.GetSummary(default);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var apiResult = Assert.IsType<ApiResult<TelemetrySummaryDto>>(okResult.Value);
        Assert.True(apiResult.Success);

        var summary = apiResult.Data!;
        Assert.Equal(3, summary.TotalDraftsRecorded);
        Assert.Equal(2, summary.TotalConfirmed);
        Assert.Equal(1, summary.ConfirmedWithoutEdits);
        Assert.Equal(50.0, summary.AcceptanceRate);
        Assert.Equal(5000.0, summary.AverageRecordingTimeMs);
        Assert.Equal(1.0, summary.AverageFieldsCorrected);
        Assert.Equal(1, summary.TotalErrors);
        Assert.Equal(33.3, summary.ErrorRate);
        Assert.Equal(3, summary.RecentEvents.Count);
    }
}

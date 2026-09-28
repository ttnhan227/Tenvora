using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;

namespace Tenvora.Api.Services;

/// <summary>
/// Converts model output into bounded, server-owned proposals and executes only a
/// previously persisted proposal. The model never receives database write access.
/// </summary>
public sealed class AiActionService(
    AppDbContext db,
    IAiAssistantService assistant,
    IBusinessService business,
    IHttpContextAccessor httpContextAccessor,
    IAuthService? authService = null) : IAiActionService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan ProposalLifetime = TimeSpan.FromMinutes(15);

    public async Task<ApiResult<AiActionProposalResponse>> ProposeAsync(
        Guid tenantId,
        Guid userId,
        AiProposeActionRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default)
    {
        var text = request.Text?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            return ApiResult<AiActionProposalResponse>.Fail("Tell Tenvora what you want to record.");

        var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        if (tenant == null) return ApiResult<AiActionProposalResponse>.Fail("Workspace not found.");

        var interpretedResult = await assistant.InterpretActionAsync(tenantId, text, request.UiContext, ct);
        if (!interpretedResult.Success || interpretedResult.Data == null)
            return ApiResult<AiActionProposalResponse>.Fail(interpretedResult.Message);

        var action = interpretedResult.Data;
        if (RequiresTenantAdmin(action.Intent) && userRole != "TenantAdmin")
            return ApiResult<AiActionProposalResponse>.Fail("Only a workspace administrator can perform this action.");
        return action.Intent switch
        {
            "expense" => await ProposeExpense(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "debt_payment" => await ProposePayment(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "sale" => await ProposeSale(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "create_customer" => await ProposeCreateCustomer(tenantId, userId, text, request.UiContext, action, ct),
            "create_product" => await ProposeCreateProduct(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "create_supplier" => await ProposeCreateSupplier(tenantId, userId, text, request.UiContext, action, ct),
            "update_customer" or "archive_customer" => await ProposeCustomerChange(tenantId, userId, text, request.UiContext, action, ct),
            "update_product" or "archive_product" => await ProposeProductChange(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "update_supplier" or "archive_supplier" => await ProposeSupplierChange(tenantId, userId, text, request.UiContext, action, ct),
            "purchase" => await ProposePurchase(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "supplier_payment" => await ProposeSupplierPayment(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "void_sale" or "void_purchase" => await ProposeVoid(tenantId, userId, text, request.UiContext, action, tenant.BaseCurrency, ct),
            "update_settings" => await ProposeSettings(tenantId, userId, text, request.UiContext, action, tenant, ct),
            _ => ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "unknown", "I couldn't identify a supported business action. Try a sale, expense, or customer payment."))
        };
    }

    public async Task<ApiResult<AiActionExecutionResponse>> ConfirmAsync(
        Guid tenantId,
        Guid userId,
        Guid actionId,
        bool confirmed,
        string userRole = "TenantAdmin",
        CancellationToken ct = default,
        AiActionInputOverrides? input = null)
    {
        var action = await db.AiActions.FirstOrDefaultAsync(
            a => a.Id == actionId && a.TenantId == tenantId && a.UserId == userId, ct);
        if (action == null) return ApiResult<AiActionExecutionResponse>.Fail("AI action not found.");
        if (RequiresTenantAdmin(action.Intent) && userRole != "TenantAdmin")
            return ApiResult<AiActionExecutionResponse>.Fail("Only a workspace administrator can perform this action.");

        // Serialize confirmation with other tenant financial writes, then reload
        // the proposal inside the transaction to defeat concurrent replays.
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        await db.Entry(action).ReloadAsync(ct);

        if (action.Status == AiActionStatuses.Executed && action.ResultJson != null)
        {
            var replay = JsonSerializer.Deserialize<AiActionExecutionResponse>(action.ResultJson, JsonOptions);
            if (write != null) await write.CommitAsync(ct);
            return replay == null
                ? ApiResult<AiActionExecutionResponse>.Fail("The saved action result is unavailable.")
                : ApiResult<AiActionExecutionResponse>.Ok(replay);
        }

        if (action.Status != AiActionStatuses.PendingConfirmation)
        {
            if (write != null) await write.CommitAsync(ct);
            return ApiResult<AiActionExecutionResponse>.Fail($"This action is already {action.Status.ToLowerInvariant()}.");
        }

        if (!confirmed)
        {
            action.Status = AiActionStatuses.Cancelled;
            action.RequiresConfirmation = false;
            action.CancelledAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            if (write != null) await write.CommitAsync(ct);
            return ApiResult<AiActionExecutionResponse>.Ok(new(
                action.Id, action.Status, "Action cancelled. Nothing was changed."));
        }

        if (action.ExpiresAt <= DateTime.UtcNow)
        {
            action.Status = AiActionStatuses.Expired;
            action.RequiresConfirmation = false;
            await db.SaveChangesAsync(ct);
            if (write != null) await write.CommitAsync(ct);
            return ApiResult<AiActionExecutionResponse>.Fail("This proposal expired. Ask Tenvora to prepare it again.");
        }

        ActionPayload payload;
        try
        {
            payload = JsonSerializer.Deserialize<ActionPayload>(action.PayloadJson, JsonOptions)
                ?? throw new InvalidOperationException("The action payload is invalid.");
            if (input != null)
            {
                payload = ApplyInputOverrides(action.Intent, payload, input);
                action.PayloadJson = JsonSerializer.Serialize(payload, JsonOptions);
            }
            else if (SupportsEditableInput(action.Intent))
            {
                // A typed "yes" still validates draft actions before they can leave
                // PendingConfirmation. Incomplete drafts remain editable in the UI.
                payload = ApplyInputOverrides(action.Intent, payload, new AiActionInputOverrides(
                    payload.Name,
                    payload.Phone,
                    payload.Email,
                    payload.Address,
                    payload.Unit,
                    payload.UnitPrice,
                    payload.Category,
                    payload.Amount,
                    payload.Description));
            }
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            if (write != null) await write.CommitAsync(ct);
            return ApiResult<AiActionExecutionResponse>.Fail(ex.Message);
        }

        // Keep the confirmation state, bounded input overrides, business mutation,
        // audit rows, and final action result in one relational transaction.
        action.ConfirmedAt = DateTime.UtcNow;
        action.Status = AiActionStatuses.Executing;
        action.RequiresConfirmation = false;
        SetAiAuditContext(action.Id, action.UserId);
        await db.SaveChangesAsync(ct);

        ApiResult<AiActionExecutionResponse> execution;
        try
        {
            execution = action.Intent switch
            {
                "expense" => await ExecuteExpense(action, payload),
                "debt_payment" => await ExecutePayment(action, payload),
                "sale" => await ExecuteSale(action, payload),
                "create_customer" => await ExecuteCreateCustomer(action, payload),
                "create_product" => await ExecuteCreateProduct(action, payload),
                "create_supplier" => await ExecuteCreateSupplier(action, payload),
                "update_customer" or "archive_customer" => await ExecuteCustomerChange(action, payload),
                "update_product" or "archive_product" => await ExecuteProductChange(action, payload),
                "update_supplier" or "archive_supplier" => await ExecuteSupplierChange(action, payload),
                "purchase" => await ExecutePurchase(action, payload),
                "supplier_payment" => await ExecuteSupplierPayment(action, payload),
                "void_sale" => await ExecuteVoidSale(action, payload),
                "void_purchase" => await ExecuteVoidPurchase(action, payload),
                "update_settings" => await ExecuteSettings(action, payload),
                _ => ApiResult<AiActionExecutionResponse>.Fail("This action type is not supported.")
            };
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            execution = ApiResult<AiActionExecutionResponse>.Fail(ex.Message);
        }

        if (!execution.Success || execution.Data == null)
        {
            action.Status = AiActionStatuses.Failed;
            action.RequiresConfirmation = false;
            action.ResultJson = JsonSerializer.Serialize(new { error = execution.Message }, JsonOptions);
            await db.SaveChangesAsync(ct);
            if (write != null) await write.CommitAsync(ct);
            return execution;
        }

        action.Status = AiActionStatuses.Executed;
        action.RequiresConfirmation = false;
        action.ExecutedAt = DateTime.UtcNow;
        action.AffectedEntityType = execution.Data.RecordType;
        action.AffectedEntityId = execution.Data.RecordId;
        var completed = execution.Data with { Status = AiActionStatuses.Executed };
        action.ResultJson = JsonSerializer.Serialize(completed, JsonOptions);
        await db.SaveChangesAsync(ct);
        if (write != null) await write.CommitAsync(ct);
        return ApiResult<AiActionExecutionResponse>.Ok(completed);
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeExpense(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext,
        AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        if (parsed.Amount <= 0)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("expense", "What amount should I record?"));

        var payload = new ActionPayload(
            Amount: parsed.Amount,
            Category: string.IsNullOrWhiteSpace(parsed.Category) ? "Other" : parsed.Category.Trim(),
            Description: parsed.Notes);
        var summary = IsVietnamese(source)
            ? $"Ghi khoản chi {FormatAmount(parsed.Amount, currency)} cho {payload.Category}?"
            : $"Record {FormatAmount(parsed.Amount, currency)} for {payload.Category}?";
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(
            tenantId, userId, "expense", source, uiContext, payload, summary,
            new Dictionary<string, string?>
            {
                ["Amount"] = FormatAmount(parsed.Amount, currency),
                ["Category"] = payload.Category,
                ["Description"] = payload.Description
            }, ct));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposePayment(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext,
        AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        Guid? targetSaleId = null;
        if (parsed.Status == "Full" && uiContext?.Entity?.Equals("sale", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var contextualSale = await business.GetSaleAsync(tenantId, uiContext.EntityId.Value);
            if (!contextualSale.Success || contextualSale.Data == null)
                return ApiResult<AiActionProposalResponse>.Fail(contextualSale.Message);
            if (contextualSale.Data.Status != "Posted" || contextualSale.Data.OutstandingBalance <= 0)
                return ApiResult<AiActionProposalResponse>.Ok(Clarification("debt_payment", "This sale has no outstanding balance."));
            parsed = parsed with { Amount = contextualSale.Data.OutstandingBalance, CustomerName = contextualSale.Data.CustomerName };
            targetSaleId = contextualSale.Data.Id;
        }
        if (parsed.Amount <= 0)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("debt_payment", "What amount did the customer pay?"));

        var match = await ResolveCustomer(tenantId, source, parsed.CustomerName, uiContext, ct);
        if (match.Selected == null)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "debt_payment",
                match.Candidates.Count == 0
                    ? "I couldn't find that customer in this workspace. Create or select the customer first."
                    : "I found more than one possible customer. Which one did you mean?",
                match.Candidates));

        var detail = await business.GetCustomerAsync(tenantId, match.Selected.Id);
        if (!detail.Success || detail.Data == null) return ApiResult<AiActionProposalResponse>.Fail(detail.Message);
        var outstanding = detail.Data.Customer.OutstandingBalance;
        if (outstanding <= 0)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "debt_payment", $"{match.Selected.Name} has no outstanding balance."));
        if (parsed.Amount > outstanding)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "debt_payment", $"{match.Selected.Name} owes {FormatAmount(outstanding, currency)}, which is less than the proposed payment of {FormatAmount(parsed.Amount, currency)}."));

        var openSales = detail.Data.Sales
            .Where(s => s.Status == "Posted" && s.OutstandingBalance > 0)
            .OrderBy(s => s.SoldAt)
            .ToList();
        var sale = targetSaleId.HasValue
            ? openSales.FirstOrDefault(s => s.Id == targetSaleId.Value)
            : openSales.FirstOrDefault(s => s.OutstandingBalance >= parsed.Amount);
        if (sale == null)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "debt_payment", "This payment spans multiple sales. Open the customer history and choose the invoices to pay."));

        var after = outstanding - parsed.Amount;
        var payload = new ActionPayload(
            CustomerId: match.Selected.Id,
            CustomerName: match.Selected.Name,
            SaleId: sale.Id,
            Amount: parsed.Amount,
            PreviousBalance: outstanding,
            Notes: parsed.Notes);
        var summary = IsVietnamese(source)
            ? $"{match.Selected.Name} hiện còn nợ {FormatAmount(outstanding, currency)}. Ghi nhận thanh toán {FormatAmount(parsed.Amount, currency)}?"
            : $"{match.Selected.Name} currently owes {FormatAmount(outstanding, currency)}. Record a payment of {FormatAmount(parsed.Amount, currency)}?";
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(
            tenantId, userId, "debt_payment", source, uiContext, payload, summary,
            new Dictionary<string, string?>
            {
                ["Customer"] = match.Selected.Name,
                ["Amount"] = FormatAmount(parsed.Amount, currency),
                ["Current balance"] = FormatAmount(outstanding, currency),
                ["Balance after payment"] = FormatAmount(after, currency)
            }, ct));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeSale(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext,
        AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        var customerMatch = await ResolveCustomer(tenantId, source, parsed.CustomerName, uiContext, ct);
        if (customerMatch.Selected == null && ReferencesRecentCustomer(source))
        {
            var recentId = await RecentAffectedEntityId(tenantId, userId, "create_customer", "Customer", ct);
            if (recentId.HasValue)
            {
                var recent = await db.Customers.AsNoTracking().FirstOrDefaultAsync(
                    customer => customer.TenantId == tenantId && customer.Id == recentId && customer.Status == "Active", ct);
                if (recent != null) customerMatch = EntityMatch<CustomerChoice>.One(new(recent.Id, recent.Name));
            }
        }
        if (customerMatch.Selected == null)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "sale",
                customerMatch.Candidates.Count == 0
                    ? "I couldn't find that customer. Create or select the customer first."
                    : "I found more than one possible customer. Which one did you mean?",
                customerMatch.Candidates));

        var productMatch = await ResolveProduct(tenantId, source, parsed.ProductName, uiContext, ct);
        if (productMatch.Selected == null)
        {
            if (productMatch.Candidates.Count == 0 && !string.IsNullOrWhiteSpace(parsed.ProductName))
            {
                var productName = parsed.ProductName.Trim();
                var unit = string.IsNullOrWhiteSpace(parsed.Unit) ? "item" : parsed.Unit.Trim();
                return ApiResult<AiActionProposalResponse>.Ok(new(
                    null,
                    "create_product",
                    AiActionStatuses.NeedsClarification,
                    "Low",
                    false,
                    $"I found {customerMatch.Selected.Name}, but {productName} is not in your product catalog yet. Add its selling price first, then Tenvora can prepare this sale.",
                    new Dictionary<string, string?>
                    {
                        ["Product"] = productName,
                        ["Unit"] = unit,
                        ["Default price"] = $"0 {currency}",
                        ["Price required"] = "true",
                        ["Pending sale"] = source
                    }));
            }

            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "sale",
                productMatch.Candidates.Count == 0
                    ? "I couldn't match an active product. Create or select the product first."
                    : "I found more than one possible product. Which one did you mean?",
                productMatch.Candidates));
        }

        var quantity = parsed.Quantity > 0 ? parsed.Quantity : ExtractQuantity(source);
        if (quantity <= 0) quantity = 1;
        var unitPrice = parsed.UnitPrice > 0
            ? parsed.UnitPrice
            : parsed.Amount > 0
                ? decimal.Round(parsed.Amount / quantity, 4, MidpointRounding.AwayFromZero)
                : productMatch.Selected.DefaultPrice;
        var amount = parsed.Amount > 0
            ? parsed.Amount
            : decimal.Round(quantity * unitPrice, 4, MidpointRounding.AwayFromZero);
        if (amount <= 0)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(
                "sale", $"What price should I use for {productMatch.Selected.Name}?"));

        var explicitlyUnpaid = Regex.IsMatch(source,
            @"\b(unpaid|not paid|hasn't paid|has not paid|on credit|chưa trả|chưa thanh toán|ghi nợ|nợ cả)\b",
            RegexOptions.IgnoreCase);
        var paidAmount = parsed.Amount <= 0 && !explicitlyUnpaid ? amount : parsed.PaidAmount;
        if (paidAmount < 0 || paidAmount > amount)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("sale", "The paid amount must be between zero and the sale total."));

        var payload = new ActionPayload(
            CustomerId: customerMatch.Selected.Id,
            CustomerName: customerMatch.Selected.Name,
            ProductId: productMatch.Selected.Id,
            ProductName: productMatch.Selected.Name,
            Quantity: quantity,
            UnitPrice: unitPrice,
            Amount: amount,
            PaidAmount: paidAmount,
            Notes: parsed.Notes);
        var summary = IsVietnamese(source)
            ? $"Ghi đơn bán {FormatAmount(amount, currency)} cho {customerMatch.Selected.Name}?"
            : $"Record a {FormatAmount(amount, currency)} sale to {customerMatch.Selected.Name}?";
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(
            tenantId, userId, "sale", source, uiContext, payload, summary,
            new Dictionary<string, string?>
            {
                ["Customer"] = customerMatch.Selected.Name,
                ["Product"] = productMatch.Selected.Name,
                ["Quantity"] = $"{quantity:N2} {productMatch.Selected.Unit}".TrimEnd('0').TrimEnd('.'),
                ["Unit price"] = FormatAmount(unitPrice, currency),
                ["Total"] = FormatAmount(amount, currency),
                ["Paid"] = FormatAmount(paidAmount, currency),
                ["Remaining"] = FormatAmount(amount - paidAmount, currency)
            }, ct));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeCreateCustomer(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, CancellationToken ct)
    {
        var name = NormalizeDraftName(parsed.EntityName);
        if (!string.IsNullOrWhiteSpace(name) &&
            await db.Customers.AnyAsync(c => c.TenantId == tenantId && c.Name.ToLower() == name.ToLower(), ct))
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("create_customer", $"A customer named {name} already exists."));
        var payload = new ActionPayload(Name: name, Phone: parsed.Phone, Email: parsed.Email, Address: parsed.Address, Notes: parsed.Notes);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "create_customer", source, uiContext,
            payload, IsVietnamese(source)
                ? (string.IsNullOrWhiteSpace(name) ? "Tạo khách hàng mới?" : $"Tạo khách hàng {name}?")
                : (string.IsNullOrWhiteSpace(name) ? "Create a customer?" : $"Create customer {name}?"),
            ContactDetails(name, parsed.Phone, parsed.Email, parsed.Address), ct, "Low"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeCreateProduct(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        var name = NormalizeDraftName(parsed.EntityName);
        if (!string.IsNullOrWhiteSpace(name) &&
            await db.Products.AnyAsync(p => p.TenantId == tenantId && p.Name.ToLower() == name.ToLower() && p.IsActive, ct))
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("create_product", $"An active product named {name} already exists."));
        var unit = string.IsNullOrWhiteSpace(parsed.Unit) ? "item" : parsed.Unit.Trim();
        var payload = new ActionPayload(Name: name, Unit: unit, UnitPrice: Math.Max(0, parsed.Amount), Notes: parsed.Notes);
        var pendingSaleMatch = Regex.Match(source, @"continue pending sale:\s*(.+)$", RegexOptions.IgnoreCase);
        var details = new Dictionary<string, string?>
        {
            ["Product"] = name,
            ["Unit"] = unit,
            ["Default price"] = FormatAmount(payload.UnitPrice, currency)
        };
        if (pendingSaleMatch.Success) details["Pending sale"] = pendingSaleMatch.Groups[1].Value.Trim();
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "create_product", source, uiContext,
            payload, IsVietnamese(source)
                ? (string.IsNullOrWhiteSpace(name) ? "Tạo sản phẩm mới?" : $"Tạo sản phẩm {name}?")
                : (string.IsNullOrWhiteSpace(name) ? "Create a product?" : $"Create product {name}?"),
            details, ct, "Low"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeCreateSupplier(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, CancellationToken ct)
    {
        var name = NormalizeDraftName(parsed.EntityName);
        if (!string.IsNullOrWhiteSpace(name) &&
            await db.Suppliers.AnyAsync(s => s.TenantId == tenantId && s.Name.ToLower() == name.ToLower(), ct))
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("create_supplier", $"A supplier named {name} already exists."));
        var payload = new ActionPayload(Name: name, Phone: parsed.Phone, Email: parsed.Email, Address: parsed.Address, Notes: parsed.Notes);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "create_supplier", source, uiContext,
            payload, IsVietnamese(source)
                ? (string.IsNullOrWhiteSpace(name) ? "Tạo nhà cung cấp mới?" : $"Tạo nhà cung cấp {name}?")
                : (string.IsNullOrWhiteSpace(name) ? "Create a supplier?" : $"Create supplier {name}?"),
            ContactDetails(name, parsed.Phone, parsed.Email, parsed.Address), ct, "Low"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeCustomerChange(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, CancellationToken ct)
    {
        var match = await ResolveCustomer(tenantId, source, parsed.EntityName, uiContext, ct);
        if (match.Selected == null && ReferencesRecent(source))
        {
            var recentId = await RecentAffectedEntityId(tenantId, userId, "create_customer", "Customer", ct);
            if (recentId.HasValue)
            {
                var recent = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == recentId, ct);
                if (recent != null) match = EntityMatch<CustomerChoice>.One(new(recent.Id, recent.Name));
            }
        }
        if (match.Selected == null) return ApiResult<AiActionProposalResponse>.Ok(EntityClarification(parsed.Intent, "customer", match.Candidates));
        var current = await business.GetCustomerAsync(tenantId, match.Selected.Id);
        if (!current.Success || current.Data == null) return ApiResult<AiActionProposalResponse>.Fail(current.Message);
        var customer = current.Data.Customer;
        var archive = parsed.Intent == "archive_customer";
        if (!archive && parsed.Phone == null && parsed.Email == null && parsed.Address == null)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(parsed.Intent, "Which customer field should I update?"));
        var payload = new ActionPayload(CustomerId: customer.Id, Name: customer.Name,
            Phone: parsed.Phone ?? customer.Phone, Email: parsed.Email ?? customer.Email,
            Address: parsed.Address ?? customer.Address, Notes: customer.Notes,
            Status: archive ? "Archived" : customer.Status);
        var summary = archive ? $"Archive customer {customer.Name}?" : $"Update customer {customer.Name}?";
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, parsed.Intent, source, uiContext,
            payload, summary, ContactDetails(customer.Name, payload.Phone, payload.Email, payload.Address), ct, archive ? "Destructive" : "Moderate"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeProductChange(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        var match = await ResolveProduct(tenantId, source, parsed.EntityName, uiContext, ct);
        if (match.Selected == null && ReferencesRecent(source))
        {
            var recentId = await RecentAffectedEntityId(tenantId, userId, "create_product", "Product", ct);
            if (recentId.HasValue)
            {
                var recent = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == recentId, ct);
                if (recent != null) match = EntityMatch<ProductChoice>.One(new(recent.Id, recent.Name, recent.Unit, recent.DefaultPrice));
            }
        }
        if (match.Selected == null) return ApiResult<AiActionProposalResponse>.Ok(EntityClarification(parsed.Intent, "product", match.Candidates));
        var current = await business.GetProductAsync(tenantId, match.Selected.Id);
        if (!current.Success || current.Data == null) return ApiResult<AiActionProposalResponse>.Fail(current.Message);
        var product = current.Data;
        var archive = parsed.Intent == "archive_product";
        if (!archive && parsed.Amount <= 0 && string.IsNullOrWhiteSpace(parsed.Unit))
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(parsed.Intent, "Which product field should I update?"));
        var payload = new ActionPayload(ProductId: product.Id, Name: product.Name,
            Unit: parsed.Unit ?? product.Unit, UnitPrice: parsed.Amount > 0 ? parsed.Amount : product.DefaultPrice,
            Notes: product.Notes, Status: archive ? "Inactive" : "Active");
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, parsed.Intent, source, uiContext,
            payload, archive ? $"Deactivate product {product.Name}?" : $"Update product {product.Name}?",
            new Dictionary<string, string?> { ["Product"] = product.Name, ["Unit"] = payload.Unit, ["Price"] = FormatAmount(payload.UnitPrice, currency), ["Status"] = payload.Status },
            ct, archive ? "Destructive" : "Moderate"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeSupplierChange(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, CancellationToken ct)
    {
        var match = await ResolveSupplier(tenantId, source, parsed.EntityName, uiContext, ct);
        if (match.Selected == null && ReferencesRecent(source))
        {
            var recentId = await RecentAffectedEntityId(tenantId, userId, "create_supplier", "Supplier", ct);
            if (recentId.HasValue)
            {
                var recent = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == recentId, ct);
                if (recent != null) match = EntityMatch<SupplierChoice>.One(new(recent.Id, recent.Name));
            }
        }
        if (match.Selected == null) return ApiResult<AiActionProposalResponse>.Ok(EntityClarification(parsed.Intent, "supplier", match.Candidates));
        var current = await business.GetSupplierAsync(tenantId, match.Selected.Id);
        if (!current.Success || current.Data == null) return ApiResult<AiActionProposalResponse>.Fail(current.Message);
        var supplier = current.Data.Supplier;
        var archive = parsed.Intent == "archive_supplier";
        if (!archive && parsed.Phone == null && parsed.Email == null && parsed.Address == null)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(parsed.Intent, "Which supplier field should I update?"));
        var payload = new ActionPayload(SupplierId: supplier.Id, Name: supplier.Name,
            Phone: parsed.Phone ?? supplier.Phone, Email: parsed.Email ?? supplier.Email,
            Address: parsed.Address ?? supplier.Address, Notes: supplier.Notes,
            Status: archive ? "Archived" : supplier.Status);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, parsed.Intent, source, uiContext,
            payload, archive ? $"Archive supplier {supplier.Name}?" : $"Update supplier {supplier.Name}?",
            ContactDetails(supplier.Name, payload.Phone, payload.Email, payload.Address), ct, archive ? "Destructive" : "Moderate"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposePurchase(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        if (parsed.Amount <= 0) return ApiResult<AiActionProposalResponse>.Ok(Clarification("purchase", "What is the purchase total?"));
        var match = await ResolveSupplier(tenantId, source, parsed.SupplierName, uiContext, ct);
        if (match.Selected == null) return ApiResult<AiActionProposalResponse>.Ok(EntityClarification("purchase", "supplier", match.Candidates));
        var product = await ResolveProduct(tenantId, source, parsed.ProductName, uiContext, ct);
        var quantity = parsed.Quantity > 0 ? parsed.Quantity : 1m;
        var unitCost = parsed.UnitPrice > 0 && parsed.UnitPrice != parsed.Amount
            ? parsed.UnitPrice
            : decimal.Round(parsed.Amount / quantity, 4, MidpointRounding.AwayFromZero);
        var description = product.Selected?.Name ?? parsed.ProductName ?? "Purchase item";
        var unit = product.Selected?.Unit ?? parsed.Unit ?? "item";
        var payload = new ActionPayload(SupplierId: match.Selected.Id, SupplierName: match.Selected.Name,
            ProductId: product.Selected?.Id, ProductName: description, Quantity: quantity, UnitPrice: unitCost,
            Unit: unit, Amount: parsed.Amount, PaidAmount: parsed.PaidAmount, Notes: parsed.Notes);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "purchase", source, uiContext,
            payload, $"Record a {FormatAmount(parsed.Amount, currency)} purchase from {match.Selected.Name}?",
            new Dictionary<string, string?> { ["Supplier"] = match.Selected.Name, ["Item"] = description, ["Quantity"] = $"{quantity:N2} {unit}", ["Total"] = FormatAmount(parsed.Amount, currency), ["Paid"] = FormatAmount(parsed.PaidAmount, currency) }, ct));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeSupplierPayment(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        Guid? targetPurchaseId = null;
        if (parsed.Status == "Full" && uiContext?.Entity?.Equals("purchase", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var contextualPurchase = await business.GetPurchaseAsync(tenantId, uiContext.EntityId.Value);
            if (!contextualPurchase.Success || contextualPurchase.Data == null)
                return ApiResult<AiActionProposalResponse>.Fail(contextualPurchase.Message);
            if (contextualPurchase.Data.Status != "Posted" || contextualPurchase.Data.OutstandingBalance <= 0)
                return ApiResult<AiActionProposalResponse>.Ok(Clarification("supplier_payment", "This purchase has no outstanding balance."));
            parsed = parsed with { Amount = contextualPurchase.Data.OutstandingBalance, SupplierName = contextualPurchase.Data.SupplierName };
            targetPurchaseId = contextualPurchase.Data.Id;
        }
        if (parsed.Amount <= 0) return ApiResult<AiActionProposalResponse>.Ok(Clarification("supplier_payment", "What amount was paid?"));
        var match = await ResolveSupplier(tenantId, source, parsed.SupplierName, uiContext, ct);
        if (match.Selected == null) return ApiResult<AiActionProposalResponse>.Ok(EntityClarification("supplier_payment", "supplier", match.Candidates));
        var detail = await business.GetSupplierAsync(tenantId, match.Selected.Id);
        if (!detail.Success || detail.Data == null) return ApiResult<AiActionProposalResponse>.Fail(detail.Message);
        var balance = detail.Data.Supplier.OutstandingBalance;
        if (parsed.Amount > balance) return ApiResult<AiActionProposalResponse>.Ok(Clarification("supplier_payment", $"{match.Selected.Name} is owed only {FormatAmount(balance, currency)}."));
        var purchase = targetPurchaseId.HasValue
            ? detail.Data.Purchases.FirstOrDefault(p => p.Id == targetPurchaseId.Value && p.Status == "Posted")
            : detail.Data.Purchases.Where(p => p.Status == "Posted" && p.OutstandingBalance >= parsed.Amount).OrderBy(p => p.PurchasedAt).FirstOrDefault();
        if (purchase == null) return ApiResult<AiActionProposalResponse>.Ok(Clarification("supplier_payment", "This payment spans multiple purchases. Select the purchases to pay."));
        var payload = new ActionPayload(SupplierId: match.Selected.Id, SupplierName: match.Selected.Name,
            PurchaseId: purchase.Id, Amount: parsed.Amount, PreviousBalance: balance, Notes: parsed.Notes);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "supplier_payment", source, uiContext,
            payload, $"Record a {FormatAmount(parsed.Amount, currency)} payment to {match.Selected.Name}?",
            new Dictionary<string, string?> { ["Supplier"] = match.Selected.Name, ["Amount"] = FormatAmount(parsed.Amount, currency), ["Current balance"] = FormatAmount(balance, currency), ["Balance after payment"] = FormatAmount(balance - parsed.Amount, currency) }, ct));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeVoid(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, string currency, CancellationToken ct)
    {
        if (parsed.Intent == "void_sale")
        {
            var saleId = uiContext?.Entity?.Equals("sale", StringComparison.OrdinalIgnoreCase) == true ? uiContext.EntityId : null;
            if (!saleId.HasValue && ReferencesRecent(source))
                saleId = await RecentAffectedEntityId(tenantId, userId, "sale", "Sale", ct);
            if (!saleId.HasValue)
                return ApiResult<AiActionProposalResponse>.Ok(Clarification(parsed.Intent, "Open the sale you want to cancel, then ask again."));
            var sale = await business.GetSaleAsync(tenantId, saleId.Value);
            if (!sale.Success || sale.Data == null) return ApiResult<AiActionProposalResponse>.Fail(sale.Message);
            var payload = new ActionPayload(SaleId: sale.Data.Id, Amount: sale.Data.TotalAmount);
            return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, parsed.Intent, source, uiContext, payload,
                $"Void sale {sale.Data.SaleNumber}?", new Dictionary<string, string?> { ["Sale"] = sale.Data.SaleNumber, ["Total"] = FormatAmount(sale.Data.TotalAmount, currency), ["Customer"] = sale.Data.CustomerName }, ct, "Destructive"));
        }
        var purchaseId = uiContext?.Entity?.Equals("purchase", StringComparison.OrdinalIgnoreCase) == true ? uiContext.EntityId : null;
        if (!purchaseId.HasValue && ReferencesRecent(source))
            purchaseId = await RecentAffectedEntityId(tenantId, userId, "purchase", "Purchase", ct);
        if (!purchaseId.HasValue)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification(parsed.Intent, "Open the purchase you want to cancel, then ask again."));
        var purchase = await business.GetPurchaseAsync(tenantId, purchaseId.Value);
        if (!purchase.Success || purchase.Data == null) return ApiResult<AiActionProposalResponse>.Fail(purchase.Message);
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, parsed.Intent, source, uiContext,
            new ActionPayload(PurchaseId: purchase.Data.Id, Amount: purchase.Data.TotalAmount), $"Void purchase {purchase.Data.PurchaseNumber}?",
            new Dictionary<string, string?> { ["Purchase"] = purchase.Data.PurchaseNumber, ["Total"] = FormatAmount(purchase.Data.TotalAmount, currency), ["Supplier"] = purchase.Data.SupplierName }, ct, "Destructive"));
    }

    private async Task<ApiResult<AiActionProposalResponse>> ProposeSettings(
        Guid tenantId, Guid userId, string source, AiUiContext? uiContext, AiInterpretedAction parsed, Tenant tenant, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(parsed.Currency) || parsed.Currency.Length != 3)
            return ApiResult<AiActionProposalResponse>.Ok(Clarification("update_settings", "Which three-letter currency code should I use?"));
        if (authService == null) return ApiResult<AiActionProposalResponse>.Fail("Workspace settings service is unavailable.");
        var profile = await authService.GetProfileAsync(userId);
        if (!profile.Success || profile.Data == null) return ApiResult<AiActionProposalResponse>.Fail(profile.Message);
        var payload = new ActionPayload(Name: tenant.CompanyName, Currency: parsed.Currency.ToUpperInvariant(),
            Status: tenant.BusinessType, Notes: JsonSerializer.Serialize(new { profile.Data.FullName, profile.Data.PhoneNumber }, JsonOptions));
        return ApiResult<AiActionProposalResponse>.Ok(await PersistProposal(tenantId, userId, "update_settings", source, uiContext,
            payload, $"Change workspace currency from {tenant.BaseCurrency} to {payload.Currency}?",
            new Dictionary<string, string?> { ["Current currency"] = tenant.BaseCurrency, ["New currency"] = payload.Currency }, ct, "Administrative"));
    }

    private async Task<AiActionProposalResponse> PersistProposal(
        Guid tenantId, Guid userId, string intent, string source, AiUiContext? uiContext,
        ActionPayload payload, string summary, IReadOnlyDictionary<string, string?> details,
        CancellationToken ct, string riskLevel = "Financial")
    {
        var now = DateTime.UtcNow;
        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = intent,
            RiskLevel = riskLevel,
            Status = AiActionStatuses.PendingConfirmation,
            RequiresConfirmation = true,
            SourceText = source,
            UiContextJson = uiContext == null ? null : JsonSerializer.Serialize(uiContext, JsonOptions),
            PayloadJson = JsonSerializer.Serialize(payload, JsonOptions),
            IdempotencyKey = $"ai:{Guid.NewGuid():N}",
            CreatedAt = now,
            ExpiresAt = now.Add(ProposalLifetime)
        };
        db.AiActions.Add(action);
        await db.SaveChangesAsync(ct);
        return new(action.Id, intent, AiActionStatuses.PendingConfirmation, action.RiskLevel,
            true, summary, details, null, action.ExpiresAt);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteExpense(AiAction action, ActionPayload payload)
    {
        var result = await business.CreateBusinessExpenseAsync(action.TenantId, action.IdempotencyKey,
            new CreateBusinessExpenseRequest(payload.Category ?? "Other", payload.Amount, DateTime.UtcNow, payload.Description));
        if (!result.Success || result.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(result.Message);
        var message = IsVietnamese(action.SourceText)
            ? $"✓ Đã ghi khoản chi {FormatAmount(result.Data.Amount, result.Data.Currency)} ({result.Data.Category})."
            : $"Expense recorded: {FormatAmount(result.Data.Amount, result.Data.Currency)} for {result.Data.Category}.";
        return ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, message,
            "BusinessExpense", result.Data.Id));
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecutePayment(AiAction action, ActionPayload payload)
    {
        if (!payload.SaleId.HasValue || !payload.CustomerId.HasValue)
            return ApiResult<AiActionExecutionResponse>.Fail("The payment target is missing.");

        var before = await business.GetCustomerAsync(action.TenantId, payload.CustomerId.Value);
        if (!before.Success || before.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(before.Message);
        if (payload.Amount > before.Data.Customer.OutstandingBalance)
            return ApiResult<AiActionExecutionResponse>.Fail("The payment now exceeds the customer's current balance. Prepare a new proposal.");

        var result = await business.RecordPaymentAsync(action.TenantId, payload.SaleId.Value, action.IdempotencyKey,
            new RecordBusinessPaymentRequest(payload.Amount, "Cash", $"AI action {action.Id:N}", payload.Notes, DateTime.UtcNow));
        if (!result.Success || result.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(result.Message);

        var after = await business.GetCustomerAsync(action.TenantId, payload.CustomerId.Value);
        var newBalance = after.Data?.Customer.OutstandingBalance;
        var message = IsVietnamese(action.SourceText)
            ? $"✓ Đã ghi nhận thanh toán. {payload.CustomerName} hiện còn nợ {FormatAmount(newBalance.GetValueOrDefault(), result.Data.Currency)}."
            : $"Payment recorded. {payload.CustomerName} now owes {FormatAmount(newBalance.GetValueOrDefault(), result.Data.Currency)}.";
        return ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, message,
            "Payment", result.Data.Payments.FirstOrDefault(p => p.Reference == $"AI action {action.Id:N}")?.Id ?? result.Data.Id,
            before.Data.Customer.OutstandingBalance, newBalance));
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteSale(AiAction action, ActionPayload payload)
    {
        if (!payload.CustomerId.HasValue || !payload.ProductId.HasValue)
            return ApiResult<AiActionExecutionResponse>.Fail("The sale customer or product is missing.");

        var result = await business.CreateSaleAsync(action.TenantId, action.IdempotencyKey,
            new CreateSaleRequest(payload.CustomerId.Value,
                [new CreateSaleItemRequest(payload.ProductId.Value, payload.Quantity, payload.UnitPrice)],
                payload.PaidAmount, "Cash", payload.Notes, DateTime.UtcNow));
        if (!result.Success || result.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(result.Message);
        var message = IsVietnamese(action.SourceText)
            ? $"✓ Đã ghi đơn bán. Tổng: {FormatAmount(result.Data.TotalAmount, result.Data.Currency)}; còn lại: {FormatAmount(result.Data.OutstandingBalance, result.Data.Currency)}."
            : $"Sale recorded. Total: {FormatAmount(result.Data.TotalAmount, result.Data.Currency)}; remaining: {FormatAmount(result.Data.OutstandingBalance, result.Data.Currency)}.";
        return ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, message,
            "Sale", result.Data.Id, null, result.Data.OutstandingBalance));
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteCreateCustomer(AiAction action, ActionPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Name)) return ApiResult<AiActionExecutionResponse>.Fail("Customer name is missing.");
        var result = await business.CreateCustomerAsync(action.TenantId,
            new CreateBusinessCustomerRequest(payload.Name, payload.Phone, payload.Email, payload.Address, payload.Notes));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, $"Customer created: {result.Data.Name}.", "Customer", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteCreateProduct(AiAction action, ActionPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Name)) return ApiResult<AiActionExecutionResponse>.Fail("Product name is missing.");
        var result = await business.CreateProductAsync(action.TenantId,
            new CreateProductRequest(payload.Name, null, payload.Unit ?? "item", payload.UnitPrice, Notes: payload.Notes));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, $"Product created: {result.Data.Name}.", "Product", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteCreateSupplier(AiAction action, ActionPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Name)) return ApiResult<AiActionExecutionResponse>.Fail("Supplier name is missing.");
        var result = await business.CreateSupplierAsync(action.TenantId,
            new CreateSupplierRequest(payload.Name, payload.Phone, payload.Email, payload.Address, payload.Notes));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, $"Supplier created: {result.Data.Name}.", "Supplier", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteCustomerChange(AiAction action, ActionPayload payload)
    {
        if (!payload.CustomerId.HasValue || string.IsNullOrWhiteSpace(payload.Name))
            return ApiResult<AiActionExecutionResponse>.Fail("Customer target is missing.");
        var result = await business.UpdateCustomerAsync(action.TenantId, payload.CustomerId.Value,
            new UpdateBusinessCustomerRequest(payload.Name, payload.Phone, payload.Email, payload.Address, payload.Notes, payload.Status ?? "Active"));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
                action.Intent == "archive_customer" ? $"Customer archived: {result.Data.Name}." : $"Customer updated: {result.Data.Name}.", "Customer", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteProductChange(AiAction action, ActionPayload payload)
    {
        if (!payload.ProductId.HasValue || string.IsNullOrWhiteSpace(payload.Name))
            return ApiResult<AiActionExecutionResponse>.Fail("Product target is missing.");
        var result = await business.UpdateProductAsync(action.TenantId, payload.ProductId.Value,
            new UpdateProductRequest(payload.Name, null, payload.Unit ?? "item", payload.UnitPrice, IsActive: payload.Status != "Inactive", Notes: payload.Notes));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
                action.Intent == "archive_product" ? $"Product deactivated: {result.Data.Name}." : $"Product updated: {result.Data.Name}.", "Product", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteSupplierChange(AiAction action, ActionPayload payload)
    {
        if (!payload.SupplierId.HasValue || string.IsNullOrWhiteSpace(payload.Name))
            return ApiResult<AiActionExecutionResponse>.Fail("Supplier target is missing.");
        var result = await business.UpdateSupplierAsync(action.TenantId, payload.SupplierId.Value,
            new UpdateSupplierRequest(payload.Name, payload.Phone, payload.Email, payload.Address, payload.Notes, payload.Status ?? "Active"));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
                action.Intent == "archive_supplier" ? $"Supplier archived: {result.Data.Name}." : $"Supplier updated: {result.Data.Name}.", "Supplier", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecutePurchase(AiAction action, ActionPayload payload)
    {
        if (!payload.SupplierId.HasValue || string.IsNullOrWhiteSpace(payload.ProductName))
            return ApiResult<AiActionExecutionResponse>.Fail("Purchase supplier or item is missing.");
        var result = await business.CreatePurchaseAsync(action.TenantId, action.IdempotencyKey,
            new CreatePurchaseRequest(payload.SupplierId.Value,
                [new CreatePurchaseItemRequest(payload.ProductName, payload.Unit ?? "item", payload.Quantity, payload.UnitPrice, payload.ProductId)],
                payload.PaidAmount, "Cash", payload.Notes, DateTime.UtcNow));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
                $"Purchase recorded. Total: {FormatAmount(result.Data.TotalAmount, result.Data.Currency)}; remaining: {FormatAmount(result.Data.OutstandingBalance, result.Data.Currency)}.",
                "Purchase", result.Data.Id, null, result.Data.OutstandingBalance))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteSupplierPayment(AiAction action, ActionPayload payload)
    {
        if (!payload.PurchaseId.HasValue || !payload.SupplierId.HasValue)
            return ApiResult<AiActionExecutionResponse>.Fail("Supplier payment target is missing.");
        var before = await business.GetSupplierAsync(action.TenantId, payload.SupplierId.Value);
        if (!before.Success || before.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(before.Message);
        if (payload.Amount > before.Data.Supplier.OutstandingBalance)
            return ApiResult<AiActionExecutionResponse>.Fail("The payment now exceeds the supplier's current balance. Prepare a new proposal.");
        var result = await business.RecordPurchasePaymentAsync(action.TenantId, payload.PurchaseId.Value, action.IdempotencyKey,
            new RecordPurchasePaymentRequest(payload.Amount, "Cash", $"AI action {action.Id:N}", payload.Notes, DateTime.UtcNow));
        if (!result.Success || result.Data == null) return ApiResult<AiActionExecutionResponse>.Fail(result.Message);
        var after = await business.GetSupplierAsync(action.TenantId, payload.SupplierId.Value);
        var remaining = after.Data?.Supplier.OutstandingBalance ?? 0m;
        return ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
            $"Supplier payment recorded. Remaining balance: {FormatAmount(remaining, result.Data.Currency)}.",
            "PurchasePayment", result.Data.Payments.FirstOrDefault(p => p.Reference == $"AI action {action.Id:N}")?.Id ?? result.Data.Id,
            before.Data.Supplier.OutstandingBalance, remaining));
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteVoidSale(AiAction action, ActionPayload payload)
    {
        if (!payload.SaleId.HasValue) return ApiResult<AiActionExecutionResponse>.Fail("Sale target is missing.");
        var result = await business.VoidSaleAsync(action.TenantId, payload.SaleId.Value);
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, $"Sale {result.Data.SaleNumber} was voided.", "Sale", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteVoidPurchase(AiAction action, ActionPayload payload)
    {
        if (!payload.PurchaseId.HasValue) return ApiResult<AiActionExecutionResponse>.Fail("Purchase target is missing.");
        var result = await business.VoidPurchaseAsync(action.TenantId, payload.PurchaseId.Value);
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status, $"Purchase {result.Data.PurchaseNumber} was voided.", "Purchase", result.Data.Id))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<ApiResult<AiActionExecutionResponse>> ExecuteSettings(AiAction action, ActionPayload payload)
    {
        if (authService == null) return ApiResult<AiActionExecutionResponse>.Fail("Workspace settings service is unavailable.");
        var profile = await authService.GetProfileAsync(action.UserId);
        if (!profile.Success || profile.Data == null || string.IsNullOrWhiteSpace(payload.Currency))
            return ApiResult<AiActionExecutionResponse>.Fail(profile.Message);
        var result = await authService.UpdateSettingsAsync(action.UserId, action.TenantId,
            new UpdateSettingsRequest(profile.Data.CompanyName, payload.Currency,
                profile.Data.BusinessType ?? "other", profile.Data.FullName, profile.Data.PhoneNumber));
        return result.Success && result.Data != null
            ? ApiResult<AiActionExecutionResponse>.Ok(new(action.Id, action.Status,
                $"Workspace currency changed to {result.Data.PreferredCurrency}.", "Tenant", action.TenantId))
            : ApiResult<AiActionExecutionResponse>.Fail(result.Message);
    }

    private async Task<EntityMatch<CustomerChoice>> ResolveCustomer(
        Guid tenantId, string source, string? extractedName, AiUiContext? uiContext, CancellationToken ct)
    {
        if (uiContext?.Entity?.Equals("customer", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var contextual = await db.Customers.AsNoTracking().FirstOrDefaultAsync(
                c => c.TenantId == tenantId && c.Id == uiContext.EntityId && c.Status == "Active", ct);
            if (contextual != null) return EntityMatch<CustomerChoice>.One(new(contextual.Id, contextual.Name));
        }

        var customers = await db.Customers.AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Status == "Active")
            .Select(c => new CustomerChoice(c.Id, c.Name)).ToListAsync(ct);
        var sourceKey = SearchKey(source);
        var extractedKey = SearchKey(extractedName);
        var matches = customers.Where(c =>
            sourceKey.Contains(SearchKey(c.Name), StringComparison.Ordinal) ||
            (!string.IsNullOrWhiteSpace(extractedKey) &&
             (SearchKey(c.Name).Contains(extractedKey, StringComparison.Ordinal) || extractedKey.Contains(SearchKey(c.Name), StringComparison.Ordinal))))
            .ToList();
        return EntityMatch<CustomerChoice>.From(matches, c => new(c.Id, c.Name));
    }

    private async Task<EntityMatch<ProductChoice>> ResolveProduct(
        Guid tenantId, string source, string? extractedName, AiUiContext? uiContext, CancellationToken ct)
    {
        if (uiContext?.Entity?.Equals("product", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var contextual = await db.Products.AsNoTracking().FirstOrDefaultAsync(
                p => p.TenantId == tenantId && p.Id == uiContext.EntityId && p.IsActive, ct);
            if (contextual != null) return EntityMatch<ProductChoice>.One(new(contextual.Id, contextual.Name, contextual.Unit, contextual.DefaultPrice));
        }

        var products = await db.Products.AsNoTracking().Where(p => p.TenantId == tenantId && p.IsActive)
            .Select(p => new ProductChoice(p.Id, p.Name, p.Unit, p.DefaultPrice)).ToListAsync(ct);
        var sourceKey = SearchKey(source);
        var extractedKey = SearchKey(extractedName);
        var matches = products.Where(p =>
            sourceKey.Contains(SearchKey(p.Name), StringComparison.Ordinal) ||
            (!string.IsNullOrWhiteSpace(extractedKey) && SearchKey(p.Name).Contains(extractedKey, StringComparison.Ordinal)))
            .ToList();
        return EntityMatch<ProductChoice>.From(matches, p => new(p.Id, p.Name, p.Unit));
    }

    private async Task<EntityMatch<SupplierChoice>> ResolveSupplier(
        Guid tenantId, string source, string? extractedName, AiUiContext? uiContext, CancellationToken ct)
    {
        if (uiContext?.Entity?.Equals("supplier", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var contextual = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(
                s => s.TenantId == tenantId && s.Id == uiContext.EntityId && s.Status == "Active", ct);
            if (contextual != null) return EntityMatch<SupplierChoice>.One(new(contextual.Id, contextual.Name));
        }
        var suppliers = await db.Suppliers.AsNoTracking().Where(s => s.TenantId == tenantId && s.Status == "Active")
            .Select(s => new SupplierChoice(s.Id, s.Name)).ToListAsync(ct);
        var sourceKey = SearchKey(source);
        var extractedKey = SearchKey(extractedName);
        var matches = suppliers.Where(s =>
            sourceKey.Contains(SearchKey(s.Name), StringComparison.Ordinal) ||
            (!string.IsNullOrWhiteSpace(extractedKey) &&
             (SearchKey(s.Name).Contains(extractedKey, StringComparison.Ordinal) || extractedKey.Contains(SearchKey(s.Name), StringComparison.Ordinal))))
            .ToList();
        return EntityMatch<SupplierChoice>.From(matches, s => new(s.Id, s.Name));
    }

    private void SetAiAuditContext(Guid actionId, Guid userId)
    {
        if (httpContextAccessor.HttpContext != null)
        {
            httpContextAccessor.HttpContext.Items["Tenvora.AiActionId"] = actionId;
            httpContextAccessor.HttpContext.Items["Tenvora.AiActorId"] = userId;
        }
    }

    private static AiActionProposalResponse Clarification(
        string intent, string summary, IReadOnlyList<AiActionCandidate>? candidates = null) =>
        new(null, intent, "NeedsClarification", "None", false, summary,
            new Dictionary<string, string?>(), candidates);

    private static AiActionProposalResponse EntityClarification(
        string intent, string entity, IReadOnlyList<AiActionCandidate> candidates) =>
        Clarification(intent,
            candidates.Count == 0
                ? $"I couldn't find that {entity} in this workspace."
                : $"I found more than one possible {entity}. Which one did you mean?",
            candidates);

    private static IReadOnlyDictionary<string, string?> ContactDetails(
        string? name, string? phone, string? email, string? address) =>
        new Dictionary<string, string?> { ["Name"] = name, ["Phone"] = phone, ["Email"] = email, ["Address"] = address };

    private static decimal ExtractQuantity(string text)
    {
        var match = Regex.Match(text, @"(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gram|cái|cai|món|mon|pcs?)\b", RegexOptions.IgnoreCase);
        if (!match.Success) return 1m;
        return decimal.TryParse(match.Groups[1].Value.Replace(',', '.'), NumberStyles.Number,
            CultureInfo.InvariantCulture, out var quantity) ? quantity : 1m;
    }

    private static string SearchKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(char.ToLowerInvariant(character));
        }
        return Regex.Replace(builder.ToString().Replace('đ', 'd'), @"[^a-z0-9]+", " ").Trim();
    }

    private static bool IsVietnamese(string text) =>
        Regex.IsMatch(text, "[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", RegexOptions.IgnoreCase)
        || Regex.IsMatch(text, @"\b(anh|chị|vừa|trả|bán|chi|nợ|hôm nay)\b", RegexOptions.IgnoreCase);

    private static bool RequiresTenantAdmin(string intent) => intent is "update_settings";

    private async Task<Guid?> RecentAffectedEntityId(
        Guid tenantId, Guid userId, string intent, string entityType, CancellationToken ct) =>
        await db.AiActions.AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.UserId == userId && a.Intent == intent &&
                        a.Status == AiActionStatuses.Executed && a.AffectedEntityType == entityType && a.AffectedEntityId.HasValue)
            .OrderByDescending(a => a.ExecutedAt)
            .Select(a => a.AffectedEntityId)
            .FirstOrDefaultAsync(ct);

    private static ActionPayload ApplyInputOverrides(
        string intent,
        ActionPayload payload,
        AiActionInputOverrides input)
    {
        static string Required(string? value, string field)
        {
            var normalized = value?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                throw new InvalidOperationException($"{field} is required.");
            return normalized;
        }

        static string? Optional(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        return intent switch
        {
            "create_customer" or "update_customer" => payload with
            {
                Name = Required(input.Name, "Customer name"),
                Phone = Optional(input.Phone),
                Email = Optional(input.Email),
                Address = Optional(input.Address)
            },
            "create_product" or "update_product" => payload with
            {
                Name = Required(input.Name, "Product name"),
                Unit = Required(input.Unit, "Product unit"),
                UnitPrice = input.UnitPrice is >= 0
                    ? input.UnitPrice.Value
                    : throw new InvalidOperationException("Product price cannot be negative.")
            },
            "create_supplier" or "update_supplier" => payload with
            {
                Name = Required(input.Name, "Supplier name"),
                Phone = Optional(input.Phone),
                Email = Optional(input.Email),
                Address = Optional(input.Address)
            },
            "expense" => payload with
            {
                Category = Required(input.Category, "Expense category"),
                Amount = input.Amount is > 0
                    ? input.Amount.Value
                    : throw new InvalidOperationException("Expense amount must be greater than zero."),
                Description = Optional(input.Description)
            },
            _ => throw new InvalidOperationException("Editable input is not supported for this action type.")
        };
    }

    private static bool SupportsEditableInput(string intent) => intent is
        "create_customer" or "update_customer" or
        "create_product" or "update_product" or
        "create_supplier" or "update_supplier" or
        "expense";

    private static string? NormalizeDraftName(string? value)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized)) return null;
        return Regex.IsMatch(normalized, @"^(a|an|the|one|new|một|mot|mới|moi)$", RegexOptions.IgnoreCase)
            ? null
            : normalized;
    }

    private static bool ReferencesRecent(string source) => Regex.IsMatch(source,
        @"\b(just|last|recent|previous|mới|vừa|gần nhất|trước đó)\b", RegexOptions.IgnoreCase);

    private static bool ReferencesRecentCustomer(string source) => Regex.IsMatch(source,
        @"\b(they|them|their|he|him|his|she|her|that customer|this customer|khách đó|người đó|anh ấy|chị ấy|họ)\b",
        RegexOptions.IgnoreCase);

    private static string FormatAmount(decimal amount, string currency)
    {
        var cur = currency?.ToUpperInvariant() ?? "USD";
        if (cur == "VND")
        {
            return $"{amount:N0} VND";
        }
        if (amount % 1m != 0m)
        {
            return $"{amount:N2} {cur}";
        }
        return $"{amount:N0} {cur}";
    }

    private sealed record ActionPayload(
        Guid? CustomerId = null,
        string? CustomerName = null,
        Guid? SupplierId = null,
        string? SupplierName = null,
        Guid? ProductId = null,
        string? ProductName = null,
        Guid? SaleId = null,
        Guid? PurchaseId = null,
        string? Name = null,
        decimal Quantity = 1m,
        decimal UnitPrice = 0m,
        decimal Amount = 0m,
        decimal PaidAmount = 0m,
        decimal? PreviousBalance = null,
        string? Unit = null,
        string? Category = null,
        string? Phone = null,
        string? Email = null,
        string? Address = null,
        string? Currency = null,
        string? Status = null,
        string? Description = null,
        string? Notes = null);

    private sealed record CustomerChoice(Guid Id, string Name);
    private sealed record ProductChoice(Guid Id, string Name, string Unit, decimal DefaultPrice);
    private sealed record SupplierChoice(Guid Id, string Name);

    private sealed record EntityMatch<T>(T? Selected, IReadOnlyList<AiActionCandidate> Candidates) where T : class
    {
        public static EntityMatch<T> One(T item) => new(item, []);
        public static EntityMatch<T> From(IReadOnlyList<T> matches, Func<T, AiActionCandidate> candidate) =>
            matches.Count == 1 ? One(matches[0]) : new(null, matches.Take(5).Select(candidate).ToList());
    }
}

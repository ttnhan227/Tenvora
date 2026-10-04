using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;

namespace Tenvora.Api.Services;

public sealed class AiAgentService : IAiAgentService
{
    private readonly AppDbContext _context;
    private readonly IBusinessService _businessService;
    private readonly IAiActionService _actionService;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiAgentService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AiAgentService(
        AppDbContext context,
        IBusinessService businessService,
        IAiActionService actionService,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<AiAgentService> logger)
    {
        _context = context;
        _businessService = businessService;
        _actionService = actionService;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ApiResult<AiAgentChatResponse>> AgentChatAsync(
        Guid tenantId,
        Guid userId,
        AiAgentChatRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default)
    {
        var rawText = request.Message?.Trim();
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return ApiResult<AiAgentChatResponse>.Fail("Message cannot be empty.");
        }

        var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        if (tenant == null)
        {
            return ApiResult<AiAgentChatResponse>.Fail("Store not found.");
        }

        var currency = tenant.BaseCurrency ?? "VND";

        // 1. Resolve or create conversation thread
        AiConversation conversation;
        if (request.ConversationId.HasValue && request.ConversationId.Value != Guid.Empty)
        {
            conversation = await _context.AiConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId.Value && c.TenantId == tenantId && c.UserId == userId, ct)
                ?? await CreateConversationAsync(tenantId, userId, rawText, ct);
        }
        else
        {
            conversation = await CreateConversationAsync(tenantId, userId, rawText, ct);
        }

        // 2. Persist user message
        var userMessage = new AiConversationMessage
        {
            TenantId = tenantId,
            ConversationId = conversation.Id,
            Role = "user",
            Content = rawText,
            CreatedAt = DateTime.UtcNow
        };
        _context.AiConversationMessages.Add(userMessage);
        await _context.SaveChangesAsync(ct);

        // 3. Check if user is confirming or canceling a pending proposal directly
        var recentPending = await _context.AiConversationMessages
            .Where(m => m.ConversationId == conversation.Id && m.ActionProposalId != null)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (recentPending?.ActionProposalId != null)
        {
            var pendingAction = await _context.AiActions
                .FirstOrDefaultAsync(a => a.Id == recentPending.ActionProposalId.Value && a.Status == AiActionStatuses.PendingConfirmation, ct);

            if (pendingAction != null)
            {
                var lower = rawText.ToLowerInvariant();
                var isConfirm = Regex.IsMatch(lower, @"^(yes|y|confirm|confirmed|ok|okay|đồng ý|dong y|xác nhận|xac nhan|ừ|uh|có|chốt|thực hiện)$");
                var isCancel = Regex.IsMatch(lower, @"^(no|n|cancel|stop|không|khong|hủy|huỷ|huy|thôi|bỏ qua)$");

                if (isConfirm || isCancel)
                {
                    var execResult = await _actionService.ConfirmAsync(tenantId, userId, pendingAction.Id, isConfirm, userRole, ct);
                    var replyMsg = execResult.Success
                        ? (isConfirm ? $"Đã xác nhận và thực hiện: {execResult.Data?.Message}" : "Đã hủy thao tác.")
                        : $"Không thể thực hiện: {execResult.Message}";

                    var assistantConfirmMsg = new AiConversationMessage
                    {
                        TenantId = tenantId,
                        ConversationId = conversation.Id,
                        Role = "assistant",
                        Content = replyMsg,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AiConversationMessages.Add(assistantConfirmMsg);
                    conversation.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync(ct);

                    await _context.Entry(pendingAction).ReloadAsync(ct);
                    var settledProposal = MapActionToProposal(pendingAction);

                    return ApiResult<AiAgentChatResponse>.Ok(new AiAgentChatResponse(
                        conversation.Id,
                        assistantConfirmMsg.Id,
                        replyMsg,
                        settledProposal,
                        null,
                        "Tenvora Agent",
                        "interactive-executor",
                        false
                    ));
                }
            }
        }

        // 4. Fetch recent history for multi-turn context
        var history = await _context.AiConversationMessages
            .Where(m => m.ConversationId == conversation.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Take(12)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        // A clarification reply is part of the previous action, not a brand-new
        // dashboard question. Recover older dead-end product clarifications and
        // turn the supplied product description into an inline catalog draft.
        var clarificationRecovery = TryRecoverMissingProductClarification(history, rawText, currency);

        // 5. Run Agent with Tools (Gemini with tool-calling loop or local deterministic runner)
        var apiKey = _config["AI_PROVIDER_API_KEY"] ?? _config["AiProvider:ApiKey"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY") ?? Environment.GetEnvironmentVariable("AiProvider__ApiKey");
        var endpoint = _config["AI_PROVIDER_ENDPOINT"] ?? _config["AiProvider:Endpoint"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_ENDPOINT") ?? Environment.GetEnvironmentVariable("AiProvider__Endpoint") ?? "https://generativelanguage.googleapis.com/v1beta/models";
        var model = _config["AI_CHAT_MODEL"] ?? _config["AiProvider:ChatModel"] ?? Environment.GetEnvironmentVariable("AI_CHAT_MODEL") ?? Environment.GetEnvironmentVariable("AiProvider__ChatModel") ?? "gemini-flash-latest";

        string reply;
        AiActionProposalResponse? proposal = null;
        List<AiAgentToolCallInfo> toolCalls = new();
        string providerName = "Google Gemini";
        bool isFallback = false;

        if (clarificationRecovery != null)
        {
            reply = clarificationRecovery.Reply;
            proposal = clarificationRecovery.Proposal;
            toolCalls = clarificationRecovery.ToolCalls;
            providerName = "Tenvora Local Agent";
            isFallback = true;
        }
        else if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var geminiResult = await RunGeminiAgentLoopAsync(
                    tenantId, userId, userRole, tenant, currency, history, rawText, request.UiContext,
                    apiKey, endpoint, model, ct);

                reply = geminiResult.Reply;
                proposal = geminiResult.Proposal;
                toolCalls = geminiResult.ToolCalls;
                providerName = "Google Gemini";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini Agent tool loop failed; running resilient local agent.");
                var localResult = await RunLocalAgentAsync(tenantId, userId, userRole, tenant, currency, rawText, request.UiContext, ct);
                reply = localResult.Reply;
                proposal = localResult.Proposal;
                toolCalls = localResult.ToolCalls;
                providerName = "Tenvora Local Agent";
                isFallback = true;
            }
        }
        else
        {
            var localResult = await RunLocalAgentAsync(tenantId, userId, userRole, tenant, currency, rawText, request.UiContext, ct);
            reply = localResult.Reply;
            proposal = localResult.Proposal;
            toolCalls = localResult.ToolCalls;
            providerName = "Tenvora Local Agent";
            isFallback = true;
        }

        // 6. Save assistant message and update conversation timestamp
        var assistantMessage = new AiConversationMessage
        {
            TenantId = tenantId,
            ConversationId = conversation.Id,
            Role = "assistant",
            Content = reply,
            ActionProposalId = proposal?.ActionId,
            ToolCallsJson = toolCalls.Count > 0 ? JsonSerializer.Serialize(toolCalls, JsonOpts) : null,
            CreatedAt = DateTime.UtcNow
        };
        _context.AiConversationMessages.Add(assistantMessage);

        conversation.UpdatedAt = DateTime.UtcNow;
        if (conversation.Title == "Cuộc trò chuyện mới" && rawText.Length > 0)
        {
            conversation.Title = rawText.Length > 40 ? rawText.Substring(0, 37) + "..." : rawText;
        }
        await _context.SaveChangesAsync(ct);

        return ApiResult<AiAgentChatResponse>.Ok(new AiAgentChatResponse(
            conversation.Id,
            assistantMessage.Id,
            reply,
            proposal,
            toolCalls.Count > 0 ? toolCalls : null,
            providerName,
            model,
            isFallback
        ));
    }

    public async Task<ApiResult<List<AiConversationSummaryDto>>> GetConversationsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken ct = default)
    {
        var list = await _context.AiConversations
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .Take(30)
            .Select(c => new AiConversationSummaryDto(
                c.Id,
                c.Title,
                c.CreatedAt,
                c.UpdatedAt,
                c.Messages.Count,
                c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Content).FirstOrDefault()
            ))
            .ToListAsync(ct);

        return ApiResult<List<AiConversationSummaryDto>>.Ok(list);
    }

    public async Task<ApiResult<AiConversationDetailDto>> GetConversationAsync(
        Guid tenantId,
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default)
    {
        var conv = await _context.AiConversations
            .AsNoTracking()
            .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.TenantId == tenantId && c.UserId == userId, ct);

        if (conv == null)
            return ApiResult<AiConversationDetailDto>.Fail("Conversation not found.");

        var proposalIds = conv.Messages
            .Where(m => m.ActionProposalId.HasValue)
            .Select(m => m.ActionProposalId!.Value)
            .Distinct()
            .ToList();

        var proposals = await _context.AiActions
            .AsNoTracking()
            .Where(a => proposalIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => MapActionToProposal(a), ct);

        var messageDtos = conv.Messages.Select(m =>
        {
            AiActionProposalResponse? prop = null;
            if (m.ActionProposalId.HasValue && proposals.TryGetValue(m.ActionProposalId.Value, out var found))
            {
                prop = found;
            }

            List<AiAgentToolCallInfo>? tools = null;
            if (!string.IsNullOrWhiteSpace(m.ToolCallsJson))
            {
                try { tools = JsonSerializer.Deserialize<List<AiAgentToolCallInfo>>(m.ToolCallsJson, JsonOpts); } catch { }
            }

            return new AiConversationMessageDto(
                m.Id,
                m.Role,
                m.Content,
                m.CreatedAt,
                prop,
                tools
            );
        }).ToList();

        return ApiResult<AiConversationDetailDto>.Ok(new AiConversationDetailDto(
            conv.Id,
            conv.Title,
            conv.CreatedAt,
            conv.UpdatedAt,
            messageDtos
        ));
    }

    public async Task<ApiResult<bool>> DeleteConversationAsync(
        Guid tenantId,
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default)
    {
        var conv = await _context.AiConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.TenantId == tenantId && c.UserId == userId, ct);

        if (conv == null)
            return ApiResult<bool>.Fail("Conversation not found.");

        _context.AiConversations.Remove(conv);
        await _context.SaveChangesAsync(ct);
        return ApiResult<bool>.Ok(true);
    }

    private async Task<AiConversation> CreateConversationAsync(Guid tenantId, Guid userId, string firstMessage, CancellationToken ct)
    {
        var title = firstMessage.Length > 40 ? firstMessage.Substring(0, 37) + "..." : firstMessage;
        var conversation = new AiConversation
        {
            TenantId = tenantId,
            UserId = userId,
            Title = string.IsNullOrWhiteSpace(title) ? "Cuộc trò chuyện mới" : title,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.AiConversations.Add(conversation);
        await _context.SaveChangesAsync(ct);
        return conversation;
    }

    #region Gemini Tool-Calling Agent Loop

    private sealed record AgentTurnResult(string Reply, AiActionProposalResponse? Proposal, List<AiAgentToolCallInfo> ToolCalls);

    private async Task<AgentTurnResult> RunGeminiAgentLoopAsync(
        Guid tenantId,
        Guid userId,
        string userRole,
        Tenant tenant,
        string currency,
        List<AiConversationMessage> history,
        string currentPrompt,
        AiUiContext? uiContext,
        string apiKey,
        string endpoint,
        string model,
        CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(25);

        var toolDefs = GetFunctionDeclarations();
        var systemInstruction = $@"You are Tenvora Agent, an autonomous, highly reliable AI Business Manager for small local businesses.
You have access to live database tools to query business metrics, inventory, customers, suppliers, and sales history.
Store Name: {tenant.CompanyName ?? "Cửa hàng"}
Base Currency: {currency}
User Role: {userRole}

RULES:
1. Always use available tools when the user asks about facts, balances, inventory, or financial summaries. Do NOT guess numbers.
2. If the user asks to record or perform a transaction (e.g. sale, purchase, expense, customer debt payment, supplier payment, creating customer/supplier/product), call 'propose_transaction' with the full instruction so the user receives a safe preview card to confirm.
3. Be concise (2-4 sentences or clear bullet points), polite, professional, and friendly.
4. Support Vietnamese naturally if the user asks in Vietnamese. Support English if the user asks in English.
5. Format monetary amounts with comma separators and currency (e.g. 150,000 {currency}).";

        var contents = new List<object>();

        // Build history turns
        foreach (var msg in history.Take(history.Count - 1))
        {
            contents.Add(new
            {
                role = msg.Role == "assistant" ? "model" : "user",
                parts = new object[] { new { text = msg.Content } }
            });
        }

        // Add current turn
        contents.Add(new
        {
            role = "user",
            parts = new object[] { new { text = currentPrompt } }
        });

        AiActionProposalResponse? capturedProposal = null;
        var executedTools = new List<AiAgentToolCallInfo>();

        // Run multi-step agent loop (up to 3 tool call turns)
        for (int step = 0; step < 3; step++)
        {
            var requestBody = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents,
                tools = new[] { new { functionDeclarations = toolDefs } },
                generationConfig = new { temperature = 0.2 }
            };

            var url = $"{endpoint.TrimEnd('/')}/{model}:generateContent?key={apiKey}";
            var response = await client.PostAsJsonAsync(url, requestBody, ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Gemini API call failed: {StatusCode} {Error}", response.StatusCode, err);
                throw new InvalidOperationException($"Gemini API returned {response.StatusCode}");
            }

            var resJson = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
            if (!resJson.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            {
                throw new InvalidOperationException("Gemini returned empty candidates.");
            }

            var candidate = candidates[0];
            var parts = candidate.GetProperty("content").GetProperty("parts");

            // Check if model returned a functionCall
            JsonElement? functionCallPart = null;
            string? textPart = null;

            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("functionCall", out var fc))
                {
                    functionCallPart = fc;
                    break;
                }
                if (part.TryGetProperty("text", out var t))
                {
                    textPart = t.GetString();
                }
            }

            if (functionCallPart == null)
            {
                // Terminal response: no further tool calls
                return new AgentTurnResult(textPart?.Trim() ?? "Đã xử lý thông tin cho bạn.", capturedProposal, executedTools);
            }

            // Execute Tool Call
            var fnName = functionCallPart.Value.GetProperty("name").GetString() ?? "";
            var fnArgs = functionCallPart.Value.TryGetProperty("args", out var args) ? args : default;

            var (toolResultObj, toolSummary, toolProp) = await ExecuteToolAsync(
                tenantId, userId, userRole, currency, fnName, fnArgs, uiContext, ct);

            if (toolProp != null)
            {
                capturedProposal = toolProp;
            }

            executedTools.Add(new AiAgentToolCallInfo(fnName, toolSummary, toolResultObj));

            // Append model's exact content to preserve thought_signature, functionCall, and thoughts
            contents.Add(candidate.GetProperty("content"));

            contents.Add(new
            {
                role = "user",
                parts = new object[]
                {
                    new
                    {
                        functionResponse = new
                        {
                            name = fnName,
                            response = new { output = toolResultObj }
                        }
                    }
                }
            });
        }

        return new AgentTurnResult("Đã hoàn tất truy vấn dữ liệu.", capturedProposal, executedTools);
    }

    private async Task<(object Result, string Summary, AiActionProposalResponse? Proposal)> ExecuteToolAsync(
        Guid tenantId,
        Guid userId,
        string userRole,
        string currency,
        string toolName,
        JsonElement args,
        AiUiContext? uiContext,
        CancellationToken ct)
    {
        switch (toolName)
        {
            case "get_business_overview":
            {
                var period = args.TryGetProperty("period", out var p) ? p.GetString() : "today";
                var dashResult = await _businessService.GetDashboardAsync(tenantId, period);
                var d = dashResult.Data;
                var res = new
                {
                    period,
                    todaySales = d?.TodaySales ?? 0,
                    todayPayments = d?.TodayPayments ?? 0,
                    todayExpenses = d?.TodayExpenses ?? 0,
                    todayPurchases = d?.TodayPurchases ?? 0,
                    periodSales = d?.PeriodSales ?? 0,
                    periodCogs = d?.PeriodCogs ?? 0,
                    periodExpenses = d?.PeriodExpenses ?? 0,
                    periodPurchases = d?.PeriodPurchases ?? 0,
                    estimatedNetProfit = d?.PeriodNetProfit ?? 0,
                    outstandingCustomers = d?.OutstandingCustomers ?? 0,
                    outstandingSuppliers = d?.OutstandingSuppliers ?? 0,
                    currency
                };
                return (res, $"Lấy tổng quan tình hình kinh doanh ({period})", null);
            }

            case "query_inventory_and_products":
            {
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var lowStockOnly = args.TryGetProperty("lowStockOnly", out var ls) && ls.GetBoolean();
                var productsResult = await _businessService.GetProductsAsync(tenantId, search, true);
                var prods = productsResult.Data ?? new();
                if (lowStockOnly)
                {
                    prods = prods.Where(p => p.StockQuantity <= (p.MinStockLevel ?? 0)).ToList();
                }
                var list = prods.Take(15).Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Unit,
                    p.DefaultPrice,
                    p.CostPrice,
                    p.StockQuantity,
                    p.MinStockLevel,
                    Status = p.StockQuantity <= 0 ? "Hết hàng" : (p.MinStockLevel.HasValue && p.StockQuantity <= p.MinStockLevel ? "Sắp hết hàng" : "Còn hàng")
                }).ToList();
                return (list, $"Kiểm tra danh sách hàng hoá & tồn kho ({list.Count} mặt hàng)", null);
            }

            case "query_customers_and_debt":
            {
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var hasDebtOnly = args.TryGetProperty("hasDebtOnly", out var hd) && hd.GetBoolean();
                var customersResult = await _businessService.GetCustomersAsync(tenantId, search, null);
                var custs = (customersResult.Data ?? new())
                    .Where(c => !hasDebtOnly || c.OutstandingBalance > 0)
                    .Take(15).Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Phone,
                    c.OutstandingBalance,
                    DebtStatus = c.OutstandingBalance > 0 ? "Đang nợ" : "Đã thanh toán đủ"
                }).ToList();
                return (custs, $"Kiểm tra danh sách khách hàng & công nợ ({custs.Count} khách)", null);
            }

            case "query_suppliers_and_payables":
            {
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var hasDebtOnly = args.TryGetProperty("hasDebtOnly", out var hd) && hd.GetBoolean();
                var suppliersResult = await _businessService.GetSuppliersAsync(tenantId, search, null);
                var supps = (suppliersResult.Data ?? new())
                    .Where(s => !hasDebtOnly || s.OutstandingBalance > 0)
                    .Take(15).Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Phone,
                    s.OutstandingBalance,
                    PayableStatus = s.OutstandingBalance > 0 ? "Còn nợ nhà cung cấp" : "Đã trả đủ"
                }).ToList();
                return (supps, $"Kiểm tra danh sách nhà cung cấp & nợ phải trả ({supps.Count} NCC)", null);
            }

            case "query_sales_history":
            {
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var salesResult = await _businessService.GetSalesAsync(tenantId, search, null, null, null);
                var sales = (salesResult.Data ?? new()).Take(10).Select(x => new
                {
                    x.SaleNumber,
                    x.CustomerName,
                    x.TotalAmount,
                    x.PaidAmount,
                    x.OutstandingBalance,
                    x.PaymentStatus,
                    Date = x.SoldAt.ToString("yyyy-MM-dd HH:mm")
                }).ToList();
                return (sales, $"Tra cứu lịch sử đơn bán hàng ({sales.Count} đơn)", null);
            }

            case "query_expenses_history":
            {
                var category = args.TryGetProperty("category", out var c) ? c.GetString() ?? "" : "";
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var expResult = await _businessService.GetBusinessExpensesAsync(tenantId, search, string.IsNullOrWhiteSpace(category) ? null : category, null, null);
                var exps = (expResult.Data ?? new()).Take(10).Select(x => new
                {
                    x.Category,
                    x.Amount,
                    x.Description,
                    Date = x.ExpenseDate.ToString("yyyy-MM-dd")
                }).ToList();
                return (exps, $"Tra cứu lịch sử chi phí ({exps.Count} khoản)", null);
            }

            case "query_purchases_history":
            {
                var search = args.TryGetProperty("search", out var s) ? s.GetString() ?? "" : "";
                var purchasesResult = await _businessService.GetPurchasesAsync(tenantId, search, null, null, null);
                var purchases = (purchasesResult.Data ?? new()).Take(10).Select(x => new
                {
                    x.PurchaseNumber,
                    x.SupplierName,
                    x.TotalAmount,
                    x.PaidAmount,
                    x.OutstandingBalance,
                    x.PaymentStatus,
                    Date = x.PurchasedAt.ToString("yyyy-MM-dd HH:mm")
                }).ToList();
                return (purchases, $"Tra cứu lịch sử đơn nhập hàng ({purchases.Count} đơn)", null);
            }

            case "query_stock_adjustments":
            {
                var adjResult = await _businessService.GetStockAdjustmentsAsync(tenantId, null);
                var adjs = (adjResult.Data ?? new()).Take(10).Select(x => new
                {
                    x.ProductName,
                    x.AdjustmentQuantity,
                    x.QuantityBefore,
                    x.QuantityAfter,
                    x.Reason,
                    x.Notes,
                    Date = x.AdjustedAt.ToString("yyyy-MM-dd HH:mm")
                }).ToList();
                return (adjs, $"Tra cứu lịch sử điều chỉnh tồn kho ({adjs.Count} lần)", null);
            }

            case "propose_transaction":
            {
                var instruction = args.TryGetProperty("instruction", out var inst) ? inst.GetString() ?? "" : "";
                var propResult = await _actionService.ProposeAsync(
                    tenantId, userId, new AiProposeActionRequest(instruction, uiContext), userRole, ct);

                if (propResult.Success && propResult.Data != null)
                {
                    var isClarification = propResult.Data.Status == AiActionStatuses.NeedsClarification || propResult.Data.ActionId == null;
                    return (new
                    {
                        success = true,
                        summary = propResult.Data.Summary,
                        actionId = propResult.Data.ActionId,
                        risk = propResult.Data.RiskLevel,
                        requiresConfirmation = propResult.Data.RequiresConfirmation,
                        status = propResult.Data.Status,
                        details = propResult.Data.Details,
                        candidates = propResult.Data.Candidates
                    }, isClarification ? $"Cần thêm thông tin: {propResult.Data.Summary}" : $"Chuẩn bị giao dịch: {propResult.Data.Summary}", propResult.Data);
                }

                return (new { success = false, message = propResult.Message }, "Không thể tạo đề xuất giao dịch", null);
            }

            default:
                return (new { error = $"Unknown tool: {toolName}" }, "Công cụ không hợp lệ", null);
        }
    }

    private static object[] GetFunctionDeclarations()
    {
        return new object[]
        {
            new
            {
                name = "get_business_overview",
                description = "Get high-level financial overview: revenue, expenses, purchases, net profit, customer debt, and supplier debt.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        period = new
                        {
                            type = "STRING",
                            @enum = new[] { "today", "week", "month", "year", "all" },
                            description = "Time period to aggregate (default: today)"
                        }
                    }
                }
            },
            new
            {
                name = "query_inventory_and_products",
                description = "Query products, check current stock levels, identify out-of-stock or low-stock items, and see unit cost/selling prices.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        search = new { type = "STRING", description = "Optional product name search" },
                        lowStockOnly = new { type = "BOOLEAN", description = "Set to true to only show items below or at minimum stock level" }
                    }
                }
            },
            new
            {
                name = "query_customers_and_debt",
                description = "Query customers, check outstanding debts and who owes money to the store.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        search = new { type = "STRING", description = "Customer name or phone search" },
                        hasDebtOnly = new { type = "BOOLEAN", description = "True to only show customers with outstanding debt" }
                    }
                }
            },
            new
            {
                name = "query_suppliers_and_payables",
                description = "Query suppliers and outstanding debt that the business owes to suppliers.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        search = new { type = "STRING", description = "Supplier name or phone search" },
                        hasDebtOnly = new { type = "BOOLEAN", description = "True to only show suppliers owed money" }
                    }
                }
            },
            new
            {
                name = "query_sales_history",
                description = "Query sales invoices, recent transactions, and payment statuses.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        search = new { type = "STRING", description = "Customer name, product, or sale number" }
                    }
                }
            },
            new
            {
                name = "query_expenses_history",
                description = "Query store operating expenses (rent, utilities, transport, supplies, wages).",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        category = new { type = "STRING", description = "Category filter" },
                        search = new { type = "STRING", description = "Description search" }
                    }
                }
            },
            new
            {
                name = "query_purchases_history",
                description = "Query purchases and inventory orders from suppliers, including amounts and payment status.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        search = new { type = "STRING", description = "Supplier name, purchase number, or product description" }
                    }
                }
            },
            new
            {
                name = "query_stock_adjustments",
                description = "Query historical stock adjustments, shrinkage, damages, spoiled items, and inventory corrections.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new { }
                }
            },
            new
            {
                name = "propose_transaction",
                description = "Propose and prepare a financial or operational transaction (recording sale, purchase, expense, customer debt payment, supplier payment, creating product/customer/supplier) for human-in-the-loop review and approval.",
                parameters = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        instruction = new { type = "STRING", description = "Exact natural language action to record, e.g. 'Bán 5kg gạo cho anh Nam giá 100k' or 'Chi 300k tiền điện' or 'Anh Nam vừa trả 2 triệu'" }
                    },
                    required = new[] { "instruction" }
                }
            }
        };
    }

    #endregion

    #region Resilient Local Agent Engine

    private async Task<AgentTurnResult> RunLocalAgentAsync(
        Guid tenantId,
        Guid userId,
        string userRole,
        Tenant tenant,
        string currency,
        string prompt,
        AiUiContext? uiContext,
        CancellationToken ct)
    {
        var lower = prompt.ToLowerInvariant();
        var toolCalls = new List<AiAgentToolCallInfo>();

        // 1. Check if user wants to record or execute an action
        if (LooksLikeBusinessAction(lower))
        {
            var propResult = await _actionService.ProposeAsync(
                tenantId, userId, new AiProposeActionRequest(prompt, uiContext), userRole, ct);

            if (propResult.Success && propResult.Data != null)
            {
                var p = propResult.Data;
                var isClarification = p.Status == AiActionStatuses.NeedsClarification || p.ActionId == null;
                var isVi = IsVietnamese(prompt);

                if (isClarification)
                {
                    toolCalls.Add(new AiAgentToolCallInfo("prepare_action", isVi ? $"Cần thêm thông tin: {p.Summary}" : $"Need info: {p.Summary}", p));
                    var question = isVi
                        ? $"{p.Summary}\n\nBạn vui lòng cho biết thêm thông tin (ví dụ: tên, giá bán, hoặc đơn vị tính) bằng cách nhập trực tiếp vào thẻ hoặc gửi tin nhắn để tôi chuẩn bị thao tác."
                        : $"{p.Summary}\n\nPlease provide the missing details (e.g. name, price, or unit) in the card or chat so I can prepare the action for you.";

                    return new AgentTurnResult(question, p, toolCalls);
                }

                toolCalls.Add(new AiAgentToolCallInfo("prepare_action", isVi ? $"Chuẩn bị: {p.Summary}" : $"Prepared: {p.Summary}", p));
                var confirmMsg = isVi
                    ? $"Tôi đã chuẩn bị thao tác: **{p.Summary}**.\n\nVui lòng kiểm tra chi tiết trên thẻ bên dưới rồi xác nhận để hoàn tất."
                    : $"I've prepared this action: **{p.Summary}**.\n\nPlease review the details in the card below, then confirm to complete it.";

                return new AgentTurnResult(confirmMsg, p, toolCalls);
            }
        }

        // 2. Check for inventory / stock queries
        if (Regex.IsMatch(lower, @"(tồn kho|hết hàng|sắp hết|kho|sản phẩm|mặt hàng|stock|inventory|product)"))
        {
            var isLowStock = Regex.IsMatch(lower, @"(sắp hết|hết hàng|thiếu|low|out of stock|cần nhập)");
            var prods = (await _businessService.GetProductsAsync(tenantId, "", true)).Data ?? new();
            if (isLowStock) prods = prods.Where(p => p.StockQuantity <= (p.MinStockLevel ?? 0)).ToList();

            toolCalls.Add(new AiAgentToolCallInfo("query_inventory_and_products", $"Kiểm tra tồn kho ({prods.Count} mặt hàng)", prods));

            if (prods.Count == 0)
            {
                return new AgentTurnResult(
                    isLowStock
                        ? "Hiện tại tất cả mặt hàng đều đảm bảo mức tồn kho tối thiểu, không có sản phẩm nào sắp hết hàng."
                        : "Chưa có sản phẩm nào trong sổ hàng hóa của bạn.",
                    null, toolCalls);
            }

            var sb = new StringBuilder();
            sb.AppendLine(isLowStock
                ? $"Có **{prods.Count}** mặt hàng đang ở mức báo động hoặc hết hàng:"
                : $"Tình hình hàng hoá hiện tại (hiển thị tối đa 5 mặt hàng):");

            foreach (var p in prods.Take(5))
            {
                var status = p.StockQuantity <= 0 ? "⚠️ Hết hàng" : (p.MinStockLevel.HasValue && p.StockQuantity <= p.MinStockLevel ? "⚠️ Sắp hết" : "✅ Còn hàng");
                sb.AppendLine($"- **{p.Name}**: {p.StockQuantity:N0} {p.Unit} (Tối thiểu: {p.MinStockLevel ?? 0:N0}) — Giá bán: {p.DefaultPrice:N0} {currency} ({status})");
            }

            return new AgentTurnResult(sb.ToString(), null, toolCalls);
        }

        // 3. Check for customer debt queries
        if (Regex.IsMatch(lower, @"(nợ|ai nợ|công nợ|phải thu|debt|owe|customer.*debt|unpaid)"))
        {
            var allCusts = (await _businessService.GetCustomersAsync(tenantId, "", null)).Data ?? new();
            var custs = allCusts.Where(c => c.OutstandingBalance > 0).ToList();
            toolCalls.Add(new AiAgentToolCallInfo("query_customers_and_debt", $"Kiểm tra công nợ khách hàng ({custs.Count} khách nợ)", custs));

            if (custs.Count == 0)
            {
                return new AgentTurnResult("Tuyệt vời! Hiện tại không có khách hàng nào đang nợ tiền cửa hàng.", null, toolCalls);
            }

            var totalDebt = custs.Sum(c => c.OutstandingBalance);
            var sb = new StringBuilder();
            sb.AppendLine($"Tổng công nợ khách hàng hiện tại là **{totalDebt:N0} {currency}** trên **{custs.Count}** khách hàng:");
            foreach (var c in custs.Take(5))
            {
                sb.AppendLine($"- **{c.Name}**: nợ **{c.OutstandingBalance:N0} {currency}** {(string.IsNullOrWhiteSpace(c.Phone) ? "" : $"(SĐT: {c.Phone})")}");
            }
            return new AgentTurnResult(sb.ToString(), null, toolCalls);
        }

        // 4. Default: Business Overview
        var dash = (await _businessService.GetDashboardAsync(tenantId, "today")).Data;
        toolCalls.Add(new AiAgentToolCallInfo("get_business_overview", "Lấy số liệu tổng quan kinh doanh hôm nay", dash));

        var overviewText = $@"Tình hình kinh doanh hôm nay tại **{tenant.CompanyName ?? "Cửa hàng"}**:
- Doanh thu bán hàng: **{(dash?.TodaySales ?? 0):N0} {currency}**
- Tiền mặt thực thu: **{(dash?.TodayPayments ?? 0):N0} {currency}**
- Tổng chi phí: **{(dash?.TodayExpenses ?? 0):N0} {currency}**
- Lợi nhuận ước tính: **{(dash?.PeriodNetProfit ?? 0):N0} {currency}**
- Khách đang nợ: **{(dash?.OutstandingCustomers ?? 0):N0} {currency}**
- Nợ nhà cung cấp: **{(dash?.OutstandingSuppliers ?? 0):N0} {currency}**

Bạn có thể yêu cầu tôi kiểm tra kho hàng, theo dõi công nợ, hoặc nhập đơn bán/khoản chi bằng cách nhắn trực tiếp!";

        return new AgentTurnResult(overviewText, null, toolCalls);
    }

    private static bool LooksLikeBusinessAction(string lower)
    {
        if (Regex.IsMatch(lower, @"(vừa trả|trả nợ|thanh toán|paid|repaid|ghi|record|bán cho|sold|chi\s|spent|mua từ|nhập hàng|purchase|tạo|create|thêm|add|sửa|update|edit|xóa|delete|hủy|void)"))
            return true;

        // Natural retail shorthand: "[customer] bought 1kg [product]". Requiring
        // a quantity keeps ordinary questions such as "what did customers buy?"
        // on the read-only chat path. "bougt" covers a common mobile typo.
        return Regex.IsMatch(lower, @"\b(bought|bougt|purchased)\b.*\b\d+(?:[.,]\d+)?\s*(kg|kilograms?|g|grams?|bags?|packs?|boxes?|bottles?|pcs?|pieces?|items?|cái|món|bao|gói|hộp|chai)\b");
    }

    private static AgentTurnResult? TryRecoverMissingProductClarification(
        List<AiConversationMessage> history,
        string currentPrompt,
        string currency)
    {
        if (LooksLikeBusinessAction(currentPrompt.ToLowerInvariant()) || history.Count < 3)
            return null;

        var previousAssistant = history.Take(history.Count - 1).LastOrDefault(message => message.Role == "assistant");
        if (previousAssistant == null ||
            !(previousAssistant.Content.Contains("couldn't match an active product", StringComparison.OrdinalIgnoreCase) ||
              previousAssistant.Content.Contains("not in your product catalog", StringComparison.OrdinalIgnoreCase)))
            return null;

        var productName = Regex.Replace(currentPrompt.Trim(),
            @"^\d+(?:[.,]\d+)?\s*(?:(?:kg|kilograms?|g|grams?|liters?|litres?|l)\s*)?(?:(?:bags?|packs?|boxes?|bottles?)\s+of\s+|of\s+)?",
            "", RegexOptions.IgnoreCase).Trim(' ', ',', '.', ':', ';', '\'', '"');
        if (string.IsNullOrWhiteSpace(productName) || !Regex.IsMatch(productName, @"[\p{L}]"))
            return null;

        var unitMatch = Regex.Match(currentPrompt,
            @"\d+(?:[.,]\d+)?\s*(kg|kilograms?|g|grams?|liters?|litres?|l|bags?|packs?|boxes?|bottles?|pcs?|pieces?|items?)\b",
            RegexOptions.IgnoreCase);
        var unit = unitMatch.Success ? unitMatch.Groups[1].Value : "item";
        var pendingSale = history.Take(history.Count - 1)
            .LastOrDefault(message => message.Role == "user" &&
                Regex.IsMatch(message.Content, @"\b(bought|bougt|purchased|sold|bán)\b", RegexOptions.IgnoreCase))?.Content;

        var proposal = new AiActionProposalResponse(
            null,
            "create_product",
            AiActionStatuses.NeedsClarification,
            "Low",
            false,
            $"{productName} is not in your product catalog yet. Add its selling price first, then Tenvora can prepare the sale.",
            new Dictionary<string, string?>
            {
                ["Product"] = productName,
                ["Unit"] = unit,
                ["Default price"] = $"0 {currency}",
                ["Price required"] = "true",
                ["Pending sale"] = pendingSale
            });
        var tools = new List<AiAgentToolCallInfo>
        {
            new("prepare_product", $"Prepare missing product: {productName}", proposal)
        };
        return new AgentTurnResult(
            $"I kept the pending sale. **{productName}** is not a saved product yet, so complete the product card below with its selling price first.",
            proposal,
            tools);
    }

    #endregion

    private static AiActionProposalResponse MapActionToProposal(AiAction action)
    {
        var expired = action.Status == AiActionStatuses.PendingConfirmation && action.ExpiresAt <= DateTime.UtcNow;
        var status = expired ? AiActionStatuses.Expired : action.Status;
        var details = new Dictionary<string, string?>();
        string? resultMessage = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(action.PayloadJson))
            {
                var doc = JsonDocument.Parse(action.PayloadJson);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    details[prop.Name] = prop.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
                        ? null
                        : prop.Value.ToString();
                }
            }
            if (!string.IsNullOrWhiteSpace(action.ResultJson))
            {
                var result = JsonDocument.Parse(action.ResultJson);
                if (result.RootElement.TryGetProperty("message", out var message))
                    resultMessage = message.GetString();
                else if (result.RootElement.TryGetProperty("error", out var error))
                    resultMessage = error.GetString();
            }
        }
        catch { }

        if (!string.IsNullOrWhiteSpace(resultMessage)) details["Result"] = resultMessage;

        return new AiActionProposalResponse(
            action.Id,
            action.Intent,
            status,
            action.RiskLevel,
            !expired && action.RequiresConfirmation,
            resultMessage ?? action.SourceText,
            details,
            null,
            action.ExpiresAt
        );
    }

    private static bool IsVietnamese(string text)
    {
        return Regex.IsMatch(text, "[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]")
            || Regex.IsMatch(text, @"\b(hom nay|ban duoc|doanh thu|ai no|tien no|chi tieu|cua hang|toi|giup|tao|them|san pham|don ban|kho|ton kho)\b", RegexOptions.IgnoreCase);
    }
}

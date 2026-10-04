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
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;

namespace Tenvora.Api.Services;

public class AiAssistantService : IAiAssistantService
{
    private readonly AppDbContext _context;
    private readonly IBusinessService _businessService;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiAssistantService> _logger;

    public AiAssistantService(
        AppDbContext context,
        IBusinessService businessService,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<AiAssistantService> logger)
    {
        _context = context;
        _businessService = businessService;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ApiResult<AiChatResponse>> ChatAsync(Guid tenantId, string message, AiUiContext? uiContext = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return ApiResult<AiChatResponse>.Fail("Message cannot be empty.");
        }

        var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        var dashResult = await _businessService.GetDashboardAsync(tenantId);
        var dash = dashResult.Data;
        var currency = tenant?.BaseCurrency ?? "VND";
        BusinessCustomerDetailDto? contextualCustomer = null;
        SupplierDetailDto? contextualSupplier = null;
        if (uiContext?.Entity?.Equals("customer", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var customerResult = await _businessService.GetCustomerAsync(tenantId, uiContext.EntityId.Value);
            contextualCustomer = customerResult.Data;
        }
        if (uiContext?.Entity?.Equals("supplier", StringComparison.OrdinalIgnoreCase) == true && uiContext.EntityId.HasValue)
        {
            var supplierResult = await _businessService.GetSupplierAsync(tenantId, uiContext.EntityId.Value);
            contextualSupplier = supplierResult.Data;
        }

        var deterministicRead = await TryGenerateGroundedReadAsync(tenantId, message, currency, dash, contextualCustomer, contextualSupplier);
        if (deterministicRead != null)
            return ApiResult<AiChatResponse>.Ok(new AiChatResponse(deterministicRead, "Tenvora", "application-tools", true));

        var apiKey = _config["AI_PROVIDER_API_KEY"] ?? _config["AiProvider:ApiKey"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY") ?? Environment.GetEnvironmentVariable("AiProvider__ApiKey");
        var endpoint = _config["AI_PROVIDER_ENDPOINT"] ?? _config["AiProvider:Endpoint"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_ENDPOINT") ?? Environment.GetEnvironmentVariable("AiProvider__Endpoint") ?? "https://generativelanguage.googleapis.com/v1beta/models";
        var model = _config["AI_CHAT_MODEL"] ?? _config["AiProvider:ChatModel"] ?? Environment.GetEnvironmentVariable("AI_CHAT_MODEL") ?? Environment.GetEnvironmentVariable("AiProvider__ChatModel") ?? "gemini-flash-latest";

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var unpaidSummary = dash != null && dash.UnpaidCustomers.Count > 0
                    ? string.Join(", ", dash.UnpaidCustomers.Take(5).Select(c => $"{c.Name}: {c.OutstandingBalance:N0} {currency}"))
                    : "No customers currently owe money.";

                var systemPrompt = $@"You are Tenvora AI, a concise business-record assistant for small businesses.
Keep answers brief (2-4 sentences or clear bullet points), direct, professional, and free of unnecessary accounting jargon.
Do not assume the user's age or relationship, and do not use patronizing forms of address.
Strictly ground your facts in the real store data below:
- Store Name: {tenant?.CompanyName ?? "Cửa hàng"}
- Business Type: {tenant?.BusinessType ?? "Bán lẻ"}
- Currency: {currency}
- Today's Sales: {(dash?.TodaySales ?? 0):N0} {currency}
- Today's Cash Collected: {(dash?.TodayPayments ?? 0):N0} {currency}
- Today's Expenses: {(dash?.TodayExpenses ?? 0):N0} {currency}
- Total Customer Debt: {(dash?.OutstandingCustomers ?? 0):N0} {currency}
- Top Unpaid Customers: {unpaidSummary}
- Total Debt to Suppliers: {(dash?.OutstandingSuppliers ?? 0):N0} {currency}
{(contextualCustomer == null ? "" : $"- Current customer: {contextualCustomer.Customer.Name}\n- Current customer balance: {contextualCustomer.Customer.OutstandingBalance:N0} {currency}")}
{(contextualSupplier == null ? "" : $"- Current supplier: {contextualSupplier.Supplier.Name}\n- Current supplier payable: {contextualSupplier.Supplier.OutstandingBalance:N0} {currency}")}

If the user writes in Vietnamese, answer in polite, natural Vietnamese. If the user writes in English, answer in polite, clear English.";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = $"{systemPrompt}\n\nUser: {message}" }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.2
                    }
                };

                var url = $"{endpoint.TrimEnd('/')}/{model}:generateContent?key={apiKey}";
                var response = await client.PostAsJsonAsync(url, requestBody, ct);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
                    if (responseJson.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts))
                    {
                        string? replyText = null;
                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var textEl))
                            {
                                replyText = textEl.GetString();
                                break;
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(replyText))
                        {
                            return ApiResult<AiChatResponse>.Ok(new AiChatResponse(replyText.Trim(), "Google Gemini", model, false));
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("Gemini API call failed with status code {StatusCode}", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini API call threw exception; falling back to local business responder.");
            }
        }

        // Local Resilient Grounded Fallback
        var localReply = GenerateLocalChatResponse(message, tenant, dash, currency, contextualCustomer);
        return ApiResult<AiChatResponse>.Ok(new AiChatResponse(localReply, "Tenvora Local AI", "rule-grounded-engine", true));
    }

    public async Task<ApiResult<AiParseRecordResponse>> ParseRecordAsync(Guid tenantId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return ApiResult<AiParseRecordResponse>.Fail("Text cannot be empty.");
        }

        var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        var currency = tenant?.BaseCurrency ?? "VND";

        var apiKey = _config["AI_PROVIDER_API_KEY"] ?? _config["AiProvider:ApiKey"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY") ?? Environment.GetEnvironmentVariable("AiProvider__ApiKey");
        var endpoint = _config["AI_PROVIDER_ENDPOINT"] ?? _config["AiProvider:Endpoint"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_ENDPOINT") ?? Environment.GetEnvironmentVariable("AiProvider__Endpoint") ?? "https://generativelanguage.googleapis.com/v1beta/models";
        var model = _config["AI_CHAT_MODEL"] ?? _config["AiProvider:ChatModel"] ?? Environment.GetEnvironmentVariable("AI_CHAT_MODEL") ?? Environment.GetEnvironmentVariable("AiProvider__ChatModel") ?? "gemini-flash-latest";

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var prompt = $@"You are a smart business transaction extractor for a small store notebook.
The user is typing a transaction note in natural language (Vietnamese or English).
Currency: {currency}.

Extract into a JSON object with this exact schema:
{{
  ""intent"": ""sale"" | ""expense"" | ""debt_payment"" | ""unknown"",
  ""confidence"": 0.95,
  ""summary"": ""Short human-friendly sentence summarizing what happened in the user's language"",
  ""customerName"": ""Name of the customer or null"",
  ""totalAmount"": 120000,
  ""paidAmount"": 70000,
  ""description"": ""Item or purpose description or null"",
  ""category"": ""Utilities / Rent / Supplies / Operations / Other""
}}

Rules:
- If someone bought items or goods, intent is 'sale'.
- If customer took items on credit / owes money ('nợ', 'chưa trả', 'ghi sổ', 'on credit'), totalAmount is the total value of items, and paidAmount is (totalAmount - debt).
- If money was spent for store operating costs ('chi', 'mua đá', 'tiền điện', 'đổ xăng', 'spent'), intent is 'expense'.
- If a customer paid back previous debt ('trả nợ', 'trả tiền nợ', 'repaid debt'), intent is 'debt_payment' and totalAmount is the repayment amount.
- Understand 'k', 'ngàn', 'nghìn', 'đ' as thousands (e.g. 50k = 50000). Understand 'tr', 'triệu' as millions (e.g. 1tr5 = 1500000).

Input text: ""{text}""
Output JSON only.";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var requestBody = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    },
                    generationConfig = new
                    {
                        responseMimeType = "application/json",
                        temperature = 0.1
                    }
                };

                var url = $"{endpoint.TrimEnd('/')}/{model}:generateContent?key={apiKey}";
                var response = await client.PostAsJsonAsync(url, requestBody, ct);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
                    if (responseJson.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts))
                    {
                        string? rawJson = null;
                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var textEl))
                            {
                                rawJson = textEl.GetString();
                                break;
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(rawJson))
                        {
                            var parsed = ParseGeminiJsonResult(rawJson, currency);
                            if (parsed != null)
                            {
                                return ApiResult<AiParseRecordResponse>.Ok(parsed);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini record parsing failed; falling back to local regex/rule parser.");
            }
        }

        // Local Resilient Fallback Parser
        var fallbackParsed = ParseRecordLocally(text, currency);
        return ApiResult<AiParseRecordResponse>.Ok(fallbackParsed);
    }

    public async Task<ApiResult<AiInterpretedAction>> InterpretActionAsync(
        Guid tenantId, string text, AiUiContext? uiContext = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return ApiResult<AiInterpretedAction>.Fail("Message cannot be empty.");

        var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        var currency = tenant?.BaseCurrency ?? "VND";
        var lower = text.Trim().ToLowerInvariant();
        var contextEntity = uiContext?.Entity?.ToLowerInvariant();
        var isCreate = Regex.IsMatch(lower, @"\b(create|add|new|tạo|thêm)\b");
        var isUpdate = Regex.IsMatch(lower, @"\b(change|update|edit|set|đổi|sửa|cập nhật)\b");
        var isArchive = Regex.IsMatch(lower, @"\b(delete|remove|archive|deactivate|xóa|xoá|lưu trữ|ngừng)\b");
        var isCancel = Regex.IsMatch(lower, @"\b(cancel|void|hủy|huỷ)\b");

        if (isCancel && (contextEntity == "sale" || Regex.IsMatch(lower, @"\b(sale|invoice|đơn bán|giao dịch bán)\b")))
            return ApiResult<AiInterpretedAction>.Ok(new("void_sale", 0.98m));
        if (isCancel && (contextEntity == "purchase" || Regex.IsMatch(lower, @"\b(purchase|đơn nhập|phiếu nhập|nhập hàng)\b")))
            return ApiResult<AiInterpretedAction>.Ok(new("void_purchase", 0.98m));

        var markPaidInFull = Regex.IsMatch(lower,
            @"\b(mark|set|đánh dấu).*(paid|đã trả|đã thanh toán)|\b(paid in full|fully paid|trả đủ|thanh toán đủ)\b");
        if (markPaidInFull && contextEntity == "sale")
            return ApiResult<AiInterpretedAction>.Ok(new("debt_payment", 0.98m, Status: "Full"));
        if (markPaidInFull && contextEntity == "purchase")
            return ApiResult<AiInterpretedAction>.Ok(new("supplier_payment", 0.98m, Status: "Full"));

        if (Regex.IsMatch(lower, @"\b(currency|tiền tệ)\b") && (isUpdate || lower.Contains(" to ") || lower.Contains(" thành ")))
        {
            var code = Regex.Match(text.ToUpperInvariant(), @"\b[A-Z]{3}\b").Value;
            return ApiResult<AiInterpretedAction>.Ok(new("update_settings", 0.96m, Currency: string.IsNullOrWhiteSpace(code) ? null : code));
        }

        var customerMentioned = contextEntity == "customer" || Regex.IsMatch(lower, @"\b(customer|client|khách|khách hàng)\b");
        var productMentioned = contextEntity == "product" || Regex.IsMatch(lower, @"\b(product|item|service|sản phẩm|hàng hóa|hàng hoá)\b");
        var supplierMentioned = contextEntity == "supplier" || Regex.IsMatch(lower, @"\b(supplier|vendor|nhà cung cấp)\b");

        if (isCreate && customerMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("create_customer", 0.96m,
                EntityName: ExtractCreatedName(text, "customer|client|khách hàng|khách", contextEntity == "customer"),
                Phone: ExtractPhone(text), Email: ExtractEmail(text), Address: ExtractLabeledValue(text, "address|địa chỉ"), Notes: text));
        if (isCreate && productMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("create_product", 0.96m,
                EntityName: ExtractCreatedName(text, "product|item|service|sản phẩm|hàng hóa|hàng hoá", contextEntity == "product"),
                Amount: ExtractProductPrice(text, currency), Unit: ExtractUnit(text), Notes: text));
        if (isCreate && supplierMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("create_supplier", 0.96m,
                EntityName: ExtractCreatedName(text, "supplier|vendor|nhà cung cấp", contextEntity == "supplier"),
                Phone: ExtractPhone(text), Email: ExtractEmail(text), Address: ExtractLabeledValue(text, "address|địa chỉ"), Notes: text));

        if (isArchive && customerMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("archive_customer", 0.96m, EntityName: ExtractTargetName(text, "customer|client|khách hàng|khách")));
        if (isArchive && productMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("archive_product", 0.96m, EntityName: ExtractTargetName(text, "product|item|service|sản phẩm|hàng hóa|hàng hoá")));
        if (isArchive && supplierMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("archive_supplier", 0.96m, EntityName: ExtractTargetName(text, "supplier|vendor|nhà cung cấp")));

        if (isUpdate && customerMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("update_customer", 0.93m,
                EntityName: ExtractTargetName(text, "customer|client|khách hàng|khách"), Phone: ExtractPhone(text),
                Email: ExtractEmail(text), Address: ExtractLabeledValue(text, "address|địa chỉ"), Notes: text));
        if (isUpdate && productMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("update_product", 0.93m,
                EntityName: ExtractTargetName(text, "product|item|service|sản phẩm|hàng hóa|hàng hoá"),
                Amount: ExtractProductPrice(text, currency), Unit: ExtractUnit(text), Notes: text));
        if (isUpdate && supplierMentioned)
            return ApiResult<AiInterpretedAction>.Ok(new("update_supplier", 0.93m,
                EntityName: ExtractTargetName(text, "supplier|vendor|nhà cung cấp"), Phone: ExtractPhone(text),
                Email: ExtractEmail(text), Address: ExtractLabeledValue(text, "address|địa chỉ"), Notes: text));

        var supplierPayment = Regex.IsMatch(lower, @"(paid|pay|trả|thanh toán).*(supplier|vendor|nhà cung cấp)|(supplier|vendor|nhà cung cấp).*(paid|pay|trả|thanh toán)");
        if (supplierPayment)
            return ApiResult<AiInterpretedAction>.Ok(new("supplier_payment", 0.94m,
                SupplierName: ExtractTargetName(text, "supplier|vendor|nhà cung cấp"), Amount: ExtractAmount(lower, currency), Notes: text));

        // In a retail workspace, "Cong Huynh bought 1kg coffee" describes a sale to
        // the named customer. Keep this ahead of purchase/expense parsing so the
        // quantity is not mistaken for a monetary amount by the generic parser.
        var customerBoughtProduct = Regex.IsMatch(lower, @"\b(bought(?:/bougt)?|bougt|purchased)\b") &&
                                    Regex.IsMatch(lower, @"\b\d+(?:[.,]\d+)?\s*(kg|kilograms?|g|grams?|bags?|packs?|boxes?|bottles?|pcs?|pieces?|items?|cái|món|bao|gói|hộp|chai)\b") &&
                                    !Regex.IsMatch(lower, @"\b(i|we|shop|store|business|company)\s+(bought|bougt|purchased)\b") &&
                                    !Regex.IsMatch(lower, @"\b(stock|inventory|supplier|vendor|wholesale|for the shop|for the store)\b");
        if (customerBoughtProduct)
            return ApiResult<AiInterpretedAction>.Ok(new("sale", 0.95m,
                ProductName: ExtractPurchasedProductName(text), Quantity: ExtractQuantityValue(text),
                Unit: ExtractUnit(text), Notes: text));

        var purchase = Regex.IsMatch(lower, @"\b(purchase|bought stock|nhập hàng|mua từ|mua của)\b");
        if (purchase)
        {
            var total = ExtractAmount(lower, currency);
            var paid = Regex.IsMatch(lower, @"\b(mark it paid|paid in full|đã trả|trả đủ|thanh toán đủ)\b") ? total : 0m;
            return ApiResult<AiInterpretedAction>.Ok(new("purchase", 0.92m,
                SupplierName: ExtractTargetName(text, "supplier|vendor|nhà cung cấp|từ|của"),
                ProductName: null, Amount: total, PaidAmount: paid, Quantity: ExtractQuantityValue(text),
                UnitPrice: total, Unit: ExtractUnit(text), Notes: text));
        }

        var financial = await ParseRecordAsync(tenantId, text, ct);
        if (!financial.Success || financial.Data == null)
            return ApiResult<AiInterpretedAction>.Fail(financial.Message);
        var parsed = financial.Data;
        return parsed.Intent switch
        {
            "sale" when parsed.Sale != null => BuildSaleAction(parsed, text, currency),
            "expense" when parsed.Expense != null => ApiResult<AiInterpretedAction>.Ok(new("expense", parsed.Confidence,
                Amount: parsed.Expense.Amount, Category: parsed.Expense.Category, Notes: parsed.Expense.Description)),
            "debt_payment" when parsed.DebtPayment != null => ApiResult<AiInterpretedAction>.Ok(new("debt_payment", parsed.Confidence,
                CustomerName: parsed.DebtPayment.CustomerName, Amount: parsed.DebtPayment.Amount, Notes: parsed.DebtPayment.Notes)),
            _ => ApiResult<AiInterpretedAction>.Ok(new("unknown", parsed.Confidence))
        };
    }

    private static ApiResult<AiInterpretedAction> BuildSaleAction(AiParseRecordResponse parsed, string text, string currency)
    {
        var sale = parsed.Sale!;
        var quantity = sale.Items?.FirstOrDefault()?.Quantity ?? ExtractQuantityValue(text);
        if (quantity <= 0) quantity = 1m;
        var explicitUnitPrice = sale.Items?.FirstOrDefault()?.UnitPrice ?? ExtractPerUnitPrice(text, currency);
        var total = explicitUnitPrice > 0 ? decimal.Round(quantity * explicitUnitPrice, 4) : sale.TotalAmount;
        var unpaid = Regex.IsMatch(text,
            @"\b(unpaid|not paid|hasn't paid|has not paid|chưa trả|chưa thanh toán|ghi nợ)\b", RegexOptions.IgnoreCase);
        var paid = unpaid ? 0m : explicitUnitPrice > 0 && sale.PaidAmount == sale.TotalAmount ? total : sale.PaidAmount;
        return ApiResult<AiInterpretedAction>.Ok(new("sale", parsed.Confidence,
            CustomerName: sale.CustomerName, ProductName: sale.Items?.FirstOrDefault()?.ProductName,
            Amount: total, PaidAmount: Math.Min(paid, total), Quantity: quantity,
            UnitPrice: explicitUnitPrice, Unit: ExtractUnit(text), Notes: sale.Description));
    }


    private static string GenerateLocalChatResponse(string message, Tenant? tenant, BusinessDashboardDto? dash, string currency, BusinessCustomerDetailDto? contextualCustomer)
    {
        var lower = message.ToLowerInvariant();
        var isVietnamese = IsLikelyVietnamese(lower);
        var businessName = tenant?.CompanyName ?? (isVietnamese ? "doanh nghiệp" : "the business");
        var todaySales = dash?.TodaySales ?? 0m;
        var todayPayments = dash?.TodayPayments ?? 0m;
        var todayExpenses = dash?.TodayExpenses ?? 0m;
        var outstandingDebt = dash?.OutstandingCustomers ?? 0m;

        if (contextualCustomer != null && Regex.IsMatch(lower, @"\b(nợ|còn nợ|số dư|balance|owe|owes|unpaid|he|she|his|her|anh ấy|chị ấy)\b"))
        {
            return isVietnamese
                ? $"{contextualCustomer.Customer.Name} hiện còn nợ {contextualCustomer.Customer.OutstandingBalance:N0} {currency}."
                : $"{contextualCustomer.Customer.Name} currently owes {contextualCustomer.Customer.OutstandingBalance:N0} {currency}.";
        }

        // Greetings
        if (Regex.IsMatch(lower, @"\b(chào|hello|hi|ơi|bạn là ai|who are you|bạn làm được gì|trợ giúp|help)\b"))
        {
            return isVietnamese
                ? $"Xin chào! Tôi là trợ lý Tenvora của {businessName}. Tôi có thể kiểm tra doanh thu, công nợ và chi phí, hoặc giúp bạn ghi nhanh một giao dịch."
                : $"Hello! I'm the Tenvora assistant for {businessName}. I can check revenue, balances, and expenses, or help you record a transaction.";
        }

        // Today's Sales
        if (Regex.IsMatch(lower, @"\b(bán được|doanh thu|hôm nay|today|sales|revenue|bán ra)\b"))
        {
            return isVietnamese
                ? $"Hôm nay:\n- Doanh thu: {todaySales:N0} {currency}\n- Tiền đã thu: {todayPayments:N0} {currency}\n- Chi phí: {todayExpenses:N0} {currency}"
                : $"Today:\n- Revenue: {todaySales:N0} {currency}\n- Payments received: {todayPayments:N0} {currency}\n- Expenses: {todayExpenses:N0} {currency}";
        }

        // Debts / Who owes
        if (Regex.IsMatch(lower, @"\b(nợ|ai nợ|tiền nợ|còn nợ|chưa trả|debt|owes|unpaid)\b"))
        {
            if (dash != null && dash.UnpaidCustomers.Count > 0)
            {
                var sb = new StringBuilder();
                sb.AppendLine(isVietnamese
                    ? $"Có {dash.UnpaidCustomers.Count} khách hàng còn nợ tổng cộng {outstandingDebt:N0} {currency}:"
                    : $"{dash.UnpaidCustomers.Count} customers owe a total of {outstandingDebt:N0} {currency}:");
                foreach (var cust in dash.UnpaidCustomers.Take(5))
                {
                    sb.AppendLine($"- {cust.Name}: {cust.OutstandingBalance:N0} {currency}");
                }
                return sb.ToString().TrimEnd();
            }

            return isVietnamese ? "Hiện không có khách hàng nào còn nợ." : "No customers currently have an outstanding balance.";
        }

        // Expenses
        if (Regex.IsMatch(lower, @"\b(chi|chi tiêu|tổng chi|mua đồ|expense|expenses)\b"))
        {
            return isVietnamese
                ? $"Tổng chi phí hôm nay là {todayExpenses:N0} {currency}."
                : $"Today's total expenses are {todayExpenses:N0} {currency}.";
        }

        // General fallback
        return isVietnamese
            ? $"Doanh thu hôm nay là {todaySales:N0} {currency}; công nợ khách hàng là {outstandingDebt:N0} {currency}. Bạn có thể hỏi về doanh thu, công nợ hoặc chi phí."
            : $"Today's revenue is {todaySales:N0} {currency}; customer balances total {outstandingDebt:N0} {currency}. You can ask about revenue, balances, or expenses.";
    }

    private async Task<string?> TryGenerateGroundedReadAsync(
        Guid tenantId, string message, string currency, BusinessDashboardDto? dashboard,
        BusinessCustomerDetailDto? contextualCustomer, SupplierDetailDto? contextualSupplier)
    {
        var lower = message.ToLowerInvariant();
        var vietnamese = IsLikelyVietnamese(lower);
        var now = DateTime.UtcNow;
        var from = lower.Contains("week") || lower.Contains("tuần")
            ? now.Date.AddDays(-(((int)now.DayOfWeek + 6) % 7))
            : lower.Contains("month") || lower.Contains("tháng")
                ? new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                : now.Date;

        if (contextualSupplier != null && Regex.IsMatch(lower, @"\b(owe|owed|payable|balance|outstanding|nợ|phải trả|số dư)\b"))
            return vietnamese
                ? $"Doanh nghiệp hiện còn nợ {contextualSupplier.Supplier.Name} {contextualSupplier.Supplier.OutstandingBalance:N0} {currency}."
                : $"The business currently owes {contextualSupplier.Supplier.Name} {contextualSupplier.Supplier.OutstandingBalance:N0} {currency}.";

        if (Regex.IsMatch(lower, @"\b(supplier|suppliers|vendor|vendors|nhà cung cấp)\b") &&
            Regex.IsMatch(lower, @"\b(owe|owed|payable|balance|outstanding|nợ|phải trả|số dư)\b"))
        {
            if (dashboard == null || dashboard.UnpaidSuppliers.Count == 0)
                return vietnamese ? "Hiện không có công nợ nhà cung cấp." : "There are no outstanding supplier balances.";
            var rows = string.Join("\n", dashboard.UnpaidSuppliers.Select(s => $"- {s.Name}: {s.OutstandingBalance:N0} {currency}"));
            return vietnamese
                ? $"Công nợ nhà cung cấp:\n{rows}\nTổng phải trả: {dashboard.OutstandingSuppliers:N0} {currency}."
                : $"Outstanding supplier balances:\n{rows}\nTotal payable: {dashboard.OutstandingSuppliers:N0} {currency}.";
        }

        if (Regex.IsMatch(lower, @"\b(owe|owes|balance|outstanding|nợ|công nợ|số dư)\b"))
        {
            if (contextualCustomer != null)
                return vietnamese
                    ? $"{contextualCustomer.Customer.Name} hiện còn nợ {contextualCustomer.Customer.OutstandingBalance:N0} {currency}."
                    : $"{contextualCustomer.Customer.Name} currently owes {contextualCustomer.Customer.OutstandingBalance:N0} {currency}.";

            var customers = await _businessService.GetCustomersAsync(tenantId, null, "Active");
            var mentioned = customers.Data?.Where(c => SearchContainsEntity(lower, c.Name)).ToList() ?? [];
            if (mentioned.Count == 1)
                return vietnamese
                    ? $"{mentioned[0].Name} hiện còn nợ {mentioned[0].OutstandingBalance:N0} {currency}."
                    : $"{mentioned[0].Name} currently owes {mentioned[0].OutstandingBalance:N0} {currency}.";

            if (dashboard != null && dashboard.UnpaidCustomers.Count > 0)
            {
                var rows = string.Join("\n", dashboard.UnpaidCustomers.Select(c => $"- {c.Name}: {c.OutstandingBalance:N0} {currency}"));
                return vietnamese
                    ? $"Có {dashboard.UnpaidCustomers.Count} khách hàng cần thu tiền:\n{rows}\nTổng công nợ: {dashboard.OutstandingCustomers:N0} {currency}."
                    : $"{dashboard.UnpaidCustomers.Count} customers have outstanding balances:\n{rows}\nTotal outstanding: {dashboard.OutstandingCustomers:N0} {currency}.";
            }
            return vietnamese ? "Hiện không có khách hàng nào còn nợ." : "No customers currently have an outstanding balance.";
        }

        if (Regex.IsMatch(lower, @"\b(show|everything|related|history|details|xem|tất cả|liên quan|lịch sử|chi tiết)\b"))
        {
            var detail = contextualCustomer;
            if (detail == null)
            {
                var customers = await _businessService.GetCustomersAsync(tenantId, null, null);
                var matches = customers.Data?.Where(c => SearchContainsEntity(lower, c.Name)).ToList() ?? [];
                if (matches.Count == 1)
                    detail = (await _businessService.GetCustomerAsync(tenantId, matches[0].Id)).Data;
            }
            if (detail != null)
            {
                var latest = detail.Sales.OrderByDescending(s => s.SoldAt).FirstOrDefault();
                var latestLine = latest == null ? "" : $"\n- Latest sale: {latest.SaleNumber}, {latest.TotalAmount:N0} {currency}";
                return vietnamese
                    ? $"{detail.Customer.Name}: {detail.Customer.SalesCount} đơn bán, tổng doanh số {detail.Customer.TotalSales:N0} {currency}, đã thu {detail.Customer.TotalPaid:N0} {currency}, còn nợ {detail.Customer.OutstandingBalance:N0} {currency}.{latestLine}"
                    : $"{detail.Customer.Name}: {detail.Customer.SalesCount} sales, {detail.Customer.TotalSales:N0} {currency} total, {detail.Customer.TotalPaid:N0} {currency} collected, {detail.Customer.OutstandingBalance:N0} {currency} outstanding.{latestLine}";
            }
        }

        if (Regex.IsMatch(lower, @"\b(revenue|sales|sold|doanh thu|bán được|bán hàng)\b"))
        {
            var sales = await _businessService.GetSalesAsync(tenantId, null, null, from, now);
            var posted = sales.Data?.Where(s => s.Status == "Posted").ToList() ?? [];
            var total = posted.Sum(s => s.TotalAmount);
            var paid = posted.Sum(s => s.PaidAmount);
            var period = lower.Contains("week") || lower.Contains("tuần") ? (vietnamese ? "tuần này" : "this week")
                : lower.Contains("month") || lower.Contains("tháng") ? (vietnamese ? "tháng này" : "this month")
                : (vietnamese ? "hôm nay" : "today");
            return vietnamese
                ? $"Doanh thu {period}: {total:N0} {currency} từ {posted.Count} đơn. Đã thu: {paid:N0} {currency}."
                : $"Sales {period}: {total:N0} {currency} across {posted.Count} sales. Collected: {paid:N0} {currency}.";
        }

        if (Regex.IsMatch(lower, @"\b(expense|expenses|spent|spend|chi phí|chi tiêu|đã chi)\b"))
        {
            var expenses = await _businessService.GetBusinessExpensesAsync(tenantId, null, null, from, now);
            var rows = expenses.Data ?? [];
            var categoryRows = rows.Where(e => TextMentionsLabel(lower, e.Category)).ToList();
            if (categoryRows.Count > 0) rows = categoryRows;
            var total = rows.Sum(e => e.Amount);
            if (Regex.IsMatch(lower, @"\b(biggest|largest|lớn nhất|cao nhất)\b"))
            {
                var biggest = rows.OrderByDescending(e => e.Amount).Take(5).ToList();
                if (biggest.Count == 0) return vietnamese ? "Không có khoản chi trong kỳ này." : "There are no expenses in this period.";
                return string.Join("\n", biggest.Select(e => $"- {e.Category}: {e.Amount:N0} {currency} — {e.Description ?? ""}"));
            }
            return vietnamese
                ? $"Tổng chi trong kỳ: {total:N0} {currency} từ {rows.Count} khoản."
                : $"Total expenses for the period: {total:N0} {currency} across {rows.Count} entries.";
        }

        if (Regex.IsMatch(lower, @"\b(purchase|purchases|bought|nhập hàng|mua vào)\b") && !Regex.IsMatch(lower, @"\b(record|create|ghi|tạo)\b"))
        {
            var purchases = await _businessService.GetPurchasesAsync(tenantId, null, null, from, now);
            var posted = purchases.Data?.Where(p => p.Status == "Posted").ToList() ?? [];
            return vietnamese
                ? $"Tổng nhập hàng trong kỳ: {posted.Sum(p => p.TotalAmount):N0} {currency}; còn nợ nhà cung cấp {posted.Sum(p => p.OutstandingBalance):N0} {currency}."
                : $"Purchases for the period total {posted.Sum(p => p.TotalAmount):N0} {currency}; {posted.Sum(p => p.OutstandingBalance):N0} {currency} remains payable.";
        }

        if (Regex.IsMatch(lower, @"\b(transaction|transactions|activity|history|giao dịch|hoạt động|lịch sử)\b") && dashboard != null)
        {
            if (dashboard.RecentActivity.Count == 0) return vietnamese ? "Hôm nay chưa có giao dịch." : "There are no recent transactions.";
            return string.Join("\n", dashboard.RecentActivity.Select(a => $"- {a.Title}: {a.Amount:N0} {currency} — {a.Detail}"));
        }

        if (Regex.IsMatch(lower, @"\b(customer|customers|khách hàng)\b") && Regex.IsMatch(lower, @"\b(find|search|show|tìm|xem)\b"))
        {
            var customers = await _businessService.GetCustomersAsync(tenantId, null, null);
            var matches = customers.Data?.Where(c => SearchContainsEntity(lower, c.Name)).Take(10).ToList() ?? [];
            if (matches.Count == 0) matches = customers.Data?.Take(10).ToList() ?? [];
            return matches.Count == 0
                ? (vietnamese ? "Không tìm thấy khách hàng." : "No customers found.")
                : string.Join("\n", matches.Select(c => $"- {c.Name}: {c.OutstandingBalance:N0} {currency}"));
        }

        if (Regex.IsMatch(lower, @"\b(profit|net profit|margin|lợi nhuận|lãi|lãi lỗ)\b"))
        {
            var periodName = lower.Contains("week") || lower.Contains("tuần") ? "week"
                : lower.Contains("month") || lower.Contains("tháng") ? "month"
                : lower.Contains("year") || lower.Contains("năm") ? "year"
                : "today";
            var dashP = (await _businessService.GetDashboardAsync(tenantId, periodName)).Data;
            if (dashP != null)
            {
                var periodText = periodName switch
                {
                    "week" => vietnamese ? "tuần này" : "this week",
                    "month" => vietnamese ? "tháng này" : "this month",
                    "year" => vietnamese ? "năm nay" : "this year",
                    _ => vietnamese ? "hôm nay" : "today"
                };
                return vietnamese
                    ? $"Lợi nhuận ước tính ({periodText}): {dashP.PeriodNetProfit:N0} {currency}\n- Doanh thu: {dashP.PeriodSales:N0} {currency}\n- Giá vốn hàng bán (COGS): {dashP.PeriodCogs:N0} {currency}\n- Chi phí hoạt động: {dashP.PeriodExpenses:N0} {currency}"
                    : $"Estimated net profit ({periodText}): {dashP.PeriodNetProfit:N0} {currency}\n- Revenue: {dashP.PeriodSales:N0} {currency}\n- Cost of Goods Sold (COGS): {dashP.PeriodCogs:N0} {currency}\n- Operating Expenses: {dashP.PeriodExpenses:N0} {currency}";
            }
        }

        if (Regex.IsMatch(lower, @"\b(adjustment|adjustments|shrinkage|spoilage|damaged|hao hụt|hư hỏng|kiểm kê|điều chỉnh kho)\b"))
        {
            var adjustments = (await _businessService.GetStockAdjustmentsAsync(tenantId, null)).Data ?? [];
            if (adjustments.Count == 0)
                return vietnamese ? "Chưa có phiếu điều chỉnh tồn kho nào." : "There are no stock adjustment records.";
            var recent = adjustments.Take(5).Select(a => $"- {a.ProductName}: {(a.AdjustmentQuantity > 0 ? "+" : "")}{a.AdjustmentQuantity:G29} ({a.Reason}) — Còn: {a.QuantityAfter:G29}");
            return vietnamese
                ? $"Gần đây có {adjustments.Count} lần điều chỉnh tồn kho:\n{string.Join("\n", recent)}"
                : $"Recent {adjustments.Count} stock adjustments:\n{string.Join("\n", recent)}";
        }

        return null;
    }

    private static bool SearchContainsEntity(string normalizedMessage, string entityName)
    {
        var key = entityName.ToLowerInvariant().Trim();
        return key.Length > 1 && normalizedMessage.Contains(key, StringComparison.OrdinalIgnoreCase);
    }

    private static bool TextMentionsLabel(string normalizedMessage, string label)
    {
        var words = Regex.Matches(label.ToLowerInvariant(), @"[\p{L}\p{N}]+")
            .Select(m => m.Value).Where(word => word.Length >= 4).ToList();
        return words.Any(word => normalizedMessage.Contains(word, StringComparison.OrdinalIgnoreCase)
            || normalizedMessage.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Any(token => token.Length >= 5 && word.Length >= 5 && token[..5] == word[..5]));
    }

    private static bool IsLikelyVietnamese(string text)
    {
        return Regex.IsMatch(text, "[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]")
            || Regex.IsMatch(text, @"\b(hom nay|ban duoc|doanh thu|ai no|tien no|chi tieu|cua hang|toi|giup)\b");
    }

    private static string? ExtractCreatedName(string text, string entityPattern, bool contextOnly = false)
    {
        // 1. "add X as [a] product / thêm X làm sản phẩm / thêm X vào danh mục sản phẩm"
        var asEntity = Regex.Match(text,
            $@"(?:create|add|new|tạo|thêm)\s+(.+?)\s+(?:as\s+(?:a\s+|an\s+)?|làm\s+|như\s+|vào\s+(?:danh\s+mục\s+)?)(?:{entityPattern})\b",
            RegexOptions.IgnoreCase);
        if (asEntity.Success)
        {
            var cleaned = CleanExtractedName(asEntity.Groups[1].Value);
            if (!string.IsNullOrWhiteSpace(cleaned)) return cleaned;
        }

        // 2. "add product X / tạo sản phẩm X"
        var afterEntity = Regex.Match(text,
            $@"(?:{entityPattern})(?:\s+(?:named|called|tên|ten|là|la))?\s+(.+)$",
            RegexOptions.IgnoreCase);
        if (afterEntity.Success)
        {
            var cleaned = CleanExtractedName(afterEntity.Groups[1].Value);
            if (!string.IsNullOrWhiteSpace(cleaned)) return cleaned;
        }

        // 3. "add X product / tạo X sản phẩm"
        var beforeDirect = Regex.Match(text,
            $@"(?:create|add|new|tạo|thêm)\s+(.+?)\s+(?:{entityPattern})\b",
            RegexOptions.IgnoreCase);
        if (beforeDirect.Success)
        {
            var cleaned = CleanExtractedName(beforeDirect.Groups[1].Value);
            if (!string.IsNullOrWhiteSpace(cleaned)) return cleaned;
        }

        // 4. If context is known (e.g. Products page) and user just says "add Cappuccino"
        if (contextOnly)
        {
            var justAdd = Regex.Match(text, @"^(?:create|add|new|tạo|thêm)\s+(.+)$", RegexOptions.IgnoreCase);
            if (justAdd.Success)
            {
                var cleaned = CleanExtractedName(justAdd.Groups[1].Value);
                if (!string.IsNullOrWhiteSpace(cleaned)) return cleaned;
            }
        }

        return null;
    }

    private static string? ExtractTargetName(string text, string entityPattern)
    {
        var after = Regex.Match(text, $@"(?:{entityPattern})\s+(.+)$", RegexOptions.IgnoreCase);
        if (after.Success) return CleanExtractedName(after.Groups[1].Value);
        var before = Regex.Match(text, $@"(?:change|update|edit|archive|remove|delete|đổi|sửa|xóa|xoá)\s+(.+?)\s+(?:{entityPattern})\b", RegexOptions.IgnoreCase);
        return before.Success ? CleanExtractedName(before.Groups[1].Value) : null;
    }

    private static readonly HashSet<string> StopArticles = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "some", "new", "mới", "moi", "một", "mot", "1", "nào", "nao", "này", "nay", "item", "product", "customer", "supplier", "sản phẩm", "khách hàng", "nhà cung cấp"
    };

    private static string? CleanExtractedName(string value)
    {
        var cleaned = Regex.Split(value,
            @"\s+(?:phone|email|address|price|cost|unit|with|to|for|at|thành|giá|với|đơn vị|số điện thoại|điện thoại|địa chỉ)\b",
            RegexOptions.IgnoreCase)[0];
        cleaned = Regex.Replace(cleaned, @"^(?:named|called|tên|ten|là|la|mới|moi)\s+", "", RegexOptions.IgnoreCase);
        cleaned = cleaned.Trim(' ', ',', '.', ':', ';', '\'', '"');
        if (string.IsNullOrWhiteSpace(cleaned)) return null;
        if (StopArticles.Contains(cleaned)) return null;
        return cleaned;
    }

    private static string? ExtractPhone(string text)
    {
        var labeled = Regex.Match(text, @"(?:phone|mobile|số điện thoại|điện thoại|sđt)\s*(?:is|to|là|thành|:)?\s*([+\d][\d\s().-]{6,20})", RegexOptions.IgnoreCase);
        if (labeled.Success) return Regex.Replace(labeled.Groups[1].Value, @"\s+", " ").Trim();
        return null;
    }

    private static string? ExtractEmail(string text)
    {
        var match = Regex.Match(text, @"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase);
        return match.Success ? match.Value.ToLowerInvariant() : null;
    }

    private static string? ExtractLabeledValue(string text, string labelPattern)
    {
        var match = Regex.Match(text, $@"(?:{labelPattern})\s*(?:is|to|là|thành|:)?\s*(.+)$", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    private static string? ExtractUnit(string text)
    {
        var labeled = Regex.Match(text, @"(?:unit|đơn vị)\s*(?:is|to|là|thành|:)?\s*([\p{L}]+)", RegexOptions.IgnoreCase);
        if (labeled.Success) return labeled.Groups[1].Value;
        var quantity = Regex.Match(text, @"\d+(?:[.,]\d+)?\s*(kg|g|gram|kilogram|lít|lit|liter|cái|món|pcs?|box|thùng|bao|hộp|chai|gói|lon|ly|cốc|bịch|cuộn|bó|cây|viên|tờ|unit)\b", RegexOptions.IgnoreCase);
        return quantity.Success ? quantity.Groups[1].Value : null;
    }

    private static string? ExtractPurchasedProductName(string text)
    {
        var match = Regex.Match(text,
            @"\b(?:bought(?:/bougt)?|bougt|purchased)\b\s+(?:\d+(?:[.,]\d+)?\s*)?(?:(?:kg|kilograms?|g|grams?|liters?|litres?|l)\s*)?(?:(?:bags?|packs?|boxes?|bottles?)\s+of\s+|of\s+)?(.+)$",
            RegexOptions.IgnoreCase);
        return match.Success ? CleanExtractedName(match.Groups[1].Value) : null;
    }

    private static decimal ExtractProductPrice(string text, string currency)
    {
        var labeled = Regex.Match(text,
            @"(?:price|cost|selling price|default price|giá|gia)\s*(?:is|to|là|thành|:)?\s*([$€£₫đ]?\s*\d+(?:[.,]\d+)?\s*(?:k|ngàn|nghìn|tr|triệu|million|usd|vnd|eur|gbp)?)",
            RegexOptions.IgnoreCase);
        if (labeled.Success) return ExtractAmount(labeled.Groups[1].Value, currency);

        var symbolPrice = Regex.Match(text, @"[$€£₫]\s*\d+(?:[.,]\d+)?", RegexOptions.IgnoreCase);
        return symbolPrice.Success ? ExtractAmount(symbolPrice.Value, currency) : 0m;
    }

    private static decimal ExtractQuantityValue(string text)
    {
        var match = Regex.Match(text, @"(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(?:kg|g|gram|kilogram|lít|lit|liter|cái|món|pcs?|box|thùng|bao|hộp|chai|gói|lon|ly|cốc|bịch|cuộn|bó|cây|viên|tờ|unit)\b", RegexOptions.IgnoreCase);
        return match.Success && decimal.TryParse(match.Groups[1].Value.Replace(',', '.'),
            System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var quantity)
            ? quantity
            : 1m;
    }

    private static AiParseRecordResponse? ParseGeminiJsonResult(string json, string currency)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var intent = root.TryGetProperty("intent", out var intEl) ? intEl.GetString()?.ToLowerInvariant() ?? "unknown" : "unknown";
            var summary = root.TryGetProperty("summary", out var sumEl) ? sumEl.GetString() ?? "" : "";
            var customerName = root.TryGetProperty("customerName", out var cEl) && cEl.ValueKind == JsonValueKind.String ? cEl.GetString() : null;
            var desc = root.TryGetProperty("description", out var dEl) && dEl.ValueKind == JsonValueKind.String ? dEl.GetString() : null;
            var category = root.TryGetProperty("category", out var catEl) && catEl.ValueKind == JsonValueKind.String ? catEl.GetString() : "Chi phí vận hành";

            decimal totalAmount = 0;
            if (root.TryGetProperty("totalAmount", out var totEl) && totEl.TryGetDecimal(out var tVal)) totalAmount = tVal;

            decimal paidAmount = totalAmount;
            if (root.TryGetProperty("paidAmount", out var pEl) && pEl.TryGetDecimal(out var pVal)) paidAmount = pVal;

            AiSaleExtraction? sale = null;
            AiExpenseExtraction? expense = null;
            AiPaymentExtraction? debtPayment = null;

            if (intent == "sale")
            {
                sale = new AiSaleExtraction(customerName, totalAmount, paidAmount, desc, "Cash", null);
            }
            else if (intent == "expense")
            {
                expense = new AiExpenseExtraction(category ?? "Chi phí", totalAmount, desc);
            }
            else if (intent == "debt_payment")
            {
                debtPayment = new AiPaymentExtraction(customerName ?? "Khách hàng", totalAmount, desc);
            }

            return new AiParseRecordResponse(intent, 0.95m, summary, sale, expense, debtPayment, "Google Gemini", "gemini-3.8-flash", false);
        }
        catch
        {
            return null;
        }
    }

    private static AiParseRecordResponse ParseRecordLocally(string text, string currency)
    {
        var lower = text.ToLowerInvariant();
        var amount = ExtractAmount(lower, currency);

        // 1. Debt payment: "trả nợ", "trả tiền nợ", "paid debt"
        var isDebtPayment = lower.Contains("trả nợ") || lower.Contains("trả tiền nợ") || lower.Contains("thanh toán nợ") ||
                            lower.Contains("trả tiền") || lower.Contains("paid debt") || lower.Contains("repaid") ||
                            lower.Contains("vừa trả") || lower.Contains("just paid") ||
                            (lower.Contains("trả") && (lower.Contains("nợ") || lower.Contains("tiền")));

        if (isDebtPayment)
        {
            var cust = ExtractCustomerName(text) ?? "Khách hàng";
            var summary = $"{cust} trả {amount:N0} {currency} tiền nợ";
            return new AiParseRecordResponse(
                "debt_payment",
                0.90m,
                summary,
                null,
                null,
                new AiPaymentExtraction(cust, amount, text),
                "Tenvora Local AI",
                "regex-parser",
                true
            );
        }

        // 2. Expense: "chi", "mua", "spent", "tiền điện", "tiền nước", "mua đá"
        var isExpense = (lower.Contains("chi ") || lower.StartsWith("chi") || lower.Contains("chi tiêu") ||
                         lower.Contains("mua ") || lower.Contains("tiền điện") || lower.Contains("tiền nước") ||
                         lower.Contains("tiền xăng") || lower.Contains("mua đá") || lower.Contains("spent") ||
                         lower.Contains("expense") ||
                         (lower.StartsWith("record ") && Regex.IsMatch(lower, @"\b(transport|rent|utilities|supplies|cost)\b"))) &&
                        !lower.Contains("bán");

        if (isExpense)
        {
            var category = lower.Contains("điện") || lower.Contains("nước") ? "Tiện ích / Điện nước" :
                           lower.Contains("xăng") ? "Đi lại / Xăng xe" :
                           lower.Contains("đá") ? "Nguyên liệu / Nước đá" : "Chi phí vận hành";

            var summary = $"Khoản chi {amount:N0} {currency} ({category})";
            return new AiParseRecordResponse(
                "expense",
                0.90m,
                summary,
                null,
                new AiExpenseExtraction(category, amount, text),
                null,
                "Tenvora Local AI",
                "regex-parser",
                true
            );
        }

        // 3. Sale: "bán", "sold", or default with customer/item
        var customerName = ExtractCustomerName(text) ?? "Khách lẻ";
        decimal debt = 0;
        var debtMatch = Regex.Match(lower, @"nợ\s+(\d+([.,]\d+)?\s*(k|ngàn|nghìn|tr|triệu)?)");
        if (debtMatch.Success)
        {
            debt = ExtractAmount(debtMatch.Value, currency);
        }

        var paidAmount = debt > 0 ? Math.Max(0, amount - debt) : amount;
        var saleSummary = debt > 0
            ? $"Bán cho {customerName} {amount:N0} {currency} (Đã thu: {paidAmount:N0} {currency}, Ghi nợ: {debt:N0} {currency})"
            : $"Bán cho {customerName} {amount:N0} {currency} (Đã thu đủ tiền mặt)";

        return new AiParseRecordResponse(
            "sale",
            0.88m,
            saleSummary,
            new AiSaleExtraction(customerName, amount, paidAmount, text, "Cash", null),
            null,
            null,
            "Tenvora Local AI",
            "regex-parser",
            true
        );
    }

    private static decimal ExtractAmount(string text, string currency)
    {
        // English million notation (for example, "2 million").
        var millionMatch = Regex.Match(text, @"(\d+(?:[.,]\d+)?)\s*million\b", RegexOptions.IgnoreCase);
        if (millionMatch.Success && decimal.TryParse(millionMatch.Groups[1].Value.Replace(',', '.'),
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var millionValue))
        {
            return millionValue * 1000000m;
        }

        // 1. Matches "125k", "125 ngàn", "125 nghìn"
        var kMatch = Regex.Match(text, @"(\d+([.,]\d+)?)\s*(k|ngàn|nghìn)\b", RegexOptions.IgnoreCase);
        if (kMatch.Success && decimal.TryParse(kMatch.Groups[1].Value.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var kVal))
        {
            return kVal * 1000m;
        }

        // 2. Matches "1.5tr", "2 triệu", "1tr5"
        var trMatch = Regex.Match(text, @"(\d+)\s*tr\s*(\d+)?\b|(\d+([.,]\d+)?)\s*(triệu|tr)\b", RegexOptions.IgnoreCase);
        if (trMatch.Success)
        {
            if (trMatch.Groups[1].Success && trMatch.Groups[2].Success &&
                decimal.TryParse(trMatch.Groups[1].Value, out var major) &&
                decimal.TryParse(trMatch.Groups[2].Value, out var minor))
            {
                return (major * 1000000m) + (minor * 100000m);
            }
            if (decimal.TryParse((trMatch.Groups[3].Success ? trMatch.Groups[3].Value : trMatch.Groups[1].Value).Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var trVal))
            {
                return trVal * 1000000m;
            }
        }

        // 3. Matches generic numbers (e.g. 50000, $50, 150, 1.40, 15.50)
        var numMatch = Regex.Match(text, @"(\$|đ|vnd)?\s*(\d+([.,]\d+)*)", RegexOptions.IgnoreCase);
        if (numMatch.Success && TryParseFinancialNumber(numMatch.Groups[2].Value, currency, out var val))
        {
            return val;
        }

        return 0m;
    }

    private static bool TryParseFinancialNumber(string raw, string currency, out decimal value)
    {
        value = 0m;
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var trimmed = raw.Trim();
        var isVnd = currency.Equals("VND", StringComparison.OrdinalIgnoreCase);

        string normalized;
        if (trimmed.Contains(',') && trimmed.Contains('.'))
        {
            if (trimmed.IndexOf(',') < trimmed.IndexOf('.'))
            {
                normalized = trimmed.Replace(",", "");
            }
            else
            {
                normalized = trimmed.Replace(".", "").Replace(',', '.');
            }
        }
        else if (trimmed.Contains('.'))
        {
            if (isVnd && Regex.IsMatch(trimmed, @"\.\d{3}$"))
            {
                normalized = trimmed.Replace(".", "");
            }
            else if (trimmed.Count(c => c == '.') > 1)
            {
                normalized = trimmed.Replace(".", "");
            }
            else
            {
                normalized = trimmed;
            }
        }
        else if (trimmed.Contains(','))
        {
            if (isVnd || Regex.IsMatch(trimmed, @",\d{3}$") || trimmed.Count(c => c == ',') > 1)
            {
                normalized = trimmed.Replace(",", "");
            }
            else
            {
                normalized = trimmed.Replace(',', '.');
            }
        }
        else
        {
            normalized = trimmed;
        }

        if (decimal.TryParse(normalized, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
        {
            if (isVnd && parsed > 0 && parsed < 1000 && !trimmed.Contains('.') && !trimmed.Contains(','))
            {
                parsed *= 1000m;
            }
            value = parsed;
            return true;
        }

        return false;
    }

    private static decimal ExtractPerUnitPrice(string text, string currency)
    {
        var match = Regex.Match(text,
            @"(\d+(?:[.,]\d+)?\s*(?:k|ngàn|nghìn|tr|triệu|million)?)(?:\s*(?:/|per|mỗi)\s*(?:kg|kilogram|g|gram|item|piece|cái|món|pcs?|bao|hộp|chai|thùng|gói|lon|ly|cốc|bịch|cuộn|bó|cây|viên|tờ|unit))",
            RegexOptions.IgnoreCase);
        return match.Success ? ExtractAmount(match.Groups[1].Value, currency) : 0m;
    }

    private static string? ExtractCustomerName(string text)
    {
        var match = Regex.Match(text, @"(cho|của|từ)\s+((chị|anh|bác|cô|chú|ông|bà|em)\s+)?([A-ZÀ-Ỹa-zà-ỹ0-9]+(\s+[A-ZÀ-Ỹa-zà-ỹ0-9]+)?)", RegexOptions.IgnoreCase);
        if (match.Success)
        {
            var title = match.Groups[3].Success ? match.Groups[3].Value.Trim() + " " : "";
            var name = match.Groups[4].Value.Trim();
            // Filter out common non-name words
            if (!Regex.IsMatch(name, @"^(khách|tiền|hàng|nợ|chi|mua|đá|xăng|cái|lon|kg)$", RegexOptions.IgnoreCase))
            {
                return $"{title}{name}".Trim();
            }
        }

        // Direct leading match, e.g. "Bác Ba trả 200k...", "Chị Lan mua...", "David paid..."
        var leadMatch = Regex.Match(text, @"^\s*((chị|anh|bác|cô|chú|ông|bà|em)\s+)?([A-ZÀ-Ỹa-zà-ỹ0-9]+)", RegexOptions.IgnoreCase);
        if (leadMatch.Success)
        {
            var title = leadMatch.Groups[2].Success ? leadMatch.Groups[2].Value.Trim() + " " : "";
            var name = leadMatch.Groups[3].Value.Trim();
            if (!Regex.IsMatch(name, @"^(bán|chi|mua|thu|hôm|ngày|tổng|đơn|tiền)$", RegexOptions.IgnoreCase))
            {
                return $"{title}{name}".Trim();
            }
        }

        return null;
    }
}

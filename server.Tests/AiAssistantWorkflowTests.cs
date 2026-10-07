using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Security.Claims;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class AiAssistantWorkflowTests
{
    private sealed class DummyHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static (AiAssistantService Parser, AiActionService Actions, BusinessService Business, Guid TenantId, Guid UserId) Setup(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Tiệm Tạp Hóa Cô Ba",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            BusinessType = "retail",
            PlanType = "Business",
            Status = "Active"
        });
        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "owner@example.test",
            Role = "TenantAdmin",
            IsActive = true,
            PreferredCurrency = "VND"
        });
        db.SaveChanges();

        var business = new BusinessService(db);
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AI_PROVIDER_API_KEY"] = ""
        }).Build();
        var parser = new AiAssistantService(db, business, configuration, new DummyHttpClientFactory(), NullLogger<AiAssistantService>.Instance);
        var actions = new AiActionService(db, parser, business, new HttpContextAccessor { HttpContext = new DefaultHttpContext() });
        return (parser, actions, business, tenantId, userId);
    }

    [Fact]
    public async Task PaymentIsOnlyWrittenAfterConfirmingServerOwnedProposal()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Lươn", null, "kg", 180_000m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "seed-sale", new(customer.Id,
            [new(product.Id, 1, 4_700_000m)], 0m));

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Anh Nam vừa trả 2 triệu"));

        Assert.True(proposal.Success);
        Assert.Equal("PendingConfirmation", proposal.Data!.Status);
        Assert.True(proposal.Data.RequiresConfirmation);
        Assert.NotNull(proposal.Data.ActionId);
        Assert.Empty(db.BusinessPayments);

        var execution = await actions.ConfirmAsync(tenantId, userId, proposal.Data.ActionId!.Value, true);

        Assert.True(execution.Success);
        Assert.Equal("Executed", execution.Data!.Status);
        Assert.Equal(4_700_000m, execution.Data.PreviousBalance);
        Assert.Equal(2_700_000m, execution.Data.NewBalance);
        Assert.Single(db.BusinessPayments);
    }

    [Fact]
    public async Task LocalFallbackUnderstandsEnglishMillionPaymentAndExpensePrompt()
    {
        await using var db = Db();
        var (parser, _, _, tenantId, _) = Setup(db);

        var payment = await parser.ParseRecordAsync(tenantId, "Nam just paid 2 million");
        var expense = await parser.ParseRecordAsync(tenantId, "Record 500k for transport today");

        Assert.Equal("debt_payment", payment.Data!.Intent);
        Assert.Equal(2_000_000m, payment.Data.DebtPayment!.Amount);
        Assert.Equal("expense", expense.Data!.Intent);
        Assert.Equal(500_000m, expense.Data.Expense!.Amount);
    }

    [Fact]
    public async Task ReconfirmingExecutedActionIsIdempotent()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);
        var proposal = await actions.ProposeAsync(tenantId, userId, new("Chi 500k tiền vận chuyển hôm nay"));

        var first = await actions.ConfirmAsync(tenantId, userId, proposal.Data!.ActionId!.Value, true);
        var replay = await actions.ConfirmAsync(tenantId, userId, proposal.Data.ActionId.Value, true);

        Assert.True(first.Success);
        Assert.True(replay.Success);
        Assert.Equal(first.Data!.RecordId, replay.Data!.RecordId);
        Assert.Single(db.BusinessExpenses);
    }

    [Fact]
    public async Task CancellingProposalDoesNotChangeBusinessState()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);
        var proposal = await actions.ProposeAsync(tenantId, userId, new("Chi 50k mua đá lạnh"));

        var result = await actions.ConfirmAsync(tenantId, userId, proposal.Data!.ActionId!.Value, false);

        Assert.True(result.Success);
        Assert.Equal("Cancelled", result.Data!.Status);
        Assert.Empty(db.BusinessExpenses);
    }

    [Fact]
    public async Task UnknownCustomerStopsForClarificationAndIsNotCreated()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);

        var proposal = await actions.ProposeAsync(tenantId, userId, new("Minh vừa trả 200k tiền nợ"));

        Assert.True(proposal.Success);
        Assert.Equal("NeedsClarification", proposal.Data!.Status);
        Assert.Null(proposal.Data.ActionId);
        Assert.Empty(db.Customers);
        Assert.Empty(db.AiActions);
    }

    [Fact]
    public async Task SaleUsesExistingCustomerAndProductAndRequiresConfirmation()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        await business.CreateCustomerAsync(tenantId, new("Chị Lan", null, null, null, null));
        await business.CreateProductAsync(tenantId, new("Gạo", null, "kg", 25_000m, null));

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Bán cho chị Lan 5kg gạo 125k nợ 50k"));

        Assert.True(proposal.Success);
        Assert.Equal("PendingConfirmation", proposal.Data!.Status);
        Assert.Empty(db.Sales);

        var execution = await actions.ConfirmAsync(tenantId, userId, proposal.Data.ActionId!.Value, true);
        Assert.True(execution.Success);
        var sale = Assert.Single(db.Sales.Include(s => s.Items).Include(s => s.Payments));
        Assert.Equal(125_000m, sale.TotalAmount);
        Assert.Equal(5m, Assert.Single(sale.Items).Quantity);
        Assert.Equal(75_000m, Assert.Single(sale.Payments).Amount);
    }

    [Fact]
    public async Task UiCustomerContextResolvesPronounWithoutSendingWorkspaceDataToModel()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Lươn", null, "kg", 100_000m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "context-sale", new(customer.Id, [new(product.Id, 1, 500_000m)], 0m));

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("anh ấy trả 200k tiền nợ", new("/customers/detail", "customer", customer.Id)));

        Assert.True(proposal.Success);
        Assert.Equal("PendingConfirmation", proposal.Data!.Status);
        Assert.Equal("Anh Nam", proposal.Data.Details["Customer"]);
    }

    [Fact]
    public async Task ChatReadsLiveDashboardInsteadOfRememberedValues()
    {
        await using var db = Db();
        var (parser, _, business, tenantId, _) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Chị Lan", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Hàng hoá", null, "món", 120_000m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "chat-sale", new(customer.Id, [new(product.Id, 1)], 70_000m));

        var chat = await parser.ChatAsync(tenantId, "Hôm nay tôi bán được bao nhiêu rồi?");

        Assert.True(chat.Success);
        Assert.Contains("120,000", chat.Data!.Reply);
    }

    [Fact]
    public async Task ChatUsesStructuredCurrentCustomerContextForPronouns()
    {
        await using var db = Db();
        var (parser, _, business, tenantId, _) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Lươn", null, "kg", 700_000m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "context-chat-sale", new(customer.Id, [new(product.Id, 1)], 0m));

        var chat = await parser.ChatAsync(tenantId, "Anh ấy còn nợ bao nhiêu?",
            new AiUiContext("/customers/detail", "customer", customer.Id));

        Assert.True(chat.Success);
        Assert.Contains("Anh Nam", chat.Data!.Reply);
        Assert.Contains("700,000", chat.Data.Reply);
    }

    [Fact]
    public async Task ConfirmedAiMutationCarriesActorAndConfirmationIntoAuditLog()
    {
        var http = new DefaultHttpContext();
        var accessor = new HttpContextAccessor { HttpContext = http };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new AuditLogSaveChangesInterceptor(accessor))
            .Options;
        await using var db = new AppDbContext(options);
        var (parser, _, business, tenantId, userId) = Setup(db);
        http.User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "owner@example.test")
        ], "test"));
        var actions = new AiActionService(db, parser, business, accessor);
        var proposal = await actions.ProposeAsync(tenantId, userId, new("Chi 50k mua đá lạnh"));

        await actions.ConfirmAsync(tenantId, userId, proposal.Data!.ActionId!.Value, true);

        var audit = await db.AuditLogs.AsNoTracking()
            .FirstAsync(log => log.EntityType == "BusinessExpense" && log.Origin == "AI");
        Assert.Equal(userId, audit.UserId);
        Assert.Equal(proposal.Data.ActionId, audit.AiActionId);
        Assert.True(audit.ConfirmationRequired);
        Assert.True(audit.ConfirmationGiven);
    }

    [Fact]
    public async Task CreateAndUpdateCustomerUseConfirmedApplicationActions()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);

        var create = await actions.ProposeAsync(tenantId, userId,
            new("Create customer Minh Chau phone 0901234567"));
        Assert.Equal("create_customer", create.Data!.Intent);
        Assert.Empty(db.Customers);

        await actions.ConfirmAsync(tenantId, userId, create.Data.ActionId!.Value, true);
        var customer = Assert.Single(db.Customers);
        Assert.Equal("Minh Chau", customer.Name);
        Assert.Equal("0901234567", customer.Phone);

        var update = await actions.ProposeAsync(tenantId, userId,
            new("Update customer phone to 0987654321", new("/customers/detail", "customer", customer.Id)));
        Assert.Equal("update_customer", update.Data!.Intent);
        await actions.ConfirmAsync(tenantId, userId, update.Data.ActionId!.Value, true);

        Assert.Equal("0987654321", (await db.Customers.FindAsync(customer.Id))!.Phone);
    }

    [Fact]
    public async Task PurchaseAndSupplierPaymentAreBoundedConfirmedActions()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var supplier = (await business.CreateSupplierAsync(tenantId,
            new("Hoa Phat", null, null, null, null))).Data!;

        var purchase = await actions.ProposeAsync(tenantId, userId,
            new("Purchase from supplier Hoa Phat for 2 million"));
        Assert.Equal("purchase", purchase.Data!.Intent);
        await actions.ConfirmAsync(tenantId, userId, purchase.Data.ActionId!.Value, true);

        var savedPurchase = Assert.Single(db.Purchases);
        Assert.Equal(2_000_000m, savedPurchase.TotalAmount);
        Assert.Empty(db.PurchasePayments);

        var payment = await actions.ProposeAsync(tenantId, userId,
            new("Pay supplier Hoa Phat 500k"));
        Assert.Equal("supplier_payment", payment.Data!.Intent);
        await actions.ConfirmAsync(tenantId, userId, payment.Data.ActionId!.Value, true);

        Assert.Equal(500_000m, Assert.Single(db.PurchasePayments).Amount);
        Assert.Equal(supplier.Id, savedPurchase.SupplierId);
    }

    [Fact]
    public async Task VoidingUnpaidSaleRequiresConfirmationAndPaidSaleIsRejected()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Lan", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Rice", null, "kg", 100_000m, null))).Data!;
        var unpaid = (await business.CreateSaleAsync(tenantId, "void-unpaid",
            new(customer.Id, [new(product.Id, 1)], 0m))).Data!;

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Void this sale", new("/sales/detail", "sale", unpaid.Id)));
        Assert.Empty(db.Sales.Where(s => s.Status == "Voided"));
        await actions.ConfirmAsync(tenantId, userId, proposal.Data!.ActionId!.Value, true);
        Assert.Equal("Voided", (await db.Sales.FindAsync(unpaid.Id))!.Status);

        var paid = (await business.CreateSaleAsync(tenantId, "void-paid",
            new(customer.Id, [new(product.Id, 1)], 100_000m))).Data!;
        var paidProposal = await actions.ProposeAsync(tenantId, userId,
            new("Void this sale", new("/sales/detail", "sale", paid.Id)));
        var failed = await actions.ConfirmAsync(tenantId, userId, paidProposal.Data!.ActionId!.Value, true);
        Assert.False(failed.Success);
        Assert.Equal("Posted", (await db.Sales.FindAsync(paid.Id))!.Status);
    }

    [Fact]
    public async Task SettingsMutationIsRejectedForNonAdministratorBeforeProposalIsSaved()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);

        var result = await actions.ProposeAsync(tenantId, userId,
            new("Change currency to USD"), "OperationsManager");

        Assert.False(result.Success);
        Assert.Empty(db.AiActions);
    }

    [Fact]
    public async Task GroundedReadAnswersWeeklyRevenueAndLargestExpenseFromWorkspaceData()
    {
        await using var db = Db();
        var (parser, _, business, tenantId, _) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Lan", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Rice", null, "kg", 350_000m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "weekly-sale", new(customer.Id, [new(product.Id, 1)], 350_000m));
        await business.CreateBusinessExpenseAsync(tenantId, "weekly-expense-a", new("Transport", 120_000m, null, "Delivery"));
        await business.CreateBusinessExpenseAsync(tenantId, "weekly-expense-b", new("Rent", 500_000m, null, "Shop"));

        var revenue = await parser.ChatAsync(tenantId, "What are sales this week?");
        var expense = await parser.ChatAsync(tenantId, "What was the largest expense this week?");

        Assert.Contains("350,000", revenue.Data!.Reply);
        Assert.Contains("Rent", expense.Data!.Reply);
        Assert.Contains("500,000", expense.Data.Reply);
    }

    [Fact]
    public async Task CurrentInvoiceCanBeMarkedPaidWithoutRestatingCustomerOrAmount()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var customer = (await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Eel", null, "kg", 900_000m, null))).Data!;
        var sale = (await business.CreateSaleAsync(tenantId, "mark-paid-sale",
            new(customer.Id, [new(product.Id, 1)], 200_000m))).Data!;

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Mark this invoice as paid", new("/sales/detail", "sale", sale.Id)));

        Assert.Equal("debt_payment", proposal.Data!.Intent);
        Assert.Equal("700,000 VND", proposal.Data.Details["Amount"]);
        await actions.ConfirmAsync(tenantId, userId, proposal.Data.ActionId!.Value, true);
        Assert.Equal(0m, (await business.GetSaleAsync(tenantId, sale.Id)).Data!.OutstandingBalance);
    }

    [Fact]
    public async Task ChatUsesCurrentSupplierContextForLivePayableBalance()
    {
        await using var db = Db();
        var (parser, _, business, tenantId, _) = Setup(db);
        var supplier = (await business.CreateSupplierAsync(tenantId, new("Hoa Phat", null, null, null, null))).Data!;
        await business.CreatePurchaseAsync(tenantId, "supplier-context-purchase",
            new(supplier.Id, [new("Steel", "kg", 1m, 1_250_000m)], 250_000m));

        var answer = await parser.ChatAsync(tenantId, "How much do we owe this supplier?",
            new("/suppliers/detail", "supplier", supplier.Id));

        Assert.Contains("Hoa Phat", answer.Data!.Reply);
        Assert.Contains("1,000,000", answer.Data.Reply);
    }

    [Fact]
    public async Task FollowUpCanReferenceTheLastAiCreatedSale()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null));
        await business.CreateProductAsync(tenantId, new("Eel", null, "kg", 180_000m, null));
        var create = await actions.ProposeAsync(tenantId, userId,
            new("Bán cho Anh Nam 1kg Eel 180k nợ 180k"));
        await actions.ConfirmAsync(tenantId, userId, create.Data!.ActionId!.Value, true);

        var cancel = await actions.ProposeAsync(tenantId, userId,
            new("Cancel the sale I just created"));

        Assert.Equal("void_sale", cancel.Data!.Intent);
        Assert.Equal("PendingConfirmation", cancel.Data.Status);
        await actions.ConfirmAsync(tenantId, userId, cancel.Data.ActionId!.Value, true);
        Assert.Equal("Voided", Assert.Single(db.Sales).Status);
    }

    [Fact]
    public async Task PerUnitSaleLanguageCalculatesTheServerProposalTotal()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null));
        await business.CreateProductAsync(tenantId, new("Lươn", null, "kg", 180_000m, null));

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Bán cho Anh Nam 15kg lươn giá 180k/kg, chưa trả"));

        Assert.Equal("sale", proposal.Data!.Intent);
        Assert.Equal("2,700,000 VND", proposal.Data.Details["Total"]);
        Assert.Equal("0 VND", proposal.Data.Details["Paid"]);
        await actions.ConfirmAsync(tenantId, userId, proposal.Data.ActionId!.Value, true);
        var sale = Assert.Single(db.Sales.Include(s => s.Items));
        Assert.Equal(2_700_000m, sale.TotalAmount);
        Assert.Equal(180_000m, Assert.Single(sale.Items).UnitPrice);
    }

    [Fact]
    public async Task AgentFallbackKeepsEnglishAndExactCustomerAndSupplierBalances()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        db.Tenants.Single().BaseCurrency = "USD";
        var customer = (await business.CreateCustomerAsync(tenantId, new("Customer fixture", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Product fixture", null, "kg", 10.25m, null))).Data!;
        await business.CreateSaleAsync(tenantId, "sale", new(customer.Id, [new(product.Id, 1, 10.25m)], 0m));
        var supplier = (await business.CreateSupplierAsync(tenantId, new("Supplier fixture", null, null, null, null))).Data!;
        await business.CreatePurchaseAsync(tenantId, "purchase", new(supplier.Id, [new("Stock fixture", "kg", 1, 4.75m, product.Id)], 0m));
        await db.SaveChangesAsync();
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        var customers = await agent.AgentChatAsync(tenantId, userId, new("Which customers still owe me?"));
        Assert.Contains("Customers owe", customers.Data!.Reply);
        Assert.Contains("10.25 USD", customers.Data.Reply);
        var suppliers = await agent.AgentChatAsync(tenantId, userId, new("How much do we owe suppliers?"));
        Assert.Contains("owed to suppliers", suppliers.Data!.Reply);
        Assert.Contains("4.75 USD", suppliers.Data.Reply);
        Assert.DoesNotContain("Customer fixture", suppliers.Data.Reply);
        Assert.Null(suppliers.Data.Proposal);
    }

    [Fact]
    public async Task AgentFallbackUsesRequestedMonthAndFractionalInventory()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        db.Tenants.Single().BaseCurrency = "USD";
        var customer = (await business.CreateCustomerAsync(tenantId, new("Fixture", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId, new("Rice fixture", null, "kg", 10.25m, null, StockQuantity: 1.5m, TrackInventory: true))).Data!;
        await business.CreateSaleAsync(tenantId, "sale", new(customer.Id, [new(product.Id, .5m, 10.5m)], 0m));
        db.Sales.Single().SoldAt = DateTime.UtcNow.Date.AddDays(1 - DateTime.UtcNow.Day);
        await db.SaveChangesAsync();
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        var overview = await agent.AgentChatAsync(tenantId, userId, new("How is my business doing this month?"));
        Assert.Contains("Records for this month", overview.Data!.Reply);
        Assert.Contains("5.25 USD", overview.Data.Reply);
        var stock = await agent.AgentChatAsync(tenantId, userId, new("Show inventory"));
        Assert.Contains("1 kg", stock.Data!.Reply);
        Assert.Contains("10.25 USD", stock.Data.Reply);
        Assert.Null(stock.Data.Proposal);
    }

    [Fact]
    public async Task AgentChatCreatesConversationPersistsHistoryAndGeneratesProposals()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);

        await business.CreateCustomerAsync(tenantId, new("Anh Nam", null, null, null, null));
        await business.CreateProductAsync(tenantId, new("Gạo ST25", null, "bao", 250_000m, null));

        // 1. Ask about debt
        var debtResponse = await agent.AgentChatAsync(tenantId, userId, new("Ai đang nợ tiền?"));
        Assert.True(debtResponse.Success);
        Assert.NotNull(debtResponse.Data);
        Assert.NotEqual(Guid.Empty, debtResponse.Data.ConversationId);
        var convId = debtResponse.Data.ConversationId;

        // 2. Ask to record a transaction in the same conversation
        var actionResponse = await agent.AgentChatAsync(tenantId, userId, new("Bán cho Anh Nam 2 bao Gạo ST25 giá 250k/bao nợ cả", convId));
        Assert.True(actionResponse.Success);
        Assert.NotNull(actionResponse.Data!.Proposal);
        Assert.Equal("PendingConfirmation", actionResponse.Data.Proposal.Status);

        // 3. Confirm the proposal by replying 'xác nhận'
        var confirmResponse = await agent.AgentChatAsync(tenantId, userId, new("xác nhận", convId));
        Assert.True(confirmResponse.Success);
        Assert.Contains("Đã xác nhận", confirmResponse.Data!.Reply);

        // Verify sale was actually created in DB
        var sale = Assert.Single(db.Sales.Include(s => s.Items));
        Assert.Equal(500_000m, sale.TotalAmount);

        // 4. Verify conversation detail contains all messages
        var detail = await agent.GetConversationAsync(tenantId, userId, convId);
        Assert.True(detail.Success);
        Assert.Equal(6, detail.Data!.Messages.Count);

        // 5. Verify conversation summary list
        var summaries = await agent.GetConversationsAsync(tenantId, userId);
        Assert.True(summaries.Success);
        Assert.Single(summaries.Data!);
    }

    [Fact]
    public async Task AgentChatProposesAndExecutesProductCreationFromNaturalLanguage()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);

        // 1. User says "add cappuchino as product"
        var chatRes = await agent.AgentChatAsync(tenantId, userId, new("add cappuchino as product"));
        Assert.True(chatRes.Success);
        Assert.NotNull(chatRes.Data!.Proposal);
        Assert.Equal("PendingConfirmation", chatRes.Data.Proposal.Status);
        Assert.Equal("create_product", chatRes.Data.Proposal.Intent);
        Assert.NotNull(chatRes.Data.Proposal.ActionId);
        Assert.Equal("cappuchino", chatRes.Data.Proposal.Details["Product"]);

        // 2. User confirms with "yes"
        var confirmRes = await agent.AgentChatAsync(tenantId, userId, new("yes", chatRes.Data.ConversationId));
        Assert.True(confirmRes.Success);

        // 3. Verify product is created in DB
        var product = Assert.Single(db.Products);
        Assert.Equal("cappuchino", product.Name);
        Assert.True(product.IsActive);
    }

    [Theory]
    [InlineData("Cong Huynh bought 1kg bag of Robusta coffee")]
    [InlineData("Cong Huynh bougt 1kg bag of Robusta coffee")]
    [InlineData("Cong Huynh bought/bougt 1kg bag of Robusta coffee")]
    public async Task CustomerBoughtProductUsesSavedPriceAndCreatesSaleAfterConfirmation(string message)
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        var customer = (await business.CreateCustomerAsync(tenantId,
            new("Cong Huynh", null, null, null, null))).Data!;
        var product = (await business.CreateProductAsync(tenantId,
            new("Robusta coffee", null, "kg", 180_000m, null))).Data!;

        var proposed = await agent.AgentChatAsync(tenantId, userId, new(message));

        Assert.True(proposed.Success);
        Assert.NotNull(proposed.Data!.Proposal);
        Assert.Equal("sale", proposed.Data.Proposal.Intent);
        Assert.Equal(AiActionStatuses.PendingConfirmation, proposed.Data.Proposal.Status);
        Assert.Equal("Cong Huynh", proposed.Data.Proposal.Details["Customer"]);
        Assert.Equal("Robusta coffee", proposed.Data.Proposal.Details["Product"]);
        Assert.Equal("180,000 VND", proposed.Data.Proposal.Details["Total"]);
        Assert.Empty(db.Sales);

        var confirmed = await agent.AgentChatAsync(tenantId, userId,
            new("yes", proposed.Data.ConversationId));

        Assert.True(confirmed.Success);
        var sale = Assert.Single(db.Sales.Include(s => s.Items).Include(s => s.Payments));
        Assert.Equal(customer.Id, sale.CustomerId);
        Assert.Equal(180_000m, sale.TotalAmount);
        Assert.Equal(180_000m, Assert.Single(sale.Payments).Amount);
        var item = Assert.Single(sale.Items);
        Assert.Equal(product.Id, item.ProductId);
        Assert.Equal(1m, item.Quantity);
    }

    [Fact]
    public async Task CustomerPurchasePronounResolvesTheCustomerJustCreatedByTheAgent()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        await business.CreateProductAsync(tenantId,
            new("Robusta coffee", null, "kg", 180_000m, null));

        var createCustomer = await actions.ProposeAsync(tenantId, userId,
            new("Create customer Cong Huynh"));
        await actions.ConfirmAsync(tenantId, userId, createCustomer.Data!.ActionId!.Value, true);

        var proposed = await agent.AgentChatAsync(tenantId, userId,
            new("They bought 1kg bag of Robusta coffee"));

        Assert.True(proposed.Success);
        Assert.NotNull(proposed.Data!.Proposal);
        Assert.Equal("sale", proposed.Data.Proposal.Intent);
        Assert.Equal("Cong Huynh", proposed.Data.Proposal.Details["Customer"]);
        Assert.Equal("Robusta coffee", proposed.Data.Proposal.Details["Product"]);
    }

    [Fact]
    public async Task MissingSaleProductBecomesAnInlineProductDraftAndFollowUpKeepsContext()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        await business.CreateCustomerAsync(tenantId,
            new("Cong Huynh", null, null, null, null));

        var first = await agent.AgentChatAsync(tenantId, userId,
            new("Cong Huynh bougt 1kg bag of Robusta coffee"));

        Assert.True(first.Success);
        Assert.NotNull(first.Data!.Proposal);
        Assert.Equal("create_product", first.Data.Proposal.Intent);
        Assert.Equal(AiActionStatuses.NeedsClarification, first.Data.Proposal.Status);
        Assert.Equal("Robusta coffee", first.Data.Proposal.Details["Product"]);
        Assert.Equal("true", first.Data.Proposal.Details["Price required"]);
        Assert.Contains("Cong Huynh", first.Data.Proposal.Details["Pending sale"]);
        Assert.DoesNotContain("Tình hình kinh doanh", first.Data.Reply);

        var followUp = await agent.AgentChatAsync(tenantId, userId,
            new("1kg bag of Robusta coffee", first.Data.ConversationId));

        Assert.True(followUp.Success);
        Assert.NotNull(followUp.Data!.Proposal);
        Assert.Equal("create_product", followUp.Data.Proposal.Intent);
        Assert.Equal("Robusta coffee", followUp.Data.Proposal.Details["Product"]);
        Assert.DoesNotContain("Tình hình kinh doanh", followUp.Data.Reply);
    }

    [Fact]
    public async Task ProductPackageSizeIsNotMistakenForItsSellingPrice()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new("Create product 1kg bag of Robusta coffee, unit bag, price 180k"));

        Assert.Equal("create_product", proposal.Data!.Intent);
        Assert.Equal("1kg bag of Robusta coffee", proposal.Data.Details["Product"]);
        Assert.Equal("180,000 VND", proposal.Data.Details["Default price"]);
    }

    [Fact]
    public async Task MissingProductCreationCarriesThePendingSaleForAutomaticResume()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);
        const string pendingSale = "Cong Huynh bought 1kg bag of Robusta coffee";

        var proposal = await actions.ProposeAsync(tenantId, userId,
            new($"Create product Robusta coffee, unit kg, price 180k. After creating it, continue pending sale: {pendingSale}"));

        Assert.Equal("create_product", proposal.Data!.Intent);
        Assert.Equal("Robusta coffee", proposal.Data.Details["Product"]);
        Assert.Equal("180,000 VND", proposal.Data.Details["Default price"]);
        Assert.Equal(pendingSale, proposal.Data.Details["Pending sale"]);
    }

    [Fact]
    public async Task CompletedCustomerDraftStaysCompletedWhenConversationIsReloaded()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);

        var chat = await agent.AgentChatAsync(tenantId, userId, new("add a customer"));

        Assert.True(chat.Success);
        Assert.NotNull(chat.Data!.Proposal?.ActionId);
        Assert.Equal("create_customer", chat.Data.Proposal.Intent);
        Assert.Equal("Create a customer?", chat.Data.Proposal.Summary);

        var execution = await actions.ConfirmAsync(
            tenantId,
            userId,
            chat.Data.Proposal.ActionId!.Value,
            true,
            input: new AiActionInputOverrides(
                Name: "Anh Minh",
                Phone: "0901234567",
                Email: "minh@example.test",
                Address: "Da Nang"));

        Assert.True(execution.Success);
        var customer = Assert.Single(db.Customers);
        Assert.Equal("Anh Minh", customer.Name);

        var reloaded = await agent.GetConversationAsync(tenantId, userId, chat.Data.ConversationId);
        var savedProposal = Assert.Single(reloaded.Data!.Messages, message => message.Proposal != null).Proposal!;
        Assert.Equal(AiActionStatuses.Executed, savedProposal.Status);
        Assert.False(savedProposal.RequiresConfirmation);
        Assert.Equal("Customer created: Anh Minh.", savedProposal.Summary);
        Assert.Equal("Customer created: Anh Minh.", savedProposal.Details["Result"]);
        Assert.Equal("Anh Minh", savedProposal.Details["name"]);
    }

    [Fact]
    public async Task IncompleteDraftCannotBeConfirmedWithoutRequiredFormValues()
    {
        await using var db = Db();
        var (_, actions, _, tenantId, userId) = Setup(db);
        var proposal = await actions.ProposeAsync(tenantId, userId, new("add a customer"));

        var result = await actions.ConfirmAsync(tenantId, userId, proposal.Data!.ActionId!.Value, true);

        Assert.False(result.Success);
        Assert.Empty(db.Customers);
        var saved = await db.AiActions.SingleAsync();
        Assert.Equal(AiActionStatuses.PendingConfirmation, saved.Status);
        Assert.True(saved.RequiresConfirmation);
    }

    [Fact]
    public async Task TypedConfirmationReturnsTheSettledProposalForClientReconciliation()
    {
        await using var db = Db();
        var (_, actions, business, tenantId, userId) = Setup(db);
        var agent = new AiAgentService(db, business, actions, new ConfigurationBuilder().Build(), new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);

        var proposed = await agent.AgentChatAsync(tenantId, userId, new("add Matcha as product"));
        var confirmed = await agent.AgentChatAsync(tenantId, userId, new("yes", proposed.Data!.ConversationId));

        Assert.True(confirmed.Success);
        Assert.NotNull(confirmed.Data!.Proposal);
        Assert.Equal(proposed.Data.Proposal!.ActionId, confirmed.Data.Proposal.ActionId);
        Assert.Equal(AiActionStatuses.Executed, confirmed.Data.Proposal.Status);
        Assert.Equal("Product created: Matcha.", confirmed.Data.Proposal.Summary);
        Assert.False(confirmed.Data.Proposal.RequiresConfirmation);
    }
}

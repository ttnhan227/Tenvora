using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class LiveProviderFactAttribute : FactAttribute
{
    public LiveProviderFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = -1) : base(sourceFilePath, sourceLineNumber)
    {
        if (Environment.GetEnvironmentVariable("TENVORA_RUN_LIVE_AI") != "1")
            Skip = "Opt-in synthetic provider check: set TENVORA_RUN_LIVE_AI=1 and AI_PROVIDER_API_KEY.";
    }
}

public sealed class LiveProviderTests
{
    private sealed class Factory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    [LiveProviderFact]
    public async Task SyntheticChatAndAgentReachConfiguredProvider()
    {
        Assert.False(string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY")));
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var tenant = Guid.NewGuid();
        var user = Guid.NewGuid();
        db.Tenants.Add(new Tenant { Id = tenant, CompanyName = "Synthetic readiness test", ApiKey = "synthetic", BaseCurrency = "VND", PlanType = "Business", Status = "Active" });
        db.Users.Add(new User { Id = user, TenantId = tenant, Email = "synthetic@example.test", Role = "TenantAdmin", IsActive = true });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var config = new ConfigurationBuilder().AddEnvironmentVariables().Build();
        var factory = new Factory();
        var business = new BusinessService(db);
        var assistant = new AiAssistantService(db, business, config, factory, NullLogger<AiAssistantService>.Instance);
        var chat = await assistant.ChatAsync(tenant, "Synthetic test: what is 2 plus 2? Reply with 4 only.", ct: TestContext.Current.CancellationToken);
        Assert.True(chat.Success);
        Assert.False(chat.Data!.IsFallback);
        Assert.Contains("4", chat.Data.Reply);
        var actions = new AiActionService(db, assistant, business, new HttpContextAccessor { HttpContext = new DefaultHttpContext() });
        var agent = new AiAgentService(db, business, actions, config, factory, NullLogger<AiAgentService>.Instance);
        var turn = await agent.AgentChatAsync(tenant, user, new("Synthetic test: what is 2 plus 2? Reply with 4 only. Do not call tools."), ct: TestContext.Current.CancellationToken);
        Assert.True(turn.Success);
        Assert.False(turn.Data!.IsFallback);
        Assert.Contains("4", turn.Data.Reply);
        Assert.Empty(db.BusinessPayments);
        Assert.Empty(db.Sales);
    }
}

using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class ProviderResponseTests
{
    private sealed class Factory(object payload) : HttpMessageHandler, IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(this, disposeHandler: false);
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Assert.Empty(request.RequestUri!.Query);
            Assert.Equal("synthetic-key", Assert.Single(request.Headers.GetValues("x-goog-api-key")));
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(payload) });
        }
    }

    [Fact]
    public async Task ChatUsesHeaderCredentialsAndJoinsAnswersWithoutReasoning()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var tenant = Guid.NewGuid();
        db.Tenants.Add(new Tenant { Id = tenant, CompanyName = "Synthetic test", ApiKey = "synthetic", BaseCurrency = "VND", PlanType = "Business", Status = "Active" });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["AI_PROVIDER_API_KEY"] = "synthetic-key" }).Build();
        var factory = new Factory(new { candidates = new[] { new { content = new { parts = new object[] { new { text = "private reasoning", thought = true }, new { text = "First" }, new { text = "Second" } } } } } });
        var service = new AiAssistantService(db, new BusinessService(db), config, factory, NullLogger<AiAssistantService>.Instance);
        var result = await service.ChatAsync(tenant, "Suggest a simple organization technique.", ct: TestContext.Current.CancellationToken);
        Assert.True(result.Success);
        Assert.Equal("First\nSecond", result.Data!.Reply);
        Assert.False(result.Data.IsFallback);
    }
}

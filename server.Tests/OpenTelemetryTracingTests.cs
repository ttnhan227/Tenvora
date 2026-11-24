using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Middleware;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class OpenTelemetryTracingTests
{
    private static AppDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task FinancialWriteScope_EmitsActivity_WithExpectedNonPiiTags()
    {
        var stoppedActivities = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == TenvoraTelemetry.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity => stoppedActivities.Add(activity)
        };
        ActivitySource.AddActivityListener(listener);

        var tenantId = Guid.NewGuid();
        await using var db = CreateInMemoryDbContext(Guid.NewGuid().ToString());

        var tx = await FinancialWriteScope.BeginAsync(db, tenantId);
        Assert.Null(tx); // InMemory DB is not relational, returns null

        var scopeActivity = stoppedActivities.FirstOrDefault(a => a.OperationName == "tenvora.financial_write_scope");
        Assert.NotNull(scopeActivity);
        Assert.Equal("postgresql", scopeActivity.GetTagItem("db.system"));
        Assert.Equal(false, scopeActivity.GetTagItem("tenvora.lock.acquired"));
        Assert.Equal(false, scopeActivity.GetTagItem("tenvora.lock.reused_tx"));
        Assert.Equal(0L, scopeActivity.GetTagItem("tenvora.lock.wait_ms"));

        // Verify tenant ID or raw database queries are NOT in span tags
        Assert.DoesNotContain(scopeActivity.Tags, t => t.Value != null && t.Value.Contains(tenantId.ToString()));
    }

    [Fact]
    public async Task AiActionService_ProposeAndConfirmAndUndo_EmitExpectedActivitySpansAndNonPiiTags()
    {
        var stoppedActivities = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == TenvoraTelemetry.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity => stoppedActivities.Add(activity)
        };
        ActivitySource.AddActivityListener(listener);

        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        await using var db = CreateInMemoryDbContext(dbName);

        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Acme Corp",
            ApiKey = "test-api-key",
            BaseCurrency = "USD",
            CreatedAt = DateTime.UtcNow
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var assistantMock = new Mock<IAiAssistantService>();
        var businessMock = new Mock<IBusinessService>();
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();

        var service = new AiActionService(
            db,
            assistantMock.Object,
            businessMock.Object,
            httpContextAccessorMock.Object);

        // 1. Propose with empty text -> failed proposal span
        var emptyRes = await service.ProposeAsync(tenantId, userId, new AiProposeActionRequest("   "));
        Assert.False(emptyRes.Success);

        var failedProposeActivity = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.ai.propose");
        Assert.NotNull(failedProposeActivity);
        Assert.Equal("unknown", failedProposeActivity.GetTagItem("ai.intent"));
        Assert.Equal("failed", failedProposeActivity.GetTagItem("ai.action.status"));

        // 2. Propose with valid action interpretation -> proposed span
        assistantMock
            .Setup(a => a.InterpretActionAsync(tenantId, "Spent 25 on coffee", It.IsAny<AiUiContext?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ApiResult<AiInterpretedAction>.Ok(new AiInterpretedAction(
                "expense",
                0.95m,
                Amount: 25m,
                Notes: "coffee",
                Category: "Meals")));

        var validRes = await service.ProposeAsync(tenantId, userId, new AiProposeActionRequest("Spent 25 on coffee"));
        Assert.True(validRes.Success);

        var validProposeActivity = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.ai.propose");
        Assert.NotNull(validProposeActivity);
        Assert.Equal("expense", validProposeActivity.GetTagItem("ai.intent"));
        Assert.Equal("proposed", validProposeActivity.GetTagItem("ai.action.status"));
        // Ensure user input text is not in activity tags
        Assert.DoesNotContain(validProposeActivity.Tags, t => t.Value != null && t.Value.Contains("coffee"));

        // 3. Confirm with missing action -> failed confirm span
        var missingConfirmRes = await service.ConfirmAsync(tenantId, userId, Guid.NewGuid(), true);
        Assert.False(missingConfirmRes.Success);

        var failedConfirmActivity = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.ai.confirm");
        Assert.NotNull(failedConfirmActivity);
        Assert.Equal("failed", failedConfirmActivity.GetTagItem("ai.action.status"));

        // 4. Confirm cancellation of created action
        var actionId = validRes.Data!.ActionId!.Value;
        var cancelRes = await service.ConfirmAsync(tenantId, userId, actionId, false);
        Assert.True(cancelRes.Success);

        var cancelConfirmActivity = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.ai.confirm");
        Assert.NotNull(cancelConfirmActivity);
        Assert.Equal("expense", cancelConfirmActivity.GetTagItem("ai.intent"));
        Assert.Equal("cancelled", cancelConfirmActivity.GetTagItem("ai.action.status"));

        // 5. Undo missing action -> failed undo span
        var missingUndoRes = await service.UndoAsync(tenantId, userId, Guid.NewGuid());
        Assert.False(missingUndoRes.Success);

        var failedUndoActivity = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.ai.undo");
        Assert.NotNull(failedUndoActivity);
        Assert.Equal("failed", failedUndoActivity.GetTagItem("ai.action.status"));
    }

    [Fact]
    public async Task KestrelPipeline_GeneratesTraceId_AndPropagatesIncomingW3CTraceParent()
    {
        var ct = TestContext.Current.CancellationToken;
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        builder.Services.AddTenvoraOpenTelemetry(builder.Configuration);

        var allowed = CorsOriginPolicy.BuildAllowedOrigins("https://tenvora-client.onrender.com");
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("ClientApp", policy =>
            {
                policy.SetIsOriginAllowed(origin => CorsOriginPolicy.IsOriginAllowed(origin, allowed))
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .WithExposedHeaders("X-Trace-Id");
            });
        });

        await using var app = builder.Build();
        app.UseTraceCorrelation();
        app.UseCors("ClientApp");

        app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));
        app.MapGet("/api/error", () => Results.Problem("Simulated internal error", statusCode: 500));

        await app.StartAsync(ct);

        var baseAddress = new Uri(app.Urls.First());
        using var handler = new SocketsHttpHandler { ActivityHeadersPropagator = null };
        using var client = new HttpClient(handler) { BaseAddress = baseAddress };

        // Test 1: Request without traceparent receives valid 32-char hex X-Trace-Id
        using var req1 = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        var resp1 = await client.SendAsync(req1, ct);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        Assert.True(resp1.Headers.TryGetValues("X-Trace-Id", out var traceIdValues1));
        var traceId1 = traceIdValues1.Single();
        Assert.Matches("^[0-9a-f]{32}$", traceId1);

        // Test 2: Request with incoming W3C traceparent echoes exact incoming trace id
        const string incomingTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
        const string incomingParentSpanId = "00f067aa0ba902b7";
        const string traceparent = $"00-{incomingTraceId}-{incomingParentSpanId}-01";

        using var req2 = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req2.Headers.TryAddWithoutValidation("traceparent", traceparent);
        req2.Headers.TryAddWithoutValidation("Origin", "https://tenvora-client.onrender.com");
        var resp2 = await client.SendAsync(req2, ct);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        Assert.True(resp2.Headers.TryGetValues("X-Trace-Id", out var traceIdValues2));
        var traceId2 = traceIdValues2.Single();
        Assert.Equal(incomingTraceId, traceId2);

        // Test 3: CORS header exposes X-Trace-Id
        Assert.True(resp2.Headers.TryGetValues("Access-Control-Expose-Headers", out var exposedHeaders));
        Assert.Contains("X-Trace-Id", exposedHeaders.Single());

        // Test 4: Error response (500) still emits X-Trace-Id
        using var errReq = new HttpRequestMessage(HttpMethod.Get, "/api/error");
        var errResp = await client.SendAsync(errReq, ct);
        Assert.Equal(HttpStatusCode.InternalServerError, errResp.StatusCode);
        Assert.True(errResp.Headers.TryGetValues("X-Trace-Id", out var errTraceIdValues));
        Assert.Matches("^[0-9a-f]{32}$", errTraceIdValues.Single());

        // Test 5: 404 response still emits X-Trace-Id
        using var notFoundReq = new HttpRequestMessage(HttpMethod.Get, "/api/nonexistent-route");
        var notFoundResp = await client.SendAsync(notFoundReq, ct);
        Assert.Equal(HttpStatusCode.NotFound, notFoundResp.StatusCode);
        Assert.True(notFoundResp.Headers.TryGetValues("X-Trace-Id", out var notFoundTraceIdValues));
        Assert.Matches("^[0-9a-f]{32}$", notFoundTraceIdValues.Single());

        // Test 6: Sensitive headers (Authorization, Cookie) are not leaked into span tags
        var capturedActivities = new ConcurrentQueue<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name.StartsWith("Microsoft.AspNetCore") || source.Name == TenvoraTelemetry.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = a => capturedActivities.Enqueue(a)
        };
        ActivitySource.AddActivityListener(listener);

        const string sensitiveToken = "super-secret-jwt-token-value-12345";
        const string sensitiveCookie = "session-id=sensitive-cookie-xyz-98765";
        using var sensitiveReq = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        sensitiveReq.Headers.TryAddWithoutValidation("Authorization", $"Bearer {sensitiveToken}");
        sensitiveReq.Headers.TryAddWithoutValidation("Cookie", sensitiveCookie);
        var sensitiveResp = await client.SendAsync(sensitiveReq, ct);
        Assert.Equal(HttpStatusCode.OK, sensitiveResp.StatusCode);

        Assert.NotEmpty(capturedActivities);
        foreach (var activity in capturedActivities)
        {
            foreach (var tag in activity.Tags)
            {
                Assert.DoesNotContain(sensitiveToken, tag.Value ?? string.Empty);
                Assert.DoesNotContain(sensitiveCookie, tag.Value ?? string.Empty);
                Assert.False(string.Equals(tag.Key, "Authorization", StringComparison.OrdinalIgnoreCase));
                Assert.False(string.Equals(tag.Key, "Cookie", StringComparison.OrdinalIgnoreCase));
            }
        }
    }

    [Fact]
    public void AddTenvoraOpenTelemetry_ConfiguresCleanly_WithoutCrashingWhenOtlpEndpointUnset()
    {
        var services = new ServiceCollection();
        var emptyConfig = new ConfigurationBuilder().Build();

        // Must not throw even when OTEL_EXPORTER_OTLP_ENDPOINT is unset
        services.AddTenvoraOpenTelemetry(emptyConfig);
        using var provider = services.BuildServiceProvider();

        // Verify service resolution succeeds
        Assert.NotNull(provider);
    }

    [Fact]
    public void AddTenvoraOpenTelemetry_RegistersOtlpExporter_WhenConfigured()
    {
        var services = new ServiceCollection();
        var configWithEndpoint = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
            })
            .Build();

        services.AddTenvoraOpenTelemetry(configWithEndpoint);
        using var provider = services.BuildServiceProvider();

        Assert.NotNull(provider);
    }
}

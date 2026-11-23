using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Localization;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class WebhookReliabilityTests
{
    private const string TestJwtSecret = "tenvora-webhook-reliability-test-jwt-secret-key-at-least-32-bytes";

    private sealed class MutableTimeProvider(DateTimeOffset initialUtc) : TimeProvider
    {
        private DateTimeOffset _utcNow = initialUtc;
        public override DateTimeOffset GetUtcNow() => _utcNow;
        public void Advance(TimeSpan delta) => _utcNow = _utcNow.Add(delta);
        public void SetUtcNow(DateTimeOffset utcNow) => _utcNow = utcNow;
    }

    private sealed record CapturedRequest(
        Uri? RequestUri,
        string Body,
        Dictionary<string, string> Headers);

    private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, int, HttpResponseMessage> responder) : HttpMessageHandler
    {
        private int _callCount;
        public List<CapturedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var attempt = Interlocked.Increment(ref _callCount);
            var body = request.Content != null ? await request.Content.ReadAsStringAsync(cancellationToken) : string.Empty;
            var headers = request.Headers.ToDictionary(
                h => h.Key,
                h => string.Join(",", h.Value),
                StringComparer.OrdinalIgnoreCase);

            Requests.Add(new CapturedRequest(request.RequestUri, body, headers));
            return responder(request, attempt);
        }
    }

    private sealed class StaticHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private static AppDbContext CreateInMemoryDb(string dbName, IHttpContextAccessor? httpContextAccessor = null)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName);

        if (httpContextAccessor != null)
            builder.AddInterceptors(new AuditLogSaveChangesInterceptor(httpContextAccessor));

        return new AppDbContext(builder.Options);
    }

    private static async Task<(Guid TenantId, Guid CustomerId, Guid ProductId)> SeedLedgerTenantAsync(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Webhook Ledger Co",
            ApiKey = $"api_{tenantId:N}",
            BaseCurrency = "USD",
            CreatedAt = DateTime.UtcNow
        });

        db.Customers.Add(new Customer
        {
            Id = customerId,
            TenantId = tenantId,
            Name = "Acme Customer",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        db.Products.Add(new Product
        {
            Id = productId,
            TenantId = tenantId,
            Name = "Widget Pro",
            Unit = "pcs",
            DefaultPrice = 50m,
            CostPrice = 20m,
            StockQuantity = 100m,
            Currency = "USD",
            IsActive = true,
            TrackInventory = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return (tenantId, customerId, productId);
    }

    [Fact]
    public async Task TransactionalOutbox_EnqueuesSalePaymentAndInventoryEvents_AndSkipsWhenUnsubscribed()
    {
        await using var db = CreateInMemoryDb($"wh_outbox_{Guid.NewGuid():N}");
        var (tenantId, customerId, productId) = await SeedLedgerTenantAsync(db);
        var business = new BusinessService(db);

        // 1. Without any active webhook endpoint, ledger writes insert ZERO outbox rows.
        var saleNoHook = await business.CreateSaleAsync(
            tenantId,
            "sale-no-hook-1",
            new CreateSaleRequest(customerId, [new CreateSaleItemRequest(productId, 1, 50m)], 0m, "Cash", null, null));
        Assert.True(saleNoHook.Success);
        Assert.Empty(await db.WebhookOutboxEvents.ToListAsync());

        // 2. Register an active endpoint subscribed to all 3 events.
        var endpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Url = "https://hooks.example.com/tenvora",
            SigningSecret = WebhookSignature.GenerateSecret(),
            EventTypes = string.Join(',', WebhookEventTypes.SaleRecorded, WebhookEventTypes.PaymentReceived, WebhookEventTypes.InventoryAdjusted),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.WebhookEndpoints.Add(endpoint);
        await db.SaveChangesAsync();

        // 3. Record sale inside an active trace -> enqueues sale.recorded with TraceParent.
        using var originActivity = new Activity("test.origin.sale").Start();
        var saleResult = await business.CreateSaleAsync(
            tenantId,
            "sale-with-hook-1",
            new CreateSaleRequest(customerId, [new CreateSaleItemRequest(productId, 2, 50m)], 0m, "Cash", null, null));
        Assert.True(saleResult.Success);
        originActivity.Stop();

        // 4. Record payment -> enqueues payment.received.
        var paymentResult = await business.RecordPaymentAsync(
            tenantId,
            saleResult.Data!.Id,
            "pay-with-hook-1",
            new RecordBusinessPaymentRequest(40m, "Bank", "REF-1", null, null));
        Assert.True(paymentResult.Success);

        // 5. Record stock adjustment -> enqueues inventory.adjusted.
        var adjResult = await business.CreateStockAdjustmentAsync(
            tenantId,
            Guid.NewGuid(),
            new CreateStockAdjustmentRequest(productId, -5m, "damage", "Damaged box"),
            "adj-with-hook-1");
        Assert.True(adjResult.Success);

        var outboxEvents = await db.WebhookOutboxEvents.OrderBy(e => e.CreatedAt).ToListAsync();
        Assert.Equal(3, outboxEvents.Count);
        Assert.Contains(outboxEvents, e => e.EventType == WebhookEventTypes.SaleRecorded);
        Assert.Contains(outboxEvents, e => e.EventType == WebhookEventTypes.PaymentReceived);
        Assert.Contains(outboxEvents, e => e.EventType == WebhookEventTypes.InventoryAdjusted);

        var saleEvent = outboxEvents.Single(e => e.EventType == WebhookEventTypes.SaleRecorded);
        Assert.Equal(WebhookOutboxStatuses.Pending, saleEvent.Status);
        Assert.Equal(originActivity.Id, saleEvent.TraceParent);
        Assert.StartsWith("whd_", saleEvent.DeliveryId);

        using var doc = JsonDocument.Parse(saleEvent.PayloadJson);
        Assert.Equal(WebhookEventTypes.SaleRecorded, doc.RootElement.GetProperty("eventType").GetString());
        Assert.Equal(saleEvent.DeliveryId, doc.RootElement.GetProperty("deliveryId").GetString());
        Assert.Equal(tenantId.ToString(), doc.RootElement.GetProperty("tenantId").GetString());
    }

    [Fact]
    public void WebhookSignature_ComputesAndVerifiesWithConstantTimeComparison()
    {
        var secret = WebhookSignature.GenerateSecret();
        const long timestamp = 1760000000;
        const string payload = """{"eventType":"sale.recorded","amount":100}""";

        var signature = WebhookSignature.Compute(secret, timestamp, payload);

        Assert.StartsWith($"t={timestamp},v1=", signature);
        Assert.True(WebhookSignature.Verify(secret, timestamp, payload, signature));
        Assert.False(WebhookSignature.Verify(secret, timestamp, payload + " ", signature));
        Assert.False(WebhookSignature.Verify(secret, timestamp + 1, payload, signature));
        Assert.False(WebhookSignature.Verify("wrong-secret", timestamp, payload, signature));
        Assert.False(WebhookSignature.Verify(secret, timestamp, payload, "t=1760000000,v1=deadbeef"));
        Assert.False(WebhookSignature.Verify(secret, timestamp, payload, null));
    }

    [Theory]
    [InlineData("http://hooks.example.com/tenvora")]
    [InlineData("https://127.0.0.1/hook")]
    [InlineData("https://localhost/hook")]
    [InlineData("https://sub.localhost/hook")]
    [InlineData("https://169.254.169.254/latest/meta-data/")]
    [InlineData("https://metadata.google.internal/computeMetadata/v1/")]
    [InlineData("https://10.0.0.1/hook")]
    [InlineData("https://172.16.0.10/hook")]
    [InlineData("https://192.168.1.1/hook")]
    [InlineData("https://[::1]/hook")]
    [InlineData("https://[fc00::1]/hook")]
    [InlineData("https://[fe80::1]/hook")]
    [InlineData("file:///etc/passwd")]
    [InlineData("ftp://hooks.example.com/tenvora")]
    [InlineData("https://user:pass@hooks.example.com/tenvora")]
    public async Task WebhookUrlValidator_RejectsUnsafeOrNonHttpsUrls(string unsafeUrl)
    {
        var validator = new WebhookUrlValidator(resolveDns: false);
        var result = await validator.ValidateAsync(unsafeUrl);
        Assert.False(result.IsValid);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }

    [Fact]
    public async Task WebhookUrlValidator_AcceptsValidPublicHttps_AndRejectsPrivateDnsResolution()
    {
        var publicValidator = new WebhookUrlValidator(
            resolveDns: true,
            dnsResolver: (_, _) => Task.FromResult(new[] { IPAddress.Parse("93.184.216.34") }));

        var okResult = await publicValidator.ValidateAsync("https://hooks.example.com/tenvora");
        Assert.True(okResult.IsValid);
        Assert.Equal("https://hooks.example.com/tenvora", okResult.Uri?.ToString());

        var privateDnsValidator = new WebhookUrlValidator(
            resolveDns: true,
            dnsResolver: (_, _) => Task.FromResult(new[] { IPAddress.Parse("10.1.2.3") }));

        var blockedResult = await privateDnsValidator.ValidateAsync("https://rebind.example.com/tenvora");
        Assert.False(blockedResult.IsValid);
    }

    [Fact]
    public async Task DeliveryLifecycle_RetriesTransient503WithBackoff_DeadLetters_AndReplaysTo200WithStableDeliveryId()
    {
        await using var db = CreateInMemoryDb($"wh_lifecycle_{Guid.NewGuid():N}");
        var tenantId = Guid.NewGuid();
        var secret = WebhookSignature.GenerateSecret();
        var startUtc = new DateTimeOffset(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);
        var clock = new MutableTimeProvider(startUtc);

        var endpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Url = "https://hooks.example.com/receiver",
            SigningSecret = secret,
            EventTypes = WebhookEventTypes.SaleRecorded,
            IsActive = true,
            CreatedAt = startUtc.UtcDateTime,
            UpdatedAt = startUtc.UtcDateTime
        };

        const string originalTraceParent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
        var outboxEvent = new WebhookOutboxEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EndpointId = endpoint.Id,
            EventType = WebhookEventTypes.SaleRecorded,
            DeliveryId = "whd_stable_idempotency_key_001",
            PayloadJson = """{"eventId":"s1","deliveryId":"whd_stable_idempotency_key_001","eventType":"sale.recorded"}""",
            TraceParent = originalTraceParent,
            Status = WebhookOutboxStatuses.Pending,
            AttemptCount = 0,
            MaxAttempts = 3,
            NextAttemptAt = startUtc.UtcDateTime,
            CreatedAt = startUtc.UtcDateTime
        };

        db.WebhookEndpoints.Add(endpoint);
        db.WebhookOutboxEvents.Add(outboxEvent);
        await db.SaveChangesAsync();

        // First 3 attempts return 503; 4th attempt (after admin replay) returns 200 OK.
        using var handler = new StubHttpMessageHandler((_, attempt) =>
            attempt <= 3
                ? new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
                : new HttpResponseMessage(HttpStatusCode.OK));

        using var httpClient = new HttpClient(handler);
        var validator = new WebhookUrlValidator(resolveDns: false);
        var deliveryService = new WebhookDeliveryService(
            db,
            new StaticHttpClientFactory(httpClient),
            validator,
            NullLogger<WebhookDeliveryService>.Instance,
            clock);

        // Attempt 1 -> 503 -> Pending with +30s backoff
        Assert.Equal(1, await deliveryService.ProcessPendingBatchAsync());
        var after1 = await db.WebhookOutboxEvents.SingleAsync(e => e.Id == outboxEvent.Id);
        Assert.Equal(WebhookOutboxStatuses.Pending, after1.Status);
        Assert.Equal(1, after1.AttemptCount);
        Assert.Equal(503, after1.LastHttpStatusCode);
        var nextAttemptAfter1 = after1.NextAttemptAt;
        Assert.Equal(startUtc.UtcDateTime.AddSeconds(30), nextAttemptAfter1);

        // Not due yet at +10s
        clock.Advance(TimeSpan.FromSeconds(10));
        Assert.Equal(0, await deliveryService.ProcessPendingBatchAsync());

        // Attempt 2 at +30s -> 503 -> Pending with +60s backoff
        clock.Advance(TimeSpan.FromSeconds(20));
        Assert.Equal(1, await deliveryService.ProcessPendingBatchAsync());
        var after2 = await db.WebhookOutboxEvents.SingleAsync(e => e.Id == outboxEvent.Id);
        Assert.Equal(WebhookOutboxStatuses.Pending, after2.Status);
        Assert.Equal(2, after2.AttemptCount);
        var nextAttemptAfter2 = after2.NextAttemptAt;
        Assert.Equal(clock.GetUtcNow().UtcDateTime.AddSeconds(60), nextAttemptAfter2);
        Assert.True(nextAttemptAfter2 > nextAttemptAfter1);

        // Attempt 3 at +60s -> 503 -> exhausts MaxAttempts -> DeadLettered
        clock.Advance(TimeSpan.FromSeconds(60));
        Assert.Equal(1, await deliveryService.ProcessPendingBatchAsync());
        var after3 = await db.WebhookOutboxEvents.SingleAsync(e => e.Id == outboxEvent.Id);
        Assert.Equal(WebhookOutboxStatuses.DeadLettered, after3.Status);
        Assert.Equal(3, after3.AttemptCount);
        Assert.NotNull(after3.DeadLetteredAt);

        // Admin replay resets state while preserving DeliveryId
        clock.Advance(TimeSpan.FromMinutes(1));
        var replayResult = await deliveryService.ReplayDeliveryAsync(tenantId, outboxEvent.Id);
        Assert.True(replayResult.Success);
        Assert.Equal(WebhookOutboxStatuses.Pending, replayResult.Data!.Status);
        Assert.Equal(0, replayResult.Data.AttemptCount);
        Assert.Equal("whd_stable_idempotency_key_001", replayResult.Data.DeliveryId);

        // Attempt 4 -> 200 OK -> Delivered
        Assert.Equal(1, await deliveryService.ProcessPendingBatchAsync());
        var delivered = await db.WebhookOutboxEvents.SingleAsync(e => e.Id == outboxEvent.Id);
        Assert.Equal(WebhookOutboxStatuses.Delivered, delivered.Status);
        Assert.Equal(200, delivered.LastHttpStatusCode);
        Assert.NotNull(delivered.DeliveredAt);
        Assert.Null(delivered.DeadLetteredAt);

        // Assert headers & valid HMAC signature on EVERY single attempt
        Assert.Equal(4, handler.Requests.Count);
        foreach (var req in handler.Requests)
        {
            Assert.Equal(WebhookEventTypes.SaleRecorded, req.Headers["X-Tenvora-Event"]);
            Assert.Equal("whd_stable_idempotency_key_001", req.Headers["X-Tenvora-Delivery-Id"]);
            Assert.True(long.TryParse(req.Headers["X-Tenvora-Timestamp"], out var ts));
            Assert.True(WebhookSignature.Verify(secret, ts, req.Body, req.Headers["X-Tenvora-Signature"]));
            Assert.True(req.Headers.ContainsKey("traceparent"));
            Assert.Contains("4bf92f3577b34da6a3ce929d0e0e4736", req.Headers["traceparent"]);
        }
    }

    [Fact]
    public async Task Permanent400Response_ImmediatelyDeadLettersWithoutRetries()
    {
        await using var db = CreateInMemoryDb($"wh_perm400_{Guid.NewGuid():N}");
        var tenantId = Guid.NewGuid();
        var endpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Url = "https://hooks.example.com/bad-request",
            SigningSecret = WebhookSignature.GenerateSecret(),
            EventTypes = WebhookEventTypes.PaymentReceived,
            IsActive = true
        };
        var ev = new WebhookOutboxEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EndpointId = endpoint.Id,
            EventType = WebhookEventTypes.PaymentReceived,
            DeliveryId = "whd_perm_400_001",
            PayloadJson = """{"eventType":"payment.received"}""",
            Status = WebhookOutboxStatuses.Pending,
            MaxAttempts = 5,
            NextAttemptAt = DateTime.UtcNow.AddSeconds(-1)
        };
        db.WebhookEndpoints.Add(endpoint);
        db.WebhookOutboxEvents.Add(ev);
        await db.SaveChangesAsync();

        using var handler = new StubHttpMessageHandler((_, _) => new HttpResponseMessage(HttpStatusCode.BadRequest));
        using var httpClient = new HttpClient(handler);
        var deliveryService = new WebhookDeliveryService(
            db,
            new StaticHttpClientFactory(httpClient),
            new WebhookUrlValidator(resolveDns: false),
            NullLogger<WebhookDeliveryService>.Instance);

        Assert.Equal(1, await deliveryService.ProcessPendingBatchAsync());

        var updated = await db.WebhookOutboxEvents.SingleAsync(e => e.Id == ev.Id);
        Assert.Equal(WebhookOutboxStatuses.DeadLettered, updated.Status);
        Assert.Equal(1, updated.AttemptCount);
        Assert.Equal(400, updated.LastHttpStatusCode);
        Assert.NotNull(updated.DeadLetteredAt);
    }

    [Fact]
    public async Task WebhookDelivery_EmitsOpenTelemetrySpanWithNonPiiTags_AndNeverLeaksSecret()
    {
        var stoppedActivities = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == TenvoraTelemetry.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = a => stoppedActivities.Add(a)
        };
        ActivitySource.AddActivityListener(listener);

        await using var db = CreateInMemoryDb($"wh_otel_{Guid.NewGuid():N}");
        var secret = WebhookSignature.GenerateSecret();
        var endpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            Url = "https://hooks.example.com/otel",
            SigningSecret = secret,
            EventTypes = WebhookEventTypes.InventoryAdjusted,
            IsActive = true
        };
        const string originTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
        var ev = new WebhookOutboxEvent
        {
            Id = Guid.NewGuid(),
            TenantId = endpoint.TenantId,
            EndpointId = endpoint.Id,
            EventType = WebhookEventTypes.InventoryAdjusted,
            DeliveryId = "whd_otel_001",
            PayloadJson = """{"eventType":"inventory.adjusted","secretPayloadMarker":"do-not-tag"}""",
            TraceParent = $"00-{originTraceId}-00f067aa0ba902b7-01",
            Status = WebhookOutboxStatuses.Pending,
            NextAttemptAt = DateTime.UtcNow.AddSeconds(-1)
        };
        db.WebhookEndpoints.Add(endpoint);
        db.WebhookOutboxEvents.Add(ev);
        await db.SaveChangesAsync();

        using var handler = new StubHttpMessageHandler((_, _) => new HttpResponseMessage(HttpStatusCode.OK));
        using var httpClient = new HttpClient(handler);
        var deliveryService = new WebhookDeliveryService(
            db,
            new StaticHttpClientFactory(httpClient),
            new WebhookUrlValidator(resolveDns: false),
            NullLogger<WebhookDeliveryService>.Instance);

        await deliveryService.ProcessPendingBatchAsync();

        var span = stoppedActivities.LastOrDefault(a => a.OperationName == "tenvora.webhook.deliver");
        Assert.NotNull(span);
        Assert.Equal(WebhookEventTypes.InventoryAdjusted, span.GetTagItem("webhook.event_type"));
        Assert.Equal(1, span.GetTagItem("webhook.attempt"));
        Assert.Equal(WebhookOutboxStatuses.Delivered, span.GetTagItem("webhook.status"));
        Assert.Equal(200, span.GetTagItem("http.status_code"));
        Assert.Equal(originTraceId, span.TraceId.ToString());

        // Never leak SigningSecret or raw payload into span tags
        Assert.DoesNotContain(span.Tags, t => t.Value != null && t.Value.Contains(secret, StringComparison.Ordinal));
        Assert.DoesNotContain(span.Tags, t => t.Value != null && t.Value.Contains("do-not-tag", StringComparison.Ordinal));
    }

    [Fact]
    public async Task WebhooksController_EnforcesRbacTenantIsolationSecretRedactionAndAuditRedaction()
    {
        var ct = TestContext.Current.CancellationToken;
        var dbName = $"wh_http_{Guid.NewGuid():N}";

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        builder.Services.AddLocalization();
        builder.Services.AddSingleton<IAppLocalizer, AppLocalizer>();
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(WebhooksController).Assembly);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<AuditLogSaveChangesInterceptor>();

        var jwtSettings = new JwtSettings
        {
            Issuer = "Tenvora",
            Audience = "Tenvora",
            Secret = TestJwtSecret,
            AccessTokenMinutes = 60
        };
        builder.Services.AddSingleton(Options.Create(jwtSettings));
        builder.Services.AddSingleton<TokenService>();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ClockSkew = TimeSpan.Zero
                };
            });
        builder.Services.AddAuthorization();

        builder.Services.AddDbContext<AppDbContext>((sp, options) =>
            options.UseInMemoryDatabase(dbName)
                   .AddInterceptors(sp.GetRequiredService<AuditLogSaveChangesInterceptor>()));

        builder.Services.AddSingleton<IWebhookUrlValidator>(new WebhookUrlValidator(resolveDns: false));
        builder.Services.AddHttpClient(WebhookOptions.HttpClientName);
        builder.Services.AddScoped<IWebhookDeliveryService, WebhookDeliveryService>();

        await using var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync(ct);

        var tokens = app.Services.GetRequiredService<TokenService>();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var adminAToken = tokens.CreateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            Email = "admin-a@example.com",
            Role = "TenantAdmin",
            PasswordHash = "hash",
            IsActive = true
        });
        var opsAToken = tokens.CreateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            Email = "ops-a@example.com",
            Role = "OperationsManager",
            PasswordHash = "hash",
            IsActive = true
        });
        var adminBToken = tokens.CreateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB,
            Email = "admin-b@example.com",
            Role = "TenantAdmin",
            PasswordHash = "hash",
            IsActive = true
        });

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

        // 1. Unauthenticated -> 401
        var unauthResp = await client.GetAsync("/api/webhooks/endpoints", ct);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // 2. OperationsManager -> 403
        using var opsReq = new HttpRequestMessage(HttpMethod.Get, "/api/webhooks/endpoints");
        opsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opsAToken);
        var opsResp = await client.SendAsync(opsReq, ct);
        Assert.Equal(HttpStatusCode.Forbidden, opsResp.StatusCode);

        // 3. TenantAdmin A creates endpoint -> 201 and receives SigningSecret ONCE
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/endpoints")
        {
            Content = JsonContent.Create(new CreateWebhookEndpointRequest(
                "https://hooks.example.com/tenant-a",
                [WebhookEventTypes.SaleRecorded, WebhookEventTypes.PaymentReceived],
                "Primary ERP hook"))
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAToken);
        var createResp = await client.SendAsync(createReq, ct);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdBody = await createResp.Content.ReadFromJsonAsync<ApiResult<CreateWebhookEndpointResponseDto>>(ct);
        Assert.NotNull(createdBody?.Data);
        var createdSecret = createdBody!.Data!.SigningSecret;
        var endpointAId = createdBody.Data.Id;
        Assert.StartsWith("whsec_", createdSecret);

        // 4. GET /api/webhooks/endpoints NEVER returns raw SigningSecret
        using var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/webhooks/endpoints");
        listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAToken);
        var listResp = await client.SendAsync(listReq, ct);
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var listRawJson = await listResp.Content.ReadAsStringAsync(ct);
        Assert.DoesNotContain(createdSecret, listRawJson, StringComparison.Ordinal);

        // 5. AuditLogs recorded WebhookEndpoint creation and REDACTED SigningSecret
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var auditLogs = await db.AuditLogs
                .Where(a => a.EntityType == nameof(WebhookEndpoint) && a.EntityId == endpointAId.ToString())
                .ToListAsync(ct);
            Assert.NotEmpty(auditLogs);
            Assert.All(auditLogs, log =>
            {
                Assert.DoesNotContain(createdSecret, log.NewValue ?? string.Empty, StringComparison.Ordinal);
                Assert.DoesNotContain(createdSecret, log.OldValue ?? string.Empty, StringComparison.Ordinal);
                Assert.DoesNotContain(createdSecret, log.Notes ?? string.Empty, StringComparison.Ordinal);
            });

            // Seed a dead-lettered delivery for Tenant A
            db.WebhookOutboxEvents.Add(new WebhookOutboxEvent
            {
                Id = Guid.NewGuid(),
                TenantId = tenantA,
                EndpointId = endpointAId,
                EventType = WebhookEventTypes.SaleRecorded,
                DeliveryId = "whd_tenant_a_dlq_1",
                PayloadJson = """{"eventType":"sale.recorded"}""",
                Status = WebhookOutboxStatuses.DeadLettered,
                AttemptCount = 5,
                MaxAttempts = 5,
                DeadLetteredAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        Guid deliveryAId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            deliveryAId = (await db.WebhookOutboxEvents.SingleAsync(e => e.TenantId == tenantA, ct)).Id;
        }

        // 6. Tenant B cannot see, delete, or replay Tenant A's endpoint or delivery
        using var listBReq = new HttpRequestMessage(HttpMethod.Get, "/api/webhooks/endpoints");
        listBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminBToken);
        var listBResp = await client.SendAsync(listBReq, ct);
        var listB = await listBResp.Content.ReadFromJsonAsync<ApiResult<List<WebhookEndpointDto>>>(ct);
        Assert.Empty(listB!.Data!);

        using var delBReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/webhooks/endpoints/{endpointAId}");
        delBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminBToken);
        var delBResp = await client.SendAsync(delBReq, ct);
        Assert.Equal(HttpStatusCode.NotFound, delBResp.StatusCode);

        using var replayBReq = new HttpRequestMessage(HttpMethod.Post, $"/api/webhooks/deliveries/{deliveryAId}/replay");
        replayBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminBToken);
        var replayBResp = await client.SendAsync(replayBReq, ct);
        Assert.Equal(HttpStatusCode.NotFound, replayBResp.StatusCode);

        // 7. Tenant A can inspect DLQ and replay its own delivery
        using var dlqAReq = new HttpRequestMessage(HttpMethod.Get, "/api/webhooks/deliveries?status=DeadLettered&limit=50");
        dlqAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAToken);
        var dlqAResp = await client.SendAsync(dlqAReq, ct);
        Assert.Equal(HttpStatusCode.OK, dlqAResp.StatusCode);
        var dlqList = await dlqAResp.Content.ReadFromJsonAsync<ApiResult<List<WebhookDeliveryDto>>>(ct);
        Assert.Single(dlqList!.Data!);

        using var replayAReq = new HttpRequestMessage(HttpMethod.Post, $"/api/webhooks/deliveries/{deliveryAId}/replay");
        replayAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAToken);
        var replayAResp = await client.SendAsync(replayAReq, ct);
        Assert.Equal(HttpStatusCode.OK, replayAResp.StatusCode);
        var replayed = await replayAResp.Content.ReadFromJsonAsync<ApiResult<WebhookDeliveryDto>>(ct);
        Assert.Equal(WebhookOutboxStatuses.Pending, replayed!.Data!.Status);
        Assert.Equal(0, replayed.Data.AttemptCount);
        Assert.Equal("whd_tenant_a_dlq_1", replayed.Data.DeliveryId);

        // 8. Tenant A can delete its own endpoint
        using var delAReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/webhooks/endpoints/{endpointAId}");
        delAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAToken);
        var delAResp = await client.SendAsync(delAReq, ct);
        Assert.Equal(HttpStatusCode.OK, delAResp.StatusCode);
    }

    [Fact]
    public void AppDbContext_HasZeroPendingEfCoreModelChanges_RelativeToModelSnapshot()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=tenvora_model_check;Username=postgres;Password=postgres")
            .Options;

        using var db = new AppDbContext(options);
        var migrationsAssembly = db.GetService<IMigrationsAssembly>();
        var modelDiffer = db.GetService<IMigrationsModelDiffer>();
        var designTimeModel = db.GetService<IDesignTimeModel>().Model;
        var modelRuntimeInitializer = db.GetService<IModelRuntimeInitializer>();

        var snapshotModel = migrationsAssembly.ModelSnapshot?.Model;
        Assert.NotNull(snapshotModel);

        var finalizedSnapshot = modelRuntimeInitializer.Initialize(snapshotModel!);
        var hasDifferences = modelDiffer.HasDifferences(
            finalizedSnapshot.GetRelationalModel(),
            designTimeModel.GetRelationalModel());

        Assert.False(hasDifferences, "AppDbContext has pending EF Core model changes not captured in AppDbContextModelSnapshot.");
    }
}

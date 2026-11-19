using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Tenvora.Api.Common;
using Xunit;

namespace Tenvora.Tests;

public class CorsOriginPolicyTests
{
    [Fact]
    public void IsOriginAllowed_AllowsConfiguredClientOrigins_WithSanitization()
    {
        var allowed = CorsOriginPolicy.BuildAllowedOrigins(
            " \"https://tenvora-client.onrender.com/\", 'https://app.tenvora.io' , invalid-origin ");

        Assert.True(CorsOriginPolicy.IsOriginAllowed("https://tenvora-client.onrender.com", allowed));
        Assert.True(CorsOriginPolicy.IsOriginAllowed("https://TENVORA-CLIENT.onrender.com", allowed));
        Assert.True(CorsOriginPolicy.IsOriginAllowed("https://app.tenvora.io", allowed));
        Assert.False(CorsOriginPolicy.IsOriginAllowed("https://evil.example.com", allowed));
        Assert.False(CorsOriginPolicy.IsOriginAllowed("https://tenvora-client.onrender.com.evil.com", allowed));
    }

    [Fact]
    public void IsOriginAllowed_AllowsLoopbackPorts_AndRejectsNonHttpSchemes()
    {
        var allowed = CorsOriginPolicy.BuildAllowedOrigins(null);

        Assert.True(CorsOriginPolicy.IsOriginAllowed("http://localhost:5173", allowed));
        Assert.True(CorsOriginPolicy.IsOriginAllowed("http://localhost:61234", allowed));
        Assert.True(CorsOriginPolicy.IsOriginAllowed("http://127.0.0.1:8080", allowed));
        Assert.True(CorsOriginPolicy.IsOriginAllowed("https://localhost:8443", allowed));

        Assert.False(CorsOriginPolicy.IsOriginAllowed("file://localhost/etc/passwd", allowed));
        Assert.False(CorsOriginPolicy.IsOriginAllowed("not-a-valid-uri", allowed));
        Assert.False(CorsOriginPolicy.IsOriginAllowed("", allowed));
        Assert.False(CorsOriginPolicy.IsOriginAllowed(null, allowed));
    }

    [Fact]
    public void CorsPolicyBuilder_WithCorsOriginPolicy_AllowsConfiguredOriginAndLoopback()
    {
        var allowed = CorsOriginPolicy.BuildAllowedOrigins("https://tenvora-client.onrender.com");
        var policy = new CorsPolicyBuilder()
            .SetIsOriginAllowed(origin => CorsOriginPolicy.IsOriginAllowed(origin, allowed))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .Build();

        Assert.True(policy.IsOriginAllowed("https://tenvora-client.onrender.com"));
        Assert.True(policy.IsOriginAllowed("http://localhost:55000"));
        Assert.False(policy.IsOriginAllowed("https://untrusted.example.com"));
    }

    [Fact]
    public async Task ClientAppCorsMiddleware_EmitsHeadersForAllowedOrigins_AndHandlesNullOrUnlistedSafely()
    {
        var ct = TestContext.Current.CancellationToken;
        var allowed = CorsOriginPolicy.BuildAllowedOrigins("https://tenvora-client.onrender.com");
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("ClientApp", policy =>
            {
                policy.SetIsOriginAllowed(origin => CorsOriginPolicy.IsOriginAllowed(origin, allowed))
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        await using var app = builder.Build();
        app.UseCors("ClientApp");
        app.MapGet("/health", () => Results.Ok(new { ok = true }));
        await app.StartAsync(ct);

        var baseAddress = new Uri(app.Urls.First());
        using var client = new HttpClient { BaseAddress = baseAddress };

        // 1. Configured CLIENT_ORIGINS entry receives Access-Control-Allow-Origin
        using var configuredReq = new HttpRequestMessage(HttpMethod.Get, "/health");
        configuredReq.Headers.TryAddWithoutValidation("Origin", "https://tenvora-client.onrender.com");
        var configuredResp = await client.SendAsync(configuredReq, ct);
        Assert.Equal(HttpStatusCode.OK, configuredResp.StatusCode);
        Assert.True(configuredResp.Headers.TryGetValues("Access-Control-Allow-Origin", out var configuredAcao));
        Assert.Contains("https://tenvora-client.onrender.com", configuredAcao);

        // 2. Localhost loopback still allowed
        using var localhostReq = new HttpRequestMessage(HttpMethod.Get, "/health");
        localhostReq.Headers.TryAddWithoutValidation("Origin", "http://localhost:5173");
        var localhostResp = await client.SendAsync(localhostReq, ct);
        Assert.Equal(HttpStatusCode.OK, localhostResp.StatusCode);
        Assert.True(localhostResp.Headers.TryGetValues("Access-Control-Allow-Origin", out var localhostAcao));
        Assert.Contains("http://localhost:5173", localhostAcao);

        // 3. Unlisted origin is denied CORS headers
        using var unlistedReq = new HttpRequestMessage(HttpMethod.Get, "/health");
        unlistedReq.Headers.TryAddWithoutValidation("Origin", "https://evil.example.com");
        var unlistedResp = await client.SendAsync(unlistedReq, ct);
        Assert.Equal(HttpStatusCode.OK, unlistedResp.StatusCode);
        Assert.False(unlistedResp.Headers.Contains("Access-Control-Allow-Origin"));

        // 4. Literal "null" Origin header does not throw UriFormatException / 500
        using var nullOriginReq = new HttpRequestMessage(HttpMethod.Get, "/health");
        nullOriginReq.Headers.TryAddWithoutValidation("Origin", "null");
        var nullOriginResp = await client.SendAsync(nullOriginReq, ct);
        Assert.Equal(HttpStatusCode.OK, nullOriginResp.StatusCode);
        Assert.False(nullOriginResp.Headers.Contains("Access-Control-Allow-Origin"));
    }
}

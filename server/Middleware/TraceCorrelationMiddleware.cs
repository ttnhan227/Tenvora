using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Tenvora.Api.Middleware;

/// <summary>
/// Early HTTP middleware that captures W3C distributed trace context, exposes X-Trace-Id on all responses,
/// and begins a structured logging scope containing TraceId, SpanId, and TenantId when available.
/// </summary>
public sealed class TraceCorrelationMiddleware(RequestDelegate next, ILogger<TraceCorrelationMiddleware> logger)
{
    public const string TraceIdHeader = "X-Trace-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString();
        if (string.IsNullOrWhiteSpace(traceId))
        {
            traceId = context.TraceIdentifier;
        }

        context.Response.Headers[TraceIdHeader] = traceId;

        context.Response.OnStarting(() =>
        {
            var activeTraceId = Activity.Current?.TraceId.ToString();
            if (!string.IsNullOrWhiteSpace(activeTraceId))
            {
                context.Response.Headers[TraceIdHeader] = activeTraceId;
            }
            return Task.CompletedTask;
        });

        var spanId = Activity.Current?.SpanId.ToString();
        var scopeState = new Dictionary<string, object>
        {
            ["TraceId"] = traceId
        };

        if (!string.IsNullOrWhiteSpace(spanId))
        {
            scopeState["SpanId"] = spanId;
        }

        var tenantId = context.User?.FindFirst("tenantId")?.Value
            ?? (context.Items.TryGetValue("TenantId", out var t) && t != null ? t.ToString() : null);

        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            scopeState["TenantId"] = tenantId;
        }

        using (logger.BeginScope(scopeState))
        {
            await next(context);
        }
    }
}

public static class TraceCorrelationMiddlewareExtensions
{
    public static IApplicationBuilder UseTraceCorrelation(this IApplicationBuilder builder) =>
        builder.UseMiddleware<TraceCorrelationMiddleware>();
}

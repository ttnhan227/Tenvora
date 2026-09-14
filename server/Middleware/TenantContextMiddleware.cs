using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;

namespace Tenvora.Api.Middleware;

/// <summary>
/// Pins an authenticated request to one open PostgreSQL connection and sets the
/// tenant session value used by RLS. Application queries must still include an
/// explicit tenant predicate; this is a second boundary, not a replacement.
/// </summary>
public sealed class TenantContextMiddleware(RequestDelegate next, ILogger<TenantContextMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var tenantClaim = context.User.FindFirst("tenantId")?.Value;
        if (!Guid.TryParse(tenantClaim, out var tenantId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(ApiResult.Fail("Token has an invalid workspace context."));
            return;
        }

        context.Items["TenantId"] = tenantId;
        var db = context.RequestServices.GetRequiredService<AppDbContext>();
        if (!db.Database.IsRelational())
        {
            await next(context);
            return;
        }

        var opened = false;
        try
        {
            await db.Database.OpenConnectionAsync(context.RequestAborted);
            opened = true;
            await db.Database.ExecuteSqlRawAsync(
                "SELECT set_config('app.current_tenant_id', {0}, false)",
                [tenantId.ToString()], context.RequestAborted);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            if (opened)
            {
                try { await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.current_tenant_id', '', false)", CancellationToken.None); }
                catch (Exception exception) { logger.LogCritical(exception, "Failed to clear a cancelled request's database workspace boundary."); }
                await db.Database.CloseConnectionAsync();
            }
            throw;
        }
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            logger.LogError(exception, "Failed to establish the database workspace boundary for correlation {CorrelationId}.",
                context.TraceIdentifier);
            try
            {
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                await context.Response.WriteAsJsonAsync(ApiResult.Fail("The workspace is temporarily unavailable."), context.RequestAborted);
            }
            finally
            {
                if (opened)
                {
                    try { await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.current_tenant_id', '', false)", CancellationToken.None); }
                    catch (Exception clearException) { logger.LogCritical(clearException, "Failed to clear a rejected request's database workspace boundary."); }
                    await db.Database.CloseConnectionAsync();
                }
            }
            return;
        }

        try
        {
            await next(context);
        }
        finally
        {
            try
            {
                // Do not use RequestAborted here: returning a pooled connection
                // with tenant state still attached could expose the next request.
                await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.current_tenant_id', '', false)", CancellationToken.None);
            }
            catch (Exception exception)
            {
                logger.LogCritical(exception, "Failed to clear the database workspace boundary before returning the connection.");
            }
            await db.Database.CloseConnectionAsync();
        }
    }
}

public static class TenantContextMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantContext(this IApplicationBuilder builder) =>
        builder.UseMiddleware<TenantContextMiddleware>();
}

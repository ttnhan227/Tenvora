using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Server.Common;
using Server.Data;

namespace Server.Middleware;

/// <summary>
/// Sets the PostgreSQL session variable app.current_tenant_id based on the authenticated user's tenant claim.
/// This is required for Row-Level Security (RLS) policies to filter data at the database level.
/// Must be placed AFTER UseAuthentication() in the pipeline.
/// </summary>
public class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Tenant context can only be set after authentication
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantIdClaim = context.User.FindFirst("tenantId")?.Value;
            if (!Guid.TryParse(tenantIdClaim, out var tenantId))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Token has an invalid tenant context." });
                return;
            }

            // Store in HttpContext.Items for use by services during this request
            context.Items["TenantId"] = tenantId;

            // Set the PostgreSQL session variable so RLS policies can filter data
            // Resolve the scoped DbContext from the request's service provider
            var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
            await dbContext.Database.ExecuteSqlRawAsync(
                "SELECT set_config('app.current_tenant_id', @p0, true)",
                tenantIdClaim);
        }
        else
        {
            // For unauthenticated requests, clear the tenant context so RLS blocks everything
            var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
            await dbContext.Database.ExecuteSqlRawAsync(
                "SELECT set_config('app.current_tenant_id', '', true)");
        }

        await _next(context);
    }
}

public static class TenantContextMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantContext(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantContextMiddleware>();
    }
}

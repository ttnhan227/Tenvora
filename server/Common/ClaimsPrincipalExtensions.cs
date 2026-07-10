using System.Security.Claims;

namespace Server.Common;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetTenantId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst("tenantId")?.Value;
        return Guid.TryParse(claim, out var tenantId) ? tenantId : Guid.Empty;
    }

    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var userId) ? userId : Guid.Empty;
    }

    public static string GetUserRole(this ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }

    public static string GetUserEmail(this ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
    }
}

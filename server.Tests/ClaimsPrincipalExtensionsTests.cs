using System.Security.Claims;
using Tenvora.Api.Common;
using Xunit;

namespace Tenvora.Tests;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetTenantId_ValidGuid_ReturnsGuid()
    {
        var tenantId = Guid.NewGuid();
        var claims = new List<Claim> { new("tenantId", tenantId.ToString()) };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        var result = principal.GetTenantId();

        Assert.Equal(tenantId, result);
    }

    [Fact]
    public void GetTenantId_MissingOrInvalid_ReturnsEmptyGuid()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());
        Assert.Equal(Guid.Empty, principal.GetTenantId());

        var invalidPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("tenantId", "invalid-guid") }));
        Assert.Equal(Guid.Empty, invalidPrincipal.GetTenantId());
    }
}

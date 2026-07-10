using System.Security.Claims;
using Server.Common;
using Xunit;

namespace Server.Tests;

public sealed class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetTenantId_WhenClaimIsValid_ReturnsTenantId()
    {
        var tenantId = Guid.NewGuid();
        var principal = Principal(new Claim("tenantId", tenantId.ToString()));

        Assert.Equal(tenantId, principal.GetTenantId());
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public void GetTenantId_WhenClaimIsInvalid_FailsClosed(string value)
    {
        var principal = Principal(new Claim("tenantId", value));

        Assert.Equal(Guid.Empty, principal.GetTenantId());
    }

    private static ClaimsPrincipal Principal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, "test"));
}

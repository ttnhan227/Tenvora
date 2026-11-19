using Microsoft.AspNetCore.Cors.Infrastructure;
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
}

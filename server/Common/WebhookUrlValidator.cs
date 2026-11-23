using System.Net;
using System.Net.Sockets;

namespace Tenvora.Api.Common;

public sealed record WebhookUrlValidationResult(bool IsValid, string? Error, Uri? Uri);

public interface IWebhookUrlValidator
{
    Task<WebhookUrlValidationResult> ValidateAsync(string? url, CancellationToken cancellationToken = default);
}

public sealed class WebhookUrlValidator : IWebhookUrlValidator
{
    private static readonly HashSet<string> BlockedHostnames = new(StringComparer.OrdinalIgnoreCase)
    {
        "localhost",
        "localhost.localdomain",
        "ip6-localhost",
        "ip6-loopback",
        "metadata",
        "metadata.google.internal",
        "metadata.goog"
    };

    private static readonly string[] BlockedHostSuffixes =
    [
        ".localhost",
        ".local",
        ".internal"
    ];

    private readonly bool _resolveDns;
    private readonly Func<string, CancellationToken, Task<IPAddress[]>> _dnsResolver;

    public WebhookUrlValidator(
        bool resolveDns = true,
        Func<string, CancellationToken, Task<IPAddress[]>>? dnsResolver = null)
    {
        _resolveDns = resolveDns;
        _dnsResolver = dnsResolver ?? Dns.GetHostAddressesAsync;
    }

    public static WebhookUrlValidationResult ValidateSyntax(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return new(false, "Webhook URL is required.", null);

        var trimmed = url.Trim();
        if (trimmed.Length > 500)
            return new(false, "Webhook URL must be 500 characters or fewer.", null);

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            return new(false, "Webhook URL must be a valid absolute HTTPS URL.", null);

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return new(false, "Webhook URL must use the https:// scheme.", null);

        if (!string.IsNullOrEmpty(uri.UserInfo))
            return new(false, "Webhook URL must not contain embedded credentials.", null);

        var host = uri.IdnHost?.Trim().TrimEnd('.');
        if (string.IsNullOrWhiteSpace(host))
            return new(false, "Webhook URL must include a valid host.", null);

        if (IsBlockedHostname(host))
            return new(false, "Webhook URL host is not allowed (loopback, local, or metadata host).", null);

        if (IPAddress.TryParse(host, out var ip))
        {
            if (IsDisallowedIpAddress(ip))
                return new(false, "Webhook URL cannot target loopback, private, link-local, or reserved IP addresses.", null);
        }

        return new(true, null, uri);
    }

    public async Task<WebhookUrlValidationResult> ValidateAsync(string? url, CancellationToken cancellationToken = default)
    {
        var syntax = ValidateSyntax(url);
        if (!syntax.IsValid || syntax.Uri == null)
            return syntax;

        var host = syntax.Uri.IdnHost.Trim().TrimEnd('.');
        if (!_resolveDns || IPAddress.TryParse(host, out _))
            return syntax;

        IPAddress[] addresses;
        try
        {
            addresses = await _dnsResolver(host, cancellationToken);
        }
        catch (Exception)
        {
            return new(false, "Webhook URL host could not be resolved via DNS.", null);
        }

        if (addresses.Length == 0)
            return new(false, "Webhook URL host did not resolve to any IP address.", null);

        foreach (var address in addresses)
        {
            if (IsDisallowedIpAddress(address))
                return new(false, "Webhook URL resolves to a disallowed private, loopback, or link-local IP address.", null);
        }

        return syntax;
    }

    public static bool IsBlockedHostname(string host)
    {
        if (BlockedHostnames.Contains(host))
            return true;

        foreach (var suffix in BlockedHostSuffixes)
        {
            if (host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    public static bool IsDisallowedIpAddress(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6)
            ip = ip.MapToIPv4();

        if (IPAddress.IsLoopback(ip) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.IPv6Any) || ip.Equals(IPAddress.Broadcast))
            return true;

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            if (b[0] == 0) return true;                                     // 0.0.0.0/8
            if (b[0] == 10) return true;                                    // 10.0.0.0/8 (RFC1918)
            if (b[0] == 100 && b[1] >= 64 && b[1] <= 127) return true;      // 100.64.0.0/10 (CGNAT)
            if (b[0] == 127) return true;                                   // 127.0.0.0/8 (Loopback)
            if (b[0] == 169 && b[1] == 254) return true;                    // 169.254.0.0/16 (Link-local / Cloud Metadata)
            if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;       // 172.16.0.0/12 (RFC1918)
            if (b[0] == 192 && b[1] == 0 && b[2] == 0) return true;         // 192.0.0.0/24
            if (b[0] == 192 && b[1] == 0 && b[2] == 2) return true;         // 192.0.2.0/24 (TEST-NET-1)
            if (b[0] == 192 && b[1] == 168) return true;                    // 192.168.0.0/16 (RFC1918)
            if (b[0] == 198 && (b[1] == 18 || b[1] == 19)) return true;     // 198.18.0.0/15 (Benchmarking)
            if (b[0] == 198 && b[1] == 51 && b[2] == 100) return true;      // 198.51.100.0/24 (TEST-NET-2)
            if (b[0] == 203 && b[1] == 0 && b[2] == 113) return true;       // 203.0.113.0/24 (TEST-NET-3)
            if (b[0] >= 224) return true;                                   // Multicast (224/4) & Reserved (240/4)
            return false;
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6Multicast || ip.IsIPv6SiteLocal || ip.IsIPv6Teredo)
                return true;

            var b = ip.GetAddressBytes();
            if ((b[0] & 0xFE) == 0xFC) return true;                         // fc00::/7 (Unique Local Address)
            if (b[0] == 0xFE && (b[1] & 0xC0) == 0x80) return true;         // fe80::/10 (Link-local)
            if (b[0] == 0xFF) return true;                                  // ff00::/8 (Multicast)
            return false;
        }

        return true;
    }
}

namespace Tenvora.Api.Common;

/// <summary>
/// Evaluates allowed browser origins for the API CORS policy, combining configured
/// <c>CLIENT_ORIGINS</c> entries with local development loopback origins.
/// </summary>
public static class CorsOriginPolicy
{
    private static readonly string[] DefaultOrigins =
    [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:4173",
        "https://localhost:4173",
        "http://localhost:80",
        "http://localhost:3000"
    ];

    public static HashSet<string> BuildAllowedOrigins(string? extraOrigins)
    {
        var allowed = new HashSet<string>(DefaultOrigins, StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(extraOrigins))
        {
            return allowed;
        }

        foreach (var raw in extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var normalized = NormalizeOrigin(raw);
            if (normalized is not null)
            {
                allowed.Add(normalized);
            }
        }

        return allowed;
    }

    public static bool IsOriginAllowed(string? origin, IReadOnlySet<string> allowedOrigins)
    {
        var normalized = NormalizeOrigin(origin);
        if (normalized is null)
        {
            return false;
        }

        if (allowedOrigins.Contains(normalized))
        {
            return true;
        }

        return Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
            && (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase));
    }

    public static string? NormalizeOrigin(string? rawOrigin)
    {
        if (string.IsNullOrWhiteSpace(rawOrigin))
        {
            return null;
        }

        var cleaned = rawOrigin.Trim().Trim('"', '\'').Trim().TrimEnd('/');
        if (!Uri.TryCreate(cleaned, UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return null;
        }

        return uri.GetLeftPart(UriPartial.Authority);
    }
}

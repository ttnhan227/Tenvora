using System.Security.Cryptography;
using System.Text;

namespace Tenvora.Api.Common;

public static class WebhookSignature
{
    public static string GenerateSecret()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return $"whsec_{Convert.ToHexStringLower(bytes)}";
    }

    public static string GetSecretPrefix(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            return string.Empty;

        return secret.Length <= 12
            ? "whsec_***"
            : $"{secret[..12]}...";
    }

    public static string Compute(string secret, long unixTimestampSeconds, string payloadJson)
    {
        ArgumentException.ThrowIfNullOrEmpty(secret);
        ArgumentNullException.ThrowIfNull(payloadJson);

        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var messageBytes = Encoding.UTF8.GetBytes($"{unixTimestampSeconds}.{payloadJson}");
        var hash = HMACSHA256.HashData(keyBytes, messageBytes);
        return $"t={unixTimestampSeconds},v1={Convert.ToHexStringLower(hash)}";
    }

    public static bool Verify(string secret, long unixTimestampSeconds, string payloadJson, string? signatureHeader)
    {
        if (string.IsNullOrEmpty(secret) || payloadJson == null || string.IsNullOrWhiteSpace(signatureHeader))
            return false;

        var expected = Compute(secret, unixTimestampSeconds, payloadJson);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signatureHeader.Trim());

        if (expectedBytes.Length != actualBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }
}

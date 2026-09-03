namespace Tenvora.Api.Common;

public class JwtSettings
{
    public string Issuer { get; set; } = "Tenvora";
    public string Audience { get; set; } = "Tenvora";
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 14;
}

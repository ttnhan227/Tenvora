using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record RegisterRequest(
    [Required] string CompanyName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? BaseCurrency = "USD"
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    Guid TenantId,
    string Email,
    string Role,
    string CompanyName
);

public record UserProfileResponse(
    Guid Id,
    Guid TenantId,
    string Email,
    string Role,
    bool IsActive,
    string PreferredCurrency,
    string CompanyName
);

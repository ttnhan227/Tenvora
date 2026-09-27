using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record RegisterRequest(
    [Required] string CompanyName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(12)] string Password,
    string? BaseCurrency = "USD"
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record LogoutRequest(
    string? RefreshToken = null
);

public record GoogleLoginRequest(
    [Required] string Credential
);

public record SetPasswordRequest(
    string? CurrentPassword,
    [Required, MinLength(12)] string NewPassword
);

public record CompleteOnboardingRequest(
    [Required] string CompanyName,
    [Required, StringLength(3, MinimumLength = 3)] string PreferredCurrency,
    [Required] string BusinessType,
    string? FullName = null,
    string? PhoneNumber = null
);

public record UpdateSettingsRequest(
    [Required] string CompanyName,
    [Required, StringLength(3, MinimumLength = 3)] string PreferredCurrency,
    [Required] string BusinessType,
    string? FullName = null,
    string? PhoneNumber = null
);


public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    Guid TenantId,
    string Email,
    string Role,
    string CompanyName,
    string PreferredCurrency,
    bool GoogleLinked = false,
    bool HasPassword = true,
    string? BusinessType = null,
    bool OnboardingCompleted = false,
    string? FullName = null,
    string? PhoneNumber = null
);

public record UserProfileResponse(
    Guid Id,
    Guid TenantId,
    string Email,
    string Role,
    bool IsActive,
    string PreferredCurrency,
    string CompanyName,
    bool GoogleLinked = false,
    bool HasPassword = true,
    string? BusinessType = null,
    bool OnboardingCompleted = false,
    string? FullName = null,
    string? PhoneNumber = null
);

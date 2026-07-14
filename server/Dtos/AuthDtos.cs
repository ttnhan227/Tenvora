namespace VeriSpend.Api.Dtos.Auth;

public sealed record RegisterRequest(string CompanyName, string Email, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record AcceptInviteRequest(string Token, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record UpdateProfileRequest(string PreferredCurrency);
public sealed record UserProfileResponse(Guid Id, string Email, string Role, Guid TenantId, string CompanyName, string PlanType, string PreferredCurrency);
public sealed record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserProfileResponse Profile);

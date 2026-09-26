namespace Tenvora.Api.Services;

public record GoogleAuthPayload(
    string Subject,
    string Email,
    bool EmailVerified,
    string? Name = null,
    string? HostedDomain = null
);

public interface IGoogleAuthValidator
{
    Task<GoogleAuthPayload> ValidateAsync(string credential, string clientId);
}

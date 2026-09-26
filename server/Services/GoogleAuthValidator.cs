using Google.Apis.Auth;

namespace Tenvora.Api.Services;

public sealed class GoogleAuthValidator : IGoogleAuthValidator
{
    public async Task<GoogleAuthPayload> ValidateAsync(string credential, string clientId)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { clientId },
            IssuedAtClockTolerance = TimeSpan.FromSeconds(10),
            ExpirationTimeClockTolerance = TimeSpan.FromSeconds(10)
        };

        var payload = await GoogleJsonWebSignature.ValidateAsync(credential, settings);
        return new GoogleAuthPayload(
            payload.Subject,
            payload.Email,
            payload.EmailVerified,
            payload.Name,
            payload.HostedDomain
        );
    }
}

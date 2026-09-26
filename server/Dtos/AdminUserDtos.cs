using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record AdminCreateUserRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(12)] string Password,
    [Required] string Role,
    string? PreferredCurrency = "USD");

public record AdminUserResponse(Guid Id, string Email, string Role, bool IsActive,
    string PreferredCurrency, DateTime CreatedAt, bool GoogleLinked = false);

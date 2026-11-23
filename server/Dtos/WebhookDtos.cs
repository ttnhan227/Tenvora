namespace Tenvora.Api.Dtos;

public sealed record CreateWebhookEndpointRequest(
    string Url,
    List<string> EventTypes,
    string? Description = null);

public sealed record WebhookEndpointDto(
    Guid Id,
    string Url,
    List<string> EventTypes,
    string? Description,
    bool IsActive,
    bool HasSecret,
    string SecretPrefix,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateWebhookEndpointResponseDto(
    Guid Id,
    string Url,
    List<string> EventTypes,
    string? Description,
    bool IsActive,
    string SigningSecret,
    string SecretPrefix,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record WebhookDeliveryDto(
    Guid Id,
    Guid EndpointId,
    string EventType,
    string DeliveryId,
    string Status,
    int AttemptCount,
    int MaxAttempts,
    DateTime NextAttemptAt,
    int? LastHttpStatusCode,
    string? LastError,
    DateTime CreatedAt,
    DateTime? DeliveredAt,
    DateTime? DeadLetteredAt);

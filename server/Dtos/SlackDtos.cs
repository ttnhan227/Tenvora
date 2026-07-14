namespace VeriSpend.Api.Dtos.Slack;

public sealed record SlackSlashCommandRequest(
    string? TeamId,
    string? TeamDomain,
    string? ChannelId,
    string? ChannelName,
    string? UserId,
    string? UserName,
    string? UserEmail,
    string? Command,
    string? Text,
    string? ResponseUrl,
    string? TriggerId
);

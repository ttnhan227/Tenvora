using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
[Authorize(Roles = "TenantAdmin")]
public sealed class WebhooksController(
    AppDbContext db,
    IWebhookUrlValidator urlValidator,
    IWebhookDeliveryService deliveryService) : ControllerBase
{
    [HttpGet("endpoints")]
    public async Task<IActionResult> GetEndpoints(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var endpoints = await db.WebhookEndpoints
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = endpoints.Select(e => new WebhookEndpointDto(
            e.Id,
            e.Url,
            WebhookEventTypes.ParseStored(e.EventTypes).ToList(),
            e.Description,
            e.IsActive,
            HasSecret: !string.IsNullOrWhiteSpace(e.SigningSecret),
            SecretPrefix: WebhookSignature.GetSecretPrefix(e.SigningSecret),
            e.CreatedAt,
            e.UpdatedAt)).ToList();

        return Ok(ApiResult<List<WebhookEndpointDto>>.Ok(dtos));
    }

    [HttpPost("endpoints")]
    public async Task<IActionResult> CreateEndpoint(
        [FromBody] CreateWebhookEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var urlResult = await urlValidator.ValidateAsync(request.Url, cancellationToken);
        if (!urlResult.IsValid || urlResult.Uri == null)
            return BadRequest(ApiResult<CreateWebhookEndpointResponseDto>.Fail(urlResult.Error ?? "Invalid webhook URL."));

        if (!WebhookEventTypes.TryNormalize(request.EventTypes, out var normalizedEvents, out var eventsError))
            return BadRequest(ApiResult<CreateWebhookEndpointResponseDto>.Fail(eventsError ?? "Invalid webhook event types."));

        var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        if (description != null && description.Length > 200)
            return BadRequest(ApiResult<CreateWebhookEndpointResponseDto>.Fail("Description must be 200 characters or fewer."));

        var tenantId = User.GetTenantId();
        var utcNow = DateTime.UtcNow;
        var secret = WebhookSignature.GenerateSecret();

        var endpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Url = urlResult.Uri.ToString(),
            SigningSecret = secret,
            EventTypes = string.Join(',', normalizedEvents),
            Description = description,
            IsActive = true,
            CreatedAt = utcNow,
            UpdatedAt = utcNow
        };

        db.WebhookEndpoints.Add(endpoint);
        await db.SaveChangesAsync(cancellationToken);

        var dto = new CreateWebhookEndpointResponseDto(
            endpoint.Id,
            endpoint.Url,
            normalizedEvents,
            endpoint.Description,
            endpoint.IsActive,
            SigningSecret: secret,
            SecretPrefix: WebhookSignature.GetSecretPrefix(secret),
            endpoint.CreatedAt,
            endpoint.UpdatedAt);

        return StatusCode(StatusCodes.Status201Created, ApiResult<CreateWebhookEndpointResponseDto>.Ok(dto));
    }

    [HttpDelete("endpoints/{id:guid}")]
    public async Task<IActionResult> DeleteEndpoint(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var endpoint = await db.WebhookEndpoints
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id, cancellationToken);

        if (endpoint == null)
            return NotFound(ApiResult.Fail("Webhook endpoint not found."));

        db.WebhookEndpoints.Remove(endpoint);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(ApiResult.Ok("Webhook endpoint deleted."));
    }

    [HttpGet("deliveries")]
    public async Task<IActionResult> GetDeliveries(
        [FromQuery] string? status = null,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = User.GetTenantId();
        var clampedLimit = Math.Clamp(limit, 1, 200);

        var query = db.WebhookOutboxEvents
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var trimmedStatus = status.Trim();
            if (!WebhookOutboxStatuses.All.Contains(trimmedStatus))
                return BadRequest(ApiResult<List<WebhookDeliveryDto>>.Fail(
                    $"Invalid status '{status}'. Allowed values: {string.Join(", ", WebhookOutboxStatuses.All)}."));

            query = query.Where(e => e.Status == trimmedStatus);
        }

        var deliveries = await query
            .OrderByDescending(e => e.CreatedAt)
            .Take(clampedLimit)
            .ToListAsync(cancellationToken);

        return Ok(ApiResult<List<WebhookDeliveryDto>>.Ok(
            deliveries.Select(WebhookDeliveryService.MapDelivery).ToList()));
    }

    [HttpPost("deliveries/{id:guid}/replay")]
    public async Task<IActionResult> ReplayDelivery(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var exists = await db.WebhookOutboxEvents
            .AsNoTracking()
            .AnyAsync(e => e.TenantId == tenantId && e.Id == id, cancellationToken);

        if (!exists)
            return NotFound(ApiResult<WebhookDeliveryDto>.Fail("Webhook delivery not found."));

        var result = await deliveryService.ReplayDeliveryAsync(tenantId, id, cancellationToken);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}

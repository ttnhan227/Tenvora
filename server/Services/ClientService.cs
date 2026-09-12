using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public class ClientService : IClientService
{
    private readonly AppDbContext _dbContext;

    public ClientService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApiResult<List<ClientSummaryDto>>> GetClientsAsync(Guid tenantId, string? status = null)
    {
        var query = _dbContext.Clients
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status == status);
        }

        var clients = await query
            .Include(c => c.Invoices)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var dtos = clients.Select(c =>
        {
            var totalInvoiced = c.Invoices.Sum(i => i.TotalAmount);
            var totalPaid = c.Invoices.Sum(i => i.AmountPaid);
            var outstanding = totalInvoiced - totalPaid;
            var openCount = c.Invoices.Count(i => i.Status == "Sent" || i.Status == "Viewed" || i.Status == "Overdue");

            return new ClientSummaryDto(
                c.Id,
                c.Name,
                c.ContactEmail,
                c.Phone,
                c.Company,
                c.Address,
                c.Currency,
                c.DefaultPaymentTermsDays,
                c.HourlyRate,
                c.Status,
                c.Notes,
                totalInvoiced,
                totalPaid,
                outstanding,
                openCount,
                c.CreatedAt
            );
        }).ToList();

        return ApiResult<List<ClientSummaryDto>>.Ok(dtos);
    }

    public async Task<ApiResult<ClientSummaryDto>> GetClientByIdAsync(Guid tenantId, Guid clientId)
    {
        var client = await _dbContext.Clients
            .AsNoTracking()
            .Include(c => c.Invoices)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId);

        if (client == null)
        {
            return ApiResult<ClientSummaryDto>.Fail("Client not found");
        }

        var totalInvoiced = client.Invoices.Sum(i => i.TotalAmount);
        var totalPaid = client.Invoices.Sum(i => i.AmountPaid);
        var outstanding = totalInvoiced - totalPaid;
        var openCount = client.Invoices.Count(i => i.Status == "Sent" || i.Status == "Viewed" || i.Status == "Overdue");

        var dto = new ClientSummaryDto(
            client.Id,
            client.Name,
            client.ContactEmail,
            client.Phone,
            client.Company,
            client.Address,
            client.Currency,
            client.DefaultPaymentTermsDays,
            client.HourlyRate,
            client.Status,
            client.Notes,
            totalInvoiced,
            totalPaid,
            outstanding,
            openCount,
            client.CreatedAt
        );

        return ApiResult<ClientSummaryDto>.Ok(dto);
    }

    public async Task<ApiResult<ClientSummaryDto>> CreateClientAsync(Guid tenantId, CreateClientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ApiResult<ClientSummaryDto>.Fail("Client name is required");
        }

        if (string.IsNullOrWhiteSpace(request.ContactEmail))
        {
            return ApiResult<ClientSummaryDto>.Fail("Contact email is required");
        }

        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            ContactEmail = request.ContactEmail.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            Company = request.Company?.Trim(),
            Address = request.Address?.Trim(),
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant(),
            DefaultPaymentTermsDays = request.DefaultPaymentTermsDays ?? 14,
            HourlyRate = request.HourlyRate,
            Status = "Active",
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Clients.Add(client);
        await _dbContext.SaveChangesAsync();

        var dto = new ClientSummaryDto(
            client.Id,
            client.Name,
            client.ContactEmail,
            client.Phone,
            client.Company,
            client.Address,
            client.Currency,
            client.DefaultPaymentTermsDays,
            client.HourlyRate,
            client.Status,
            client.Notes,
            0m,
            0m,
            0m,
            0,
            client.CreatedAt
        );

        return ApiResult<ClientSummaryDto>.Ok(dto);
    }

    public async Task<ApiResult<ClientSummaryDto>> UpdateClientAsync(Guid tenantId, Guid clientId, UpdateClientRequest request)
    {
        var client = await _dbContext.Clients
            .Include(c => c.Invoices)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId);

        if (client == null)
        {
            return ApiResult<ClientSummaryDto>.Fail("Client not found");
        }

        if (!string.IsNullOrWhiteSpace(request.Name)) client.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.ContactEmail)) client.ContactEmail = request.ContactEmail.Trim().ToLowerInvariant();
        if (request.Phone != null) client.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (request.Company != null) client.Company = string.IsNullOrWhiteSpace(request.Company) ? null : request.Company.Trim();
        if (request.Address != null) client.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        if (!string.IsNullOrWhiteSpace(request.Currency)) client.Currency = request.Currency.Trim().ToUpperInvariant();
        if (request.DefaultPaymentTermsDays.HasValue) client.DefaultPaymentTermsDays = request.DefaultPaymentTermsDays.Value;
        if (request.HourlyRate.HasValue) client.HourlyRate = request.HourlyRate.Value;
        if (!string.IsNullOrWhiteSpace(request.Status)) client.Status = request.Status.Trim();
        if (request.Notes != null) client.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        client.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        var totalInvoiced = client.Invoices.Sum(i => i.TotalAmount);
        var totalPaid = client.Invoices.Sum(i => i.AmountPaid);
        var outstanding = totalInvoiced - totalPaid;
        var openCount = client.Invoices.Count(i => i.Status == "Sent" || i.Status == "Viewed" || i.Status == "Overdue");

        var dto = new ClientSummaryDto(
            client.Id,
            client.Name,
            client.ContactEmail,
            client.Phone,
            client.Company,
            client.Address,
            client.Currency,
            client.DefaultPaymentTermsDays,
            client.HourlyRate,
            client.Status,
            client.Notes,
            totalInvoiced,
            totalPaid,
            outstanding,
            openCount,
            client.CreatedAt
        );

        return ApiResult<ClientSummaryDto>.Ok(dto);
    }

    public async Task<ApiResult<bool>> DeleteClientAsync(Guid tenantId, Guid clientId)
    {
        var client = await _dbContext.Clients
            .Include(c => c.Invoices)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId);

        if (client == null)
        {
            return ApiResult<bool>.Fail("Client not found");
        }

        if (client.Invoices.Any())
        {
            client.Status = "Archived";
            client.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return ApiResult<bool>.Ok(true);
        }

        _dbContext.Clients.Remove(client);
        await _dbContext.SaveChangesAsync();
        return ApiResult<bool>.Ok(true);
    }
}

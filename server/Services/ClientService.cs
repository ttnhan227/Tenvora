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
            .Include(c => c.Projects)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var dtos = clients.Select(c =>
        {
            var financialInvoices = c.Invoices.Where(i => i.Status != InvoiceStatuses.Cancelled).ToList();
            var totalInvoiced = financialInvoices.Sum(i => i.TotalAmount);
            var totalPaid = financialInvoices.Sum(i => i.AmountPaid);
            var outstanding = totalInvoiced - totalPaid;
            var openCount = financialInvoices.Count(i => i.AmountPaid < i.TotalAmount && i.Status != InvoiceStatuses.Draft);

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
                c.Projects.Count,
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
            .Include(c => c.Projects)
            .Include(c => c.Expenses)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId);

        if (client == null)
        {
            return ApiResult<ClientSummaryDto>.Fail("Client not found");
        }

        var financialInvoices = client.Invoices.Where(i => i.Status != InvoiceStatuses.Cancelled).ToList();
        var totalInvoiced = financialInvoices.Sum(i => i.TotalAmount);
        var totalPaid = financialInvoices.Sum(i => i.AmountPaid);
        var outstanding = totalInvoiced - totalPaid;
        var openCount = financialInvoices.Count(i => i.AmountPaid < i.TotalAmount && i.Status != InvoiceStatuses.Draft);

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
            client.Projects.Count,
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

        var currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant();
        if (currency.Length != 3) return ApiResult<ClientSummaryDto>.Fail("Currency must be a three-letter code.");
        if (request.DefaultPaymentTermsDays is < 0 or > 365) return ApiResult<ClientSummaryDto>.Fail("Payment terms must be between 0 and 365 days.");
        if (request.HourlyRate is < 0 || request.HourlyRate.HasValue && decimal.Round(request.HourlyRate.Value, 4) != request.HourlyRate.Value)
            return ApiResult<ClientSummaryDto>.Fail("Hourly rate cannot be negative and may have at most four decimal places.");
        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            ContactEmail = request.ContactEmail.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            Company = request.Company?.Trim(),
            Address = request.Address?.Trim(),
            Currency = currency,
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
            0,
            client.CreatedAt
        );

        return ApiResult<ClientSummaryDto>.Ok(dto);
    }

    public async Task<ApiResult<ClientSummaryDto>> UpdateClientAsync(Guid tenantId, Guid clientId, UpdateClientRequest request)
    {
        var client = await _dbContext.Clients
            .Include(c => c.Invoices)
            .Include(c => c.Projects)
            .Include(c => c.Expenses)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId);

        if (client == null)
        {
            return ApiResult<ClientSummaryDto>.Fail("Client not found");
        }

        if (request.Status != null && request.Status is not ("Active" or "Lead" or "Archived"))
            return ApiResult<ClientSummaryDto>.Fail("Choose a valid client status.");
        if (!string.IsNullOrWhiteSpace(request.Currency) && request.Currency.Trim().Length != 3)
            return ApiResult<ClientSummaryDto>.Fail("Currency must be a three-letter code.");
        if (request.DefaultPaymentTermsDays is < 0 or > 365)
            return ApiResult<ClientSummaryDto>.Fail("Payment terms must be between 0 and 365 days.");
        if (request.HourlyRate is < 0 || request.HourlyRate.HasValue && decimal.Round(request.HourlyRate.Value, 4) != request.HourlyRate.Value)
            return ApiResult<ClientSummaryDto>.Fail("Hourly rate cannot be negative and may have at most four decimal places.");
        if (!string.IsNullOrWhiteSpace(request.Currency) && !string.Equals(request.Currency.Trim(), client.Currency, StringComparison.OrdinalIgnoreCase) &&
            (client.Invoices.Count > 0 || client.Projects.Count > 0 || client.Expenses.Count > 0))
            return ApiResult<ClientSummaryDto>.Fail("Client currency cannot change after financial activity has been recorded.");

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

        var financialInvoices = client.Invoices.Where(i => i.Status != InvoiceStatuses.Cancelled).ToList();
        var totalInvoiced = financialInvoices.Sum(i => i.TotalAmount);
        var totalPaid = financialInvoices.Sum(i => i.AmountPaid);
        var outstanding = totalInvoiced - totalPaid;
        var openCount = financialInvoices.Count(i => i.AmountPaid < i.TotalAmount && i.Status != InvoiceStatuses.Draft);

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
            client.Projects.Count,
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

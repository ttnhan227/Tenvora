using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed class ProjectService(AppDbContext db) : IProjectService
{
    public async Task<ApiResult<List<ProjectSummaryDto>>> GetAsync(Guid tenantId, string? search, string? status, Guid? clientId)
    {
        var query = db.Projects.AsNoTracking().Where(p => p.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(term) || p.Client!.Name.ToLower().Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
        if (clientId.HasValue) query = query.Where(p => p.ClientId == clientId.Value);

        var rows = await query
            .Include(p => p.Client)
            .Include(p => p.Invoices)
            .Include(p => p.Expenses)
            .OrderBy(p => p.Status == ProjectStatuses.Archived)
            .ThenByDescending(p => p.UpdatedAt)
            .ToListAsync();
        return ApiResult<List<ProjectSummaryDto>>.Ok(rows.Select(Map).ToList());
    }

    public async Task<ApiResult<ProjectSummaryDto>> GetByIdAsync(Guid tenantId, Guid id)
    {
        var project = await db.Projects.AsNoTracking()
            .Include(p => p.Client).Include(p => p.Invoices).Include(p => p.Expenses)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == id);
        return project == null
            ? ApiResult<ProjectSummaryDto>.Fail("Project not found.")
            : ApiResult<ProjectSummaryDto>.Ok(Map(project));
    }

    public async Task<ApiResult<ProjectSummaryDto>> CreateAsync(Guid tenantId, CreateProjectRequest request)
    {
        var validation = Validate(request.Name, request.Status, request.StartDate, request.EndDate, request.BudgetAmount);
        if (validation != null) return ApiResult<ProjectSummaryDto>.Fail(validation);

        var client = await db.Clients.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.ClientId && c.Status != "Archived");
        if (client == null) return ApiResult<ProjectSummaryDto>.Fail("Choose an active client in this workspace.");
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? client.Currency : request.Currency.Trim().ToUpperInvariant();
        if (currency.Length != 3) return ApiResult<ProjectSummaryDto>.Fail("Currency must be a three-letter code.");
        if (currency != client.Currency) return ApiResult<ProjectSummaryDto>.Fail("Project currency must match the client currency.");

        var project = new Project
        {
            Id = Guid.NewGuid(), TenantId = tenantId, ClientId = client.Id,
            Name = request.Name.Trim(), Description = Clean(request.Description),
            Status = string.IsNullOrWhiteSpace(request.Status) ? ProjectStatuses.Active : request.Status.Trim(),
            StartDate = request.StartDate, EndDate = request.EndDate,
            BudgetAmount = Round(request.BudgetAmount), Currency = currency
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        project.Client = client;
        return ApiResult<ProjectSummaryDto>.Ok(Map(project));
    }

    public async Task<ApiResult<ProjectSummaryDto>> UpdateAsync(Guid tenantId, Guid id, UpdateProjectRequest request)
    {
        var project = await db.Projects.Include(p => p.Client).Include(p => p.Invoices).Include(p => p.Expenses)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == id);
        if (project == null) return ApiResult<ProjectSummaryDto>.Fail("Project not found.");
        var validation = Validate(request.Name ?? project.Name, request.Status ?? project.Status,
            request.StartDate ?? project.StartDate, request.EndDate ?? project.EndDate, request.BudgetAmount ?? project.BudgetAmount);
        if (validation != null) return ApiResult<ProjectSummaryDto>.Fail(validation);

        if (request.Name != null) project.Name = request.Name.Trim();
        if (request.Description != null) project.Description = Clean(request.Description);
        if (request.Status != null) project.Status = request.Status.Trim();
        if (request.StartDate.HasValue) project.StartDate = request.StartDate;
        if (request.EndDate.HasValue) project.EndDate = request.EndDate;
        if (request.BudgetAmount.HasValue) project.BudgetAmount = Round(request.BudgetAmount);
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<ProjectSummaryDto>.Ok(Map(project));
    }

    public async Task<ApiResult<ProjectSummaryDto>> ArchiveAsync(Guid tenantId, Guid id)
    {
        var project = await db.Projects.Include(p => p.Client).Include(p => p.Invoices).Include(p => p.Expenses)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == id);
        if (project == null) return ApiResult<ProjectSummaryDto>.Fail("Project not found.");
        project.Status = ProjectStatuses.Archived;
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<ProjectSummaryDto>.Ok(Map(project));
    }

    private static string? Validate(string name, string? status, DateTime? start, DateTime? end, decimal? budget)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Project name is required.";
        if (!string.IsNullOrWhiteSpace(status) && !ProjectStatuses.All.Contains(status.Trim())) return "Choose a valid project status.";
        if (start.HasValue && end.HasValue && end < start) return "End date cannot be before start date.";
        if (budget is < 0 || budget.HasValue && decimal.Round(budget.Value, 4) != budget.Value) return "Budget cannot be negative and may have at most four decimal places.";
        return null;
    }

    private static ProjectSummaryDto Map(Project p)
    {
        var invoices = p.Invoices.Where(i => i.Status != InvoiceStatuses.Cancelled && i.Currency == p.Currency).ToList();
        var expenses = p.Expenses.Where(e => e.Status == ExpenseStatuses.Posted && e.Currency == p.Currency).ToList();
        var billed = invoices.Sum(i => i.TotalAmount);
        var received = invoices.Sum(i => i.AmountPaid);
        return new(p.Id, p.ClientId, p.Client?.Name ?? "Client", p.Name, p.Description, p.Status,
            p.StartDate, p.EndDate, p.BudgetAmount, p.Currency, billed, received, expenses.Sum(e => e.Amount),
            billed - received, invoices.Count, p.CreatedAt, p.UpdatedAt);
    }

    private static decimal? Round(decimal? value) => value.HasValue ? decimal.Round(value.Value, 4, MidpointRounding.AwayFromZero) : null;
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

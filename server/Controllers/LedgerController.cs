using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LedgerController : ControllerBase
{
    private readonly ILedgerService _ledgerService;

    public LedgerController(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;
    }

    [HttpGet("transactions/{transactionId:guid}")]
    public async Task<IActionResult> GetTransactionLedgerEntries(Guid transactionId)
    {
        var tenantId = User.GetTenantId();
        var entries = await _ledgerService.GetEntriesByTransactionIdAsync(tenantId, transactionId);
        if (entries == null || entries.Count == 0)
            return NotFound(ApiResult<List<LedgerEntryResponse>>.Fail("Transaction not found or has no ledger entries."));

        return Ok(ApiResult<List<LedgerEntryResponse>>.Ok(entries));
    }

    [HttpGet("accounts/{accountId:guid}/history")]
    public async Task<IActionResult> GetAccountLedgerHistory(Guid accountId)
    {
        var tenantId = User.GetTenantId();
        var history = await _ledgerService.GetAccountLedgerHistoryAsync(tenantId, accountId);
        if (history == null)
            return NotFound(ApiResult<AccountLedgerHistoryResponse>.Fail("Account not found."));

        return Ok(ApiResult<AccountLedgerHistoryResponse>.Ok(history));
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("payments-rate-limit")]
public class PaymentsController : ControllerBase
{
    private readonly ITransferService _transferService;

    public PaymentsController(ITransferService transferService)
    {
        _transferService = transferService;
    }

    [HttpPost("transfers")]
    public async Task<IActionResult> Transfer(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateTransferRequest request)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return BadRequest(ApiResult<CreatePaymentResponse>.Fail("The 'Idempotency-Key' header is required."));
        }

        var tenantId = User.GetTenantId();
        var email = User.GetUserEmail();

        try
        {
            var result = await _transferService.ExecuteTransferAsync(tenantId, idempotencyKey.Trim(), request, email);
            return Ok(ApiResult<CreatePaymentResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResult<CreatePaymentResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("transactions/{id:guid}/reverse")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> ReverseTransaction(
        Guid id, 
        [FromBody] ReverseTransactionRequest? request)
    {
        var tenantId = User.GetTenantId();
        var email = User.GetUserEmail();

        try
        {
            var result = await _transferService.ReverseTransactionAsync(tenantId, id, request?.Reason, email);
            return Ok(ApiResult<CreatePaymentResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResult<CreatePaymentResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] string? status = null, [FromQuery] int limit = 100)
    {
        var tenantId = User.GetTenantId();
        var transactions = await _transferService.GetTransactionsAsync(tenantId, status, limit);
        return Ok(ApiResult<List<TransactionResponse>>.Ok(transactions));
    }

    [HttpGet("transactions/{id:guid}")]
    public async Task<IActionResult> GetTransaction(Guid id)
    {
        var tenantId = User.GetTenantId();
        var tx = await _transferService.GetTransactionByIdAsync(tenantId, id);
        if (tx == null)
            return NotFound(ApiResult<TransactionResponse>.Fail("Transaction not found."));

        return Ok(ApiResult<TransactionResponse>.Ok(tx));
    }
}

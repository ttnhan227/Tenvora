using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

public record DeleteAccountRequest([Required, EmailAddress] string ConfirmationEmail);

[ApiController]
[Authorize]
[Route("api/account")]
public sealed class AccountController(AccountDeletionService deletion) : ControllerBase
{
    [HttpPost("delete")]
    public async Task<IActionResult> Delete(DeleteAccountRequest request)
    {
        var result = await deletion.DeleteAsync(User.GetTenantId(), User.GetUserId(), request.ConfirmationEmail);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

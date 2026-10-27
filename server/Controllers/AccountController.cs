using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

public record DeleteAccountRequest([Required, EmailAddress] string ConfirmationEmail);
public record DeletePersonalDataRequest([Required] List<string> Categories);

[ApiController]
[Authorize]
[Route("api/account")]
public sealed class AccountController(AccountDeletionService deletion, PersonalDataDeletionService personalData) : ControllerBase
{
    [HttpPost("delete")]
    public async Task<IActionResult> Delete(DeleteAccountRequest request)
    {
        var result = await deletion.DeleteAsync(User.GetTenantId(), User.GetUserId(), request.ConfirmationEmail);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Deletes some of the signed-in member's data without deleting the account, as offered
    /// on the website's Settings > Your data panel.
    /// </summary>
    [HttpPost("data/delete")]
    public async Task<IActionResult> DeleteData(DeletePersonalDataRequest request)
    {
        var result = await personalData.DeleteAsync(User.GetTenantId(), User.GetUserId(), request.Categories);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

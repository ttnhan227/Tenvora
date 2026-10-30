using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/media"), Authorize]
public sealed class MediaController(IObjectStorageService storage) : ControllerBase
{
    public sealed record UploadMediaRequest(string? DataUrl, string? Folder, string? FileName);

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadForm([FromForm] IFormFile file, [FromForm] string? folder)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResult.Fail("No file provided."));

        if (file.Length > 15_000_000)
            return BadRequest(ApiResult.Fail("File exceeds 15MB limit."));

        var tenantId = User.GetTenantId();
        var targetFolder = string.IsNullOrWhiteSpace(folder)
            ? $"tenvora/{tenantId}/uploads"
            : $"tenvora/{tenantId}/{folder.Trim().Trim('/')}";

        await using var stream = file.OpenReadStream();
        var result = await storage.UploadAsync(stream, file.FileName, file.ContentType, targetFolder);

        if (string.IsNullOrEmpty(result.Url))
            return StatusCode(500, ApiResult.Fail("Could not upload file to storage."));

        return Ok(ApiResult<StorageUploadResult>.Ok(result));
    }

    [HttpPost("upload-dataurl")]
    public async Task<IActionResult> UploadDataUrl([FromBody] UploadMediaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DataUrl))
            return BadRequest(ApiResult.Fail("No image data provided."));

        var tenantId = User.GetTenantId();
        var targetFolder = string.IsNullOrWhiteSpace(request.Folder)
            ? $"tenvora/{tenantId}/uploads"
            : $"tenvora/{tenantId}/{request.Folder.Trim().Trim('/')}";

        var result = await storage.UploadDataUrlAsync(request.DataUrl, targetFolder, request.FileName);

        if (string.IsNullOrEmpty(result.Url))
            return StatusCode(500, ApiResult.Fail("Could not upload image to storage."));

        return Ok(ApiResult<StorageUploadResult>.Ok(result));
    }
}

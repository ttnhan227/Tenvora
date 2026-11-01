using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Tenvora.Api.Services;

public sealed class ObjectStorageService : IObjectStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<ObjectStorageService> _logger;
    private readonly string _webRootPath;

    public bool IsCloudStorage => false;

    public ObjectStorageService(
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<ObjectStorageService> logger)
    {
        _env = env;
        _config = config;
        _logger = logger;

        _webRootPath = !string.IsNullOrWhiteSpace(_env.WebRootPath)
            ? _env.WebRootPath
            : Path.Combine(_env.ContentRootPath, "wwwroot");

        if (!Directory.Exists(_webRootPath))
        {
            try
            {
                Directory.CreateDirectory(_webRootPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not initialize webroot directory at {WebRootPath}", _webRootPath);
            }
        }
    }

    public async Task<StorageUploadResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string folder,
        CancellationToken ct = default)
    {
        if (stream == null || stream.Length == 0)
            throw new ArgumentException("Stream cannot be empty.", nameof(stream));

        if (stream.Length > 15_000_000)
            throw new InvalidOperationException("File exceeds maximum allowed size of 15MB.");

        // Rewind if seekable
        if (stream.CanSeek) stream.Position = 0;

        // Read bytes to compute SHA-256 hash and enable upload
        byte[] bytes;
        using (var ms = new MemoryStream())
        {
            await stream.CopyToAsync(ms, ct);
            bytes = ms.ToArray();
        }

        var hashBytes = SHA256.HashData(bytes);
        var fileHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var safeFolderName = SanitizeFolder(folder);
        var ext = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = contentType switch
            {
                "image/png" => "png",
                "image/webp" => "webp",
                "application/pdf" => "pdf",
                _ => "jpg"
            };
        }

        var rawName = Path.GetFileNameWithoutExtension(fileName);
        var cleanName = Regex.Replace(rawName, @"[^a-zA-Z0-9_\-]+", "_").Trim('_');
        if (string.IsNullOrWhiteSpace(cleanName)) cleanName = "document";
        var uniqueFileName = $"{fileHash[..12]}_{cleanName}.{ext}";



        // 2. Local disk storage fallback
        var targetDir = Path.Combine(_webRootPath, "uploads", safeFolderName.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(targetDir);

        var filePath = Path.Combine(targetDir, uniqueFileName);
        await File.WriteAllBytesAsync(filePath, bytes, ct);

        var relativeUrl = $"/uploads/{safeFolderName}/{uniqueFileName}";
        return new StorageUploadResult(relativeUrl, relativeUrl, fileHash, contentType, bytes.Length);
    }

    public async Task<StorageUploadResult> UploadDataUrlAsync(
        string dataUrl,
        string folder,
        string? fileName = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dataUrl))
            throw new ArgumentException("Data URL cannot be empty.", nameof(dataUrl));

        var trimmed = dataUrl.Trim();

        // Already a hosted URL
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return new StorageUploadResult(trimmed, trimmed, "", "application/octet-stream", 0);
        }

        var commaIdx = trimmed.IndexOf(',');
        if (commaIdx < 0)
            throw new InvalidOperationException("Invalid data URL format.");

        var header = trimmed[..commaIdx].ToLowerInvariant();
        var base64Data = trimmed[(commaIdx + 1)..];
        var bytes = Convert.FromBase64String(base64Data);

        var contentType = "image/jpeg";
        var ext = "jpg";

        if (header.Contains("image/png")) { contentType = "image/png"; ext = "png"; }
        else if (header.Contains("image/webp")) { contentType = "image/webp"; ext = "webp"; }
        else if (header.Contains("application/pdf")) { contentType = "application/pdf"; ext = "pdf"; }
        else if (header.Contains("image/jpeg") || header.Contains("image/jpg")) { contentType = "image/jpeg"; ext = "jpg"; }

        var actualFileName = string.IsNullOrWhiteSpace(fileName)
            ? $"capture_{Guid.NewGuid():N}.{ext}"
            : (fileName.Contains('.') ? fileName : $"{fileName}.{ext}");

        using var stream = new MemoryStream(bytes);
        return await UploadAsync(stream, actualFileName, contentType, folder, ct);
    }

    private static string SanitizeFolder(string folder)
    {
        var cleaned = Regex.Replace(folder, @"[^a-zA-Z0-9_\-\/]+", "_").Trim('/');
        return string.IsNullOrWhiteSpace(cleaned) ? "receipts" : cleaned;
    }
}

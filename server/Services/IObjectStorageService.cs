using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Tenvora.Api.Services;

public sealed record StorageUploadResult(
    string Url,
    string? ThumbnailUrl,
    string FileHash,
    string MimeType,
    long SizeBytes
);

public interface IObjectStorageService
{
    bool IsCloudStorage { get; }

    Task<StorageUploadResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string folder,
        CancellationToken ct = default);

    Task<StorageUploadResult> UploadDataUrlAsync(
        string dataUrl,
        string folder,
        string? fileName = null,
        CancellationToken ct = default);
}

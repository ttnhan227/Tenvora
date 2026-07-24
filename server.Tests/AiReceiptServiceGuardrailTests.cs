using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using VeriSpend.Api.Common;
using VeriSpend.Api.Services;
using Xunit;

namespace VeriSpend.Api.Tests;

public sealed class AiReceiptServiceGuardrailTests
{
    [Fact]
    public async Task ExtractReceipt_WhenProviderIsUnavailable_FailsSafeAndRequiresManualReview()
    {
        var service = new AiReceiptService(
            new TestEnvironment(),
            new TestHttpClientFactory(),
            new AiProviderSettings { ApiKey = "", Endpoint = "" },
            NullLogger<AiReceiptService>.Instance);
        await using var stream = new MemoryStream([1, 2, 3]);
        var file = new FormFile(stream, 0, stream.Length, "file", "receipt.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };

        var result = await service.ExtractReceiptAsync(file, 500m);

        Assert.Equal("fallback", result.Source);
        Assert.True(result.RequiresReview);
        Assert.Equal(0m, result.Amount);
        Assert.Equal("", result.Merchant);
        Assert.Equal("", result.Currency);
        Assert.False(result.Flagged);
        Assert.NotEmpty(result.Warnings);
    }

    private sealed class TestHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

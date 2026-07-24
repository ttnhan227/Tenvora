using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using VeriSpend.Api.Common;
using VeriSpend.Api.Services;

var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
var manifestPath = args.ElementAtOrDefault(0) ?? Path.Combine(root, "docs/receipt-evaluation/dataset.json");
var outputPath = args.ElementAtOrDefault(1) ?? Path.Combine(root, "docs/receipt-evaluation/results.json");
var config = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(root, "server/appsettings.Development.json"))).RootElement;
var ai = config.GetProperty("AiProvider");
var settings = new AiProviderSettings {
    Name = ai.GetProperty("Name").GetString() ?? "Configured provider",
    ApiKey = ai.GetProperty("ApiKey").GetString() ?? "",
    Endpoint = ai.GetProperty("Endpoint").GetString() ?? "",
    VisionModel = ai.GetProperty("VisionModel").GetString() ?? ""
};
var service = new AiReceiptService(new EvalEnvironment(root), new ClientFactory(), settings, NullLogger<AiReceiptService>.Instance);
var cases = JsonSerializer.Deserialize<List<Case>>(await File.ReadAllTextAsync(manifestPath), new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
var rows = new List<object>();
var correct = new Dictionary<string, int> { ["merchant"] = 0, ["amount"] = 0, ["currency"] = 0, ["date"] = 0, ["category"] = 0 };
foreach (var test in cases) {
    var path = Path.Combine(root, test.File);
    await using var stream = File.OpenRead(path);
    var form = new FormFile(stream, 0, stream.Length, "file", Path.GetFileName(path)) { Headers = new HeaderDictionary(), ContentType = test.ContentType };
    var result = await service.ExtractReceiptAsync(form, 5000m);
    if (result.Source == "ai") {
        if (Normalize(result.Merchant) == Normalize(test.Expected.Merchant)) correct["merchant"]++;
        if (result.Amount == test.Expected.Amount) correct["amount"]++;
        if (Normalize(result.Currency) == Normalize(test.Expected.Currency)) correct["currency"]++;
        if (result.Date.ToString("yyyy-MM-dd") == test.Expected.Date) correct["date"]++;
        if (Normalize(result.Category) == Normalize(test.Expected.Category)) correct["category"]++;
    }
    rows.Add(new { test.Id, test.File, expected = test.Expected, actual = new { result.Merchant, result.Amount, result.Currency, Date = result.Date.ToString("yyyy-MM-dd"), result.Category, result.Source, result.RequiresReview, result.Warnings } });
}
var fieldAccuracy = correct.ToDictionary(item => item.Key, item => Math.Round(item.Value * 100m / cases.Count, 1));
var overall = Math.Round(correct.Values.Sum() * 100m / (cases.Count * correct.Count), 1);
await File.WriteAllTextAsync(outputPath, JsonSerializer.Serialize(new { generatedAt = DateTime.UtcNow, provider = settings.Name, model = settings.VisionModel, receiptCount = cases.Count, overallFieldAccuracy = overall, fieldAccuracy, cases = rows }, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine($"Wrote {cases.Count} predictions to {outputPath}");
static string Normalize(string value) => new(value.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());

record Case(string Id, string File, string ContentType, Expected Expected);
record Expected(string Merchant, decimal Amount, string Currency, string Date, string Category);
sealed class ClientFactory : IHttpClientFactory { public HttpClient CreateClient(string name) => new(); }
sealed class EvalEnvironment(string root) : IWebHostEnvironment {
    public string ApplicationName { get; set; } = "ReceiptEvaluator";
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; } = root;
    public string EnvironmentName { get; set; } = "Development";
    public string ContentRootPath { get; set; } = root;
    public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(root);
}

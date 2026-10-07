using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;
using System.Runtime.CompilerServices;

namespace Tenvora.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = -1)
        : base(sourceFilePath, sourceLineNumber)
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TENVORA_TEST_DATABASE_URL")))
            Skip = "Set TENVORA_TEST_DATABASE_URL to an isolated local PostgreSQL server; CI always supplies it.";
    }
}

public sealed class PostgresWorkflowTests
{
    // Each test owns a new database. Never migrate or clear the supplied database.
    internal sealed class Database : IAsyncDisposable
    {
        private readonly string admin;
        private readonly string name = "tenvora_readiness_" + Guid.NewGuid().ToString("N");
        public string ConnectionString { get; private set; } = "";
        public Database()
        {
            var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("TENVORA_TEST_DATABASE_URL"));
            if (settings.Host is not ("localhost" or "127.0.0.1"))
                throw new InvalidOperationException("Readiness tests require an isolated localhost database, not a hosted database.");
            settings.Database = "postgres";
            settings.Pooling = false;
            admin = settings.ConnectionString;
            settings.Database = name;
            ConnectionString = settings.ConnectionString;
        }
        public AppDbContext Open() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);
        public async Task Initialize()
        {
            await using var connection = new NpgsqlConnection(admin);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", connection);
            await command.ExecuteNonQueryAsync();
            await using var db = Open();
            await db.Database.MigrateAsync();
        }
        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(admin);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)", connection);
            await command.ExecuteNonQueryAsync();
        }
    }

    private static async Task<(Guid Tenant, Guid Customer, Guid Sale)> Seed(Database database)
    {
        await using var db = database.Open();
        var tenant = Guid.NewGuid();
        db.Tenants.Add(new Tenant { Id = tenant, CompanyName = "Readiness test", ApiKey = Guid.NewGuid().ToString("N"), BaseCurrency = "VND", PlanType = "Business", Status = "Active" });
        await db.SaveChangesAsync();
        var service = new BusinessService(db);
        var customer = await service.CreateCustomerAsync(tenant, new("Test customer", null, null, null, null));
        var product = await service.CreateProductAsync(tenant, new("Test product", null, "unit", 100m, null));
        Assert.True(customer.Success);
        Assert.True(product.Success);
        var sale = await service.CreateSaleAsync(tenant, "seed-sale", new(customer.Data!.Id, [new(product.Data!.Id, 1m, 100m)]));
        Assert.True(sale.Success);
        return (tenant, customer.Data.Id, sale.Data!.Id);
    }

    [PostgresFact]
    public async Task ConcurrentStockAdjustmentRetriesChangeInventoryOnlyOnce()
    {
        await using var database = new Database();
        await database.Initialize();
        var (tenant, _, _) = await Seed(database);
        Guid productId;
        await using (var db = database.Open())
        {
            productId = (await new BusinessService(db).CreateProductAsync(tenant,
                new("Retry adjustment", null, "pcs", 10m, null, StockQuantity: 10m, TrackInventory: true))).Data!.Id;
        }
        async Task Apply()
        {
            await using var db = database.Open();
            var result = await new BusinessService(db).CreateStockAdjustmentAsync(tenant, null,
                new(productId, -3m, "damaged", "fixture"), "concurrent-stock-retry");
            Assert.True(result.Success, result.Message);
        }
        await Task.WhenAll(Apply(), Apply());
        await using var verify = database.Open();
        var service = new BusinessService(verify);
        Assert.Equal(7m, (await service.GetProductAsync(tenant, productId)).Data!.StockQuantity);
        Assert.Single((await service.GetStockAdjustmentsAsync(tenant, productId)).Data!);
    }

    [PostgresFact]
    public async Task ConcurrentPaymentsCannotOverpayAndRetransmissionIsIdempotent()
    {
        await using var database = new Database();
        await database.Initialize();
        var (tenant, _, sale) = await Seed(database);
        async Task<bool> Pay(string key)
        {
            await using var db = database.Open();
            return (await new BusinessService(db).RecordPaymentAsync(tenant, sale, key, new(60m, "Cash"))).Success;
        }
        var competing = await Task.WhenAll(Pay("payment-a"), Pay("payment-b"));
        Assert.Single(competing.Where(success => success));
        var winningKey = competing[0] ? "payment-a" : "payment-b";
        var replays = await Task.WhenAll(Pay(winningKey), Pay(winningKey));
        Assert.All(replays, Assert.True);
        await using var check = database.Open();
        Assert.Equal(60m, await check.BusinessPayments.SumAsync(payment => payment.Amount));
        Assert.Equal(1, await check.BusinessPayments.CountAsync());
    }

    [PostgresFact]
    public async Task OtherTenantCannotReadCustomerOrPayAnotherTenantsSale()
    {
        await using var database = new Database();
        await database.Initialize();
        var (_, customer, sale) = await Seed(database);
        var (otherTenant, _, _) = await Seed(database);
        await using var db = database.Open();
        var service = new BusinessService(db);
        Assert.False((await service.GetCustomerAsync(otherTenant, customer)).Success);
        Assert.False((await service.RecordPaymentAsync(otherTenant, sale, "wrong-tenant", new(10m, "Cash"))).Success);
        Assert.Equal(0, await db.BusinessPayments.CountAsync());
        Assert.Equal(2, await db.Sales.CountAsync());
    }
}

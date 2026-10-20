using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;
using Tenvora.Api.Services;

namespace Tenvora.Api.Data;

public static class DatabaseSeeder
{
    public static readonly Guid DemoTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid DemoUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();
        }

        if (!string.Equals(Environment.GetEnvironmentVariable("SEED_DEMO_DATA"), "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var tenant = await context.Tenants.Include(t => t.Users).FirstOrDefaultAsync(t => t.Id == DemoTenantId);
        var currency = Environment.GetEnvironmentVariable("SEED_TENANT_CURRENCY")?.Trim().ToUpperInvariant() ?? "VND";
        var isVnd = currency == "VND";

        if (tenant == null)
        {
            if (await context.Tenants.AnyAsync())
            {
                // Non-empty database with non-demo tenant; preserve existing data
                return;
            }

            var password = ResolveCredential("SEED_ADMIN_PASSWORD", "DemoPassword123!");
            var apiKey = ResolveCredential("SEED_TENANT_API_KEY", "demo_tenant_api_key_tenvora_2026");
            var companyName = Environment.GetEnvironmentVariable("SEED_TENANT_NAME")?.Trim()
                              ?? (isVnd ? "An Nam Specialty Foods" : "Tenvora Demo Retail");
            var email = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL")?.Trim().ToLowerInvariant()
                        ?? "owner@tenvora.internal";

            tenant = new Tenant
            {
                Id = DemoTenantId,
                CompanyName = companyName,
                ApiKey = apiKey,
                PlanType = "Business",
                BaseCurrency = currency,
                BusinessType = "retail",
                OnboardingCompleted = true,
                Status = "Active"
            };

            tenant.Users.Add(new User
            {
                Id = DemoUserId,
                TenantId = tenant.Id,
                Email = email,
                FullName = isVnd ? "Nguyễn Văn An" : "Alex Morgan",
                PasswordHash = PasswordHasher.Hash(password),
                HasPassword = true,
                Role = "TenantAdmin",
                PreferredCurrency = currency
            });

            context.Tenants.Add(tenant);
            await context.SaveChangesAsync();
        }

        // Seed realistic business records for demo tenant if none exist yet
        if (!await context.Products.AnyAsync(p => p.TenantId == tenant.Id))
        {
            await SeedDemoBusinessRecordsAsync(context, tenant.Id, currency, isVnd);
        }
    }

    private static async Task SeedDemoBusinessRecordsAsync(AppDbContext context, Guid tenantId, string currency, bool isVnd)
    {
        var now = DateTime.UtcNow;

        // 1. Products (including low-stock item to demonstrate inventory alert)
        var products = isVnd
            ? new List<Product>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Gạo ST25 Ông Cua (Túi 5kg)", Sku = "RICE-ST25-5K", Unit = "túi", DefaultPrice = 210000m, CostPrice = 165000m, StockQuantity = 45m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Nước mắm Khải Hoàn 40N (Chai 500ml)", Sku = "FISH-SAUCE-KH", Unit = "chai", DefaultPrice = 95000m, CostPrice = 72000m, StockQuantity = 28m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Cà phê Robusta Buôn Ma Thuột (Gói 500g)", Sku = "COFFEE-BMT-500", Unit = "gói", DefaultPrice = 135000m, CostPrice = 95000m, StockQuantity = 4m, MinStockLevel = 15m, Currency = currency, TrackInventory = true }, // Low stock
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Trà Oolong Cầu Đất (Hộp 250g)", Sku = "TEA-OOLONG-CD", Unit = "hộp", DefaultPrice = 180000m, CostPrice = 125000m, StockQuantity = 24m, MinStockLevel = 8m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Hạt điều rang muối Bình Phước (Hũ 500g)", Sku = "CASHEW-BP-500", Unit = "hũ", DefaultPrice = 160000m, CostPrice = 118000m, StockQuantity = 35m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Mật ong hoa nhãn Hưng Yên (Chai 750ml)", Sku = "HONEY-HY-750", Unit = "chai", DefaultPrice = 220000m, CostPrice = 155000m, StockQuantity = 16m, MinStockLevel = 5m, Currency = currency, TrackInventory = true }
            }
            : new List<Product>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "ST25 Premium Jasmine Rice (5kg)", Sku = "RICE-ST25-5K", Unit = "bag", DefaultPrice = 25.00m, CostPrice = 16.50m, StockQuantity = 45m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Khai Hoan Premium Fish Sauce (500ml)", Sku = "FISH-SAUCE-KH", Unit = "bottle", DefaultPrice = 12.00m, CostPrice = 7.50m, StockQuantity = 28m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Dak Lak Robusta Coffee (500g)", Sku = "COFFEE-BMT-500", Unit = "pack", DefaultPrice = 14.50m, CostPrice = 9.00m, StockQuantity = 4m, MinStockLevel = 15m, Currency = currency, TrackInventory = true }, // Low stock
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Cau Dat Mountain Oolong Tea (250g)", Sku = "TEA-OOLONG-CD", Unit = "box", DefaultPrice = 18.00m, CostPrice = 12.00m, StockQuantity = 24m, MinStockLevel = 8m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Roasted Cashews Salted (500g)", Sku = "CASHEW-BP-500", Unit = "jar", DefaultPrice = 15.00m, CostPrice = 10.50m, StockQuantity = 35m, MinStockLevel = 10m, Currency = currency, TrackInventory = true },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Wildflower Raw Honey (750ml)", Sku = "HONEY-HY-750", Unit = "bottle", DefaultPrice = 22.00m, CostPrice = 14.00m, StockQuantity = 16m, MinStockLevel = 5m, Currency = currency, TrackInventory = true }
            };

        context.Products.AddRange(products);

        // 2. Customers
        var c1 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Chị Lan (Nhà Hàng Sen Vàng)" : "Lan Nguyen (Golden Lotus Bistro)", Phone = "0903123456", Email = "lan.senvang@example.com", Address = "12 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM" };
        var c2 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Anh Tuấn (Quán Café Mộc)" : "Tuan Tran (Moc Coffee Roasters)", Phone = "0918765432", Email = "tuan.cafemoc@example.com", Address = "45 Trương Định, Phường 6, Quận 3, TP.HCM" };
        var c3 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Cô Mai (Tạp Hóa Bến Thành)" : "Mai Le (Ben Thanh Grocery)", Phone = "0982334455", Email = "mai.benthanh@example.com", Address = "88 Bạch Đằng, Phường 2, Bình Thạnh, TP.HCM" };
        var c4 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Khách vãng lai" : "Walk-in Retail Customer" };
        context.Customers.AddRange(c1, c2, c3, c4);

        // 3. Suppliers
        var s1 = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "HTX Nông Sản Tây Nguyên" : "Highland Farm Cooperative", Phone = "0262388990", Email = "taynguyen@example.com", Address = "Buôn Ma Thuột, Đắk Lắk" };
        var s2 = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Công Ty Nước Mắm Phú Quốc" : "Phu Quoc Traditional Fish Sauce Co.", Phone = "0297384668", Email = "phuquoc@example.com", Address = "Dương Đông, Phú Quốc, Kiên Giang" };
        var s3 = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = isVnd ? "Công Ty Lương Thực Sóc Trăng" : "Soc Trang Grain Corporation", Phone = "0299382211", Email = "soctrang@example.com", Address = "Tp. Sóc Trăng, Tỉnh Sóc Trăng" };
        context.Suppliers.AddRange(s1, s2, s3);

        // 4. Purchases and Payments
        var po1Amount = isVnd ? 4750000m : 450.00m;
        var po1 = new Purchase
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SupplierId = s1.Id, PurchaseNumber = "PO-2026-001",
            Currency = currency, TotalAmount = po1Amount, Status = "Posted", PurchasedAt = now.AddDays(-5),
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-po-1",
            Notes = "Nhập cà phê Robusta đợt đầu tháng"
        };
        po1.Items.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po1.Id, ProductId = products[2].Id,
            Description = products[2].Name, Unit = products[2].Unit, Quantity = 50m,
            UnitCost = isVnd ? 95000m : 9.00m, LineTotal = po1Amount
        });
        po1.Payments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po1.Id, SupplierId = s1.Id,
            Amount = po1Amount, Currency = currency, Method = "BankTransfer", Reference = "VCB-883921",
            PaidAt = now.AddDays(-5), IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-pp-1"
        });

        var po2Amount = isVnd ? 9900000m : 990.00m;
        var po2Paid = isVnd ? 6000000m : 600.00m;
        var po2 = new Purchase
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SupplierId = s3.Id, PurchaseNumber = "PO-2026-002",
            Currency = currency, TotalAmount = po2Amount, Status = "Posted", PurchasedAt = now.AddDays(-3),
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-po-2",
            Notes = "Nhập gạo ST25 đóng bao 5kg (còn nợ đợt 2)"
        };
        po2.Items.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po2.Id, ProductId = products[0].Id,
            Description = products[0].Name, Unit = products[0].Unit, Quantity = 60m,
            UnitCost = isVnd ? 165000m : 16.50m, LineTotal = po2Amount
        });
        po2.Payments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po2.Id, SupplierId = s3.Id,
            Amount = po2Paid, Currency = currency, Method = "BankTransfer", Reference = "BIDV-447812",
            PaidAt = now.AddDays(-3), IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-pp-2"
        });

        var po3Amount = isVnd ? 2880000m : 300.00m;
        var po3 = new Purchase
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SupplierId = s2.Id, PurchaseNumber = "PO-2026-003",
            Currency = currency, TotalAmount = po3Amount, Status = "Posted", PurchasedAt = now.AddDays(-2),
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-po-3",
            Notes = "Nhập nước mắm Khải Hoàn"
        };
        po3.Items.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po3.Id, ProductId = products[1].Id,
            Description = products[1].Name, Unit = products[1].Unit, Quantity = 40m,
            UnitCost = isVnd ? 72000m : 7.50m, LineTotal = po3Amount
        });
        po3.Payments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = po3.Id, SupplierId = s2.Id,
            Amount = po3Amount, Currency = currency, Method = "BankTransfer", Reference = "TCB-112940",
            PaidAt = now.AddDays(-2), IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-pp-3"
        });

        context.Purchases.AddRange(po1, po2, po3);

        // 5. Sales and Customer Payments
        // Sale 1: Partially paid (Lan Nguyen owes 860,000 VND / $96.00)
        var s1Item1 = isVnd ? 2100000m : 250.00m;
        var s1Item2 = isVnd ? 760000m : 96.00m;
        var s1Total = s1Item1 + s1Item2;
        var s1Paid = isVnd ? 2000000m : 250.00m;
        var sale1 = new Sale
        {
            Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = c1.Id, SaleNumber = "INV-2026-001",
            Currency = currency, TotalAmount = s1Total, Status = SaleStatuses.Posted, SoldAt = now,
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sale-1",
            Notes = "Giao hàng tận nơi cho Nhà Hàng Sen Vàng"
        };
        sale1.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale1.Id, ProductId = products[0].Id,
            ProductName = products[0].Name, Unit = products[0].Unit, Quantity = 10m,
            UnitPrice = isVnd ? 210000m : 25.00m, UnitCost = products[0].CostPrice, LineTotal = s1Item1
        });
        sale1.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale1.Id, ProductId = products[1].Id,
            ProductName = products[1].Name, Unit = products[1].Unit, Quantity = 8m,
            UnitPrice = isVnd ? 95000m : 12.00m, UnitCost = products[1].CostPrice, LineTotal = s1Item2
        });
        sale1.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale1.Id, CustomerId = c1.Id,
            Amount = s1Paid, Currency = currency, Method = "BankTransfer", Reference = "QR-LAN-9912",
            PaidAt = now, IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sp-1"
        });

        // Sale 2: Fully paid (Tuan Tran)
        var s2Total = isVnd ? 2025000m : 217.50m;
        var sale2 = new Sale
        {
            Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = c2.Id, SaleNumber = "INV-2026-002",
            Currency = currency, TotalAmount = s2Total, Status = SaleStatuses.Posted, SoldAt = now,
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sale-2",
            Notes = "Café Mộc lấy sỉ cà phê Buôn Ma Thuột"
        };
        sale2.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale2.Id, ProductId = products[2].Id,
            ProductName = products[2].Name, Unit = products[2].Unit, Quantity = 15m,
            UnitPrice = isVnd ? 135000m : 14.50m, UnitCost = products[2].CostPrice, LineTotal = s2Total
        });
        sale2.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale2.Id, CustomerId = c2.Id,
            Amount = s2Total, Currency = currency, Method = "Cash", Reference = "Tiền mặt tại quầy",
            PaidAt = now, IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sp-2"
        });

        // Sale 3: Unpaid (Mai Le owes full amount)
        var s3Item1 = isVnd ? 1050000m : 125.00m;
        var s3Item2 = isVnd ? 800000m : 75.00m;
        var s3Total = s3Item1 + s3Item2;
        var sale3 = new Sale
        {
            Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = c3.Id, SaleNumber = "INV-2026-003",
            Currency = currency, TotalAmount = s3Total, Status = SaleStatuses.Posted, SoldAt = now.AddDays(-1),
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sale-3",
            Notes = "Đơn giao Tạp hóa Bến Thành - hẹn thanh toán cuối tuần"
        };
        sale3.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale3.Id, ProductId = products[0].Id,
            ProductName = products[0].Name, Unit = products[0].Unit, Quantity = 5m,
            UnitPrice = isVnd ? 210000m : 25.00m, UnitCost = products[0].CostPrice, LineTotal = s3Item1
        });
        sale3.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale3.Id, ProductId = products[4].Id,
            ProductName = products[4].Name, Unit = products[4].Unit, Quantity = 5m,
            UnitPrice = isVnd ? 160000m : 15.00m, UnitCost = products[4].CostPrice, LineTotal = s3Item2
        });

        // Sale 4: Walk-in retail customer (Cash in full)
        var s4Item1 = isVnd ? 440000m : 44.00m;
        var s4Item2 = isVnd ? 360000m : 36.00m;
        var s4Total = s4Item1 + s4Item2;
        var sale4 = new Sale
        {
            Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = c4.Id, SaleNumber = "INV-2026-004",
            Currency = currency, TotalAmount = s4Total, Status = SaleStatuses.Posted, SoldAt = now,
            IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sale-4",
            Notes = "Khách mua quà biếu tại quầy"
        };
        sale4.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale4.Id, ProductId = products[5].Id,
            ProductName = products[5].Name, Unit = products[5].Unit, Quantity = 2m,
            UnitPrice = isVnd ? 220000m : 22.00m, UnitCost = products[5].CostPrice, LineTotal = s4Item1
        });
        sale4.Items.Add(new SaleItem
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale4.Id, ProductId = products[3].Id,
            ProductName = products[3].Name, Unit = products[3].Unit, Quantity = 2m,
            UnitPrice = isVnd ? 180000m : 18.00m, UnitCost = products[3].CostPrice, LineTotal = s4Item2
        });
        sale4.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale4.Id, CustomerId = c4.Id,
            Amount = s4Total, Currency = currency, Method = "Cash", Reference = "Tiền mặt",
            PaidAt = now, IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-sp-4"
        });

        context.Sales.AddRange(sale1, sale2, sale3, sale4);

        // 6. Expenses
        var expenses = new List<BusinessExpense>
        {
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Category = "Rent", Amount = isVnd ? 8000000m : 600.00m, Currency = currency, Description = "Tiền thuê mặt bằng cửa hàng tháng này", ExpenseDate = now.AddDays(-3), IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-exp-1" },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Category = "Utilities", Amount = isVnd ? 1250000m : 95.00m, Currency = currency, Description = "Hóa đơn điện nước & internet tháng", ExpenseDate = now.AddDays(-2), IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-exp-2" },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Category = "Logistics", Amount = isVnd ? 350000m : 25.00m, Currency = currency, Description = "Cước vận chuyển giao hàng khách sỉ", ExpenseDate = now, IdempotencyKey = Guid.NewGuid().ToString("N"), RequestHash = "seed-exp-3" }
        };
        context.BusinessExpenses.AddRange(expenses);

        // 7. Stock Adjustment (recount audit trail)
        var adj = new StockAdjustment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = products[2].Id,
            UserId = DemoUserId,
            QuantityBefore = 5m,
            AdjustmentQuantity = -1m,
            QuantityAfter = 4m,
            Reason = "damaged",
            Notes = "Rách bao bì trong lúc sắp xếp kệ hàng (kiểm kê định kỳ)",
            AdjustedAt = now.AddDays(-1),
            CreatedAt = now.AddDays(-1)
        };
        context.StockAdjustments.Add(adj);

        await context.SaveChangesAsync();
    }

    private static string ResolveCredential(string name, string fallback)
    {
        var value = Environment.GetEnvironmentVariable(name)?.Trim();
        if (string.IsNullOrWhiteSpace(value) || value.StartsWith("your_", StringComparison.OrdinalIgnoreCase))
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (string.Equals(env, "Development", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(env))
            {
                return fallback;
            }
            throw new InvalidOperationException($"{name} must be configured when SEED_DEMO_DATA=true in non-development environments.");
        }
        return value;
    }
}

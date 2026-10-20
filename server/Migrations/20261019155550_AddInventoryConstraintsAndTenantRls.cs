using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryConstraintsAndTenantRls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_MinStockLevel_NonNegative",
                table: "Products",
                sql: "\"MinStockLevel\" IS NULL OR \"MinStockLevel\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_StockQuantity_NonNegative",
                table: "Products",
                sql: "\"StockQuantity\" >= 0");

            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                var tables = new[]
                {
                    "Customers", "Products", "Sales", "SaleItems", "BusinessPayments",
                    "Suppliers", "Purchases", "PurchaseItems", "PurchasePayments",
                    "BusinessExpenses", "StockAdjustments", "AiActions", "AiConversations",
                    "AiConversationMessages", "AuditLogs", "Users"
                };

                foreach (var table in tables)
                {
                    migrationBuilder.Sql($@"
DO $$
BEGIN
    ALTER TABLE ""{table}"" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ""{table}"" FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS ""{table}_tenant_isolation"" ON ""{table}"";
    CREATE POLICY ""{table}_tenant_isolation"" ON ""{table}""
        FOR ALL
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
            OR ""TenantId""::text = current_setting('app.current_tenant_id', true)
        )
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
            OR ""TenantId""::text = current_setting('app.current_tenant_id', true)
        );
END $$;");
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                var tables = new[]
                {
                    "Customers", "Products", "Sales", "SaleItems", "BusinessPayments",
                    "Suppliers", "Purchases", "PurchaseItems", "PurchasePayments",
                    "BusinessExpenses", "StockAdjustments", "AiActions", "AiConversations",
                    "AiConversationMessages", "AuditLogs", "Users"
                };

                foreach (var table in tables)
                {
                    migrationBuilder.Sql($@"
DO $$
BEGIN
    DROP POLICY IF EXISTS ""{table}_tenant_isolation"" ON ""{table}"";
    ALTER TABLE ""{table}"" NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE ""{table}"" DISABLE ROW LEVEL SECURITY;
END $$;");
                }
            }

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_MinStockLevel_NonNegative",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_StockQuantity_NonNegative",
                table: "Products");
        }
    }
}

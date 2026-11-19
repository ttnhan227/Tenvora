using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRlsToNewTenantTables : Migration
    {
        private static readonly string[] TenantTables =
        [
            "AiTelemetryEvents",
            "RecurringExpenseTemplates",
            "TenantExtractionRules"
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider != "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                return;
            }

            foreach (var table in TenantTables)
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider != "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                return;
            }

            foreach (var table in TenantTables)
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
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWebhookOutboxAndRls : Migration
    {
        private static readonly string[] TenantTables =
        [
            "WebhookEndpoints",
            "WebhookOutboxEvents"
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WebhookEndpoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SigningSecret = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    EventTypes = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookEndpoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebhookEndpoints_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WebhookOutboxEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EndpointId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DeliveryId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    TraceParent = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    MaxAttempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    NextAttemptAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastHttpStatusCode = table.Column<int>(type: "integer", nullable: true),
                    LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeadLetteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookOutboxEvents", x => x.Id);
                    table.CheckConstraint("CK_WebhookOutboxEvents_Status", "\"Status\" IN ('Pending','Delivering','Delivered','DeadLettered')");
                    table.ForeignKey(
                        name: "FK_WebhookOutboxEvents_WebhookEndpoints_EndpointId",
                        column: x => x.EndpointId,
                        principalTable: "WebhookEndpoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEndpoints_TenantId_IsActive",
                table: "WebhookEndpoints",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_WebhookOutboxEvents_EndpointId_DeliveryId",
                table: "WebhookOutboxEvents",
                columns: new[] { "EndpointId", "DeliveryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WebhookOutboxEvents_Status_NextAttemptAt",
                table: "WebhookOutboxEvents",
                columns: new[] { "Status", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WebhookOutboxEvents_TenantId_Status_CreatedAt",
                table: "WebhookOutboxEvents",
                columns: new[] { "TenantId", "Status", "CreatedAt" });

            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
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

            migrationBuilder.DropTable(
                name: "WebhookOutboxEvents");

            migrationBuilder.DropTable(
                name: "WebhookEndpoints");
        }
    }
}

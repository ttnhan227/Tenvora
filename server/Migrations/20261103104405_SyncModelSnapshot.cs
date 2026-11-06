using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Idempotent: some environments already received these schema objects outside the migration history.
    /// </remarks>
    public partial class SyncModelSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Suppliers" ADD COLUMN IF NOT EXISTS "PaymentTermsDays" integer NULL;
                ALTER TABLE "Purchases" ADD COLUMN IF NOT EXISTS "DocumentHash" character varying(64) NULL;
                ALTER TABLE "Purchases" ADD COLUMN IF NOT EXISTS "DueDate" timestamp with time zone NULL;
                ALTER TABLE "BusinessExpenses" ADD COLUMN IF NOT EXISTS "DocumentHash" character varying(64) NULL;

                CREATE TABLE IF NOT EXISTS "AiTelemetryEvents" (
                    "Id" uuid NOT NULL,
                    "TenantId" uuid NOT NULL,
                    "UserId" uuid NOT NULL,
                    "EventType" character varying(50) NOT NULL,
                    "Intent" character varying(50) NOT NULL,
                    "DurationMs" bigint NOT NULL,
                    "FieldsCorrectedCount" integer NOT NULL,
                    "AcceptedWithoutEdits" boolean NOT NULL,
                    "IsError" boolean NOT NULL,
                    "ErrorMessage" character varying(500) NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_AiTelemetryEvents" PRIMARY KEY ("Id")
                );

                CREATE TABLE IF NOT EXISTS "RecurringExpenseTemplates" (
                    "Id" uuid NOT NULL,
                    "TenantId" uuid NOT NULL,
                    "Category" character varying(50) NOT NULL,
                    "Amount" numeric(18,4) NOT NULL,
                    "Currency" character varying(3) NOT NULL DEFAULT 'USD',
                    "Description" character varying(1000) NULL,
                    "Frequency" character varying(20) NOT NULL DEFAULT 'monthly',
                    "NextDueDate" timestamp with time zone NOT NULL,
                    "IsActive" boolean NOT NULL DEFAULT TRUE,
                    "LastGeneratedAt" timestamp with time zone NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    CONSTRAINT "PK_RecurringExpenseTemplates" PRIMARY KEY ("Id"),
                    CONSTRAINT "AK_RecurringExpenseTemplates_TenantId_Id" UNIQUE ("TenantId", "Id"),
                    CONSTRAINT "CK_RecurringExpenseTemplates_Amount_Positive" CHECK ("Amount" > 0),
                    CONSTRAINT "FK_RecurringExpenseTemplates_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS "TenantExtractionRules" (
                    "Id" uuid NOT NULL,
                    "TenantId" uuid NOT NULL,
                    "RuleType" character varying(50) NOT NULL,
                    "RawPattern" character varying(200) NOT NULL,
                    "NormalizedPattern" character varying(200) NOT NULL,
                    "TargetEntityId" uuid NULL,
                    "TargetName" character varying(200) NOT NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "UpdatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_TenantExtractionRules" PRIMARY KEY ("Id"),
                    CONSTRAINT "AK_TenantExtractionRules_TenantId_Id" UNIQUE ("TenantId", "Id"),
                    CONSTRAINT "FK_TenantExtractionRules_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS "IX_Purchases_TenantId_DocumentHash" ON "Purchases" ("TenantId", "DocumentHash");
                CREATE INDEX IF NOT EXISTS "IX_BusinessExpenses_TenantId_DocumentHash" ON "BusinessExpenses" ("TenantId", "DocumentHash");
                CREATE INDEX IF NOT EXISTS "IX_AiTelemetryEvents_TenantId_CreatedAt" ON "AiTelemetryEvents" ("TenantId", "CreatedAt");
                CREATE INDEX IF NOT EXISTS "IX_RecurringExpenseTemplates_TenantId_IsActive_NextDueDate" ON "RecurringExpenseTemplates" ("TenantId", "IsActive", "NextDueDate");
                CREATE INDEX IF NOT EXISTS "IX_TenantExtractionRules_TenantId_RuleType_NormalizedPattern" ON "TenantExtractionRules" ("TenantId", "RuleType", "NormalizedPattern");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS "AiTelemetryEvents";
                DROP TABLE IF EXISTS "RecurringExpenseTemplates";
                DROP TABLE IF EXISTS "TenantExtractionRules";
                DROP INDEX IF EXISTS "IX_Purchases_TenantId_DocumentHash";
                DROP INDEX IF EXISTS "IX_BusinessExpenses_TenantId_DocumentHash";
                ALTER TABLE "Suppliers" DROP COLUMN IF EXISTS "PaymentTermsDays";
                ALTER TABLE "Purchases" DROP COLUMN IF EXISTS "DocumentHash";
                ALTER TABLE "Purchases" DROP COLUMN IF EXISTS "DueDate";
                ALTER TABLE "BusinessExpenses" DROP COLUMN IF EXISTS "DocumentHash";
                """);
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class FreelancerFinancialCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RelatedEntityId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RelatedEntityType",
                table: "Transactions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProjectId",
                table: "Invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "InvoicePayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RequestHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Reference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoicePayments", x => x.Id);
                    table.CheckConstraint("CK_InvoicePayments_Amount_Positive", "\"Amount\" > 0");
                    table.ForeignKey(
                        name: "FK_InvoicePayments_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InvoicePayments_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InvoicePayments_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BudgetAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "USD"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Projects_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    Merchant = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Reference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    ExpenseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Posted"),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RequestHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VoidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                    table.CheckConstraint("CK_Expenses_Amount_Positive", "\"Amount\" > 0");
                    table.ForeignKey(
                        name: "FK_Expenses_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Expenses_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Expenses_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Expenses_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Expenses_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TenantId_RelatedEntityType_RelatedEntityId",
                table: "Transactions",
                columns: new[] { "TenantId", "RelatedEntityType", "RelatedEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_ProjectId",
                table: "Invoices",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_AccountId",
                table: "Expenses",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ClientId",
                table: "Expenses",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ProjectId",
                table: "Expenses",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_Category",
                table: "Expenses",
                columns: new[] { "TenantId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_ExpenseDate",
                table: "Expenses",
                columns: new[] { "TenantId", "ExpenseDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_IdempotencyKey",
                table: "Expenses",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_ProjectId",
                table: "Expenses",
                columns: new[] { "TenantId", "ProjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TransactionId",
                table: "Expenses",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoicePayments_InvoiceId",
                table: "InvoicePayments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoicePayments_TenantId_IdempotencyKey",
                table: "InvoicePayments",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InvoicePayments_TenantId_InvoiceId_PaidAt",
                table: "InvoicePayments",
                columns: new[] { "TenantId", "InvoiceId", "PaidAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InvoicePayments_TransactionId",
                table: "InvoicePayments",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ClientId",
                table: "Projects",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_TenantId_ClientId",
                table: "Projects",
                columns: new[] { "TenantId", "ClientId" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_TenantId_Name",
                table: "Projects",
                columns: new[] { "TenantId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_TenantId_Status",
                table: "Projects",
                columns: new[] { "TenantId", "Status" });

            // Preserve the payment history that the prototype stored directly on invoices.
            // Older rows can represent only their latest linked transaction, so the full paid
            // amount is retained as one legacy-import payment rather than discarded.
            migrationBuilder.Sql("""
                INSERT INTO "InvoicePayments"
                    ("Id", "TenantId", "InvoiceId", "TransactionId", "Amount", "Currency", "IdempotencyKey", "RequestHash", "Reference", "PaidAt", "CreatedAt")
                SELECT
                    md5(random()::text || clock_timestamp()::text)::uuid,
                    i."TenantId", i."Id", i."PaymentTransactionId", i."AmountPaid", i."Currency",
                    'legacy-' || i."Id"::text,
                    'legacy-import-' || i."Id"::text,
                    t."ReferenceNumber",
                    COALESCE(i."PaidAt", t."PostedAt", i."UpdatedAt"),
                    COALESCE(i."PaidAt", t."PostedAt", i."UpdatedAt")
                FROM "Invoices" i
                JOIN "Transactions" t ON t."Id" = i."PaymentTransactionId" AND t."TenantId" = i."TenantId"
                WHERE i."AmountPaid" > 0 AND i."PaymentTransactionId" IS NOT NULL;
                """);

            // Clients and invoices were added after the original tenant-policy migration,
            // so establish their database guardrails alongside the new financial tables.
            foreach (var table in new[] { "Clients", "Invoices", "Projects", "Expenses", "InvoicePayments" })
            {
                migrationBuilder.Sql($"ALTER TABLE IF EXISTS \"{table}\" ENABLE ROW LEVEL SECURITY;");
                migrationBuilder.Sql($"DROP POLICY IF EXISTS \"{table}_tenant_isolation\" ON \"{table}\";");
                migrationBuilder.Sql($"CREATE POLICY \"{table}_tenant_isolation\" ON \"{table}\" FOR ALL USING (\"TenantId\"::text = current_setting('app.current_tenant_id', true)) WITH CHECK (\"TenantId\"::text = current_setting('app.current_tenant_id', true));");
            }

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Projects_ProjectId",
                table: "Invoices",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in new[] { "Clients", "Invoices", "Projects", "Expenses", "InvoicePayments" })
            {
                migrationBuilder.Sql($"DROP POLICY IF EXISTS \"{table}_tenant_isolation\" ON \"{table}\";");
            }

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Projects_ProjectId",
                table: "Invoices");

            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "InvoicePayments");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_TenantId_RelatedEntityType_RelatedEntityId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_ProjectId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "RelatedEntityId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "RelatedEntityType",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "Invoices");
        }
    }
}

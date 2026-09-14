using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class FinancialIntegrityConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Preserve legacy zero-value prototype drafts without allowing new ones.
            // They become immutable cancelled history before the stronger invariant lands.
            migrationBuilder.Sql("""
                UPDATE "Invoices"
                SET "Status" = 'Cancelled', "UpdatedAt" = NOW()
                WHERE "TotalAmount" = 0 AND "AmountPaid" = 0;
                """);

            // Refresh tokens issued by older versions were stored in retrievable
            // form. Force a new login rather than retaining those credentials.
            migrationBuilder.Sql("UPDATE \"RefreshTokens\" SET \"Revoked\" = TRUE WHERE \"Revoked\" = FALSE;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Transactions_Amount_Positive",
                table: "Transactions",
                sql: "\"Amount\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Budget_NonNegative",
                table: "Projects",
                sql: "\"BudgetAmount\" IS NULL OR \"BudgetAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects",
                sql: "\"Status\" IN ('Planned','Active','Completed','Archived')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LedgerEntries_OneSide",
                table: "LedgerEntries",
                sql: "(\"DebitAmount\" > 0 AND \"CreditAmount\" = 0) OR (\"CreditAmount\" > 0 AND \"DebitAmount\" = 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_Amounts",
                table: "Invoices",
                sql: "\"Subtotal\" >= 0 AND \"TaxAmount\" >= 0 AND (\"TotalAmount\" > 0 OR (\"Status\" = 'Cancelled' AND \"TotalAmount\" = 0)) AND \"AmountPaid\" >= 0 AND \"AmountPaid\" <= \"TotalAmount\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_Dates",
                table: "Invoices",
                sql: "\"DueDate\" >= \"IssueDate\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_Status",
                table: "Invoices",
                sql: "\"Status\" IN ('Draft','Sent','Viewed','PartiallyPaid','Paid','Overdue','Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Expenses_Category",
                table: "Expenses",
                sql: "\"Category\" IN ('Software','Equipment','Workspace','Transportation','Marketing','Professional Services','Education','Other')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Expenses_Status",
                table: "Expenses",
                sql: "\"Status\" IN ('Posted','Void')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Transactions_Amount_Positive",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Budget_NonNegative",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LedgerEntries_OneSide",
                table: "LedgerEntries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_Amounts",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_Dates",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_Status",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Expenses_Category",
                table: "Expenses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Expenses_Status",
                table: "Expenses");
        }
    }
}

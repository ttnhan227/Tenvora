using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowAiActionUndoneStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AiActions_Status",
                table: "AiActions");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AiActions_Status",
                table: "AiActions",
                sql: "\"Status\" IN ('PendingConfirmation','Executing','Executed','Undone','Cancelled','Expired','Failed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AiActions_Status",
                table: "AiActions");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AiActions_Status",
                table: "AiActions",
                sql: "\"Status\" IN ('PendingConfirmation','Executing','Executed','Cancelled','Expired','Failed')");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAiActionProposals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AiActionId",
                table: "AuditLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ConfirmationGiven",
                table: "AuditLogs",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ConfirmationRequired",
                table: "AuditLogs",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "AuditLogs",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.CreateTable(
                name: "AiActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Intent = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RiskLevel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    RequiresConfirmation = table.Column<bool>(type: "boolean", nullable: false),
                    SourceText = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UiContextJson = table.Column<string>(type: "jsonb", nullable: true),
                    PayloadJson = table.Column<string>(type: "jsonb", nullable: false),
                    ResultJson = table.Column<string>(type: "jsonb", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AffectedEntityType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    AffectedEntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiActions", x => x.Id);
                    table.CheckConstraint("CK_AiActions_Status", "\"Status\" IN ('PendingConfirmation','Executing','Executed','Cancelled','Expired','Failed')");
                    table.ForeignKey(
                        name: "FK_AiActions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiActions_TenantId_IdempotencyKey",
                table: "AiActions",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiActions_TenantId_UserId_CreatedAt",
                table: "AiActions",
                columns: new[] { "TenantId", "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiActions");

            migrationBuilder.DropColumn(
                name: "AiActionId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "ConfirmationGiven",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "ConfirmationRequired",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Origin",
                table: "AuditLogs");
        }
    }
}

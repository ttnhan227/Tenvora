using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialCorrectnessAndInventoryTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "SaleItems",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReversed",
                table: "PurchasePayments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReversalReason",
                table: "PurchasePayments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReversedAt",
                table: "PurchasePayments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReversedByUserId",
                table: "PurchasePayments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<bool>(
                name: "TrackInventory",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReversed",
                table: "BusinessPayments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReversalReason",
                table: "BusinessPayments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReversedAt",
                table: "BusinessPayments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReversedByUserId",
                table: "BusinessPayments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StockAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    QuantityBefore = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    AdjustmentQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityAfter = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AdjustedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAdjustments", x => x.Id);
                    table.CheckConstraint("CK_StockAdjustments_NonNegativeAfter", "\"QuantityAfter\" >= 0");
                    table.ForeignKey(
                        name: "FK_StockAdjustments_Products_TenantId_ProductId",
                        columns: x => new { x.TenantId, x.ProductId },
                        principalTable: "Products",
                        principalColumns: new[] { "TenantId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchasePayments_TenantId_IsReversed",
                table: "PurchasePayments",
                columns: new[] { "TenantId", "IsReversed" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessPayments_TenantId_IsReversed",
                table: "BusinessPayments",
                columns: new[] { "TenantId", "IsReversed" });

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_TenantId_AdjustedAt",
                table: "StockAdjustments",
                columns: new[] { "TenantId", "AdjustedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_TenantId_ProductId",
                table: "StockAdjustments",
                columns: new[] { "TenantId", "ProductId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockAdjustments");

            migrationBuilder.DropIndex(
                name: "IX_PurchasePayments_TenantId_IsReversed",
                table: "PurchasePayments");

            migrationBuilder.DropIndex(
                name: "IX_BusinessPayments_TenantId_IsReversed",
                table: "BusinessPayments");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "IsReversed",
                table: "PurchasePayments");

            migrationBuilder.DropColumn(
                name: "ReversalReason",
                table: "PurchasePayments");

            migrationBuilder.DropColumn(
                name: "ReversedAt",
                table: "PurchasePayments");

            migrationBuilder.DropColumn(
                name: "ReversedByUserId",
                table: "PurchasePayments");

            migrationBuilder.DropColumn(
                name: "TrackInventory",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsReversed",
                table: "BusinessPayments");

            migrationBuilder.DropColumn(
                name: "ReversalReason",
                table: "BusinessPayments");

            migrationBuilder.DropColumn(
                name: "ReversedAt",
                table: "BusinessPayments");

            migrationBuilder.DropColumn(
                name: "ReversedByUserId",
                table: "BusinessPayments");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Products",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);
        }
    }
}

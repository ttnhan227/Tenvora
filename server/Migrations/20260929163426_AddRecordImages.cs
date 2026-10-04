using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenvora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InvoiceImageDataUrl",
                table: "Purchases",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageDataUrl",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptImageDataUrl",
                table: "BusinessExpenses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InvoiceImageDataUrl",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ImageDataUrl",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ReceiptImageDataUrl",
                table: "BusinessExpenses");
        }
    }
}

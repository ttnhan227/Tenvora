using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeriSpend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDemoTenantLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DemoExpiresAt",
                table: "Tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDemo",
                table: "Tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DemoExpiresAt",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "IsDemo",
                table: "Tenants");
        }
    }
}

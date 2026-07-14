using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace VeriSpend.Api.Common;

public sealed class SwaggerTagDescriptionsDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        swaggerDoc.Tags =
        [
            new OpenApiTag
            {
                Name = "Auth",
                Description = "Authentication endpoints for registration, login, token refresh, and current-user profile lookup."
            },
            new OpenApiTag
            {
                Name = "Expenses",
                Description = "Create, browse, update, delete, and summarize expense records for the signed-in tenant."
            },
            new OpenApiTag
            {
                Name = "Manager",
                Description = "Manager and admin approval workflow endpoints, including export and audit trail access."
            },
            new OpenApiTag
            {
                Name = "Settings",
                Description = "Tenant-level company and policy settings endpoints."
            },
            new OpenApiTag
            {
                Name = "Ai",
                Description = "Receipt upload, AI-assisted confirmation, and AI usage reporting endpoints."
            }
        ];
    }
}

public sealed class SwaggerExamplesOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var relativePath = context.ApiDescription.RelativePath?.TrimEnd('/');
        var httpMethod = context.ApiDescription.HttpMethod;

        if (!string.Equals(relativePath, "api/auth/login", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(httpMethod, "POST", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        operation.Summary = "Sign in and get JWT tokens";
        operation.Description = "Submit credentials, copy the returned accessToken, then use the Authorize button with Bearer {accessToken} to call protected endpoints.";

        if (operation.RequestBody?.Content.TryGetValue("application/json", out var mediaType) == true)
        {
            mediaType.Example = new OpenApiObject
            {
                ["email"] = new OpenApiString("admin@admin.com"),
                ["password"] = new OpenApiString("123")
            };
        }
    }
}
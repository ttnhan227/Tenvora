using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Tenvora.Api.Common;

public sealed class SwaggerTagDescriptionsDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        swaggerDoc.Tags =
        [
            new OpenApiTag
            {
                Name = "Auth",
                Description = "Authentication endpoints for enterprise registration, login, token refresh, and user profile management."
            },
            new OpenApiTag
            {
                Name = "Accounts",
                Description = "Manage customer and settlement financial accounts and balances."
            },
            new OpenApiTag
            {
                Name = "Payments",
                Description = "Idempotent payment initiation, processing, and transaction lifecycle management."
            },
            new OpenApiTag
            {
                Name = "Ledger",
                Description = "Immutable double-entry journal records, balance history, and financial audit logs."
            },
            new OpenApiTag
            {
                Name = "Reconciliation",
                Description = "Automated ledger consistency verification and discrepancy reporting."
            },
            new OpenApiTag
            {
                Name = "Risk",
                Description = "Deterministic rule-based risk evaluation and compliance screening."
            },
            new OpenApiTag
            {
                Name = "Operations",
                Description = "Internal operations monitoring, batch settlement, and incident management."
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
                ["email"] = new OpenApiString("admin@tenvora.internal"),
                ["password"] = new OpenApiString("AdminPass123!")
            };
        }
    }
}

public sealed class AuthorizeCheckOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var hasAllowAnonymous = context.MethodInfo.DeclaringType?.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any() == true
            || context.MethodInfo.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any();

        if (hasAllowAnonymous)
        {
            operation.Security?.Clear();
            return;
        }

        var hasAuthorize = context.MethodInfo.DeclaringType?.GetCustomAttributes(true).OfType<AuthorizeAttribute>().Any() == true
            || context.MethodInfo.GetCustomAttributes(true).OfType<AuthorizeAttribute>().Any();

        if (hasAuthorize)
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = JwtBearerDefaults.AuthenticationScheme
                        }
                    },
                    []
                }
            });
        }
    }
}

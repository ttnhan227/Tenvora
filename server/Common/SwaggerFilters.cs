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
                Description = "Register, sign in, refresh access, and read the current business profile."
            },
            new OpenApiTag
            {
                Name = "BusinessDashboard",
                Description = "Today's activity, incoming and outgoing money, and outstanding balances."
            },
            new OpenApiTag
            {
                Name = "Sales",
                Description = "Customer sales and append-only customer payment history."
            },
            new OpenApiTag
            {
                Name = "Purchases",
                Description = "Supplier purchases and append-only supplier payment history."
            },
            new OpenApiTag
            {
                Name = "Customers",
                Description = "Customer details, search, balances, and activity history."
            },
            new OpenApiTag
            {
                Name = "Suppliers",
                Description = "Supplier details, search, balances, and purchase history."
            },
            new OpenApiTag
            {
                Name = "BusinessExpenses",
                Description = "Simple categorized business spending records."
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

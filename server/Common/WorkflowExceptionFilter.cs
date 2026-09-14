using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Tenvora.Api.Common;

public sealed class WorkflowExceptionFilter(ILogger<WorkflowExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        ApiResult body;
        int status;
        switch (context.Exception)
        {
            case ValidationException validation:
                status = StatusCodes.Status400BadRequest;
                body = ApiResult.Fail(validation.Message);
                body.Code = "validation_failed";
                break;
            case InvalidOperationException invalid:
                status = StatusCodes.Status400BadRequest;
                body = ApiResult.Fail(invalid.Message);
                body.Code = "operation_invalid";
                break;
            case DbUpdateConcurrencyException:
                status = StatusCodes.Status409Conflict;
                body = ApiResult.Fail("This record was updated by another session. Refresh and try again.");
                body.Code = "concurrency_conflict";
                break;
            case DbUpdateException database:
                logger.LogWarning(database, "A database constraint rejected request {TraceId}.", context.HttpContext.TraceIdentifier);
                status = StatusCodes.Status409Conflict;
                body = ApiResult.Fail("The change conflicts with an existing financial record.");
                body.Code = "data_conflict";
                break;
            default:
                logger.LogError(context.Exception, "Unhandled request failure {TraceId}.", context.HttpContext.TraceIdentifier);
                status = StatusCodes.Status500InternalServerError;
                body = ApiResult.Fail("We couldn't complete this request. Please try again.");
                body.Code = "unexpected_error";
                break;
        }
        context.Result = new ObjectResult(body) { StatusCode = status };
        context.ExceptionHandled = true;
    }
}

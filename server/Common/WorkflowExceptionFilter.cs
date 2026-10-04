using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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
                var postgres = database.InnerException as PostgresException;
                (status, body) = postgres?.SqlState switch
                {
                    PostgresErrorCodes.UniqueViolation => (
                        StatusCodes.Status409Conflict,
                        Failure("A record with the same unique details already exists.", "duplicate_record")),
                    PostgresErrorCodes.ForeignKeyViolation => (
                        StatusCodes.Status409Conflict,
                        Failure("This record is linked to other business history and cannot be changed that way.", "linked_record")),
                    PostgresErrorCodes.StringDataRightTruncation => (
                        StatusCodes.Status400BadRequest,
                        Failure("One of the supplied values is too long. Shorten it and try again.", "value_too_long")),
                    PostgresErrorCodes.CheckViolation => (
                        StatusCodes.Status400BadRequest,
                        Failure("The supplied values violate a business rule. Review them and try again.", "constraint_failed")),
                    _ => (
                        StatusCodes.Status409Conflict,
                        Failure("The database could not save this change because it conflicts with existing data.", "data_conflict"))
                };
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

    private static ApiResult Failure(string message, string code)
    {
        var result = ApiResult.Fail(message);
        result.Code = code;
        return result;
    }
}

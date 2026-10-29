using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tenvora.Api.Localization;

namespace Tenvora.Api.Common;

public sealed class WorkflowExceptionFilter(ILogger<WorkflowExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var localizer = context.HttpContext.RequestServices.GetService<IAppLocalizer>();
        string Msg(string key, string fallback) => localizer?.GetString(key) ?? fallback;

        ApiResult body;
        int status;
        switch (context.Exception)
        {
            case ValidationException validation:
                status = StatusCodes.Status400BadRequest;
                body = ApiResult.Fail(validation.Message, "validation_failed");
                break;
            case InvalidOperationException invalid:
                status = StatusCodes.Status400BadRequest;
                body = ApiResult.Fail(invalid.Message, "operation_invalid");
                break;
            case DbUpdateConcurrencyException:
                status = StatusCodes.Status409Conflict;
                body = Failure(Msg("error.concurrency_conflict", "This record was updated by another session. Refresh and try again."), "concurrency_conflict");
                break;
            case DbUpdateException database:
                logger.LogWarning(database, "A database constraint rejected request {TraceId}.", context.HttpContext.TraceIdentifier);
                var postgres = database.InnerException as PostgresException;
                (status, body) = postgres?.SqlState switch
                {
                    PostgresErrorCodes.UniqueViolation => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_record", "A record with the same unique details already exists."), "duplicate_record")),
                    PostgresErrorCodes.ForeignKeyViolation => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.linked_record", "This record is linked to other business history and cannot be changed that way."), "linked_record")),
                    PostgresErrorCodes.StringDataRightTruncation => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.value_too_long", "One of the supplied values is too long. Shorten it and try again."), "value_too_long")),
                    PostgresErrorCodes.CheckViolation => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.constraint_failed", "The supplied values violate a business rule. Review them and try again."), "constraint_failed")),
                    _ => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.data_conflict", "The database could not save this change because it conflicts with existing data."), "data_conflict"))
                };
                break;
            default:
                logger.LogError(context.Exception, "Unhandled request failure {TraceId}.", context.HttpContext.TraceIdentifier);
                status = StatusCodes.Status500InternalServerError;
                body = Failure(Msg("error.unexpected", "We couldn't complete this request. Please try again."), "unexpected_error");
                break;
        }
        context.Result = new ObjectResult(body) { StatusCode = status };
        context.ExceptionHandled = true;
    }

    private static ApiResult Failure(string message, string code)
    {
        var result = ApiResult.Fail(message, code);
        return result;
    }
}

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
                var constraint = postgres?.ConstraintName ?? string.Empty;
                (status, body) = postgres?.SqlState switch
                {
                    PostgresErrorCodes.UniqueViolation when constraint.Contains("Sku", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_sku", "A product with this SKU already exists. Please choose a different code."), "duplicate_sku")),
                    PostgresErrorCodes.UniqueViolation when constraint.Contains("SaleNumber", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_sale_number", "An invoice with this receipt number already exists."), "duplicate_sale_number")),
                    PostgresErrorCodes.UniqueViolation when constraint.Contains("PurchaseNumber", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_purchase_number", "A purchase order with this number already exists."), "duplicate_purchase_number")),
                    PostgresErrorCodes.UniqueViolation when constraint.Contains("Email", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_email", "This email address is already registered."), "duplicate_email")),
                    PostgresErrorCodes.UniqueViolation when constraint.Contains("IdempotencyKey", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_transaction", "This transaction has already been submitted. Please refresh to view the updated record."), "duplicate_transaction")),
                    PostgresErrorCodes.UniqueViolation => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.duplicate_record", "A record with the same unique details already exists."), "duplicate_record")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("StockQuantity", StringComparison.OrdinalIgnoreCase) || constraint.Contains("NonNegativeAfter", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.stock_negative", "Stock quantity cannot drop below zero. Please verify your inventory count."), "stock_negative")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("Price", StringComparison.OrdinalIgnoreCase) || constraint.Contains("Cost", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.price_negative", "Product price cannot be negative."), "price_negative")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("Sales_Total", StringComparison.OrdinalIgnoreCase) || constraint.Contains("Purchases_Total", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.total_positive", "Transaction total amount must be greater than zero."), "total_positive")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("PositiveValues", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.quantity_positive", "Item quantity must be greater than zero."), "quantity_positive")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("Payments_Amount", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.payment_positive", "Payment amount must be greater than zero."), "payment_positive")),
                    PostgresErrorCodes.CheckViolation when constraint.Contains("BusinessExpenses", StringComparison.OrdinalIgnoreCase) || constraint.Contains("RecurringExpense", StringComparison.OrdinalIgnoreCase) => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.expense_positive", "Expense amount must be greater than zero."), "expense_positive")),
                    PostgresErrorCodes.CheckViolation => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.constraint_failed", "The supplied values violate a business rule. Review them and try again."), "constraint_failed")),
                    PostgresErrorCodes.ForeignKeyViolation => (
                        StatusCodes.Status409Conflict,
                        Failure(Msg("error.linked_record", "This record is linked to other business history and cannot be changed that way."), "linked_record")),
                    PostgresErrorCodes.StringDataRightTruncation => (
                        StatusCodes.Status400BadRequest,
                        Failure(Msg("error.value_too_long", "One of the supplied values is too long. Shorten it and try again."), "value_too_long")),
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

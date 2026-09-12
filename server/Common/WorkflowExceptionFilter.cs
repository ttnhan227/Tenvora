using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace Tenvora.Api.Common;
public sealed class WorkflowExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is InvalidOperationException)
        {
            context.Result = new BadRequestObjectResult(ApiResult.Fail(context.Exception.Message));
            context.ExceptionHandled = true;
        }
    }
}

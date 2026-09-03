namespace Tenvora.Api.Common;

public class ApiResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> Errors { get; set; } = [];

    public static ApiResult Ok(string? message = null) =>
        new() { Success = true, Message = message ?? "Success" };

    public static ApiResult Fail(string error) =>
        new() { Success = false, Message = error, Errors = [error] };

    public static ApiResult Fail(List<string> errors) =>
        new() { Success = false, Message = errors.FirstOrDefault() ?? "Operation failed", Errors = errors };
}

public class ApiResult<T> : ApiResult
{
    public T? Data { get; set; }

    public static ApiResult<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message ?? "Success" };

    public new static ApiResult<T> Fail(string error) =>
        new() { Success = false, Message = error, Errors = [error] };

    public new static ApiResult<T> Fail(List<string> errors) =>
        new() { Success = false, Message = errors.FirstOrDefault() ?? "Operation failed", Errors = errors };
}

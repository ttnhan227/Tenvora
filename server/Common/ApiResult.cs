namespace VeriSpend.Api.Common;

public sealed class ApiResult
{
    public bool Success { get; init; }
    public string? Error { get; init; }

    public static ApiResult Ok() => new() { Success = true };
    public static ApiResult Fail(string error) => new() { Success = false, Error = error };
}

public sealed class ApiResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }

    public static ApiResult<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResult<T> Fail(string error) => new() { Success = false, Error = error };
}

namespace VeriSpend.Api.Common;

public static class UtcDateTime
{
    public static DateTime Normalize(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    public static DateTime StartOfUtcMonth(DateTime value)
    {
        var utcValue = Normalize(value);
        return new DateTime(utcValue.Year, utcValue.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    public static DateTime UtcDate(DateTime value)
    {
        var utcValue = Normalize(value);
        return new DateTime(utcValue.Year, utcValue.Month, utcValue.Day, 0, 0, 0, DateTimeKind.Utc);
    }
}
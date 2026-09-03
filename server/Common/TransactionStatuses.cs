namespace Tenvora.Api.Common;

public static class TransactionStatuses
{
    public const string Initiated = "Initiated";
    public const string PendingAuthorization = "PendingAuthorization";
    public const string Processing = "Processing";
    public const string Posted = "Posted";
    public const string Settled = "Settled";
    public const string Rejected = "Rejected";
    public const string Failed = "Failed";
    public const string Reversed = "Reversed";
}

public static class TransactionTypes
{
    public const string Transfer = "Transfer";
    public const string Settlement = "Settlement";
    public const string Fee = "Fee";
    public const string Adjustment = "Adjustment";
    public const string Reversal = "Reversal";
}

public static class AccountTypes
{
    public const string Asset = "Asset";
    public const string Liability = "Liability";
    public const string Equity = "Equity";
    public const string Clearing = "Clearing";
    public const string Settlement = "Settlement";
}

public static class AccountStatuses
{
    public const string Active = "Active";
    public const string Frozen = "Frozen";
    public const string Closed = "Closed";
}

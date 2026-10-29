using System.Globalization;

namespace Tenvora.Api.Localization;

public interface IAppLocalizer
{
    string CurrentCultureCode { get; }
    string GetString(string key, params object[] args);
    string GetStringForCulture(string cultureCode, string key, params object[] args);
    string GetProposalSummary(string intent, params object[] args);
    string GetProposalSummaryForCulture(string cultureCode, string intent, params object[] args);
    string GetExecutionMessage(string intent, params object[] args);
    string GetExecutionMessageForCulture(string cultureCode, string intent, params object[] args);
    string GetClarification(string key, params object[] args);
}

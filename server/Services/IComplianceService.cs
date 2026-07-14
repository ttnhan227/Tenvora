using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Compliance;

namespace VeriSpend.Api.Services;

public interface IComplianceService
{
    Task<ApiResult<SoxAuditTrailResponse>> GetSoxAuditTrailAsync(Guid tenantId, DateTime? from, DateTime? to);
    Task<ApiResult<GdprUserDataExport>> ExportUserDataAsync(Guid userId, Guid tenantId);
    Task<ApiResult<GdprDeletionResponse>> DeleteUserDataAsync(Guid userId, Guid tenantId, string requestedBy);
    Task<ApiResult<Soc2ComplianceReport>> GetSoc2ReportAsync(Guid tenantId);
}

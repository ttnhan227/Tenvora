using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

/// <summary>
/// Phase 4 — Compliance Automation endpoints:
///   GET    api/compliance/sox-audit-trail              — tamper-evident SOX audit log
///   GET    api/compliance/gdpr/export/{userId}         — GDPR data export (Art. 15)
///   DELETE api/compliance/gdpr/delete/{userId}         — GDPR right-to-erasure (Art. 17)
///   GET    api/compliance/soc2-report                  — SOC2 control check report
/// </summary>
[ApiController]
[Authorize(Roles = "Owner")]
[Route("api/compliance")]
public class ComplianceController : ControllerBase
{
    private readonly IComplianceService _complianceService;

    public ComplianceController(IComplianceService complianceService)
    {
        _complianceService = complianceService;
    }

    /// <summary>
    /// SOX Audit Trail — returns an immutable, hash-chained audit trail for the tenant.
    /// Supports optional date range filtering via query parameters.
    /// </summary>
    [HttpGet("sox-audit-trail")]
    public async Task<IActionResult> GetSoxAuditTrail(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var tenantId = User.GetTenantId();
        var result = await _complianceService.GetSoxAuditTrailAsync(tenantId, from, to);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// GDPR Data Export — exports all personal data for a specific user (Art. 15 right of access).
    /// </summary>
    [HttpGet("gdpr/export/{userId:guid}")]
    public async Task<IActionResult> ExportUserData(Guid userId)
    {
        var tenantId = User.GetTenantId();
        var result = await _complianceService.ExportUserDataAsync(userId, tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    /// <summary>
    /// GDPR Deletion — anonymizes all PII for a user (Art. 17 right to erasure).
    /// Audit logs are retained but pseudonymized to meet regulatory obligations.
    /// </summary>
    [HttpDelete("gdpr/delete/{userId:guid}")]
    public async Task<IActionResult> DeleteUserData(Guid userId)
    {
        var tenantId = User.GetTenantId();
        var requestedBy = User.GetUserEmail();
        var result = await _complianceService.DeleteUserDataAsync(userId, tenantId, requestedBy);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// SOC2 Compliance Report — evaluates controls across Security, Availability,
    /// Processing Integrity, Confidentiality, and Privacy Trust Service Criteria.
    /// </summary>
    [HttpGet("soc2-report")]
    public async Task<IActionResult> GetSoc2Report()
    {
        var tenantId = User.GetTenantId();
        var result = await _complianceService.GetSoc2ReportAsync(tenantId);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

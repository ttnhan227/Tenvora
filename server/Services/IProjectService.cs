using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IProjectService
{
    Task<ApiResult<List<ProjectSummaryDto>>> GetAsync(Guid tenantId, string? search, string? status, Guid? clientId);
    Task<ApiResult<ProjectSummaryDto>> GetByIdAsync(Guid tenantId, Guid id);
    Task<ApiResult<ProjectSummaryDto>> CreateAsync(Guid tenantId, CreateProjectRequest request);
    Task<ApiResult<ProjectSummaryDto>> UpdateAsync(Guid tenantId, Guid id, UpdateProjectRequest request);
    Task<ApiResult<ProjectSummaryDto>> ArchiveAsync(Guid tenantId, Guid id);
}

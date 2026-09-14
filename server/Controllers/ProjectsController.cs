using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/projects"), Authorize]
public sealed class ProjectsController(IProjectService projects) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? status, [FromQuery] Guid? clientId) =>
        (await projects.GetAsync(User.GetTenantId(), search, status, clientId)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) => (await projects.GetByIdAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpPost, Authorize(Roles = "SoloFreelancer,TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request) =>
        (await projects.CreateAsync(User.GetTenantId(), request)).ToActionResult();

    [HttpPut("{id:guid}"), Authorize(Roles = "SoloFreelancer,TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest request) =>
        (await projects.UpdateAsync(User.GetTenantId(), id, request)).ToActionResult();

    [HttpPost("{id:guid}/archive"), Authorize(Roles = "SoloFreelancer,TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Archive(Guid id) => (await projects.ArchiveAsync(User.GetTenantId(), id)).ToActionResult();
}

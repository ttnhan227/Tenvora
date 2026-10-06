using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Xunit;

namespace Tenvora.Tests;

public sealed class AiFeedbackTests
{
    [Fact]
    public async Task ReportIsPrivateToOwnerAndRepeatSubmissionIsDeduplicated()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var tenant = Guid.NewGuid(); var user = Guid.NewGuid();
        var conversation = new AiConversation { TenantId = tenant, UserId = user };
        var reply = new AiConversationMessage { TenantId = tenant, ConversationId = conversation.Id, Role = "assistant", Content = "Fixture reply" };
        db.AddRange(conversation,reply); await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var controller = new AiFeedbackController(db,NullLogger<AiFeedbackController>.Instance) {
            ControllerContext = new ControllerContext {HttpContext = new DefaultHttpContext {User = new ClaimsPrincipal(new ClaimsIdentity(new[] {new Claim("tenantId",tenant.ToString()),new Claim(ClaimTypes.NameIdentifier,user.ToString())},"test"))}}};
        Assert.IsType<OkObjectResult>(await controller.Report(reply.Id,new("Privacy concern")));
        Assert.IsType<OkObjectResult>(await controller.Report(reply.Id,new("Privacy concern")));
        Assert.Single(db.AuditLogs);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[] {new Claim("tenantId",tenant.ToString()),new Claim(ClaimTypes.NameIdentifier,Guid.NewGuid().ToString())},"test"));
        Assert.IsType<NotFoundObjectResult>(await controller.Report(reply.Id,new("Privacy concern")));
        Assert.Single(db.AuditLogs);
    }
}

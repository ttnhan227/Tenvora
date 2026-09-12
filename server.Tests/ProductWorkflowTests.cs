using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;
namespace Tenvora.Tests;
public class ProductWorkflowTests
{
 private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
 private static TransferService Transfers(AppDbContext db) => new(db, new AccountRepository(db), new TransactionRepository(db), new LedgerRepository(db), new PaymentRequestRepository(db), new IdempotencyRepository(db));
 private static async Task<(Guid Tenant, Account Source, Account Destination)> Seed(AppDbContext db)
 {
  var tenant = Guid.NewGuid();
  var a = new Account { Id = Guid.NewGuid(), TenantId = tenant, AccountNumber = "Operating", AccountType = "Asset", Currency = "USD", CachedBalance = 100, Status = "Active" };
  var b = new Account { Id = Guid.NewGuid(), TenantId = tenant, AccountNumber = "Reserve", AccountType = "Asset", Currency = "USD", Status = "Active" };
  db.Accounts.AddRange(a, b); await db.SaveChangesAsync(); return (tenant, a, b);
 }
 [Fact] public async Task RetryWithChangedReferenceIsRejected()
 {
  using var db = Db(); var (tenant,a,b) = await Seed(db); var service = Transfers(db);
  var request = new CreateTransferRequest(a.Id,b.Id,10,"USD","Original reference");
  var first = await service.ExecuteTransferAsync(tenant,"retry",request);
  await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteTransferAsync(tenant,"retry",request with { Purpose = "Changed reference" }));
  Assert.Single(db.Transactions); Assert.Equal("Original reference",db.Transactions.Single().Description);
  Assert.Equal(first.TransactionId,(await service.ExecuteTransferAsync(tenant,"retry",request)).TransactionId);
 }
 [Fact] public async Task FailedValidationCanBeRetriedWithoutPartialFinancialRecords()
 {
  using var db = Db(); var (tenant,a,b) = await Seed(db); var service = Transfers(db);
  var request = new CreateTransferRequest(a.Id,b.Id,150,"USD","Retry later");
  await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteTransferAsync(tenant,"failed",request));
  Assert.Empty(db.Transactions); Assert.Empty(db.LedgerEntries);
  var source = await db.Accounts.FindAsync(a.Id); source!.CachedBalance=200; await db.SaveChangesAsync();
  await service.ExecuteTransferAsync(tenant,"failed",request); Assert.Single(db.Transactions);
 }
 [Fact] public async Task SettlementRequiresConfirmationAndPreservesMembership()
 {
  using var db = Db(); var (tenant,a,b)=await Seed(db); var transfer=await Transfers(db).ExecuteTransferAsync(tenant,"batch",new(a.Id,b.Id,10,"USD","Batch payment"));
  var service=new SettlementService(db); var batch=await service.CreateDailySettlementBatchAsync(tenant,"usd");
  Assert.Equal("Open",batch.Status); Assert.Null(batch.SettledAt); Assert.Equal("Posted",db.Transactions.Single().Status); Assert.Single(batch.Transactions!);
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.CreateDailySettlementBatchAsync(tenant,"USD"));
  Assert.Null(await service.GetBatchByIdAsync(Guid.NewGuid(),batch.Id));
  var settled=await service.SettleBatchAsync(tenant,batch.Id); Assert.Equal("Settled",settled!.Status); Assert.Equal("Settled",db.Transactions.Single().Status);
  Assert.Equal(settled.SettledAt,(await service.SettleBatchAsync(tenant,batch.Id))!.SettledAt);
 }
 [Fact] public async Task OpenBatchBlocksReversalAndFinalizedBatchAllowsItOnce()
 {
  using var db=Db(); var (tenant,a,b)=await Seed(db); var service=Transfers(db);
  var transfer=await service.ExecuteTransferAsync(tenant,"reverse",new(a.Id,b.Id,10,"USD","Reverse me")); var settlements=new SettlementService(db); var batch=await settlements.CreateDailySettlementBatchAsync(tenant,"USD");
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.ReverseTransactionAsync(tenant,transfer.TransactionId!.Value));
  await settlements.SettleBatchAsync(tenant,batch.Id); await service.ReverseTransactionAsync(tenant,transfer.TransactionId!.Value);
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.ReverseTransactionAsync(tenant,transfer.TransactionId!.Value));
  Assert.Equal(4,db.LedgerEntries.Count()); Assert.Equal(100,a.CachedBalance); Assert.Equal(0,b.CachedBalance);
 }
 [Fact] public async Task AccountCreationRejectsUnbackedBalancesAndForeignCustomer()
 {
  using var db=Db(); var tenant=Guid.NewGuid(); var customer = new Customer { Id=Guid.NewGuid(), TenantId=Guid.NewGuid(), Name="Foreign", Email="foreign@example.test" }; db.Customers.Add(customer); await db.SaveChangesAsync();
  var service=new AccountService(new AccountRepository(db),new CustomerRepository(db));
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.CreateAccountAsync(tenant,new(null,"New","Asset","USD",100)));
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.CreateAccountAsync(tenant,new(customer.Id,"New","Asset","USD")));
  var account=await service.CreateAccountAsync(tenant,new(null,"New","Asset","USD")); Assert.Equal(0,account.CachedBalance);
  await Assert.ThrowsAsync<InvalidOperationException>(()=>service.UpdateAccountStatusAsync(tenant,account.Id,"Anything"));
 }
 [Fact] public void PaymentWriteRequiresOperationsRole()
 {
  var attribute=typeof(PaymentsController).GetMethod("Transfer")!.GetCustomAttributes(typeof(AuthorizeAttribute),true).Cast<AuthorizeAttribute>().Single();
  Assert.Equal("TenantAdmin,OperationsManager",attribute.Roles);
 }
 [Fact] public void RiskDecisionCannotPretendToApprovePayment()
 {
  using var db=Db(); var result=new RiskController(db).SubmitDecision(Guid.NewGuid(),new("Approved",null)); Assert.Equal(409,Assert.IsType<ObjectResult>(result).StatusCode);
 }
 [Fact] public async Task TeamCreationRejectsUnrecognizedRoles()
 {
  using var db=Db(); var service=new AdminUserService(new UserRepository(db)); var result=await service.CreateUserAsync(Guid.NewGuid(),new("member@example.test","Password123!","SuperUser")); Assert.False(result.Success); Assert.Empty(db.Users);
 }
}

using System.Text.Json.Serialization;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Models;

public sealed class Tenant
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = default!;
    [JsonIgnore] public string ApiKey { get; set; } = default!;
    public string PlanType { get; set; } = "Business";
    public string BaseCurrency { get; set; } = "USD";
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
    public ICollection<PurchasePayment> PurchasePayments { get; set; } = new List<PurchasePayment>();
    public ICollection<BusinessExpense> BusinessExpenses { get; set; } = new List<BusinessExpense>();
}

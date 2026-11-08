using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Localization;
using Xunit;

namespace Tenvora.Tests;

public class LocalizationArchitectureTests
{
    private readonly IAppLocalizer _localizer = new AppLocalizer();

    [Theory]
    [InlineData("en", "expense", "Record 50,000 VND for Coffee?", "50,000 VND", "Coffee")]
    [InlineData("vi", "expense", "Ghi khoản chi 50,000 VND cho Coffee?", "50,000 VND", "Coffee")]
    [InlineData("es", "expense", "¿Registrar 50,000 VND para Coffee?", "50,000 VND", "Coffee")]
    [InlineData("fr", "expense", "Enregistrer 50,000 VND pour Coffee ?", "50,000 VND", "Coffee")]
    [InlineData("de", "expense", "50,000 VND für Coffee erfassen?", "50,000 VND", "Coffee")]
    [InlineData("pt-BR", "expense", "Registrar 50,000 VND para Coffee?", "50,000 VND", "Coffee")]
    [InlineData("id", "expense", "Catat 50,000 VND untuk Coffee?", "50,000 VND", "Coffee")]
    public void ProposalSummariesAreLocalizedByCulture(string culture, string intent, string expected, string amount, string category)
    {
        var result = _localizer.GetStringForCulture(culture, $"proposal.{intent}", amount, category);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("en", "create_customer", "Create customer Anh Nam?", "Anh Nam")]
    [InlineData("vi", "create_customer", "Tạo khách hàng Anh Nam?", "Anh Nam")]
    [InlineData("es", "create_customer", "¿Crear cliente Anh Nam?", "Anh Nam")]
    public void PreservesBusinessDataWithoutTranslatingEntityNames(string culture, string intent, string expected, string name)
    {
        var result = _localizer.GetStringForCulture(culture, $"proposal.{intent}", name);
        Assert.Equal(expected, result);
        Assert.Contains(name, result);
    }

    [Theory]
    [InlineData("en", "sale", "Sale recorded. Total: 100,000 VND; remaining: 0 VND.", "100,000 VND", "0 VND")]
    [InlineData("vi", "sale", "✓ Đã ghi đơn bán. Tổng: 100,000 VND; còn lại: 0 VND.", "100,000 VND", "0 VND")]
    public void ExecutionMessagesAreLocalizedByCulture(string culture, string intent, string expected, string total, string remaining)
    {
        var result = _localizer.GetStringForCulture(culture, $"execution.{intent}", total, remaining);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FallbackPolicyDefaultsToEnglishForUnknownCulture()
    {
        var normalized = AppLocalizer.NormalizeCulture("xx-YY");
        Assert.Equal("en", normalized);

        var result = _localizer.GetStringForCulture("xx-YY", "proposal.expense", "10 USD", "Meals");
        Assert.Equal("Record 10 USD for Meals?", result);
    }

    [Fact]
    public void FallbackPolicyReturnsKeyWhenStringIsMissing()
    {
        var result = _localizer.GetStringForCulture("en", "non.existent.key");
        Assert.Equal("non.existent.key", result);
    }

    [Fact]
    public void ApiResultActionResultMappingIsLocaleIndependent()
    {
        // When message is in Vietnamese (does not contain English "not found"), code "not_found" still produces 404
        var viNotFound = ApiResult.Fail("Không tìm thấy khách hàng này trong sổ sách.", "not_found");
        var actionResult = viNotFound.ToActionResult();
        Assert.IsType<NotFoundObjectResult>(actionResult);

        // When code is duplicate_record, produces 409 Conflict
        var viDuplicate = ApiResult.Fail("Bản ghi này đã tồn tại.", "duplicate_record");
        var conflictResult = viDuplicate.ToActionResult();
        Assert.IsType<ConflictObjectResult>(conflictResult);

        // Standard English still works
        var enNotFound = ApiResult.Fail("Customer not found.");
        Assert.IsType<NotFoundObjectResult>(enNotFound.ToActionResult());
    }

    [Theory]
    [InlineData("en", "error.stock_negative", "Stock quantity cannot drop below zero. Please verify your inventory count.")]
    [InlineData("vi", "error.stock_negative", "Số lượng tồn kho không thể âm. Vui lòng kiểm tra lại tồn kho.")]
    [InlineData("en", "error.duplicate_sku", "A product with this SKU already exists. Please choose a different code.")]
    [InlineData("vi", "error.duplicate_sku", "Mã SKU này đã tồn tại cho một sản phẩm khác. Vui lòng chọn mã khác.")]
    [InlineData("en", "error.payment_positive", "Payment amount must be greater than zero.")]
    [InlineData("vi", "error.payment_positive", "Số tiền thanh toán phải lớn hơn 0.")]
    public void LaymanErrorMessagesAreAccuratelyLocalized(string culture, string key, string expected)
    {
        var result = _localizer.GetStringForCulture(culture, key);
        Assert.Equal(expected, result);
    }
}

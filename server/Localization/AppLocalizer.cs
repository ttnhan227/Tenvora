using System.Globalization;
using System.Text.RegularExpressions;

namespace Tenvora.Api.Localization;

public class AppLocalizer : IAppLocalizer
{
    public static readonly string[] SupportedCultures = ["en", "vi", "es", "fr", "de", "pt-BR", "id"];
    public const string DefaultCulture = "en";

    private static readonly Dictionary<string, Dictionary<string, string>> Catalogs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["en"] = new(StringComparer.OrdinalIgnoreCase)
        {
            // Proposal summaries
            ["proposal.expense"] = "Record {0} for {1}?",
            ["proposal.debt_payment"] = "{0} currently owes {1}. Record a payment of {2}?",
            ["proposal.sale"] = "Record a {0} sale to {1}?",
            ["proposal.create_customer"] = "Create customer {0}?",
            ["proposal.create_customer_generic"] = "Create a customer?",
            ["proposal.create_product"] = "Create product {0}?",
            ["proposal.create_product_generic"] = "Create a product?",
            ["proposal.create_multiple_products"] = "Create {0} products ({1})?",
            ["proposal.create_supplier"] = "Create supplier {0}?",
            ["proposal.create_supplier_generic"] = "Create a supplier?",
            ["proposal.update_customer"] = "Update customer {0}?",
            ["proposal.archive_customer"] = "Archive customer {0}?",
            ["proposal.update_product"] = "Update product {0}?",
            ["proposal.archive_product"] = "Deactivate product {0}?",
            ["proposal.update_supplier"] = "Update supplier {0}?",
            ["proposal.archive_supplier"] = "Archive supplier {0}?",
            ["proposal.purchase"] = "Record a {0} purchase from {1}?",
            ["proposal.supplier_payment"] = "Record a {0} payment to {1}?",
            ["proposal.void_sale"] = "Void sale {0}?",
            ["proposal.void_purchase"] = "Void purchase {0}?",
            ["proposal.update_settings"] = "Change workspace currency to {0}?",

            // Execution messages
            ["execution.expense"] = "Expense recorded: {0} for {1}.",
            ["execution.debt_payment"] = "Payment recorded. {0} now owes {1}.",
            ["execution.sale"] = "Sale recorded. Total: {0}; remaining: {1}.",
            ["execution.create_customer"] = "Customer created: {0}.",
            ["execution.create_product"] = "Product created: {0}.",
            ["execution.create_multiple_products"] = "Created {0} products: {1}.",
            ["execution.create_supplier"] = "Supplier created: {0}.",
            ["execution.update_customer"] = "Customer updated: {0}.",
            ["execution.archive_customer"] = "Customer archived: {0}.",
            ["execution.update_product"] = "Product updated: {0}.",
            ["execution.archive_product"] = "Product deactivated: {0}.",
            ["execution.update_supplier"] = "Supplier updated: {0}.",
            ["execution.archive_supplier"] = "Supplier archived: {0}.",
            ["execution.purchase"] = "Purchase recorded. Total: {0}; remaining: {1}.",
            ["execution.supplier_payment"] = "Supplier payment recorded. Remaining balance: {0}.",
            ["execution.void_sale"] = "Sale {0} was voided.",
            ["execution.void_purchase"] = "Purchase {0} was voided.",
            ["execution.update_settings"] = "Workspace currency changed to {0}.",

            // Clarifications
            ["clarification.duplicate_candidate"] = "Candidate products contain duplicate name: {0}.",
            ["clarification.unknown"] = "I couldn't identify a supported business action. Try a sale, expense, or customer payment.",
            ["clarification.expense_amount"] = "What amount should I record?",
            ["clarification.payment_sale_no_balance"] = "This sale has no outstanding balance.",
            ["clarification.payment_amount"] = "What amount did the customer pay?",
            ["clarification.payment_customer_not_found"] = "I couldn't find that customer in this workspace. Create or select the customer first.",
            ["clarification.payment_multiple_customers"] = "I found more than one possible customer. Which one did you mean?",
            ["clarification.payment_no_balance"] = "{0} has no outstanding balance.",
            ["clarification.payment_amount_exceeds_balance"] = "{0} owes {1}, which is less than the proposed payment of {2}.",
            ["clarification.payment_spans_multiple_sales"] = "This payment spans multiple sales. Open the customer history and choose the invoices to pay.",
            ["clarification.customer_already_exists"] = "A customer named {0} already exists.",
            ["clarification.product_already_exists"] = "An active product named {0} already exists.",
            ["clarification.supplier_already_exists"] = "A supplier named {0} already exists.",
            ["clarification.supplier_payment_amount"] = "What amount did you pay the supplier?",
            ["clarification.supplier_not_found"] = "I couldn't find that supplier. Create or select the supplier first.",
            ["clarification.supplier_multiple"] = "I found more than one possible supplier. Which one did you mean?",
            ["clarification.supplier_no_balance"] = "{0} has no outstanding balance.",
            ["clarification.supplier_amount_exceeds_balance"] = "{0} is owed {1}, which is less than the proposed payment of {2}.",
            ["clarification.purchase_no_supplier"] = "Which supplier is this purchase from?",
            ["clarification.purchase_no_items"] = "Which products did you purchase?",
            ["clarification.sale_no_customer"] = "Which customer is this sale for?",
            ["clarification.sale_no_items"] = "Which products were sold?",
            ["clarification.void_sale_not_found"] = "Could not find the sale to void.",
            ["clarification.void_purchase_not_found"] = "Could not find the purchase to void.",

            // Errors & System Messages
            ["error.tell_tenvora"] = "Tell Tenvora what you want to record.",
            ["error.workspace_not_found"] = "Workspace not found.",
            ["error.action_not_found"] = "AI action not found.",
            ["error.action_already_executed"] = "This action has already been executed.",
            ["error.action_expired"] = "This action has expired. Please propose it again.",
            ["error.unauthorized_action"] = "Only workspace administrators and operations managers can propose business actions.",
            ["error.admin_only_action"] = "Only a workspace administrator can perform this action.",
            ["error.saved_result_unavailable"] = "The saved action result is unavailable.",
            ["error.account_inactive"] = "Your account is inactive. Contact your organization administrator.",
            ["error.database_readiness_failed"] = "Database readiness check failed.",
            ["error.concurrency_conflict"] = "This record was updated by another session. Refresh and try again.",
            ["error.duplicate_record"] = "A record with the same unique details already exists.",
            ["error.linked_record"] = "This record is linked to other business history and cannot be changed that way.",
            ["error.value_too_long"] = "One of the supplied values is too long. Shorten it and try again.",
            ["error.constraint_failed"] = "The supplied values violate a business rule. Review them and try again.",
            ["error.data_conflict"] = "The database could not save this change because it conflicts with existing data.",
            ["error.unexpected"] = "We couldn't complete this request. Please try again.",
            ["error.missing_product_name"] = "Product name is missing.",
            ["error.price_negative"] = "Product price cannot be negative.",

            // Agent chat responses
            ["agent.new_conversation"] = "New conversation",
            ["agent.query_completed"] = "Data query completed.",
            ["agent.confirmed_and_executed"] = "Confirmed and executed: {0}",
            ["agent.action_cancelled"] = "Action cancelled.",
            ["agent.action_failed"] = "Could not perform action: {0}",
            ["agent.prepared_action"] = "I've prepared this action: **{0}**.\n\nPlease review the details in the card below, then confirm to complete it.",
            ["agent.need_info"] = "{0}\n\nPlease provide the missing details (e.g. name, price, or unit) in the card or chat so I can prepare the action for you."
        },

        ["vi"] = new(StringComparer.OrdinalIgnoreCase)
        {
            // Proposal summaries
            ["proposal.expense"] = "Ghi khoản chi {0} cho {1}?",
            ["proposal.debt_payment"] = "{0} hiện còn nợ {1}. Ghi nhận thanh toán {2}?",
            ["proposal.sale"] = "Ghi đơn bán {0} cho {1}?",
            ["proposal.create_customer"] = "Tạo khách hàng {0}?",
            ["proposal.create_customer_generic"] = "Tạo khách hàng mới?",
            ["proposal.create_product"] = "Tạo sản phẩm {0}?",
            ["proposal.create_product_generic"] = "Tạo sản phẩm mới?",
            ["proposal.create_multiple_products"] = "Tạo {0} sản phẩm ({1})?",
            ["proposal.create_supplier"] = "Tạo nhà cung cấp {0}?",
            ["proposal.create_supplier_generic"] = "Tạo nhà cung cấp mới?",
            ["proposal.update_customer"] = "Cập nhật khách hàng {0}?",
            ["proposal.archive_customer"] = "Lưu trữ khách hàng {0}?",
            ["proposal.update_product"] = "Cập nhật sản phẩm {0}?",
            ["proposal.archive_product"] = "Ngừng kinh doanh sản phẩm {0}?",
            ["proposal.update_supplier"] = "Cập nhật nhà cung cấp {0}?",
            ["proposal.archive_supplier"] = "Lưu trữ nhà cung cấp {0}?",
            ["proposal.purchase"] = "Ghi đơn nhập hàng {0} từ {1}?",
            ["proposal.supplier_payment"] = "Ghi nhận thanh toán {0} cho {1}?",
            ["proposal.void_sale"] = "Hủy đơn bán {0}?",
            ["proposal.void_purchase"] = "Hủy đơn nhập {0}?",
            ["proposal.update_settings"] = "Đổi tiền tệ sang {0}?",

            // Execution messages
            ["execution.expense"] = "✓ Đã ghi khoản chi {0} ({1}).",
            ["execution.debt_payment"] = "✓ Đã ghi nhận thanh toán. {0} hiện còn nợ {1}.",
            ["execution.sale"] = "✓ Đã ghi đơn bán. Tổng: {0}; còn lại: {1}.",
            ["execution.create_customer"] = "✓ Đã tạo khách hàng: {0}.",
            ["execution.create_product"] = "✓ Đã tạo sản phẩm: {0}.",
            ["execution.create_multiple_products"] = "✓ Đã tạo {0} sản phẩm: {1}.",
            ["execution.create_supplier"] = "✓ Đã tạo nhà cung cấp: {0}.",
            ["execution.update_customer"] = "✓ Đã cập nhật thông tin khách hàng: {0}.",
            ["execution.archive_customer"] = "✓ Đã lưu trữ khách hàng: {0}.",
            ["execution.update_product"] = "✓ Đã cập nhật sản phẩm: {0}.",
            ["execution.archive_product"] = "✓ Đã ngừng bán sản phẩm: {0}.",
            ["execution.update_supplier"] = "✓ Đã cập nhật nhà cung cấp: {0}.",
            ["execution.archive_supplier"] = "✓ Đã lưu trữ nhà cung cấp: {0}.",
            ["execution.purchase"] = "✓ Đã ghi đơn nhập hàng. Tổng: {0}; còn lại: {1}.",
            ["execution.supplier_payment"] = "✓ Đã ghi nhận thanh toán cho nhà cung cấp. Còn nợ: {0}.",
            ["execution.void_sale"] = "✓ Đã hủy đơn bán {0}.",
            ["execution.void_purchase"] = "✓ Đã hủy đơn nhập {0}.",
            ["execution.update_settings"] = "✓ Đã đổi tiền tệ sang {0}.",

            // Clarifications
            ["clarification.duplicate_candidate"] = "Danh sách sản phẩm đề xuất bị trùng tên: {0}.",
            ["clarification.unknown"] = "Chưa nhận diện được thao tác hỗ trợ. Bạn có thể thử ghi đơn bán, chi tiêu, hoặc thu nợ khách.",
            ["clarification.expense_amount"] = "Cần ghi số tiền bao nhiêu?",
            ["clarification.payment_sale_no_balance"] = "Đơn bán này không còn số dư nợ.",
            ["clarification.payment_amount"] = "Khách hàng đã thanh toán bao nhiêu?",
            ["clarification.payment_customer_not_found"] = "Không tìm thấy khách hàng này trong sổ sách. Vui lòng tạo mới hoặc chọn khách hàng trước.",
            ["clarification.payment_multiple_customers"] = "Tìm thấy nhiều khách hàng tương tự. Bạn muốn chọn ai?",
            ["clarification.payment_no_balance"] = "{0} hiện không còn nợ.",
            ["clarification.payment_amount_exceeds_balance"] = "{0} hiện còn nợ {1}, ít hơn số tiền thanh toán {2}.",
            ["clarification.payment_spans_multiple_sales"] = "Khoản thanh toán này trải dài trên nhiều đơn. Vui lòng mở lịch sử khách hàng để chọn đơn cần trả.",
            ["clarification.customer_already_exists"] = "Đã có khách hàng tên là {0}.",
            ["clarification.product_already_exists"] = "Đã có sản phẩm đang hoạt động tên là {0}.",
            ["clarification.supplier_already_exists"] = "Đã có nhà cung cấp tên là {0}.",
            ["clarification.supplier_payment_amount"] = "Bạn đã thanh toán cho nhà cung cấp bao nhiêu?",
            ["clarification.supplier_not_found"] = "Không tìm thấy nhà cung cấp này. Vui lòng tạo mới hoặc chọn nhà cung cấp trước.",
            ["clarification.supplier_multiple"] = "Tìm thấy nhiều nhà cung cấp tương tự. Bạn muốn chọn ai?",
            ["clarification.supplier_no_balance"] = "{0} hiện không còn số dư nợ.",
            ["clarification.supplier_amount_exceeds_balance"] = "{0} hiện còn nợ {1}, ít hơn số tiền thanh toán {2}.",
            ["clarification.purchase_no_supplier"] = "Đơn nhập này từ nhà cung cấp nào?",
            ["clarification.purchase_no_items"] = "Bạn đã nhập những mặt hàng nào?",
            ["clarification.sale_no_customer"] = "Đơn bán này cho khách hàng nào?",
            ["clarification.sale_no_items"] = "Bạn đã bán những mặt hàng nào?",
            ["clarification.void_sale_not_found"] = "Không tìm thấy đơn bán cần hủy.",
            ["clarification.void_purchase_not_found"] = "Không tìm thấy đơn nhập cần hủy.",

            // Errors & System Messages
            ["error.tell_tenvora"] = "Hãy cho Tenvora biết bạn muốn ghi nhận điều gì.",
            ["error.workspace_not_found"] = "Không tìm thấy cửa hàng.",
            ["error.action_not_found"] = "Không tìm thấy thao tác AI.",
            ["error.action_already_executed"] = "Thao tác này đã được thực hiện.",
            ["error.action_expired"] = "Đề xuất đã hết hạn. Vui lòng chuẩn bị lại.",
            ["error.unauthorized_action"] = "Chỉ quản trị viên hoặc quản lý vận hành mới có thể đề xuất thao tác này.",
            ["error.admin_only_action"] = "Chỉ quản trị viên cửa hàng mới có thể thực hiện thao tác này.",
            ["error.saved_result_unavailable"] = "Không tìm thấy kết quả thao tác đã lưu.",
            ["error.account_inactive"] = "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
            ["error.database_readiness_failed"] = "Kiểm tra kết nối cơ sở dữ liệu thất bại.",
            ["error.concurrency_conflict"] = "Bản ghi này vừa được cập nhật ở phiên khác. Vui lòng làm mới trang và thử lại.",
            ["error.duplicate_record"] = "Đã tồn tại một bản ghi trùng thông tin này.",
            ["error.linked_record"] = "Bản ghi này đang liên kết với dữ liệu kinh doanh khác và không thể thay đổi theo cách này.",
            ["error.value_too_long"] = "Một trong các giá trị đã nhập quá dài. Vui lòng rút ngắn và thử lại.",
            ["error.constraint_failed"] = "Thông tin nhập không đáp ứng quy tắc nghiệp vụ. Vui lòng kiểm tra lại.",
            ["error.data_conflict"] = "Cơ sở dữ liệu không thể lưu thay đổi do xung đột với dữ liệu hiện có.",
            ["error.unexpected"] = "Không thể hoàn tất yêu cầu lúc này. Vui lòng thử lại sau.",
            ["error.missing_product_name"] = "Thiếu tên sản phẩm.",
            ["error.price_negative"] = "Giá sản phẩm không được là số âm.",

            // Agent chat responses
            ["agent.new_conversation"] = "Cuộc trò chuyện mới",
            ["agent.query_completed"] = "Đã hoàn tất truy vấn dữ liệu.",
            ["agent.confirmed_and_executed"] = "Đã xác nhận và thực hiện: {0}",
            ["agent.action_cancelled"] = "Đã hủy thao tác.",
            ["agent.action_failed"] = "Không thể thực hiện: {0}",
            ["agent.prepared_action"] = "Tôi đã chuẩn bị thao tác: **{0}**.\n\nVui lòng kiểm tra chi tiết trên thẻ bên dưới rồi xác nhận để hoàn tất.",
            ["agent.need_info"] = "{0}\n\nBạn vui lòng cho biết thêm thông tin (ví dụ: tên, giá bán, hoặc đơn vị tính) bằng cách nhập trực tiếp vào thẻ hoặc gửi tin nhắn để tôi chuẩn bị thao tác."
        },

        ["es"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["proposal.expense"] = "¿Registrar {0} para {1}?",
            ["proposal.debt_payment"] = "{0} debe actualmente {1}. ¿Registrar un pago de {2}?",
            ["proposal.sale"] = "¿Registrar una venta de {0} a {1}?",
            ["proposal.create_customer"] = "¿Crear cliente {0}?",
            ["proposal.create_customer_generic"] = "¿Crear un cliente?",
            ["proposal.create_product"] = "¿Crear producto {0}?",
            ["proposal.create_product_generic"] = "¿Crear un producto?",
            ["proposal.create_supplier"] = "¿Crear proveedor {0}?",
            ["proposal.create_supplier_generic"] = "¿Crear un proveedor?",
            ["execution.expense"] = "Gasto registrado: {0} para {1}.",
            ["execution.debt_payment"] = "Pago registrado. {0} ahora debe {1}.",
            ["execution.sale"] = "Venta registrada. Total: {0}; restante: {1}.",
            ["execution.create_customer"] = "Cliente creado: {0}.",
            ["execution.create_product"] = "Producto creado: {0}.",
            ["agent.confirmed_and_executed"] = "Confirmado y ejecutado: {0}",
            ["agent.action_cancelled"] = "Operación cancelada."
        },

        ["fr"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["proposal.expense"] = "Enregistrer {0} pour {1} ?",
            ["proposal.debt_payment"] = "{0} doit actuellement {1}. Enregistrer un paiement de {2} ?",
            ["proposal.sale"] = "Enregistrer une vente de {0} à {1} ?",
            ["proposal.create_customer"] = "Créer le client {0} ?",
            ["proposal.create_customer_generic"] = "Créer un client ?",
            ["proposal.create_product"] = "Créer le produit {0} ?",
            ["proposal.create_product_generic"] = "Créer un produit ?",
            ["execution.expense"] = "Dépense enregistrée : {0} pour {1}.",
            ["execution.debt_payment"] = "Paiement enregistré. {0} doit maintenant {1}.",
            ["execution.sale"] = "Vente enregistrée. Total : {0} ; restant : {1}.",
            ["execution.create_customer"] = "Client créé : {0}.",
            ["execution.create_product"] = "Produit créé : {0}.",
            ["agent.confirmed_and_executed"] = "Confirmé et exécuté : {0}",
            ["agent.action_cancelled"] = "Opération annulée."
        },

        ["de"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["proposal.expense"] = "{0} für {1} erfassen?",
            ["proposal.debt_payment"] = "{0} schuldet derzeit {1}. Zahlung von {2} erfassen?",
            ["proposal.sale"] = "Verkauf über {0} an {1} erfassen?",
            ["proposal.create_customer"] = "Kunde {0} erstellen?",
            ["proposal.create_customer_generic"] = "Kunde erstellen?",
            ["proposal.create_product"] = "Produkt {0} erstellen?",
            ["proposal.create_product_generic"] = "Produkt erstellen?",
            ["execution.expense"] = "Ausgabe erfasst: {0} für {1}.",
            ["execution.debt_payment"] = "Zahlung erfasst. {0} schuldet jetzt {1}.",
            ["execution.sale"] = "Verkauf erfasst. Gesamt: {0}; verbleibend: {1}.",
            ["execution.create_customer"] = "Kunde erstellt: {0}.",
            ["execution.create_product"] = "Produkt erstellt: {0}.",
            ["agent.confirmed_and_executed"] = "Bestätigt und ausgeführt: {0}",
            ["agent.action_cancelled"] = "Vorgang abgebrochen."
        },

        ["pt-BR"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["proposal.expense"] = "Registrar {0} para {1}?",
            ["proposal.debt_payment"] = "{0} deve atualmente {1}. Registrar um pagamento de {2}?",
            ["proposal.sale"] = "Registrar uma venda de {0} para {1}?",
            ["proposal.create_customer"] = "Criar cliente {0}?",
            ["proposal.create_customer_generic"] = "Criar um cliente?",
            ["proposal.create_product"] = "Criar produto {0}?",
            ["proposal.create_product_generic"] = "Criar um produto?",
            ["execution.expense"] = "Despesa registrada: {0} para {1}.",
            ["execution.debt_payment"] = "Pagamento registrado. {0} agora deve {1}.",
            ["execution.sale"] = "Venda registrada. Total: {0}; restante: {1}.",
            ["execution.create_customer"] = "Cliente criado: {0}.",
            ["execution.create_product"] = "Produto criado: {0}.",
            ["agent.confirmed_and_executed"] = "Confirmado e executado: {0}",
            ["agent.action_cancelled"] = "Ação cancelada."
        },

        ["id"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["proposal.expense"] = "Catat {0} untuk {1}?",
            ["proposal.debt_payment"] = "{0} saat ini berutang {1}. Catat pembayaran sebesar {2}?",
            ["proposal.sale"] = "Catat penjualan {0} ke {1}?",
            ["proposal.create_customer"] = "Buat pelanggan {0}?",
            ["proposal.create_customer_generic"] = "Buat pelanggan baru?",
            ["proposal.create_product"] = "Buat produk {0}?",
            ["proposal.create_product_generic"] = "Buat produk baru?",
            ["execution.expense"] = "Pengeluaran dicatat: {0} untuk {1}.",
            ["execution.debt_payment"] = "Pembayaran dicatat. {0} sekarang berutang {1}.",
            ["execution.sale"] = "Penjualan dicatat. Total: {0}; sisa: {1}.",
            ["execution.create_customer"] = "Pelanggan dibuat: {0}.",
            ["execution.create_product"] = "Produk dibuat: {0}.",
            ["agent.confirmed_and_executed"] = "Dikonfirmasi dan dijalankan: {0}",
            ["agent.action_cancelled"] = "Tindakan dibatalkan."
        }
    };

    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;

    public AppLocalizer(Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string CurrentCultureCode
    {
        get
        {
            var header = _httpContextAccessor?.HttpContext?.Request?.Headers["Accept-Language"].ToString();
            if (!string.IsNullOrWhiteSpace(header))
            {
                var primary = header.Split(',', ';')[0].Trim();
                var norm = NormalizeCulture(primary);
                if (norm != DefaultCulture || primary.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                    return norm;
            }
            return NormalizeCulture(CultureInfo.CurrentUICulture.Name);
        }
    }

    public static string NormalizeCulture(string? cultureCode)
    {
        if (string.IsNullOrWhiteSpace(cultureCode)) return DefaultCulture;
        var trimmed = cultureCode.Trim();
        if (trimmed.StartsWith("vi", StringComparison.OrdinalIgnoreCase)) return "vi";
        if (trimmed.StartsWith("es", StringComparison.OrdinalIgnoreCase)) return "es";
        if (trimmed.StartsWith("fr", StringComparison.OrdinalIgnoreCase)) return "fr";
        if (trimmed.StartsWith("de", StringComparison.OrdinalIgnoreCase)) return "de";
        if (trimmed.Equals("pt-BR", StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith("pt", StringComparison.OrdinalIgnoreCase)) return "pt-BR";
        if (trimmed.StartsWith("id", StringComparison.OrdinalIgnoreCase)) return "id";
        return DefaultCulture;
    }

    public string GetString(string key, params object[] args)
    {
        return GetStringForCulture(CurrentCultureCode, key, args);
    }

    public string GetStringForCulture(string cultureCode, string key, params object[] args)
    {
        var normalized = NormalizeCulture(cultureCode);
        if (Catalogs.TryGetValue(normalized, out var catalog) && catalog.TryGetValue(key, out var format))
        {
            return args.Length > 0 ? SafeFormat(format, args) : format;
        }

        // Fallback to English
        if (Catalogs.TryGetValue(DefaultCulture, out var defaultCatalog) && defaultCatalog.TryGetValue(key, out var defaultFormat))
        {
            return args.Length > 0 ? SafeFormat(defaultFormat, args) : defaultFormat;
        }

        return key;
    }

    public string GetProposalSummary(string intent, params object[] args)
    {
        var key = $"proposal.{intent}";
        return GetString(key, args);
    }

    public string GetProposalSummaryForCulture(string cultureCode, string intent, params object[] args)
    {
        var key = $"proposal.{intent}";
        return GetStringForCulture(cultureCode, key, args);
    }

    public string GetExecutionMessage(string intent, params object[] args)
    {
        var key = $"execution.{intent}";
        return GetString(key, args);
    }

    public string GetExecutionMessageForCulture(string cultureCode, string intent, params object[] args)
    {
        var key = $"execution.{intent}";
        return GetStringForCulture(cultureCode, key, args);
    }

    public string GetClarification(string key, params object[] args)
    {
        var fullKey = key.StartsWith("clarification.") ? key : $"clarification.{key}";
        return GetString(fullKey, args);
    }

    private static string SafeFormat(string format, object[] args)
    {
        try
        {
            return string.Format(CultureInfo.InvariantCulture, format, args);
        }
        catch
        {
            return format;
        }
    }
}

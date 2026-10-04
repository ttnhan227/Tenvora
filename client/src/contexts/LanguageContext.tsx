import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Language = "vi" | "en";

interface Translations {
  [key: string]: string;
}

const viTranslations: Translations = {
  // Navigation & Sections
  "nav.today": "Hôm nay",
  "nav.records": "Sổ ghi chép",
  "nav.operations": "Vận hành kinh doanh",
  "nav.setup": "Cài đặt kinh doanh",
  "nav.home": "Trang chủ",
  "nav.agent": "Trợ lý AI",
  "nav.sales": "Sổ bán hàng",
  "nav.purchases": "Nhập hàng",
  "nav.expenses": "Sổ chi tiêu",
  "nav.reports": "Báo cáo kinh doanh",
  "nav.customers": "Khách hàng & Sổ nợ",
  "nav.suppliers": "Nhà cung cấp",
  "nav.products": "Hàng hoá",
  "nav.imports": "Nhập dữ liệu",
  "nav.team": "Nhân viên",
  "nav.audit": "Lịch sử ghi chép",
  "nav.settings": "Cài đặt cửa hàng",
  "nav.more": "Thêm",

  // Header & Global Actions
  "header.yourRecords": "Sổ ghi chép của bạn",
  "header.newSale": "+ Bán hàng",
  "header.aiAssistant": "Trợ lý AI",
  "header.security": "Bảo mật",
  "header.settings": "Cài đặt",
  "header.signOut": "Đăng xuất",
  "header.language": "Ngôn ngữ",
  "header.googleAccount": "Tài khoản Google",
  "header.businessAccount": "Tài khoản cửa hàng",
  "header.yourBusiness": "Cửa hàng của bạn",
  "header.notebook": "Sổ tay",

  // Common Actions
  "common.save": "Lưu thay đổi",
  "common.saving": "Đang lưu...",
  "common.cancel": "Huỷ bỏ",
  "common.edit": "Chỉnh sửa",
  "common.delete": "Xoá",
  "common.close": "Đóng",
  "common.confirm": "Xác nhận",
  "common.search": "Tìm kiếm...",
  "common.filter": "Lọc",
  "common.all": "Tất cả",
  "common.status": "Trạng thái",
  "common.active": "Đang hoạt động",
  "common.archived": "Đã lưu trữ",
  "common.total": "Tổng cộng",
  "common.paid": "Đã thu / Đã trả",
  "common.debt": "Còn nợ",
  "common.success": "Thành công",
  "common.error": "Có lỗi xảy ra",
  "common.copied": "Đã sao chép",
  "common.details": "Chi tiết",
  "common.back": "Quay lại",
  "common.next": "Tiếp theo",
  "common.viewAll": "Xem tất cả",

  // Business Home & Dashboard
  "home.greeting": "Xin chào",
  "home.summaryTitle": "Tình hình kinh doanh hôm nay",
  "home.todaySales": "Doanh thu bán hôm nay",
  "home.cashCollected": "Tiền mặt thực thu",
  "home.todayExpenses": "Khoản đã chi hôm nay",
  "home.customerDebts": "Khách đang còn nợ",
  "home.quickRecordTitle": "Ghi nhanh bằng AI",
  "home.quickRecordPlaceholder": "Ví dụ: Bán cho chị Lan 5kg gạo 125 ngàn nợ 50 ngàn...",
  "home.confirmRecord": "Xác nhận ghi vào sổ (1 chạm)",
  "home.recentSales": "Đơn hàng gần đây",
  "home.noSalesToday": "Hôm nay chưa có đơn nào, hãy bấm nút '+ Bán hàng' để bắt đầu!",

  // Settings Page
  "settings.pageTitle": "Cài đặt",
  "settings.pageSubtitle": "Quản lý thông tin cửa hàng, giao diện và tài khoản của bạn.",
  "settings.savedSuccess": "Đã lưu cài đặt thành công!",
  "settings.savedFailed": "Lưu cài đặt thất bại, vui lòng kiểm tra lại.",
  
  // Tab 1: Store & Business Profile
  "settings.tabStore": "Cửa hàng",
  "settings.storeTitle": "Thông tin cửa hàng & Kinh doanh",
  "settings.storeSubtitle": "Tên tiệm và loại hình buôn bán giúp Tenvora tối ưu sổ sách phù hợp nhất.",
  "settings.storeName": "Tên cửa hàng / Tên tiệm",
  "settings.storeNamePlaceholder": "Ví dụ: Tạp hoá An Nhiên, Quán Cơm Bình Dân...",
  "settings.businessType": "Loại hình kinh doanh",
  "settings.currency": "Đơn vị tiền tệ chính",
  "settings.phone": "Số điện thoại cửa hàng / Liên hệ",
  "settings.phonePlaceholder": "090xxxxxxx (hiển thị trên sổ & hoá đơn)",
  "settings.saveStoreBtn": "Lưu thông tin cửa hàng",

  // Tab 2: Language & Display
  "settings.tabDisplay": "Ngôn ngữ & Hiển thị",
  "settings.displayTitle": "Ngôn ngữ & Hiển thị",
  "settings.displaySubtitle": "Chọn ngôn ngữ và giao diện phù hợp với bạn.",
  "settings.languageSection": "Ngôn ngữ hiển thị",
  "settings.langVi": "🇻🇳 Tiếng Việt",
  "settings.langViDesc": "Toàn bộ giao diện bằng tiếng Việt bình dị, rõ ràng, không dùng thuật ngữ khó hiểu.",
  "settings.langEn": "🇬🇧 English",
  "settings.langEnDesc": "Full English interface for business records and reports.",
  "settings.themeSection": "Màu sắc giao diện",
  "settings.themeLight": "Giao diện Sáng (Ban ngày)",
  "settings.themeDark": "Giao diện Tối (Ban đêm dịu mắt)",

  // Tab 3: Account & Security
  "settings.tabAccount": "Tài khoản & Mật khẩu",
  "settings.accountTitle": "Tài khoản & Bảo mật cá nhân",
  "settings.accountSubtitle": "Quản lý họ tên chủ tiệm, email và thiết lập mật khẩu đăng nhập.",
  "settings.ownerName": "Họ và tên chủ tiệm",
  "settings.ownerNamePlaceholder": "Ví dụ: Nguyễn Văn An...",
  "settings.email": "Email đăng nhập",
  "settings.googleConnected": "Đã liên kết với Google",
  "settings.googleDesc": "Bạn có thể đăng nhập nhanh 1 chạm bằng Google mà không cần nhớ mật khẩu.",
  "settings.passwordSection": "Đổi / Thiết lập mật khẩu",
  "settings.currentPassword": "Mật khẩu hiện tại",
  "settings.newPassword": "Mật khẩu mới (tối thiểu 12 ký tự)",
  "settings.confirmPassword": "Nhập lại mật khẩu mới",
  "settings.savePasswordBtn": "Cập nhật mật khẩu",
  "settings.passwordUpdatedSuccess": "Đổi mật khẩu thành công!",

  // Business Profiles
  "profile.retail": "Tạp hoá & Cửa hàng bán lẻ",
  "profile.retailDesc": "Bán hàng hoá, bánh kẹo, đồ uống, quần áo, quản lý tồn kho và sổ nợ khách.",
  "profile.food": "Quán ăn / Café / Trà sữa",
  "profile.foodDesc": "Bán món ăn, thức uống, ghi nhanh thu chi trong ca và mua nguyên vật liệu.",
  "profile.services": "Dịch vụ & Khách hàng",
  "profile.servicesDesc": "Sửa chữa, làm đẹp, tư vấn, dịch vụ tính tiền theo lượt hoặc theo công việc.",
  "profile.simple": "Sổ tay thu chi cá nhân",
  "profile.simpleDesc": "Ghi chép tiền vào, tiền ra hàng ngày đơn giản nhất như một cuốn sổ giấy.",
};

const enTranslations: Translations = {
  // Navigation & Sections
  "nav.today": "Today",
  "nav.records": "Record book",
  "nav.operations": "Business operations",
  "nav.setup": "Business setup",
  "nav.home": "Home",
  "nav.agent": "AI Agent",
  "nav.sales": "Sales",
  "nav.purchases": "Purchases",
  "nav.expenses": "Expenses",
  "nav.reports": "Reports",
  "nav.customers": "Customers",
  "nav.suppliers": "Suppliers",
  "nav.products": "Products",
  "nav.imports": "Import data",
  "nav.team": "Team",
  "nav.audit": "Record history",
  "nav.settings": "Settings",
  "nav.more": "More",


  // Header & Global Actions
  "header.yourRecords": "Your records",
  "header.newSale": "+ New sale",
  "header.aiAssistant": "AI Assistant",
  "header.security": "Security",
  "header.settings": "Settings",
  "header.signOut": "Sign out",
  "header.language": "Language",
  "header.googleAccount": "Google account",
  "header.businessAccount": "Business account",
  "header.yourBusiness": "Your business",
  "header.notebook": "notebook",

  // Common Actions
  "common.save": "Save changes",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.search": "Search...",
  "common.filter": "Filter",
  "common.all": "All",
  "common.status": "Status",
  "common.active": "Active",
  "common.archived": "Archived",
  "common.total": "Total",
  "common.paid": "Paid",
  "common.debt": "Outstanding balance",
  "common.success": "Success",
  "common.error": "An error occurred",
  "common.copied": "Copied",
  "common.details": "Details",
  "common.back": "Back",
  "common.next": "Next",
  "common.viewAll": "View all",

  // Business Home & Dashboard
  "home.greeting": "Hello",
  "home.summaryTitle": "Today's business summary",
  "home.todaySales": "Today's sales",
  "home.cashCollected": "Cash collected",
  "home.todayExpenses": "Today's expenses",
  "home.customerDebts": "Customer debt ledger",
  "home.quickRecordTitle": "Quick record with AI",
  "home.quickRecordPlaceholder": "E.g.: Sold Lan 5kg rice 125k, owes 50k...",
  "home.confirmRecord": "Confirm & save to book (1 tap)",
  "home.recentSales": "Recent sales",
  "home.noSalesToday": "No sales recorded today yet. Tap '+ New sale' to start!",

  // Settings Page
  "settings.pageTitle": "Settings",
  "settings.pageSubtitle": "Manage your business profile, appearance, and account.",
  "settings.savedSuccess": "Settings saved successfully!",
  "settings.savedFailed": "Failed to save settings. Please check your input.",
  
  // Tab 1: Store & Business Profile
  "settings.tabStore": "Store profile",
  "settings.storeTitle": "Store & Business Details",
  "settings.storeSubtitle": "Your shop name and business type help Tenvora tailor the best notebook experience.",
  "settings.storeName": "Store / Shop Name",
  "settings.storeNamePlaceholder": "E.g.: Lan's Grocery, Corner Bakery...",
  "settings.businessType": "Business Type",
  "settings.currency": "Primary Currency",
  "settings.phone": "Store Contact Phone",
  "settings.phonePlaceholder": "090xxxxxxx (shown on customer records & receipts)",
  "settings.saveStoreBtn": "Save store details",

  // Tab 2: Language & Display
  "settings.tabDisplay": "Language & Display",
  "settings.displayTitle": "Language & Accessibility Settings",
  "settings.displaySubtitle": "Choose your preferred language and color theme.",
  "settings.languageSection": "Display Language",
  "settings.langVi": "🇻🇳 Tiếng Việt (Vietnamese)",
  "settings.langViDesc": "Natural Vietnamese terminology tailored for Vietnamese shopkeepers.",
  "settings.langEn": "🇬🇧 English",
  "settings.langEnDesc": "Full English interface for business records and reports.",
  "settings.themeSection": "Color Theme",
  "settings.themeLight": "Light Theme (Daytime)",
  "settings.themeDark": "Dark Theme (Gentle on the eyes)",

  // Tab 3: Account & Security
  "settings.tabAccount": "Account & Security",
  "settings.accountTitle": "Account & Credentials",
  "settings.accountSubtitle": "Manage your owner name, login email, and password security.",
  "settings.ownerName": "Shop Owner Full Name",
  "settings.ownerNamePlaceholder": "E.g.: John Doe...",
  "settings.email": "Login Email",
  "settings.googleConnected": "Linked to Google",
  "settings.googleDesc": "You can sign in with 1 tap using Google without having to remember a password.",
  "settings.passwordSection": "Change / Set Password",
  "settings.currentPassword": "Current password",
  "settings.newPassword": "New password (at least 12 characters)",
  "settings.confirmPassword": "Confirm new password",
  "settings.savePasswordBtn": "Update password",
  "settings.passwordUpdatedSuccess": "Password updated successfully!",

  // Business Profiles
  "profile.retail": "Retail Store or Shop",
  "profile.retailDesc": "Products, groceries, fashion, customer sales & supplier restock.",
  "profile.food": "Food, Café & Restaurant",
  "profile.foodDesc": "Dishes, beverages, shift cash register & daily ingredients.",
  "profile.services": "Services & Clients",
  "profile.servicesDesc": "Client billing, repairs, consulting & appointments.",
  "profile.simple": "Simple Cashbook",
  "profile.simpleDesc": "Easiest digital replacement for your daily paper notebook.",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isVietnamese: boolean;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, defaultLanguage }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("tenvora_lang");
      if (saved === "vi" || saved === "en") return saved;
      if (defaultLanguage) return defaultLanguage;
      return "en";
    } catch {
      return defaultLanguage || "en";
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("tenvora_lang", lang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const dictionary = language === "vi" ? viTranslations : enTranslations;
    if (key in dictionary) {
      return dictionary[key];
    }
    // Fallback to Vietnamese dictionary or fallback string or key itself
    if (language === "en" && key in viTranslations) {
      return viTranslations[key];
    }
    return fallback ?? key;
  };

  const isVietnamese = language === "vi";

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isVietnamese,
      t,
    }),
    [language, isVietnamese]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

const defaultLanguageContext: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  isVietnamese: false,
  t: (key: string, fallback?: string) => enTranslations[key] ?? viTranslations[key] ?? fallback ?? key,
};


export const useLanguage = () => {
  const context = useContext(LanguageContext);
  return context ?? defaultLanguageContext;
};

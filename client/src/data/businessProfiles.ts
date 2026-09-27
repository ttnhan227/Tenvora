export type BusinessType = "retail" | "services" | "food" | "simple";

export interface StarterStep {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export interface QuickActionItem {
  to: string;
  label: string;
  description: string;
  iconName: "ReceiptText" | "Package" | "Users" | "WalletCards" | "PackageOpen" | "Receipt";
}

export interface BusinessProfileConfig {
  type: BusinessType;
  title: string;
  shortLabel: string;
  tagline: string;
  description: string;
  badge: string;
  recommendedCurrency: string;
  starterSteps: StarterStep[];
  quickActions: QuickActionItem[];
}

export const COMMON_CURRENCIES = [
  { code: "VND", symbol: "₫", name: "Vietnamese Đồng" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
];

export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfileConfig> = {
  retail: {
    type: "retail",
    title: "Retail Store or Shop",
    shortLabel: "Retail & Shop",
    tagline: "Selling products, inventory & customer sales",
    description: "Ideal for grocery, fashion, electronics, retail counters, or any shop with physical products.",
    badge: "Products & Stock",
    recommendedCurrency: "USD",
    starterSteps: [
      {
        title: "Add your first product",
        description: "Set up item names, default prices, and units so you can record sales in seconds.",
        actionLabel: "Add a product",
        actionHref: "/products",
      },
      {
        title: "Record your first sale",
        description: "Select items, choose the customer, and record whether it's paid or on credit.",
        actionLabel: "Record a sale",
        actionHref: "/sales?create=1",
      },
      {
        title: "Add a supplier",
        description: "Keep track of stock purchases and who you owe for inventory.",
        actionLabel: "Add supplier",
        actionHref: "/suppliers",
      },
    ],
    quickActions: [
      { to: "/sales?create=1", label: "Record a new sale", description: "Quick customer checkout", iconName: "ReceiptText" },
      { to: "/products", label: "Manage products", description: "Prices, units & catalog", iconName: "Package" },
      { to: "/customers", label: "Find customer balance", description: "Who still owes you", iconName: "Users" },
      { to: "/purchases", label: "Record supplier purchase", description: "Stock restocking", iconName: "PackageOpen" },
    ],
  },
  services: {
    type: "services",
    title: "Services & Consulting",
    shortLabel: "Services & Clients",
    tagline: "Billing clients, project work & receivables",
    description: "Ideal for consultants, agencies, contractors, freelancers, and service providers.",
    badge: "Clients & Invoices",
    recommendedCurrency: "USD",
    starterSteps: [
      {
        title: "Add your first client",
        description: "Save client contact details so you have their entire payment and sale history in one place.",
        actionLabel: "Add client",
        actionHref: "/customers",
      },
      {
        title: "Issue an invoice / sale",
        description: "Bill for your service or project milestones with flexible full or partial payments.",
        actionLabel: "New invoice / sale",
        actionHref: "/sales?create=1",
      },
      {
        title: "Log a project expense",
        description: "Track software, contractor fees, travel, or supplies to keep tabs on your net income.",
        actionLabel: "Add expense",
        actionHref: "/expenses?create=1",
      },
    ],
    quickActions: [
      { to: "/sales?create=1", label: "Issue an invoice / sale", description: "Bill a client", iconName: "ReceiptText" },
      { to: "/customers", label: "Clients & balances", description: "Track outstanding receivables", iconName: "Users" },
      { to: "/expenses?create=1", label: "Log business expense", description: "Software, supplies, travel", iconName: "Receipt" },
      { to: "/expenses", label: "View all expenses", description: "Track operating costs", iconName: "WalletCards" },
    ],
  },
  food: {
    type: "food",
    title: "Café, Restaurant or Food Stall",
    shortLabel: "Café & Food",
    tagline: "Fast daily orders, income & ingredient expenses",
    description: "Ideal for coffee shops, bakeries, food trucks, and food stalls with frequent daily transactions.",
    badge: "Daily Sales & Expenses",
    recommendedCurrency: "VND",
    starterSteps: [
      {
        title: "Ring up your first sale",
        description: "Quickly record an order, amount, and payment method in a couple of clicks.",
        actionLabel: "Record sale",
        actionHref: "/sales?create=1",
      },
      {
        title: "Log today's ingredients & costs",
        description: "Track fresh groceries, ice, gas, cups, or utilities so you know what you spent today.",
        actionLabel: "Log expense",
        actionHref: "/expenses?create=1",
      },
      {
        title: "Review daily cash received",
        description: "Watch your cash collected and payments tally automatically throughout the day.",
        actionLabel: "See today's sales",
        actionHref: "/sales",
      },
    ],
    quickActions: [
      { to: "/sales?create=1", label: "Ring up a sale", description: "Record order & payment", iconName: "ReceiptText" },
      { to: "/expenses?create=1", label: "Add today's expense", description: "Ingredients, utilities, supplies", iconName: "Receipt" },
      { to: "/sales", label: "Daily sales record", description: "View today's register", iconName: "ReceiptText" },
      { to: "/purchases", label: "Supplier supplies", description: "Bulk food & ingredient orders", iconName: "PackageOpen" },
    ],
  },
  simple: {
    type: "simple",
    title: "Simple Cash & Daily Sales",
    shortLabel: "Simple Cashbook",
    tagline: "A clean digital replacement for your paper notebook",
    description: "Ideal for solo businesses who just want quick money in and money out without complicated jargon.",
    badge: "Simple & Clean",
    recommendedCurrency: "USD",
    starterSteps: [
      {
        title: "Record money in (Sale)",
        description: "Enter what came into the business today—just like jotting it down in a paper book.",
        actionLabel: "Record income",
        actionHref: "/sales?create=1",
      },
      {
        title: "Record money out (Expense)",
        description: "Note rent, bills, or any everyday costs so you never lose track of cash.",
        actionLabel: "Record expense",
        actionHref: "/expenses?create=1",
      },
      {
        title: "Check your notebook balance",
        description: "See your total sales, collections, and expenses without needing an accountant.",
        actionLabel: "View record book",
        actionHref: "/sales",
      },
    ],
    quickActions: [
      { to: "/sales?create=1", label: "Record money in", description: "Customer payment or sale", iconName: "ReceiptText" },
      { to: "/expenses?create=1", label: "Record money out", description: "Everyday expense or bill", iconName: "Receipt" },
      { to: "/customers", label: "Customer balances", description: "Who owes money", iconName: "Users" },
      { to: "/expenses", label: "Expense records", description: "Review where money went", iconName: "WalletCards" },
    ],
  },
};

export function getProfileOrDefault(type?: string | null): BusinessProfileConfig {
  if (type && type in BUSINESS_PROFILES) {
    return BUSINESS_PROFILES[type as BusinessType];
  }
  return BUSINESS_PROFILES.retail;
}

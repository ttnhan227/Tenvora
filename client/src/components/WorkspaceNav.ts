import {
  Home,
  Users,
  ReceiptText,
  Package,
  Truck,
  PackageOpen,
  WalletCards,
  UserRoundCog,
  ClipboardList,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  admin?: boolean;
  section: "Today" | "Record book" | "Business setup";
  sectionKey: "nav.today" | "nav.records" | "nav.setup";
}

export const workspaceNav: NavItem[] = [
  { key: "nav.home", label: "Home", href: "/dashboard", icon: Home, section: "Today", sectionKey: "nav.today" },
  { key: "nav.agent", label: "AI Agent", href: "/agent", icon: Sparkles, section: "Today", sectionKey: "nav.today" },
  { key: "nav.sales", label: "Sales", href: "/sales", icon: ReceiptText, section: "Record book", sectionKey: "nav.records" },
  { key: "nav.purchases", label: "Purchases", href: "/purchases", icon: PackageOpen, section: "Record book", sectionKey: "nav.records" },
  { key: "nav.expenses", label: "Expenses", href: "/expenses", icon: WalletCards, section: "Record book", sectionKey: "nav.records" },
  { key: "nav.customers", label: "Customers", href: "/customers", icon: Users, section: "Business setup", sectionKey: "nav.setup" },
  { key: "nav.suppliers", label: "Suppliers", href: "/suppliers", icon: Truck, section: "Business setup", sectionKey: "nav.setup" },
  { key: "nav.products", label: "Products", href: "/products", icon: Package, section: "Business setup", sectionKey: "nav.setup" },
  { key: "nav.team", label: "Team", href: "/team", icon: UserRoundCog, section: "Business setup", sectionKey: "nav.setup", admin: true },
  { key: "nav.audit", label: "Record history", href: "/audit", icon: ClipboardList, section: "Business setup", sectionKey: "nav.setup", admin: true },
  { key: "nav.settings", label: "Settings", href: "/settings", icon: Settings, section: "Business setup", sectionKey: "nav.setup" },
];

export function getWorkspaceRouteItem(pathname: string): NavItem | undefined {
  return workspaceNav.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );
}

export function getWorkspaceRouteLabel(pathname: string) {
  const primary = getWorkspaceRouteItem(pathname);
  return primary?.label ?? "Home";
}

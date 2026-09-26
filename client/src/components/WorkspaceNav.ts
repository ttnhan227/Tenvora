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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  admin?: boolean;
  section: "Today" | "Record book" | "Business setup";
}

export const workspaceNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, section: "Today" },
  { label: "Sales", href: "/sales", icon: ReceiptText, section: "Record book" },
  { label: "Purchases", href: "/purchases", icon: PackageOpen, section: "Record book" },
  { label: "Expenses", href: "/expenses", icon: WalletCards, section: "Record book" },
  { label: "Customers", href: "/customers", icon: Users, section: "Business setup" },
  { label: "Suppliers", href: "/suppliers", icon: Truck, section: "Business setup" },
  { label: "Products", href: "/products", icon: Package, section: "Business setup" },
  { label: "Team", href: "/team", icon: UserRoundCog, section: "Business setup", admin: true },
  { label: "Record history", href: "/audit", icon: ClipboardList, section: "Business setup", admin: true },
];

export function getWorkspaceRouteLabel(pathname: string) {
  const primary = workspaceNav.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  return primary?.label ?? "Home";
}


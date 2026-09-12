import {
  Home,
  FileText,
  Users,
  ArrowRightLeft,
  Percent,
  Sparkles,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  admin?: boolean;
}

export const workspaceNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Income", href: "/payments", icon: ArrowRightLeft },
  { label: "Taxes", href: "/taxes", icon: Percent },
  { label: "Assistant", href: "/assistant", icon: Sparkles, badge: "AI" },
  { label: "Settings", href: "/system", icon: Settings },
];

const extendedRouteLabels: Array<[prefix: string, label: string]> = [
  ["/accounts", "Accounts"],
  ["/transfers", "Transfers"],
  ["/transactions", "Transactions"],
  ["/ledger", "Ledger"],
  ["/settlements", "Settlements"],
  ["/reconciliation", "Reconciliation"],
  ["/risk", "Risk"],
  ["/audit", "Audit log"],
  ["/admin/users", "User management"],
  ["/intelligence", "Intelligence"],
];

export function getWorkspaceRouteLabel(pathname: string) {
  const primary = workspaceNav.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  return primary?.label ?? extendedRouteLabels.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Home";
}


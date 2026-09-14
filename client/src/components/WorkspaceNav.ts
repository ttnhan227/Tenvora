import {
  Home,
  FileText,
  Users,
  ArrowRightLeft,
  Settings,
  ReceiptText,
  FolderKanban,
  ChartNoAxesCombined,
  Landmark,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  admin?: boolean;
  section: "Overview" | "Money" | "Work" | "Insights" | "Account";
}

export const workspaceNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, section: "Overview" },
  { label: "Transactions", href: "/transactions", icon: ArrowRightLeft, section: "Money" },
  { label: "Income", href: "/payments", icon: Landmark, section: "Money" },
  { label: "Expenses", href: "/expenses", icon: ReceiptText, section: "Money" },
  { label: "Clients", href: "/clients", icon: Users, section: "Work" },
  { label: "Projects", href: "/projects", icon: FolderKanban, section: "Work" },
  { label: "Invoices", href: "/invoices", icon: FileText, section: "Work" },
  { label: "Reports", href: "/reports", icon: ChartNoAxesCombined, section: "Insights" },
  { label: "Settings", href: "/settings", icon: Settings, section: "Account" },
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


import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import {
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
} from "@/components/design-system";
import { adminUserService, AdminUser } from "@/services/adminUserService";

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OperationsManager");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await adminUserService.getUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setLoading(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);
    setErrorMessage(null);

    const res = await adminUserService.createUser({ email, password, role });
    setCreating(false);

    if (res.success) {
      setInviteOpen(false);
      setEmail("");
      setPassword("");
      loadUsers();
    } else {
      setErrorMessage(res.errors?.[0] || "Failed to provision operator.");
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    const res = await adminUserService.toggleActive(user.id);
    if (res.success) {
      loadUsers();
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: "Operator Identity",
      sortable: true,
      render: (u) => (
        <div className="font-semibold text-foreground flex items-center gap-2">
          <span>{u.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "RBAC Role Tier",
      align: "center",
      sortable: true,
      render: (u) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
          {u.role}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      align: "center",
      sortable: true,
      render: (u) => (
        <StatusBadge status={u.isActive ? "Active" : "Disabled"} size="sm" />
      ),
    },
    {
      key: "createdAt",
      header: "Provisioned (UTC)",
      align: "right",
      sortable: true,
      render: (u) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStatus(u)}
          className="h-6 px-2 text-[10px] font-mono border-border bg-card"
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Users &amp; Role-Based Access Control
            </h1>
            <p className="text-xs text-muted-foreground">
              Provision operations team members, assign financial permission tiers, and enforce multi-tenant separation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Provision Operator
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-lg p-5">
                <form onSubmit={handleCreateUser} className="space-y-3.5">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-foreground" />
                      Provision Team Member
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Creates an authenticated operator profile with isolated tenant permissions.
                    </DialogDescription>
                  </DialogHeader>

                  {errorMessage && (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/25 text-red-600 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Corporate Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@tenvora.internal"
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Initial Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Permission Role Tier</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TenantAdmin" className="text-xs font-mono">TenantAdmin (Full Privileges)</SelectItem>
                        <SelectItem value="OperationsManager" className="text-xs font-mono">OperationsManager (Transfers &amp; Batches)</SelectItem>
                        <SelectItem value="ComplianceOfficer" className="text-xs font-mono">ComplianceOfficer (Risk &amp; Audits)</SelectItem>
                        <SelectItem value="Auditor" className="text-xs font-mono">Auditor (Read-Only Ledger)</SelectItem>
                        <SelectItem value="Viewer" className="text-xs font-mono">Viewer (Reports)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={creating} className="h-8 px-4 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                      {creating ? "Provisioning..." : "Commit Operator"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Users DataTable */}
        <DataTable
          data={users}
          columns={columns}
          keyExtractor={(u) => u.id}
          loading={loading}
          pageSize={15}
          emptyTitle="No operators provisioned"
          emptyDescription="You have not provisioned any team member accounts in this workspace."
        />
      </div>
    </DashboardLayout>
  );
}

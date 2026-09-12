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
  User,
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
    if (!res.success) setErrorMessage(res.errors?.join(" ") || "Unable to load team members.");
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
      setErrorMessage(res.errors?.[0] || "Failed to add team member.");
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    const res = await adminUserService.toggleUserActive(user.id);
    if (res.success) {
      loadUsers();
    } else setErrorMessage(res.errors?.join(" ") || "Unable to change member status.");
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: "Team Member",
      sortable: true,
      render: (u) => (
        <div className="font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <span>{u.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Workspace Role",
      align: "center",
      sortable: true,
      render: (u) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
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
      header: "Joined Date",
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
      header: "Actions",
      align: "right",
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStatus(u)}
          className="h-7 px-2.5 text-xs font-medium border-border bg-card hover:bg-muted"
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Team Members &amp; Permissions
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage team access, assign operational role permissions, and control account privileges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 px-3.5 text-xs font-semibold rounded-md shadow-sm">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-xl p-6">
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <DialogHeader className="space-y-1.5">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      Add Team Member
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Create a member and assign a role. Share credentials directly; no invitation email is sent.
                    </DialogDescription>
                  </DialogHeader>

                  {errorMessage && (
                    <div role="alert" className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="team-email" className="text-xs font-medium text-foreground">Work Email</Label>
                    <Input
                      id="team-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="team-password" className="text-xs font-medium text-foreground">Password</Label>
                    <Input
                      id="team-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="team-role" className="text-xs font-medium text-foreground">Role &amp; Permissions</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger id="team-role" className="h-9 text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TenantAdmin">Administrator (Full Access)</SelectItem>
                        <SelectItem value="OperationsManager">Operations Manager (Transfers &amp; Settlements)</SelectItem>
                        <SelectItem value="ComplianceOfficer">Compliance Officer (Risk &amp; Audits)</SelectItem>
                        <SelectItem value="ReadOnly">Read only (View records)</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button type="submit" disabled={creating} className="w-full h-9 text-xs font-semibold rounded-md shadow-sm">
                      {creating ? "Adding..." : "Add Member"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
        {/* Users DataTable */}
        <DataTable
          data={users}
          columns={columns}
          keyExtractor={(u) => u.id}
          loading={loading}
          pageSize={15}
          emptyTitle="No team members found"
          emptyDescription="Add your first team member to collaborate in this workspace."
        />
      </div>
    </DashboardLayout>
  );
}

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
import { PageHeader } from "@/components/business/BusinessUI";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserManagement() {
  const { isVietnamese } = useLanguage();
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
    if (!res.success) setErrorMessage(res.errors?.join(" ") || (isVietnamese ? "Không thể tải danh sách nhân viên." : "Unable to load team members."));
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
      setErrorMessage(res.errors?.[0] || (isVietnamese ? "Không thể thêm nhân viên." : "Failed to add team member."));
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    const res = await adminUserService.toggleUserActive(user.id);
    if (res.success) {
      loadUsers();
    } else setErrorMessage(res.errors?.join(" ") || (isVietnamese ? "Không thể đổi trạng thái nhân viên." : "Unable to change member status."));
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: isVietnamese ? "Nhân viên" : "Team member",
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
      header: isVietnamese ? "Vai trò" : "Workspace role",
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
      header: isVietnamese ? "Trạng thái" : "Status",
      align: "center",
      sortable: true,
      render: (u) => (
        <StatusBadge status={u.isActive ? "Active" : "Disabled"} size="sm" />
      ),
    },
    {
      key: "createdAt",
      header: isVietnamese ? "Ngày tham gia" : "Joined date",
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
      header: isVietnamese ? "Thao tác" : "Actions",
      align: "right",
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStatus(u)}
          className="h-7 px-2.5 text-xs font-medium border-border bg-card hover:bg-muted"
        >
          {u.isActive ? (isVietnamese ? "Vô hiệu hoá" : "Deactivate") : (isVietnamese ? "Kích hoạt" : "Activate")}
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Thiết lập kinh doanh" : "Business setup"}
          title={isVietnamese ? "Nhân viên của bạn" : "Your team"}
          description={isVietnamese ? "Chọn người có thể cập nhật sổ và quyền họ được sử dụng." : "Choose who can help keep the record book up to date and what they are allowed to do."}
          actions={<>
            <Button
              variant="outline"
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {isVietnamese ? "Làm mới" : "Refresh"}
            </Button>

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isVietnamese ? "Thêm nhân viên" : "Add team member"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-xl p-6">
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <DialogHeader className="space-y-1.5">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      {isVietnamese ? "Thêm nhân viên" : "Add team member"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {isVietnamese ? "Tạo tài khoản và gán vai trò. Hệ thống không gửi email mời." : "Create a member and assign a role. Share credentials directly; no invitation email is sent."}
                    </DialogDescription>
                  </DialogHeader>

                  {errorMessage && (
                    <div role="alert" className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="team-email" className="text-xs font-medium text-foreground">{isVietnamese ? "Email công việc" : "Work email"}</Label>
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
                    <Label htmlFor="team-password" className="text-xs font-medium text-foreground">{isVietnamese ? "Mật khẩu" : "Password"}</Label>
                    <Input
                      id="team-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      minLength={12}
                      required
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">{isVietnamese ? "Dùng ít nhất 12 ký tự." : "Use at least 12 characters."}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="team-role" className="text-xs font-medium text-foreground">{isVietnamese ? "Vai trò & quyền" : "Role & permissions"}</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger id="team-role" className="h-9 text-xs">
                        <SelectValue placeholder={isVietnamese ? "Chọn vai trò" : "Select role"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TenantAdmin">{isVietnamese ? "Quản trị viên (toàn quyền)" : "Administrator (Full Access)"}</SelectItem>
                        <SelectItem value="OperationsManager">{isVietnamese ? "Quản lý vận hành (sổ kinh doanh)" : "Operations Manager (Business records)"}</SelectItem>
                        <SelectItem value="ReadOnly">{isVietnamese ? "Chỉ xem" : "Read only (View records)"}</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button type="submit" disabled={creating} className="w-full h-9 text-xs font-semibold rounded-md shadow-sm">
                      {creating ? (isVietnamese ? "Đang thêm..." : "Adding...") : (isVietnamese ? "Thêm nhân viên" : "Add member")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>}
        />

        {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
        {/* Users DataTable */}
        <DataTable
          data={users}
          columns={columns}
          keyExtractor={(u) => u.id}
          loading={loading}
          pageSize={15}
          emptyTitle={isVietnamese ? "Chưa có nhân viên" : "No team members found"}
          emptyDescription={isVietnamese ? "Thêm nhân viên đầu tiên để cùng cập nhật sổ." : "Add your first team member to collaborate in this workspace."}
        />
      </div>
    </DashboardLayout>
  );
}

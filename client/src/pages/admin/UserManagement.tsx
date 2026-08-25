import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { adminUserService, TenantUser } from "@/services/adminUserService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Copy, Loader2, UserPlus, Check } from "lucide-react";

const ROLES = ["Owner", "Manager", "Member"] as const;
type Role = (typeof ROLES)[number];

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invite, setInvite] = useState({
    email: "",
    role: "Member" as Role,
  });
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Role>>({});

  useEffect(() => {
    const loadUsers = async () => {
      const result = await adminUserService.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
        setRoleDrafts(
          result.data.reduce<Record<string, Role>>((acc, user) => {
            acc[user.id] = user.role;
            return acc;
          }, {})
        );
      } else {
        setError(result.error || "Failed to load users");
      }
      setIsLoading(false);
    };

    loadUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLatestInviteUrl("");

    if (!invite.email.trim()) {
      setError("Email address is required");
      return;
    }

    setIsInviting(true);
    const result = await adminUserService.inviteUser(invite);
    if (result.success && result.data) {
      const refreshed = await adminUserService.getUsers();
      if (refreshed.success && refreshed.data) {
        setUsers(refreshed.data);
        setRoleDrafts(
          refreshed.data.reduce<Record<string, Role>>((acc, entry) => {
            acc[entry.id] = entry.role;
            return acc;
          }, {})
        );
      }

      setLatestInviteUrl(result.data.inviteUrl);
      setSuccess(`Invitation created for ${result.data.email}.`);
      setInvite({ email: "", role: "Member" });
    } else {
      setError(result.error || "Failed to invite user");
    }
    setIsInviting(false);
  };

  const handleUpdateRole = async (userId: string) => {
    const role = roleDrafts[userId];
    if (!role) return;

    if (userId === currentUser?.id) {
      setError("You cannot modify your own administrative role.");
      return;
    }

    setError("");
    setSuccess("");
    setRoleUpdateLoading(userId);

    const result = await adminUserService.updateUserRole(userId, { role });
    if (result.success && result.data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? result.data! : u)));
      setSuccess(`Updated role for ${result.data.email} to ${result.data.role}.`);
    } else {
      setError(result.error || "Failed to update user role");
    }

    setRoleUpdateLoading(null);
  };

  const handleToggleStatus = async (target: TenantUser) => {
    if (target.id === currentUser?.id && target.isActive) {
      setError("You cannot deactivate your own account.");
      return;
    }

    setError("");
    setSuccess("");
    setStatusUpdateLoading(target.id);

    const result = await adminUserService.updateUserStatus(target.id, { isActive: !target.isActive });
    if (result.success && result.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? result.data! : u)));
      setSuccess(`${result.data.email} is now ${result.data.isActive ? "active" : "inactive"}.`);
    } else {
      setError(result.error || "Failed to update user status");
    }

    setStatusUpdateLoading(null);
  };

  const copyInviteUrl = async () => {
    if (!latestInviteUrl) return;
    const absolute = `${window.location.origin}${latestInviteUrl}`;
    await navigator.clipboard.writeText(absolute);
    setSuccess("Invite link copied to clipboard.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl mx-auto font-sans text-xs">
        {/* Header */}
        <div className="border-b border-border/80 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Team Members</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organization members, invite new team users, and configure role assignments.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Invite Member Card */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>Generate an onboarding invite link with assigned permissions</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleInviteUser} className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  disabled={isInviting}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Assigned Role
                </Label>
                <Select
                  value={invite.role}
                  onValueChange={(value) => setInvite((prev) => ({ ...prev, role: value as Role }))}
                  disabled={isInviting}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isInviting}
                  size="xs"
                  variant="default"
                  className="w-full font-bold gap-1.5 h-8"
                >
                  {isInviting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3" />
                  )}
                  Send Invite
                </Button>
              </div>

              {latestInviteUrl && (
                <div className="sm:col-span-4 rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Generated Invitation Link
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono break-all text-foreground bg-card p-1.5 rounded border border-border flex-1">
                      {window.location.origin}{latestInviteUrl}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={copyInviteUrl}
                      className="gap-1 font-semibold"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Member Directory Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <span className="font-bold text-foreground">Organization Members</span>
            <span className="font-mono text-[10px] text-muted-foreground font-semibold">
              {users.length} registered
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-28">Role</TableHead>
                  <TableHead className="w-40">Change Role</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="text-right w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-foreground font-mono">
                      {u.email}
                    </TableCell>
                    <TableCell className="font-mono text-foreground font-semibold">
                      {u.role}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={roleDrafts[u.id] || u.role}
                        onValueChange={(val) =>
                          setRoleDrafts((prev) => ({ ...prev, [u.id]: val as Role }))
                        }
                        disabled={roleUpdateLoading === u.id || u.id === currentUser?.id}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.isActive
                            ? "success"
                            : u.invitationPending
                            ? "warning"
                            : "outline"
                        }
                      >
                        {u.isActive ? "Active" : u.invitationPending ? "Pending" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={
                            roleUpdateLoading === u.id ||
                            u.id === currentUser?.id ||
                            (roleDrafts[u.id] || u.role) === u.role
                          }
                          onClick={() => handleUpdateRole(u.id)}
                          className="h-6 text-[11px]"
                        >
                          {roleUpdateLoading === u.id && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={
                            statusUpdateLoading === u.id ||
                            (u.id === currentUser?.id && u.isActive)
                          }
                          onClick={() => handleToggleStatus(u)}
                          className={`h-6 text-[11px] ${
                            u.isActive ? "text-destructive hover:bg-destructive/10" : "text-foreground"
                          }`}
                        >
                          {statusUpdateLoading === u.id && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          )}
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;

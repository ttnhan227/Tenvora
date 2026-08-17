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
import { AlertCircle, Copy, Loader2, UserPlus } from "lucide-react";

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
      setError("Email is required");
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
      setError("You cannot edit your own role.");
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
      setError(result.error || "Failed to update role");
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
      <div className="space-y-6 max-w-5xl font-sans">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-xs text-muted-foreground">
            Manage organization members, invite new users, and configure role-based access.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <AlertDescription className="text-xs font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Invite User Card */}
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border px-6 py-4">
            <CardTitle className="text-sm font-bold text-foreground">Invite New Team Member</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Generate an invitation link with assigned role permissions.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleInviteUser} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  disabled={isInviting}
                  className="bg-background border-border text-foreground text-xs rounded-lg h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Role</Label>
                <Select
                  value={invite.role}
                  onValueChange={(value) => setInvite((prev) => ({ ...prev, role: value as Role }))}
                  disabled={isInviting}
                >
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4 pt-1">
                <Button type="submit" disabled={isInviting} className="rounded-lg px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs gap-2 shadow-sm">
                  {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {isInviting ? "Sending..." : "Create Invitation"}
                </Button>
              </div>

              {latestInviteUrl && (
                <div className="md:col-span-4 rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generated Invite Link</p>
                  <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs font-mono break-all text-foreground bg-card p-2 rounded border border-border flex-1">{window.location.origin}{latestInviteUrl}</p>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg px-3 border-border text-xs h-8 gap-1.5 hover:bg-muted shrink-0" onClick={copyInviteUrl}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Tenant Users List Card */}
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border px-6 py-4">
            <CardTitle className="text-sm font-bold text-foreground">Organization Members</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-mono">{users.length} active and invited users</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs text-left">
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/30 uppercase tracking-wider text-[10px] text-muted-foreground">
                      <TableHead className="py-3 px-4 font-semibold">User Email</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Current Role</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Change Role</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Status</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-b border-border hover:bg-muted/10 transition">
                        <TableCell className="py-3 px-4 font-semibold text-foreground">{user.email}</TableCell>
                        <TableCell className="py-3 px-4 font-mono font-semibold text-primary">{user.role}</TableCell>
                        <TableCell className="py-3 px-4">
                          <Select
                            value={roleDrafts[user.id] || user.role}
                            onValueChange={(value) =>
                              setRoleDrafts((prev) => ({ ...prev, [user.id]: value as Role }))
                            }
                            disabled={roleUpdateLoading === user.id || user.id === currentUser?.id}
                          >
                            <SelectTrigger className="w-[130px] bg-background border-border text-xs rounded-lg h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge 
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              user.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                              user.invitationPending ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                              "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {user.isActive ? "Active" : user.invitationPending ? "Invited" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={roleUpdateLoading === user.id || user.id === currentUser?.id || (roleDrafts[user.id] || user.role) === user.role}
                              onClick={() => handleUpdateRole(user.id)}
                              className="rounded-lg px-3 text-xs font-medium border-border h-7"
                            >
                              {roleUpdateLoading === user.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              Save Role
                            </Button>

                            <Button
                              size="sm"
                              variant={user.isActive ? "ghost" : "secondary"}
                              disabled={statusUpdateLoading === user.id || (user.id === currentUser?.id && user.isActive)}
                              onClick={() => handleToggleStatus(user)}
                              className={`rounded-lg px-3 text-xs font-medium h-7 ${
                                user.isActive ? "text-destructive hover:bg-destructive/10" : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                            >
                              {statusUpdateLoading === user.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              {user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;

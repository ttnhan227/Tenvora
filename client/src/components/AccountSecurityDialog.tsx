import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Shield } from "lucide-react";

interface AccountSecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSecurityDialog({ open, onOpenChange }: AccountSecurityDialogProps) {
  const { user, setPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const hasPassword = user?.hasPassword ?? true;
  const isGoogleLinked = Boolean(user?.googleLinked);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (hasPassword && !currentPassword) {
      errs.currentPassword = "Enter your current password.";
    }

    if (!newPassword) {
      errs.newPassword = "Enter a new password.";
    } else if (
      newPassword.length < 12 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      errs.newPassword = "Use 12 or more characters with uppercase, lowercase, and a number.";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await setPassword(
        hasPassword ? currentPassword : undefined,
        newPassword
      );

      if (result.success) {
        setSuccessMessage(
          hasPassword
            ? "Your password has been changed successfully."
            : "Your password has been created! You can now log in using either Google or your email and password."
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFieldErrors({});
      } else {
        setError(result.message || "Unable to update password. Please check your details.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account & Security</span>
          </div>
          <DialogTitle>Security Credentials</DialogTitle>
          <DialogDescription>
            Manage sign-in options, connected accounts, and password access for your business profile.
          </DialogDescription>
        </DialogHeader>

        {/* Connected Authentication Methods */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sign-in methods</p>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Google provider status */}
            <div className="flex items-center justify-between rounded-xl border bg-card/60 p-3">
              <div className="flex items-center gap-2.5">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Google Account</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isGoogleLinked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {isGoogleLinked ? "Connected" : "Not connected"}
              </span>
            </div>

            {/* Password provider status */}
            <div className="flex items-center justify-between rounded-xl border bg-card/60 p-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Password</p>
                  <p className="text-[11px] text-muted-foreground">
                    {hasPassword ? "Standard email sign-in" : "Password not configured"}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${hasPassword ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                {hasPassword ? "Active" : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              {hasPassword ? "Change Password" : "Set a Password"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {hasPassword
                ? "Update your existing password. Must be at least 12 characters."
                : "You signed up via Google. Create a password so you can also log in directly with your email and password."}
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current password (only for users who already have a password) */}
          {hasPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium">Current password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }}
                disabled={isSubmitting}
                className={fieldErrors.currentPassword ? "border-destructive" : ""}
                aria-invalid={!!fieldErrors.currentPassword}
              />
              {fieldErrors.currentPassword && (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.currentPassword}</p>
              )}
            </div>
          )}

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="12+ characters (upper, lower, number)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              disabled={isSubmitting}
              className={fieldErrors.newPassword ? "border-destructive" : ""}
              aria-invalid={!!fieldErrors.newPassword}
            />
            {fieldErrors.newPassword && (
              <p className="text-[11px] font-medium text-destructive">{fieldErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              disabled={isSubmitting}
              className={fieldErrors.confirmPassword ? "border-destructive" : ""}
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] font-medium text-destructive">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : hasPassword ? (
                "Change password"
              ) : (
                "Set password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

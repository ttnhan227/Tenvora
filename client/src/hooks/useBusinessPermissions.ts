import { useOptionalAuth } from "@/contexts/AuthContext";

const businessManagerRoles = new Set(["TenantAdmin", "OperationsManager"]);

export function useBusinessPermissions() {
  const auth = useOptionalAuth();
  const canManageRecords = auth?.user ? businessManagerRoles.has(auth.user.role) : true;

  return { canManageRecords };
}

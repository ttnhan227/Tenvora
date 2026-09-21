import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();
  return {
    canManage: ["SoloFreelancer", "TenantAdmin", "OperationsManager"].includes(user?.role ?? ""),
    canReconcile: ["SoloFreelancer", "TenantAdmin", "OperationsManager", "ComplianceOfficer"].includes(user?.role ?? "")
  };
}

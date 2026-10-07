import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequestActivityIndicator } from "@/components/RequestActivityIndicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { getApiErrorInfo } from "@/lib/apiErrors";
import { AiDataConsent } from "@/components/assistant/AiDataConsent";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const BusinessHome = lazy(() => import("./pages/business/BusinessHome"));
const CustomersPage = lazy(() => import("./pages/business/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/business/CustomerDetailPage"));
const ProductsPage = lazy(() => import("./pages/business/ProductsPage"));
const SalesPage = lazy(() => import("./pages/business/SalesPage"));
const SuppliersPage = lazy(() => import("./pages/business/SuppliersPage"));
const PurchasesPage = lazy(() => import("./pages/business/PurchasesPage"));
const BusinessExpensesPage = lazy(() => import("./pages/business/BusinessExpensesPage"));
const ReportsPage = lazy(() => import("./pages/business/ReportsPage"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AuditLogView = lazy(() => import("./pages/audit/AuditLogView"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const AgentChatPage = lazy(() => import("./pages/business/AgentChatPage"));
const DataImportsPage = lazy(() => import("./pages/business/DataImportsPage"));
const MobileLandingPage = lazy(() => import("./pages/MobileLandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage"));

const currentLanguageIsVietnamese = () => {
  try {
    return localStorage.getItem("tenvora_lang") !== "en";
  } catch {
    return true;
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressErrorToast) return;
      const isVietnamese = currentLanguageIsVietnamese();
      const info = getApiErrorInfo(
        error,
        isVietnamese ? "Không thể tải dữ liệu. Vui lòng thử lại." : "Could not load data. Please try again.",
        isVietnamese,
      );
      // Several dashboard queries can fail together (for example when the API is
      // offline). Keep that as one actionable notification instead of a toast storm.
      toast.error(info.message, { id: "api-query-error" });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressErrorToast || mutation.options.onError) return;
      const isVietnamese = currentLanguageIsVietnamese();
      const info = getApiErrorInfo(
        error,
        isVietnamese ? "Không thể hoàn tất thao tác." : "Could not complete the operation.",
        isVietnamese,
      );
      toast.error(info.message);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => getApiErrorInfo(error).retryable && failureCount < 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export default function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><LanguageProvider><TooltipProvider>
    <Toaster /><Sonner /><RequestActivityIndicator /><AiDataConsent />
    <BrowserRouter><ErrorBoundary><Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center bg-background p-8 text-sm font-bold text-muted-foreground"><span className="mr-3 h-3 w-3 animate-pulse rounded-full bg-primary" />Opening Tenvora…</div>}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/mobile" element={<MobileLandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/download" element={<Navigate to="/mobile" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><BusinessHome /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute><AgentChatPage /></ProtectedRoute>} />
        <Route path="/imports" element={<ProtectedRoute requiredRole={["TenantAdmin", "OperationsManager"]}><DataImportsPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><BusinessExpensesPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute requiredRole={["TenantAdmin"]}><UserManagement /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute requiredRole={["TenantAdmin"]}><AuditLogView /></ProtectedRoute>} />
        <Route path="/admin/users" element={<Navigate to="/team" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense></ErrorBoundary></BrowserRouter>
  </TooltipProvider></LanguageProvider></AuthProvider></QueryClientProvider>;
}

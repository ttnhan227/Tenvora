import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequestActivityIndicator } from "@/components/RequestActivityIndicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

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
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AuditLogView = lazy(() => import("./pages/audit/AuditLogView"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export default function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider>
    <Toaster /><Sonner /><RequestActivityIndicator />
    <BrowserRouter><ErrorBoundary><Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center bg-background p-8 text-sm font-bold text-muted-foreground"><span className="mr-3 h-3 w-3 animate-pulse rounded-full bg-primary" />Opening Tenvora…</div>}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><BusinessHome /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><BusinessExpensesPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute requiredRole={["TenantAdmin"]}><UserManagement /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute requiredRole={["TenantAdmin"]}><AuditLogView /></ProtectedRoute>} />
        <Route path="/admin/users" element={<Navigate to="/team" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense></ErrorBoundary></BrowserRouter>
  </TooltipProvider></AuthProvider></QueryClientProvider>;
}

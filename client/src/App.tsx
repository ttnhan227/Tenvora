import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequestActivityIndicator } from "@/components/RequestActivityIndicator";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AccountsList = lazy(() => import("./pages/accounts/AccountsList"));
const Transfers = lazy(() => import("./pages/payments/Transfers"));
const TransactionsList = lazy(() => import("./pages/payments/TransactionsList"));
const TransactionDetail = lazy(() => import("./pages/payments/TransactionDetail"));
const LedgerView = lazy(() => import("./pages/ledger/LedgerView"));
const ReconciliationHub = lazy(() => import("./pages/reconciliation/ReconciliationHub"));
const SettlementBatches = lazy(() => import("./pages/settlements/SettlementBatches"));
const RiskHub = lazy(() => import("./pages/risk/RiskHub"));
const AuditLogView = lazy(() => import("./pages/audit/AuditLogView"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const SystemOperations = lazy(() => import("./pages/system/SystemOperations"));
const IntelligenceHub = lazy(() => import("./pages/intelligence/IntelligenceHub"));

// Dedicated Public Content & Documentation Pages
const NewsHub = lazy(() => import("./pages/public/NewsHub"));
const ArticleDetail = lazy(() => import("./pages/public/ArticleDetail"));
const Documentation = lazy(() => import("./pages/public/Documentation"));
const SecurityWhitepaper = lazy(() => import("./pages/public/SecurityWhitepaper"));
const PricingPage = lazy(() => import("./pages/public/PricingPage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const StatusPage = lazy(() => import("./pages/public/StatusPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RequestActivityIndicator />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Marketing & Educational Pages */}
                <Route path="/" element={<Index />} />
                <Route path="/news" element={<NewsHub />} />
                <Route path="/news/:slug" element={<ArticleDetail />} />
                <Route path="/docs" element={<Documentation />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/security" element={<SecurityWhitepaper />} />
                <Route path="/compliance" element={<SecurityWhitepaper />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/company" element={<AboutPage />} />
                <Route path="/status" element={<StatusPage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Operations Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <ProtectedRoute>
                      <Transfers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <TransactionsList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions/:id"
                  element={
                    <ProtectedRoute>
                      <TransactionDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute>
                      <AccountsList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ledger"
                  element={
                    <ProtectedRoute>
                      <LedgerView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settlements"
                  element={
                    <ProtectedRoute>
                      <SettlementBatches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reconciliation"
                  element={
                    <ProtectedRoute>
                      <ReconciliationHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/risk"
                  element={
                    <ProtectedRoute>
                      <RiskHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute>
                      <AuditLogView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole={["TenantAdmin", "OperationsManager"]}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/system"
                  element={
                    <ProtectedRoute>
                      <SystemOperations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intelligence"
                  element={
                    <ProtectedRoute>
                      <IntelligenceHub />
                    </ProtectedRoute>
                  }
                />

                {/* Backward-compatibility aliases */}
                <Route path="/payments" element={<Navigate to="/transactions" replace />} />
                <Route path="/settings" element={<Navigate to="/system" replace />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

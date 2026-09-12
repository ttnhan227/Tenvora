import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { RequestActivityIndicator } from "@/components/RequestActivityIndicator";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Invoices = lazy(() => import("./pages/invoices/InvoicesList"));
const Clients = lazy(() => import("./pages/clients/ClientsList"));
const Payments = lazy(() => import("./pages/payments/PaymentsHub"));
const Taxes = lazy(() => import("./pages/taxes/TaxesHub"));
const Assistant = lazy(() => import("./pages/assistant/FreelancerAssistant"));
const AccountsList = lazy(() => import("./pages/accounts/AccountsList"));
const AccountDetail = lazy(() => import("./pages/accounts/AccountDetail"));
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
const Docs = lazy(() => import("./pages/public/Documentation"));
const Pricing = lazy(() => import("./pages/public/PricingPage"));
const About = lazy(() => import("./pages/public/AboutPage"));
const Contact = lazy(() => import("./pages/public/ContactPage"));
const Security = lazy(() => import("./pages/public/SecurityWhitepaper"));
const StatusPage = lazy(() => import("./pages/public/StatusPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <Suspense fallback={<div role="status" className="p-12 text-sm text-muted-foreground">Loading Tenvora...</div>}>
              <Routes>
                {/* Public Marketing & Auth */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/security" element={<Security />} />
                <Route path="/news" element={<Navigate to="/docs" replace />} />
                <Route path="/news/:slug" element={<Navigate to="/docs" replace />} />
                <Route path="/status" element={<StatusPage />} />

                {/* Freelancer cash-flow workspace routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/taxes" element={<ProtectedRoute><Taxes /></ProtectedRoute>} />
                <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />

                {/* Detail & Extended Financial Operations Views */}
                <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
                <Route path="/accounts" element={<ProtectedRoute><AccountsList /></ProtectedRoute>} />
                <Route path="/accounts/:id" element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />
                <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><TransactionsList /></ProtectedRoute>} />
                <Route path="/ledger" element={<ProtectedRoute><LedgerView /></ProtectedRoute>} />
                <Route path="/settlements" element={<ProtectedRoute><SettlementBatches /></ProtectedRoute>} />
                <Route path="/reconciliation" element={<ProtectedRoute><ReconciliationHub /></ProtectedRoute>} />
                <Route path="/risk" element={<ProtectedRoute><RiskHub /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute><AuditLogView /></ProtectedRoute>} />
                <Route path="/system" element={<ProtectedRoute><SystemOperations /></ProtectedRoute>} />
                <Route path="/intelligence" element={<ProtectedRoute><IntelligenceHub /></ProtectedRoute>} />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole={["TenantAdmin", "OperationsManager"]}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Backward-compatible public aliases */}
                <Route path="/documentation" element={<Navigate to="/docs" replace />} />
                <Route path="/help" element={<Navigate to="/contact" replace />} />
                <Route path="/company" element={<Navigate to="/about" replace />} />
                <Route path="/compliance" element={<Navigate to="/security" replace />} />
                <Route path="/settings" element={<Navigate to="/system" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

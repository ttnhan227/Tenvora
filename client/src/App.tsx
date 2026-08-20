import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
const AcceptInvite = lazy(() => import("./pages/auth/AcceptInvite"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExpensesList = lazy(() => import("./pages/expenses/ExpensesList"));
const CreateExpense = lazy(() => import("./pages/expenses/CreateExpense"));
const ExpenseDetail = lazy(() => import("./pages/expenses/ExpenseDetail"));
const UploadReceipt = lazy(() => import("./pages/expenses/UploadReceipt"));
const ManagerPending = lazy(() => import("./pages/manager/ManagerPending"));
const AuditTrail = lazy(() => import("./pages/manager/AuditTrail"));
const ManagerInsights = lazy(() => import("./pages/manager/ManagerInsights"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdvancedAnalytics = lazy(() => import("./pages/analytics/AdvancedAnalytics"));
const ComplianceHub = lazy(() => import("./pages/compliance/ComplianceHub"));
const PolicyLab = lazy(() => import("./pages/PolicyLab"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RequestActivityIndicator />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              
              {/* Protected routes */}
              <Route
                path="/onboarding"
                element={<ProtectedRoute requiredRole={["Owner"]}><Onboarding /></ProtectedRoute>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <ExpensesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses/create"
                element={
                  <ProtectedRoute requiredRole={["Owner", "Manager", "Member"]}>
                    <CreateExpense />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses/:id"
                element={
                  <ProtectedRoute>
                    <ExpenseDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute requiredRole={["Owner", "Manager", "Member"]}>
                    <UploadReceipt />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/pending"
                element={
                  <ProtectedRoute requiredRole={["Manager", "Owner"]}>
                    <ManagerPending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/audit/:id"
                element={
                  <ProtectedRoute requiredRole={["Manager", "Owner"]}>
                    <AuditTrail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/insights"
                element={
                  <ProtectedRoute requiredRole={["Manager", "Owner"]}>
                    <ManagerInsights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/policy"
                element={
                  <ProtectedRoute requiredRole={["Owner"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole={["Owner"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute requiredRole={["Owner", "Manager"]}>
                    <AdvancedAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compliance"
                element={
                  <ProtectedRoute requiredRole={["Owner"]}>
                    <ComplianceHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/policy-lab"
                element={<ProtectedRoute requiredRole={["Owner"]}><PolicyLab /></ProtectedRoute>}
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute requiredRole={["Owner", "Member"]}>
                    <Subscription />
                  </ProtectedRoute>
                }
              />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

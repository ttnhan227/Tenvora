import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import UploadReceipt from "@/pages/expenses/UploadReceipt";
import CreateExpense from "@/pages/expenses/CreateExpense";
import ExpensesList from "@/pages/expenses/ExpensesList";
import ExpenseDetail from "@/pages/expenses/ExpenseDetail";
import ManagerPending from "@/pages/manager/ManagerPending";
import ManagerInsights from "@/pages/manager/ManagerInsights";
import AuditTrail from "@/pages/manager/AuditTrail";
import PolicyLab from "@/pages/PolicyLab";
import UserManagement from "@/pages/admin/UserManagement";
import Subscription from "@/pages/Subscription";

// Mock authService
vi.mock("@/services/authService", () => ({
  authService: {
    getProfile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "user-1",
        email: "owner@company.com",
        role: "Owner",
        companyName: "Acme Corp",
      },
    }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/services/expenseService", () => ({
  expenseService: {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "exp-1",
          merchant: "Acme Cloud",
          amount: 150.0,
          currency: "USD",
          category: "Software",
          date: "2026-08-15",
          status: "Pending",
          flagged: false,
          receiptUrls: [],
          riskAssessment: {
            riskScore: 25,
            riskLevel: "Low",
            riskReasons: [],
            policyTriggers: [],
          },
          reviewAssistant: {
            recommendation: "Approve",
            confidence: "High",
            summary: "Low risk standard spend",
            missingEvidence: [],
            reviewerPrompts: [],
            suspiciousPatterns: [],
            relatedExpenses: [],
          },
        },
      ],
    }),
    getById: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "exp-1",
        merchant: "Acme Cloud",
        amount: 150.0,
        currency: "USD",
        category: "Software",
        date: "2026-08-15",
        status: "Pending",
        description: "Monthly cloud subscription",
        flagged: false,
        receiptUrls: [],
        riskAssessment: {
          riskScore: 25,
          riskLevel: "Low",
          riskReasons: [],
          policyTriggers: [],
        },
        reviewAssistant: {
          recommendation: "Approve",
          confidence: "High",
          summary: "Low risk standard spend",
          missingEvidence: [],
          reviewerPrompts: [],
          suspiciousPatterns: [],
          relatedExpenses: [],
        },
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    submit: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    getStats: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalSpent: 1500,
        averageSpend: 150,
        expenseCount: 10,
        pendingCount: 2,
        draftCount: 1,
        highRiskCount: 0,
        averageRiskScore: 15,
        autoApprovedCount: 5,
        insights: {
          currentMonthTotal: 1500,
          previousMonthTotal: 1200,
          changeAmount: 300,
          changePercentage: 25,
          topCategories: [],
        },
      },
    }),
  },
}));

vi.mock("@/services/managerService", () => ({
  managerService: {
    getPendingExpenses: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "exp-1",
          employeeEmail: "filer@company.com",
          merchant: "Acme Cloud",
          amount: 150.0,
          currency: "USD",
          category: "Software",
          date: "2026-08-15",
          status: "Pending",
          flagged: false,
          receiptUrls: [],
          reviewPriority: 1,
          triggeredRuleCount: 0,
          riskAssessment: {
            riskScore: 25,
            riskLevel: "Low",
            riskReasons: [],
            policyTriggers: [],
          },
          reviewAssistant: {
            recommendation: "Approve",
            confidence: "High",
            summary: "Low risk standard spend",
            missingEvidence: [],
            reviewerPrompts: [],
            suspiciousPatterns: [],
            relatedExpenses: [],
          },
        },
      ],
    }),
    getAuditInsights: vi.fn().mockResolvedValue({
      success: true,
      data: {
        approvedCount: 10,
        rejectedCount: 1,
        flaggedCount: 2,
        highRiskCount: 1,
        turnaround: { averageApprovalHours: 4, averageDecisionHours: 6 },
        operationalKpis: {
          slaBreachRate: 0,
          escalationRate: 0,
          totalDecisions: 11,
          slaBreachedDecisions: 0,
          escalationCount: 0,
        },
        learningMetrics: {
          feedbackCount: 5,
          falsePositiveCount: 0,
          autoApprovalFalsePositiveCount: 0,
          falsePositiveRate: 0,
          currentConfidenceScore: 92,
          confidenceTrendPercentage: 5,
        },
        policyRecommendations: [],
        employeeBehaviorInsights: [],
        topRejectionReasons: [],
        highestFlaggedCategories: [],
        highestFlagRateEmployees: [],
        topPolicyTriggers: [],
        monthlyHighRiskTrend: [],
        monthlyPolicyTriggerTrend: [],
      },
    }),
    getAuditTrail: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getBudgetPrediction: vi.fn().mockResolvedValue({
      success: true,
      data: {
        predictedMonthTotal: 25000,
        confidencePercentage: 88,
        healthStatus: "Healthy",
        variancePercentage: -5,
        daysRemaining: 15,
        categoryPredictions: [],
      },
    }),
    approve: vi.fn().mockResolvedValue({ success: true }),
    reject: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/services/adminUserService", () => ({
  adminUserService: {
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "u1",
          email: "owner@company.com",
          role: "Owner",
          isActive: true,
          invitationPending: false,
        },
      ],
    }),
    inviteUser: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

vi.mock("@/services/subscriptionService", () => ({
  subscriptionService: {
    getPlans: vi.fn().mockResolvedValue({
      success: true,
      data: {
        plans: [
          {
            id: "plan-pro",
            name: "Professional",
            description: "Growing teams",
            monthlyPrice: 29,
            annualPrice: 290,
            expenseLimit: 5000,
            userSeats: 25,
            advancedAnomalyDetection: true,
            unlimitedReceiptScanning: true,
            prioritySupport: true,
            customAuditReports: true,
            apiAccess: true,
            customAiModels: false,
            sso: false,
            dedicatedAccountManager: false,
            customIntegrations: false,
            onPremiseOption: false,
            slaGuarantee: false,
            features: ["Unlimited OCR", "Priority queue"],
          },
        ],
      },
    }),
    getCurrentSubscription: vi.fn().mockResolvedValue({
      success: true,
      data: {
        planId: "plan-pro",
        planName: "Professional",
        price: 29,
        billingCycle: "monthly",
        startDate: "2026-01-01",
        isActive: true,
        daysUntilRenewal: 30,
        status: "Active",
      },
    }),
    getBillingHistory: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
  },
}));

describe("Core Workflow Pages Mount & Render", () => {
  beforeEach(() => {
    localStorage.setItem("accessToken", "mock-access-token");
  });

  it("renders UploadReceipt page without errors", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UploadReceipt />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Select Receipt Document")).toBeInTheDocument();
  });

  it("renders CreateExpense page without errors", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CreateExpense />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Spend Policy Rules")).toBeInTheDocument();
  });

  it("renders ExpensesList page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ExpensesList />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("List View")).toBeInTheDocument();
  });

  it("renders ExpenseDetail page without errors", async () => {
    render(
      <MemoryRouter initialEntries={["/expenses/exp-1"]}>
        <AuthProvider>
          <Routes>
            <Route path="/expenses/:id" element={<ExpenseDetail />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Transaction Overview")).toBeInTheDocument();
  });

  it("renders ManagerPending page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ManagerPending />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Review Queue")).toBeInTheDocument();
  });

  it("renders ManagerInsights page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ManagerInsights />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Manager Insights")).toBeInTheDocument();
  });

  it("renders AuditTrail page without errors", async () => {
    render(
      <MemoryRouter initialEntries={["/manager/audit-trail/exp-1"]}>
        <AuthProvider>
          <Routes>
            <Route path="/manager/audit-trail/:id" element={<AuditTrail />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Audit Trail")).toBeInTheDocument();
  });

  it("renders PolicyLab page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <PolicyLab />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Policy Simulation Lab")).toBeInTheDocument();
  });

  it("renders UserManagement page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UserManagement />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Team Members")).toBeInTheDocument();
  });

  it("renders Subscription page without errors", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Subscription />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Subscription & Billing")).toBeInTheDocument();
  });
});

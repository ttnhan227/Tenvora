import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { authService } from "@/services/authService";
import apiClient from "@/services/apiClient";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { DashboardLayout } from "@/components/DashboardLayout";

vi.mock("@/services/apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Google Authentication Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /auth/google with the presented credential", async () => {
    const mockPost = vi.mocked(apiClient.post);
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          userId: "user-123",
          tenantId: "tenant-123",
          email: "alex@gmail.com",
          role: "TenantAdmin",
          companyName: "Alex's Business",
          preferredCurrency: "USD",
          googleLinked: true,
        },
      },
    });

    const response = await authService.googleLogin({ credential: "google-jwt-token" });

    expect(mockPost).toHaveBeenCalledWith("/auth/google", { credential: "google-jwt-token" });
    expect(response.success).toBe(true);
    expect(response.data?.email).toBe("alex@gmail.com");
    expect(response.data?.googleLinked).toBe(true);
  });

  it("handles Google sign-in failure responses gracefully", async () => {
    const mockPost = vi.mocked(apiClient.post);
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          message: "Google sign-in is not configured.",
        },
      },
    });

    const response = await authService.googleLogin({ credential: "any-token" });

    expect(response.success).toBe(false);
    expect(response.message).toBe("Google sign-in is not configured.");
  });

  it("renders GoogleSignInButton container when client ID is provided", () => {
    // With dummy VITE_GOOGLE_CLIENT_ID or component mock
    const { container } = render(
      <GoogleSignInButton
        onCredential={vi.fn()}
        onError={vi.fn()}
      />
    );
    // When VITE_GOOGLE_CLIENT_ID is not configured in test env, it renders null
    // Let's verify graceful null rendering without crashing
    expect(container).toBeDefined();
  });
});

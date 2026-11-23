import { render, screen, waitFor } from "@testing-library/react";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/apiClient";

function AuthStateProbe() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
    </div>
  );
}

function makeAxiosError(status: number, url: string, data: unknown = { success: false }) {
  const config = { url, headers: new AxiosHeaders() };
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    {
      status,
      statusText: String(status),
      headers: {},
      config,
      data,
    }
  );
}

describe("AuthProvider session initialization and refresh handling", () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("treats GET /auth/me (401) -> POST /auth/refresh-token (400) as anonymous with no error banner", async () => {
    apiClient.defaults.adapter = vi.fn(async (config) => {
      throw makeAxiosError(401, config.url || "/auth/me", { success: false, message: "Unauthorized" });
    });

    vi.spyOn(axios, "post").mockRejectedValueOnce(
      makeAxiosError(400, "/api/auth/refresh-token", {
        success: false,
        message: "Refresh token is required.",
      })
    );

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Could not connect/i)).toBeNull();
  });

  it("shows the session connection banner when GET /auth/me fails with 5xx", async () => {
    apiClient.defaults.adapter = vi.fn(async (config) => {
      throw makeAxiosError(503, config.url || "/auth/me", { success: false, message: "Service unavailable" });
    });

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/Could not connect\. Your saved session has been kept\./i);
  });

  it("shows the session connection banner when GET /auth/me fails with a network error", async () => {
    apiClient.defaults.adapter = vi.fn(async () => {
      throw new AxiosError("Network Error", AxiosError.ERR_NETWORK);
    });

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/Could not connect\. Your saved session has been kept\./i);
  });
});

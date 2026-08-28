import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile, authService, AuthResponse } from "@/services/authService";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  createDemo: () => Promise<boolean>;
  register: (companyName: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token && !user) {
        const result = await authService.getProfile();
        if (result.success && result.data) {
          setUser(result.data);
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.login({ email, password });
      if (result.success && result.data) {
        localStorage.setItem("accessToken", result.data.accessToken);
        localStorage.setItem("refreshToken", result.data.refreshToken);
        setUser(result.data.profile);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const createDemo = async (): Promise<boolean> => {
    const result = await authService.createDemo();
    if (!result.success || !result.data) return false;
    localStorage.setItem("accessToken", result.data.accessToken);
    localStorage.setItem("refreshToken", result.data.refreshToken);
    localStorage.removeItem("verispend-demo-mission-complete");
    setUser(result.data.profile);
    return true;
  };

  const register = async (companyName: string, email: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.register({ companyName, email, password });
      if (result.success && result.data) {
        localStorage.setItem("accessToken", result.data.accessToken);
        localStorage.setItem("refreshToken", result.data.refreshToken);
        setUser(result.data.profile);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Register error:", error);
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    const result = await authService.getProfile();
    if (result.success && result.data) {
      setUser(result.data);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    createDemo,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

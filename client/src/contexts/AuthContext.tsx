import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { UserProfile, authService, AuthResponse, ApiResponse } from "@/services/authService";
import { setFinancialWriteScope } from "@/lib/financialWrite";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  googleLogin: (credential: string) => Promise<ApiResponse<AuthResponse>>;
  register: (companyName: string, email: string, password: string, baseCurrency?: string) => Promise<ApiResponse<AuthResponse>>;
  setPassword: (currentPassword: string | undefined, newPassword: string) => Promise<ApiResponse<void>>;
  completeOnboarding: (companyName: string, preferredCurrency: string, businessType: string, fullName?: string, phoneNumber?: string) => Promise<ApiResponse<UserProfile>>;
  updateSettings: (companyName: string, preferredCurrency: string, businessType: string, fullName?: string, phoneNumber?: string) => Promise<ApiResponse<UserProfile>>;
  logout: () => void;

  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function scopeForUser(profile: UserProfile | null): string | null {
  return profile ? `${profile.tenantId}:${profile.id ?? profile.email}` : null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [retrySession, setRetrySession] = useState(0);
  const authEpoch = useRef(0);

  useEffect(() => {
    let active = true;
    const epoch = authEpoch.current;
    const initializeAuth = async () => {
      setIsLoading(true);
      setSessionError(false);
      try {
        const result = await authService.getProfile();
        if (!active || authEpoch.current !== epoch) return;
        if (result.success && result.data) {
          setUser(result.data);
          setFinancialWriteScope(scopeForUser(result.data));
        } else if (result.status === 401 || result.status === 403) {
          setUser(null);
          setFinancialWriteScope(null);
        } else {
          setSessionError(true);
        }
      } catch {
        if (active && authEpoch.current === epoch) setSessionError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void initializeAuth();
    return () => { active = false; };
  }, [retrySession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.login({ email, password });
      if (result.success && result.data) {
        authEpoch.current++;
        setSessionError(false);
        const profile: UserProfile = {
          id: result.data.userId,
          tenantId: result.data.tenantId,
          email: result.data.email,
          role: result.data.role,
          isActive: true,
          preferredCurrency: result.data.preferredCurrency,
          companyName: result.data.companyName,
          googleLinked: result.data.googleLinked,
          hasPassword: result.data.hasPassword ?? true,
          businessType: result.data.businessType,
          onboardingCompleted: result.data.onboardingCompleted ?? false,
          fullName: result.data.fullName,
          phoneNumber: result.data.phoneNumber,
        };
        setUser(profile);
        setFinancialWriteScope(scopeForUser(profile));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const googleLogin = async (credential: string): Promise<ApiResponse<AuthResponse>> => {
    try {
      const result = await authService.googleLogin({ credential });
      if (result.success && result.data) {
        authEpoch.current++;
        setSessionError(false);
        const profile: UserProfile = {
          id: result.data.userId,
          tenantId: result.data.tenantId,
          email: result.data.email,
          role: result.data.role,
          isActive: true,
          preferredCurrency: result.data.preferredCurrency,
          companyName: result.data.companyName,
          googleLinked: result.data.googleLinked ?? true,
          hasPassword: result.data.hasPassword ?? false,
          businessType: result.data.businessType,
          onboardingCompleted: result.data.onboardingCompleted ?? false,
          fullName: result.data.fullName,
          phoneNumber: result.data.phoneNumber,
        };
        setUser(profile);
        setFinancialWriteScope(scopeForUser(profile));
        return result;
      }
      return result;
    } catch (error) {
      console.error("Google login error:", error);
      return {
        success: false,
        message: "Google sign-in failed. Please try again.",
        errors: ["Google sign-in failed. Please try again."],
      };
    }
  };

  const register = async (companyName: string, email: string, password: string, baseCurrency: string = "USD"): Promise<ApiResponse<AuthResponse>> => {
    try {
      const result = await authService.register({ companyName, email, password, baseCurrency });
      if (result.success && result.data) {
        authEpoch.current++;
        setSessionError(false);
        const profile: UserProfile = {
          id: result.data.userId,
          tenantId: result.data.tenantId,
          email: result.data.email,
          role: result.data.role,
          isActive: true,
          preferredCurrency: result.data.preferredCurrency,
          companyName: result.data.companyName,
          googleLinked: result.data.googleLinked,
          hasPassword: result.data.hasPassword ?? true,
          businessType: result.data.businessType,
          onboardingCompleted: result.data.onboardingCompleted ?? false,
          fullName: result.data.fullName,
          phoneNumber: result.data.phoneNumber,
        };
        setUser(profile);
        setFinancialWriteScope(scopeForUser(profile));
        return result;
      }
      return result;
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        message: "Unable to create your account right now.",
        errors: ["Unable to create your account right now. Please try again."],
      };
    }
  };

  const setPassword = async (currentPassword: string | undefined, newPassword: string): Promise<ApiResponse<void>> => {
    try {
      const result = await authService.setPassword({ currentPassword, newPassword });
      if (result.success) {
        await refreshProfile();
      }
      return result;
    } catch (error) {
      console.error("Set password error:", error);
      return {
        success: false,
        message: "Failed to update password.",
        errors: ["Failed to update password."],
      };
    }
  };

  const completeOnboarding = async (
    companyName: string,
    preferredCurrency: string,
    businessType: string,
    fullName?: string,
    phoneNumber?: string
  ): Promise<ApiResponse<UserProfile>> => {
    try {
      const result = await authService.completeOnboarding({
        companyName,
        preferredCurrency,
        businessType,
        fullName,
        phoneNumber,
      });
      if (result.success && result.data) {
        setUser(result.data);
        setFinancialWriteScope(scopeForUser(result.data));
      }
      return result;
    } catch (error) {
      console.error("Complete onboarding error:", error);
      return {
        success: false,
        message: "Failed to complete workspace setup.",
        errors: ["Failed to complete workspace setup."],
      };
    }
  };

  const updateSettings = async (
    companyName: string,
    preferredCurrency: string,
    businessType: string,
    fullName?: string,
    phoneNumber?: string
  ): Promise<ApiResponse<UserProfile>> => {
    try {
      const result = await authService.updateSettings({
        companyName,
        preferredCurrency,
        businessType,
        fullName,
        phoneNumber,
      });
      if (result.success && result.data) {
        setUser(result.data);
        setFinancialWriteScope(scopeForUser(result.data));
      }
      return result;
    } catch (error) {
      console.error("Update settings error:", error);
      return {
        success: false,
        message: "Failed to update settings.",
        errors: ["Failed to update settings."],
      };
    }
  };

  const logout = () => {
    authEpoch.current++;
    void authService.logout();
    setFinancialWriteScope(null);
    setSessionError(false);
    setUser(null);
  };

  const refreshProfile = async () => {
    const result = await authService.getProfile();
    if (result.success && result.data) {
      setUser(result.data);
      setFinancialWriteScope(scopeForUser(result.data));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    googleLogin,
    register,
    setPassword,
    completeOnboarding,
    updateSettings,
    logout,
    refreshProfile,
  };


  return <AuthContext.Provider value={value}>
    {sessionError && <div role="alert" className="bg-muted p-3 text-center text-sm">
      {localStorage.getItem("tenvora_lang") === "vi" ? "Không thể kết nối. Phiên đăng nhập vẫn được giữ lại." : "Could not connect. Your saved session has been kept."}{" "}
      <button className="underline font-semibold" onClick={() => setRetrySession(n => n + 1)}>
        {localStorage.getItem("tenvora_lang") === "vi" ? "Thử lại" : "Try again"}
      </button>
    </div>}
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useOptionalAuth = () => {
  return useContext(AuthContext);
};

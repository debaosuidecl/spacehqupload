import React, { createContext, useState, useContext, useEffect } from "react";
import api, { authService } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = authService.getToken();
    const storedUser = authService.getUser();

    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      setError(null);
      const data = await authService.register(userData);
      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const data = await authService.login(credentials);
      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  };
  const verifyOTP = async (code) => {
    try {
      setError(null);

      // Get user_id from tempUser or localStorage
      const userId = localStorage.getItem("user_id_temp");

      if (!userId) {
        throw new Error("User session expired. Please login again.");
      }

      const response = await api.post("/auth/verify-otp", {
        passcode: code,
        user_id: userId,
      });

      if (response.data.success) {
        // Store user data
        const userData = response.data.user;
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.removeItem("user_id_temp");
        localStorage.removeItem("email_temp");
        setUser(userData);
        // setTempUser(null);
        return { success: true, data: response.data };
      }
      return response.data;
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to verify OTP";
      setError(message);
      return { success: false, error: message };
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    try {
      setError(null);

      const userId = localStorage.getItem("user_id_temp");

      if (!userId) {
        throw new Error("User session expired. Please login again.");
      }

      const response = await api.post("/auth/resend-otp", { user_id: userId });

      if (response.data.success) {
        return { success: true, data: response.data };
      }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to resend OTP";
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    setError,
    register,
    login,
    logout,
    updateUser,
    verifyOTP,
    resendOTP,
    isAuthenticated: !!user && authService.isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

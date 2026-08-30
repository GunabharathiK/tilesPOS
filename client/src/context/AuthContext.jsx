import { createContext, useContext, useEffect, useState } from "react";
import API from "../services/api";
import { getLicenseStatus } from "../services/licenseService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      API.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
    }
    setAuthLoading(false);
  }, []);

  const refreshLicenseStatus = async () => {
    setLicenseLoading(true);
    try {
      const res = await getLicenseStatus();
      setLicenseStatus(res.data);
      return res.data;
    } catch {
      setLicenseStatus(null);
      return null;
    } finally {
      setLicenseLoading(false);
    }
  };

  useEffect(() => {
    refreshLicenseStatus();
  }, []);

  const login = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    API.defaults.headers.common.Authorization = `Bearer ${userData.token}`;
    setUser(userData);
    if (userData?.licenseStatus) {
      setLicenseStatus(userData.licenseStatus);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    delete API.defaults.headers.common.Authorization;
    setUser(null);
  };

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const loading = authLoading || licenseLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isOwner,
        isAdmin,
        isStaff,
        loading,
        authLoading,
        licenseLoading,
        licenseStatus,
        refreshLicenseStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

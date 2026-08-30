import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export const PrivateRoute = ({ children }) => {
  const { user, loading, licenseStatus, isOwner } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isOwner && licenseStatus && licenseStatus.isActive === false) {
    return <Navigate to="/license" replace />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

export const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, isOwner, licenseStatus } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isOwner && licenseStatus && licenseStatus.isActive === false) {
    return <Navigate to="/license" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isOwner) return <Navigate to="/" replace />;

  return children;
};

export const OwnerRoute = ({ children }) => {
  const { user, loading, isOwner, licenseStatus } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isOwner && licenseStatus && licenseStatus.isActive === false) {
    return <Navigate to="/license" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/" replace />;

  return children;
};

import { Box, IconButton, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import Sidebar from "./Sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => location.pathname !== "/customers/bill");
  const showTopNavButtons = location.pathname !== "/";

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const handleClose = () => {
    const path = location.pathname || "";
    if (path.startsWith("/suppliers")) { navigate("/suppliers"); return; }
    if (path.startsWith("/customers")) { navigate("/customers"); return; }
    if (path.startsWith("/products")) { navigate("/products"); return; }
    navigate("/");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 0,
          background: "#f8fafc",
          minHeight: "100vh",
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {showTopNavButtons && (
          <Box
            sx={{
              position: "fixed",
              top: 10,
              right: 12,
              zIndex: 1200,
              display: "flex",
              gap: 1,
            }}
          >
            <Tooltip title="Back">
              <IconButton
                onClick={handleBack}
                size="small"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "9px",
                  background: "#fff",
                  border: "1px solid #dbe5f0",
                  boxShadow: "0 4px 12px rgba(15,35,60,0.08)",
                  color: "#1a56a0",
                  "&:hover": { background: "#eff6ff" },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "9px",
                  background: "#fff",
                  border: "1px solid #dbe5f0",
                  boxShadow: "0 4px 12px rgba(15,35,60,0.08)",
                  color: "#dc2626",
                  "&:hover": { background: "#fef2f2" },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box
          sx={{
            width: "100%",
            minHeight: "100vh",
            p: "20px",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;

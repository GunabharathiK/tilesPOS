import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

const SIDEBAR_WIDTH = 240;
const COLLAPSED_SIDEBAR_WIDTH = 56;

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => location.pathname !== "/customers/bill");

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onCreateBillClick={() => setSidebarOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          background: "#f8fafc",
          minHeight: "100vh",
          width: sidebarOpen
            ? `calc(100vw - ${SIDEBAR_WIDTH}px)`
            : `calc(100vw - ${COLLAPSED_SIDEBAR_WIDTH}px)`,
          boxSizing: "border-box",
          overflow: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;

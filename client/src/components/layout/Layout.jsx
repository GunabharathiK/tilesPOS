import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Navbar, { NAV_HEIGHT } from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => location.pathname !== "/customers/bill");

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#eef3f8" }}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          background: "linear-gradient(180deg,#f8fbff 0%,#eff4f8 100%)",
        }}
      >
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <Box
          sx={{
            width: "100%",
            minHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
            px: { xs: 0.5, md: 1.2 },
            pb: 1.2,
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

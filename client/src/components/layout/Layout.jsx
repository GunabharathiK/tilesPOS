import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const SIDEBAR_WIDTH = 240;

const Layout = () => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          background: "#f8fafc",
          minHeight: "100vh",
          width: `calc(100vw - ${SIDEBAR_WIDTH}px)`,
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

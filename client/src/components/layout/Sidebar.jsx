import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DescriptionIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ✅ Menu items — adminOnly items hidden from staff
  const menuItems = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/", adminOnly: false },
    { label: "Products", icon: <InventoryIcon />, path: "/products", adminOnly: false },
    { label: "Invoice", icon: <ReceiptIcon />, path: "/invoice", adminOnly: false },
    { label: "Customers", icon: <PeopleIcon />, path: "/CustomerList", adminOnly: true },
    { label: "Edit Bill Format", icon: <DescriptionIcon />, path: "/bill-format", adminOnly: true },
    { label: "User Management", icon: <ManageAccountsIcon />, path: "/users", adminOnly: true },
  ];

  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 240,
          background: "#1e293b",
          color: "#fff",
          boxSizing: "border-box",
        },
      }}
    >
      {/* PROFILE */}
      <Box
        onClick={handleOpen}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          cursor: "pointer",
          "&:hover": { background: "#334155" },
        }}
      >
        <Avatar sx={{ bgcolor: "#facc15", color: "#1e293b", fontWeight: 700 }}>
          {user?.name?.[0]?.toUpperCase() || "U"}
        </Avatar>

        <Box flex={1} overflow="hidden">
          <Typography variant="subtitle2" noWrap>
            {user?.name || "User"}
          </Typography>
          <Chip
            label={user?.role === "admin" ? "Admin" : "Staff"}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              background: user?.role === "admin" ? "#facc15" : "#64748b",
              color: user?.role === "admin" ? "#1e293b" : "#fff",
            }}
          />
        </Box>
      </Box>

      {/* DROPDOWN */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          Logout
        </MenuItem>
      </Menu>

      <Divider sx={{ background: "#334155" }} />

      {/* MENU */}
      <List>
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  background: active ? "#334155" : "transparent",
                  borderLeft: active ? "3px solid #facc15" : "3px solid transparent",
                  "&:hover": { background: "#334155" },
                }}
              >
                <ListItemIcon sx={{ color: active ? "#facc15" : "#94a3b8", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#fff" : "#cbd5e1",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Role info at bottom */}
      <Box sx={{ mt: "auto", p: 2, borderTop: "1px solid #334155" }}>
        <Typography variant="caption" color="#64748b">
          {user?.role === "admin"
            ? "Full access enabled"
            : "Limited access — staff mode"}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;

import {
  Box, Typography, Avatar, Divider,
  Menu, MenuItem, Chip, Collapse, IconButton, Tooltip,
} from "@mui/material";

import DashboardIcon     from "@mui/icons-material/Dashboard";
import InventoryIcon     from "@mui/icons-material/Inventory";
import ReceiptIcon       from "@mui/icons-material/Receipt";
import SettingsIcon      from "@mui/icons-material/Settings";
import PeopleIcon        from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AddBusinessIcon   from "@mui/icons-material/AddBusiness";
import ListAltIcon       from "@mui/icons-material/ListAlt";
import PaymentsIcon      from "@mui/icons-material/Payments";
import AddBoxIcon        from "@mui/icons-material/AddBox";
import PersonAddIcon     from "@mui/icons-material/PersonAdd";
import ReceiptLongIcon   from "@mui/icons-material/ReceiptLong";
import AssessmentIcon    from "@mui/icons-material/Assessment";
import ExpandLessIcon    from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon    from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon   from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon  from "@mui/icons-material/ChevronRight";
import LogoutIcon        from "@mui/icons-material/Logout";
import PhoneIcon         from "@mui/icons-material/Phone";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SIDEBAR_WIDTH = 224;
const COLLAPSED_WIDTH = 64;

/* ─── tiny helpers ─────────────────────────────────────────────────────── */
const NavSection = ({ label }) => (
  <Typography
    sx={{
      px: 2,
      pt: 2,
      pb: 0.5,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.1em",
      color: "#475569",
      textTransform: "uppercase",
      userSelect: "none",
    }}
  >
    {label}
  </Typography>
);

const NavBtn = ({ icon, label, active, subActive, indent = false, onClick, to, collapsed, color = "#facc15" }) => {
  const Tag = to ? Link : "div";
  return (
    <Tooltip title={collapsed ? label : ""} placement="right" arrow>
      <Box
        component={Tag}
        to={to}
        onClick={onClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.4,
          px: collapsed ? 0 : indent ? 3.5 : 2,
          py: 0.85,
          mx: collapsed ? "auto" : 1,
          mt: 0.3,
          width: collapsed ? 40 : "auto",
          height: collapsed ? 40 : "auto",
          borderRadius: "10px",
          cursor: "pointer",
          textDecoration: "none",
          background: active
            ? "rgba(250,204,21,0.10)"
            : subActive
            ? "rgba(96,165,250,0.08)"
            : "transparent",
          borderLeft: collapsed
            ? "none"
            : active
            ? `3px solid ${color}`
            : subActive
            ? "3px solid #60a5fa"
            : "3px solid transparent",
          transition: "all 0.15s ease",
          justifyContent: collapsed ? "center" : "flex-start",
          "&:hover": {
            background: active
              ? "rgba(250,204,21,0.14)"
              : "rgba(255,255,255,0.05)",
          },
        }}
      >
        <Box
          sx={{
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            color: active ? color : subActive ? "#60a5fa" : "#64748b",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        {!collapsed && (
          <Typography
            sx={{
              fontSize: indent ? 13 : 13.5,
              fontWeight: active || subActive ? 600 : 400,
              color: active ? "#f1f5f9" : subActive ? "#93c5fd" : "#94a3b8",
              lineHeight: 1,
              flex: 1,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
const Sidebar = ({ open = true, onToggle }) => {
  const [anchorEl, setAnchorEl]       = useState(null);
  const [productsOpen, setProductsOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const collapsed = !open;

  const handleLogout = () => { logout(); navigate("/login"); };

  const isProductsActive = location.pathname.startsWith("/products");
  const isSupplierActive = location.pathname.startsWith("/suppliers");
  const isCustomerActive = location.pathname.startsWith("/customers");

  const productSubItems = [
    { label: "Add Products",     icon: <AddBoxIcon sx={{ fontSize: 17 }} />,   path: "/products/add" },
    { label: "Product Details",  icon: <ListAltIcon sx={{ fontSize: 17 }} />,  path: "/products/details" },
  ];

  const customerSubItems = [
    { label: "Create Customer",    icon: <PersonAddIcon sx={{ fontSize: 17 }} />,   path: "/customers/create" },
    { label: "Create Bill",        icon: <ReceiptLongIcon sx={{ fontSize: 17 }} />, path: "/customers/bill" },
    { label: "Customer Details",   icon: <PeopleIcon sx={{ fontSize: 17 }} />,      path: "/customers/details" },
    { label: "Customer Payments",  icon: <PaymentsIcon sx={{ fontSize: 17 }} />,    path: "/customers/payments" },
  ];

  const supplierSubItems = [
    { label: "Supplier Create",          icon: <AddBusinessIcon sx={{ fontSize: 17 }} />, path: "/suppliers/create" },
    { label: "Purchase Products",        icon: <ListAltIcon sx={{ fontSize: 17 }} />,     path: "/suppliers/products" },
    { label: "Pay to Supplier",          icon: <PaymentsIcon sx={{ fontSize: 17 }} />,    path: "/suppliers/payment" },
    { label: "Supplier Product Details", icon: <ListAltIcon sx={{ fontSize: 17 }} />,     path: "/suppliers/details" },
  ];

  const w = collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box
      sx={{
        width: w,
        minWidth: w,
        height: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        zIndex: 100,
      }}
    >
      {/* ── TOP: logo + toggle ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 0 : 2,
          py: 1.6,
          borderBottom: "1px solid #1e293b",
          minHeight: 58,
        }}
      >
        {!collapsed && (
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 800,
              fontFamily: "Rajdhani, sans-serif",
              color: "#f1f5f9",
              letterSpacing: "0.02em",
            }}
          >
            Renix<Box component="span" sx={{ color: "#facc15" }}>Bill</Box>
          </Typography>
        )}
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
          <IconButton
            onClick={onToggle}
            size="small"
            sx={{
              color: "#64748b",
              width: 30,
              height: 30,
              borderRadius: "8px",
              background: "#1e293b",
              border: "1px solid #334155",
              "&:hover": { background: "#334155", color: "#f1f5f9" },
              transition: "all 0.15s",
            }}
          >
            {collapsed ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ChevronLeftIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── SCROLLABLE NAV ── */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: 4 } }}>

        {!collapsed && <NavSection label="Main" />}

        <NavBtn
          icon={<DashboardIcon sx={{ fontSize: 19 }} />}
          label="Dashboard"
          active={location.pathname === "/"}
          to="/"
          collapsed={collapsed}
        />
        <NavBtn
          icon={<ReceiptIcon sx={{ fontSize: 19 }} />}
          label="Quotation"
          active={location.pathname === "/quotation"}
          to="/quotation"
          collapsed={collapsed}
        />

        {!collapsed && <NavSection label="Inventory" />}

        {/* Products */}
        <NavBtn
          icon={<InventoryIcon sx={{ fontSize: 19 }} />}
          label="Product"
          active={isProductsActive && !collapsed}
          collapsed={collapsed}
          onClick={() => { navigate("/products"); setProductsOpen((v) => !v); }}
        />
        {!collapsed && (
          <Collapse in={productsOpen} timeout="auto" unmountOnExit>
            {productSubItems.map((sub) => (
              <NavBtn
                key={sub.path}
                icon={sub.icon}
                label={sub.label}
                subActive={location.pathname === sub.path}
                to={sub.path}
                indent
                collapsed={false}
              />
            ))}
          </Collapse>
        )}

        {!collapsed && isAdmin && <NavSection label="Operations" />}

        {/* Customer */}
        {isAdmin && (
          <>
            <NavBtn
              icon={<PeopleIcon sx={{ fontSize: 19 }} />}
              label="Customer"
              active={isCustomerActive && !collapsed}
              collapsed={collapsed}
              onClick={() => { navigate("/customers"); setCustomerOpen((v) => !v); }}
            />
            {!collapsed && (
              <Collapse in={customerOpen} timeout="auto" unmountOnExit>
                {customerSubItems.map((sub) => (
                  <NavBtn
                    key={sub.path}
                    icon={sub.icon}
                    label={sub.label}
                    subActive={location.pathname === sub.path}
                    to={sub.path}
                    indent
                    collapsed={false}
                  />
                ))}
              </Collapse>
            )}
          </>
        )}

        {/* Supplier */}
        {isAdmin && (
          <>
            <NavBtn
              icon={<LocalShippingIcon sx={{ fontSize: 19 }} />}
              label="Supplier"
              active={isSupplierActive && !collapsed}
              collapsed={collapsed}
              onClick={() => { navigate("/suppliers"); setSupplierOpen((v) => !v); }}
            />
            {!collapsed && (
              <Collapse in={supplierOpen} timeout="auto" unmountOnExit>
                {supplierSubItems.map((sub) => (
                  <NavBtn
                    key={sub.path}
                    icon={sub.icon}
                    label={sub.label}
                    subActive={location.pathname === sub.path}
                    to={sub.path}
                    indent
                    collapsed={false}
                  />
                ))}
              </Collapse>
            )}
          </>
        )}

        {!collapsed && isAdmin && <NavSection label="System" />}

        {isAdmin && (
          <NavBtn
            icon={<AssessmentIcon sx={{ fontSize: 19 }} />}
            label="Reports"
            active={location.pathname === "/reports"}
            to="/reports"
            collapsed={collapsed}
          />
        )}

        {isAdmin && (
          <NavBtn
            icon={<SettingsIcon sx={{ fontSize: 19 }} />}
            label="Settings"
            active={location.pathname === "/settings"}
            to="/settings"
            collapsed={collapsed}
          />
        )}
      </Box>

      {/* ── BOTTOM: user profile ── */}
      <Box sx={{ borderTop: "1px solid #1e293b" }}>
        {collapsed ? (
          /* collapsed avatar only */
          <Tooltip title={user?.name || "User"} placement="right">
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 1.5,
                cursor: "pointer",
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 14,
                  fontWeight: 700,
                  bgcolor: "#facc15",
                  color: "#0f172a",
                }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar>
            </Box>
          </Tooltip>
        ) : (
          /* expanded profile card */
          <Box sx={{ p: 1.5 }}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.3,
                p: 1.2,
                borderRadius: "12px",
                cursor: "pointer",
                background: "#1e293b",
                border: "1px solid #334155",
                "&:hover": { background: "#263347", borderColor: "#475569" },
                transition: "all 0.15s",
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 15,
                  fontWeight: 800,
                  bgcolor: "#facc15",
                  color: "#0f172a",
                  flexShrink: 0,
                }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar>

              <Box sx={{ flex: 1, overflow: "hidden" }}>
                <Typography
                  noWrap
                  sx={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}
                >
                  {user?.name || "User"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.4 }}>
                  <Chip
                    label={user?.role === "admin" ? "Admin" : "Staff"}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      px: 0.5,
                      background: user?.role === "admin" ? "#facc15" : "#334155",
                      color: user?.role === "admin" ? "#0f172a" : "#94a3b8",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                  {user?.phone && (
                    <Typography
                      noWrap
                      sx={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 0.3 }}
                    >
                      <PhoneIcon sx={{ fontSize: 11 }} />
                      {user.phone}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          PaperProps={{
            sx: {
              borderRadius: "12px",
              border: "1px solid #e2eaf4",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              minWidth: 180,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>{user?.name}</Typography>
            <Typography sx={{ fontSize: 12, color: "#718096", mt: 0.2 }}>{user?.phone}</Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "#dc2626",
              gap: 1,
              py: 1,
              "&:hover": { background: "#fee2e2" },
            }}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Sidebar;

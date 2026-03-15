import {
  Box, Typography, Avatar, Divider,
  Menu, MenuItem, Collapse, Tooltip,
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
import LogoutIcon        from "@mui/icons-material/Logout";
import PointOfSaleIcon   from "@mui/icons-material/PointOfSale";
import BackupIcon        from "@mui/icons-material/Backup";
import ExpandMoreIcon    from "@mui/icons-material/ExpandMore";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ─── Dimensions ─────────────────────────────────────────────────── */
const SIDEBAR_WIDTH   = 232;
const COLLAPSED_WIDTH = 56;

/* ─── Design tokens ──────────────────────────────────────────────── */
const S = {
  bg:         "#0b1120",       // deepest bg
  surface:    "#111827",       // card/section bg
  elevated:   "#1a2438",       // hover / active bg
  border:     "#1f2d40",       // subtle dividers
  borderMid:  "#2a3a50",       // stronger dividers
  accent:     "#f59e0b",       // amber — primary highlight
  accentDim:  "rgba(245,158,11,.12)",
  accentText: "#fcd34d",
  info:       "#3b82f6",
  infoDim:    "rgba(59,130,246,.10)",
  infoText:   "#93c5fd",
  text:       "#f1f5f9",
  textSub:    "#94a3b8",
  textMute:   "#475569",
  success:    "#10b981",
  successDim: "rgba(16,185,129,.10)",
};

/* ─── Section label ──────────────────────────────────────────────── */
const NavSection = ({ label }) => (
  <Box sx={{ px: 2, pt: 2.2, pb: 0.6 }}>
    <Box sx={{ height: 1, background: S.border, mb: 1 }} />
    <Typography sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", color: S.textMute, textTransform: "uppercase", userSelect: "none" }}>
      {label}
    </Typography>
  </Box>
);

const SideToggleBtn = ({ collapsed, onClick }) => (
  <Tooltip title={collapsed ? "Open sidebar" : "Close sidebar"} placement="right" arrow>
    <Box
      onClick={onClick}
      sx={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: collapsed ? S.accentText : S.textSub,
        background: collapsed ? S.accentDim : "transparent",
        border: `1px solid ${collapsed ? "rgba(245,158,11,.22)" : S.border}`,
        transition: "all .13s",
        flexShrink: 0,
        "&:hover": {
          background: collapsed ? "rgba(245,158,11,.18)" : S.elevated,
          color: collapsed ? S.accentText : S.text,
          borderColor: collapsed ? "rgba(245,158,11,.35)" : S.borderMid,
        },
      }}
    >
      {collapsed ? <KeyboardDoubleArrowRightIcon sx={{ fontSize: 16 }} /> : <KeyboardDoubleArrowLeftIcon sx={{ fontSize: 16 }} />}
    </Box>
  </Tooltip>
);

/* ─── Nav item ───────────────────────────────────────────────────── */
const NavBtn = ({
  icon, label, active, subActive, indent = false,
  onClick, to, collapsed, hasChildren, isOpen,
  color = S.accent, colorDim = S.accentDim, colorText = S.accentText,
}) => {
  const Tag = to ? Link : "div";

  const bg    = active    ? colorDim   : subActive ? S.infoDim : "transparent";
  const clr   = active    ? color      : subActive ? S.info    : S.textMute;
  const txtClr= active    ? colorText  : subActive ? S.infoText: S.textSub;
  const bar   = active    ? color      : subActive ? S.info    : "transparent";

  return (
    <Tooltip title={collapsed ? label : ""} placement="right" arrow>
      <Box
        component={Tag}
        to={to}
        onClick={onClick}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 0,
          px: 0,
          mx: 0,
          height: collapsed ? 44 : 36,
          cursor: "pointer",
          textDecoration: "none",
          background: bg,
          borderLeft: `2px solid ${bar}`,
          transition: "background .13s, border-color .13s",
          justifyContent: collapsed ? "center" : "flex-start",
          "&:hover": {
            background: active ? colorDim : S.elevated,
            borderLeftColor: active ? color : subActive ? S.info : S.borderMid,
          },
        }}
      >
        {/* Icon */}
        <Box sx={{
          width: collapsed ? COLLAPSED_WIDTH : 44,
          minWidth: collapsed ? COLLAPSED_WIDTH : 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: clr, fontSize: 18, flexShrink: 0,
          pl: indent && !collapsed ? 0.5 : 0,
        }}>
          {icon}
        </Box>

        {/* Label */}
        {!collapsed && (
          <Typography sx={{
            fontSize: indent ? 12.5 : 13,
            fontWeight: active || subActive ? 700 : 500,
            color: txtClr,
            lineHeight: 1,
            flex: 1,
            whiteSpace: "nowrap",
            letterSpacing: active ? ".01em" : "normal",
          }}>
            {label}
          </Typography>
        )}

        {/* Expand caret */}
        {!collapsed && hasChildren && (
          <Box sx={{ pr: 1.5, color: S.textMute, display: "flex", alignItems: "center", transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <ExpandMoreIcon sx={{ fontSize: 15 }} />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

/* ─── Sub-items wrapper ──────────────────────────────────────────── */
const SubGroup = ({ children }) => (
  <Box sx={{ background: "rgba(0,0,0,.18)", borderLeft: `2px solid ${S.border}`, ml: 0 }}>
    {children}
  </Box>
);

/* ─── Sidebar ────────────────────────────────────────────────────── */
const Sidebar = ({ open = true, onToggle }) => {
  const [anchorEl,     setAnchorEl]     = useState(null);
  const [productsOpen, setProductsOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [salesOpen,    setSalesOpen]    = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const collapsed = !open;
  const w = collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleLogout = () => { logout(); navigate("/login"); };

  /* ── Active checks ── */
  const isProductsActive = location.pathname.startsWith("/products");
  const isPurchaseActive = location.pathname.startsWith("/suppliers/products") || location.pathname.startsWith("/purchase/details");
  const isSupplierActive = location.pathname.startsWith("/suppliers") && !isPurchaseActive;
  const isCustomerActive = location.pathname.startsWith("/customers");
  const isSalesActive    = location.pathname === "/quotation" || location.pathname === "/customers/bill";
  const isSettingsActive = ["/company-profile", "/invoice-settings", "/product-defaults", "/user-management", "/backup-data"].includes(location.pathname);

  /* ── Sub-item configs ── */
  const salesSubItems = [
    { label: "Quotes",      icon: <ReceiptIcon      sx={{ fontSize: 16 }} />, path: "/quotation" },
    { label: "New Invoice", icon: <ReceiptLongIcon  sx={{ fontSize: 16 }} />, path: "/customers/bill" },
  ];
  const productSubItems = [
    { label: "Add Inventory",   icon: <AddBoxIcon   sx={{ fontSize: 16 }} />, path: "/products/add" },
    { label: "Inventory List",  icon: <ListAltIcon  sx={{ fontSize: 16 }} />, path: "/products/details" },
  ];
  const customerSubItems = [
    { label: "New Customer",      icon: <PersonAddIcon  sx={{ fontSize: 16 }} />, path: "/customers/create" },
    { label: "Customer Directory",icon: <PeopleIcon     sx={{ fontSize: 16 }} />, path: "/customers/details" },
    { label: "Receivables",       icon: <PaymentsIcon   sx={{ fontSize: 16 }} />, path: "/customers/payments" },
  ];
  const supplierSubItems = [
    { label: "New Supplier",    icon: <AddBusinessIcon  sx={{ fontSize: 16 }} />, path: "/suppliers/create" },
    { label: "Payables",        icon: <PaymentsIcon     sx={{ fontSize: 16 }} />, path: "/suppliers/payment" },
    { label: "Supplier Directory", icon: <ListAltIcon   sx={{ fontSize: 16 }} />, path: "/suppliers/details" },
  ];
  const purchaseSubItems = [
    { label: "New Purchase",      icon: <ListAltIcon sx={{ fontSize: 16 }} />, path: "/suppliers/products" },
    { label: "Purchase Ledger",   icon: <ListAltIcon sx={{ fontSize: 16 }} />, path: "/purchase/details" },
  ];
  const settingsSubItems = [
    { label: "Business Profile",        icon: <AddBusinessIcon sx={{ fontSize: 16 }} />, path: "/company-profile" },
    { label: "Invoice Preferences",     icon: <ReceiptIcon     sx={{ fontSize: 16 }} />, path: "/invoice-settings" },
    { label: "Inventory Defaults",      icon: <InventoryIcon   sx={{ fontSize: 16 }} />, path: "/product-defaults" },
    { label: "Team Access",             icon: <PeopleIcon      sx={{ fontSize: 16 }} />, path: "/user-management" },
    { label: "Backup & Restore",        icon: <BackupIcon      sx={{ fontSize: 16 }} />, path: "/backup-data" },
  ];

  return (
    <Box sx={{
      width: w, minWidth: w,
      height: "100vh",
      position: "sticky", top: 0, alignSelf: "flex-start",
      background: S.bg,
      borderRight: `1px solid ${S.border}`,
      display: "flex", flexDirection: "column",
      transition: "width .22s cubic-bezier(.4,0,.2,1), min-width .22s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
      zIndex: 100,
    }}>

      {/* ── Brand bar ── */}
      <Box sx={{
        height: 52,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        px: collapsed ? 0.8 : 1.1,
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        {!collapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0, height: "100%", pl: 0 }}>
            {/* Accent stripe */}
            <Box sx={{ width: 3, height: "100%", background: S.accent, flexShrink: 0 }} />
            <Box sx={{ pl: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 900, color: S.text, letterSpacing: "-.01em", lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
                Renix<Box component="span" sx={{ color: S.accent }}>Bill</Box>
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: S.textMute, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", mt: 0.3 }}>
                Billing System
              </Typography>
            </Box>
          </Box>
        )}

        {/* Collapsed: just the dot mark */}
        {collapsed && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.8 }}>
            <Box sx={{ width: 28, height: 28, background: S.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: S.bg, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>R</Typography>
            </Box>
            <SideToggleBtn collapsed={collapsed} onClick={onToggle} />
          </Box>
        )}

        {!collapsed && <SideToggleBtn collapsed={collapsed} onClick={onToggle} />}
      </Box>

      {/* ── Scrollable nav ── */}
      <Box sx={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        pb: 1,
        "&::-webkit-scrollbar": { width: 3 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { background: S.border },
      }}>

        <NavBtn
          icon={<DashboardIcon sx={{ fontSize: 18 }} />}
          label="Dashboard"
          active={location.pathname === "/"}
          to="/"
          collapsed={collapsed}
        />

        {/* Sales */}
        <NavBtn
          icon={<PointOfSaleIcon sx={{ fontSize: 18 }} />}
          label="Sales"
          active={isSalesActive && !collapsed}
          collapsed={collapsed}
          hasChildren
          isOpen={salesOpen}
          onClick={() => setSalesOpen(v => !v)}
        />
        {!collapsed && (
          <Collapse in={salesOpen} timeout={160} unmountOnExit>
            <SubGroup>
              {salesSubItems.map(sub => (
                <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                  subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
              ))}
            </SubGroup>
          </Collapse>
        )}

        {/* Purchase */}
        {isAdmin && (
          <>
            <NavBtn
              icon={<LocalShippingIcon sx={{ fontSize: 18 }} />}
              label="Purchasement"
              active={isPurchaseActive && !collapsed}
              collapsed={collapsed}
              hasChildren
              isOpen={purchaseOpen}
              onClick={() => { navigate("/suppliers/products"); setPurchaseOpen(v => !v); }}
            />
            {!collapsed && (
              <Collapse in={purchaseOpen} timeout={160} unmountOnExit>
                <SubGroup>
                  {purchaseSubItems.map(sub => (
                    <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                      subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
                  ))}
                </SubGroup>
              </Collapse>
            )}
          </>
        )}

        {/* Customer */}
        {isAdmin && (
          <>
            <NavBtn
              icon={<PeopleIcon sx={{ fontSize: 18 }} />}
              label="Customers"
              active={isCustomerActive && !collapsed}
              collapsed={collapsed}
              hasChildren
              isOpen={customerOpen}
              onClick={() => { navigate("/customers"); setCustomerOpen(v => !v); }}
            />
            {!collapsed && (
              <Collapse in={customerOpen} timeout={160} unmountOnExit>
                <SubGroup>
                  {customerSubItems.map(sub => (
                    <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                      subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
                  ))}
                </SubGroup>
              </Collapse>
            )}
          </>
        )}

        {/* Supplier */}
        {isAdmin && (
          <>
            <NavBtn
              icon={<AddBusinessIcon sx={{ fontSize: 18 }} />}
              label="Suppliers"
              active={isSupplierActive && !collapsed}
              collapsed={collapsed}
              hasChildren
              isOpen={supplierOpen}
              onClick={() => { navigate("/suppliers"); setSupplierOpen(v => !v); }}
            />
            {!collapsed && (
              <Collapse in={supplierOpen} timeout={160} unmountOnExit>
                <SubGroup>
                  {supplierSubItems.map(sub => (
                    <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                      subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
                  ))}
                </SubGroup>
              </Collapse>
            )}
          </>
        )}

        {/* Product */}
        <NavBtn
          icon={<InventoryIcon sx={{ fontSize: 18 }} />}
          label="Inventory"
          active={isProductsActive && !collapsed}
          collapsed={collapsed}
          hasChildren
          isOpen={productsOpen}
          onClick={() => { navigate("/products"); setProductsOpen(v => !v); }}
        />
        {!collapsed && (
          <Collapse in={productsOpen} timeout={160} unmountOnExit>
            <SubGroup>
              {productSubItems.map(sub => (
                <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                  subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
              ))}
            </SubGroup>
          </Collapse>
        )}

        {isAdmin && (
          <NavBtn
            icon={<AssessmentIcon sx={{ fontSize: 18 }} />}
            label="Reports"
            active={location.pathname === "/reports"}
            to="/reports"
            collapsed={collapsed}
          />
        )}

        {isAdmin && (
          <>
            <NavBtn
              icon={<SettingsIcon sx={{ fontSize: 18 }} />}
              label="Settings"
              active={isSettingsActive && !collapsed}
              collapsed={collapsed}
              hasChildren
              isOpen={settingsOpen}
              onClick={() => setSettingsOpen(v => !v)}
            />
            {!collapsed && (
              <Collapse in={settingsOpen} timeout={160} unmountOnExit>
                <SubGroup>
                  {settingsSubItems.map(sub => (
                    <NavBtn key={sub.path} icon={sub.icon} label={sub.label}
                      subActive={location.pathname === sub.path} to={sub.path} indent collapsed={false} />
                  ))}
                </SubGroup>
              </Collapse>
            )}
          </>
        )}
      </Box>

      {/* ── User zone ── */}
      <Box sx={{ borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>

        {collapsed ? (
          /* Collapsed: avatar only */
          <Tooltip title={user?.name || "User"} placement="right">
            <Box
              onClick={e => setAnchorEl(e.currentTarget)}
              sx={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", "&:hover": { background: S.elevated }, transition: "background .13s" }}
            >
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 800, bgcolor: S.accent, color: S.bg }}>
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar>
            </Box>
          </Tooltip>
        ) : (
          /* Expanded: full user card */
          <Box
            onClick={e => setAnchorEl(e.currentTarget)}
            sx={{
              display: "flex", alignItems: "center", gap: 1.4,
              px: 1.6, py: 1.3,
              cursor: "pointer",
              borderTop: `2px solid ${S.accent}`,
              "&:hover": { background: S.elevated },
              transition: "background .13s",
            }}
          >
            <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 900, bgcolor: S.accent, color: S.bg, flexShrink: 0, borderRadius: 0 }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </Avatar>

            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: S.text, lineHeight: 1.3 }}>
                {user?.name || "User"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.3 }}>
                {/* Role badge */}
                <Box sx={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
                  px: 0.8, py: "1px",
                  background: user?.role === "admin" ? S.accent : S.border,
                  color: user?.role === "admin" ? S.bg : S.textSub,
                  lineHeight: 1.6,
                }}>
                  {user?.role === "admin" ? "Admin" : "Staff"}
                </Box>
                {user?.phone && (
                  <Typography noWrap sx={{ fontSize: 10.5, color: S.textMute }}>
                    {user.phone}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ color: S.textMute, display: "flex" }}>
              <ExpandMoreIcon sx={{ fontSize: 14 }} />
            </Box>
          </Box>
        )}

        {/* Logout menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          PaperProps={{
            sx: {
              borderRadius: 0,
              border: `1px solid #e2eaf4`,
              boxShadow: "0 8px 32px rgba(0,0,0,.12)",
              minWidth: 190,
            },
          }}
        >
          {/* User info header */}
          <Box sx={{ px: 2, py: 1.4, borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>{user?.name}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.4 }}>
              <Box sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", px: 0.8, py: "1px", background: user?.role === "admin" ? "#fef3c7" : "#f1f5f9", color: user?.role === "admin" ? "#92400e" : "#64748b", lineHeight: 1.6 }}>
                {user?.role === "admin" ? "Admin" : "Staff"}
              </Box>
              {user?.phone && <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{user.phone}</Typography>}
            </Box>
          </Box>

          <MenuItem
            onClick={handleLogout}
            sx={{ fontSize: 13, fontWeight: 600, color: "#dc2626", gap: 1.2, py: 1.2, borderRadius: 0, "&:hover": { background: "#fef2f2" } }}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Sidebar;

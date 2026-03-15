import { Box, Button, Tooltip, Typography, Fade } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import MenuOpenOutlinedIcon from "@mui/icons-material/MenuOpenOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const NAV_HEIGHT = 60;

const routeMeta = [
  { match: (p) => p === "/", title: "Dashboard", subtitle: "Welcome to your workspace", tabIcon: "📊" },
  { match: (p) => p === "/quotation", title: "Quotation", subtitle: "Create & manage quotations", tabIcon: "🧾" },
  { match: (p) => p === "/customers/bill", title: "Create Bill", subtitle: "New sales invoice", tabIcon: "🧾" },
  { match: (p) => p.startsWith("/customers/payments"), title: "Receive Payment", subtitle: "Record customer payments", tabIcon: "💳" },
  { match: (p) => p.startsWith("/customers/details"), title: "Customer Details", subtitle: "View & manage customers", tabIcon: "👥" },
  { match: (p) => p.startsWith("/customers/create"), title: "Create Customer", subtitle: "Add a new customer", tabIcon: "👤" },
  { match: (p) => p.startsWith("/customers"), title: "Customers", subtitle: "Manage your customer base", tabIcon: "👥" },
  { match: (p) => p.startsWith("/products"), title: "Products", subtitle: "Inventory & stock management", tabIcon: "📦" },
  { match: (p) => p.startsWith("/suppliers"), title: "Suppliers", subtitle: "Vendor & purchase tracking", tabIcon: "🚚" },
  { match: (p) => p.startsWith("/purchase"), title: "Purchases", subtitle: "Purchase order management", tabIcon: "🛒" },
  { match: (p) => p.startsWith("/reports"), title: "Reports", subtitle: "Business reports", tabIcon: "📈" },
  {
    match: (p) => ["/company-profile", "/invoice-settings", "/product-defaults", "/user-management", "/backup-data"].some((s) => p.startsWith(s)),
    title: "Settings",
    subtitle: "Configure your application",
    tabIcon: "⚙️",
  },
];

const getRouteMeta = (pathname) =>
  routeMeta.find((r) => r.match(pathname)) || { title: "Billing System", subtitle: "Welcome back", tabIcon: "🏢" };

const setFavicon = (emoji) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="44">${emoji}</text></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "icon");
    document.head.appendChild(link);
  }
  link.setAttribute("type", "image/svg+xml");
  link.setAttribute("href", href);
};

const LiveDateTime = () => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = useMemo(
    () =>
      time.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    [time]
  );

  return (
    <Box
      sx={{
        px: 1.2,
        py: 0.7,
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#475569", lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
};

const NavIconBtn = ({ icon, tooltip, onClick, danger }) => (
  <Tooltip title={tooltip} placement="bottom" arrow TransitionComponent={Fade} TransitionProps={{ timeout: 120 }}>
    <Box
      onClick={onClick}
      sx={{
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        cursor: "pointer",
        userSelect: "none",
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: danger ? "#ef4444" : "#1a56a0",
        transition: "all .13s",
        flexShrink: 0,
        "&:hover": {
          background: danger ? "#fef2f2" : "#eff6ff",
          color: danger ? "#dc2626" : "#0f3d7a",
        },
      }}
    >
      {icon}
    </Box>
  </Tooltip>
);

const RoleBadge = ({ role }) => {
  const label = role === "admin" ? "Admin" : "Staff";
  const isAdmin = role === "admin";

  return (
    <Box
      sx={{
        px: 1.2,
        py: 0.7,
        borderRadius: "8px",
        background: isAdmin ? "#fff7ed" : "#eff6ff",
        border: `1px solid ${isAdmin ? "#fed7aa" : "#bfdbfe"}`,
        whiteSpace: "nowrap",
      }}
    >
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: isAdmin ? "#c2410c" : "#1d4ed8",
          lineHeight: 1,
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const Navbar = ({ sidebarOpen, onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const route = useMemo(() => getRouteMeta(location.pathname || ""), [location.pathname]);

  useEffect(() => {
    document.title = route.title;
    setFavicon(route.tabIcon);
  }, [route]);

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));
  const handleClose = () => {
    const p = location.pathname || "";
    if (p.startsWith("/suppliers")) return navigate("/suppliers");
    if (p.startsWith("/customers")) return navigate("/customers");
    if (p.startsWith("/products")) return navigate("/products");
    navigate("/");
  };

  return (
    <Box
      sx={{
        height: NAV_HEIGHT,
        px: 2,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        background: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        boxShadow: "0 1px 4px rgba(15,23,42,.05)",
        fontFamily: "'Noto Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.1,
            letterSpacing: "-.02em",
            whiteSpace: "nowrap",
          }}
        >
          {route.title}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexShrink: 0 }}>
        <RoleBadge role={user?.role} />
        <LiveDateTime />
        <Button
          onClick={onToggleSidebar}
          size="small"
          startIcon={sidebarOpen ? <MenuOpenOutlinedIcon sx={{ fontSize: 16 }} /> : <MenuOutlinedIcon sx={{ fontSize: 16 }} />}
          sx={{
            minWidth: 72,
            height: 34,
            px: 1.2,
            borderRadius: "8px",
            textTransform: "none",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#1a56a0",
            border: "1px solid #dbe5f0",
            background: "#fff",
            "&:hover": { background: "#eff6ff" },
          }}
        >
          Max
        </Button>
        <NavIconBtn icon={<ArrowBackIcon sx={{ fontSize: 19 }} />} tooltip="Go back" onClick={handleBack} />
        <NavIconBtn icon={<CloseIcon sx={{ fontSize: 19 }} />} tooltip="Close" onClick={handleClose} danger />
      </Box>
    </Box>
  );
};

export default Navbar;

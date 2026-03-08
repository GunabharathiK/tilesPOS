import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Box, Typography, Avatar, Divider,
  Menu, MenuItem, Chip, Collapse,
  IconButton,
} from "@mui/material";

import DashboardIcon        from "@mui/icons-material/Dashboard";
import InventoryIcon        from "@mui/icons-material/Inventory";
import ReceiptIcon          from "@mui/icons-material/Receipt";
import SettingsIcon         from "@mui/icons-material/Settings";
import PeopleIcon           from "@mui/icons-material/People";
import LocalShippingIcon    from "@mui/icons-material/LocalShipping";
import AddBusinessIcon      from "@mui/icons-material/AddBusiness";
import ListAltIcon          from "@mui/icons-material/ListAlt";
import PaymentsIcon         from "@mui/icons-material/Payments";
import AddBoxIcon           from "@mui/icons-material/AddBox";
import PersonAddIcon        from "@mui/icons-material/PersonAdd";
import ReceiptLongIcon      from "@mui/icons-material/ReceiptLong";
import ExpandLess           from "@mui/icons-material/ExpandLess";
import ExpandMore           from "@mui/icons-material/ExpandMore";
import MenuIcon             from "@mui/icons-material/Menu";
import ChevronLeftIcon      from "@mui/icons-material/ChevronLeft";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SIDEBAR_WIDTH = 208;
const COLLAPSED_WIDTH = 52;

const Sidebar = ({ open = true, onToggle, onCreateBillClick }) => {

  const [anchorEl, setAnchorEl] = useState(null);
  const [productsOpen, setProductsOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const topItems = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/", adminOnly: false },
    { label: "Quotation", icon: <ReceiptIcon />, path: "/quotation", adminOnly: false },
  ];

  const bottomItems = [
    { label: "Settings", icon: <SettingsIcon />, path: "/settings", adminOnly: true },
  ];

  const supplierSubItems = [
    { label: "Supplier Create", icon: <AddBusinessIcon />, path: "/suppliers/create" },
    { label: "Supplier Products", icon: <ListAltIcon />, path: "/suppliers/products" },
    { label: "Pay to Supplier", icon: <PaymentsIcon />, path: "/suppliers/payment" },
    { label: "Supplier Product Details", icon: <ListAltIcon />, path: "/suppliers/details" },
  ];

  const productSubItems = [
    { label: "Add Products", icon: <AddBoxIcon />, path: "/products/add" },
    { label: "Product Details", icon: <ListAltIcon />, path: "/products/details" },
  ];

  const customerSubItems = [
    { label: "Create Customer", icon: <PersonAddIcon />, path: "/customers/create" },
    { label: "Create Bill", icon: <ReceiptLongIcon />, path: "/customers/bill" },
    { label: "Customer Payments & Details", icon: <PaymentsIcon />, path: "/customers/payments" },
  ];

  const isProductsActive = location.pathname.startsWith("/products");
  const isSupplierActive = location.pathname.startsWith("/suppliers");
  const isCustomerActive = location.pathname.startsWith("/customers");

  const NavItem = ({ item }) => {

    if (!isAdmin && item.adminOnly) return null;

    const active = location.pathname === item.path;

    return (
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          to={item.path}
          sx={{
            background: active ? "#334155" : "transparent",
            borderLeft: active ? "3px solid #facc15" : "3px solid transparent",
            "&:hover": { background: "#334155" },
          }}
        >
          <ListItemIcon sx={{ color: active ? "#facc15" : "#94a3b8", minWidth: 30 }}>
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
  };

  if (!open) {
    return (
      <Box
        sx={{
          width: COLLAPSED_WIDTH,
          minWidth: COLLAPSED_WIDTH,
          position: "sticky",
          top: 0,
          height: "100vh",
          alignSelf: "flex-start",
          background: "#1e293b",
          borderRight: "1px solid #334155",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: 1.5,
        }}
      >
        <IconButton
          onClick={onToggle}
          sx={{
            color: "#cbd5e1",
            border: "1px solid #475569",
            borderRadius: 2,
            "&:hover": { background: "#334155" },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            {user?.phone}
          </Typography>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          Logout
        </MenuItem>
      </Menu>

      <Divider sx={{ background: "#334155" }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, py: 0.5 }}>
        <IconButton
          onClick={onToggle}
          sx={{
            color: "#cbd5e1",
            border: "1px solid #475569",
            borderRadius: 2,
            "&:hover": { background: "#334155" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <List sx={{ pt: 1 }}>

        {topItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        {/* PRODUCT MANAGEMENT */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              navigate("/products");
              setProductsOpen(!productsOpen);
            }}
            sx={{
              background: isProductsActive ? "#334155" : "transparent",
              borderLeft: isProductsActive ? "3px solid #facc15" : "3px solid transparent",
              "&:hover": { background: "#334155" },
            }}
          >
            <ListItemIcon sx={{ color: isProductsActive ? "#facc15" : "#94a3b8", minWidth: 30 }}>
              <InventoryIcon />
            </ListItemIcon>

            <ListItemText
              primary="Product"
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: isProductsActive ? 600 : 400,
                color: isProductsActive ? "#fff" : "#cbd5e1",
              }}
            />

            {productsOpen ? (
              <ExpandLess sx={{ color: "#94a3b8" }} />
            ) : (
              <ExpandMore sx={{ color: "#94a3b8" }} />
            )}
          </ListItemButton>
        </ListItem>

        <Collapse in={productsOpen} timeout="auto" unmountOnExit>
          <List disablePadding>
            {productSubItems.map((sub) => {
              const active = location.pathname === sub.path;

              return (
                <ListItem key={sub.path} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={sub.path}
                    sx={{
                      pl: 4,
                      background: active ? "#1e3a5f" : "transparent",
                      borderLeft: active ? "3px solid #60a5fa" : "3px solid transparent",
                      "&:hover": { background: "#2d3f55" },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? "#60a5fa" : "#64748b", minWidth: 30 }}>
                      {sub.icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={sub.label}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? "#93c5fd" : "#94a3b8",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Collapse>

        {/* CUSTOMER MANAGEMENT */}
        {isAdmin && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/customers");
                  setCustomerOpen(!customerOpen);
                }}
                sx={{
                  background: isCustomerActive ? "#334155" : "transparent",
                  borderLeft: isCustomerActive ? "3px solid #facc15" : "3px solid transparent",
                  "&:hover": { background: "#334155" },
                }}
              >
                <ListItemIcon sx={{ color: isCustomerActive ? "#facc15" : "#94a3b8", minWidth: 30 }}>
                  <PeopleIcon />
                </ListItemIcon>

                <ListItemText
                  primary="Customer"
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isCustomerActive ? 600 : 400,
                    color: isCustomerActive ? "#fff" : "#cbd5e1",
                  }}
                />

                {customerOpen ? (
                  <ExpandLess sx={{ color: "#94a3b8" }} />
                ) : (
                  <ExpandMore sx={{ color: "#94a3b8" }} />
                )}
              </ListItemButton>
            </ListItem>

            <Collapse in={customerOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {customerSubItems.map((sub) => {
                  const active = location.pathname === sub.path;
                  return (
                    <ListItem key={sub.path} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={sub.path}
                        onClick={() => {
                          if (sub.path === "/customers/bill") onCreateBillClick?.();
                        }}
                        sx={{
                          pl: 4,
                          background: active ? "#1e3a5f" : "transparent",
                          borderLeft: active ? "3px solid #60a5fa" : "3px solid transparent",
                          "&:hover": { background: "#2d3f55" },
                        }}
                      >
                        <ListItemIcon sx={{ color: active ? "#60a5fa" : "#64748b", minWidth: 35 }}>
                          {sub.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={sub.label}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            color: active ? "#93c5fd" : "#94a3b8",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}

        {/* SUPPLIER MANAGEMENT */}

        {isAdmin && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/suppliers");
                  setSupplierOpen(!supplierOpen);
                }}
                sx={{
                  background: isSupplierActive ? "#334155" : "transparent",
                  borderLeft: isSupplierActive ? "3px solid #facc15" : "3px solid transparent",
                  "&:hover": { background: "#334155" },
                }}
              >
                <ListItemIcon sx={{ color: isSupplierActive ? "#facc15" : "#94a3b8", minWidth: 30 }}>
                  <LocalShippingIcon />
                </ListItemIcon>

                <ListItemText
                  primary="Supplier"
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isSupplierActive ? 600 : 400,
                    color: isSupplierActive ? "#fff" : "#cbd5e1",
                  }}
                />

                {supplierOpen ? (
                  <ExpandLess sx={{ color: "#94a3b8" }} />
                ) : (
                  <ExpandMore sx={{ color: "#94a3b8" }} />
                )}
              </ListItemButton>
            </ListItem>

            <Collapse in={supplierOpen} timeout="auto" unmountOnExit>

              <List disablePadding>

                {supplierSubItems.map((sub) => {

                  const active = location.pathname === sub.path;

                  return (
                    <ListItem key={sub.path} disablePadding>

                      <ListItemButton
                        component={Link}
                        to={sub.path}
                        sx={{
                          pl: 4,
                          background: active ? "#1e3a5f" : "transparent",
                          borderLeft: active ? "3px solid #60a5fa" : "3px solid transparent",
                          "&:hover": { background: "#2d3f55" },
                        }}
                      >
                        <ListItemIcon sx={{ color: active ? "#60a5fa" : "#64748b", minWidth: 35 }}>
                          {sub.icon}
                        </ListItemIcon>

                        <ListItemText
                          primary={sub.label}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            color: active ? "#93c5fd" : "#94a3b8",
                          }}
                        />

                      </ListItemButton>

                    </ListItem>
                  );
                })}

              </List>

            </Collapse>
          </>
        )}

        {bottomItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

      </List>

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

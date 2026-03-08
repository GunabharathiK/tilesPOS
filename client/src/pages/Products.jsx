import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLocation } from "react-router-dom";
import AddItem           from "../components/products/AddItem";
import SupplierAddItem   from "../components/products/SupplierAddItem";
import ProductDetails    from "../components/products/ProductDetails";
import { getProducts } from "../services/productService";
import { getInvoices } from "../services/invoiceService";

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderRadius: "14px",
      border: "1px solid #e8eef6",
      boxShadow: "0 2px 12px rgba(15,35,80,0.05)",
      height: "100%",
    }}
  >
    <CardContent sx={{ p: 2.2, height: "100%", display: "flex", alignItems: "center", minHeight: 106 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#8896a9", mb: 0.5, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Panel = ({ children, sx = {} }) => (
  <Card
    sx={{
      borderRadius: "14px",
      border: "1px solid #e8eef6",
      boxShadow: "0 2px 12px rgba(15,35,80,0.05)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      ...sx,
    }}
  >
    {children}
  </Card>
);

const PanelHeader = ({ title, sub, right }) => (
  <Box
    sx={{
      px: 2.2,
      py: 1.6,
      borderBottom: "1px solid #f0f4f9",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1.2,
    }}
  >
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0d1b36", lineHeight: 1.2 }}>{title}</Typography>
      {sub ? <Typography sx={{ fontSize: 11, color: "#8896a9", mt: 0.3 }}>{sub}</Typography> : null}
    </Box>
    {right}
  </Box>
);

const Products = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState("own");
  const [stockTab, setStockTab] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, invRes] = await Promise.all([getProducts(), getInvoices()]);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active = pathParts[1] || "overview";
  const editProduct = location.state?.editProduct || null;

  useEffect(() => {
    if (editProduct) {
      setAddMode("own");
      return;
    }
    setAddMode(active === "supplier" ? "supplier" : "own");
  }, [active, editProduct]);

  const ownProducts = useMemo(
    () => products.filter((p) => !p.isSupplierItem),
    [products]
  );
  const supplierProducts = useMemo(
    () => products.filter((p) => p.isSupplierItem),
    [products]
  );
  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => Number(p.stock || 0) <= Number(p.minStockAlert ?? 10))
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 12),
    [products]
  );
  const lowStockFiltered = useMemo(() => {
    if (stockTab === 1) return lowStockProducts.filter((p) => !p.isSupplierItem);
    if (stockTab === 2) return lowStockProducts.filter((p) => p.isSupplierItem);
    return lowStockProducts;
  }, [lowStockProducts, stockTab]);
  const totalProductsSold = useMemo(
    () =>
      invoices.reduce(
        (sum, inv) => sum + (inv?.items || []).reduce((itemSum, item) => itemSum + Number(item?.quantity || 0), 0),
        0
      ),
    [invoices]
  );

  const salesSplit = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const byName = new Map(products.map((p) => [String(p.name || "").trim().toLowerCase(), p]));
    const safeInvoices = invoices.filter((inv) => (inv?.documentType || "invoice") !== "quotation");

    const totals = safeInvoices.reduce(
      (acc, inv) => {
        (inv?.items || []).forEach((item) => {
          const qty = Number(item?.quantity || 0);
          const amount = qty * Number(item?.price || 0);
          const mapped =
            byId.get(String(item?.productId || "")) ||
            byName.get(String(item?.name || "").trim().toLowerCase()) ||
            null;
          const isSupplier = Boolean(mapped?.isSupplierItem);

          if (isSupplier) {
            acc.supplierQty += qty;
            acc.supplierAmount += amount;
          } else {
            acc.ownQty += qty;
            acc.ownAmount += amount;
          }
        });
        return acc;
      },
      { ownQty: 0, supplierQty: 0, ownAmount: 0, supplierAmount: 0 }
    );

    return totals;
  }, [invoices, products]);

  const chartData = [
    { name: "Own Product Sales", qty: salesSplit.ownQty, amount: salesSplit.ownAmount },
    { name: "Supplier Product Sales", qty: salesSplit.supplierQty, amount: salesSplit.supplierAmount },
  ];
  const CHART_COLORS = ["#2563eb", "#7c3aed"];

  const renderOverview = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d1b36", mb: 0.4 }}>
          Products
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#64748b", mb: 2.2 }}>
          Manage your product inventory
        </Typography>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, mb: 2 }}>
          <StatCard
            title="Total Products"
            value={products.length}
            icon={<InventoryIcon sx={{ color: "#2563eb" }} />}
            color="#2563eb"
          />
          <StatCard
            title="Total Own Products"
            value={ownProducts.length}
            icon={<StorefrontIcon sx={{ color: "#16a34a" }} />}
            color="#16a34a"
          />
          <StatCard
            title="Total Supplier Products"
            value={supplierProducts.length}
            icon={<LocalShippingIcon sx={{ color: "#7c3aed" }} />}
            color="#7c3aed"
          />
          <StatCard
            title="Total Product Sold"
            value={totalProductsSold}
            icon={<ShoppingCartIcon sx={{ color: "#d97706" }} />}
            color="#d97706"
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.3fr) minmax(0, 1.1fr)" } }}>
          <Panel>
            <PanelHeader title="Product Sales: Own vs Supplier" sub="Based on sold quantity from invoices" />
            <Box sx={{ p: 2.2, display: "flex", justifyContent: "center" }}>
              <Box sx={{ width: 460, maxWidth: "100%" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="qty"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, key, payload) => {
                        if (key === "qty") {
                          return [`${Number(value).toLocaleString("en-IN")} qty | Rs.${Number(payload?.payload?.amount || 0).toLocaleString("en-IN")}`, "Sales"];
                        }
                        return [value, key];
                      }}
                    />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Panel>

          <Panel>
            <PanelHeader
              title="Minimum Stock List"
              right={<Chip label={lowStockFiltered.length} size="small" color="warning" />}
            />
            <Box sx={{ px: 1.6, pt: 0.8, borderBottom: "1px solid #eef2f7", background: "#fff" }}>
              <Tabs
                value={stockTab}
                onChange={(_, value) => setStockTab(value)}
                variant="fullWidth"
                sx={{ minHeight: 40, "& .MuiTab-root": { textTransform: "none", minHeight: 40, fontSize: 12, fontWeight: 700 } }}
              >
                <Tab label={`All (${lowStockProducts.length})`} />
                <Tab label={`Own (${lowStockProducts.filter((p) => !p.isSupplierItem).length})`} />
                <Tab label={`Supplier (${lowStockProducts.filter((p) => p.isSupplierItem).length})`} />
              </Tabs>
            </Box>
            <Box sx={{ p: 2.2, pt: 1.6 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.4}>
                <WarningAmberIcon sx={{ color: "#d97706", fontSize: 18 }} />
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Stock Alerts
                </Typography>
              </Box>

              {lowStockFiltered.length === 0 ? (
                <Typography color="text.secondary" fontSize={14}>No low stock products.</Typography>
              ) : (
                <Box sx={{ maxHeight: 420, overflowY: "auto", borderRadius: "10px", border: "1px solid #eef2f7" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: "#f8fafc" }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Product</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Qty</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lowStockFiltered.map((p) => (
                        <TableRow key={p._id} hover>
                          <TableCell sx={{ fontSize: 13 }}>
                            <Typography fontSize={13} fontWeight={600}>{p.name}</Typography>
                            {p.isSupplierItem && p.supplierName && (
                              <Typography fontSize={11} color="text.secondary">{p.supplierName}</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                            {p.stock} {p.uom || ""}
                          </TableCell>
                          <TableCell>
                            {p.isSupplierItem ? (
                              <Chip size="small" label={p.supplierName || "Supplier"} color="secondary" />
                            ) : (
                              <Chip size="small" label="Own" sx={{ background: "#eff6ff", color: "#1d4ed8" }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </Panel>
        </Box>
      </>
    );
  };

  const renderContent = () => {
    if (active === "overview") return renderOverview();
    if (active === "add" || active === "supplier") {
      if (editProduct) return <AddItem />;

      return (
        <Card sx={{ borderRadius: "14px", border: "1px solid #e8eef6", boxShadow: "0 2px 12px rgba(15,35,80,0.05)" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.2,
                mb: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#1f2937", lineHeight: 1.2 }}>
                  Add Product
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Choose product type and fill details
                </Typography>
              </Box>

              <ToggleButtonGroup
                value={addMode}
                exclusive
                onChange={(_, value) => value && setAddMode(value)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    fontSize: 13,
                    px: 1.6,
                    py: 0.6,
                    borderColor: "#d7dee8",
                    color: "#475569",
                    fontWeight: 600,
                  },
                  "& .Mui-selected": {
                    background: "#eef2ff !important",
                    color: "#4338ca !important",
                    borderColor: "#c7d2fe !important",
                  },
                }}
              >
                <ToggleButton value="own">Own Product</ToggleButton>
                <ToggleButton value="supplier">Supplier Product</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {addMode === "supplier" ? <SupplierAddItem embedded /> : <AddItem embedded />}
          </CardContent>
        </Card>
      );
    }
    if (active === "details")  return <ProductDetails />;
    return null;
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2.5 },
        background: "#f0f4f9",
        minHeight: "100vh",
      }}
    >
      {renderContent()}
    </Box>
  );
};

export default Products;

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, ToggleButton, ToggleButtonGroup, Tabs, Tab,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLocation } from "react-router-dom";
import AddItem from "../components/products/AddItem";
import SupplierAddItem from "../components/products/SupplierAddItem";
import ProductDetails from "../components/products/ProductDetails";
import { getProducts } from "../services/productService";
import { getInvoices } from "../services/invoiceService";

const COLORS = { blue: "#3b82f6", violet: "#7c3aed", green: "#16a34a", amber: "#d97706" };

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s, transform 0.2s",
    "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.10)", transform: "translateY(-2px)" },
  }}>
    <CardContent sx={{ p: 2.2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em", mb: 0.6 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: "10px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Panel = ({ children, sx = {} }) => (
  <Card sx={{
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    ...sx,
  }}>
    {children}
  </Card>
);

const PanelHeader = ({ title, sub, right }) => (
  <Box sx={{ px: 2.4, py: 1.8, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
    <Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{title}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: "#94a3b8", mt: 0.2 }}>{sub}</Typography>}
    </Box>
    {right}
  </Box>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", px: 1.6, py: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", mb: 0.3 }}>{d.name}</Typography>
      <Typography sx={{ fontSize: 11, color: "#64748b" }}>Qty: {Number(d.qty).toLocaleString("en-IN")}</Typography>
      <Typography sx={{ fontSize: 11, color: "#64748b" }}>₹{Number(d.amount).toLocaleString("en-IN")}</Typography>
    </Box>
  );
};

const Products = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState("own");
  const [stockTab, setStockTab] = useState(0);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([getProducts(), getInvoices()]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active = pathParts[1] || "overview";
  const editProduct = location.state?.editProduct || null;

  useEffect(() => {
    if (editProduct) { setAddMode("own"); return; }
    setAddMode(active === "supplier" ? "supplier" : "own");
  }, [active, editProduct]);

  const ownProducts = useMemo(() => products.filter((p) => !p.isSupplierItem), [products]);
  const supplierProducts = useMemo(() => products.filter((p) => p.isSupplierItem), [products]);

  const lowStockProducts = useMemo(
    () => products
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
      invoices
        .filter((inv) => {
          const isQuotation = (inv?.documentType || "").toLowerCase() === "quotation"
            || String(inv?.invoiceNo || "").toUpperCase().startsWith("QTN");
          return !isQuotation;
        })
        .reduce((sum, inv) => sum + (inv?.items || []).reduce((s, item) => s + Number(item?.quantity || 0), 0), 0),
    [invoices]
  );

  const salesSplit = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const byName = new Map(products.map((p) => [String(p.name || "").trim().toLowerCase(), p]));
    const safeInvoices = invoices.filter((inv) => {
      const isQuotation = (inv?.documentType || "").toLowerCase() === "quotation"
        || String(inv?.invoiceNo || "").toUpperCase().startsWith("QTN");
      return !isQuotation;
    });
    return safeInvoices.reduce(
      (acc, inv) => {
        (inv?.items || []).forEach((item) => {
          const qty = Number(item?.quantity || 0);
          const amount = qty * Number(item?.price || 0);
          const mapped = byId.get(String(item?.productId || "")) || byName.get(String(item?.name || "").trim().toLowerCase()) || null;
          if (mapped?.isSupplierItem) { acc.supplierQty += qty; acc.supplierAmount += amount; }
          else { acc.ownQty += qty; acc.ownAmount += amount; }
        });
        return acc;
      },
      { ownQty: 0, supplierQty: 0, ownAmount: 0, supplierAmount: 0 }
    );
  }, [invoices, products]);

  const chartData = [
    { name: "Own Product Sales", qty: salesSplit.ownQty, amount: salesSplit.ownAmount },
    { name: "Supplier Product Sales", qty: salesSplit.supplierQty, amount: salesSplit.supplierAmount },
  ];
  const CHART_COLORS = [COLORS.blue, COLORS.violet];

  const renderOverview = () => {
    if (loading) return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={36} />
      </Box>
    );

    return (
      <>
        <Box mb={3}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#1e293b" }}>Products</Typography>
          <Typography sx={{ fontSize: 13, color: "#94a3b8", mt: 0.4 }}>Manage your product inventory</Typography>
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, mb: 2.5 }}>
          <StatCard title="Total Products" value={products.length} icon={<InventoryIcon sx={{ color: COLORS.blue, fontSize: 20 }} />} color={COLORS.blue} />
          <StatCard title="Own Products" value={ownProducts.length} icon={<StorefrontIcon sx={{ color: COLORS.green, fontSize: 20 }} />} color={COLORS.green} />
          <StatCard title="Supplier Products" value={supplierProducts.length} icon={<LocalShippingIcon sx={{ color: COLORS.violet, fontSize: 20 }} />} color={COLORS.violet} />
          <StatCard title="Total Units Sold" value={totalProductsSold} icon={<ShoppingCartIcon sx={{ color: COLORS.amber, fontSize: 20 }} />} color={COLORS.amber} />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr" }, alignItems: "start" }}>
          {/* Pie Chart Panel */}
          <Panel>
            <PanelHeader title="Sales: Own vs Supplier" sub="Based on sold quantity from invoices" />
            <Box sx={{ p: 2.4 }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={chartData} dataKey="qty" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                    {chartData.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2, mt: 1 }}>
                {chartData.map((d, i) => (
                  <Box key={d.name} sx={{ background: "#f8fafc", borderRadius: "8px", p: 1.4, borderLeft: `3px solid ${CHART_COLORS[i]}` }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", mb: 0.4 }}>
                      {d.name.split(" ")[0]}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: CHART_COLORS[i], lineHeight: 1 }}>
                      {d.qty.toLocaleString("en-IN")}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mt: 0.2 }}>
                      ₹{d.amount.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Panel>

          {/* Stock Alerts Panel */}
          <Panel>
            <PanelHeader
              title="Minimum Stock List"
              right={
                <Chip
                  size="small"
                  label={lowStockFiltered.length}
                  icon={<WarningAmberIcon sx={{ fontSize: "13px !important" }} />}
                  color="warning"
                  sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
                />
              }
            />
            <Box sx={{ px: 2, borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
              <Tabs
                value={stockTab}
                onChange={(_, v) => setStockTab(v)}
                sx={{
                  minHeight: 38,
                  "& .MuiTab-root": { textTransform: "none", minHeight: 38, fontSize: 12, fontWeight: 600, color: "#64748b", px: 1.5 },
                  "& .Mui-selected": { color: `${COLORS.blue} !important` },
                  "& .MuiTabs-indicator": { background: COLORS.blue },
                }}
              >
                <Tab label={`All (${lowStockProducts.length})`} />
                <Tab label={`Own (${lowStockProducts.filter((p) => !p.isSupplierItem).length})`} />
                <Tab label={`Supplier (${lowStockProducts.filter((p) => p.isSupplierItem).length})`} />
              </Tabs>
            </Box>

            <Box sx={{ p: 1.6, maxHeight: 360, overflowY: "auto" }}>
              {lowStockFiltered.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "#94a3b8", textAlign: "center", py: 4 }}>
                  No low stock products.
                </Typography>
              ) : (
                <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "#f1f5f9" } }}>
                  <TableHead>
                    <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", pb: 1, background: "transparent" } }}>
                      <TableCell>Product</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockFiltered.map((p) => (
                      <TableRow key={p._id} hover sx={{ "&:hover": { background: "#f8fafc" } }}>
                        <TableCell sx={{ py: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{p.name}</Typography>
                          {p.isSupplierItem && p.supplierName && (
                            <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{p.supplierName}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: Number(p.stock) <= 3 ? "#ef4444" : "#d97706" }}>
                            {p.stock}{" "}
                            <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>{p.uom || ""}</span>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {p.isSupplierItem ? (
                            <Chip size="small" label={p.supplierName || "Supplier"} sx={{ background: "#f3f0ff", color: COLORS.violet, fontSize: 10, fontWeight: 700, height: 20 }} />
                          ) : (
                            <Chip size="small" label="Own" sx={{ background: "#eff6ff", color: COLORS.blue, fontSize: 10, fontWeight: 700, height: 20 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Add Product</Typography>
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Choose product type and fill details</Typography>
              </Box>
              <ToggleButtonGroup
                value={addMode}
                exclusive
                onChange={(_, value) => value && setAddMode(value)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    textTransform: "none", fontSize: 13, px: 1.8, py: 0.6,
                    borderColor: "#e2e8f0", color: "#64748b", fontWeight: 600,
                  },
                  "& .Mui-selected": { background: "#eff6ff !important", color: `${COLORS.blue} !important`, borderColor: "#bfdbfe !important" },
                }}
              >
                <ToggleButton value="own">Own Product</ToggleButton>
                <ToggleButton value="supplier">Supplier Product</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {addMode === "supplier"
              ? <SupplierAddItem embedded onSaved={() => fetchData(false)} />
              : <AddItem embedded onSaved={() => fetchData(false)} />}
          </CardContent>
        </Card>
      );
    }

    if (active === "details") return <ProductDetails />;
    return null;
  };

  return (
    <Box sx={{ p: 0, background: "#f8fafc", minHeight: "100%" }}>
      {renderContent()}
    </Box>
  );
};

export default Products;

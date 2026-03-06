import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
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
  <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", height: "100%" }}>
    <CardContent sx={{ p: 2.5, height: "100%", display: "flex", alignItems: "center" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
        <Box>
          <Typography variant="body2" color="text.secondary" mb={0.5} sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color} sx={{ lineHeight: 1.1 }}>
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

const Products = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const totalProductsSold = useMemo(
    () =>
      invoices.reduce(
        (sum, inv) => sum + (inv?.items || []).reduce((itemSum, item) => itemSum + Number(item?.quantity || 0), 0),
        0
      ),
    [invoices]
  );

  const chartData = [
    { name: "Own Products", count: ownProducts.length },
    { name: "Supplier Products", count: supplierProducts.length },
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
        <Typography variant="h4" fontWeight={700} mb={0.5}>
          Products
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Manage your product inventory
        </Typography>

        <Grid container spacing={2.5} mb={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Products"
              value={products.length}
              icon={<InventoryIcon sx={{ color: "#2563eb" }} />}
              color="#2563eb"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Own Products"
              value={ownProducts.length}
              icon={<StorefrontIcon sx={{ color: "#16a34a" }} />}
              color="#16a34a"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Supplier Products"
              value={supplierProducts.length}
              icon={<LocalShippingIcon sx={{ color: "#7c3aed" }} />}
              color="#7c3aed"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Product Sold"
              value={totalProductsSold}
              icon={<ShoppingCartIcon sx={{ color: "#d97706" }} />}
              color="#d97706"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={0.5}>
                  Own vs Supplier Products
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Product share comparison
                </Typography>
                <Box sx={{ width: 600, maxWidth: "100%" }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={115}
                        paddingAngle={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <WarningAmberIcon sx={{ color: "#d97706", fontSize: 20 }} />
                  <Typography variant="h6" fontWeight={700}>Minimum Stock List</Typography>
                  <Chip label={lowStockProducts.length} size="small" color="warning" sx={{ ml: "auto" }} />
                </Box>

                {lowStockProducts.length === 0 ? (
                  <Typography color="text.secondary" fontSize={14}>No low stock products.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: "#f8fafc" }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Product</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Qty</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lowStockProducts.map((p) => (
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
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </>
    );
  };

  const renderContent = () => {
    if (active === "overview") return renderOverview();
    if (active === "add")      return <AddItem />;
    if (active === "supplier") return <SupplierAddItem />;
    if (active === "details")  return <ProductDetails />;
    return null;
  };

  return (
    <Box p={3}>
      {renderContent()}
    </Box>
  );
};

export default Products;

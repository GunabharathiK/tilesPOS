import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, ToggleButton, ToggleButtonGroup, Tabs, Tab,
  TextField, InputAdornment, MenuItem,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useLocation } from "react-router-dom";
import AddItem from "../components/products/AddItem";
import SupplierAddItem from "../components/products/SupplierAddItem";
import ProductDetails from "../components/products/ProductDetails";
import { getProducts } from "../services/productService";
import { getInvoices } from "../services/invoiceService";

/* ── Design tokens ── */
const C = {
  ink:       "#0a0f1e",
  inkMid:    "#1e2d45",
  blue:      "#1a56a0",
  bluePale:  "#e8f0fb",
  accent:    "#facc15",
  green:     "#15803d",
  greenPale: "#dcfce7",
  red:       "#b91c1c",
  redPale:   "#fee2e2",
  amber:     "#b45309",
  amberPale: "#fef3c7",
  violet:    "#6d28d9",
  violetPale:"#ede9fe",
  border:    "#dde3ed",
  muted:     "#64748b",
  faint:     "#94a3b8",
  bg:        "#f1f5f9",
  white:     "#ffffff",
  surface:   "#f8fafc",
};

/* ── Shared header cell ── */
const TH = { fontSize: 10, fontWeight: 800, color: C.faint, textTransform: "uppercase", letterSpacing: ".08em", py: 1.2, px: 2, background: C.surface, borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" };

/* ── Stat card — sharp, no radius ── */
const StatCard = ({ title, value, sub, icon, color, accent }) => (
  <Box sx={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderTop: `3px solid ${accent || color}`,
    p: 2.2,
    display: "flex",
    flexDirection: "column",
    gap: 0.5,
    position: "relative",
    overflow: "hidden",
    transition: "box-shadow .15s",
    "&:hover": { boxShadow: "0 4px 20px rgba(10,15,30,.08)" },
  }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.faint, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {title}
      </Typography>
      <Box sx={{ width: 32, height: 32, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </Box>
    </Box>
    <Typography sx={{ fontSize: 30, fontWeight: 900, color: C.ink, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
      {typeof value === "number" ? value.toLocaleString("en-IN") : value}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: 11, color: C.muted, mt: 0.2 }}>{sub}</Typography>
    )}
    {/* Decorative corner */}
    <Box sx={{ position: "absolute", bottom: -8, right: -8, width: 48, height: 48, background: `${color}0a`, transform: "rotate(15deg)" }} />
  </Box>
);

/* ── Section header ── */
const SectionHead = ({ title, sub, right, accent = false }) => (
  <Box sx={{
    px: 2.4, py: 1.6,
    borderBottom: `1px solid ${C.border}`,
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
    background: accent ? C.ink : C.white,
  }}>
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: accent ? "#fff" : C.ink, textTransform: "uppercase", letterSpacing: ".05em" }}>
        {title}
      </Typography>
      {sub && <Typography sx={{ fontSize: 11, color: accent ? "rgba(255,255,255,.5)" : C.faint, mt: 0.2 }}>{sub}</Typography>}
    </Box>
    {right}
  </Box>
);

/* ── Custom pie tooltip ── */
const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ background: C.ink, px: 1.8, py: 1.2, border: `1px solid ${C.border}` }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", mb: 0.3 }}>{d.name}</Typography>
      <Typography sx={{ fontSize: 11, color: C.faint }}>Qty: {Number(d.qty).toLocaleString("en-IN")}</Typography>
      <Typography sx={{ fontSize: 11, color: C.accent }}>₹{Number(d.amount).toLocaleString("en-IN")}</Typography>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════ */
const Products = () => {
  const location = useLocation();
  const [products,    setProducts]    = useState([]);
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [addMode,     setAddMode]     = useState("own");
  const [stockTab,    setStockTab]    = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy,      setSortBy]      = useState("stock-asc");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [stockPage,   setStockPage]   = useState(1);
  const STOCK_PER_PAGE = 8;

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

  useEffect(() => { fetchData(true); }, [fetchData]);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const active     = pathParts[1] || "overview";
  const editProduct = location.state?.editProduct || null;

  useEffect(() => {
    if (editProduct) { setAddMode("own"); return; }
    setAddMode(active === "supplier" ? "supplier" : "own");
  }, [active, editProduct]);

  /* ── Derived data ── */
  const ownProducts      = useMemo(() => products.filter((p) => !p.isSupplierItem), [products]);
  const supplierProducts = useMemo(() => products.filter((p) => p.isSupplierItem),  [products]);
  const outOfStock       = useMemo(() => products.filter((p) => Number(p.stock || 0) <= 0).length, [products]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(cats).sort()];
  }, [products]);

  const lowStockProducts = useMemo(
    () => products
      .filter((p) => Number(p.stock || 0) <= Number(p.minStockAlert ?? 10))
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
      .slice(0, 20),
    [products]
  );

  const lowStockFiltered = useMemo(() => {
    let list = lowStockProducts;
    if (stockTab === 1) list = list.filter((p) => !p.isSupplierItem);
    if (stockTab === 2) list = list.filter((p) => p.isSupplierItem);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.code || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    setStockPage(1); // reset to page 1 on any filter change
    return list.sort((a, b) => {
      if (sortBy === "stock-asc")  return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortBy === "stock-desc") return Number(b.stock || 0) - Number(a.stock || 0);
      if (sortBy === "name")       return (a.name || "").localeCompare(b.name || "");
      return 0;
    });
  }, [lowStockProducts, stockTab, searchQuery, categoryFilter, sortBy]);

  const totalProductsSold = useMemo(
    () => invoices
      .filter((inv) => {
        const isQ = (inv?.documentType || "").toLowerCase() === "quotation"
          || String(inv?.invoiceNo || "").toUpperCase().startsWith("QTN");
        return !isQ;
      })
      .reduce((sum, inv) => sum + (inv?.items || []).reduce((s, i) => s + Number(i?.quantity || 0), 0), 0),
    [invoices]
  );

  const salesSplit = useMemo(() => {
    const byId   = new Map(products.map((p) => [String(p._id), p]));
    const byName = new Map(products.map((p) => [String(p.name || "").trim().toLowerCase(), p]));
    return invoices
      .filter((inv) => {
        const isQ = (inv?.documentType || "").toLowerCase() === "quotation"
          || String(inv?.invoiceNo || "").toUpperCase().startsWith("QTN");
        return !isQ;
      })
      .reduce(
        (acc, inv) => {
          (inv?.items || []).forEach((item) => {
            const qty    = Number(item?.quantity || 0);
            const amount = qty * Number(item?.price || 0);
            const mapped = byId.get(String(item?.productId || "")) || byName.get(String(item?.name || "").trim().toLowerCase()) || null;
            if (mapped?.isSupplierItem) { acc.supplierQty += qty; acc.supplierAmount += amount; }
            else                        { acc.ownQty += qty;      acc.ownAmount += amount;      }
          });
          return acc;
        },
        { ownQty: 0, supplierQty: 0, ownAmount: 0, supplierAmount: 0 }
      );
  }, [invoices, products]);

  /* ── Top 5 selling products ── */
  const topSelling = useMemo(() => {
    const map = new Map();
    invoices
      .filter((inv) => {
        const isQ = (inv?.documentType || "").toLowerCase() === "quotation"
          || String(inv?.invoiceNo || "").toUpperCase().startsWith("QTN");
        return !isQ;
      })
      .forEach((inv) => {
        (inv?.items || []).forEach((item) => {
          const key = item?.name || "Unknown";
          const existing = map.get(key) || { name: key, qty: 0, revenue: 0 };
          existing.qty     += Number(item?.quantity || 0);
          existing.revenue += Number(item?.quantity || 0) * Number(item?.price || 0);
          map.set(key, existing);
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [invoices]);

  const chartData  = [
    { name: "Own",      qty: salesSplit.ownQty,      amount: salesSplit.ownAmount      },
    { name: "Supplier", qty: salesSplit.supplierQty, amount: salesSplit.supplierAmount },
  ];
  const PIE_COLORS = [C.blue, C.violet];
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

  /* ── Overview ── */
  const renderOverview = () => {
    if (loading) return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={32} sx={{ color: C.blue }} />
      </Box>
    );

    return (
      <Box sx={{ fontFamily: "'Noto Sans', sans-serif" }}>

        {/* Page header — clean light */}
        <Box sx={{
          background: C.white,
          px: 3, py: 2.2,
          mb: 3,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          borderBottom: `3px solid ${C.blue}`,
          borderLeft: `4px solid ${C.blue}`,
        }}>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: ".12em", mb: 0.4 }}>
              Inventory Management
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 900, color: C.ink, lineHeight: 1, letterSpacing: "-.01em" }}>
              Products
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color: C.faint, pb: 0.3 }}>
            {products.length} total products
          </Typography>
        </Box>

        {/* ── Stat cards ── */}
        <Box sx={{ display: "grid", gap: 0, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, mb: 3, border: `1px solid ${C.border}`, borderRight: "none" }}>
          {[
            { title: "Total Products",  value: products.length,        sub: "in catalogue",           icon: <InventoryIcon sx={{ fontSize: 17, color: C.blue    }} />, color: C.blue,   accent: C.blue   },
            { title: "Own Products",    value: ownProducts.length,     sub: "self-stocked",           icon: <StorefrontIcon sx={{ fontSize: 17, color: C.green   }} />, color: C.green,  accent: C.green  },
            { title: "Supplier Items",  value: supplierProducts.length,sub: "from suppliers",         icon: <LocalShippingIcon sx={{ fontSize: 17, color: C.violet }} />, color: C.violet, accent: C.violet },
            { title: "Units Sold",      value: totalProductsSold,      sub: "across all invoices",   icon: <ShoppingCartIcon sx={{ fontSize: 17, color: C.amber  }} />, color: C.amber,  accent: C.accent },
            { title: "Out of Stock",    value: outOfStock,             sub: "need restocking",       icon: <WarningAmberIcon sx={{ fontSize: 17, color: C.red    }} />, color: C.red,    accent: C.red    },
          ].map((s) => (
            <Box key={s.title} sx={{ borderRight: `1px solid ${C.border}` }}>
              <StatCard {...s} />
            </Box>
          ))}
        </Box>

        {/* ── Charts row ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 3 }}>

          {/* Pie chart */}
          <Box sx={{ background: C.white, border: `1px solid ${C.border}` }}>
            <SectionHead title="Own vs Supplier Sales" sub="By units sold from invoices" />
            <Box sx={{ p: 2.4 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartData} dataKey="qty" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                    {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                  <Legend verticalAlign="bottom" height={24} iconType="square" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: C.muted }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>
                {chartData.map((d, i) => (
                  <Box key={d.name} sx={{ background: C.surface, p: 1.4, borderLeft: `3px solid ${PIE_COLORS[i]}` }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.faint, textTransform: "uppercase", letterSpacing: ".06em", mb: 0.4 }}>{d.name}</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 900, color: PIE_COLORS[i], fontFamily: "'DM Mono', monospace" }}>{fmt(d.qty)}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.muted }}>₹{fmt(d.amount)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Top 5 selling bar chart */}
          <Box sx={{ background: C.white, border: `1px solid ${C.border}` }}>
            <SectionHead
              title="Top 5 Products by Qty"
              sub="Most sold products from invoices"
              right={<TrendingUpIcon sx={{ fontSize: 16, color: C.accent }} />}
            />
            <Box sx={{ p: 2.4 }}>
              {topSelling.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: C.faint, textAlign: "center", py: 6 }}>No sales data yet.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSelling} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.faint }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted }} width={90} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + "…" : v}
                    />
                    <Tooltip
                      contentStyle={{ background: C.ink, border: "none", fontSize: 12, color: "#fff" }}
                      labelStyle={{ color: C.accent, fontWeight: 700 }}
                      cursor={{ fill: `${C.blue}10` }}
                    />
                    <Bar dataKey="qty" fill={C.blue} radius={0} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── Low Stock Table ── */}
        <Box sx={{ background: C.white, border: `1px solid ${C.border}` }}>
          <SectionHead
            title="Low Stock Alert"
            sub="Products at or below minimum stock level"
            right={
              <Box sx={{ px: 1.4, py: 0.3, background: C.red, display: "flex", alignItems: "center", gap: 0.6 }}>
                <WarningAmberIcon sx={{ fontSize: 13, color: "#fff" }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{lowStockProducts.length}</Typography>
              </Box>
            }
          />

          {/* Controls bar */}
          <Box sx={{ px: 2, py: 1.4, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", background: C.surface }}>
            {/* Tabs */}
            <Tabs
              value={stockTab}
              onChange={(_, v) => setStockTab(v)}
              sx={{
                minHeight: 34,
                "& .MuiTab-root": { textTransform: "none", minHeight: 34, fontSize: 12, fontWeight: 700, color: C.muted, px: 1.5, py: 0 },
                "& .Mui-selected": { color: `${C.blue} !important` },
                "& .MuiTabs-indicator": { background: C.blue, height: 2 },
              }}
            >
              <Tab label={`All (${lowStockProducts.length})`} />
              <Tab label={`Own (${lowStockProducts.filter((p) => !p.isSupplierItem).length})`} />
              <Tab label={`Supplier (${lowStockProducts.filter((p) => p.isSupplierItem).length})`} />
            </Tabs>

            <Box sx={{ flex: 1 }} />

            {/* Search */}
            <TextField
              size="small"
              placeholder="Search product, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                width: 200,
                "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 12, background: C.white, "& fieldset": { borderColor: C.border }, "&:hover fieldset": { borderColor: C.blue } },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: C.faint }} /></InputAdornment>,
              }}
            />

            {/* Category filter */}
            <TextField
              select size="small"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              sx={{
                width: 140,
                "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 12, background: C.white, "& fieldset": { borderColor: C.border } },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FilterListIcon sx={{ fontSize: 14, color: C.faint }} /></InputAdornment>,
              }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} sx={{ fontSize: 12 }}>
                  {cat === "all" ? "All Categories" : cat}
                </MenuItem>
              ))}
            </TextField>

            {/* Sort */}
            <TextField
              select size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{
                width: 150,
                "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 12, background: C.white, "& fieldset": { borderColor: C.border } },
              }}
            >
              <MenuItem value="stock-asc"  sx={{ fontSize: 12 }}>Stock: Low → High</MenuItem>
              <MenuItem value="stock-desc" sx={{ fontSize: 12 }}>Stock: High → Low</MenuItem>
              <MenuItem value="name"       sx={{ fontSize: 12 }}>Name A → Z</MenuItem>
            </TextField>
          </Box>

          {/* Table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  {["Product", "Code", "Category", "Stock", "Min Alert", "Type", "Supplier"].map((h, i) => (
                    <TableCell key={h} align={i >= 3 && i <= 4 ? "right" : "left"} sx={TH}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(lowStockFiltered.length / STOCK_PER_PAGE));
                  const safePage   = Math.min(stockPage, totalPages);
                  const pageItems  = lowStockFiltered.slice((safePage - 1) * STOCK_PER_PAGE, safePage * STOCK_PER_PAGE);

                  if (pageItems.length === 0) return (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: C.faint, fontSize: 13, borderBottom: "none" }}>
                        {searchQuery ? `No results for "${searchQuery}"` : "No low stock products."}
                      </TableCell>
                    </TableRow>
                  );

                  return pageItems.map((p, i) => {
                    const stock    = Number(p.stock || 0);
                    const minAlert = Number(p.minStockAlert ?? 10);
                    const isOut    = stock <= 0;
                    const isCrit   = stock <= 3 && stock > 0;
                    const globalIdx = (safePage - 1) * STOCK_PER_PAGE + i;
                    return (
                      <TableRow
                        key={p._id}
                        sx={{
                          background: globalIdx % 2 === 0 ? C.white : C.surface,
                          borderLeft: isOut ? `3px solid ${C.red}` : isCrit ? `3px solid ${C.amber}` : `3px solid transparent`,
                          "&:hover td": { background: C.bluePale },
                          cursor: "default",
                          transition: "all .1s",
                        }}
                      >
                        <TableCell sx={{ py: 1.2, px: 2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.name}</Typography>
                          {p.brand && <Typography sx={{ fontSize: 11, color: C.faint }}>{p.brand}</Typography>}
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.blue, fontWeight: 700 }}>
                            {p.code ? p.code.toUpperCase() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: 12, color: C.muted }}>{p.category || "—"}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ px: 2 }}>
                          <Box sx={{
                            display: "inline-flex", alignItems: "center", gap: 0.5,
                            px: 1, py: 0.2,
                            background: isOut ? C.redPale : isCrit ? C.amberPale : C.surface,
                            border: `1px solid ${isOut ? C.red : isCrit ? C.amber : C.border}`,
                          }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: isOut ? C.red : isCrit ? C.amber : C.ink }}>
                              {stock}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: C.faint }}>{p.uom || ""}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: 12, color: C.faint, fontFamily: "'DM Mono', monospace" }}>{minAlert}</Typography>
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Box sx={{
                            display: "inline-block", px: 1, py: 0.2,
                            background: p.isSupplierItem ? C.violetPale : C.bluePale,
                            border: `1px solid ${p.isSupplierItem ? "#c4b5fd" : "#bfdbfe"}`,
                          }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: p.isSupplierItem ? C.violet : C.blue, textTransform: "uppercase", letterSpacing: ".06em" }}>
                              {p.isSupplierItem ? "Supplier" : "Own"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: 11, color: C.muted }}>{p.supplierName || "—"}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </Box>

          {/* Table footer: simple Prev · page · Next pagination */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(lowStockFiltered.length / STOCK_PER_PAGE));
            const safePage   = Math.min(stockPage, totalPages);
            const start      = lowStockFiltered.length === 0 ? 0 : (safePage - 1) * STOCK_PER_PAGE + 1;
            const end        = Math.min(safePage * STOCK_PER_PAGE, lowStockFiltered.length);

            const btnSx = (active, disabled) => ({
              px: 1.8, py: 0.6,
              fontSize: 12, fontWeight: 700,
              border: `1px solid ${active ? C.blue : C.border}`,
              background: active ? C.blue : C.white,
              color: disabled ? C.faint : active ? "#fff" : C.muted,
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              userSelect: "none",
              transition: "all .12s",
              "&:hover": (!disabled && !active) ? { borderColor: C.blue, color: C.blue, background: C.bluePale } : {},
            });

            return (
              <Box sx={{ px: 2.4, py: 1.3, borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>

                {/* Left: legend + count */}
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Box sx={{ width: 9, height: 9, background: C.red }} />
                    <Typography sx={{ fontSize: 10, color: C.faint }}>Out of stock</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Box sx={{ width: 9, height: 9, background: C.amber }} />
                    <Typography sx={{ fontSize: 10, color: C.faint }}>Critical (≤3)</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: C.faint }}>
                    {lowStockFiltered.length === 0 ? "0 items" : `${start}–${end} of ${lowStockFiltered.length}`}
                  </Typography>
                </Box>

                {/* Right: Prev · page x of y · Next */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Box
                    onClick={() => safePage > 1 && setStockPage(safePage - 1)}
                    sx={btnSx(false, safePage <= 1)}
                  >
                    ← Prev
                  </Box>

                  <Box sx={{ px: 1.6, py: 0.6, border: `1px solid ${C.border}`, background: C.white, display: "inline-flex", alignItems: "center", gap: 0.4 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.blue }}>{safePage}</Typography>
                    <Typography sx={{ fontSize: 12, color: C.faint }}>/ {totalPages}</Typography>
                  </Box>

                  <Box
                    onClick={() => safePage < totalPages && setStockPage(safePage + 1)}
                    sx={btnSx(false, safePage >= totalPages)}
                  >
                    Next →
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </Box>
      </Box>
    );
  };

  /* ── Add / Supplier / Details ── */
  const renderContent = () => {
    if (active === "overview") return renderOverview();

    if (active === "add" || active === "supplier") {
      if (editProduct) return <AddItem />;
      return (
        <Box sx={{ background: C.white, border: `1px solid ${C.border}` }}>
          {/* Header — clean light with blue accent */}
          <Box sx={{
            px: 3, py: 2,
            borderBottom: `3px solid ${C.blue}`,
            borderLeft: `4px solid ${C.blue}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.white,
          }}>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: ".12em", mb: 0.3 }}>Inventory</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: C.ink }}>Add Product</Typography>
            </Box>
            <ToggleButtonGroup
              value={addMode}
              exclusive
              onChange={(_, value) => value && setAddMode(value)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none", fontSize: 12, px: 2, py: 0.7,
                  borderColor: C.border, color: C.muted,
                  fontWeight: 700, borderRadius: "0 !important",
                },
                "& .Mui-selected": {
                  background: `${C.blue} !important`,
                  color: `#fff !important`,
                  borderColor: `${C.blue} !important`,
                },
              }}
            >
              <ToggleButton value="own">Own Product</ToggleButton>
              <ToggleButton value="supplier">Supplier Product</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ p: 2.5 }}>
            {addMode === "supplier"
              ? <SupplierAddItem embedded onSaved={() => fetchData(false)} />
              : <AddItem embedded onSaved={() => fetchData(false)} />
            }
          </Box>
        </Box>
      );
    }

    if (active === "details") return <ProductDetails />;
    return null;
  };

  return (
    <Box sx={{ p: 0, background: C.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>
      {renderContent()}
    </Box>
  );
};

export default Products;
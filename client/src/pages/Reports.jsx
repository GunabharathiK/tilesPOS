import { useEffect, useMemo, useState } from "react";
import { Box, Card, MenuItem, TextField, Typography } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import DescriptionIcon from "@mui/icons-material/Description";
import { getInvoices } from "../services/invoiceService";
import { getProducts } from "../services/productService";
import { getCustomers } from "../services/customerService";
import { formatCurrency, getInvoicePaymentMetrics } from "../utils/invoiceMetrics";

const normalizeCustomerType = (invoice = {}) => {
  const raw =
    invoice?.customerType ||
    invoice?.saleType ||
    invoice?.customer?.customerType ||
    invoice?.customer?.saleType ||
    "Retail Customer";
  if (raw === "Dealer" || raw === "Wholesale") return "Dealer";
  if (raw === "Contractor" || raw === "B2B") return "Contractor";
  if (raw === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const parseInvoiceDate = (invoice = {}) => {
  const d = new Date(invoice?.createdAt || invoice?.date || Date.now());
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const isQuotationDoc = (invoice = {}) =>
  String(invoice?.documentType || "").toLowerCase() === "quotation" ||
  String(invoice?.invoiceNo || "").toUpperCase().startsWith("QTN");

const reportDefs = [
  { key: "sales", label: "Sales Report", hint: "Daily/Monthly with totals", icon: <AssessmentIcon sx={{ fontSize: 20 }} />, color: "#1a56a0", bg: "#e8f0fb" },
  { key: "bulk", label: "Bulk / Dealer Report", hint: "Business customer sales", icon: <ArchitectureIcon sx={{ fontSize: 20 }} />, color: "#6c3fc5", bg: "#f0eafb" },
  { key: "stock", label: "Stock Report", hint: "Current stock and value", icon: <Inventory2Icon sx={{ fontSize: 20 }} />, color: "#d4820a", bg: "#fef8ec" },
  { key: "pnl", label: "Profit & Loss", hint: "Revenue, COGS, gross profit", icon: <TrendingUpIcon sx={{ fontSize: 20 }} />, color: "#1a7a4a", bg: "#e8f5ee" },
  { key: "gst", label: "GST Report", hint: "Taxable and GST summary", icon: <ReceiptLongIcon sx={{ fontSize: 20 }} />, color: "#b45309", bg: "#fff7ed" },
  { key: "supplier", label: "Supplier Report", hint: "Suppliers and product lines", icon: <LocalShippingIcon sx={{ fontSize: 20 }} />, color: "#0e7a6e", bg: "#e4f5f3" },
  { key: "customer", label: "Customer Report", hint: "Sales and outstanding by customer", icon: <PeopleIcon sx={{ fontSize: 20 }} />, color: "#2563eb", bg: "#eff6ff" },
  { key: "collection", label: "Collection Report", hint: "Cash/UPI/Card split", icon: <PaymentsIcon sx={{ fontSize: 20 }} />, color: "#15803d", bg: "#f0fdf4" },
  { key: "quotation", label: "Quotation History", hint: "Quotation count and value", icon: <DescriptionIcon sx={{ fontSize: 20 }} />, color: "#7c3aed", bg: "#f5f3ff" },
];

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "all", label: "All Time" },
];

const inPeriod = (date, period) => {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === "all") return true;
  if (period === "today") return target.getTime() === dayStart.getTime();
  if (period === "this_week") {
    const start = new Date(dayStart);
    start.setDate(dayStart.getDate() - dayStart.getDay());
    return target >= start && target <= now;
  }
  if (period === "this_month") {
    return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
  }
  if (period === "last_month") {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return target.getMonth() === last.getMonth() && target.getFullYear() === last.getFullYear();
  }
  return true;
};

const SmallCard = ({ label, value, tone = "#1c2333" }) => (
  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", p: 1.5, background: "#fff" }}>
    <Typography sx={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</Typography>
    <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", color: tone, lineHeight: 1.1 }}>{value}</Typography>
  </Box>
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeReport, setActiveReport] = useState("sales");
  const [period, setPeriod] = useState("this_month");

  useEffect(() => {
    (async () => {
      try {
        const [invRes, prodRes, custRes] = await Promise.all([getInvoices(), getProducts(), getCustomers()]);
        setInvoices(Array.isArray(invRes?.data) ? invRes.data : []);
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
        setCustomers(Array.isArray(custRes?.data) ? custRes.data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredInvoices = useMemo(
    () => invoices.filter((inv) => inPeriod(parseInvoiceDate(inv), period)),
    [invoices, period]
  );

  const invoiceRows = useMemo(
    () =>
      filteredInvoices.map((inv) => {
        const metrics = getInvoicePaymentMetrics(inv);
        return {
          invoice: inv,
          date: parseInvoiceDate(inv),
          type: normalizeCustomerType(inv),
          metrics,
          qty: Array.isArray(inv?.items) ? inv.items.reduce((s, item) => s + Number(item?.quantity || 0), 0) : 0,
          avgItemDiscount: Array.isArray(inv?.items) && inv.items.length
            ? inv.items.reduce((s, i) => s + Number(i?.discount || 0), 0) / inv.items.length
            : 0,
        };
      }),
    [filteredInvoices]
  );

  const summary = useMemo(() => {
    const totalSales = invoiceRows.reduce((s, r) => s + r.metrics.amount, 0);
    const totalPaid = invoiceRows.reduce((s, r) => s + r.metrics.paidAmount, 0);
    const totalDue = invoiceRows.reduce((s, r) => s + r.metrics.dueAmount, 0);
    return {
      bills: invoiceRows.length,
      totalSales,
      totalPaid,
      totalDue,
      qty: invoiceRows.reduce((s, r) => s + r.qty, 0),
    };
  }, [invoiceRows]);

  const salesTableRows = useMemo(
    () =>
      [...invoiceRows]
        .sort((a, b) => b.date - a.date)
        .slice(0, 30)
        .map((r) => ({
          invoiceNo: r.invoice?.invoiceNo || "-",
          date: r.date.toLocaleDateString("en-GB"),
          customer: r.invoice?.customer?.name || "-",
          type: r.type,
          amount: r.metrics.amount,
          paid: r.metrics.paidAmount,
          status: r.metrics.status,
        })),
    [invoiceRows]
  );

  const bulkRows = useMemo(() => invoiceRows.filter((r) => r.type !== "Retail Customer"), [invoiceRows]);
  const bulkByCustomer = useMemo(() => {
    const map = new Map();
    bulkRows.forEach((r) => {
      const key = `${r.invoice?.customer?.name || "Unknown"}|${r.invoice?.customer?.phone || ""}`;
      if (!map.has(key)) {
        map.set(key, { name: r.invoice?.customer?.name || "Unknown", type: r.type, total: 0, due: 0, discountSum: 0, count: 0 });
      }
      const row = map.get(key);
      row.total += r.metrics.amount;
      row.due += r.metrics.dueAmount;
      row.discountSum += r.avgItemDiscount;
      row.count += 1;
    });
    return Array.from(map.values()).map((r) => ({ ...r, avgDiscount: r.count ? r.discountSum / r.count : 0 }));
  }, [bulkRows]);

  const stockRows = useMemo(
    () =>
      products.map((p) => {
        const stock = Number(p?.stock || 0);
        const min = Number(p?.minStock || p?.lowStockThreshold || 0);
        const cost = Number(p?.costPrice || 0);
        return {
          sku: p?.code || p?._id?.slice(-6) || "-",
          name: p?.name || "-",
          stock,
          value: stock * cost,
          status: stock <= 0 ? "Out of Stock" : stock <= min ? "Low Stock" : "OK",
        };
      }),
    [products]
  );

  const pnl = useMemo(() => {
    const productMap = new Map(products.map((p) => [String(p?._id), Number(p?.costPrice || 0)]));
    let cogs = 0;
    invoiceRows.forEach((r) => {
      (r.invoice?.items || []).forEach((item) => {
        const qty = Number(item?.quantity || 0);
        const rate = Number(item?.price || 0);
        const cost = productMap.get(String(item?.productId)) || rate * 0.75;
        cogs += qty * cost;
      });
    });
    const revenue = summary.totalSales;
    const gross = revenue - cogs;
    const margin = revenue > 0 ? (gross / revenue) * 100 : 0;
    return { revenue, cogs, gross, margin };
  }, [invoiceRows, products, summary.totalSales]);

  const gst = useMemo(() => {
    const taxable = invoiceRows.reduce((s, r) => s + Math.max(0, r.metrics.amount - Number(r.invoice?.taxAmount || 0)), 0);
    const gstTotal = invoiceRows.reduce((s, r) => s + Number(r.invoice?.taxAmount || 0), 0);
    return { taxable, gstTotal, cgst: gstTotal / 2, sgst: gstTotal / 2 };
  }, [invoiceRows]);

  const collections = useMemo(() => {
    const out = { CASH: 0, UPI: 0, CARD: 0, "BANK TRANSFER": 0, CHEQUE: 0, OTHER: 0 };
    invoiceRows.forEach((r) => {
      const method = String(r.invoice?.payment?.method || "").toUpperCase().trim();
      const paid = Number(r.metrics.paidAmount || 0);
      if (!paid) return;
      if (method.includes("CASH")) out.CASH += paid;
      else if (method.includes("UPI")) out.UPI += paid;
      else if (method.includes("CARD")) out.CARD += paid;
      else if (method.includes("BANK")) out["BANK TRANSFER"] += paid;
      else if (method.includes("CHEQUE")) out.CHEQUE += paid;
      else out.OTHER += paid;
    });
    return out;
  }, [invoiceRows]);

  const customerRows = useMemo(() => {
    const map = new Map();
    invoiceRows.forEach((r) => {
      const key = `${r.invoice?.customer?.name || "Unknown"}|${r.invoice?.customer?.phone || ""}`;
      if (!map.has(key)) {
        map.set(key, { name: r.invoice?.customer?.name || "Unknown", phone: r.invoice?.customer?.phone || "-", amount: 0, due: 0, count: 0 });
      }
      const row = map.get(key);
      row.amount += r.metrics.amount;
      row.due += r.metrics.dueAmount;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [invoiceRows]);

  const quotationRows = useMemo(
    () =>
      invoices
        .filter((inv) => isQuotationDoc(inv))
        .map((inv) => {
          const metrics = getInvoicePaymentMetrics(inv);
          return {
            invoice: inv,
            date: parseInvoiceDate(inv),
            type: normalizeCustomerType(inv),
            metrics,
            qty: Array.isArray(inv?.items) ? inv.items.reduce((s, item) => s + Number(item?.quantity || 0), 0) : 0,
          };
        }),
    [invoices]
  );

  const renderTable = () => {
    if (activeReport === "sales") {
      return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f8fafc" }}>
            <Box component="tr">
              {["Bill No", "Date", "Customer", "Type", "Amount", "Paid", "Status"].map((h) => (
                <Box key={h} component="th" sx={{ textAlign: "left", py: 1.1, px: 1.4, fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {salesTableRows.map((r) => (
              <Box component="tr" key={`${r.invoiceNo}-${r.date}`}>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontFamily: "monospace" }}>{r.invoiceNo}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.date}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.customer}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.type}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>Rs.{formatCurrency(r.amount)}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", color: "#15803d" }}>Rs.{formatCurrency(r.paid)}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.status}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    if (activeReport === "bulk") {
      return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f8fafc" }}>
            <Box component="tr">
              {["Customer", "Type", "Total", "Avg Discount", "Outstanding"].map((h) => (
                <Box key={h} component="th" sx={{ textAlign: "left", py: 1.1, px: 1.4, fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {bulkByCustomer.map((r) => (
              <Box component="tr" key={`${r.name}-${r.type}`}>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.name}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.type}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>Rs.{formatCurrency(r.total)}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.avgDiscount.toFixed(1)}%</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", color: r.due > 0 ? "#dc2626" : "#15803d", fontWeight: 700 }}>Rs.{formatCurrency(r.due)}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    if (activeReport === "stock") {
      return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f8fafc" }}>
            <Box component="tr">
              {["SKU", "Tile", "Stock", "Value", "Status"].map((h) => (
                <Box key={h} component="th" sx={{ textAlign: "left", py: 1.1, px: 1.4, fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {stockRows.map((r) => (
              <Box component="tr" key={r.sku}>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontFamily: "monospace" }}>{r.sku}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.name}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.stock}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>Rs.{formatCurrency(r.value)}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", color: r.status === "OK" ? "#15803d" : "#dc2626" }}>{r.status}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    if (activeReport === "customer") {
      return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f8fafc" }}>
            <Box component="tr">
              {["Customer", "Mobile", "Bills", "Sales", "Outstanding"].map((h) => (
                <Box key={h} component="th" sx={{ textAlign: "left", py: 1.1, px: 1.4, fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {customerRows.map((r) => (
              <Box component="tr" key={`${r.name}-${r.phone}`}>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.name}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.phone}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.count}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>Rs.{formatCurrency(r.amount)}</Box>
                <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", color: r.due > 0 ? "#dc2626" : "#15803d", fontWeight: 700 }}>Rs.{formatCurrency(r.due)}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    if (activeReport === "quotation") {
      return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ background: "#f8fafc" }}>
            <Box component="tr">
              {["Quotation No", "Date", "Customer", "Type", "Amount"].map((h) => (
                <Box key={h} component="th" sx={{ textAlign: "left", py: 1.1, px: 1.4, fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {quotationRows
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((r) => (
                <Box component="tr" key={`${r.invoice?.invoiceNo}-${r.date.toISOString()}`}>
                  <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontFamily: "monospace" }}>{r.invoice?.invoiceNo || "-"}</Box>
                  <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.date.toLocaleDateString("en-GB")}</Box>
                  <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.invoice?.customer?.name || "-"}</Box>
                  <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7" }}>{r.type}</Box>
                  <Box component="td" sx={{ p: 1.3, borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>Rs.{formatCurrency(r.metrics.amount)}</Box>
                </Box>
              ))}
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 14, color: "#334155" }}>
          Report summary is shown above for this section.
        </Typography>
      </Box>
    );
  };

  const cardsForActive = () => {
    if (activeReport === "sales") {
      return [
        { label: "Total Sales", value: `Rs.${formatCurrency(summary.totalSales)}`, tone: "#15803d" },
        { label: "Total Bills", value: summary.bills },
        { label: "Qty Sold", value: summary.qty },
        { label: "Pending", value: `Rs.${formatCurrency(summary.totalDue)}`, tone: "#dc2626" },
      ];
    }
    if (activeReport === "bulk") {
      const avgDiscount = bulkRows.length ? bulkRows.reduce((s, r) => s + r.avgItemDiscount, 0) / bulkRows.length : 0;
      return [
        { label: "Bulk Revenue", value: `Rs.${formatCurrency(bulkRows.reduce((s, r) => s + r.metrics.amount, 0))}`, tone: "#6c3fc5" },
        { label: "Dealer Bills", value: bulkRows.length },
        { label: "Bulk Qty", value: bulkRows.reduce((s, r) => s + r.qty, 0) },
        { label: "Avg Discount", value: `${avgDiscount.toFixed(1)}%`, tone: "#15803d" },
      ];
    }
    if (activeReport === "stock") {
      const low = stockRows.filter((r) => r.status !== "OK").length;
      return [
        { label: "Total SKUs", value: stockRows.length },
        { label: "Total Stock", value: stockRows.reduce((s, r) => s + r.stock, 0) },
        { label: "Stock Value", value: `Rs.${formatCurrency(stockRows.reduce((s, r) => s + r.value, 0))}`, tone: "#1a56a0" },
        { label: "Low / Out", value: low, tone: "#dc2626" },
      ];
    }
    if (activeReport === "pnl") {
      return [
        { label: "Revenue", value: `Rs.${formatCurrency(pnl.revenue)}`, tone: "#1a56a0" },
        { label: "COGS", value: `Rs.${formatCurrency(pnl.cogs)}`, tone: "#b45309" },
        { label: "Gross Profit", value: `Rs.${formatCurrency(pnl.gross)}`, tone: pnl.gross >= 0 ? "#15803d" : "#dc2626" },
        { label: "Margin", value: `${pnl.margin.toFixed(1)}%`, tone: pnl.margin >= 0 ? "#15803d" : "#dc2626" },
      ];
    }
    if (activeReport === "gst") {
      return [
        { label: "Taxable", value: `Rs.${formatCurrency(gst.taxable)}` },
        { label: "GST Total", value: `Rs.${formatCurrency(gst.gstTotal)}`, tone: "#b45309" },
        { label: "CGST", value: `Rs.${formatCurrency(gst.cgst)}` },
        { label: "SGST", value: `Rs.${formatCurrency(gst.sgst)}` },
      ];
    }
    if (activeReport === "supplier") {
      return [
        { label: "Suppliers", value: customers.length },
        { label: "Products", value: products.length },
        { label: "Invoices", value: summary.bills },
        { label: "Total Purchase Est.", value: `Rs.${formatCurrency(stockRows.reduce((s, r) => s + r.value, 0))}` },
      ];
    }
    if (activeReport === "customer") {
      return [
        { label: "Customers", value: customerRows.length },
        { label: "Collected", value: `Rs.${formatCurrency(summary.totalPaid)}`, tone: "#15803d" },
        { label: "Outstanding", value: `Rs.${formatCurrency(summary.totalDue)}`, tone: "#dc2626" },
        { label: "Bills", value: summary.bills },
      ];
    }
    if (activeReport === "quotation") {
      const qValue = quotationRows.reduce((s, r) => s + r.metrics.amount, 0);
      const qQty = quotationRows.reduce((s, r) => s + r.qty, 0);
      const qCustomerCount = new Set(quotationRows.map((r) => `${r.invoice?.customer?.name || ""}|${r.invoice?.customer?.phone || ""}`)).size;
      return [
        { label: "Quotations", value: quotationRows.length },
        { label: "Quotation Value", value: `Rs.${formatCurrency(qValue)}`, tone: "#7c3aed" },
        { label: "Qty (sqft)", value: qQty },
        { label: "Customers", value: qCustomerCount },
      ];
    }
    const totalCollection = Object.values(collections).reduce((s, n) => s + n, 0);
    return [
      { label: "Cash", value: `Rs.${formatCurrency(collections.CASH)}` },
      { label: "UPI", value: `Rs.${formatCurrency(collections.UPI)}` },
      { label: "Cheque/Card", value: `Rs.${formatCurrency(collections.CHEQUE + collections.CARD)}` },
      { label: "Total", value: `Rs.${formatCurrency(totalCollection)}`, tone: "#15803d" },
    ];
  };

  return (
    <Box sx={{ p: 0, background: "#f0f4f8", minHeight: "100%" }}>
      <Card sx={{ mb: 2.2, p: 2.5, borderRadius: "16px", background: "linear-gradient(135deg, #1a56a0, #0f3d7a)", color: "#fff" }}>
        <Typography sx={{ fontSize: 30, fontWeight: 800, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>Reports</Typography>
        <Typography sx={{ mt: 0.6, fontSize: 12.5, color: "rgba(255,255,255,0.78)" }}>
          Sales, collections, stock, GST and business insights
        </Typography>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 1.2, mb: 2 }}>
        {reportDefs.map((r) => (
          <Card
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            sx={{
              p: 1.7,
              borderRadius: "12px",
              border: activeReport === r.key ? `1.5px solid ${r.color}` : "1px solid #dbe5f0",
              boxShadow: activeReport === r.key ? "0 10px 22px rgba(15,35,60,0.10)" : "0 2px 8px rgba(15,35,60,0.05)",
              cursor: "pointer",
            }}
          >
            <Box sx={{ width: 40, height: 40, borderRadius: "10px", background: r.bg, color: r.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
              {r.icon}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#1c2333" }}>{r.label}</Typography>
            <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.6 }}>{r.hint}</Typography>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: "12px", border: "1px solid #dbe5f0", overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e2e8f0", background: "#fafcfe", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#1c2333" }}>
            {reportDefs.find((r) => r.key === activeReport)?.label || "Report"}
          </Typography>
          <TextField
            select
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "8px", background: "#fff" } }}
          >
            {periodOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ p: 1.8 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4,1fr)" }, gap: 1.1, mb: 1.6 }}>
            {cardsForActive().map((c) => (
              <SmallCard key={c.label} label={c.label} value={loading ? "..." : c.value} tone={c.tone} />
            ))}
          </Box>

          <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflowX: "auto", background: "#fff" }}>
            {loading ? (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ color: "#64748b", fontSize: 13 }}>Loading report...</Typography>
              </Box>
            ) : (
              renderTable()
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default Reports;

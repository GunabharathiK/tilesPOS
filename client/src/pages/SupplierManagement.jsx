import {
  Box, Card, Typography, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, LinearProgress, Collapse,
  IconButton, Divider, Avatar,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon   from "@mui/icons-material/KeyboardArrowUp";
import LocalShippingIcon     from "@mui/icons-material/LocalShipping";
import AttachMoneyIcon       from "@mui/icons-material/AttachMoney";
import AccountBalanceIcon    from "@mui/icons-material/AccountBalance";
import PendingActionsIcon    from "@mui/icons-material/PendingActions";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getSuppliers, getPurchases } from "../services/supplierService";

const fmt = (n = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ── Expandable Supplier Row ─────────────────────────────── */
const ExpandableSupplierRow = ({ supplier, purchases, serial }) => {
  const [open, setOpen] = useState(false);

  const totalValue = supplier.totalValue || 0;
  const paid       = supplier.totalPaid  || 0;
  const due        = supplier.totalDue   || 0;
  const pct        = totalValue > 0 ? Math.min(100, (paid / totalValue) * 100) : 0;
  const totalItems = purchases.reduce((s, p) => s + (p.products?.length || 0), 0);

  return (
    <>
      <TableRow hover sx={{ "& > *": { borderBottom: "unset" }, cursor: "pointer" }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#64748b" }}>{serial}</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: "#eff6ff", color: "#2563eb", fontSize: 14, fontWeight: 700 }}>
              {supplier.companyName?.[0]?.toUpperCase() || supplier.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography fontWeight={600} fontSize={14}>{supplier.companyName || supplier.name}</Typography>
              {supplier.gstin && (
                <Typography fontSize={11} color="text.secondary">GSTIN: {supplier.gstin}</Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell>{supplier.companyPhone || supplier.phone}</TableCell>
        <TableCell>
          <Box>
            <Typography fontSize={13} fontWeight={600}>{totalItems} items</Typography>
            <Typography fontSize={11} color="text.secondary">{purchases.length} purchase{purchases.length !== 1 ? "s" : ""}</Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#1d4ed8" }}>₹{fmt(totalValue)}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#15803d" }}>₹{fmt(paid)}</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                width: 80,
                height: 6,
                borderRadius: 3,
                background: "#e2e8f0",
                "& .MuiLinearProgress-bar": {
                  background: pct >= 100 ? "#22c55e" : pct > 50 ? "#f59e0b" : "#ef4444",
                  borderRadius: 3,
                },
              }}
            />
            <Typography fontSize={11} color="text.secondary">{Math.round(pct)}%</Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, color: due > 0 ? "#dc2626" : "#15803d" }}>₹{fmt(due)}</TableCell>
        <TableCell>
          <Chip
            label={supplier.paymentStatus}
            size="small"
            color={
              supplier.paymentStatus === "Paid"
                ? "success"
                : supplier.paymentStatus === "Partial"
                ? "warning"
                : "error"
            }
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, background: "#fafbfc" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>

              <Grid container spacing={3}>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                    🏢 COMPANY DETAILS
                  </Typography>
                  {[
                    ["Company", supplier.companyName || supplier.name],
                    ["Email", supplier.companyEmail],
                    ["Phone", supplier.companyPhone || supplier.phone],
                    ["Website", supplier.companyWebsite],
                    ["LIC No", supplier.licNo],
                    ["GSTIN", supplier.gstin],
                    ["Address", supplier.companyAddress || supplier.address],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <Box key={label} display="flex" gap={1} mb={0.5}>
                        <Typography fontSize={12} color="text.secondary" minWidth={70}>
                          {label}:
                        </Typography>
                        <Typography fontSize={12} fontWeight={500}>
                          {val}
                        </Typography>
                      </Box>
                    ))}
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                    👤 SUPPLIER CONTACT
                  </Typography>
                  {[
                    ["Name", supplier.supplierName || supplier.name],
                    ["Phone", supplier.supplierPhone],
                    ["Account No", supplier.accountNo],
                    ["IFSC", supplier.ifscCode],
                    ["UPI ID", supplier.upiId],
                    ["Bank", supplier.bankName],
                    ["Branch", supplier.branch],
                    ["Holder", supplier.accountHolder],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <Box key={label} display="flex" gap={1} mb={0.5}>
                        <Typography fontSize={12} color="text.secondary" minWidth={80}>
                          {label}:
                        </Typography>
                        <Typography fontSize={12} fontWeight={500}>
                          {val}
                        </Typography>
                      </Box>
                    ))}
                </Grid>

              </Grid>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

/* ── Main Component ─────────────────────────────────────── */
const SupplierManagement = () => {

  const [suppliers, setSuppliers] = useState([]);
  const [purchasesMap, setPurchasesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [supRes, purRes] = await Promise.all([
        getSuppliers(),
        getPurchases(),
      ]);

      const allSuppliers = supRes.data || [];
      const allPurchases = purRes.data || [];

      const map = {};

      allPurchases.forEach((p) => {
        const key = p.supplierId?.toString();
        if (!map[key]) map[key] = [];
        map[key].push(p);
      });

      setSuppliers(allSuppliers);
      setPurchasesMap(map);

    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const totalValue = suppliers.reduce((s, sup) => s + (sup.totalValue || 0), 0);
  const totalPaid = suppliers.reduce((s, sup) => s + (sup.totalPaid || 0), 0);
  const totalDue = suppliers.reduce((s, sup) => s + (sup.totalDue || 0), 0);

  const pendingList = suppliers.filter((s) => s.paymentStatus !== "Paid");

  const STATS = [
    { label: "Total Suppliers", value: suppliers.length, icon: <LocalShippingIcon />, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    { label: "Total Amount", value: `₹${fmt(totalValue)}`, icon: <AccountBalanceIcon />, bg: "#f5f3ff", border: "#ddd6fe", color: "#7c3aed" },
    { label: "Total Paid", value: `₹${fmt(totalPaid)}`, icon: <AttachMoneyIcon />, bg: "#ecfdf5", border: "#a7f3d0", color: "#059669" },
    { label: "Total Pending", value: `₹${fmt(totalDue)}`, icon: <PendingActionsIcon />, bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
  ];

  return (
    <Box p={3}>

      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Supplier Management
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Overview of all suppliers, payments and pending dues
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {STATS.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ p: 2.5, borderRadius: 3, background: s.bg, border: `1.5px solid ${s.border}` }}>
              <Typography fontSize={13}>{s.label}</Typography>
              <Typography variant="h5" fontWeight={800} color={s.color}>
                {s.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pending Suppliers */}
      <Card sx={{ p: 3, borderRadius: 3, mb: 3, border: "1.5px solid #fee2e2", background: "#fffafa" }}>
        <Typography variant="subtitle1" fontWeight={700} color="#dc2626" mb={2}>
          ⚠️ Pending Payments ({pendingList.length})
        </Typography>

        {pendingList.length === 0 ? (
          <Typography color="text.secondary">No pending payments</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Supplier</TableCell>
                <TableCell>Purchases</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingList.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.companyName || s.name}</TableCell>
                  <TableCell>{(purchasesMap[s._id] || []).length}</TableCell>
                  <TableCell>₹{fmt(s.totalValue)}</TableCell>
                  <TableCell>₹{fmt(s.totalPaid)}</TableCell>
                  <TableCell>₹{fmt(s.totalDue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {/* All Suppliers Table
      <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          📋 All Suppliers ({suppliers.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {loading ? (
          <LinearProgress />
        ) : suppliers.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <LocalShippingIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography>No suppliers added yet</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ background: "#f1f5f9" }}>
                <TableRow>
                  <TableCell />
                  {["#", "Company", "Phone", "Items / Purchases", "Total Value", "Paid", "Progress", "Due", "Status"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: 13 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((s, i) => (
                  <ExpandableSupplierRow
                    key={s._id}
                    supplier={s}
                    purchases={purchasesMap[s._id] || []}
                    serial={i + 1}
                  />
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card> */}
    </Box>
  );
};

export default SupplierManagement;
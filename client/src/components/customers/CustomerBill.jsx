import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Divider,
  MenuItem,
  IconButton,
  Autocomplete,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getProducts } from "../../services/productService";
import { getCustomers, saveCustomer } from "../../services/customerService";
import { createInvoice, finalizeInvoiceStock } from "../../services/invoiceService";
import InvoicePrint from "../billing/InvoicePrint";

const emptyItem = {
  productId: "",
  search: "",
  code: "",
  name: "",
  colorDesign: "",
  quantity: "",
  size: "",
  uom: "",
  price: 0,
  gst: 0,
  discount: 0,
  gstAmount: 0,
  discountAmount: 0,
  total: 0,
  availableStock: null,
  confirmed: false,
};

const fmt = (n = 0) => Number(n).toFixed(2);

// ── Reusable label+value info cell ──────────────────────────────────────────
const InfoCell = ({ label, value, large = false }) => (
  <Box>
    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.3 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: large ? 20 : 15, fontWeight: large ? 800 : 600, color: "#0f172a", lineHeight: 1.2 }}>
      {value || "—"}
    </Typography>
  </Box>
);

const infoGridSx = {
  display: "grid",
  gap: 2.5,
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(6, minmax(0, 1fr))",
  },
};

const bankGridSx = {
  display: "grid",
  gap: 2.5,
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(3, minmax(0, 1fr))",
    lg: "repeat(6, minmax(0, 1fr))",
  },
};

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
    <Box sx={{
      width: 36, height: 36, borderRadius: "10px",
      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
    }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: 12, color: "#94a3b8", mt: 0.3 }}>{subtitle}</Typography>}
    </Box>
  </Box>
);

// ── Summary row ───────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, highlight = false }) => (
  <Box sx={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    py: 1, px: 1.5,
    borderRadius: highlight ? "8px" : 0,
    background: highlight ? "linear-gradient(135deg, #eff6ff, #eef2ff)" : "transparent",
    borderBottom: highlight ? "none" : "1px solid #f1f5f9",
  }}>
    <Typography sx={{ fontSize: 13, color: highlight ? "#3730a3" : "#64748b", fontWeight: highlight ? 700 : 500 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 800, color: highlight ? "#3730a3" : "#0f172a" }}>
      {value}
    </Typography>
  </Box>
);

const CustomerBill = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [extraGst, setExtraGst] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentType, setPaymentType] = useState("Full Payment");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [payingAmountError, setPayingAmountError] = useState("");

  const fetchAll = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([getProducts(), getCustomers()]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
    } catch {
      toast.error("Failed to load products/customers");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (paymentType !== "Partial") {
      setPartialAmount("");
      setPayingAmountError("");
    }
  }, [paymentType]);

  const recalcRow = (row) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;
    const base = qty * price;
    const gstAmount = (base * (Number(row.gst) || 0)) / 100;
    const discountAmount = (base * (Number(row.discount) || 0)) / 100;
    return { ...row, gstAmount, discountAmount, total: base + gstAmount - discountAmount };
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const setRow = (index, nextRow) =>
    setItems((prev) => prev.map((row, i) => (i === index ? recalcRow(nextRow) : row)));

  const selectProduct = (index, product) => {
    const current = items[index];
    setRow(index, {
      ...current,
      productId: product._id,
      search: product.name || "",
      code: product.code || "",
      name: product.name || "",
      size: product.size || "",
      uom: product.uom || "",
      price: Number(product.price || 0),
      gst: Number(product.gst || 0),
      availableStock: Number(product.stock ?? 0),
      quantity: current.quantity || 1,
      confirmed: false,
    });
    setActiveIndex(null);
  };

  const handleItemChange = (index, field, value) => {
    const row = { ...items[index], [field]: value };
    if (field === "search") row.name = value;
    if (field === "quantity") {
      const qty = Number(value) || 0;
      const stockVal = row.availableStock;
      const max = Number(stockVal);

      if (stockVal !== null && stockVal !== undefined && Number.isFinite(max)) {
        if (max <= 0 && qty > 0) {
          row.quantity = 0;
          toast.error(`"${row.name || "Selected product"}" is out of stock`, { id: `stock-${index}` });
        } else if (qty > max) {
          row.quantity = max;
          toast.error(`Only ${max} available for ${row.name || "selected product"}`, { id: `stock-${index}` });
        }
      }
    }
    if (field !== "confirmed") row.confirmed = false;
    setRow(index, row);
  };

  const toggleConfirm = (index) => {
    const row = items[index];
    if (!row.confirmed) {
      if (!row.name || Number(row.quantity) <= 0) {
        toast.error("Select product and enter valid quantity before confirm");
        return;
      }
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, confirmed: true } : it)));
      toast.success("Item confirmed");
      return;
    }
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, confirmed: false } : it)));
  };

  const confirmedItems = useMemo(() => items.filter((i) => i.confirmed), [items]);
  const totalItemsCount = useMemo(
    () => confirmedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    [confirmedItems]
  );

  const totals = useMemo(() => {
    const base = confirmedItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.price || 0), 0);
    const itemGstAmount = confirmedItems.reduce((s, i) => s + Number(i.gstAmount || 0), 0);
    const itemDiscountAmount = confirmedItems.reduce((s, i) => s + Number(i.discountAmount || 0), 0);
    const subTotal = base + itemGstAmount - itemDiscountAmount;
    const extraGstAmount = (subTotal * (Number(extraGst) || 0)) / 100;
    const extraDiscountAmount = (subTotal * (Number(extraDiscount) || 0)) / 100;
    const finalAmount = subTotal + extraGstAmount - extraDiscountAmount;
    return { base, itemGstAmount, itemDiscountAmount, subTotal, extraGstAmount, extraDiscountAmount, finalAmount };
  }, [confirmedItems, extraGst, extraDiscount]);

  useEffect(() => {
    if (paymentType !== "Partial") { setPayingAmountError(""); return; }
    const val = Number(partialAmount) || 0;
    if (val > totals.finalAmount) setPayingAmountError(`Cannot exceed Rs.${fmt(totals.finalAmount)}`);
    else if (val <= 0) setPayingAmountError("Must be greater than 0");
    else setPayingAmountError("");
  }, [partialAmount, paymentType, totals.finalAmount]);

  const paymentSummary = useMemo(() => {
    if (paymentType === "Pending") return { paidAmount: 0, dueAmount: totals.finalAmount, status: "Pending" };
    if (paymentType === "Partial") {
      const paid = Math.max(0, Math.min(Number(partialAmount) || 0, totals.finalAmount));
      return { paidAmount: paid, dueAmount: Math.max(0, totals.finalAmount - paid), status: paid > 0 ? "Partial" : "Pending" };
    }
    return { paidAmount: totals.finalAmount, dueAmount: 0, status: "Paid" };
  }, [paymentType, partialAmount, totals.finalAmount]);

  const hasCardBankDetails = useMemo(() => {
    if (!selectedCustomer) return false;
    return Boolean(
      selectedCustomer.bankName?.trim() &&
      selectedCustomer.accountHolder?.trim() &&
      selectedCustomer.accountNo?.trim() &&
      selectedCustomer.ifscCode?.trim()
    );
  }, [selectedCustomer]);

  const hasUpiDetails = useMemo(
    () => Boolean(selectedCustomer?.upiId?.trim()),
    [selectedCustomer]
  );

  const missingPaymentDetails =
    paymentType !== "Pending" && paymentMethod === "CARD" && !hasCardBankDetails
      ? "Customer bank details are required for card payment"
      : paymentType !== "Pending" && paymentMethod === "UPI" && !hasUpiDetails
        ? "Customer UPI ID is required for UPI payment"
        : "";

  useEffect(() => {
    if (!missingPaymentDetails) return;
    toast.error(missingPaymentDetails, { id: "customer-payment-details" });
  }, [missingPaymentDetails]);

  const generateInvoiceNo = () => `CINV${Date.now()}`;

  const handleSubmit = async () => {
    if (!selectedCustomer?.name) { toast.error("Select customer"); return; }
    if (confirmedItems.length === 0) { toast.error("Confirm at least one item"); return; }
    if (missingPaymentDetails) { toast.error(missingPaymentDetails); return; }
    if (paymentType === "Partial" && (Number(partialAmount) <= 0 || Number(partialAmount) >= totals.finalAmount)) {
      toast.error("Paying amount should be > 0 and < final amount"); return;
    }
    const payload = {
      customer: {
        name: selectedCustomer.name || "", phone: selectedCustomer.phone || "",
        address: selectedCustomer.address || "",
        bankName: selectedCustomer.bankName || "", branch: selectedCustomer.branch || "",
        accountHolder: selectedCustomer.accountHolder || "", accountNo: selectedCustomer.accountNo || "",
        ifscCode: selectedCustomer.ifscCode || "", upiId: selectedCustomer.upiId || "",
      },
      items: confirmedItems.map((i) => ({
        productId: i.productId, code: i.code, name: i.name, colorDesign: i.colorDesign,
        quantity: Number(i.quantity) || 0, size: i.size, uom: i.uom,
        price: Number(i.price) || 0, gst: Number(i.gst) || 0, discount: Number(i.discount) || 0,
        gstAmount: Number(i.gstAmount) || 0, discountAmount: Number(i.discountAmount) || 0, total: Number(i.total) || 0,
      })),
      tax: Number(extraGst) || 0, discount: Number(extraDiscount) || 0,
      taxAmount: totals.extraGstAmount, discountAmount: totals.extraDiscountAmount,
      payment: {
        method: paymentType === "Pending" ? "" : paymentMethod,
        amount: totals.finalAmount, paidAmount: paymentSummary.paidAmount,
        dueAmount: paymentSummary.dueAmount, paymentType,
      },
      reduceStockNow: false,
      status: paymentSummary.status, invoiceNo: generateInvoiceNo(),
      date: new Date().toLocaleString(),
    };
    setLoading(true);
    try {
      const res = await createInvoice(payload);
      setInvoiceData(res.data);
      await saveCustomer({ ...payload.customer, amount: totals.finalAmount, status: paymentSummary.status, method: paymentType === "Pending" ? "" : paymentMethod });
      toast.success("Invoice generated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create bill");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoiceData) return;
    const element = document.getElementById("customer-invoice-preview");
    const canvas = await html2canvas(element, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width);
    pdf.save(`Invoice-${invoiceData.invoiceNo}.pdf`);
  };

  const resetBillForm = () => {
    setSelectedCustomer(null);
    setItems([]);
    setExtraGst("");
    setExtraDiscount("");
    setPaymentMethod("CASH");
    setPaymentType("Full Payment");
    setPartialAmount("");
    setInvoiceData(null);
    setPayingAmountError("");
    setActiveIndex(null);
  };

  const handleCancel = () => {
    resetBillForm();
    toast.success("Bill cancelled. Form reset.");
  };

  const handleDone = async () => {
    try {
      if (invoiceData?._id && !invoiceData?.stockReduced) {
        const res = await finalizeInvoiceStock(invoiceData._id);
        setInvoiceData(res.data);
        await fetchAll();
      }
      resetBillForm();
      toast.success("Done! Ready for next bill.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update stock");
    }
  };

  // shared input style
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px", background: "#fff", fontSize: 13,
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#94a3b8" },
      "&.Mui-focused fieldset": { borderColor: "#6366f1", borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontSize: 13 },
    "& .MuiInputLabel-root.Mui-focused": { color: "#6366f1" },
  };

  const statusColor = { Paid: "#16a34a", Partial: "#d97706", Pending: "#dc2626" };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── PAGE TITLE ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: "14px",
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 20px rgba(99,102,241,0.35)",
        }}>
          <ReceiptLongIcon sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
            Create Bill
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>Generate customer invoice</Typography>
        </Box>
      </Box>

      {/* ── STEP 1 · CUSTOMER ──────────────────────────────────────────────── */}
      <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", mb: 2.5 }}>
        <SectionHeader icon={<PersonIcon sx={{ color: "#fff", fontSize: 18 }} />} title="Customer" subtitle="Search and select a customer" />

        <Autocomplete
          options={customers}
          value={selectedCustomer}
          onChange={(_, val) => setSelectedCustomer(val)}
          isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
          getOptionLabel={(opt) => opt?.name || ""}
          sx={{ maxWidth: 320 }}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ py: 1.2, px: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{option.name}</Typography>
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                  {option.phone || "—"} {option.address ? `· ${option.address}` : ""}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Select Customer *" placeholder="Search name or phone" sx={inputSx} />
          )}
        />

        {/* Customer detail card */}
        {selectedCustomer?.name && (
          <Box sx={{
            mt: 2.5, p: 2.5, borderRadius: "14px",
            background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)",
            border: "1px solid #c7d2fe",
          }}>
            {/* Basic info row */}
            <Box sx={{ ...infoGridSx, mb: 2 }}>
              <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2", lg: "span 2" } }}>
                <InfoCell label="Name" value={selectedCustomer.name} large />
              </Box>
              <Box>
                <InfoCell label="Phone" value={selectedCustomer.phone} />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2", lg: "span 3" } }}>
                <InfoCell label="Address" value={selectedCustomer.address} />
              </Box>
            </Box>

            {/* Bank details */}
            {(selectedCustomer.bankName || selectedCustomer.accountNo || selectedCustomer.ifscCode || selectedCustomer.upiId) && (
              <>
                <Divider sx={{ borderColor: "#c7d2fe", mb: 2 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <AccountBalanceIcon sx={{ fontSize: 15, color: "#6366f1" }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Bank Details
                  </Typography>
                </Box>
                <Box sx={bankGridSx}>
                  {[
                    ["Bank", selectedCustomer.bankName],
                    ["Branch", selectedCustomer.branch],
                    ["Account Holder", selectedCustomer.accountHolder],
                    ["Account No", selectedCustomer.accountNo],
                    ["IFSC", selectedCustomer.ifscCode],
                    ["UPI ID", selectedCustomer.upiId],
                  ].map(([label, value]) => value ? (
                    <Box key={label}>
                      <InfoCell label={label} value={value} />
                    </Box>
                  ) : null)}
                </Box>
              </>
            )}
          </Box>
        )}
      </Card>

      {/* ── STEP 2 · ITEMS ─────────────────────────────────────────────────── */}
      <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", mb: 2.5, overflow: "visible" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <SectionHeader
            icon={<ReceiptLongIcon sx={{ color: "#fff", fontSize: 18 }} />}
            title="Items"
            subtitle={`${items.length} row${items.length !== 1 ? "s" : ""} · ${confirmedItems.length} confirmed`}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addItem}
            sx={{
              borderRadius: "10px", textTransform: "none", fontWeight: 700, fontSize: 14,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
              px: 2.5, py: 1,
              "&:hover": { background: "linear-gradient(135deg, #2563eb, #4f46e5)" },
            }}
          >
            Add Item
          </Button>
        </Box>

        {items.length === 0 ? (
          <Box sx={{
            py: 6, textAlign: "center", border: "2px dashed #e2e8f0",
            borderRadius: "14px", background: "#fafbfc",
          }}>
            <ReceiptLongIcon sx={{ fontSize: 40, color: "#cbd5e1", mb: 1 }} />
            <Typography sx={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
              No items yet — click <strong>Add Item</strong> to get started
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflow: "visible", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <TableContainer component={Paper} variant="outlined" sx={{
            borderRadius: "12px", border: "none",
            overflow: "visible",
            "& .MuiPaper-root": { overflow: "visible" },
            "& .MuiTableCell-root": { borderBottom: "1px solid #f1f5f9", py: 1.2 },
          }}>
            <Table size="small" sx={{ minWidth: 1250 }}>
              <TableHead>
                <TableRow sx={{ background: "#f8fafc" }}>
                  {["Search Product", "Code", "Color/Design", "Qty", "Size", "UOM", "Price", "GST%", "Disc%", "Total", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} sx={{
                    background: item.confirmed ? "#f0fdf4" : "#fff",
                    "&:hover": { background: item.confirmed ? "#dcfce7" : "#fafbfc" },
                    transition: "background 0.15s",
                  }}>
                    {/* Search */}
                    <TableCell sx={{ minWidth: 240, verticalAlign: "top", overflow: "visible" }}>
                      <Box sx={{ position: "relative" }}>
                        <TextField
                          size="small" fullWidth placeholder="Search product..."
                          value={item.search}
                          disabled={item.confirmed}
                          onChange={(e) => { handleItemChange(index, "search", e.target.value); setActiveIndex(index); }}
                          onFocus={() => { if (item.search) setActiveIndex(index); }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              background: "#fff",
                              fontSize: 13,
                              "& fieldset": { borderColor: "#e2e8f0" },
                              "&:hover fieldset": { borderColor: "#94a3b8" },
                              "&.Mui-focused fieldset": { borderColor: "#6366f1", borderWidth: 2 },
                              "&.Mui-disabled": { background: "#f8fafc" },
                            },
                            "& .MuiInputBase-input": { background: "transparent" },
                            "& .MuiInputBase-input.Mui-disabled": { background: "transparent", WebkitTextFillColor: "#64748b" },
                          }}
                        />
                        {activeIndex === index && item.search && (
                          <Box sx={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            minWidth: 280,
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "12px",
                            zIndex: 99999,
                            maxHeight: "none",
                            overflowY: "visible",
                            boxShadow: "0 20px 48px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)",
                          }}>
                            {products
                              .filter((p) => {
                                const q = (item.search || "").toLowerCase().trim();
                                return (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
                              })
                              .slice(0, 8)
                              .map((p) => (
                                <Box key={p._id}
                                  sx={{ px: 1.5, py: 1.2, cursor: "pointer", borderBottom: "1px solid #f1f5f9", "&:hover": { background: "#f0f4ff" }, "&:last-child": { borderBottom: "none" } }}
                                  onMouseDown={(e) => { e.preventDefault(); selectProduct(index, p); }}
                                >
                                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{p.name}</Typography>
                                  <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                                    Code: {p.code || "—"} · Rs.{fmt(p.price)} · Stock: {p.stock ?? 0}
                                  </Typography>
                                </Box>
                              ))}
                            {products.filter((p) => {
                              const q = (item.search || "").toLowerCase().trim();
                              return (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
                            }).length === 0 && (
                              <Typography sx={{ p: 1.5, fontSize: 13, color: "#94a3b8" }}>No products found</Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>

                    {/* Code */}
                    <TableCell sx={{ minWidth: 100, verticalAlign: "top" }}>
                      <TextField size="small" value={item.code} placeholder="Code" disabled={item.confirmed} onChange={(e) => handleItemChange(index, "code", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Color */}
                    <TableCell sx={{ minWidth: 140, verticalAlign: "top" }}>
                      <TextField size="small" value={item.colorDesign} placeholder="Color/Design" disabled={item.confirmed} onChange={(e) => handleItemChange(index, "colorDesign", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Qty */}
                    <TableCell sx={{ minWidth: 100, verticalAlign: "top" }}>
                      <TextField size="small" type="number" fullWidth value={item.quantity} placeholder="Qty"
                        inputProps={{ min: 1, max: item.availableStock ?? undefined }}
                        helperText={item.availableStock ? `Max: ${item.availableStock}` : ""}
                        FormHelperTextProps={{ sx: { fontSize: 10, mt: 0.3, color: "#94a3b8" } }}
                        disabled={item.confirmed}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Size */}
                    <TableCell sx={{ minWidth: 90, verticalAlign: "top" }}>
                      <TextField size="small" value={item.size} placeholder="Size" disabled={item.confirmed} onChange={(e) => handleItemChange(index, "size", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* UOM */}
                    <TableCell sx={{ minWidth: 90, verticalAlign: "top" }}>
                      <TextField size="small" value={item.uom} placeholder="UOM" disabled={item.confirmed} onChange={(e) => handleItemChange(index, "uom", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Price */}
                    <TableCell sx={{ minWidth: 100, verticalAlign: "top" }}>
                      <TextField size="small" type="number" value={item.price} disabled={item.confirmed} onChange={(e) => handleItemChange(index, "price", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* GST */}
                    <TableCell sx={{ minWidth: 80, verticalAlign: "top" }}>
                      <TextField size="small" type="number" value={item.gst} disabled={item.confirmed} onChange={(e) => handleItemChange(index, "gst", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Disc */}
                    <TableCell sx={{ minWidth: 80, verticalAlign: "top" }}>
                      <TextField size="small" type="number" value={item.discount} disabled={item.confirmed} onChange={(e) => handleItemChange(index, "discount", e.target.value)} sx={inputSx} />
                    </TableCell>
                    {/* Total */}
                    <TableCell sx={{ minWidth: 120, verticalAlign: "top" }}>
                      <Box sx={{
                        px: 1.5, py: 0.8, borderRadius: "8px",
                        background: item.confirmed ? "linear-gradient(135deg, #dcfce7, #d1fae5)" : "#f8fafc",
                        border: `1px solid ${item.confirmed ? "#86efac" : "#e2e8f0"}`,
                        textAlign: "right",
                      }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: item.confirmed ? "#16a34a" : "#0f172a" }}>
                          Rs.{fmt(item.total)}
                        </Typography>
                      </Box>
                    </TableCell>
                    {/* Actions */}
                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton size="small"
                          onClick={() => toggleConfirm(index)}
                          sx={{
                            width: 32, height: 32, borderRadius: "8px",
                            background: item.confirmed ? "#eff6ff" : "#f0fdf4",
                            "&:hover": { background: item.confirmed ? "#dbeafe" : "#dcfce7" },
                          }}
                          title={item.confirmed ? "Edit" : "Confirm"}
                        >
                          {item.confirmed
                            ? <EditIcon sx={{ fontSize: 16, color: "#3b82f6" }} />
                            : <CheckCircleIcon sx={{ fontSize: 16, color: "#16a34a" }} />}
                        </IconButton>
                        <IconButton size="small" onClick={() => removeItem(index)}
                          sx={{
                            width: 32, height: 32, borderRadius: "8px",
                            background: "#fef2f2", "&:hover": { background: "#fee2e2" },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
        )}
      </Card>

      {/* ── STEP 3 · AMOUNT SUMMARY ────────────────────────────────────────── */}
      <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", mb: 2.5 }}>
        <SectionHeader
          icon={<ReceiptLongIcon sx={{ color: "#fff", fontSize: 18 }} />}
          title="Amount Summary"
          subtitle="Set GST, discount and payment details"
        />

        {/* Controls row */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <TextField size="small" type="number" label="Overall GST %" value={extraGst}
            onChange={(e) => setExtraGst(e.target.value)} sx={{ ...inputSx, width: 160 }} />
          <TextField size="small" type="number" label="Overall Discount %" value={extraDiscount}
            onChange={(e) => setExtraDiscount(e.target.value)} sx={{ ...inputSx, width: 180 }} />
          <TextField select size="small" label="Payment Type" value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)} sx={{ ...inputSx, width: 180 }}>
            <MenuItem value="Full Payment">Full Payment</MenuItem>
            <MenuItem value="Partial">Partial</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </TextField>
          <TextField select size="small" label="Payment Mode" value={paymentMethod}
            disabled={paymentType === "Pending"}
            onChange={(e) => setPaymentMethod(e.target.value)} sx={{ ...inputSx, width: 160 }}>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="CARD">Card</MenuItem>
          </TextField>
          {paymentType === "Partial" && (
            <TextField size="small" type="number" label="Paying Amount" value={partialAmount}
              error={!!payingAmountError}
              helperText={payingAmountError || " "}
              inputProps={{ min: 0, max: totals.finalAmount }}
              onChange={(e) => setPartialAmount(e.target.value)}
              sx={{ ...inputSx, width: 200 }} />
          )}
        </Box>

        {/* Two-column layout: summary + button */}
        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Summary table */}
          <Box sx={{
            flex: "1 1 340px", maxWidth: 480,
            border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden",
          }}>
            {[
              ["Total Items", totalItemsCount],
              ["Total Initial Amount", `Rs.${fmt(totals.base)}`],
              [`Overall GST (${Number(extraGst) || 0}%)`, `Rs.${fmt(totals.extraGstAmount)}`],
              [`Overall Discount (${Number(extraDiscount) || 0}%)`, `Rs.${fmt(totals.extraDiscountAmount)}`],
              ["Final Amount", `Rs.${fmt(totals.finalAmount)}`, true],
              ["Paid Amount", `Rs.${fmt(paymentSummary.paidAmount)}`],
              ["Pending Amount", `Rs.${fmt(paymentSummary.dueAmount)}`],
            ].map(([label, value, highlight]) => (
              <SummaryRow key={label} label={label} value={value} highlight={!!highlight} />
            ))}
            <Box sx={{ px: 1.5, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Status</Typography>
              <Chip
                label={paymentSummary.status}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: 12, height: 24,
                  background: `${statusColor[paymentSummary.status]}18`,
                  color: statusColor[paymentSummary.status],
                  border: `1px solid ${statusColor[paymentSummary.status]}40`,
                }}
              />
            </Box>
          </Box>

          {/* Generate button */}
          <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.5 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading || confirmedItems.length === 0 || !!missingPaymentDetails || (paymentType === "Partial" && !!payingAmountError)}
              sx={{
                borderRadius: "12px", textTransform: "none", fontWeight: 800, fontSize: 15,
                px: 4, py: 1.5, minWidth: 200,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                boxShadow: "0 6px 20px rgba(99,102,241,0.35)",
                "&:hover": { background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 8px 24px rgba(99,102,241,0.45)" },
                "&:disabled": { background: "#e2e8f0", color: "#94a3b8", boxShadow: "none" },
              }}
            >
              {loading ? "Saving…" : "⚡ Generate Bill"}
            </Button>
          </Box>
        </Box>
      </Card>

      {/* ── INVOICE PREVIEW ────────────────────────────────────────────────── */}
      {invoiceData && (
        <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Invoice Preview</Typography>
          </Box>
          <Box id="customer-invoice-preview">
            <InvoicePrint data={invoiceData} />
          </Box>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" size="small" onClick={() => window.print()}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, borderColor: "#e2e8f0", color: "#64748b", "&:hover": { borderColor: "#94a3b8" } }}>
              Print
            </Button>
            <Button variant="outlined" size="small" onClick={handleDownload}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, borderColor: "#e2e8f0", color: "#64748b", "&:hover": { borderColor: "#94a3b8" } }}>
              Download PDF
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={handleCancel}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" color="success" onClick={handleDone}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, background: "linear-gradient(135deg, #16a34a, #059669)", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}>
              Done
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};

export default CustomerBill;

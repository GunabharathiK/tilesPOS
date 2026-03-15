import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PrintIcon from "@mui/icons-material/Print";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import API from "../services/api";
import { getProducts } from "../services/productService";
import InvoicePrint from "../components/billing/InvoicePrint";

/* ─── Constants ──────────────────────────────────────── */
const emptyCustomer = { name: "", phone: "", address: "" };
const CUSTOMER_TYPE_OPTIONS = ["Retail Customer", "Dealer", "Contractor", "Builder / Project"];

const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const getRateByCustomerType = (product, customerType) => {
  const retail = Number(product?.price || 0);
  const dealer = Number(product?.dealerPrice || 0);
  const contractor = Number(product?.contractorPrice || 0);
  const minimum = Number(product?.minimumSellPrice || 0);
  if (customerType === "Dealer") return dealer > 0 ? dealer : retail;
  if (customerType === "Contractor") return contractor > 0 ? contractor : (dealer > 0 ? dealer : retail);
  if (customerType === "Builder / Project") {
    if (minimum > 0) return minimum;
    if (contractor > 0) return contractor;
    if (dealer > 0) return dealer;
    return retail;
  }
  return retail;
};

const isTransientNumberInput = (value) =>
  value === "" || value === "-" || value === "." || value === "-." || String(value).endsWith(".");

const emptyItem = {
  productId: "", code: "", name: "", category: "", brand: "", finish: "",
  colorDesign: "", quantity: "", boxes: "", size: "", uom: "", discount: "",
  price: 0, total: 0, availableStock: null, coverageArea: 0,
};

const fmt = (value = 0) => Number(value || 0).toFixed(2);

const getCoveragePerBox = (product) => {
  const directCoverage = Number(product?.coverageArea || 0);
  if (directCoverage > 0) return directCoverage;
  const stock = Number(product?.stock || 0);
  const stockBoxes = Number(product?.stockBoxes || 0);
  if (stock > 0 && stockBoxes > 0) return stock / stockBoxes;
  return 0;
};

const getRoundedBoxes = (quantity, coverageArea) => {
  const qty = Number(quantity) || 0;
  const coverage = Number(coverageArea) || 0;
  return qty > 0 && coverage > 0 ? Math.ceil(qty / coverage) : "";
};

const getSavedShopSettings = () => {
  try {
    return JSON.parse(localStorage.getItem("shopSettings")) || {};
  } catch {
    return {};
  }
};

/* ─── WhatsApp helper ─────────────────────────────────── */
const toWhatsAppPhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10) return digits;
  return null;
};

const openWhatsAppChat = (phone, message) => {
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const url = isMobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

/* ─── Design tokens ───────────────────────────────────── */
const pageBg = "#f0f4f8";
const primary = "#1a56a0";
const primaryDark = "#0f3d7a";
const border = "#dbe5f0";
const muted = "#64748b";

const sectionCardSx = {
  borderRadius: "16px",
  border: "1px solid #dbe5f0",
  boxShadow: "0 8px 24px rgba(15,35,60,0.06)",
  overflow: "hidden",
};
const cardHeaderSx = {
  px: 2.2, py: 1.6,
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.2,
  background: "#fafcfe", borderBottom: "1px solid #e2e8f0",
};
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "9px", background: "#fff", fontSize: 13,
    "& fieldset": { borderColor: "#d8e1eb" },
    "&:hover fieldset": { borderColor: primary },
    "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 2 },
  },
};
const panelTitleSx = {
  fontSize: 12, fontWeight: 800, color: "#0f172a",
  display: "flex", alignItems: "center", gap: 0.8,
  letterSpacing: ".04em", textTransform: "uppercase",
};
const fieldLabelSx = {
  mb: 0.6, fontSize: 10, fontWeight: 800, color: muted,
  textTransform: "uppercase", letterSpacing: ".08em",
};

/* ─── Quotation table columns ─────────────────────────── */
const QTN_COLS = [
  { key: "product",     label: "Tile / Product", w: "18%", align: "left" },
  { key: "category",    label: "Category",       w: "10%", align: "left" },
  { key: "brand",       label: "Brand",          w:  "9%", align: "left" },
  { key: "finish",      label: "Finish",         w:  "9%", align: "left" },
  { key: "colorDesign", label: "Color/Design",   w: "10%", align: "left" },
  { key: "qty",         label: "Qty (sqft)",     w:  "8%", align: "left" },
  { key: "boxes",       label: "Boxes",          w:  "8%", align: "left" },
  { key: "rate",        label: "Rate/sqft",      w:  "9%", align: "left" },
  { key: "disc",        label: "Disc %",         w:  "6%", align: "left" },
  { key: "amount",      label: "Amount (Rs)",    w:  "9%", align: "left" },
  { key: "action",      label: "",               w:  "4%", align: "center" },
];

const qtnHeaderCellSx = (col) => ({
  fontWeight: 700, color: "#fff", fontSize: 11,
  letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap",
  py: 1.4, px: 0.9, textAlign: col.align, width: col.w,
  background: "transparent", borderBottom: "none",
});

const qtnBodyCellSx = (col, isLocked) => ({
  py: 0.8, px: 0.9, verticalAlign: "middle",
  width: col.w, textAlign: col.align,
  background: isLocked ? "#f8fafc" : "transparent",
});

const qtnInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0, background: "#f8fafc", fontSize: 12, minHeight: 36,
    "& fieldset": { borderColor: "#c7d2e3" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 1.5 },
  },
  "& .MuiInputBase-input": {
    py: "8px", px: "10px", lineHeight: 1.2, color: "#0f172a",
    overflow: "visible", textOverflow: "clip",
  },
  "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#6b7280", opacity: 1 },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { margin: 0 },
};

/* ═══════════════════════════════════════════════════════ */
const Invoice = ({ mode = "invoice" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const isQuotation = mode === "quotation";
  const editInvoice = state?.editInvoice || null;
  const isEditMode = Boolean(editInvoice?._id);

  const inputSxEffective = isQuotation
    ? { ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], borderRadius: 0 } }
    : inputSx;
  const qtnCardSx = isQuotation ? { ...sectionCardSx, borderRadius: 0 } : sectionCardSx;

  /* ─── State ──────────────────────────────────────────── */
  const [products,          setProducts]          = useState([]);
  const [items,             setItems]             = useState([]);
  const [customer,          setCustomer]          = useState(emptyCustomer);
  const [saleType,          setSaleType]          = useState(CUSTOMER_TYPE_OPTIONS[0]);
  const [tax,               setTax]               = useState("");
  const [activeIndex,       setActiveIndex]       = useState(null);
  const [payment,           setPayment]           = useState({ method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
  const [invoiceData,       setInvoiceData]       = useState(null);
  const [isPaid,            setIsPaid]            = useState(false);
  const [customerLocked,    setCustomerLocked]    = useState(false);
  const [itemLocks,         setItemLocks]         = useState([]);
  const [billDate,          setBillDate]          = useState(new Date().toISOString().slice(0, 10));
  const [loadingCharge,     setLoadingCharge]     = useState("");
  const [transportCharge,   setTransportCharge]   = useState("");
  const [extraDiscount,     setExtraDiscount]     = useState("");
  const [notes,             setNotes]             = useState("");
  const [calculator,        setCalculator]        = useState({ length: "", width: "", wastage: "", coverage: "" });
  const [quotationNo,       setQuotationNo]       = useState("");
  const [quotationSearch,   setQuotationSearch]   = useState("");
  const [quotationList,     setQuotationList]     = useState([]);
  const [quotationLoading,  setQuotationLoading]  = useState(false);
  const [quotationApplied,  setQuotationApplied]  = useState(null);
  const [draftQuotationNo,  setDraftQuotationNo]  = useState("");
  const [shopSettings,      setShopSettings]      = useState(() => getSavedShopSettings());

  /* ── FIX: separate state for product search per row ── */
  const [rowSearchText, setRowSearchText] = useState({}); // { [index]: string }

  /* ── Quotation preview popup ── */
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const previewRef = useRef(null);
  const invoicePreviewRef = useRef(null); // ref for the hidden/visible invoice-preview element

  /* ─── Derived date label ─────────────────────────────── */
  const topDateLabel = useMemo(() => {
    const parsed = new Date(`${billDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? billDate
      : parsed.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [billDate]);

  /* ─── Load products ──────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await getProducts();
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch { toast.error("Failed to load products"); }
    })();
  }, []);

  useEffect(() => {
    setShopSettings(getSavedShopSettings());
  }, []);

  /* ─── Helpers ────────────────────────────────────────── */
  const mapInvoiceItemsToRows = useCallback((invoiceItems = []) =>
    invoiceItems.map((item) => {
      const product = products.find((p) => String(p._id) === String(item.productId || item.productId?._id || "")) || null;
      const coverageArea = item.coverageArea ?? (product ? getCoveragePerBox(product) : 0);
      const boxes = item.boxes !== undefined && item.boxes !== ""
        ? item.boxes
        : getRoundedBoxes(item.quantity, coverageArea);
      return {
        ...emptyItem, ...item,
        productId: item.productId || item.productId?._id || product?._id || "",
        code: item.code || product?.code || "",
        name: item.name || product?.name || "",
        category: item.category || product?.category || "",
        brand: item.brand || product?.brand || "",
        finish: item.finish || product?.finish || "",
        colorDesign: item.colorDesign || product?.colorDesign || "",
        size: item.size || product?.size || "",
        uom: item.uom || product?.uom || "",
        price: Number(item.price || 0),
        discount: item.discount ?? "",
        boxes,
        availableStock: product?.stock ?? null,
        coverageArea,
      };
    }),
  [products]);

  /* ─── Populate from editInvoice ──────────────────────── */
  useEffect(() => {
    if (!editInvoice) return;
    const invCustomer = editInvoice.customer || {};
    setCustomer({ ...emptyCustomer, name: invCustomer.name || editInvoice.customerName || "", phone: invCustomer.phone || editInvoice.customerPhone || "", address: invCustomer.address || editInvoice.customerAddress || "" });
    setSaleType(normalizeCustomerType(editInvoice.customerType || editInvoice.saleType || invCustomer.customerType || invCustomer.saleType));
    const invItems = Array.isArray(editInvoice.items) ? editInvoice.items : [];
    const rows = mapInvoiceItemsToRows(invItems);
    setItems(rows);
    setRowSearchText(Object.fromEntries(rows.map((r, i) => [i, r.name || ""])));
    setItemLocks(invItems.map(() => false));
    setTax(String(editInvoice.tax ?? editInvoice.taxPct ?? ""));
    setLoadingCharge(String(editInvoice?.charges?.loading ?? ""));
    setTransportCharge(String(editInvoice?.charges?.transport ?? ""));
    setExtraDiscount(String(editInvoice?.charges?.extraDiscount ?? editInvoice?.discountAmount ?? ""));
    setNotes(String(editInvoice.notes || ""));
    const d = new Date(editInvoice.date || editInvoice.createdAt || "");
    if (!Number.isNaN(d.getTime())) setBillDate(d.toISOString().slice(0, 10));
    setPayment(editInvoice.payment || { method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
    setInvoiceData(editInvoice);
    setIsPaid(editInvoice.status === "Paid");
    setCustomerLocked(false);
    if (isQuotation) setDraftQuotationNo(editInvoice.invoiceNo || "");
  }, [editInvoice, mapInvoiceItemsToRows, isQuotation]);

  /* ─── Apply quotation ────────────────────────────────── */
  const applyQuotation = (quotation) => {
    if (!quotation) return;
    const qCustomer = quotation.customer || {};
    setCustomer({ ...emptyCustomer, name: qCustomer.name || quotation.customerName || "", phone: qCustomer.phone || quotation.customerPhone || "", address: qCustomer.address || quotation.customerAddress || "" });
    setSaleType(normalizeCustomerType(quotation.customerType || quotation.saleType || qCustomer.customerType || qCustomer.saleType));
    const qItems = Array.isArray(quotation.items) ? quotation.items : [];
    const rows = mapInvoiceItemsToRows(qItems);
    setItems(rows);
    setRowSearchText(Object.fromEntries(rows.map((r, i) => [i, r.name || ""])));
    setItemLocks(qItems.map(() => false));
    setTax(String(quotation.tax ?? quotation.taxPct ?? ""));
    setLoadingCharge(String(quotation?.charges?.loading ?? ""));
    setTransportCharge(String(quotation?.charges?.transport ?? ""));
    setExtraDiscount(String(quotation?.charges?.extraDiscount ?? quotation?.discountAmount ?? ""));
    setNotes(String(quotation.notes || ""));
    const qDate = new Date(quotation.date || quotation.createdAt || "");
    if (!Number.isNaN(qDate.getTime())) setBillDate(qDate.toISOString().slice(0, 10));
    setPayment({ method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
    setInvoiceData(null);
    setIsPaid(false);
    setCustomerLocked(false);
    setQuotationApplied(quotation);
  };

  /* ─── Quotation lookup ───────────────────────────────── */
  const fetchQuotations = async () => {
    if (quotationList.length) return quotationList;
    const res = await API.get("/invoices");
    const all = Array.isArray(res.data) ? res.data : [];
    const quotes = all.filter((inv) => {
      const doc = String(inv?.documentType || "").toLowerCase();
      const no = String(inv?.invoiceNo || "").toUpperCase();
      return doc === "quotation" || no.startsWith("QTN");
    });
    setQuotationList(quotes);
    return quotes;
  };

  const lookupQuotation = async (value) => {
    const raw = String(value ?? quotationNo ?? "").trim();
    if (!raw) return;
    try {
      setQuotationLoading(true);
      const quotes = await fetchQuotations();
      const needle = raw.toLowerCase();
      const match = quotes.find((q) => String(q.invoiceNo || "").toLowerCase() === needle);
      if (!match) { toast.error("Quotation not found"); return; }
      setQuotationNo(match.invoiceNo || raw);
      applyQuotation(match);
      toast.success("Quotation loaded");
    } catch { toast.error("Failed to load quotation"); }
    finally { setQuotationLoading(false); }
  };

  /* ─── Populate from navigation state ────────────────── */
  useEffect(() => {
    if (!state || state?.editInvoice) return;
    if (typeof state.customer === "object") setCustomer({ ...emptyCustomer, ...state.customer });
    else setCustomer((prev) => ({ ...prev, name: state.customer || "" }));
    setSaleType(normalizeCustomerType(state.customerType || state.saleType || state.customer?.customerType || state.customer?.saleType));
    const incomingItems = Array.isArray(state.items) ? state.items : [];
    const rows = incomingItems.map((item) => {
      const coverageArea = item.coverageArea ?? 0;
      const boxes = item.boxes !== undefined && item.boxes !== ""
        ? item.boxes
        : getRoundedBoxes(item.quantity, coverageArea);
      return { ...emptyItem, ...item, boxes, availableStock: item.availableStock ?? null, coverageArea };
    });
    setItems(rows);
    setRowSearchText(Object.fromEntries(rows.map((r, i) => [i, r.name || ""])));
    setItemLocks(incomingItems.map(() => false));
    setTax(state.tax || "");
    setLoadingCharge(state?.charges?.loading ? String(state.charges.loading) : "");
    setTransportCharge(state?.charges?.transport ? String(state.charges.transport) : "");
    setExtraDiscount(state?.charges?.extraDiscount ? String(state.charges.extraDiscount) : "");
    setNotes(state?.notes || "");
    setPayment(state.payment || { method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
    setIsPaid(state.status === "Paid");
    if (state.date) {
      const parsed = new Date(state.date);
      if (!Number.isNaN(parsed.getTime())) setBillDate(parsed.toISOString().slice(0, 10));
    }
  }, [state]);

  /* ─── Item management ────────────────────────────────── */
  const generateInvoiceNo = () => {
    if (isQuotation) {
      const prefix = String(shopSettings.quotationPrefix || "QTN-");
      const nextNumber = Number(shopSettings.nextQuotationNumber) || 1;
      return `${prefix}${nextNumber}`;
    }
    return `INV${Date.now()}`;
  };

  const incrementQuotationCounter = () => {
    try {
      const saved = getSavedShopSettings();
      const nextValue = (Number(saved.nextQuotationNumber) || 1) + 1;
      const updated = { ...saved, nextQuotationNumber: nextValue };
      localStorage.setItem("shopSettings", JSON.stringify(updated));
      setShopSettings(updated);
    } catch {
      toast.error("Quotation counter could not be updated");
    }
  };

  const quotationNumberPreview = useMemo(() => {
    if (!isQuotation) return "";
    return invoiceData?.invoiceNo || draftQuotationNo || generateInvoiceNo();
  }, [draftQuotationNo, invoiceData?.invoiceNo, isQuotation, shopSettings.nextQuotationNumber, shopSettings.quotationPrefix]);

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
    setItemLocks((prev) => [...prev, false]);
    setRowSearchText((prev) => ({ ...prev, [items.length]: "" }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "productId") {
      const selected = products.find((p) => p._id === value);
      const coverageArea = Number(selected?.coverageArea ?? getCoveragePerBox(selected) ?? 0);
      const qty = Number(updated[index].quantity) || 0;
      const boxes = getRoundedBoxes(qty, coverageArea);
      updated[index] = {
        ...updated[index],
        productId: value,
        price: getRateByCustomerType(selected, saleType),
        name: selected?.name || "",
        code: selected?.code || "",
        category: selected?.category || "",
        brand: selected?.brand || "",
        finish: selected?.finish || "",
        colorDesign: selected?.colorDesign || "",
        size: selected?.size || "",
        uom: selected?.uom || "",
        availableStock: selected?.stock ?? null,
        coverageArea, boxes,
      };
      // sync row search text to selected product name
      setRowSearchText((prev) => ({ ...prev, [index]: selected?.name || "" }));
    }

    // Allow manual price edit — recalculate total immediately
    if (field === "price") {
      const price = Number(value) || 0;
      const qty = Number(updated[index].quantity) || 0;
      const itemDiscount = Number(updated[index].discount) || 0;
      updated[index].price = value; // keep raw string while typing
      updated[index].total = price * qty * (1 - itemDiscount / 100);
      setItems(updated);
      return;
    }

    const coveragePerBox = Number(updated[index].coverageArea || 0);

    if (field === "quantity") {
      if (isTransientNumberInput(value)) {
        updated[index].boxes = "";
        const price = Number(updated[index].price) || 0;
        const qty = Number(updated[index].quantity) || 0;
        const itemDiscount = Number(updated[index].discount) || 0;
        updated[index].total = price * qty * (1 - itemDiscount / 100);
        setItems(updated); return;
      }
      const qty = Number(value) || 0;
      updated[index].boxes = getRoundedBoxes(qty, coveragePerBox);
    }

    if (field === "boxes") {
      if (isTransientNumberInput(value)) {
        updated[index].quantity = "";
        const price = Number(updated[index].price) || 0;
        const qty = Number(updated[index].quantity) || 0;
        const itemDiscount = Number(updated[index].discount) || 0;
        updated[index].total = price * qty * (1 - itemDiscount / 100);
        setItems(updated); return;
      }
      const boxes = Math.ceil(Number(value) || 0);
      updated[index].boxes = boxes > 0 ? boxes : "";
      updated[index].quantity = boxes > 0 && coveragePerBox > 0 ? Number((boxes * coveragePerBox).toFixed(2)) : "";
    }

    if ((field === "quantity" || field === "boxes") && !isQuotation) {
      const qty = Number(updated[index].quantity) || 0;
      const availableStock = updated[index].availableStock;
      if (availableStock !== null && availableStock !== undefined) {
        if (availableStock <= 0) {
          toast.error(`"${updated[index].name || "This product"}" is out of stock`);
          updated[index].quantity = 0; updated[index].total = 0;
          setItems(updated); return;
        }
        if (qty > availableStock) {
          toast.error(`Only ${availableStock} ${updated[index].uom || "units"} available for "${updated[index].name}"`, { id: `stock-${index}` });
          updated[index].quantity = availableStock;
          updated[index].boxes = availableStock > 0 && coveragePerBox > 0
            ? getRoundedBoxes(availableStock, coveragePerBox)
            : updated[index].boxes;
        }
      }
    }

    const price = Number(updated[index].price) || 0;
    const qty = Number(updated[index].quantity) || 0;
    const itemDiscount = Number(updated[index].discount) || 0;
    updated[index].total = price * qty * (1 - itemDiscount / 100);
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemLocks((prev) => prev.filter((_, i) => i !== index));
    setRowSearchText((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
    if (activeIndex === index) setActiveIndex(null);
  };

  const toggleItemLock = (index) =>
    setItemLocks((prev) => prev.map((locked, i) => (i === index ? !locked : locked)));

  const confirmItem = (index) => {
    const item = items[index];
    if (!item?.name || Number(item.quantity) <= 0) {
      toast.error("Select a product and enter quantity before confirming"); return;
    }
    setItemLocks((prev) => prev.map((locked, i) => (i === index ? true : locked)));
    if (activeIndex === index) setActiveIndex(null);
  };

  /* ─── Calculations ───────────────────────────────────── */
  const total = useMemo(() => items.reduce((acc, item) => acc + (Number(item.total) || 0), 0), [items]);
  const loadingAmount = Number(loadingCharge) || 0;
  const transportAmount = Number(transportCharge) || 0;
  const extraDiscountAmount = Number(extraDiscount) || 0;
  const customerTypeDiscountPct = 0;
  const customerTypeDiscountAmount = (total * customerTypeDiscountPct) / 100;
  const taxableBase = Math.max(0, total - extraDiscountAmount - customerTypeDiscountAmount + loadingAmount + transportAmount);
  const taxAmount = (taxableBase * (Number(tax) || 0)) / 100;
  const discountAmount = isQuotation ? extraDiscountAmount : 0;
  const finalAmount = taxableBase + taxAmount;
  const rawAdvanceReceived = Number(payment?.paidAmount);
  const advanceReceived = Number.isFinite(rawAdvanceReceived) ? Math.min(Math.max(0, rawAdvanceReceived), finalAmount) : 0;
  const pendingAmount = Math.max(0, finalAmount - advanceReceived);
  const invoiceStatus = isQuotation ? "Pending" : (pendingAmount <= 0 ? "Paid" : advanceReceived > 0 ? "Partial" : "Pending");
  const itemDiscountTotal = useMemo(() => items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const itemDiscount = Number(item.discount) || 0;
    return acc + (qty * price * itemDiscount) / 100;
  }, 0), [items]);
  const totalItemsCount = useMemo(() => items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0), [items]);
  const calculatorResult = useMemo(() => {
    const length = Number(calculator.length) || 0;
    const width = Number(calculator.width) || 0;
    const wastage = Number(calculator.wastage) || 0;
    const coverage = Number(calculator.coverage) || 0;
    const area = length * width;
    const areaWithWastage = area * (1 + wastage / 100);
    const boxesNeeded = coverage > 0 ? Math.ceil(areaWithWastage / coverage) : 0;
    return { area, areaWithWastage, boxesNeeded };
  }, [calculator]);

  useEffect(() => { setPayment((prev) => ({ ...prev, amount: finalAmount })); }, [finalAmount]);
  useEffect(() => { setPayment((prev) => ({ ...prev, dueAmount: pendingAmount })); }, [pendingAmount]);

  useEffect(() => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (!item.productId) return item;
        const product = products.find((p) => p._id === item.productId);
        if (!product) return item;
        const nextPrice = getRateByCustomerType(product, saleType);
        if (Number(item.price || 0) === nextPrice) return item;
        changed = true;
        const qty = Number(item.quantity) || 0;
        const itemDiscount = Number(item.discount) || 0;
        return { ...item, price: nextPrice, total: qty * nextPrice * (1 - itemDiscount / 100) };
      });
      return changed ? next : prev;
    });
  }, [saleType, products]);

  useEffect(() => {
    if (!invoiceData || !isQuotation) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [invoiceData, isQuotation]);

  /* ─── Customer ───────────────────────────────────────── */
  const handleCustomerChange = (e) => setCustomer((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const canConfirmCustomer = customer.name.trim() && customer.phone.trim() && customer.address.trim();
  const handleConfirmCustomer = () => {
    if (!canConfirmCustomer) { toast.error("Fill customer name, phone number, and address before confirming"); return; }
    if (isQuotation && !draftQuotationNo && !invoiceData?.invoiceNo) setDraftQuotationNo(generateInvoiceNo());
    setCustomerLocked(true);
  };

  /* ─── Submit ─────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!customer.name.trim())    { toast.error("Customer name is required"); return; }
    if (!customer.phone.trim())   { toast.error("Customer phone number is required"); return; }
    if (!customer.address.trim()) { toast.error("Customer address is required"); return; }
    if (items.length === 0)       { toast.error(`Add at least one item to generate ${isQuotation ? "quotation" : "invoice"}`); return; }
    const invalidItem = items.find((item) => !item.name || Number(item.quantity) <= 0);
    if (invalidItem) { toast.error("Each item must have a product and valid quantity"); return; }

    const finalInvoiceNo = isEditMode
      ? (editInvoice?.invoiceNo || (isQuotation ? (draftQuotationNo || generateInvoiceNo()) : generateInvoiceNo()))
      : (isQuotation ? (draftQuotationNo || generateInvoiceNo()) : generateInvoiceNo());

    const data = {
      customer: { ...customer, customerType: saleType, saleType },
      customerType: saleType, saleType, items,
      tax: Number(tax) || 0, discount: 0, taxAmount, discountAmount,
      charges: { loading: loadingAmount, transport: transportAmount, extraDiscount: extraDiscountAmount, customerTypeDiscount: customerTypeDiscountAmount, customerTypeDiscountPct },
      notes,
      payment: isQuotation ? {} : { ...payment, paidAmount: advanceReceived, dueAmount: pendingAmount },
      reduceStockNow: isQuotation ? false : undefined,
      status: invoiceStatus,
      invoiceNo: finalInvoiceNo,
      date: new Date(`${billDate}T${new Date().toTimeString().slice(0, 8)}`).toLocaleString(),
      documentType: isQuotation ? "quotation" : "invoice",
    };

    try {
      const res = isEditMode && editInvoice?._id
        ? await API.put(`/invoices/${editInvoice._id}`, data)
        : await API.post("/invoices", data);
      setInvoiceData({ ...res.data, documentType: isQuotation ? "quotation" : "invoice" });
      if (isQuotation) {
        setDraftQuotationNo(finalInvoiceNo);
        if (!isEditMode) incrementQuotationCounter();
        setPreviewDialogOpen(true); // auto-open preview popup
      }
      toast.success(isQuotation ? (isEditMode ? "Quotation updated" : "Quotation created") : (isEditMode ? "Invoice updated" : "Invoice created"));
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error");
    }
  };

  const updateStatus = async (paid) => {
    try {
      const nextPayment = {
        ...(invoiceData?.payment || {}),
        amount: finalAmount,
        paidAmount: paid ? finalAmount : 0,
        dueAmount: paid ? 0 : finalAmount,
      };
      await API.put(`/invoices/${invoiceData._id}`, { status: paid ? "Paid" : "Pending", payment: nextPayment });
      setInvoiceData((prev) => prev ? ({ ...prev, status: paid ? "Paid" : "Pending", payment: nextPayment }) : prev);
      setIsPaid(paid);
      toast.success("Status updated");
    } catch { toast.error("Update failed"); }
  };

  /* ─── PDF ─────────────────────────────────────────────── */
  const buildInvoicePdf = async () => {
    // FIX: use the ref directly instead of getElementById to handle both
    // inline (quotation preview) and hidden (invoice) rendering
    const element = invoicePreviewRef.current;
    if (!element || !invoiceData) return null;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    const fileName = `${isQuotation ? "Quotation" : "Invoice"}-${invoiceData.invoiceNo}.pdf`;
    return { pdf, fileName };
  };

  const handleDownload = async () => {
    if (!invoiceData) { toast.error("Generate invoice first"); return; }
    const pdfDoc = await buildInvoicePdf();
    if (!pdfDoc) return;
    pdfDoc.pdf.save(pdfDoc.fileName);
  };

  const handlePrint = () => {
    if (!invoiceData) { toast.error("Generate invoice first"); return; }
    const element = invoicePreviewRef.current;
    if (!element) { window.print(); return; }
    const printContent = element.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${isQuotation ? "Quotation" : "Invoice"}-${invoiceData.invoiceNo}</title></head><body>${printContent}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ─── WhatsApp — FIX ─────────────────────────────────── */
  const handleWhatsapp = async () => {
    if (!invoiceData) { toast.error(isQuotation ? "Generate quotation first" : "Generate invoice first"); return; }

    const phone = toWhatsAppPhone(customer.phone || "");
    if (!phone) { toast.error("Customer phone number is required for WhatsApp"); return; }

    const messageRows = isQuotation
      ? [
          `Sub Total: Rs.${fmt(total)}`,
          `Special Discount: Rs.${fmt(extraDiscountAmount)}`,
          `Transport: Rs.${fmt(transportAmount)}`,
          `GST (${Number(tax) || 0}%): Rs.${fmt(taxAmount)}`,
          `Total: Rs.${fmt(finalAmount)}`,
        ]
      : [
          `Subtotal: Rs.${fmt(total)}`,
          `Item Discounts: Rs.${fmt(itemDiscountTotal)}`,
          `Loading Charges: Rs.${fmt(loadingAmount)}`,
          `Special Discount: Rs.${fmt(extraDiscountAmount)}`,
          `Transport: Rs.${fmt(transportAmount)}`,
          `GST (${Number(tax) || 0}%): Rs.${fmt(taxAmount)}`,
          `Total: Rs.${fmt(finalAmount)}`,
          `Advance Received: Rs.${fmt(advanceReceived)}`,
          `Pending Amount: Rs.${fmt(pendingAmount)}`,
        ];

    const message = [
      `Hello ${customer.name || "Customer"},`,
      `Your ${isQuotation ? "quotation" : "invoice"} is ready.`,
      `${isQuotation ? "Quotation" : "Invoice"} No: ${invoiceData.invoiceNo}`,
      ...messageRows,
      `Date: ${billDate}`,
    ].join("\n");

    // Try PDF share — always fall through to WA chat regardless
    try {
      const pdfDoc = await buildInvoicePdf();
      if (pdfDoc) {
        const pdfBlob = pdfDoc.pdf.output("blob");
        const pdfFile = new File([pdfBlob], pdfDoc.fileName, { type: "application/pdf" });
        if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({ title: pdfDoc.fileName, text: message, files: [pdfFile] });
          return; // native share succeeded
        }
        // Desktop: download PDF then open WA
        pdfDoc.pdf.save(pdfDoc.fileName);
        toast.success("PDF downloaded. Attach it in WhatsApp.");
      }
    } catch {
      // PDF generation or share failed — still open WA below
    }

    openWhatsAppChat(phone, message);
  };

  /* ─── Done ───────────────────────────────────────────── */
  const handleDone = () => {
    setPreviewDialogOpen(false);
    setCustomer(emptyCustomer);
    setSaleType("Retail Customer");
    setItems([]); setItemLocks([]); setRowSearchText({});
    setTax(""); setLoadingCharge(""); setTransportCharge(""); setExtraDiscount(""); setNotes("");
    setPayment({ method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
    setInvoiceData(null); setIsPaid(false); setCustomerLocked(false);
    setDraftQuotationNo("");
    setBillDate(new Date().toISOString().slice(0, 10));
    toast.success("Done");
    navigate(isQuotation ? "/quotation" : "/CustomerList");
  };

  /* ─── Summary rows ───────────────────────────────────── */
  const summaryRows = isQuotation
    ? [
        ["Total Qty",        fmt(totalItemsCount)],
        ["Sub Total",        `Rs.${fmt(total)}`],
        ["Loading Charges",  `Rs.${fmt(loadingAmount)}`],
        ["Extra Discount",   `Rs.${fmt(extraDiscountAmount)}`],
        ["Transport",        `Rs.${fmt(transportAmount)}`],
        [`GST (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
        ["Final Amount",     `Rs.${fmt(finalAmount)}`],
      ]
    : [
        ["Subtotal",         `Rs.${fmt(total)}`],
        ["Item Discounts",   `Rs.${fmt(itemDiscountTotal)}`],
        ["Loading Charges",  `Rs.${fmt(loadingAmount)}`],
        ["Special Discount", `Rs.${fmt(extraDiscountAmount)}`],
        [`Customer Type Discount (${fmt(customerTypeDiscountPct)}%)`, `Rs.${fmt(customerTypeDiscountAmount)}`],
        ["Transport",        `Rs.${fmt(transportAmount)}`],
        [`GST (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
        ["Total",            `Rs.${fmt(finalAmount)}`],
        ["Advance Received", `Rs.${fmt(advanceReceived)}`],
        ["Pending Amount",   `Rs.${fmt(pendingAmount)}`],
      ];

  /* ── Product picker state (top search bar) ── */
  const [pickerQuery,       setPickerQuery]       = useState("");
  const [pickerOpen,        setPickerOpen]        = useState(false);
  const pickerRef                                 = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Products shown in picker dropdown — search all products
  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter((p) =>
      [p.name, p.code, p.category, p.brand, p.finish, p.colorDesign, p.size]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    ).slice(0, 12);
  }, [pickerQuery, products]);

  // Add product from picker as a new table row
  const handlePickerSelect = (product) => {
    if (!product) return;
    const coverageArea = Number(product.coverageArea ?? getCoveragePerBox(product) ?? 0);
    const newRow = {
      ...emptyItem,
      productId:      product._id,
      name:           product.name        || "",
      code:           product.code        || "",
      category:       product.category    || "",
      brand:          product.brand       || "",
      finish:         product.finish      || "",
      colorDesign:    product.colorDesign || "",
      size:           product.size        || "",
      uom:            product.uom         || "",
      price:          getRateByCustomerType(product, saleType),
      availableStock: product.stock ?? null,
      coverageArea,
      quantity:       "",
      boxes:          "",
      discount:       "",
      total:          0,
    };
    const newIndex = items.length;
    setItems((prev) => [...prev, newRow]);
    setItemLocks((prev) => [...prev, false]);
    setRowSearchText((prev) => ({ ...prev, [newIndex]: product.name || "" }));
    setPickerQuery("");
    setPickerOpen(false);
    toast.success(`"${product.name}" added — enter quantity`);
  };

  /* ── Table-level filter (searches already-added rows) ── */
  const quotationMatches = (item, query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return [item.name, item.category, item.brand, item.finish, item.colorDesign, item.size]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  };

  const quotationVisibleCount = useMemo(
    () => items.filter((item) => quotationMatches(item, quotationSearch)).length,
    [items, quotationSearch]
  );

  /* ─── Quotation table ────────────────────────────────── */
  const renderQuotationTable = () => (
    <>
      {/* ── Top bar: product picker + row filter ── */}
      <Box sx={{ px: 2.2, pt: 2, pb: 1.6, borderBottom: "1px solid #e2e8f0", background: "#fafcfe" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 1.2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".04em" }}>
            Tile Items
          </Typography>
          <Box sx={{ px: 1.2, py: 0.4, borderRadius: 0, background: "#fff4e8", color: "#b45309", fontWeight: 700, fontSize: 12 }}>
            {items.length} added
          </Box>
        </Box>

        {/* ── Product picker — full width, searches ALL products ── */}
        <Box ref={pickerRef} sx={{ position: "relative" }}>
          <TextField
            size="small" fullWidth
            value={pickerQuery}
            onChange={(e) => { setPickerQuery(e.target.value); setPickerOpen(true); }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Search & add product by name, code, brand, category..."
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 0, background: "#fff",
                "& fieldset": { borderColor: primary },
                "&:hover fieldset": { borderColor: primaryDark },
                "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 2 },
              },
              "& .MuiInputBase-input": { fontSize: 13, py: "9px" },
            }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ mr: 1, color: primary, display: "flex", alignItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
                  </svg>
                </Box>
              ),
              endAdornment: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, pr: 0.5 }}>
                  {pickerQuery ? (
                    <Box onClick={() => { setPickerQuery(""); setPickerOpen(false); }}
                      sx={{ cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1, "&:hover": { color: "#ef4444" } }}>✕</Box>
                  ) : (
                    <Box sx={{ fontSize: 11, color: muted, whiteSpace: "nowrap" }}>
                      {products.length} products
                    </Box>
                  )}
                </Box>
              ),
            }}
          />

          {/* Dropdown */}
          {pickerOpen && (
            <Box sx={{
              position: "absolute", top: "calc(100% + 1px)", left: 0, right: 0,
              zIndex: 50, background: "#fff",
              border: `1.5px solid ${primary}`, borderTop: `1px solid #e2e8f0`,
              boxShadow: "0 12px 32px rgba(15,35,60,.14)",
              maxHeight: 340, overflowY: "auto",
            }}>
              {pickerResults.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center", color: muted, fontSize: 13 }}>
                  No products found{pickerQuery ? ` for "${pickerQuery}"` : ""}
                </Box>
              ) : (
                <>
                  {pickerResults.map((product) => {
                    const alreadyAdded = items.some((it) => it.productId === product._id);
                    return (
                      <Box
                        key={product._id}
                        onClick={() => handlePickerSelect(product)}
                        sx={{
                          px: 1.8, py: 1.1,
                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2,
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          background: alreadyAdded ? "#f0fdf4" : "#fff",
                          "&:last-child": { borderBottom: "none" },
                          "&:hover": { background: alreadyAdded ? "#dcfce7" : "#eff6ff" },
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333", lineHeight: 1.3 }}>
                            {product.name}
                            {product.code && (
                              <Box component="span" sx={{ color: "#15803d", ml: 0.8, fontSize: 11, fontWeight: 600 }}>
                                [{product.code.toUpperCase()}]
                              </Box>
                            )}
                            {product.size && (
                              <Box component="span" sx={{ color: muted, ml: 0.6, fontSize: 11 }}>
                                {product.size}
                              </Box>
                            )}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: muted, mt: 0.2 }}>
                            {[product.category, product.brand, product.finish, product.colorDesign].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexShrink: 0 }}>
                          <Box sx={{ fontSize: 12, fontWeight: 700, px: 1, py: 0.3, background: "#e0f2fe", color: "#0369a1", borderRadius: "4px" }}>
                            Rs.{fmt(getRateByCustomerType(product, saleType))}
                          </Box>
                          {alreadyAdded && (
                            <Box sx={{ fontSize: 10, fontWeight: 700, px: 0.8, py: 0.3, background: "#dcfce7", color: "#15803d", borderRadius: "4px" }}>
                              ✓ Added
                            </Box>
                          )}
                          <Box sx={{
                            fontSize: 11, fontWeight: 600, px: 1, py: 0.3, borderRadius: "4px",
                            background: product.stock <= 0 ? "#fee2e2" : product.stock < 10 ? "#fef3c7" : "#dcfce7",
                            color:      product.stock <= 0 ? "#b91c1c" : product.stock < 10 ? "#92400e" : "#166534",
                          }}>
                            {product.stock <= 0 ? "Out of stock" : `Stock: ${product.stock}`}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                  {!pickerQuery && products.length > 12 && (
                    <Box sx={{ px: 1.8, py: 0.9, fontSize: 11, color: muted, textAlign: "center", background: "#fafcfe", borderTop: "1px solid #f1f5f9" }}>
                      Showing 12 of {products.length} products — type to narrow down
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <TableContainer sx={{ borderRadius: 0, border: "1.5px solid #c8d8ec", overflow: "hidden" }}>
        <Table sx={{
          width: "100%", tableLayout: "fixed", borderCollapse: "collapse",
          "& .MuiTableCell-root": { borderRight: "1px solid #e2ecf4", "&:last-child": { borderRight: "none" } },
          "& .MuiTableBody-root .MuiTableRow-root": {
            "&:nth-of-type(even)": { background: "#f0f7ff" },
            "&:nth-of-type(odd)": { background: "#fff" },
            "& td": { borderBottom: "1px solid #e2ecf4" },
          },
          "& .MuiTableBody-root .MuiTableRow-root:hover": { background: "#dbeafe !important" },
          "& .MuiInputBase-input": { fontSize: 12.5, py: "7px" },
          "& .MuiOutlinedInput-root": { borderRadius: 0 },
        }}>
          <colgroup>{QTN_COLS.map((col) => <col key={col.key} style={{ width: col.w }} />)}</colgroup>

          <TableHead>
            <TableRow sx={{ background: primary }}>
              {QTN_COLS.map((col) => (
                <TableCell key={col.key} sx={qtnHeaderCellSx(col)}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, index) => {
              if (!quotationMatches(item, quotationSearch)) return null;
              const locked = isQuotation && !!itemLocks[index];
              const coveragePerBox = getCoveragePerBox(item);
              const boxes = item.boxes !== "" && item.boxes !== undefined
                ? item.boxes
                : getRoundedBoxes(item.quantity, coveragePerBox);

              /* FIX: filter products using per-row rowSearchText,
                 NOT item.name — so typing in the row input doesn't
                 also filter the table-level search */
              const rowQuery = (rowSearchText[index] || "").toLowerCase();
              const filteredProducts = products
                .filter((p) => p.name.toLowerCase().includes(rowQuery))
                .slice(0, 8);

              return (
                <TableRow key={index} sx={{ transition: "background .14s" }}>
                  {/* Col 1: Product search */}
                  <TableCell sx={{ ...qtnBodyCellSx(QTN_COLS[0], locked), position: "relative" }}>
                    <TextField
                      size="small" fullWidth
                      placeholder="Search product..."
                      /* FIX: value is rowSearchText[index], NOT item.name */
                      value={rowSearchText[index] ?? item.name ?? ""}
                      disabled={locked}
                      onFocus={() => setActiveIndex(index)}
                      onChange={(e) => {
                        const val = e.target.value;
                        /* update only the per-row search text */
                        setRowSearchText((prev) => ({ ...prev, [index]: val }));
                        setActiveIndex(index);
                      }}
                      sx={qtnInputSx}
                    />
                    {/* Dropdown */}
                    {activeIndex === index && !locked && (
                      <Box sx={{
                        position: "absolute", top: "calc(100% - 4px)", left: 6, zIndex: 40,
                        background: "#fff", border: "1px solid #cbd5e1", borderRadius: 0,
                        boxShadow: "0 10px 28px rgba(15,35,60,.14)",
                        width: "max-content", minWidth: "100%", maxWidth: "min(68vw, 680px)",
                        overflow: "hidden",
                      }}>
                        {filteredProducts.length === 0 ? (
                          <Box sx={{ py: 4, textAlign: "center", color: muted, fontSize: 13 }}>No products found</Box>
                        ) : filteredProducts.map((product) => {
                          const outOfStock = product.stock <= 0 && !isQuotation;
                          return (
                            <Box
                              key={product._id}
                              onClick={() => {
                                if (outOfStock) { toast.error(`"${product.name}" is out of stock`); return; }
                                handleItemChange(index, "productId", product._id);
                                setActiveIndex(null);
                                // rowSearchText is already synced inside handleItemChange
                              }}
                              sx={{
                                px: 1.4, py: 1, display: "flex", justifyContent: "space-between",
                                alignItems: "center", gap: 2,
                                cursor: outOfStock ? "not-allowed" : "pointer",
                                background: outOfStock ? "#fef2f2" : "#fff",
                                borderBottom: "1px solid #f1f5f9",
                                "&:last-child": { borderBottom: "none" },
                                "&:hover": { background: outOfStock ? "#fef2f2" : "#f0f6ff" },
                              }}
                            >
                              <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1c2333" }}>
                                  {product.name}
                                  {product.code && <Box component="span" sx={{ color: "#15803d", ml: 0.8, fontSize: 11, fontWeight: 600 }}>[{product.code.toUpperCase()}]</Box>}
                                  {product.size && <Box component="span" sx={{ color: muted, ml: 0.8, fontSize: 11 }}>{product.size}</Box>}
                                </Typography>
                              </Box>
                              <Box sx={{ fontSize: 11, fontWeight: 600, px: 1, py: 0.3, borderRadius: "6px", flexShrink: 0, background: product.stock <= 0 ? "#fee2e2" : product.stock < 10 ? "#fef3c7" : "#dcfce7", color: product.stock <= 0 ? "#b91c1c" : product.stock < 10 ? "#92400e" : "#166534" }}>
                                {product.stock <= 0 ? "Out of stock" : `Stock: ${product.stock}`}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </TableCell>

                  <TableCell sx={qtnBodyCellSx(QTN_COLS[1], locked)}>
                    <TextField size="small" fullWidth value={item.category || ""} disabled={locked}
                      onChange={(e) => handleItemChange(index, "category", e.target.value)} sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[2], locked)}>
                    <TextField size="small" fullWidth value={item.brand || ""} disabled sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[3], locked)}>
                    <TextField size="small" fullWidth value={item.finish || ""} disabled={locked}
                      onChange={(e) => handleItemChange(index, "finish", e.target.value)} sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[4], locked)}>
                    <TextField size="small" fullWidth value={item.colorDesign || ""} disabled sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[5], locked)}>
                    <TextField size="small" fullWidth type="number"
                      value={item.quantity} disabled={locked}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      inputProps={{ min: 0, step: "0.01" }} sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[6], locked)}>
                    <TextField size="small" fullWidth type="number"
                      value={boxes} disabled={locked}
                      onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
                      inputProps={{ min: 0, step: "1" }} sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[7], locked)}>
                    <TextField size="small" fullWidth type="number"
                      value={item.productId ? item.price : ""}
                      disabled={locked}
                      onChange={(e) => handleItemChange(index, "price", e.target.value)}
                      inputProps={{ min: 0, step: "0.01" }}
                      sx={{
                        ...qtnInputSx,
                        "& .MuiOutlinedInput-root": {
                          ...qtnInputSx["& .MuiOutlinedInput-root"],
                          background: item.productId && !locked ? "#fffbeb" : "#f8fafc",
                          "& fieldset": { borderColor: item.productId && !locked ? "#fbbf24" : "#c7d2e3" },
                          "&:hover fieldset": { borderColor: item.productId && !locked ? "#f59e0b" : "#94a3b8" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[8], locked)}>
                    <TextField size="small" fullWidth type="number"
                      value={item.discount ?? ""} disabled={locked}
                      onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                      sx={qtnInputSx} inputProps={{ min: 0, max: 100 }} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[9], locked)}>
                    <TextField size="small" fullWidth value={item.productId ? fmt(item.total) : ""} disabled sx={qtnInputSx} />
                  </TableCell>
                  <TableCell sx={qtnBodyCellSx(QTN_COLS[10], locked)}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.2 }}>
                      <IconButton size="small" onClick={() => toggleItemLock(index)} title={locked ? "Unlock" : "Lock"}
                        sx={{ color: locked ? "#ef4444" : "#94a3b8", borderRadius: 0, p: 0.5 }}>
                        {locked ? <LockIcon sx={{ fontSize: 17 }} /> : <LockOpenIcon sx={{ fontSize: 17 }} />}
                      </IconButton>
                      <IconButton size="small" onClick={() => removeItem(index)} title="Remove"
                        sx={{ color: "#94a3b8", borderRadius: 0, p: 0.5, "&:hover": { background: "#fee2e2", color: "#dc2626" } }}>
                        <DeleteIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {(items.length === 0 || quotationVisibleCount === 0) && (
              <TableRow>
                <TableCell colSpan={QTN_COLS.length} sx={{ py: 7, textAlign: "center", color: muted, fontSize: 13, background: "#fafcfe", borderTop: `1px solid ${border}` }}>
                  {items.length === 0 ? `Click "Add Item" to start building the ${isQuotation ? "quotation" : "invoice"}` : "No matching items found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  /* ─── Invoice table ──────────────────────────────────── */
  const renderInvoiceTable = () => (
    <TableContainer sx={{ border: `1px solid ${border}`, borderRadius: "14px", overflow: "auto" }}>
      <Table size="small" sx={{ minWidth: 980 }}>
        <TableHead sx={{ background: "#f8fafc" }}>
          <TableRow>
            {["Product", "Category", "Finish", "Qty", "Size", "UOM", "Price", "Total", "Action"].map((label) => (
              <TableCell key={label} sx={{ fontWeight: 800, color: muted, whiteSpace: "nowrap", fontSize: 14, textAlign: label === "Action" ? "center" : "left" }}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const rowQuery = (rowSearchText[index] || "").toLowerCase();
            const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(rowQuery)).slice(0, 5);
            return (
              <TableRow key={index}>
                <TableCell sx={{ width: "34%", py: 1, position: "relative" }}>
                  <TextField size="small" fullWidth placeholder="Search product…"
                    value={rowSearchText[index] ?? item.name ?? ""}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(e) => {
                      setRowSearchText((prev) => ({ ...prev, [index]: e.target.value }));
                      setActiveIndex(index);
                    }}
                    sx={inputSxEffective} />
                  {activeIndex === index && (
                    <Box sx={{ position: "absolute", top: "calc(100% - 6px)", left: 8, zIndex: 30, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 1.5, width: "max-content", minWidth: "calc(100% - 16px)", maxWidth: "min(72vw, 760px)", boxShadow: 4 }}>
                      {filteredProducts.map((product) => (
                        <Box key={product._id}
                          sx={{ px: 1.2, py: 1, cursor: product.stock <= 0 ? "not-allowed" : "pointer", fontSize: 13, background: product.stock <= 0 ? "#fef2f2" : "#fff", "&:hover": { background: product.stock <= 0 ? "#fef2f2" : "#f1f5f9" } }}
                          onClick={() => { if (product.stock <= 0) { toast.error(`"${product.name}" is out of stock`); return; } handleItemChange(index, "productId", product._id); setActiveIndex(null); }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                            <Box>
                              <strong>{product.name}</strong>
                              {product.code && <span style={{ color: "#15803d", marginLeft: 6, fontSize: 12 }}>[{product.code.toUpperCase()}]</span>}
                              {product.size && <span style={{ color: "#555", marginLeft: 6, fontSize: 12 }}>{product.size}</span>}
                            </Box>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: product.stock <= 0 ? "#fee2e2" : product.stock < 10 ? "#fef3c7" : "#dcfce7", color: product.stock <= 0 ? "#b91c1c" : product.stock < 10 ? "#92400e" : "#166534" }}>
                              {product.stock <= 0 ? "Out of stock" : `Stock: ${product.stock}`}
                            </span>
                          </Box>
                        </Box>
                      ))}
                      {filteredProducts.length === 0 && <Box sx={{ py: 5, textAlign: "center", color: muted, fontSize: 13 }}>No products found</Box>}
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.category || ""} onChange={(e) => handleItemChange(index, "category", e.target.value)} sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.finish || ""} onChange={(e) => handleItemChange(index, "finish", e.target.value)} sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "10%", py: 1 }}><TextField size="small" type="number" fullWidth value={item.quantity} inputProps={{ min: 0, max: item.availableStock ?? undefined }} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.size} onChange={(e) => handleItemChange(index, "size", e.target.value)} sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.uom} onChange={(e) => handleItemChange(index, "uom", e.target.value)} sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.productId ? fmt(item.price) : ""} disabled sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.productId ? fmt(item.total) : ""} disabled sx={inputSxEffective} /></TableCell>
                <TableCell sx={{ width: "10%", py: 1, textAlign: "center" }}>
                  <IconButton size="small" color="error" onClick={() => removeItem(index)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: muted }}>Add an item to start</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );

  /* ─── Charges section (shared) ───────────────────────── */
  const renderCharges = (extraSx = {}) => (
    <Card sx={{ ...qtnCardSx, ...extraSx }}>
      <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>Charges</Typography></Box>
      <Box sx={{ p: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", md: isQuotation ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }, gap: 1.5 }}>
        <Box>
          <Typography sx={fieldLabelSx}>{isQuotation ? "GST Rate" : "Tax %"}</Typography>
          <TextField select size="small" fullWidth value={tax} onChange={(e) => setTax(e.target.value)} sx={inputSxEffective}>
            {[0, 5, 12, 18].map((rate) => <MenuItem key={rate} value={String(rate)}>{rate}% GST</MenuItem>)}
          </TextField>
        </Box>
        <Box>
          <Typography sx={fieldLabelSx}>Loading Charges (Rs)</Typography>
          <TextField size="small" type="number" fullWidth value={loadingCharge} onChange={(e) => setLoadingCharge(e.target.value)} sx={inputSxEffective} />
        </Box>
        <Box>
          <Typography sx={fieldLabelSx}>Transport (Rs)</Typography>
          <TextField size="small" type="number" fullWidth value={transportCharge} onChange={(e) => setTransportCharge(e.target.value)} sx={inputSxEffective} />
        </Box>
        <Box>
          <Typography sx={fieldLabelSx}>Special Discount (Rs)</Typography>
          <TextField size="small" type="number" fullWidth value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} sx={inputSxEffective} />
        </Box>
        {!isQuotation && (
          <Box sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}>
            <Typography sx={fieldLabelSx}>Advance Received (Rs)</Typography>
            <TextField size="small" type="number" fullWidth value={payment?.paidAmount ?? ""} onChange={(e) => setPayment((prev) => ({ ...prev, paidAmount: e.target.value }))} sx={inputSxEffective} />
          </Box>
        )}
        {isQuotation && (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography sx={fieldLabelSx}>Notes</Typography>
            <TextField size="small" fullWidth multiline minRows={2} maxRows={4} value={notes} onChange={(e) => setNotes(e.target.value)} sx={inputSxEffective} placeholder="Scheme / Remarks" />
          </Box>
        )}
      </Box>
    </Card>
  );

  /* ─── Summary card ───────────────────────────────────── */
  const renderSummary = (showActions = false) => (
    <Card sx={{ ...qtnCardSx, flex: 1, display: "flex", flexDirection: "column" }}>
      <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>{isQuotation ? "Quotation Summary" : "Invoice Summary"}</Typography></Box>
      <Box sx={{ p: 2.1 }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="tbody">
            {summaryRows.map(([label, value]) => {
              const isTotalRow = label === "Total" || label === "Final Amount";
              return (
                <Box component="tr" key={label} sx={{ borderTop: isTotalRow ? `1px solid ${border}` : "none" }}>
                  <Box component="td" sx={{ py: 0.9, color: muted, fontWeight: isTotalRow ? 700 : 500 }}>{label}</Box>
                  <Box component="td" sx={{ py: 0.9, textAlign: "right", fontWeight: 800, color: isTotalRow ? primary : "#1c2333", fontSize: isTotalRow ? 15 : 13 }}>{value}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>
        {showActions && (
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}
            disabled={items.length === 0 || (!isEditMode && Boolean(invoiceData))}
            sx={{ mt: 1.5, borderRadius: isQuotation ? 0 : "10px", py: 1.15, textTransform: "none", fontWeight: 700, width: "100%", background: "#1a7a4a", "&:hover": { background: "#146038" } }}>
            {isEditMode ? "Save Quotation" : "Generate Quotation"}
          </Button>
        )}
      </Box>
    </Card>
  );

  /* ─── Actions card ───────────────────────────────────── */
  const renderActionsCard = () => (
    <Card sx={{ ...qtnCardSx, mt: isQuotation ? 0 : 2.2 }}>
      <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>Actions</Typography></Box>
      <Box sx={{ p: 2.1, display: "flex", flexDirection: isQuotation ? "row" : "column", flexWrap: "wrap", gap: 1.1 }}>
        {!isQuotation && (
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={items.length === 0}
            sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: "#1a7a4a", "&:hover": { background: "#146038" } }}>
            {isEditMode ? "Save Invoice" : "Generate Invoice"}
          </Button>
        )}
        {isQuotation && invoiceData && (
          <Button variant="contained" startIcon={<VisibilityIcon />} onClick={() => setPreviewDialogOpen(true)}
            sx={{ borderRadius: 0, py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}>
            View Preview
          </Button>
        )}
        <Button variant="contained" startIcon={<VisibilityIcon />} onClick={handleDownload} disabled={!invoiceData}
          sx={{ borderRadius: isQuotation ? 0 : "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}>
          Download PDF
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} disabled={!invoiceData}
          sx={{ borderRadius: isQuotation ? 0 : "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700 }}>
          Print
        </Button>
        <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={handleWhatsapp} disabled={!invoiceData}
          sx={{ borderRadius: isQuotation ? 0 : "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: "#25D366", "&:hover": { background: "#1ebe59" } }}>
          Send on WhatsApp
        </Button>
        {!isQuotation && (
          <>
            <Divider sx={{ my: 0.3 }} />
            <Button variant={isPaid ? "contained" : "outlined"} color="success" onClick={() => updateStatus(true)} disabled={!invoiceData}
              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>
              Payment Received
            </Button>
            <Button variant={!isPaid ? "contained" : "outlined"} color="warning" onClick={() => updateStatus(false)} disabled={!invoiceData}
              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>
              Pending
            </Button>
          </>
        )}
        <Button variant="contained" color="inherit" onClick={handleDone} disabled={!invoiceData}
          sx={{ borderRadius: isQuotation ? 0 : "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: "#f8fafc", color: "#1c2333", border: `1px solid ${border}`, boxShadow: "none" }}>
          Done
        </Button>
      </Box>
    </Card>
  );

  /* ─── Render ──────────────────────────────────────────── */
  return (
    <Box sx={{ minHeight: "100%", background: pageBg, py: { xs: 1.5, md: 2 } }}>
      <Box sx={{ mb: 2.4, px: { xs: 0.6, md: 0.8 } }}>
        <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
          {isQuotation ? "Create Quotation" : "Create Invoice"}
        </Typography>
        <Typography sx={{ color: muted, mt: 0.55, fontSize: 12.5 }}>{topDateLabel}</Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: isQuotation ? "1fr" : { xs: "1fr", xl: "minmax(0, 1.9fr) minmax(300px, 0.72fr)" }, gap: 2.2, alignItems: "start" }}>

        {/* ── Left column ── */}
        <Box>
          {/* Customer card */}
          <Card sx={qtnCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Customer Details</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isQuotation && (
                  <Box sx={{ fontSize: 11, fontWeight: 700, color: primary, background: "#e7efff", px: 1.1, py: 0.4, borderRadius: 0, border: "1px solid #c7d9ff" }}>
                    Quotation No: {quotationNumberPreview}
                  </Box>
                )}
                {isQuotation && customerLocked && (
                  <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setCustomerLocked(false)}>Edit</Button>
                )}
              </Box>
            </Box>
            <Box sx={{ p: 2.2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: isQuotation ? "repeat(5, 1fr)" : "repeat(6, 1fr)" }, gap: 1.5, alignItems: "end" }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Name</Typography>
                  <TextField size="small" name="name" fullWidth value={customer.name} onChange={handleCustomerChange} disabled={isQuotation && customerLocked} sx={inputSxEffective} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Type</Typography>
                  <TextField select size="small" fullWidth value={saleType} onChange={(e) => setSaleType(e.target.value)} disabled={isQuotation && customerLocked} sx={inputSxEffective}>
                    {CUSTOMER_TYPE_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Phone Number</Typography>
                  <TextField size="small" name="phone" fullWidth value={customer.phone} onChange={handleCustomerChange} inputProps={{ maxLength: 10 }} disabled={isQuotation && customerLocked} sx={inputSxEffective} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Address</Typography>
                  <TextField size="small" name="address" fullWidth value={customer.address} onChange={handleCustomerChange} disabled={isQuotation && customerLocked} sx={inputSxEffective} />
                </Box>
                {!isQuotation && (
                  <Box>
                    <Typography sx={fieldLabelSx}>Quotation No</Typography>
                    <TextField size="small" fullWidth value={quotationNo}
                      onChange={(e) => setQuotationNo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") lookupQuotation(e.currentTarget.value); }}
                      onBlur={(e) => lookupQuotation(e.currentTarget.value)}
                      placeholder="Enter quotation number" sx={inputSxEffective}
                      InputProps={{ endAdornment: (
                        <InputAdornment position="end">
                          <Button size="small" variant="outlined" disabled={quotationLoading} onClick={() => lookupQuotation(quotationNo)} sx={{ textTransform: "none", fontWeight: 700 }}>
                            {quotationLoading ? "Loading..." : "Load"}
                          </Button>
                        </InputAdornment>
                      )}} />
                    {quotationApplied && <Typography sx={{ fontSize: 10, color: "#16a34a", mt: 0.4 }}>Quotation loaded: {quotationApplied.invoiceNo}</Typography>}
                  </Box>
                )}
                <Box>
                  <Typography sx={fieldLabelSx}>Date</Typography>
                  <TextField size="small" type="date" fullWidth value={billDate} onChange={(e) => setBillDate(e.target.value)} sx={inputSxEffective} InputLabelProps={{ shrink: true }} />
                </Box>
              </Box>
              {isQuotation && !customerLocked && (
                <Box sx={{ mt: 1.6, display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={handleConfirmCustomer} disabled={!canConfirmCustomer} sx={{ textTransform: "none", borderRadius: 0 }}>
                    Confirm
                  </Button>
                </Box>
              )}
            </Box>
          </Card>

          {/* Items card */}
          <Card sx={{ ...qtnCardSx, mt: 2.2, overflow: isQuotation ? "visible" : "hidden", borderRadius: isQuotation ? 0 : qtnCardSx.borderRadius }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Items</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem}
                sx={{ textTransform: "none", borderRadius: isQuotation ? 0 : "10px", borderColor: border, color: "#1c2333" }}>
                Add Item
              </Button>
            </Box>
            <Box sx={{ p: isQuotation ? 0 : 2.2 }}>
              {isQuotation ? renderQuotationTable() : renderInvoiceTable()}
            </Box>
          </Card>

          {/* Quotation: [Charges + Calculator] left | [Summary + Actions] right — equal height */}
          {isQuotation && (
            <Box sx={{ mt: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 320px" }, gap: 2.2, alignItems: "stretch" }}>

              {/* Left: Charges + Calculator stacked, stretches to match right column */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
                {renderCharges()}
                {/* Calculator */}
                <Card sx={{ ...qtnCardSx, flex: 1 }}>
                  <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>Quick Tile Calculator</Typography></Box>
                  <Box sx={{ p: 2.1 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                      {[["Room Length (ft)", "length"], ["Room Width (ft)", "width"], ["Wastage %", "wastage"], ["Coverage/Box (sqft)", "coverage"]].map(([label, key]) => (
                        <Box key={key}>
                          <Typography sx={fieldLabelSx}>{label}</Typography>
                          <TextField size="small" fullWidth value={calculator[key]} onChange={(e) => setCalculator((prev) => ({ ...prev, [key]: e.target.value }))} sx={inputSxEffective} placeholder="0" />
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ mt: 1.6, p: 1.2, borderRadius: 0, background: "#e8f5ee", color: "#166534", fontSize: 12 }}>
                      <strong>Room Area:</strong> {fmt(calculatorResult.area)} sqft{"  |  "}
                      <strong>With {calculator.wastage || 0}% wastage:</strong> {fmt(calculatorResult.areaWithWastage)} sqft{"  |  "}
                      <strong>Boxes needed:</strong> {calculatorResult.boxesNeeded} boxes
                    </Box>
                  </Box>
                </Card>
              </Box>

              {/* Right: Summary + Actions — stretches naturally */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
                {renderSummary(true)}
                {invoiceData && renderActionsCard()}
              </Box>
            </Box>
          )}

          {/* Invoice charges */}
          {!isQuotation && renderCharges({ mt: 2.2 })}
        </Box>

        {/* ── Right column (invoice only) ── */}
        {!isQuotation && (
          <Box>
            {renderSummary(false)}
            {renderActionsCard()}
          </Box>
        )}
      </Box>

      {/* ── Quotation Preview Dialog ── */}
      {isQuotation && (
        <Dialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          fullWidth
          maxWidth="lg"
          PaperProps={{
            sx: {
              borderRadius: "12px",
              boxShadow: "0 24px 60px rgba(15,35,60,.18)",
              overflow: "hidden",
            },
          }}
        >
          {/* Dialog header */}
          <Box sx={{
            px: 2.5, py: 1.6,
            borderBottom: `1px solid ${border}`,
            background: `linear-gradient(to right, ${primary}ee, ${primaryDark})`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                Quotation Preview
              </Typography>
              <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,.75)", mt: 0.2 }}>
                {invoiceData?.invoiceNo || draftQuotationNo || ""}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setPreviewDialogOpen(false)}
              sx={{ color: "#fff", "&:hover": { background: "rgba(255,255,255,.15)" } }}
            >
              <Box sx={{ fontSize: 18, lineHeight: 1 }}>✕</Box>
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 0, background: "#f1f5f9" }}>
            {/* Scrollable preview area */}
            <Box sx={{ p: 2, overflowX: "auto" }}>
              <Box
                ref={invoicePreviewRef}
                id="invoice-preview"
                sx={{ minWidth: 820, background: "#fff", boxShadow: "0 2px 12px rgba(15,35,60,.08)" }}
              >
                {invoiceData && <InvoicePrint data={invoiceData} />}
              </Box>
            </Box>

            {/* Action buttons inside dialog */}
            <Box sx={{
              px: 2.5, py: 1.8,
              borderTop: `1px solid ${border}`,
              background: "#fff",
              display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap",
            }}>
              <Button variant="contained" startIcon={<VisibilityIcon />} onClick={handleDownload}
                sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: 700, background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}>
                Download PDF
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}
                sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: 700 }}>
                Print
              </Button>
              <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={handleWhatsapp}
                sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: 700, background: "#25D366", "&:hover": { background: "#1ebe59" } }}>
                Send on WhatsApp
              </Button>
              <Box sx={{ ml: "auto" }}>
                <Button variant="contained" color="inherit" onClick={handleDone}
                  sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: 700, background: "#f1f5f9", color: "#1c2333", border: `1px solid ${border}`, boxShadow: "none" }}>
                  Done
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice hidden preview (for PDF/print) */}
      {invoiceData && !isQuotation && (
        <Box sx={{ position: "fixed", left: "-200vw", top: 0, width: 820, pointerEvents: "none", opacity: 0 }}>
          <Box ref={invoicePreviewRef} id="invoice-preview">
            <InvoicePrint data={invoiceData} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Invoice;

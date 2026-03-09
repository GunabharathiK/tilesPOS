import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
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
import VisibilityIcon from "@mui/icons-material/Visibility";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import API from "../services/api";
import { getProducts } from "../services/productService";
import InvoicePrint from "../components/billing/InvoicePrint";

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
  productId: "",
  code: "",
  name: "",
  category: "",
  brand: "",
  finish: "",
  colorDesign: "",
  quantity: "",
  boxes: "",
  size: "",
  uom: "",
  discount: "",
  price: 0,
  total: 0,
  availableStock: null,
  coverageArea: 0,
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
  px: 2.2,
  py: 1.6,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 1.2,
  background: "#fafcfe",
  borderBottom: "1px solid #e2e8f0",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "9px",
    background: "#fff",
    fontSize: 13,
    "& fieldset": { borderColor: "#d8e1eb" },
    "&:hover fieldset": { borderColor: primary },
    "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 2 },
  },
};

const panelTitleSx = {
  fontSize: 12,
  fontWeight: 800,
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: 0.8,
  letterSpacing: ".04em",
  textTransform: "uppercase",
};

const fieldLabelSx = {
  mb: 0.6,
  fontSize: 10,
  fontWeight: 800,
  color: muted,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

// ── Quotation table column definitions ─────────────────────────────────────
// Total = 100%. Each col has: key, header label, width%, align, inputType
const QTN_COLS = [
  { key: "product",     label: "Tile / Product", w: "18%", minW: 240, align: "left" },
  { key: "category",    label: "Category",       w: "10%", minW: 120, align: "left" },
  { key: "brand",       label: "Brand",          w:  "9%", minW: 110, align: "left" },
  { key: "finish",      label: "Finish",         w:  "9%", minW: 110, align: "left" },
  { key: "colorDesign", label: "Color/Design",   w: "10%", minW: 130, align: "left" },
  { key: "qty",         label: "Qty (sqft)",     w:  "8%", minW: 95, align: "left" },
  { key: "boxes",       label: "Boxes",          w:  "8%", minW: 90, align: "left" },
  { key: "rate",        label: "Rate/sqft",      w:  "9%", minW: 105, align: "left" },
  { key: "disc",        label: "Disc %",         w:  "6%", minW: 78, align: "left" },
  { key: "amount",      label: "Amount (Rs)",    w:  "9%", minW: 120, align: "left" },
  { key: "action",      label: "",               w:  "4%", minW: 74, align: "center" },
];

// Shared header cell style for quotation table
const qtnHeaderCellSx = (col) => ({
  fontWeight: 700,
  color: "#fff",
  fontSize: 11,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  py: 1.4,
  px: 0.9,
  textAlign: col.align,
  width: col.w,
  background: "transparent",
  borderBottom: "none",
});

// Shared body cell style for quotation table
const qtnBodyCellSx = (col, isLocked) => ({
  py: 0.8,
  px: 0.9,
  verticalAlign: "middle",
  width: col.w,
  textAlign: col.align,
  background: isLocked ? "#f8fafc" : "transparent",
});

const qtnInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "7px",
    background: "#f8fafc",
    fontSize: 12,
    minHeight: 36,
    "& fieldset": { borderColor: "#c7d2e3" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 1.5 },
  },
  "& .MuiInputBase-input": {
    py: "8px",
    px: "10px",
    lineHeight: 1.2,
    color: "#0f172a",
    overflow: "visible",
    textOverflow: "clip",
  },
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#6b7280",
    opacity: 1,
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
    margin: 0,
  },
};
const openWhatsAppChat = (phone, message) => {
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const url = isMobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

const Invoice = ({ mode = "invoice" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const isQuotation = mode === "quotation";

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [saleType, setSaleType] = useState(CUSTOMER_TYPE_OPTIONS[0]);
  const [tax, setTax] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [payment, setPayment] = useState({ method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
  const [invoiceData, setInvoiceData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [customerLocked, setCustomerLocked] = useState(false);
  const [itemLocks, setItemLocks] = useState([]);
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingCharge, setLoadingCharge] = useState("");
  const [transportCharge, setTransportCharge] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [calculator, setCalculator] = useState({ length: "", width: "", wastage: "", coverage: "" });
  const previewRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getProducts();
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!state) return;
    if (typeof state.customer === "object") {
      setCustomer({ ...emptyCustomer, ...state.customer });
    } else {
      setCustomer((prev) => ({ ...prev, name: state.customer || "" }));
    }
    setSaleType(normalizeCustomerType(state.customerType || state.saleType || state.customer?.customerType || state.customer?.saleType));
    const incomingItems = Array.isArray(state.items) ? state.items : [];
    setItems(
      incomingItems.map((item) => {
        const coverageArea = item.coverageArea ?? 0;
        const qty = Number(item.quantity) || 0;
        const boxes =
          item.boxes !== undefined && item.boxes !== ""
            ? item.boxes
            : qty > 0 && coverageArea > 0
              ? Number((qty / coverageArea).toFixed(2))
              : "";
        return { ...emptyItem, ...item, boxes, availableStock: item.availableStock ?? null, coverageArea };
      })
    );
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

  const generateInvoiceNo = () => (isQuotation ? "QTN" : "INV") + Date.now();

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
    setItemLocks((prev) => [...prev, false]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "productId") {
      const selected = products.find((product) => product._id === value);
      const coverageArea = Number(selected?.coverageArea ?? getCoveragePerBox(selected) ?? 0);
      const qty = Number(updated[index].quantity) || 0;
      const boxes = qty > 0 && coverageArea > 0 ? Number((qty / coverageArea).toFixed(2)) : "";
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
        coverageArea,
        boxes,
      };
    }

    const coveragePerBox = Number(updated[index].coverageArea || 0);

    if (field === "quantity") {
      if (isTransientNumberInput(value)) {
        updated[index].boxes = "";
        const price = Number(updated[index].price) || 0;
        const qty = Number(updated[index].quantity) || 0;
        const itemDiscount = Number(updated[index].discount) || 0;
        updated[index].total = price * qty * (1 - itemDiscount / 100);
        setItems(updated);
        return;
      }
      const qty = Number(value) || 0;
      updated[index].boxes = qty > 0 && coveragePerBox > 0 ? Number((qty / coveragePerBox).toFixed(2)) : "";
    }

    if (field === "boxes") {
      if (isTransientNumberInput(value)) {
        updated[index].quantity = "";
        const price = Number(updated[index].price) || 0;
        const qty = Number(updated[index].quantity) || 0;
        const itemDiscount = Number(updated[index].discount) || 0;
        updated[index].total = price * qty * (1 - itemDiscount / 100);
        setItems(updated);
        return;
      }
      const boxes = Number(value) || 0;
      updated[index].quantity = boxes > 0 && coveragePerBox > 0 ? Number((boxes * coveragePerBox).toFixed(2)) : "";
    }

    if ((field === "quantity" || field === "boxes") && !isQuotation) {
      const qty = Number(updated[index].quantity) || 0;
      const availableStock = updated[index].availableStock;
      if (availableStock !== null && availableStock !== undefined) {
        if (availableStock <= 0) {
          toast.error(`"${updated[index].name || "This product"}" is out of stock`);
          updated[index].quantity = 0;
          updated[index].total = 0;
          setItems(updated);
          return;
        }
        if (qty > availableStock) {
          toast.error(`Only ${availableStock} ${updated[index].uom || "units"} available for "${updated[index].name}"`, { id: `stock-${index}` });
          updated[index].quantity = availableStock;
          updated[index].boxes = availableStock > 0 && coveragePerBox > 0
            ? Number((availableStock / coveragePerBox).toFixed(2))
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
    if (activeIndex === index) setActiveIndex(null);
  };

  const confirmItem = (index) => {
    const item = items[index];
    if (!item?.name || Number(item.quantity) <= 0) {
      toast.error("Select a product and enter quantity before confirming");
      return;
    }
    setItemLocks((prev) => prev.map((locked, i) => (i === index ? true : locked)));
    if (activeIndex === index) setActiveIndex(null);
  };

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
  const itemDiscountTotal = useMemo(
    () => items.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemDiscount = Number(item.discount) || 0;
      return acc + (qty * price * itemDiscount) / 100;
    }, 0),
    [items]
  );
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
  useEffect(() => {
    setPayment((prev) => ({ ...prev, dueAmount: pendingAmount }));
  }, [pendingAmount]);

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

  const handleCustomerChange = (event) => setCustomer((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const canConfirmCustomer = customer.name.trim() && customer.phone.trim() && customer.address.trim();
  const handleConfirmCustomer = () => {
    if (!canConfirmCustomer) { toast.error("Fill customer name, phone number, and address before confirming"); return; }
    setCustomerLocked(true);
  };

  const handleSubmit = async () => {
    if (!customer.name.trim())    { toast.error("Customer name is required"); return; }
    if (!customer.phone.trim())   { toast.error("Customer phone number is required"); return; }
    if (!customer.address.trim()) { toast.error("Customer address is required"); return; }
    if (items.length === 0)       { toast.error(`Add at least one item to generate ${isQuotation ? "quotation" : "invoice"}`); return; }
    const invalidItem = items.find((item) => !item.name || Number(item.quantity) <= 0);
    if (invalidItem) { toast.error("Each item must have a product and valid quantity"); return; }

    const data = {
      customer: { ...customer, customerType: saleType, saleType },
      customerType: saleType, saleType, items,
      tax: Number(tax) || 0,
      discount: isQuotation ? 0 : 0,
      taxAmount, discountAmount,
      charges: { loading: loadingAmount, transport: transportAmount, extraDiscount: extraDiscountAmount, customerTypeDiscount: customerTypeDiscountAmount, customerTypeDiscountPct },
      notes,
      payment: isQuotation ? {} : { ...payment, paidAmount: advanceReceived, dueAmount: pendingAmount },
      reduceStockNow: isQuotation ? false : undefined,
      status: invoiceStatus,
      invoiceNo: generateInvoiceNo(),
      date: new Date(`${billDate}T${new Date().toTimeString().slice(0, 8)}`).toLocaleString(),
      documentType: isQuotation ? "quotation" : "invoice",
    };

    try {
      const res = await API.post("/invoices", data);
      setInvoiceData({
        ...res.data,
        documentType: isQuotation ? "quotation" : "invoice",
      });
      toast.success(isQuotation ? "Quotation created" : "Invoice created");
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

  const buildInvoicePdf = async () => {
    const element = document.getElementById("invoice-preview");
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
    if (!invoiceData) return;
    const pdfDoc = await buildInvoicePdf();
    if (!pdfDoc) return;
    pdfDoc.pdf.save(pdfDoc.fileName);
  };

  const handlePrint = () => window.print();

  const handleWhatsapp = async () => {
    if (!invoiceData) { toast.error(isQuotation ? "Generate quotation first" : "Generate invoice first"); return; }
    const rawPhone = customer.phone || "";
    const toDigits = rawPhone.replace(/\D/g, "");
    if (!toDigits) { toast.error("Customer phone number is required for WhatsApp"); return; }
    const phone = toDigits.length === 10 ? `91${toDigits}` : toDigits;
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
          `Customer Type Discount (${fmt(customerTypeDiscountPct)}%): Rs.${fmt(customerTypeDiscountAmount)}`,
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
    try {
      const pdfDoc = await buildInvoicePdf();
      if (!pdfDoc) {
        openWhatsAppChat(phone, message);
        return;
      }

      const pdfBlob = pdfDoc.pdf.output("blob");
      const pdfFile = new File([pdfBlob], pdfDoc.fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: pdfDoc.fileName,
          text: message,
          files: [pdfFile],
        });
        return;
      }

      pdfDoc.pdf.save(pdfDoc.fileName);
      openWhatsAppChat(phone, message);
      toast.success("PDF downloaded. Please attach it in WhatsApp.");
    } catch {
      openWhatsAppChat(phone, message);
    }
  };

  const handleDone = () => {
    setCustomer(emptyCustomer);
    setSaleType("Customer");
    setItems([]);
    setItemLocks([]);
    setTax(""); setLoadingCharge(""); setTransportCharge(""); setExtraDiscount(""); setNotes("");
    setPayment({ method: "CASH", amount: "", paidAmount: "", dueAmount: "" });
    setInvoiceData(null); setIsPaid(false); setCustomerLocked(false);
    setBillDate(new Date().toISOString().slice(0, 10));
    toast.success("Done");
    navigate(isQuotation ? "/quotation" : "/CustomerList");
  };

  const summaryRows = [
    ...(isQuotation
      ? [
          ["Total Qty",      fmt(totalItemsCount)],
          ["Sub Total",      `Rs.${fmt(total)}`],
          ["Loading Charges", `Rs.${fmt(loadingAmount)}`],
          ["Extra Discount", `Rs.${fmt(extraDiscountAmount)}`],
          ["Transport",      `Rs.${fmt(transportAmount)}`],
          [`GST (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
          ["Final Amount",   `Rs.${fmt(finalAmount)}`],
        ]
      : [
          ["Subtotal", `Rs.${fmt(total)}`],
          ["Item Discounts", `Rs.${fmt(itemDiscountTotal)}`],
          ["Loading Charges", `Rs.${fmt(loadingAmount)}`],
          ["Special Discount", `Rs.${fmt(extraDiscountAmount)}`],
          [`Customer Type Discount (${fmt(customerTypeDiscountPct)}%)`, `Rs.${fmt(customerTypeDiscountAmount)}`],
          ["Transport", `Rs.${fmt(transportAmount)}`],
          [`GST (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
          ["Total", `Rs.${fmt(finalAmount)}`],
          ["Advance Received", `Rs.${fmt(advanceReceived)}`],
          ["Pending Amount", `Rs.${fmt(pendingAmount)}`],
        ]),
  ];

  // ── Quotation items table ──────────────────────────────────────────────────
  const renderQuotationTable = () => (
    <TableContainer
      sx={{
        border: `1px solid ${border}`,
        borderRadius: "14px",
        overflow: "visible",
      }}
    >
      <Table
        sx={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: 0,
          "& .MuiTableCell-root": { border: "none" },
          "& .MuiInputBase-input": { fontSize: 12.5, py: "7px" },
          "& .MuiOutlinedInput-root": { borderRadius: "7px" },
        }}
      >
        {/* colgroup enforces exact widths matching QTN_COLS */}
        <colgroup>
          {QTN_COLS.map((col) => (
            <col key={col.key} style={{ width: col.w }} />
          ))}
        </colgroup>

        {/* ── Header ── */}
        <TableHead>
          <TableRow
            sx={{
              background: primary,
              "& .MuiTableCell-root:first-of-type": { borderRadius: "13px 0 0 0" },
              "& .MuiTableCell-root:last-of-type":  { borderRadius: "0 13px 0 0" },
            }}
          >
            {QTN_COLS.map((col) => (
              <TableCell key={col.key} sx={qtnHeaderCellSx(col)}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        {/* ── Body ── */}
        <TableBody>
          {items.map((item, index) => {
            const locked = isQuotation && !!itemLocks[index];
            const coveragePerBox = getCoveragePerBox(item);
            const boxes =
              item.boxes !== "" && item.boxes !== undefined
                ? item.boxes
                : Number(item.quantity) > 0 && coveragePerBox > 0
                  ? Number((Number(item.quantity) / coveragePerBox).toFixed(2))
                  : "";
            const filteredProducts = products
              .filter((p) => p.name.toLowerCase().includes((item.name || "").toLowerCase()))
              .slice(0, 5);

            const rowBg = locked ? "#f8fafc" : index % 2 === 0 ? "#fff" : "#fafcfe";

            return (
              <TableRow
                key={index}
                sx={{
                  background: rowBg,
                  transition: "background .14s",
                  "&:hover": { background: locked ? "#f1f5f9" : "#f5f8ff" },
                  "& .MuiTableCell-root": { borderTop: `1px solid #eef1f5` },
                }}
              >
                {/* ── Col 1: Product search ── */}
                <TableCell sx={{ ...qtnBodyCellSx(QTN_COLS[0], locked), position: "relative" }}>
                  <TextField
                    size="small" fullWidth
                    placeholder="Search product…"
                    value={item.name}
                    disabled={locked}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(e) => { handleItemChange(index, "name", e.target.value); setActiveIndex(index); }}
                    sx={qtnInputSx}
                  />
                  {/* Dropdown */}
                  {activeIndex === index && !locked && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "calc(100% - 4px)",
                        left: 6, right: "auto",
                        zIndex: 40,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        boxShadow: "0 10px 28px rgba(15,35,60,.14)",
                        width: "max-content",
                        minWidth: "100%",
                        maxWidth: "min(68vw, 680px)",
                        overflow: "hidden",
                      }}
                    >
                      {filteredProducts.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: "center", color: muted, fontSize: 13 }}>
                          No products found
                        </Box>
                      ) : (
                        filteredProducts.map((product) => {
                          const outOfStock = product.stock <= 0 && !isQuotation;
                          return (
                            <Box
                              key={product._id}
                              onClick={() => {
                                if (outOfStock) { toast.error(`"${product.name}" is out of stock`); return; }
                                handleItemChange(index, "productId", product._id);
                                setActiveIndex(null);
                              }}
                              sx={{
                                px: 1.4, py: 1,
                                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2,
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
                                  {product.code && (
                                    <Box component="span" sx={{ color: "#15803d", ml: 0.8, fontSize: 11, fontWeight: 600 }}>
                                      [{product.code.toUpperCase()}]
                                    </Box>
                                  )}
                                  {product.size && (
                                    <Box component="span" sx={{ color: muted, ml: 0.8, fontSize: 11 }}>
                                      {product.size}
                                    </Box>
                                  )}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  fontSize: 11, fontWeight: 600,
                                  px: 1, py: 0.3, borderRadius: "6px", flexShrink: 0,
                                  background: product.stock <= 0 ? "#fee2e2" : product.stock < 10 ? "#fef3c7" : "#dcfce7",
                                  color:      product.stock <= 0 ? "#b91c1c" : product.stock < 10 ? "#92400e" : "#166534",
                                }}
                              >
                                {product.stock <= 0 ? "Out of stock" : `Stock: ${product.stock}`}
                              </Box>
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  )}
                </TableCell>

                {/* Col 2: Category */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[1], locked)}>
                  <TextField size="small" fullWidth value={item.category || ""} disabled={locked}
                    onChange={(e) => handleItemChange(index, "category", e.target.value)} sx={qtnInputSx} />
                </TableCell>

                {/* Col 3: Brand */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[2], locked)}>
                  <TextField size="small" fullWidth value={item.brand || ""} disabled sx={qtnInputSx} />
                </TableCell>

                {/* Col 4: Finish */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[3], locked)}>
                  <TextField size="small" fullWidth value={item.finish || ""} disabled={locked}
                    onChange={(e) => handleItemChange(index, "finish", e.target.value)} sx={qtnInputSx} />
                </TableCell>

                {/* Col 5: Color/Design */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[4], locked)}>
                  <TextField size="small" fullWidth value={item.colorDesign || ""} disabled sx={qtnInputSx} />
                </TableCell>

                {/* Col 6: Qty (sqft) */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[5], locked)}>
                  <TextField size="small" fullWidth type="number"
                    value={item.quantity} disabled={locked}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    inputProps={{ min: 0, step: "0.01" }} sx={qtnInputSx} />
                </TableCell>

                {/* Col 7: Boxes */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[6], locked)}>
                  <TextField size="small" fullWidth type="number"
                    value={boxes} disabled={locked}
                    onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
                    inputProps={{ min: 0, step: "0.01" }} sx={qtnInputSx} />
                </TableCell>

                {/* Col 8: Rate */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[7], locked)}>
                  <TextField size="small" fullWidth
                    value={item.productId ? fmt(item.price) : ""}
                    disabled sx={qtnInputSx} />
                </TableCell>

                {/* Col 9: Disc % */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[8], locked)}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={item.discount ?? ""}
                    disabled={locked}
                    inputProps={{ min: 0, max: 100, step: "0.01" }}
                    onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                    sx={qtnInputSx}
                  />
                </TableCell>

                {/* Col 10: Amount */}
                <TableCell sx={qtnBodyCellSx(QTN_COLS[9], locked)}>
                  <TextField size="small" fullWidth
                    value={item.productId ? fmt(item.total) : ""}
                    disabled sx={{
                      ...qtnInputSx,
                      "& .MuiOutlinedInput-root": {
                        ...qtnInputSx["& .MuiOutlinedInput-root"],
                        fontWeight: 700,
                        "& input": { fontWeight: 700, color: "#0f172a" },
                      },
                    }} />
                </TableCell>

                {/* Col 11: Actions */}
                <TableCell sx={{ ...qtnBodyCellSx(QTN_COLS[10], locked), px: 0.4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.2 }}>
                    <IconButton
                      size="small"
                      onClick={() => confirmItem(index)}
                      title="Confirm item"
                      sx={{
                        color: locked ? "#15803d" : "#94a3b8",
                        background: locked ? "#f0fdf4" : "transparent",
                        border: locked ? "1px solid #bbf7d0" : "1px solid transparent",
                        borderRadius: "7px", p: 0.5,
                        "&:hover": { background: "#f0fdf4", color: "#15803d" },
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => removeItem(index)}
                      title="Remove item"
                      sx={{
                        color: "#94a3b8", borderRadius: "7px", p: 0.5,
                        "&:hover": { background: "#fee2e2", color: "#dc2626" },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}

          {/* ── Empty state ── */}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={QTN_COLS.length}
                sx={{
                  py: 7, textAlign: "center",
                  color: muted, fontSize: 13,
                  background: "#fafcfe",
                  borderTop: `1px solid ${border}`,
                }}
              >
                <Box sx={{ fontSize: 24, mb: 0.8 }}>📋</Box>
                Click "Add Item" to start building the quotation
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ── Invoice items table (unchanged layout, just cleaned up) ───────────────
  const renderInvoiceTable = () => (
    <TableContainer sx={{ border: `1px solid ${border}`, borderRadius: "14px", overflow: "auto" }}>
      <Table size="small" sx={{ minWidth: 980 }}>
        <TableHead sx={{ background: "#f8fafc" }}>
          <TableRow>
            {["Product", "Category", "Finish", "Qty", "Size", "UOM", "Price", "Total", "Action"].map((label) => (
              <TableCell key={label} sx={{ fontWeight: 800, color: muted, whiteSpace: "nowrap", fontSize: 14, textAlign: label === "Action" ? "center" : "left" }}>
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const filteredProducts = products
              .filter((p) => p.name.toLowerCase().includes((item.name || "").toLowerCase()))
              .slice(0, 5);
            return (
              <TableRow key={index}>
                <TableCell sx={{ width: "34%", py: 1, position: "relative" }}>
                  <TextField size="small" fullWidth placeholder="Search product…" value={item.name}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(e) => { handleItemChange(index, "name", e.target.value); setActiveIndex(index); }}
                    sx={inputSx} />
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
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.category || ""} onChange={(e) => handleItemChange(index, "category", e.target.value)} sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.finish || ""} onChange={(e) => handleItemChange(index, "finish", e.target.value)} sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "10%", py: 1 }}><TextField size="small" type="number" fullWidth value={item.quantity} inputProps={{ min: 0, max: item.availableStock ?? undefined }} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.size} onChange={(e) => handleItemChange(index, "size", e.target.value)} sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.uom} onChange={(e) => handleItemChange(index, "uom", e.target.value)} sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.productId ? fmt(item.price) : ""} disabled sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "12%", py: 1 }}><TextField size="small" fullWidth value={item.productId ? fmt(item.total) : ""} disabled sx={inputSx} /></TableCell>
                <TableCell sx={{ width: "10%", py: 1, textAlign: "center" }}>
                  <IconButton size="small" color="error" onClick={() => removeItem(index)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: muted }}>Add an item to start</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ minHeight: "100%", background: pageBg, p: 0 }}>
      <Box sx={{ mb: 2, px: { xs: 0.4, md: 0.6 } }}>
        <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, color: "#0f172a" }}>
          {isQuotation ? "Create Quotation" : "Create Invoice"}
        </Typography>
        <Typography sx={{ color: muted, mt: 0.5, fontSize: 13.5 }}>
          {isQuotation
            ? "Enter customer details directly, prepare products, and generate a quotation without reducing stock."
            : "Create an invoice with available stock validation and printable output."}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: isQuotation ? "1fr" : { xs: "1fr", xl: "minmax(0, 1.9fr) minmax(300px, 0.72fr)" }, gap: 2.2, alignItems: "start" }}>
        <Box>
          {/* Customer card */}
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Customer Details</Typography>
              {isQuotation && customerLocked && (
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setCustomerLocked(false)}>Edit</Button>
              )}
            </Box>
            <Box sx={{ p: 2.2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" }, gap: 1.5, alignItems: "end" }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Name</Typography>
                  <TextField size="small" name="name" fullWidth value={customer.name} onChange={handleCustomerChange} disabled={isQuotation && customerLocked} sx={inputSx} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Type</Typography>
                  <TextField select size="small" fullWidth value={saleType} onChange={(e) => setSaleType(e.target.value)} disabled={isQuotation && customerLocked} sx={inputSx}>
                    {CUSTOMER_TYPE_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Phone Number</Typography>
                  <TextField size="small" name="phone" fullWidth value={customer.phone} onChange={handleCustomerChange} inputProps={{ maxLength: 10 }} disabled={isQuotation && customerLocked} sx={inputSx} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Address</Typography>
                  <TextField size="small" name="address" fullWidth value={customer.address} onChange={handleCustomerChange} disabled={isQuotation && customerLocked} sx={inputSx} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Date</Typography>
                  <TextField size="small" type="date" fullWidth value={billDate} onChange={(e) => setBillDate(e.target.value)} sx={inputSx} InputLabelProps={{ shrink: true }} />
                </Box>
              </Box>
              {isQuotation && !customerLocked && (
                <Box sx={{ mt: 1.6, display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={handleConfirmCustomer} disabled={!canConfirmCustomer} sx={{ textTransform: "none", borderRadius: "10px" }}>
                    Confirm
                  </Button>
                </Box>
              )}
            </Box>
          </Card>

          {/* Items card */}
          <Card sx={{ ...sectionCardSx, mt: 2.2, overflow: isQuotation ? "visible" : "hidden" }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Items</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem}
                sx={{ textTransform: "none", borderRadius: "10px", borderColor: border, color: "#1c2333" }}>
                Add Item
              </Button>
            </Box>
            <Box sx={{ p: isQuotation ? 0 : 2.2 }}>
              {isQuotation ? renderQuotationTable() : renderInvoiceTable()}
            </Box>
          </Card>

          {isQuotation && (
            <Box sx={{ mt: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.9fr) minmax(300px, 0.85fr)" }, gap: 2.2, alignItems: "start" }}>
              <Box>
                <Card sx={sectionCardSx}>
                  <Box sx={cardHeaderSx}>
                    <Typography sx={panelTitleSx}>Charges</Typography>
                  </Box>
                  <Box sx={{ p: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
                    <Box>
                      <Typography sx={fieldLabelSx}>GST Rate</Typography>
                      <TextField select size="small" fullWidth value={tax} onChange={(e) => setTax(e.target.value)} sx={inputSx}>
                        {[0, 5, 12, 18].map((rate) => <MenuItem key={rate} value={String(rate)}>{rate}% GST</MenuItem>)}
                      </TextField>
                    </Box>
                    <Box>
                      <Typography sx={fieldLabelSx}>Loading Charges (Rs)</Typography>
                      <TextField size="small" type="number" fullWidth value={loadingCharge} onChange={(e) => setLoadingCharge(e.target.value)} sx={inputSx} />
                    </Box>
                    <Box>
                      <Typography sx={fieldLabelSx}>Transport (Rs)</Typography>
                      <TextField size="small" type="number" fullWidth value={transportCharge} onChange={(e) => setTransportCharge(e.target.value)} sx={inputSx} />
                    </Box>
                    <Box>
                      <Typography sx={fieldLabelSx}>Special Discount (Rs)</Typography>
                      <TextField size="small" type="number" fullWidth value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} sx={inputSx} />
                    </Box>
                    <Box sx={{ gridColumn: "1 / -1" }}>
                      <Typography sx={fieldLabelSx}>Notes</Typography>
                      <TextField size="small" fullWidth multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} sx={inputSx} placeholder="Scheme / Remarks" />
                    </Box>
                  </Box>
                </Card>

                <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
                  <Box sx={cardHeaderSx}>
                    <Typography sx={panelTitleSx}>Quick Tile Calculator</Typography>
                  </Box>
                  <Box sx={{ p: 2.1 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                      {[
                        { label: "Room Length (ft)", key: "length" },
                        { label: "Room Width (ft)",  key: "width"  },
                        { label: "Wastage %",         key: "wastage" },
                        { label: "Coverage/Box (sqft)", key: "coverage" },
                      ].map(({ label, key }) => (
                        <Box key={key}>
                          <Typography sx={fieldLabelSx}>{label}</Typography>
                          <TextField size="small" fullWidth value={calculator[key]} onChange={(e) => setCalculator((prev) => ({ ...prev, [key]: e.target.value }))} sx={inputSx} placeholder="0" />
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ mt: 1.6, p: 1.2, borderRadius: "8px", background: "#e8f5ee", color: "#166534", fontSize: 12 }}>
                      <strong>Room Area:</strong> {fmt(calculatorResult.area)} sqft{"  |  "}
                      <strong>With {calculator.wastage || 0}% wastage:</strong> {fmt(calculatorResult.areaWithWastage)} sqft{"  |  "}
                      <strong>Boxes needed:</strong> {calculatorResult.boxesNeeded} boxes
                    </Box>
                  </Box>
                </Card>
              </Box>

              <Box>
                <Card sx={sectionCardSx}>
                  <Box sx={cardHeaderSx}>
                    <Typography sx={panelTitleSx}>Bill Summary</Typography>
                  </Box>
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
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSubmit}
                      disabled={items.length === 0 || Boolean(invoiceData)}
                      sx={{ mt: 1.5, borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, width: "100%", background: "#1a7a4a", "&:hover": { background: "#146038" } }}
                    >
                      Generate Quotation
                    </Button>
                  </Box>
                </Card>
              </Box>
            </Box>
          )}

          {/* Charges card */}
          {!isQuotation && (
          <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Charges</Typography>
            </Box>
            <Box sx={{ p: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", md: isQuotation ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }, gap: 1.5 }}>
              <Box>
                <Typography sx={fieldLabelSx}>{isQuotation ? "GST Rate" : "Tax %"}</Typography>
                <TextField select size="small" fullWidth value={tax} onChange={(e) => setTax(e.target.value)} sx={inputSx}>
                  {[0, 5, 12, 18].map((rate) => <MenuItem key={rate} value={String(rate)}>{rate}% GST</MenuItem>)}
                </TextField>
              </Box>
              {isQuotation ? (
                <>
                  <Box>
                    <Typography sx={fieldLabelSx}>Loading Charges (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={loadingCharge} onChange={(e) => setLoadingCharge(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Transport (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={transportCharge} onChange={(e) => setTransportCharge(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Special Discount (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <Typography sx={fieldLabelSx}>Notes</Typography>
                    <TextField size="small" fullWidth multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} sx={inputSx} placeholder="Add quotation notes" />
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <Typography sx={fieldLabelSx}>Loading Charges (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={loadingCharge} onChange={(e) => setLoadingCharge(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Transport (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={transportCharge} onChange={(e) => setTransportCharge(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Special Discount (Rs)</Typography>
                    <TextField size="small" type="number" fullWidth value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} sx={inputSx} />
                  </Box>
                  <Box sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}>
                    <Typography sx={fieldLabelSx}>Advance Received (Rs)</Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={payment?.paidAmount ?? ""}
                      onChange={(e) => setPayment((prev) => ({ ...prev, paidAmount: e.target.value }))}
                      sx={inputSx}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Card>
          )}
        </Box>

        {/* Right column */}
        {!isQuotation && (
        <Box>
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>{isQuotation ? "Quotation Summary" : "Invoice Summary"}</Typography>
            </Box>
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
                  )})}
                </Box>
              </Box>
              {isQuotation && (
                <>
                  <Box sx={{ mt: 1.5, p: 1.2, borderRadius: "10px", background: "#edf4ff", color: primary, fontSize: 12 }}>
                    Quotation products are reference-only and do not reduce stock.
                  </Box>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}
                    disabled={items.length === 0 || Boolean(invoiceData)}
                    sx={{ mt: 1.5, borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, width: "100%", background: "#1a7a4a", "&:hover": { background: "#146038" } }}>
                    Generate Quotation
                  </Button>
                </>
              )}
            </Box>
          </Card>

          {!isQuotation && (
            <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}>Actions</Typography>
              </Box>
              <Box sx={{ p: 2.1, display: "flex", flexDirection: "column", gap: 1.1 }}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={items.length === 0} sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: "#1a7a4a", "&:hover": { background: "#146038" } }}>
                  Generate Invoice
                </Button>
                <Button variant="contained" startIcon={<VisibilityIcon />} onClick={handleDownload} disabled={!invoiceData} sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}>
                  Download PDF
                </Button>
                <Button variant="outlined" onClick={handlePrint} disabled={!invoiceData} sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700 }}>
                  Print
                </Button>
                <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={handleWhatsapp} disabled={!invoiceData} sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: "#25D366", "&:hover": { background: "#1ebe59" } }}>
                  Send on WhatsApp
                </Button>
                <Divider sx={{ my: 0.3 }} />
                <Button variant={isPaid ? "contained" : "outlined"} color="success" onClick={() => updateStatus(true)} disabled={!invoiceData} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>
                  Payment Received
                </Button>
                <Button variant={!isPaid ? "contained" : "outlined"} color="warning" onClick={() => updateStatus(false)} disabled={!invoiceData} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>
                  Pending
                </Button>
                <Button variant="contained" color="inherit" onClick={handleDone} disabled={!invoiceData} sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700, background: "#f8fafc", color: "#1c2333", border: `1px solid ${border}`, boxShadow: "none" }}>
                  Done
                </Button>
              </Box>
            </Card>
          )}

          {isQuotation && (
            <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}>Quick Tile Calculator</Typography>
              </Box>
              <Box sx={{ p: 2.1 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                  {[
                    { label: "Room Length (ft)", key: "length" },
                    { label: "Room Width (ft)",  key: "width"  },
                    { label: "Wastage %",         key: "wastage" },
                    { label: "Coverage/Box (sqft)", key: "coverage" },
                  ].map(({ label, key }) => (
                    <Box key={key}>
                      <Typography sx={fieldLabelSx}>{label}</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={calculator[key]}
                        onChange={(e) => setCalculator((prev) => ({ ...prev, [key]: e.target.value }))}
                        sx={inputSx}
                        placeholder="0"
                      />
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 1.6, p: 1.2, borderRadius: "8px", background: "#e8f5ee", color: "#166534", fontSize: 12 }}>
                  <strong>Room Area:</strong> {fmt(calculatorResult.area)} sqft{"  |  "}
                  <strong>With {calculator.wastage || 0}% wastage:</strong> {fmt(calculatorResult.areaWithWastage)} sqft{"  |  "}
                  <strong>Boxes needed:</strong> {calculatorResult.boxesNeeded} boxes
                </Box>
              </Box>
            </Card>
          )}
        </Box>
        )}
      </Box>

      {invoiceData && (
        isQuotation ? (
          <>
            <Card ref={previewRef} sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>Quotation Preview</Typography></Box>
              <Box sx={{ p: 2.2, background: "#fff", overflowX: "auto" }}>
                <Box id="invoice-preview" sx={{ minWidth: 820 }}>
                  <InvoicePrint data={invoiceData} />
                </Box>
              </Box>
            </Card>
            <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}><Typography sx={panelTitleSx}>Actions</Typography></Box>
              <Box sx={{ p: 2.1, display: "flex", flexWrap: "wrap", gap: 1.1 }}>
                <Button variant="contained" startIcon={<VisibilityIcon />} onClick={handleDownload} sx={{ borderRadius: "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}>Download PDF</Button>
                <Button variant="outlined" onClick={handlePrint} sx={{ borderRadius: "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700 }}>Print</Button>
                <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={handleWhatsapp} sx={{ borderRadius: "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: "#25D366", "&:hover": { background: "#1ebe59" } }}>Send on WhatsApp</Button>
                <Button variant="contained" color="inherit" onClick={handleDone} sx={{ borderRadius: "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700, background: "#f8fafc", color: "#1c2333", border: `1px solid ${border}`, boxShadow: "none" }}>Done</Button>
              </Box>
            </Card>
          </>
        ) : (
          <Box sx={{ position: "fixed", left: "-200vw", top: 0, width: 820, pointerEvents: "none", opacity: 0 }}>
            <Box id="invoice-preview"><InvoicePrint data={invoiceData} /></Box>
          </Box>
        )
      )}
    </Box>
  );
};

export default Invoice;

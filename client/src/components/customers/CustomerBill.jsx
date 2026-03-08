import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
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
import AddIcon from "@mui/icons-material/Add";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getProducts } from "../../services/productService";
import { getCustomers, saveCustomer } from "../../services/customerService";
import { createInvoice, finalizeInvoiceStock } from "../../services/invoiceService";
import InvoicePrint from "../billing/InvoicePrint";
import { useAuth } from "../../context/AuthContext";

const emptyItem = {
  productId: "",
  search: "",
  code: "",
  name: "",
  colorDesign: "",
  quantity: "",
  boxes: "",
  size: "",
  uom: "",
  price: 0,
  gst: 0,
  discount: 0,
  gstAmount: 0,
  discountAmount: 0,
  total: 0,
  availableStock: null,
  coverageArea: 0,
  confirmed: false,
};

const defaultShopSettings = {
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  defaultTax: 18,
  defaultDiscount: 0,
  whatsappNumber: "",
};

const salesPersonOptions = ["Owner", "Counter Sales", "Floor Sales"];
const saleTypeOptions = ["Retail Customer", "Dealer", "Contractor", "Builder / Project"];
const fmt = (n = 0) => Number(n).toFixed(2);

const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const getRateBySaleType = (product, saleType) => {
  const retail = Number(product?.price || 0);
  const dealer = Number(product?.dealerPrice || 0);
  const contractor = Number(product?.contractorPrice || 0);
  const minimum = Number(product?.minimumSellPrice || 0);

  if (saleType === "Dealer") return dealer > 0 ? dealer : retail;
  if (saleType === "Contractor") return contractor > 0 ? contractor : (dealer > 0 ? dealer : retail);
  if (saleType === "Builder / Project") {
    if (minimum > 0) return minimum;
    if (contractor > 0) return contractor;
    if (dealer > 0) return dealer;
    return retail;
  }
  return retail;
};

const isTransientNumberInput = (value) =>
  value === "" || value === "-" || value === "." || value === "-." || String(value).endsWith(".");

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
    "&:hover fieldset": { borderColor: "#1a56a0" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
  },
};

const getSavedSettings = () => {
  try {
    return {
      ...defaultShopSettings,
      ...(JSON.parse(localStorage.getItem("shopSettings")) || {}),
    };
  } catch {
    return defaultShopSettings;
  }
};

const pageBg = "#f0f4f8";
const primary = "#1a56a0";
const primaryDark = "#0f3d7a";
const border = "#dbe5f0";
const muted = "#64748b";

const panelTitleSx = {
  fontSize: 12,
  fontWeight: 800,
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: 0.8,
};

const fieldLabelSx = {
  mb: 0.6,
  fontSize: 10,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const toWords = (value) => {
  const n = Math.round(Number(value) || 0);
  if (!n) return "Zero Rupees Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (num) => {
    if (num < 20) return ones[num];
    if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
    if (num < 1000) return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${convert(num % 100)}` : ""}`.trim();
    if (num < 100000) return `${convert(Math.floor(num / 1000))} Thousand${num % 1000 ? ` ${convert(num % 1000)}` : ""}`.trim();
    if (num < 10000000) return `${convert(Math.floor(num / 100000))} Lakh${num % 100000 ? ` ${convert(num % 100000)}` : ""}`.trim();
    return `${convert(Math.floor(num / 10000000))} Crore${num % 10000000 ? ` ${convert(num % 10000000)}` : ""}`.trim();
  };

  return `${convert(n)} Rupees Only`;
};

const getCoveragePerBox = (product) => {
  const directCoverage = Number(product?.coverageArea || 0);
  if (directCoverage > 0) return directCoverage;

  const stock = Number(product?.stock || 0);
  const stockBoxes = Number(product?.stockBoxes || 0);
  if (stock > 0 && stockBoxes > 0) return stock / stockBoxes;

  return 0;
};

const CustomerBill = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [extraGst, setExtraGst] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [transportCharge, setTransportCharge] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentType, setPaymentType] = useState("Full Payment");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [payingAmountError, setPayingAmountError] = useState("");
  const [shopSettings, setShopSettings] = useState(defaultShopSettings);
  const [calculator, setCalculator] = useState({
    length: "",
    width: "",
    wastage: "",
    coverage: "",
  });
  const previewRef = useRef(null);
  const [billMeta, setBillMeta] = useState({
    date: new Date().toISOString().slice(0, 10),
    salesPerson: user?.name || salesPersonOptions[0],
    saleType: normalizeCustomerType(saleTypeOptions[0]),
    gstin: "",
    siteAddress: "",
    notes: "",
  });

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
    const savedSettings = getSavedSettings();
    setShopSettings(savedSettings);
    setExtraGst(savedSettings.defaultTax === 0 ? "" : String(savedSettings.defaultTax));
    setExtraDiscount(savedSettings.defaultDiscount === 0 ? "" : String(savedSettings.defaultDiscount));
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;
    setBillMeta((prev) => ({
      ...prev,
      siteAddress: prev.siteAddress || selectedCustomer.address || "",
    }));
  }, [selectedCustomer]);

  useEffect(() => {
    if (paymentType !== "Partial") {
      setPartialAmount("");
      setPayingAmountError("");
    }
  }, [paymentType]);

  const invoiceNumberPreview = useMemo(() => {
    const nextNumber = Number(shopSettings.nextInvoiceNumber) || 1;
    return `${shopSettings.invoicePrefix || "INV-"}${nextNumber}`;
  }, [shopSettings.invoicePrefix, shopSettings.nextInvoiceNumber]);

  const recalcRow = (row) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;
    const base = qty * price;
    const gstAmount = (base * (Number(row.gst) || 0)) / 100;
    const discountAmount = (base * (Number(row.discount) || 0)) / 100;
    return { ...row, gstAmount, discountAmount, total: base + gstAmount - discountAmount };
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem, gst: Number(extraGst) || 0 }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const setRow = (index, nextRow) => setItems((prev) => prev.map((row, i) => (i === index ? recalcRow(nextRow) : row)));

  const selectProduct = (index, product) => {
    const current = items[index];
    const coverageArea = getCoveragePerBox(product);
    const qty = Number(current.quantity) || 0;
    const boxes = qty > 0 && coverageArea > 0 ? Number((qty / coverageArea).toFixed(2)) : current.boxes || "";
    setRow(index, {
      ...current,
      productId: product._id,
      search: product.name || "",
      code: product.code || "",
      name: product.name || "",
      size: product.size || "",
      uom: product.uom || "",
      price: getRateBySaleType(product, billMeta.saleType),
      gst: Number(product.gst ?? extraGst ?? 0),
      availableStock: Number(product.stock ?? 0),
      coverageArea,
      quantity: current.quantity || "",
      boxes,
      colorDesign: product.colorDesign || "",
      confirmed: false,
    });
  };

  useEffect(() => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.productId) return row;
        const product = products.find((p) => p._id === row.productId);
        if (!product) return row;
        const nextPrice = getRateBySaleType(product, billMeta.saleType);
        if (Number(row.price || 0) === nextPrice) return row;
        changed = true;
        return recalcRow({ ...row, price: nextPrice });
      });
      return changed ? next : prev;
    });
  }, [billMeta.saleType, products]);

  const handleItemChange = (index, field, value) => {
    const row = { ...items[index], [field]: value };
    if (field === "search") row.name = value;

    const coveragePerBox = Number(row.coverageArea || 0);

    if (field === "quantity") {
      if (isTransientNumberInput(value)) {
        row.boxes = "";
        if (field !== "confirmed") row.confirmed = false;
        setRow(index, row);
        return;
      }
      const qty = Number(value) || 0;
      row.boxes = qty > 0 && coveragePerBox > 0 ? Number((qty / coveragePerBox).toFixed(2)) : "";
    }

    if (field === "boxes") {
      if (isTransientNumberInput(value)) {
        row.quantity = "";
        if (field !== "confirmed") row.confirmed = false;
        setRow(index, row);
        return;
      }
      const boxes = Number(value) || 0;
      row.quantity = boxes > 0 && coveragePerBox > 0 ? Number((boxes * coveragePerBox).toFixed(2)) : "";
    }

    if (field === "quantity" || field === "boxes") {
      const qty = Number(row.quantity) || 0;
      const stockVal = row.availableStock;
      const max = Number(stockVal);

      if (stockVal !== null && stockVal !== undefined && Number.isFinite(max)) {
        if (max <= 0 && qty > 0) {
          row.quantity = 0;
          row.boxes = 0;
          toast.error(`"${row.name || "Selected product"}" is out of stock`, { id: `stock-${index}` });
        } else if (qty > max) {
          row.quantity = max;
          row.boxes = max > 0 && coveragePerBox > 0 ? Number((max / coveragePerBox).toFixed(2)) : row.boxes;
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
      return;
    }
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, confirmed: false } : it)));
  };

  const confirmedItems = useMemo(() => items.filter((item) => item.confirmed), [items]);
  const totalItemsCount = useMemo(() => confirmedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [confirmedItems]);
  const itemDiscountAmount = useMemo(
    () => confirmedItems.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0),
    [confirmedItems]
  );

  const totals = useMemo(() => {
    const base = confirmedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
    const itemGstAmount = confirmedItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
    const subTotal = base + itemGstAmount - itemDiscountAmount;
    const transportAmount = Number(transportCharge) || 0;
    const extraDiscountAmount = Number(extraDiscount) || 0;
    const taxable = Math.max(0, subTotal + transportAmount - extraDiscountAmount);
    const extraGstAmount = (taxable * (Number(extraGst) || 0)) / 100;
    const finalAmount = taxable + extraGstAmount;

    return {
      base,
      itemGstAmount,
      subTotal,
      transportAmount,
      extraDiscountAmount,
      taxable,
      extraGstAmount,
      finalAmount,
    };
  }, [confirmedItems, extraDiscount, extraGst, itemDiscountAmount, transportCharge]);

  useEffect(() => {
    if (paymentType !== "Partial") {
      setPayingAmountError("");
      return;
    }

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
  }, [partialAmount, paymentType, totals.finalAmount]);

  const statusColor = {
    Paid: { background: "#e8f5ee", color: "#1a7a4a" },
    Partial: { background: "#fef3e8", color: "#d4820a" },
    Pending: { background: "#fdf0ee", color: "#c0392b" },
  };

  const generateInvoiceNo = () => {
    const nextNumber = Number(shopSettings.nextInvoiceNumber) || 1;
    return `${shopSettings.invoicePrefix || "INV-"}${nextNumber}`;
  };

  const incrementInvoiceCounter = () => {
    try {
      const saved = getSavedSettings();
      const nextValue = (Number(saved.nextInvoiceNumber) || 1) + 1;
      const updated = { ...saved, nextInvoiceNumber: nextValue };
      localStorage.setItem("shopSettings", JSON.stringify(updated));
      setShopSettings(updated);
    } catch {
      toast.error("Invoice counter could not be updated");
    }
  };

  const validateBeforeSave = () => {
    if (!selectedCustomer?.name) {
      toast.error("Select customer");
      return false;
    }
    if (confirmedItems.length === 0) {
      toast.error("Confirm at least one item");
      return false;
    }
    if (paymentType === "Partial" && (Number(partialAmount) <= 0 || Number(partialAmount) >= totals.finalAmount)) {
      toast.error("Advance amount should be greater than 0 and less than total");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSave()) return;

    const invoiceNo = generateInvoiceNo();
    const payload = {
      customer: {
        name: selectedCustomer.name || "",
        phone: selectedCustomer.phone || "",
        address: billMeta.siteAddress || selectedCustomer.address || "",
        gstin: billMeta.gstin || "",
        customerType: normalizeCustomerType(billMeta.saleType || saleTypeOptions[0]),
        saleType: normalizeCustomerType(billMeta.saleType || saleTypeOptions[0]),
      },
      items: confirmedItems.map((item) => ({
        productId: item.productId,
        code: item.code,
        name: item.name,
        colorDesign: item.colorDesign,
        quantity: Number(item.quantity) || 0,
        size: item.size,
        uom: item.uom,
        price: Number(item.price) || 0,
        gst: Number(item.gst) || 0,
        discount: Number(item.discount) || 0,
        gstAmount: Number(item.gstAmount) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        total: Number(item.total) || 0,
      })),
      tax: Number(extraGst) || 0,
      discount: 0,
      taxAmount: totals.extraGstAmount,
      discountAmount: totals.extraDiscountAmount + itemDiscountAmount,
      charges: {
        transport: totals.transportAmount,
        extraDiscount: totals.extraDiscountAmount,
      },
      notes: billMeta.notes,
      salesPerson: billMeta.salesPerson,
      customerType: normalizeCustomerType(billMeta.saleType || saleTypeOptions[0]),
      saleType: normalizeCustomerType(billMeta.saleType || saleTypeOptions[0]),
      payment: {
        method: paymentType === "Pending" ? "" : paymentMethod,
        amount: totals.finalAmount,
        paidAmount: paymentSummary.paidAmount,
        dueAmount: paymentSummary.dueAmount,
        paymentType,
      },
      reduceStockNow: false,
      status: paymentSummary.status,
      invoiceNo,
      date: new Date(`${billMeta.date}T${new Date().toTimeString().slice(0, 8)}`).toLocaleString(),
    };

    setLoading(true);
    try {
      const res = await createInvoice(payload);
      setInvoiceData(res.data);
      await saveCustomer({
        ...payload.customer,
        amount: totals.finalAmount,
        status: paymentSummary.status,
        method: paymentType === "Pending" ? "" : paymentMethod,
      });
      incrementInvoiceCounter();
      toast.success("Bill saved");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create bill");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoiceData) return;
    const element = document.getElementById("customer-invoice-preview");
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width);
    pdf.save(`Invoice-${invoiceData.invoiceNo}.pdf`);
  };

  const handlePrint = () => {
    if (!invoiceData) return;
    window.print();
  };

  const resetBillForm = () => {
    const savedSettings = getSavedSettings();
    setSelectedCustomer(null);
    setItems([]);
    setExtraGst(savedSettings.defaultTax === 0 ? "" : String(savedSettings.defaultTax));
    setExtraDiscount(savedSettings.defaultDiscount === 0 ? "" : String(savedSettings.defaultDiscount));
    setTransportCharge("");
    setPaymentMethod("CASH");
    setPaymentType("Full Payment");
    setPartialAmount("");
    setInvoiceData(null);
    setPayingAmountError("");
    setBillMeta({
      date: new Date().toISOString().slice(0, 10),
      salesPerson: user?.name || salesPersonOptions[0],
      saleType: normalizeCustomerType(saleTypeOptions[0]),
      gstin: "",
      siteAddress: "",
      notes: "",
    });
  };

  const handleDone = async () => {
    try {
      if (invoiceData?._id && !invoiceData?.stockReduced) {
        const res = await finalizeInvoiceStock(invoiceData._id);
        setInvoiceData(res.data);
        await fetchAll();
      }
      resetBillForm();
      toast.success("Bill completed");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update stock");
    }
  };

  const handleWhatsapp = () => {
    if (!invoiceData) {
      toast.error("Save the bill first");
      return;
    }
    if (!shopSettings.whatsappNumber) {
      toast.error("Add WhatsApp number in settings");
      return;
    }
    toast.success(`Ready to send invoice ${invoiceData.invoiceNo} to WhatsApp`);
  };

  const summaryRows = [
    ["Subtotal", `Rs.${fmt(totals.subTotal)}`],
    ["Item Discounts", `-Rs.${fmt(itemDiscountAmount)}`],
    ["Extra Discount", `-Rs.${fmt(totals.extraDiscountAmount)}`],
    ["Transport", `+Rs.${fmt(totals.transportAmount)}`],
    [`GST (${Number(extraGst) || 0}%)`, `Rs.${fmt(totals.extraGstAmount)}`],
    ["Total", `Rs.${fmt(totals.finalAmount)}`, true],
    ["Advance Received", `-Rs.${fmt(paymentSummary.paidAmount)}`],
    ["Balance Due", `Rs.${fmt(paymentSummary.dueAmount)}`, true, "danger"],
  ];
  const customerOptions = useMemo(() => customers, [customers]);

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

  const topDateLabel = useMemo(() => {
    const parsed = new Date(`${billMeta.date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? billMeta.date
      : parsed.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  }, [billMeta.date]);

  useEffect(() => {
    if (!invoiceData) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [invoiceData]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: pageBg, minHeight: "100vh" }}>
      <Box sx={{ mb: 1.8 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
          New Retail Bill
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 12, color: "#64748b" }}>
          {topDateLabel}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(320px, 0.95fr)" },
          gap: 2.2,
          alignItems: "start",
        }}
      >
        <Box>
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Box component="span" sx={{ color: "#a78bfa" }}>🧾</Box>
                New Retail Sale Bill
              </Typography>
              <Chip
                label={invoiceNumberPreview}
                size="small"
                sx={{ fontWeight: 700, color: primary, background: "#edf4ff" }}
              />
            </Box>

            <Box sx={{ p: 2.2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Date *</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={billMeta.date}
                    onChange={(e) => setBillMeta((prev) => ({ ...prev, date: e.target.value }))}
                    sx={inputSx}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Payment Type</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={inputSx}
                  >
                    {["Cash", "Credit (Udhari)", "UPI / GPay", "PhonePe", "Cheque", "NEFT/RTGS"].map((option) => (
                      <MenuItem key={option} value={option === "Cash" ? "CASH" : option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Sales Person</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={billMeta.salesPerson}
                    onChange={(e) => setBillMeta((prev) => ({ ...prev, salesPerson: e.target.value }))}
                    sx={inputSx}
                  >
                    {[...new Set([billMeta.salesPerson, `${user?.name || "Murugan"} (Owner)`, ...salesPersonOptions])].filter(Boolean).map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Type</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={billMeta.saleType}
                    onChange={(e) => setBillMeta((prev) => ({ ...prev, saleType: normalizeCustomerType(e.target.value) }))}
                    sx={inputSx}
                  >
                    {saleTypeOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5, mb: 1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Name *</Typography>
                  <Autocomplete
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={(_, value) => setSelectedCustomer(value)}
                    getOptionLabel={(option) => option?.name || ""}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder="Customer name..." sx={inputSx} />
                    )}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Mobile</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={selectedCustomer?.phone || ""}
                    sx={inputSx}
                    InputProps={{ readOnly: true }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>GSTIN (for Business)</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={billMeta.gstin}
                    onChange={(e) => setBillMeta((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                    sx={inputSx}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Site / Delivery Address</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={billMeta.siteAddress}
                    onChange={(e) => setBillMeta((prev) => ({ ...prev, siteAddress: e.target.value }))}
                    sx={inputSx}
                    placeholder="Site address"
                  />
                </Box>
              </Box>
            </Box>
          </Card>

          <Card sx={{ ...sectionCardSx, mt: 2.2, background: "#f3f5f7", borderRadius: "18px" }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Inventory2OutlinedIcon sx={{ color: "#b45309", fontSize: 16 }} />
                Tile Items
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              <TableContainer sx={{ borderRadius: 0 }}>
                <Table
                  size="small"
                  sx={{
                    width: "100%",
                    tableLayout: "fixed",
                    "& .MuiTableCell-root": {
                      px: 0.65,
                    },
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ background: primary }}>
                      {["Tile / Product", "Size", "Qty(sqft)", "Boxes", "Rate/sqft", "Disc%", "Amount(Rs)", ""].map((label) => (
                        <TableCell
                          key={label}
                          sx={{
                            color: "#fff",
                            fontWeight: 700,
                            py: 1.5,
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => {
                      const coveragePerBox = getCoveragePerBox(item);
                      const boxesValue =
                        item.boxes !== "" && item.boxes !== undefined
                          ? item.boxes
                          : item.quantity === ""
                            ? ""
                            : coveragePerBox > 0
                              ? Number((Number(item.quantity) / coveragePerBox).toFixed(2))
                              : "";
                      return (
                        <TableRow key={`${item.productId || "row"}-${index}`} hover>
                          <TableCell sx={{ width: "31%", verticalAlign: "top", position: "relative", py: 0.9 }}>
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={item.productId || ""}
                              onChange={(e) => {
                                const product = products.find((entry) => entry._id === e.target.value);
                                if (product) selectProduct(index, product);
                              }}
                              sx={inputSx}
                              SelectProps={{ displayEmpty: true }}
                            >
                              <MenuItem value="">-- Select Tile --</MenuItem>
                              {products.map((product) => (
                                <MenuItem key={product._id} value={product._id}>
                                  {product.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>

                          <TableCell sx={{ width: "10%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={item.size}
                              onChange={(e) => handleItemChange(index, "size", e.target.value)}
                              sx={inputSx}
                              InputProps={{ readOnly: true }}
                            />
                          </TableCell>

                          <TableCell sx={{ width: "11%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              sx={inputSx}
                              placeholder="0"
                              inputProps={{ min: 0, max: item.availableStock ?? undefined, step: "0.01" }}
                            />
                          </TableCell>

                          <TableCell sx={{ width: "10%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              value={boxesValue}
                              onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
                              sx={inputSx}
                              inputProps={{ min: 0, step: "0.01" }}
                              placeholder="0"
                            />
                          </TableCell>

                          <TableCell sx={{ width: "11%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, "price", e.target.value)}
                              sx={inputSx}
                            />
                          </TableCell>

                          <TableCell sx={{ width: "9%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              value={item.discount}
                              onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                              sx={inputSx}
                            />
                          </TableCell>

                          <TableCell sx={{ width: "12%", py: 0.9 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={fmt(item.total)}
                              sx={inputSx}
                              InputProps={{ readOnly: true }}
                            />
                          </TableCell>

                          <TableCell sx={{ width: "6%", whiteSpace: "nowrap", textAlign: "center", py: 0.9 }}>
                            <IconButton
                              size="small"
                              onClick={() => toggleConfirm(index)}
                              sx={{ color: item.confirmed ? "#15803d" : "#64748b" }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => removeItem(index)} sx={{ color: "#c0392b" }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{
                            py: 6.5,
                            color: muted,
                            fontSize: 30,
                            borderBottom: "none",
                            background: "transparent",
                          }}
                        >
                          Add a tile row to start billing
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ borderTop: `1px solid ${border}`, mt: 2.2, pt: 1.8 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    borderColor: "#c6d2e0",
                    color: "#1c2333",
                    px: 2.2,
                    py: 0.7,
                  }}
                >
                  Add Tile
                </Button>
              </Box>
            </Box>
          </Card>

        </Box>

        <Box>
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Box component="span" sx={{ color: "#d97706" }}>ðŸ’°</Box>
                Bill Summary
              </Typography>
            </Box>

            <Box sx={{ p: 2.1 }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <Box component="tbody">
                  {summaryRows.map(([label, value, bold, tone]) => (
                    <Box
                      component="tr"
                      key={label}
                      sx={{
                        borderTop: bold ? `1px solid ${border}` : "none",
                      }}
                    >
                      <Box component="td" sx={{ py: 0.9, color: tone === "danger" ? "#c0392b" : muted, fontWeight: bold ? 700 : 500 }}>
                        {label}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          py: 0.9,
                          textAlign: "right",
                          fontWeight: 800,
                          color: tone === "danger" ? "#c0392b" : bold ? primary : "#1c2333",
                          fontSize: bold ? 15 : 13,
                        }}
                      >
                        {value}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 1.4,
                  p: 1.2,
                  borderRadius: "10px",
                  background: "#edf4ff",
                  color: primary,
                  fontSize: 11.5,
                  fontStyle: "italic",
                }}
              >
                Amount: {toWords(totals.finalAmount)}
              </Box>

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={loading || Boolean(invoiceData)}
                sx={{
                  mt: 1.5,
                  borderRadius: "10px",
                  py: 1.15,
                  textTransform: "none",
                  fontWeight: 700,
                  width: "100%",
                  background: "#1a7a4a",
                  "&:hover": { background: "#146038" },
                }}
              >
                {loading ? "Generating..." : "Generate Bill"}
              </Button>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                <Chip label={`${confirmedItems.length} items confirmed`} size="small" sx={{ background: "#eefaf2", color: "#1a7a4a" }} />
                <Chip label={`${fmt(totalItemsCount)} qty`} size="small" sx={{ background: "#fff4eb", color: "#d4820a" }} />
                <Chip label={paymentSummary.status} size="small" sx={statusColor[paymentSummary.status]} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Box component="span" sx={{ color: "#ef4444" }}>🧮</Box>
                Quick Tile Calculator
              </Typography>
            </Box>

            <Box sx={{ p: 2.1 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Room Length (ft)</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={calculator.length}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, length: e.target.value }))}
                    sx={inputSx}
                    placeholder="0"
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Room Width (ft)</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={calculator.width}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, width: e.target.value }))}
                    sx={inputSx}
                    placeholder="0"
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Wastage %</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={calculator.wastage}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, wastage: e.target.value }))}
                    sx={inputSx}
                    placeholder="0"
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Coverage/Box (sqft)</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={calculator.coverage}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, coverage: e.target.value }))}
                    sx={inputSx}
                    placeholder="0"
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 1.6,
                  p: 1.2,
                  borderRadius: "8px",
                  background: "#e8f5ee",
                  color: "#166534",
                  fontSize: 12,
                }}
              >
                <strong>Room Area:</strong> {fmt(calculatorResult.area)} sqft
                {"  |  "}
                <strong>With {calculator.wastage || 0}% wastage:</strong> {fmt(calculatorResult.areaWithWastage)} sqft
                {"  |  "}
                <strong>Boxes needed:</strong> {calculatorResult.boxesNeeded} boxes
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {invoiceData && (
        <>
          <Card ref={previewRef} sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                Invoice Preview
              </Typography>
            </Box>
            <Box sx={{ p: 2.2, background: "#fff", overflowX: "auto" }}>
              <Box id="customer-invoice-preview" sx={{ minWidth: 820 }}>
                <InvoicePrint data={invoiceData} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Actions</Typography>
            </Box>
            <Box sx={{ p: 2.1, display: "flex", flexWrap: "wrap", gap: 1.1 }}>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={handleDownload}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
                }}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                onClick={handlePrint}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={handleWhatsapp}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  background: "#25D366",
                  "&:hover": { background: "#1ebe59" },
                }}
              >
                Send on WhatsApp
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={handleDone}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  background: "#f8fafc",
                  color: "#1c2333",
                  border: `1px solid ${border}`,
                  boxShadow: "none",
                }}
              >
                Done
              </Button>
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
};

export default CustomerBill;



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
  quantity: "",
  boxes: "",
  size: "",
  uom: "",
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
  const [discount, setDiscount] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [payment, setPayment] = useState({ method: "CASH", amount: "" });
  const [invoiceData, setInvoiceData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [customerLocked, setCustomerLocked] = useState(false);
  const [itemLocks, setItemLocks] = useState([]);
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [transportCharge, setTransportCharge] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [calculator, setCalculator] = useState({
    length: "",
    width: "",
    wastage: "",
    coverage: "",
  });
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
        return {
          ...emptyItem,
          ...item,
          boxes,
          availableStock: item.availableStock ?? null,
          coverageArea,
        };
      })
    );
    setItemLocks(incomingItems.map(() => false));
    setTax(state.tax || "");
    setDiscount(state.discount || "");
    setTransportCharge(state?.charges?.transport ? String(state.charges.transport) : "");
    setExtraDiscount(state?.charges?.extraDiscount ? String(state.charges.extraDiscount) : "");
    setNotes(state?.notes || "");
    setPayment(state.payment || { method: "CASH", amount: "" });
    setIsPaid(state.status === "Paid");
    if (state.date) {
      const parsed = new Date(state.date);
      if (!Number.isNaN(parsed.getTime())) {
        setBillDate(parsed.toISOString().slice(0, 10));
      }
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
        updated[index].total = price * qty;
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
        updated[index].total = price * qty;
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
          toast.error(
            `Only ${availableStock} ${updated[index].uom || "units"} available for "${updated[index].name}"`,
            { id: `stock-${index}` }
          );
          updated[index].quantity = availableStock;
          updated[index].boxes =
            availableStock > 0 && coveragePerBox > 0
              ? Number((availableStock / coveragePerBox).toFixed(2))
              : updated[index].boxes;
        }
      }
    }

    const price = Number(updated[index].price) || 0;
    const qty = Number(updated[index].quantity) || 0;
    updated[index].total = price * qty;
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

  const total = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.total) || 0), 0),
    [items]
  );
  const transportAmount = isQuotation ? Number(transportCharge) || 0 : 0;
  const extraDiscountAmount = isQuotation ? Number(extraDiscount) || 0 : 0;
  const taxableBase = isQuotation ? Math.max(0, total - extraDiscountAmount + transportAmount) : total;
  const taxAmount = (taxableBase * (Number(tax) || 0)) / 100;
  const discountAmount = isQuotation ? extraDiscountAmount : (total * (Number(discount) || 0)) / 100;
  const finalAmount = isQuotation ? taxableBase + taxAmount : total + taxAmount - discountAmount;
  const totalItemsCount = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
    [items]
  );
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

  useEffect(() => {
    setPayment((prev) => ({ ...prev, amount: finalAmount }));
  }, [finalAmount]);

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
        return { ...item, price: nextPrice, total: qty * nextPrice };
      });
      return changed ? next : prev;
    });
  }, [saleType, products]);

  useEffect(() => {
    if (!invoiceData || !isQuotation) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [invoiceData, isQuotation]);

  const handleCustomerChange = (event) => {
    setCustomer((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const canConfirmCustomer =
    customer.name.trim() && customer.phone.trim() && customer.address.trim();

  const handleConfirmCustomer = () => {
    if (!canConfirmCustomer) {
      toast.error("Fill customer name, phone number, and address before confirming");
      return;
    }
    setCustomerLocked(true);
  };

  const handleSubmit = async () => {
    if (!customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!customer.phone.trim()) {
      toast.error("Customer phone number is required");
      return;
    }

    if (!customer.address.trim()) {
      toast.error("Customer address is required");
      return;
    }

    if (items.length === 0) {
      toast.error(`Add at least one item to generate ${isQuotation ? "quotation" : "invoice"}`);
      return;
    }

    const invalidItem = items.find((item) => !item.name || Number(item.quantity) <= 0);
    if (invalidItem) {
      toast.error("Each item must have a product and valid quantity");
      return;
    }

    const data = {
      customer: { ...customer, customerType: saleType, saleType },
      customerType: saleType,
      saleType,
      items,
      tax: Number(tax) || 0,
      discount: isQuotation ? 0 : Number(discount) || 0,
      taxAmount,
      discountAmount,
      charges: isQuotation ? { transport: transportAmount, extraDiscount: extraDiscountAmount } : undefined,
      notes,
      payment: isQuotation ? {} : payment,
      reduceStockNow: isQuotation ? false : undefined,
      status: isQuotation ? "" : "Pending",
      invoiceNo: generateInvoiceNo(),
      date: new Date(`${billDate}T${new Date().toTimeString().slice(0, 8)}`).toLocaleString(),
      documentType: isQuotation ? "quotation" : "invoice",
    };

    try {
      if (isQuotation) {
        setInvoiceData(data);
        toast.success("Quotation created");
      } else {
        const res = await API.post("/invoices", data);
        setInvoiceData({ ...res.data, documentType: "invoice" });
        toast.success("Invoice created");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error");
    }
  };

  const updateStatus = async (paid) => {
    try {
      await API.put(`/invoices/${invoiceData._id}`, { status: paid ? "Paid" : "Pending" });
      setIsPaid(paid);
      toast.success("Status updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDownload = async () => {
    if (!invoiceData) return;
    const element = document.getElementById("invoice-preview");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${isQuotation ? "Quotation" : "Invoice"}-${invoiceData.invoiceNo}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsapp = () => {
    if (!invoiceData) {
      toast.error(isQuotation ? "Generate quotation first" : "Generate invoice first");
      return;
    }
    const rawPhone = customer.phone || "";
    const toDigits = rawPhone.replace(/\D/g, "");
    if (!toDigits) {
      toast.error("Customer phone number is required for WhatsApp");
      return;
    }
    const phone = toDigits.length === 10 ? `91${toDigits}` : toDigits;
    const message = [
      `Hello ${customer.name || "Customer"},`,
      `Your ${isQuotation ? "quotation" : "invoice"} is ready.`,
      `${isQuotation ? "Quotation" : "Invoice"} No: ${invoiceData.invoiceNo}`,
      `Total: Rs.${fmt(finalAmount)}`,
      `Date: ${billDate}`,
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleDone = () => {
    setCustomer(emptyCustomer);
    setSaleType("Customer");
    setItems([]);
    setItemLocks([]);
    setTax("");
    setDiscount("");
    setTransportCharge("");
    setExtraDiscount("");
    setNotes("");
    setPayment({ method: "CASH", amount: "" });
    setInvoiceData(null);
    setIsPaid(false);
    setCustomerLocked(false);
    setBillDate(new Date().toISOString().slice(0, 10));
    toast.success("Done");
    navigate(isQuotation ? "/quotation" : "/CustomerList");
  };

  const summaryRows = [
    ...(isQuotation
      ? [
          ["Total Qty", fmt(totalItemsCount)],
          ["Sub Total", `Rs.${fmt(total)}`],
          ["Extra Discount", `Rs.${fmt(extraDiscountAmount)}`],
          ["Transport", `Rs.${fmt(transportAmount)}`],
          [`GST (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
          ["Final Amount", `Rs.${fmt(finalAmount)}`],
        ]
      : [
          ["Total Qty", fmt(totalItemsCount)],
          ["Sub Total", `Rs.${fmt(total)}`],
          [`Tax (${Number(tax) || 0}%)`, `Rs.${fmt(taxAmount)}`],
          [`Discount (${Number(discount) || 0}%)`, `Rs.${fmt(discountAmount)}`],
          ["Final Amount", `Rs.${fmt(finalAmount)}`],
        ]),
  ];

  return (
    <Box sx={{ minHeight: "100%", background: pageBg, p: { xs: 1.2, md: 2.2 } }}>
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.75fr) minmax(320px, 0.9fr)" },
          gap: 2.2,
          alignItems: "start",
        }}
      >
        <Box>
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Customer Details</Typography>
              {isQuotation && customerLocked ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setCustomerLocked(false)}
                >
                  Edit
                </Button>
              ) : null}
            </Box>

            <Box sx={{ p: 2.2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" },
                  gap: 1.5,
                  alignItems: "end",
                }}
              >
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Name</Typography>
                  <TextField
                    size="small"
                    name="name"
                    fullWidth
                    value={customer.name}
                    onChange={handleCustomerChange}
                    disabled={isQuotation && customerLocked}
                    sx={inputSx}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Type</Typography>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={saleType}
                    onChange={(event) => setSaleType(event.target.value)}
                    disabled={isQuotation && customerLocked}
                    sx={inputSx}
                  >
                    {CUSTOMER_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Phone Number</Typography>
                  <TextField
                    size="small"
                    name="phone"
                    fullWidth
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    inputProps={{ maxLength: 10 }}
                    disabled={isQuotation && customerLocked}
                    sx={inputSx}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Address</Typography>
                  <TextField
                    size="small"
                    name="address"
                    fullWidth
                    value={customer.address}
                    onChange={handleCustomerChange}
                    disabled={isQuotation && customerLocked}
                    sx={inputSx}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Date</Typography>
                  <TextField
                    size="small"
                    type="date"
                    fullWidth
                    value={billDate}
                    onChange={(event) => setBillDate(event.target.value)}
                    sx={inputSx}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>

              {isQuotation && !customerLocked ? (
                <Box sx={{ mt: 1.6, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    color="success" 
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={handleConfirmCustomer}
                    disabled={!canConfirmCustomer}
                    sx={{ textTransform: "none", borderRadius: "10px" }}
                  >
                    Confirm
                  </Button>
                </Box>
              ) : null}
            </Box>
          </Card>

          <Card sx={{ ...sectionCardSx, mt: 2.2, overflow: isQuotation ? "visible" : "hidden" }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Items</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addItem}
                sx={{ textTransform: "none", borderRadius: "10px", borderColor: border, color: "#1c2333" }}
              >
                Add Item
              </Button>
            </Box>

            <Box sx={{ p: 2.2 }}>
              <TableContainer
                sx={{
                  border: `1px solid ${border}`,
                  borderRadius: "14px",
                  overflow: isQuotation ? "visible" : "auto",
                }}
              >
                <Table
                  size="small"
                  sx={
                    isQuotation
                      ? {
                          width: "100%",
                          tableLayout: "fixed",
                          "& .MuiTableCell-root": {
                            px: 0.55,
                            py: 0.9,
                          },
                          "& .MuiInputBase-input": {
                            fontSize: 12,
                            py: 1,
                          },
                        }
                      : { minWidth: 980 }
                  }
                >
                  <TableHead sx={{ background: isQuotation ? primary : "#f8fafc" }}>
                    <TableRow>
                      {(isQuotation
                        ? ["Tile / Product", "Size", "Qty(sqft)", "Boxes", "Rate/sqft", "Disc%", "Amount(Rs)", ""]
                        : ["Product", "Code", "Qty", "Size", "UOM", "Price", "Total", "Action"]
                      ).map((label) => (
                        <TableCell
                          key={label}
                          sx={{
                            fontWeight: 800,
                            color: isQuotation ? "#fff" : muted,
                            textAlign: label === "Action" || label === "" ? "center" : "left",
                            whiteSpace: "nowrap",
                            fontSize: isQuotation ? 11 : 14,
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
                      const boxes =
                        item.boxes !== "" && item.boxes !== undefined
                          ? item.boxes
                          : Number(item.quantity) > 0 && coveragePerBox > 0
                            ? Number((Number(item.quantity) / coveragePerBox).toFixed(2))
                            : "";
                      const filteredProducts = products
                        .filter((product) =>
                          product.name.toLowerCase().includes((item.name || "").toLowerCase())
                        )
                        .slice(0, 5);

                      return (
                        <TableRow key={index}>
                          <TableCell sx={{ width: isQuotation ? "26%" : "34%", py: 1, position: "relative" }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Search product..."
                              value={item.name}
                              disabled={isQuotation && itemLocks[index]}
                              onFocus={() => setActiveIndex(index)}
                              onChange={(event) => {
                                handleItemChange(index, "name", event.target.value);
                                setActiveIndex(index);
                              }}
                              sx={inputSx}
                            />

                            {activeIndex === index && !(isQuotation && itemLocks[index]) ? (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: "calc(100% - 6px)",
                                  left: 8,
                                  right: "auto",
                                  background: "#fff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 1.5,
                                  zIndex: 30,
                                  width: "max-content",
                                  minWidth: "calc(100% - 16px)",
                                  maxWidth: "min(72vw, 760px)",
                                  minHeight: filteredProducts.length === 0 ? 160 : "auto",
                                  overflow: "visible",
                                  boxShadow: 4,
                                }}
                              >
                                {filteredProducts.map((product) => (
                                  <Box
                                    key={product._id}
                                    sx={{
                                      px: 1.2,
                                      py: 1,
                                      cursor: product.stock <= 0 && !isQuotation ? "not-allowed" : "pointer",
                                      fontSize: 13,
                                      whiteSpace: "nowrap",
                                      background: product.stock <= 0 && !isQuotation ? "#fef2f2" : "#fff",
                                      "&:hover": {
                                        background: product.stock <= 0 && !isQuotation ? "#fef2f2" : "#f1f5f9",
                                      },
                                    }}
                                    onClick={() => {
                                      if (product.stock <= 0 && !isQuotation) {
                                        toast.error(`"${product.name}" is out of stock`);
                                        return;
                                      }
                                      handleItemChange(index, "productId", product._id);
                                      setActiveIndex(null);
                                    }}
                                  >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                                      <Box>
                                        <strong>{product.name}</strong>
                                        {product.code ? (
                                          <span style={{ color: "#15803d", marginLeft: 6, fontSize: 12 }}>
                                            [{product.code.toUpperCase()}]
                                          </span>
                                        ) : null}
                                        {product.size ? (
                                          <span style={{ color: "#555", marginLeft: 6, fontSize: 12 }}>
                                            {product.size}
                                          </span>
                                        ) : null}
                                      </Box>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          padding: "2px 7px",
                                          borderRadius: 6,
                                          background:
                                            product.stock <= 0 ? "#fee2e2" : product.stock < 10 ? "#fef3c7" : "#dcfce7",
                                          color:
                                            product.stock <= 0 ? "#b91c1c" : product.stock < 10 ? "#92400e" : "#166534",
                                        }}
                                      >
                                        {product.stock <= 0 ? "Out of stock" : `Stock: ${product.stock}`}
                                      </span>
                                    </Box>
                                  </Box>
                                ))}
                                {filteredProducts.length === 0 ? (
                                  <Box
                                    sx={{
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "text.secondary",
                                      fontSize: 13,
                                      py: 5,
                                    }}
                                  >
                                    No products found
                                  </Box>
                                ) : null}
                              </Box>
                            ) : null}
                          </TableCell>

                          {isQuotation ? (
                            <TableCell sx={{ width: "10%", py: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={item.size}
                                disabled={isQuotation && itemLocks[index]}
                                onChange={(event) => handleItemChange(index, "size", event.target.value)}
                                sx={inputSx}
                              />
                            </TableCell>
                          ) : (
                            <TableCell sx={{ width: "12%", py: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={item.code ? item.code.toUpperCase() : ""}
                                disabled
                                sx={inputSx}
                              />
                            </TableCell>
                          )}

                          <TableCell sx={{ width: isQuotation ? "10%" : "10%", py: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              fullWidth
                              value={item.quantity}
                              disabled={
                                (isQuotation && itemLocks[index]) ||
                                (!isQuotation &&
                                  item.availableStock !== undefined &&
                                  item.availableStock !== null &&
                                  item.availableStock <= 0)
                              }
                              inputProps={{
                                min: 0,
                                max: isQuotation ? undefined : item.availableStock ?? undefined,
                              }}
                              onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                              sx={inputSx}
                            />
                          </TableCell>

                          {isQuotation ? (
                            <TableCell sx={{ width: "10%", py: 1 }}>
                              <TextField
                                size="small"
                                type="number"
                                fullWidth
                                value={boxes}
                                disabled={isQuotation && itemLocks[index]}
                                onChange={(event) => handleItemChange(index, "boxes", event.target.value)}
                                inputProps={{ min: 0, step: "0.01" }}
                                sx={inputSx}
                              />
                            </TableCell>
                          ) : (
                            <TableCell sx={{ width: "12%", py: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={item.size}
                                disabled={isQuotation && itemLocks[index]}
                                onChange={(event) => handleItemChange(index, "size", event.target.value)}
                                sx={inputSx}
                              />
                            </TableCell>
                          )}

                          {isQuotation ? null : (
                            <TableCell sx={{ width: "12%", py: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={item.uom}
                                disabled={isQuotation && itemLocks[index]}
                                onChange={(event) => handleItemChange(index, "uom", event.target.value)}
                                sx={inputSx}
                              />
                            </TableCell>
                          )}

                          <TableCell sx={{ width: isQuotation ? "10%" : "12%", py: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={item.productId ? fmt(item.price) : ""}
                              disabled
                              sx={inputSx}
                            />
                          </TableCell>

                          {isQuotation ? (
                            <TableCell sx={{ width: "8%", py: 1 }}>
                              <TextField size="small" fullWidth value="0" disabled sx={inputSx} />
                            </TableCell>
                          ) : null}

                          <TableCell sx={{ width: isQuotation ? "12%" : "12%", py: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={item.productId ? fmt(item.total) : ""}
                              disabled
                              sx={inputSx}
                            />
                          </TableCell>

                          <TableCell
                            sx={{
                              width: isQuotation ? "8%" : "10%",
                              py: 1,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isQuotation ? (
                              <>
                                <IconButton size="small" color="success" onClick={() => confirmItem(index)}>
                                  <CheckCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : null}
                            <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: muted }}>
                          Add an item to start
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
          <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>{isQuotation ? "Charges & Notes" : "Charges"}</Typography>
            </Box>

            <Box
              sx={{
                p: 2.2,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: isQuotation ? "repeat(3, 1fr)" : "repeat(2, 1fr)" },
                gap: 1.5,
              }}
            >
              <Box>
                <Typography sx={fieldLabelSx}>{isQuotation ? "GST Rate" : "Tax %"}</Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  sx={inputSx}
                >
                  {[0, 5, 12, 18].map((rate) => (
                    <MenuItem key={rate} value={String(rate)}>
                      {rate}% GST
                    </MenuItem>
                  ))}
                  </TextField>
              </Box>
              {isQuotation ? (
                <>
                  <Box>
                    <Typography sx={fieldLabelSx}>Transport (Rs)</Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={transportCharge}
                      onChange={(event) => setTransportCharge(event.target.value)}
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Extra Discount (Rs)</Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={extraDiscount}
                      onChange={(event) => setExtraDiscount(event.target.value)}
                      sx={inputSx}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}>
                    <Typography sx={fieldLabelSx}>Notes</Typography>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      sx={inputSx}
                      placeholder="Add quotation notes"
                    />
                  </Box>
                </>
              ) : (
                <Box>
                  <Typography sx={fieldLabelSx}>Discount %</Typography>
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    sx={inputSx}
                  />
                </Box>
              )}
            </Box>
          </Card>
        </Box>

        <Box>
          <Card sx={sectionCardSx}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>{isQuotation ? "Quotation Summary" : "Invoice Summary"}</Typography>
            </Box>

            <Box sx={{ p: 2.1 }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <Box component="tbody">
                  {summaryRows.map(([label, value], index) => (
                    <Box
                      component="tr"
                      key={label}
                      sx={{ borderTop: index === summaryRows.length - 1 ? `1px solid ${border}` : "none" }}
                    >
                      <Box
                        component="td"
                        sx={{ py: 0.9, color: muted, fontWeight: index === summaryRows.length - 1 ? 700 : 500 }}
                      >
                        {label}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          py: 0.9,
                          textAlign: "right",
                          fontWeight: 800,
                          color: index === summaryRows.length - 1 ? primary : "#1c2333",
                          fontSize: index === summaryRows.length - 1 ? 15 : 13,
                        }}
                      >
                        {value}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {isQuotation ? (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.2,
                    borderRadius: "10px",
                    background: "#edf4ff",
                    color: primary,
                    fontSize: 12,
                  }}
                >
                  Quotation products are reference-only and do not reduce stock.
                </Box>
              ) : null}

              {isQuotation ? (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit}
                  disabled={items.length === 0 || Boolean(invoiceData)}
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
                  Generate Quotation
                </Button>
              ) : null}
            </Box>
          </Card>

          {!isQuotation ? (
            <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>Actions</Typography>
            </Box>

            <Box sx={{ p: 2.1, display: "flex", flexDirection: "column", gap: 1.1 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={items.length === 0}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  textTransform: "none",
                  fontWeight: 700,
                  background: "#1a7a4a",
                  "&:hover": { background: "#146038" },
                }}
              >
                Generate Invoice
              </Button>

              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={handleDownload}
                disabled={!invoiceData}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  textTransform: "none",
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
                }}
              >
                Download PDF
              </Button>

              <Button
                variant="outlined"
                onClick={handlePrint}
                disabled={!invoiceData}
                sx={{ borderRadius: "10px", py: 1.15, textTransform: "none", fontWeight: 700 }}
              >
                Print
              </Button>

              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={handleWhatsapp}
                disabled={!invoiceData}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
                  textTransform: "none",
                  fontWeight: 700,
                  background: "#25D366",
                  "&:hover": { background: "#1ebe59" },
                }}
              >
                Send on WhatsApp
              </Button>

              {!isQuotation ? (
                <>
                  <Divider sx={{ my: 0.3 }} />
                  <Button
                    variant={isPaid ? "contained" : "outlined"}
                    color="success"
                    onClick={() => updateStatus(true)}
                    disabled={!invoiceData}
                    sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
                  >
                    Payment Received
                  </Button>
                  <Button
                    variant={!isPaid ? "contained" : "outlined"}
                    color="warning"
                    onClick={() => updateStatus(false)}
                    disabled={!invoiceData}
                    sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
                  >
                    Pending
                  </Button>
                </>
              ) : null}

              <Button
                variant="contained"
                color="inherit"
                onClick={handleDone}
                disabled={!invoiceData}
                sx={{
                  borderRadius: "10px",
                  py: 1.15,
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
          ) : null}

          {isQuotation ? (
            <Card sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}>Quick Tile Calculator</Typography>
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
          ) : null}
        </Box>
      </Box>

      {invoiceData ? (
        isQuotation ? (
          <>
            <Card ref={previewRef} sx={{ ...sectionCardSx, mt: 2.2 }}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}>Quotation Preview</Typography>
              </Box>
              <Box sx={{ p: 2.2, background: "#fff", overflowX: "auto" }}>
                <Box id="invoice-preview" sx={{ minWidth: 820 }}>
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
                  Download PDF
                </Button>
                <Button
                  variant="outlined"
                  onClick={handlePrint}
                  sx={{ borderRadius: "10px", py: 1.15, px: 2, textTransform: "none", fontWeight: 700 }}
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
                  color="inherit"
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
        ) : (
          <Box
            sx={{
              position: "fixed",
              left: "-200vw",
              top: 0,
              width: 820,
              pointerEvents: "none",
              opacity: 0,
            }}
          >
            <Box id="invoice-preview">
              <InvoicePrint data={invoiceData} />
            </Box>
          </Box>
        )
      ) : null}
    </Box>
  );
};

export default Invoice;

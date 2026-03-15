import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PhoneIcon from "@mui/icons-material/Phone";
import CloseIcon from "@mui/icons-material/Close";
import toast from "react-hot-toast";
import { getProducts } from "../../services/productService";
import { getCustomers, saveCustomer } from "../../services/customerService";
import { createInvoice, getInvoices, updateInvoice } from "../../services/invoiceService";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const emptyItem = {
  productId: "",
  search: "",
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
  price: 0,
  gst: 0,
  discount: "",
  gstAmount: 0,
  discountAmount: 0,
  total: 0,
  availableStock: null,
  coverageArea: 0,
  confirmed: false,
};
const createEmptyItem = (gst = 0) => ({ ...emptyItem, gst: Number(gst) || 0 });

const defaultShopSettings = {
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  defaultTax: 18,
  defaultDiscount: 0,
  whatsappNumber: "",
};

const salesPersonOptions = ["Owner", "Counter Sales", "Floor Sales"];
const saleTypeOptions = ["Retail Customer", "Dealer", "Contractor", "Builder / Project"];
const transportModeOptions = ["Own Vehicle", "Truck", "Tempo", "Courier", "Other"];
const fmt = (n = 0) => Number(n).toFixed(2);

const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const getCustomerSaleType = (customer) =>
  normalizeCustomerType(customer?.customerType || customer?.saleType || "Retail Customer");

const getCustomerTypeDiscountPct = (customer, saleType) => {
  if (!customer || normalizeCustomerType(saleType) === "Retail Customer") return 0;
  const fromDealerDetails = Number(customer?.dealerDetails?.standardDiscount);
  if (Number.isFinite(fromDealerDetails) && fromDealerDetails > 0) return fromDealerDetails;
  const fromFlat = Number(customer?.standardDiscount);
  if (Number.isFinite(fromFlat) && fromFlat > 0) return fromFlat;
  return 0;
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
  borderRadius: 0,
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
    borderRadius: 0,
    background: "#fff",
    fontSize: 13,
    "& fieldset": { borderColor: "#d8e1eb" },
    "&:hover fieldset": { borderColor: "#1a56a0" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
    "& input::placeholder": { color: "#c0cad8", opacity: 1 },
    "& textarea::placeholder": { color: "#c0cad8", opacity: 1 },
  },
};

const tableInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    background: "#fff",
    fontSize: 13,
    "& fieldset": { borderColor: "#d8e1eb" },
    "&:hover fieldset": { borderColor: "#1a56a0" },
    "&.Mui-focused fieldset": { borderColor: "#1a56a0", borderWidth: 2 },
    "& input::placeholder": { color: "#c0cad8", opacity: 1 },
  },
};

const getSavedSettings = () => {
  try {
    return { ...defaultShopSettings, ...(JSON.parse(localStorage.getItem("shopSettings")) || {}) };
  } catch {
    return defaultShopSettings;
  }
};

const pageBg = "#f0f4f8";
const primary = "#1a56a0";
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
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const convert = (num) => {
    if (num < 20) return ones[num];
    if (num < 100) return `${tens[Math.floor(num/10)]}${num%10?` ${ones[num%10]}`:""}`.trim();
    if (num < 1000) return `${ones[Math.floor(num/100)]} Hundred${num%100?` ${convert(num%100)}`:""}`.trim();
    if (num < 100000) return `${convert(Math.floor(num/1000))} Thousand${num%1000?` ${convert(num%1000)}`:""}`.trim();
    if (num < 10000000) return `${convert(Math.floor(num/100000))} Lakh${num%100000?` ${convert(num%100000)}`:""}`.trim();
    return `${convert(Math.floor(num/10000000))} Crore${num%10000000?` ${convert(num%10000000)}`:""}`.trim();
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

const getRoundedBoxes = (quantity, coverageArea) => {
  const qty = Number(quantity) || 0;
  const coverage = Number(coverageArea) || 0;
  return qty > 0 && coverage > 0 ? Math.ceil(qty / coverage) : "";
};

const normalizeQuoteNo = (val) => String(val || "").trim().toUpperCase();

const resolveProductForItem = (item, products) => {
  if (!item || !Array.isArray(products) || products.length === 0) return null;
  const byId = products.find((p) => String(p._id) === String(item.productId || ""));
  if (byId) return byId;
  return products.find((p) => {
    const sameName = String(p?.name||"").trim().toLowerCase()===String(item?.name||"").trim().toLowerCase();
    const sameSize = String(p?.size||"").trim().toLowerCase()===String(item?.size||"").trim().toLowerCase();
    return sameName && sameSize;
  }) || null;
};

const CustomerBill = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editInvoice = location.state?.editInvoice || null;
  const isEditMode = Boolean(editInvoice?._id);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([createEmptyItem()]);
  const [extraGst, setExtraGst] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [loadingCharge, setLoadingCharge] = useState("");
  const [transportCharge, setTransportCharge] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentType, setPaymentType] = useState("Full Payment");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [payingAmountError, setPayingAmountError] = useState("");
  const [shopSettings, setShopSettings] = useState(defaultShopSettings);
  const [calculator, setCalculator] = useState({ length:"", width:"", wastage:"", coverage:"" });
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name:"", phone:"", alternateMobile:"", city:"", address:"" });
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [quotationList, setQuotationList] = useState([]);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [quotationApplied, setQuotationApplied] = useState(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const quotationLookupTimer = useRef(null);
  const [billMeta, setBillMeta] = useState({
    date: new Date().toISOString().slice(0,10),
    salesPerson: user?.name || salesPersonOptions[0],
    saleType: normalizeCustomerType(saleTypeOptions[0]),
    gstin: "", siteAddress: "", dealerTier: "", paymentTerms: "",
    transportMode: "Own Vehicle", vehicleNo: "", ewayBillNo: "", notes: "",
  });

  const fetchAll = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([getProducts(), getCustomers()]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
    } catch { toast.error("Failed to load products/customers"); }
  };

  useEffect(() => {
    fetchAll();
    const savedSettings = getSavedSettings();
    setShopSettings(savedSettings);
    setExtraGst(savedSettings.defaultTax===0?"":String(savedSettings.defaultTax));
    setExtraDiscount(savedSettings.defaultDiscount===0?"":String(savedSettings.defaultDiscount));
  }, []);

  useEffect(() => {
    const editInvoice = location.state?.editInvoice;
    const editCustomer = location.state?.editCustomer;
    if (!editInvoice) return;
    const normalizedType = normalizeCustomerType(
      editInvoice?.customerType||editInvoice?.saleType||editInvoice?.customer?.customerType||
      editInvoice?.customer?.saleType||editCustomer?.customerType||editCustomer?.saleType
    );
    setSelectedCustomer({
      name: editCustomer?.name||editInvoice?.customer?.name||"",
      phone: editCustomer?.phone||editInvoice?.customer?.phone||"",
      address: editCustomer?.address||editInvoice?.customer?.address||"",
      gstin: editCustomer?.gstin||editInvoice?.customer?.gstin||"",
      customerType: normalizedType, saleType: normalizedType,
      paymentTerms: editCustomer?.paymentTerms||"",
      dealerDetails: { paymentTerms: editCustomer?.paymentTerms||"" },
    });
    setBillMeta((prev) => ({
      ...prev,
      date: (() => { const p=new Date(editInvoice?.date||""); return Number.isNaN(p.getTime())?prev.date:p.toISOString().slice(0,10); })(),
      saleType: normalizedType,
      gstin: editInvoice?.customer?.gstin||editCustomer?.gstin||"",
      siteAddress: editInvoice?.customer?.address||editCustomer?.address||"",
      dealerTier: editInvoice?.customer?.dealerTier||editInvoice?.businessMeta?.dealerTier||"",
      paymentTerms: editInvoice?.customer?.paymentTerms||editInvoice?.businessMeta?.paymentTerms||editCustomer?.paymentTerms||"",
      transportMode: editInvoice?.customer?.transportMode||editInvoice?.businessMeta?.transportMode||"Own Vehicle",
      vehicleNo: editInvoice?.customer?.vehicleNo||editInvoice?.businessMeta?.vehicleNo||"",
      ewayBillNo: editInvoice?.customer?.ewayBillNo||editInvoice?.businessMeta?.ewayBillNo||"",
      notes: editInvoice?.notes||"",
    }));
    const incomingItems = Array.isArray(editInvoice?.items)?editInvoice.items:[];
    setItems(incomingItems.map((item) => ({
      ...(resolveProductForItem(item,products)?{
        coverageArea: getCoveragePerBox(resolveProductForItem(item,products)),
        availableStock: Number(resolveProductForItem(item,products)?.stock??0),
      }:{}),
      ...emptyItem, ...item,
      productId: item.productId||resolveProductForItem(item,products)?._id||"",
      category: item.category||resolveProductForItem(item,products)?.category||"",
      brand: item.brand||resolveProductForItem(item,products)?.brand||"",
      finish: item.finish||resolveProductForItem(item,products)?.finish||"",
      quantity: item.quantity??"",
      boxes: item.boxes??item.box??item.boxCount??(() => {
        const coverage=getCoveragePerBox(resolveProductForItem(item,products));
        return getRoundedBoxes(item.quantity, coverage);
      })(),
      gst: Number(item.gst||0),
      discount: item.discount!==undefined?String(item.discount):"",
      price: Number(item.price||0), total: Number(item.total||0),
      gstAmount: Number(item.gstAmount||0), discountAmount: Number(item.discountAmount||0),
      confirmed: true,
    })));
    setExtraGst(editInvoice?.tax!==undefined?String(editInvoice.tax):"");
    setExtraDiscount(editInvoice?.charges?.extraDiscount!==undefined&&Number(editInvoice.charges.extraDiscount)!==0?String(editInvoice.charges.extraDiscount):"");
    setLoadingCharge(editInvoice?.charges?.loading!==undefined&&Number(editInvoice.charges.loading)!==0?String(editInvoice.charges.loading):"");
    setTransportCharge(editInvoice?.charges?.transport!==undefined&&Number(editInvoice.charges.transport)!==0?String(editInvoice.charges.transport):"");
    setPaymentMethod(editInvoice?.payment?.method||"CASH");
    setPaymentType(editInvoice?.payment?.paymentType||"Full Payment");
    setPartialAmount(editInvoice?.payment?.paidAmount!==undefined?String(editInvoice.payment.paidAmount||""):"");
  }, [location.state, products]);

  const fetchQuotations = async () => {
    if (quotationList.length) return quotationList;
    const res = await getInvoices();
    const all = Array.isArray(res.data) ? res.data : [];
    const quotes = all.filter((inv) => {
      const doc = String(inv?.documentType || "").toLowerCase();
      const no = String(inv?.invoiceNo || "").toUpperCase();
      return doc === "quotation" || no.startsWith("QTN");
    });
    setQuotationList(quotes);
    return quotes;
  };

  const mapQuotationItems = (itemsFromQuote = []) =>
    itemsFromQuote.map((item) => {
      const product = resolveProductForItem(item, products);
      const coverageArea = getCoveragePerBox(product || item);
      const qty = Number(item.quantity) || 0;
      const boxes =
        item.boxes !== undefined && item.boxes !== ""
          ? item.boxes
          : getRoundedBoxes(qty, coverageArea);
      return {
        ...emptyItem,
        ...item,
        productId: item.productId || product?._id || "",
        category: item.category || product?.category || "",
        brand: item.brand || product?.brand || "",
        finish: item.finish || product?.finish || "",
        availableStock: Number(product?.stock ?? 0),
        coverageArea,
        boxes,
        confirmed: true,
      };
    });

  const applyQuotation = (quotation) => {
    if (!quotation) return;
    const qCustomer = quotation.customer || {};
    const normalizedType = normalizeCustomerType(
      quotation?.customerType || quotation?.saleType || qCustomer?.customerType || qCustomer?.saleType
    );
    setSelectedCustomer({
      name: qCustomer?.name || quotation.customerName || "",
      phone: qCustomer?.phone || quotation.customerPhone || "",
      address: qCustomer?.address || quotation.customerAddress || "",
      gstin: qCustomer?.gstin || quotation.customerGstin || "",
      customerType: normalizedType,
      saleType: normalizedType,
      paymentTerms: qCustomer?.paymentTerms || quotation?.paymentTerms || "",
      dealerDetails: { paymentTerms: qCustomer?.paymentTerms || quotation?.paymentTerms || "" },
    });
    setBillMeta((prev) => ({
      ...prev,
      date: (() => { const d = new Date(quotation.date || quotation.createdAt || ""); return Number.isNaN(d.getTime()) ? prev.date : d.toISOString().slice(0,10); })(),
      saleType: normalizedType,
      gstin: qCustomer?.gstin || quotation.customerGstin || "",
      siteAddress: qCustomer?.address || quotation.customerAddress || "",
      paymentTerms: qCustomer?.paymentTerms || quotation?.paymentTerms || "",
      notes: quotation?.notes || "",
    }));
    const incomingItems = Array.isArray(quotation?.items) ? quotation.items : [];
    setItems(mapQuotationItems(incomingItems));
    setExtraGst(quotation?.tax !== undefined ? String(quotation.tax) : "");
    setExtraDiscount(
      quotation?.charges?.extraDiscount !== undefined ? String(quotation.charges.extraDiscount || "") : ""
    );
    setLoadingCharge(quotation?.charges?.loading !== undefined ? String(quotation.charges.loading || "") : "");
    setTransportCharge(quotation?.charges?.transport !== undefined ? String(quotation.charges.transport || "") : "");
    setPaymentMethod("CASH");
    setPaymentType("Full Payment");
    setPartialAmount("");
    setQuotationApplied(quotation);
  };

  const lookupQuotation = async (value) => {
    const raw = normalizeQuoteNo(value);
    if (!raw) return;
    try {
      setQuotationLoading(true);
      const quotes = await fetchQuotations();
      const match = quotes.find((q) => normalizeQuoteNo(q.invoiceNo) === raw);
      if (!match) {
        toast.error("Quotation not found");
        return;
      }
      applyQuotation(match);
      toast.success("Quotation loaded");
    } catch {
      toast.error("Failed to load quotation");
    } finally {
      setQuotationLoading(false);
    }
  };

  useEffect(() => {
    const details = selectedCustomer?.dealerDetails||{};
    if (selectedCustomer?.name) setCustomerSearch(selectedCustomer.name);
    setBillMeta((prev) => ({
      ...prev,
      saleType: getCustomerSaleType(selectedCustomer),
      siteAddress: selectedCustomer?(prev.siteAddress||selectedCustomer.address||""):"",
      gstin: selectedCustomer?(selectedCustomer.gstin||details.gstin||prev.gstin||""):"",
      dealerTier: selectedCustomer?(details.dealerTier||prev.dealerTier||""):"",
      paymentTerms: selectedCustomer?(details.paymentTerms||selectedCustomer.paymentTerms||prev.paymentTerms||""):"",
      notes: selectedCustomer?(details.notes||prev.notes||""):prev.notes,
    }));
  }, [selectedCustomer]);

  const isBusinessSale = billMeta.saleType !== "Retail Customer";

  useEffect(() => {
    if (paymentType !== "Partial") { setPartialAmount(""); setPayingAmountError(""); }
  }, [paymentType]);

  useEffect(() => {
    if (!isBusinessSale) return;
    const advance = Number(partialAmount)||0;
    setPaymentType(advance>0?"Partial":"Full Payment");
  }, [isBusinessSale, partialAmount]);

  const invoiceNumberPreview = useMemo(() => {
    if (isEditMode && editInvoice?.invoiceNo) return editInvoice.invoiceNo;
    const nextNumber = Number(shopSettings.nextInvoiceNumber) || 1;
    return `${shopSettings.invoicePrefix || "INV-"}${nextNumber}`;
  }, [editInvoice?.invoiceNo, isEditMode, shopSettings.invoicePrefix, shopSettings.nextInvoiceNumber]);

  const recalcRow = (row) => {
    const qty = Number(row.quantity)||0;
    const coveragePerBox = Number(row.coverageArea||0);
    const boxes = getRoundedBoxes(qty, coveragePerBox);
    const price = Number(row.price)||0;
    const base = qty*price;
    const gstAmount = (base*(Number(row.gst)||0))/100;
    const discountAmount = (base*(Number(row.discount)||0))/100;
    return { ...row, boxes, gstAmount, discountAmount, total: base+gstAmount-discountAmount };
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem(extraGst)]);
  const removeItem = (index) => setItems((prev) => prev.filter((_,i)=>i!==index));
  const setRow = (index, nextRow) => setItems((prev) => prev.map((row,i) => i===index?recalcRow(nextRow):row));

  const selectProduct = (index, product) => {
    const current = items[index];
    const coverageArea = getCoveragePerBox(product);
    const qty = Number(current.quantity)||0;
    const boxes = getRoundedBoxes(qty, coverageArea);
    setRow(index, {
      ...current,
      productId: product._id, search: product.name||"", code: product.code||"",
      name: product.name||"", size: product.size||"", uom: product.uom||"",
      category: product.category||"", brand: product.brand||"", finish: product.finish||"",
      price: getRateBySaleType(product, billMeta.saleType),
      gst: Number(product.gst??extraGst??0),
      availableStock: Number(product.stock??0),
      coverageArea, quantity: current.quantity||"", boxes,
      colorDesign: product.colorDesign||"",
      discount: current.discount!==undefined&&current.discount!==""?current.discount:"",
      confirmed: false,
    });
  };

  // ── Search bar: add product to table ──
  const handleSearchSelect = (product) => {
    if (!product) return;
    const emptyIndex = items.findIndex((it) => !it.productId);
    if (emptyIndex !== -1) {
      selectProduct(emptyIndex, product);
    } else {
      const coverageArea = getCoveragePerBox(product);
      const newRow = recalcRow({
        ...createEmptyItem(extraGst),
        productId: product._id, search: product.name||"", code: product.code||"",
        name: product.name||"", size: product.size||"", uom: product.uom||"",
        category: product.category||"", brand: product.brand||"", finish: product.finish||"",
        price: getRateBySaleType(product, billMeta.saleType),
        gst: Number(product.gst??extraGst??0),
        availableStock: Number(product.stock??0),
        coverageArea, colorDesign: product.colorDesign||"", confirmed: false,
      });
      setItems((prev) => [...prev, newRow]);
    }
  };

  useEffect(() => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.productId) return row;
        const product = products.find((p) => p._id===row.productId);
        if (!product) return row;
        const nextPrice = getRateBySaleType(product, billMeta.saleType);
        const coverageArea = getCoveragePerBox(product);
        const nextBoxes = row.boxes!==""&&row.boxes!==undefined?row.boxes:
          getRoundedBoxes(row.quantity, coverageArea);
        if (Number(row.price||0)===nextPrice&&Number(row.coverageArea||0)===Number(coverageArea||0)&&
            Number(row.availableStock??0)===Number(product.stock??0)&&String(row.boxes??"")===String(nextBoxes??"")) return row;
        changed = true;
        return recalcRow({ ...row, price: nextPrice, coverageArea, availableStock: Number(product.stock??0), boxes: nextBoxes });
      });
      return changed?next:prev;
    });
  }, [billMeta.saleType, products]);

  const handleItemChange = (index, field, value) => {
    const row = { ...items[index], [field]: value };
    if (field==="search") row.name=value;
    const coveragePerBox = Number(row.coverageArea||0);
    if (field==="quantity") {
      if (isTransientNumberInput(value)) { row.boxes=""; if (field!=="confirmed") row.confirmed=false; setRow(index,row); return; }
      const qty = Number(value)||0;
      row.boxes = getRoundedBoxes(qty, coveragePerBox);
    }
    if (field==="quantity") {
      const qty = Number(row.quantity)||0;
      const stockVal = row.availableStock;
      const max = Number(stockVal);
      if (stockVal!==null&&stockVal!==undefined&&Number.isFinite(max)) {
        if (max<=0&&qty>0) { row.quantity=0; row.boxes=0; toast.error(`"${row.name||"Selected product"}" is out of stock`,{id:`stock-${index}`}); }
        else if (qty>max) {
          row.quantity=max;
          row.boxes=max>0&&coveragePerBox>0?getRoundedBoxes(max, coveragePerBox):row.boxes;
          toast.error(`Only ${max} available for ${row.name||"selected product"}`,{id:`stock-${index}`});
        }
      }
    }
    if (field!=="confirmed") row.confirmed=false;
    setRow(index, row);
  };

  const toggleConfirm = (index) => {
    const row = items[index];
    if (!row.confirmed) {
      if (!row.name||Number(row.quantity)<=0) { toast.error("Select product and enter valid quantity before confirm"); return; }
      setItems((prev) => prev.map((it,i)=>i===index?{...it,confirmed:true}:it));
      return;
    }
    setItems((prev) => prev.map((it,i)=>i===index?{...it,confirmed:false}:it));
  };

  const confirmedItems = useMemo(() => items.filter((item)=>item.confirmed), [items]);
  const totalItemsCount = useMemo(() => confirmedItems.reduce((sum,item)=>sum+(Number(item.quantity)||0),0),[confirmedItems]);
  const itemDiscountAmount = useMemo(() => confirmedItems.reduce((sum,item)=>sum+Number(item.discountAmount||0),0),[confirmedItems]);
  const customerTypeDiscountPct = useMemo(() => getCustomerTypeDiscountPct(selectedCustomer,billMeta.saleType),[selectedCustomer,billMeta.saleType]);

  const totals = useMemo(() => {
    const base = confirmedItems.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.price||0),0);
    const itemGstAmount = confirmedItems.reduce((sum,item)=>sum+Number(item.gstAmount||0),0);
    const subTotal = base+itemGstAmount-itemDiscountAmount;
    const customerTypeDiscountAmount = (subTotal*(Number(customerTypeDiscountPct)||0))/100;
    const loadingAmount = Number(loadingCharge)||0;
    const transportAmount = Number(transportCharge)||0;
    const extraDiscountAmount = Number(extraDiscount)||0;
    const taxable = Math.max(0,subTotal+loadingAmount+transportAmount-extraDiscountAmount-customerTypeDiscountAmount);
    const extraGstAmount = (taxable*(Number(extraGst)||0))/100;
    const finalAmount = taxable+extraGstAmount;
    return { base, itemGstAmount, subTotal, customerTypeDiscountAmount, loadingAmount, transportAmount, extraDiscountAmount, taxable, extraGstAmount, finalAmount };
  }, [confirmedItems,customerTypeDiscountPct,extraDiscount,extraGst,itemDiscountAmount,loadingCharge,transportCharge]);

  useEffect(() => {
    if (paymentType!=="Partial") { setPayingAmountError(""); return; }
    const val = Number(partialAmount)||0;
    if (val>totals.finalAmount) setPayingAmountError(`Cannot exceed Rs.${fmt(totals.finalAmount)}`);
    else if (val<=0) setPayingAmountError("Must be greater than 0");
    else setPayingAmountError("");
  }, [partialAmount, paymentType, totals.finalAmount]);

  const paymentSummary = useMemo(() => {
    if (paymentType==="Pending") return { paidAmount:0, dueAmount:totals.finalAmount, status:"Pending" };
    if (paymentType==="Partial") {
      const paid = Math.max(0,Math.min(Number(partialAmount)||0,totals.finalAmount));
      return { paidAmount:paid, dueAmount:Math.max(0,totals.finalAmount-paid), status:paid>0?"Partial":"Pending" };
    }
    return { paidAmount:totals.finalAmount, dueAmount:0, status:"Paid" };
  }, [partialAmount, paymentType, totals.finalAmount]);

  const statusColor = {
    Paid: { background:"#e8f5ee", color:"#1a7a4a" },
    Partial: { background:"#fef3e8", color:"#d4820a" },
    Pending: { background:"#fdf0ee", color:"#c0392b" },
  };

  const generateInvoiceNo = () => `${shopSettings.invoicePrefix||"INV-"}${Number(shopSettings.nextInvoiceNumber)||1}`;

  const incrementInvoiceCounter = () => {
    try {
      const saved = getSavedSettings();
      const nextValue = (Number(saved.nextInvoiceNumber)||1)+1;
      const updated = { ...saved, nextInvoiceNumber:nextValue };
      localStorage.setItem("shopSettings",JSON.stringify(updated));
      setShopSettings(updated);
    } catch { toast.error("Invoice counter could not be updated"); }
  };

  const validateBeforeSave = () => {
    if (!selectedCustomer?.name) { toast.error("Select customer"); return false; }
    if (confirmedItems.length===0) { toast.error("Confirm at least one item"); return false; }
    if (paymentType==="Partial"&&(Number(partialAmount)<=0||Number(partialAmount)>=totals.finalAmount)) {
      toast.error("Advance amount should be greater than 0 and less than total"); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSave()) return;
    const customerBusinessDetails = selectedCustomer?.dealerDetails||{};
    const basePayment = editInvoice?.payment || {};
    const paidAmount = Number(basePayment.paidAmount ?? (paymentType === "Partial" ? partialAmount : 0) ?? 0);
    const dueAmount = Math.max(0, totals.finalAmount - paidAmount);
    const computedStatus = dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";
    const computedPaymentType = dueAmount <= 0 ? "Full Payment" : paidAmount > 0 ? "Partial" : "Pending";
    const invoiceNo = isEditMode ? (editInvoice?.invoiceNo || generateInvoiceNo()) : generateInvoiceNo();
    const payload = {
      customer: {
        name:selectedCustomer.name||"", phone:selectedCustomer.phone||"",
        address:billMeta.siteAddress||selectedCustomer.address||"", gstin:billMeta.gstin||"",
        dealerTier:billMeta.dealerTier||"", paymentTerms:billMeta.paymentTerms||"",
        transportMode:billMeta.transportMode||"", vehicleNo:billMeta.vehicleNo||"", ewayBillNo:billMeta.ewayBillNo||"",
        bankAccountNo:customerBusinessDetails.bankAccountNo||selectedCustomer.bankAccountNo||"",
        ifscCode:customerBusinessDetails.ifscCode||selectedCustomer.ifscCode||"",
        accountHolder:customerBusinessDetails.ownerName||selectedCustomer.accountHolder||"",
        customerType:normalizeCustomerType(billMeta.saleType||saleTypeOptions[0]),
        saleType:normalizeCustomerType(billMeta.saleType||saleTypeOptions[0]),
      },
      items: confirmedItems.map((item) => ({
        productId:item.productId, code:item.code, name:item.name, category:item.category,
        finish:item.finish, colorDesign:item.colorDesign,
        quantity:Number(item.quantity)||0, boxes:Number(item.boxes)||0,
        size:item.size, uom:item.uom, price:Number(item.price)||0,
        gst:Number(item.gst)||0, discount:Number(item.discount)||0,
        gstAmount:Number(item.gstAmount)||0, discountAmount:Number(item.discountAmount)||0,
        total:Number(item.total)||0,
      })),
      tax:Number(extraGst)||0, discount:0,
      taxAmount:totals.extraGstAmount,
      discountAmount:totals.extraDiscountAmount+itemDiscountAmount+totals.customerTypeDiscountAmount,
      charges:{
        loading:totals.loadingAmount, transport:totals.transportAmount,
        extraDiscount:totals.extraDiscountAmount, customerTypeDiscount:totals.customerTypeDiscountAmount,
        customerTypeDiscountPct,
      },
      notes:billMeta.notes, salesPerson:billMeta.salesPerson,
      customerType:normalizeCustomerType(billMeta.saleType||saleTypeOptions[0]),
      saleType:normalizeCustomerType(billMeta.saleType||saleTypeOptions[0]),
      businessMeta:isBusinessSale?{
        dealerTier:billMeta.dealerTier||"", paymentTerms:billMeta.paymentTerms||"",
        transportMode:billMeta.transportMode||"", vehicleNo:billMeta.vehicleNo||"",
        ewayBillNo:billMeta.ewayBillNo||"",
        bankAccountNo:customerBusinessDetails.bankAccountNo||selectedCustomer.bankAccountNo||"",
        ifscCode:customerBusinessDetails.ifscCode||selectedCustomer.ifscCode||"",
        accountHolder:customerBusinessDetails.ownerName||selectedCustomer.accountHolder||"",
      }:undefined,
      payment:{
        ...basePayment,
        method: paymentMethod || basePayment.method || "CASH",
        amount: totals.finalAmount,
        paidAmount,
        dueAmount,
        paymentType: computedPaymentType,
      },
      reduceStockNow:false, status: computedStatus, invoiceNo,
      date:new Date(`${billMeta.date}T${new Date().toTimeString().slice(0,8)}`).toLocaleString(),
    };
    setLoading(true);
    try {
      if (isEditMode && editInvoice?._id) {
        await updateInvoice(editInvoice._id, payload);
        toast.success("Bill updated");
        navigate(-1);
      } else {
        const res = await createInvoice(payload);
        await saveCustomer({ ...payload.customer, amount:totals.finalAmount, status:computedStatus, method:"" });
        incrementInvoiceCounter();
        const createdInvoice = res?.data||{};
        toast.success("Moved to payment");
        resetBillForm();
        navigate("/customers/payments", {
          state: {
            fromMoveToPayment:true,
            prefillCustomer:{ name:payload.customer?.name||"", phone:payload.customer?.phone||"" },
            prefillInvoice:{ id:createdInvoice?._id||"", invoiceNo:createdInvoice?.invoiceNo||payload.invoiceNo||"", dueAmount:Number(createdInvoice?.payment?.dueAmount||payload.payment?.dueAmount||0) },
          },
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error|| (isEditMode ? "Failed to update bill" : "Failed to create bill"));
    } finally { setLoading(false); }
  };

  const resetBillForm = () => {
    const savedSettings = getSavedSettings();
    setSelectedCustomer(null);
    setItems([createEmptyItem(savedSettings.defaultTax)]);
    setExtraGst(savedSettings.defaultTax===0?"":String(savedSettings.defaultTax));
    setExtraDiscount(savedSettings.defaultDiscount===0?"":String(savedSettings.defaultDiscount));
    setLoadingCharge(""); setTransportCharge(""); setPaymentMethod("CASH"); setPaymentType("Full Payment");
    setPartialAmount(""); setPayingAmountError("");
    setBillMeta({
      date:new Date().toISOString().slice(0,10), salesPerson:user?.name||salesPersonOptions[0],
      saleType:normalizeCustomerType(saleTypeOptions[0]), gstin:"", siteAddress:"",
      dealerTier:"", paymentTerms:"", transportMode:"Own Vehicle", vehicleNo:"", ewayBillNo:"", notes:"",
    });
  };

  const summaryRows = [
    ["Subtotal",`Rs.${fmt(totals.subTotal)}`],
    ["Item Discounts",`-Rs.${fmt(itemDiscountAmount)}`],
    ["Loading Charges",`+Rs.${fmt(totals.loadingAmount)}`],
    ["Special Discount",`-Rs.${fmt(totals.extraDiscountAmount)}`],
    [`Customer Type Discount (${fmt(customerTypeDiscountPct)}%)`,`-Rs.${fmt(totals.customerTypeDiscountAmount)}`],
    ["Transport",`+Rs.${fmt(totals.transportAmount)}`],
    [`GST (${Number(extraGst)||0}%)`,`Rs.${fmt(totals.extraGstAmount)}`],
    ["Total",`Rs.${fmt(totals.finalAmount)}`,true],
    ["Advance Received",`-Rs.${fmt(paymentSummary.paidAmount)}`],
    ["Balance Due",`Rs.${fmt(paymentSummary.dueAmount)}`,true,"danger"],
  ];

  const customerOptions = useMemo(() => customers, [customers]);

  const calculatorResult = useMemo(() => {
    const length=Number(calculator.length)||0, width=Number(calculator.width)||0;
    const wastage=Number(calculator.wastage)||0, coverage=Number(calculator.coverage)||0;
    const area=length*width, areaWithWastage=area*(1+wastage/100);
    return { area, areaWithWastage, boxesNeeded:coverage>0?Math.ceil(areaWithWastage/coverage):0 };
  }, [calculator]);

  const topDateLabel = useMemo(() => {
    const parsed = new Date(`${billMeta.date}T00:00:00`);
    return Number.isNaN(parsed.getTime())?billMeta.date:parsed.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  }, [billMeta.date]);

  const handleQuickCustomerSave = async () => {
    if (!quickCustomer.name.trim() || !quickCustomer.phone.trim()) {
      toast.error("Name and phone are required"); return;
    }
    if (quickCustomer.phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number"); return;
    }
    setQuickCustomerLoading(true);
    try {
      await saveCustomer({ ...quickCustomer, customerType:"Retail Customer", amount:0, status:"Pending", method:"", paymentTerms:"Cash Only" });
      const newCust = { name:quickCustomer.name, phone:quickCustomer.phone, address:quickCustomer.address, city:quickCustomer.city, customerType:"Retail Customer", saleType:"Retail Customer" };
      setCustomers((prev) => [...prev, newCust]);
      setSelectedCustomer(newCust);
      toast.success("Customer added & selected");
      setQuickCustomer({ name:"", phone:"", alternateMobile:"", city:"", address:"" });
      setAddCustomerOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save customer");
    } finally { setQuickCustomerLoading(false); }
  };

  return (
    <>
    <Box sx={{ py:{ xs:1.5, md:2 }, background:pageBg, minHeight:"100%" }}>
      <Box sx={{ mb:2.4, px:{ xs:0.6, md:0.8 } }}>
        <Typography sx={{ fontSize:{ xs:24, md:30 }, fontWeight:800, color:"#0f172a", lineHeight:1.1 }}>
          {isBusinessSale?"New Business Bill":"New Retail Bill"}
        </Typography>
        <Typography sx={{ mt:0.55, fontSize:12.5, color:"#64748b" }}>{topDateLabel}</Typography>
      </Box>

      <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", lg:"minmax(0, 2fr) minmax(320px, 0.95fr)" }, gap:2.2, alignItems:"start" }}>
        <Box sx={{ display:"contents" }}>

          {/* ── Bill Header ── */}
          <Card sx={{ ...sectionCardSx, gridColumn:"1 / -1", gridRow:{ lg:1 } }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Box component="span" sx={{ color:"#a78bfa" }}>🧾</Box>
                New Retail Sale Bill
              </Typography>
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <Autocomplete
                freeSolo
                options={customerOptions}
                value={null}
                inputValue={headerSearch}
                onInputChange={(_, value, reason) => {
                  setHeaderSearch(value);
                  if (reason === "input") {
                    const q = normalizeQuoteNo(value);
                    if (q.startsWith("QTN")) {
                      const cached = quotationList.find((x) => normalizeQuoteNo(x.invoiceNo) === q);
                      if (cached) {
                        applyQuotation(cached);
                      } else if (q.length >= 6) {
                        if (quotationLookupTimer.current) clearTimeout(quotationLookupTimer.current);
                        quotationLookupTimer.current = setTimeout(() => {
                          lookupQuotation(q);
                        }, 400);
                      }
                    }
                  }
                }}
                onChange={(_, value) => {
                  if (value) {
                    setSelectedCustomer(value);
                    setHeaderSearch(value.name || "");
                  }
                }}
                getOptionLabel={(option) => option?.name || ""}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toLowerCase().trim();
                  if (!q) return options;
                  return options.filter((o) =>
                    (o.name || "").toLowerCase().includes(q) ||
                    (o.phone || "").includes(q) ||
                    (o.alternateMobile || "").includes(q)
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Search customer / quotation no"
                    sx={{ ...inputSx, minWidth: 260 }}
                    onBlur={(e) => {
                      const q = normalizeQuoteNo(e.target.value);
                      if (q.startsWith("QTN")) lookupQuotation(q);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const q = normalizeQuoteNo(e.currentTarget.value);
                        if (q.startsWith("QTN")) lookupQuotation(q);
                      }
                    }}
                  />
                )}
              />
              <Tooltip title={billMeta.saleType==="Retail Customer"?"Quick add retail customer":"Go to Create Customer for business accounts"}>
                <Button size="small" variant="outlined"
                    startIcon={<PersonAddAlt1Icon sx={{ fontSize:14 }} />}
                    onClick={()=>{ if(billMeta.saleType==="Retail Customer"){ setAddCustomerOpen(true); } else { navigate("/customers/create"); } }}
                    sx={{ borderRadius: 0, textTransform:"none", fontSize:12, fontWeight:600, px:1.4, py:0.5, borderColor:"#c6d9f0", color:primary, whiteSpace:"nowrap", "&:hover":{ background:"#edf4ff", borderColor:primary } }}>
                    Add Customer
                  </Button>
                </Tooltip>
                <Box
                  sx={{
                    minWidth: 132,
                    px: 1.2,
                    py: 0.65,
                    border: "1px solid #c6d9f0",
                    background: "#f8fbff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 0.2,
                  }}
                >
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: muted, letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1.2 }}>
                    Invoice No
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: primary, lineHeight: 1.2 }}>
                    {invoiceNumberPreview}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ p:2.2 }}>
              {isBusinessSale&&(
                <Box sx={{ mb:1.5, p:1.1, borderRadius: 0, background:"#f4efff", border:"1px solid #dacdf8", color:"#5a35a5", fontSize:12, fontWeight:600 }}>
                  Bulk / business mode enabled for selected customer type.
                </Box>
              )}
              <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"repeat(4, 1fr)" }, gap:1.5, mb:1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Date *</Typography>
                  <TextField fullWidth size="small" type="date" value={billMeta.date} onChange={(e)=>setBillMeta((prev)=>({...prev,date:e.target.value}))} sx={inputSx} InputLabelProps={{ shrink:true }} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Payment Type</Typography>
                  <TextField select fullWidth size="small" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} sx={inputSx}>
                    {["Cash","Credit (Udhari)","UPI / GPay","PhonePe","Cheque","NEFT/RTGS"].map((option)=>(
                      <MenuItem key={option} value={option==="Cash"?"CASH":option}>{option}</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Sales Person</Typography>
                  <TextField select fullWidth size="small" value={billMeta.salesPerson} onChange={(e)=>setBillMeta((prev)=>({...prev,salesPerson:e.target.value}))} sx={inputSx}>
                    {[...new Set([billMeta.salesPerson,`${user?.name||"Murugan"} (Owner)`,...salesPersonOptions])].filter(Boolean).map((option)=>(
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Type</Typography>
                  <TextField fullWidth size="small" value={billMeta.saleType} sx={inputSx} InputProps={{ readOnly:true }} />
                </Box>
              </Box>
              <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"repeat(4, 1fr)" }, gap:1.5, mb:1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Customer Name *</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={selectedCustomer?.name || ""}
                    sx={inputSx}
                    InputProps={{ readOnly: true }}
                  />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Mobile</Typography>
                  <TextField fullWidth size="small" value={selectedCustomer?.phone||""} sx={inputSx}
                    InputProps={{ readOnly:true, startAdornment: selectedCustomer?.phone ? <InputAdornment position="start"><PhoneIcon sx={{ fontSize:14, color:"#94a3b8" }} /></InputAdornment> : null }} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>GSTIN (for Business)</Typography>
                  <TextField fullWidth size="small" value={billMeta.gstin} onChange={(e)=>setBillMeta((prev)=>({...prev,gstin:e.target.value.toUpperCase()}))} sx={inputSx} />
                </Box>
                <Box>
                  <Typography sx={fieldLabelSx}>Dealer / Business Tier</Typography>
                  <TextField fullWidth size="small" value={billMeta.dealerTier} onChange={(e)=>setBillMeta((prev)=>({...prev,dealerTier:e.target.value}))} sx={inputSx} />
                </Box>
              </Box>
              {isBusinessSale&&(
                <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"repeat(4, 1fr)" }, gap:1.5 }}>
                  <Box>
                    <Typography sx={fieldLabelSx}>Payment Terms</Typography>
                    <TextField fullWidth size="small" value={billMeta.paymentTerms} onChange={(e)=>setBillMeta((prev)=>({...prev,paymentTerms:e.target.value}))} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Transport Mode</Typography>
                    <TextField select fullWidth size="small" value={billMeta.transportMode} onChange={(e)=>setBillMeta((prev)=>({...prev,transportMode:e.target.value}))} sx={inputSx}>
                      {transportModeOptions.map((option)=>(<MenuItem key={option} value={option}>{option}</MenuItem>))}
                    </TextField>
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>Lorry / Vehicle No.</Typography>
                    <TextField fullWidth size="small" value={billMeta.vehicleNo} onChange={(e)=>setBillMeta((prev)=>({...prev,vehicleNo:e.target.value.toUpperCase()}))} sx={inputSx} />
                  </Box>
                  <Box>
                    <Typography sx={fieldLabelSx}>E-Way Bill No.</Typography>
                    <TextField fullWidth size="small" value={billMeta.ewayBillNo} onChange={(e)=>setBillMeta((prev)=>({...prev,ewayBillNo:e.target.value}))} sx={inputSx} />
                  </Box>
                </Box>
              )}
              <Box sx={{ mt:1.5, display:"grid", gridTemplateColumns:{ xs:"1fr", md:"1fr 1fr" }, gap:1.5 }}>
                <Box>
                  <Typography sx={fieldLabelSx}>Site / Delivery Address</Typography>
                  <TextField fullWidth size="small" value={billMeta.siteAddress} onChange={(e)=>setBillMeta((prev)=>({...prev,siteAddress:e.target.value}))} sx={inputSx} placeholder="Site address" />
                </Box>
              </Box>
            </Box>
          </Card>

          {/* ── Tile Items ── */}
          <Card sx={{ ...sectionCardSx, mt:2.2, background:"#f3f5f7", borderRadius: 0, gridColumn:"1 / -1", gridRow:{ lg:2 } }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}>
                <Inventory2OutlinedIcon sx={{ color:"#b45309", fontSize:16 }} />
                Tile Items
              </Typography>
              <Chip label={`${items.filter((i)=>i.productId).length} added`} size="small" sx={{ background:"#fff4eb", color:"#b45309", fontWeight:700 }} />
            </Box>

            <Box sx={{ p:2 }}>

              {/* ── Search Bar ── */}
              <Box
                sx={{
                  mb:2, display:"flex", alignItems:"center", gap:1.2,
                  p:"10px 14px", borderRadius: 0, background:"#fff",
                  border:"1.5px solid #c6d9f0",
                  boxShadow:"0 2px 10px rgba(26,86,160,0.07)",
                  transition:"border-color 0.15s, box-shadow 0.15s",
                  "&:focus-within":{ borderColor:primary, boxShadow:"0 2px 16px rgba(26,86,160,0.13)" },
                }}
              >
                <SearchIcon sx={{ color:"#94a3b8", fontSize:20, flexShrink:0 }} />
                <Autocomplete
                  options={products}
                  getOptionLabel={(option)=>[option.name, option.size].filter(Boolean).join(" — ")}
                  filterOptions={(options, { inputValue }) => {
                    const q = inputValue.toLowerCase();
                    return options.filter((p)=>
                      (p.name||"").toLowerCase().includes(q)||
                      (p.code||"").toLowerCase().includes(q)||
                      (p.size||"").toLowerCase().includes(q)||
                      (p.category||"").toLowerCase().includes(q)||
                      (p.brand||"").toLowerCase().includes(q)
                    );
                  }}
                  value={null}
                  onChange={(_,product)=>handleSearchSelect(product)}
                  renderInput={(params)=>(
                    <TextField
                      {...params} size="small"
                      placeholder="Search item name, barcode or item code..."
                      variant="standard"
                      InputProps={{ ...params.InputProps, disableUnderline:true, sx:{ fontSize:13.5, color:"#0f172a" } }}
                      sx={{ flex:1, "& .MuiInputBase-root":{ background:"transparent" }, "& input::placeholder":{ color:"#b0bec5", opacity:1, fontStyle:"italic" }, "& input:focus::placeholder":{ opacity:0 } }}
                    />
                  )}
                  renderOption={(props, option)=>(
                    <Box component="li" {...props}
                      sx={{ display:"flex", flexDirection:"column", alignItems:"flex-start !important",
                            py:"8px !important", px:"14px !important",
                            borderBottom:"1px solid #f1f5f9", "&:last-child":{ borderBottom:"none" } }}
                    >
                      <Box sx={{ display:"flex", alignItems:"center", gap:1, width:"100%" }}>
                        <Typography sx={{ fontSize:13.5, fontWeight:600, color:"#0f172a", flex:1 }}>{option.name}</Typography>
                        {option.size&&<Typography sx={{ fontSize:11.5, color:"#64748b", fontWeight:500 }}>{option.size}</Typography>}
                        <Typography sx={{
                          fontSize:11, fontWeight:700,
                          color:Number(option.stock)>0?"#1a7a4a":"#c0392b",
                          background:Number(option.stock)>0?"#e8f5ee":"#fdf0ee",
                          px:0.8, py:0.2, borderRadius: 0,
                        }}>
                          Stock: {option.stock??0}
                        </Typography>
                      </Box>
                      <Box sx={{ display:"flex", gap:0.8, mt:0.5, flexWrap:"wrap" }}>
                        {option.code&&<Chip label={`# ${option.code}`} size="small" sx={{ height:17, fontSize:10, background:"#f1f5f9", color:"#475569" }} />}
                        {option.category&&<Chip label={option.category} size="small" sx={{ height:17, fontSize:10, background:"#edf4ff", color:"#1a56a0" }} />}
                        {option.brand&&<Chip label={option.brand} size="small" sx={{ height:17, fontSize:10, background:"#fef3e8", color:"#d4820a" }} />}
                        {option.finish&&<Chip label={option.finish} size="small" sx={{ height:17, fontSize:10, background:"#f5f0ff", color:"#7c3aed" }} />}
                      </Box>
                    </Box>
                  )}
                  sx={{ flex:1 }}
                  clearOnBlur blurOnSelect openOnFocus disableClearable={false}
                  noOptionsText="No products found"
                  ListboxProps={{ sx:{ maxHeight:320, p:0 } }}
                />
                <Box sx={{ fontSize:11, color:"#94a3b8", flexShrink:0, display:{ xs:"none", sm:"block" } }}>
                  {products.length} items
                </Box>
              </Box>

              {/* ── Table ── */}
              <TableContainer sx={{ borderRadius:0, border:"1.5px solid #c8d8ec", overflow:"hidden" }}>
                <Table size="small" sx={{ width:"100%", tableLayout:"fixed", borderCollapse:"collapse", "& .MuiTableCell-root":{ px:0.65, borderRight:"1px solid #e2ecf4", "&:last-child":{ borderRight:"none" } }, "& .MuiTableBody-root .MuiTableRow-root":{ "&:nth-of-type(even)":{ background:"#f0f7ff" }, "&:nth-of-type(odd)":{ background:"#fff" }, "& td":{ borderBottom:"1px solid #e2ecf4" } }, "& .MuiTableBody-root .MuiTableRow-root:hover":{ background:"#dbeafe !important" } }}>
                  <TableHead>
                    <TableRow sx={{ background:"#1a56a0" }}>
                      {[
                        { label:"Tile / Product", w:"16%" },{ label:"Category", w:"7%" },{ label:"Brand", w:"6%" },
                        { label:"Finish", w:"6%" },{ label:"Color/Design", w:"7%" },{ label:"Size", w:"5%" },
                        { label:"Qty(sqft)", w:"8%" },{ label:"Boxes", w:"6%" },{ label:"Rate/sqft", w:"6%" },
                        { label:"GST%", w:"5%" },{ label:"Disc%", w:"6%" },{ label:"Amount(Rs)", w:"6%" },{ label:"", w:"6%" },
                      ].map(({ label, w })=>(
                        <TableCell key={label} sx={{ color:"#fff", fontWeight:700, py:1.4, px:1, whiteSpace:"nowrap", fontSize:12, width:w, borderRight:"1px solid rgba(255,255,255,0.18)", "&:last-child":{ borderRight:"none" } }}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index)=>{
                      const coveragePerBox = getCoveragePerBox(item);
                      const boxesValue = item.boxes!==""&&item.boxes!==undefined?item.boxes:item.quantity===""?"":getRoundedBoxes(item.quantity, coveragePerBox);
                      return (
                        <TableRow key={`${item.productId||"row"}-${index}`} hover>
                          <TableCell sx={{ verticalAlign:"middle", py:0.5, px:0.8 }}>
                            <TextField size="small" fullWidth value={item.name||""} sx={tableInputSx} InputProps={{ readOnly:true }} placeholder="—" />
                          </TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={item.category||""} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={item.brand||""} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={item.finish||""} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={item.colorDesign||""} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={item.size} onChange={(e)=>handleItemChange(index,"size",e.target.value)} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth type="number" value={item.quantity} onChange={(e)=>handleItemChange(index,"quantity",e.target.value)} sx={tableInputSx} placeholder="0" inputProps={{ min:0, max:item.availableStock??undefined, step:"0.01" }} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={boxesValue!==""?boxesValue:""} sx={tableInputSx} InputProps={{ readOnly:true }} placeholder="—" /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth type="number" value={item.price} onChange={(e)=>handleItemChange(index,"price",e.target.value)} sx={tableInputSx} /></TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}>
                            <TextField size="small" fullWidth value={item.gst!==undefined&&item.gst!==null?`${item.gst}%`:""} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0, background:"#f0fdf4", fontSize:13, fontWeight:700, color:"#166534", "& fieldset":{ borderColor:"#bbf7d0" }, "& input":{ textAlign:"center", color:"#166534", fontWeight:700 } } }} InputProps={{ readOnly:true }} placeholder="0%" />
                          </TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}>
                            <TextField size="small" fullWidth type="number" value={item.discount} onChange={(e)=>handleItemChange(index,"discount",e.target.value)}
                              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0, background:"#fffbeb", fontSize:13, fontWeight:700, "& fieldset":{ borderColor:"#fde68a" }, "& input":{ textAlign:"center", color:"#92400e", fontWeight:700, "&::placeholder":{ color:"#d97706", opacity:0.5 } }, "&:hover fieldset":{ borderColor:"#f59e0b" }, "&.Mui-focused fieldset":{ borderColor:"#f59e0b", borderWidth:2 } } }}
                              placeholder="0%" inputProps={{ min:0, max:100, step:"0.1" }}
                              InputProps={{ endAdornment: item.discount ? <Box component="span" sx={{ fontSize:12, color:"#92400e", fontWeight:700, mr:0.5, whiteSpace:"nowrap" }}>%</Box> : null }}
                            />
                          </TableCell>
                          <TableCell sx={{ py:0.5, px:0.8 }}><TextField size="small" fullWidth value={fmt(item.total)} sx={tableInputSx} InputProps={{ readOnly:true }} /></TableCell>
                          <TableCell sx={{ whiteSpace:"nowrap", textAlign:"center", py:0.5, px:0.5 }}>
                            <IconButton size="small" onClick={()=>handleSearchSelect(products.find(p=>p._id===item.productId)||null)} title="Re-select product" sx={{ color:"#1a56a0", "&:hover":{ background:"#edf4ff" } }}>
                              <EditIcon sx={{ fontSize:15 }} />
                            </IconButton>
                            <IconButton size="small" onClick={()=>toggleConfirm(index)} sx={{ color:item.confirmed?"#15803d":"#64748b" }}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={()=>removeItem(index)} sx={{ color:"#c0392b" }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length===0&&(
                      <TableRow>
                        <TableCell colSpan={13} align="center" sx={{ py:2.8, color:muted, fontSize:18, borderBottom:"none", background:"transparent" }}>
                          Search or add a tile to start billing
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ borderTop:`1px solid ${border}`, mt:2.2, pt:1.8 }}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem}
                  sx={{ borderRadius: 0, textTransform:"none", borderColor:"#c6d2e0", color:"#1c2333", px:2.2, py:0.7 }}>
                  Add Tile
                </Button>
              </Box>
            </Box>
          </Card>

          {/* ── Charges + Calculator ── */}
          <Box sx={{ mt:{ xs:2.2, lg:0 }, gridColumn:{ xs:"1 / -1", lg:"1 / 2" }, gridRow:{ lg:3 } }}>
            <Card sx={sectionCardSx}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}><Box component="span" sx={{ color:"#7c3aed" }}>+</Box> Charges</Typography>
              </Box>
              <Box sx={{ p:2.1 }}>
                <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"repeat(4, 1fr)" }, gap:1.5 }}>
                  <Box><Typography sx={fieldLabelSx}>Loading Charges (Rs.)</Typography><TextField size="small" fullWidth type="number" value={loadingCharge} onChange={(e)=>setLoadingCharge(e.target.value)} placeholder="0" sx={inputSx} /></Box>
                  <Box><Typography sx={fieldLabelSx}>Transport (Rs.)</Typography><TextField size="small" fullWidth type="number" value={transportCharge} onChange={(e)=>setTransportCharge(e.target.value)} placeholder="0" sx={inputSx} /></Box>
                  <Box><Typography sx={fieldLabelSx}>GST Rate</Typography>
                    <TextField select size="small" fullWidth value={extraGst} onChange={(e)=>setExtraGst(e.target.value)} sx={inputSx}>
                      {["0","5","12","18","28"].map((option)=>(<MenuItem key={option} value={option}>{option}%</MenuItem>))}
                    </TextField>
                  </Box>
                  <Box><Typography sx={fieldLabelSx}>Advance / Token (Rs.)</Typography><TextField size="small" fullWidth type="number" value={partialAmount} onChange={(e)=>setPartialAmount(e.target.value)} placeholder="0" sx={inputSx} /></Box>
                  <Box sx={{ gridColumn:{ xs:"span 1", md:"span 2" } }}><Typography sx={fieldLabelSx}>Special Scheme Discount (Rs.)</Typography><TextField size="small" fullWidth type="number" value={extraDiscount} onChange={(e)=>setExtraDiscount(e.target.value)} placeholder="0" sx={inputSx} /></Box>
                  <Box sx={{ gridColumn:{ xs:"span 1", md:"span 2" } }}><Typography sx={fieldLabelSx}>Internal Notes</Typography><TextField size="small" fullWidth value={billMeta.notes} onChange={(e)=>setBillMeta((prev)=>({...prev,notes:e.target.value}))} sx={inputSx} placeholder="Scheme / Remarks" /></Box>
                </Box>
              </Box>
            </Card>
            <Card sx={{ ...sectionCardSx, mt:1.2 }}>
              <Box sx={cardHeaderSx}>
                <Typography sx={panelTitleSx}><Box component="span" sx={{ color:"#ef4444" }}>*</Box> Quick Tile Calculator</Typography>
              </Box>
              <Box sx={{ p:2.1 }}>
                <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5 }}>
                  <Box><Typography sx={fieldLabelSx}>Room Length (ft)</Typography><TextField size="small" fullWidth value={calculator.length} onChange={(e)=>setCalculator((prev)=>({...prev,length:e.target.value}))} sx={inputSx} placeholder="0" /></Box>
                  <Box><Typography sx={fieldLabelSx}>Room Width (ft)</Typography><TextField size="small" fullWidth value={calculator.width} onChange={(e)=>setCalculator((prev)=>({...prev,width:e.target.value}))} sx={inputSx} placeholder="0" /></Box>
                  <Box><Typography sx={fieldLabelSx}>Wastage %</Typography><TextField size="small" fullWidth value={calculator.wastage} onChange={(e)=>setCalculator((prev)=>({...prev,wastage:e.target.value}))} sx={inputSx} placeholder="0" /></Box>
                  <Box><Typography sx={fieldLabelSx}>Coverage/Box (sqft)</Typography><TextField size="small" fullWidth value={calculator.coverage} onChange={(e)=>setCalculator((prev)=>({...prev,coverage:e.target.value}))} sx={inputSx} placeholder="0" /></Box>
                </Box>
                <Box sx={{ mt:1.6, p:1.2, borderRadius: 0, background:"#e8f5ee", color:"#166534", fontSize:12 }}>
                  <strong>Room Area:</strong> {fmt(calculatorResult.area)} sqft{"  |  "}
                  <strong>With {calculator.wastage||0}% wastage:</strong> {fmt(calculatorResult.areaWithWastage)} sqft{"  |  "}
                  <strong>Boxes needed:</strong> {calculatorResult.boxesNeeded} boxes
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* ── Bill Summary ── */}
        <Box sx={{ display:"contents" }}>
          <Card sx={{ ...sectionCardSx, gridColumn:{ xs:"1 / -1", lg:"2 / 3" }, gridRow:{ lg:3 } }}>
            <Box sx={cardHeaderSx}>
              <Typography sx={panelTitleSx}><Box component="span" sx={{ color:"#d97706" }}>💰</Box> Bill Summary</Typography>
            </Box>
            <Box sx={{ p:2.1 }}>
              <Box component="table" sx={{ width:"100%", borderCollapse:"collapse" }}>
                <Box component="tbody">
                  {summaryRows.map(([label,value,bold,tone])=>(
                    <Box component="tr" key={label} sx={{ borderTop:bold?`1px solid ${border}`:"none" }}>
                      <Box component="td" sx={{ py:0.9, color:tone==="danger"?"#c0392b":muted, fontWeight:bold?700:500 }}>{label}</Box>
                      <Box component="td" sx={{ py:0.9, textAlign:"right", fontWeight:800, color:tone==="danger"?"#c0392b":bold?primary:"#1c2333", fontSize:bold?15:13 }}>{value}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ mt:1.4, p:1.2, borderRadius: 0, background:"#edf4ff", color:primary, fontSize:11.5, fontStyle:"italic" }}>
                Amount: {toWords(totals.finalAmount)}
              </Box>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={loading}
                sx={{ mt:1.5, borderRadius: 0, py:1.15, textTransform:"none", fontWeight:700, width:"100%", background:"#1a7a4a", "&:hover":{ background:"#146038" } }}>
                {loading ? (isEditMode ? "Saving..." : "Moving...") : (isEditMode ? "Save Bill" : "Move to Payment")}
              </Button>
              <Box sx={{ display:"flex", gap:1, flexWrap:"wrap", mt:1.5 }}>
                <Chip label={`${confirmedItems.length} items confirmed`} size="small" sx={{ background:"#eefaf2", color:"#1a7a4a" }} />
                <Chip label={`${fmt(totalItemsCount)} qty`} size="small" sx={{ background:"#fff4eb", color:"#d4820a" }} />
                <Chip label={paymentSummary.status} size="small" sx={statusColor[paymentSummary.status]} />
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>

    {/* ── Quick Add Retail Customer Dialog ── */}
    <Dialog open={addCustomerOpen} onClose={()=>setAddCustomerOpen(false)} maxWidth="xs" fullWidth
      PaperProps={{ sx:{ borderRadius: 0, boxShadow:"0 24px 60px rgba(15,35,60,0.18)" } }}>
      <DialogTitle sx={{ pb:1, pt:2.5, px:3, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:1.2 }}>
          <Box sx={{ width:32, height:32, borderRadius: 0, background:"linear-gradient(135deg,#1a56a0,#0f3d7a)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <PersonAddAlt1Icon sx={{ fontSize:17, color:"#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize:15, fontWeight:800, color:"#0f172a", lineHeight:1.2 }}>Quick Add Customer</Typography>
            <Typography sx={{ fontSize:11, color:"#64748b" }}>Retail Customer only</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={()=>setAddCustomerOpen(false)} sx={{ color:"#94a3b8", "&:hover":{ background:"#f1f5f9" } }}>
          <CloseIcon sx={{ fontSize:18 }} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px:3, pt:2.5, pb:1 }}>
        <Box sx={{ display:"flex", flexDirection:"column", gap:1.8 }}>
          <Box>
            <Typography sx={{ ...fieldLabelSx, mb:0.6 }}>Full Name *</Typography>
            <TextField fullWidth size="small" placeholder="e.g. Ravi Kumar" value={quickCustomer.name}
              onChange={(e)=>setQuickCustomer((p)=>({...p,name:e.target.value}))} sx={inputSx} />
          </Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5 }}>
            <Box>
              <Typography sx={{ ...fieldLabelSx, mb:0.6 }}>Mobile *</Typography>
              <TextField fullWidth size="small" placeholder="10-digit" value={quickCustomer.phone}
                inputProps={{ maxLength:10 }}
                onChange={(e)=>setQuickCustomer((p)=>({...p,phone:e.target.value.replace(/[^0-9]/g,"").slice(0,10)}))}
                sx={inputSx}
                InputProps={{ startAdornment:<InputAdornment position="start"><PhoneIcon sx={{ fontSize:14, color:"#94a3b8" }} /></InputAdornment> }}
              />
            </Box>
            <Box>
              <Typography sx={{ ...fieldLabelSx, mb:0.6 }}>Alternate Mobile</Typography>
              <TextField fullWidth size="small" placeholder="Optional" value={quickCustomer.alternateMobile}
                inputProps={{ maxLength:10 }}
                onChange={(e)=>setQuickCustomer((p)=>({...p,alternateMobile:e.target.value.replace(/[^0-9]/g,"").slice(0,10)}))}
                sx={inputSx} />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ ...fieldLabelSx, mb:0.6 }}>City</Typography>
            <TextField fullWidth size="small" placeholder="e.g. Chennai" value={quickCustomer.city}
              onChange={(e)=>setQuickCustomer((p)=>({...p,city:e.target.value}))} sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={{ ...fieldLabelSx, mb:0.6 }}>Address</Typography>
            <TextField fullWidth size="small" placeholder="Street, Area, Pincode" value={quickCustomer.address}
              onChange={(e)=>setQuickCustomer((p)=>({...p,address:e.target.value}))} sx={inputSx} />
          </Box>
          <Box sx={{ p:1.2, borderRadius: 0, background:"#edf4ff", border:"1px solid #bfdbfe" }}>
            <Typography sx={{ fontSize:11, color:primary, lineHeight:1.6 }}>
              For <strong>Dealer / Contractor / Builder</strong> customers, use the full
              <Box component="span" onClick={()=>{ setAddCustomerOpen(false); navigate("/customers/create"); }}
                sx={{ color:primary, fontWeight:700, cursor:"pointer", textDecoration:"underline", mx:0.5 }}>
                Create Customer
              </Box>
              page for complete business details.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px:3, py:2.2, gap:1 }}>
        <Button onClick={()=>setAddCustomerOpen(false)} variant="outlined" size="small"
          sx={{ borderRadius: 0, textTransform:"none", fontWeight:600, borderColor:"#dbe5f0", color:"#64748b", px:2.5 }}>
          Cancel
        </Button>
        <Button onClick={handleQuickCustomerSave} variant="contained" size="small" disabled={quickCustomerLoading}
          sx={{ borderRadius: 0, textTransform:"none", fontWeight:700, px:3, background:"linear-gradient(135deg,#1a56a0,#0f3d7a)", "&:hover":{ background:"linear-gradient(135deg,#164888,#0d3570)" } }}>
          {quickCustomerLoading ? "Saving..." : "Save & Select"}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CustomerBill;

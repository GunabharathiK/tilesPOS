import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  IconButton,
  MenuItem,
  Grid,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useEffect } from "react";
import { getProducts } from "../services/productService";
import API from "../services/api";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import InvoicePrint from "../components/billing/InvoicePrint";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Invoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    district: "",
    state: "",
    pincode: "",
  });

  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [payment, setPayment] = useState({ method: "CASH", amount: "" });
  const [invoiceData, setInvoiceData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data);
  };

  useEffect(() => {
    if (state) {
      if (typeof state.customer === "object") {
        setCustomer(state.customer);
      } else {
        setCustomer((prev) => ({ ...prev, name: state.customer || "" }));
      }
      setItems(state.items || []);
      setTax(state.tax || "");
      setDiscount(state.discount || "");
      setPayment(state.payment || { method: "CASH", amount: "" });
      setIsPaid(state.status === "Paid");
    }
  }, [state]);

  const generateInvoiceNo = () => "INV" + Date.now();

  const addItem = () => {
    setItems([...items, {
      productId: "",
      code: "",
      name: "",
      quantity: "",
      size: "",
      uom: "",
      price: 0,
      total: 0,
    }]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "productId") {
      const selected = products.find((p) => p._id === value);
      updated[index].price = selected?.price || 0;
      updated[index].name = selected?.name || "";
      updated[index].code = selected?.code || "";
      updated[index].size = selected?.size || "";
      updated[index].uom = selected?.uom || "";
      updated[index].availableStock = selected?.stock ?? null; // ✅ store available stock
    }

    if (field === "name") {
      updated[index].name = value;
    }

    // ✅ Stock validation when quantity changes
    if (field === "quantity") {
      const qty = Number(value) || 0;
      const availableStock = updated[index].availableStock;

      if (availableStock !== null && availableStock !== undefined) {
        if (availableStock <= 0) {
          toast.error(`"${updated[index].name || "This product"}" is out of stock!`);
          updated[index].quantity = 0;
          updated[index].total = 0;
          setItems(updated);
          return;
        }
        if (qty > availableStock) {
          toast.error(
            `Only ${availableStock} ${updated[index].uom || "units"} available for "${updated[index].name}"`,
            { id: `stock-${index}` }  // prevent duplicate toasts
          );
          updated[index].quantity = availableStock; // cap at max available
          updated[index].total =
            Number(updated[index].price) * availableStock;
          setItems(updated);
          return;
        }
      }
    }

    const price = Number(updated[index].price) || 0;
    const qty = Number(updated[index].quantity) || 0;
    updated[index].total = price * qty;

    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const taxAmount = (total * (Number(tax) || 0)) / 100;
  const discountAmount = (total * (Number(discount) || 0)) / 100;
  const finalAmount = total + taxAmount - discountAmount;

  useEffect(() => {
    setPayment((prev) => ({ ...prev, amount: finalAmount }));
  }, [finalAmount]);

  const handleCustomerChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!customer.name) {
      toast.error("Customer name is required");
      return;
    }

    // ✅ Must have at least one item
    if (items.length === 0) {
      toast.error("Add at least one item to generate a bill");
      return;
    }

    // ✅ Each item must have a name and valid quantity
    const invalidItem = items.find((i) => !i.name || !i.quantity || Number(i.quantity) <= 0);
    if (invalidItem) {
      toast.error("Each item must have a product and valid quantity");
      return;
    }

    const data = {
      customer, items, tax, discount, taxAmount, discountAmount,
      payment, status: "Pending",
      invoiceNo: generateInvoiceNo(),
      date: new Date().toLocaleString(),
    };
    try {
      const res = await API.post("/invoices", data);
      setInvoiceData(res.data);
      toast.success("Invoice Created ✅");
    } catch {
      toast.error("Error ❌");
    }
  };

  const updateStatus = async (paid) => {
    try {
      await API.put(`/invoices/${invoiceData._id}`, { status: paid ? "Paid" : "Pending" });
      setIsPaid(paid);
      toast.success("Status Updated ✅");
    } catch {
      toast.error("Update failed ❌");
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById("invoice-preview");
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Invoice-${invoiceData.invoiceNo}.pdf`);
  };

  const handlePrint = () => { window.print(); };

  const handleDone = () => {
    setCustomer({ name: "", phone: "", address: "", district: "", state: "", pincode: "" });
    setItems([]);
    setTax("");
    setDiscount("");
    setPayment({ method: "CASH", amount: "" });
    setInvoiceData(null);
    setIsPaid(false);
    navigate("/CustomerList");
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={2}>Create Invoice</Typography>

      {/* CUSTOMER DETAILS */}
      <Typography variant="subtitle1" fontWeight="bold" mb={1} color="text.secondary">
        Customer Details
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Customer Name *" name="name" fullWidth value={customer.name} onChange={handleCustomerChange} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Phone Number" name="phone" fullWidth inputProps={{ maxLength: 10 }} value={customer.phone} onChange={handleCustomerChange} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Address" name="address" fullWidth multiline rows={2} value={customer.address} onChange={handleCustomerChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="District" name="district" fullWidth value={customer.district} onChange={handleCustomerChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="State" name="state" fullWidth value={customer.state} onChange={handleCustomerChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Pincode" name="pincode" fullWidth inputProps={{ maxLength: 6 }} value={customer.pincode} onChange={handleCustomerChange} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* ITEMS */}
      <Typography variant="subtitle1" fontWeight="bold" mb={1} color="text.secondary">
        Items
      </Typography>

      <Button variant="contained" onClick={addItem}>+ Add Item</Button>

      {/* Column Labels */}
      {items.length > 0 && (
        <Box sx={{ display: "flex", gap: 1.5, mt: 2, px: 0.5 }}>
          <Typography sx={{ minWidth: 190, fontSize: 12, color: "text.secondary" }}>Product</Typography>
          <Typography sx={{ width: 90, fontSize: 12, color: "text.secondary" }}>Code</Typography>
          <Typography sx={{ width: 70, fontSize: 12, color: "text.secondary" }}>Qty</Typography>
          <Typography sx={{ width: 90, fontSize: 12, color: "text.secondary" }}>Size</Typography>
          <Typography sx={{ width: 90, fontSize: 12, color: "text.secondary" }}>UOM</Typography>
          <Typography sx={{ width: 95, fontSize: 12, color: "text.secondary" }}>Price/Unit</Typography>
          <Typography sx={{ width: 105, fontSize: 12, color: "text.secondary" }}>Total</Typography>
        </Box>
      )}

      {items.map((item, index) => (
        <Box key={index} sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap", alignItems: "center" }}>

          {/* Product Search */}
          <Box sx={{ position: "relative", minWidth: 190 }}>
            <TextField
              size="small"
              placeholder="Search product..."
              value={item.name}
              onChange={(e) => {
                handleItemChange(index, "name", e.target.value);
                setActiveIndex(index);
              }}
              fullWidth
            />
            {activeIndex === index && item.name && (
              <Box sx={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#fff", border: "1px solid #ccc", borderRadius: 1,
                zIndex: 10, maxHeight: 160, overflowY: "auto", boxShadow: 2,
              }}>
                {products
                  .filter((p) => p.name.toLowerCase().includes(item.name.toLowerCase()))
                  .slice(0, 5)
                  .map((p) => (
                    <Box
                      key={p._id}
                      sx={{
                        padding: "8px", cursor: p.stock <= 0 ? "not-allowed" : "pointer",
                        fontSize: 13,
                        background: p.stock <= 0 ? "#fef2f2" : "#fff",
                        "&:hover": { background: p.stock <= 0 ? "#fef2f2" : "#f1f5f9" },
                      }}
                      onClick={() => {
                        if (p.stock <= 0) {
                          toast.error(`"${p.name}" is out of stock!`);
                          return;
                        }
                        handleItemChange(index, "productId", p._id);
                        setActiveIndex(null);
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <strong>{p.name}</strong>
                          {p.code && <span style={{ color: "#15803d", marginLeft: 6, fontSize: 12 }}>[{p.code.toUpperCase()}]</span>}
                          {p.size && <span style={{ color: "#555", marginLeft: 6, fontSize: 12 }}>{p.size}</span>}
                          <span style={{ color: "#888", marginLeft: 6, fontSize: 12 }}>₹{p.price}</span>
                        </Box>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
                          background: p.stock <= 0 ? "#fee2e2" : p.stock < 10 ? "#fef3c7" : "#dcfce7",
                          color: p.stock <= 0 ? "#b91c1c" : p.stock < 10 ? "#92400e" : "#166534",
                          marginLeft: 8,
                        }}>
                          {p.stock <= 0 ? "Out of stock" : `Stock: ${p.stock}`}
                        </span>
                      </Box>
                    </Box>
                  ))}
              </Box>
            )}
          </Box>

          {/* Code (readonly — auto filled) */}
          <TextField
            size="small"
            placeholder="Code"
            sx={{ width: 90 }}
            value={item.code ? item.code.toUpperCase() : ""}
            disabled
          />

          {/* Qty */}
          <Box sx={{ position: "relative" }}>
            <TextField
              size="small"
              placeholder="Qty"
              type="number"
              sx={{ width: 75 }}
              value={item.quantity}
              disabled={item.availableStock !== undefined && item.availableStock !== null && item.availableStock <= 0}
              inputProps={{
                min: 0,
                max: item.availableStock ?? undefined,
              }}
              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
              helperText={
                item.availableStock !== null && item.availableStock !== undefined
                  ? item.availableStock <= 0
                    ? "Out of stock"
                    : `Max: ${item.availableStock}`
                  : ""
              }
              FormHelperTextProps={{
                sx: {
                  fontSize: 10,
                  color: item.availableStock <= 0 ? "error.main" : "text.secondary",
                  mx: 0,
                },
              }}
            />
          </Box>

          {/* Size (editable) */}
          <TextField
            size="small" placeholder="e.g. 2X2" sx={{ width: 90 }}
            value={item.size}
            onChange={(e) => handleItemChange(index, "size", e.target.value)}
          />

          {/* UOM (editable) */}
          <TextField
            size="small" placeholder="UOM" sx={{ width: 90 }}
            value={item.uom}
            onChange={(e) => handleItemChange(index, "uom", e.target.value)}
          />

          {/* Price (readonly) */}
          <TextField size="small" value={`₹${item.price}`} sx={{ width: 95 }} disabled />

          {/* Total (readonly) */}
          <TextField size="small" value={`₹${Number(item.total).toFixed(2)}`} sx={{ width: 105 }} disabled />

          <IconButton color="error" onClick={() => removeItem(index)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Divider sx={{ my: 3 }} />

      {/* TAX & DISCOUNT */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField label="Tax %" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
        <TextField label="Discount %" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </Box>

      <Typography sx={{ mt: 2, fontWeight: "bold", fontSize: 18 }}>
        Final: ₹{finalAmount.toFixed(2)}
      </Typography>

      <Button
        sx={{ mt: 2 }}
        variant="contained"
        onClick={handleSubmit}
        disabled={items.length === 0}
      >
        Generate Invoice
      </Button>

      {/* INVOICE PREVIEW */}
      {invoiceData && (
        <Box mt={5}>
          <Box id="invoice-preview">
            <InvoicePrint data={invoiceData} />
          </Box>

          <Box mt={3} display="flex" gap={2}>
            <Button variant={isPaid ? "contained" : "outlined"} color="success" onClick={() => updateStatus(true)}>
              Payment Received
            </Button>
            <Button variant={!isPaid ? "contained" : "outlined"} color="warning" onClick={() => updateStatus(false)}>
              Pending
            </Button>
          </Box>

          <Box mt={3} display="flex" justifyContent="space-between">
            <TextField
              select label="Method" size="small" value={payment.method}
              onChange={(e) => setPayment({ ...payment, method: e.target.value })}
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
            </TextField>
            <Box display="flex" gap={2}>
              <Button onClick={handleDownload}>Download PDF</Button>
              <Button onClick={handlePrint}>Print</Button>
            </Box>
          </Box>

          <Button fullWidth sx={{ mt: 3 }} variant="contained" color="success" onClick={handleDone}>
            Done
          </Button>
        </Box>
      )}
    </Card>
  );
};

export default Invoice;

import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  IconButton,
  Grid,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useState, useEffect } from "react";
import { getProducts } from "../services/productService";
import API from "../services/api";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import InvoicePrint from "../components/billing/InvoicePrint";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const emptyCustomer = {
  name: "",
  phone: "",
  address: "",
};

const Invoice = ({ mode = "invoice" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const isQuotation = mode === "quotation";

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [payment, setPayment] = useState({ method: "CASH", amount: "" });
  const [invoiceData, setInvoiceData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);

  const [customerLocked, setCustomerLocked] = useState(false);
  const [itemLocks, setItemLocks] = useState([]);

  const itemHeadCellSx = {
    fontSize: 13,
    fontWeight: 700,
    color: "text.secondary",
    whiteSpace: "nowrap",
  };
  const itemTableCellSx = { py: 1, px: 1, verticalAlign: "top" };

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await getProducts();
      setProducts(Array.isArray(res.data) ? res.data : []);
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

    const incomingItems = Array.isArray(state.items) ? state.items : [];
    setItems(incomingItems);
    setItemLocks(incomingItems.map(() => false));

    setTax(state.tax || "");
    setDiscount(state.discount || "");
    setPayment(state.payment || { method: "CASH", amount: "" });
    setIsPaid(state.status === "Paid");
  }, [state]);

  const generateInvoiceNo = () => (isQuotation ? "QTN" : "INV") + Date.now();

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        code: "",
        name: "",
        quantity: "",
        size: "",
        uom: "",
        price: 0,
        total: 0,
      },
    ]);
    setItemLocks((prev) => [...prev, false]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "productId") {
      const selected = products.find((p) => p._id === value);
      updated[index].price =
        selected?.totalPrice ??
        (Number(selected?.price || 0) * (1 + Number(selected?.gst || 0) / 100));
      updated[index].name = selected?.name || "";
      updated[index].code = selected?.code || "";
      updated[index].size = selected?.size || "";
      updated[index].uom = selected?.uom || "";
      updated[index].availableStock = selected?.stock ?? null;
    }

    if (field === "name") {
      updated[index].name = value;
    }

    if (field === "quantity" && !isQuotation) {
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
            { id: `stock-${index}` }
          );
          updated[index].quantity = availableStock;
          updated[index].total = Number(updated[index].price) * availableStock;
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
    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemLocks((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmItem = (index) => {
    setItemLocks((prev) => prev.map((locked, i) => (i === index ? true : locked)));
    if (activeIndex === index) setActiveIndex(null);
  };

  const editItem = (index) => {
    setItemLocks((prev) => prev.map((locked, i) => (i === index ? false : locked)));
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

  const canConfirmCustomer =
    customer.name.trim() && customer.phone.trim() && customer.address.trim();

  const handleConfirmCustomer = () => {
    if (!canConfirmCustomer) {
      toast.error("Please fill Customer Name, Phone Number, and Address before confirming");
      return;
    }
    setCustomerLocked(true);
  };

  const handleSubmit = async () => {
    if (!customer.name) {
      toast.error("Customer name is required");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one item to generate a bill");
      return;
    }

    const invalidItem = items.find((i) => !i.name || !i.quantity || Number(i.quantity) <= 0);
    if (invalidItem) {
      toast.error("Each item must have a product and valid quantity");
      return;
    }

    const data = {
      customer,
      items,
      tax,
      discount,
      taxAmount,
      discountAmount,
      payment,
      status: "Pending",
      invoiceNo: generateInvoiceNo(),
      date: new Date().toLocaleString(),
    };

    try {
      if (isQuotation) {
        setInvoiceData(data);
        toast.success("Quotation Created");
      } else {
        const res = await API.post("/invoices", data);
        setInvoiceData(res.data);
        toast.success("Invoice Created");
      }
    } catch {
      toast.error("Error");
    }
  };

  const updateStatus = async (paid) => {
    try {
      await API.put(`/invoices/${invoiceData._id}`, { status: paid ? "Paid" : "Pending" });
      setIsPaid(paid);
      toast.success("Status Updated");
    } catch {
      toast.error("Update failed");
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
    pdf.save(`${isQuotation ? "Quotation" : "Invoice"}-${invoiceData.invoiceNo}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    setCustomer(emptyCustomer);
    setItems([]);
    setItemLocks([]);
    setTax("");
    setDiscount("");
    setPayment({ method: "CASH", amount: "" });
    setInvoiceData(null);
    setIsPaid(false);
    setCustomerLocked(false);
    toast.success("Done");
    navigate(isQuotation ? "/quotation" : "/CustomerList");
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        {isQuotation ? "Create Quotation" : "Create Invoice"}
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
          Customer Details
        </Typography>
      </Box>

      <Card
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          borderColor: "#bfdbfe",
          background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Customer Name *"
              name="name"
              fullWidth
              required
              value={customer.name}
              onChange={handleCustomerChange}
              disabled={isQuotation && customerLocked}
              sx={{ "& .MuiOutlinedInput-root": { background: "#ffffff" } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Phone Number *"
              name="phone"
              fullWidth
              required
              inputProps={{ maxLength: 10 }}
              value={customer.phone}
              onChange={handleCustomerChange}
              disabled={isQuotation && customerLocked}
              sx={{ "& .MuiOutlinedInput-root": { background: "#ffffff" } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label="Address *"
                name="address"
                fullWidth
                required
                value={customer.address}
                onChange={handleCustomerChange}
                disabled={isQuotation && customerLocked}
                sx={{ "& .MuiOutlinedInput-root": { background: "#ffffff" } }}
              />
              {isQuotation && !customerLocked && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={handleConfirmCustomer}
                  disabled={!canConfirmCustomer}
                  sx={{ height: 40, minWidth: 116, whiteSpace: "nowrap" }}
                >
                  Confirm
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>

      {isQuotation && customerLocked && (
        <Card
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            borderColor: "#86efac",
            background: "linear-gradient(90deg, #f0fdf4 0%, #ecfeff 100%)",
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" fontWeight={700} color="success.dark">
              Customer Confirmed
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => setCustomerLocked(false)}
            >
              Edit
            </Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Name</Typography>
              <Typography fontWeight={600}>{customer.name || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <Typography fontWeight={600}>{customer.phone || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <Typography fontWeight={600}>{customer.address || "-"}</Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" mb={1} color="text.secondary">
        Items
      </Typography>

      <Button variant="contained" onClick={addItem}>+ Add Item</Button>

      {items.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, overflow: "visible" }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead sx={{ background: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={itemHeadCellSx}>Product</TableCell>
                <TableCell sx={itemHeadCellSx}>Code</TableCell>
                <TableCell sx={itemHeadCellSx}>Qty</TableCell>
                <TableCell sx={itemHeadCellSx}>Size</TableCell>
                <TableCell sx={itemHeadCellSx}>UOM</TableCell>
                <TableCell sx={itemHeadCellSx}>Price/Unit</TableCell>
                <TableCell sx={itemHeadCellSx}>Total</TableCell>
                <TableCell sx={itemHeadCellSx}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => {
                const filteredProducts = products
                  .filter((p) => p.name.toLowerCase().includes((item.name || "").toLowerCase()))
                  .slice(0, 5);

                return (
                  <TableRow key={index}>
                    <TableCell sx={{ ...itemTableCellSx, minWidth: 320, position: "relative" }}>
                      <TextField
                        size="small"
                        placeholder="Search product..."
                        value={item.name}
                        disabled={isQuotation && itemLocks[index]}
                        onFocus={() => setActiveIndex(index)}
                        onChange={(e) => {
                          handleItemChange(index, "name", e.target.value);
                          setActiveIndex(index);
                        }}
                        fullWidth
                      />

                      {activeIndex === index && !(isQuotation && itemLocks[index]) && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: "calc(100% - 6px)",
                            left: 8,
                            right: 8,
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: 1,
                            zIndex: 30,
                            minHeight: filteredProducts.length === 0 ? 250 : "auto",
                            overflowY: "hidden",
                            boxShadow: 2,
                          }}
                        >
                          {filteredProducts.map((p) => (
                            <Box
                              key={p._id}
                              sx={{
                                padding: "8px",
                                cursor: p.stock <= 0 && !isQuotation ? "not-allowed" : "pointer",
                                fontSize: 13,
                                background: p.stock <= 0 && !isQuotation ? "#fef2f2" : "#fff",
                                "&:hover": { background: p.stock <= 0 && !isQuotation ? "#fef2f2" : "#f1f5f9" },
                              }}
                              onClick={() => {
                                if (p.stock <= 0 && !isQuotation) {
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
                                  <span style={{ color: "#888", marginLeft: 6, fontSize: 12 }}>
                                    Rs.{(p.totalPrice ?? (Number(p.price || 0) * (1 + Number(p.gst || 0) / 100))).toFixed(2)}
                                  </span>
                                </Box>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    background: p.stock <= 0 ? "#fee2e2" : p.stock < 10 ? "#fef3c7" : "#dcfce7",
                                    color: p.stock <= 0 ? "#b91c1c" : p.stock < 10 ? "#92400e" : "#166534",
                                    marginLeft: 8,
                                  }}
                                >
                                  {p.stock <= 0 ? "Out of stock" : `Stock: ${p.stock}`}
                                </span>
                              </Box>
                            </Box>
                          ))}
                          {filteredProducts.length === 0 && (
                            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary", fontSize: 13 }}>
                              No products found
                            </Box>
                          )}
                        </Box>
                      )}
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 110 }}>
                      <TextField size="small" placeholder="Code" fullWidth value={item.code ? item.code.toUpperCase() : ""} disabled />
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 90 }}>
                      <TextField
                        size="small"
                        placeholder="Qty"
                        type="number"
                        fullWidth
                        value={item.quantity}
                        disabled={(isQuotation && itemLocks[index]) || (!isQuotation && item.availableStock !== undefined && item.availableStock !== null && item.availableStock <= 0)}
                        inputProps={{
                          min: 0,
                          max: isQuotation ? undefined : item.availableStock ?? undefined,
                        }}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        helperText={
                          !isQuotation && item.availableStock !== null && item.availableStock !== undefined
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
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 110 }}>
                      <TextField
                        size="small"
                        placeholder="e.g. 2X2"
                        fullWidth
                        value={item.size}
                        disabled={isQuotation && itemLocks[index]}
                        onChange={(e) => handleItemChange(index, "size", e.target.value)}
                      />
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 110 }}>
                      <TextField
                        size="small"
                        placeholder="UOM"
                        fullWidth
                        value={item.uom}
                        disabled={isQuotation && itemLocks[index]}
                        onChange={(e) => handleItemChange(index, "uom", e.target.value)}
                      />
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 130 }}>
                      <TextField size="small" value={`Rs.${item.price}`} fullWidth disabled />
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 130 }}>
                      <TextField size="small" value={`Rs.${Number(item.total).toFixed(2)}`} fullWidth disabled />
                    </TableCell>

                    <TableCell sx={{ ...itemTableCellSx, minWidth: 140 }}>
                      {isQuotation ? (
                        <Box display="flex" gap={0.5}>
                          <IconButton color="success" size="small" onClick={() => confirmItem(index)} title="Confirm">
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                          <IconButton color="primary" size="small" onClick={() => editItem(index)} title="Edit">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton color="error" size="small" onClick={() => removeItem(index)} title="Delete">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <IconButton color="error" size="small" onClick={() => removeItem(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField label="Tax %" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
        <TextField label="Discount %" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </Box>

      <Typography sx={{ mt: 2, fontWeight: "bold", fontSize: 18 }}>
        Final: Rs.{finalAmount.toFixed(2)}
      </Typography>

      <Button sx={{ mt: 2 }} variant="contained" onClick={handleSubmit} disabled={items.length === 0}>
        {isQuotation ? "Generate Quotation" : "Generate Invoice"}
      </Button>

      {invoiceData && (
        <Box mt={5}>
          <Box id="invoice-preview">
            <InvoicePrint data={invoiceData} />
          </Box>

          {!isQuotation && (
            <Box mt={3} display="flex" gap={2}>
              <Button variant={isPaid ? "contained" : "outlined"} color="success" onClick={() => updateStatus(true)}>
                Payment Received
              </Button>
              <Button variant={!isPaid ? "contained" : "outlined"} color="warning" onClick={() => updateStatus(false)}>
                Pending
              </Button>
            </Box>
          )}

          <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
            <Button onClick={handlePrint}>Print</Button>
            <Button onClick={handleDownload}>Download PDF</Button>
            <Button variant="contained" color="success" onClick={handleDone}>Done</Button>
          </Box>
        </Box>
      )}
    </Card>
  );
};

export default Invoice;

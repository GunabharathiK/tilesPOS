import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { useState, useEffect } from "react";
import { getProducts, updateProduct, deleteProduct } from "../../services/productService";
import toast from "react-hot-toast";

const UOM_OPTIONS = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];
const GST_OPTIONS = [0, 5, 12, 18, 28];

const calcTotalPrice = (price, gst) =>
  Number((Number(price || 0) * (1 + Number(gst || 0) / 100)).toFixed(2));

const getImageSrc = (p = {}) => {
  const raw = p.image || p.productImage || p.img || p.photo || "";
  if (!raw || typeof raw !== "string") return "";
  if (raw.startsWith("data:image") || raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Backward compatibility: DB may contain only base64 payload without data URI prefix.
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 64) return `data:image/jpeg;base64,${raw}`;
  return raw;
};

const ProductDetails = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(0);
  const [stockF, setStockF] = useState("ALL");
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const startEdit = (p) => {
    setEditId(p._id);
      setEditRow({
        name: p.name,
        code: p.code || "",
        price: p.price,
        totalPrice: p.totalPrice ?? calcTotalPrice(p.price, p.gst),
        stock: p.stock,
        size: p.size || "",
        uom: p.uom || "",
        gst: p.gst ?? "",
        image: getImageSrc(p),
      });
  };

  const handleEditChange = (field, value) => {
    setEditRow((r) => {
      const next = { ...r, [field]: value };
      next.totalPrice = calcTotalPrice(next.price, next.gst);
      return next;
    });
  };

  const handleEditImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleEditChange("image", reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (id) => {
    const r = editRow;
    if (!r.name || !r.code || !r.price || !r.stock || !r.size || !r.uom || r.gst === "") {
      toast.error("All fields are required");
      return;
    }
    try {
      await updateProduct(id, {
        ...r,
        totalPrice: calcTotalPrice(r.price, r.gst),
      });
      toast.success("Updated");
      setEditId(null);
      fetchProducts();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await deleteProduct(id);
    toast.success("Deleted");
    fetchProducts();
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      (p.supplierName || "").toLowerCase().includes(q);
    const matchStock = stockF === "LOW" ? p.stock < 10 : stockF === "HIGH" ? p.stock >= 10 : true;
    const matchTab = tab === 1 ? !p.isSupplierItem : tab === 2 ? p.isSupplierItem : true;
    return matchSearch && matchStock && matchTab;
  });

  const allCount = products.length;
  const ownCount = products.filter((p) => !p.isSupplierItem).length;
  const supCount = products.filter((p) => p.isSupplierItem).length;

  return (
    <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <Box p={2.5}>
        <Typography variant="h6" fontWeight={700} mb={2}>Product Details</Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 2,
            "& .MuiTabs-indicator": { background: "#1d4ed8" },
            "& .MuiTab-root": { fontWeight: 600, textTransform: "none", fontSize: 14 },
            "& .Mui-selected": { color: "#1d4ed8 !important" },
          }}
        >
          <Tab label={<Box display="flex" alignItems="center" gap={1}>All <Chip label={allCount} size="small" sx={{ height: 18, fontSize: 11 }} /></Box>} />
          <Tab label={<Box display="flex" alignItems="center" gap={1}>Own Products <Chip label={ownCount} size="small" sx={{ height: 18, fontSize: 11, background: "#eff6ff", color: "#1d4ed8" }} /></Box>} />
          <Tab label={<Box display="flex" alignItems="center" gap={1}>Supplier Items <Chip label={supCount} size="small" sx={{ height: 18, fontSize: 11, background: "#f5f3ff", color: "#6d28d9" }} /></Box>} />
        </Tabs>

        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Search name, code or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 260 }}
          />
          <TextField
            select
            label="Stock"
            value={stockF}
            onChange={(e) => setStockF(e.target.value)}
            size="small"
            sx={{ width: 160 }}
          >
            <MenuItem value="ALL">All Stock</MenuItem>
            <MenuItem value="LOW">Low (&lt;10)</MenuItem>
            <MenuItem value="HIGH">In Stock (&gt;=10)</MenuItem>
          </TextField>
        </Box>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead sx={{ background: "#f1f5f9" }}>
            <TableRow>
              {["#", "Image", "Name", "Code", "Price", "GST%", "Total Price", "GST Amt", "Size", "UOM", "Stock", "Type", "Actions"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p, i) => {
              const isEdit = editId === p._id;
              const rowImageSrc = getImageSrc(p);
              const gstAmt = (Number(p.price) * Number(p.gst || 0) / 100).toFixed(2);
              const totalPrice = Number(p.totalPrice ?? calcTotalPrice(p.price, p.gst)).toFixed(2);
              return (
                <TableRow key={p._id} hover sx={{ background: isEdit ? "#f0f9ff" : "inherit" }}>
                  <TableCell>{i + 1}</TableCell>

                  <TableCell>
                    {isEdit ? (
                      <Box component="label" htmlFor={`det-img-${p._id}`} sx={{ cursor: "pointer" }}>
                        <Avatar src={editRow.image} variant="rounded" sx={{ width: 40, height: 40, background: "#e2e8f0" }}>
                          {!editRow.image && <AddPhotoAlternateIcon fontSize="small" />}
                        </Avatar>
                        <input id={`det-img-${p._id}`} type="file" accept="image/*" hidden onChange={handleEditImage} />
                      </Box>
                    ) : (
                      <Avatar src={rowImageSrc} variant="rounded" sx={{ width: 40, height: 40, background: "#e2e8f0" }}>
                        {!rowImageSrc && p.name?.[0]?.toUpperCase()}
                      </Avatar>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEdit ? (
                      <TextField size="small" sx={{ width: 120 }} value={editRow.name} onChange={(e) => handleEditChange("name", e.target.value)} />
                    ) : (
                      <Typography fontWeight={500} fontSize={13}>{p.name}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField size="small" sx={{ width: 90 }} value={editRow.code} onChange={(e) => handleEditChange("code", e.target.value)} inputProps={{ style: { textTransform: "uppercase" } }} />
                    ) : (
                      <Chip label={p.code?.toUpperCase() || "-"} size="small" sx={{ background: "#f0fdf4", color: "#15803d", fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField size="small" type="number" sx={{ width: 85 }} value={editRow.price} onChange={(e) => handleEditChange("price", e.target.value)} />
                    ) : (
                      `Rs${p.price}`
                    )}
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField select size="small" sx={{ width: 80 }} value={editRow.gst} onChange={(e) => handleEditChange("gst", e.target.value)}>
                        {GST_OPTIONS.map((g) => (
                          <MenuItem key={g} value={g}>{g}%</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Chip label={`${p.gst ?? 0}%`} size="small" sx={{ background: "#fef3c7", color: "#92400e" }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "#1d4ed8", fontWeight: 700 }}>
                    {isEdit ? `Rs${Number(editRow.totalPrice || 0).toFixed(2)}` : `Rs${totalPrice}`}
                  </TableCell>
                  <TableCell sx={{ color: "#15803d", fontWeight: 600 }}>Rs{gstAmt}</TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField size="small" sx={{ width: 80 }} value={editRow.size} onChange={(e) => handleEditChange("size", e.target.value)} />
                    ) : (
                      p.size || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField select size="small" sx={{ width: 90 }} value={editRow.uom} onChange={(e) => handleEditChange("uom", e.target.value)}>
                        {UOM_OPTIONS.map((u) => (
                          <MenuItem key={u} value={u}>{u}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      p.uom || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <TextField size="small" type="number" sx={{ width: 70 }} value={editRow.stock} onChange={(e) => handleEditChange("stock", e.target.value)} />
                    ) : (
                      <Chip label={p.stock} size="small" sx={{ background: p.stock < 10 ? "#fee2e2" : "#dcfce7", color: p.stock < 10 ? "#b91c1c" : "#166534", fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {p.isSupplierItem ? (
                      <Chip label={p.supplierName || "Supplier"} size="small" color="secondary" />
                    ) : (
                      <Chip label="Own" size="small" sx={{ background: "#eff6ff", color: "#1d4ed8" }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {isEdit ? (
                        <>
                          <IconButton size="small" color="success" onClick={() => handleSave(p._id)}><SaveIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => setEditId(null)}><CloseIcon fontSize="small" /></IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton size="small" color="primary" onClick={() => startEdit(p)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(p._id)}><DeleteIcon fontSize="small" /></IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No products found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};

export default ProductDetails;

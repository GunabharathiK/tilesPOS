import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
} from "@mui/material";
import { useState, useEffect } from "react";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} from "../services/productService";
import toast from "react-hot-toast";

const UOM_OPTIONS = ["sqrft", "kg", "bag", "box", "piece", "meter", "litre", "ton"];

const Products = () => {
  const [product, setProduct] = useState({
    name: "",
    code: "",
    price: "",
    stock: "",
    size: "",
    uom: "",
  });

  const [products, setProducts] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!product.name) {
      toast.error("Product name required");
      return;
    }
    try {
      if (editId) {
        await updateProduct(editId, product);
        toast.success("Updated ✅");
        setEditId(null);
      } else {
        await createProduct(product);
        toast.success("Added ✅");
      }
      setProduct({ name: "", code: "", price: "", stock: "", size: "", uom: "" });
      fetchProducts();
    } catch (err) {
      // ✅ show duplicate code error clearly
      if (err?.response?.data?.error?.includes("duplicate") || err?.response?.data?.error?.includes("code")) {
        toast.error("Product code already exists! Use a unique code.");
      } else {
        toast.error("Error ❌");
      }
    }
  };

  const handleEdit = (p) => {
    setProduct({
      name: p.name,
      code: p.code || "",
      price: p.price,
      stock: p.stock,
      size: p.size || "",
      uom: p.uom || "",
    });
    setEditId(p._id);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    toast.success("Deleted 🗑️");
    fetchProducts();
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(search.toLowerCase());
    if (filter === "LOW") return matchSearch && p.stock < 10;
    if (filter === "HIGH") return matchSearch && p.stock >= 10;
    return matchSearch;
  });

  return (
    <Box>
      {/* ADD / UPDATE FORM */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          {editId ? "Update Product" : "Add Product"}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {/* Name */}
          <TextField
            label="Name *"
            name="name"
            value={product.name}
            onChange={handleChange}
          />

          {/* ✅ Unique Code */}
          <TextField
            label="Product Code"
            name="code"
            value={product.code}
            onChange={handleChange}
            placeholder="e.g. TL-001"
            inputProps={{ style: { textTransform: "uppercase" } }}
          />

          {/* Price */}
          <TextField
            label="Price (₹)"
            name="price"
            type="number"
            value={product.price}
            onChange={handleChange}
          />

          {/* Stock */}
          <TextField
            label="Stock"
            name="stock"
            type="number"
            value={product.stock}
            onChange={handleChange}
          />

          {/* Size */}
          <TextField
            label="Size (e.g. 2X2)"
            name="size"
            value={product.size}
            onChange={handleChange}
            placeholder="e.g. 2X2"
          />

          {/* ✅ UOM dropdown */}
          <TextField
            select
            label="UOM"
            name="uom"
            value={product.uom}
            onChange={handleChange}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">— Select —</MenuItem>
            {UOM_OPTIONS.map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={handleSubmit} sx={{ alignSelf: "center" }}>
            {editId ? "Update" : "Add"}
          </Button>

          {editId && (
            <Button
              variant="outlined"
              color="secondary"
              sx={{ alignSelf: "center" }}
              onClick={() => {
                setEditId(null);
                setProduct({ name: "", code: "", price: "", stock: "", size: "", uom: "" });
              }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Card>

      {/* SEARCH + FILTER */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "space-between" }}>
          <TextField
            label="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            label="Filter by Stock"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ width: 180 }}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="LOW">Low Stock (&lt;10)</MenuItem>
            <MenuItem value="HIGH">In Stock (≥10)</MenuItem>
          </TextField>
        </Box>
      </Card>

      {/* PRODUCT TABLE */}
      <Card>
        <Typography variant="h6" sx={{ p: 2 }}>Product List</Typography>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ background: "#f1f5f9" }}>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>UOM</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredProducts.map((p, index) => (
                <TableRow key={p._id} hover>
                  <TableCell>{index + 1}</TableCell>

                  {/* ✅ Code badge */}
                  <TableCell>
                    {p.code ? (
                      <span style={{
                        background: "#f0fdf4", color: "#15803d",
                        padding: "3px 10px", borderRadius: "8px",
                        fontWeight: 600, fontSize: 13, letterSpacing: 1,
                      }}>
                        {p.code.toUpperCase()}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </TableCell>

                  <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                  <TableCell>₹{p.price}</TableCell>

                  {/* Size badge */}
                  <TableCell>
                    {p.size ? (
                      <span style={{
                        background: "#eff6ff", color: "#1d4ed8",
                        padding: "3px 10px", borderRadius: "8px", fontWeight: 500,
                      }}>
                        {p.size}
                      </span>
                    ) : <span style={{ color: "#9ca3af" }}>—</span>}
                  </TableCell>

                  {/* ✅ UOM badge */}
                  <TableCell>
                    {p.uom ? (
                      <span style={{
                        background: "#fdf4ff", color: "#7e22ce",
                        padding: "3px 10px", borderRadius: "8px", fontWeight: 500,
                      }}>
                        {p.uom}
                      </span>
                    ) : <span style={{ color: "#9ca3af" }}>—</span>}
                  </TableCell>

                  <TableCell>
                    <span style={{
                      background: p.stock < 10 ? "#fee2e2" : "#dcfce7",
                      color: p.stock < 10 ? "#b91c1c" : "#166534",
                      padding: "4px 10px", borderRadius: "8px",
                    }}>
                      {p.stock}
                    </span>
                  </TableCell>

                  <TableCell align="right">
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleEdit(p)}>
                      Edit
                    </Button>
                    <Button variant="contained" color="error" size="small" onClick={() => handleDelete(p._id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">No products found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Products;

import {
  Box, Card, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, Button, Chip, TextField,
  Collapse, IconButton, Divider,
} from "@mui/material";
import DeleteIcon            from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon   from "@mui/icons-material/KeyboardArrowUp";
import { useEffect, useState } from "react";
import { getSuppliers, deleteSupplier } from "../../services/supplierService";
import toast from "react-hot-toast";

// ── Single Supplier Row ──────────────────────────────────────
const SupplierRow = ({ supplier, onDelete, onEdit }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{supplier.name}</TableCell>
        <TableCell>{supplier.phone}</TableCell>
        <TableCell>{supplier.address}</TableCell>
        <TableCell>{supplier.items.length}</TableCell>
        <TableCell sx={{ fontWeight: 700, color: "#15803d" }}>
          ₹{supplier.items
              .reduce((s, it) => s + Number(it.qty) * Number(it.price), 0)
              .toLocaleString("en-IN")}
        </TableCell>
        <TableCell>
          <Chip label={supplier.paymentStatus} size="small"
            color={
              supplier.paymentStatus === "Paid"    ? "success" :
              supplier.paymentStatus === "Partial" ? "warning" : "error"
            }
          />
        </TableCell>
        <TableCell>
          <Box display="flex" gap={1} alignItems="center">
            <Button size="small" variant="outlined" color="primary"
              onClick={() => onEdit(supplier)}>
              Edit
            </Button>
            <IconButton size="small" color="error"
              onClick={() => onDelete(supplier._id, supplier.name)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>

      {/* Expandable items — view only */}
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, background: "#f8fafc", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                ITEMS SUPPLIED
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: "#f1f5f9" }}>
                    {["#", "Image", "Item Name", "Size", "Qty", "Unit", "GST%", "Price/Unit", "Total"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplier.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        {it.image
                          ? <img src={it.image} alt={it.name}
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                          : <Box sx={{ width: 40, height: 40, borderRadius: 1.5, background: "#f1f5f9",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>
                              {it.name?.[0]?.toUpperCase()}
                            </Box>
                        }
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{it.name}</TableCell>
                      <TableCell>
                        <Chip label={it.size} size="small" sx={{ background: "#eff6ff", color: "#1d4ed8" }} />
                      </TableCell>
                      <TableCell>{it.qty}</TableCell>
                      <TableCell>{it.unit}</TableCell>
                      <TableCell>
                        <Chip label={`${it.gst ?? 0}%`} size="small" sx={{ background: "#fef3c7", color: "#92400e" }} />
                      </TableCell>
                      <TableCell>₹{it.price}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        ₹{(Number(it.qty) * Number(it.price)).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ── Main Component ───────────────────────────────────────────
const SupplierDetails = ({ onBack, onEdit }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch]       = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await getSuppliers();
      setSuppliers(res.data);
    } catch { toast.error("Failed to fetch suppliers"); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    try {
      await deleteSupplier(id);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch { toast.error("Delete failed"); }
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <Card sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>📋 Supplier Details</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      <TextField fullWidth placeholder="Search by name or phone..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        size="small" sx={{ mb: 2 }} />

      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead sx={{ background: "#f1f5f9" }}>
            <TableRow>
              <TableCell />
              {["Supplier Name", "Phone", "Address", "Items", "Total Value", "Payment Status", "Actions"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600, fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s) => (
              <SupplierRow
                key={s._id}
                supplier={s}
                onDelete={handleDelete}
                onEdit={onEdit}
              />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No suppliers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};

export default SupplierDetails;
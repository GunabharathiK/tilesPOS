import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteSupplier, getSuppliers } from "../../services/supplierService";

/* ── Design tokens ── */
const T = {
  primary:      "#1a56a0",
  primaryDark:  "#0f3d7a",
  primaryLight: "#eef4fd",
  success:      "#15803d",
  successLight: "#f0fdf4",
  danger:       "#b91c1c",
  dangerLight:  "#fef2f2",
  warning:      "#92400e",
  warningLight: "#fef3c7",
  dark:         "#0f172a",
  text:         "#1e293b",
  muted:        "#64748b",
  faint:        "#94a3b8",
  border:       "#dde3ed",
  borderLight:  "#e8eef6",
  bg:           "#f1f5f9",
  surface:      "#ffffff",
  surfaceAlt:   "#f8fafc",
};

/* ── Input style — zero radius ── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    background: T.surface,
    fontSize: 13,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: 1.5 },
    "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(26,86,160,.08)" },
  },
  "& .MuiInputLabel-root":             { fontSize: 13, color: T.muted },
  "& .MuiInputLabel-root.Mui-focused": { color: T.primary },
};

/* ── Table header cell ── */
const TH = ({ children, align = "left" }) => (
  <TableCell align={align} sx={{
    py: 1.2, px: 2, fontSize: 10.5, fontWeight: 700, color: T.muted,
    textTransform: "uppercase", letterSpacing: ".07em",
    background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`,
    whiteSpace: "nowrap",
  }}>
    {children}
  </TableCell>
);

/* ── Table data cell ── */
const TD = ({ children, align = "left", sx: sxProp }) => (
  <TableCell align={align} sx={{
    py: 1.3, px: 2, fontSize: 13,
    borderBottom: `1px solid ${T.borderLight}`,
    color: T.text, ...sxProp,
  }}>
    {children}
  </TableCell>
);

/* ── Action button ── */
const ActionBtn = ({ children, onClick, danger, primary }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "inline-flex", alignItems: "center",
      px: 1.4, py: "5px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", userSelect: "none",
      border: `1px solid ${danger ? "#fecaca" : T.border}`,
      background: danger ? T.dangerLight : primary ? T.primary : T.surface,
      color: danger ? T.danger : primary ? "#fff" : T.primary,
      "&:hover": {
        background: danger ? "#fecaca" : primary ? T.primaryDark : T.primaryLight,
        borderColor: danger ? T.danger : T.primary,
      },
      transition: "all .12s",
    }}
  >
    {children}
  </Box>
);

/* ── Detail row for dialog ── */
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: "flex", gap: 1.5, py: 0.9, borderBottom: `1px solid ${T.borderLight}` }}>
    <Typography sx={{ fontSize: 10.5, color: T.muted, minWidth: 130, flexShrink: 0, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, pt: 0.1 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 500, color: T.text, wordBreak: "break-word" }}>
      {value || "—"}
    </Typography>
  </Box>
);

/* ── Section label for dialog ── */
const DialogSection = ({ children }) => (
  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", mb: 1, mt: 0.5 }}>
    {children}
  </Typography>
);

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const cfg =
    status === "Paid"    ? { color: T.success, bg: T.successLight, border: "#bbf7d0" } :
    status === "Partial" ? { color: T.warning, bg: T.warningLight, border: "#fde68a" } :
                           { color: T.danger,  bg: T.dangerLight,  border: "#fecaca" };
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: "2px", fontSize: 10.5, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 5, height: 5, background: cfg.color, flexShrink: 0 }} />
      {status}
    </Box>
  );
};

/* ════════════════════════════════════════════════════ */
const SupplierDetails = () => {
  const navigate = useNavigate();
  const [suppliers,    setSuppliers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState("name");
  const [sortDir,      setSortDir]      = useState("asc");
  const [pageSize,     setPageSize]     = useState(10);
  const [page,         setPage]         = useState(1);
  const [viewSupplier, setViewSupplier] = useState(null);

  const cols = [
    { key: "name",    label: "Supplier Name" },
    { key: "phone",   label: "Mobile"        },
    { key: "city",    label: "City"          },
    { key: "gstin",   label: "GSTIN"         },
    { key: "terms",   label: "Payment Terms" },
    { key: "status",  label: "Status"        },
    { key: "actions", label: "Actions", noSort: true },
  ];

  const fetchSuppliers = async () => {
    try {
      const res = await getSuppliers();
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const rows = useMemo(() => {
    const mapped = suppliers.map(s => ({
      raw:    s,
      name:   s.companyName   || s.name         || "-",
      phone:  s.companyPhone  || s.phone         || "-",
      email:  s.companyEmail  || "-",
      city:   s.city          || "-",
      gstin:  s.gstin         || "-",
      terms:  s.paymentTerms  || "-",
      status: s.paymentStatus || "Pending",
    }));

    const q        = search.trim().toLowerCase();
    const filtered = q
      ? mapped.filter(r => [r.name, r.phone, r.email, r.city, r.gstin, r.terms, r.status].some(v => String(v).toLowerCase().includes(q)))
      : mapped;

    return filtered.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va  = String(a[sortBy] || "").toLowerCase();
      const vb  = String(b[sortBy] || "").toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }, [suppliers, search, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortArrow = ({ col }) =>
    sortBy !== col
      ? <Box component="span" sx={{ opacity: 0.3, ml: 0.4, fontSize: 11 }}>↕</Box>
      : <Box component="span" sx={{ ml: 0.4, fontSize: 11, color: T.primary }}>{sortDir === "asc" ? "↑" : "↓"}</Box>;

  const handleDelete = async supplier => {
    if (!supplier?._id) return;
    if (!window.confirm(`Delete "${supplier.companyName || supplier.name}"?`)) return;
    try {
      await deleteSupplier(supplier._id);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch { toast.error("Delete failed"); }
  };

  const handleEdit = supplier => {
    if (supplier) navigate("/suppliers/create", { state: { editSupplier: supplier } });
  };

  /* ── Pagination pages ── */
  const renderPageBtns = () => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || (p >= safePage - 1 && p <= safePage + 1))
      .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, []);

    return pages.map((p, i) =>
      p === "…"
        ? <Box key={`e${i}`} sx={{ px: 0.8, fontSize: 12, color: T.faint, display: "inline-flex", alignItems: "center" }}>…</Box>
        : <Box key={p} onClick={() => setPage(p)}
            sx={{ minWidth: 30, height: 28, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: p === safePage ? 700 : 500, cursor: "pointer", border: `1px solid ${p === safePage ? T.primary : T.border}`, background: p === safePage ? T.primary : T.surface, color: p === safePage ? "#fff" : T.muted, "&:hover": p !== safePage ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>
            {p}
          </Box>
    );
  };

  /* ══════════════════════════════════════ RENDER ══════ */
  return (
    <Box sx={{ p: 0, background: T.bg, minHeight: "100%", fontFamily: "'Noto Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <Box sx={{ px: 3, py: 1.8, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.dark, lineHeight: 1.2, letterSpacing: "-.01em" }}>
            Supplier Details
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            {loading ? "Loading…" : `${rows.length} supplier${rows.length !== 1 ? "s" : ""} registered`}
          </Typography>
        </Box>
        <Box
          onClick={() => navigate("/suppliers/create")}
          sx={{ display: "inline-flex", alignItems: "center", gap: "6px", px: 2.2, py: "9px", background: T.primary, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", "&:hover": { background: T.primaryDark }, transition: "background .13s" }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v12M2 8h12" strokeLinecap="round"/></svg>
          New Supplier
        </Box>
      </Box>

      <Box sx={{ px: 2.5, pb: 3 }}>
        <Box sx={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(15,23,42,.06)", overflow: "hidden" }}>

          {/* ── Toolbar ── */}
          <Box sx={{ px: 2, py: 1.3, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            {/* Count badge */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.dark }}>All Suppliers</Typography>
              <Box sx={{ px: 1.2, py: "2px", background: T.primaryLight, border: `1px solid #c3d9f5`, fontSize: 11, fontWeight: 700, color: T.primary }}>
                {rows.length}
              </Box>
            </Box>

            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
              {/* Rows per page */}
              <TextField select size="small" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                sx={{ minWidth: 100, ...inputSx }}
              >
                {[10, 25, 50, 100].map(n => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
              </TextField>

              {/* Search */}
              <TextField size="small" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, phone, city…"
                sx={{ minWidth: 240, ...inputSx }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.8, color: T.faint, display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/>
                      </svg>
                    </Box>
                  ),
                }}
              />
            </Box>
          </Box>

          {/* ── Table ── */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  {cols.map(col => (
                    <TH key={col.key}>
                      <Box
                        onClick={() => !col.noSort && toggleSort(col.key)}
                        sx={{ display: "inline-flex", alignItems: "center", cursor: col.noSort ? "default" : "pointer", userSelect: "none", "&:hover": !col.noSort ? { color: T.primary } : {} }}
                      >
                        {col.label}
                        {!col.noSort && <SortArrow col={col.key} />}
                      </Box>
                    </TH>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: T.faint, fontSize: 13, border: "none" }}>Loading suppliers…</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: T.faint, fontSize: 13, border: "none" }}>No suppliers found.</TableCell></TableRow>
                ) : paged.map((r, idx) => (
                  <TableRow
                    key={r.raw?._id}
                    sx={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt, "&:hover": { background: T.primaryLight }, transition: "background .1s", cursor: "default" }}
                  >
                    <TD sx={{ fontWeight: 700, color: T.primary }}>{r.name}</TD>
                    <TD sx={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{r.phone}</TD>
                    <TD>{r.city}</TD>
                    <TD sx={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.muted }}>{r.gstin}</TD>
                    <TD>{r.terms}</TD>
                    <TD><StatusBadge status={r.status} /></TD>
                    <TD>
                      <Box sx={{ display: "flex", gap: 0.6 }}>
                        <ActionBtn onClick={() => setViewSupplier(r.raw)}>View</ActionBtn>
                        <ActionBtn onClick={() => handleEdit(r.raw)}>Edit</ActionBtn>
                        <ActionBtn danger onClick={() => handleDelete(r.raw)}>Delete</ActionBtn>
                      </Box>
                    </TD>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* ── Pagination ── */}
          <Box sx={{ px: 2, py: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Typography sx={{ fontSize: 12, color: T.muted }}>
              Showing {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} of {rows.length}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {/* Prev */}
              <Box onClick={() => safePage > 1 && setPage(safePage - 1)}
                sx={{ minWidth: 30, height: 28, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: safePage <= 1 ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: safePage <= 1 ? T.faint : T.muted, opacity: safePage <= 1 ? 0.45 : 1, "&:hover": safePage > 1 ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>‹</Box>

              {renderPageBtns()}

              {/* Next */}
              <Box onClick={() => safePage < totalPages && setPage(safePage + 1)}
                sx={{ minWidth: 30, height: 28, px: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: safePage >= totalPages ? "default" : "pointer", border: `1px solid ${T.border}`, background: T.surface, color: safePage >= totalPages ? T.faint : T.muted, opacity: safePage >= totalPages ? 0.45 : 1, "&:hover": safePage < totalPages ? { borderColor: T.primary, color: T.primary, background: T.primaryLight } : {}, transition: "all .1s" }}>›</Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── View supplier dialog ── */}
      <Dialog
        open={Boolean(viewSupplier)}
        onClose={() => setViewSupplier(null)}
        maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 24px 64px rgba(0,0,0,.16)" } }}
      >
        {/* Dialog header */}
        <Box sx={{ px: 3, py: 1.8, borderBottom: `2px solid ${T.primary}`, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.dark }}>
              {viewSupplier?.companyName || viewSupplier?.name || "Supplier"}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.muted, mt: 0.2 }}>Supplier profile</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <ActionBtn primary onClick={() => { handleEdit(viewSupplier); setViewSupplier(null); }}>Edit</ActionBtn>
            <Box
              onClick={() => setViewSupplier(null)}
              sx={{ width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 16, "&:hover": { borderColor: T.danger, color: T.danger, background: T.dangerLight }, transition: "all .13s" }}
            >
              ✕
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: "20px 24px !important" }}>
          {viewSupplier && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>

              {/* Left — Company & Contact */}
              <Box>
                <DialogSection>Company Details</DialogSection>
                <DetailRow label="Company Name"   value={viewSupplier.companyName    || viewSupplier.name} />
                <DetailRow label="Contact Person" value={viewSupplier.supplierName} />
                <DetailRow label="Designation"    value={viewSupplier.designation} />
                <DetailRow label="Mobile"         value={viewSupplier.companyPhone   || viewSupplier.phone} />
                <DetailRow label="Alt Mobile"     value={viewSupplier.altPhone} />
                <DetailRow label="Email"          value={viewSupplier.companyEmail} />
                <DetailRow label="Website"        value={viewSupplier.companyWebsite} />

                <Box sx={{ mt: 2 }}>
                  <DialogSection>Address</DialogSection>
                  <DetailRow label="Full Address" value={viewSupplier.companyAddress || viewSupplier.address} />
                  <DetailRow label="City / State" value={[viewSupplier.city, viewSupplier.state].filter(Boolean).join(", ")} />
                  <DetailRow label="Pincode"      value={viewSupplier.pincode} />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <DialogSection>Tax</DialogSection>
                  <DetailRow label="GSTIN"             value={viewSupplier.gstin} />
                  <DetailRow label="PAN Number"        value={viewSupplier.panNumber} />
                  <DetailRow label="State Code"        value={viewSupplier.stateCode} />
                  <DetailRow label="Reg. Type"         value={viewSupplier.registrationType} />
                </Box>
              </Box>

              {/* Right — Financial & Bank */}
              <Box>
                <DialogSection>Payment & Credit</DialogSection>
                <DetailRow label="Payment Terms" value={viewSupplier.paymentTerms} />
                <DetailRow label="Credit Limit"  value={viewSupplier.creditLimit ? `₹${Number(viewSupplier.creditLimit).toLocaleString("en-IN")}` : null} />
                <DetailRow label="Discount %"    value={viewSupplier.discountPct} />
                <DetailRow label="Freight"       value={viewSupplier.freight} />

                <Box sx={{ mt: 2 }}>
                  <DialogSection>Bank Account</DialogSection>
                  <DetailRow label="Bank Name"       value={viewSupplier.bankName} />
                  <DetailRow label="Account No"      value={viewSupplier.accountNo} />
                  <DetailRow label="IFSC Code"       value={viewSupplier.ifscCode} />
                  <DetailRow label="Account Holder"  value={viewSupplier.accountHolder} />
                  <DetailRow label="Branch"          value={viewSupplier.branch} />
                  <DetailRow label="Account Type"    value={viewSupplier.accountType} />
                  <DetailRow label="UPI ID"          value={viewSupplier.upiId} />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <DialogSection>Rating & Notes</DialogSection>
                  <DetailRow label="Rating"    value={viewSupplier.rating} />
                  <DetailRow label="Priority"  value={viewSupplier.priority} />
                  <DetailRow label="Notes"     value={viewSupplier.internalNotes} />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SupplierDetails;
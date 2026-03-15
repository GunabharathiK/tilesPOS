import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  MenuItem,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createProduct, updateProduct } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";
import API from "../../services/api";

const T = {
  primary:     "#1a56a0",
  primaryDark: "#0f3d7a",
  success:     "#1a7a4a",
  text:        "#1f2937",
  muted:       "#64748b",
  border:      "#e2e8f0",
  bg:          "#f0f4f8",
  white:       "#ffffff",
};

const DEFAULT_CATEGORIES = ["Floor Tile","Wall Tile","Vitrified Tile","Parking Tile","Granite","Marble"];
const DEFAULT_BRANDS     = ["Kajaria","Somany","Nitco","Johnson","Orientbell","Other"];
const DEFAULT_FINISHES   = ["Matt","Glossy","Polished","Satin","Rustic"];
const DEFAULT_RACKS      = ["Rack-A1","Rack-A2","Rack-B1","Rack-B2","Rack-C1"];

const getProductDefaults = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("productDefaults"))||{};
    return {
      categories: saved.categories?.length?saved.categories:DEFAULT_CATEGORIES,
      brands:     saved.brands?.length    ?saved.brands    :DEFAULT_BRANDS,
      finishes:   saved.finishes?.length  ?saved.finishes  :DEFAULT_FINISHES,
      racks:      saved.racks?.length     ?saved.racks     :DEFAULT_RACKS,
    };
  } catch {
    return {categories:DEFAULT_CATEGORIES,brands:DEFAULT_BRANDS,finishes:DEFAULT_FINISHES,racks:DEFAULT_RACKS};
  }
};

const GST_OPTIONS = [
  {label:"0% (Exempt)",value:0},{label:"5%",value:5},{label:"12%",value:12},
  {label:"18% (Standard)",value:18},{label:"28%",value:28},
];
const CM2_PER_SQFT = 929.0304;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    background: T.white,
    fontSize: 13,
    "& fieldset": { borderColor: T.border },
    "&:hover fieldset": { borderColor: T.primary },
    "&.Mui-focused fieldset": { borderColor: T.primary, borderWidth: "2px" },
  },
  "& .MuiInputBase-input": { padding: "7px 10px" },
  "& .MuiInputBase-input::placeholder": { color: "#c0cad8", opacity: 1 },
  "& .MuiSelect-select": { padding: "7px 10px" },
};

const labelSx = {
  fontSize: 10, fontWeight: 800, color: T.muted,
  textTransform: "uppercase", letterSpacing: ".07em",
  mb: "5px", display: "block",
};

const sectionSx = {
  fontSize: 11, fontWeight: 800, color: T.primary,
  textTransform: "uppercase", letterSpacing: ".1em",
  display: "flex", alignItems: "center", gap: 1,
  py: 0.8, px: 1.5, background: "#edf4ff",
  borderLeft: `3px solid ${T.primary}`, mb: 1.5, mt: 2.5,
};

const Fld = ({ label, required, children }) => (
  <Box>
    <Box component="span" sx={labelSx}>
      {label}
      {required && <Box component="span" sx={{ color:"#dc2626", ml:0.3 }}>*</Box>}
    </Box>
    {children}
  </Box>
);

const empty = () => ({
  name:"",code:"",barcode:"",category:"",brand:"",finish:"",
  colorDesign:"",lengthCm:"",widthCm:"",tilesPerBox:"",coverageArea:"",
  price:"",dealerPrice:"",purchasePrice:"",minimumSellPrice:"",
  contractorPrice:"",mrpPerBox:"",gst:"",hsnCode:"",
  stock:"",stockBoxes:"",reorderLevel:"",rackLocation:"",notes:"",image:"",uom:"sqrft",
});

const numericOrZero = (v) => (v===""?0:Number(v)||0);

const productToForm = (p) => ({
  name:             p.name              || "",
  code:             p.code              || "",
  barcode:          p.barcode           || "",
  category:         p.category          || "Floor Tile",
  brand:            p.brand             || "Kajaria",
  finish:           p.finish            || "Matt",
  colorDesign:      p.colorDesign       || "",
  lengthCm:         String(p.lengthCm   ?? (p.size?p.size.split("x")[0]:"60")),
  widthCm:          String(p.widthCm    ?? (p.size?p.size.split("x")[1]:"60")),
  tilesPerBox:      String(p.tilesPerBox     ?? "4"),
  coverageArea:     String(p.coverageArea    ?? ""),
  price:            String(p.price           ?? ""),
  dealerPrice:      String(p.dealerPrice     ?? ""),
  purchasePrice:    String(p.purchasePrice   ?? ""),
  minimumSellPrice: String(p.minimumSellPrice ?? ""),
  contractorPrice:  String(p.contractorPrice  ?? ""),
  mrpPerBox:        String(p.mrpPerBox        ?? ""),
  gst:              String(p.gst              ?? "18"),
  hsnCode:          p.hsnCode           || "6907",
  stock:            String(p.stock      ?? "0"),
  stockBoxes:       String(p.stockBoxes  ?? "0"),
  reorderLevel:     String(p.reorderLevel ?? "100"),
  rackLocation:     p.rackLocation      || "",
  notes:            p.notes             || "",
  image:            p.image||p.productImage||p.img||p.photo||"",
  uom:              p.uom               || "sqrft",
});

const AddItem = ({ embedded=false, onSaved }) => {
  const location    = useLocation();
  const navigate    = useNavigate();
  const editProduct = location.state?.editProduct||null;
  const isEdit      = Boolean(editProduct);

  const [form,       setForm]      = useState(isEdit?productToForm(editProduct):empty());
  const [preview,    setPreview]   = useState(isEdit?(editProduct.image||editProduct.productImage||""):"");
  const [loading,    setLoading]   = useState(false);
  const [categories, setCategories]= useState(()=>getProductDefaults().categories);
  const [brands,     setBrands]    = useState(()=>getProductDefaults().brands);
  const [finishes,   setFinishes]  = useState(()=>getProductDefaults().finishes);
  const [racks,      setRacks]     = useState(()=>getProductDefaults().racks);

  useEffect(()=>{
    if (isEdit){ setForm(productToForm(editProduct)); setPreview(editProduct.image||editProduct.productImage||""); }
    else { setForm(empty()); setPreview(""); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[editProduct?._id]);

  useEffect(()=>{
    const d=getProductDefaults();
    setBrands(d.brands); setFinishes(d.finishes); setRacks(d.racks);
  },[]);

  useEffect(()=>{
    API.get("/categories")
      .then((res)=>{ const d=(res.data||[]).map((c)=>c.name).filter(Boolean); if (d.length) setCategories(d); })
      .catch(()=>{});
  },[]);

  const handleChange=(e)=>{ const{name,value}=e.target; setForm((p)=>({...p,[name]:value})); };

  const handleImage=async(e)=>{
    const file=e.target.files?.[0]; if (!file) return;
    try { const c=await compressImage(file,600,0.7); setPreview(c); setForm((p)=>({...p,image:c})); }
    catch { toast.error("Failed to process image"); }
  };

  const calcSizeLabel=useMemo(()=>`${form.lengthCm||0}x${form.widthCm||0}`,[form.lengthCm,form.widthCm]);

  useEffect(()=>{
    const l=Number(form.lengthCm),w=Number(form.widthCm),pc=Number(form.tilesPerBox||1);
    if (!l||!w) return;
    const next=((l*w/CM2_PER_SQFT)*(pc>0?pc:1)).toFixed(2);
    if (form.coverageArea!==next) setForm((p)=>({...p,coverageArea:next}));
  },[form.lengthCm,form.widthCm,form.tilesPerBox,form.coverageArea]);

  useEffect(()=>{
    const b=Number(form.stockBoxes),c=Number(form.coverageArea);
    if (!Number.isFinite(b)||!Number.isFinite(c)||b<0||c<=0) return;
    const next=(b*c).toFixed(2);
    if (form.stock!==next) setForm((p)=>({...p,stock:next}));
  },[form.stockBoxes,form.coverageArea,form.stock]);

  const validate=()=>{
    if (!form.name.trim())    return toast.error("Tile name is required"),false;
    if (!form.code.trim())    return toast.error("SKU / Product code is required"),false;
    if (!form.category)       return toast.error("Category is required"),false;
    if (!form.brand)          return toast.error("Brand is required"),false;
    if (!form.finish)         return toast.error("Finish is required"),false;
    if (!form.lengthCm||!form.widthCm) return toast.error("Dimensions required"),false;
    if (form.price==="")      return toast.error("Retail price is required"),false;
    if (form.gst==="")        return toast.error("GST rate is required"),false;
    if (form.stock==="")      return toast.error("Opening stock is required"),false;
    return true;
  };

  const handleReset=()=>{ setForm(empty()); setPreview(""); if (isEdit) navigate(-1); };

  const handleSubmit=async()=>{
    if (!validate()) return;
    setLoading(true);
    const payload={
      name:form.name.trim(),code:form.code.trim().toUpperCase(),barcode:form.barcode.trim(),
      category:form.category,brand:form.brand,finish:form.finish,colorDesign:form.colorDesign.trim(),
      lengthCm:numericOrZero(form.lengthCm),widthCm:numericOrZero(form.widthCm),
      tilesPerBox:numericOrZero(form.tilesPerBox),coverageArea:numericOrZero(form.coverageArea),
      price:numericOrZero(form.price),dealerPrice:numericOrZero(form.dealerPrice),
      purchasePrice:numericOrZero(form.purchasePrice),minimumSellPrice:numericOrZero(form.minimumSellPrice),
      contractorPrice:numericOrZero(form.contractorPrice),mrpPerBox:numericOrZero(form.mrpPerBox),
      gst:numericOrZero(form.gst),hsnCode:form.hsnCode.trim(),stock:numericOrZero(form.stock),
      stockBoxes:numericOrZero(form.stockBoxes),reorderLevel:numericOrZero(form.reorderLevel),
      rackLocation:form.rackLocation.trim(),notes:form.notes.trim(),image:form.image,uom:form.uom,
      size:calcSizeLabel,totalPrice:numericOrZero(form.price)*(1+numericOrZero(form.gst)/100),
      minStockAlert:numericOrZero(form.reorderLevel),isSupplierItem:false,
    };
    try {
      if (isEdit){ await updateProduct(editProduct._id,payload); toast.success("Product updated ✅"); if (typeof onSaved==="function") await onSaved(); navigate(-1); }
      else { await createProduct(payload); toast.success("Product saved ✅"); if (typeof onSaved==="function") await onSaved(); handleReset(); }
    } catch(err) {
      const msg=err?.response?.data?.error||"";
      toast.error(msg.includes("duplicate")?"Product code already exists":"Failed to save product");
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ background:T.bg, minHeight:"100%", p:embedded?0:2 }}>
      {!embedded && (
        <Box sx={{ mb:2, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Box>
            <Typography sx={{ fontSize:22, fontWeight:800, color:T.text }}>
              {isEdit?`Edit Product — ${editProduct.name}`:"Add Tile Product"}
            </Typography>
            <Typography sx={{ fontSize:12, color:T.muted, mt:0.3 }}>
              {isEdit?"Update existing product details":"Fill in all required fields to add a new tile"}
            </Typography>
          </Box>
          {isEdit&&(
            <Box onClick={()=>navigate(-1)} sx={{ display:"inline-flex", alignItems:"center", gap:"5px", px:1.8, py:0.8, border:`1px solid ${T.border}`, cursor:"pointer", fontSize:13, fontWeight:600, color:T.muted, background:T.white, "&:hover":{ borderColor:T.primary, color:T.primary, background:"#edf4ff" } }}>
              ← Back
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ background:T.white, border:`1px solid ${T.border}` }}>

        {/* Header bar */}
        <Box sx={{ background:T.primary, px:2.5, py:1.4 }}>
          <Typography sx={{ fontSize:13, fontWeight:700, color:"#fff" }}>
            {isEdit?"✏️ Editing Product":"+ New Tile Product"}
          </Typography>
        </Box>

        <Box sx={{ p:2.5 }}>

          {/* Basic Details */}
          <Box sx={sectionSx}>📦 Basic Details</Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6 }}>
            <Box sx={{ gridColumn:"span 2" }}>
              <Fld label="Tile Name" required>
                <TextField fullWidth size="small" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Italian Beige Matt 60x60" sx={inputSx}/>
              </Fld>
            </Box>
            <Fld label="SKU / Product Code" required>
              <TextField fullWidth size="small" name="code" value={form.code} onChange={handleChange} placeholder="TIL-0042" sx={inputSx}/>
            </Fld>
            <Fld label="Barcode / EAN">
              <TextField fullWidth size="small" name="barcode" value={form.barcode} onChange={handleChange} placeholder="Scan barcode" sx={inputSx}/>
            </Fld>
          </Box>

          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6, mt:1.6 }}>
            <Fld label="Category" required>
              <TextField select fullWidth size="small" name="category" value={form.category} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select category</MenuItem>
                {categories.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Brand" required>
              <TextField select fullWidth size="small" name="brand" value={form.brand} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select brand</MenuItem>
                {brands.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Finish" required>
              <TextField select fullWidth size="small" name="finish" value={form.finish} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select finish</MenuItem>
                {finishes.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Color / Shade">
              <TextField fullWidth size="small" name="colorDesign" value={form.colorDesign} onChange={handleChange} placeholder="Beige, Grey, White..." sx={inputSx}/>
            </Fld>
          </Box>

          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6, mt:1.6 }}>
            <Fld label="Length (cm)" required><TextField fullWidth size="small" name="lengthCm" value={form.lengthCm} onChange={handleChange} type="number" placeholder="60" sx={inputSx}/></Fld>
            <Fld label="Width (cm)" required><TextField fullWidth size="small" name="widthCm" value={form.widthCm} onChange={handleChange} type="number" placeholder="60" sx={inputSx}/></Fld>
            <Fld label="Pieces / Box"><TextField fullWidth size="small" name="tilesPerBox" value={form.tilesPerBox} onChange={handleChange} type="number" placeholder="4" sx={inputSx}/></Fld>
            <Fld label="Coverage / Box (sqft)"><TextField fullWidth size="small" name="coverageArea" value={form.coverageArea} onChange={handleChange} type="number" placeholder="2.16" sx={inputSx}/></Fld>
          </Box>

          {/* Pricing */}
          <Box sx={sectionSx}>💰 Pricing — All Channels</Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6 }}>
            <Fld label="Retail Price (₹/sqft)" required><TextField fullWidth size="small" name="price" value={form.price} onChange={handleChange} type="number" placeholder="85.00" sx={inputSx}/></Fld>
            <Fld label="Dealer / Bulk Price"><TextField fullWidth size="small" name="dealerPrice" value={form.dealerPrice} onChange={handleChange} type="number" placeholder="72.00" sx={inputSx}/></Fld>
            <Fld label="Min Sell Price"><TextField fullWidth size="small" name="minimumSellPrice" value={form.minimumSellPrice} onChange={handleChange} type="number" placeholder="78.00" sx={inputSx}/></Fld>
            <Fld label="Contractor Price"><TextField fullWidth size="small" name="contractorPrice" value={form.contractorPrice} onChange={handleChange} type="number" placeholder="78.00" sx={inputSx}/></Fld>
            <Fld label="Purchase / Cost Price"><TextField fullWidth size="small" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} type="number" placeholder="62.00" sx={inputSx}/></Fld>
            <Fld label="MRP / Box (₹)"><TextField fullWidth size="small" name="mrpPerBox" value={form.mrpPerBox} onChange={handleChange} type="number" placeholder="560" sx={inputSx}/></Fld>
            <Fld label="GST Rate" required>
              <TextField select fullWidth size="small" name="gst" value={form.gst} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select GST</MenuItem>
                {GST_OPTIONS.map((g)=><MenuItem key={g.value} value={String(g.value)}>{g.label}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="HSN Code"><TextField fullWidth size="small" name="hsnCode" value={form.hsnCode} onChange={handleChange} placeholder="6907" sx={inputSx}/></Fld>
          </Box>

          {/* Stock */}
          <Box sx={sectionSx}>📊 Stock Details</Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6 }}>
            <Fld label="Opening Stock (sqft)" required>
              <TextField fullWidth size="small" name="stock" value={form.stock} onChange={handleChange} type="number" placeholder="0" sx={inputSx} InputProps={{readOnly:true}}
                helperText="Auto-calculated from boxes × coverage" FormHelperTextProps={{sx:{fontSize:10,mt:0.3}}}/>
            </Fld>
            <Fld label="Opening Stock (boxes)"><TextField fullWidth size="small" name="stockBoxes" value={form.stockBoxes} onChange={handleChange} type="number" placeholder="0" sx={inputSx}/></Fld>
            <Fld label="Min Stock Level"><TextField fullWidth size="small" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} type="number" placeholder="100" sx={inputSx}/></Fld>
            <Fld label="Rack Location">
              <TextField select={racks.length>0} fullWidth size="small" name="rackLocation" value={form.rackLocation} onChange={handleChange} placeholder="Rack-A3" sx={inputSx}>
                {racks.length>0&&[<MenuItem key="" value="">Select rack</MenuItem>,...racks.map((r)=><MenuItem key={r} value={r}>{r}</MenuItem>)]}
              </TextField>
            </Fld>
          </Box>

          {/* Image & Notes */}
          <Box sx={sectionSx}>🖼️ Image & Notes</Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:2 }}>
            <Box>
              <Box component="span" sx={labelSx}>Product Image</Box>
              <Box sx={{ display:"flex", alignItems:"center", gap:1.2, mb:1 }}>
                <Box component="label" sx={{ display:"inline-flex", alignItems:"center", gap:"5px", px:1.5, py:"6px", border:`1px solid ${T.border}`, cursor:"pointer", fontSize:12, fontWeight:600, color:T.text, background:T.white, "&:hover":{ background:"#f1f5f9", borderColor:T.primary, color:T.primary } }}>
                  {preview?"Change Image":"Choose File"}
                  <input hidden type="file" accept="image/*" onChange={handleImage}/>
                </Box>
                <Typography sx={{ fontSize:12, color:T.muted }}>{preview?"Image selected":"No file chosen"}</Typography>
              </Box>
              {preview&&(
                <Box sx={{ width:120, height:100, overflow:"hidden", border:`1px solid ${T.border}` }}>
                  <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </Box>
              )}
            </Box>
            <Fld label="Description / Notes">
              <TextField fullWidth multiline minRows={4} name="notes" value={form.notes} onChange={handleChange} placeholder="Any notes about this tile..." sx={inputSx}/>
            </Fld>
          </Box>

          {/* Actions */}
          <Box sx={{ display:"flex", gap:1.2, mt:3, pt:2, borderTop:`1px solid ${T.border}` }}>
            <Box onClick={!loading?handleSubmit:undefined}
              sx={{ display:"inline-flex", alignItems:"center", gap:"6px", px:3, py:1, background:loading?"#94a3b8":T.success, color:"#fff", cursor:loading?"not-allowed":"pointer", fontSize:13, fontWeight:700, "&:hover":{ background:loading?"#94a3b8":"#166534" }, transition:"background .13s" }}>
              {loading?"Saving...":isEdit?"✓ Update Product":"✓ Save Tile"}
            </Box>
            <Box onClick={handleReset}
              sx={{ display:"inline-flex", alignItems:"center", gap:"6px", px:2.5, py:1, border:`1px solid ${T.border}`, color:T.text, cursor:"pointer", fontSize:13, fontWeight:600, background:T.white, "&:hover":{ background:"#f1f5f9", borderColor:T.primary, color:T.primary } }}>
              {isEdit?"✕ Cancel":"↺ Reset"}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AddItem;
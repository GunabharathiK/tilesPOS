import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  MenuItem,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getSuppliers, getPurchases } from "../../services/supplierService";
import { createProduct, getProducts } from "../../services/productService";
import compressImage from "../../utils/compressImage";
import toast from "react-hot-toast";

const T = {
  primary:    "#1a56a0",
  primaryDark:"#0f3d7a",
  success:    "#1a7a4a",
  text:       "#1f2937",
  muted:      "#64748b",
  border:     "#e2e8f0",
  bg:         "#f0f4f8",
  white:      "#ffffff",
};

const CATEGORY_OPTIONS = ["Floor Tile","Wall Tile","Vitrified Tile","Parking Tile","Granite","Marble"];
const BRAND_OPTIONS    = ["Kajaria","Somany","Nitco","Johnson","Orientbell","Other"];
const FINISH_OPTIONS   = ["Matt","Glossy","Polished","Satin","Rustic"];
const DEFAULT_RACKS    = ["Rack-A1","Rack-A2","Rack-B1","Rack-B2","Rack-C1"];
const GST_OPTIONS      = [
  {label:"0% (Exempt)",value:0},{label:"5%",value:5},{label:"12%",value:12},
  {label:"18% (Standard)",value:18},{label:"28%",value:28},
];
const UOM_OPTIONS_ALL  = ["sqrft","kg","bag","box","piece","meter","litre","ton"];
const CM2_PER_SQFT     = 929.0304;

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

const numericOrZero  = (v) => (v===""?0:Number(v)||0);
const normalize      = (v="") => String(v).trim().toLowerCase();
const firstFilled    = (...vals) => { for (const v of vals) { if (v!==undefined&&v!==null){const t=String(v).trim();if(t)return t;}} return ""; };
const parseTextList  = (v) => { if (Array.isArray(v)) return v.map((x)=>String(x||"").trim()).filter(Boolean); if (typeof v==="string") return v.split(",").map((x)=>x.trim()).filter(Boolean); return []; };
const getSettingsRacks = () => { try { const s=JSON.parse(localStorage.getItem("productDefaults")||"{}"); const r=Array.isArray(s?.racks)?s.racks:[]; const n=r.map((x)=>String(x||"").trim()).filter(Boolean); return n.length>0?n:DEFAULT_RACKS; } catch { return DEFAULT_RACKS; } };
const parseSizeToLW = (size="") => { const n=String(size).replace(/\s+/g,"").toLowerCase(); const[l,w]=n.split("x"); const len=Number(l),wid=Number(w); return {lengthCm:Number.isFinite(len)&&len>0?String(len):"",widthCm:Number.isFinite(wid)&&wid>0?String(wid):""}; };

const empty = () => ({
  name:"",code:"",barcode:"",category:"",brand:"",finish:"",
  colorDesign:"",lengthCm:"",widthCm:"",tilesPerBox:"",coverageArea:"",
  price:"",dealerPrice:"",purchasePrice:"",minimumSellPrice:"",
  contractorPrice:"",mrpPerBox:"",gst:"",hsnCode:"",
  stock:"",stockBoxes:"",reorderLevel:"",rackLocation:"",notes:"",image:"",uom:"",
});

const SupplierAddItem = ({ embedded=false, onSaved }) => {
  const [suppliers,         setSuppliers]         = useState([]);
  const [allProducts,       setAllProducts]       = useState([]);
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [supLoading,        setSupLoading]        = useState(true);
  const [selectedSup,       setSelectedSup]       = useState(null);
  const [form,              setForm]              = useState(empty());
  const [preview,           setPreview]           = useState("");
  const [loading,           setLoading]           = useState(false);

  const supplierItems          = selectedSup?.items||[];
  const rawProductNames        = selectedSup?.productNames;
  const supplierCatalogNames   = Array.isArray(rawProductNames)?rawProductNames.map((n)=>String(n||"").trim()).filter(Boolean):typeof rawProductNames==="string"?rawProductNames.split(",").map((n)=>n.trim()).filter(Boolean):[];
  const supplierItemNames      = supplierItems.map((i)=>String(i?.name||"").trim()).filter(Boolean);
  const supplierLinkedProducts = allProducts.filter((p)=>{ const pid=p?.supplierId?._id||p?.supplierId; return p?.isSupplierItem&&pid&&selectedSup?._id&&String(pid)===String(selectedSup._id); });
  const supplierLinkedProductNames = supplierLinkedProducts.map((p)=>String(p?.name||"").trim()).filter(Boolean);
  const supplierPurchaseItemNames = supplierPurchases
    .flatMap((purchase)=>Array.isArray(purchase?.products) ? purchase.products : [])
    .map((item)=>String(item?.name||"").trim())
    .filter(Boolean);
  const supplierCategoryList   = [...parseTextList(selectedSup?.categories),...parseTextList(selectedSup?.productsSupplied)];
  const linkedCategories       = supplierLinkedProducts.map((p)=>String(p?.category||"").trim()).filter(Boolean);
  const categoryOptions        = [...new Set([...CATEGORY_OPTIONS,...supplierCategoryList,...linkedCategories,String(form.category||"").trim()].filter(Boolean))];
  const supNames               = [...new Set([...supplierItemNames,...supplierCatalogNames,...supplierLinkedProductNames,...supplierPurchaseItemNames])];
  const supUnits               = [...new Set(supplierItems.map((i)=>i.unit).filter(Boolean))];
  const selectedNameItems      = form.name?supplierItems.filter((i)=>i.name===form.name):[];
  const selectedPurchaseItems  = form.name?supplierPurchases.flatMap((p)=>p?.products||[]).filter((i)=>normalize(i?.name)===normalize(form.name)):[];
  const suggestedPrices        = [...new Set([...selectedNameItems.map((i)=>String(i.price)).filter(Boolean),...selectedPurchaseItems.map((i)=>String(i.price)).filter(Boolean)])];
  const suggestedQty           = [...new Set([...selectedNameItems.map((i)=>String(i.qty)).filter(Boolean),...selectedPurchaseItems.map((i)=>String(i.received??i.qty)).filter(Boolean)])];
  const supColorDesigns        = [...new Set(selectedNameItems.map((i)=>i.colorDesign).filter(Boolean))];
  const rackOptions            = [...new Set([...getSettingsRacks(),...allProducts.map((p)=>String(p?.rackLocation||"").trim()).filter(Boolean),String(form.rackLocation||"").trim()].filter(Boolean))];
  const uomOptions             = supUnits.length>0?supUnits:UOM_OPTIONS_ALL;
  const supplierItemLabel      = (supplierItemNames.length>0?supplierItemNames:supplierCatalogNames).join(", ")||"No items listed";

  useEffect(()=>{
    Promise.all([getSuppliers(),getProducts()])
      .then(([sr,pr])=>{ setSuppliers(Array.isArray(sr.data)?sr.data:[]); setAllProducts(Array.isArray(pr.data)?pr.data:[]); })
      .catch(()=>toast.error("Failed to load suppliers"))
      .finally(()=>setSupLoading(false));
  },[]);

  useEffect(()=>{
    if (!selectedSup?._id){setSupplierPurchases([]);return;}
    getPurchases(selectedSup._id)
      .then((res)=>{ const list=Array.isArray(res.data)?res.data:[]; setSupplierPurchases(list.filter((p)=>!p?.isDraft)); })
      .catch(()=>setSupplierPurchases([]));
  },[selectedSup?._id]);

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

  const autoImageFor=(name,color="")=>{
    const n=normalize(name);
    const ib=supplierItems.filter((i)=>normalize(i.name)===n);
    const pb=supplierLinkedProducts.filter((p)=>normalize(p.name)===n);
    return (ib.find((i)=>normalize(i.colorDesign)===normalize(color)&&i.image)||pb.find((p)=>normalize(p.colorDesign)===normalize(color)&&p.image)||ib.find((i)=>i.image)||pb.find((p)=>p.image))?.image||"";
  };

  const handleSupplierChange=(sup)=>{ setSelectedSup(sup); setForm(empty()); setPreview(""); };

  const handleNamePick=(nextName)=>{
    const n=normalize(nextName);
    const itemMatch=supplierItems.find((i)=>normalize(i.name)===n);
    const productMatch=supplierLinkedProducts.find((p)=>normalize(p.name)===n);
    const purchaseMatch=[...supplierPurchases].sort((a,b)=>new Date(b?.invoiceDate||b?.createdAt||0)-new Date(a?.invoiceDate||a?.createdAt||0)).flatMap((p)=>p?.products||[]).find((i)=>normalize(i?.name)===n);
    const source=purchaseMatch||itemMatch||productMatch||null;
    const sbf=Array.isArray(selectedSup?.brands)?selectedSup.brands.find((v)=>String(v||"").trim()):String(selectedSup?.brands||"").split(",").map((v)=>v.trim()).find(Boolean)||"";
    const snm=parseTextList(selectedSup?.productNames),scm=parseTextList(selectedSup?.categories);
    const idx=snm.findIndex((nm)=>normalize(nm)===n);
    const resolvedCategory=firstFilled(purchaseMatch?.category,itemMatch?.category,productMatch?.category,idx>=0?scm[idx]:"",supplierCategoryList.length===1?supplierCategoryList[0]:"");
    const resolvedBrand=firstFilled(purchaseMatch?.brand,purchaseMatch?.brandName,itemMatch?.brand,productMatch?.brand,sbf);
    const parsed=parseSizeToLW(source?.size||(source?.lengthCm&&source?.widthCm?`${source.lengthCm}x${source.widthCm}`:""));
    const nextImage=autoImageFor(nextName,source?.colorDesign||"");
    const rb=source?.received!==undefined?Number(source.received):undefined;
    const rs=source?.sqft!==undefined?Number(source.sqft):undefined;
    const dc=rb>0&&rs>0?(rs/rb).toFixed(2):"";
    setForm((prev)=>({
      ...prev,name:nextName,
      category:resolvedCategory||prev.category,brand:resolvedBrand||prev.brand,
      finish:source?.finish||prev.finish,colorDesign:source?.colorDesign||prev.colorDesign,
      code:source?.code||prev.code,barcode:source?.barcode||prev.barcode,
      hsnCode:source?.hsnCode||prev.hsnCode,
      gst:source?.gst!==undefined&&source?.gst!==null?String(source.gst):prev.gst,
      price:source?.price!==undefined?String(source.price):prev.price,
      dealerPrice:source?.dealerPrice!==undefined?String(source.dealerPrice):prev.dealerPrice,
      purchasePrice:source?.purchasePrice!==undefined?String(source.purchasePrice):source?.price!==undefined?String(source.price):prev.purchasePrice,
      minimumSellPrice:source?.minimumSellPrice!==undefined?String(source.minimumSellPrice):prev.minimumSellPrice,
      contractorPrice:source?.contractorPrice!==undefined?String(source.contractorPrice):prev.contractorPrice,
      mrpPerBox:source?.mrpPerBox!==undefined?String(source.mrpPerBox):prev.mrpPerBox,
      stock:source?.sqft!==undefined?String(source.sqft):source?.qty!==undefined?String(source.qty):source?.stock!==undefined?String(source.stock):prev.stock,
      stockBoxes:source?.received!==undefined?String(source.received):source?.stockBoxes!==undefined?String(source.stockBoxes):prev.stockBoxes,
      reorderLevel:source?.reorderLevel!==undefined?String(source.reorderLevel):prev.reorderLevel,
      tilesPerBox:source?.tilesPerBox!==undefined?String(source.tilesPerBox):prev.tilesPerBox,
      coverageArea:source?.coverageArea!==undefined?String(source.coverageArea):dc||prev.coverageArea,
      uom:source?.unit||source?.uom||prev.uom,rackLocation:source?.rackLocation||prev.rackLocation,
      lengthCm:parsed.lengthCm||prev.lengthCm,widthCm:parsed.widthCm||prev.widthCm,
      image:nextImage||prev.image,
    }));
    if (nextImage) setPreview(nextImage);
  };

  const handleChange=(e)=>{ const{name,value}=e.target; setForm((p)=>({...p,[name]:value})); };

  const handleImage=async(e)=>{
    const file=e.target.files?.[0]; if (!file) return;
    try { const c=await compressImage(file,600,0.7); setPreview(c); setForm((p)=>({...p,image:c})); }
    catch { toast.error("Failed to process image"); }
  };

  const handleReset=()=>{ setForm(empty()); setSelectedSup(null); setPreview(""); };

  const validate=()=>{
    if (!selectedSup) return toast.error("Please select a supplier"),false;
    if (!form.name.trim()) return toast.error("Tile name is required"),false;
    if (!form.code.trim()) return toast.error("SKU / Product code is required"),false;
    if (!form.category) return toast.error("Category is required"),false;
    if (!form.brand) return toast.error("Brand is required"),false;
    if (!form.finish) return toast.error("Finish is required"),false;
    if (!form.lengthCm||!form.widthCm) return toast.error("Dimensions required"),false;
    if (!form.price) return toast.error("Price is required"),false;
    if (!form.stock) return toast.error("Stock is required"),false;
    if (form.gst==="") return toast.error("GST rate is required"),false;
    return true;
  };

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
      minStockAlert:numericOrZero(form.reorderLevel),
      supplierId:selectedSup._id,supplierName:selectedSup.name,isSupplierItem:true,
    };
    try {
      await createProduct(payload);
      toast.success("Supplier product added");
      if (typeof onSaved==="function") await onSaved();
      handleReset();
    } catch(err) {
      const msg=err?.response?.data?.error||"";
      toast.error(msg.includes("duplicate")?"Product code already exists":"Failed to add product");
    } finally { setLoading(false); }
  };

  const disabled = !selectedSup;

  return (
    <Box sx={{ background: T.bg, minHeight: "100%", p: embedded?0:2 }}>
      {!embedded && (
        <Box sx={{ mb:2 }}>
          <Typography sx={{ fontSize:22, fontWeight:800, color:T.text }}>Add Supplier Product</Typography>
          <Typography sx={{ fontSize:12, color:T.muted, mt:0.3 }}>Select a supplier and fill in product details</Typography>
        </Box>
      )}

      <Box sx={{ background:T.white, border:`1px solid ${T.border}` }}>

        {/* Supplier selector */}
        <Box sx={{ background:T.primary, px:2.5, py:1.4, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Typography sx={{ fontSize:13, fontWeight:700, color:"#fff" }}>Select Supplier *</Typography>
          {selectedSup && <Box sx={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>✓ {selectedSup.name}</Box>}
        </Box>

        <Box sx={{ p:2, borderBottom:`1px solid ${T.border}`, background:"#fafcfe" }}>
          {supLoading ? <CircularProgress size={22}/> : (
            <Box sx={{ display:"flex", gap:2, alignItems:"flex-end", flexWrap:"wrap" }}>
              <Box sx={{ minWidth:300 }}>
                <Box component="span" sx={labelSx}>Supplier *</Box>
                <TextField select size="small" fullWidth value={selectedSup?._id||""}
                  onChange={(e)=>{ const s=suppliers.find((x)=>x._id===e.target.value)||null; handleSupplierChange(s); }}
                  sx={inputSx}>
                  <MenuItem value="">— Select Supplier —</MenuItem>
                  {suppliers.map((s)=>(<MenuItem key={s._id} value={s._id}>{s.name}{s.phone?` | ${s.phone}`:""}</MenuItem>))}
                </TextField>
              </Box>
              {selectedSup && (
                <Box sx={{ display:"flex", gap:0, border:`1px solid ${T.border}`, flex:1 }}>
                  {[
                    {key:"Phone",  val:selectedSup.phone||"-"},
                    {key:"Address",val:selectedSup.address||"-"},
                    {key:"Items",  val:supplierItemLabel},
                  ].map(({key,val},i,arr)=>(
                    <Box key={key} sx={{ px:1.5, py:1, borderRight:i<arr.length-1?`1px solid ${T.border}`:"none", flex:i===2?2:1, minWidth:0 }}>
                      <Typography sx={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".05em" }}>{key}</Typography>
                      <Typography sx={{ fontSize:12, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Form body */}
        <Box sx={{ p:2.5, opacity:disabled?0.45:1, pointerEvents:disabled?"none":"auto" }}>

          {/* Basic Details */}
          <Box sx={sectionSx}>📦 Basic Details</Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6 }}>
            <Box sx={{ gridColumn:"span 2" }}>
              <Fld label="Tile Name" required>
                <Autocomplete
                  freeSolo
                  openOnFocus
                  autoHighlight
                  options={supNames}
                  value={form.name}
                  inputValue={form.name}
                  onInputChange={(_, value, reason)=>{
                    if (reason === "reset") return;
                    setForm((p)=>({...p,name:value}));
                    if (supNames.some((n)=>normalize(n)===normalize(value))) handleNamePick(value);
                  }}
                  onChange={(_, value)=>{
                    const nextValue = String(value || "");
                    setForm((p)=>({...p,name:nextValue}));
                    if (nextValue) handleNamePick(nextValue);
                  }}
                  filterOptions={(options, state)=>{
                    const query = normalize(state.inputValue);
                    if (!query) return options;
                    return options.filter((option)=>normalize(option).includes(query));
                  }}
                  renderInput={(params)=>(
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      placeholder="Search or type product name"
                      sx={inputSx}
                      onBlur={()=>{
                        if (form.name && supNames.some((n)=>normalize(n)===normalize(form.name))) handleNamePick(form.name);
                      }}
                    />
                  )}
                />
              </Fld>
            </Box>
            <Fld label="SKU / Code" required>
              <TextField fullWidth size="small" name="code" value={form.code} onChange={handleChange} placeholder="TIL-0042" sx={inputSx} inputProps={{style:{textTransform:"uppercase"}}}/>
            </Fld>
            <Fld label="Barcode / EAN">
              <TextField fullWidth size="small" name="barcode" value={form.barcode} onChange={handleChange} placeholder="Scan or type" sx={inputSx}/>
            </Fld>
          </Box>

          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:1.6, mt:1.6 }}>
            <Fld label="Category" required>
              <TextField select fullWidth size="small" name="category" value={form.category} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select category</MenuItem>
                {categoryOptions.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Brand" required>
              <TextField select fullWidth size="small" name="brand" value={form.brand} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select brand</MenuItem>
                {BRAND_OPTIONS.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Finish" required>
              <TextField select fullWidth size="small" name="finish" value={form.finish} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select finish</MenuItem>
                {FINISH_OPTIONS.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Fld>
            <Fld label="Color / Shade">
              {supColorDesigns.length>0?(
                <TextField select fullWidth size="small" name="colorDesign" value={form.colorDesign}
                  onChange={(e)=>{ const v=e.target.value; const img=autoImageFor(form.name,v); setForm((p)=>({...p,colorDesign:v,image:img||p.image})); if (img) setPreview(img); }} sx={inputSx}>
                  <MenuItem value="">— Select —</MenuItem>
                  {supColorDesigns.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              ):(
                <TextField fullWidth size="small" name="colorDesign" value={form.colorDesign} onChange={handleChange} placeholder="Beige, Grey..." sx={inputSx}/>
              )}
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
            <Fld label="Retail Price (₹/sqft)" required>
              <TextField fullWidth size="small" name="price" value={form.price} onChange={handleChange} type="number" placeholder="85.00" sx={inputSx}
                helperText={suggestedPrices.length>0?`Suggested: ${suggestedPrices.join(", ")}`:""}
                FormHelperTextProps={{sx:{fontSize:10,mt:0.3}}}/>
            </Fld>
            <Fld label="Dealer / Bulk Price"><TextField fullWidth size="small" name="dealerPrice" value={form.dealerPrice} onChange={handleChange} type="number" placeholder="72.00" sx={inputSx}/></Fld>
            <Fld label="Cost / Purchase Price"><TextField fullWidth size="small" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} type="number" placeholder="62.00" sx={inputSx}/></Fld>
            <Fld label="Min Sell Price"><TextField fullWidth size="small" name="minimumSellPrice" value={form.minimumSellPrice} onChange={handleChange} type="number" placeholder="78.00" sx={inputSx}/></Fld>
            <Fld label="Contractor Price"><TextField fullWidth size="small" name="contractorPrice" value={form.contractorPrice} onChange={handleChange} type="number" placeholder="78.00" sx={inputSx}/></Fld>
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
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:1.6 }}>
            <Fld label="Opening Stock (sqft)" required>
              <TextField fullWidth size="small" name="stock" value={form.stock} onChange={handleChange} type="number" placeholder="0" sx={inputSx} InputProps={{readOnly:true}}
                helperText={suggestedQty.length>0?`Suggested: ${suggestedQty.join(", ")}`:"Auto-calculated"}
                FormHelperTextProps={{sx:{fontSize:10,mt:0.3}}}/>
            </Fld>
            <Fld label="Opening Stock (boxes)" required><TextField fullWidth size="small" name="stockBoxes" value={form.stockBoxes} onChange={handleChange} type="number" placeholder="0" sx={inputSx}/></Fld>
            <Fld label="Min Stock Level" required><TextField fullWidth size="small" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} type="number" placeholder="100" sx={inputSx}/></Fld>
            <Fld label="Rack Location">
              <TextField select={rackOptions.length>0} fullWidth size="small" name="rackLocation" value={form.rackLocation} onChange={handleChange} placeholder="Rack-A3" sx={inputSx}>
                {rackOptions.length>0&&[<MenuItem key="" value="">Select rack</MenuItem>,...rackOptions.map((r)=><MenuItem key={r} value={r}>{r}</MenuItem>)]}
              </TextField>
            </Fld>
            <Fld label="UOM" required>
              <TextField select fullWidth size="small" name="uom" value={form.uom} onChange={handleChange} sx={inputSx}>
                <MenuItem value="">Select UOM</MenuItem>
                {uomOptions.map((u)=><MenuItem key={u} value={u}>{u}</MenuItem>)}
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
              {loading?"Saving...":"✓ Save Supplier Product"}
            </Box>
            <Box onClick={handleReset}
              sx={{ display:"inline-flex", alignItems:"center", gap:"6px", px:2.5, py:1, border:`1px solid ${T.border}`, color:T.text, cursor:"pointer", fontSize:13, fontWeight:600, background:T.white, "&:hover":{ background:"#f1f5f9", borderColor:T.primary, color:T.primary } }}>
              ↺ Reset
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SupplierAddItem;

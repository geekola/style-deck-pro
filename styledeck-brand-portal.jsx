import { useState, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Casual","Business","Formal","Custom"];
const INDUSTRIES = ["Film","Music","Sports","Fashion","Business","Media","Technology","Other"];
const PERIOD_TYPES = [
  { value:"rolling_30",        label:"Rolling 30 days"   },
  { value:"rolling_60",        label:"Rolling 60 days"   },
  { value:"rolling_90",        label:"Rolling 90 days"   },
  { value:"calendar_quarter",  label:"Calendar quarter"  },
  { value:"calendar_year",     label:"Calendar year"     },
];
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`;

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_BRANDS = {
  "brand_armani_001": { id:"brand_armani_001", brandName:"Armani", email:"admin@armani.com", password:"luxury2026!", category:"Formal", status:"approved", registeredAt:"2026-01-10T09:00:00Z", fulfilmentEmail:"orders@armani.com" },
  "brand_levis_001":  { id:"brand_levis_001",  brandName:"Levi's", email:"admin@levis.com",  password:"denim2026!",  category:"Casual", status:"approved", registeredAt:"2026-02-05T10:00:00Z", fulfilmentEmail:"orders@levis.com"  },
  "brand_pending_01": { id:"brand_pending_01", brandName:"Nova Couture", email:"hello@novacouture.com", password:"nova2026!", category:"Formal", status:"pending", registeredAt:"2026-06-03T14:22:00Z", fulfilmentEmail:"orders@novacouture.com" },
};
const SEED_PRODUCTS = {
  "brand_armani_001": [
    { id:"p_arm_001", brandId:"brand_armani_001", name:"Peak Lapel Tuxedo",   category:"Formal", itemType:"gift",    costPrice:4800, price:null, returnPolicy:null, images:["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400","https://images.unsplash.com/photo-1598808503746-f34c53b9323e?w=400"], heroImageIndex:0, active:true, createdAt:"2026-01-15T09:00:00Z", description:"Black tie perfection in midnight wool." },
    { id:"p_arm_002", brandId:"brand_armani_001", name:"Cashmere Overcoat",   category:"Formal", itemType:"purchase",costPrice:3200, price:8500, returnPolicy:"14-day returns on unworn items with tags attached.", images:["https://images.unsplash.com/photo-1544441893-675973e31985?w=400"], heroImageIndex:0, active:true,  createdAt:"2026-01-20T09:00:00Z", description:"Full-length cashmere in charcoal." },
    { id:"p_arm_003", brandId:"brand_armani_001", name:"Velvet Dinner Jacket",category:"Formal", itemType:"gift",    costPrice:3600, price:null, returnPolicy:null, images:["https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400"], heroImageIndex:0, active:false, createdAt:"2026-02-01T09:00:00Z", description:"Midnight blue velvet, peak lapel." },
  ],
  "brand_levis_001": [
    { id:"p_lev_001", brandId:"brand_levis_001", name:"Classic Taper Jean",   category:"Casual", itemType:"gift",    costPrice:120, price:null, returnPolicy:null, images:["https://images.unsplash.com/photo-1542272604-787c3835535d?w=400"], heroImageIndex:0, active:true, createdAt:"2026-02-10T09:00:00Z", description:"The original 502 in dark indigo." },
    { id:"p_lev_002", brandId:"brand_levis_001", name:"Sherpa Trucker Jacket",category:"Casual", itemType:"purchase",costPrice:180, price:420, returnPolicy:"30-day returns in original condition.", images:["https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400","https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400"], heroImageIndex:0, active:true, createdAt:"2026-02-15T09:00:00Z", description:"Classic trucker with sherpa lining." },
  ],
};
const SEED_APP_USERS = {
  "user_cel_01": { id:"user_cel_01", name:"Jordan Lee",   email:"jordan@agency.com",  industry:"Film",    profileComplete:true  },
  "user_cel_02": { id:"user_cel_02", name:"Sam Rivera",   email:"sam@mgmt.com",        industry:"Music",   profileComplete:true  },
  "user_spt_01": { id:"user_spt_01", name:"Taylor Kim",   email:"taylor@sports.com",   industry:"Sports",  profileComplete:true  },
  "user_biz_01": { id:"user_biz_01", name:"Morgan Blake", email:"morgan@company.com",  industry:"Business",profileComplete:false },
  "user_med_01": { id:"user_med_01", name:"Casey Quinn",  email:"casey@media.com",     industry:"Media",   profileComplete:true  },
};
const SEED_ACCESS = {
  "brand_armani_001": {
    _policy:"selective",
    "user_cel_01": { status:"approved", approvedAt:"2026-01-20T10:00:00Z", giftingAllowance:{ limit:15000, periodType:"rolling_90", periodStart:"2026-04-01T00:00:00Z", periodEnd:"2026-06-30T23:59:59Z", consumed:7000, transactions:[], currency:"USD" } },
    "user_cel_02": { status:"denied",   deniedAt:"2026-01-21T10:00:00Z", giftingAllowance:null },
  },
  "brand_levis_001": { _policy:"open" },
};
const SEED_RESTRICTIONS = [
  { id:"restr_001", userId:"user_cel_01", brandId:"brand_pending_01", reason:"Contract exclusivity — Brand X deal", expiresAt:null, createdAt:"2026-03-01T00:00:00Z", createdBy:"platform_admin" },
];
const SEED_NOTIFICATIONS = [
  { id:"notif_001", type:"new_brand_registration", brandId:"brand_pending_01", brandName:"Nova Couture", message:"New brand registration: Nova Couture (hello@novacouture.com)", createdAt:"2026-06-03T14:22:00Z", read:false },
];

// ─── Logic Helpers ────────────────────────────────────────────────────────────
function getPeriodBoundaries(periodType, anchor) {
  const d = new Date(anchor);
  if (periodType==="rolling_30") return { start:anchor, end:new Date(d.getTime()+30*86400000).toISOString() };
  if (periodType==="rolling_60") return { start:anchor, end:new Date(d.getTime()+60*86400000).toISOString() };
  if (periodType==="rolling_90") return { start:anchor, end:new Date(d.getTime()+90*86400000).toISOString() };
  if (periodType==="calendar_quarter") {
    const q=Math.floor(d.getMonth()/3);
    return { start:new Date(d.getFullYear(),q*3,1).toISOString(), end:new Date(d.getFullYear(),q*3+3,0,23,59,59).toISOString() };
  }
  return { start:new Date(d.getFullYear(),0,1).toISOString(), end:new Date(d.getFullYear(),11,31,23,59,59).toISOString() };
}
function isRestrictionActive(r) { return !r.removedAt && (!r.expiresAt || new Date(r.expiresAt)>new Date()); }
function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"; }
function fmtCurrency(n) { return n!=null ? `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2})}` : "—"; }

// ─── Shared UI primitives ─────────────────────────────────────────────────────
const T = { // tokens
  bg:   "#0f0f0f", surface:"#181818", border:"rgba(255,255,255,0.08)",
  gold: "#c8a96e", goldDim:"rgba(200,169,110,0.25)",
  text: "#f0ece4", muted:"rgba(240,236,228,0.45)",
  green:"#4ade80", red:"#f87171", amber:"#fbbf24",
};
const pill = (label, color) => (
  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${color}18`, color, fontFamily:"'Jost',sans-serif", fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</span>
);
const Btn = ({ children, onClick, variant="primary", small=false, disabled=false, style:s={} }) => {
  const base = { fontFamily:"'Jost',sans-serif", fontWeight:500, cursor:disabled?"not-allowed":"pointer",
    borderRadius:6, border:"none", transition:"all 0.15s", letterSpacing:"0.04em",
    fontSize: small?11:13, padding: small?"5px 12px":"9px 20px", opacity:disabled?0.45:1, ...s };
  if (variant==="primary")  return <button onClick={onClick} disabled={disabled} style={{ ...base, background:T.gold, color:"#0f0f0f" }}>{children}</button>;
  if (variant==="ghost")    return <button onClick={onClick} disabled={disabled} style={{ ...base, background:"transparent", color:T.muted, border:`1px solid ${T.border}` }}>{children}</button>;
  if (variant==="danger")   return <button onClick={onClick} disabled={disabled} style={{ ...base, background:"rgba(248,113,113,0.12)", color:T.red, border:`1px solid rgba(248,113,113,0.2)` }}>{children}</button>;
  if (variant==="success")  return <button onClick={onClick} disabled={disabled} style={{ ...base, background:"rgba(74,222,128,0.12)", color:T.green, border:`1px solid rgba(74,222,128,0.2)` }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={base}>{children}</button>;
};
const Input = ({ value, onChange, placeholder, type="text", style:s={} }) => {
  const [f,setF] = useState(false);
  return <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${f?T.gold:T.border}`,
      background:"rgba(255,255,255,0.04)", color:T.text, fontSize:13, fontFamily:"'Jost',sans-serif",
      outline:"none", boxSizing:"border-box", transition:"border 0.15s", ...s }} />;
};
const Textarea = ({ value, onChange, placeholder, rows=3 }) => {
  const [f,setF] = useState(false);
  return <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${f?T.gold:T.border}`,
      background:"rgba(255,255,255,0.04)", color:T.text, fontSize:13, fontFamily:"'Jost',sans-serif",
      outline:"none", boxSizing:"border-box", transition:"border 0.15s", resize:"vertical" }} />;
};
const Select = ({ value, onChange, options, style:s={} }) => (
  <select value={value||""} onChange={e=>onChange(e.target.value)}
    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${T.border}`,
      background:"rgba(255,255,255,0.04)", color:T.text, fontSize:13, fontFamily:"'Jost',sans-serif",
      outline:"none", boxSizing:"border-box", cursor:"pointer", ...s }}>
    {options.map(o=> <option key={o.value||o} value={o.value||o} style={{ background:T.surface }}>{o.label||o}</option>)}
  </select>
);
const Label = ({ children }) => <div style={{ fontSize:11, color:T.muted, marginBottom:6, fontFamily:"'Jost',sans-serif", letterSpacing:"0.06em", textTransform:"uppercase" }}>{children}</div>;
const Card = ({ children, style:s={} }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20, ...s }}>{children}</div>;
const SectionTitle = ({ children }) => <div style={{ fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:T.gold, fontFamily:"'Jost',sans-serif", fontWeight:600, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>{children}</div>;
const Divider = () => <div style={{ height:1, background:T.border, margin:"20px 0" }}/>;
const Badge = ({ children, color=T.gold }) => <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${color}20`, color, border:`1px solid ${color}30`, fontFamily:"'Jost',sans-serif", fontWeight:600, letterSpacing:"0.06em" }}>{children}</span>;
const StatBox = ({ label, value, sub, color=T.text }) => (
  <Card style={{ textAlign:"center", padding:"18px 12px" }}>
    <div style={{ fontSize:28, fontFamily:"'Cormorant Garamond',serif", fontWeight:600, color, marginBottom:2 }}>{value}</div>
    <div style={{ fontSize:11, color:T.gold, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'Jost',sans-serif", marginBottom:2 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:T.muted, fontFamily:"'Jost',sans-serif" }}>{sub}</div>}
  </Card>
);

// ─── Platform Admin Login ─────────────────────────────────────────────────────
function PlatformLogin({ onLogin }) {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit = e => {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      if (email==="admin@styledeck.com" && pw==="admin2026!") onLogin({ role:"platform", name:"StyleDeck Admin" });
      else setErr("Invalid credentials. Try admin@styledeck.com / admin2026!");
      setLoading(false);
    },600);
  };
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Jost',sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ width:380, background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:"40px 36px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:11, letterSpacing:"0.18em", color:T.gold, textTransform:"uppercase", marginBottom:8, fontFamily:"'Jost',sans-serif" }}>StyleDeck</div>
          <div style={{ fontSize:28, fontFamily:"'Cormorant Garamond',serif", color:T.text, fontWeight:500 }}>Brand Portal</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:6 }}>Platform administration</div>
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div><Label>Email</Label><Input value={email} onChange={setEmail} placeholder="admin@styledeck.com" type="email"/></div>
          <div><Label>Password</Label><Input value={pw} onChange={setPw} placeholder="••••••••" type="password"/></div>
          {err && <div style={{ fontSize:12, color:T.red, background:"rgba(248,113,113,0.08)", borderRadius:7, padding:"8px 12px" }}>{err}</div>}
          <Btn onClick={()=>{}} disabled={loading}>{loading?"Signing in…":"Sign in as Platform Admin"}</Btn>
        </form>
        <Divider/>
        <div style={{ fontSize:11, color:T.muted, textAlign:"center" }}>Or sign in as a brand:</div>
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          {Object.values(SEED_BRANDS).filter(b=>b.status==="approved").map(b=>(
            <button key={b.id} onClick={()=>onLogin({ role:"brand", brand:b })} style={{ padding:"8px 12px", borderRadius:7, border:`1px solid ${T.border}`, background:"transparent", color:T.muted, cursor:"pointer", fontSize:12, fontFamily:"'Jost',sans-serif", textAlign:"left" }}>
              <span style={{ color:T.gold }}>→</span> {b.brandName} <span style={{ color:T.muted, fontSize:10 }}>({b.category})</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:14, fontSize:10, color:T.muted, textAlign:"center" }}>admin@styledeck.com / admin2026!</div>
      </div>
    </div>
  );
}

// ─── Brand Login / Register ───────────────────────────────────────────────────
function BrandAuth({ onLogin, existingBrands, onRegister }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({ brandName:"",email:"",password:"",confirmPassword:"",category:"",contactName:"",website:"",fulfilmentEmail:"",agreedToTerms:false });
  const [regResult,setRegResult]=useState(null);

  const login = e => {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      const brand = Object.values(existingBrands).find(b=>b.email===email.toLowerCase());
      if (!brand || brand.password!==pw) { setErr("Invalid credentials"); setLoading(false); return; }
      if (brand.status==="pending") { setErr("Your account is pending review by the StyleDeck team. You will be notified once approved."); setLoading(false); return; }
      if (brand.status==="rejected") { setErr("Your application was not approved. Please contact support@styledeck.com for details."); setLoading(false); return; }
      onLogin({ role:"brand", brand });
      setLoading(false);
    },600);
  };

  const register = e => {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      const errors = [];
      if (!form.brandName.trim()) errors.push("Brand name required");
      if (!form.email.includes("@")) errors.push("Valid email required");
      if (form.password.length<8) errors.push("Password must be at least 8 characters");
      if (form.password!==form.confirmPassword) errors.push("Passwords do not match");
      if (!form.category) errors.push("Category required");
      if (!form.agreedToTerms) errors.push("You must agree to the platform terms");
      if (Object.values(existingBrands).find(b=>b.email===form.email.toLowerCase())) errors.push("An account with this email already exists");
      if (errors.length) { setErr(errors.join(" · ")); setLoading(false); return; }
      const result = onRegister(form);
      setRegResult(result);
      setLoading(false);
    },700);
  };

  if (regResult) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{FONTS}</style>
      <Card style={{ width:420, textAlign:"center", padding:40 }}>
        <div style={{ fontSize:36, marginBottom:16 }}>✦</div>
        <div style={{ fontSize:22, fontFamily:"'Cormorant Garamond',serif", color:T.gold, marginBottom:10 }}>Application Submitted</div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.7 }}>Your brand registration has been received. The StyleDeck team will review your application and respond within 1 business day.</div>
        <Btn onClick={()=>setRegResult(null)} style={{ marginTop:24, width:"100%" }}>Back to Sign In</Btn>
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{FONTS}</style>
      <div style={{ width:420, background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:"40px 36px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:11, letterSpacing:"0.18em", color:T.gold, textTransform:"uppercase", marginBottom:8 }}>StyleDeck</div>
          <div style={{ fontSize:26, fontFamily:"'Cormorant Garamond',serif", color:T.text, fontWeight:500 }}>Brand Portal</div>
          <div style={{ display:"flex", gap:0, marginTop:18, borderRadius:8, overflow:"hidden", border:`1px solid ${T.border}` }}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:"9px 0", border:"none", background:mode===m?T.gold:"transparent", color:mode===m?"#0f0f0f":T.muted, cursor:"pointer", fontSize:12, fontFamily:"'Jost',sans-serif", fontWeight:500, transition:"all 0.15s", textTransform:"capitalize" }}>{m==="login"?"Sign In":"Register"}</button>
            ))}
          </div>
        </div>

        {mode==="login" ? (
          <form onSubmit={login} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><Label>Email</Label><Input value={email} onChange={setEmail} placeholder="brand@company.com" type="email"/></div>
            <div><Label>Password</Label><Input value={pw} onChange={setPw} placeholder="••••••••" type="password"/></div>
            {err && <div style={{ fontSize:12, color:T.amber, background:"rgba(251,191,36,0.08)", borderRadius:7, padding:"8px 12px", lineHeight:1.5 }}>{err}</div>}
            <Btn onClick={()=>{}} disabled={loading}>{loading?"Signing in…":"Sign In"}</Btn>
            <div style={{ fontSize:10, color:T.muted, textAlign:"center" }}>Demo: admin@armani.com / luxury2026!</div>
          </form>
        ) : (
          <form onSubmit={register} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div><Label>Brand Name *</Label><Input value={form.brandName} onChange={v=>setForm(f=>({...f,brandName:v}))} placeholder="Your brand name"/></div>
            <div><Label>Category *</Label><Select value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} options={[{value:"",label:"Select category…"},...CATEGORIES.map(c=>({value:c,label:c}))]}/></div>
            <div><Label>Contact Name</Label><Input value={form.contactName} onChange={v=>setForm(f=>({...f,contactName:v}))} placeholder="Primary contact"/></div>
            <div><Label>Email *</Label><Input value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="admin@brand.com" type="email"/></div>
            <div><Label>Fulfilment Email</Label><Input value={form.fulfilmentEmail} onChange={v=>setForm(f=>({...f,fulfilmentEmail:v}))} placeholder="orders@brand.com" type="email"/></div>
            <div><Label>Password *</Label><Input value={form.password} onChange={v=>setForm(f=>({...f,password:v}))} placeholder="Min 8 characters" type="password"/></div>
            <div><Label>Confirm Password *</Label><Input value={form.confirmPassword} onChange={v=>setForm(f=>({...f,confirmPassword:v}))} placeholder="Repeat password" type="password"/></div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginTop:4 }}>
              <input type="checkbox" checked={form.agreedToTerms} onChange={e=>setForm(f=>({...f,agreedToTerms:e.target.checked}))} style={{ marginTop:2, accentColor:T.gold }}/>
              <span style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>I agree to the StyleDeck Brand Partner Terms and Platform Policy</span>
            </div>
            {err && <div style={{ fontSize:12, color:T.red, background:"rgba(248,113,113,0.08)", borderRadius:7, padding:"8px 12px", lineHeight:1.5 }}>{err}</div>}
            <Btn onClick={()=>{}} disabled={loading}>{loading?"Submitting…":"Submit Application"}</Btn>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────
function ProductForm({ brandId, onSave, onCancel, existing=null }) {
  const [form,setForm] = useState(existing || { name:"",description:"",category:"",itemType:"gift",price:"",costPrice:"",returnPolicy:"",images:[] });
  const [errors,setErrors] = useState([]);
  const [imageUrl,setImageUrl] = useState("");

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const addImage = () => {
    if (!imageUrl.trim()) return;
    if (form.images.length>=3) { setErrors(["Maximum 3 images per product"]); return; }
    setForm(f=>({...f,images:[...f.images,imageUrl.trim()]})); setImageUrl("");
  };
  const removeImage = idx => setForm(f=>({...f,images:f.images.filter((_,i)=>i!==idx)}));
  const setHero = idx => setForm(f=>({...f,heroImageIndex:idx}));

  const save = () => {
    const errs = [];
    if (!form.name.trim()) errs.push("Product name required");
    if (!CATEGORIES.includes(form.category)) errs.push("Category required");
    if (!["gift","purchase"].includes(form.itemType)) errs.push("Item type required");
    if (form.itemType==="purchase" && (!form.price||parseFloat(form.price)<=0)) errs.push("Retail price required for purchase items");
    if (form.itemType==="purchase" && !form.returnPolicy?.trim()) errs.push("Return policy required for purchase items");
    if (!form.costPrice||parseFloat(form.costPrice)<=0) errs.push("Brand cost price required");
    if (!form.images.length) errs.push("At least 1 image required");
    if (errs.length) { setErrors(errs); return; }
    onSave({ ...form, brandId, price:form.itemType==="purchase"?parseFloat(form.price):null, costPrice:parseFloat(form.costPrice), heroImageIndex:form.heroImageIndex||0, active:existing?.active??true, id:existing?.id||`prod_${brandId}_${Date.now()}`, createdAt:existing?.createdAt||new Date().toISOString() });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ gridColumn:"1/-1" }}><Label>Product Name *</Label><Input value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Peak Lapel Tuxedo"/></div>
        <div><Label>Category *</Label><Select value={form.category} onChange={v=>set("category",v)} options={[{value:"",label:"Select…"},...CATEGORIES.map(c=>({value:c,label:c}))]}/></div>
        <div>
          <Label>Item Type *</Label>
          <div style={{ display:"flex", borderRadius:7, overflow:"hidden", border:`1px solid ${T.border}` }}>
            {["gift","purchase"].map(t=>(
              <button key={t} onClick={()=>set("itemType",t)} style={{ flex:1, padding:"9px 0", border:"none", background:form.itemType===t?T.goldDim:"transparent", color:form.itemType===t?T.gold:T.muted, cursor:"pointer", fontSize:12, fontFamily:"'Jost',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s" }}>
                {t==="gift"?"🎁 Gift":"💲 Purchase"}
              </button>
            ))}
          </div>
        </div>
        <div><Label>Brand Cost Price * (USD)</Label><Input value={form.costPrice} onChange={v=>set("costPrice",v)} placeholder="e.g. 3200" type="number"/></div>
        {form.itemType==="purchase" && <div><Label>Retail Price * (USD)</Label><Input value={form.price} onChange={v=>set("price",v)} placeholder="e.g. 8500" type="number"/></div>}
        {form.itemType==="purchase" && <div style={{ gridColumn:"1/-1" }}><Label>Return / Exchange Policy * (required for purchase items)</Label><Textarea value={form.returnPolicy} onChange={v=>set("returnPolicy",v)} placeholder="e.g. 14-day returns on unworn items with tags attached. No returns on bespoke orders." rows={2}/></div>}
        <div style={{ gridColumn:"1/-1" }}><Label>Description</Label><Textarea value={form.description} onChange={v=>set("description",v)} placeholder="Brief product description for the customer view."/></div>
      </div>

      <div>
        <Label>Product Images (max 3) — first selected = hero image</Label>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <Input value={imageUrl} onChange={setImageUrl} placeholder="Paste image URL…" style={{ flex:1 }}/>
          <Btn onClick={addImage} disabled={form.images.length>=3} small>Add</Btn>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {form.images.map((img,i)=>(
            <div key={i} style={{ position:"relative", width:90, height:90, borderRadius:8, overflow:"hidden", border:`2px solid ${(form.heroImageIndex||0)===i?T.gold:T.border}`, cursor:"pointer" }} onClick={()=>setHero(i)}>
              <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{ e.target.style.display="none"; }}/>
              <div style={{ position:"absolute", top:3, left:3 }}>{(form.heroImageIndex||0)===i && <span style={{ fontSize:9, background:T.gold, color:"#0f0f0f", borderRadius:3, padding:"1px 5px", fontFamily:"'Jost',sans-serif", fontWeight:600 }}>HERO</span>}</div>
              <button onClick={e=>{e.stopPropagation();removeImage(i);}} style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", border:"none", background:"rgba(0,0,0,0.7)", color:"white", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          ))}
          {form.images.length<3 && Array(3-form.images.length).fill(0).map((_,i)=>(
            <div key={i} style={{ width:90, height:90, borderRadius:8, border:`1.5px dashed ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:T.muted, fontSize:20 }}>+</div>
          ))}
        </div>
      </div>

      {errors.length>0 && <div style={{ background:"rgba(248,113,113,0.08)", border:`1px solid rgba(248,113,113,0.2)`, borderRadius:8, padding:"10px 14px" }}>
        {errors.map((e,i)=><div key={i} style={{ fontSize:12, color:T.red, fontFamily:"'Jost',sans-serif" }}>· {e}</div>)}
      </div>}

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
        <Btn onClick={save}>Save Product</Btn>
      </div>
    </div>
  );
}

// ─── Brand Dashboard ──────────────────────────────────────────────────────────
function BrandDashboard({ brand, products, accessStore, appUsers, restrictions, onUpdate }) {
  const [tab,setTab] = useState("catalogue");
  const [showProductForm,setShowProductForm] = useState(false);
  const [editingProduct,setEditingProduct] = useState(null);
  const [selectedUser,setSelectedUser] = useState(null);
  const [industryFilter,setIndustryFilter] = useState("");
  const [allowanceForm,setAllowanceForm] = useState({ limit:"", periodType:"calendar_quarter" });
  const [allowanceSaved,setAllowanceSaved] = useState(false);

  const myProducts = products[brand.id]||[];
  const myAccess   = accessStore[brand.id]||{};
  const myPolicy   = myAccess._policy||"open";

  // Users not restricted from this brand
  const visibleUsers = Object.values(appUsers).filter(u =>
    !restrictions.some(r=>r.userId===u.id&&r.brandId===brand.id&&isRestrictionActive(r))
  );
  const filteredUsers = industryFilter ? visibleUsers.filter(u=>u.industry===industryFilter) : visibleUsers;

  const activeCount   = myProducts.filter(p=>p.active).length;
  const approvedCount = Object.entries(myAccess).filter(([k,v])=>k!=="*"&&k!=="_policy"&&v.status==="approved").length;
  const giftCount     = myProducts.filter(p=>p.itemType==="gift").length;
  const purchaseCount = myProducts.filter(p=>p.itemType==="purchase").length;

  const saveProduct = (productData) => {
    const existing = editingProduct;
    const updated = { ...(products[brand.id]||[]) };
    let newProducts;
    if (existing) {
      newProducts = (products[brand.id]||[]).map(p=>p.id===productData.id?productData:p);
    } else {
      newProducts = [...(products[brand.id]||[]), productData];
    }
    onUpdate({ products:{ ...products, [brand.id]:newProducts } });
    setShowProductForm(false); setEditingProduct(null);
  };

  const toggleActive = (productId) => {
    const newProducts = (products[brand.id]||[]).map(p=>p.id===productId?{...p,active:!p.active}:p);
    onUpdate({ products:{ ...products, [brand.id]:newProducts } });
  };

  const approveUser = (userId) => {
    const updated = { ...myAccess, [userId]:{ status:"approved", approvedAt:new Date().toISOString(), giftingAllowance:null } };
    onUpdate({ accessStore:{ ...accessStore, [brand.id]:updated } });
  };
  const denyUser = (userId) => {
    const updated = { ...myAccess, [userId]:{ ...myAccess[userId], status:"denied", deniedAt:new Date().toISOString() } };
    onUpdate({ accessStore:{ ...accessStore, [brand.id]:updated } });
  };

  const setPolicy = (policy) => {
    onUpdate({ accessStore:{ ...accessStore, [brand.id]:{ ...myAccess, _policy:policy } } });
  };

  const saveAllowance = (userId) => {
    if (!allowanceForm.limit||parseFloat(allowanceForm.limit)<=0) return;
    const userAccess = myAccess[userId];
    if (!userAccess||userAccess.status!=="approved") return;
    const period = getPeriodBoundaries(allowanceForm.periodType, new Date().toISOString());
    const ga = { limit:parseFloat(allowanceForm.limit), periodType:allowanceForm.periodType, periodStart:period.start, periodEnd:period.end, consumed:userAccess.giftingAllowance?.consumed||0, transactions:userAccess.giftingAllowance?.transactions||[], currency:"USD" };
    const updated = { ...myAccess, [userId]:{ ...userAccess, giftingAllowance:ga } };
    onUpdate({ accessStore:{ ...accessStore, [brand.id]:updated } });
    setAllowanceSaved(true); setTimeout(()=>setAllowanceSaved(false),2000);
  };

  const TABS = ["catalogue","customers","settings"];
  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Jost',sans-serif", color:T.text }}>
      <style>{FONTS}</style>
      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 32px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
            <span style={{ fontSize:11, letterSpacing:"0.16em", color:T.gold, textTransform:"uppercase" }}>StyleDeck</span>
            <span style={{ color:T.border }}>|</span>
            <span style={{ fontSize:16, fontFamily:"'Cormorant Garamond',serif", color:T.text }}>{brand.brandName}</span>
            {pill(brand.category, T.gold)}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"6px 16px", borderRadius:6, border:"none", background:tab===t?T.goldDim:"transparent", color:tab===t?T.gold:T.muted, cursor:"pointer", fontSize:12, fontFamily:"'Jost',sans-serif", textTransform:"capitalize", transition:"all 0.15s" }}>{t}</button>
            ))}
            <button onClick={()=>onUpdate({logout:true})} style={{ marginLeft:8, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.border}`, background:"transparent", color:T.muted, cursor:"pointer", fontSize:11, fontFamily:"'Jost',sans-serif" }}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{ padding:32, maxWidth:1100, margin:"0 auto" }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          <StatBox label="Active Products" value={activeCount} sub={`${giftCount} gift · ${purchaseCount} purchase`}/>
          <StatBox label="Approved Customers" value={approvedCount}/>
          <StatBox label="Access Policy" value={myPolicy.charAt(0).toUpperCase()+myPolicy.slice(1)} color={myPolicy==="open"?T.green:myPolicy==="selective"?T.amber:T.gold}/>
          <StatBox label="Total Products" value={myProducts.length}/>
        </div>

        {/* Catalogue Tab */}
        {tab==="catalogue" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <SectionTitle>Product Catalogue</SectionTitle>
              <Btn onClick={()=>{ setEditingProduct(null); setShowProductForm(true); }}>+ Add Product</Btn>
            </div>

            {showProductForm && (
              <Card style={{ marginBottom:24 }}>
                <div style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", marginBottom:18, color:T.gold }}>{editingProduct?"Edit Product":"New Product"}</div>
                <ProductForm brandId={brand.id} existing={editingProduct} onSave={saveProduct} onCancel={()=>{ setShowProductForm(false); setEditingProduct(null); }}/>
              </Card>
            )}

            {CATEGORIES.map(cat=>{
              const catProducts = myProducts.filter(p=>p.category===cat);
              if (!catProducts.length) return null;
              return (
                <div key={cat} style={{ marginBottom:28 }}>
                  <div style={{ fontSize:11, letterSpacing:"0.1em", color:T.muted, textTransform:"uppercase", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                    {cat} <span style={{ color:T.border }}>—</span> <span>{catProducts.length} items</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                    {catProducts.map(p=>(
                      <Card key={p.id} style={{ position:"relative", opacity:p.active?1:0.55 }}>
                        <div style={{ display:"flex", gap:12 }}>
                          <div style={{ width:72, height:72, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.04)", position:"relative" }}>
                            {p.images[p.heroImageIndex||0] ? <img src={p.images[p.heroImageIndex||0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:T.muted, fontSize:20 }}>□</div>}
                            <div style={{ position:"absolute", bottom:3, right:3, fontSize:14 }}>{p.itemType==="gift"?"🎁":"💲"}</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Cost: {fmtCurrency(p.costPrice)}{p.itemType==="purchase"?` · Retail: ${fmtCurrency(p.price)}`:""}</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {p.active ? <Badge color={T.green}>Active</Badge> : <Badge color={T.muted}>Inactive</Badge>}
                              <Badge color={p.itemType==="gift"?T.amber:T.gold}>{p.itemType==="gift"?"Gift":"Purchase"}</Badge>
                            </div>
                          </div>
                        </div>
                        <Divider/>
                        <div style={{ display:"flex", gap:8 }}>
                          <Btn onClick={()=>{ setEditingProduct(p); setShowProductForm(true); setTab("catalogue"); }} variant="ghost" small>Edit</Btn>
                          <Btn onClick={()=>toggleActive(p.id)} variant={p.active?"danger":"success"} small>{p.active?"Deactivate":"Activate"}</Btn>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {!myProducts.length && <div style={{ textAlign:"center", padding:"60px 0", color:T.muted }}>No products yet. Add your first product above.</div>}
          </div>
        )}

        {/* Customers Tab */}
        {tab==="customers" && (
          <div>
            <SectionTitle>Customer Access Manager</SectionTitle>
            <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
              <div style={{ flex:1 }}>
                <Select value={industryFilter} onChange={setIndustryFilter} options={[{value:"",label:"All industries"},...INDUSTRIES.map(i=>({value:i,label:i}))]} style={{ maxWidth:220 }}/>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filteredUsers.map(user=>{
                const access = myAccess[user.id];
                const ga = access?.giftingAllowance;
                const consumed = ga?.consumed||0;
                const pct = ga ? Math.min(100,Math.round((consumed/ga.limit)*100)) : 0;
                const isSelected = selectedUser===user.id;
                return (
                  <Card key={user.id} style={{ cursor:"pointer" }} onClick={()=>setSelectedUser(isSelected?null:user.id)}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:T.goldDim, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontFamily:"'Cormorant Garamond',serif", color:T.gold, flexShrink:0 }}>
                        {user.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", marginBottom:2 }}>{user.name}</div>
                        <div style={{ fontSize:11, color:T.muted }}>{user.industry} · {user.email}</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        {ga && <div style={{ textAlign:"right", marginRight:8 }}>
                          <div style={{ fontSize:10, color:T.muted, marginBottom:3 }}>Allowance {pct}% used</div>
                          <div style={{ width:100, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:pct>=90?T.red:pct>=70?T.amber:T.green, borderRadius:2, transition:"width 0.3s" }}/>
                          </div>
                        </div>}
                        {!access && <Badge color={T.muted}>No access</Badge>}
                        {access?.status==="approved" && <Badge color={T.green}>Approved</Badge>}
                        {access?.status==="denied"   && <Badge color={T.red}>Denied</Badge>}
                        <span style={{ color:T.muted, fontSize:12 }}>{isSelected?"▲":"▼"}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div onClick={e=>e.stopPropagation()}>
                        <Divider/>
                        <div style={{ display:"flex", gap:20 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11, color:T.muted, marginBottom:10, letterSpacing:"0.06em", textTransform:"uppercase" }}>Access Control</div>
                            <div style={{ display:"flex", gap:8 }}>
                              <Btn onClick={()=>approveUser(user.id)} variant="success" small disabled={access?.status==="approved"}>✓ Approve</Btn>
                              <Btn onClick={()=>denyUser(user.id)} variant="danger" small disabled={access?.status==="denied"}>✕ Deny</Btn>
                            </div>
                            {access?.status==="approved" && <div style={{ fontSize:10, color:T.muted, marginTop:8 }}>Approved {fmtDate(access.approvedAt)}</div>}
                          </div>
                          {access?.status==="approved" && (
                            <div style={{ flex:2 }}>
                              <div style={{ fontSize:11, color:T.muted, marginBottom:10, letterSpacing:"0.06em", textTransform:"uppercase" }}>Gifting Allowance</div>
                              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                                <div style={{ flex:1 }}>
                                  <Label>USD Limit</Label>
                                  <Input value={allowanceForm.limit} onChange={v=>setAllowanceForm(f=>({...f,limit:v}))} placeholder={ga?`Current: $${ga.limit.toLocaleString()}`:"e.g. 15000"} type="number"/>
                                </div>
                                <div style={{ flex:1 }}>
                                  <Label>Period</Label>
                                  <Select value={allowanceForm.periodType} onChange={v=>setAllowanceForm(f=>({...f,periodType:v}))} options={PERIOD_TYPES}/>
                                </div>
                                <Btn onClick={()=>saveAllowance(user.id)} small style={{ whiteSpace:"nowrap", marginBottom:0 }}>{allowanceSaved?"Saved ✓":"Set Allowance"}</Btn>
                              </div>
                              {ga && <div style={{ fontSize:10, color:T.muted, marginTop:6 }}>
                                Current: {fmtCurrency(consumed)} used of {fmtCurrency(ga.limit)} · Resets {fmtDate(ga.periodEnd)}
                              </div>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
              {!filteredUsers.length && <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>No users in this industry.</div>}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab==="settings" && (
          <div>
            <SectionTitle>Portal Settings</SectionTitle>
            <Card>
              <div style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", marginBottom:16, color:T.gold }}>Access Policy</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:16, lineHeight:1.7 }}>
                Controls who can see your products in the StyleDeck app. Users outside your access level will not see your products — with no indication of exclusion.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[["open","Open to all","All StyleDeck users see your products automatically."],
                  ["selective","Selective","Only users you approve see your products."],
                  ["invite-only","Invite Only","Products are invisible unless you have explicitly approved the user."]].map(([v,l,desc])=>(
                  <button key={v} onClick={()=>setPolicy(v)} style={{ padding:"14px 16px", borderRadius:8, border:`1.5px solid ${myPolicy===v?T.gold:T.border}`, background:myPolicy===v?T.goldDim:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                    <div style={{ fontSize:13, color:myPolicy===v?T.gold:T.text, fontFamily:"'Jost',sans-serif", fontWeight:500, marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{desc}</div>
                  </button>
                ))}
              </div>
            </Card>
            <Card style={{ marginTop:16 }}>
              <div style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", marginBottom:16, color:T.gold }}>Brand Profile</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div><Label>Brand Name</Label><Input value={brand.brandName} onChange={()=>{}}/></div>
                <div><Label>Category</Label><Input value={brand.category} onChange={()=>{}}/></div>
                <div><Label>Admin Email</Label><Input value={brand.email} onChange={()=>{}}/></div>
                <div><Label>Fulfilment Email</Label><Input value={brand.fulfilmentEmail||""} onChange={()=>{}}/></div>
              </div>
              <div style={{ marginTop:14 }}><Btn onClick={()=>{}} small>Save Changes</Btn></div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Platform Admin Dashboard ─────────────────────────────────────────────────
function PlatformAdmin({ brands, products, notifications, appUsers, restrictions, onUpdate }) {
  const [tab,setTab]=useState("review");
  const [restrictForm,setRestrictForm]=useState({ userId:"",brandId:"",reason:"",expiresAt:"" });
  const [restrictErr,setRestrictErr]=useState("");
  const [restrictOk,setRestrictOk]=useState("");

  const pending   = Object.values(brands).filter(b=>b.status==="pending");
  const approved  = Object.values(brands).filter(b=>b.status==="approved");
  const rejected  = Object.values(brands).filter(b=>b.status==="rejected");
  const unread    = notifications.filter(n=>!n.read).length;
  const activeR   = restrictions.filter(r=>isRestrictionActive(r));

  const approveBrand = (brandId) => {
    onUpdate({ brands:{ ...brands, [brandId]:{ ...brands[brandId], status:"approved", reviewedAt:new Date().toISOString() } }, notifications:notifications.map(n=>n.brandId===brandId?{...n,read:true}:n) });
  };
  const rejectBrand = (brandId, reason) => {
    onUpdate({ brands:{ ...brands, [brandId]:{ ...brands[brandId], status:"rejected", reviewedAt:new Date().toISOString(), rejectionReason:reason } }, notifications:notifications.map(n=>n.brandId===brandId?{...n,read:true}:n) });
  };

  const addRestriction = () => {
    setRestrictErr(""); setRestrictOk("");
    const errors = [];
    if (!restrictForm.userId) errors.push("Select a user");
    if (!restrictForm.brandId) errors.push("Select a brand");
    if (!restrictForm.reason.trim()) errors.push("Reason required");
    if (restrictForm.expiresAt && new Date(restrictForm.expiresAt)<=new Date()) errors.push("Expiry must be in the future");
    if (errors.length) { setRestrictErr(errors.join(" · ")); return; }
    const existing = restrictions.find(r=>r.userId===restrictForm.userId&&r.brandId===restrictForm.brandId&&isRestrictionActive(r));
    if (existing) { setRestrictErr("Active restriction already exists for this pair"); return; }
    const r = { id:`restr_${Date.now()}`, ...restrictForm, expiresAt:restrictForm.expiresAt||null, createdAt:new Date().toISOString(), createdBy:"platform_admin" };
    onUpdate({ restrictions:[...restrictions, r] });
    setRestrictForm({ userId:"",brandId:"",reason:"",expiresAt:"" });
    setRestrictOk("Restriction added successfully");
    setTimeout(()=>setRestrictOk(""),3000);
  };

  const removeRestriction = (id) => {
    onUpdate({ restrictions:restrictions.map(r=>r.id===id?{ ...r, removedAt:new Date().toISOString(), removedBy:"platform_admin", removalReason:"Manually removed by admin" }:r) });
  };

  const TABS = [["review",`Review (${pending.length})`],["brands","All Brands"],["restrictions","Restrictions"],["notifications",`Notifications${unread?" ("+unread+")":""}`]];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Jost',sans-serif", color:T.text }}>
      <style>{FONTS}</style>
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 32px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
            <span style={{ fontSize:11, letterSpacing:"0.16em", color:T.gold, textTransform:"uppercase" }}>StyleDeck</span>
            <span style={{ color:T.border }}>|</span>
            <span style={{ fontSize:14, color:T.muted }}>Platform Administration</span>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {TABS.map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"6px 14px", borderRadius:6, border:"none", background:tab===t?T.goldDim:"transparent", color:tab===t?T.gold:T.muted, cursor:"pointer", fontSize:11, fontFamily:"'Jost',sans-serif", transition:"all 0.15s" }}>{l}</button>
            ))}
            <button onClick={()=>onUpdate({logout:true})} style={{ marginLeft:8, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.border}`, background:"transparent", color:T.muted, cursor:"pointer", fontSize:11, fontFamily:"'Jost',sans-serif" }}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{ padding:32, maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          <StatBox label="Pending Review" value={pending.length} color={pending.length?T.amber:T.muted}/>
          <StatBox label="Approved Brands" value={approved.length} color={T.green}/>
          <StatBox label="Active Restrictions" value={activeR.length} color={activeR.length?T.red:T.muted}/>
          <StatBox label="Unread Notifications" value={unread} color={unread?T.gold:T.muted}/>
        </div>

        {tab==="review" && (
          <div>
            <SectionTitle>Pending Brand Applications</SectionTitle>
            {!pending.length && <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>No pending applications.</div>}
            {pending.map(b=>(
              <Card key={b.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20 }}>
                  <div>
                    <div style={{ fontSize:18, fontFamily:"'Cormorant Garamond',serif", marginBottom:4 }}>{b.brandName}</div>
                    <div style={{ fontSize:12, color:T.muted, marginBottom:8 }}>{b.email} · {b.category} · Applied {fmtDate(b.registeredAt)}</div>
                    <Badge color={T.amber}>Pending Review</Badge>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <Btn onClick={()=>rejectBrand(b.id,"Does not meet brand partner guidelines.")} variant="danger" small>Reject</Btn>
                    <Btn onClick={()=>approveBrand(b.id)} variant="success" small>Approve</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="brands" && (
          <div>
            <SectionTitle>All Brands</SectionTitle>
            {[...approved,...rejected].map(b=>(
              <Card key={b.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontFamily:"'Cormorant Garamond',serif" }}>{b.brandName}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{b.email} · {b.category}</div>
                  </div>
                  <Badge color={b.status==="approved"?T.green:T.red}>{b.status}</Badge>
                  <div style={{ fontSize:11, color:T.muted }}>{fmtDate(b.reviewedAt)}</div>
                  <div style={{ fontSize:12, color:T.muted }}>{(products[b.id]||[]).length} products</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="restrictions" && (
          <div>
            <SectionTitle>Restriction Manager</SectionTitle>
            <Card style={{ marginBottom:24 }}>
              <div style={{ fontSize:13, color:T.gold, fontFamily:"'Cormorant Garamond',serif", marginBottom:14 }}>Add New Restriction</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:16, lineHeight:1.6 }}>
                Prevents a specific brand from offering products to a specific user. Neither party is notified. Brands will not see the restricted user in their customer list.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <Label>User</Label>
                  <Select value={restrictForm.userId} onChange={v=>setRestrictForm(f=>({...f,userId:v}))}
                    options={[{value:"",label:"Select user…"},...Object.values(appUsers).map(u=>({value:u.id,label:`${u.name} (${u.industry})`}))]}/>
                </div>
                <div>
                  <Label>Brand to Restrict</Label>
                  <Select value={restrictForm.brandId} onChange={v=>setRestrictForm(f=>({...f,brandId:v}))}
                    options={[{value:"",label:"Select brand…"},...Object.values(brands).filter(b=>b.status==="approved").map(b=>({value:b.id,label:b.brandName}))]}/>
                </div>
                <div>
                  <Label>Reason (internal only)</Label>
                  <Input value={restrictForm.reason} onChange={v=>setRestrictForm(f=>({...f,reason:v}))} placeholder="e.g. Contract exclusivity — Brand X sponsorship deal"/>
                </div>
                <div>
                  <Label>Expiry Date (leave blank = permanent)</Label>
                  <Input value={restrictForm.expiresAt} onChange={v=>setRestrictForm(f=>({...f,expiresAt:v}))} type="date"/>
                </div>
              </div>
              {restrictErr && <div style={{ fontSize:12, color:T.red, marginTop:10 }}>{restrictErr}</div>}
              {restrictOk  && <div style={{ fontSize:12, color:T.green, marginTop:10 }}>{restrictOk}</div>}
              <div style={{ marginTop:14 }}><Btn onClick={addRestriction}>Add Restriction</Btn></div>
            </Card>

            <SectionTitle>Active Restrictions</SectionTitle>
            {!activeR.length && <div style={{ color:T.muted, textAlign:"center", padding:"30px 0" }}>No active restrictions.</div>}
            {activeR.map(r=>(
              <Card key={r.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, marginBottom:3 }}>
                      <span style={{ color:T.gold }}>{appUsers[r.userId]?.name||r.userId}</span>
                      <span style={{ color:T.muted }}> · {brands[r.brandId]?.brandName||r.brandId} blocked</span>
                    </div>
                    <div style={{ fontSize:11, color:T.muted }}>{r.reason} · Added {fmtDate(r.createdAt)}{r.expiresAt?` · Expires ${fmtDate(r.expiresAt)}`:" · Permanent"}</div>
                  </div>
                  <Btn onClick={()=>removeRestriction(r.id)} variant="danger" small>Remove</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="notifications" && (
          <div>
            <SectionTitle>Notifications</SectionTitle>
            {!notifications.length && <div style={{ color:T.muted, textAlign:"center", padding:"30px 0" }}>No notifications.</div>}
            {notifications.map(n=>(
              <Card key={n.id} style={{ marginBottom:10, borderColor:n.read?T.border:T.gold, opacity:n.read?0.65:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:T.gold, flexShrink:0 }}/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13 }}>{n.message}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{fmtDate(n.createdAt)}</div>
                  </div>
                  <Badge color={n.read?T.muted:T.amber}>{n.read?"Read":"New"}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]   = useState(null);
  const [brands,setBrands]     = useState(SEED_BRANDS);
  const [products,setProducts] = useState(SEED_PRODUCTS);
  const [accessStore,setAccess]= useState(SEED_ACCESS);
  const [restrictions,setRestr]= useState(SEED_RESTRICTIONS);
  const [notifications,setNotif]=useState(SEED_NOTIFICATIONS);

  const handleUpdate = useCallback((patch) => {
    if (patch.logout)        { setSession(null); return; }
    if (patch.brands)        setBrands(patch.brands);
    if (patch.products)      setProducts(patch.products);
    if (patch.accessStore)   setAccess(patch.accessStore);
    if (patch.restrictions)  setRestr(patch.restrictions);
    if (patch.notifications) setNotif(patch.notifications);
  },[]);

  const handleRegister = (form) => {
    const brandId = `brand_${form.brandName.toLowerCase().replace(/\s+/g,"_")}_${Date.now()}`;
    const brand = { id:brandId, brandName:form.brandName.trim(), email:form.email.toLowerCase(),
      password:form.password, category:form.category, contactName:form.contactName||"",
      website:form.website||"", fulfilmentEmail:form.fulfilmentEmail||form.email.toLowerCase(),
      status:"pending", registeredAt:new Date().toISOString() };
    const notif = { id:`notif_${Date.now()}`, type:"new_brand_registration", brandId, brandName:brand.brandName,
      message:`New brand registration: ${brand.brandName} (${brand.email})`, createdAt:new Date().toISOString(), read:false };
    setBrands(b=>({...b,[brandId]:brand}));
    setNotif(n=>[notif,...n]);
    return { success:true };
  };

  if (!session) {
    return (
      <div>
        <style>{FONTS}</style>
        <div style={{ minHeight:"100vh", background:T.bg, display:"flex", fontFamily:"'Jost',sans-serif" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
            <PlatformLogin onLogin={s=>setSession(s)}/>
          </div>
        </div>
      </div>
    );
  }

  if (session.role==="platform") {
    return <PlatformAdmin brands={brands} products={products} notifications={notifications}
      appUsers={SEED_APP_USERS} restrictions={restrictions} onUpdate={p=>{ handleUpdate(p); if(p.logout) setSession(null); }}/>;
  }

  if (session.role==="brand") {
    return <BrandDashboard brand={session.brand} products={products} accessStore={accessStore}
      appUsers={SEED_APP_USERS} restrictions={restrictions}
      onUpdate={p=>{ handleUpdate(p); if(p.logout) setSession(null); }}/>;
  }

  if (session.role==="brand_auth") {
    return <BrandAuth onLogin={s=>setSession(s)} existingBrands={brands} onRegister={handleRegister}/>;
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <style>{FONTS}</style>
      <div style={{ fontSize:11, letterSpacing:"0.18em", color:T.gold, textTransform:"uppercase" }}>StyleDeck Brand Portal</div>
      <div style={{ fontSize:28, fontFamily:"'Cormorant Garamond',serif", color:T.text }}>Who are you?</div>
      <div style={{ display:"flex", gap:12, marginTop:8 }}>
        <Btn onClick={()=>setSession({role:"platform",name:"StyleDeck Admin"})}>Platform Admin</Btn>
        <Btn onClick={()=>setSession({role:"brand_auth"})} variant="ghost">Brand Sign In / Register</Btn>
      </div>
    </div>
  );
}

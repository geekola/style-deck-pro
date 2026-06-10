import { useState, useRef, useCallback } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const FASHION_DATA = {
  Casual: {
    brands: ["Levi's","Nike","Uniqlo","H&M","Gap","Zara"],
    items: [
      { id:1, brand:"Levi's",   name:"Classic Taper Jean",     color:"#c8d8e8", accent:"#4a6fa5" },
      { id:2, brand:"Nike",     name:"Essential Crew Tee",      color:"#e8d8c8", accent:"#a5704a" },
      { id:3, brand:"Uniqlo",   name:"Relaxed Chino",           color:"#d8e8d8", accent:"#4a7a4a" },
      { id:4, brand:"H&M",      name:"Oversized Hoodie",        color:"#e8d8e8", accent:"#7a4a7a" },
      { id:5, brand:"Gap",      name:"Linen Shirt",             color:"#f0e8d0", accent:"#8a6a2a" },
      { id:6, brand:"Zara",     name:"Cargo Jogger",            color:"#d8d8e8", accent:"#4a4a7a" },
      { id:7, brand:"Levi's",   name:"Sherpa Trucker Jacket",   color:"#e8e0d0", accent:"#6a5a3a" },
      { id:8, brand:"Nike",     name:"Tech Fleece Pant",        color:"#d0d8d0", accent:"#3a5a3a" },
    ]
  },
  Business: {
    brands: ["Ralph Lauren","Hugo Boss","Calvin Klein","Tommy Hilfiger","Brooks Brothers","J.Crew"],
    items: [
      { id:9,  brand:"Ralph Lauren",    name:"Oxford Dress Shirt",     color:"#d8e4f0", accent:"#2a4a6a" },
      { id:10, brand:"Hugo Boss",       name:"Slim Fit Blazer",        color:"#d8d8d8", accent:"#3a3a3a" },
      { id:11, brand:"Calvin Klein",    name:"Stretch Trousers",       color:"#e0e0e8", accent:"#3a3a5a" },
      { id:12, brand:"Tommy Hilfiger",  name:"Quarter-Zip Pullover",   color:"#d0dce8", accent:"#2a3a5a" },
      { id:13, brand:"Brooks Brothers", name:"Merino V-Neck",          color:"#e8e0d8", accent:"#5a4a3a" },
      { id:14, brand:"J.Crew",          name:"Ludlow Suit Pant",       color:"#d4d0c8", accent:"#4a3a28" },
      { id:15, brand:"Hugo Boss",       name:"Leather Derby",          color:"#c8c0b8", accent:"#3a2a1a" },
      { id:16, brand:"Ralph Lauren",    name:"Twill Chino",            color:"#dce8dc", accent:"#2a4a2a" },
    ]
  },
  Formal: {
    brands: ["Armani","Gucci","Versace","Prada","Tom Ford","Burberry"],
    items: [
      { id:17, brand:"Armani",   name:"Peak Lapel Tuxedo",      color:"#2a2a2a", accent:"#c8c0a0" },
      { id:18, brand:"Tom Ford", name:"Black Tie Suit",         color:"#1a1a1a", accent:"#d0c8a8" },
      { id:19, brand:"Burberry", name:"Trench Coat",            color:"#d8c8a0", accent:"#6a4a1a" },
      { id:20, brand:"Prada",    name:"Mohair Evening Jacket",  color:"#3a2a3a", accent:"#c0a8c0" },
      { id:21, brand:"Gucci",    name:"Horsebit Loafer",        color:"#3a2a1a", accent:"#c0a040" },
      { id:22, brand:"Versace",  name:"Medusa Cufflinks",       color:"#c8a030", accent:"#1a1a1a" },
      { id:23, brand:"Tom Ford", name:"Silk Evening Shirt",     color:"#e8e4d8", accent:"#3a2a1a" },
      { id:24, brand:"Armani",   name:"Velvet Dinner Jacket",   color:"#1a1a2a", accent:"#b0a8d0" },
    ]
  },
  Custom: {
    brands: ["Savile Row","Bespoke Co.","Atelier One","Made & Made","Thread Studio","The Custom Lab"],
    items: [
      { id:25, brand:"Savile Row",      name:"Hand-Tailored Suit",      color:"#2a3040", accent:"#b0b8d0" },
      { id:26, brand:"Atelier One",     name:"Monogram Shirt",          color:"#e8e0d0", accent:"#5a4a2a" },
      { id:27, brand:"Thread Studio",   name:"Custom Trousers",         color:"#d8d0c8", accent:"#4a3a2a" },
      { id:28, brand:"Made & Made",     name:"Bespoke Jacket",          color:"#3a3030", accent:"#c0a890" },
      { id:29, brand:"The Custom Lab",  name:"Print-On Tee",            color:"#d0e0d8", accent:"#2a4a3a" },
      { id:30, brand:"Bespoke Co.",     name:"Engraved Belt",           color:"#2a2020", accent:"#c0a060" },
      { id:31, brand:"Savile Row",      name:"Full Canvassed Coat",     color:"#1e2030", accent:"#a0a8c0" },
      { id:32, brand:"Atelier One",     name:"Embroidered Waistcoat",   color:"#3a2030", accent:"#c0a0b0" },
    ]
  }
};

const MOCK_USERS = {
  "demo@fashion.com": { password:"demo123", name:"Alex Morgan", avatar:"AM" },
  "jane@style.com":   { password:"style456", name:"Jane Smith",  avatar:"JS" },
};

// ─── Measurement schema ───────────────────────────────────────────────────────

const MEASUREMENT_SECTIONS = {
  male: [
    {
      section: "Upper Body",
      fields: [
        { key:"height",         label:"Height",               hint:"Stand straight, top of head to floor" },
        { key:"weight",         label:"Weight (kg/lbs)",      hint:"Current body weight" },
        { key:"neck",           label:"Neck",                 hint:"Around base of neck, finger of ease" },
        { key:"chest",          label:"Chest / Bust",         hint:"Fullest part of chest, arms relaxed" },
        { key:"chest_high",     label:"High Chest",           hint:"3 cm below armpit, around torso" },
        { key:"shoulder_width", label:"Shoulder Width",       hint:"Seam to seam across back" },
        { key:"across_back",    label:"Across Back",          hint:"Between shoulder blades, flat" },
        { key:"sleeve_length",  label:"Sleeve Length",        hint:"Shoulder seam to wrist bone" },
        { key:"bicep",          label:"Bicep",                hint:"Around fullest part of upper arm" },
        { key:"wrist",          label:"Wrist",                hint:"Around wrist bone" },
        { key:"back_length",    label:"Back Length",          hint:"Nape of neck to natural waist" },
        { key:"front_length",   label:"Front Length",         hint:"Shoulder to natural waist (front)" },
      ]
    },
    {
      section: "Lower Body",
      fields: [
        { key:"waist",          label:"Waist",                hint:"Natural waist, narrowest point" },
        { key:"stomach",        label:"Stomach / Abdomen",    hint:"Fullest part between waist & hip" },
        { key:"hip",            label:"Hip / Seat",           hint:"Fullest part of hips, 20 cm below waist" },
        { key:"thigh",          label:"Thigh",                hint:"Around fullest part of upper thigh" },
        { key:"knee",           label:"Knee",                 hint:"Around knee, slightly bent" },
        { key:"calf",           label:"Calf",                 hint:"Around fullest part of calf" },
        { key:"inseam",         label:"Inseam",               hint:"Crotch to ankle (inner leg)" },
        { key:"outseam",        label:"Outseam",              hint:"Natural waist to ankle (outer leg)" },
        { key:"rise",           label:"Trouser Rise",         hint:"Crotch seam to natural waist (seated)" },
        { key:"ankle",          label:"Ankle",                hint:"Around ankle bone" },
      ]
    },
    {
      section: "Head & Feet",
      fields: [
        { key:"hat_size",       label:"Hat Size",             hint:"Around head, 1 cm above ears" },
        { key:"hat_circ",       label:"Head Circumference",   hint:"Measured in cm/inches for hat sizing" },
        { key:"shoe_size",      label:"Shoe Size",            hint:"Standard size (US/EU/UK)" },
        { key:"shoe_width",     label:"Foot Width",           hint:"Narrow (B) / Medium (D) / Wide (E/EE)" },
        { key:"foot_length",    label:"Foot Length",          hint:"Heel to longest toe in cm/inches" },
      ]
    },
    {
      section: "Posture & Fit Notes",
      fields: [
        { key:"posture_note",   label:"Posture Notes",        hint:"e.g. square shoulders, rounded back, forward tilt", type:"textarea" },
        { key:"fit_preference", label:"Fit Preference",       hint:"Slim / Regular / Relaxed / Oversized",               type:"select", options:["","Slim","Regular","Relaxed","Oversized"] },
        { key:"other_notes",    label:"Additional Notes",     hint:"Allergies, preferences, tailor instructions",        type:"textarea" },
      ]
    }
  ],
  female: [
    {
      section: "Upper Body",
      fields: [
        { key:"height",         label:"Height",               hint:"Stand straight, top of head to floor" },
        { key:"weight",         label:"Weight (kg/lbs)",      hint:"Current body weight" },
        { key:"neck",           label:"Neck",                 hint:"Around base of neck, finger of ease" },
        { key:"bust_high",      label:"High Bust",            hint:"Around chest above fullest part" },
        { key:"bust",           label:"Bust / Chest",         hint:"Fullest part of bust, arms relaxed" },
        { key:"bust_point",     label:"Bust Point to Point",  hint:"Nipple to nipple, straight across" },
        { key:"shoulder_width", label:"Shoulder Width",       hint:"Seam to seam across back" },
        { key:"across_back",    label:"Across Back",          hint:"Between shoulder blades, flat" },
        { key:"sleeve_length",  label:"Sleeve Length",        hint:"Shoulder seam to wrist bone" },
        { key:"bicep",          label:"Bicep",                hint:"Around fullest part of upper arm" },
        { key:"wrist",          label:"Wrist",                hint:"Around wrist bone" },
        { key:"back_length",    label:"Back Length",          hint:"Nape of neck to natural waist" },
        { key:"front_length",   label:"Front Waist Length",   hint:"Shoulder to natural waist (front)" },
        { key:"waist_to_bust",  label:"Waist to Bust",        hint:"Natural waist up to bust point" },
      ]
    },
    {
      section: "Lower Body",
      fields: [
        { key:"waist",          label:"Waist",                hint:"Natural waist, narrowest point" },
        { key:"stomach",        label:"Stomach / Abdomen",    hint:"Fullest part between waist & hip" },
        { key:"hip",            label:"Hip / Seat",           hint:"Fullest part of hips, 20 cm below waist" },
        { key:"hip_height",     label:"Hip Height",           hint:"Distance from natural waist to fullest hip" },
        { key:"thigh",          label:"Thigh",                hint:"Around fullest part of upper thigh" },
        { key:"knee",           label:"Knee",                 hint:"Around knee, slightly bent" },
        { key:"calf",           label:"Calf",                 hint:"Around fullest part of calf" },
        { key:"inseam",         label:"Inseam",               hint:"Crotch to ankle (inner leg)" },
        { key:"outseam",        label:"Outseam",              hint:"Natural waist to ankle (outer leg)" },
        { key:"rise",           label:"Rise",                 hint:"Crotch seam to natural waist (seated)" },
        { key:"waist_to_knee",  label:"Waist to Knee",        hint:"Natural waist down to centre of kneecap" },
        { key:"waist_to_floor", label:"Waist to Floor",       hint:"Natural waist to floor, standing straight" },
        { key:"ankle",          label:"Ankle",                hint:"Around ankle bone" },
      ]
    },
    {
      section: "Head & Feet",
      fields: [
        { key:"hat_size",       label:"Hat Size",             hint:"Around head, 1 cm above ears" },
        { key:"hat_circ",       label:"Head Circumference",   hint:"Measured in cm/inches for hat sizing" },
        { key:"shoe_size",      label:"Shoe Size",            hint:"Standard size (US/EU/UK)" },
        { key:"shoe_width",     label:"Foot Width",           hint:"Narrow / Medium / Wide" },
        { key:"foot_length",    label:"Foot Length",          hint:"Heel to longest toe in cm/inches" },
        { key:"heel_height",    label:"Typical Heel Height",  hint:"How high you normally wear your heels" },
      ]
    },
    {
      section: "Posture & Fit Notes",
      fields: [
        { key:"posture_note",   label:"Posture Notes",        hint:"e.g. one shoulder higher, swayback, forward tilt", type:"textarea" },
        { key:"fit_preference", label:"Fit Preference",       hint:"Slim / Regular / Relaxed / Oversized",              type:"select", options:["","Slim","Regular","Relaxed","Oversized"] },
        { key:"other_notes",    label:"Additional Notes",     hint:"Allergies, preferences, tailor instructions",       type:"textarea" },
      ]
    }
  ]
};

const CM_TO_IN = 0.393701;
const IN_TO_CM = 2.54;
const SKIP_CONVERT = new Set(["weight","hat_size","shoe_size","shoe_width","fit_preference","posture_note","other_notes","heel_height"]);

// ─── Shared UI ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const inputStyle = (focused) => ({
  width:"100%", padding:"9px 12px", borderRadius:9,
  border:`1px solid ${focused?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.12)"}`,
  fontSize:14, fontFamily:"'DM Sans',sans-serif",
  outline:"none", boxSizing:"border-box",
  background:"white", color:"#1a1a1a",
  transition:"border 0.15s",
});

function Field({ label, hint, fieldKey, value, onChange, type, options, unit }) {
  const [focused, setFocused] = useState(false);
  const showUnit = !SKIP_CONVERT.has(fieldKey) && unit;

  if (type === "textarea") return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:500, color:"rgba(0,0,0,0.5)", display:"block", marginBottom:5 }}>{label}</label>
      <textarea value={value||""} onChange={e=>onChange(fieldKey,e.target.value)}
        placeholder={hint} rows={2}
        style={{ ...inputStyle(focused), resize:"vertical" }}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      />
    </div>
  );

  if (type === "select") return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:500, color:"rgba(0,0,0,0.5)", display:"block", marginBottom:5 }}>{label}</label>
      <select value={value||""} onChange={e=>onChange(fieldKey,e.target.value)}
        style={{ ...inputStyle(false), cursor:"pointer" }}>
        {options.map(o=><option key={o} value={o}>{o||"Select…"}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:500, color:"rgba(0,0,0,0.5)", display:"block", marginBottom:5 }}>
        {label}{showUnit ? <span style={{ fontWeight:400, marginLeft:4, color:"rgba(0,0,0,0.3)" }}>({unit})</span> : null}
      </label>
      <div style={{ position:"relative" }}>
        <input type="text" value={value||""} onChange={e=>onChange(fieldKey,e.target.value)}
          placeholder={hint}
          style={{ ...inputStyle(focused), paddingRight: showUnit ? 44 : 12 }}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        />
        {showUnit && (
          <span style={{
            position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
            fontSize:11, color:"rgba(0,0,0,0.3)", pointerEvents:"none",
          }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── Measurement Page ─────────────────────────────────────────────────────────

function MeasurementPage({ user, measurements, onSave, onClose, showCloseButton=true }) {
  const schema = MEASUREMENT_SECTIONS;
  const [gender, setGender] = useState(measurements?.gender || "male");
  const [unit, setUnit]     = useState(measurements?.unit   || "cm");
  const [vals, setVals]     = useState(measurements?.vals   || {});
  const [saved, setSaved]   = useState(false);
  const printRef = useRef();

  const handleChange = (key, val) => setVals(v => ({ ...v, [key]:val }));

  const handleUnitToggle = (newUnit) => {
    if (newUnit === unit) return;
    const factor = newUnit === "in" ? CM_TO_IN : IN_TO_CM;
    const converted = {};
    Object.entries(vals).forEach(([k,v]) => {
      if (!SKIP_CONVERT.has(k) && v && !isNaN(parseFloat(v))) {
        converted[k] = (parseFloat(v) * factor).toFixed(1);
      } else {
        converted[k] = v;
      }
    });
    setVals(converted);
    setUnit(newUnit);
  };

  const handleSave = () => {
    onSave({ gender, unit, vals, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const handlePrint = () => {
    const sections = schema[gender];
    const printWin = window.open("","_blank","width=800,height=900");
    const rows = sections.flatMap(s =>
      s.fields.map(f => {
        const v = vals[f.key] || "—";
        const unitLabel = (!SKIP_CONVERT.has(f.key) && v !== "—") ? ` ${unit}` : "";
        return `<tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px">${f.label}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;font-weight:500;font-size:13px">${v}${unitLabel}</td></tr>`;
      })
    ).join("");
    const sectionHeaders = sections.map(s => {
      const sRows = s.fields.map(f => {
        const v = vals[f.key] || "—";
        const unitLabel = (!SKIP_CONVERT.has(f.key) && v !== "—") ? ` ${unit}` : "";
        return `<tr><td style="padding:7px 16px;border-bottom:1px solid #f0f0f0;color:#555;font-size:13px;width:55%">${f.label}</td><td style="padding:7px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:500">${v}${unitLabel}</td></tr>`;
      }).join("");
      return `<tr><td colspan="2" style="padding:14px 16px 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#999;font-weight:600;border-bottom:2px solid #1a1a1a">${s.section}</td></tr>${sRows}`;
    }).join("");

    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Tailor Measurement Chart — ${user.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;padding:40px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #1a1a1a;margin-bottom:28px}
        .title{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;letter-spacing:-0.02em}
        .sub{font-size:12px;color:#888;margin-top:4px;letter-spacing:0.04em}
        .meta{text-align:right;font-size:12px;color:#888;line-height:1.8}
        table{width:100%;border-collapse:collapse}
        @media print{body{padding:20px}.no-print{display:none}}
      </style></head><body>
      <div class="header">
        <div><div class="title">Tailor Measurement Chart</div>
        <div class="sub">STYLEDECK — CUSTOM ORDER FORM</div></div>
        <div class="meta">
          <strong style="font-size:14px;color:#1a1a1a">${user.name}</strong><br>
          ${user.email}<br>
          Gender profile: ${gender === "male" ? "Men's" : "Women's"}<br>
          Units: ${unit}<br>
          ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}
        </div>
      </div>
      <table>${sectionHeaders}</table>
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#bbb;display:flex;justify-content:space-between">
        <span>Generated by StyleDeck</span>
        <span>Signature: ___________________________</span>
      </div>
      </body></html>`);
    printWin.document.close();
    setTimeout(()=>{ printWin.focus(); printWin.print(); }, 400);
  };

  const sections = schema[gender];
  const filled   = Object.values(vals).filter(v=>v&&v.trim()).length;
  const total    = sections.flatMap(s=>s.fields).length;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <style>{FONTS}</style>
      {/* Sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:30, background:"white",
        borderBottom:"1px solid rgba(0,0,0,0.07)", padding:"14px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontSize:16, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>
            Measurements
          </div>
          <div style={{ fontSize:11, color:"rgba(0,0,0,0.35)", marginTop:2 }}>
            {filled}/{total} fields filled
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={handlePrint} style={{
            fontSize:12, padding:"6px 13px", borderRadius:20,
            border:"1px solid rgba(0,0,0,0.12)", background:"white",
            cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
          }}>Export PDF</button>
          <button onClick={handleSave} style={{
            fontSize:12, padding:"6px 13px", borderRadius:20,
            border:"none", background: saved?"#22c55e":"#1a1a1a",
            color:"white", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            transition:"background 0.3s",
          }}>{saved?"Saved ✓":"Save"}</button>
          {showCloseButton && (
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:"50%", border:"1px solid rgba(0,0,0,0.1)",
              background:"#f5f5f5", cursor:"pointer", fontSize:14,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding:"20px 20px 40px" }}>
        {/* Gender + Unit toggles */}
        <div style={{ display:"flex", gap:12, marginBottom:24 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, letterSpacing:"0.08em", color:"rgba(0,0,0,0.4)", marginBottom:7, textTransform:"uppercase" }}>Profile</div>
            <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:"1px solid rgba(0,0,0,0.1)" }}>
              {["male","female"].map(g=>(
                <button key={g} onClick={()=>{ setGender(g); setVals({}); }} style={{
                  flex:1, padding:"9px 0", border:"none",
                  background: gender===g?"#1a1a1a":"white",
                  color: gender===g?"white":"rgba(0,0,0,0.5)",
                  cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                  fontWeight: gender===g?500:400, transition:"all 0.15s",
                }}>{g==="male"?"Men's":"Women's"}</button>
              ))}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, letterSpacing:"0.08em", color:"rgba(0,0,0,0.4)", marginBottom:7, textTransform:"uppercase" }}>Units</div>
            <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:"1px solid rgba(0,0,0,0.1)" }}>
              {["cm","in"].map(u=>(
                <button key={u} onClick={()=>handleUnitToggle(u)} style={{
                  flex:1, padding:"9px 0", border:"none",
                  background: unit===u?"#1a1a1a":"white",
                  color: unit===u?"white":"rgba(0,0,0,0.5)",
                  cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                  fontWeight: unit===u?500:400, transition:"all 0.15s",
                }}>{u}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:"#f0f0f0", borderRadius:2, marginBottom:28, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:2, background:"#1a1a1a",
            width:`${Math.round((filled/total)*100)}%`, transition:"width 0.4s ease",
          }}/>
        </div>

        {/* Sections */}
        {sections.map((sec) => (
          <div key={sec.section} style={{ marginBottom:28 }}>
            <div style={{
              fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase",
              color:"rgba(0,0,0,0.35)", fontWeight:600,
              borderBottom:"1.5px solid #1a1a1a", paddingBottom:8, marginBottom:16,
            }}>{sec.section}</div>
            {sec.fields.map(f=>(
              <Field key={f.key} fieldKey={f.key} label={f.label} hint={f.hint}
                type={f.type} options={f.options}
                value={vals[f.key]} onChange={handleChange}
                unit={f.type ? null : unit}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fashion Card ─────────────────────────────────────────────────────────────

function FashionCard({ item, category, style, isTop, dragState }) {
  const isDark = item.color < "#888888";
  const textColor    = isDark ? "#f0ece0" : "#1a1a1a";
  const mutedColor   = isDark ? "rgba(240,236,224,0.55)" : "rgba(26,26,26,0.45)";
  return (
    <div style={{
      position:"absolute", width:"100%", height:"100%", borderRadius:20,
      background:item.color, border:"1px solid rgba(0,0,0,0.08)",
      overflow:"hidden", userSelect:"none", touchAction:"none",
      cursor: isTop ? "grab" : "default", ...style,
    }}>
      <div style={{ position:"absolute", inset:0,
        background:`radial-gradient(ellipse at 30% 20%, ${item.accent}22 0%, transparent 60%)` }}/>
      <div style={{
        position:"absolute", top:0, left:0, right:0, padding:"20px 22px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      }}>
        <span style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:mutedColor, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>{category}</span>
        <span style={{ fontSize:11, color:mutedColor, fontFamily:"'DM Sans',sans-serif", background:"rgba(255,255,255,0.12)", borderRadius:20, padding:"3px 10px" }}>{item.brand}</span>
      </div>
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
        width:140, height:140, borderRadius:"50%", background:`${item.accent}18`, border:`2px solid ${item.accent}30`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background:`${item.accent}28`, border:`2px solid ${item.accent}50` }}/>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 22px 24px" }}>
        <div style={{ fontSize:22, fontWeight:600, color:textColor, fontFamily:"'Playfair Display',serif", letterSpacing:"-0.02em", lineHeight:1.2, marginBottom:4 }}>{item.name}</div>
        <div style={{ fontSize:13, color:mutedColor, fontFamily:"'DM Sans',sans-serif" }}>{item.brand}</div>
      </div>
      {isTop && dragState?.dragging && (
        <>
          {dragState.dx > 30  && <div style={{ position:"absolute", top:28, left:22, background:"#22c55e", color:"#fff", borderRadius:8, padding:"5px 14px", fontSize:13, fontWeight:700, letterSpacing:"0.08em", border:"2px solid #fff", opacity:Math.min(1,(dragState.dx-30)/80) }}>LIKE</div>}
          {dragState.dx < -30 && <div style={{ position:"absolute", top:28, right:22, background:"#ef4444", color:"#fff", borderRadius:8, padding:"5px 14px", fontSize:13, fontWeight:700, letterSpacing:"0.08em", border:"2px solid #fff", opacity:Math.min(1,(-dragState.dx-30)/80) }}>PASS</div>}
        </>
      )}
    </div>
  );
}

// ─── Swipe Deck ───────────────────────────────────────────────────────────────

function SwipeDeck({ items, category, onLike, onDislike, onUndo, canUndo }) {
  const [deck, setDeck]     = useState(items);
  const [gone, setGone]     = useState([]);
  const [dragState, setDS]  = useState(null);
  const [exiting, setExit]  = useState(null);
  const startRef            = useRef(null);

  const exit = useCallback((dir) => {
    if (deck.length === 0) return;
    const item = deck[deck.length-1];
    setExit({ dir, item });
    setTimeout(()=>{
      setDeck(d=>d.slice(0,-1));
      setGone(g=>[item,...g]);
      setExit(null);
      dir==="right" ? onLike(item) : onDislike(item);
    }, 300);
  }, [deck, onLike, onDislike]);

  const undo = () => {
    if (!gone.length) return;
    const [last,...rest] = gone;
    setDeck(d=>[...d,last]);
    setGone(rest);
    onUndo(last);
  };

  const onDown = useCallback((e)=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x:e.clientX, y:e.clientY };
    setDS({ dragging:true, dx:0, dy:0 });
  },[]);

  const onMove = useCallback((e)=>{
    if (!startRef.current) return;
    setDS({ dragging:true, dx:e.clientX-startRef.current.x, dy:e.clientY-startRef.current.y });
  },[]);

  const onUp = useCallback(()=>{
    if (!dragState) return;
    if (Math.abs(dragState.dx) > 80) exit(dragState.dx>0?"right":"left");
    setDS(null); startRef.current=null;
  },[dragState, exit]);

  const visible = deck.slice(Math.max(0,deck.length-3));

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:28 }}>
      <div style={{ position:"relative", width:340, height:460 }}>
        {deck.length === 0 ? (
          <div style={{ width:"100%", height:"100%", borderRadius:20, border:"1.5px dashed rgba(0,0,0,0.12)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <div style={{ fontSize:32 }}>✓</div>
            <div style={{ fontSize:14, color:"rgba(0,0,0,0.4)", fontFamily:"'DM Sans',sans-serif" }}>All items reviewed</div>
          </div>
        ) : visible.map((item,i)=>{
          const isTop  = i===visible.length-1;
          const depth  = visible.length-1-i;
          let transform = `translateY(${depth*12}px) scale(${1-depth*0.04})`;
          let transition = "transform 0.3s ease, opacity 0.3s ease";
          let zIndex = i;
          if (isTop && dragState?.dragging) {
            transform = `translate(${dragState.dx}px,${dragState.dy*0.3}px) rotate(${dragState.dx/18}deg)`;
            transition = "none"; zIndex=10;
          }
          if (isTop && exiting) {
            transform = `translateX(${exiting.dir==="right"?500:-500}px) rotate(${exiting.dir==="right"?25:-25}deg)`;
            transition = "transform 0.3s ease"; zIndex=10;
          }
          return (
            <FashionCard key={item.id} item={item} category={category} isTop={isTop}
              dragState={isTop?dragState:null}
              style={{ transform, transition, opacity:1-depth*0.15, zIndex, pointerEvents:isTop?"auto":"none" }}
              {...(isTop?{ onPointerDown:onDown, onPointerMove:onMove, onPointerUp:onUp, onPointerLeave:onUp }:{})}
            />
          );
        })}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={()=>exit("left")} disabled={!deck.length} style={{ width:56,height:56,borderRadius:"50%",border:"1.5px solid rgba(239,68,68,0.3)",background:"white",cursor:deck.length?"pointer":"not-allowed",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",opacity:deck.length?1:0.35,boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>✕</button>
        <button onClick={undo} disabled={!gone.length} style={{ width:44,height:44,borderRadius:"50%",border:"1px solid rgba(0,0,0,0.1)",background:"white",cursor:gone.length?"pointer":"not-allowed",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",opacity:gone.length?0.75:0.25,boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>↩</button>
        <button onClick={()=>exit("right")} disabled={!deck.length} style={{ width:56,height:56,borderRadius:"50%",border:"1.5px solid rgba(34,197,94,0.3)",background:"white",cursor:deck.length?"pointer":"not-allowed",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",opacity:deck.length?1:0.35,boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>♥</button>
      </div>
      <div style={{ fontSize:12, color:"rgba(0,0,0,0.3)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.04em" }}>
        {deck.length} remaining · {gone.length} reviewed
      </div>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function GalleryView({ likedItems }) {
  const cats = ["Casual","Business","Formal","Custom"];
  const grouped = cats.reduce((a,c)=>({ ...a, [c]:likedItems.filter(i=>i.category===c) }),{});
  if (!likedItems.length) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:"60px 20px",color:"rgba(0,0,0,0.3)",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:40 }}>♡</div>
      <div style={{ fontSize:14 }}>No liked items yet</div>
      <div style={{ fontSize:12 }}>Swipe right on items you love</div>
    </div>
  );
  return (
    <div style={{ padding:"0 0 32px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"0 20px 24px" }}>
        {cats.map(c=>(
          <div key={c} style={{ background:"#f8f8f8", borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:600, fontFamily:"'Playfair Display',serif" }}>{grouped[c].length}</div>
            <div style={{ fontSize:11, color:"rgba(0,0,0,0.4)", fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>{c}</div>
          </div>
        ))}
      </div>
      {cats.map(c=>{
        const items=grouped[c]; if(!items.length) return null;
        return (
          <div key={c} style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, padding:"0 20px 14px", borderBottom:"1px solid rgba(0,0,0,0.06)", marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:600, fontFamily:"'Playfair Display',serif" }}>{c}</span>
              <span style={{ fontSize:12, color:"rgba(0,0,0,0.35)", fontFamily:"'DM Sans',sans-serif" }}>{items.length} item{items.length!==1?"s":""}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, padding:"0 20px" }}>
              {items.map(item=>(
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:"1px solid rgba(0,0,0,0.07)", background:item.color }}>
                  <div style={{ height:90,display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
                    <div style={{ width:44,height:44,borderRadius:"50%",background:`${item.accent}25`,border:`1.5px solid ${item.accent}40` }}/>
                    <div style={{ position:"absolute",bottom:7,right:8,background:"rgba(255,255,255,0.85)",borderRadius:20,fontSize:9,padding:"2px 6px",fontFamily:"'DM Sans',sans-serif",color:"#333",fontWeight:600,letterSpacing:"0.04em" }}>{item.brand}</div>
                  </div>
                  <div style={{ padding:"8px 10px 10px", background:"rgba(255,255,255,0.7)" }}>
                    <div style={{ fontSize:11, fontWeight:600, fontFamily:"'DM Sans',sans-serif", color:"#1a1a1a", lineHeight:1.3 }}>{item.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email,setEmail]       = useState("");
  const [password,setPassword] = useState("");
  const [error,setError]       = useState("");
  const [loading,setLoading]   = useState(false);

  const submit = (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    setTimeout(()=>{
      const u = MOCK_USERS[email.toLowerCase()];
      if (u && u.password===password) onLogin({ email:email.toLowerCase(), name:u.name, avatar:u.avatar });
      else setError("Invalid credentials. Try demo@fashion.com / demo123");
      setLoading(false);
    },600);
  };

  const googleLogin = () => {
    setLoading(true);
    setTimeout(()=>onLogin({ email:"demo@fashion.com", name:"Alex Morgan", avatar:"AM", google:true }),800);
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#fafafa",fontFamily:"'DM Sans',sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ width:380,background:"white",borderRadius:24,border:"1px solid rgba(0,0,0,0.08)",padding:"40px 36px 36px",boxShadow:"0 8px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ fontSize:28,fontFamily:"'Playfair Display',serif",fontWeight:600,letterSpacing:"-0.02em",marginBottom:6 }}>StyleDeck</div>
          <div style={{ fontSize:13,color:"rgba(0,0,0,0.4)",letterSpacing:"0.02em" }}>Your personal fashion curator</div>
        </div>
        <button onClick={googleLogin} style={{ width:"100%",padding:"11px 16px",borderRadius:10,border:"1px solid rgba(0,0,0,0.12)",background:"white",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:14,cursor:"pointer",marginBottom:20,fontFamily:"'DM Sans',sans-serif" }}
          onMouseEnter={e=>e.currentTarget.style.background="#f8f8f8"}
          onMouseLeave={e=>e.currentTarget.style.background="white"}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
          <div style={{ flex:1,height:1,background:"rgba(0,0,0,0.08)" }}/><span style={{ fontSize:12,color:"rgba(0,0,0,0.3)" }}>or</span><div style={{ flex:1,height:1,background:"rgba(0,0,0,0.08)" }}/>
        </div>
        <form onSubmit={submit} style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:"rgba(0,0,0,0.5)",display:"block",marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required style={{ width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(0,0,0,0.12)",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box" }}
              onFocus={e=>e.target.style.border="1px solid rgba(0,0,0,0.35)"}
              onBlur={e=>e.target.style.border="1px solid rgba(0,0,0,0.12)"}/>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:"rgba(0,0,0,0.5)",display:"block",marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{ width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(0,0,0,0.12)",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box" }}
              onFocus={e=>e.target.style.border="1px solid rgba(0,0,0,0.35)"}
              onBlur={e=>e.target.style.border="1px solid rgba(0,0,0,0.12)"}/>
          </div>
          {error && <div style={{ fontSize:12,color:"#ef4444",background:"#fef2f2",borderRadius:8,padding:"9px 12px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding:"11px",borderRadius:10,border:"none",background:loading?"#d1d5db":"#1a1a1a",color:"white",fontSize:14,fontWeight:500,cursor:loading?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",marginTop:4 }}>
            {loading?"Signing in...":"Sign in"}
          </button>
        </form>
        <div style={{ marginTop:20,fontSize:12,color:"rgba(0,0,0,0.35)",textAlign:"center",lineHeight:1.8 }}>Demo: demo@fashion.com / demo123</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]               = useState(null);
  const [view, setView]               = useState("swipe");   // swipe | gallery | profile
  const [selectedCat, setSelectedCat] = useState("");
  const [dropdownOpen, setDD]         = useState(false);
  const [likedItems, setLiked]        = useState({});
  const [measurements, setMeasure]    = useState({});
  const [deckItems, setDeck]          = useState([]);
  const [showMeasurePrompt, setMPr]   = useState(false);

  const cats = ["Casual","Business","Formal","Custom"];
  const userLiked = user ? Object.values(likedItems[user.email]||{}).flat() : [];
  const userMeasure = user ? measurements[user.email] : null;

  const login  = (u) => { setUser(u); setView("swipe"); };
  const logout = () => { setUser(null); setSelectedCat(""); setDeck([]); setView("swipe"); };

  const selectCat = (cat) => {
    setSelectedCat(cat); setDD(false);
    setDeck([...FASHION_DATA[cat].items].sort(()=>Math.random()-0.5));
    if (cat === "Custom" && !userMeasure?.vals) setMPr(true);
  };

  const handleLike = (item) => {
    setLiked(prev => {
      const ul = prev[user.email]||{};
      const cl = ul[selectedCat]||[];
      if (cl.find(i=>i.id===item.id)) return prev;
      return { ...prev, [user.email]: { ...ul, [selectedCat]:[...cl,{...item,category:selectedCat}] }};
    });
  };

  const handleUndo = (item) => {
    setLiked(prev => {
      const ul = prev[user.email]||{};
      const cl = ul[selectedCat]||[];
      return { ...prev, [user.email]: { ...ul, [selectedCat]:cl.filter(i=>i.id!==item.id) }};
    });
  };

  const saveMeasurements = (data) => {
    setMeasure(prev => ({ ...prev, [user.email]: data }));
  };

  const measureFilled = userMeasure ? Object.values(userMeasure.vals||{}).filter(v=>v&&v.trim()).length : 0;

  if (!user) return <LoginScreen onLogin={login}/>;

  // Profile / measurements view
  if (view === "profile") return (
    <div style={{ maxWidth:480,margin:"0 auto",background:"white",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif" }}>
      <style>{FONTS}</style>
      <MeasurementPage
        user={user}
        measurements={userMeasure}
        onSave={saveMeasurements}
        onClose={()=>setView("swipe")}
        showCloseButton
      />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#fafafa",fontFamily:"'DM Sans',sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth:480,margin:"0 auto",background:"white",minHeight:"100vh",boxShadow:"0 0 0 1px rgba(0,0,0,0.05)",display:"flex",flexDirection:"column" }}>

        {/* ── Nav ── */}
        <div style={{ padding:"14px 20px",borderBottom:"1px solid rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"white",zIndex:20 }}>
          <div style={{ fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:600,letterSpacing:"-0.02em" }}>StyleDeck</div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            {["swipe","gallery"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ fontSize:13,padding:"6px 14px",borderRadius:20,border:`1px solid ${view===v?"rgba(0,0,0,0.7)":"rgba(0,0,0,0.1)"}`,background:view===v?"#1a1a1a":"transparent",color:view===v?"white":"rgba(0,0,0,0.6)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",position:"relative" }}>
                {v==="swipe"?"Discover":"Saved"}
                {v==="gallery" && userLiked.length>0 && (
                  <span style={{ position:"absolute",top:-4,right:-4,background:"#1a1a1a",color:"white",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600,border:"2px solid white" }}>{userLiked.length}</span>
                )}
              </button>
            ))}
            {/* Avatar → profile */}
            <button onClick={()=>setView("profile")} title={`${user.name} — Edit measurements`} style={{ width:32,height:32,borderRadius:"50%",background:userMeasure?"#1a1a1a":"#e8e8e8",border:`2px solid ${userMeasure?"#1a1a1a":"rgba(0,0,0,0.15)"}`,fontSize:11,fontWeight:600,cursor:"pointer",color:userMeasure?"white":"#555",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.2s" }}>
              {user.avatar}
              {!userMeasure && <span style={{ position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:"#f59e0b",border:"1.5px solid white" }}/>}
            </button>
          </div>
        </div>

        {/* ── Swipe view ── */}
        {view==="swipe" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
            <div style={{ padding:"18px 20px 0" }}>
              <div style={{ fontSize:12,color:"rgba(0,0,0,0.4)",marginBottom:8,letterSpacing:"0.04em" }}>CATEGORY</div>
              <div style={{ position:"relative" }}>
                <button onClick={()=>setDD(o=>!o)} style={{ width:"100%",padding:"11px 14px",borderRadius:12,border:"1px solid rgba(0,0,0,0.12)",background:"white",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:selectedCat?500:400,color:selectedCat?"#1a1a1a":"rgba(0,0,0,0.35)" }}>
                  <span>{selectedCat||"Select a category to start…"}</span>
                  <span style={{ fontSize:10,transition:"transform 0.2s",transform:dropdownOpen?"rotate(180deg)":"none" }}>▼</span>
                </button>
                {dropdownOpen && (
                  <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"white",borderRadius:12,border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 8px 32px rgba(0,0,0,0.1)",zIndex:30,overflow:"hidden" }}>
                    {cats.map((cat,i)=>(
                      <button key={cat} onClick={()=>selectCat(cat)} style={{ width:"100%",padding:"12px 16px",border:"none",borderBottom:i<cats.length-1?"1px solid rgba(0,0,0,0.05)":"none",background:selectedCat===cat?"#f8f8f8":"white",textAlign:"left",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:selectedCat===cat?500:400,display:"flex",justifyContent:"space-between",alignItems:"center" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8f8f8"}
                        onMouseLeave={e=>e.currentTarget.style.background=selectedCat===cat?"#f8f8f8":"white"}>
                        <span style={{ display:"flex",alignItems:"center",gap:8 }}>
                          {cat}
                          {cat==="Custom" && !userMeasure && <span style={{ fontSize:10,padding:"2px 7px",borderRadius:10,background:"#fef3c7",color:"#92400e",fontWeight:600 }}>Add measurements</span>}
                          {cat==="Custom" && userMeasure && <span style={{ fontSize:10,padding:"2px 7px",borderRadius:10,background:"#dcfce7",color:"#166534",fontWeight:600 }}>Ready</span>}
                        </span>
                        <span style={{ fontSize:11,color:"rgba(0,0,0,0.3)" }}>{FASHION_DATA[cat].items.length} items</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCat && (
                <div style={{ marginTop:10,fontSize:12,color:"rgba(0,0,0,0.4)",display:"flex",gap:6,flexWrap:"wrap" }}>
                  {FASHION_DATA[selectedCat].brands.map(b=>(
                    <span key={b} style={{ padding:"2px 8px",borderRadius:20,background:"#f3f3f3",fontSize:11 }}>{b}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Measurement prompt banner */}
            {showMeasurePrompt && (
              <div style={{ margin:"14px 20px 0",background:"#fffbeb",borderRadius:12,border:"1px solid rgba(245,158,11,0.25)",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:500,color:"#92400e",marginBottom:2 }}>Measurements missing</div>
                  <div style={{ fontSize:11,color:"rgba(146,64,14,0.7)" }}>Add your measurements for accurate custom orders</div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>setMPr(false)} style={{ fontSize:11,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(0,0,0,0.1)",background:"white",cursor:"pointer" }}>Later</button>
                  <button onClick={()=>{ setMPr(false); setView("profile"); }} style={{ fontSize:11,padding:"5px 10px",borderRadius:8,border:"none",background:"#92400e",color:"white",cursor:"pointer",fontWeight:500 }}>Add now</button>
                </div>
              </div>
            )}

            <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px 32px" }}>
              {!selectedCat ? (
                <div style={{ textAlign:"center",color:"rgba(0,0,0,0.25)",fontFamily:"'Playfair Display',serif",fontSize:18,lineHeight:1.6 }}>
                  Select a category<br/>
                  <span style={{ fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:400 }}>to start swiping</span>
                </div>
              ) : (
                <SwipeDeck key={selectedCat} items={deckItems} category={selectedCat}
                  onLike={handleLike} onDislike={()=>{}} onUndo={handleUndo}/>
              )}
            </div>
          </div>
        )}

        {/* ── Gallery view ── */}
        {view==="gallery" && (
          <div style={{ flex:1 }}>
            <div style={{ padding:"20px 20px 0" }}>
              <div style={{ fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:600,marginBottom:4 }}>{user.name}'s Wardrobe</div>
              <div style={{ fontSize:12,color:"rgba(0,0,0,0.35)",marginBottom:20 }}>{userLiked.length} saved item{userLiked.length!==1?"s":""}</div>
            </div>
            <GalleryView likedItems={userLiked}/>
          </div>
        )}

        {/* ── Profile summary strip (when on swipe/gallery, not full profile view) ── */}
        <div style={{ borderTop:"1px solid rgba(0,0,0,0.06)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"white" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,color:"#555" }}>{user.avatar}</div>
            <div>
              <div style={{ fontSize:12,fontWeight:500,color:"#1a1a1a" }}>{user.name}</div>
              <div style={{ fontSize:10,color:"rgba(0,0,0,0.35)" }}>
                {userMeasure ? `${measureFilled} measurements saved · ${userMeasure.gender==="male"?"Men's":"Women's"} · ${userMeasure.unit}` : "No measurements yet"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setView("profile")} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:"1px solid rgba(0,0,0,0.1)",background:"white",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
              {userMeasure?"Edit measurements":"Add measurements"}
            </button>
            <button onClick={logout} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:"1px solid rgba(0,0,0,0.08)",background:"transparent",cursor:"pointer",color:"rgba(0,0,0,0.4)",fontFamily:"'DM Sans',sans-serif" }}>Sign out</button>
          </div>
        </div>

      </div>
    </div>
  );
}

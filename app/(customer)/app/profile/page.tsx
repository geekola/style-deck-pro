"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Gender = "male" | "female";
type UnitSystem = "metric" | "imperial";

const CORE_FIELDS: Record<string, { label: string; hint: string }> = {
  height: { label: "Height", hint: "Top of head to floor" },
  weight: { label: "Weight", hint: "Current body weight" },
  chest: { label: "Chest / Bust", hint: "Fullest part, arms relaxed" },
  waist: { label: "Waist", hint: "Natural waist, narrowest point" },
  hips: { label: "Hip / Seat", hint: "Fullest part of hips" },
  neck: { label: "Neck", hint: "Around base of neck" },
  shoulderWidth: { label: "Shoulder Width", hint: "Seam to seam across back" },
  sleeveLength: { label: "Sleeve Length", hint: "Shoulder seam to wrist" },
  inseam: { label: "Inseam", hint: "Crotch to ankle (inner leg)" },
  shoeSize: { label: "Shoe Size", hint: "Standard size (US/EU/UK)" },
};

const EXTENDED_MALE: { key: string; label: string; hint: string }[] = [
  { key: "bicep", label: "Bicep", hint: "Fullest part of upper arm" },
  { key: "wrist", label: "Wrist", hint: "Around wrist bone" },
  { key: "thigh", label: "Thigh", hint: "Fullest part of upper thigh" },
  { key: "knee", label: "Knee", hint: "Around knee, slightly bent" },
  { key: "calf", label: "Calf", hint: "Fullest part of calf" },
  { key: "rise", label: "Trouser Rise", hint: "Crotch seam to natural waist" },
  { key: "outseam", label: "Outseam", hint: "Natural waist to ankle (outer leg)" },
  { key: "back_length", label: "Back Length", hint: "Nape of neck to natural waist" },
  { key: "posture_note", label: "Posture Notes", hint: "e.g. square shoulders, rounded back" },
  { key: "fit_preference", label: "Fit Preference", hint: "Slim / Regular / Relaxed / Oversized" },
  { key: "other_notes", label: "Additional Notes", hint: "Allergies, preferences, tailor instructions" },
];

const EXTENDED_FEMALE: { key: string; label: string; hint: string }[] = [
  { key: "bust_high", label: "High Bust", hint: "Around chest above fullest part" },
  { key: "hip_height", label: "Hip Height", hint: "Natural waist to fullest hip" },
  { key: "waist_to_knee", label: "Waist to Knee", hint: "Natural waist to centre of kneecap" },
  { key: "waist_to_floor", label: "Waist to Floor", hint: "Natural waist to floor" },
  { key: "bicep", label: "Bicep", hint: "Fullest part of upper arm" },
  { key: "thigh", label: "Thigh", hint: "Fullest part of upper thigh" },
  { key: "calf", label: "Calf", hint: "Fullest part of calf" },
  { key: "back_length", label: "Back Length", hint: "Nape of neck to natural waist" },
  { key: "posture_note", label: "Posture Notes", hint: "e.g. one shoulder higher, swayback" },
  { key: "fit_preference", label: "Fit Preference", hint: "Slim / Regular / Relaxed / Oversized" },
  { key: "other_notes", label: "Additional Notes", hint: "Allergies, preferences, tailor instructions" },
];

export default function ProfilePage() {
  const [gender, setGender] = useState<Gender>("male");
  const [unit, setUnit] = useState<UnitSystem>("imperial");
  const [core, setCore] = useState<Record<string, string>>({});
  const [extended, setExtended] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/customer/measurements")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setGender((data.gender as Gender) ?? "male");
          setUnit((data.unitSystem as UnitSystem) ?? "imperial");
          setCore({
            height: data.height ?? "",
            weight: data.weight ?? "",
            chest: data.chest ?? "",
            waist: data.waist ?? "",
            hips: data.hips ?? "",
            neck: data.neck ?? "",
            shoulderWidth: data.shoulderWidth ?? "",
            sleeveLength: data.sleeveLength ?? "",
            inseam: data.inseam ?? "",
            shoeSize: data.shoeSize ?? "",
          });
          setExtended(data.extended ?? {});
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/customer/measurements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender, unitSystem: unit, ...core, extended }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  const extendedFields = gender === "male" ? EXTENDED_MALE : EXTENDED_FEMALE;
  const filled = [...Object.values(core), ...Object.values(extended)].filter((v) => v?.trim()).length;
  const total = Object.keys(CORE_FIELDS).length + extendedFields.length;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-black/6 px-5 py-3.5 flex items-center justify-between">
        <div>
          <Link href="/app/discover" className="text-sm text-gray-400 hover:text-black">← Discover</Link>
          <div className="text-xs text-gray-400 mt-0.5">{filled}/{total} fields filled</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-gray-50"
          >
            Export PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-xs px-3 py-1.5 rounded-full text-white transition-colors ${
              saved ? "bg-green-500" : "bg-black hover:bg-gray-800"
            }`}
          >
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Progress */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${Math.round((filled / total) * 100)}%` }}
          />
        </div>

        {/* Gender + Unit toggles */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Profile</p>
            <div className="flex rounded-xl overflow-hidden border border-black/10">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGender(g); setExtended({}); }}
                  className={`flex-1 py-2.5 text-sm transition-colors ${
                    gender === g ? "bg-black text-white font-medium" : "bg-white text-gray-500"
                  }`}
                >
                  {g === "male" ? "Men's" : "Women's"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Units</p>
            <div className="flex rounded-xl overflow-hidden border border-black/10">
              {(["imperial", "metric"] as UnitSystem[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2.5 text-sm transition-colors ${
                    unit === u ? "bg-black text-white font-medium" : "bg-white text-gray-500"
                  }`}
                >
                  {u === "imperial" ? "in" : "cm"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Core fields */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black pb-2 mb-4 font-semibold">
            Core measurements
          </h2>
          <div className="space-y-3">
            {Object.entries(CORE_FIELDS).map(([key, { label, hint }]) => (
              <MeasureField
                key={key}
                label={label}
                hint={hint}
                unit={unit === "imperial" ? "in" : "cm"}
                value={core[key] ?? ""}
                onChange={(v) => setCore((c) => ({ ...c, [key]: v }))}
              />
            ))}
          </div>
        </section>

        {/* Extended fields */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black pb-2 mb-4 font-semibold">
            Extended measurements
          </h2>
          <div className="space-y-3">
            {extendedFields.map(({ key, label, hint }) => (
              <MeasureField
                key={key}
                label={label}
                hint={hint}
                unit={unit === "imperial" ? "in" : "cm"}
                value={extended[key] ?? ""}
                onChange={(v) => setExtended((e) => ({ ...e, [key]: v }))}
              />
            ))}
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-sm font-medium text-white transition-colors ${
            saved ? "bg-green-500" : "bg-black hover:bg-gray-800"
          }`}
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save measurements"}
        </button>
      </div>
    </div>
  );
}

function MeasureField({
  label,
  hint,
  unit,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isText = label.includes("Notes") || label.includes("Preference");

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label} {!isText && <span className="text-gray-300">({unit})</span>}
      </label>
      {isText ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      )}
    </div>
  );
}

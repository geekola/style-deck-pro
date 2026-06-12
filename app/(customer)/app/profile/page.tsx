"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

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
  const { data: session } = useSession();
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
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto print:hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
        <div>
          <Link href="/app/discover" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white dark:text-white">&larr; Discover</Link>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{filled}/{total} fields filled</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
          >
            Export PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-xs px-3 py-1.5 rounded-full text-white transition-colors ${
              saved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800"
            }`}
          >
            {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Progress */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-black dark:bg-white dark:text-black rounded-full transition-all duration-500"
            style={{ width: `${Math.round((filled / total) * 100)}%` }}
          />
        </div>

        {/* Gender + Unit toggles */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Profile</p>
            <div className="flex rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGender(g); setExtended({}); }}
                  className={`flex-1 py-2.5 text-sm transition-colors ${
                    gender === g ? "bg-black dark:bg-white dark:text-black text-white font-medium" : "bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {g === "male" ? "Men's" : "Women's"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Units</p>
            <div className="flex rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
              {(["imperial", "metric"] as UnitSystem[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2.5 text-sm transition-colors ${
                    unit === u ? "bg-black dark:bg-white dark:text-black text-white font-medium" : "bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400 dark:text-gray-500"
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
          <h2 className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
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
          <h2 className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
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
            saved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800"
          }`}
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save measurements"}
        </button>
      </div>
    </div>

    <MeasurementChart
      userName={session?.user?.name ?? ""}
      gender={gender}
      unit={unit}
      core={core}
      extended={extended}
      extendedFields={extendedFields}
    />
    </>
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
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">
        {label} {!isText && <span className="text-gray-300 dark:text-gray-600">({unit})</span>}
      </label>
      {isText ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      )}
    </div>
  );
}

function MeasurementChart({
  userName,
  gender,
  unit,
  core,
  extended,
  extendedFields,
}: {
  userName: string;
  gender: Gender;
  unit: UnitSystem;
  core: Record<string, string>;
  extended: Record<string, string>;
  extendedFields: { key: string; label: string; hint: string }[];
}) {
  const unitLabel = unit === "imperial" ? "in" : "cm";

  const rows: { label: string; value: string; isText: boolean }[] = [
    ...Object.entries(CORE_FIELDS).map(([key, { label }]) => ({
      label,
      value: core[key] ?? "",
      isText: false,
    })),
    ...extendedFields.map(({ key, label }) => ({
      label,
      value: extended[key] ?? "",
      isText: label.includes("Notes") || label.includes("Preference"),
    })),
  ];

  return (
    <div className="hidden print:block p-10 text-black dark:text-white font-sans">
      <div className="border-2 border-black dark:border-white text-center py-3 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-[0.2em]">
          {gender === "male" ? "Men's" : "Women's"} Measurement Chart
        </h1>
      </div>

      <div className="flex justify-between text-xs mb-4">
        <span>Customer: {userName || "—"}</span>
        <span>Unit System: {unit === "imperial" ? "Imperial (inches)" : "Metric (centimeters)"}</span>
        <span>Date: {new Date().toLocaleDateString()}</span>
      </div>

      <table className="w-full border-collapse border border-black dark:border-white text-sm mb-6">
        <thead>
          <tr>
            <th className="border border-black dark:border-white bg-gray-100 dark:bg-gray-800 px-3 py-2 w-12 text-center font-semibold">#</th>
            <th className="border border-black dark:border-white bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">Measurement</th>
            <th className="border border-black dark:border-white bg-gray-100 dark:bg-gray-800 px-3 py-2 w-36 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${i}-${row.label}`}>
              <td className="border border-black dark:border-white bg-gray-50 dark:bg-gray-900 px-3 py-2 text-center font-medium">{i + 1}</td>
              <td className="border border-black dark:border-white px-3 py-2">{row.label}</td>
              <td className="border border-black dark:border-white px-3 py-2 text-right">
                {row.value ? (row.isText ? row.value : `${row.value} ${unitLabel}`) : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border border-black dark:border-white p-3 text-xs min-h-[80px]">
        <p className="font-semibold uppercase tracking-widest">Notes</p>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-6 text-center">
        Generated by StyleDeck &middot; {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  useSession,
  updateUser,
  changeEmail,
  changePassword,
} from "@/lib/auth-client";
import { COUNTRIES } from "@/components/country-select";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "team" | "branding" | "addresses" | "security";

type BrandAddress = {
  line1: string; line2: string; city: string; state: string; postalCode: string; country: string;
};

const emptyAddr: BrandAddress = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT =
  "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
const LABEL = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";
const BTN_PRIMARY =
  "px-4 py-2 rounded-xl text-sm font-medium bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors";
const BTN_GHOST =
  "px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 transition-colors";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "team",      label: "Team"      },
  { id: "branding",  label: "Branding"  },
  { id: "addresses", label: "Addresses" },
  { id: "security",  label: "Security"  },
];

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  pending:  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  suspended:"bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  rejected: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({
  title, description, value, onChange, onSave, saving, saved, requireLine1 = false,
}: {
  title: string; description?: string;
  value: BrandAddress; onChange: (v: BrandAddress) => void;
  onSave: () => void; saving: boolean; saved: boolean; requireLine1?: boolean;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>}
      <div>
        <label className={LABEL}>Address line 1</label>
        <input type="text" value={value.line1} onChange={(e) => onChange({ ...value, line1: e.target.value })} className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Address line 2 <span className="text-gray-300 dark:text-gray-600">optional</span></label>
        <input type="text" value={value.line2} onChange={(e) => onChange({ ...value, line2: e.target.value })} className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>City</label>
          <input type="text" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>State / Province</label>
          <input type="text" value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value })} className={INPUT} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Postal code</label>
          <input type="text" value={value.postalCode} onChange={(e) => onChange({ ...value, postalCode: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Country</label>
          <select value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })} className={INPUT}>
            <option value="">Select country</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving || (requireLine1 && !value.line1.trim())}
          className={`${BTN_PRIMARY} ${saved ? "!bg-green-600 !text-white" : ""}`}>
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

type Admin = { userId: string; name: string; email: string; status: "active" | "suspended"; isYou: boolean };
type AddResult = { email: string; tempPassword?: string };

function TeamTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Brand Admin");
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<AddResult | null>(null);

  async function load() {
    const res = await fetch("/api/brand/admins");
    if (res.ok) setAdmins(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setAddError(null);
    setAddResult(null);
    const res = await fetch("/api/brand/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setAddError(data.error ?? "Something went wrong."); setSubmitting(false); return; }
    setAddResult(data);
    setInviteEmail("");
    setSubmitting(false);
    await load();
  }

  async function handleRemove(admin: Admin) {
    if (!confirm(`Remove ${admin.email} from this brand's team?`)) return;
    setRemovingId(admin.userId);
    setListError(null);
    const res = await fetch(`/api/brand/admins/${admin.userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setListError(data.error ?? "Something went wrong.");
    } else {
      await load();
    }
    setRemovingId(null);
  }

  return (
    <div className="space-y-8">
      {/* Admins */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
          Admin Management
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Team members who can manage products, clients, gifting, and orders for this brand.
        </p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No admins yet.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.userId}
                className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{a.name}</span>
                    {a.isYou && <span className="text-xs text-gray-400">(you)</span>}
                    {a.status === "suspended" && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Brand Admin</p>
                </div>
                {!a.isYou && (
                  <button onClick={() => handleRemove(a)} disabled={removingId === a.userId}
                    className="text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1 shrink-0 disabled:opacity-50">
                    {removingId === a.userId ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {listError && <p className="text-xs text-red-500 mt-2">{listError}</p>}
      </section>

      {/* Invitations */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
          Invite Admin
        </h3>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className={LABEL}>Email address</label>
              <input type="email" required placeholder="teammate@brand.com" value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={INPUT}>
                <option>Brand Admin</option>
              </select>
            </div>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submitting || !inviteEmail}
                className={BTN_PRIMARY}>
                {submitting ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
          {addResult && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-gray-700 dark:text-gray-300">
              {addResult.tempPassword ? (
                <>
                  <p>Created <span className="font-medium">{addResult.email}</span>.</p>
                  <p className="mt-1">Temporary password: <span className="font-mono font-medium">{addResult.tempPassword}</span></p>
                  <p className="mt-1 text-gray-400">Share this securely — it won&apos;t be shown again.</p>
                </>
              ) : (
                <p>Added <span className="font-medium">{addResult.email}</span> to the team.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BrandSettingsPage() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Overview
  const [brandName, setBrandName] = useState("");
  const [brandCategory, setBrandCategory] = useState("casual");
  const [fulfillmentEmail, setFulfillmentEmail] = useState("");
  const [accessPolicy, setAccessPolicy] = useState("open");
  const [brandStatus, setBrandStatus] = useState("");
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewSaved, setOverviewSaved] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [brandDataLoaded, setBrandDataLoaded] = useState(false);

  // Addresses
  const [businessAddr, setBusinessAddr] = useState<BrandAddress>(emptyAddr);
  const [returnAddr, setReturnAddr] = useState<BrandAddress>(emptyAddr);
  const [fulfillmentAddr, setFulfillmentAddr] = useState<BrandAddress>(emptyAddr);
  const [addrSaving, setAddrSaving] = useState<"business" | "return" | "fulfillment" | null>(null);
  const [addrSaved, setAddrSaved] = useState<"business" | "return" | "fulfillment" | null>(null);
  const [addrLoaded, setAddrLoaded] = useState(false);

  // Security - login settings
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginSaved, setLoginSaved] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Security - password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Populate session data
  useEffect(() => {
    if (session?.user) {
      setFirstName(session.user.firstName ?? "");
      setLastName(session.user.lastName ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session?.user]);

  // Fetch brand data
  useEffect(() => {
    fetch("/api/brand")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setBrandName(data.name ?? "");
          setBrandCategory(data.category ?? "casual");
          setFulfillmentEmail(data.fulfillmentEmail ?? "");
          setAccessPolicy(data.accessPolicy ?? "open");
          setBrandStatus(data.status ?? "");
          setLogoUrl(data.logoUrl ?? null);
        }
      })
      .finally(() => setBrandDataLoaded(true));
  }, []);

  // Fetch addresses
  useEffect(() => {
    fetch("/api/brand/addresses")
      .then((r) => r.json())
      .then((data) => {
        if (data?.address) setBusinessAddr({ line1: data.address.line1 ?? "", line2: data.address.line2 ?? "", city: data.address.city ?? "", state: data.address.state ?? "", postalCode: data.address.postalCode ?? "", country: data.address.country ?? "" });
        if (data?.returnAddress) setReturnAddr({ line1: data.returnAddress.line1 ?? "", line2: data.returnAddress.line2 ?? "", city: data.returnAddress.city ?? "", state: data.returnAddress.state ?? "", postalCode: data.returnAddress.postalCode ?? "", country: data.returnAddress.country ?? "" });
        if (data?.fulfillmentAddress) setFulfillmentAddr({ line1: data.fulfillmentAddress.line1 ?? "", line2: data.fulfillmentAddress.line2 ?? "", city: data.fulfillmentAddress.city ?? "", state: data.fulfillmentAddress.state ?? "", postalCode: data.fulfillmentAddress.postalCode ?? "", country: data.fulfillmentAddress.country ?? "" });
      })
      .catch(() => {})
      .finally(() => setAddrLoaded(true));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveOverview() {
    setOverviewSaving(true);
    setOverviewSaved(false);
    setOverviewError(null);
    const res = await fetch("/api/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: brandName.trim() || undefined, category: brandCategory, fulfillmentEmail: fulfillmentEmail.trim() || undefined, accessPolicy }),
    });
    setOverviewSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setOverviewError(data.error ?? "Failed to save.");
    } else {
      setOverviewSaved(true);
      setTimeout(() => setOverviewSaved(false), 2000);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/brand/logo", { method: "POST", body: fd });
    setLogoUploading(false);
    e.target.value = "";
    if (!res.ok) { const d = await res.json().catch(() => null); setLogoError(d?.error ?? "Could not upload."); return; }
    setLogoUrl((await res.json()).logoUrl);
  }

  async function handleRemoveLogo() {
    setLogoUploading(true);
    const res = await fetch("/api/brand/logo", { method: "DELETE" });
    setLogoUploading(false);
    if (res.ok || res.status === 204) setLogoUrl(null);
  }

  async function handleSaveAddress(field: "business" | "return" | "fulfillment", value: BrandAddress) {
    setAddrSaving(field);
    setAddrSaved(null);
    const keyMap = { business: "address", return: "returnAddress", fulfillment: "fulfillmentAddress" };
    const body = { [keyMap[field]]: value.line1 ? value : null };
    await fetch("/api/brand/addresses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAddrSaving(null);
    setAddrSaved(field);
    setTimeout(() => setAddrSaved(null), 2000);
  }

  async function handleSaveLoginSettings() {
    setLoginSaving(true);
    setLoginSaved(false);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    await updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), name: fullName } as Parameters<typeof updateUser>[0]);
    setLoginSaving(false);
    setLoginSaved(true);
    setTimeout(() => setLoginSaved(false), 2000);
  }

  async function handleSaveEmail() {
    if (!email || email === session?.user.email) return;
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailError(null);
    const { error } = await changeEmail({ newEmail: email, callbackURL: "/brand/account" });
    setEmailSaving(false);
    if (error) { setEmailError(error.message ?? "Could not update email."); }
    else { setEmailMessage("Check your new inbox for a verification link."); }
  }

  async function handleChangePassword() {
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setPasswordSaving(true);
    const { error } = await changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message ?? "Could not change password."); }
    else { setPasswordMessage("Password updated."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isPending || !brandDataLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">Brand Settings</h1>

      <div className="flex gap-8 items-start">

        {/* Sidebar nav */}
        <nav className="w-40 shrink-0 sticky top-6">
          <ul className="space-y-0.5">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === t.id
                      ? "bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Brand name</label>
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Category</label>
                <select value={brandCategory} onChange={(e) => setBrandCategory(e.target.value)} className={INPUT}>
                  <option value="casual">Casual</option>
                  <option value="business">Business</option>
                  <option value="formal">Formal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Access policy</label>
                <select value={accessPolicy} onChange={(e) => setAccessPolicy(e.target.value)} className={INPUT}>
                  <option value="open">Open — anyone can discover your products</option>
                  <option value="selective">Selective — you approve access per client</option>
                  <option value="invite_only">Invite only — clients need an invitation</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Fulfillment email</label>
                <input type="email" value={fulfillmentEmail} onChange={(e) => setFulfillmentEmail(e.target.value)} className={INPUT} />
                <p className="text-xs text-gray-400 mt-1">Receives order notifications and fulfillment requests.</p>
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <div>
                  <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[brandStatus] ?? STATUS_BADGE.pending}`}>
                    {brandStatus || "—"}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">Managed by the StyleDeck platform team.</p>
                </div>
              </div>
              {overviewError && <p className="text-xs text-red-500">{overviewError}</p>}
              <div className="flex justify-end pt-2">
                <button onClick={handleSaveOverview} disabled={overviewSaving || !brandName.trim()}
                  className={`${BTN_PRIMARY} ${overviewSaved ? "!bg-green-600 !text-white" : ""}`}>
                  {overviewSaved ? "Saved ✓" : overviewSaving ? "Saving..." : "Save overview"}
                </button>
              </div>
            </div>
          )}

          {/* Team */}
          {activeTab === "team" && <TeamTab />}

          {/* Branding */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Logo upload */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Logo</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl
                      ? <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain" />
                      : <span className="text-xs text-gray-400">No logo</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      Shown on your products in the customer app. JPEG, PNG, WebP, or SVG — up to 2 MB.
                    </p>
                    <div className="flex gap-2">
                      <label className={`${BTN_PRIMARY} cursor-pointer`}>
                        {logoUploading ? "Uploading..." : logoUrl ? "Replace" : "Upload logo"}
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={logoUploading} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button onClick={handleRemoveLogo} disabled={logoUploading} className={BTN_GHOST}>
                          Remove
                        </button>
                      )}
                    </div>
                    {logoError && <p className="text-xs text-red-500 mt-1.5">{logoError}</p>}
                  </div>
                </div>
              </section>

              {/* Brand preview */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Brand Preview</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">How your brand appears to clients in the discovery feed.</p>
                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-900 w-fit">
                  <div className="w-9 h-9 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {logoUrl
                      ? <img src={logoUrl} alt="" className="w-full h-full object-contain" />
                      : <span className="text-xs text-gray-300 dark:text-gray-600">?</span>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{brandName || "Your Brand Name"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{brandCategory}</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Addresses */}
          {activeTab === "addresses" && (
            addrLoaded ? (
              <div className="space-y-6">
                <AddressForm
                  title="Business Address"
                  description="Your primary business address."
                  value={businessAddr}
                  onChange={setBusinessAddr}
                  onSave={() => handleSaveAddress("business", businessAddr)}
                  saving={addrSaving === "business"}
                  saved={addrSaved === "business"}
                  requireLine1
                />
                <AddressForm
                  title="Return Address"
                  description="Printed on outgoing shipments. If blank, business address is used."
                  value={returnAddr}
                  onChange={setReturnAddr}
                  onSave={() => handleSaveAddress("return", returnAddr)}
                  saving={addrSaving === "return"}
                  saved={addrSaved === "return"}
                />
                <AddressForm
                  title="Fulfillment Address"
                  description="Where items are shipped from. Used for fulfillment routing."
                  value={fulfillmentAddr}
                  onChange={setFulfillmentAddr}
                  onSave={() => handleSaveAddress("fulfillment", fulfillmentAddr)}
                  saving={addrSaving === "fulfillment"}
                  saved={addrSaved === "fulfillment"}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading...</p>
            )
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="space-y-8">
              {/* Login settings */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Login Settings</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>First name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Last name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleSaveLoginSettings} disabled={loginSaving || !firstName.trim()}
                      className={`${BTN_PRIMARY} ${loginSaved ? "!bg-green-600 !text-white" : ""}`}>
                      {loginSaved ? "Saved ✓" : loginSaving ? "Saving..." : "Save name"}
                    </button>
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <div className="flex gap-2">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
                      <button onClick={handleSaveEmail} disabled={emailSaving || !email.trim() || email === session?.user.email}
                        className={`${BTN_PRIMARY} shrink-0`}>
                        {emailSaving ? "Sending..." : "Update"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Changing your email requires verifying the new address first.</p>
                    {emailMessage && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{emailMessage}</p>}
                    {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                  </div>
                </div>
              </section>

              {/* Password */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Password</h3>
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Current password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>New password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Confirm new password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={INPUT} />
                  </div>
                  {passwordMessage && <p className="text-xs text-green-600 dark:text-green-400">{passwordMessage}</p>}
                  {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                  <div className="flex justify-end">
                    <button onClick={handleChangePassword}
                      disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                      className={BTN_PRIMARY}>
                      {passwordSaving ? "Updating..." : "Change password"}
                    </button>
                  </div>
                </div>
              </section>

              {/* 2FA */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Two-Factor Authentication</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">2FA not enabled</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Add an extra layer of security to your account.</p>
                  </div>
                  <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg shrink-0">
                    Coming soon
                  </span>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

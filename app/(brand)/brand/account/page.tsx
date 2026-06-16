"use client";

import { useState, useEffect } from "react";
import {
  useSession,
  updateUser,
  changeEmail,
  changePassword,
} from "@/lib/auth-client";
import { TeamSection } from "./team-section";
import { COUNTRIES } from "@/components/country-select";

type BrandAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyAddr: BrandAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const INPUT_CLS =
  "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
const BTN_PRIMARY =
  "px-4 py-2 rounded-md text-sm bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors";
const BTN_GHOST =
  "px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 transition-colors";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </h2>
    </div>
  );
}

export default function BrandAccountPage() {
  const { data: session, isPending } = useSession();

  // Brand settings
  const [brandName, setBrandName] = useState("");
  const [brandCategory, setBrandCategory] = useState("casual");
  const [fulfillmentEmail, setFulfillmentEmail] = useState("");
  const [accessPolicy, setAccessPolicy] = useState("open");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Profile (name)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Email
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Branding (logo)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Addresses
  const [brandAddress, setBrandAddress] = useState<BrandAddress>(emptyAddr);
  const [returnAddress, setReturnAddress] = useState<BrandAddress>(emptyAddr);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addrSaving, setAddrSaving] = useState<"address" | "returnAddress" | null>(null);
  const [addrSaved, setAddrSaved] = useState<"address" | "returnAddress" | null>(null);

  useEffect(() => {
    if (session?.user) {
      setFirstName(session.user.firstName ?? "");
      setLastName(session.user.lastName ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session?.user]);

  useEffect(() => {
    fetch("/api/brand")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLogoUrl(data.logoUrl ?? null);
          setBrandName(data.name ?? "");
          setBrandCategory(data.category ?? "casual");
          setFulfillmentEmail(data.fulfillmentEmail ?? "");
          setAccessPolicy(data.accessPolicy ?? "open");
        }
      })
      .finally(() => setLogoLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/brand/addresses")
      .then((r) => r.json())
      .then((data) => {
        if (data?.address)
          setBrandAddress({
            line1: data.address.line1 ?? "",
            line2: data.address.line2 ?? "",
            city: data.address.city ?? "",
            state: data.address.state ?? "",
            postalCode: data.address.postalCode ?? "",
            country: data.address.country ?? "",
          });
        if (data?.returnAddress)
          setReturnAddress({
            line1: data.returnAddress.line1 ?? "",
            line2: data.returnAddress.line2 ?? "",
            city: data.returnAddress.city ?? "",
            state: data.returnAddress.state ?? "",
            postalCode: data.returnAddress.postalCode ?? "",
            country: data.returnAddress.country ?? "",
          });
        setAddressesLoaded(true);
      })
      .catch(() => setAddressesLoaded(true));
  }, []);

  async function handleSaveBrandSettings() {
    setBrandSaving(true);
    setBrandSaved(false);
    setBrandError(null);
    const res = await fetch("/api/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: brandName.trim() || undefined,
        category: brandCategory || undefined,
        fulfillmentEmail: fulfillmentEmail.trim() || undefined,
        accessPolicy: accessPolicy || undefined,
      }),
    });
    setBrandSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBrandError(data.error ?? "Failed to save.");
    } else {
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2000);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/brand/logo", { method: "POST", body: formData });
    setLogoUploading(false);
    e.target.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLogoError(data?.error ?? "Could not upload logo.");
      return;
    }
    setLogoUrl((await res.json()).logoUrl);
  }

  async function handleRemoveLogo() {
    setLogoUploading(true);
    setLogoError(null);
    const res = await fetch("/api/brand/logo", { method: "DELETE" });
    setLogoUploading(false);
    if (!res.ok && res.status !== 204) {
      setLogoError("Could not remove logo.");
      return;
    }
    setLogoUrl(null);
  }

  async function handleSaveName() {
    setNameSaving(true);
    setNameSaved(false);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    await updateUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
    } as Parameters<typeof updateUser>[0]);
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleSaveEmail() {
    if (!email || email === session?.user.email) return;
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailError(null);
    const { error } = await changeEmail({ newEmail: email, callbackURL: "/brand/account" });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message ?? "Could not update email.");
    } else {
      setEmailMessage("Check your new inbox for a verification link to confirm this change.");
    }
  }

  async function handleChangePassword() {
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message ?? "Could not change password.");
    } else {
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleSaveAddress(
    field: "address" | "returnAddress",
    value: BrandAddress
  ) {
    setAddrSaving(field);
    setAddrSaved(null);
    const body =
      field === "address"
        ? { address: value.line1 ? value : null }
        : { returnAddress: value.line1 ? value : null };
    await fetch("/api/brand/addresses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAddrSaving(null);
    setAddrSaved(field);
    setTimeout(() => setAddrSaved(null), 2000);
  }

  if (isPending || logoLoading || !addressesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Account settings</h1>

      <div className="space-y-0">
        {/* Brand settings */}
        <section className="pb-8">
          <SectionHeader title="Brand settings" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Brand name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Category
              </label>
              <select
                value={brandCategory}
                onChange={(e) => setBrandCategory(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="casual">Casual</option>
                <option value="business">Business</option>
                <option value="formal">Formal</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Fulfillment email
              </label>
              <input
                type="email"
                value={fulfillmentEmail}
                onChange={(e) => setFulfillmentEmail(e.target.value)}
                className={INPUT_CLS}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Receives order notifications and fulfillment requests.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Access policy
              </label>
              <select
                value={accessPolicy}
                onChange={(e) => setAccessPolicy(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="open">Open — anyone can discover your products</option>
                <option value="selective">Selective — you approve access per client</option>
                <option value="invite_only">Invite only — clients need an invitation</option>
              </select>
            </div>
            {brandError && <p className="text-xs text-red-500">{brandError}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleSaveBrandSettings}
                disabled={brandSaving || !brandName.trim()}
                className={`${BTN_PRIMARY} ${brandSaved ? "!bg-green-600 !text-white" : ""}`}
              >
                {brandSaved ? "Saved ✓" : brandSaving ? "Saving..." : "Save brand settings"}
              </button>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="pb-8">
          <SectionHeader title="Branding" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Brand logo</p>
              <p className="text-xs text-gray-400 mb-2">
                Shown on your products in the customer app. JPEG, PNG, WebP, or SVG, up to 2 MB.
              </p>
              <div className="flex gap-2">
                <label className={`${BTN_PRIMARY} cursor-pointer`}>
                  {logoUploading ? "Uploading..." : logoUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="hidden"
                  />
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

        {/* Profile */}
        <section className="pb-8">
          <SectionHeader title="Profile" />
          <div className="space-y-4">
            <div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving || !firstName.trim()}
                  className={`${BTN_PRIMARY} ${nameSaved ? "!bg-green-600 !text-white" : ""}`}
                >
                  {nameSaved ? "Saved ✓" : nameSaving ? "Saving..." : "Save name"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLS}
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={emailSaving || !email.trim() || email === session?.user.email}
                  className={BTN_PRIMARY}
                >
                  {emailSaving ? "Sending..." : "Update"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Changing your email requires verifying the new address before it takes effect.
              </p>
              {emailMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">{emailMessage}</p>
              )}
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="pb-8">
          <SectionHeader title="Team" />
          <TeamSection />
        </section>

        {/* Business address */}
        <section className="pb-8">
          <SectionHeader title="Business address" />
          <AddressForm
            value={brandAddress}
            onChange={setBrandAddress}
            onSave={() => handleSaveAddress("address", brandAddress)}
            saving={addrSaving === "address"}
            saved={addrSaved === "address"}
            saveLabel="Save business address"
            requireLine1
          />
        </section>

        {/* Return address */}
        <section className="pb-8">
          <SectionHeader title="Return address" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Printed on outgoing shipments. If blank, business address is used.
          </p>
          <AddressForm
            value={returnAddress}
            onChange={setReturnAddress}
            onSave={() => handleSaveAddress("returnAddress", returnAddress)}
            saving={addrSaving === "returnAddress"}
            saved={addrSaved === "returnAddress"}
            saveLabel="Save return address"
          />
        </section>

        {/* Password */}
        <section className="pb-8">
          <SectionHeader title="Password" />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            {passwordMessage && (
              <p className="text-xs text-green-600 dark:text-green-400">{passwordMessage}</p>
            )}
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className={BTN_PRIMARY}
              >
                {passwordSaving ? "Updating..." : "Change password"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type AddressFormProps = {
  value: BrandAddress;
  onChange: (v: BrandAddress) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveLabel: string;
  requireLine1?: boolean;
};

function AddressForm({
  value,
  onChange,
  onSave,
  saving,
  saved,
  saveLabel,
  requireLine1 = false,
}: AddressFormProps) {
  const cls =
    "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Address line 1
        </label>
        <input
          type="text"
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          className={cls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Address line 2{" "}
          <span className="text-gray-300 dark:text-gray-600">optional</span>
        </label>
        <input
          type="text"
          value={value.line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
          className={cls}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className={cls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            State / Province
          </label>
          <input
            type="text"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            className={cls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Postal code
          </label>
          <input
            type="text"
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            className={cls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
          <select
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className={cls}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || (requireLine1 && !value.line1)}
          className={`px-4 py-2 rounded-md text-sm text-white transition-colors disabled:opacity-50 ${
            saved
              ? "bg-green-600"
              : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          }`}
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : saveLabel}
        </button>
      </div>
    </div>
  );
}

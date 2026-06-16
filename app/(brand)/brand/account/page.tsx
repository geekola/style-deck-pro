"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useSession,
  updateUser,
  changeEmail,
  changePassword,
} from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { TeamSection } from "./team-section";
import { COUNTRIES } from "@/components/country-select";

export default function BrandAccountPage() {
  const { data: session, isPending } = useSession();

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

  // Branding (brand logo)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Brand addresses
  type BrandAddress = { line1: string; line2: string; city: string; state: string; postalCode: string; country: string };
  const emptyAddr: BrandAddress = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };
  const [brandAddress, setBrandAddress] = useState<BrandAddress>(emptyAddr);
  const [returnAddress, setReturnAddress] = useState<BrandAddress>(emptyAddr);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);

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
        if (data) setLogoUrl(data.logoUrl ?? null);
      })
      .finally(() => setLogoLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/brand/addresses")
      .then((r) => r.json())
      .then((data) => {
        if (data?.address) setBrandAddress({ line1: data.address.line1 ?? "", line2: data.address.line2 ?? "", city: data.address.city ?? "", state: data.address.state ?? "", postalCode: data.address.postalCode ?? "", country: data.address.country ?? "" });
        if (data?.returnAddress) setReturnAddress({ line1: data.returnAddress.line1 ?? "", line2: data.returnAddress.line2 ?? "", city: data.returnAddress.city ?? "", state: data.returnAddress.state ?? "", postalCode: data.returnAddress.postalCode ?? "", country: data.returnAddress.country ?? "" });
        setAddressesLoaded(true);
      })
      .catch(() => setAddressesLoaded(true));
  }, []);

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

    const data = await res.json();
    setLogoUrl(data.logoUrl);
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
    await updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), name: fullName } as Parameters<typeof updateUser>[0]);
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleSaveEmail() {
    if (!email || email === session?.user.email) return;
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailError(null);
    const { error } = await changeEmail({
      newEmail: email,
      callbackURL: "/brand/account",
    });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message ?? "Could not update email.");
    } else {
      setEmailMessage(
        "Check your new inbox for a verification link to confirm this change."
      );
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

  async function handleSaveAddresses(field: "address" | "returnAddress", value: BrandAddress) {
    setAddressSaving(true);
    setAddressSaved(false);
    const body = field === "address"
      ? { address: value.line1 ? value : null }
      : { returnAddress: value.line1 ? value : null };
    await fetch("/api/brand/addresses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAddressSaving(false);
    setAddressSaved(true);
    setTimeout(() => setAddressSaved(false), 2000);
  }

  if (isPending || !addressesLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <Link
        href="/brand"
        className="text-sm text-gray-400 hover:text-black dark:hover:text-white"
      >
        &larr; Dashboard
      </Link>
      <h1 className="text-lg font-semibold mt-1 mb-6 text-gray-900 dark:text-white">
        Account settings
      </h1>

      <div className="space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Switch between light and dark mode.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Branding */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Branding
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
              {logoLoading ? null : logoUrl ? (
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
                <label className="px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50">
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
                  <button
                    onClick={handleRemoveLogo}
                    disabled={logoUploading}
                    className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              {logoError && <p className="text-xs text-red-500 mt-1.5">{logoError}</p>}
            </div>
          </div>
        </section>

        {/* Profile */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Profile
          </h2>
          <div className="space-y-3">
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
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !firstName.trim()}
                className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                  nameSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                }`}
              >
                {nameSaved ? "Saved ✓" : nameSaving ? "Saving..." : "Save name"}
              </button>
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
                  className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={emailSaving || !email.trim() || email === session?.user.email}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {emailSaving ? "Sending..." : "Update"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Changing your email requires verifying the new address before it takes effect.
              </p>
              {emailMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">{emailMessage}</p>
              )}
              {emailError && (
                <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <TeamSection />

        {/* Business address */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Business address
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 1</label>
              <input type="text" value={brandAddress.line1} onChange={(e) => setBrandAddress({ ...brandAddress, line1: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 2 <span className="text-gray-300 dark:text-gray-600">optional</span></label>
              <input type="text" value={brandAddress.line2} onChange={(e) => setBrandAddress({ ...brandAddress, line2: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input type="text" value={brandAddress.city} onChange={(e) => setBrandAddress({ ...brandAddress, city: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">State / Province</label>
                <input type="text" value={brandAddress.state} onChange={(e) => setBrandAddress({ ...brandAddress, state: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Postal code</label>
                <input type="text" value={brandAddress.postalCode} onChange={(e) => setBrandAddress({ ...brandAddress, postalCode: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select value={brandAddress.country} onChange={(e) => setBrandAddress({ ...brandAddress, country: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => handleSaveAddresses("address", brandAddress)} disabled={addressSaving || !brandAddress.line1} className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${addressSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"} disabled:opacity-50`}>
              {addressSaved ? "Saved ✓" : addressSaving ? "Saving..." : "Save business address"}
            </button>
          </div>
        </section>

        {/* Return address */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Return address
          </h2>
          <p className="text-xs text-gray-400 mb-3">Printed on outgoing shipments. If blank, business address is used.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 1</label>
              <input type="text" value={returnAddress.line1} onChange={(e) => setReturnAddress({ ...returnAddress, line1: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 2 <span className="text-gray-300 dark:text-gray-600">optional</span></label>
              <input type="text" value={returnAddress.line2} onChange={(e) => setReturnAddress({ ...returnAddress, line2: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input type="text" value={returnAddress.city} onChange={(e) => setReturnAddress({ ...returnAddress, city: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">State / Province</label>
                <input type="text" value={returnAddress.state} onChange={(e) => setReturnAddress({ ...returnAddress, state: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Postal code</label>
                <input type="text" value={returnAddress.postalCode} onChange={(e) => setReturnAddress({ ...returnAddress, postalCode: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select value={returnAddress.country} onChange={(e) => setReturnAddress({ ...returnAddress, country: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => handleSaveAddresses("returnAddress", returnAddress)} disabled={addressSaving} className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${addressSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"} disabled:opacity-50`}>
              {addressSaved ? "Saved ✓" : addressSaving ? "Saving..." : "Save return address"}
            </button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Password
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
            {passwordMessage && (
              <p className="text-xs text-green-600 dark:text-green-400">{passwordMessage}</p>
            )}
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {passwordSaving ? "Updating..." : "Change password"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

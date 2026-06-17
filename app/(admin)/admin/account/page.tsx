"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useSession,
  updateUser,
  changeEmail,
  changePassword,
} from "@/lib/auth-client";

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";

const sectionHeadingClass =
  "text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold";

export default function AdminAccountPage() {
  const { data: session, isPending } = useSession();

  // Profile
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Email change (separate flow — requires verification)
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Populate from session
  useEffect(() => {
    if (session?.user) {
      setFirstName(session.user.firstName ?? "");
      setLastName(session.user.lastName ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session?.user]);

  // Fetch platform settings (logoUrl + companyName)
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLogoUrl(data.logoUrl ?? null);
          setCompanyName(data.companyName ?? "");
        }
      })
      .finally(() => setLogoLoading(false));
  }, []);

  // ── Profile ────────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError(null);

    try {
      // Save name via better-auth
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: fullName,
      } as Parameters<typeof updateUser>[0]);

      // Save company name via platform settings API
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setProfileError(data?.error ?? "Could not save profile.");
        return;
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError("Something went wrong.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveEmail() {
    if (!email || email === session?.user.email) return;
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailError(null);
    const { error } = await changeEmail({
      newEmail: email,
      callbackURL: "/admin/account",
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

  // ── Security ───────────────────────────────────────────────────────────────

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

  // ── Logo ───────────────────────────────────────────────────────────────────

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/settings/logo", {
      method: "POST",
      body: formData,
    });
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
    const res = await fetch("/api/admin/settings/logo", { method: "DELETE" });
    setLogoUploading(false);

    if (!res.ok && res.status !== 204) {
      setLogoError("Could not remove logo.");
      return;
    }

    setLogoUrl(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  const lastLoginRaw = session?.session?.updatedAt ?? session?.session?.createdAt;
  const lastLoginDisplay = lastLoginRaw
    ? new Date(lastLoginRaw).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <Link
        href="/admin"
        className="text-sm text-gray-400 hover:text-black dark:hover:text-white"
      >
        &larr; Dashboard
      </Link>
      <h1 className="text-lg font-semibold mt-1 mb-6 text-gray-900 dark:text-white">
        Account settings
      </h1>

      <div className="space-y-8">

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className={sectionHeadingClass}>Profile</h2>
          <div className="space-y-3">

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Company name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. StyleDeck"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
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
                  className={inputClass}
                />
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
                  className={`flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white`}
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

            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={profileSaving || !firstName.trim()}
              className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                profileSaved
                  ? "bg-green-500"
                  : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {profileSaved ? "Saved ✓" : profileSaving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </section>

        {/* ── Security ────────────────────────────────────────────────────── */}
        <section>
          <h2 className={sectionHeadingClass}>Security</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {passwordSaving ? "Updating..." : "Change password"}
            </button>
          </div>
        </section>

        {/* ── Branding ────────────────────────────────────────────────────── */}
        <section>
          <h2 className={sectionHeadingClass}>Branding</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
              {logoLoading ? null : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Platform logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Platform logo
              </p>
              <p className="text-xs text-gray-400 mb-2">
                Shown in the navigation bar. JPEG, PNG, WebP, or SVG — up to 2 MB.
              </p>
              <div className="flex gap-2">
                <label className="px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50">
                  {logoUploading ? "Uploading..." : logoUrl ? "Replace" : "Upload new logo"}
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
              {logoError && (
                <p className="text-xs text-red-500 mt-1.5">{logoError}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Account Information ──────────────────────────────────────────── */}
        <section>
          <h2 className={sectionHeadingClass}>Account information</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Role</dt>
              <dd className="font-medium text-gray-900 dark:text-white">Super Admin</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Last login</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{lastLoginDisplay}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{session?.user.email ?? "—"}</dd>
            </div>
          </dl>
        </section>

      </div>
    </div>
  );
}

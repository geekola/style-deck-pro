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

const CUSTOMER_TYPES: { value: string; label: string }[] = [
  { value: "celebrity", label: "Celebrity" },
  { value: "athlete", label: "Athlete" },
  { value: "influencer", label: "Influencer" },
  { value: "executive", label: "Executive" },
  { value: "creator", label: "Creator" },
  { value: "other", label: "Other" },
];

const INDUSTRIES: { value: string; label: string }[] = [
  { value: "film", label: "Film" },
  { value: "music", label: "Music" },
  { value: "sports", label: "Sports" },
  { value: "fashion", label: "Fashion" },
  { value: "business", label: "Business" },
  { value: "media", label: "Media" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

export default function AccountPage() {
  const { data: session, isPending } = useSession();

  // Profile (name)
  const [name, setName] = useState("");
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

  // Customer type / industry
  const [customerType, setCustomerType] = useState("");
  const [industry, setIndustry] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session?.user]);

  useEffect(() => {
    fetch("/api/account/customer-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.type) setCustomerType(data.type);
        if (data?.industry) setIndustry(data.industry);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, []);

  async function handleSaveName() {
    setNameSaving(true);
    setNameSaved(false);
    await updateUser({ name });
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
      callbackURL: "/app/account",
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

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    await fetch("/api/account/customer-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: customerType, industry }),
    });
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  if (isPending || !profileLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5">
        <Link
          href="/app/discover"
          className="text-sm text-gray-400 hover:text-black dark:hover:text-white"
        >
          &larr; Discover
        </Link>
        <h1 className="text-lg font-semibold mt-1 text-gray-900 dark:text-white">
          Account settings
        </h1>
      </div>

      <div className="px-5 py-6 space-y-8">
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

        {/* Profile */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving || !name.trim()}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                    nameSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  }`}
                >
                  {nameSaved ? "Saved &#10003;" : nameSaving ? "Saving..." : "Save"}
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

        {/* Customer type / industry */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Customer profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Customer type
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className={`w-full py-3 rounded-xl text-sm font-medium text-white transition-colors ${
                profileSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              }`}
            >
              {profileSaved ? "Saved &#10003;" : profileSaving ? "Saving..." : "Save profile"}
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

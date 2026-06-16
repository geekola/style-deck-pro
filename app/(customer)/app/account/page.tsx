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
import { COUNTRIES } from "@/components/country-select";

const CUSTOMER_TYPES: { value: string; label: string }[] = [
  { value: "actor", label: "Actor" },
  { value: "athlete", label: "Athlete" },
  { value: "influencer", label: "Influencer" },
  { value: "performer", label: "Performer" },
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

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type ContactForm = {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyContactForm: ContactForm = {
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";

export default function AccountPage() {
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

  // Customer type / industry
  const [customerType, setCustomerType] = useState("");
  const [industry, setIndustry] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Ship-to address
  type ShipToAddress = { line1: string; line2: string; city: string; state: string; postalCode: string; country: string };
  const emptyAddress: ShipToAddress = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };
  const [shipTo, setShipTo] = useState<ShipToAddress>(emptyAddress);
  const [shipToLoaded, setShipToLoaded] = useState(false);
  const [shipToSaving, setShipToSaving] = useState(false);
  const [shipToSaved, setShipToSaved] = useState(false);

  // Additional contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setFirstName(session.user.firstName ?? "");
      setLastName(session.user.lastName ?? "");
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

  useEffect(() => {
    fetch("/api/account/ship-to-address")
      .then((r) => r.json())
      .then((data) => {
        if (data) setShipTo({ line1: data.line1 ?? "", line2: data.line2 ?? "", city: data.city ?? "", state: data.state ?? "", postalCode: data.postalCode ?? "", country: data.country ?? "" });
        setShipToLoaded(true);
      })
      .catch(() => setShipToLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/customer/contacts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContacts(data);
        setContactsLoaded(true);
      })
      .catch(() => setContactsLoaded(true));
  }, []);

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

  async function handleSaveShipTo() {
    setShipToSaving(true);
    setShipToSaved(false);
    await fetch("/api/account/ship-to-address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipTo),
    });
    setShipToSaving(false);
    setShipToSaved(true);
    setTimeout(() => setShipToSaved(false), 2000);
  }

  function openAddContact() {
    setEditingContactId(null);
    setContactForm({ ...emptyContactForm });
    setContactError(null);
  }

  function openEditContact(c: Contact) {
    setEditingContactId(c.id);
    setContactForm({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      role: c.role ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      addressLine1: c.addressLine1 ?? "",
      addressLine2: c.addressLine2 ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      postalCode: c.postalCode ?? "",
      country: c.country ?? "",
    });
    setContactError(null);
  }

  function closeContactForm() {
    setContactForm(null);
    setEditingContactId(null);
    setContactError(null);
  }

  async function handleSaveContact() {
    if (!contactForm) return;
    if (!contactForm.firstName.trim()) {
      setContactError("First name is required.");
      return;
    }

    setContactSaving(true);
    setContactError(null);

    const url = editingContactId
      ? `/api/customer/contacts/${editingContactId}`
      : "/api/customer/contacts";
    const method = editingContactId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });

    setContactSaving(false);

    if (!res.ok) {
      setContactError("Could not save contact.");
      return;
    }

    const saved: Contact = await res.json();
    setContacts((prev) =>
      editingContactId ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
    );
    closeContactForm();
  }

  async function handleDeleteContact(id: string) {
    if (!confirm("Remove this contact?")) return;
    const res = await fetch(`/api/customer/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  }

  if (isPending || !profileLoaded || !shipToLoaded) {
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
              {profileSaved ? "Saved ✓" : profileSaving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </section>

        {/* Ship-to address */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Default shipping address
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Pre-filled at checkout for purchased items.
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 1</label>
              <input type="text" value={shipTo.line1} onChange={(e) => setShipTo({ ...shipTo, line1: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address line 2</label>
              <input type="text" value={shipTo.line2} onChange={(e) => setShipTo({ ...shipTo, line2: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input type="text" value={shipTo.city} onChange={(e) => setShipTo({ ...shipTo, city: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">State / Province</label>
                <input type="text" value={shipTo.state} onChange={(e) => setShipTo({ ...shipTo, state: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Postal code</label>
                <input type="text" value={shipTo.postalCode} onChange={(e) => setShipTo({ ...shipTo, postalCode: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select value={shipTo.country} onChange={(e) => setShipTo({ ...shipTo, country: e.target.value })} className={inputClass}>
                  <option value="">Select...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveShipTo}
              disabled={shipToSaving || !shipTo.line1.trim() || !shipTo.city.trim() || !shipTo.country}
              className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors mt-1 ${
                shipToSaved ? "bg-green-500" : "bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {shipToSaved ? "Saved ✓" : shipToSaving ? "Saving..." : "Save address"}
            </button>
          </div>
        </section>

        {/* Additional contacts */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
            Additional contacts
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Add an assistant, agent, or manager who can be reached on your behalf.
          </p>

          {!contactsLoaded ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-3">
              {contacts.length === 0 && !contactForm && (
                <p className="text-xs text-gray-400">No additional contacts yet.</p>
              )}

              {contacts.map((c) => (
                <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                      {c.role && <p className="text-xs text-gray-400 mt-0.5">{c.role}</p>}
                      {(c.email || c.phone) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {[c.email, c.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {(c.addressLine1 || c.city) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {[c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode, c.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs shrink-0">
                      <button
                        onClick={() => openEditContact(c)}
                        className="text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {contactForm ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        First name
                      </label>
                      <input
                        type="text"
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Last name
                      </label>
                      <input
                        type="text"
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Role (e.g. Assistant, Agent, Manager)
                      </label>
                      <input
                        type="text"
                        value={contactForm.role}
                        onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Address line 1
                      </label>
                      <input
                        type="text"
                        value={contactForm.addressLine1}
                        onChange={(e) => setContactForm({ ...contactForm, addressLine1: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Address line 2
                      </label>
                      <input
                        type="text"
                        value={contactForm.addressLine2}
                        onChange={(e) => setContactForm({ ...contactForm, addressLine2: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={contactForm.city}
                        onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        State / Province
                      </label>
                      <input
                        type="text"
                        value={contactForm.state}
                        onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Postal code
                      </label>
                      <input
                        type="text"
                        value={contactForm.postalCode}
                        onChange={(e) => setContactForm({ ...contactForm, postalCode: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Country
                      </label>
                      <select
                        value={contactForm.country}
                        onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">Select...</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {contactError && <p className="text-xs text-red-500">{contactError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveContact}
                      disabled={contactSaving}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {contactSaving ? "Saving..." : editingContactId ? "Save changes" : "Add contact"}
                    </button>
                    <button
                      onClick={closeContactForm}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openAddContact}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  + Add contact
                </button>
              )}
            </div>
          )}
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

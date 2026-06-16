"use client";

import { useEffect, useState, use } from "react";
import { signUp } from "@/lib/auth-client";

const CUSTOMER_TYPES = ["actor", "athlete", "influencer", "performer"] as const;
const INDUSTRIES = ["film", "music", "sports", "fashion", "business", "media", "technology", "other"] as const;

type InviteInfo = { email: string; valid: true } | { error: string };

export default function InviteRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<typeof CUSTOMER_TYPES[number]>("performer");
  const [industry, setIndustry] = useState<typeof INDUSTRIES[number]>("other");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  // Validate invite on mount
  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then(setInvite);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || "error" in invite) return;
    setLoading(true);
    setError(null);

    // Carry the invite details through to /api/auth/finalize, which is used
    // both as the normal post-login redirect and as the callback target after
    // email verification (see step 2 below).
    const finalizeUrl = `/api/auth/finalize?inviteToken=${encodeURIComponent(token)}&type=${type}&industry=${industry}`;

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    // 1. Create Better Auth account
    const result = await signUp.email({
      email: invite.email,
      password,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      callbackURL: finalizeUrl,
    } as Parameters<typeof signUp.email>[0]);

    if (result.error) {
      setError(result.error.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // With requireEmailVerification enabled, sign-up doesn't create a session
    // (result.data.token is null) -- the user must verify their email first.
    // /api/auth/verify-email will auto-sign them in and redirect to
    // finalizeUrl above, which completes the invite once a session exists.
    if (!result.data?.token) {
      setLoading(false);
      setCheckEmail(true);
      return;
    }

    // 2. Session already exists (email verification not required) -- complete
    // the invite now (creates customer record + grants brand access if applicable)
    const completeRes = await fetch("/api/auth/complete-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type, industry }),
    });

    if (!completeRes.ok) {
      const data = await completeRes.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong completing your registration.");
      setLoading(false);
      return;
    }

    // 3. Finalize: sets sd_role cookie + redirects to the right dashboard.
    // Use a full page navigation since /api/auth/finalize is a Route Handler
    // that issues a redirect -- router.push doesn't reliably follow it.
    window.location.href = "/api/auth/finalize";
  }

  // Loading state
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Validating invitation...
      </div>
    );
  }

  // Invalid invite
  if ("error" in invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-4xl mb-4">x</p>
          <h1 className="text-xl font-semibold mb-2">Invitation not valid</h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">{invite.error}</p>
        </div>
      </div>
    );
  }

  // Account created -- waiting on email verification before we can finish setup
  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm">
            We&apos;ve sent a verification link to <strong>{invite.email}</strong>. Click it to
            activate your account and finish setting up your profile.
          </p>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">StyleDeck</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">You've been invited. Create your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email locked to invite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={invite.email}
              disabled
              className="w-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                placeholder="First"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                placeholder="Last"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">I am a...</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white capitalize"
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as typeof industry)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white dark:text-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-black dark:text-white underline underline-offset-2">Sign in</a>
        </p>
      </div>
    </div>
  );
}

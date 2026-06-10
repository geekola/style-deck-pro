"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";

const CUSTOMER_TYPES = ["celebrity", "athlete", "influencer", "executive", "creator", "other"] as const;
const INDUSTRIES = ["film", "music", "sports", "fashion", "business", "media", "technology", "other"] as const;

type InviteInfo = { email: string; valid: true } | { error: string };

export default function InviteRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<typeof CUSTOMER_TYPES[number]>("other");
  const [industry, setIndustry] = useState<typeof INDUSTRIES[number]>("other");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // 1. Create Better Auth account
    const result = await signUp.email({
      email: invite.email,
      password,
      name,
      callbackURL: "/api/auth/finalize",
    });

    if (result.error) {
      setError(result.error.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Complete invite (creates customer record + grants brand access if applicable)
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

    // 3. Finalize: sets sd_role cookie + redirects to the right dashboard
    router.push("/api/auth/finalize");
  }

  // Loading state
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Validating invitation…
      </div>
    );
  }

  // Invalid invite
  if ("error" in invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-4xl mb-4">✕</p>
          <h1 className="text-xl font-semibold mb-2">Invitation not valid</h1>
          <p className="text-gray-500 text-sm">{invite.error}</p>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">StyleDeck</h1>
          <p className="text-gray-400 text-sm mt-2">You've been invited. Create your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email locked to invite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={invite.email}
              disabled
              className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a…</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black capitalize"
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as typeof industry)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
            className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-black underline underline-offset-2">Sign in</a>
        </p>
      </div>
    </div>
  );
}

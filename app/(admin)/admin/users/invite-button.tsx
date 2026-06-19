"use client";

import { useState } from "react";

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("idle");
    setErrorMsg(null);

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSending(false);

    if (res.ok) {
      setResult("sent");
      setEmail("");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Failed to send invite.");
      setResult("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setEmail("");
    setResult("idle");
    setErrorMsg(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black dark:bg-white dark:text-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Invite client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={handleClose} />
          <div className="relative bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Invite a client</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {result === "sent" ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">✓</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Invite sent</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                  The invitation link expires in 7 days.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResult("idle")}
                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    Send another
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 text-sm bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  They&apos;ll receive a link to create their StyleDeck account. The link expires in 7 days.
                </p>

                {result === "error" && (
                  <p className="text-xs text-red-600">{errorMsg}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 text-sm bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

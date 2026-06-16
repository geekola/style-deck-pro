import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { DevSwitcher } from "./dev-switcher";

// This page is intentionally outside all role-protected route groups.
// The switch-role API returns 403 in production, so buttons are non-functional there.
// Access is gated by the dev@styledeck.test email check below.

export default async function DevPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Only the dev switcher account can access this page
  if (session.user.email !== "dev@styledeck.test") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <DevSwitcher
        userId={session.user.id}
        currentRole={session.user.role as string}
        userName={session.user.name}
        userEmail={session.user.email}
      />
    </div>
  );
}

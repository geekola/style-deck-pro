import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { DevSwitcher } from "./dev-switcher";

// This page is intentionally outside all role-protected route groups.
// It is only useful in development — in production the switch-role API
// route throws at module load time, so buttons here will always fail.

export default async function DevPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  const session = await getSession();
  if (!session) {
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

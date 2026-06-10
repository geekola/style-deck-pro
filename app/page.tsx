import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "platform_admin") redirect("/admin");
  if (role === "brand_admin") redirect("/brand");
  if (role === "customer") redirect("/app/discover");

  redirect("/login");
}

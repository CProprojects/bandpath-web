import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!verifyAdminSessionValue(session)) {
    redirect("/admin/login");
  }
}

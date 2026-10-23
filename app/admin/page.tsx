import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveAdminIdentity } from "@/lib/admin/access";
import { AdminPanel } from "@/components/admin/admin-panel";
import { connection } from "next/server";
export const instant = false;

export const metadata = { title: "Админ-панель" };

export default async function AdminPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/");
  const resolved = await resolveAdminIdentity(session.user.id);
  if (!resolved.ok) redirect("/");
  return <AdminPanel isAdmin={resolved.identity.isAdmin} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/roles";

/**
 * URL dashboard lama (/dashboard/owner, /dashboard/kasir, /dashboard/capster, ...)
 * diarahkan ke halaman yang sesuai role. Route statis selalu menang atas
 * catch-all ini, jadi halaman baru tidak terpengaruh.
 */
export default async function LegacyDashboardRedirect() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) redirect("/login");
  redirect(homeFor(ctx.role));
}

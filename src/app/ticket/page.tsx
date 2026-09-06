import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/roles";
import { loginUrlWithRedirect } from "@/lib/auth/safe-redirect";

/** Cek kode publik dihapus — status booking hanya lewat akun member. */
export default async function TicketSearchPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) {
    redirect(loginUrlWithRedirect("/dashboard/customer/bookings"));
  }

  if (ctx.role === "customer") {
    redirect("/dashboard/customer/bookings");
  }

  redirect(homeFor(ctx.role));
}

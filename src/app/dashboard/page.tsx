import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/roles";

export default async function DashboardIndexPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) redirect("/login");
  redirect(homeFor(ctx.role));
}

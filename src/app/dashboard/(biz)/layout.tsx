import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/roles";
import DashboardShell from "@/components/DashboardShell";

/**
 * Shell untuk seluruh dashboard sisi bisnis (owner, admin, kasir, capster).
 * Pelanggan dialihkan ke dashboard-nya sendiri.
 */
export default async function BizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) redirect("/login");
  if (ctx.role === "customer") redirect(homeFor("customer"));

  return (
    <DashboardShell
      role={ctx.role}
      userName={ctx.name}
      userEmail={ctx.email}
      business={
        ctx.businessName && ctx.businessSlug
          ? { name: ctx.businessName, slug: ctx.businessSlug }
          : null
      }
    >
      {children}
    </DashboardShell>
  );
}

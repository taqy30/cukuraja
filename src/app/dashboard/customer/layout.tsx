import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/roles";
import CustomerDashboardShell from "@/components/CustomerDashboardShell";

export default async function CustomerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) redirect("/login");
  if (ctx.role !== "customer") redirect(homeFor(ctx.role));

  return (
    <CustomerDashboardShell userName={ctx.name} userEmail={ctx.email}>
      {children}
    </CustomerDashboardShell>
  );
}

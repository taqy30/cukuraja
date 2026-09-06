import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";

/** Gerbang pertama: harus login dan punya role yang dikenali. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) redirect("/login");

  return <>{children}</>;
}

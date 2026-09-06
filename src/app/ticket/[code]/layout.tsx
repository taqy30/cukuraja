import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { loginUrlWithRedirect } from "@/lib/auth/safe-redirect";

/** Tiket booking hanya untuk akun yang sudah login (member / staf). */
export default async function TicketCodeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx) {
    redirect(loginUrlWithRedirect(`/ticket/${code}`));
  }

  return <>{children}</>;
}

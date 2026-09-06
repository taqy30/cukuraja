"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEMO_ACCOUNTS, demoRoleTitle } from "@/lib/demo-accounts";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEMO_FILL_EVENT = "cukuraja:fill-demo";
export const DEMO_CREDENTIALS_KEY = "cukuraja:demo-credentials";

export type DemoCredentials = { email: string; password: string };

type Props = {
  className?: string;
  onUsed?: () => void;
};

/** Tombol cepat isi kredensial + arahkan ke login untuk tiap akun demo. */
export function DemoAccountButtons({ className, onUsed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const useAccount = useCallback(
    async (email: string, password: string) => {
      setBusyEmail(email);
      const creds: DemoCredentials = { email, password };
      try {
        sessionStorage.setItem(DEMO_CREDENTIALS_KEY, JSON.stringify(creds));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(DEMO_FILL_EVENT, { detail: creds }));

      if (pathname !== "/login") {
        router.push("/login");
      }
      onUsed?.();
      setBusyEmail(null);
    },
    [onUsed, pathname, router]
  );

  return (
    <div className={cn("grid gap-2", className)}>
      {DEMO_ACCOUNTS.map((account) => {
        const busy = busyEmail === account.email;
        return (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            disabled={!!busyEmail}
            onClick={() => useAccount(account.email, account.password)}
            className="h-auto w-full justify-between gap-3 rounded-lg border-border bg-background px-3 py-2.5 text-left hover:border-primary/35 hover:bg-secondary/50"
          >
            <span className="min-w-0 space-y-0.5">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {demoRoleTitle(account)}
                </span>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground uppercase">
                  {ROLE_LABEL[account.role]}
                </span>
              </span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {account.email}
              </span>
              <span className="block font-mono text-[11px] text-muted-foreground">
                pw: {account.password}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                "Gunakan"
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

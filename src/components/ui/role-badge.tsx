import { Crown, Scissors, ShieldCheck, User, Wallet } from "lucide-react";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const ROLE_STYLE: Record<AppRole, { icon: typeof Crown; className: string }> = {
  owner: { icon: Crown, className: "bg-primary/10 text-primary ring-primary/20" },
  admin: {
    icon: ShieldCheck,
    className:
      "bg-[var(--status-called-bg)] text-[var(--status-called)] ring-[var(--status-called)]/20",
  },
  kasir: { icon: Wallet, className: "bg-accent/10 text-accent ring-accent/20" },
  capster: {
    icon: Scissors,
    className:
      "bg-[var(--status-serving-bg)] text-[var(--status-serving)] ring-[var(--status-serving)]/20",
  },
  customer: { icon: User, className: "bg-muted text-muted-foreground ring-border" },
};

export function RoleBadge({
  role,
  className,
  showIcon = true,
}: {
  role: AppRole;
  className?: string;
  showIcon?: boolean;
}) {
  const style = ROLE_STYLE[role];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        style.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {ROLE_LABEL[role]}
    </span>
  );
}

import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; token: string }> = {
  booked: { label: "Dibooking", token: "booked" },
  checked_in: { label: "Check-in", token: "checked-in" },
  waiting: { label: "Menunggu", token: "waiting" },
  called: { label: "Dipanggil", token: "called" },
  serving: { label: "Dilayani", token: "serving" },
  completed: { label: "Selesai", token: "completed" },
  skipped: { label: "Dilewati", token: "skipped" },
  cancelled: { label: "Dibatalkan", token: "cancelled" },
};

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? { label: status, token: "booked" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `var(--status-${meta.token}-bg)`,
        color: `var(--status-${meta.token})`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "currentColor" }}
      />
      {meta.label}
    </span>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  Pencil,
  Phone,
  Play,
  Scissors,
  SkipForward,
  StickyNote,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { transitionSoft } from "@/components/motion";
import { cn } from "@/lib/utils";

export interface QueueBooking {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_time: string;
  booking_date?: string;
  status: string;
  source: string;
  note?: string | null;
  service_id?: string | null;
  service?: { id?: string; name: string; duration_minutes?: number } | null;
  capster?: { id: string; name: string } | null;
}

interface ActionDef {
  status: string;
  label: string;
  icon: typeof LogIn;
  variant?: "default" | "outline" | "secondary";
}

/** Aksi lanjutan per status — cocok dengan transisi yang diizinkan API. */
const NEXT_ACTIONS: Record<string, ActionDef[]> = {
  booked: [{ status: "checked_in", label: "Check-in", icon: LogIn }],
  checked_in: [{ status: "called", label: "Panggil", icon: BellRing }],
  waiting: [{ status: "called", label: "Panggil", icon: BellRing }],
  called: [
    { status: "serving", label: "Mulai", icon: Play },
    { status: "skipped", label: "Lewati", icon: SkipForward, variant: "outline" },
  ],
  serving: [{ status: "completed", label: "Selesai", icon: CheckCircle2 }],
};

const CANCELLABLE = ["booked", "checked_in", "waiting", "called"];

interface Props {
  bookings: QueueBooking[];
  updating: string | null;
  onStatusChange: (id: string, status: string) => void;
  onEdit?: (booking: QueueBooking) => void;
  onDelete?: (id: string) => void;
  showCapster?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function BookingQueue({
  bookings,
  updating,
  onStatusChange,
  onEdit,
  onDelete,
  showCapster = true,
  emptyTitle = "Belum ada booking",
  emptyDescription = "Booking yang masuk akan muncul di sini secara otomatis.",
}: Props) {
  if (bookings.length === 0) {
    return <EmptyState icon={Clock} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {bookings.map((booking) => {
          const isUpdating = updating === booking.id;
          const actions = NEXT_ACTIONS[booking.status] ?? [];

          return (
            <motion.article
              key={booking.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transitionSoft}
              className={cn(
                "surface-card surface-card-hover p-4 sm:p-5",
                isUpdating && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground">
                  {booking.booking_code}
                </span>
                <StatusBadge status={booking.status} />
                {booking.source === "walk_in" && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    Walk-in
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {String(booking.booking_time).slice(0, 5)}
                </span>
              </div>

              <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {booking.customer_name}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  {booking.customer_phone}
                </p>
                {booking.service?.name && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Scissors className="h-4 w-4 shrink-0" aria-hidden />
                    {booking.service.name}
                    {booking.service.duration_minutes
                      ? ` · ${booking.service.duration_minutes} menit`
                      : ""}
                  </p>
                )}
                {showCapster && booking.capster?.name && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Scissors className="h-4 w-4 shrink-0" aria-hidden />
                    Capster: {booking.capster.name}
                  </p>
                )}
              </div>

              {booking.note && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {booking.note}
                </p>
              )}

              {(actions.length > 0 || onEdit || onDelete) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {isUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                  )}

                  {actions.map((action) => (
                    <Button
                      key={action.status}
                      type="button"
                      size="sm"
                      variant={action.variant ?? "default"}
                      disabled={isUpdating}
                      onClick={() => onStatusChange(booking.id, action.status)}
                    >
                      <action.icon className="mr-1.5 h-4 w-4" aria-hidden />
                      {action.label}
                    </Button>
                  ))}

                  {CANCELLABLE.includes(booking.status) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isUpdating}
                      onClick={() => onStatusChange(booking.id, "cancelled")}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
                      Batalkan
                    </Button>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    {onEdit && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Ubah booking ${booking.booking_code}`}
                        onClick={() => onEdit(booking)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Hapus booking ${booking.booking_code}`}
                        onClick={() => onDelete(booking.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

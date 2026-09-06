"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_SOFT } from "@/components/motion";

const ROWS = [
  { code: "B-014", name: "Rangga Pratama", service: "Haircut + Wash", time: "14:00", status: "Dilayani" },
  { code: "W-006", name: "Dimas Putra", service: "Haircut", time: "14:20", status: "Dipanggil" },
  { code: "B-015", name: "Fajar Nugroho", service: "Beard Trim", time: "14:40", status: "Check-in" },
  { code: "B-016", name: "Yoga Saputra", service: "Haircut", time: "15:00", status: "Terjadwal" },
] as const;

export default function HeroQueuePreview() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="w-full max-w-[460px]"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_SOFT, delay: 0.1 }}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft-lg)]">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Antrean hari ini</p>
            <p className="text-xs text-muted-foreground">Pratinjau tampilan kasir</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Hari ini</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Kode</th>
                <th className="px-3 py-2.5 font-medium">Pelanggan</th>
                <th className="px-3 py-2.5 font-medium">Jam</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.code} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">
                    {row.code}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.service}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                    {row.time}
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-foreground">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

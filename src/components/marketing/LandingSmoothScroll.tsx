"use client";

import { useEffect } from "react";
import { smoothScrollTo, smoothScrollToHash } from "@/lib/smooth-scroll";

/**
 * - Scroll padding untuk navbar fixed
 * - Klik `a[href^="#"]` → scroll halus (tanpa teleport)
 * - Tidak mengaktifkan CSS scroll-smooth global (agar scrub parallax tetap responsif)
 */
export default function LandingSmoothScroll() {
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollPaddingTop = "4.5rem";
    html.classList.remove("scroll-smooth");

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.(
        'a[href^="#"], a[href="/"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Logo / home: kalau sudah di landing, scroll halus ke atas (bukan teleport).
      if (href === "/" || href === "/#") {
        if (window.location.pathname !== "/") return;
        event.preventDefault();
        smoothScrollTo(0, { offset: 0 });
        if (history.replaceState) {
          history.replaceState(null, "", "/");
        }
        return;
      }

      if (!href.startsWith("#") || href === "#") return;

      const ok = smoothScrollToHash(href);
      if (!ok) return;

      event.preventDefault();
      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    };

    // Capture phase supaya menang sebelum Next.js Link navigasi.
    document.addEventListener("click", onClick, true);

    // Hash awal (mis. /#layanan) — scroll halus setelah paint
    if (window.location.hash) {
      const hash = window.location.hash;
      requestAnimationFrame(() => {
        smoothScrollToHash(hash);
      });
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      html.style.scrollPaddingTop = "";
    };
  }, []);

  return null;
}

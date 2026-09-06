/** Easing lembut untuk navigasi anchor (bukan CSS scroll-smooth global). */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scroll halus ke elemen / posisi Y.
 * Dipakai hanya untuk klik anchor — wheel/touch tetap native biar parallax responsif.
 */
export function smoothScrollTo(
  target: Element | number,
  options?: { offset?: number; durationMs?: number }
) {
  if (typeof window === "undefined") return;

  const offset = options?.offset ?? 72;
  const top =
    typeof target === "number"
      ? target
      : target.getBoundingClientRect().top + window.scrollY - offset;

  if (prefersReducedMotion()) {
    window.scrollTo(0, top);
    return;
  }

  const start = window.scrollY;
  const distance = top - start;
  if (Math.abs(distance) < 2) return;

  const duration = Math.min(
    Math.max(options?.durationMs ?? Math.abs(distance) * 0.5, 700),
    1800
  );

  let startTime: number | null = null;
  let raf = 0;

  const step = (now: number) => {
    if (startTime == null) startTime = now;
    const t = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, start + distance * easeInOutCubic(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
}

export function smoothScrollToHash(hash: string, options?: { offset?: number }) {
  if (!hash || hash === "#") return false;
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const el = document.getElementById(id);
  if (!el) return false;
  smoothScrollTo(el, options);
  return true;
}

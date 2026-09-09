"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";

type Props = {
  children: React.ReactNode;
};

/** Sequence gunting 10s@30fps → 303 WebP. Desktop scrub; mobile pakai 1 frame (performa). */
const FRAME_START = 1;
const FRAME_END = 303;
const FRAME_PAD = 3;
const LOAD_CONCURRENCY = 4;
const FIRST_SRC = `/videos/scissors-frames/${String(FRAME_START).padStart(FRAME_PAD, "0")}.webp`;

function frameSrc(fileNumber: number) {
  return `/videos/scissors-frames/${String(fileNumber).padStart(FRAME_PAD, "0")}.webp`;
}

function buildFrameNumbers(step: number) {
  const list: number[] = [];
  for (let n = FRAME_START; n <= FRAME_END; n += step) list.push(n);
  if (list[list.length - 1] !== FRAME_END) list.push(FRAME_END);
  return list;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

/**
 * Hero sticky + scrub frame WebP (desktop).
 * Mobile / reduced-motion: satu gambar statis — LCP & network jauh lebih ringan.
 */
export default function HeroParallaxVideo({ children }: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const [mode, setMode] = useState<"static" | "scrub" | null>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (reduced || mobile) {
      setMode("static");
      return;
    }

    let cancelled = false;
    let restStarted = false;
    let timeoutId = 0;
    let idleId: number | null = null;
    const loaded: HTMLImageElement[] = [];
    const numbers = buildFrameNumbers(2);

    const stopKick = () => {
      window.removeEventListener("scroll", onScrollKick);
      window.clearTimeout(timeoutId);
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };

    const loadRest = async () => {
      for (let i = 1; i < numbers.length; i += LOAD_CONCURRENCY) {
        if (cancelled) return;
        const batch = numbers.slice(i, i + LOAD_CONCURRENCY);
        const imgs = await Promise.all(batch.map((n) => loadImage(frameSrc(n))));
        if (cancelled) return;
        loaded.push(...imgs);
        framesRef.current = loaded.slice();
      }
    };

    const startRest = () => {
      if (restStarted || cancelled) return;
      restStarted = true;
      stopKick();
      void loadRest();
    };

    const onScrollKick = () => {
      if (window.scrollY > 24) startRest();
    };

    void (async () => {
      const first = await loadImage(FIRST_SRC);
      if (cancelled) return;
      loaded.push(first);
      framesRef.current = [first];
      setMode("scrub");

      window.addEventListener("scroll", onScrollKick, { passive: true });
      idleId =
        "requestIdleCallback" in window
          ? window.requestIdleCallback(startRest, { timeout: 4000 })
          : null;
      timeoutId = window.setTimeout(startRest, 3000);
    })();

    return () => {
      cancelled = true;
      stopKick();
    };
  }, [reduced]);

  useEffect(() => {
    if (mode !== "scrub") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const draw = (index: number) => {
      const frames = framesRef.current;
      if (!frames.length) return;
      const img = frames[Math.min(Math.max(index, 0), frames.length - 1)];
      if (!img?.complete || !img.naturalWidth) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const scale =
        Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight) * 1.05;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
    };

    const apply = () => {
      rafRef.current = 0;
      const max = Math.max(framesRef.current.length - 1, 0);
      const p = Math.min(Math.max(progressRef.current, 0), 1);
      draw(Math.round(p * max));
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(apply);
    };

    const unsub = scrollYProgress.on("change", (v) => {
      progressRef.current = v;
      schedule();
    });

    progressRef.current = scrollYProgress.get();
    apply();

    const onScroll = () => {
      progressRef.current = scrollYProgress.get();
      schedule();
    };
    const onResize = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      unsub();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, scrollYProgress]);

  return (
    <section
      ref={containerRef}
      className={
        mode === "scrub" ? "relative h-[620svh]" : "relative min-h-[100svh] md:h-[620svh]"
      }
    >
      <div className="sticky top-0 flex h-[100svh] max-h-[100dvh] flex-col justify-center overflow-y-auto overflow-x-hidden pb-10 pt-24 sm:justify-end sm:pb-24 sm:pt-32 lg:justify-center lg:pb-28 lg:pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0a]"
        >
          {mode === "scrub" ? (
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={FIRST_SRC}
              alt=""
              fetchPriority="high"
              decoding="async"
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full scale-105 object-cover"
            />
          )}

          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-x-0 top-0 h-32 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-black/50" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </section>
  );
}

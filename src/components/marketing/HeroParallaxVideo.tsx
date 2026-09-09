"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";

type Props = {
  children: React.ReactNode;
};

/** Sequence gunting 10s@30fps → 303 WebP. Scrub desktop on-demand; mobile 1 frame. */
const FRAME_START = 1;
const FRAME_END = 303;
const FRAME_PAD = 3;
const LOAD_CONCURRENCY = 4;
const FRAME_STEP = 3;
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
 * Hero sticky + scrub WebP.
 * - Mobile / reduced-motion: gambar statis (desain sama, tanpa beban scrub)
 * - Desktop: scrub hanya setelah user scroll (aman untuk PageSpeed, efek tetap ada)
 */
export default function HeroParallaxVideo({ children }: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const [scrubActive, setScrubActive] = useState(false);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    if (reduced) return;

    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (mobile) return;

    let cancelled = false;
    let started = false;

    const loadSequence = async () => {
      if (started || cancelled) return;
      started = true;

      const numbers = buildFrameNumbers(FRAME_STEP);
      const loaded: HTMLImageElement[] = [];

      const first = await loadImage(FIRST_SRC);
      if (cancelled) return;
      loaded.push(first);
      framesRef.current = [first];
      setScrubActive(true);

      for (let i = 1; i < numbers.length; i += LOAD_CONCURRENCY) {
        if (cancelled) return;
        const batch = numbers.slice(i, i + LOAD_CONCURRENCY);
        const imgs = await Promise.all(batch.map((n) => loadImage(frameSrc(n))));
        if (cancelled) return;
        loaded.push(...imgs);
        framesRef.current = loaded.slice();
      }
    };

    const onScroll = () => {
      if (window.scrollY > 12) {
        window.removeEventListener("scroll", onScroll);
        void loadSequence();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  useEffect(() => {
    if (!scrubActive) return;

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
  }, [scrubActive, scrollYProgress]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100svh] md:h-[620svh]"
    >
      <div className="sticky top-0 flex h-[100svh] max-h-[100dvh] flex-col justify-center overflow-y-auto overflow-x-hidden pb-10 pt-24 sm:justify-end sm:pb-24 sm:pt-32 lg:justify-center lg:pb-28 lg:pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0a]"
        >
          {/* Poster LCP selalu ada; canvas overlay saat scrub aktif */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FIRST_SRC}
            alt=""
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
            className={`absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-300 ${
              scrubActive ? "opacity-0" : "opacity-100"
            }`}
          />
          {scrubActive && (
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
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

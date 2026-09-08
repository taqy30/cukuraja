"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

type Props = {
  children: React.ReactNode;
};

/** Sequence gunting dari video 10s@30fps → 303 WebP (~2MB total). */
const FRAME_START = 1;
const FRAME_END = 303;
const FRAME_COUNT = FRAME_END - FRAME_START + 1;
const FRAME_PAD = 3;

function frameSrc(fileNumber: number) {
  return `/videos/scissors-frames/${String(fileNumber).padStart(FRAME_PAD, "0")}.webp`;
}

function fileNumberAtIndex(index0: number) {
  return FRAME_START + index0;
}

/**
 * Hero sticky + scrub frame WebP: scroll turun = maju, naik = mundur.
 */
export default function HeroParallaxVideo({ children }: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const progressRef = useRef(0);
  const frameRef = useRef(-1);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const contentOpacity = useTransform(scrollYProgress, [0, 0.9, 1], [1, 1, 0.72]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -36]);

  useEffect(() => {
    let cancelled = false;
    let booted = false;
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);
    let loaded = 0;

    const markReady = () => {
      if (cancelled) return;
      imagesRef.current = images;
      if (!booted && loaded >= Math.min(12, FRAME_COUNT)) {
        booted = true;
        setReady(true);
      }
    };

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(fileNumberAtIndex(i));
      img.onload = () => {
        loaded += 1;
        markReady();
      };
      img.onerror = () => {
        loaded += 1;
        markReady();
      };
      images[i] = img;
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const draw = (index: number) => {
      let img = imagesRef.current[index];
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let d = 1; d < 8; d++) {
          const a = imagesRef.current[index - d];
          const b = imagesRef.current[index + d];
          if (a?.complete && a.naturalWidth) {
            img = a;
            break;
          }
          if (b?.complete && b.naturalWidth) {
            img = b;
            break;
          }
        }
      }
      if (!img || !img.complete || img.naturalWidth === 0) return;

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
      const dx = (targetW - dw) / 2;
      const dy = (targetH - dh) / 2;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const apply = () => {
      rafRef.current = 0;
      const max = FRAME_COUNT - 1;
      const p = Math.min(Math.max(progressRef.current, 0), 1);
      const next = reduced ? 0 : Math.round(p * max);
      frameRef.current = next;
      draw(next);
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(apply);
    };

    const unsub = scrollYProgress.on("change", (v) => {
      progressRef.current = v;
      if (!reduced) schedule();
    });

    progressRef.current = scrollYProgress.get();
    apply();

    const onScroll = () => {
      progressRef.current = scrollYProgress.get();
      if (!reduced) schedule();
    };
    const onResize = () => {
      frameRef.current = -1;
      schedule();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      unsub();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, reduced, scrollYProgress]);

  return (
    <section ref={containerRef} className="relative h-[620svh]">
      <div className="sticky top-0 flex h-[100svh] max-h-[100dvh] flex-col justify-center overflow-y-auto overflow-x-hidden pb-10 pt-24 sm:justify-end sm:pb-24 sm:pt-32 lg:justify-center lg:pb-28 lg:pt-36">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0a]">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {!ready && (
            <img
              src={frameSrc(FRAME_START)}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover"
            />
          )}

          {/* Overlay netral — baca teks, tanpa glow warna */}
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-x-0 top-0 h-32 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-black/50" />
        </div>

        <motion.div
          style={reduced ? undefined : { opacity: contentOpacity, y: contentY }}
          className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

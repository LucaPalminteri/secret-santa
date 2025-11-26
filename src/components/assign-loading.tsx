"use client";

import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  open: boolean;
  messages?: string[];
  fullScreen?: boolean;
  status: Status;
  duration?: number;
  onDone?: () => void;
};

export default function AssignLoading({ open, messages = [], fullScreen = false, status = "loading", duration = 3000, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState<number>(0);
  const progressRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [finalVisible, setFinalVisible] = useState(false);
  const [finalStatus, setFinalStatus] = useState<Status | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (!open || status !== "loading") return;
    setIdx(0);
    const t = setInterval(() => setIdx((i) => (i + 1) % Math.max(1, messages.length)), 1600);
    return () => clearInterval(t);
  }, [open, messages.length, status]);

  useEffect(() => {
    if (!open || status !== "loading") return;
    // animate progress from 0 -> 100 over `duration` ms
    const total = duration && duration > 0 ? duration : 3000;
    setProgress(0);
    progressRef.current = 0;

    const start = Date.now();
    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      progressRef.current = pct;
      setProgress(pct);
      if (pct >= 100 && tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }, 100);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [open, status, duration]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefersReducedMotion(!!(mq && mq.matches));
    handler();
    if (mq && mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq && mq.addListener) mq.addListener(handler);
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq && mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  // handle transitions: when status moves from loading -> success/error, animate
  useEffect(() => {
    if (!open) return;
    if (status === "loading") {
      // show loading
      setFinalVisible(false);
      setFinalStatus(null);
      setTransitioning(false);
      return;
    }

    // status is success or error: start leave animation then show final
    setTransitioning(true);
    // after short delay, show final content with enter animation
    const t = window.setTimeout(() => {
      setTransitioning(false);
      setFinalStatus(status);
      setFinalVisible(true);
    }, 320);

    return () => window.clearTimeout(t);
  }, [status, open]);

  if (!open) return null;

  const LoadingView = (
    <div className="p-6 text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center animate-pulse">
          <Gift className="h-8 w-8" />
        </div>
      </div>

      <div className="text-2xl font-extrabold mb-2">Asignando</div>
      <div className="text-sm text-muted-foreground h-6 flex items-center justify-center mb-4" role="status" aria-live="polite">
        <div
          key={idx}
          className={"msg-fade"}
          style={prefersReducedMotion ? undefined : { animation: `msgFadeIn 420ms cubic-bezier(0.22, 0.9, 0.36, 1) both` }}
        >
          {messages.length ? messages[idx] : "Preparando los sorteos..."}
        </div>
      </div>

      <div className="mt-4">
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="bg-red-600 h-2 rounded-full"
            style={{
              width: `${progress}%`,
              transition: prefersReducedMotion ? undefined : `width 120ms linear`,
            }}
          />
        </div>
      </div>
    </div>
  );

  const SuccessView = (
    <div className="p-6 text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
          <Gift className="h-8 w-8" />
        </div>
      </div>

      <div className="text-2xl font-extrabold mb-2">¡Asignación completada!</div>
      <div className="text-sm text-muted-foreground mb-4">Se enviaron los correos. Revisa la bandeja de entrada.</div>

      <div className="mt-4 flex justify-center">
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md" onClick={() => onDone && onDone()}>
          Listo
        </button>
      </div>
    </div>
  );

  const ErrorView = (
    <div className="p-6 text-center">
      <div className="text-2xl font-extrabold mb-2 text-red-600">Error</div>
      <div className="text-sm text-muted-foreground mb-4">Hubo un problema al realizar la asignación. Intenta nuevamente.</div>
      <div className="mt-4 flex justify-center gap-2">
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md" onClick={() => onDone && onDone()}>
          Cerrar
        </button>
      </div>
    </div>
  );

  // Layered render: keep loading in DOM while transitioning out, then show final (success/error)
  // hide loading view while transitioning out or when final is visible
  const loadingStyle: React.CSSProperties = prefersReducedMotion
    ? { opacity: finalVisible ? 0 : 1 }
    : {
        transition: "opacity 300ms ease, transform 300ms ease",
        opacity: transitioning || finalVisible ? 0 : 1,
        transform: transitioning || finalVisible ? "scale(0.95) translateY(6px)" : "scale(1) translateY(0)",
        pointerEvents: transitioning || finalVisible ? "none" : "auto",
      };

  const finalStyle: React.CSSProperties = prefersReducedMotion
    ? { opacity: finalVisible ? 1 : 0 }
    : {
        transition: "opacity 320ms ease, transform 320ms ease",
        opacity: finalVisible ? 1 : 0,
        transform: finalVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(6px)",
      };

  const layered = (
    <div className="relative w-full max-w-xl text-center">
      <div style={loadingStyle} aria-hidden={finalVisible}>
        {LoadingView}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: finalVisible ? "auto" : "none",
        }}
      >
        <div style={finalStyle}>{finalStatus === "success" ? SuccessView : ErrorView}</div>
      </div>
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-dvh bg-gradient-to-b from-red-50 to-green-50 p-6 flex items-center justify-center">{layered}</div>;
  }

  // Overlay/modal variant (minimal)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-lg text-center">{layered}</div>
    </div>
  );
}

/*
  Notes:
  - Minimalist festive loading overlay.
  - Cycles messages provided via `messages` prop every ~1.6s.
  - Uses a simple pseudo-progress bar animation. For production, replace animation utility with CSS keyframes or Tailwind plugin.
*/

import { AnimatePresence, motion } from "framer-motion";
import { Award, CircleCheck, Info, X } from "lucide-react";
import React from "react";

function ToastIcon({ variant }) {
  if (variant === "badge") return <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />;
  if (variant === "success") return <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />;
  return <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />;
}

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-md flex-col gap-3 p-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 48, scale: 0.94, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 32, scale: 0.96, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl ${
              t.variant === "badge"
                ? "border-amber-400/35 bg-gradient-to-br from-amber-950/95 to-slate-950/95 text-amber-50 ring-1 ring-amber-500/20"
                : t.variant === "success"
                  ? "border-emerald-400/35 bg-gradient-to-br from-emerald-950/95 to-slate-950/95 text-emerald-50 ring-1 ring-emerald-500/20"
                  : "border-cyan-400/25 bg-slate-900/95 text-slate-100 ring-1 ring-cyan-500/15"
            }`}
          >
            <ToastIcon variant={t.variant} />
            <p className="flex-1 pt-0.5 text-sm font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

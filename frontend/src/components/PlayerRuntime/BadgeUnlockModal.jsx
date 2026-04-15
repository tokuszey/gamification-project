import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Award, X } from "lucide-react";
import React, { useEffect } from "react";

export default function BadgeUnlockModal({ badges, onClose }) {
  const open = Boolean(badges && badges.length);

  useEffect(() => {
    if (!open) return;
    confetti({
      particleCount: 110,
      spread: 72,
      origin: { y: 0.45 },
      colors: ["#22d3ee", "#34d399", "#6ee7b7", "#fbbf24", "#a5f3fc", "#d946ef"],
    });
    const t = setTimeout(() => onClose?.(), 2800);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-unlock-title"
          onClick={() => onClose?.()}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative max-w-md overflow-hidden rounded-3xl border border-cyan-400/35 bg-gradient-to-b from-cyan-950/90 via-slate-950 to-emerald-950/50 p-8 text-center shadow-[0_0_60px_-8px_rgba(34,211,238,0.35),0_25px_50px_rgba(0,0,0,0.6)] ring-2 ring-emerald-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-cyan-200/50 hover:bg-white/10 hover:text-white"
              aria-label="Close"
              onClick={() => onClose?.()}
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-600 text-4xl shadow-[0_0_32px_rgba(52,211,153,0.45)]"
            >
              <Award className="h-10 w-10 text-slate-950" />
            </motion.div>
            <h2 id="badge-unlock-title" className="font-display text-2xl font-bold text-cyan-100">
              Badge unlocked
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/85">
              {(badges || []).map((b) => b.replace(/_/g, " ")).join(" · ")}
            </p>
            <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-500/55">
              Achievement sync · local runtime
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

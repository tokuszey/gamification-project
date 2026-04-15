import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";

/**
 * Fixed-position floating +XP label (viewport coords from click).
 */
export default function FloatingXpBurst({ burst, onComplete }) {
  useEffect(() => {
    if (!burst) return undefined;
    const t = setTimeout(() => onComplete?.(), 900);
    return () => clearTimeout(t);
  }, [burst, onComplete]);

  return (
    <AnimatePresence>
      {burst ? (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0, y: 14, scale: 0.75, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: -64, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -96, scale: 0.88, filter: "blur(2px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed z-[200] -translate-x-1/2 bg-gradient-to-b from-cyan-100 via-emerald-300 to-cyan-400 bg-clip-text font-display text-xl font-black tabular-nums tracking-tight text-transparent"
          style={{
            left: burst.x,
            top: burst.y,
            filter: "drop-shadow(0 0 10px rgba(52,211,153,0.85)) drop-shadow(0 0 22px rgba(34,211,238,0.45))",
          }}
        >
          +{burst.amount} XP
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

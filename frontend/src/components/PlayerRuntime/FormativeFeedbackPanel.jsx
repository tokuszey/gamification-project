import { Lightbulb, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

/**
 * spec.formative_quiz_flow — anlık açıklayıcı geri bildirim + azalan kazanım notu.
 */
export default function FormativeFeedbackPanel({ open, onClose, title, body, diminishingNote, retryHint }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            left: 24,
            zIndex: 140,
            maxWidth: 420,
            marginLeft: "auto",
            borderRadius: 18,
            border: "1px solid rgba(56,189,248,0.35)",
            background: "linear-gradient(165deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
            boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            padding: "16px 18px 18px",
          }}
          role="dialog"
          aria-label="Feedback"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(51,65,85,0.8)",
              background: "rgba(15,23,42,0.9)",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingRight: 28 }}>
            <div
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(56,189,248,0.15)",
                border: "1px solid rgba(56,189,248,0.3)",
              }}
            >
              <Lightbulb className="h-5 w-5" style={{ color: "#7dd3fc" }} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>{title}</div>
              {body ? (
                <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.55, color: "#cbd5e1" }}>{body}</p>
              ) : null}
              {diminishingNote ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.5, color: "#fca5a5", fontWeight: 600 }}>{diminishingNote}</p>
              ) : null}
              {retryHint ? (
                <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: "#94a3b8" }}>{retryHint}</p>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

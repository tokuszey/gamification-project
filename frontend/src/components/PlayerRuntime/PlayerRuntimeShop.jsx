import { ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

const CATALOG = [
  { id: "title_senior_guard", label: 'Title: "Senior Guard"', kind: "title", cost: 120, blurb: "Section 8 — visible badge / title" },
  { id: "item_neon_frame", label: "Neon frame (UI)", kind: "cosmetic", cost: 80, blurb: "Virtual item — profile accent" },
  { id: "item_gold_boost", label: "One-time +25 Gold", kind: "consumable", cost: 60, blurb: "Virtual economy — quick boost" },
];

const iconTile = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(245,158,11,0.3)",
  background: "rgba(245,158,11,0.1)",
};

export default function PlayerRuntimeShop({ virtualCurrency, ownedIds, onPurchase }) {
  const owned = new Set(ownedIds || []);

  return (
    <section id="player-shop" className="gf-pr-card gf-pr-scroll-mt" style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          background: "linear-gradient(135deg, rgba(245,158,11,0.06), transparent 55%, rgba(37,99,235,0.05))",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconTile}>
          <ShoppingBag className="h-5 w-5" style={{ color: "#fcd34d" }} strokeWidth={2} />
        </div>
        <div>
          <h2 className="gf-pr-card-title" style={{ fontSize: 18 }}>
            Inventory &amp; shop
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" }}>
            Section 8 · Balance:{" "}
            <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#fde68a" }}>{virtualCurrency}</span> Gold
          </p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {CATALOG.map((it, i) => {
          const has = owned.has(it.id);
          const canAfford = virtualCurrency >= it.cost;
          return (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                borderRadius: 16,
                border: has ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(148,163,184,0.12)",
                background: has ? "rgba(22,163,74,0.08)" : "rgba(15,23,42,0.65)",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b" }}>
                {it.kind}
              </div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{it.label}</div>
              <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.55, color: "#94a3b8" }}>{it.blurb}</p>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#fde68a" }}>
                  {it.cost} Gold
                </span>
                <button
                  type="button"
                  disabled={has || !canAfford}
                  onClick={() => onPurchase(it.id, it.cost)}
                  className="gf-pr-btn-primary"
                  style={{
                    padding: "8px 14px",
                    fontSize: 11,
                    opacity: has || !canAfford ? 0.45 : 1,
                    cursor: has || !canAfford ? "not-allowed" : "pointer",
                  }}
                >
                  {has ? "Owned" : "Buy"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p style={{ position: "relative", zIndex: 1, margin: "18px 0 0", fontSize: 12, lineHeight: 1.55, color: "#64748b" }}>
        Sample storefront — economy rules come from the spec. Purchases deduct from your Gold balance.
      </p>
    </section>
  );
}

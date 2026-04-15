import {
  Bell,
  ChevronLeft,
  Home,
  LayoutDashboard,
  Medal,
  PencilLine,
  Settings,
  Target,
  Trophy,
} from "lucide-react";
import React, { useCallback, useState } from "react";

const NAV = [
  { id: "player-header", icon: LayoutDashboard, label: "Overview" },
  { id: "player-quests", icon: Target, label: "Quests" },
  { id: "player-badges", icon: Medal, label: "Badges" },
  { id: "player-leaderboard", icon: Trophy, label: "Leaderboard" },
  { id: "player-shop", icon: Settings, label: "Shop" },
];

export default function PlayerRuntimeShell({ children, onGoHome, onLeave, specTitle, topProfile, onEditProfile }) {
  const [active, setActive] = useState("player-header");

  const scrollTo = useCallback((sectionId) => {
    setActive(sectionId);
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="gf-pr-shell">
      <aside className="gf-pr-rail" aria-label="Player runtime navigation">
        <button
          type="button"
          title="Home"
          onClick={() => onGoHome?.()}
          className="gf-pr-rail-btn gf-pr-rail-home"
        >
          <Home className="h-5 w-5" strokeWidth={2} />
        </button>
        {NAV.map((n) => {
          const Icon = n.icon;
          const on = active === n.id;
          return (
            <button
              key={n.id}
              type="button"
              title={n.label}
              onClick={() => scrollTo(n.id)}
              className={`gf-pr-rail-btn ${on ? "gf-pr-rail-btn-active" : ""}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </button>
          );
        })}
      </aside>

      <div className="gf-pr-main">
        {topProfile ? <div className="gf-pr-profile-strip">{topProfile}</div> : null}
        <header className="gf-pr-topbar">
          <div style={{ minWidth: 0 }}>
            <div className="gf-pr-brand">MISSION CONTROL</div>
            {specTitle ? (
              <div className="gf-pr-brand-sub" title={specTitle}>
                {specTitle}
              </div>
            ) : (
              <div className="gf-pr-brand-sub" style={{ opacity: 0.65 }}>
                Tactical runtime
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 8 }}>
            {typeof onEditProfile === "function" ? (
              <button
                type="button"
                title="Edit profile"
                aria-label="Edit profile"
                onClick={() => onEditProfile()}
                className="gf-pr-icon-btn"
                style={{ color: "#93c5fd" }}
              >
                <PencilLine className="h-4 w-4" strokeWidth={2.25} />
              </button>
            ) : null}
            <button type="button" title="Bildirimler" className="gf-pr-icon-btn">
              <Bell className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Leave player view (account session stays signed in)"
              onClick={() => onLeave?.()}
              className="gf-pr-icon-btn"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <div className="gf-pr-scroll">
          <div className="gf-pr-scroll-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}

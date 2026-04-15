import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { API_BASE_URL as API } from "../config";
import { evaluateInteractionRules } from "../lib/realizationRules";

export function useGamification(specId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState([]);
  const [lastPop, setLastPop] = useState(null);

  const loadPackage = useCallback(async () => {
    if (!specId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/v1/realize`, { spec_id: specId });
      const dp = res.data?.deployment_package;
      if (!dp) throw new Error("Invalid deployment_package");
      setPkg(dp);
    } catch (e) {
      let msg = "Failed to load realization package";
      if (axios.isAxiosError(e)) {
        if (e.response?.data?.detail != null) {
          msg = String(e.response.data.detail);
        } else if (e.code === "ERR_NETWORK" || e.message === "Network Error") {
          msg =
            "Network error: cannot reach the API. Start FastAPI on port 8000 and open the UI from http://localhost:3000 " +
            "(CORS). Check REACT_APP_API_URL if you changed it. " +
            `Attempted: ${API}/api/v1/realize`;
        } else if (e.message) {
          msg = e.message;
        }
      } else if (e instanceof Error && e.message) {
        msg = e.message;
      }
      setError(msg);
      setPkg(null);
    } finally {
      setLoading(false);
    }
  }, [specId]);

  const applyAction = useCallback(
    (actionLabel) => {
      if (!pkg) return;
      const ev = evaluateInteractionRules(pkg, actionLabel);
      if (ev.pointsDelta) {
        setXp((x) => x + ev.pointsDelta);
        setLastPop({ type: "points", value: `+${ev.pointsDelta} XP` });
      }
      if (ev.badgeIds.length) {
        setBadges((b) => Array.from(new Set([...b, ...ev.badgeIds])));
        setLastPop({ type: "badge", value: ev.badgeIds.join(", ") });
      }
    },
    [pkg],
  );

  const clearPop = useCallback(() => setLastPop(null), []);

  const progressMax = useMemo(() => {
    const phases = pkg?.gamification_config?.gameplay_phases?.length || 1;
    return Math.max(1, phases * 100);
  }, [pkg]);

  const progressValue = useMemo(() => {
    const phases = pkg?.gamification_config?.gameplay_phases?.length || 1;
    const step = Math.min(phases, 1 + Math.floor(xp / 50));
    return Math.min(progressMax, step * (progressMax / phases));
  }, [pkg, xp, progressMax]);

  return {
    loading,
    error,
    pkg,
    loadPackage,
    xp,
    badges,
    lastPop,
    clearPop,
    applyAction,
    progressValue,
    progressMax,
  };
}

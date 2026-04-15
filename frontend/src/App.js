import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL as API } from "./config";
import AnalyticsPage from "./AnalyticsPage";
import RuntimeLabPage from "./RuntimeLabPage";
import PlayerRuntime from "./components/PlayerRuntime/PlayerRuntime.jsx";
import HomePage from "./HomePage";
import SixDWizardPage from "./SixDWizardPage";
import OntologyCheckPanel from "./OntologyCheckPanel";
import SixDChecklist, { SIX_D_META_KEY } from "./SixDChecklist";
import StudioCopilotPanel from "./StudioCopilotPanel";
import { RealizationProvider } from "./context/RealizationContext.jsx";
import {
  DOMAIN_TEMPLATES,
  defaultDomainTemplateId,
  applyDomainTemplate,
  buildAiContextFromSpec,
  buildSpecStudioStateFromWizard,
  SPEC_DRIVEN_TEMPLATE_ID,
} from "./domainTemplates";
import {
  getSectionPhases,
  getCoverageHints,
  listEmptySectionKeys,
} from "./specStudioExtras";
import {
  buildQualityDiagnostics,
  exportBacklogCsvDownload,
  exportBacklogHtmlDownload,
  exportBacklogMarkdownDownload,
  exportHtmlProposalDownload,
  exportLlmDevPromptDownload,
  exportMarkdownDownload,
  exportSpecJsonDownload,
} from "./proposalExport";
const TOKEN_KEY = "gameforge_token";
const USER_KEY = "gameforge_user";
const sectionOrder = [
  "s01::Introduction and Context",
  "s02::Simulation/Project Context",
  "s03::Core Learning Objectives",
  "s04::Participant Profiles and Role-Mapping",
  "s05::Core Gamification Ontology (concept-to-game-element mappings)",
  "s06::Game Mechanics",
  "s07::Emergent Game Dynamics",
  "s08::Rewards and Incentives",
  "s09::Narrative Framework",
  "s10::Social Interaction Design",
  "s11::Customization and Adaptability",
  "s12::Tangible Elements and Environmental Setup",
  "s13::Detailed Gameplay Flow",
  "s14::Gamified User Stories",
  "s15::Key Interaction Sequences",
  "s16::Illustrative Storyboards",
  "s17::Interface Wireframes",
  "s18::Assessment Framework and KPIs",
  "s19::Game Management Structure",
  "s20::Execution Log and Leaderboard Design",
  "s21::Implementation Risks",
  "s22::Data Collection and Feedback",
  "s23::Continuous Improvement Framework",
  "s24::Conclusion",
  "s25::Appendices (Role sheets, card catalogs, glossary, references)",
];
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("demo-user");
  const [password, setPassword] = useState("demo");
  const [page, setPage] = useState("home");
  const [specs, setSpecs] = useState([]);
  const [specId, setSpecId] = useState("");
  const [spec, setSpec] = useState(null);
  const [sections, setSections] = useState({});
  const [contextText, setContextText] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [runtimeResult, setRuntimeResult] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [ontologyCheck, setOntologyCheck] = useState(null);
  const [responseText, setResponseText] = useState("System ready.");
  const [specHealth, setSpecHealth] = useState(72);
  const [qualityCheckExpanded, setQualityCheckExpanded] = useState(false);
  const [scenario, setScenario] = useState("cybersecurity");
  const [tasks, setTasks] = useState([]);
  const [playerState, setPlayerState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [missionTimeLeft, setMissionTimeLeft] = useState(0);
  const [missionFeedback, setMissionFeedback] = useState("");
  const [gameConfig, setGameConfig] = useState(null);
  const [missionStartTime, setMissionStartTime] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [seasonInfo, setSeasonInfo] = useState(null);
  const [league, setLeague] = useState("Bronze");
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [lastMissionResult, setLastMissionResult] = useState(null);
  const [missionBoardFilter, setMissionBoardFilter] = useState("all");
  const [runtimeRunModalOpen, setRuntimeRunModalOpen] = useState(false);
  const [runtimeRunStartMissionId, setRuntimeRunStartMissionId] =
    useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState(sectionOrder[0]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [specToDelete, setSpecToDelete] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [studioCopilotOpen, setStudioCopilotOpen] = useState(true);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiTargetSectionKey, setAiTargetSectionKey] = useState("");
  const [aiContextDraft, setAiContextDraft] = useState("");
  const [aiPreviewSuggestion, setAiPreviewSuggestion] = useState("");
  const [aiPrevSectionValue, setAiPrevSectionValue] = useState("");
  const [aiAlignmentReport, setAiAlignmentReport] = useState(null);
  const [aiTargetHexad, setAiTargetHexad] = useState("");
  const [domainTemplateId, setDomainTemplateId] = useState(
    defaultDomainTemplateId,
  );
  const completedSections = useMemo(() => {
    return Object.values(sections || {}).filter(
      (v) => String(v || "").trim().length > 0,
    ).length;
  }, [sections]);
  const completionRate = useMemo(() => {
    return Math.round((completedSections / sectionOrder.length) * 100) || 0;
  }, [completedSections]);
  const filledSectionsCount = useMemo(() => {
    return sectionOrder.reduce((acc, key) => {
      const len = String(sections?.[key] || "").trim().length;
      return acc + (len > 0 ? 1 : 0);
    }, 0);
  }, [sections]);
  const levelProgress = useMemo(() => {
    const xp = playerState?.xp ?? 0;
    const level = Math.max(1, playerState?.level ?? 1);
    const prevThreshold = (level - 1) * 120;
    const nextThreshold = level * 120;
    const inLevelXp = Math.max(0, xp - prevThreshold);
    const needed = Math.max(1, nextThreshold - prevThreshold);
    return Math.min(100, Math.round((inLevelXp / needed) * 100));
  }, [playerState]);
  const filteredMissions = useMemo(() => {
    if (missionBoardFilter === "completed")
      return (tasks || []).filter((m) =>
        (playerState?.completed_task_ids || []).includes(m.id),
      );
    if (missionBoardFilter === "unlocked")
      return (tasks || []).filter(
        (m) =>
          (playerState?.missions_unlocked || []).includes(m.id) &&
          !(playerState?.completed_task_ids || []).includes(m.id),
      );
    if (missionBoardFilter === "locked")
      return (tasks || []).filter(
        (m) => !(playerState?.missions_unlocked || []).includes(m.id),
      );
    return tasks || [];
  }, [missionBoardFilter, tasks, playerState]);
  useEffect(() => {
    const score = Math.min(
      100,
      Math.max(
        20,
        completionRate +
          (validationResult?.ok ? 20 : 0) +
          (runtimeResult ? 10 : 0),
      ),
    );
    setSpecHealth(score);
  }, [completionRate, validationResult, runtimeResult]);
  const filteredSectionOrder = useMemo(() => {
    if (!searchTerm.trim()) return sectionOrder;
    const q = searchTerm.toLowerCase();
    return sectionOrder.filter((key) => {
      const title = key.toLowerCase();
      const body = String(sections[key] || "").toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [searchTerm, sections]);
  const emptySectionsForExport = useMemo(
    () => listEmptySectionKeys(sectionOrder, sections),
    [sections],
  );
  const activeSpecForExport = useMemo(() => {
    if (!specId) return null;
    if (spec && String(spec.id) === String(specId)) return spec;
    const fromList = (specs || []).find((s) => String(s.id) === String(specId));
    return fromList || { id: specId, title: `Spec ${specId}`, status: "" };
  }, [spec, specs, specId]);
  const qualityDiagnostics = useMemo(
    () => buildQualityDiagnostics(sections, sectionOrder, emptySectionsForExport),
    [sections, emptySectionsForExport],
  );
  const sectionPhases = useMemo(() => getSectionPhases(sectionOrder), []);
  const studioSpecSelectValue = useMemo(() => {
    if (!specId) return "";
    if ((specs || []).some((s) => String(s.id) === String(specId)))
      return String(specId);
    if (spec && String(spec.id) === String(specId)) return String(specId);
    return "";
  }, [specId, specs, spec]);
  const embedWidgetCode = useMemo(() => {
    if (!specId) return "";
    const sid = String(specId);
    const apiJson = JSON.stringify(API);
    return `<!-- GameForge AI — Embeddable widget
     1) Approve spec, open Runtime Lab → Phase 2 → Load deployment package.
     2) Replace YOUR_API_KEY with the package api_key shown in the UI.
-->
<script>
(function () {
  var API_BASE = ${apiJson};
  var SPEC_ID = ${sid};
  var API_KEY = "YOUR_API_KEY";
  function gameforgeEvent(eventType, value, kpiKey) {
    return fetch(API_BASE + "/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spec_id: SPEC_ID,
        session_id: null,
        event_type: eventType || "external_widget",
        value: value | 0,
        kpi_key: kpiKey || null,
        payload: { source: "embed", api_key: API_KEY },
      }),
    });
  }
  window.gameforgeEvent = gameforgeEvent;
  window.gameforgePing = function () {
    return gameforgeEvent("widget_heartbeat", 1, null);
  };
})();
</script>
<!-- Example: <button onclick="gameforgeEvent('cta_click',1,'engagement')">Award +1</button> -->`;
  }, [specId]);
  const statusColor = (status) => {
    if (status === "approved") return "#16a34a";
    if (status === "validated") return "#2563eb";
    if (status === "draft") return "#d97706";
    return "#64748b";
  };
  const validationSectionKey = (msg) => {
    const m = String(msg || "");
    if (m.includes("Game Mechanics")) return "s06::Game Mechanics";
    if (m.includes("Rewards and Incentives"))
      return "s08::Rewards and Incentives";
    if (m.includes("Execution Log and Leaderboard"))
      return "s20::Execution Log and Leaderboard Design";
    if (m.includes("Assessment Framework"))
      return "s18::Assessment Framework and KPIs";
    if (m.includes("Data Collection"))
      return "s22::Data Collection and Feedback";
    if (m.includes("Missing sections")) return sectionOrder[0];
    return "";
  };
  const sectionShortDescription = (key) => {
    const k = String(key || "");
    if (k.startsWith("s01::")) return "Set goal and context.";
    if (k.startsWith("s02::")) return "Define simulation/project context.";
    if (k.startsWith("s03::")) return "List core learning objectives.";
    if (k.startsWith("s04::"))
      return "Define participant profiles and role mapping.";
    if (k.startsWith("s05::")) return "Core ontology mappings.";
    if (k.startsWith("s06::")) return "Write reward-related game mechanics.";
    if (k.startsWith("s07::")) return "Describe emergent dynamics.";
    if (k.startsWith("s08::")) return "Define rewards and incentives.";
    if (k.startsWith("s09::")) return "Narrative framework.";
    if (k.startsWith("s10::")) return "Social interaction design.";
    if (k.startsWith("s11::")) return "Customization and adaptability.";
    if (k.startsWith("s12::")) return "Tangible elements and setup.";
    if (k.startsWith("s13::")) return "Detailed gameplay flow.";
    if (k.startsWith("s14::")) return "Gamified user stories.";
    if (k.startsWith("s15::")) return "Key interaction sequences.";
    if (k.startsWith("s16::")) return "Storyboards / examples.";
    if (k.startsWith("s17::")) return "Interface wireframe notes.";
    if (k.startsWith("s18::")) return "Assessment and KPI framework.";
    if (k.startsWith("s19::")) return "Game management structure.";
    if (k.startsWith("s20::")) return "Execution log and leaderboard design.";
    if (k.startsWith("s21::")) return "Implementation risks and mitigations.";
    if (k.startsWith("s22::")) return "Data collection and feedback.";
    if (k.startsWith("s23::")) return "Continuous improvement loop.";
    if (k.startsWith("s24::")) return "Conclusion.";
    if (k.startsWith("s25::")) return "Appendices.";
    return "Edit this section and save.";
  };
  const isSpecLocked = String(spec?.status || "").toLowerCase() === "approved";
  const goAdjacentSection = (delta) => {
    const list = filteredSectionOrder.length
      ? filteredSectionOrder
      : sectionOrder;
    const i = list.indexOf(selectedSection);
    if (i < 0) return;
    const next = list[i + delta];
    if (next) setSelectedSection(next);
  };
  const login = async () => {
    if (!username.trim() || !password.trim()) {
      setResponseText("Please enter username and password.");
      return;
    }
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      return res.data;
    }, "Login successful.");
    if (data?.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, username);
      setLoggedIn(true);
      setPage("home");
    }
  };
  const registerUser = async () => {
    if (!username.trim() || !password.trim()) {
      setResponseText("Please enter username and password.");
      return;
    }
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/auth/register`, {
        username,
        password,
      });
      return res.data;
    }, "User created. You can now log in.");
    return data;
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete axios.defaults.headers.common["Authorization"];
    setLoggedIn(false);
    setUsername("");
    setPassword("");
    setSpecId("");
    setSpec(null);
    setSections({});
    setPage("home");
    setContextText("");
    setDomainTemplateId(defaultDomainTemplateId);
    setResponseText("Logged out.");
  };
  const apiCall = async (fn, successMessage) => {
    try {
      setLoading(true);
      const data = await fn();
      if (successMessage) setResponseText(successMessage);
      return data;
    } catch (err) {
      const detail =
        err?.response?.data?.detail || err?.message || "Unknown error";
      setResponseText("Error: " + detail);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const loadSpecs = async () => {
    const data = await apiCall(async () => {
      const res = await axios.get(`${API}/specs`);
      return res.data;
    });
    if (Array.isArray(data)) setSpecs(data);
    else if (data != null) setSpecs([]);
  };
  const createSpec = async () => {
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/specs`, {
        title: "New GameForge Specification",
      });
      return res.data;
    }, "Specification created.");
    if (data) {
      setSpecId(String(data.id));
      setSpec(data);
      setSections(data.sections || {});
      setSelectedSection(sectionOrder[0]);
      setPage("spec");
      setValidationResult(null);
      setOntologyCheck(null);
      setDomainTemplateId(SPEC_DRIVEN_TEMPLATE_ID);
      setContextText(buildAiContextFromSpec(data.title || "", data.sections || {}));
      await loadSpecs();
    }
  };
  const openSpec = async (id) => {
    const data = await apiCall(async () => {
      const res = await axios.get(`${API}/specs/${id}`);
      return res.data;
    }, `Specification #${id} loaded.`);
    if (data) {
      setSpecId(String(data.id));
      setSpec(data);
      setSections(data.sections || {});
      setSelectedSection(sectionOrder[0]);
      setPage("spec");
      setValidationResult(null);
      setOntologyCheck(null);
      setDomainTemplateId(SPEC_DRIVEN_TEMPLATE_ID);
      setContextText(buildAiContextFromSpec(data.title || "", data.sections || {}));
    }
  };
  const saveSpec = async () => {
    if (!specId) return;
    const data = await apiCall(async () => {
      const res = await axios.put(`${API}/specs/${specId}`, {
        title: spec?.title,
        sections,
      });
      return res.data;
    }, "Specification saved.");
    if (data) {
      setSpec(data);
      setSections(data.sections || {});
      if (domainTemplateId === SPEC_DRIVEN_TEMPLATE_ID) {
        setContextText(buildAiContextFromSpec(data.title || "", data.sections || {}));
      }
      await loadSpecs();
    }
  };
  const autoComplete = async () => {
    if (!specId) return;
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/ai/auto-complete-spec`, {
        spec_id: Number(specId),
        tone: "academic",
        extra_context: contextText,
        max_sections: 25,
      });
      return res.data;
    }, "AI auto-complete completed.");
    if (data) await openSpec(specId);
  };
  const aiSuggestSection = async () => {
    if (!specId || !selectedSection) return;
    if (isSpecLocked) {
      setResponseText("Approved specs are locked.");
      return;
    }
    setAiTargetSectionKey(selectedSection);
    setAiPrevSectionValue(String(sections[selectedSection] || ""));
    setAiContextDraft(contextText);
    setAiPreviewSuggestion("");
    setAiAlignmentReport(null);
    setAiModalOpen(true);
    setAiModalLoading(true);
    try {
      const res = await axios.post(`${API}/ai/suggest-section`, {
        spec_id: Number(specId),
        section_key: selectedSection,
        tone: "academic",
        extra_context: contextText,
        target_hexad: aiTargetHexad.trim() || null,
      });
      const suggestion = res?.data?.suggestion || "";
      setAiPreviewSuggestion(suggestion);
      setAiAlignmentReport(res?.data?.alignment_report ?? null);
      setSections((prev) => ({ ...prev, [selectedSection]: suggestion }));
    } catch (err) {
      const detail =
        err?.response?.data?.detail || err?.message || "Unknown error";
      setResponseText("AI error: " + detail);
    } finally {
      setAiModalLoading(false);
    }
  };
  const aiApplySuggestion = async () => {
    if (!specId || !aiTargetSectionKey) return;
    if (!aiPreviewSuggestion.trim()) {
      setResponseText("AI preview is empty.");
      return;
    }
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/ai/apply-suggestion`, {
        spec_id: Number(specId),
        section_key: aiTargetSectionKey,
        suggestion: aiPreviewSuggestion,
      });
      return res.data;
    }, "Section updated.");
    if (data?.ok) {
      await openSpec(specId);
      setSelectedSection(aiTargetSectionKey);
      setAiModalOpen(false);
      setAiPrevSectionValue("");
    }
  };
  const validateSpec = async () => {
    if (!specId) return;
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/specs/${specId}/validate`);
      return res.data;
    }, "Validation completed.");
    if (data) {
      setValidationResult(data);
      await loadSpecs();
      await ontologyCheckRun();
    }
  };
  const approveSpec = async () => {
    if (!specId) return;
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/specs/${specId}/approve`);
      return res.data;
    }, "Specification approved.");
    if (data) {
      setSpec(data);
      setSections(data.sections || {});
      await loadSpecs();
    }
  };
  const realizeSpec = async () => {
    if (!specId) return;
    const data = await apiCall(async () => {
      const res = await axios.post(`${API}/specs/${specId}/realize`);
      return res.data;
    }, "Engagement rules materialized from your spec.");
    if (data) {
      setRuntimeResult(data);
      setPage("runtime");
    }
  };
  const deleteSpec = async (id, status) => {
    const normalized = String(status || "").toLowerCase();
    if (!["draft", "validated"].includes(normalized)) {
      setResponseText("Only DRAFT or VALIDATED specs can be deleted.");
      return;
    }
    setSpecToDelete({ id, status: normalized });
    setDeleteModalOpen(true);
  };
  const confirmDeleteSpec = async () => {
    if (!specToDelete?.id) return;
    const data = await apiCall(async () => {
      const res = await axios.delete(`${API}/specs/${specToDelete.id}`);
      return res.data;
    }, "Specification deleted.");
    if (data?.ok) {
      if (String(specId) === String(specToDelete.id)) {
        setSpecId("");
        setSpec(null);
        setSections({});
        setContextText("");
        setDomainTemplateId(defaultDomainTemplateId);
      }
      await loadSpecs();
    }
    setDeleteModalOpen(false);
    setSpecToDelete(null);
  };
  const cancelDeleteSpec = () => {
    setDeleteModalOpen(false);
    setSpecToDelete(null);
  };
  const exportDocx = async () => {
    if (!specId) {
      setResponseText("Please select a specification first.");
      return;
    }
    const data = await apiCall(async () => {
      const res = await axios.get(`${API}/specs/${specId}/export-docx`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spec_${specId}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }, `DOCX downloaded for spec #${specId}.`);
    if (!data) return;
  };
  const ontologyCheckRun = async () => {
    const data = await apiCall(async () => {
      const res = await axios.get(`${API}/ai/ontology-check`);
      return res.data;
    });
    if (data) setOntologyCheck(data);
  };
  const loadRuntimeScenario = async (scenarioKey) => {
    setScenario(scenarioKey);
    if (specId) {
      const gameData = await apiCall(async () => {
        const res = await axios.get(
          `${API}/runtime/game/by-spec/${specId}/${username}`,
        );
        return res.data;
      });
      if (gameData?.game?.missions) {
        setGameConfig(gameData.game);
        setTasks(gameData.game.missions);
        if (!selectedMission && gameData.game.missions.length)
          setSelectedMission(gameData.game.missions[0]);
      }
      if (gameData?.state) setPlayerState(gameData.state);
      if (gameData?.season) setSeasonInfo(gameData.season);
      if (gameData?.league) setLeague(gameData.league);
      const boardData = await apiCall(async () => {
        const res = await axios.get(
          `${API}/runtime/leaderboard/by-spec/${specId}`,
        );
        return res.data;
      });
      if (boardData) setLeaderboard(boardData);
      return;
    }
    setResponseText(
      "Please select a specification to load the engagement preview.",
    );
  };
  const openMissionDetails = (task) => {
    setSelectedMission(task);
    setMissionFeedback("");
  };
  const submitMissionAnswer = async (answerIndex) => {
    if (!activeMission || !specId) return;
    const elapsedSec = missionStartTime
      ? (Date.now() - missionStartTime) / 1000
      : activeMission.time_limit_sec;
    const result = await apiCall(async () => {
      const res = await axios.post(
        `${API}/runtime/game/by-spec/${specId}/${username}/submit/${activeMission.id}`,
        { selected_index: answerIndex, elapsed_sec: elapsedSec },
      );
      return res.data;
    }, "Mission resolved.");
    if (!result) return;
    setMissionFeedback(
      result.success
        ? `Success! +${result.earned_xp} XP`
        : "Mission failed. Combo reset.",
    );
    setPlayerState(result.state);
    if (result?.season) setSeasonInfo(result.season);
    if (result?.league) setLeague(result.league);
    setLastMissionResult(result);
    setResultModalOpen(true);
    setActiveMission(null);
    setMissionStartTime(null);
    await loadRuntimeScenario(scenario);
    await loadAnalytics();
  };
  useEffect(() => {
    if (!activeMission) return;
    if (missionTimeLeft <= 0) {
      submitMissionAnswer(-1);
      return;
    }
    const t = setTimeout(() => setMissionTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [activeMission, missionTimeLeft]);
  const loadAnalytics = async (specIdOverride) => {
    const sid = specIdOverride ?? "all";
    const data = await apiCall(async () => {
      const res = await axios.get(
        `${API}/analytics/overview?spec_id=${encodeURIComponent(sid)}`,
      );
      return res.data;
    });
    if (data) setAnalytics(data);
  };
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (token && savedUser) {
      setUsername(savedUser);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    loadSpecs();
    loadAnalytics();
    if (specId) {
      loadRuntimeScenario("active");
    }
  }, [loggedIn, specId]);
  useEffect(() => {
    if (loggedIn && page === "spec") loadSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSpecs is stable enough for refresh-on-tab
  }, [loggedIn, page]);
  if (!loggedIn) {
    return (
      <div style={styles.loginPage}>
        {" "}
        <div style={styles.loginGlowA} /> <div style={styles.loginGlowB} />{" "}
        <div style={styles.loginCard}>
          {" "}
          <div style={styles.loginBrand}>GameForge AI</div>{" "}
          <h1 style={styles.loginTitle}>
            Gamification design &amp; lifecycle platform
          </h1>{" "}
          <p style={styles.loginSubtitle}>
            {" "}
            GameForge AI helps organizations{" "}
            <strong>gamify real processes</strong>—training, operations, or
            workflows—using structured templates. AI acts as a{" "}
            <strong>design assistant</strong> (drafting sections, suggesting
            quests); an <strong>ontology</strong> links mechanics, players, and
            rewards semantically. This is <strong>not</strong> a game engine:
            you add selected game elements (points, badges, leaderboards, goals)
            to non-game activities and preview an illustrative engagement
            loop.{" "}
          </p>{" "}
          <div style={styles.fieldGroup}>
            {" "}
            <label style={styles.label}>Username</label>{" "}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />{" "}
          </div>{" "}
          <div style={styles.fieldGroup}>
            {" "}
            <label style={styles.label}>Password</label>{" "}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />{" "}
          </div>{" "}
          <div style={styles.authButtonRow}>
            {" "}
            <button onClick={login} style={styles.primaryButtonWide}>
              Login
            </button>{" "}
            <button onClick={registerUser} style={styles.secondaryButtonWide}>
              Register
            </button>{" "}
          </div>{" "}
          <div style={styles.responseBox}>{responseText}</div>{" "}
        </div>{" "}
      </div>
    );
  }
  const isPlayerRuntime = page === "playerruntime";
  return (
    <div
      style={{
        ...styles.appShell,
        ...(isPlayerRuntime
          ? {
              height: "100vh",
              minHeight: "100vh",
              overflow: "hidden",
              gridTemplateRows: "minmax(0, 1fr)",
            }
          : {}),
      }}
    >
      {" "}
      <aside
        style={
          isPlayerRuntime
            ? { ...styles.sidebar, minHeight: 0, overflowY: "auto" }
            : styles.sidebar
        }
      >
        {" "}
        <div>
          {" "}
          <div style={styles.logo}>GameForge AI</div>{" "}
          <div style={styles.logoSub}>
            Specification → realization · AI · Ontology
          </div>{" "}
        </div>{" "}
        <div style={styles.navSectionTitle}>Start</div>{" "}
        <button
          style={page === "home" ? styles.navButtonActive : styles.navButton}
          onClick={() => {
            setPage("home");
            loadSpecs();
          }}
        >
          {" "}
          Home{" "}
        </button>{" "}
        <div style={{ ...styles.navSectionTitle, marginTop: 14 }}>
          Phase 1 · Specification
        </div>{" "}
        <button
          style={
            page === "sixdwizard" ? styles.navButtonActive : styles.navButton
          }
          onClick={() => setPage("sixdwizard")}
        >
          {" "}
          6D specification wizard{" "}
        </button>{" "}
        <button
          style={page === "spec" ? styles.navButtonActive : styles.navButton}
          onClick={() => {
            setPage("spec");
            loadSpecs();
          }}
        >
          {" "}
          25-section studio{" "}
        </button>{" "}
        <div style={{ ...styles.navSectionTitle, marginTop: 14 }}>
          Phase 2 · Realization
        </div>{" "}
        <button
          style={page === "runtime" ? styles.navButtonActive : styles.navButton}
          onClick={() => {
            setPage("runtime");
            loadRuntimeScenario(scenario);
          }}
        >
          {" "}
          Runtime lab{" "}
        </button>{" "}
        <button
          style={
            page === "playerruntime"
              ? styles.navButtonActive
              : styles.navButton
          }
          onClick={() => setPage("playerruntime")}
        >
          {" "}
          Player runtime{" "}
        </button>{" "}
        <button
          style={
            page === "analytics" ? styles.navButtonActive : styles.navButton
          }
          onClick={() => {
            setPage("analytics");
            loadAnalytics();
          }}
        >
          {" "}
          Monitoring & analytics{" "}
        </button>{" "}
        <div style={{ ...styles.navSectionTitle, marginTop: 14 }}>
          Output
        </div>{" "}
        <button
          style={page === "export" ? styles.navButtonActive : styles.navButton}
          onClick={() => setPage("export")}
        >
          {" "}
          Export & API{" "}
        </button>{" "}
        <div style={styles.sidebarCard}>
          {" "}
          <div style={styles.sidebarCardTitle}>Session</div>{" "}
          <div style={styles.sidebarMeta}>
            <span>User</span>
            <strong>{username}</strong>
          </div>{" "}
          <div style={styles.sidebarMeta}>
            <span>Active Spec</span>
            <strong>{specId || "-"}</strong>
          </div>{" "}
          <div style={styles.sidebarMeta}>
            <span>Completion</span>
            <strong>{completionRate}%</strong>
          </div>
          <button
            onClick={logout}
            style={{
              ...styles.navButton,
              marginTop: "12px",
              color: "#ff6b6b",
              borderColor: "#ff6b6b",
            }}
          >
            Logout
          </button>{" "}
        </div>{" "}
      </aside>{" "}
      <RealizationProvider specId={specId} specStatus={spec?.status}>
      <main
        style={
          isPlayerRuntime
            ? {
                ...styles.main,
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                height: "100%",
                flex: 1,
              }
            : styles.main
        }
      >
        {" "}
        {!isPlayerRuntime && (
        <div style={styles.topBar}>
          {" "}
          <div>
            {" "}
            <h1 style={styles.pageTitle}>{pageTitle(page)}</h1>{" "}
            <p style={styles.pageSubtitle}>{pageSubtitle(page)}</p>{" "}
          </div>{" "}
          <div style={styles.topActions}>
            {" "}
            <div style={styles.systemBadge}>
              {loading ? "Working..." : "System Ready"}
            </div>{" "}
            <button style={styles.primaryButton} onClick={createSpec}>
              New specification
            </button>{" "}
          </div>{" "}
        </div>
        )}
        {page === "home" && (
          <HomePage
            styles={styles}
            specs={specs}
            spec={spec}
            completedSections={completedSections}
            specHealth={specHealth}
            completionRate={completionRate}
            validationResult={validationResult}
            runtimeResult={runtimeResult}
            analytics={analytics}
            statusColor={statusColor}
            openSpec={openSpec}
            deleteSpec={deleteSpec}
            onNavigate={(p) => {
              setPage(p);
              if (p === "home" || p === "spec" || p === "sixdwizard")
                loadSpecs();
              if (p === "runtime") loadRuntimeScenario(scenario);
              if (p === "analytics") loadAnalytics();
            }}
          />
        )}{" "}
        {page === "sixdwizard" && (
          <div style={{ width: "100%", minWidth: 0 }}>
            <SixDWizardPage
              styles={styles}
              API={API}
              specTitle={spec?.title || ""}
              specId={specId}
              onSpecRegistered={(data) => {
                setSpecId(String(data.id));
                setSpec(data);
                setSections(data.sections || {});
                setSelectedSection(sectionOrder[0]);
                loadSpecs();
              }}
              onOpenStudio={(wizSpecId, wizardMeta) => {
                if (wizardMeta && wizardMeta.domainKey) {
                  const next = buildSpecStudioStateFromWizard(wizardMeta);
                  setDomainTemplateId(next.domainTemplateId);
                  setContextText(next.contextText);
                }
                setPage("spec");
                loadSpecs();
                const sid = wizSpecId || specId;
                if (sid) openSpec(Number(sid));
              }}
            />
          </div>
        )}{" "}
        {page === "spec" && (
          <div
            style={{
              ...styles.specStudioShell,
              gridTemplateColumns: studioCopilotOpen
                ? "minmax(260px, 320px) minmax(0, 1fr) minmax(260px, 300px)"
                : "minmax(260px, 320px) minmax(0, 1fr) auto",
            }}
          >
            {" "}
            <div style={styles.specSidebar}>
              {" "}
              <div style={styles.specSidebarTitle}>
                Specification Sections
              </div>{" "}
              <input
                style={styles.specSidebarSearch}
                placeholder="Search sections"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />{" "}
              {sectionPhases.map((phase) => {
                const keys = phase.keys.filter((k) =>
                  filteredSectionOrder.includes(k),
                );
                if (!keys.length) return null;
                return (
                  <React.Fragment key={phase.label}>
                    {" "}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                        marginTop: 4,
                      }}
                    >
                      {phase.label}
                    </div>{" "}
                    {keys.map((key) => {
                      const len = String(sections[key] || "").trim().length;
                      const fillLevel =
                        len === 0 ? "empty" : len < 80 ? "partial" : "filled";
                      return (
                        <button
                          key={key}
                          style={{
                            ...styles.specSectionButton,
                            ...(selectedSection === key
                              ? styles.specSectionButtonActive
                              : {}),
                          }}
                          onClick={() => setSelectedSection(key)}
                        >
                          {" "}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {" "}
                            <span
                              style={{
                                ...styles.sectionDot,
                                ...(fillLevel === "filled"
                                  ? styles.sectionDotFilled
                                  : fillLevel === "partial"
                                    ? styles.sectionDotPartial
                                    : styles.sectionDotEmpty),
                              }}
                            />{" "}
                            <span style={styles.specSectionCode}>
                              {key.split("::")[0]}
                            </span>{" "}
                          </div>{" "}
                          <span style={styles.specSectionName}>
                            {key.split("::")[1]}
                          </span>{" "}
                        </button>
                      );
                    })}{" "}
                  </React.Fragment>
                );
              })}{" "}
            </div>{" "}
            <div style={styles.specMainPanel}>
              {" "}
              <div
                style={{
                  ...styles.card,
                  marginBottom: 14,
                  padding: 18,
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(15,23,42,0.92))",
                  border: "1px solid rgba(59,130,246,0.22)",
                }}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {" "}
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    {" "}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#93c5fd",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Working specification
                    </div>{" "}
                    {specId && spec ? (
                      <>
                        {" "}
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#f8fafc",
                            lineHeight: 1.3,
                          }}
                        >
                          {spec.title || `Spec #${specId}`}
                        </div>{" "}
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {" "}
                          <span style={{ ...styles.cardHint, margin: 0 }}>
                            ID #{specId}
                          </span>{" "}
                          <span
                            style={{
                              ...styles.statusBadge,
                              background: statusColor(spec.status),
                              fontSize: 11,
                            }}
                          >
                            {spec.status}
                          </span>{" "}
                          <span style={styles.cardHint}>
                            {completionRate}% sections filled
                          </span>{" "}
                        </div>{" "}
                      </>
                    ) : (
                      <div
                        style={{
                          color: "#fdba74",
                          fontSize: 15,
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}
                      >
                        {" "}
                        No specification selected. Pick one from the list or open a row
                        on the home table.{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                  <div style={{ flex: "0 1 280px" }}>
                    {" "}
                    <label style={{ ...styles.label, marginBottom: 6 }}>
                      Spec
                    </label>{" "}
                    <select
                      value={studioSpecSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) openSpec(Number(v));
                      }}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.14)",
                        background: "rgba(15,23,42,0.85)",
                        color: "#fff",
                        padding: "0 12px",
                        outline: "none",
                        fontSize: 14,
                      }}
                    >
                      {" "}
                      <option value="">Choose a specification…</option>{" "}
                      {specId &&
                      spec &&
                      !(specs || []).some(
                        (s) => String(s.id) === String(specId),
                      ) ? (
                        <option value={String(spec.id)}>
                          {" "}
                          {spec.title} ({spec.status}){" "}
                        </option>
                      ) : null}{" "}
                      {(specs || []).map((sp) => (
                        <option key={sp.id} value={String(sp.id)}>
                          {" "}
                          {sp.title} ({sp.status}){" "}
                        </option>
                      ))}{" "}
                    </select>{" "}
                    <div style={{ ...styles.cardHint, marginTop: 8 }}>
                      {" "}
                      This controls which document the studio loads. Switching
                      specs saves nothing automatically—save first if you
                      edited.{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div style={styles.card}>
                {" "}
                <div style={styles.cardHeaderRow}>
                  {" "}
                  <h3 style={styles.cardTitle}>Specification Controls</h3>{" "}
                  <span style={styles.inlineBadge}>
                    {completedSections}/25 sections completed
                  </span>{" "}
                </div>{" "}
                <label style={styles.label}>Domain template</label>{" "}
                <select
                  value={domainTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setDomainTemplateId(id);
                    if (id === SPEC_DRIVEN_TEMPLATE_ID) {
                      setContextText(
                        buildAiContextFromSpec(spec?.title || "", sections || {}),
                      );
                    } else {
                      setContextText(applyDomainTemplate(id));
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#fff",
                    padding: "0 12px",
                    marginBottom: 12,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: 14,
                  }}
                >
                  {" "}
                  {DOMAIN_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {" "}
                      {t.label}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
                <label style={styles.label}>AI Context (global)</label>{" "}
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  style={styles.textareaLarge}
                />{" "}
                <label style={styles.label}>
                  Optional: validate AI draft vs HEXAD type
                </label>{" "}
                <select
                  value={aiTargetHexad}
                  onChange={(e) => setAiTargetHexad(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#fff",
                    padding: "0 12px",
                    marginBottom: 12,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: 14,
                  }}
                >
                  {" "}
                  <option value="">Auto-detect only (no target)</option>{" "}
                  <option value="Achiever">Achiever</option>{" "}
                  <option value="Player">Player</option>{" "}
                  <option value="Socializer">Socializer</option>{" "}
                  <option value="Free Spirit">Free Spirit</option>{" "}
                  <option value="Philanthropist">Philanthropist</option>{" "}
                  <option value="Disruptor">Disruptor</option>{" "}
                </select>{" "}
                <div style={styles.cardHint}>
                  With <strong>Other (document text…)</strong> selected, this field is filled from the
                  specification title and early sections (§01, then §02 if §01 is short, or §09 if those are
                  empty); it stays empty if there is nothing to pull. Other domain templates insert only the
                  short summary paragraph (no automatic bullet list—you can add bullets manually). This text is
                  AI context only; section bodies are saved in the editor. HEXAD check uses keyword heuristics
                  (not OWL reasoning).
                </div>{" "}
                <div style={styles.specToolbar}>
                  {" "}
                  <button
                    style={styles.primaryButton}
                    onClick={aiSuggestSection}
                    disabled={isSpecLocked || !selectedSection}
                  >
                    AI Fill Selected
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={autoComplete}
                    disabled={isSpecLocked || !specId}
                  >
                    AI Fill All
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={saveSpec}
                    disabled={isSpecLocked || !specId}
                  >
                    Save
                  </button>{" "}
                  <button style={styles.secondaryButton} onClick={validateSpec}>
                    Validate
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={approveSpec}
                    disabled={!validationResult?.ok || isSpecLocked || !specId}
                  >
                    Approve
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={realizeSpec}
                    disabled={
                      !specId ||
                      String(spec?.status || "").toLowerCase() !== "approved"
                    }
                  >
                    Realize
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={() => goAdjacentSection(-1)}
                  >
                    Prev section
                  </button>{" "}
                  <button
                    style={styles.secondaryButton}
                    onClick={() => goAdjacentSection(1)}
                  >
                    Next section
                  </button>{" "}
                  <button
                    style={styles.deleteButton}
                    onClick={() => spec && deleteSpec(spec.id, spec.status)}
                    disabled={!spec || isSpecLocked}
                    title="Delete current specification"
                  >
                    {" "}
                    Delete Current Spec{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              <div style={styles.specEditorCard}>
                {" "}
                <div style={styles.specEditorHeader}>
                  {" "}
                  <div>
                    {" "}
                    <div style={styles.specEditorMeta}>
                      Editing: {selectedSection.split("::")[0]}
                    </div>{" "}
                    <h3 style={styles.specEditorTitle}>
                      {selectedSection.split("::")[1]}
                    </h3>{" "}
                    <p style={styles.cardHint}>
                      {sectionShortDescription(selectedSection)}
                    </p>{" "}
                    <div
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(37,99,235,0.08)",
                        border: "1px solid rgba(59,130,246,0.2)",
                      }}
                    >
                      {" "}
                      <div
                        style={{
                          ...styles.cardHint,
                          marginBottom: 6,
                          fontWeight: 700,
                          color: "#93c5fd",
                        }}
                      >
                        Coverage checklist
                      </div>{" "}
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          color: "#cbd5e1",
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        {" "}
                        {getCoverageHints(selectedSection).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}{" "}
                      </ul>{" "}
                    </div>{" "}
                  </div>{" "}
                  <span style={styles.inlineBadge}>
                    {" "}
                    {String(sections[selectedSection] || "").trim()
                      ? "Filled"
                      : "Empty"}{" "}
                  </span>{" "}
                </div>{" "}
                <textarea
                  style={styles.specEditorTextarea}
                  disabled={isSpecLocked || !specId}
                  value={sections[selectedSection] || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      [selectedSection]: e.target.value,
                    }))
                  }
                />{" "}
              </div>{" "}
              <div style={styles.specMiniGrid}>
                {" "}
                <div style={styles.infoPanel}>
                  {" "}
                  <div style={styles.infoPanelTitle}>Validation</div>{" "}
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    {" "}
                    <span
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: validationResult?.ok
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(239,68,68,0.16)",
                        border: validationResult?.ok
                          ? "1px solid rgba(34,197,94,0.35)"
                          : "1px solid rgba(239,68,68,0.35)",
                        color: validationResult?.ok ? "#86efac" : "#fecaca",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {" "}
                      {validationResult
                        ? validationResult.ok
                          ? "✅ Validation passed"
                          : "❌ Validation failed"
                        : "Run validation"}{" "}
                    </span>{" "}
                    <span style={styles.cardHint}>
                      Filled: {filledSectionsCount}/25
                    </span>{" "}
                  </div>{" "}
                  {validationResult ? (
                    <>
                      {" "}
                      {validationResult.errors.length ? (
                        <div style={{ marginBottom: 10 }}>
                          {" "}
                          <div style={styles.cardHint}>Errors</div>{" "}
                          {validationResult.errors.map((msg, i) => (
                            <div
                              key={"e" + i}
                              style={{
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid rgba(239,68,68,0.25)",
                                background: "rgba(239,68,68,0.08)",
                                color: "#fecaca",
                                marginBottom: 8,
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                const key = validationSectionKey(msg);
                                if (key) setSelectedSection(key);
                              }}
                            >
                              {" "}
                              <strong style={{ marginRight: 8 }}>
                                ❌
                              </strong>{" "}
                              {msg}{" "}
                            </div>
                          ))}{" "}
                        </div>
                      ) : null}{" "}
                      {validationResult.warnings.length ? (
                        <div>
                          {" "}
                          <div style={styles.cardHint}>Warnings</div>{" "}
                          {validationResult.warnings.map((msg, i) => (
                            <div
                              key={"w" + i}
                              style={{
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid rgba(245,158,11,0.25)",
                                background: "rgba(245,158,11,0.08)",
                                color: "#fdba74",
                                marginBottom: 8,
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                const key = validationSectionKey(msg);
                                if (key) setSelectedSection(key);
                              }}
                            >
                              {" "}
                              <strong style={{ marginRight: 8 }}>
                                ⚠️
                              </strong>{" "}
                              {msg}{" "}
                            </div>
                          ))}{" "}
                        </div>
                      ) : null}{" "}
                    </>
                  ) : (
                    <div style={styles.cardHint}>No validation run yet.</div>
                  )}{" "}
                </div>{" "}
                <div style={styles.infoPanel}>
                  {" "}
                  <div style={styles.infoPanelTitle}>Ontology Check</div>{" "}
                  <OntologyCheckPanel
                    data={ontologyCheck}
                    styles={styles}
                  />{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <StudioCopilotPanel
              open={studioCopilotOpen}
              onToggle={() => setStudioCopilotOpen((v) => !v)}
              sections={sections}
              ontologyCheck={ontologyCheck}
              aiTargetHexad={aiTargetHexad}
              styles={styles}
            />{" "}
          </div>
        )}{" "}
        {page === "playerruntime" && (
          <div
            className="gf-pr-app-pane"
            style={{
              width: "100%",
              minWidth: 0,
              padding: 0,
              boxSizing: "border-box",
              background: "linear-gradient(180deg, #07101c 0%, #0b1220 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div className="gf-pr-app-pane-inner">
            <PlayerRuntime
              specId={String(specId || "")}
              specStatus={spec?.status || ""}
              specTitle={spec?.title || ""}
              username={username}
              onGoHome={() => setPage("home")}
              onGoSpecStudio={() => setPage("spec")}
              onLeave={() => setPage("home")}
              hexadHint={aiTargetHexad.trim() || undefined}
              styles={styles}
            />
            </div>
          </div>
        )}{" "}
        {page === "runtime" && (
          <RuntimeLabPage
            styles={styles}
            specId={specId}
            specStatus={spec?.status || ""}
            specTitle={spec?.title || gameConfig?.spec_title || ""}
            gameConfig={gameConfig}
            tasks={tasks}
            playerState={playerState}
            leaderboard={leaderboard}
            seasonInfo={seasonInfo}
            league={league}
            missionBoardFilter={missionBoardFilter}
            setMissionBoardFilter={setMissionBoardFilter}
            filteredMissions={filteredMissions}
            selectedMission={selectedMission}
            openMissionDetails={openMissionDetails}
            activeMission={activeMission}
            missionTimeLeft={missionTimeLeft}
            missionFeedback={missionFeedback}
            runtimeRunModalOpen={runtimeRunModalOpen}
            setRuntimeRunModalOpen={setRuntimeRunModalOpen}
            runtimeRunStartMissionId={runtimeRunStartMissionId}
            setRuntimeRunStartMissionId={setRuntimeRunStartMissionId}
            onRuntimeFinish={() => loadRuntimeScenario("active")}
            username={username}
            levelProgress={levelProgress}
            runtimeResult={runtimeResult}
          />
        )}{" "}
        {page === "analytics" && <AnalyticsPage specs={specs} />}
        {page === "export" && (
          <div
            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                width: "100%",
                alignItems: "stretch",
              }}
            >
            {" "}
            <div style={{ ...styles.card, flex: "1 1 420px", minWidth: 0 }}>
              <div style={styles.cardHeaderRow}>
                <h3 style={styles.cardTitle}>📤 Export proposal</h3>
                <span style={styles.cardHint}>Multi-format · backlog · LLM</span>
              </div>
              <p style={styles.exportText}>
                Export at any time — the quality check shows what is still incomplete. Run{" "}
                <strong style={{ color: "#93c5fd" }}>Quality check</strong> for the full diagnostic. Client-side exports use
                the sections in your browser; <strong style={{ color: "#fde68a" }}>Word (.docx)</strong> uses the last saved
                server copy (Save spec first).
              </p>
              {!specId ? (
                <p style={styles.cardHint}>Select a specification from Home or the studio first.</p>
              ) : (
                <>
                  <p style={{ ...styles.cardHint, marginBottom: 8 }}>
                    Active spec #{specId} — {qualityDiagnostics.emptyCount} empty section(s) · 6D checklist{" "}
                    {qualityDiagnostics.sixDoneCount}/6 marked done.
                  </p>
                  <button
                    type="button"
                    style={{ ...styles.secondaryButton, marginBottom: qualityCheckExpanded ? 12 : 0 }}
                    onClick={() => setQualityCheckExpanded((v) => !v)}
                  >
                    {qualityCheckExpanded ? "▼ Hide quality check" : "▶ Run quality check"}
                  </button>
                  {qualityCheckExpanded ? (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "rgba(15,23,42,0.65)",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc", marginBottom: 8 }}>
                        Diagnostic report
                      </div>
                      {qualityDiagnostics.incompleteSixD.length ? (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ ...styles.cardHint, marginBottom: 6 }}>6D phases not checked done:</div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 13 }}>
                            {qualityDiagnostics.incompleteSixD.map((p) => (
                              <li key={p.id}>{p.title}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {qualityDiagnostics.criticalEmpty.length ? (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ ...styles.cardHint, marginBottom: 6 }}>
                            High-impact sections still empty (gameplay / rules / rewards / mechanics):
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "#fca5a5", fontSize: 13 }}>
                            {qualityDiagnostics.criticalEmpty.map((key) => (
                              <li key={key}>{key.split("::")[1] || key}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {emptySectionsForExport.length > 0 ? (
                        <div
                          style={{
                            maxHeight: 200,
                            overflow: "auto",
                            border: "1px solid rgba(148,163,184,0.12)",
                            borderRadius: 10,
                            padding: 8,
                          }}
                        >
                          {emptySectionsForExport.slice(0, 25).map((key) => (
                            <div
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "6px 0",
                                borderBottom: "1px solid rgba(148,163,184,0.06)",
                              }}
                            >
                              <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                                {key.split("::")[0]} — {key.split("::")[1]}
                              </span>
                              <button
                                type="button"
                                style={styles.smallButton}
                                onClick={() => {
                                  setSelectedSection(key);
                                  setPage("spec");
                                }}
                              >
                                Open in Studio
                              </button>
                            </div>
                          ))}
                          {emptySectionsForExport.length > 25 ? (
                            <div style={styles.cardHint}>…and {emptySectionsForExport.length - 25} more empty</div>
                          ) : null}
                        </div>
                      ) : (
                        <p style={{ ...styles.cardHint, color: "#86efac", margin: 0 }}>All 25 sections have content.</p>
                      )}
                    </div>
                  ) : null}
                  <div style={{ ...styles.exportActionGrid }}>
                    <button
                      type="button"
                      style={styles.exportActionBtn}
                      disabled={!specId}
                      onClick={() => {
                        if (!activeSpecForExport) return;
                        exportHtmlProposalDownload(activeSpecForExport, sections, sectionOrder);
                        setResponseText("HTML proposal downloaded.");
                      }}
                    >
                      📄 HTML proposal
                      <span style={styles.exportActionHint}>Single-page document with nav</span>
                    </button>
                    <button
                      type="button"
                      style={styles.exportActionBtn}
                      disabled={!specId}
                      onClick={exportDocx}
                    >
                      📄 Word (.docx)
                      <span style={styles.exportActionHint}>Server export · includes analysis block</span>
                    </button>
                    <button
                      type="button"
                      style={styles.exportActionBtn}
                      disabled={!specId}
                      onClick={() => {
                        if (!activeSpecForExport) return;
                        exportSpecJsonDownload(activeSpecForExport, sections, sectionOrder);
                        setResponseText("JSON bundle downloaded.");
                      }}
                    >
                      📋 Export JSON
                      <span style={styles.exportActionHint}>Full section map for tools / repos</span>
                    </button>
                    <button
                      type="button"
                      style={styles.exportActionBtn}
                      disabled={!specId}
                      onClick={() => {
                        if (!activeSpecForExport) return;
                        exportMarkdownDownload(activeSpecForExport, sections, sectionOrder);
                        setResponseText("Markdown proposal downloaded.");
                      }}
                    >
                      📝 Markdown
                      <span style={styles.exportActionHint}>All sections as headings</span>
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: "1px solid rgba(148,163,184,0.15)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>
                      🗂️ Product backlog export
                    </div>
                    <p style={{ ...styles.cardHint, marginBottom: 10 }}>
                      Builds a flat backlog from bullets in objectives, profiles, mechanics, rewards, gameplay, rules,
                      assessment, and game management — handy for Jira / GitHub / Azure Boards import pipelines.
                    </p>
                    <div style={{ ...styles.exportActionGrid }}>
                      <button
                        type="button"
                        style={styles.exportActionBtn}
                        disabled={!specId}
                        onClick={() => {
                          if (!activeSpecForExport) return;
                          exportBacklogHtmlDownload(activeSpecForExport, sections, sectionOrder);
                          setResponseText("Backlog HTML downloaded.");
                        }}
                      >
                        📋 Backlog HTML
                      </button>
                      <button
                        type="button"
                        style={styles.exportActionBtn}
                        disabled={!specId}
                        onClick={() => {
                          if (!activeSpecForExport) return;
                          exportBacklogMarkdownDownload(activeSpecForExport, sections, sectionOrder);
                          setResponseText("Backlog Markdown downloaded.");
                        }}
                      >
                        📋 Backlog Markdown
                      </button>
                      <button
                        type="button"
                        style={styles.exportActionBtn}
                        disabled={!specId}
                        onClick={() => {
                          if (!activeSpecForExport) return;
                          exportBacklogCsvDownload(activeSpecForExport, sections, sectionOrder);
                          setResponseText("Backlog CSV downloaded.");
                        }}
                      >
                        📋 Backlog CSV
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      style={{ ...styles.exportActionBtn, width: "100%", minHeight: 52 }}
                      disabled={!specId}
                      onClick={() => {
                        if (!activeSpecForExport) return;
                        exportLlmDevPromptDownload(
                          activeSpecForExport,
                          sections,
                          sectionOrder,
                          emptySectionsForExport,
                        );
                        setResponseText("LLM dev prompt (.txt) downloaded.");
                      }}
                    >
                      🤖 LLM dev prompt
                      <span style={styles.exportActionHint}>
                        Download a starter prompt for an external LLM (architecture + sprint tasks)
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>{" "}
            <div
              style={{
                ...styles.card,
                flex: "1 1 360px",
                minWidth: 0,
                position: "sticky",
                top: 20,
                alignSelf: "flex-start",
              }}
            >
              {" "}
              <div style={styles.cardHeaderRow}>
                {" "}
                <h3 style={styles.cardTitle}>6D framework checklist</h3>{" "}
                <span style={styles.cardHint}>Before download</span>{" "}
              </div>{" "}
              <p style={{ ...styles.cardHint, marginBottom: 12 }}>
                {" "}
                Same checklist as Spec Studio. DOCX is built from the saved
                server copy — use Save spec after edits, then Export DOCX.{" "}
              </p>{" "}
              <SixDChecklist
                value={sections[SIX_D_META_KEY]}
                disabled={isSpecLocked || !specId}
                styles={styles}
                onChange={(next) =>
                  setSections((prev) => ({ ...prev, [SIX_D_META_KEY]: next }))
                }
              />{" "}
              <p style={{ ...styles.cardHint, marginTop: 12, fontSize: 12 }}>
                {" "}
                Export embeds this checklist under “6D framework checklist
                (stored metadata)” when present.{" "}
              </p>{" "}
              <button
                type="button"
                style={{ ...styles.secondaryButton, marginTop: 10 }}
                onClick={saveSpec}
                disabled={isSpecLocked || !specId}
              >
                {" "}
                Save spec (persist 6D + sections){" "}
              </button>{" "}
            </div>{" "}
            </div>
            <div style={{ ...styles.card, width: "100%", minWidth: 0 }}>
              <div style={styles.cardHeaderRow}>
                <h3 style={styles.cardTitle}>Embeddable widget code</h3>
                <span style={styles.cardHint}>Script tag · spec_id + API base baked in</span>
              </div>
              <p style={styles.exportText}>
                Drop this snippet on any page where you want a button or CTA to record events against this spec via{" "}
                <code style={{ color: "#93c5fd" }}>/api/v1/events</code>. Replace{" "}
                <code style={{ color: "#fbbf24" }}>YOUR_API_KEY</code> with the deployment key from Runtime Lab → Phase
                2 (Load deployment package).
              </p>
              {!specId ? (
                <p style={styles.cardHint}>Select a spec first.</p>
              ) : (
                <textarea
                  readOnly
                  value={embedWidgetCode}
                  onFocus={(e) => e.target.select()}
                  style={{
                    width: "100%",
                    minHeight: 220,
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(15,23,42,0.95)",
                    color: "#e2e8f0",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    lineHeight: 1.45,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>{" "}
          </div>
        )}{" "}
        {resultModalOpen && lastMissionResult && (
          <div style={styles.modalOverlay}>
            {" "}
            <div style={styles.modalCard}>
              {" "}
              <div style={styles.modalTitle}>
                {lastMissionResult.success
                  ? "Mission Success"
                  : "Mission Failed"}
              </div>{" "}
              <div style={styles.modalText}>
                {" "}
                {lastMissionResult.success
                  ? `You earned ${lastMissionResult.earned_xp} XP.`
                  : "No XP earned this round."}
                <br /> Correct Option: {lastMissionResult.correct_option}
                <br />{" "}
                {lastMissionResult.selected_option
                  ? `Your Option: ${lastMissionResult.selected_option}`
                  : "You did not submit a valid option."}
                <br /> {lastMissionResult.explanation}{" "}
              </div>{" "}
              <div style={styles.cardHint}>
                {" "}
                {lastMissionResult.level_up
                  ? "Level Up achieved!"
                  : "Keep pushing to level up."}{" "}
                {(lastMissionResult.unlocked_badges || []).length
                  ? ` | New badges: ${lastMissionResult.unlocked_badges.join(", ")}`
                  : ""}{" "}
              </div>{" "}
              <div style={styles.modalActions}>
                {" "}
                <button
                  style={styles.primaryButton}
                  onClick={() => setResultModalOpen(false)}
                >
                  Continue
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}
        {aiModalOpen && (
          <div style={styles.modalOverlay}>
            {" "}
            <div style={{ ...styles.modalCard, maxWidth: 900 }}>
              {" "}
              <div style={styles.modalTitle}>AI Fill Selected</div>{" "}
              <div style={styles.modalText}>
                {" "}
                Section:{" "}
                {aiTargetSectionKey
                  ? aiTargetSectionKey.split("::")[1]
                  : "-"}{" "}
              </div>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) minmax(220px,32%)",
                  gap: 18,
                  alignItems: "start",
                }}
              >
                {" "}
                <div>
                  {" "}
                  <div style={styles.label}>Context</div>{" "}
                  <textarea
                    value={aiContextDraft}
                    onChange={(e) => setAiContextDraft(e.target.value)}
                    style={{ ...styles.textareaLarge, minHeight: 110 }}
                  />{" "}
                  <div style={styles.label}>Preview (edit if needed)</div>{" "}
                  <textarea
                    value={aiPreviewSuggestion}
                    disabled={aiModalLoading}
                    onChange={(e) => setAiPreviewSuggestion(e.target.value)}
                    style={{ ...styles.textareaLarge, minHeight: 180 }}
                  />{" "}
                  {aiModalLoading ? (
                    <div style={styles.cardHint}>Generating with AI...</div>
                  ) : null}{" "}
                  {!aiModalLoading && aiAlignmentReport ? (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(15,23,42,0.92)",
                        border: "1px solid rgba(59,130,246,0.22)",
                        maxHeight: 260,
                        overflow: "auto",
                      }}
                    >
                      {" "}
                      <div
                        style={{
                          ...styles.cardHint,
                          fontWeight: 700,
                          marginBottom: 8,
                          color: "#93c5fd",
                        }}
                      >
                        GamifyOnt alignment (HEXAD / MDA heuristic)
                      </div>{" "}
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        {" "}
                        Primary HEXAD signal:{" "}
                        <strong style={{ color: "#f8fafc" }}>
                          {aiAlignmentReport.hexad?.primary_guess || "—"}
                        </strong>{" "}
                      </div>{" "}
                      {aiAlignmentReport.warnings?.length ? (
                        <ul
                          style={{
                            margin: "0 0 8px 0",
                            paddingLeft: 18,
                            color: "#fdba74",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {" "}
                          {aiAlignmentReport.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}{" "}
                        </ul>
                      ) : null}{" "}
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          marginBottom: 6,
                        }}
                      >
                        MDA coverage (0–1)
                      </div>{" "}
                      <div style={{ display: "grid", gap: 6 }}>
                        {" "}
                        {["mechanics", "dynamics", "aesthetics"].map((k) => {
                          const b = aiAlignmentReport.mda?.buckets?.[k];
                          const sc = typeof b?.score === "number" ? b.score : 0;
                          return (
                            <div key={k}>
                              {" "}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 11,
                                  color: "#cbd5e1",
                                }}
                              >
                                {" "}
                                <span>{k}</span>
                                <span>{sc.toFixed(2)}</span>
                              </div>{" "}
                              <div
                                style={{
                                  height: 6,
                                  borderRadius: 999,
                                  background: "rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                {" "}
                                <div
                                  style={{
                                    width: `${Math.round(sc * 100)}%`,
                                    height: "100%",
                                    background:
                                      "linear-gradient(90deg,#2563eb,#22c55e)",
                                  }}
                                />{" "}
                              </div>{" "}
                            </div>
                          );
                        })}{" "}
                      </div>{" "}
                      {aiAlignmentReport.mda?.notes?.length ? (
                        <ul
                          style={{
                            margin: "8px 0 0 0",
                            paddingLeft: 18,
                            color: "#94a3b8",
                            fontSize: 11,
                            lineHeight: 1.45,
                          }}
                        >
                          {" "}
                          {aiAlignmentReport.mda.notes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}{" "}
                        </ul>
                      ) : null}{" "}
                      <div
                        style={{
                          ...styles.cardHint,
                          marginTop: 8,
                          fontSize: 11,
                        }}
                      >
                        Scores reflect the generated draft; editing the preview
                        does not re-run the check until you generate again.
                      </div>{" "}
                    </div>
                  ) : null}{" "}
                </div>{" "}
                <div
                  style={{
                    borderLeft: "1px solid rgba(148,163,184,0.14)",
                    paddingLeft: 14,
                    alignSelf: "stretch",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#93c5fd",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                    }}
                  >
                    AI + theory bridge
                  </div>{" "}
                  {aiModalLoading ? (
                    <div style={styles.cardHint}>
                      Running ontology-aligned heuristics…
                    </div>
                  ) : aiAlignmentReport?.theory ? (
                    <>
                      {" "}
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginBottom: 6,
                        }}
                      >
                        Social climate (lexical)
                      </div>{" "}
                      <div
                        style={{
                          fontSize: 12,
                          color: "#e2e8f0",
                          lineHeight: 1.5,
                          marginBottom: 12,
                        }}
                      >
                        {aiAlignmentReport.theory.summary_en}
                      </div>{" "}
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginBottom: 6,
                        }}
                      >
                        SDT (keyword heuristic)
                      </div>{" "}
                      {(aiAlignmentReport.theory.sdt_support_tags_en || [])
                        .length ? (
                        (aiAlignmentReport.theory.sdt_support_tags_en || []).map(
                          (t, i) => (
                            <div
                              key={"sdte" + i}
                              style={{
                                fontSize: 11,
                                color: "#bfdbfe",
                                marginBottom: 6,
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: "rgba(37,99,235,0.12)",
                                border: "1px solid rgba(59,130,246,0.25)",
                                lineHeight: 1.45,
                              }}
                            >
                              {t}
                            </div>
                          ),
                        )
                      ) : (
                        <div
                          style={{
                            ...styles.cardHint,
                            fontSize: 11,
                            marginBottom: 10,
                          }}
                        >
                          No SDT tag above threshold — add autonomy, competence,
                          or belonging cues.
                        </div>
                      )}{" "}
                      {(
                        aiAlignmentReport.design_frameworks?.copilot_hints || []
                      ).length ? (
                        <div style={{ marginTop: 12 }}>
                          {" "}
                          <div
                            style={{
                              fontSize: 11,
                              color: "#fdba74",
                              fontWeight: 700,
                              marginBottom: 6,
                            }}
                          >
                            Co-pilot (Flow / Octalysis)
                          </div>{" "}
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: 16,
                              fontSize: 11,
                              color: "#fde68a",
                              lineHeight: 1.45,
                            }}
                          >
                            {" "}
                            {(
                              aiAlignmentReport.design_frameworks
                                ?.copilot_hints || []
                            ).map((h, i) => (
                              <li key={"cp" + i}>{h}</li>
                            ))}{" "}
                          </ul>{" "}
                        </div>
                      ) : null}{" "}
                    </>
                  ) : (
                    <div style={styles.cardHint}>
                      Generate text to see SDT + social mix labels.
                    </div>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <div style={styles.modalActions}>
                {" "}
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    setAiModalOpen(false);
                    setAiAlignmentReport(null);
                    setSections((prev) => ({
                      ...prev,
                      [aiTargetSectionKey]: aiPrevSectionValue,
                    }));
                  }}
                  disabled={aiModalLoading}
                >
                  Cancel
                </button>{" "}
                <button
                  style={styles.primaryButton}
                  onClick={aiApplySuggestion}
                  disabled={aiModalLoading || !aiPreviewSuggestion.trim()}
                >
                  Save
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {deleteModalOpen && (
          <div style={styles.modalOverlay}>
            {" "}
            <div style={styles.modalCard}>
              {" "}
              <div style={styles.modalTitle}>Delete Specification</div>{" "}
              <div style={styles.modalText}>
                {" "}
                Are you sure you want to delete specification #
                {specToDelete?.id}?{" "}
              </div>{" "}
              <div style={styles.modalActions}>
                {" "}
                <button style={styles.deleteButton} onClick={confirmDeleteSpec}>
                  {" "}
                  Delete{" "}
                </button>{" "}
                <button
                  style={styles.secondaryButton}
                  onClick={cancelDeleteSpec}
                >
                  {" "}
                  Cancel{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </main>{" "}
      </RealizationProvider>
    </div>
  );
}
function pageTitle(page) {
  if (page === "home") return "Home";
  if (page === "sixdwizard") return "6D specification wizard";
  if (page === "spec") return "Specification studio";
  if (page === "runtime") return "Runtime lab";
  if (page === "playerruntime") return "Player runtime";
  if (page === "analytics") return "Monitoring & analytics";
  return "Export & API";
}
function pageSubtitle(page) {
  if (page === "home")
    return "Summary metrics, specification list, and two-phase flow (specification → realization).";
  if (page === "sixdwizard")
    return "Horizontal 6D steps; last step opens the 25-section studio (with or without AI fill).";
  if (page === "spec")
    return "25 sections, 6D metadata, AI and ontology design document; validate, approve, realize.";
  if (page === "runtime")
    return "Behavioral pilot of tasks and points derived from an approved specification (not a game engine).";
  if (page === "playerruntime")
    return "Gamification UI from /api/v1/realize: quests, badges, rules, and persisted player progress.";
  if (page === "analytics")
    return "Preview and engagement signals: completion, badges, leaderboard.";
  return "DOCX specification and 6D checklist; outputs for integration.";
}
const styles = {
  authButtonRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  secondaryButtonWide: {
    width: "100%",
    height: 48,
    background: "rgba(31,41,55,0.9)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#fff",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  sectionDotFilled: {
    background: "#3b82f6",
    boxShadow: "0 0 10px rgba(59,130,246,0.35)",
  },
  sectionDotEmpty: {
    background: "#ef4444",
    boxShadow: "0 0 10px rgba(239,68,68,0.28)",
  },
  sectionDotPartial: {
    background: "#f59e0b",
    boxShadow: "0 0 8px rgba(245,158,11,0.35)",
  },
  runtimeHeroGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 18,
  },
  scenarioCard: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 22,
    padding: 22,
  },
  scenarioTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8 },
  scenarioText: {
    color: "#94a3b8",
    lineHeight: 1.7,
    fontSize: 14,
    marginBottom: 16,
  },
  runtimeStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  runtimeStatCard: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 16,
    padding: 14,
  },
  runtimeStatLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 6 },
  runtimeStatValue: { fontSize: 24, fontWeight: 800 },
  runtimeProgressWrap: { marginTop: 10 },
  runtimeProgressTrack: {
    height: 12,
    borderRadius: 999,
    background: "rgba(148,163,184,0.12)",
    overflow: "hidden",
    marginTop: 8,
  },
  runtimeProgressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb, #22c55e)",
  },
  badgePanel: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 },
  badgeChip: {
    padding: "9px 14px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.14)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: 600,
  },
  leaderboardCard: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 22,
    padding: 22,
  },
  leaderboardRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 90px 90px",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid rgba(148,163,184,0.06)",
  },
  leaderboardHeader: {
    color: "#94a3b8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,
  },
  leaderboardRank: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(37,99,235,0.18)",
    color: "#dbeafe",
    fontWeight: 800,
  },
  taskGrid: { display: "grid", gap: 12 },
  taskCardModern: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: "rgba(15,23,42,0.78)",
    border: "1px solid rgba(148,163,184,0.08)",
  },
  taskReward: { color: "#93c5fd", fontSize: 13, marginTop: 6 },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(2,6,23,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(6px)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: 22,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 12,
    color: "#f8fafc",
  },
  modalText: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#cbd5e1",
    marginBottom: 20,
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  loginPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #1f2a44 0%, #0b1220 48%, #060b13 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: 24,
    fontFamily: "Inter, Arial, sans-serif",
    color: "#fff",
  },
  loginGlowA: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(37,99,235,0.25)",
    filter: "blur(110px)",
    top: -40,
    left: -60,
  },
  loginGlowB: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(124,58,237,0.18)",
    filter: "blur(100px)",
    bottom: -40,
    right: -20,
  },
  loginCard: {
    width: "100%",
    maxWidth: 520,
    background: "rgba(17,24,39,0.88)",
    border: "1px solid rgba(148,163,184,0.14)",
    padding: 36,
    borderRadius: 28,
    boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(14px)",
    position: "relative",
    zIndex: 2,
  },
  loginBrand: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.14)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#bfdbfe",
    fontWeight: 700,
    marginBottom: 18,
  },
  loginTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
  },
  loginSubtitle: {
    color: "#94a3b8",
    marginBottom: 24,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 1.7,
  },
  appShell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    background: "linear-gradient(180deg, #07101c 0%, #0b1220 100%)",
    color: "#e5e7eb",
    fontFamily: "Inter, Arial, sans-serif",
  },
  sidebar: {
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRight: "1px solid rgba(148,163,184,0.08)",
  },
  logo: { margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" },
  logoSub: { color: "#94a3b8", marginTop: 6, marginBottom: 20, fontSize: 14 },
  navSectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#64748b",
    marginBottom: 6,
  },
  navButton: {
    height: 46,
    background: "transparent",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#cbd5e1",
    borderRadius: 14,
    cursor: "pointer",
    textAlign: "left",
    padding: "0 14px",
    fontSize: 15,
    fontWeight: 600,
  },
  navButtonActive: {
    height: 46,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "1px solid #2563eb",
    color: "#fff",
    borderRadius: 14,
    cursor: "pointer",
    textAlign: "left",
    padding: "0 14px",
    fontSize: 15,
    fontWeight: 700,
    boxShadow: "0 10px 20px rgba(37,99,235,0.22)",
  },
  sidebarCard: {
    marginTop: "auto",
    padding: 16,
    borderRadius: 18,
    background: "rgba(15,23,42,0.55)",
    border: "1px solid rgba(148,163,184,0.08)",
  },
  sidebarCardTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#94a3b8",
    marginBottom: 14,
  },
  sidebarMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    color: "#cbd5e1",
    fontSize: 14,
  },
  main: { padding: 28, overflow: "auto", minWidth: 0 },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    gap: 20,
  },
  topActions: { display: "flex", alignItems: "center", gap: 12 },
  systemBadge: {
    height: 42,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 600,
  },
  pageTitle: {
    margin: 0,
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  pageSubtitle: { color: "#94a3b8", marginTop: 8, fontSize: 15 },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 18,
    marginBottom: 18,
  },
  healthHeroRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },
  healthScore: { fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em" },
  healthSub: { color: "#94a3b8", fontSize: 14 },
  progressRingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
  },
  progressRingInner: {
    width: 86,
    height: 86,
    borderRadius: "50%",
    background: "#0f172a",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "#e5e7eb",
  },
  progressBlock: { marginBottom: 16 },
  progressLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    color: "#cbd5e1",
    fontSize: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    background: "rgba(148,163,184,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb, #38bdf8)",
  },
  progressFillSecondary: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #16a34a, #22c55e)",
  },
  timelineWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 22,
  },
  timelineStep: {
    minWidth: 120,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.10)",
    background: "rgba(15,23,42,0.72)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    color: "#94a3b8",
    fontWeight: 600,
  },
  timelineStepActive: {
    color: "#fff",
    border: "1px solid rgba(59,130,246,0.24)",
    background: "rgba(37,99,235,0.12)",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "rgba(148,163,184,0.5)",
  },
  timelineDotActive: {
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34,197,94,0.35)",
  },
  timelineConnector: {
    width: 24,
    height: 2,
    background: "rgba(148,163,184,0.18)",
    borderRadius: 999,
  },
  timelineConnectorActive: { background: "rgba(34,197,94,0.8)" },
  lifecycleNotes: { display: "grid", gap: 10 },
  lifecycleNoteItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#cbd5e1",
    fontSize: 14,
  },
  noteDotBlue: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#2563eb",
  },
  noteDotGreen: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
  },
  noteDotAmber: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#f59e0b",
  },
  metricsRowCompact: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.95), rgba(15,23,42,0.92))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 20,
    padding: 18,
  },
  metricCardCompact: { borderRadius: 16, padding: 14 },
  metricLabel: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" },
  card: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  cardHint: { color: "#94a3b8", fontSize: 13 },
  inlineBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.12)",
    border: "1px solid rgba(59,130,246,0.18)",
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: 600,
  },
  label: {
    display: "block",
    marginBottom: 8,
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 600,
  },
  fieldGroup: { marginBottom: 14 },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.85)",
    color: "#fff",
    padding: "0 14px",
    boxSizing: "border-box",
    fontSize: 15,
    outline: "none",
  },
  textareaLarge: {
    width: "100%",
    minHeight: 100,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.85)",
    color: "#fff",
    padding: 14,
    boxSizing: "border-box",
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 1.7,
    outline: "none",
    resize: "vertical",
  },
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 },
  primaryButton: {
    height: 44,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "none",
    color: "#fff",
    borderRadius: 14,
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 10px 20px rgba(37,99,235,0.2)",
  },
  primaryButtonWide: {
    width: "100%",
    height: 48,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "none",
    color: "#fff",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    boxShadow: "0 10px 20px rgba(37,99,235,0.2)",
  },
  secondaryButton: {
    height: 44,
    background: "rgba(31,41,55,0.9)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#fff",
    borderRadius: 14,
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  deleteButton: {
    height: 36,
    background: "rgba(220,38,38,0.18)",
    border: "1px solid rgba(248,113,113,0.28)",
    color: "#fecaca",
    borderRadius: 10,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  lockedButton: {
    height: 36,
    background: "rgba(71,85,105,0.35)",
    border: "1px solid rgba(148,163,184,0.18)",
    color: "#cbd5e1",
    borderRadius: 10,
    padding: "0 12px",
    cursor: "not-allowed",
    fontWeight: 600,
    opacity: 0.75,
  },
  smallButton: {
    height: 36,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  responseBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 1.6,
  },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  tableHeaderLeft: {
    textAlign: "left",
    padding: "14px 16px",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 700,
    borderBottom: "1px solid rgba(148,163,184,0.10)",
  },
  tableHeaderCenter: {
    textAlign: "center",
    padding: "14px 16px",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 700,
    borderBottom: "1px solid rgba(148,163,184,0.10)",
  },
  tableCellLeft: {
    textAlign: "left",
    padding: "14px 16px",
    color: "#f8fafc",
    fontSize: 14,
    borderBottom: "1px solid rgba(148,163,184,0.06)",
    verticalAlign: "middle",
  },
  tableCellCenter: {
    textAlign: "center",
    padding: "14px 16px",
    color: "#f8fafc",
    fontSize: 14,
    borderBottom: "1px solid rgba(148,163,184,0.06)",
    verticalAlign: "middle",
  },
  statusBadge: {
    color: "#fff",
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    display: "inline-block",
  },
  infoPanel: {
    background: "rgba(15,23,42,0.7)",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 16,
    padding: 14,
  },
  infoPanelTitle: { fontSize: 14, fontWeight: 700, marginBottom: 10 },
  preCompact: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "#cbd5e1",
    lineHeight: 1.55,
    fontSize: 13,
    margin: 0,
    minHeight: 120,
  },
  specStudioShell: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 20,
    alignItems: "start",
  },
  specSidebar: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 22,
    padding: 18,
    maxHeight: "calc(100vh - 220px)",
    overflow: "auto",
    position: "sticky",
    top: 20,
  },
  specSidebarTitle: { fontSize: 18, fontWeight: 700, marginBottom: 14 },
  specSidebarSearch: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(15,23,42,0.85)",
    color: "#fff",
    padding: "0 12px",
    marginBottom: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  specSectionButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.10)",
    background: "rgba(15,23,42,0.72)",
    color: "#e5e7eb",
    padding: "10px 12px",
    marginBottom: 10,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  specSectionButtonActive: {
    background: "rgba(37,99,235,0.14)",
    border: "1px solid rgba(59,130,246,0.26)",
  },
  specSectionCode: { fontSize: 12, color: "#93c5fd", fontWeight: 700 },
  specSectionName: { fontSize: 13, lineHeight: 1.35, color: "#cbd5e1" },
  specMainPanel: { display: "grid", gap: 18 },
  specToolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  specEditorCard: {
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
    border: "1px solid rgba(148,163,184,0.08)",
    borderRadius: 22,
    padding: 22,
  },
  specEditorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  specEditorMeta: {
    fontSize: 13,
    color: "#93c5fd",
    fontWeight: 700,
    marginBottom: 6,
  },
  specEditorTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  specEditorTextarea: {
    width: "100%",
    minHeight: 500,
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.9)",
    color: "#fff",
    padding: 18,
    boxSizing: "border-box",
    fontSize: 14,
    lineHeight: 1.8,
    outline: "none",
    resize: "vertical",
  },
  specMiniGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "#cbd5e1",
    lineHeight: 1.7,
    fontSize: 14,
    margin: 0,
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 16,
    marginBottom: 10,
    background: "rgba(15,23,42,0.78)",
  },
  taskTitle: { fontWeight: 700, marginBottom: 4 },
  taskMeta: { color: "#94a3b8", fontSize: 13 },
  badgesWrap: { display: "flex", gap: 10, flexWrap: "wrap" },
  badgeTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.12)",
    border: "1px solid rgba(59,130,246,0.18)",
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: 600,
  },
  exportText: { color: "#cbd5e1", lineHeight: 1.8, marginBottom: 16 },
  exportActionGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    marginTop: 16,
  },
  exportActionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(15,23,42,0.75)",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    minHeight: 56,
  },
  exportActionHint: {
    fontSize: 11,
    fontWeight: 500,
    color: "#94a3b8",
    lineHeight: 1.35,
  },
};
export default App;

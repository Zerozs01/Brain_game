const GAME_COLORS = [
  { word: "red", hex: "#ff3b30" },
  { word: "blue", hex: "#007aff" },
  { word: "green", hex: "#34c759" },
  { word: "yellow", hex: "#ffcc00" },
  { word: "black", hex: "#222222" }
];

const GAME_METADATA = Object.freeze({
  color_match: {
    label: "Color Match",
    cognitiveDomain: "speed"
  },
  color_memory: {
    label: "Color Memory",
    cognitiveDomain: "memory"
  },
  sequence_memory: {
    label: "Sequence Memory",
    cognitiveDomain: "memory"
  }
});

const DOMAIN_LABELS = Object.freeze({
  speed: "Speed",
  memory: "Memory",
  attention: "Attention",
  flexibility: "Flexibility",
  problem_solving: "Problem Solving",
  math: "Math",
  unassigned: "Unassigned"
});

const PRIMARY_DOMAIN_KEYS = Object.freeze([
  "speed",
  "memory",
  "attention",
  "flexibility",
  "problem_solving",
  "math"
]);

const SCORE_REFERENCE_BY_GAME = Object.freeze({
  color_match: 6000,
  color_memory: 50
});

const SOUND_GAME_TYPE_PREFIXES = Object.freeze(["sound_", "audio_"]);

const appState = {
  activeView: "dashboardView",
  topClockSeconds: 165,
  topScore: 12400,
  playerName: "Alex Rivera",
  dbReady: false,
  stats: {
    overview: null,
    filters: {
      gameType: "all",
      cognitiveDomain: "all"
    }
  },
  colorMatch: {
    score: 0,
    timeLeft: 60,
    isPlaying: false,
    multiplier: 1,
    peakMultiplier: 1,
    streak: 0,
    answers: 0,
    correct: 0,
    isMatch: false,
    leftWord: "yellow",
    rightWord: "blue",
    rightHex: "#007aff",
    timerId: null,
    roundDelayId: null,
    feedbackClearId: null,
    roundStartedAtMs: 0,
    responseTimesMs: [],
    locked: false,
    sessionSaved: false
  },
  colorMemory: {
    totalRounds: 5,
    round: 1,
    totalScore: 0,
    roundScores: [],
    previousTarget: null,
    target: { h: 180, s: 70, b: 80 },
    guess: { h: 180, s: 50, b: 50 },
    phase: "idle",
    memorizeIntervalId: null,
    memorizeTimeoutId: null,
    adjustStartedAt: 0,
    isComplete: false,
    summaryVisible: false,
    lastSpeedBonus: 0,
    sessionSaved: false
  }
};

const refs = {
  topStatusBar: document.getElementById("topStatusBar"),
  mainShell: document.getElementById("mainShell"),
  topTime: document.getElementById("topTime"),
  topScore: document.getElementById("topScore"),
  playerLabel: document.getElementById("playerLabel"),
  cmTime: document.getElementById("cmTime"),
  cmScore: document.getElementById("cmScore"),
  cmMultiplier: document.getElementById("cmMultiplier"),
  cmStreakDots: document.getElementById("cmStreakDots"),
  cmLeftWord: document.getElementById("cmLeftWord"),
  cmRightWord: document.getElementById("cmRightWord"),
  cmFeedback: document.getElementById("cmFeedback"),
  cmNoBtn: document.getElementById("cmNoBtn"),
  cmYesBtn: document.getElementById("cmYesBtn"),
  cmOverlay: document.getElementById("cmOverlay"),
  cmOverlayKicker: document.getElementById("cmOverlayKicker"),
  cmOverlayTitle: document.getElementById("cmOverlayTitle"),
  cmOverlayText: document.getElementById("cmOverlayText"),
  cmOverlayAction: document.getElementById("cmOverlayAction"),
  cmResetBtn: document.getElementById("cmResetBtn"),
  cmResultModal: document.getElementById("cmResultModal"),
  cmResultScore: document.getElementById("cmResultScore"),
  cmResultTagline: document.getElementById("cmResultTagline"),
  cmResultAccuracy: document.getElementById("cmResultAccuracy"),
  cmResultCorrect: document.getElementById("cmResultCorrect"),
  cmResultWrong: document.getElementById("cmResultWrong"),
  cmResultAvgResponse: document.getElementById("cmResultAvgResponse"),
  cmResultPeak: document.getElementById("cmResultPeak"),
  cmResultRank: document.getElementById("cmResultRank"),
  cmResultTop10: document.getElementById("cmResultTop10"),
  cmResultBars: document.getElementById("cmResultBars"),
  cmResultPlayAgain: document.getElementById("cmResultPlayAgain"),
  cmResultBack: document.getElementById("cmResultBack"),
  statsTotalSessions: document.getElementById("statsTotalSessions"),
  statsOverallLpi: document.getElementById("statsOverallLpi"),
  statsLpiCoverage: document.getElementById("statsLpiCoverage"),
  statsLastPlayed: document.getElementById("statsLastPlayed"),
  statsTotalPlayTime: document.getElementById("statsTotalPlayTime"),
  statsDomainOverview: document.getElementById("statsDomainOverview"),
  statsTopByGame: document.getElementById("statsTopByGame"),
  statsCompareModal: document.getElementById("statsCompareModal"),
  statsCompareTitle: document.getElementById("statsCompareTitle"),
  statsCompareSummary: document.getElementById("statsCompareSummary"),
  statsCompareTop10: document.getElementById("statsCompareTop10"),
  statsCompareHistory: document.getElementById("statsCompareHistory"),
  statsCompareCloseBtn: document.getElementById("statsCompareCloseBtn"),
  statsDbStatus: document.getElementById("statsDbStatus"),
  statsEmpty: document.getElementById("statsEmpty"),
  statsList: document.getElementById("statsList"),
  statsRefreshBtn: document.getElementById("statsRefreshBtn"),
  dashTodaySessions: document.getElementById("dashTodaySessions"),
  dashAllSessions: document.getElementById("dashAllSessions"),
  dashTodayPlayTime: document.getElementById("dashTodayPlayTime"),
  dashWeekActiveLabel: document.getElementById("dashWeekActiveLabel"),
  dashWeekBars: document.getElementById("dashWeekBars"),
  dashSoundWeekLabel: document.getElementById("dashSoundWeekLabel"),
  dashSoundWeekBars: document.getElementById("dashSoundWeekBars"),
  dashboardHistoryList: document.getElementById("dashboardHistoryList"),
  dashboardHistoryWindow: document.getElementById("dashboardHistoryWindow"),
  memRoundTitle: document.getElementById("memRoundTitle"),
  memRoundHud: document.getElementById("memRoundHud"),
  memTotalScoreHud: document.getElementById("memTotalScoreHud"),
  memProgress: document.getElementById("memProgress"),
  memStartBtn: document.getElementById("memStartBtn"),
  memMemorizePanel: document.getElementById("memMemorizePanel"),
  memAdjustPanel: document.getElementById("memAdjustPanel"),
  memResultModal: document.getElementById("memResultModal"),
  memResultCard: document.getElementById("memResultCard"),
  memSummaryScreen: document.getElementById("memSummaryScreen"),
  memSummaryPlayAgain: document.getElementById("memSummaryPlayAgain"),
  memSummaryBack: document.getElementById("memSummaryBack"),
  memResultTop10Section: document.getElementById("memResultTop10Section"),
  memResultTop10: document.getElementById("memResultTop10"),
  memResultRank: document.getElementById("memResultRank"),
  memTargetSwatch: document.getElementById("memTargetSwatch"),
  memCountdown: document.getElementById("memCountdown"),
  memSkipBtn: document.getElementById("memSkipBtn"),
  memHueSlider: document.getElementById("memHueSlider"),
  memSatSlider: document.getElementById("memSatSlider"),
  memBriSlider: document.getElementById("memBriSlider"),
  memHueValue: document.getElementById("memHueValue"),
  memSatValue: document.getElementById("memSatValue"),
  memBriValue: document.getElementById("memBriValue"),
  memCurrentHex: document.getElementById("memCurrentHex"),
  memPreview: document.getElementById("memPreview"),
  memConfirmBtn: document.getElementById("memConfirmBtn"),
  memDialedCard: document.getElementById("memDialedCard"),
  memDialedGuess: document.getElementById("memDialedGuess"),
  memDialedOriginal: document.getElementById("memDialedOriginal"),
  memDialedStep: document.getElementById("memDialedStep"),
  memRoundScoreValue: document.getElementById("memRoundScoreValue"),
  memRoundCaption: document.getElementById("memRoundCaption"),
  memGuessHsb: document.getElementById("memGuessHsb"),
  memTargetHsb: document.getElementById("memTargetHsb"),
  memRoundSummaryMeta: document.getElementById("memRoundSummaryMeta"),
  memRoundLog: document.getElementById("memRoundLog"),
  memHueMeta: document.getElementById("memHueMeta"),
  memSatMeta: document.getElementById("memSatMeta"),
  memBriMeta: document.getElementById("memBriMeta"),
  memHueFill: document.getElementById("memHueFill"),
  memSatFill: document.getElementById("memSatFill"),
  memBriFill: document.getElementById("memBriFill"),
  memHueScore: document.getElementById("memHueScore"),
  memSatScore: document.getElementById("memSatScore"),
  memBriScore: document.getElementById("memBriScore"),
  memTotalScore: document.getElementById("memTotalScore"),
  memAverageError: document.getElementById("memAverageError"),
  memAverageErrorInline: document.getElementById("memAverageErrorInline"),
  memSpeedBonus: document.getElementById("memSpeedBonus"),
  memSpeedInline: document.getElementById("memSpeedInline"),
  memNextBtn: document.getElementById("memNextBtn")
};

const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const launchButtons = Array.from(document.querySelectorAll("[data-launch]"));
const backButtons = Array.from(document.querySelectorAll("[data-back]"));
const views = Array.from(document.querySelectorAll(".view"));
const statsGameFilterButtons = Array.from(document.querySelectorAll("[data-game-filter]"));
const statsDomainFilterButtons = Array.from(document.querySelectorAll("[data-domain-filter]"));

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatScore(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatShortDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatGameTypeLabel(gameType) {
  const metadata = GAME_METADATA[String(gameType || "").toLowerCase()];
  if (metadata) {
    return metadata.label;
  }

  return String(gameType || "Unknown").replaceAll("_", " ");
}

/**
 * Calculate Sequence Memory Score based on Human Benchmark Distribution
 * Average peak is Level 9. Elite tier starts at Level 14+.
 * @param {number} finalLevel - The level the user reached before failing
 * @returns {number} - Weighted score
 */
function calculateSequenceScore(finalLevel) {
  const AVERAGE_PEAK = 9;
  
  if (finalLevel <= 1) return 0;

  let score = 0;

  if (finalLevel <= AVERAGE_PEAK) {
    // Linear scaling: เลเวลละ 5 แต้ม (Max 40 แต้มที่จุดเฉลี่ย)
    score = (finalLevel - 1) * 5;
  } else {
    // Exponential scaling: ทะลุค่าเฉลี่ยปุ๊บ คะแนนจะก้าวกระโดด
    const baseScore = 40; 
    const extraLevels = finalLevel - AVERAGE_PEAK;
    
    // บูสต์ด้วย Base multiplier + Exponential curve
    score = baseScore + (extraLevels * 10) + (Math.pow(extraLevels, 2) * 2);
  }

  return Math.floor(score);
}

function resolveGameDomain(gameType, cognitiveDomain) {
  const explicit = String(cognitiveDomain || "").trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const metadata = GAME_METADATA[String(gameType || "").toLowerCase()];
  return metadata?.cognitiveDomain || "unassigned";
}

function formatDomainLabel(domain) {
  const normalized = String(domain || "").toLowerCase();
  return DOMAIN_LABELS[normalized] || DOMAIN_LABELS.unassigned;
}

function resolveGameTrack(gameType) {
  const normalized = String(gameType || "").toLowerCase();
  const isSoundGame = SOUND_GAME_TYPE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  return isSoundGame ? "sound" : "visual";
}

function getGameIconSymbol(gameType) {
  const normalized = String(gameType || "").toLowerCase();
  if (normalized === "color_memory") {
    return "icon-memory";
  }

  if (resolveGameTrack(normalized) === "sound") {
    return "icon-sound";
  }

  return "icon-bolt";
}

function formatDurationLabel(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.round(safeSeconds / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return `${minutes}m`;
}

function formatResponseTimeLabel(milliseconds) {
  const safe = Number(milliseconds);
  if (!Number.isFinite(safe) || safe <= 0) {
    return "-";
  }

  return `${(safe / 1000).toFixed(2)}s`;
}

function normalizeScoreForLpi(gameType, score) {
  const safeScore = Math.max(0, Number(score || 0));
  const reference = SCORE_REFERENCE_BY_GAME[String(gameType || "").toLowerCase()];

  if (!reference) {
    return clamp(safeScore, 0, 100);
  }

  return clamp((safeScore / reference) * 100, 0, 100);
}

function buildLpiBreakdown(historyItems) {
  const domainMap = new Map(
    PRIMARY_DOMAIN_KEYS.map((domainKey) => [domainKey, {
      sessions: 0,
      scoreSum: 0,
      accuracySum: 0,
      accuracyCount: 0
    }])
  );

  (historyItems || []).forEach((item) => {
    const domainKey = resolveGameDomain(item.gameType, item.cognitiveDomain);
    if (!domainMap.has(domainKey)) {
      return;
    }

    const bucket = domainMap.get(domainKey);
    bucket.sessions += 1;
    bucket.scoreSum += normalizeScoreForLpi(item.gameType, item.score);

    const accuracyValue = Number(item.accuracy);
    if (item.accuracy !== null && Number.isFinite(accuracyValue)) {
      bucket.accuracySum += accuracyValue;
      bucket.accuracyCount += 1;
    }
  });

  const byDomain = PRIMARY_DOMAIN_KEYS.map((domainKey) => {
    const bucket = domainMap.get(domainKey);

    if (!bucket || bucket.sessions === 0) {
      return {
        cognitiveDomain: domainKey,
        sessions: 0,
        lpi: null
      };
    }

    const scoreComponent = bucket.scoreSum / bucket.sessions;
    const accuracyComponent = bucket.accuracyCount > 0
      ? bucket.accuracySum / bucket.accuracyCount
      : scoreComponent;

    return {
      cognitiveDomain: domainKey,
      sessions: bucket.sessions,
      lpi: clamp(scoreComponent * 0.7 + accuracyComponent * 0.3, 0, 100)
    };
  });

  const activeDomains = byDomain.filter((item) => item.lpi !== null);
  const overallLpi = activeDomains.length
    ? activeDomains.reduce((sum, item) => sum + Number(item.lpi || 0), 0) / activeDomains.length
    : 0;

  return {
    byDomain,
    activeDomainCount: activeDomains.length,
    overallLpi
  };
}

function compareTopEntries(a, b) {
  const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
  if (Math.abs(scoreDiff) > 0.0001) {
    return scoreDiff;
  }

  const aTime = parseSessionDate(a.createdAt)?.getTime() || 0;
  const bTime = parseSessionDate(b.createdAt)?.getTime() || 0;
  return bTime - aTime;
}

function getTopByGameGroups(overview) {
  if (Array.isArray(overview?.topByGame) && overview.topByGame.length) {
    return overview.topByGame.map((group) => ({
      gameType: group.gameType,
      cognitiveDomain: resolveGameDomain(group.gameType, group.cognitiveDomain),
      entries: (group.entries || []).map((entry) => ({
        rank: Number(entry.rank || 0),
        score: Number(entry.score || 0),
        accuracy: entry.accuracy === null ? null : Number(entry.accuracy),
        createdAt: entry.createdAt
      }))
    }));
  }

  const byGameMap = new Map();
  (overview?.history || []).forEach((item) => {
    const gameType = item.gameType;
    const existing = byGameMap.get(gameType) || {
      gameType,
      cognitiveDomain: resolveGameDomain(gameType, item.cognitiveDomain),
      entries: []
    };

    existing.entries.push({
      score: Number(item.score || 0),
      accuracy: item.accuracy === null ? null : Number(item.accuracy),
      createdAt: item.createdAt
    });

    byGameMap.set(gameType, existing);
  });

  return Array.from(byGameMap.values())
    .map((group) => {
      const rankedEntries = group.entries
        .sort(compareTopEntries)
        .slice(0, 10)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

      return {
        ...group,
        entries: rankedEntries
      };
    })
    .sort((a, b) => String(a.gameType).localeCompare(String(b.gameType)));
}

function buildTopTenPack(gameType, currentScore) {
  const safeGameType = String(gameType || "").toLowerCase();
  const groups = getTopByGameGroups(appState.stats.overview);
  const targetGroup = groups.find((group) => String(group.gameType || "").toLowerCase() === safeGameType);

  const pool = (targetGroup?.entries || []).map((entry) => ({
    score: Number(entry.score || 0),
    accuracy: entry.accuracy === null ? null : Number(entry.accuracy),
    createdAt: entry.createdAt,
    isCurrent: false
  }));

  const includeCurrent = Number.isFinite(Number(currentScore));
  if (includeCurrent) {
    pool.push({
      score: Number(currentScore),
      accuracy: null,
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      isCurrent: true
    });
  }

  pool.sort(compareTopEntries);

  const currentRankRaw = includeCurrent ? pool.findIndex((entry) => entry.isCurrent) + 1 : 0;
  const currentRank = currentRankRaw > 0 ? currentRankRaw : null;

  const topTen = pool.slice(0, 10).map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));

  return {
    topTen,
    currentRank
  };
}

function renderTopTenList(container, entries) {
  if (!container) {
    return;
  }

  container.textContent = "";

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "result-top10-empty";
    emptyItem.textContent = "No ranked sessions yet.";
    container.appendChild(emptyItem);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("li");
    row.className = "result-top10-item";
    if (entry.isCurrent) {
      row.classList.add("current");
    }

    row.innerHTML = `
      <span class="top-rank">#${entry.rank}</span>
      <strong class="top-score">${Number(entry.score || 0).toFixed(2)}</strong>
      <time>${formatShortDateTime(entry.createdAt)}</time>
    `;

    container.appendChild(row);
  });
}

function renderResultTopTen(gameType, currentScore, listRef, rankRef) {
  if (!listRef) {
    return;
  }

  const topPack = buildTopTenPack(gameType, currentScore);
  renderTopTenList(listRef, topPack.topTen);

  if (rankRef) {
    rankRef.textContent = topPack.currentRank ? `Rank #${topPack.currentRank}` : "Rank -";
  }
}

async function ensureDatabaseUser() {
  if (!window.brainDb?.ensureUser) {
    refs.statsDbStatus.textContent = "SQLite unavailable in this runtime.";
    return;
  }

  try {
    const user = await window.brainDb.ensureUser(appState.playerName);
    if (user?.username) {
      appState.playerName = user.username;
    }

    appState.dbReady = true;
    refs.statsDbStatus.textContent = "SQLite connected";
  } catch (error) {
    appState.dbReady = false;
    refs.statsDbStatus.textContent = "SQLite connection failed";
  }
}

async function saveSessionToDatabase(payload) {
  if (!appState.dbReady || !window.brainDb?.addSession) {
    return;
  }

  try {
    const resolvedDomain = resolveGameDomain(payload?.gameType, payload?.cognitiveDomain);

    await window.brainDb.addSession({
      username: appState.playerName,
      cognitiveDomain: resolvedDomain,
      ...payload
    });
  } catch (error) {
    refs.statsDbStatus.textContent = "Write error while saving session";
  }
}

function renderStatsHistoryRows(items) {
  refs.statsList.textContent = "";

  if (!items.length) {
    refs.statsEmpty.textContent = "No sessions found for the current filters.";
    refs.statsEmpty.classList.remove("hidden");
    return;
  }

  refs.statsEmpty.classList.add("hidden");

  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "stats-row";

    const sessionDurationText = formatDurationLabel(getSessionDurationSeconds(item));
    const domainLabel = formatDomainLabel(resolveGameDomain(item.gameType, item.cognitiveDomain));
    const accuracyText = item.accuracy === null ? "-" : `${item.accuracy.toFixed(1)}%`;
    const peakText = item.peakMultiplier === null ? "-" : `x${item.peakMultiplier}`;

    row.innerHTML = `
      <p class="stats-type">${formatGameTypeLabel(item.gameType)}</p>
      <div class="stats-main">
        <strong>${item.score.toFixed(2)}</strong>
        <p>${domainLabel} · Accuracy ${accuracyText} · Peak ${peakText}</p>
      </div>
      <p class="stats-meta">${formatShortDateTime(item.createdAt)} · ${sessionDurationText}</p>
      <button class="stats-delete-btn" type="button" data-delete-session="${item.id}">Delete</button>
    `;

    refs.statsList.appendChild(row);
  });
}

function parseSessionDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getSessionDurationSeconds(item) {
  if (item.durationSeconds !== null && item.durationSeconds !== undefined) {
    return Math.max(0, Number(item.durationSeconds || 0));
  }

  if (item.gameType === "color_match") {
    return 60;
  }

  if (item.gameType === "color_memory") {
    return Math.max(1, Number(item.roundCount || 5)) * 8;
  }

  return 0;
}

function formatPlayTime(seconds) {
  return formatDurationLabel(seconds);
}

function setFilterBtnActiveState(button, isActive) {
  button.classList.toggle("active", isActive);
  if (isActive) {
    button.classList.remove("bg-transparent", "border-transparent", "text-notion-muted");
    button.classList.add("bg-[#2D2D2D]", "border-[#3E3E3E]", "text-notion-text");
  } else {
    button.classList.remove("bg-[#2D2D2D]", "border-[#3E3E3E]", "text-notion-text");
    button.classList.add("bg-transparent", "border-transparent", "text-notion-muted");
  }
}

function updateStatsFilterButtonStates() {
  const { gameType, cognitiveDomain } = appState.stats.filters;

  statsGameFilterButtons.forEach((button) => {
    const isActive = button.dataset.gameFilter === gameType;
    setFilterBtnActiveState(button, isActive);
  });

  // Highlight parent dropdown buttons dynamically based on selected game Type
  const visualBtn = document.getElementById("visualDropdownBtn");
  if (visualBtn) {
    const isActive = gameType === "category:visual" || gameType === "color_match";
    setFilterBtnActiveState(visualBtn, isActive);
    const svg = visualBtn.querySelector("svg");
    if (svg) {
      const isMenuOpen = !document.getElementById("visualDropdownMenu")?.classList.contains("hidden");
      svg.style.transform = isMenuOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
  }

  const memoryBtn = document.getElementById("memoryDropdownBtn");
  if (memoryBtn) {
    const isActive = gameType === "category:memory" || gameType === "color_memory" || gameType === "sequence_memory";
    setFilterBtnActiveState(memoryBtn, isActive);
    const svg = memoryBtn.querySelector("svg");
    if (svg) {
      const isMenuOpen = !document.getElementById("memoryDropdownMenu")?.classList.contains("hidden");
      svg.style.transform = isMenuOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
  }

  const soundBtn = document.getElementById("soundDropdownBtn");
  if (soundBtn) {
    const isActive = gameType === "category:sound";
    setFilterBtnActiveState(soundBtn, isActive);
    const svg = soundBtn.querySelector("svg");
    if (svg) {
      const isMenuOpen = !document.getElementById("soundDropdownMenu")?.classList.contains("hidden");
      svg.style.transform = isMenuOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
  }

  statsDomainFilterButtons.forEach((button) => {
    const isActive = button.dataset.domainFilter === cognitiveDomain;
    setFilterBtnActiveState(button, isActive);
  });
}

function getFilteredStatsHistory(items) {
  const { gameType, cognitiveDomain } = appState.stats.filters;

  return items.filter((item) => {
    if (gameType !== "all") {
      if (gameType.startsWith("category:")) {
        const cat = gameType.substring(9);
        if (cat === "visual" && item.gameType !== "color_match") {
          return false;
        }
        if (cat === "memory" && item.gameType !== "color_memory" && item.gameType !== "sequence_memory") {
          return false;
        }
        if (cat === "sound") {
          return false; // No sound games yet
        }
      } else if (item.gameType !== gameType) {
        return false;
      }
    }

    if (cognitiveDomain !== "all") {
      const resolvedDomain = resolveGameDomain(item.gameType, item.cognitiveDomain);
      if (resolvedDomain !== cognitiveDomain) {
        return false;
      }
    }

    return true;
  });
}

function renderStatsDomainOverview(items, lpiByDomain) {
  refs.statsDomainOverview.textContent = "";

  const sourceMap = new Map((items || []).map((item) => [
    String(item.cognitiveDomain || "").toLowerCase(),
    item
  ]));

  const lpiMap = new Map((lpiByDomain || []).map((item) => [
    String(item.cognitiveDomain || "").toLowerCase(),
    item
  ]));

  PRIMARY_DOMAIN_KEYS.forEach((domainKey) => {
    const item = sourceMap.get(domainKey);
    const lpiItem = lpiMap.get(domainKey);
    const sessions = Number(item?.sessions || 0);
    const totalPlaySeconds = Number(item?.totalPlaySeconds || 0);
    const domainLpi = lpiItem?.lpi;
    const lpiLabel = domainLpi === null || domainLpi === undefined ? "--" : domainLpi.toFixed(1);
    const lpiPercent = domainLpi === null || domainLpi === undefined ? 0 : clamp(Number(domainLpi), 0, 100);

    const card = document.createElement("article");
    card.className = "domain-chip";
    if (domainLpi === null || domainLpi === undefined) {
      card.classList.add("empty");
    }

    card.innerHTML = `
      <div class="domain-chip-head">
        <p>${formatDomainLabel(domainKey)}</p>
        <strong>${lpiLabel}</strong>
      </div>
      <div class="domain-progress-track">
        <span style="width:${lpiPercent}%;"></span>
      </div>
      <span class="domain-meta">${sessions} sessions · ${formatDurationLabel(totalPlaySeconds)}</span>
    `;

    refs.statsDomainOverview.appendChild(card);
  });
}

function renderStatsTopByGame(overview) {
  if (!refs.statsTopByGame) {
    return;
  }

  refs.statsTopByGame.textContent = "";

  const sourceGroups = getTopByGameGroups(overview);
  const groupMap = new Map(sourceGroups.map((group) => [group.gameType, group]));
  const historyItems = overview?.history || [];
  const gameTypes = Array.from(new Set([
    ...Object.keys(GAME_METADATA),
    ...groupMap.keys()
  ])).sort((a, b) => a.localeCompare(b));

  if (!gameTypes.length) {
    const empty = document.createElement("p");
    empty.className = "stats-empty";
    empty.textContent = "No ranking data yet. Play a session to generate Top 10 lists.";
    refs.statsTopByGame.appendChild(empty);
    return;
  }

  gameTypes.forEach((gameType) => {
    const group = groupMap.get(gameType);
    const topEntries = (group?.entries || []).slice(0, 10);
    const bestScore = Number(topEntries[0]?.score || 0);
    const gameHistory = historyItems.filter((item) => item.gameType === gameType);
    const recentAverage = gameHistory.length
      ? gameHistory.reduce((sum, item) => sum + Number(item.score || 0), 0) / gameHistory.length
      : 0;

    const card = document.createElement("article");
    card.className = "top10-game-card";

    card.innerHTML = `
      <p class="top10-title">${formatGameTypeLabel(gameType)}</p>
      <div class="top10-summary-meta">
        <p>Best <strong>${bestScore.toFixed(2)}</strong></p>
        <p>Sessions <strong>${gameHistory.length}</strong></p>
        <p>Avg <strong>${recentAverage.toFixed(2)}</strong></p>
      </div>
      <button class="soft-btn small top10-compare-btn" type="button" data-compare-game="${gameType}">
        Compare with History
      </button>
    `;

    refs.statsTopByGame.appendChild(card);
  });
}

function closeStatsCompareModal() {
  if (!refs.statsCompareModal) {
    return;
  }

  refs.statsCompareModal.classList.add("hidden");
}

function renderStatsCompareHistory(items) {
  if (!refs.statsCompareHistory) {
    return;
  }

  refs.statsCompareHistory.textContent = "";

  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "result-top10-empty";
    empty.textContent = "No recent sessions for this game.";
    refs.statsCompareHistory.appendChild(empty);
    return;
  }

  items.slice(0, 10).forEach((item) => {
    const row = document.createElement("li");
    row.className = "stats-compare-history-row";

    const accuracyText = item.accuracy === null ? "-" : `${item.accuracy.toFixed(1)}%`;
    row.innerHTML = `
      <strong>${Number(item.score || 0).toFixed(2)}</strong>
      <span>Accuracy ${accuracyText}</span>
      <time>${formatShortDateTime(item.createdAt)}</time>
    `;

    refs.statsCompareHistory.appendChild(row);
  });
}

function openStatsCompareModal(gameType) {
  if (!refs.statsCompareModal) {
    return;
  }

  const overview = appState.stats.overview;
  const allHistory = overview?.history || [];
  const gameHistory = allHistory.filter((item) => item.gameType === gameType);
  const topGroup = getTopByGameGroups(overview)
    .find((group) => group.gameType === gameType);
  const topEntries = (topGroup?.entries || []).slice(0, 10);
  const bestScore = Number(topEntries[0]?.score || 0);
  const averageScore = gameHistory.length
    ? gameHistory.reduce((sum, item) => sum + Number(item.score || 0), 0) / gameHistory.length
    : 0;

  if (refs.statsCompareTitle) {
    refs.statsCompareTitle.textContent = formatGameTypeLabel(gameType);
  }

  if (refs.statsCompareSummary) {
    refs.statsCompareSummary.textContent = `${gameHistory.length} sessions · Best ${bestScore.toFixed(2)} · Avg ${averageScore.toFixed(2)}`;
  }

  renderTopTenList(refs.statsCompareTop10, topEntries);
  renderStatsCompareHistory(gameHistory);

  refs.statsCompareModal.classList.remove("hidden");
}

function renderStatsAnalytics(overview) {
  const summary = overview?.summary || {};
  const historyItems = overview?.history || [];
  const lpiBreakdown = buildLpiBreakdown(historyItems);

  refs.statsTotalSessions.textContent = String(summary.totalSessions || 0);
  refs.statsTotalPlayTime.textContent = formatDurationLabel(summary.totalPlaySeconds || 0);
  refs.statsOverallLpi.textContent = lpiBreakdown.overallLpi.toFixed(1);
  refs.statsLpiCoverage.textContent = `${lpiBreakdown.activeDomainCount}/${PRIMARY_DOMAIN_KEYS.length} domains active`;
  refs.statsLastPlayed.textContent = formatShortDateTime(summary.lastPlayed);

  renderStatsDomainOverview(overview?.byDomain || [], lpiBreakdown.byDomain);
  renderStatsTopByGame(overview);

  const filteredHistory = getFilteredStatsHistory(historyItems);
  renderStatsHistoryRows(filteredHistory);
  updateStatsFilterButtonStates();
}

async function deleteStatsSession(sessionId) {
  if (!appState.dbReady || !window.brainDb?.deleteSession) {
    refs.statsDbStatus.textContent = "Delete unavailable. Restart app and try again.";
    return;
  }

  const confirmed = window.confirm("Delete this session from history?");
  if (!confirmed) {
    return;
  }

  refs.statsDbStatus.textContent = "Deleting session...";

  try {
    const result = await window.brainDb.deleteSession(appState.playerName, sessionId);
    if (result?.deleted) {
      refs.statsDbStatus.textContent = "Session deleted";
      await loadStatsOverview();
    } else {
      refs.statsDbStatus.textContent = "Session was not found";
    }
  } catch (error) {
    refs.statsDbStatus.textContent = `Failed to delete session: ${error?.message || "unknown error"}`;
  }
}

function renderWeekBars(container, dayCounts, activeClass = "active") {
  if (!container) {
    return;
  }

  container.textContent = "";

  const safe = Array.isArray(dayCounts) && dayCounts.length
    ? dayCounts
    : [0, 0, 0, 0, 0, 0, 0];
  const maxCount = Math.max(...safe, 1);

  safe.forEach((count) => {
    const bar = document.createElement("span");
    const level = count === 0 ? 20 : Math.round((count / maxCount) * 100);
    bar.style.setProperty("--week-level", `${level}%`);

    if (count > 0) {
      bar.classList.add(activeClass);
    }

    container.appendChild(bar);
  });
}

function renderDashboardWidgets(items, overview) {
  const sessions = Array.isArray(items) ? items : [];
  const summary = overview?.summary || {};

  const now = Date.now();
  const todayLabel = new Date().toDateString();
  const visualWeekCounts = Array.from({ length: 7 }, () => 0);
  const soundWeekCounts = Array.from({ length: 7 }, () => 0);

  let todaySessions = 0;
  let todayPlaySeconds = 0;

  sessions.forEach((item) => {
    const parsed = parseSessionDate(item.createdAt);
    if (!parsed) {
      return;
    }

    if (parsed.toDateString() === todayLabel) {
      todaySessions += 1;
      todayPlaySeconds += getSessionDurationSeconds(item);
    }

    const ageDays = Math.floor((now - parsed.getTime()) / 86400000);
    if (ageDays >= 0 && ageDays < 7) {
      if (resolveGameTrack(item.gameType) === "sound") {
        soundWeekCounts[6 - ageDays] += 1;
      } else {
        visualWeekCounts[6 - ageDays] += 1;
      }
    }
  });

  const visualActiveDays = visualWeekCounts.filter((count) => count > 0).length;
  const soundActiveDays = soundWeekCounts.filter((count) => count > 0).length;
  refs.dashTodaySessions.textContent = String(todaySessions);
  refs.dashAllSessions.textContent = String(Number(summary.totalSessions || 0));
  refs.dashTodayPlayTime.textContent = formatPlayTime(todayPlaySeconds);
  refs.dashWeekActiveLabel.textContent = `${visualActiveDays}/7 active days`;

  if (refs.dashSoundWeekLabel) {
    refs.dashSoundWeekLabel.textContent = `${soundActiveDays}/7 active days`;
  }

  renderWeekBars(refs.dashWeekBars, visualWeekCounts, "active");
  renderWeekBars(refs.dashSoundWeekBars, soundWeekCounts, "sound-active");

  refs.dashboardHistoryList.textContent = "";

  if (!sessions.length) {
    refs.dashboardHistoryWindow.textContent = "Last 7 Sessions";
    const emptyRow = document.createElement("li");
    emptyRow.innerHTML = `<span class="history-copy"><strong>No training sessions yet</strong><small>Start your first drill</small></span><time>-</time>`;
    refs.dashboardHistoryList.appendChild(emptyRow);
    return;
  }

  refs.dashboardHistoryWindow.textContent = `Last ${Math.min(sessions.length, 4)} Sessions`;

  sessions.slice(0, 4).forEach((item) => {
    const row = document.createElement("li");
    const iconSymbol = getGameIconSymbol(item.gameType);

    row.innerHTML = `
      <span class="history-main">
        <span class="history-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="#${iconSymbol}"></use></svg>
        </span>
        <span class="history-copy">
          <strong>${formatGameTypeLabel(item.gameType)}</strong>
          <small>${Number(item.score || 0).toFixed(2)}</small>
        </span>
      </span>
      <time>${formatShortDateTime(item.createdAt)}</time>
    `;
    refs.dashboardHistoryList.appendChild(row);
  });
}

async function loadStatsOverview() {
  if (!appState.dbReady || !window.brainDb?.getOverview) {
    return;
  }

  refs.statsDbStatus.textContent = "Loading history...";

  try {
    const overview = await window.brainDb.getOverview(appState.playerName, 500, 180);
    appState.stats.overview = overview;
    const summary = overview?.summary || {};
    const history = overview?.history || [];
    renderStatsAnalytics(overview);
    renderDashboardWidgets(history, overview);

    const hasActiveRun =
      appState.colorMatch.isPlaying ||
      appState.colorMemory.phase === "memorize" ||
      appState.colorMemory.phase === "adjust";

    if (!hasActiveRun && summary.cumulativeScore !== undefined) {
      appState.topScore = Math.round(Number(summary.cumulativeScore || 0));
      renderTopStatus();
    }

    refs.statsDbStatus.textContent = "SQLite synced";
  } catch (error) {
    refs.statsDbStatus.textContent = "Failed to load history";
  }
}

function hsvToHex(h, s, v) {
  const sat = s / 100;
  const val = v / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (channel) => {
    const value = Math.round((channel + m) * 255);
    return value.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function renderTopStatus() {
  refs.topTime.textContent = formatClock(appState.topClockSeconds);
  refs.topScore.textContent = formatScore(appState.topScore);

  if (window.brainGameMeta) {
    refs.playerLabel.textContent = `SESSION · ${window.brainGameMeta.platform.toUpperCase()}`;
  } else {
    refs.playerLabel.textContent = "SESSION";
  }
}

function renderStatsFromCache() {
  if (!appState.stats.overview) {
    return;
  }

  renderStatsAnalytics(appState.stats.overview);
}

function bindStatsUi() {
  statsGameFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.stats.filters.gameType = button.dataset.gameFilter || "all";
      renderStatsFromCache();
    });
  });

  // Dropdown Toggle Logic
  const dropdownConfigs = [
    { btnId: "visualDropdownBtn", menuId: "visualDropdownMenu" },
    { btnId: "memoryDropdownBtn", menuId: "memoryDropdownMenu" },
    { btnId: "soundDropdownBtn", menuId: "soundDropdownMenu" }
  ];

  dropdownConfigs.forEach(({ btnId, menuId }) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (btn && menu) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains("hidden");
        
        // Close all dropdowns first
        dropdownConfigs.forEach(c => {
          document.getElementById(c.menuId)?.classList.add("hidden");
          const caret = document.getElementById(c.btnId)?.querySelector("svg");
          if (caret) caret.style.transform = "rotate(0deg)";
        });

        if (isHidden) {
          menu.classList.remove("hidden");
          const caret = btn.querySelector("svg");
          if (caret) caret.style.transform = "rotate(180deg)";
        }
      });
    }
  });

  // Close dropdowns when clicking anywhere outside
  document.addEventListener("click", () => {
    dropdownConfigs.forEach(({ menuId, btnId }) => {
      const menu = document.getElementById(menuId);
      if (menu && !menu.classList.contains("hidden")) {
        menu.classList.add("hidden");
        const caret = document.getElementById(btnId)?.querySelector("svg");
        if (caret) caret.style.transform = "rotate(0deg)";
      }
    });
  });

  statsDomainFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.stats.filters.cognitiveDomain = button.dataset.domainFilter || "all";
      renderStatsFromCache();
    });
  });

  refs.statsList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const deleteButton = event.target.closest("[data-delete-session]");
    if (!deleteButton) {
      return;
    }

    const sessionId = Number(deleteButton.getAttribute("data-delete-session") || 0);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return;
    }

    void deleteStatsSession(sessionId);
  });

  if (refs.statsTopByGame) {
    refs.statsTopByGame.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const compareButton = event.target.closest("[data-compare-game]");
      if (!compareButton) {
        return;
      }

      const gameType = String(compareButton.getAttribute("data-compare-game") || "").trim();
      if (!gameType) {
        return;
      }

      openStatsCompareModal(gameType);
    });
  }

  refs.statsCompareCloseBtn?.addEventListener("click", closeStatsCompareModal);

  refs.statsCompareModal?.addEventListener("click", (event) => {
    if (event.target === refs.statsCompareModal) {
      closeStatsCompareModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeStatsCompareModal();
    }
  });
}

function cancelUnfinishedSessionsForHome() {
  const cm = appState.colorMatch;
  const memory = appState.colorMemory;

  if (cm.isPlaying) {
    resetColorMatchGame();
  }

  const memoryUnfinished =
    memory.phase === "memorize" ||
    memory.phase === "adjust" ||
    (memory.phase === "result" && !memory.isComplete);

  if (memoryUnfinished) {
    resetColorMemorySession();
  }
}

function setView(viewId) {
  const previousView = appState.activeView;

  if (viewId === "dashboardView" && previousView !== "dashboardView") {
    cancelUnfinishedSessionsForHome();
  }

  appState.activeView = viewId;

  views.forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const isDashboard = viewId === "dashboardView";
  refs.topStatusBar.classList.toggle("home-hidden", isDashboard);
  refs.mainShell.classList.toggle("home-mode", isDashboard);

  if (viewId !== "statsView") {
    closeStatsCompareModal();
  }

  if (viewId === "statsView" || viewId === "dashboardView") {
    loadStatsOverview();
  }
}

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.back;
      if (target) {
        setView(target);
      }
    });
  });

  refs.statsRefreshBtn.addEventListener("click", () => {
    loadStatsOverview();
  });
}

function bindLaunchers() {
  launchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.launch === "colorMatch") {
        setView("colorMatchView");
        startColorMatchGame();
      }

      if (button.dataset.launch === "colorMemory") {
        setView("colorMemoryView");
        startColorMemorySession();
      }
    });
  });
}

function renderStreakDots() {
  refs.cmStreakDots.textContent = "";

  for (let i = 0; i < 4; i += 1) {
    const dot = document.createElement("span");
    dot.className = "streak-dot";
    if (i < appState.colorMatch.streak) {
      dot.classList.add("active");
    }
    refs.cmStreakDots.appendChild(dot);
  }
}

function renderColorMatchHud() {
  const cm = appState.colorMatch;
  refs.cmTime.textContent = String(cm.timeLeft);
  refs.cmScore.textContent = formatScore(cm.score);
  refs.cmMultiplier.textContent = `x${cm.multiplier}`;
  refs.cmLeftWord.textContent = cm.leftWord;
  refs.cmRightWord.textContent = cm.rightWord;
  refs.cmRightWord.style.color = cm.rightHex;
  renderStreakDots();
}

function clearColorMatchFeedback() {
  refs.cmFeedback.textContent = "";
  refs.cmFeedback.classList.remove("good", "bad");
}

function setColorMatchFeedback(message, type) {
  clearColorMatchFeedback();
  refs.cmFeedback.textContent = message;

  if (type === "good") {
    refs.cmFeedback.classList.add("good");
  }

  if (type === "bad") {
    refs.cmFeedback.classList.add("bad");
  }

  clearTimeout(appState.colorMatch.feedbackClearId);
  appState.colorMatch.feedbackClearId = setTimeout(clearColorMatchFeedback, 430);
}

function getColorMatchTagline(score) {
  if (score >= 6000) {
    return "Synapse locked. Elite processing speed confirmed.";
  }

  if (score >= 3500) {
    return "Fast reads and clean calls. Strong tempo.";
  }

  if (score >= 1800) {
    return "Solid run. Push the multiplier one tier higher.";
  }

  return "Warm-up complete. Re-enter and chase the rhythm.";
}

function renderColorMatchResultBars() {
  const cm = appState.colorMatch;
  refs.cmResultBars.textContent = "";

  const accuracy = cm.answers === 0 ? 0 : cm.correct / cm.answers;
  const fillCount = Math.round(accuracy * 5);

  for (let i = 0; i < 5; i += 1) {
    const segment = document.createElement("span");
    segment.className = "progress-segment";

    if (i < fillCount) {
      segment.classList.add("success");
    } else if (i === fillCount && fillCount < 5) {
      segment.classList.add("current");
    }

    refs.cmResultBars.appendChild(segment);
  }
}

function renderColorMatchResultModal() {
  const cm = appState.colorMatch;
  const accuracy = cm.answers === 0 ? 0 : Math.round((cm.correct / cm.answers) * 100);
  const wrongCount = Math.max(0, cm.answers - cm.correct);
  const averageResponseMs = cm.responseTimesMs.length
    ? cm.responseTimesMs.reduce((sum, value) => sum + value, 0) / cm.responseTimesMs.length
    : 0;

  refs.cmResultScore.textContent = formatScore(cm.score);
  refs.cmResultTagline.textContent = getColorMatchTagline(cm.score);
  refs.cmResultAccuracy.textContent = `${accuracy}%`;
  refs.cmResultCorrect.textContent = `${cm.correct}/${cm.answers}`;
  refs.cmResultWrong.textContent = String(wrongCount);
  refs.cmResultAvgResponse.textContent = formatResponseTimeLabel(averageResponseMs);
  refs.cmResultPeak.textContent = `x${cm.peakMultiplier}`;
  renderResultTopTen("color_match", cm.score, refs.cmResultTop10, refs.cmResultRank);
  renderColorMatchResultBars();
}

function updateColorMatchOverlay() {
  const cm = appState.colorMatch;

  if (cm.isPlaying) {
    refs.cmOverlay.classList.add("hidden");
    refs.cmResultModal.classList.add("hidden");
    return;
  }

  if (cm.timeLeft === 0) {
    refs.cmOverlay.classList.add("hidden");
    renderColorMatchResultModal();
    refs.cmResultModal.classList.remove("hidden");
  } else {
    refs.cmResultModal.classList.add("hidden");
    refs.cmOverlay.classList.remove("hidden");
    refs.cmOverlayKicker.textContent = "Ready Protocol";
    refs.cmOverlayTitle.textContent = "Color Match";
    refs.cmOverlayText.textContent =
      "Does the meaning of the left word match the color shown on the right?";
    refs.cmOverlayAction.textContent = "Start Game";
  }
}

function stopColorMatchTimers() {
  const cm = appState.colorMatch;
  clearInterval(cm.timerId);
  clearTimeout(cm.roundDelayId);
  clearTimeout(cm.feedbackClearId);
  cm.timerId = null;
  cm.roundDelayId = null;
  cm.feedbackClearId = null;
}

function generateColorMatchRound() {
  const left = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
  const shouldMatch = Math.random() > 0.5;
  const randomWord = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].word;

  let rightColor;
  if (shouldMatch) {
    rightColor = GAME_COLORS.find((item) => item.word === left.word);
  } else {
    const mismatches = GAME_COLORS.filter((item) => item.word !== left.word);
    rightColor = mismatches[Math.floor(Math.random() * mismatches.length)];
  }

  appState.colorMatch.leftWord = left.word;
  appState.colorMatch.rightWord = randomWord;
  appState.colorMatch.rightHex = rightColor.hex;
  appState.colorMatch.isMatch = shouldMatch;
  appState.colorMatch.roundStartedAtMs = performance.now();
}

function startColorMatchGame() {
  const cm = appState.colorMatch;

  stopColorMatchTimers();
  cm.score = 0;
  cm.timeLeft = 60;
  cm.multiplier = 1;
  cm.peakMultiplier = 1;
  cm.streak = 0;
  cm.answers = 0;
  cm.correct = 0;
  cm.roundStartedAtMs = 0;
  cm.responseTimesMs = [];
  cm.locked = false;
  cm.sessionSaved = false;
  cm.isPlaying = true;

  generateColorMatchRound();
  clearColorMatchFeedback();
  renderColorMatchHud();
  updateColorMatchOverlay();

  cm.timerId = setInterval(() => {
    cm.timeLeft -= 1;
    if (cm.timeLeft <= 0) {
      cm.timeLeft = 0;
      cm.isPlaying = false;
      stopColorMatchTimers();

      if (!cm.sessionSaved) {
        cm.sessionSaved = true;
        const accuracy = cm.answers === 0 ? 0 : (cm.correct / cm.answers) * 100;
        const wrongCount = Math.max(0, cm.answers - cm.correct);
        const averageResponseMs = cm.responseTimesMs.length
          ? cm.responseTimesMs.reduce((sum, value) => sum + value, 0) / cm.responseTimesMs.length
          : 0;
        void saveSessionToDatabase({
          gameType: "color_match",
          score: cm.score,
          accuracy,
          peakMultiplier: cm.peakMultiplier,
          durationSeconds: 60,
          roundCount: cm.answers,
          detail: {
            correct: cm.correct,
            answers: cm.answers,
            wrong: wrongCount,
            averageResponseMs,
            responseSampleCount: cm.responseTimesMs.length
          }
        }).then(() => {
          loadStatsOverview();
        });
      }
    }
    renderColorMatchHud();
    updateColorMatchOverlay();
  }, 1000);
}

function resetColorMatchGame() {
  const cm = appState.colorMatch;

  stopColorMatchTimers();
  cm.score = 0;
  cm.timeLeft = 60;
  cm.multiplier = 1;
  cm.peakMultiplier = 1;
  cm.streak = 0;
  cm.answers = 0;
  cm.correct = 0;
  cm.roundStartedAtMs = 0;
  cm.responseTimesMs = [];
  cm.locked = false;
  cm.sessionSaved = false;
  cm.isPlaying = false;

  generateColorMatchRound();
  clearColorMatchFeedback();
  renderColorMatchHud();
  updateColorMatchOverlay();
}

function handleColorMatchAnswer(playerAnswerYes) {
  const cm = appState.colorMatch;
  if (!cm.isPlaying || cm.locked) {
    return;
  }

  cm.locked = true;
  cm.answers += 1;

  const respondedAt = performance.now();
  if (Number.isFinite(cm.roundStartedAtMs) && cm.roundStartedAtMs > 0) {
    const responseTimeMs = Math.max(0, respondedAt - cm.roundStartedAtMs);
    cm.responseTimesMs.push(responseTimeMs);
  }

  if (playerAnswerYes === cm.isMatch) {
    const reward = 50 * cm.multiplier;
    cm.score += reward;
    appState.topScore += reward;
    cm.correct += 1;
    setColorMatchFeedback("Correct", "good");

    if (cm.streak === 3) {
      cm.multiplier += 1;
      cm.streak = 0;
    } else {
      cm.streak += 1;
    }

    cm.peakMultiplier = Math.max(cm.peakMultiplier, cm.multiplier);
  } else {
    setColorMatchFeedback("Wrong", "bad");

    if (cm.streak > 0) {
      cm.streak = 0;
    } else if (cm.multiplier > 1) {
      cm.multiplier -= 1;
    }
  }

  renderTopStatus();
  renderColorMatchHud();

  cm.roundDelayId = setTimeout(() => {
    generateColorMatchRound();
    renderColorMatchHud();
    cm.locked = false;
  }, 300);
}

function bindColorMatchEvents() {
  refs.cmNoBtn.addEventListener("click", () => handleColorMatchAnswer(false));
  refs.cmYesBtn.addEventListener("click", () => handleColorMatchAnswer(true));
  refs.cmOverlayAction.addEventListener("click", startColorMatchGame);
  refs.cmResetBtn.addEventListener("click", resetColorMatchGame);
  refs.cmResultPlayAgain.addEventListener("click", startColorMatchGame);
  refs.cmResultBack.addEventListener("click", () => {
    setView("dashboardView");
    resetColorMatchGame();
  });

  window.addEventListener("keydown", (event) => {
    if (appState.activeView !== "colorMatchView") {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handleColorMatchAnswer(false);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleColorMatchAnswer(true);
    }
  });
}

function renderProgressSegments(container, total, completed, current) {
  container.textContent = "";

  for (let i = 1; i <= total; i += 1) {
    const segment = document.createElement("span");
    segment.className = "progress-segment";

    if (i <= completed) {
      segment.classList.add("success");
    } else if (i === current) {
      segment.classList.add("current");
    }

    container.appendChild(segment);
  }
}

function getMemoryAverageError() {
  const rounds = appState.colorMemory.roundScores;
  if (!rounds.length) {
    return 0;
  }

  const total = rounds.reduce((sum, round) => sum + round.avgError, 0);
  return total / rounds.length;
}

function renderMemoryHud() {
  const memory = appState.colorMemory;
  refs.memRoundTitle.textContent = `Round ${memory.round}/${memory.totalRounds}`;
  refs.memRoundHud.textContent = `${memory.round}/${memory.totalRounds}`;
  refs.memTotalScoreHud.textContent = memory.totalScore.toFixed(2);
  refs.memTotalScore.textContent = `${memory.totalScore.toFixed(2)} / 50`;
  refs.memAverageError.textContent = `${getMemoryAverageError().toFixed(1)}%`;
  refs.memAverageErrorInline.textContent = `${getMemoryAverageError().toFixed(1)}%`;
  refs.memSpeedBonus.textContent = `+${memory.lastSpeedBonus} XP`;
  refs.memSpeedInline.textContent = `+${memory.lastSpeedBonus} XP`;

  const completed = memory.roundScores.length;
  const current = completed >= memory.totalRounds ? 0 : memory.round;
  renderProgressSegments(refs.memProgress, memory.totalRounds, completed, current);
}

function setMemoryPanel(panel) {
  refs.memMemorizePanel.classList.toggle("hidden", panel !== "memorize");
  refs.memAdjustPanel.classList.toggle("hidden", panel !== "adjust");
  refs.memResultModal.classList.toggle("hidden", panel !== "result");
  refs.memResultCard.classList.toggle("hidden", panel !== "result");
}

function setMemorySummaryScreenVisible(visible) {
  appState.colorMemory.summaryVisible = Boolean(visible);

  if (refs.memSummaryScreen) {
    refs.memSummaryScreen.classList.toggle("hidden", !visible);
  }

  if (refs.memDialedCard) {
    refs.memDialedCard.classList.toggle("hidden", visible);
  }
}

function clearMemoryTimers() {
  const memory = appState.colorMemory;
  clearInterval(memory.memorizeIntervalId);
  clearTimeout(memory.memorizeTimeoutId);
  memory.memorizeIntervalId = null;
  memory.memorizeTimeoutId = null;
}

function randomIntInclusive(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomMemoryTarget(previousTarget) {
  const profiles = [
    { s: [72, 100], b: [68, 100] },
    { s: [64, 100], b: [16, 46] },
    { s: [16, 48], b: [72, 100] },
    { s: [44, 78], b: [42, 76] }
  ];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const candidate = {
      h: randomIntInclusive(0, 359),
      s: randomIntInclusive(profile.s[0], profile.s[1]),
      b: randomIntInclusive(profile.b[0], profile.b[1])
    };

    if (!previousTarget) {
      return candidate;
    }

    const hueGap = Math.min(
      Math.abs(previousTarget.h - candidate.h),
      360 - Math.abs(previousTarget.h - candidate.h)
    );
    const satGap = Math.abs(previousTarget.s - candidate.s);
    const briGap = Math.abs(previousTarget.b - candidate.b);

    if (hueGap >= 34 || satGap >= 18 || briGap >= 18) {
      return candidate;
    }
  }

  return {
    h: randomIntInclusive(0, 359),
    s: randomIntInclusive(10, 100),
    b: randomIntInclusive(12, 100)
  };
}

function syncMemorySliders() {
  const memory = appState.colorMemory;
  refs.memHueSlider.value = String(memory.guess.h);
  refs.memSatSlider.value = String(memory.guess.s);
  refs.memBriSlider.value = String(memory.guess.b);
  refs.memHueValue.textContent = String(memory.guess.h);
  refs.memSatValue.textContent = String(memory.guess.s);
  refs.memBriValue.textContent = String(memory.guess.b);

  const guessHex = hsvToHex(memory.guess.h, memory.guess.s, memory.guess.b).toUpperCase();
  refs.memCurrentHex.textContent = guessHex;
  refs.memPreview.style.background = guessHex;

  refs.memHueSlider.style.setProperty(
    "--track-bg",
    "linear-gradient(180deg, #ff0000 0%, #ff00ff 16%, #0000ff 34%, #00ffff 50%, #00ff00 66%, #ffff00 84%, #ff0000 100%)"
  );

  const satTop = hsvToHex(memory.guess.h, 100, memory.guess.b);
  const satBottom = hsvToHex(memory.guess.h, 0, memory.guess.b);
  refs.memSatSlider.style.setProperty("--track-bg", `linear-gradient(180deg, ${satTop}, ${satBottom})`);

  const briTop = hsvToHex(memory.guess.h, memory.guess.s, 100);
  refs.memBriSlider.style.setProperty("--track-bg", `linear-gradient(180deg, ${briTop}, #000000)`);

  refs.memAdjustPanel.style.setProperty("--memory-live", guessHex);
}

function updateMemoryGuessFromInputs() {
  appState.colorMemory.guess.h = Number(refs.memHueSlider.value);
  appState.colorMemory.guess.s = Number(refs.memSatSlider.value);
  appState.colorMemory.guess.b = Number(refs.memBriSlider.value);
  syncMemorySliders();
}

function beginMemoryAdjustPhase() {
  const memory = appState.colorMemory;
  if (memory.phase !== "memorize") {
    return;
  }

  clearMemoryTimers();
  memory.phase = "adjust";
  memory.adjustStartedAt = performance.now();
  setMemoryPanel("adjust");
  syncMemorySliders();
}

function beginMemoryMemorizePhase() {
  const memory = appState.colorMemory;
  clearMemoryTimers();

  memory.phase = "memorize";
  memory.target = randomMemoryTarget(memory.previousTarget);
  memory.previousTarget = { ...memory.target };
  memory.guess = { h: 180, s: 50, b: 50 };
  memory.lastSpeedBonus = 0;
  memory.isComplete = false;

  refs.memTargetSwatch.style.background = hsvToHex(memory.target.h, memory.target.s, memory.target.b);
  refs.memCountdown.textContent = "5.00";
  setMemoryPanel("memorize");
  syncMemorySliders();
  renderMemoryHud();

  const phaseStartedAt = performance.now();
  memory.memorizeIntervalId = setInterval(() => {
    const elapsed = (performance.now() - phaseStartedAt) / 1000;
    const remaining = Math.max(0, 5 - elapsed);
    refs.memCountdown.textContent = remaining.toFixed(2);

    if (remaining <= 0.02) {
      beginMemoryAdjustPhase();
    }
  }, 40);

  memory.memorizeTimeoutId = setTimeout(beginMemoryAdjustPhase, 5000);
}

function calculateMemoryRoundScore(target, guess) {
  const deltaHue = Math.min(Math.abs(target.h - guess.h), 360 - Math.abs(target.h - guess.h));
  const deltaSat = Math.abs(target.s - guess.s);
  const deltaBri = Math.abs(target.b - guess.b);

  const hueScore = clamp((1 - deltaHue / 180) * 5, 0, 5);
  const satScore = clamp((1 - deltaSat / 100) * 3, 0, 3);
  const briScore = clamp((1 - deltaBri / 100) * 2, 0, 2);
  const total = hueScore + satScore + briScore;

  const avgError = ((deltaHue / 180 + deltaSat / 100 + deltaBri / 100) / 3) * 100;

  return {
    deltaHue,
    deltaSat,
    deltaBri,
    hueScore,
    satScore,
    briScore,
    total,
    avgError
  };
}

function getMemoryAggregate() {
  const rounds = appState.colorMemory.roundScores;
  if (!rounds.length) {
    return null;
  }

  const merged = rounds.reduce(
    (acc, round) => {
      acc.deltaHue += round.deltaHue;
      acc.deltaSat += round.deltaSat;
      acc.deltaBri += round.deltaBri;
      acc.hueScore += round.hueScore;
      acc.satScore += round.satScore;
      acc.briScore += round.briScore;
      return acc;
    },
    {
      deltaHue: 0,
      deltaSat: 0,
      deltaBri: 0,
      hueScore: 0,
      satScore: 0,
      briScore: 0
    }
  );

  const count = rounds.length;
  return {
    deltaHue: merged.deltaHue / count,
    deltaSat: merged.deltaSat / count,
    deltaBri: merged.deltaBri / count,
    hueScore: merged.hueScore / count,
    satScore: merged.satScore / count,
    briScore: merged.briScore / count
  };
}

function renderMemoryRoundSummary() {
  if (!refs.memRoundLog || !refs.memRoundSummaryMeta) {
    return;
  }

  const rounds = appState.colorMemory.roundScores;
  refs.memRoundSummaryMeta.textContent = `${rounds.length} / ${appState.colorMemory.totalRounds} recorded`;
  refs.memRoundLog.textContent = "";

  if (!rounds.length) {
    const empty = document.createElement("p");
    empty.className = "memory-round-empty";
    empty.textContent = "Play rounds to see your target and selected colors.";
    refs.memRoundLog.appendChild(empty);
    return;
  }

  rounds.forEach((round) => {
    const card = document.createElement("article");
    card.className = "memory-round-row";
    card.innerHTML = `
      <p class="memory-round-index">R${round.round}</p>
      <div class="memory-round-color-block">
        <span class="memory-round-swatch" style="background:${round.targetHex};"></span>
        <div>
          <p>Target</p>
          <strong>${toHsbLabel(round.target)}</strong>
        </div>
      </div>
      <div class="memory-round-color-block">
        <span class="memory-round-swatch" style="background:${round.guessHex};"></span>
        <div>
          <p>Your Pick</p>
          <strong>${toHsbLabel(round.guess)}</strong>
        </div>
      </div>
      <p class="memory-round-score">${round.total.toFixed(2)}/10</p>
    `;
    refs.memRoundLog.appendChild(card);
  });
}

function getMemoryCaption(score) {
  if (score >= 9.4) {
    return "Off by a pixel. We are disturbed, not impressed.";
  }

  if (score >= 7.2) {
    return "Precision is sharp. Keep the confidence disciplined.";
  }

  if (score >= 4.6) {
    return "Balanced read. A tighter hue lock will boost this.";
  }

  if (score >= 2.2) {
    return "The confidence of someone who thinks they aced it.";
  }

  return "Bold attempt. The color wheel had other plans.";
}

function toHsbLabel(color) {
  return `H${Math.round(color.h)} S${Math.round(color.s)} B${Math.round(color.b)}`;
}

function renderMemoryResult(roundScore) {
  const memory = appState.colorMemory;
  const targetHex = hsvToHex(memory.target.h, memory.target.s, memory.target.b).toUpperCase();
  const guessHex = hsvToHex(memory.guess.h, memory.guess.s, memory.guess.b).toUpperCase();

  setMemorySummaryScreenVisible(false);

  if (refs.memResultTop10Section) {
    refs.memResultTop10Section.classList.add("hidden");
  }
  if (refs.memResultRank) {
    refs.memResultRank.textContent = "Rank -";
  }

  refs.memDialedStep.textContent = `${memory.round}/${memory.totalRounds}`;
  refs.memGuessHsb.textContent = toHsbLabel(memory.guess);
  refs.memTargetHsb.textContent = toHsbLabel(memory.target);
  refs.memDialedGuess.style.background = guessHex;
  refs.memDialedOriginal.style.background = targetHex;
  refs.memDialedCard.style.boxShadow = `0 24px 42px -14px ${guessHex}44`;

  refs.memHueMeta.textContent = `Δ ${roundScore.deltaHue.toFixed(1)}°`;
  refs.memSatMeta.textContent = `Δ ${roundScore.deltaSat.toFixed(1)}`;
  refs.memBriMeta.textContent = `Δ ${roundScore.deltaBri.toFixed(1)}`;

  refs.memHueFill.style.width = `${(roundScore.hueScore / 5) * 100}%`;
  refs.memSatFill.style.width = `${(roundScore.satScore / 3) * 100}%`;
  refs.memBriFill.style.width = `${(roundScore.briScore / 2) * 100}%`;

  refs.memHueScore.textContent = `${roundScore.hueScore.toFixed(2)}/5`;
  refs.memSatScore.textContent = `${roundScore.satScore.toFixed(2)}/3`;
  refs.memBriScore.textContent = `${roundScore.briScore.toFixed(2)}/2`;
  renderMemoryRoundSummary();

  if (memory.isComplete) {
    const aggregate = getMemoryAggregate();
    refs.memRoundScoreValue.textContent = memory.totalScore.toFixed(2);
    refs.memRoundCaption.textContent = "Session complete. Press next for full summary.";
    refs.memDialedStep.textContent = "5/5";
    refs.memGuessHsb.textContent = `Final ${memory.totalScore.toFixed(2)} / 50`;
    refs.memTargetHsb.textContent = "Open full summary to inspect all 5 rounds";

    if (aggregate) {
      refs.memHueMeta.textContent = `Δ ${aggregate.deltaHue.toFixed(1)}°`;
      refs.memSatMeta.textContent = `Δ ${aggregate.deltaSat.toFixed(1)}`;
      refs.memBriMeta.textContent = `Δ ${aggregate.deltaBri.toFixed(1)}`;
      refs.memHueFill.style.width = `${(aggregate.hueScore / 5) * 100}%`;
      refs.memSatFill.style.width = `${(aggregate.satScore / 3) * 100}%`;
      refs.memBriFill.style.width = `${(aggregate.briScore / 2) * 100}%`;
      refs.memHueScore.textContent = `${aggregate.hueScore.toFixed(2)}/5`;
      refs.memSatScore.textContent = `${aggregate.satScore.toFixed(2)}/3`;
      refs.memBriScore.textContent = `${aggregate.briScore.toFixed(2)}/2`;
    }

    if (refs.memResultTop10Section) {
      refs.memResultTop10Section.classList.remove("hidden");
    }
    renderResultTopTen("color_memory", memory.totalScore, refs.memResultTop10, refs.memResultRank);

    refs.memNextBtn.textContent = "→";
    refs.memNextBtn.setAttribute("aria-label", "Open full color memory summary");
    return;
  }

  refs.memRoundScoreValue.textContent = roundScore.total.toFixed(2);
  refs.memRoundCaption.textContent = getMemoryCaption(roundScore.total);
  refs.memGuessHsb.textContent = `Your ${toHsbLabel(memory.guess)}`;
  refs.memTargetHsb.textContent = `Original ${toHsbLabel(memory.target)}`;
  refs.memNextBtn.textContent = "→";
  refs.memNextBtn.setAttribute("aria-label", "Go to next memory round");
}

function resetColorMemorySession() {
  const memory = appState.colorMemory;

  clearMemoryTimers();
  memory.round = 1;
  memory.totalScore = 0;
  memory.roundScores = [];
  memory.previousTarget = null;
  memory.target = { h: 180, s: 70, b: 80 };
  memory.guess = { h: 180, s: 50, b: 50 };
  memory.phase = "idle";
  memory.adjustStartedAt = 0;
  memory.isComplete = false;
  memory.summaryVisible = false;
  memory.lastSpeedBonus = 0;
  memory.sessionSaved = false;

  refs.memCountdown.textContent = "5.00";
  refs.memTargetSwatch.style.background = hsvToHex(memory.target.h, memory.target.s, memory.target.b);
  setMemoryPanel("memorize");
  setMemorySummaryScreenVisible(false);
  syncMemorySliders();
  renderMemoryHud();
  renderMemoryRoundSummary();
}

function startColorMemorySession() {
  const memory = appState.colorMemory;

  clearMemoryTimers();
  memory.round = 1;
  memory.totalScore = 0;
  memory.roundScores = [];
  memory.previousTarget = null;
  memory.isComplete = false;
  memory.summaryVisible = false;
  memory.lastSpeedBonus = 0;
  memory.sessionSaved = false;

  renderMemoryHud();
  beginMemoryMemorizePhase();
}

function confirmColorMemorySelection() {
  const memory = appState.colorMemory;
  if (memory.phase !== "adjust") {
    return;
  }

  const elapsedSeconds = (performance.now() - memory.adjustStartedAt) / 1000;
  const speedBonus = Math.max(0, Math.round(125 - elapsedSeconds * 15));

  const result = calculateMemoryRoundScore(memory.target, memory.guess);
  const targetSnapshot = { ...memory.target };
  const guessSnapshot = { ...memory.guess };
  const targetHex = hsvToHex(targetSnapshot.h, targetSnapshot.s, targetSnapshot.b).toUpperCase();
  const guessHex = hsvToHex(guessSnapshot.h, guessSnapshot.s, guessSnapshot.b).toUpperCase();

  memory.lastSpeedBonus = speedBonus;
  memory.totalScore += result.total;
  memory.roundScores.push({
    round: memory.round,
    ...result,
    speedBonus,
    target: targetSnapshot,
    guess: guessSnapshot,
    targetHex,
    guessHex
  });
  memory.isComplete = memory.round >= memory.totalRounds;

  appState.topScore += Math.round(result.total * 100) + speedBonus;

  if (memory.isComplete && !memory.sessionSaved) {
    memory.sessionSaved = true;
    const avgError = getMemoryAverageError();
    const accuracy = clamp(100 - avgError, 0, 100);

    void saveSessionToDatabase({
      gameType: "color_memory",
      score: memory.totalScore,
      accuracy,
      peakMultiplier: null,
      durationSeconds: null,
      roundCount: memory.totalRounds,
      detail: {
        roundScores: memory.roundScores
      }
    }).then(() => {
      loadStatsOverview();
    });
  }

  memory.phase = "result";
  renderTopStatus();
  renderMemoryHud();
  renderMemoryResult(result);
  setMemoryPanel("result");
}

function nextColorMemoryRound() {
  const memory = appState.colorMemory;
  if (memory.phase !== "result") {
    return;
  }

  if (memory.isComplete) {
    if (!memory.summaryVisible) {
      setMemorySummaryScreenVisible(true);
      return;
    }

    startColorMemorySession();
    return;
  }

  memory.round += 1;
  renderMemoryHud();
  beginMemoryMemorizePhase();
}

function bindColorMemoryEvents() {
  refs.memStartBtn.addEventListener("click", startColorMemorySession);
  refs.memSkipBtn.addEventListener("click", beginMemoryAdjustPhase);
  refs.memConfirmBtn.addEventListener("click", confirmColorMemorySelection);
  refs.memNextBtn.addEventListener("click", nextColorMemoryRound);
  refs.memSummaryPlayAgain?.addEventListener("click", startColorMemorySession);
  refs.memSummaryBack?.addEventListener("click", () => {
    setView("dashboardView");
    resetColorMemorySession();
  });

  [refs.memHueSlider, refs.memSatSlider, refs.memBriSlider].forEach((input) => {
    input.addEventListener("input", updateMemoryGuessFromInputs);
  });
}

function startTopClockTicker() {
  setInterval(() => {
    if (appState.topClockSeconds > 0) {
      appState.topClockSeconds -= 1;
      renderTopStatus();
    }
  }, 1000);
}

async function init() {
  bindStatsUi();
  bindNavigation();
  bindLaunchers();
  bindColorMatchEvents();
  bindColorMemoryEvents();

  generateColorMatchRound();
  renderColorMatchHud();
  updateColorMatchOverlay();

  resetColorMemorySession();
  renderDashboardWidgets([], { summary: {}, byGame: [] });

  renderTopStatus();
  setView("dashboardView");
  startTopClockTicker();

  await ensureDatabaseUser();
  await loadStatsOverview();
}

void init();

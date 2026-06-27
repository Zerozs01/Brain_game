import { appState, refs } from '../state.js';
import {
  clamp,
  formatShortDateTime,
  formatGameTypeLabel,
  resolveGameDomain,
  formatDomainLabel,
  formatDurationLabel,
  formatResponseTimeLabel,
  normalizeScoreForLpi,
  PRIMARY_DOMAIN_KEYS,
  GAME_METADATA,
  DOMAIN_LABELS
} from '../helpers.js';
import { deleteStatsSession } from '../db.js';
import { updateRadarAndRank } from './chartManager.js';

export function getSessionDurationSeconds(item) {
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

export function buildLpiBreakdown(historyItems) {
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

export function compareTopEntries(a, b) {
  const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
  if (Math.abs(scoreDiff) > 0.0001) {
    return scoreDiff;
  }

  const aTime = parseSessionDate(a.createdAt)?.getTime() || 0;
  const bTime = parseSessionDate(b.createdAt)?.getTime() || 0;
  return bTime - aTime;
}

export function parseSessionDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getTopByGameGroups(overview) {
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

export function buildTopTenPack(gameType, currentScore) {
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

export function renderTopTenList(container, entries) {
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

export function renderResultTopTen(gameType, currentScore, listRef, rankRef) {
  if (!listRef) {
    return;
  }

  const topPack = buildTopTenPack(gameType, currentScore);
  renderTopTenList(listRef, topPack.topTen);

  if (rankRef) {
    rankRef.textContent = topPack.currentRank ? `Rank #${topPack.currentRank}` : "Rank -";
  }
}

function renderStatsHistoryRows(items, reloadStatsCallback) {
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

  const statsGameFilterButtons = Array.from(document.querySelectorAll("[data-game-filter]"));
  statsGameFilterButtons.forEach((button) => {
    const isActive = button.dataset.gameFilter === gameType;
    setFilterBtnActiveState(button, isActive);
  });

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

  const attentionBtn = document.getElementById("attentionDropdownBtn");
  if (attentionBtn) {
    const isActive = gameType === "category:attention" || gameType === "time";
    setFilterBtnActiveState(attentionBtn, isActive);
    const svg = attentionBtn.querySelector("svg");
    if (svg) {
      const isMenuOpen = !document.getElementById("attentionDropdownMenu")?.classList.contains("hidden");
      svg.style.transform = isMenuOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
  }

  const statsDomainFilterButtons = Array.from(document.querySelectorAll("[data-domain-filter]"));
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
        if (cat === "sound" && !item.gameType.startsWith("sound_") && !item.gameType.startsWith("audio_")) {
          return false;
        }
        if (cat === "attention" && item.gameType !== "time") {
          return false;
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

export function renderStatsAnalytics(overview, reloadStatsCallback) {
  const summary = overview?.summary || {};
  const historyItems = overview?.history || [];
  const lpiBreakdown = buildLpiBreakdown(historyItems);

  if (refs.statsTotalSessions) refs.statsTotalSessions.textContent = String(summary.totalSessions || 0);
  if (refs.statsTotalPlayTime) refs.statsTotalPlayTime.textContent = formatDurationLabel(summary.totalPlaySeconds || 0);
  if (refs.statsOverallLpi) refs.statsOverallLpi.textContent = lpiBreakdown.overallLpi.toFixed(1);
  if (refs.statsLpiCoverage) refs.statsLpiCoverage.textContent = `${lpiBreakdown.activeDomainCount}/${PRIMARY_DOMAIN_KEYS.length} domains active`;
  if (refs.statsLastPlayed) refs.statsLastPlayed.textContent = formatShortDateTime(summary.lastPlayed);

  renderStatsDomainOverview(overview?.byDomain || [], lpiBreakdown.byDomain);
  renderStatsTopByGame(overview);

  const filteredHistory = getFilteredStatsHistory(historyItems);
  renderStatsHistoryRows(filteredHistory, reloadStatsCallback);
  updateStatsFilterButtonStates();

  updateRadarAndRank(lpiBreakdown.byDomain);
}

export function renderStatsFromCache(reloadStatsCallback) {
  if (!appState.stats.overview) {
    return;
  }

  renderStatsAnalytics(appState.stats.overview, reloadStatsCallback);
}

export function bindStatsUi(reloadStatsCallback) {
  // Funnel Filter Dropdown Toggle Menu logic
  const toggleBtn = document.getElementById('domainFilterToggleBtn');
  const dropdown = document.getElementById('domainFilterDropdown');
  
  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn) {
        dropdown.classList.add('hidden');
      }
    });
  }

  const statsGameFilterButtons = Array.from(document.querySelectorAll("[data-game-filter]"));
  statsGameFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.stats.filters.gameType = button.dataset.gameFilter || "all";
      renderStatsFromCache(reloadStatsCallback);
    });
  });

  const dropdownConfigs = [
    { btnId: "visualDropdownBtn", menuId: "visualDropdownMenu" },
    { btnId: "memoryDropdownBtn", menuId: "memoryDropdownMenu" },
    { btnId: "soundDropdownBtn", menuId: "soundDropdownMenu" },
    { btnId: "attentionDropdownBtn", menuId: "attentionDropdownMenu" }
  ];

  dropdownConfigs.forEach(({ btnId, menuId }) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (btn && menu) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains("hidden");
        
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

  const statsDomainFilterButtons = Array.from(document.querySelectorAll("[data-domain-filter]"));
  statsDomainFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.stats.filters.cognitiveDomain = button.dataset.domainFilter || "all";
      renderStatsFromCache(reloadStatsCallback);
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

    deleteStatsSession(sessionId).then((deleted) => {
      if (deleted && reloadStatsCallback) {
        reloadStatsCallback();
      }
    });
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

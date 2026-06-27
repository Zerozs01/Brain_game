import { appState } from './state.js';
import { ensureDatabaseUser, fetchStatsOverview } from './db.js';
import { setView, bindNavigation } from './ui/navigation.js';
import { startTopClockTicker, renderTopStatus } from './ui/header.js';
import { bindStatsUi, renderStatsAnalytics } from './ui/stats.js';
import { renderDashboardWidgets } from './ui/dashboard.js';
import { initColorMatch, startColorMatchGame } from './games/colorMatch.js';
import { initColorMemory, startColorMemorySession } from './games/colorMemory.js';
import { initTimeEstimation, startTimeGameSession } from './games/timeEstimation.js';
import { initSequenceMemory, resetGame as resetSequenceMemory } from './games/sequenceMemory.js';
import { initPerfectPitch, resetPerfectPitchGame } from './games/perfectPitch.js';
import { initTimeAudio } from './helpers.js';

export async function loadStatsOverview() {
  try {
    const overview = await fetchStatsOverview();
    if (!overview) return;

    const summary = overview.summary || {};
    const history = overview.history || [];

    renderStatsAnalytics(overview, loadStatsOverview);
    renderDashboardWidgets(history, overview);

    const hasActiveRun =
      appState.colorMatch.isPlaying ||
      appState.colorMemory.phase === "memorize" ||
      appState.colorMemory.phase === "adjust";

    if (!hasActiveRun && summary.cumulativeScore !== undefined) {
      appState.topScore = Math.round(Number(summary.cumulativeScore || 0));
      renderTopStatus();
    }
  } catch (error) {
    console.error("Failed to load stats overview:", error);
  }
}

function bindLaunchers() {
  const launchButtons = document.querySelectorAll("[data-launch]");
  launchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.launch === "colorMatch") {
        setView("colorMatchView", loadStatsOverview);
        startColorMatchGame(loadStatsOverview);
      }

      if (button.dataset.launch === "colorMemory") {
        setView("colorMemoryView", loadStatsOverview);
        startColorMemorySession();
      }

      if (button.dataset.launch === "time") {
        setView("timeView", loadStatsOverview);
        startTimeGameSession();
      }

      if (button.dataset.launch === "sequenceMemory") {
        setView("sequenceMemoryView", loadStatsOverview);
        resetSequenceMemory();
      }

      if (button.dataset.launch === "perfectPitch") {
        setView("perfectPitchView", loadStatsOverview);
        resetPerfectPitchGame();
      }
    });
  });
}

async function init() {
  window.addEventListener("click", () => {
    initTimeAudio();
  }, { once: true });

  bindStatsUi(loadStatsOverview);
  bindNavigation(loadStatsOverview);
  bindLaunchers();
  
  initColorMatch(loadStatsOverview);
  initColorMemory(loadStatsOverview);
  initTimeEstimation(loadStatsOverview);
  initSequenceMemory(loadStatsOverview);
  initPerfectPitch(loadStatsOverview);

  renderDashboardWidgets([], { summary: {}, byGame: [] });
  renderTopStatus();
  setView("dashboardView", loadStatsOverview);
  startTopClockTicker();

  await ensureDatabaseUser();
  await loadStatsOverview();
}

void init();

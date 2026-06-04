import { appState, refs } from '../state.js';

export function setView(viewId, loadStatsCallback) {
  const previousView = appState.activeView;
  const gameViews = ["colorMatchView", "colorMemoryView", "timeView", "sequenceMemoryView"];
  if (gameViews.includes(previousView) && previousView !== viewId) {
    cancelUnfinishedSessions();
  }

  appState.activeView = viewId;

  const views = document.querySelectorAll(".view");
  views.forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const isDashboard = viewId === "dashboardView";
  refs.topStatusBar.classList.toggle("home-hidden", isDashboard);
  refs.mainShell.classList.toggle("home-mode", isDashboard);

  if (viewId !== "statsView") {
    const modal = document.getElementById("statsCompareModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  if ((viewId === "statsView" || viewId === "dashboardView") && loadStatsCallback) {
    loadStatsCallback();
  }
}

function cancelUnfinishedSessions() {
  if (appState.resets) {
    if (appState.resets.colorMatch) appState.resets.colorMatch();
    if (appState.resets.colorMemory) appState.resets.colorMemory();
    if (appState.resets.time) appState.resets.time();
    if (appState.resets.sequenceMemory) appState.resets.sequenceMemory();
  }
}

export function bindNavigation(loadStatsCallback) {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view, loadStatsCallback);
    });
  });

  const backButtons = document.querySelectorAll("[data-back]");
  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.back;
      if (target) {
        setView(target, loadStatsCallback);
      }
    });
  });

  if (refs.statsRefreshBtn) {
    refs.statsRefreshBtn.addEventListener("click", () => {
      if (loadStatsCallback) loadStatsCallback();
    });
  }
}

import { appState, refs } from '../state.js';
import { formatClock, formatScore } from '../helpers.js';

export function renderTopStatus() {
  if (refs.topTime) {
    refs.topTime.textContent = formatClock(appState.topClockSeconds);
  }
  if (refs.topScore) {
    refs.topScore.textContent = formatScore(appState.topScore);
  }

  if (refs.playerLabel) {
    if (window.brainGameMeta) {
      refs.playerLabel.textContent = `SESSION · ${window.brainGameMeta.platform.toUpperCase()}`;
    } else {
      refs.playerLabel.textContent = "SESSION";
    }
  }
}

export function startTopClockTicker() {
  setInterval(() => {
    if (appState.topClockSeconds > 0) {
      appState.topClockSeconds -= 1;
      renderTopStatus();
    }
  }, 1000);
}

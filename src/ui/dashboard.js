import { refs } from '../state.js';
import {
  formatDurationLabel,
  resolveGameTrack,
  getGameIconSymbol,
  formatGameTypeLabel,
  formatShortDateTime
} from '../helpers.js';
import { parseSessionDate, getSessionDurationSeconds } from './stats.js';

export function renderWeekBars(container, dayCounts, activeClass = "active") {
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

export function renderDashboardWidgets(items, overview) {
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
  
  if (refs.dashTodaySessions) refs.dashTodaySessions.textContent = String(todaySessions);
  if (refs.dashAllSessions) refs.dashAllSessions.textContent = String(Number(summary.totalSessions || 0));
  if (refs.dashTodayPlayTime) refs.dashTodayPlayTime.textContent = formatDurationLabel(todayPlaySeconds);
  if (refs.dashWeekActiveLabel) refs.dashWeekActiveLabel.textContent = `${visualActiveDays}/7 active days`;

  if (refs.dashSoundWeekLabel) {
    refs.dashSoundWeekLabel.textContent = `${soundActiveDays}/7 active days`;
  }

  renderWeekBars(refs.dashWeekBars, visualWeekCounts, "active");
  renderWeekBars(refs.dashSoundWeekBars, soundWeekCounts, "sound-active");

  if (!refs.dashboardHistoryList) return;
  
  refs.dashboardHistoryList.textContent = "";

  if (!sessions.length) {
    if (refs.dashboardHistoryWindow) refs.dashboardHistoryWindow.textContent = "Last 7 Sessions";
    const emptyRow = document.createElement("li");
    emptyRow.innerHTML = `<span class="history-copy"><strong>No training sessions yet</strong><small>Start your first drill</small></span><time>-</time>`;
    refs.dashboardHistoryList.appendChild(emptyRow);
    return;
  }

  if (refs.dashboardHistoryWindow) {
    refs.dashboardHistoryWindow.textContent = `Last ${Math.min(sessions.length, 4)} Sessions`;
  }

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

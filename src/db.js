import { appState, refs } from './state.js';
import { resolveGameDomain } from './helpers.js';

export async function ensureDatabaseUser() {
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

export async function saveSessionToDatabase(payload) {
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

export async function deleteStatsSession(sessionId) {
  if (!appState.dbReady || !window.brainDb?.deleteSession) {
    refs.statsDbStatus.textContent = "Delete unavailable. Restart app and try again.";
    return false;
  }

  const confirmed = window.confirm("Delete this session from history?");
  if (!confirmed) {
    return false;
  }

  refs.statsDbStatus.textContent = "Deleting session...";

  try {
    const result = await window.brainDb.deleteSession(appState.playerName, sessionId);
    if (result?.deleted) {
      refs.statsDbStatus.textContent = "Session deleted";
      return true;
    } else {
      refs.statsDbStatus.textContent = "Session was not found";
      return false;
    }
  } catch (error) {
    refs.statsDbStatus.textContent = `Failed to delete session: ${error?.message || "unknown error"}`;
    return false;
  }
}

export async function fetchStatsOverview() {
  if (!appState.dbReady || !window.brainDb?.getOverview) {
    return null;
  }

  refs.statsDbStatus.textContent = "Loading history...";

  try {
    const overview = await window.brainDb.getOverview(appState.playerName, 500, 180);
    appState.stats.overview = overview;
    refs.statsDbStatus.textContent = "SQLite synced";
    return overview;
  } catch (error) {
    refs.statsDbStatus.textContent = "Failed to load history";
    throw error;
  }
}

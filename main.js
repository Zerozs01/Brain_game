const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");

let db;

const DOMAIN_BY_GAME_TYPE = Object.freeze({
  color_match: "speed",
  color_memory: "memory",
  sequence_memory: "memory",
  time: "attention",
  sound_perfect_pitch: "memory"
});

const PLAY_TIME_SECONDS_SQL = `
  CASE
    WHEN duration_seconds IS NOT NULL THEN duration_seconds
    WHEN game_type = 'color_match' THEN 60
    WHEN game_type = 'color_memory' THEN COALESCE(round_count, 5) * 8
    ELSE 0
  END
`;

function resolveCognitiveDomain(gameType, fallbackDomain) {
  const normalizedFallback = String(fallbackDomain || "").trim().toLowerCase();
  if (normalizedFallback) {
    return normalizedFallback;
  }

  const normalizedType = String(gameType || "").trim().toLowerCase();
  return DOMAIN_BY_GAME_TYPE[normalizedType] || "unassigned";
}

function hasColumn(tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => row.name === columnName);
}

function runSchemaMigrations() {
  if (!hasColumn("game_sessions", "cognitive_domain")) {
    db.exec("ALTER TABLE game_sessions ADD COLUMN cognitive_domain TEXT");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user_domain_created
    ON game_sessions(user_id, cognitive_domain, created_at DESC);
  `);
}

function initDatabase() {
  try {
    const dbPath = path.join(app.getPath("userData"), "brain_game.sqlite");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_type TEXT NOT NULL,
        cognitive_domain TEXT,
        score REAL NOT NULL,
        accuracy REAL,
        peak_multiplier INTEGER,
        duration_seconds REAL,
        round_count INTEGER,
        detail_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_game_sessions_user_created
      ON game_sessions(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_game_sessions_user_type_created
      ON game_sessions(user_id, game_type, created_at DESC);
    `);

    runSchemaMigrations();
  } catch (err) {
    console.error("Failed to initialize SQLite database:", err);
    dialog.showErrorBox(
      "Database Initialization Error",
      "Failed to initialize the database:\n" + err.message + "\n\nIf the application is already running, please close it first."
    );
    app.quit();
  }
}

function getOrCreateUser(username) {
  const sanitized = String(username || "Player_01").trim() || "Player_01";

  const existing = db
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .get(sanitized);

  if (existing) {
    return existing;
  }

  const insert = db
    .prepare("INSERT INTO users (username) VALUES (?)")
    .run(sanitized);

  return {
    id: insert.lastInsertRowid,
    username: sanitized
  };
}

function getOverview(userId, options) {
  const rawLimit = typeof options === "object" ? options?.limit : options;
  const rawTrendDays = typeof options === "object" ? options?.trendDays : undefined;
  const safeLimit = Math.max(1, Math.min(Number(rawLimit) || 50, 500));
  const safeTrendDays = Math.max(7, Math.min(Number(rawTrendDays) || 120, 365));

  const summary = db
    .prepare(
      `SELECT
         COUNT(*) AS totalSessions,
         COALESCE(AVG(score), 0) AS averageScore,
         COALESCE(MAX(score), 0) AS bestScore,
         COALESCE(SUM(score), 0) AS cumulativeScore,
         COALESCE(SUM(${PLAY_TIME_SECONDS_SQL}), 0) AS totalPlaySeconds,
         COALESCE(MAX(created_at), NULL) AS lastPlayed
       FROM game_sessions
       WHERE user_id = ?`
    )
    .get(userId);

  const byGame = db
    .prepare(
      `SELECT
         game_type AS gameType,
         COALESCE(cognitive_domain, '') AS cognitiveDomain,
         COUNT(*) AS sessions,
         COALESCE(AVG(score), 0) AS averageScore,
         COALESCE(MAX(score), 0) AS bestScore,
         COALESCE(SUM(${PLAY_TIME_SECONDS_SQL}), 0) AS totalPlaySeconds
       FROM game_sessions
       WHERE user_id = ?
       GROUP BY game_type, cognitive_domain
       ORDER BY sessions DESC, gameType ASC`
    )
    .all(userId);

  const history = db
    .prepare(
      `SELECT
         id,
         game_type AS gameType,
         COALESCE(cognitive_domain, '') AS cognitiveDomain,
         score,
         accuracy,
         peak_multiplier AS peakMultiplier,
         duration_seconds AS durationSeconds,
         round_count AS roundCount,
         created_at AS createdAt
       FROM game_sessions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, safeLimit);

  const trendDaily = db
    .prepare(
      `SELECT
         substr(created_at, 1, 10) AS day,
         game_type AS gameType,
         COALESCE(cognitive_domain, '') AS cognitiveDomain,
         COUNT(*) AS sessions,
         COALESCE(AVG(score), 0) AS averageScore,
         COALESCE(MAX(score), 0) AS bestScore,
         COALESCE(SUM(${PLAY_TIME_SECONDS_SQL}), 0) AS totalPlaySeconds
       FROM game_sessions
       WHERE user_id = ?
         AND datetime(created_at) >= datetime('now', ?)
       GROUP BY day, game_type, cognitive_domain
       ORDER BY day ASC`
    )
    .all(userId, `-${safeTrendDays} days`);

  const topByGameRows = db
    .prepare(
      `WITH ranked AS (
         SELECT
           game_type AS gameType,
           COALESCE(cognitive_domain, '') AS cognitiveDomain,
           score,
           accuracy,
           created_at AS createdAt,
           ROW_NUMBER() OVER (
             PARTITION BY game_type
             ORDER BY score DESC, datetime(created_at) DESC
           ) AS rank
         FROM game_sessions
         WHERE user_id = ?
       )
       SELECT
         gameType,
         cognitiveDomain,
         score,
         accuracy,
         createdAt,
         rank
       FROM ranked
       WHERE rank <= 10
       ORDER BY gameType ASC, rank ASC`
    )
    .all(userId);

  const byDomainMap = new Map();
  byGame.forEach((item) => {
    const resolvedDomain = resolveCognitiveDomain(item.gameType, item.cognitiveDomain);
    const sessions = Number(item.sessions || 0);
    const avgScore = Number(item.averageScore || 0);
    const bestScore = Number(item.bestScore || 0);
    const totalPlaySeconds = Number(item.totalPlaySeconds || 0);

    const existing = byDomainMap.get(resolvedDomain) || {
      cognitiveDomain: resolvedDomain,
      sessions: 0,
      weightedScoreSum: 0,
      bestScore: 0,
      totalPlaySeconds: 0
    };

    existing.sessions += sessions;
    existing.weightedScoreSum += avgScore * sessions;
    existing.bestScore = Math.max(existing.bestScore, bestScore);
    existing.totalPlaySeconds += totalPlaySeconds;

    byDomainMap.set(resolvedDomain, existing);
  });

  const byDomain = Array.from(byDomainMap.values())
    .map((item) => ({
      cognitiveDomain: item.cognitiveDomain,
      sessions: item.sessions,
      averageScore: item.sessions > 0 ? item.weightedScoreSum / item.sessions : 0,
      bestScore: item.bestScore,
      totalPlaySeconds: item.totalPlaySeconds
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const topByGameMap = new Map();
  topByGameRows.forEach((row) => {
    const gameType = row.gameType;
    const existing = topByGameMap.get(gameType) || {
      gameType,
      cognitiveDomain: resolveCognitiveDomain(gameType, row.cognitiveDomain),
      entries: []
    };

    existing.entries.push({
      rank: Number(row.rank || 0),
      score: Number(row.score || 0),
      accuracy: row.accuracy === null ? null : Number(row.accuracy),
      createdAt: row.createdAt
    });

    topByGameMap.set(gameType, existing);
  });

  const topByGame = Array.from(topByGameMap.values()).sort((a, b) => a.gameType.localeCompare(b.gameType));

  return {
    summary: {
      totalSessions: Number(summary.totalSessions || 0),
      averageScore: Number(summary.averageScore || 0),
      bestScore: Number(summary.bestScore || 0),
      cumulativeScore: Number(summary.cumulativeScore || 0),
      totalPlaySeconds: Number(summary.totalPlaySeconds || 0),
      lastPlayed: summary.lastPlayed
    },
    byGame: byGame.map((item) => ({
      gameType: item.gameType,
      cognitiveDomain: resolveCognitiveDomain(item.gameType, item.cognitiveDomain),
      sessions: Number(item.sessions || 0),
      averageScore: Number(item.averageScore || 0),
      bestScore: Number(item.bestScore || 0),
      totalPlaySeconds: Number(item.totalPlaySeconds || 0)
    })),
    byDomain,
    history: history.map((item) => ({
      id: Number(item.id),
      gameType: item.gameType,
      cognitiveDomain: resolveCognitiveDomain(item.gameType, item.cognitiveDomain),
      score: Number(item.score || 0),
      accuracy: item.accuracy === null ? null : Number(item.accuracy),
      peakMultiplier: item.peakMultiplier === null ? null : Number(item.peakMultiplier),
      durationSeconds: item.durationSeconds === null ? null : Number(item.durationSeconds),
      roundCount: item.roundCount === null ? null : Number(item.roundCount),
      createdAt: item.createdAt
    })),
    trendDaily: trendDaily.map((item) => ({
      day: item.day,
      gameType: item.gameType,
      cognitiveDomain: resolveCognitiveDomain(item.gameType, item.cognitiveDomain),
      sessions: Number(item.sessions || 0),
      averageScore: Number(item.averageScore || 0),
      bestScore: Number(item.bestScore || 0),
      totalPlaySeconds: Number(item.totalPlaySeconds || 0)
    })),
    topByGame
  };
}

function registerIpcHandlers() {
  ipcMain.handle("stats:ensure-user", (_event, username) => {
    const user = getOrCreateUser(username);
    return {
      id: Number(user.id),
      username: user.username
    };
  });

  ipcMain.handle("stats:add-session", (_event, payload) => {
    const gameType = String(payload?.gameType || "unknown").trim().toLowerCase();
    const cognitiveDomain = resolveCognitiveDomain(gameType, payload?.cognitiveDomain);
    const score = Number(payload?.score || 0);
    const accuracy = payload?.accuracy === null || payload?.accuracy === undefined
      ? null
      : Number(payload.accuracy);
    const peakMultiplier = payload?.peakMultiplier === null || payload?.peakMultiplier === undefined
      ? null
      : Number(payload.peakMultiplier);
    const durationSeconds = payload?.durationSeconds === null || payload?.durationSeconds === undefined
      ? null
      : Number(payload.durationSeconds);
    const roundCount = payload?.roundCount === null || payload?.roundCount === undefined
      ? null
      : Number(payload.roundCount);
    const detailJson = payload?.detail ? JSON.stringify(payload.detail) : null;

    const user = getOrCreateUser(payload?.username || "Player_01");

    const insert = db
      .prepare(
        `INSERT INTO game_sessions (
          user_id,
          game_type,
          cognitive_domain,
          score,
          accuracy,
          peak_multiplier,
          duration_seconds,
          round_count,
          detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(user.id),
        gameType,
        cognitiveDomain,
        score,
        accuracy,
        peakMultiplier,
        durationSeconds,
        roundCount,
        detailJson
      );

    return {
      id: Number(insert.lastInsertRowid)
    };
  });

  ipcMain.handle("stats:get-overview", (_event, payload) => {
    const username = payload?.username || "Player_01";
    const options = {
      limit: payload?.limit,
      trendDays: payload?.trendDays
    };
    const user = getOrCreateUser(username);
    return getOverview(Number(user.id), options);
  });

  ipcMain.handle("stats:delete-session", (_event, payload) => {
    const username = payload?.username || "Player_01";
    const sessionId = Number(payload?.sessionId || 0);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return { deleted: false };
    }

    const user = getOrCreateUser(username);
    const result = db
      .prepare("DELETE FROM game_sessions WHERE id = ? AND user_id = ?")
      .run(sessionId, Number(user.id));

    return {
      deleted: result.changes > 0,
      sessionId
    };
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: "#111317",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (db) {
    db.close();
  }
});

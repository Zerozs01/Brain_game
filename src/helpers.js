export const GAME_COLORS = [
  { word: "red", hex: "#ff3b30" },
  { word: "blue", hex: "#007aff" },
  { word: "green", hex: "#34c759" },
  { word: "yellow", hex: "#ffcc00" },
  { word: "black", hex: "#5E5E5E" }
];

export const GAME_METADATA = Object.freeze({
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
  },
  time: {
    label: "Time Estimation",
    cognitiveDomain: "attention"
  }
});

export const DOMAIN_LABELS = Object.freeze({
  speed: "Speed",
  memory: "Memory",
  attention: "Attention",
  flexibility: "Flexibility",
  problem_solving: "Problem Solving",
  math: "Math",
  unassigned: "Unassigned"
});

export const PRIMARY_DOMAIN_KEYS = Object.freeze([
  "speed",
  "memory",
  "attention",
  "flexibility",
  "problem_solving",
  "math"
]);

export const SCORE_REFERENCE_BY_GAME = Object.freeze({
  color_match: 6000,
  color_memory: 50,
  time: 100
});

export const SOUND_GAME_TYPE_PREFIXES = Object.freeze(["sound_", "audio_"]);

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatScore(value) {
  return Math.round(value).toLocaleString("en-US");
}

export function formatShortDateTime(value) {
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

export function formatGameTypeLabel(gameType) {
  const metadata = GAME_METADATA[String(gameType || "").toLowerCase()];
  if (metadata) {
    return metadata.label;
  }

  return String(gameType || "Unknown").replaceAll("_", " ");
}

export function calculateSequenceScore(finalLevel) {
  const AVERAGE_PEAK = 9;
  
  if (finalLevel <= 1) return 0;

  let score = 0;

  if (finalLevel <= AVERAGE_PEAK) {
    score = (finalLevel - 1) * 5;
  } else {
    const baseScore = 40; 
    const extraLevels = finalLevel - AVERAGE_PEAK;
    score = baseScore + (extraLevels * 10) + (Math.pow(extraLevels, 2) * 2);
  }

  return Math.floor(score);
}

export function resolveGameDomain(gameType, cognitiveDomain) {
  const explicit = String(cognitiveDomain || "").trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const metadata = GAME_METADATA[String(gameType || "").toLowerCase()];
  return metadata?.cognitiveDomain || "unassigned";
}

export function formatDomainLabel(domain) {
  const normalized = String(domain || "").toLowerCase();
  return DOMAIN_LABELS[normalized] || DOMAIN_LABELS.unassigned;
}

export function resolveGameTrack(gameType) {
  const normalized = String(gameType || "").toLowerCase();
  const isSoundGame = SOUND_GAME_TYPE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  return isSoundGame ? "sound" : "visual";
}

export function getGameIconSymbol(gameType) {
  const normalized = String(gameType || "").toLowerCase();
  if (normalized === "color_memory") {
    return "icon-memory";
  }

  if (resolveGameTrack(normalized) === "sound") {
    return "icon-sound";
  }

  return "icon-bolt";
}

export function formatDurationLabel(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.round(safeSeconds / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return `${minutes}m`;
}

export function formatResponseTimeLabel(milliseconds) {
  const safe = Number(milliseconds);
  if (!Number.isFinite(safe) || safe <= 0) {
    return "-";
  }

  return `${(safe / 1000).toFixed(2)}s`;
}

export function normalizeScoreForLpi(gameType, score) {
  const safeScore = Math.max(0, Number(score || 0));
  const reference = SCORE_REFERENCE_BY_GAME[String(gameType || "").toLowerCase()];

  if (!reference) {
    return clamp(safeScore, 0, 100);
  }

  return clamp((safeScore / reference) * 100, 0, 100);
}

export function hsvToHex(h, s, v) {
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

export function toHsbLabel(color) {
  return `H${Math.round(color.h)} S${Math.round(color.s)} B${Math.round(color.b)}`;
}

// ==========================================
// 🎵 WEB AUDIO API UTILITIES
// ==========================================

let timeAudioCtx = null;

export function initTimeAudio() {
  try {
    if (!timeAudioCtx) {
      timeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (timeAudioCtx.state === "suspended") {
      timeAudioCtx.resume().catch((err) => {
        console.warn("Failed to resume time audio context:", err);
      });
    }
  } catch (e) {
    console.error("AudioContext initialization failed:", e);
  }
}

export function playTimeBeep(frequency, durationMs) {
  try {
    initTimeAudio();
    if (!timeAudioCtx) return;
    
    const osc = timeAudioCtx.createOscillator();
    const gainNode = timeAudioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = frequency;
    
    osc.connect(gainNode);
    gainNode.connect(timeAudioCtx.destination);
    
    const now = timeAudioCtx.currentTime + 0.005;
    const durationSec = durationMs / 1000;
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

export function playMemoryBeep(frequency, durationMs, type = "sine") {
  try {
    initTimeAudio();
    if (!timeAudioCtx) return;
    
    const osc = timeAudioCtx.createOscillator();
    const gainNode = timeAudioCtx.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    osc.connect(gainNode);
    gainNode.connect(timeAudioCtx.destination);
    
    const now = timeAudioCtx.currentTime + 0.005;
    const durationSec = durationMs / 1000;
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

export function playTick() {
  try {
    initTimeAudio();
    if (!timeAudioCtx) return;
    
    const osc = timeAudioCtx.createOscillator();
    const gain = timeAudioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = 550;
    
    osc.connect(gain);
    gain.connect(timeAudioCtx.destination);
    
    const now = timeAudioCtx.currentTime + 0.002;
    const duration = 0.04;
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.0, now + duration);
    
    osc.start(now);
    osc.stop(now + duration + 0.005);
  } catch (e) {
    console.error("Tick audio error:", e);
  }
}

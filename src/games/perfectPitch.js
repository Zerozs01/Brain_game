import { appState, refs } from '../state.js';
import { renderResultTopTen } from '../ui/stats.js';
import { saveSessionToDatabase } from '../db.js';
import { setView } from '../ui/navigation.js';
import { renderTopStatus } from '../ui/header.js';

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ─── Audio engine state ───────────────────────────────────────────────────────
let audioCtx = null;
let analyserNode = null;
let playerOsc = null;     // Continuous oscillator for the player's guess
let playerGain = null;    // Gain node for the continuous oscillator
let animFrameId = null;   // requestAnimationFrame handle for the visualizer
let dataArray = null;     // Uint8Array for AnalyserNode time-domain data
let targetOsc = null;     // Target oscillator to allow immediate stopping
let countdownTimeoutId = null; // For round countdown
let targetMidi = 69;      // For slider glide target
let currentMidi = 69;     // For slider glide current
let glideIntervalId = null; // For slider glide animation frame
let wavePhase = 0;        // Animation phase for procedural waveform
let listenAnimFrameId = null; // Animation frame ID for listen timer countdown

// Difficulty config: { targetDuration (s), canReplay }
const DIFFICULTY_CONFIG = {
  easy:   { targetDuration: 2.5, canReplay: true },
  medium: { targetDuration: 1.0, canReplay: false },
  hard:   { targetDuration: 1.5, canReplay: false }
};

// 31-EDO Microtonal Notes for Hard Mode (from Mohajira scales, E Harmonic Dorian, A Overtone scale)
const HARD_MODE_NOTES = [
  // C mohajira scale (Root C4 = 60)
  { midi: 60, name: "C4", scale: "C mohajira scale" },
  { midi: 60 + 4 * 12 / 31, name: "D4v", scale: "C mohajira scale" },
  { midi: 60 + 9 * 12 / 31, name: "E4v", scale: "C mohajira scale" },
  { midi: 60 + 14 * 12 / 31, name: "F#4v", scale: "C mohajira scale" },
  { midi: 60 + 18 * 12 / 31, name: "G4", scale: "C mohajira scale" },
  { midi: 60 + 22 * 12 / 31, name: "A4v", scale: "C mohajira scale" },
  { midi: 60 + 27 * 12 / 31, name: "Bb4^", scale: "C mohajira scale" },
  { midi: 60 + 31 * 12 / 31, name: "C5", scale: "C mohajira scale" },

  // D mohajira scale (Root D4 = 62)
  { midi: 62, name: "D4", scale: "D mohajira scale" },
  { midi: 62 + 4 * 12 / 31, name: "E4v", scale: "D mohajira scale" },
  { midi: 62 + 9 * 12 / 31, name: "F#4v", scale: "D mohajira scale" },
  { midi: 62 + 14 * 12 / 31, name: "G#4v", scale: "D mohajira scale" },
  { midi: 62 + 18 * 12 / 31, name: "A4", scale: "D mohajira scale" },
  { midi: 62 + 22 * 12 / 31, name: "B4v", scale: "D mohajira scale" },
  { midi: 62 + 27 * 12 / 31, name: "C5^", scale: "D mohajira scale" },
  { midi: 62 + 31 * 12 / 31, name: "D5", scale: "D mohajira scale" },

  // E harmonic dorian (Root E4 = 64)
  { midi: 64, name: "E4", scale: "E harmonic dorian" },
  { midi: 64 + 4 * 12 / 31, name: "F#4v", scale: "E harmonic dorian" },
  { midi: 64 + 8 * 12 / 31, name: "G4", scale: "E harmonic dorian" },
  { midi: 64 + 14 * 12 / 31, name: "A#4v", scale: "E harmonic dorian" },
  { midi: 64 + 18 * 12 / 31, name: "B4", scale: "E harmonic dorian" },
  { midi: 64 + 22 * 12 / 31, name: "C#5v", scale: "E harmonic dorian" },
  { midi: 64 + 25 * 12 / 31, name: "D5v", scale: "E harmonic dorian" },
  { midi: 64 + 31 * 12 / 31, name: "E5", scale: "E harmonic dorian" },

  // A overtone scale (Root A3 = 57)
  { midi: 57, name: "A3", scale: "A overtone scale" },
  { midi: 57 + 5 * 12 / 31, name: "B3", scale: "A overtone scale" },
  { midi: 57 + 10 * 12 / 31, name: "C#4", scale: "A overtone scale" },
  { midi: 57 + 14 * 12 / 31, name: "D#4v", scale: "A overtone scale" },
  { midi: 57 + 18 * 12 / 31, name: "E4", scale: "A overtone scale" },
  { midi: 57 + 23 * 12 / 31, name: "F#4", scale: "A overtone scale" },
  { midi: 57 + 26 * 12 / 31, name: "G4", scale: "A overtone scale" },
  { midi: 57 + 31 * 12 / 31, name: "A4", scale: "A overtone scale" }
];

// ─── Audio helpers ────────────────────────────────────────────────────────────

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/** Convert MIDI note number to frequency (Hz) */
export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert frequency (Hz) to MIDI note number */
export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

/** Get note name and octave from MIDI number */
export function midiToNoteName(midi) {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/** Get note name with cents offset from raw MIDI float */
export function midiToNoteNameWithCents(midi) {
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = midiToNoteName(rounded);
  if (cents === 0) return name;
  const sign = cents > 0 ? "+" : "";
  return `${name} (${sign}${cents}¢)`;
}

/** Play a one-shot tone (for the target pitch) with an ADSR envelope */
export function playTone(frequency, duration = 1.5, waveform = 'sine') {
  try {
    initAudio();
    if (!audioCtx) return;

    if (targetOsc) {
      try { targetOsc.stop(); targetOsc.disconnect(); } catch (e) {}
      targetOsc = null;
    }

    const osc = audioCtx.createOscillator();
    targetOsc = osc;
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(analyserNode); // Route through analyser so visualizer reacts

    osc.type = waveform;
    osc.frequency.value = frequency;

    const now = audioCtx.currentTime;
    const A = 0.02, D = 0.05, S = 0.6, R = 0.2;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.55, now + A);
    gainNode.gain.linearRampToValueAtTime(S * 0.55, now + A + D);
    gainNode.gain.setValueAtTime(S * 0.55, now + duration - R);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch (error) {
    console.error("Failed to play tone:", error);
  }
}

export function playRoundTargetsSequentially(startIndex, callback) {
  const pp = appState.perfectPitch;
  stopPlayerOscillator(); // Stop player oscillator while target plays

  if (startIndex >= pp.notesPerRound) {
    if (callback) callback();
    // Restart player oscillator for the active slider
    if (pp.phase === "playing" && pp.isPlaying) {
      const activeSlider = document.querySelector(`.pp-dynamic-slider[data-index="${pp.activeSliderIndex}"]`);
      if (activeSlider) {
        startPlayerOscillator(midiToHz(parseFloat(activeSlider.value)));
      }
    }
    return;
  }

  const dur = DIFFICULTY_CONFIG[pp.difficulty]?.targetDuration ?? 2.5;
  playTone(pp.roundTargets[startIndex], dur, 'sine');

  if (listenAnimFrameId) {
    cancelAnimationFrame(listenAnimFrameId);
  }
  const startTime = performance.now();

  function update() {
    const elapsed = (performance.now() - startTime) / 1000;
    const remain = Math.max(0, dur - elapsed);

    if (refs.ppPhaseText) {
      refs.ppPhaseText.textContent = `HEAR NOTE ${startIndex + 1}/${pp.notesPerRound}: ${remain.toFixed(1)}s`;
      refs.ppPhaseText.className = "pp-phase-badge text-purple-400 font-bold tracking-widest animate-pulse";
    }

    if (remain > 0) {
      listenAnimFrameId = requestAnimationFrame(update);
    } else {
      listenAnimFrameId = null;
      // Play next note with a slight gap of 300ms
      setTimeout(() => {
        if (!pp.isPlaying) return;
        playRoundTargetsSequentially(startIndex + 1, callback);
      }, 300);
    }
  }
  update();
}

export function playTarget() {
  const pp = appState.perfectPitch;
  if (pp.roundTargets && pp.roundTargets.length > 0) {
    playRoundTargetsSequentially(0, () => {
      if (refs.ppPhaseText) {
        refs.ppPhaseText.textContent = "🎚️ Match the Pitch";
        refs.ppPhaseText.className = "pp-phase-badge";
      }
    });
  }
}

/** Start continuous player oscillator — soft sine at gain 0.18 */
function startPlayerOscillator(frequency) {
  try {
    initAudio();
    stopPlayerOscillator(); // Ensure no duplicate

    playerOsc = audioCtx.createOscillator();
    playerGain = audioCtx.createGain();

    playerOsc.connect(playerGain);
    playerGain.connect(analyserNode);

    playerOsc.type = 'sine';
    playerOsc.frequency.value = frequency;
    playerGain.gain.setValueAtTime(0, audioCtx.currentTime);
    playerGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.04);

    playerOsc.start();
  } catch (e) {
    console.error("Failed to start player oscillator:", e);
  }
}

/** Smoothly stop the continuous player oscillator */
function stopPlayerOscillator() {
  if (playerOsc) {
    try {
      const now = audioCtx.currentTime;
      playerGain.gain.cancelScheduledValues(now);
      playerGain.gain.setValueAtTime(playerGain.gain.value, now);
      playerGain.gain.linearRampToValueAtTime(0, now + 0.06);
      playerOsc.stop(now + 0.07);
    } catch (_) { /* already stopped */ }
    playerOsc = null;
    playerGain = null;
  }
}

/** Update frequency of continuous oscillator when slider moves (no glitch) */
function updatePlayerOscFrequency(frequency) {
  if (playerOsc) {
    playerOsc.frequency.setTargetAtTime(frequency, audioCtx.currentTime, 0.015);
  } else {
    startPlayerOscillator(frequency);
  }
}

// ─── Canvas Visualizer ────────────────────────────────────────────────────────

function drawVisualizer() {
  const canvas = refs.ppVisualizer;
  if (!canvas) {
    animFrameId = null;
    return;
  }

  animFrameId = requestAnimationFrame(drawVisualizer);

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // เคลียร์พื้นหลังให้สะอาด
  ctx.fillStyle = '#111317'; // var(--surface-low)
  ctx.fillRect(0, 0, W, H);

  // Get current active frequency dynamically
  const pp = appState.perfectPitch;
  let currentFreq = 440;
  let showWave = true;
  if (pp && pp.isPlaying) {
    if (playerOsc) {
      currentFreq = pp.guessFrequency;
    } else if (pp.phase === "playing" && pp.targetFrequency > 0) {
      currentFreq = pp.targetFrequency;
      // In Hard mode, hide the waveform while target is playing
      if (pp.difficulty === "hard") {
        showWave = false;
      }
    } else {
      currentFreq = 440;
      if (pp.phase === "countdown") {
        showWave = false;
      }
    }
  } else {
    showWave = false;
  }

  // Draw centre grid line
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  if (!showWave) {
    // Draw resting flat line with a subtle breathing pulse
    const pulse = Math.sin(Date.now() / 200) * 0.03 + 0.12;
    ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    return;
  }

  // แปลงความถี่ให้อยู่ในสเกล Log
  const minFreq = 80;
  const maxFreq = 4000;
  const normFreq = Math.log(currentFreq / minFreq) / Math.log(maxFreq / minFreq);
  const waveLength = 200 - (normFreq * 170); 
  const amplitude = H / 3.5; 

  // --- LAYER 3: Background Rose Wave (Thinnest) ---
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const distanceToCenter = Math.abs(x - W / 2) / (W / 2);
    const edgeFade = Math.max(0, 1 - Math.pow(distanceToCenter, 1.5)); 
    const y = (H / 2) + Math.sin((x / (waveLength * 1.15)) + wavePhase * 0.8 + 1.2) * (amplitude * 0.85 * edgeFade);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- LAYER 2: Middle Purple Wave (Medium) ---
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const distanceToCenter = Math.abs(x - W / 2) / (W / 2);
    const edgeFade = Math.max(0, 1 - Math.pow(distanceToCenter, 1.5)); 
    const y = (H / 2) + Math.sin((x / (waveLength * 0.9)) + wavePhase * 1.2 - 0.6) * (amplitude * 0.95 * edgeFade);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- LAYER 1: Primary Cyan Wave (Thick & Glowing) ---
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#00f0ff'; // var(--primary-container)
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  const primaryPoints = [];

  for (let x = 0; x < W; x++) {
    const distanceToCenter = Math.abs(x - W / 2) / (W / 2);
    const edgeFade = Math.max(0, 1 - Math.pow(distanceToCenter, 1.5)); 
    const y = (H / 2) + Math.sin((x / waveLength) + wavePhase) * (amplitude * edgeFade);
    
    primaryPoints.push({ x, y });

    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow blur

  // --- GLOW GRADIENT AREA UNDER THE PRIMARY WAVE ---
  ctx.beginPath();
  ctx.moveTo(primaryPoints[0].x, H / 2);
  for (let i = 0; i < primaryPoints.length; i++) {
    ctx.lineTo(primaryPoints[i].x, primaryPoints[i].y);
  }
  ctx.lineTo(primaryPoints[primaryPoints.length - 1].x, H / 2);
  ctx.closePath();

  const areaGradient = ctx.createLinearGradient(0, H / 2 - amplitude, 0, H / 2 + amplitude);
  areaGradient.addColorStop(0, 'rgba(0, 240, 255, 0.07)');
  areaGradient.addColorStop(0.5, 'rgba(0, 240, 255, 0)');
  areaGradient.addColorStop(1, 'rgba(0, 240, 255, 0.07)');
  ctx.fillStyle = areaGradient;
  ctx.fill();

  // --- SUBTLE GLOWING PARTICLES ALONG THE PRIMARY WAVE ---
  ctx.fillStyle = '#dbfcff';
  for (let i = 20; i < primaryPoints.length - 20; i += 60) {
    const pt = primaryPoints[i];
    const distanceToCenter = Math.abs(pt.x - W / 2) / (W / 2);
    const edgeFade = Math.max(0, 1 - Math.pow(distanceToCenter, 1.5));
    if (edgeFade > 0.3) {
      const r = (2 + Math.sin(Date.now() / 150 + i) * 1) * edgeFade;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ทำให้คลื่นไหลสมูท ความเร็วสัมพันธ์กับความถี่
  const speed = 0.03 + (normFreq * 0.1);
  wavePhase -= speed;
}

function startVisualizer() {
  if (!animFrameId) {
    drawVisualizer();
  }
}

function stopVisualizer() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  // Clear canvas to a resting state
  const canvas = refs.ppVisualizer;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateScore(guessedHz, targetHz) {
  const centsErr = 1200 * Math.log2(guessedHz / targetHz);
  const absErr = Math.abs(centsErr);

  let score = 0;
  let feedback = "";

  if (absErr < 5) {
    score = 100;
    feedback = "Perfect! หูทองคำ 🌟";
  } else if (absErr < 20) {
    score = 80;
    feedback = "Great! ใกล้เคียงมาก ✨";
  } else if (absErr < 50) {
    score = 50;
    feedback = "Good! ห่างกันไม่เกินครึ่งเสียง";
  } else {
    score = Math.max(0, Math.floor(30 - absErr * 0.1));
    feedback = "Try Again! ลองฟังใหม่อีกรอบ 🎧";
  }

  return { score, centsErr, feedback };
}

// ─── HUD & Display ────────────────────────────────────────────────────────────

export function renderPerfectPitchHud() {
  const pp = appState.perfectPitch;
  if (refs.ppRoundHud) refs.ppRoundHud.textContent = `${pp.round}/${pp.totalRounds}`;

  const currentAvg = pp.scores.length > 0
    ? pp.scores.reduce((a, b) => a + b, 0) / pp.scores.length
    : 0;
  if (refs.ppScoreHud) refs.ppScoreHud.textContent = currentAvg.toFixed(1);
}

// slider display helpers removed - handled dynamically by dynamic sliders

// ─── Game Flow ────────────────────────────────────────────────────────────────

function stopAllAudio() {
  // ปิดเสียงผู้เล่น
  stopPlayerOscillator();
  
  // ปิดเสียงโจทย์
  if (targetOsc) {
    try { targetOsc.stop(); targetOsc.disconnect(); } catch (e) {}
    targetOsc = null;
  }
  
  // หยุดวาดคลื่นเสียง
  stopVisualizer();

  // หยุดนับถอยหลัง
  if (countdownTimeoutId) {
    clearTimeout(countdownTimeoutId);
    countdownTimeoutId = null;
  }

  // หยุดเวลานับถอยหลังในการฟัง
  if (listenAnimFrameId) {
    cancelAnimationFrame(listenAnimFrameId);
    listenAnimFrameId = null;
  }

  // หยุดการเลื่อนแบบมีแรงต้าน (Glide)
  if (glideIntervalId) {
    cancelAnimationFrame(glideIntervalId);
    glideIntervalId = null;
  }
}

export function resetPitchGameSession() {
  stopAllAudio();

  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend(); // พักระบบเสียงเมื่อไม่ได้อยู่ในเกม
  }

  const pp = appState.perfectPitch;
  if (pp) {
    pp.round = 1;
    pp.score = 0;
    pp.scores = [];
    pp.targets = [];
    pp.guesses = [];
    pp.centsErrors = [];
    pp.phase = "idle";
    pp.isPlaying = false;
    pp.sessionSaved = false;
    pp.startTime = 0;
    pp.roundTargets = [];
    pp.roundGuesses = [];
    pp.roundCentsErrors = [];
    pp.activeSliderIndex = 0;
  }

  if (refs.ppStartOverlay) refs.ppStartOverlay.classList.remove("hidden");
  if (refs.ppRoundResultOverlay) refs.ppRoundResultOverlay.classList.add("hidden");
  if (refs.ppResultModal) refs.ppResultModal.classList.add("hidden");
  if (refs.ppPhaseText) {
    refs.ppPhaseText.textContent = "Ready...";
    refs.ppPhaseText.className = "pp-phase-badge";
  }
  if (refs.ppSubmitBtn) {
    refs.ppSubmitBtn.disabled = false;
    refs.ppSubmitBtn.classList.add("hidden");
  }

  // Clear dyn sliders and list container
  if (refs.ppSlidersContainer) refs.ppSlidersContainer.innerHTML = "";
  const resultContainer = document.getElementById("pitchResultListContainer");
  if (resultContainer) resultContainer.innerHTML = "";

  renderPerfectPitchHud();
}

function runPitchCountdown(callback) {
  const pp = appState.perfectPitch;
  pp.phase = "countdown";

  if (refs.ppPhaseText) {
    refs.ppPhaseText.textContent = "Ready...";
    refs.ppPhaseText.className = "pp-phase-badge text-purple-400 animate-pulse font-bold";
  }

  if (refs.ppSubmitBtn) refs.ppSubmitBtn.disabled = true;

  playTone(300, 0.15, 'sine');

  countdownTimeoutId = setTimeout(() => {
    if (!pp.isPlaying || pp.phase !== "countdown") return;
    if (refs.ppPhaseText) {
      refs.ppPhaseText.textContent = "Set...";
      refs.ppPhaseText.className = "pp-phase-badge text-yellow-400 animate-pulse font-bold";
    }
    playTone(300, 0.15, 'sine');

    countdownTimeoutId = setTimeout(() => {
      if (!pp.isPlaying || pp.phase !== "countdown") return;
      if (refs.ppPhaseText) {
        refs.ppPhaseText.textContent = "Go!";
        refs.ppPhaseText.className = "pp-phase-badge text-emerald-400 scale-110 transition-transform duration-100 font-bold";
      }
      playTone(600, 0.25, 'sine');

      countdownTimeoutId = setTimeout(() => {
        if (!pp.isPlaying || pp.phase !== "countdown") return;
        if (refs.ppPhaseText) {
          refs.ppPhaseText.className = "pp-phase-badge";
        }
        callback();
      }, 800);
    }, 1000);
  }, 1000);
}

// startGlideLoop removed - randomized starting values set dynamically in generateSlidersUI

export function resetPerfectPitchGame() {
  resetPitchGameSession();
  updateDifficultyUI();
}

function updateDifficultyUI() {
  const pp = appState.perfectPitch;
  const diff = pp.difficulty ?? "easy";
  const ids = { easy: refs.ppEasyBtn, medium: refs.ppMediumBtn, hard: refs.ppHardBtn };

  Object.entries(ids).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("diff-btn--active", key === diff);
  });

  // Also update active note count button
  const countButtons = document.querySelectorAll(".pp-note-count-btn");
  countButtons.forEach(btn => {
    const btnCount = parseInt(btn.dataset.count) || 1;
    btn.classList.toggle("active", btnCount === (pp.notesPerRound || 1));
  });
}

// 1. ฟังก์ชันจับเวลาตอนฟังเสียง (แสดง 2.5s -> 0.0s)
function startListenTimer(durationSec, callback) {
  if (listenAnimFrameId) {
    cancelAnimationFrame(listenAnimFrameId);
  }
  const startTime = performance.now();

  function update() {
    const elapsed = (performance.now() - startTime) / 1000;
    const remain = Math.max(0, durationSec - elapsed);
    
    if (refs.ppPhaseText) {
      refs.ppPhaseText.textContent = `LISTEN: ${remain.toFixed(1)}s`;
      refs.ppPhaseText.className = "pp-phase-badge text-purple-400 font-bold tracking-widest animate-pulse";
    }

    if (remain > 0) {
      listenAnimFrameId = requestAnimationFrame(update);
    } else {
      listenAnimFrameId = null;
      callback(); // หมดเวลาแล้ว ให้เรียกฟังก์ชันเดาคำตอบ (startPlayerGuessing)
    }
  }
  update();
}

function generateSlidersUI() {
  const pp = appState.perfectPitch;
  if (!refs.ppSlidersContainer) return;

  refs.ppSlidersContainer.innerHTML = "";
  pp.activeSliderIndex = 0;
  pp.roundGuesses = [];

  for (let i = 0; i < pp.notesPerRound; i++) {
    // Randomize slider start position so player can't camp
    const startMidiVal = 54 + Math.floor(Math.random() * 18); // C4–F#5
    pp.roundGuesses[i] = midiToHz(startMidiVal);

    const col = document.createElement("div");
    col.className = "pp-slider-col flex flex-col items-center gap-2 transition-opacity duration-200";
    col.setAttribute("data-index", i);
    if (i > 0) {
      col.style.opacity = "0.3";
    }

    col.innerHTML = `
      <span class="text-[9px] font-bold uppercase tracking-widest text-[#9b9fa7]">C6</span>
      <div class="pitch-track">
        <input
          class="slider-range pitch-slider-range slider-antigravity pp-dynamic-slider"
          type="range"
          min="48"
          max="84"
          step="0.01"
          value="${startMidiVal}"
          data-index="${i}"
          ${i > 0 ? "disabled" : ""}
        />
      </div>
      <span class="text-[9px] font-bold uppercase tracking-widest text-[#9b9fa7]">C3</span>
      <button class="pp-slider-confirm-btn font-semibold text-[10px] px-2 py-1 bg-surface-low border border-surface-border text-white rounded hover:bg-[#333] transition-colors mt-1" data-index="${i}" ${i > 0 ? "disabled" : ""}>
        Confirm
      </button>
    `;

    const slider = col.querySelector(".pp-dynamic-slider");
    const confirmBtn = col.querySelector(".pp-slider-confirm-btn");

    // Slider input event (real-time readout and frequency updates)
    slider.addEventListener("input", () => {
      const value = parseFloat(slider.value);
      pp.roundGuesses[i] = midiToHz(value);
      
      // Update real-time display in readout card
      if (refs.ppCurrentNote) {
        if (pp.difficulty === "easy") {
          refs.ppCurrentNote.textContent = midiToNoteNameWithCents(value);
        } else {
          refs.ppCurrentNote.textContent = getNoteFromHz(pp.roundGuesses[i], pp.difficulty);
        }
      }
      if (refs.ppCurrentHz) {
        refs.ppCurrentHz.textContent = `${pp.roundGuesses[i].toFixed(1)} Hz`;
      }

      // Update player oscillator frequency
      updatePlayerOscFrequency(pp.roundGuesses[i]);
    });

    // Confirm button event
    confirmBtn.addEventListener("click", () => {
      confirmNoteIndex(i);
    });

    refs.ppSlidersContainer.appendChild(col);
  }

  // Update readouts for Note 1
  const firstSlider = refs.ppSlidersContainer.querySelector('.pp-dynamic-slider[data-index="0"]');
  if (firstSlider) {
    const val = parseFloat(firstSlider.value);
    if (refs.ppCurrentNote) {
      if (pp.difficulty === "easy") {
        refs.ppCurrentNote.textContent = midiToNoteNameWithCents(val);
      } else {
        refs.ppCurrentNote.textContent = getNoteFromHz(midiToHz(val), pp.difficulty);
      }
    }
    if (refs.ppCurrentHz) refs.ppCurrentHz.textContent = `${midiToHz(val).toFixed(1)} Hz`;
  }
}

function confirmNoteIndex(index) {
  const pp = appState.perfectPitch;
  
  // Stop continuous player oscillator for this note (go silent)
  stopPlayerOscillator();

  // Lock this slider column
  const col = refs.ppSlidersContainer.querySelector(`.pp-slider-col[data-index="${index}"]`);
  if (col) {
    col.style.opacity = "0.3";
    const slider = col.querySelector(".pp-dynamic-slider");
    const confirmBtn = col.querySelector(".pp-slider-confirm-btn");
    if (slider) slider.disabled = true;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Confirmed ✓";
      confirmBtn.classList.remove("hover:bg-[#333]");
      confirmBtn.classList.add("bg-emerald-950/40", "border-emerald-800", "text-emerald-400");
    }
  }

  // Go to next slider
  pp.activeSliderIndex = index + 1;
  if (pp.activeSliderIndex < pp.notesPerRound) {
    // Activate next slider column
    const nextCol = refs.ppSlidersContainer.querySelector(`.pp-slider-col[data-index="${pp.activeSliderIndex}"]`);
    if (nextCol) {
      nextCol.style.opacity = "1";
      const nextSlider = nextCol.querySelector(".pp-dynamic-slider");
      const nextConfirmBtn = nextCol.querySelector(".pp-slider-confirm-btn");
      if (nextSlider) nextSlider.disabled = false;
      if (nextConfirmBtn) nextConfirmBtn.disabled = false;

      // Start sound for the next note immediately
      const val = parseFloat(nextSlider.value);
      pp.roundGuesses[pp.activeSliderIndex] = midiToHz(val);
      startPlayerOscillator(pp.roundGuesses[pp.activeSliderIndex]);

      // Update real-time display in readout card
      if (refs.ppCurrentNote) {
        if (pp.difficulty === "easy") {
          refs.ppCurrentNote.textContent = midiToNoteNameWithCents(val);
        } else {
          refs.ppCurrentNote.textContent = getNoteFromHz(pp.roundGuesses[pp.activeSliderIndex], pp.difficulty);
        }
      }
      if (refs.ppCurrentHz) {
        refs.ppCurrentHz.textContent = `${pp.roundGuesses[pp.activeSliderIndex].toFixed(1)} Hz`;
      }
    }
  } else {
    // All notes confirmed! Submit the answer for the round.
    submitPerfectPitchAnswer();
  }
}

// ฟังก์ชันเริ่มให้ผู้เล่นปรับคีย์และเดาเสียง
function startPlayerGuessing() {
  const pp = appState.perfectPitch;
  if (!pp.isPlaying || pp.phase !== "playing") return;
  
  if (refs.ppPhaseText) {
    refs.ppPhaseText.textContent = "🎚️ Match the Pitch";
    refs.ppPhaseText.className = "pp-phase-badge";
  }
  if (refs.ppSubmitBtn) refs.ppSubmitBtn.disabled = false;
  
  generateSlidersUI();

  // Start continuous tone for Note 1
  const firstSlider = document.querySelector('.pp-dynamic-slider[data-index="0"]');
  if (firstSlider) {
    const val = parseFloat(firstSlider.value);
    startPlayerOscillator(midiToHz(val));
  }
}

export function startPerfectPitchGame() {
  initAudio();
  resetPerfectPitchGame();
  const pp = appState.perfectPitch;
  pp.isPlaying = true;
  pp.startTime = Date.now();

  if (refs.ppStartOverlay) refs.ppStartOverlay.classList.add("hidden");
  startVisualizer();
  beginPerfectPitchRound();
}

function beginPerfectPitchRound() {
  const pp = appState.perfectPitch;
  
  if (countdownTimeoutId) {
    clearTimeout(countdownTimeoutId);
    countdownTimeoutId = null;
  }
  if (listenAnimFrameId) {
    cancelAnimationFrame(listenAnimFrameId);
    listenAnimFrameId = null;
  }

  if (refs.ppRoundResultOverlay) refs.ppRoundResultOverlay.classList.add("hidden");
  if (refs.ppSubmitBtn) refs.ppSubmitBtn.disabled = true;

  // Relay controls visibility based on difficulty
  const canReplay = DIFFICULTY_CONFIG[pp.difficulty]?.canReplay ?? false;
  if (refs.ppReplayContainer) {
    refs.ppReplayContainer.classList.toggle("hidden", !canReplay);
  }

  // Clear dyn sliders and list container
  if (refs.ppSlidersContainer) refs.ppSlidersContainer.innerHTML = "";
  const resultContainer = document.getElementById("pitchResultListContainer");
  if (resultContainer) resultContainer.innerHTML = "";

  // Stop any previous continuous oscillator before playing target
  stopPlayerOscillator();

  runPitchCountdown(() => {
    pp.phase = "playing";
    
    pp.roundTargets = [];
    for (let i = 0; i < pp.notesPerRound; i++) {
      let targetMidiNote;
      if (pp.difficulty === "hard") {
        const randomEntry = HARD_MODE_NOTES[Math.floor(Math.random() * HARD_MODE_NOTES.length)];
        targetMidiNote = randomEntry.midi;
      } else {
        targetMidiNote = 48 + Math.floor(Math.random() * 37);
      }
      const freq = midiToHz(targetMidiNote);
      pp.roundTargets.push(freq);
      pp.targets.push(freq); // For full history
    }

    // Play target notes sequentially
    playRoundTargetsSequentially(0, startPlayerGuessing);
  });

  renderPerfectPitchHud();
}

// ฟังก์ชันแปลงความถี่ (Hz) เป็นชื่อตัวโน้ต รองรับ 31-EDO ในโหมด Hard
function getNoteFromHz(hz, difficulty) {
    if (difficulty === 'hard') {
        const targetMidi = 69 + 12 * Math.log2(hz / 440);
        let closestNote = HARD_MODE_NOTES[0];
        let minDiff = Math.abs(targetMidi - closestNote.midi);
        for (let i = 1; i < HARD_MODE_NOTES.length; i++) {
            const diff = Math.abs(targetMidi - HARD_MODE_NOTES[i].midi);
            if (diff < minDiff) {
                minDiff = diff;
                closestNote = HARD_MODE_NOTES[i];
            }
        }
        return closestNote.name;
    }

    const A4 = 440;
    let noteNum = Math.round(12 * Math.log2(hz / A4) + 69);
    const baseMidi = Math.floor(noteNum);
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = notes[((baseMidi % 12) + 12) % 12];
    const octave = Math.floor(baseMidi / 12) - 1;
    return `${noteName}${octave}`;
}

function submitPerfectPitchAnswer() {
  const pp = appState.perfectPitch;
  if (pp.phase !== "playing") return;

  pp.phase = "round_result";
  stopPlayerOscillator();

  let roundScoreSum = 0;
  let roundCentsErrSum = 0;
  
  // Clear result list
  const resultContainer = document.getElementById("pitchResultListContainer");
  if (resultContainer) resultContainer.innerHTML = "";

  for (let i = 0; i < pp.notesPerRound; i++) {
    const targetHz = pp.roundTargets[i];
    const guessHz = pp.roundGuesses[i];
    
    const { score, centsErr } = calculateScore(guessHz, targetHz);
    roundScoreSum += score;
    roundCentsErrSum += centsErr;

    pp.guesses.push(guessHz);
    pp.centsErrors.push(centsErr);

    // Create result row in overlay
    if (resultContainer) {
      const row = document.createElement("div");
      row.className = "flex flex-col gap-2 bg-surface-low border border-surface-border rounded-xl p-4 w-full";
      
      const targetNote = getNoteFromHz(targetHz, pp.difficulty);
      const guessNote = getNoteFromHz(guessHz, pp.difficulty);
      
      const sign = centsErr > 0 ? "+" : "";
      const absError = Math.abs(centsErr);
      let colorClass = "";
      if (absError <= 20) colorClass = "text-[#22C55E]";
      else if (absError <= 100) colorClass = "text-[#FBBF24]";
      else colorClass = "text-[#A855F7]";

      row.innerHTML = `
        <div class="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-wider pb-1 border-b border-surface-border/50">
          <span>Note ${i + 1}</span>
          <span class="pitch-note-hint ${pp.difficulty === 'easy' ? '' : 'hidden'}">${targetNote} vs ${guessNote}</span>
        </div>
        <div class="flex justify-between items-center">
          <div>
            <span class="text-[9px] font-bold uppercase tracking-widest text-muted block mb-0.5">Target</span>
            <span class="text-xl font-space font-bold text-white">${targetHz.toFixed(1)} <span class="text-xs text-muted">Hz</span></span>
          </div>
          <div class="text-right">
            <span class="text-[9px] font-bold uppercase tracking-widest text-muted block mb-0.5">Your Guess</span>
            <span class="text-xl font-space font-bold text-primary">${guessHz.toFixed(1)} <span class="text-xs text-muted">Hz</span></span>
          </div>
        </div>
        <div class="text-[11px] font-medium text-muted mt-1 text-center ${pp.difficulty === 'easy' ? '' : 'hidden'}">
          Difference: <span class="font-bold ${colorClass}">${sign}${centsErr.toFixed(1)} cents</span>
        </div>
      `;
      resultContainer.appendChild(row);
    }
  }

  const avgScore = roundScoreSum / pp.notesPerRound;
  const avgCentsErr = roundCentsErrSum / pp.notesPerRound;
  pp.scores.push(avgScore);

  if (refs.ppPhaseText) refs.ppPhaseText.textContent = "Round Result";

  // Display feedback title based on average score
  const feedbackEl = refs.ppRoundTitle;
  if (feedbackEl) {
    feedbackEl.classList.remove('text-[#22C55E]', 'text-[#FBBF24]', 'text-[#A855F7]');
    if (avgScore >= 90) {
      feedbackEl.classList.add('text-[#22C55E]');
      feedbackEl.textContent = "Perfect Match!";
    } else if (avgScore >= 60) {
      feedbackEl.classList.add('text-[#FBBF24]');
      feedbackEl.textContent = "Close Enough";
    } else {
      feedbackEl.classList.add('text-[#A855F7]');
      feedbackEl.textContent = "Way Off";
    }
  }

  if (refs.ppNextRoundBtn) {
    refs.ppNextRoundBtn.textContent = (pp.round < pp.totalRounds) ? "Next Pitch 🎵" : "Summary 📊";
  }

  if (refs.ppRoundResultOverlay) refs.ppRoundResultOverlay.classList.remove('hidden');

  renderPerfectPitchHud();
}

function nextPerfectPitchRound(loadStatsOverview) {
  const pp = appState.perfectPitch;
  if (pp.phase !== "round_result") return;

  if (pp.round < pp.totalRounds) {
    pp.round += 1;
    renderPerfectPitchHud();
    beginPerfectPitchRound();
  } else {
    endPerfectPitchSession(loadStatsOverview);
  }
}

function endPerfectPitchSession(loadStatsOverview) {
  const pp = appState.perfectPitch;
  pp.phase = "complete";
  pp.isPlaying = false;

  stopPlayerOscillator();
  stopVisualizer();

  if (refs.ppRoundResultOverlay) refs.ppRoundResultOverlay.classList.add("hidden");

  const finalScore = pp.scores.reduce((a, b) => a + b, 0) / pp.totalRounds;

  if (refs.ppResultScore) refs.ppResultScore.textContent = finalScore.toFixed(1);
  if (refs.ppResultAccuracy) refs.ppResultAccuracy.textContent = `${finalScore.toFixed(1)}%`;

  const totalPlaySeconds = Math.max(1, Math.round((Date.now() - pp.startTime) / 1000));

  const gameTypeKey = "sound_perfect_pitch_" + pp.difficulty;
  renderResultTopTen(gameTypeKey, finalScore, refs.ppResultTop10, refs.ppResultRank);

  if (refs.ppResultModal) refs.ppResultModal.classList.remove("hidden");

  if (!pp.sessionSaved) {
    pp.sessionSaved = true;
    appState.topScore += Math.round(finalScore);
    renderTopStatus();

    saveSessionToDatabase({
      gameType: gameTypeKey,
      cognitiveDomain: "memory",
      score: finalScore,
      accuracy: finalScore,
      peakMultiplier: null,
      durationSeconds: totalPlaySeconds,
      roundCount: pp.totalRounds,
      detail: {
        difficulty: pp.difficulty,
        targets: pp.targets,
        guesses: pp.guesses,
        scores: pp.scores,
        centsErrors: pp.centsErrors
      }
    }).then(() => {
      if (loadStatsOverview) loadStatsOverview();
    });
  }
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindPerfectPitchEvents(loadStatsOverview) {
  // Difficulty buttons in the start overlay
  if (refs.ppEasyBtn) {
    refs.ppEasyBtn.addEventListener("click", () => {
      appState.perfectPitch.difficulty = "easy";
      updateDifficultyUI();
      startPerfectPitchGame();
    });
  }
  if (refs.ppMediumBtn) {
    refs.ppMediumBtn.addEventListener("click", () => {
      appState.perfectPitch.difficulty = "medium";
      updateDifficultyUI();
      startPerfectPitchGame();
    });
  }
  if (refs.ppHardBtn) {
    refs.ppHardBtn.addEventListener("click", () => {
      appState.perfectPitch.difficulty = "hard";
      updateDifficultyUI();
      startPerfectPitchGame();
    });
  }

  // Note count buttons selector
  const countButtons = document.querySelectorAll(".pp-note-count-btn");
  countButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const count = parseInt(btn.dataset.count) || 1;
      appState.perfectPitch.notesPerRound = count;
      updateDifficultyUI();
    });
  });

  // Replay target button (Easy only)
  if (refs.ppPlayTargetBtn) {
    refs.ppPlayTargetBtn.addEventListener("click", () => {
      const pp = appState.perfectPitch;
      if (pp.phase === "playing" && DIFFICULTY_CONFIG[pp.difficulty]?.canReplay) {
        playTarget();
      }
    });
  }

  if (refs.ppNextRoundBtn) {
    refs.ppNextRoundBtn.addEventListener("click", () => nextPerfectPitchRound(loadStatsOverview));
  }

  if (refs.ppResultPlayAgain) {
    refs.ppResultPlayAgain.addEventListener("click", startPerfectPitchGame);
  }

  if (refs.ppResultBack) {
    refs.ppResultBack.addEventListener("click", () => {
      setView("dashboardView", loadStatsOverview);
      resetPerfectPitchGame();
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initPerfectPitch(loadStatsOverview) {
  if (!appState.resets) appState.resets = {};
  appState.resets.perfectPitch = resetPitchGameSession;

  if (!appState.perfectPitch) {
    appState.perfectPitch = {
      round: 1, totalRounds: 5,
      score: 0, scores: [],
      targets: [], guesses: [], centsErrors: [],
      phase: "idle",
      targetFrequency: 0, guessFrequency: 440,
      sessionSaved: false, startTime: 0,
      isPlaying: false,
      difficulty: "easy",
      notesPerRound: 1
    };
  } else {
    if (!appState.perfectPitch.difficulty) {
      appState.perfectPitch.difficulty = "easy";
    }
    if (appState.perfectPitch.notesPerRound === undefined) {
      appState.perfectPitch.notesPerRound = 1;
    }
  }

  resetPerfectPitchGame();
  bindPerfectPitchEvents(loadStatsOverview);
}

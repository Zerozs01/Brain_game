import { appState } from '../state.js';
import { calculateSequenceScore } from '../helpers.js';
import { saveSessionToDatabase } from '../db.js';
import { setView } from '../ui/navigation.js';

let sqRefs = null;

const state = {
  sequence: [],
  playerStep: 0,
  level: 1,
  isPlaying: false,
  isFlashActive: false,
  startedAtMs: 0
};

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(index) {
  try {
    initAudio();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 200 + (index * 60);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.error('Audio Playback failed:', e);
  }
}

export function resetGame() {
  state.sequence = [];
  state.playerStep = 0;
  state.level = 1;
  state.isPlaying = false;
  state.isFlashActive = false;
  
  if (sqRefs) {
    if (sqRefs.levelLabel) sqRefs.levelLabel.textContent = '1';
    if (sqRefs.scoreLabel) sqRefs.scoreLabel.textContent = '0';
    if (sqRefs.instruction) sqRefs.instruction.textContent = 'Click start to begin the spatial memory challenge!';
    if (sqRefs.overlay) sqRefs.overlay.classList.remove('hidden');
    if (sqRefs.resultModal) sqRefs.resultModal.classList.add('hidden');
    if (sqRefs.tiles) {
      sqRefs.tiles.forEach(tile => {
        tile.style.backgroundColor = '#2A2A2A';
      });
    }
  }
}

export function startGame() {
  resetGame();
  state.isPlaying = true;
  state.startedAtMs = Date.now();
  if (sqRefs) {
    if (sqRefs.overlay) sqRefs.overlay.classList.add('hidden');
    if (sqRefs.resultModal) sqRefs.resultModal.classList.add('hidden');
  }
  nextLevel();
}

function pauseGame(loadStatsOverview) {
  state.isPlaying = false;
  exitGame(loadStatsOverview);
}

function exitGame(loadStatsOverview) {
  setView("dashboardView", loadStatsOverview);
}

function nextLevel() {
  state.playerStep = 0;
  if (sqRefs) {
    if (sqRefs.levelLabel) sqRefs.levelLabel.textContent = String(state.level);
    if (sqRefs.scoreLabel) sqRefs.scoreLabel.textContent = String(state.level - 1);
    if (sqRefs.instruction) sqRefs.instruction.textContent = `Watch Level ${state.level}...`;
  }
  
  const nextTile = Math.floor(Math.random() * 9);
  state.sequence.push(nextTile);

  flashSequence();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function flashSequence() {
  state.isFlashActive = true;
  await sleep(600);

  for (let i = 0; i < state.sequence.length; i++) {
    if (!state.isPlaying) return;
    const tileIndex = state.sequence[i];
    const tile = sqRefs.tiles[tileIndex];
    
    tile.style.backgroundColor = '#3b82f6';
    playTone(tileIndex);
    await sleep(350);
    
    tile.style.backgroundColor = '#2A2A2A';
    await sleep(200);
  }

  state.isFlashActive = false;
  if (sqRefs && sqRefs.instruction) sqRefs.instruction.textContent = 'Repeat the sequence!';
}

function handleTileClick(index, tile, loadStatsOverview) {
  const expectedIndex = state.sequence[state.playerStep];
  
  if (index === expectedIndex) {
    playTone(index);
    tile.style.backgroundColor = '#10b981';
    setTimeout(() => {
      tile.style.backgroundColor = '#2A2A2A';
    }, 150);

    state.playerStep++;
    if (state.playerStep === state.sequence.length) {
      state.level++;
      if (sqRefs && sqRefs.instruction) sqRefs.instruction.textContent = 'Excellent! Get ready...';
      setTimeout(() => {
        if (state.isPlaying) nextLevel();
      }, 800);
    }
  } else {
    playTone(4);
    tile.style.backgroundColor = '#ef4444';
    setTimeout(() => {
      tile.style.backgroundColor = '#2A2A2A';
    }, 300);

    gameOver(loadStatsOverview);
  }
}

function gameOver(loadStatsOverview) {
  state.isPlaying = false;
  const rawScore = state.level - 1;
  const weightedScore = calculateSequenceScore(state.level);

  if (sqRefs) {
    if (sqRefs.resultScore) sqRefs.resultScore.textContent = String(weightedScore);
    
    const tagline = sqRefs.resultModal ? sqRefs.resultModal.querySelector('.cm-result-tagline') : null;
    if (tagline) {
      tagline.textContent = `Completed Level ${rawScore}. Superb spatial reasoning.`;
    }

    if (sqRefs.resultModal) sqRefs.resultModal.classList.remove('hidden');
  }

  const duration = (Date.now() - state.startedAtMs) / 1000;
  saveSessionToDatabase({
    gameType: "sequence_memory",
    cognitiveDomain: "memory",
    score: weightedScore,
    accuracy: 100,
    durationSeconds: Math.round(duration),
    roundCount: state.level,
    detail: {
      level: state.level
    }
  }).then(() => {
    if (loadStatsOverview) {
      loadStatsOverview();
    }
  });
}

function bindSequenceEvents(loadStatsOverview) {
  if (sqRefs.startBtn) sqRefs.startBtn.addEventListener('click', startGame);
  if (sqRefs.pauseBtn) sqRefs.pauseBtn.addEventListener('click', () => pauseGame(loadStatsOverview));
  if (sqRefs.resultPlayAgain) sqRefs.resultPlayAgain.addEventListener('click', startGame);
  if (sqRefs.resultBack) sqRefs.resultBack.addEventListener('click', () => exitGame(loadStatsOverview));

  sqRefs.tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      if (!state.isPlaying || state.isFlashActive) return;
      const index = parseInt(tile.dataset.index);
      handleTileClick(index, tile, loadStatsOverview);
    });
  });
}

export function initSequenceMemory(loadStatsOverview) {
  // Cache DOM references
  sqRefs = {
    view: document.getElementById('sequenceMemoryView'),
    grid: document.getElementById('sqGrid'),
    tiles: Array.from(document.querySelectorAll('.sq-tile')),
    startBtn: document.getElementById('sqStartBtn'),
    pauseBtn: document.getElementById('sqPauseBtn'),
    levelLabel: document.getElementById('sqLevel'),
    scoreLabel: document.getElementById('sqScore'),
    instruction: document.getElementById('sqInstruction'),
    overlay: document.getElementById('sqOverlay'),
    resultModal: document.getElementById('sqResultModal'),
    resultScore: document.getElementById('sqResultScore'),
    resultPlayAgain: document.getElementById('sqResultPlayAgain'),
    resultBack: document.getElementById('sqResultBack')
  };

  // Add resume audio listener for first interaction
  window.addEventListener('click', () => {
    initAudio();
  }, { once: true });

  if (!appState.resets) appState.resets = {};
  appState.resets.sequenceMemory = resetGame;

  resetGame();
  bindSequenceEvents(loadStatsOverview);
}


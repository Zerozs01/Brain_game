import { appState, refs } from '../state.js';
import {
  clamp,
  hsvToHex,
  toHsbLabel,
  playMemoryBeep,
  playTick,
  initTimeAudio
} from '../helpers.js';
import { renderResultTopTen } from '../ui/stats.js';
import { saveSessionToDatabase } from '../db.js';
import { setView } from '../ui/navigation.js';
import { renderTopStatus } from '../ui/header.js';

export function renderProgressSegments(container, total, completed, current) {
  if (!container) return;
  container.textContent = "";

  for (let i = 1; i <= total; i += 1) {
    const segment = document.createElement("span");
    segment.className = "progress-segment";

    if (i <= completed) {
      segment.classList.add("success");
    } else if (i === current) {
      segment.classList.add("current");
    }

    container.appendChild(segment);
  }
}

function getMemoryAverageError() {
  const rounds = appState.colorMemory.roundScores;
  if (!rounds.length) {
    return 0;
  }

  const total = rounds.reduce((sum, round) => sum + round.avgError, 0);
  return total / rounds.length;
}

function renderMemoryHud() {
  const memory = appState.colorMemory;
  if (refs.memRoundTitle) refs.memRoundTitle.textContent = `Round ${memory.round}/${memory.totalRounds}`;
  if (refs.memRoundHud) refs.memRoundHud.textContent = `${memory.round}/${memory.totalRounds}`;
  if (refs.memTotalScoreHud) refs.memTotalScoreHud.textContent = memory.totalScore.toFixed(2);
  if (refs.memTotalScore) refs.memTotalScore.textContent = `${memory.totalScore.toFixed(2)} / 50`;
  if (refs.memAverageError) refs.memAverageError.textContent = `${getMemoryAverageError().toFixed(1)}%`;
  if (refs.memAverageErrorInline) refs.memAverageErrorInline.textContent = `${getMemoryAverageError().toFixed(1)}%`;
  if (refs.memSpeedBonus) refs.memSpeedBonus.textContent = `+${memory.lastSpeedBonus} XP`;
  if (refs.memSpeedInline) refs.memSpeedInline.textContent = `+${memory.lastSpeedBonus} XP`;

  const completed = memory.roundScores.length;
  const current = completed >= memory.totalRounds ? 0 : memory.round;
  renderProgressSegments(refs.memProgress, memory.totalRounds, completed, current);
}

function setMemoryPanel(panel) {
  if (refs.memMemorizePanel) refs.memMemorizePanel.classList.toggle("hidden", panel !== "memorize");
  if (refs.memAdjustPanel) refs.memAdjustPanel.classList.toggle("hidden", panel !== "adjust");
  if (refs.memResultModal) refs.memResultModal.classList.toggle("hidden", panel !== "result");
  if (refs.memResultCard) refs.memResultCard.classList.toggle("hidden", panel !== "result");

  const phaseInfo = document.getElementById("memPhaseHeaderInfo");
  const phaseKicker = document.getElementById("memPhaseKicker");
  const phaseTitle = document.getElementById("memPhaseTitle");

  if (phaseInfo && phaseKicker && phaseTitle) {
    const memory = appState.colorMemory;
    if (panel === "memorize") {
      phaseInfo.classList.remove("hidden");
      if (memory.phase === "countdown") {
        phaseKicker.textContent = "Get Ready";
        phaseKicker.className = "text-[9px] font-bold text-red-400 uppercase tracking-wider animate-pulse";
        phaseTitle.textContent = "Prepare Your Focus";
      } else {
        phaseKicker.textContent = "Phase 01: Retention";
        phaseKicker.className = "text-[9px] font-bold text-yellow-500 uppercase tracking-wider";
        phaseTitle.textContent = "Memorize the Hue";
      }
    } else if (panel === "adjust") {
      phaseInfo.classList.remove("hidden");
      phaseKicker.textContent = "Phase 02: Calibration";
      phaseKicker.className = "text-[9px] font-bold text-blue-400 uppercase tracking-wider";
      phaseTitle.textContent = "Match the Target Color";
    } else {
      phaseInfo.classList.add("hidden");
    }
  }
}

function setMemorySummaryScreenVisible(visible) {
  appState.colorMemory.summaryVisible = Boolean(visible);

  if (refs.memSummaryScreen) {
    refs.memSummaryScreen.classList.toggle("hidden", !visible);
  }

  if (refs.memDialedCard) {
    refs.memDialedCard.classList.toggle("hidden", visible);
  }
}

function clearMemoryTimers() {
  const memory = appState.colorMemory;
  clearInterval(memory.memorizeIntervalId);
  clearTimeout(memory.memorizeTimeoutId);
  clearTimeout(memory.countdownTimeoutId);
  memory.memorizeIntervalId = null;
  memory.memorizeTimeoutId = null;
  memory.countdownTimeoutId = null;
}

function randomIntInclusive(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomMemoryTarget(previousTarget) {
  const profiles = [
    { s: [72, 100], b: [68, 100] },
    { s: [64, 100], b: [16, 46] },
    { s: [16, 48], b: [72, 100] },
    { s: [44, 78], b: [42, 76] }
  ];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const candidate = {
      h: randomIntInclusive(0, 359),
      s: randomIntInclusive(profile.s[0], profile.s[1]),
      b: randomIntInclusive(profile.b[0], profile.b[1])
    };

    if (!previousTarget) {
      return candidate;
    }

    const hueGap = Math.min(
      Math.abs(previousTarget.h - candidate.h),
      360 - Math.abs(previousTarget.h - candidate.h)
    );
    const satGap = Math.abs(previousTarget.s - candidate.s);
    const briGap = Math.abs(previousTarget.b - candidate.b);

    if (hueGap >= 34 || satGap >= 18 || briGap >= 18) {
      return candidate;
    }
  }

  return {
    h: randomIntInclusive(0, 359),
    s: randomIntInclusive(10, 100),
    b: randomIntInclusive(12, 100)
  };
}

function syncMemorySliders() {
  const memory = appState.colorMemory;
  if (refs.memHueSlider) refs.memHueSlider.value = String(memory.guess.h);
  if (refs.memSatSlider) refs.memSatSlider.value = String(memory.guess.s);
  if (refs.memBriSlider) refs.memBriSlider.value = String(memory.guess.b);
  if (refs.memHueValue) refs.memHueValue.textContent = String(memory.guess.h);
  if (refs.memSatValue) refs.memSatValue.textContent = String(memory.guess.s);
  if (refs.memBriValue) refs.memBriValue.textContent = String(memory.guess.b);

  const guessHex = hsvToHex(memory.guess.h, memory.guess.s, memory.guess.b).toUpperCase();
  if (refs.memCurrentHex) refs.memCurrentHex.textContent = guessHex;
  if (refs.memPreview) refs.memPreview.style.background = guessHex;

  if (refs.memHueSlider) {
    refs.memHueSlider.style.setProperty(
      "--track-bg",
      "linear-gradient(180deg, #ff0000 0%, #ff00ff 17%, #0000ff 33%, #00ffff 50%, #00ff00 67%, #ffff00 83%, #ff0000 100%)"
    );
  }

  const satTop = hsvToHex(memory.guess.h, 100, memory.guess.b);
  const satBottom = hsvToHex(memory.guess.h, 0, memory.guess.b);
  if (refs.memSatSlider) {
    refs.memSatSlider.style.setProperty("--track-bg", `linear-gradient(180deg, ${satTop}, ${satBottom})`);
  }

  const briTop = hsvToHex(memory.guess.h, memory.guess.s, 100);
  if (refs.memBriSlider) {
    refs.memBriSlider.style.setProperty("--track-bg", `linear-gradient(180deg, ${briTop}, #000000)`);
  }

  if (refs.memAdjustPanel) {
    refs.memAdjustPanel.style.setProperty("--memory-live", guessHex);
  }
}

function updateMemoryGuessFromInputs() {
  if (refs.memHueSlider) appState.colorMemory.guess.h = Number(refs.memHueSlider.value);
  if (refs.memSatSlider) appState.colorMemory.guess.s = Number(refs.memSatSlider.value);
  if (refs.memBriSlider) appState.colorMemory.guess.b = Number(refs.memBriSlider.value);
  syncMemorySliders();
}

export function beginMemoryAdjustPhase() {
  const memory = appState.colorMemory;
  if (memory.phase !== "memorize") {
    return;
  }

  clearMemoryTimers();
  memory.phase = "adjust";
  memory.adjustStartedAt = performance.now();
  setMemoryPanel("adjust");
  syncMemorySliders();
  playMemoryBeep(600, 400, "square");
}

function runMemoryCountdown(callback) {
  const memory = appState.colorMemory;
  memory.phase = "countdown";

  if (refs.memSkipBtn) refs.memSkipBtn.classList.add("hidden");
  if (refs.memTargetSwatch) refs.memTargetSwatch.style.background = "#191919";

  setMemoryPanel("memorize");

  if (refs.memCountdown) {
    refs.memCountdown.textContent = "Ready...";
    refs.memCountdown.className = "countdown absolute z-10 text-purple-500 font-extrabold text-6xl md:text-[8rem] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] select-none animate-pulse";
  }
  playMemoryBeep(300, 150, "sine");

  memory.countdownTimeoutId = setTimeout(() => {
    if (refs.memCountdown) {
      refs.memCountdown.textContent = "Set...";
      refs.memCountdown.className = "countdown absolute z-10 text-yellow-500 font-extrabold text-6xl md:text-[8rem] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] select-none animate-pulse";
    }
    playMemoryBeep(300, 150, "sine");

    memory.countdownTimeoutId = setTimeout(() => {
      if (refs.memCountdown) {
        refs.memCountdown.textContent = "Go!";
        refs.memCountdown.className = "countdown absolute z-10 text-blue-500 font-extrabold text-7xl md:text-[9rem] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] select-none scale-110 transition-transform duration-100";
      }
      playMemoryBeep(600, 250, "square");

      memory.countdownTimeoutId = setTimeout(() => {
        if (refs.memCountdown) {
          refs.memCountdown.className = "countdown absolute z-10 text-white font-extrabold text-6xl md:text-[8rem] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] select-none";
        }
        if (refs.memSkipBtn) refs.memSkipBtn.classList.remove("hidden");
        
        callback();
      }, 800);
    }, 1000);
  }, 1000);
}

function beginMemoryMemorizePhase() {
  const memory = appState.colorMemory;
  clearMemoryTimers();

  memory.phase = "memorize";
  memory.target = randomMemoryTarget(memory.previousTarget);
  memory.previousTarget = { ...memory.target };
  memory.guess = { h: 180, s: 50, b: 50 };
  memory.lastSpeedBonus = 0;
  memory.isComplete = false;

  if (refs.memTargetSwatch) {
    refs.memTargetSwatch.style.background = hsvToHex(memory.target.h, memory.target.s, memory.target.b);
  }
  if (refs.memCountdown) refs.memCountdown.textContent = "500 ms";
  if (refs.memSkipBtn) refs.memSkipBtn.classList.remove("hidden");
  
  setMemoryPanel("memorize");
  syncMemorySliders();
  renderMemoryHud();

  let ticksCount = 0;
  const phaseStartedAt = performance.now();
  memory.memorizeIntervalId = setInterval(() => {
    const elapsed = (performance.now() - phaseStartedAt) / 1000;
    const remaining = Math.max(0, 5 - elapsed);
    if (refs.memCountdown) {
      refs.memCountdown.textContent = `${Math.round(remaining * 100)} ms`;
    }

    ticksCount += 1;
    if (ticksCount % 10 === 0) {
      playTick();
    }

    if (remaining <= 0.05) {
      beginMemoryAdjustPhase();
    }
  }, 100);

  memory.memorizeTimeoutId = setTimeout(beginMemoryAdjustPhase, 5000);
}

function calculateMemoryRoundScore(target, guess) {
  const deltaHue = Math.min(Math.abs(target.h - guess.h), 360 - Math.abs(target.h - guess.h));
  const deltaSat = Math.abs(target.s - guess.s);
  const deltaBri = Math.abs(target.b - guess.b);

  const hueScore = clamp((1 - deltaHue / 180) * 5, 0, 5);
  const satScore = clamp((1 - deltaSat / 100) * 3, 0, 3);
  const briScore = clamp((1 - deltaBri / 100) * 2, 0, 2);
  const total = hueScore + satScore + briScore;

  const avgError = ((deltaHue / 180 + deltaSat / 100 + deltaBri / 100) / 3) * 100;

  return {
    deltaHue,
    deltaSat,
    deltaBri,
    hueScore,
    satScore,
    briScore,
    total,
    avgError
  };
}

function getMemoryAggregate() {
  const rounds = appState.colorMemory.roundScores;
  if (!rounds.length) {
    return null;
  }

  const merged = rounds.reduce(
    (acc, round) => {
      acc.deltaHue += round.deltaHue;
      acc.deltaSat += round.deltaSat;
      acc.deltaBri += round.deltaBri;
      acc.hueScore += round.hueScore;
      acc.satScore += round.satScore;
      acc.briScore += round.briScore;
      return acc;
    },
    {
      deltaHue: 0,
      deltaSat: 0,
      deltaBri: 0,
      hueScore: 0,
      satScore: 0,
      briScore: 0
    }
  );

  const count = rounds.length;
  return {
    deltaHue: merged.deltaHue / count,
    deltaSat: merged.deltaSat / count,
    deltaBri: merged.deltaBri / count,
    hueScore: merged.hueScore / count,
    satScore: merged.satScore / count,
    briScore: merged.briScore / count
  };
}

function renderMemoryRoundSummary() {
  if (!refs.memRoundLog || !refs.memRoundSummaryMeta) {
    return;
  }

  const rounds = appState.colorMemory.roundScores;
  refs.memRoundSummaryMeta.textContent = `${rounds.length} / ${appState.colorMemory.totalRounds} recorded`;
  refs.memRoundLog.textContent = "";

  if (!rounds.length) {
    const empty = document.createElement("p");
    empty.className = "memory-round-empty";
    empty.textContent = "Play rounds to see your target and selected colors.";
    refs.memRoundLog.appendChild(empty);
    return;
  }

  rounds.forEach((round) => {
    const card = document.createElement("article");
    card.className = "memory-round-row";
    card.innerHTML = `
      <p class="memory-round-index">R${round.round}</p>
      <div class="memory-round-color-block">
        <span class="memory-round-swatch" style="background:${round.targetHex};"></span>
        <div>
          <p>Target</p>
          <strong>${toHsbLabel(round.target)}</strong>
        </div>
      </div>
      <div class="memory-round-color-block">
        <span class="memory-round-swatch" style="background:${round.guessHex};"></span>
        <div>
          <p>Your Pick</p>
          <strong>${toHsbLabel(round.guess)}</strong>
        </div>
      </div>
      <p class="memory-round-score">${round.total.toFixed(2)}/10</p>
    `;
    refs.memRoundLog.appendChild(card);
  });
}

function getMemoryCaption(score) {
  if (score >= 9.4) {
    return "Off by a pixel. We are disturbed, not impressed.";
  }

  if (score >= 7.2) {
    return "Precision is sharp. Keep the confidence disciplined.";
  }

  if (score >= 4.6) {
    return "Balanced read. A tighter hue lock will boost this.";
  }

  if (score >= 2.2) {
    return "The confidence of someone who thinks they aced it.";
  }

  return "Bold attempt. The color wheel had other plans.";
}

function renderMemoryResult(roundScore) {
  const memory = appState.colorMemory;
  const targetHex = hsvToHex(memory.target.h, memory.target.s, memory.target.b).toUpperCase();
  const guessHex = hsvToHex(memory.guess.h, memory.guess.s, memory.guess.b).toUpperCase();

  setMemorySummaryScreenVisible(false);

  if (refs.memResultTop10Section) {
    refs.memResultTop10Section.classList.add("hidden");
  }
  if (refs.memResultRank) {
    refs.memResultRank.textContent = "Rank -";
  }

  if (refs.memDialedStep) refs.memDialedStep.textContent = `${memory.round}/${memory.totalRounds}`;
  if (refs.memGuessHsb) refs.memGuessHsb.textContent = toHsbLabel(memory.guess);
  if (refs.memTargetHsb) refs.memTargetHsb.textContent = toHsbLabel(memory.target);
  if (refs.memDialedGuess) refs.memDialedGuess.style.background = guessHex;
  if (refs.memDialedOriginal) refs.memDialedOriginal.style.background = targetHex;
  if (refs.memDialedCard) refs.memDialedCard.style.boxShadow = `0 24px 42px -14px ${guessHex}44`;

  if (refs.memHueMeta) refs.memHueMeta.textContent = `Δ ${roundScore.deltaHue.toFixed(1)}°`;
  if (refs.memSatMeta) refs.memSatMeta.textContent = `Δ ${roundScore.deltaSat.toFixed(1)}`;
  if (refs.memBriMeta) refs.memBriMeta.textContent = `Δ ${roundScore.deltaBri.toFixed(1)}`;

  if (refs.memHueFill) refs.memHueFill.style.width = `${(roundScore.hueScore / 5) * 100}%`;
  if (refs.memSatFill) refs.memSatFill.style.width = `${(roundScore.satScore / 3) * 100}%`;
  if (refs.memBriFill) refs.memBriFill.style.width = `${(roundScore.briScore / 2) * 100}%`;

  if (refs.memHueScore) refs.memHueScore.textContent = `${roundScore.hueScore.toFixed(2)}/5`;
  if (refs.memSatScore) refs.memSatScore.textContent = `${roundScore.satScore.toFixed(2)}/3`;
  if (refs.memBriScore) refs.memBriScore.textContent = `${roundScore.briScore.toFixed(2)}/2`;
  
  renderMemoryRoundSummary();

  if (memory.isComplete) {
    const aggregate = getMemoryAggregate();
    if (refs.memRoundScoreValue) refs.memRoundScoreValue.textContent = memory.totalScore.toFixed(2);
    if (refs.memRoundCaption) refs.memRoundCaption.textContent = "Session complete. Press next for full summary.";
    if (refs.memDialedStep) refs.memDialedStep.textContent = "5/5";
    if (refs.memGuessHsb) refs.memGuessHsb.textContent = `Final ${memory.totalScore.toFixed(2)} / 50`;
    if (refs.memTargetHsb) refs.memTargetHsb.textContent = "Open full summary to inspect all 5 rounds";

    if (aggregate) {
      if (refs.memHueMeta) refs.memHueMeta.textContent = `Δ ${aggregate.deltaHue.toFixed(1)}°`;
      if (refs.memSatMeta) refs.memSatMeta.textContent = `Δ ${aggregate.deltaSat.toFixed(1)}`;
      if (refs.memBriMeta) refs.memBriMeta.textContent = `Δ ${aggregate.deltaBri.toFixed(1)}`;
      if (refs.memHueFill) refs.memHueFill.style.width = `${(aggregate.hueScore / 5) * 100}%`;
      if (refs.memSatFill) refs.memSatFill.style.width = `${(aggregate.satScore / 3) * 100}%`;
      if (refs.memBriFill) refs.memBriFill.style.width = `${(aggregate.briScore / 2) * 100}%`;
      if (refs.memHueScore) refs.memHueScore.textContent = `${aggregate.hueScore.toFixed(2)}/5`;
      if (refs.memSatScore) refs.memSatScore.textContent = `${aggregate.satScore.toFixed(2)}/3`;
      if (refs.memBriScore) refs.memBriScore.textContent = `${aggregate.briScore.toFixed(2)}/2`;
    }

    if (refs.memResultTop10Section) {
      refs.memResultTop10Section.classList.remove("hidden");
    }
    renderResultTopTen("color_memory", memory.totalScore, refs.memResultTop10, refs.memResultRank);

    if (refs.memNextBtn) {
      refs.memNextBtn.textContent = "→";
      refs.memNextBtn.setAttribute("aria-label", "Open full color memory summary");
    }
    return;
  }

  if (refs.memRoundScoreValue) refs.memRoundScoreValue.textContent = roundScore.total.toFixed(2);
  if (refs.memRoundCaption) refs.memRoundCaption.textContent = getMemoryCaption(roundScore.total);
  if (refs.memGuessHsb) refs.memGuessHsb.textContent = `Your ${toHsbLabel(memory.guess)}`;
  if (refs.memTargetHsb) refs.memTargetHsb.textContent = `Original ${toHsbLabel(memory.target)}`;
  if (refs.memNextBtn) {
    refs.memNextBtn.textContent = "→";
    refs.memNextBtn.setAttribute("aria-label", "Go to next memory round");
  }
}

export function resetColorMemorySession() {
  const memory = appState.colorMemory;

  clearMemoryTimers();
  memory.round = 1;
  memory.totalScore = 0;
  memory.roundScores = [];
  memory.previousTarget = null;
  memory.target = { h: 180, s: 70, b: 80 };
  memory.guess = { h: 180, s: 50, b: 50 };
  memory.phase = "idle";
  memory.adjustStartedAt = 0;
  memory.isComplete = false;
  memory.summaryVisible = false;
  memory.lastSpeedBonus = 0;
  memory.sessionSaved = false;

  if (refs.memCountdown) refs.memCountdown.textContent = "500 ms";
  if (refs.memTargetSwatch) {
    refs.memTargetSwatch.style.background = hsvToHex(memory.target.h, memory.target.s, memory.target.b);
  }
  setMemoryPanel("memorize");
  setMemorySummaryScreenVisible(false);
  syncMemorySliders();
  renderMemoryHud();
  renderMemoryRoundSummary();
}

export function startColorMemorySession() {
  const memory = appState.colorMemory;

  clearMemoryTimers();
  memory.round = 1;
  memory.totalScore = 0;
  memory.roundScores = [];
  memory.previousTarget = null;
  memory.isComplete = false;
  memory.summaryVisible = false;
  memory.lastSpeedBonus = 0;
  memory.sessionSaved = false;

  initTimeAudio();

  renderMemoryHud();
  runMemoryCountdown(() => {
    beginMemoryMemorizePhase();
  });
}

function confirmColorMemorySelection(loadStatsOverview) {
  const memory = appState.colorMemory;
  if (memory.phase !== "adjust") {
    return;
  }

  const elapsedSeconds = (performance.now() - memory.adjustStartedAt) / 1000;
  const speedBonus = Math.max(0, Math.round(125 - elapsedSeconds * 15));

  const result = calculateMemoryRoundScore(memory.target, memory.guess);
  const targetSnapshot = { ...memory.target };
  const guessSnapshot = { ...memory.guess };
  const targetHex = hsvToHex(targetSnapshot.h, targetSnapshot.s, targetSnapshot.b).toUpperCase();
  const guessHex = hsvToHex(guessSnapshot.h, guessSnapshot.s, guessSnapshot.b).toUpperCase();

  memory.lastSpeedBonus = speedBonus;
  memory.totalScore += result.total;
  memory.roundScores.push({
    round: memory.round,
    ...result,
    speedBonus,
    target: targetSnapshot,
    guess: guessSnapshot,
    targetHex,
    guessHex
  });
  memory.isComplete = memory.round >= memory.totalRounds;

  appState.topScore += Math.round(result.total * 100) + speedBonus;

  if (memory.isComplete && !memory.sessionSaved) {
    memory.sessionSaved = true;
    const avgError = getMemoryAverageError();
    const accuracy = clamp(100 - avgError, 0, 100);

    saveSessionToDatabase({
      gameType: "color_memory",
      score: memory.totalScore,
      accuracy,
      peakMultiplier: null,
      durationSeconds: null,
      roundCount: memory.totalRounds,
      detail: {
        roundScores: memory.roundScores
      }
    }).then(() => {
      if (loadStatsOverview) loadStatsOverview();
    });
  }

  memory.phase = "result";
  renderTopStatus();
  renderMemoryHud();
  renderMemoryResult(result);
  setMemoryPanel("result");
}

function nextColorMemoryRound() {
  const memory = appState.colorMemory;
  if (memory.phase !== "result") {
    return;
  }

  if (memory.isComplete) {
    if (!memory.summaryVisible) {
      setMemorySummaryScreenVisible(true);
      return;
    }

    startColorMemorySession();
    return;
  }

  memory.round += 1;
  renderMemoryHud();
  runMemoryCountdown(() => {
    beginMemoryMemorizePhase();
  });
}

function bindColorMemoryEvents(loadStatsOverview) {
  if (refs.memStartBtn) refs.memStartBtn.addEventListener("click", startColorMemorySession);
  if (refs.memSkipBtn) refs.memSkipBtn.addEventListener("click", beginMemoryAdjustPhase);
  if (refs.memConfirmBtn) refs.memConfirmBtn.addEventListener("click", () => confirmColorMemorySelection(loadStatsOverview));
  if (refs.memNextBtn) refs.memNextBtn.addEventListener("click", nextColorMemoryRound);
  if (refs.memSummaryPlayAgain) refs.memSummaryPlayAgain.addEventListener("click", startColorMemorySession);
  if (refs.memSummaryBack) {
    refs.memSummaryBack.addEventListener("click", () => {
      setView("dashboardView", loadStatsOverview);
      resetColorMemorySession();
    });
  }

  [refs.memHueSlider, refs.memSatSlider, refs.memBriSlider].forEach((input) => {
    if (input) input.addEventListener("input", updateMemoryGuessFromInputs);
  });
}

export function initColorMemory(loadStatsOverview) {
  if (!appState.resets) appState.resets = {};
  appState.resets.colorMemory = resetColorMemorySession;
  
  resetColorMemorySession();
  bindColorMemoryEvents(loadStatsOverview);
}

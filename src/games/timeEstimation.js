import { appState, refs } from '../state.js';
import {
  playTimeBeep,
  playMemoryBeep,
  playTick,
  initTimeAudio
} from '../helpers.js';
import { renderResultTopTen } from '../ui/stats.js';
import { saveSessionToDatabase } from '../db.js';
import { setView } from '../ui/navigation.js';

function calculateTimeAccuracy(target, player) {
  const errorRatio = Math.abs(target - player) / target;
  const accuracy = 100 - (errorRatio * 150);
  return Math.max(0, accuracy);
}

export function resetTimeGameSession() {
  const t = appState.time;
  if (t.observeTimeoutId) {
    clearTimeout(t.observeTimeoutId);
    t.observeTimeoutId = null;
  }
  if (t.countdownTimeoutId) {
    clearTimeout(t.countdownTimeoutId);
    t.countdownTimeoutId = null;
  }
  if (t.liveTimerId) {
    cancelAnimationFrame(t.liveTimerId);
    t.liveTimerId = null;
  }
  t.round = 1;
  t.score = 0;
  t.scores = [];
  t.targets = [];
  t.players = [];
  t.targetDuration = 0;
  t.playerDuration = 0;
  t.phase = "idle";
  t.startTime = 0;
  t.isComplete = false;
  t.summaryVisible = false;
  t.sessionSaved = false;

  if (refs.timeRoundHud) refs.timeRoundHud.textContent = "1/5";
  if (refs.timeScoreHud) refs.timeScoreHud.textContent = "0.00";
  
  if (refs.timeTarget) {
    refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-border bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.3)] cursor-pointer select-none relative overflow-hidden";
  }
  if (refs.timeIllusion) {
    refs.timeIllusion.classList.add("opacity-0");
    refs.timeIllusion.classList.remove("opacity-100");
  }
  if (refs.timeIllusionGroup) {
    refs.timeIllusionGroup.classList.remove("spin-vortex");
  }
  if (refs.timePhaseText) {
    refs.timePhaseText.textContent = "Observe";
    refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-notion-muted h-12 flex items-center justify-center";
  }
  if (refs.timeStartOverlay) {
    refs.timeStartOverlay.classList.remove("hidden");
  }
  
  if (refs.timeLiveTimer) {
    refs.timeLiveTimer.classList.add("hidden");
    refs.timeLiveTimer.textContent = "0.00s";
  }
  
  if (refs.timeDurationBox) refs.timeDurationBox.classList.add("hidden");
  if (refs.timeTargetText) refs.timeTargetText.textContent = "0.00s";
  
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Hold to Start";
    refs.timeHoldBtn.disabled = true;
  }
  if (refs.timeHint) refs.timeHint.textContent = "Observe the circle lighting up to memorize the target duration.";
  
  if (refs.timeRoundResultOverlay) refs.timeRoundResultOverlay.classList.add("hidden");
  if (refs.timeResultModal) refs.timeResultModal.classList.add("hidden");
}

function runTimeCountdown(callback) {
  const t = appState.time;
  t.phase = "countdown";
  
  if (refs.timeInstruction) refs.timeInstruction.textContent = "Prepare your attention...";
  if (refs.timePhaseText) {
    refs.timePhaseText.textContent = "Ready...";
    refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-purple-500 h-12 flex items-center justify-center animate-pulse";
  }
  if (refs.timeTarget) {
    refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-border bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.3)] cursor-not-allowed select-none relative overflow-hidden";
  }
  if (refs.timeIllusion) {
    refs.timeIllusion.classList.add("opacity-0");
    refs.timeIllusion.classList.remove("opacity-100");
  }
  if (refs.timeIllusionGroup) {
    refs.timeIllusionGroup.classList.remove("spin-vortex");
  }
  if (refs.timeLiveTimer) refs.timeLiveTimer.classList.add("hidden");
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Hold to Start";
    refs.timeHoldBtn.disabled = true;
  }
  if (refs.timeDurationBox) refs.timeDurationBox.classList.add("hidden");
  
  playTimeBeep(300, 150);

  t.countdownTimeoutId = setTimeout(() => {
    if (refs.timePhaseText) {
      refs.timePhaseText.textContent = "Set...";
      refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-yellow-500 h-12 flex items-center justify-center animate-pulse";
    }
    playTimeBeep(300, 150);

    t.countdownTimeoutId = setTimeout(() => {
      if (refs.timePhaseText) {
        refs.timePhaseText.textContent = "Go!";
        refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-blue-500 h-12 flex items-center justify-center scale-110 transition-transform duration-100";
      }
      playTimeBeep(600, 250);

      t.countdownTimeoutId = setTimeout(() => {
        if (refs.timePhaseText) {
          refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-[#FBBF24] h-12 flex items-center justify-center";
        }
        callback();
      }, 800);
    }, 1000);
  }, 1000);
}

export function startTimeGameSession() {
  resetTimeGameSession();
  renderTimeHud();
  if (refs.timeStartOverlay) {
    refs.timeStartOverlay.classList.remove("hidden");
  } else {
    runTimeCountdown(() => {
      beginTimeObservePhase();
    });
  }
}

function renderTimeHud() {
  const t = appState.time;
  if (refs.timeRoundHud) refs.timeRoundHud.textContent = `${t.round}/${t.totalRounds}`;
  const currentAvg = t.scores.length > 0 
    ? t.scores.reduce((a, b) => a + b, 0) / t.scores.length 
    : 0;
  if (refs.timeScoreHud) refs.timeScoreHud.textContent = currentAvg.toFixed(2);
}

function beginTimeObservePhase() {
  const t = appState.time;
  t.phase = "observe";
  t.startTime = 0;
  t.playerDuration = 0;
  
  let newDuration = 0;
  let attempts = 0;
  const minDistance = 1000; // ระยะห่างขั้นต่ำ 1000ms (1 วินาที) จากรอบล่าสุด

  do {
    // สุ่มทศนิยมละเอียดระดับมิลลิวินาทีตั้งแต่ 800ms ถึง 6000ms
    newDuration = Math.floor(800 + Math.random() * 5200);
    attempts++;
  } while (
    attempts < 30 &&
    t.targets.length > 0 &&
    Math.abs(newDuration - t.targets[t.targets.length - 1]) < minDistance
  );

  t.targetDuration = newDuration;
  t.targets.push(t.targetDuration);

  if (refs.timeInstruction) refs.timeInstruction.textContent = "Observe the target duration!";
  if (refs.timePhaseText) {
    refs.timePhaseText.textContent = "Observe...";
    refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-blue-400 h-12 flex items-center justify-center";
  }
  
  const isEasy = t.difficulty === "easy";

  if (refs.timeTarget) {
    if (isEasy) {
      refs.timeTarget.className = "w-60 h-60 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-200 cursor-not-allowed select-none animate-time-pulse-easy relative overflow-hidden";
    } else {
      refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-border bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 cursor-not-allowed select-none relative overflow-hidden";
    }
  }
  if (refs.timeIllusion) {
    if (isEasy) {
      refs.timeIllusion.classList.add("opacity-0");
      refs.timeIllusion.classList.remove("opacity-100");
    } else {
      refs.timeIllusion.classList.remove("opacity-0");
      refs.timeIllusion.classList.add("opacity-100");
    }
  }
  if (refs.timeIllusionGroup) {
    if (isEasy) {
      refs.timeIllusionGroup.classList.remove("spin-vortex");
    } else {
      refs.timeIllusionGroup.classList.add("spin-vortex");
    }
  }
  
  if (refs.timeDurationBox) refs.timeDurationBox.classList.add("hidden");
  if (refs.timeLiveTimer) refs.timeLiveTimer.classList.add("hidden");
  
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Hold to Start";
    refs.timeHoldBtn.disabled = true;
  }
  if (refs.timeHint) refs.timeHint.textContent = "Observe the pulsing circle to absorb the interval duration without looking at numbers.";
  
  if (refs.timeRoundResultOverlay) refs.timeRoundResultOverlay.classList.add("hidden");

  t.observeTimeoutId = setTimeout(() => {
    beginTimeRecreatePhase();
  }, t.targetDuration);
}

function beginTimeRecreatePhase() {
  const t = appState.time;
  t.phase = "recreate";
  
  if (t.observeTimeoutId) {
    clearTimeout(t.observeTimeoutId);
    t.observeTimeoutId = null;
  }

  if (refs.timeInstruction) refs.timeInstruction.textContent = "Your turn. Press and hold!";
  if (refs.timePhaseText) {
    refs.timePhaseText.textContent = "YOUR TURN - HOLD TO MATCH";
    refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-yellow-500 h-12 flex items-center justify-center";
  }
  if (refs.timeTarget) {
    refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-primary bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(0,240,255,0.15)] cursor-pointer select-none relative overflow-hidden";
  }

  const isEasy = t.difficulty === "easy";
  if (refs.timeIllusion) {
    if (isEasy) {
      refs.timeIllusion.classList.add("opacity-0");
      refs.timeIllusion.classList.remove("opacity-100");
    } else {
      refs.timeIllusion.classList.remove("opacity-0");
      refs.timeIllusion.classList.add("opacity-100");
    }
  }
  if (refs.timeIllusionGroup) {
    if (isEasy) {
      refs.timeIllusionGroup.classList.remove("spin-vortex");
    } else {
      refs.timeIllusionGroup.classList.add("spin-vortex");
    }
  }
  
  if (refs.timeLiveTimer) {
    refs.timeLiveTimer.classList.add("hidden");
    refs.timeLiveTimer.textContent = "0.00s";
  }
  
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Press & Hold";
    refs.timeHoldBtn.disabled = false;
  }
  if (refs.timeHint) refs.timeHint.textContent = "Your turn. Press and hold the button (or Spacebar, or the ring itself) for exactly the target duration!";
}

let isHoldingTime = false;

function updateLiveTimerTicks() {
  const t = appState.time;
  if (!isHoldingTime || t.phase !== "recreate") return;
  
  const elapsed = (performance.now() - t.startTime) / 1000;
  if (refs.timeLiveTimer) refs.timeLiveTimer.textContent = `${elapsed.toFixed(2)}s`;
  
  t.liveTimerId = requestAnimationFrame(updateLiveTimerTicks);
}

function handleTimeHoldStart(e) {
  const t = appState.time;
  if (t.phase !== "recreate" || isHoldingTime) return;
  if (e) e.preventDefault();

  isHoldingTime = true;
  t.startTime = performance.now();

  if (refs.timePhaseText) {
    refs.timePhaseText.textContent = "Holding...";
    refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-yellow-500 h-12 flex items-center justify-center";
  }
  
  const isEasy = t.difficulty === "easy";

  if (refs.timeTarget) {
    if (isEasy) {
      refs.timeTarget.className = "w-60 h-60 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none scale-105 animate-time-pulse-easy relative overflow-hidden";
    } else {
      refs.timeTarget.className = "w-60 h-60 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none scale-105 time-ring-active relative overflow-hidden";
    }
  }

  if (refs.timeIllusion) {
    if (isEasy) {
      refs.timeIllusion.classList.add("opacity-0");
      refs.timeIllusion.classList.remove("opacity-100");
    } else {
      refs.timeIllusion.classList.remove("opacity-0");
      refs.timeIllusion.classList.add("opacity-100");
    }
  }

  if (refs.timeIllusionGroup) {
    if (isEasy) {
      refs.timeIllusionGroup.classList.remove("spin-vortex");
    } else {
      refs.timeIllusionGroup.classList.add("spin-vortex");
    }
  }
  
  if (refs.timeLiveTimer) {
    refs.timeLiveTimer.classList.remove("hidden");
    refs.timeLiveTimer.textContent = "0.00s";
  }
  
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Release!";
    refs.timeHoldBtn.classList.add("active");
  }

  t.liveTimerId = requestAnimationFrame(updateLiveTimerTicks);
}

function handleTimeHoldEnd(e) {
  const t = appState.time;
  if (t.phase !== "recreate" || !isHoldingTime) return;
  if (e) e.preventDefault();

  isHoldingTime = false;
  
  if (t.liveTimerId) {
    cancelAnimationFrame(t.liveTimerId);
    t.liveTimerId = null;
  }

  const elapsed = performance.now() - t.startTime;
  t.playerDuration = elapsed;
  t.players.push(elapsed);

  if (refs.timeTarget) {
    refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-border bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.3)] cursor-pointer select-none relative overflow-hidden";
  }
  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.textContent = "Hold to Start";
    refs.timeHoldBtn.disabled = true;
    refs.timeHoldBtn.classList.remove("active");
  }

  if (refs.timeIllusionGroup) {
    refs.timeIllusionGroup.classList.remove("spin-vortex");
  }
  if (refs.timeIllusion) {
    refs.timeIllusion.classList.add("opacity-0");
    refs.timeIllusion.classList.remove("opacity-100");
  }

  const roundAccuracy = calculateTimeAccuracy(t.targetDuration, t.playerDuration);
  t.scores.push(roundAccuracy);

  renderTimeHud();
  showTimeRoundResult(roundAccuracy);
}

function showTimeRoundResult(accuracy) {
  const t = appState.time;
  t.phase = "result";

  if (accuracy >= 80) {
    if (refs.timeTarget) refs.timeTarget.className = "w-60 h-60 rounded-full border-4 border-flow-border bg-flow-surface flex flex-col items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.3)] cursor-pointer select-none time-ring-success relative overflow-hidden";
    if (refs.timePhaseText) {
      refs.timePhaseText.textContent = "Great!";
      refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-emerald-400 h-12 flex items-center justify-center";
    }
  } else {
    if (refs.timePhaseText) {
      refs.timePhaseText.textContent = "Done";
      refs.timePhaseText.className = "text-3xl font-extrabold uppercase tracking-widest text-notion-muted h-12 flex items-center justify-center";
    }
  }

  if (refs.timeRoundTitle) refs.timeRoundTitle.textContent = `Round ${t.round}/${t.totalRounds}`;
  if (refs.timeRoundTarget) refs.timeRoundTarget.textContent = `${(t.targetDuration / 1000).toFixed(2)}s`;
  if (refs.timeRoundPlayer) refs.timeRoundPlayer.textContent = `${(t.playerDuration / 1000).toFixed(2)}s`;
  
  const delta = (t.playerDuration - t.targetDuration) / 1000;
  const deltaSign = delta >= 0 ? "+" : "";
  if (refs.timeRoundDelta) {
    refs.timeRoundDelta.textContent = `${deltaSign}${delta.toFixed(2)}s`;
    refs.timeRoundDelta.className = delta >= 0 ? "text-[#C04D4D] font-bold" : "text-[#2F6C8F] font-bold";
  }
  
  if (refs.timeRoundAccuracy) {
    refs.timeRoundAccuracy.textContent = `${accuracy.toFixed(1)}%`;
    refs.timeRoundAccuracy.className = accuracy >= 80 ? "text-emerald-400 font-bold" : (accuracy >= 50 ? "text-yellow-500 font-bold" : "text-red-400 font-bold");
  }

  if (refs.timeRoundResultOverlay) refs.timeRoundResultOverlay.classList.remove("hidden");
}

function nextTimeRound(loadStatsOverview) {
  const t = appState.time;
  if (t.phase !== "result") return;

  if (refs.timeRoundResultOverlay) refs.timeRoundResultOverlay.classList.add("hidden");

  if (t.round < t.totalRounds) {
    t.round += 1;
    renderTimeHud();
    runTimeCountdown(() => {
      beginTimeObservePhase();
    });
  } else {
    endTimeGameSession(loadStatsOverview);
  }
}

function endTimeGameSession(loadStatsOverview) {
  const t = appState.time;
  t.phase = "complete";
  t.isComplete = true;

  const finalScore = t.scores.reduce((a, b) => a + b, 0) / t.totalRounds;
  if (refs.timeResultScore) refs.timeResultScore.textContent = finalScore.toFixed(1);
  if (refs.timeResultAccuracy) refs.timeResultAccuracy.textContent = `${finalScore.toFixed(1)}%`;
  
  const totalPlaySeconds = t.targets.reduce((a, b) => a + b, 0) / 1000;
  if (refs.timeResultTotalDuration) refs.timeResultTotalDuration.textContent = `${Math.round(totalPlaySeconds)}s`;

  const tagline = refs.timeResultModal ? refs.timeResultModal.querySelector(".cm-result-tagline") : null;
  if (tagline) {
    if (finalScore >= 90) tagline.textContent = "Elite interval timing. Solid sustained attention.";
    else if (finalScore >= 75) tagline.textContent = "Sharp temporal precision and strong rhythm.";
    else if (finalScore >= 50) tagline.textContent = "Balanced focus. Tighter timing will boost this.";
    else tagline.textContent = "Warm-up complete. Re-enter and chase the rhythm.";
  }

  renderResultTopTen("time", finalScore, refs.timeResultTop10, refs.timeResultRank);

  if (refs.timeResultModal) refs.timeResultModal.classList.remove("hidden");

  if (!t.sessionSaved) {
    t.sessionSaved = true;
    saveSessionToDatabase({
      gameType: "time",
      cognitiveDomain: "attention",
      score: finalScore,
      accuracy: finalScore,
      peakMultiplier: null,
      durationSeconds: Math.round(totalPlaySeconds),
      roundCount: t.totalRounds,
      detail: {
        difficulty: t.difficulty,
        targets: t.targets,
        players: t.players,
        scores: t.scores
      }
    }).then(() => {
      if (loadStatsOverview) loadStatsOverview();
    });
  }
}

function bindTimeEvents(loadStatsOverview) {
  if (refs.timeEasyModeBtn) {
    refs.timeEasyModeBtn.addEventListener("click", () => {
      appState.time.difficulty = "easy";
      if (refs.timeStartOverlay) refs.timeStartOverlay.classList.add("hidden");
      runTimeCountdown(() => {
        beginTimeObservePhase();
      });
    });
  }

  if (refs.timeHardModeBtn) {
    refs.timeHardModeBtn.addEventListener("click", () => {
      appState.time.difficulty = "hard";
      if (refs.timeStartOverlay) refs.timeStartOverlay.classList.add("hidden");
      runTimeCountdown(() => {
        beginTimeObservePhase();
      });
    });
  }

  if (refs.timePauseBtn) {
    refs.timePauseBtn.addEventListener("click", () => {
      setView("dashboardView", loadStatsOverview);
      resetTimeGameSession();
    });
  }

  if (refs.timeNextRoundBtn) refs.timeNextRoundBtn.addEventListener("click", () => nextTimeRound(loadStatsOverview));
  if (refs.timeResultPlayAgain) refs.timeResultPlayAgain.addEventListener("click", startTimeGameSession);
  if (refs.timeResultBack) {
    refs.timeResultBack.addEventListener("click", () => {
      setView("dashboardView", loadStatsOverview);
      resetTimeGameSession();
    });
  }

  if (refs.timeHoldBtn) {
    refs.timeHoldBtn.addEventListener("mousedown", handleTimeHoldStart);
    refs.timeHoldBtn.addEventListener("mouseup", handleTimeHoldEnd);
    refs.timeHoldBtn.addEventListener("mouseleave", handleTimeHoldEnd);
    
    refs.timeHoldBtn.addEventListener("touchstart", (e) => {
      handleTimeHoldStart(e);
    }, { passive: false });
    refs.timeHoldBtn.addEventListener("touchend", (e) => {
      handleTimeHoldEnd(e);
    }, { passive: false });
  }
  
  if (refs.timeTarget) {
    refs.timeTarget.addEventListener("mousedown", handleTimeHoldStart);
    refs.timeTarget.addEventListener("mouseup", handleTimeHoldEnd);
    refs.timeTarget.addEventListener("mouseleave", handleTimeHoldEnd);

    refs.timeTarget.addEventListener("touchstart", (e) => {
      handleTimeHoldStart(e);
    }, { passive: false });
    refs.timeTarget.addEventListener("touchend", (e) => {
      handleTimeHoldEnd(e);
    }, { passive: false });
  }

  window.addEventListener("keydown", (e) => {
    if (appState.activeView !== "timeView") return;
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      handleTimeHoldStart();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (appState.activeView !== "timeView") return;
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      handleTimeHoldEnd();
    }
  });
}

export function initTimeEstimation(loadStatsOverview) {
  if (!appState.resets) appState.resets = {};
  appState.resets.time = resetTimeGameSession;
  
  resetTimeGameSession();
  bindTimeEvents(loadStatsOverview);
}

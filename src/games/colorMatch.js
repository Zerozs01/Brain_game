import { appState, refs } from '../state.js';
import { GAME_COLORS, formatScore, formatResponseTimeLabel } from '../helpers.js';
import { renderResultTopTen } from '../ui/stats.js';
import { saveSessionToDatabase } from '../db.js';
import { setView } from '../ui/navigation.js';
import { renderTopStatus } from '../ui/header.js';

function renderStreakDots() {
  if (!refs.cmStreakDots) return;
  refs.cmStreakDots.textContent = "";

  for (let i = 0; i < 4; i += 1) {
    const dot = document.createElement("span");
    dot.className = "streak-dot";
    if (i < appState.colorMatch.streak) {
      dot.classList.add("active");
    }
    refs.cmStreakDots.appendChild(dot);
  }
}

function renderColorMatchHud() {
  const cm = appState.colorMatch;
  if (refs.cmTime) refs.cmTime.textContent = String(cm.timeLeft);
  if (refs.cmScore) refs.cmScore.textContent = formatScore(cm.score);
  if (refs.cmMultiplier) refs.cmMultiplier.textContent = `x${cm.multiplier}`;
  if (refs.cmLeftWord) refs.cmLeftWord.textContent = cm.leftWord;
  if (refs.cmRightWord) {
    refs.cmRightWord.textContent = cm.rightWord;
    refs.cmRightWord.style.color = cm.rightHex;
  }
  renderStreakDots();
}

function clearColorMatchFeedback() {
  if (refs.cmFeedback) {
    refs.cmFeedback.textContent = "";
    refs.cmFeedback.classList.remove("good", "bad");
  }
}

function setColorMatchFeedback(message, type) {
  clearColorMatchFeedback();
  if (!refs.cmFeedback) return;
  refs.cmFeedback.textContent = message;

  if (type === "good") {
    refs.cmFeedback.classList.add("good");
  }

  if (type === "bad") {
    refs.cmFeedback.classList.add("bad");
  }

  clearTimeout(appState.colorMatch.feedbackClearId);
  appState.colorMatch.feedbackClearId = setTimeout(clearColorMatchFeedback, 430);
}

function getColorMatchTagline(score) {
  if (score >= 6000) {
    return "Synapse locked. Elite processing speed confirmed.";
  }

  if (score >= 3500) {
    return "Fast reads and clean calls. Strong tempo.";
  }

  if (score >= 1800) {
    return "Solid run. Push the multiplier one tier higher.";
  }

  return "Warm-up complete. Re-enter and chase the rhythm.";
}

function renderColorMatchResultBars() {
  const cm = appState.colorMatch;
  if (!refs.cmResultBars) return;
  refs.cmResultBars.textContent = "";

  const accuracy = cm.answers === 0 ? 0 : cm.correct / cm.answers;
  const fillCount = Math.round(accuracy * 5);

  for (let i = 0; i < 5; i += 1) {
    const segment = document.createElement("span");
    segment.className = "progress-segment";

    if (i < fillCount) {
      segment.classList.add("success");
    } else if (i === fillCount && fillCount < 5) {
      segment.classList.add("current");
    }

    refs.cmResultBars.appendChild(segment);
  }
}

function renderColorMatchResultModal() {
  const cm = appState.colorMatch;
  const accuracy = cm.answers === 0 ? 0 : Math.round((cm.correct / cm.answers) * 100);
  const wrongCount = Math.max(0, cm.answers - cm.correct);
  const averageResponseMs = cm.responseTimesMs.length
    ? cm.responseTimesMs.reduce((sum, value) => sum + value, 0) / cm.responseTimesMs.length
    : 0;

  if (refs.cmResultScore) refs.cmResultScore.textContent = formatScore(cm.score);
  if (refs.cmResultTagline) refs.cmResultTagline.textContent = getColorMatchTagline(cm.score);
  if (refs.cmResultAccuracy) refs.cmResultAccuracy.textContent = `${accuracy}%`;
  if (refs.cmResultCorrect) refs.cmResultCorrect.textContent = `${cm.correct}/${cm.answers}`;
  if (refs.cmResultWrong) refs.cmResultWrong.textContent = String(wrongCount);
  if (refs.cmResultAvgResponse) refs.cmResultAvgResponse.textContent = formatResponseTimeLabel(averageResponseMs);
  if (refs.cmResultPeak) refs.cmResultPeak.textContent = `x${cm.peakMultiplier}`;
  
  renderResultTopTen("color_match", cm.score, refs.cmResultTop10, refs.cmResultRank);
  renderColorMatchResultBars();
}

function updateColorMatchOverlay() {
  const cm = appState.colorMatch;
  if (!refs.cmOverlay || !refs.cmResultModal) return;

  if (cm.isPlaying) {
    refs.cmOverlay.classList.add("hidden");
    refs.cmResultModal.classList.add("hidden");
    return;
  }

  if (cm.timeLeft === 0) {
    refs.cmOverlay.classList.add("hidden");
    renderColorMatchResultModal();
    refs.cmResultModal.classList.remove("hidden");
  } else {
    refs.cmResultModal.classList.add("hidden");
    refs.cmOverlay.classList.remove("hidden");
    if (refs.cmOverlayKicker) refs.cmOverlayKicker.textContent = "Ready Protocol";
    if (refs.cmOverlayTitle) refs.cmOverlayTitle.textContent = "Color Match";
    if (refs.cmOverlayText) refs.cmOverlayText.textContent =
      "Does the meaning of the left word match the color shown on the right?";
    if (refs.cmOverlayAction) refs.cmOverlayAction.textContent = "Start Game";
  }
}

function stopColorMatchTimers() {
  const cm = appState.colorMatch;
  clearInterval(cm.timerId);
  clearTimeout(cm.roundDelayId);
  clearTimeout(cm.feedbackClearId);
  cm.timerId = null;
  cm.roundDelayId = null;
  cm.feedbackClearId = null;
}

function generateColorMatchRound() {
  const left = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
  const shouldMatch = Math.random() > 0.5;
  const randomWord = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].word;

  let rightColor;
  if (shouldMatch) {
    rightColor = GAME_COLORS.find((item) => item.word === left.word);
  } else {
    const mismatches = GAME_COLORS.filter((item) => item.word !== left.word);
    rightColor = mismatches[Math.floor(Math.random() * mismatches.length)];
  }

  appState.colorMatch.leftWord = left.word;
  appState.colorMatch.rightWord = randomWord;
  appState.colorMatch.rightHex = rightColor.hex;
  appState.colorMatch.isMatch = shouldMatch;
  appState.colorMatch.roundStartedAtMs = performance.now();
}

export function startColorMatchGame(loadStatsOverview) {
  const cm = appState.colorMatch;

  stopColorMatchTimers();
  cm.score = 0;
  cm.timeLeft = 60;
  cm.multiplier = 1;
  cm.peakMultiplier = 1;
  cm.streak = 0;
  cm.answers = 0;
  cm.correct = 0;
  cm.roundStartedAtMs = 0;
  cm.responseTimesMs = [];
  cm.locked = false;
  cm.sessionSaved = false;
  cm.isPlaying = true;

  generateColorMatchRound();
  clearColorMatchFeedback();
  renderColorMatchHud();
  updateColorMatchOverlay();

  cm.timerId = setInterval(() => {
    cm.timeLeft -= 1;
    if (cm.timeLeft <= 0) {
      cm.timeLeft = 0;
      cm.isPlaying = false;
      stopColorMatchTimers();

      if (!cm.sessionSaved) {
        cm.sessionSaved = true;
        const accuracy = cm.answers === 0 ? 0 : (cm.correct / cm.answers) * 100;
        const wrongCount = Math.max(0, cm.answers - cm.correct);
        const averageResponseMs = cm.responseTimesMs.length
          ? cm.responseTimesMs.reduce((sum, value) => sum + value, 0) / cm.responseTimesMs.length
          : 0;
        saveSessionToDatabase({
          gameType: "color_match",
          score: cm.score,
          accuracy,
          peakMultiplier: cm.peakMultiplier,
          durationSeconds: 60,
          roundCount: cm.answers,
          detail: {
            correct: cm.correct,
            answers: cm.answers,
            wrong: wrongCount,
            averageResponseMs,
            responseSampleCount: cm.responseTimesMs.length
          }
        }).then(() => {
          if (loadStatsOverview) loadStatsOverview();
        });
      }
    }
    renderColorMatchHud();
    updateColorMatchOverlay();
  }, 1000);
}

export function resetColorMatchGame() {
  const cm = appState.colorMatch;

  stopColorMatchTimers();
  cm.score = 0;
  cm.timeLeft = 60;
  cm.multiplier = 1;
  cm.peakMultiplier = 1;
  cm.streak = 0;
  cm.answers = 0;
  cm.correct = 0;
  cm.roundStartedAtMs = 0;
  cm.responseTimesMs = [];
  cm.locked = false;
  cm.sessionSaved = false;
  cm.isPlaying = false;

  generateColorMatchRound();
  clearColorMatchFeedback();
  renderColorMatchHud();
  updateColorMatchOverlay();
}

function handleColorMatchAnswer(playerAnswerYes, loadStatsOverview) {
  const cm = appState.colorMatch;
  if (!cm.isPlaying || cm.locked) {
    return;
  }

  cm.locked = true;
  cm.answers += 1;

  const respondedAt = performance.now();
  if (Number.isFinite(cm.roundStartedAtMs) && cm.roundStartedAtMs > 0) {
    const responseTimeMs = Math.max(0, respondedAt - cm.roundStartedAtMs);
    cm.responseTimesMs.push(responseTimeMs);
  }

  if (playerAnswerYes === cm.isMatch) {
    const reward = 50 * cm.multiplier;
    cm.score += reward;
    appState.topScore += reward;
    cm.correct += 1;
    setColorMatchFeedback("Correct", "good");

    if (cm.streak === 3) {
      cm.multiplier += 1;
      cm.streak = 0;
    } else {
      cm.streak += 1;
    }

    cm.peakMultiplier = Math.max(cm.peakMultiplier, cm.multiplier);
  } else {
    setColorMatchFeedback("Wrong", "bad");

    if (cm.streak > 0) {
      cm.streak = 0;
    } else if (cm.multiplier > 1) {
      cm.multiplier -= 1;
    }
  }

  renderTopStatus();
  renderColorMatchHud();

  cm.roundDelayId = setTimeout(() => {
    generateColorMatchRound();
    renderColorMatchHud();
    cm.locked = false;
  }, 300);
}

function bindColorMatchEvents(loadStatsOverview) {
  if (refs.cmNoBtn) refs.cmNoBtn.addEventListener("click", () => handleColorMatchAnswer(false, loadStatsOverview));
  if (refs.cmYesBtn) refs.cmYesBtn.addEventListener("click", () => handleColorMatchAnswer(true, loadStatsOverview));
  if (refs.cmOverlayAction) refs.cmOverlayAction.addEventListener("click", () => startColorMatchGame(loadStatsOverview));
  if (refs.cmResetBtn) refs.cmResetBtn.addEventListener("click", resetColorMatchGame);
  if (refs.cmResultPlayAgain) refs.cmResultPlayAgain.addEventListener("click", () => startColorMatchGame(loadStatsOverview));
  if (refs.cmResultBack) {
    refs.cmResultBack.addEventListener("click", () => {
      setView("dashboardView", loadStatsOverview);
      resetColorMatchGame();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (appState.activeView !== "colorMatchView") {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handleColorMatchAnswer(false, loadStatsOverview);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleColorMatchAnswer(true, loadStatsOverview);
    }
  });
}

export function initColorMatch(loadStatsOverview) {
  if (!appState.resets) appState.resets = {};
  appState.resets.colorMatch = resetColorMatchGame;
  
  generateColorMatchRound();
  renderColorMatchHud();
  updateColorMatchOverlay();
  bindColorMatchEvents(loadStatsOverview);
}

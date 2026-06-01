import React, { useState, useEffect, useCallback } from 'react';

// Theme Colors (Luminous Mind)
const THEME = {
  primary: '#F88547',
  bgDark: '#2C2C2C', // Darkened neutral for background
  cardBg: '#FFFFFF',
  textMain: '#333333',
  green: '#34C759',
  red: '#FF3B30'
};

// Available words and actual CSS colors
const GAME_COLORS = [
  { word: 'red', hex: '#FF3B30' },
  { word: 'blue', hex: '#007AFF' },
  { word: 'green', hex: '#34C759' },
  { word: 'yellow', hex: '#FFCC00' },
  { word: 'black', hex: '#333333' }
];

export default function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null

  // Multiplier & Streak States
  const [multiplier, setMultiplier] = useState(1);
  const [streakCount, setStreakCount] = useState(0); // 0 to 3

  // Card States
  const [leftCard, setLeftCard] = useState({ word: '', hex: '' }); // Meaning
  const [rightCard, setRightCard] = useState({ word: '', hex: '' }); // Text Color
  const [isMatch, setIsMatch] = useState(false); // The correct answer for current round

  // Function to generate a new round
  const generateRound = useCallback(() => {
    // 1. Pick left card (Meaning). Color is always dark grey/black.
    const leftItem = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
    
    // 2. Decide randomly if this round should be a MATCH (Yes) or NOT (No)
    const shouldMatch = Math.random() > 0.5;
    setIsMatch(shouldMatch);

    let rightItemWord, rightItemColor;

    if (shouldMatch) {
      // If it's a match, the RIGHT card's COLOR must match the LEFT card's WORD.
      // The word on the right card can be anything (usually random to confuse).
      const randomWordForRight = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].word;
      rightItemWord = { word: randomWordForRight };
      rightItemColor = GAME_COLORS.find(c => c.word === leftItem.word);
    } else {
      // If it's NOT a match, the RIGHT card's COLOR must NOT match the LEFT card's WORD.
      const randomWordForRight = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].word;
      let nonMatchingColors = GAME_COLORS.filter(c => c.word !== leftItem.word);
      rightItemColor = nonMatchingColors[Math.floor(Math.random() * nonMatchingColors.length)];
      rightItemWord = { word: randomWordForRight };
    }

    setLeftCard({ word: leftItem.word, hex: '#333333' }); // Left is always dark text
    setRightCard({ word: rightItemWord.word, hex: rightItemColor.hex });
  }, []);

  // Start Game
  const startGame = () => {
    setScore(0);
    setMultiplier(1);
    setStreakCount(0);
    setTimeLeft(60);
    setIsPlaying(true);
    setFeedback(null);
    generateRound();
  };

  // Timer Effect
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
    }
  }, [timeLeft, isPlaying]);

  // Handle Player Answer
  const handleAnswer = (playerAnswerYes) => {
    if (!isPlaying) return;

    if (playerAnswerYes === isMatch) {
      // Correct
      setScore(prev => prev + (50 * multiplier));
      setFeedback('correct');
      
      // Update Streak and Multiplier
      if (streakCount === 3) {
        setMultiplier(prev => prev + 1);
        setStreakCount(0);
      } else {
        setStreakCount(prev => prev + 1);
      }
    } else {
      // Wrong
      setFeedback('wrong');
      
      // Penalty Logic
      if (streakCount > 0) {
        // Lose the current dots, keep the multiplier
        setStreakCount(0);
      } else if (multiplier > 1) {
        // Drop multiplier if no dots left
        setMultiplier(prev => prev - 1);
      }
    }

    setTimeout(() => {
      setFeedback(null);
      generateRound();
    }, 300); // brief pause to show feedback
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handleAnswer(false); // NO
      if (e.key === 'ArrowRight') handleAnswer(true); // YES
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMatch, isPlaying]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#8B7D72] p-4 font-sans selection:bg-transparent">
      {/* Top Bar */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8 bg-[#2C2C2C]/80 px-6 py-3 rounded-full text-white backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-4">
          <button className="text-xl hover:text-[#F88547] transition-colors" title="Pause">⏸</button>
        </div>
        <div className="flex gap-6 text-lg font-medium tracking-wide items-center">
          <div>TIME <span className="text-[#F88547] ml-2">{timeLeft}</span></div>
          <div>SCORE <span className="text-[#BFE7EF] ml-2">{score}</span></div>
          
          {/* Multiplier & Streak UI */}
          <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-lg ml-2">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    i < streakCount ? 'bg-[#F9AB3E] shadow-[0_0_8px_#F9AB3E]' : 'bg-white/20'
                  }`} 
                />
              ))}
            </div>
            <span className="text-[#F9AB3E] font-bold ml-1 text-xl">x{multiplier}</span>
          </div>
        </div>
      </div>

      {!isPlaying && timeLeft === 60 ? (
        <div className="bg-[#2C2C2C] p-10 rounded-2xl text-center shadow-2xl text-white max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-[#F88547]">Color Match</h1>
          <p className="mb-8 text-gray-300">
            Does the <b className="text-white">meaning</b> of the left word match the <b className="text-white">color</b> of the right word?
          </p>
          <button 
            onClick={startGame}
            className="bg-[#F88547] hover:bg-[#e0753d] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            START GAME
          </button>
        </div>
      ) : !isPlaying && timeLeft === 0 ? (
        <div className="bg-[#2C2C2C] p-10 rounded-2xl text-center shadow-2xl text-white max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-[#BFE7EF]">Time's Up!</h1>
          <p className="mb-2 text-gray-300">Final Score</p>
          <p className="text-5xl font-bold text-[#F9AB3E] mb-8">{score}</p>
          <button 
            onClick={startGame}
            className="bg-[#F88547] hover:bg-[#e0753d] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            PLAY AGAIN
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-3xl">
          <h2 className="text-2xl text-white mb-8 font-medium drop-shadow-md text-center">
            Does the meaning match the text color?
          </h2>

          {/* Cards Container */}
          <div className="flex flex-col md:flex-row gap-8 justify-center items-center w-full mb-12 relative">
            
            {/* Visual Feedback Overlay (Correct/Wrong) */}
            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                {feedback === 'correct' ? (
                  <div className="text-[#34C759] text-8xl drop-shadow-lg font-bold">✓</div>
                ) : (
                  <div className="text-[#FF3B30] text-8xl drop-shadow-lg font-bold">✗</div>
                )}
              </div>
            )}

            {/* Left Card (Meaning) */}
            <div className={`flex flex-col items-center transition-transform ${feedback ? 'scale-95 opacity-80' : ''}`}>
              <div className="bg-white w-64 h-40 flex items-center justify-center rounded-2xl shadow-xl border-b-4 border-gray-200">
                <span className="text-5xl font-bold tracking-tight" style={{ color: leftCard.hex }}>
                  {leftCard.word}
                </span>
              </div>
              <div className="mt-4 bg-white/20 px-4 py-1 rounded text-white/90 text-sm font-medium tracking-wider uppercase backdrop-blur-sm">
                Meaning
              </div>
            </div>

            {/* Right Card (Text Color) */}
            <div className={`flex flex-col items-center transition-transform ${feedback ? 'scale-95 opacity-80' : ''}`}>
              <div className="bg-white w-64 h-40 flex items-center justify-center rounded-2xl shadow-xl border-b-4 border-gray-200">
                <span className="text-5xl font-bold tracking-tight" style={{ color: rightCard.hex }}>
                  {rightCard.word}
                </span>
              </div>
              <div className="mt-4 bg-white/20 px-4 py-1 rounded text-white/90 text-sm font-medium tracking-wider uppercase backdrop-blur-sm">
                Text Color
              </div>
            </div>

          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button 
              onClick={() => handleAnswer(false)}
              className="bg-white/90 hover:bg-white text-[#333] font-bold py-4 px-10 rounded-lg shadow-md border-b-4 border-gray-300 transition-all active:border-b-0 active:translate-y-1 flex items-center gap-2"
            >
              NO <span className="bg-gray-200 px-2 py-0.5 rounded text-sm border border-gray-300">⬅</span>
            </button>
            <button 
              onClick={() => handleAnswer(true)}
              className="bg-white/90 hover:bg-white text-[#333] font-bold py-4 px-10 rounded-lg shadow-md border-b-4 border-gray-300 transition-all active:border-b-0 active:translate-y-1 flex items-center gap-2"
            >
              <span className="bg-gray-200 px-2 py-0.5 rounded text-sm border border-gray-300">➡</span> YES
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
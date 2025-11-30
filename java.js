const LEVELS = {
  easy: { pairs: 6, time: 90, special: { bomb:1, joker:1, freeze:1 } },
  medium: { pairs: 10, time: 120, special: { bomb:2, joker:1, freeze:2 } },
  hard: { pairs: 14, time: 180, special: { bomb:3, joker:2, freeze:2 } }
};

const SYMBOLS = [
  "🍎","🍌","🍇","🍓","🍋","🍑","🍍","🥝","🍉","🍒",
  "🐶","🐱","🦊","🐼","🦁","🐯","🐵","🦄","🐸","🐙",
  "⚽","🏀","🎲","🎯","🎸","🎮","🎧","🚗","✈️","🚀"
];

const gameBoard = document.getElementById('gameBoard');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const levelSelect = document.getElementById('level');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

let state = {
  deck: [],
  flipped: [],
  matchedCount: 0,
  pairsTotal: 0,
  timeLeft: 0,
  timerId: null,
  running: false,
  score: 0,
  freezeTimeout: null,
  mismatchLock: false
};

function formatTime(seconds){
  const m = Math.floor(seconds/60).toString().padStart(2,'0');
  const s = (seconds%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function saveBest(level, score, time){
  const key = `memory_best_${level}`;
  const prev = JSON.parse(localStorage.getItem(key));
  if(!prev || score > prev.score || (score === prev.score && time < prev.time)){
    localStorage.setItem(key, JSON.stringify({score, time, date: Date.now()}));
  }
}

function loadBest(level){
  const key = `memory_best_${level}`;
  const prev = JSON.parse(localStorage.getItem(key));
  if(prev) return `${prev.score} pts • ${formatTime(prev.time)}`;
  return '—';
}

function stopTimer(){
  if(state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function updateDisplays(){
  timerEl.textContent = formatTime(state.timeLeft);
  scoreEl.textContent = state.score;
  bestEl.textContent = loadBest(levelSelect.value);
}

levelSelect.addEventListener('change', () => {
  bestEl.textContent = loadBest(levelSelect.value);
});

(function init(){
  bestEl.textContent = loadBest(levelSelect.value);
  timerEl.textContent = formatTime(0);
  scoreEl.textContent = '0';
})();


startBtn.addEventListener('click', () => startGame());

function resetUIState(){
  stopTimer();
  state.flipped = [];
  state.deck = [];
  state.matchedCount = 0;
  state.score = 0;
  state.timeLeft = 0;
  state.running = false;
  state.freezeTimeout && clearTimeout(state.freezeTimeout);
  state.freezeTimeout = null;
  updateDisplays();
  gameBoard.innerHTML = '';
}

resetBtn.addEventListener('click', () => {
  if(confirm('Réinitialiser et effacer la partie actuelle ?')) {
    localStorage.clear();
    resetUIState();
  }
});
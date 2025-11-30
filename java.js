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

function startTimer(){
  if(state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if(!state.running) return;
    state.timeLeft--;
    updateDisplays();
    if(state.timeLeft <= 0){
      clearInterval(state.timerId);
      state.running = false;
      gameOver(false);
    }
  }, 1000);
}

function gameOver(win){
  state.running = false;
  stopTimer();
  const level = levelSelect.value;
  if(win){
    const used = LEVELS[level].time - state.timeLeft;
    saveBest(level, state.score, used);
    alert(`Bravo ! Niveau terminé. Score: ${state.score} — Temps: ${formatTime(used)}.`);
  } else {
    alert(`Temps écoulé ! Score: ${state.score}. Réessaie.`);
  }
  bestEl.textContent = loadBest(level);
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

function startGame(){
  stopTimer();
  resetUIState();
  const level = levelSelect.value;
  const cfg = LEVELS[level];
  state.pairsTotal = cfg.pairs;
  state.deck = buildDeck(cfg);
  state.matchedCount = 0;
  state.score = 0;
  state.timeLeft = cfg.time;
  state.running = true;
  state.mismatchLock = false;
  updateDisplays();
  renderBoard();
  startTimer();
}

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

gameBoard.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if(!card) return;
  onCardClick(card);
});


function revealCard(card, el){
  card.revealed = true;
  el.classList.add('flipped');
  el.setAttribute('aria-pressed','true');
}

function hideCard(card, el){
  card.revealed = false;
  el.classList.remove('flipped');
  el.setAttribute('aria-pressed','false');
}

function markMatched(card, el){
  card.matched = true;
  el.classList.add('match');
  el.setAttribute('aria-pressed','true');
}



function onCardClick(target){
  if(!state.running || state.mismatchLock) return;
  const cardEl = target.closest('.card');
  if(!cardEl) return;
  const id = Number(cardEl.dataset.id);
  const card = state.deck.find(c => c.id === id);
  if(!card || card.revealed || card.matched) return;

  revealCard(card, cardEl);

  if(card.type === 'special'){
    handleSpecialCard(card, cardEl);

    return;
  }

  state.flipped.push({ card, el: cardEl });
  if(state.flipped.length === 2){
    checkMatch();
  }
}

function flashBoard(type){
  if(type === 'bomb'){
    gameBoard.style.transition = 'box-shadow 120ms';
    gameBoard.style.boxShadow = '0 0 40px rgba(239,68,68,0.5)';
    setTimeout(()=> gameBoard.style.boxShadow = '', 300);
  }
}

function handleSpecialCard(card, cardEl){
  markMatched(card, cardEl); 
  state.score += 20; 
  updateDisplays();

  const name = card.special;
  if(name === 'bomb'){
    state.timeLeft = Math.max(0, state.timeLeft - 12);
    state.score = Math.max(0, state.score - 40);
    flashBoard('bomb');
    updateDisplays();
    if(state.timeLeft <= 0) {
      state.running = false;
      gameOver(false);
    }
  } else if(name === 'joker'){
    const unmatchedPairs = state.deck.filter(c => c.type==='pair' && !c.matched);
    if(unmatchedPairs.length >= 2){
      const values = [...new Set(unmatchedPairs.map(x=>x.val))];
      const chosenVal = values[Math.floor(Math.random()*values.length)];
      const pairCards = state.deck.filter(c => c.type==='pair' && c.val===chosenVal && !c.matched);
      if(pairCards.length === 2){
        pairCards.forEach(pc => {
          const el = gameBoard.querySelector(`.card[data-id='${pc.id}']`);
          revealCard(pc, el);
          markMatched(pc, el);
        });
        state.score += 120;
      }
    }
  } else if(name === 'freeze'){
    if(state.timerId){
      clearInterval(state.timerId);
      state.freezeTimeout && clearTimeout(state.freezeTimeout);
      state.freezeTimeout = setTimeout(() => {
        startTimer();
        state.freezeTimeout = null;
      }, 5000);
    }
  }
}


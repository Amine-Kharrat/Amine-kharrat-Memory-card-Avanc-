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

function checkMatch(){
  const [a,b] = state.flipped;
  if(!a || !b) return;
  if(a.card.val === b.card.val && a.card.type === 'pair' && b.card.type === 'pair'){
    markMatched(a.card, a.el);
    markMatched(b.card, b.el);
    state.matchedCount++;
    state.score += 100; 
    state.flipped = [];
    updateDisplays();
    const totalPairs = state.pairsTotal;
    const matchedPairs = state.deck.filter(d => d.type==='pair' && d.matched).length / 2;
    const pairMatchedCount = new Set(state.deck.filter(d=>d.type==='pair'&&d.matched).map(x=>x.val)).size;
    if(pairMatchedCount >= totalPairs){ //ki terba7 hedha
      state.running = false;
      stopTimer();
      gameOver(true);
    }
  } else {
        state.score = Math.max(0, state.score - 10);
        state.mismatchLock = true;
        const els = [a.el, b.el];
        setTimeout(() => {
            els.forEach(e => e.classList.add('mismatch'));
            setTimeout(() => {
                els.forEach(e => e.classList.remove('mismatch'));
                hideCard(a.card, a.el);
                hideCard(b.card, b.el);
                state.flipped = [];
                state.mismatchLock = false;
                updateDisplays();

            }, 600);

        }, 400);
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

function shuffle(array){
  for(let i = array.length -1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderBoard(){
  gameBoard.innerHTML = '';
  gameBoard.className = 'board cols';
  state.deck.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = `card${card.special ? ' special ' + card.special : ''}`;
    cardEl.setAttribute('data-id', card.id);
    cardEl.innerHTML = `
      <div class="cardInner">
        <div class="face back" aria-hidden="true">
          <div class="symbol">?</div>
        </div>
        <div class="face front" aria-hidden="true">
          ${card.type === 'pair' ? `<div class="pairVal">${card.val}</div>` : `<div class="pairVal specialVal">${card.val}</div>`}
        </div>
      </div>
    `;
    if(card.matched) cardEl.classList.add('match');
    gameBoard.appendChild(cardEl);
  });
}

function buildDeck(levelCfg){
  const { pairs, special } = levelCfg; // yhez les valeurs
  const chosen = SYMBOLS.slice(0, pairs); //kadesh men pair
  const basePairs = chosen.flatMap(sym => ([{ type:'pair', val:sym }, { type:'pair', val:sym }])); //ydupliqui lwhid
  let deck = [...basePairs]; //y3abi fil les normales
  const specials = []; //y3amer fil les specials
  for(const [name, count] of Object.entries(special)){
    for(let i=0;i<count;i++){
      specials.push({ type:'special', special:name, val:name.toUpperCase() });
    }
  }

  deck = deck.concat(specials); //l'ajout final te3hom
  shuffle(deck); //ymashki 
  deck = deck.map((c, idx) => ({ ...c, id: idx, revealed:false, matched:false })); //na3tiw il id w tebdew par défau ma9loubin w mismatched 
  return deck;
}

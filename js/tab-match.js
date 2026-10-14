/**
 * LingoPop - Collocation & Word Match Speed Challenge Module
 * 
 * Interactive tile-matching game designed to strengthen word-collocation,
 * definition, and synonym connections through gamified rapid pairing.
 */

let matchGameState = {
  mode: 'colloc', // 'colloc' | 'definition' | 'synonym'
  totalPairs: 6,
  matchedPairs: 0,
  firstCard: null,
  secondCard: null,
  isLocked: false,
  timerInterval: null,
  seconds: 0,
  combo: 0,
  maxCombo: 0,
  bestTimes: {}
};

// Web Audio API Sound Synthesizer (Zero External Assets)
let matchAudioCtx = null;

function getMatchAudioContext() {
  if (!matchAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      matchAudioCtx = new AudioContext();
    }
  }
  if (matchAudioCtx && matchAudioCtx.state === 'suspended') {
    matchAudioCtx.resume();
  }
  return matchAudioCtx;
}

function playMatchSound(type) {
  try {
    const ctx = getMatchAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      // Pleasant rising chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'wrong') {
      // Low dual thud
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'win') {
      // Fanfare arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        const startTime = now + idx * 0.09;
        g.gain.setValueAtTime(0.12, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        o.start(startTime);
        o.stop(startTime + 0.35);
      });
    }
  } catch (e) {
    console.warn("Audio playback not supported or blocked", e);
  }
}

// Format seconds into MM:SS
function formatMatchTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// Fisher-Yates Array Shuffle
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function populateMatchLevelOptions() {
  const matchFilter = document.getElementById('match-level-select');
  if (!matchFilter || !Array.isArray(words)) return;
  const uniqueLevels = Array.from(new Set(words.map(w => w.level))).filter(Boolean).sort();
  const prevVal = matchFilter.value;
  matchFilter.innerHTML = `<option value="all">전체 레벨</option>`;
  uniqueLevels.forEach(lvl => {
    matchFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
  });
  if ([...matchFilter.options].some(opt => opt.value === prevVal)) {
    matchFilter.value = prevVal;
  } else {
    matchFilter.value = 'all';
  }
}

// --- Initialization & UI Binding ---
function initMatchTab() {
  const setupCard = document.getElementById('match-setup-card');
  const gameCard = document.getElementById('match-game-card');
  const resultCard = document.getElementById('match-result-card');

  if (setupCard) setupCard.style.display = 'block';
  if (gameCard) gameCard.style.display = 'none';
  if (resultCard) resultCard.style.display = 'none';

  // Initialize level/lesson select boxes
  populateMatchLevelOptions();
  if (typeof updateLessonFilters === 'function') {
    updateLessonFilters('match');
  }

  // Mode radio card clicks
  const modeCards = document.querySelectorAll('.match-mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'var(--glass-border)';
        c.style.background = 'rgba(255, 255, 255, 0.02)';
      });
      card.classList.add('active');
      card.style.borderColor = 'var(--accent-primary)';
      card.style.background = 'rgba(99, 102, 241, 0.1)';
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        matchGameState.mode = radio.value;
      }
    });
  });

  // Size buttons (6 pairs vs 8 pairs)
  const sizeBtns = document.querySelectorAll('.match-size-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      matchGameState.totalPairs = parseInt(btn.getAttribute('data-pairs'), 10) || 6;
    });
  });

  // Level & Lesson select changes
  const levelSelect = document.getElementById('match-level-select');
  if (levelSelect) {
    levelSelect.onchange = () => {
      updateLessonFilters('match');
    };
  }

  const unitSelect = document.getElementById('match-unit-select');
  if (unitSelect) {
    unitSelect.onchange = () => {
      updateLessonFilters('match');
    };
  }

  const lessonSelect = document.getElementById('match-lesson-select');
  if (lessonSelect) {
    lessonSelect.onchange = () => {
      updateSegmentFilters('match');
    };
  }

  // Start Challenge Button
  const startBtn = document.getElementById('match-start-btn');
  if (startBtn) {
    startBtn.onclick = startMatchGame;
  }

  // Quit Game Button
  const quitBtn = document.getElementById('match-quit-btn');
  if (quitBtn) {
    quitBtn.onclick = () => {
      if (confirm("게임을 중단하고 설정으로 돌아가시겠습니까?")) {
        clearInterval(matchGameState.timerInterval);
        resetMatchGameState();
        if (setupCard) setupCard.style.display = 'block';
        if (gameCard) gameCard.style.display = 'none';
        if (resultCard) resultCard.style.display = 'none';
      }
    };
  }

  // Result Replay Button
  const replayBtn = document.getElementById('match-replay-btn');
  if (replayBtn) {
    replayBtn.onclick = startMatchGame;
  }

  // Result Home Button
  const homeBtn = document.getElementById('match-home-btn');
  if (homeBtn) {
    homeBtn.onclick = () => {
      resetMatchGameState();
      if (setupCard) setupCard.style.display = 'block';
      if (gameCard) gameCard.style.display = 'none';
      if (resultCard) resultCard.style.display = 'none';
    };
  }
}

// Reset state
function resetMatchGameState() {
  clearInterval(matchGameState.timerInterval);
  matchGameState.firstCard = null;
  matchGameState.secondCard = null;
  matchGameState.isLocked = false;
  matchGameState.matchedPairs = 0;
  matchGameState.seconds = 0;
  matchGameState.combo = 0;
  matchGameState.maxCombo = 0;
}

// --- Start Game & Card Generator ---
function startMatchGame() {
  getMatchAudioContext(); // Resume audio on user gesture

  const setupCard = document.getElementById('match-setup-card');
  const gameCard = document.getElementById('match-game-card');
  const resultCard = document.getElementById('match-result-card');

  // Filter word pool based on user selection
  const levelVal = document.getElementById('match-level-select')?.value || 'all';
  const unitVal = document.getElementById('match-unit-select')?.value || 'all';
  const lessonVal = document.getElementById('match-lesson-select')?.value || 'all';
  const segmentVal = document.getElementById('match-segment-select')?.value || 'all';

  let pool = [...words];

  if (levelVal === 'due') {
    const now = Date.now();
    pool = pool.filter(w => !w.nextReview || w.nextReview <= now);
  } else if (levelVal !== 'all') {
    pool = pool.filter(w => w.level === levelVal);
    if (levelVal === 'Par C2' && unitVal !== 'all') {
      pool = pool.filter(w => getWordUnit(w) === unitVal);
    }
    if (lessonVal !== 'all') {
      pool = pool.filter(w => w.lesson === lessonVal);
    }
  }

  // Filter by segment
  if (segmentVal !== 'all') {
    const segNum = parseInt(segmentVal, 10);
    const count = pool.length;
    let segSize = 20;
    if (count === 30) segSize = 15;
    else if (count === 40 || count === 60) segSize = 20;

    const startIdx = (segNum - 1) * segSize;
    const endIdx = startIdx + segSize;
    pool = pool.slice(startIdx, endIdx);
  }

  if (pool.length < matchGameState.totalPairs) {
    alert(`선택한 조건의 단어가 부족합니다 (${pool.length}개 발견 / 최소 ${matchGameState.totalPairs}개 필요). 다른 단원을 선택해 주세요!`);
    return;
  }

  // Filter valid candidate words by mode
  const mode = matchGameState.mode;
  let candidates = pool;

  if (mode === 'synonym') {
    const withSyn = pool.filter(w => w.synonym && w.synonym.trim().length > 1);
    if (withSyn.length >= matchGameState.totalPairs) {
      candidates = withSyn;
    }
  }

  // Sample N distinct words
  const sampledWords = shuffleArray(candidates).slice(0, matchGameState.totalPairs);

  // Generate pair cards
  const cards = [];
  sampledWords.forEach((wordObj, idx) => {
    const pairId = `pair_${idx}_${wordObj.id}`;

    if (mode === 'colloc') {
      // Split example into headword and companion
      let headword = wordObj.word;
      let companion = "";

      if (wordObj.example && wordObj.example.trim()) {
        const exTokens = wordObj.example.trim().split(/\s+/);
        // Find headword index
        const hwIdx = exTokens.findIndex(t => t.toLowerCase().includes(headword.toLowerCase()));
        if (hwIdx !== -1 && exTokens.length > 1) {
          const rem = exTokens.filter((_, i) => i !== hwIdx).join(' ');
          companion = rem;
        } else {
          companion = wordObj.example;
        }
      } else {
        companion = wordObj.definition;
      }

      cards.push({
        pairId: pairId,
        text: headword,
        sub: wordObj.pos || '단어',
        type: 'word'
      });
      cards.push({
        pairId: pairId,
        text: companion,
        sub: '연어 짝 (Collocation)',
        type: 'colloc'
      });
    } else if (mode === 'synonym') {
      const synText = (wordObj.synonym && wordObj.synonym.trim().length > 1) ? wordObj.synonym : wordObj.definition;
      cards.push({
        pairId: pairId,
        text: wordObj.word,
        sub: wordObj.pos || '단어',
        type: 'word'
      });
      cards.push({
        pairId: pairId,
        text: synText,
        sub: '유의어 (Synonym)',
        type: 'synonym'
      });
    } else {
      // Definition mode
      cards.push({
        pairId: pairId,
        text: wordObj.word,
        sub: wordObj.pos || '단어',
        type: 'word'
      });
      cards.push({
        pairId: pairId,
        text: wordObj.definition,
        sub: '국문 뜻',
        type: 'definition'
      });
    }
  });

  // Shuffle final cards array
  const shuffledCards = shuffleArray(cards);

  // Switch screens
  if (setupCard) setupCard.style.display = 'none';
  if (resultCard) resultCard.style.display = 'none';
  if (gameCard) gameCard.style.display = 'block';

  // Render cards to grid
  const grid = document.getElementById('match-grid');
  if (grid) {
    grid.innerHTML = '';
    // Adjust grid column template based on total pairs
    grid.style.gridTemplateColumns = matchGameState.totalPairs === 6 ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)';

    shuffledCards.forEach(cardData => {
      const cardEl = document.createElement('div');
      cardEl.className = 'match-card';
      cardEl.setAttribute('data-pair-id', cardData.pairId);

      cardEl.innerHTML = `
        <div class="match-card-text">${cardData.text}</div>
        <div class="match-card-type">${cardData.sub}</div>
      `;

      cardEl.addEventListener('click', () => handleCardClick(cardEl, cardData));
      grid.appendChild(cardEl);
    });
  }

  // Reset and start HUD timer & counters
  resetMatchGameState();
  updateMatchHUD();

  matchGameState.timerInterval = setInterval(() => {
    matchGameState.seconds++;
    updateMatchHUD();
  }, 1000);
}

function updateMatchHUD() {
  const timerText = document.getElementById('match-timer-text');
  if (timerText) {
    timerText.textContent = formatMatchTime(matchGameState.seconds);
  }

  const pairsCount = document.getElementById('match-pairs-count');
  if (pairsCount) {
    pairsCount.textContent = matchGameState.matchedPairs;
  }

  const totalPairsEl = document.getElementById('match-total-pairs');
  if (totalPairsEl) {
    totalPairsEl.textContent = matchGameState.totalPairs;
  }

  const comboBadge = document.getElementById('match-combo-badge');
  const comboCount = document.getElementById('match-combo-count');
  if (comboBadge && comboCount) {
    if (matchGameState.combo >= 2) {
      comboBadge.style.display = 'inline-flex';
      comboCount.textContent = matchGameState.combo;
    } else {
      comboBadge.style.display = 'none';
    }
  }
}

// --- Card Click & Matching Interaction ---
function handleCardClick(cardEl, cardData) {
  if (matchGameState.isLocked) return;
  if (cardEl.classList.contains('matched') || cardEl.classList.contains('selected')) return;

  // First card selected
  if (!matchGameState.firstCard) {
    playMatchSound('select');
    cardEl.classList.add('selected');
    matchGameState.firstCard = { el: cardEl, data: cardData };
    return;
  }

  // Second card selected
  playMatchSound('select');
  cardEl.classList.add('selected');
  matchGameState.secondCard = { el: cardEl, data: cardData };
  matchGameState.isLocked = true;

  // Check matching pair
  const isMatch = matchGameState.firstCard.data.pairId === matchGameState.secondCard.data.pairId;

  if (isMatch) {
    // Correct Match
    matchGameState.matchedPairs++;
    matchGameState.combo++;
    if (matchGameState.combo > matchGameState.maxCombo) {
      matchGameState.maxCombo = matchGameState.combo;
    }

    setTimeout(() => {
      playMatchSound('correct');
      matchGameState.firstCard.el.classList.add('matched');
      matchGameState.secondCard.el.classList.add('matched');

      matchGameState.firstCard.el.classList.remove('selected');
      matchGameState.secondCard.el.classList.remove('selected');

      updateMatchHUD();

      matchGameState.firstCard = null;
      matchGameState.secondCard = null;
      matchGameState.isLocked = false;

      // Check win condition
      if (matchGameState.matchedPairs >= matchGameState.totalPairs) {
        setTimeout(endMatchGame, 400);
      }
    }, 280);
  } else {
    // Incorrect Match
    matchGameState.combo = 0;
    updateMatchHUD();

    setTimeout(() => {
      playMatchSound('wrong');
      matchGameState.firstCard.el.classList.add('shake');
      matchGameState.secondCard.el.classList.add('shake');

      setTimeout(() => {
        matchGameState.firstCard.el.classList.remove('selected', 'shake');
        matchGameState.secondCard.el.classList.remove('selected', 'shake');

        matchGameState.firstCard = null;
        matchGameState.secondCard = null;
        matchGameState.isLocked = false;
      }, 450);
    }, 350);
  }
}

// --- End Game & Results ---
function endMatchGame() {
  clearInterval(matchGameState.timerInterval);
  playMatchSound('win');

  // Launch Canvas Confetti celebration
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // Update streak if player completed challenge
  if (typeof incrementStreak === 'function') {
    incrementStreak();
  }

  const gameCard = document.getElementById('match-game-card');
  const resultCard = document.getElementById('match-result-card');

  if (gameCard) gameCard.style.display = 'none';
  if (resultCard) resultCard.style.display = 'block';

  // Calculate & Save Best Time
  const levelVal = document.getElementById('match-level-select')?.value || 'all';
  const lessonVal = document.getElementById('match-lesson-select')?.value || 'all';
  const storageKey = `lingopop_best_match_${matchGameState.mode}_${levelVal}_${lessonVal}_${matchGameState.totalPairs}`;

  const currentSeconds = matchGameState.seconds;
  const prevBest = localStorage.getItem(storageKey);
  let isNewBest = false;

  if (!prevBest || currentSeconds < parseInt(prevBest, 10)) {
    localStorage.setItem(storageKey, currentSeconds);
    isNewBest = true;
  }

  const bestSeconds = isNewBest ? currentSeconds : parseInt(prevBest, 10);

  // Fill Result UI
  const timeEl = document.getElementById('result-match-time');
  if (timeEl) timeEl.textContent = formatMatchTime(currentSeconds);

  const comboEl = document.getElementById('result-match-combo');
  if (comboEl) comboEl.textContent = `🔥 ${matchGameState.maxCombo}`;

  const bestEl = document.getElementById('result-match-best');
  if (bestEl) {
    bestEl.textContent = `${formatMatchTime(bestSeconds)}${isNewBest ? ' 🏆' : ''}`;
  }

  const subtitleEl = document.getElementById('match-result-subtitle');
  if (subtitleEl) {
    if (isNewBest) {
      subtitleEl.innerHTML = `<span style="color: #10b981; font-weight: 700;">신기록 달성! 🏆</span> 최고 속도로 모든 짝을 완성했습니다!`;
    } else {
      subtitleEl.textContent = `모든 짝을 멋지게 연결했습니다. 다시 도전하여 기록을 단축해 보세요!`;
    }
  }

  // Re-initialize Lucide Icons in result view
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMatchTab);
} else {
  initMatchTab();
}

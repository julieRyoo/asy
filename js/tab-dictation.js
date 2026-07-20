/**
 * LingoPop - Dictation Tab Logic
 */

function setupDictation() {
  const levelSelect = document.getElementById('dictation-level-filter');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      updateLessonFilters('dictation');
    });
  }

  const lessonSelect = document.getElementById('dictation-lesson-filter');
  if (lessonSelect) {
    lessonSelect.addEventListener('change', () => {
      updateSegmentFiltersVisibility('dictation');
    });
  }

  const startBtn = document.getElementById('dictation-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startDictation);
  }

  const nextBtn = document.getElementById('dictation-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      dictationSession.currentIndex++;
      if (dictationSession.currentIndex < dictationSession.prompts.length) {
        renderDictationPrompt();
      } else {
        showDictationResults();
      }
    });
  }

  const retryBtn = document.getElementById('dictation-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      resetDictationState();
    });
  }

  const replayBtn = document.getElementById('dictation-replay-btn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      const currentPrompt = dictationSession.prompts[dictationSession.currentIndex];
      if (currentPrompt) {
        speakWord(currentPrompt.word.word);
      }
    });
  }
}

function resetDictationState() {
  const setupContainer = document.getElementById('dictation-setup-container');
  const playContainer = document.getElementById('dictation-play-container');
  const resultContainer = document.getElementById('dictation-result-container');

  if (setupContainer) setupContainer.style.display = 'block';
  if (playContainer) playContainer.style.display = 'none';
  if (resultContainer) resultContainer.style.display = 'none';

  dictationSession.words = [];
  dictationSession.currentIndex = 0;
  dictationSession.prompts = [];

  const dictationSeg = document.getElementById('dictation-segment-filter');
  if (dictationSeg) dictationSeg.value = 'all';
  updateSegmentFiltersVisibility('dictation');
}

function startDictation() {
  const levelVal = document.getElementById('dictation-level-filter').value;
  const lessonVal = document.getElementById('dictation-lesson-filter').value;
  const modeVal = document.getElementById('dictation-mode-select').value;

  let filtered = [];
  if (levelVal === 'all') {
    filtered = [...words];
  } else {
    if (lessonVal === 'all') {
      filtered = words.filter(w => w.level === levelVal);
    } else {
      filtered = words.filter(w => w.level === levelVal && w.lesson === lessonVal);
      // Ensure sorted index by ID
      filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      
      const segmentVal = document.getElementById('dictation-segment-filter').value;
      if (segmentVal === '1') {
        filtered = filtered.slice(0, 20);
      } else if (segmentVal === '2') {
        filtered = filtered.slice(20, 40);
      } else if (segmentVal === '3') {
        filtered = filtered.slice(40, 60);
      }
    }
  }

  if (filtered.length === 0) {
    alert("선택한 범위에 해당하는 단어가 없습니다.");
    return;
  }

  // Shuffle dictation questions
  filtered = filtered.sort(() => Math.random() - 0.5);

  const countVal = document.getElementById('dictation-count-select').value;
  if (countVal !== 'all') {
    const limit = parseInt(countVal);
    filtered = filtered.slice(0, limit);
  }

  dictationSession.words = filtered;
  dictationSession.currentIndex = 0;
  dictationSession.mode = modeVal;
  dictationSession.prompts = [];

  // Generate prompts
  filtered.forEach(w => {
    let type = 'audio'; // default
    if (modeVal === 'audio-only') {
      type = 'audio';
    } else if (modeVal === 'text-only') {
      type = 'text';
    } else if (modeVal === 'mixed') {
      type = Math.random() < 0.5 ? 'audio' : 'text';
    }

    const promptText = w.word; // Always show English word when type is text
    dictationSession.prompts.push({
      word: w,
      type: type,
      promptText: promptText
    });
  });

  // Setup badge scope text
  const badgeEl = document.getElementById('dictation-scope-badge');
  if (badgeEl) {
    if (levelVal === 'all') {
      badgeEl.textContent = '전체 보관 단어';
    } else {
      badgeEl.textContent = lessonVal === 'all' ? `${levelVal} (전체 레슨)` : `${levelVal} — ${lessonVal}`;
    }
  }

  // Hide settings, show play area
  document.getElementById('dictation-setup-container').style.display = 'none';
  document.getElementById('dictation-play-container').style.display = 'block';
  document.getElementById('dictation-result-container').style.display = 'none';

  renderDictationPrompt();
}

function renderDictationPrompt() {
  const currentPrompt = dictationSession.prompts[dictationSession.currentIndex];
  if (!currentPrompt) return;

  const total = dictationSession.prompts.length;
  const currentNum = dictationSession.currentIndex + 1;

  document.getElementById('dictation-progress-text').textContent = `${currentNum} / ${total} 단어`;
  
  const hintTextEl = document.getElementById('dictation-card-hint-text');
  const promptTextEl = document.getElementById('dictation-card-prompt-text');
  const replayBtn = document.getElementById('dictation-replay-btn');

  if (currentPrompt.type === 'text') {
    hintTextEl.textContent = '화면의 영어 단어를 보고 종이에 스펠링을 받아 적으세요.';
    promptTextEl.textContent = currentPrompt.promptText;
    promptTextEl.style.display = 'block';
    if (replayBtn) replayBtn.style.display = 'none';
  } else {
    hintTextEl.textContent = '음성을 잘 듣고 종이에 영어 단어(스펠링)를 받아 적으세요.';
    promptTextEl.style.display = 'none';
    if (replayBtn) replayBtn.style.display = 'flex';
    
    // Auto speak
    setTimeout(() => {
      speakWord(currentPrompt.word.word);
    }, 150);
  }

  // Make the next button say "정답 확인" on the last word
  const nextBtn = document.getElementById('dictation-next-btn');
  if (nextBtn) {
    if (currentNum === total) {
      nextBtn.innerHTML = `<span>정답 확인하기 (완료)</span> <i data-lucide="check-square"></i>`;
    } else {
      nextBtn.innerHTML = `<span>다음 단어</span> <i data-lucide="arrow-right"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

function showDictationResults() {
  const setupContainer = document.getElementById('dictation-setup-container');
  const playContainer = document.getElementById('dictation-play-container');
  const resultContainer = document.getElementById('dictation-result-container');

  setupContainer.style.display = 'none';
  playContainer.style.display = 'none';
  resultContainer.style.display = 'block';

  const tbody = document.getElementById('dictation-answers-tbody');
  tbody.innerHTML = '';

  dictationSession.prompts.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--glass-border)';
    
    // Highlight mixed formats
    const isText = p.type === 'text';
    const promptCellClass = isText ? 'color: var(--color-primary);' : 'color: #fff;';
    const typeLabel = isText ? '[스펠링 보기]' : '[음성 듣기]';
    const displayPrompt = isText ? p.promptText : '🔊 (음성 출제됨)';

    tr.innerHTML = `
      <td style="padding: 12px 16px; color: var(--text-secondary); font-weight: 500;">${idx + 1}</td>
      <td style="padding: 12px 16px; font-weight: 600; ${promptCellClass}">${typeLabel} ${displayPrompt}</td>
      <td style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: #fff; font-size: 15px;">${p.word.word}</td>
      <td style="padding: 12px 16px; font-style: italic; color: var(--text-muted); font-size: 13px;">${p.word.pos}</td>
      <td style="padding: 12px 16px; color: var(--text-secondary);">${p.word.definition}</td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

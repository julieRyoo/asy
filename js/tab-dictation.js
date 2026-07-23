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

  const checkBtn = document.getElementById('dictation-check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', checkDictationAnswer);
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

  const inputField = document.getElementById('dictation-input');
  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const checkBtnVisible = document.getElementById('dictation-check-btn').style.display !== 'none';
        if (checkBtnVisible) {
          checkDictationAnswer();
        } else {
          document.getElementById('dictation-next-btn').click();
        }
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

  const dictationInput = document.getElementById('dictation-input');
  if (dictationInput) {
    dictationInput.value = '';
    dictationInput.disabled = false;
  }
  const feedbackEl = document.getElementById('dictation-feedback');
  if (feedbackEl) {
    feedbackEl.style.display = 'none';
  }

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
    } else if (modeVal === 'meaning-only') {
      type = 'meaning';
    } else if (modeVal === 'text-only') {
      type = 'text';
    } else if (modeVal === 'mixed') {
      const rand = Math.random();
      if (rand < 0.4) {
        type = 'audio';
      } else if (rand < 0.8) {
        type = 'meaning';
      } else {
        type = 'text';
      }
    }

    const promptText = w.word; // Always show English word when type is text
    dictationSession.prompts.push({
      word: w,
      type: type,
      promptText: promptText,
      userAnswer: '',
      isCorrect: false
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
  const dictationInput = document.getElementById('dictation-input');
  const feedbackEl = document.getElementById('dictation-feedback');
  const checkBtn = document.getElementById('dictation-check-btn');
  const nextBtn = document.getElementById('dictation-next-btn');

  // Reset controls
  dictationInput.value = '';
  dictationInput.disabled = false;
  feedbackEl.style.display = 'none';
  checkBtn.style.display = 'inline-flex';
  nextBtn.style.display = 'none';

  if (currentPrompt.type === 'text') {
    hintTextEl.textContent = '화면의 영어 단어를 보고 아래 입력창에 한글 뜻을 입력하세요.';
    promptTextEl.textContent = currentPrompt.word.word;
    promptTextEl.style.display = 'block';
    if (replayBtn) replayBtn.style.display = 'none';
    dictationInput.placeholder = '한글 뜻을 입력하고 엔터를 치세요';
  } else if (currentPrompt.type === 'meaning') {
    hintTextEl.textContent = '한글 뜻을 보고 아래 입력창에 해당하는 영어 스펠링을 입력하세요.';
    promptTextEl.textContent = `[${currentPrompt.word.pos}] ${currentPrompt.word.definition}`;
    promptTextEl.style.display = 'block';
    if (replayBtn) replayBtn.style.display = 'none';
    dictationInput.placeholder = '영어 스펠링을 입력하고 엔터를 치세요';
  } else { // 'audio'
    hintTextEl.textContent = '원어민 발음을 잘 듣고 아래 입력창에 영어 단어(스펠링)를 입력하세요.';
    promptTextEl.style.display = 'none';
    if (replayBtn) replayBtn.style.display = 'flex';
    dictationInput.placeholder = '영어 스펠링을 입력하고 엔터를 치세요';
    
    // Auto speak
    setTimeout(() => {
      speakWord(currentPrompt.word.word);
    }, 150);
  }

  // Make the next button say "결과 확인하기" on the last word
  if (nextBtn) {
    if (currentNum === total) {
      nextBtn.innerHTML = `<span>결과 확인하기 (완료)</span> <i data-lucide="check-square"></i>`;
    } else {
      nextBtn.innerHTML = `<span>다음 단어</span> <i data-lucide="arrow-right"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  setTimeout(() => {
    dictationInput.focus();
  }, 120);
}

function matchKoreanDefinition(userVal, correctDefinition) {
  // Normalize strings by removing spaces, commas, and special symbols
  const normalize = (str) => str.replace(/[\s,\.\(\)\~\?]/g, '').toLowerCase();
  const normalizedUser = normalize(userVal);
  const normalizedCorrect = normalize(correctDefinition);

  if (!normalizedUser) return false;

  // 1. Exact normalized match
  if (normalizedUser === normalizedCorrect) return true;

  // 2. If the correct definition contains commas or slashes, check synonyms
  const synonyms = correctDefinition.split(/[,/]/).map(s => normalize(s.trim())).filter(Boolean);
  if (synonyms.includes(normalizedUser)) return true;

  // 3. Substring check if user answer is long enough (>= 2 chars)
  if (normalizedUser.length >= 2 && normalizedCorrect.includes(normalizedUser)) return true;

  return false;
}

function checkDictationAnswer() {
  const currentPrompt = dictationSession.prompts[dictationSession.currentIndex];
  if (!currentPrompt) return;

  const dictationInput = document.getElementById('dictation-input');
  const feedbackEl = document.getElementById('dictation-feedback');
  const checkBtn = document.getElementById('dictation-check-btn');
  const nextBtn = document.getElementById('dictation-next-btn');

  const userVal = dictationInput.value.trim();
  let isCorrect = false;
  let correctAnswerText = '';

  if (currentPrompt.type === 'text') {
    // Check Korean meaning
    isCorrect = matchKoreanDefinition(userVal, currentPrompt.word.definition);
    correctAnswerText = currentPrompt.word.definition;
  } else {
    // Check English spelling
    const userValLower = userVal.toLowerCase();
    const correctVal = currentPrompt.word.word.trim().toLowerCase();
    isCorrect = (userValLower === correctVal);
    correctAnswerText = currentPrompt.word.word;
  }

  // Save student's answer
  currentPrompt.userAnswer = userVal;
  currentPrompt.isCorrect = isCorrect;

  dictationInput.disabled = true;
  checkBtn.style.display = 'none';
  nextBtn.style.display = 'inline-flex';

  feedbackEl.style.display = 'block';
  if (currentPrompt.isCorrect) {
    feedbackEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><i data-lucide="check-circle" style="width:18px; height:18px;"></i> 정답입니다! 🎉</span>`;
    feedbackEl.style.background = 'rgba(16, 185, 129, 0.12)';
    feedbackEl.style.color = '#10b981';
    feedbackEl.style.border = '1px solid rgba(16, 185, 129, 0.25)';
  } else {
    feedbackEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px; margin-bottom: 4px;"><i data-lucide="x-circle" style="width:18px; height:18px;"></i> 오답입니다.</span><br><span style="font-weight: 500; font-size:13px; opacity:0.9;">정답: <strong style="font-size:15px; color:#fff; font-family:var(--font-display);">${correctAnswerText}</strong> (입력: ${userVal ? userVal : '없음'})</span>`;
    feedbackEl.style.background = 'rgba(239, 68, 68, 0.12)';
    feedbackEl.style.color = '#ef4444';
    feedbackEl.style.border = '1px solid rgba(239, 68, 68, 0.25)';
    addIncorrectWord(currentPrompt.word.id);
  }

  // Play pronunciation
  speakWord(currentPrompt.word.word);

  if (window.lucide) window.lucide.createIcons();
  
  nextBtn.focus();
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
    let typeLabel = '';
    let displayPrompt = '';
    let promptCellClass = 'color: #fff;';
    let displayCorrectAnswer = '';

    if (p.type === 'text') {
      typeLabel = '[스펠링 보기]';
      displayPrompt = p.word.word;
      promptCellClass = 'color: var(--color-primary);';
      displayCorrectAnswer = p.word.definition;
    } else if (p.type === 'meaning') {
      typeLabel = '[뜻 보기]';
      displayPrompt = `[${p.word.pos}] ${p.word.definition}`;
      promptCellClass = 'color: #3b82f6;';
      displayCorrectAnswer = p.word.word;
    } else { // 'audio'
      typeLabel = '[음성 듣기]';
      displayPrompt = '🔊 (음성 출제됨)';
      displayCorrectAnswer = p.word.word;
    }

    const checkIcon = p.isCorrect 
      ? `<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 4px 8px; border-radius: 4px; font-weight:bold;">O</span>` 
      : `<span class="badge" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 8px; border-radius: 4px; font-weight:bold;">X</span>`;

    const userAnsText = p.userAnswer ? p.userAnswer : '<span style="color: var(--text-muted); font-style:italic;">없음</span>';

    tr.innerHTML = `
      <td style="padding: 12px 16px; color: var(--text-secondary); font-weight: 500;">${idx + 1}</td>
      <td style="padding: 12px 16px; font-weight: 600; ${promptCellClass}">${typeLabel} ${displayPrompt}</td>
      <td style="padding: 12px 16px; font-family: var(--font-display); font-weight: 500; color: var(--text-secondary);">${userAnsText}</td>
      <td style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: #fff; font-size: 15px;">${displayCorrectAnswer}</td>
      <td style="padding: 12px 16px; text-align: center;">${checkIcon}</td>
      <td style="padding: 12px 16px; font-style: italic; color: var(--text-muted); font-size: 13px;">${p.word.pos}</td>
      <td style="padding: 12px 16px; color: var(--text-secondary);">${p.word.definition}</td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

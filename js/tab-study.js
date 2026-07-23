/**
 * LingoPop - Study (Flashcards) Tab Logic
 */

function setupStudy() {
  const filterSelect = document.getElementById('study-level-filter');
  filterSelect.addEventListener('change', () => {
    updateLessonFilters('study');
    initStudySession();
  });

  const lessonFilterSelect = document.getElementById('study-lesson-filter');
  lessonFilterSelect.addEventListener('change', () => {
    updateSegmentFiltersVisibility('study');
    initStudySession();
  });

  const segmentFilterSelect = document.getElementById('study-segment-filter');
  if (segmentFilterSelect) {
    segmentFilterSelect.addEventListener('change', () => {
      initStudySession();
    });
  }

  const studyModeSelect = document.getElementById('study-mode-select');
  if (studyModeSelect) {
    studyModeSelect.addEventListener('change', () => {
      initStudySession();
    });
  }

  const startSessionBtn = document.getElementById('study-start-session-btn');
  if (startSessionBtn) {
    startSessionBtn.addEventListener('click', startActiveStudySession);
  }

  const replaySegBtn = document.getElementById('study-replay-segment-btn');
  if (replaySegBtn) {
    replaySegBtn.addEventListener('click', () => {
      initStudySession();
      startActiveStudySession();
    });
  }

  const nextSegBtn = document.getElementById('study-next-segment-btn');
  if (nextSegBtn) {
    nextSegBtn.addEventListener('click', () => {
      const segSelect = document.getElementById('study-segment-filter');
      if (segSelect && segSelect.value !== 'all') {
        const currentNum = parseInt(segSelect.value, 10);
        const nextNum = currentNum + 1;
        if (segSelect.querySelector(`option[value="${nextNum}"]`)) {
          segSelect.value = String(nextNum);
        }
      }
      initStudySession();
      startActiveStudySession();
    });
  }

  // Card Flip trigger
  const flashcard = document.getElementById('flashcard');
  flashcard.addEventListener('click', (e) => {
    // Avoid double flipping when clicking button inside card
    if (e.target.closest('button') || e.target.closest('.btn-voice-sm') || e.target.closest('input')) return;
    
    // In dictation mode, cannot flip by just clicking the front face (must submit or press enter)
    const studyMode = document.getElementById('study-mode-select').value;
    if (studyMode === 'dictation' && !flashcard.classList.contains('flipped')) {
      return;
    }
    
    flashcard.classList.toggle('flipped');

    // 뜻 먼저 보기(kor-first) 모드일 경우 뒤집어서 영어 단어가 보일 때 발음을 자동 재생해줌
    if (flashcard.classList.contains('flipped') && studyMode === 'kor-first') {
      const currentCard = studySession.words[studySession.currentIndex];
      if (currentCard) speakWord(currentCard.word);
    }
  });

  // Pronunciation speaker actions
  document.getElementById('card-speak-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const currentCard = studySession.words[studySession.currentIndex];
    if (currentCard) speakWord(currentCard.word);
  });

  document.getElementById('card-speak-btn-back').addEventListener('click', (e) => {
    e.stopPropagation();
    const currentCard = studySession.words[studySession.currentIndex];
    if (currentCard) speakWord(currentCard.word);
  });

  // Dictation action triggers
  const dictationSubmitBtn = document.getElementById('card-dictation-submit-btn');
  if (dictationSubmitBtn) {
    dictationSubmitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      submitDictation();
    });
  }

  const dictationSpeakBtn = document.getElementById('card-dictation-speak-btn');
  if (dictationSpeakBtn) {
    dictationSpeakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentCard = studySession.words[studySession.currentIndex];
      if (currentCard) speakWord(currentCard.word);
    });
  }

  // Remembered / Forgot Evaluation handlers
  document.getElementById('study-btn-forgot').addEventListener('click', () => {
    evaluateCurrentWord(false);
  });

  document.getElementById('study-btn-remembered').addEventListener('click', () => {
    evaluateCurrentWord(true);
  });

  // Study empty state actions
  document.getElementById('study-reset-filter-btn').addEventListener('click', () => {
    document.getElementById('study-level-filter').value = 'all';
    updateLessonFilters('study');
    initStudySession();
  });

  // Keyboard shortcut navigation helper
  window.addEventListener('keydown', (e) => {
    const studyTabActive = document.getElementById('study-tab').classList.contains('active');
    const cardAreaVisible = document.getElementById('flashcard-area').style.display === 'flex';
    if (!studyTabActive || studySession.words.length === 0 || !cardAreaVisible) return;

    // Override controls when typing in the dictation input
    if (document.activeElement && document.activeElement.id === 'card-dictation-input') {
      if (e.code === 'Enter') {
        e.preventDefault();
        submitDictation();
      }
      return; // block other shortcuts like space, arrows
    }

    if (e.code === 'Space') {
      e.preventDefault();
      
      const studyMode = document.getElementById('study-mode-select').value;
      if (studyMode === 'dictation' && !flashcard.classList.contains('flipped')) {
        return; // space key shouldn't flip front in dictation mode
      }
      
      flashcard.classList.toggle('flipped');

      if (flashcard.classList.contains('flipped') && studyMode === 'kor-first') {
        const currentCard = studySession.words[studySession.currentIndex];
        if (currentCard) speakWord(currentCard.word);
      }
    } else if (e.code === 'ArrowLeft') {
      // Left key indicates Forgot
      evaluateCurrentWord(false);
    } else if (e.code === 'ArrowRight') {
      // Right key indicates Remembered
      evaluateCurrentWord(true);
    } else if (e.code === 'KeyV') {
      // Speak audio hotkey
      const currentCard = studySession.words[studySession.currentIndex];
      if (currentCard) speakWord(currentCard.word);
    }
  });
}

function initStudySession() {
  const filterVal = document.getElementById('study-level-filter').value;
  const lessonVal = document.getElementById('study-lesson-filter').value;
  const now = Date.now();
  
  let filtered = [];

  if (filterVal === 'due') {
    filtered = words.filter(w => !w.nextReview || w.nextReview <= now);
  } else if (filterVal === 'all') {
    filtered = [...words];
  } else {
    // Filter by specific level and optionally lesson
    if (lessonVal === 'all') {
      filtered = words.filter(w => w.level === filterVal);
    } else {
      filtered = words.filter(w => w.level === filterVal && w.lesson === lessonVal);
    }
  }

  // Ensure sorted index by ID
  filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  
  // Apply segment slicing
  const segmentVal = document.getElementById('study-segment-filter').value;
  if (segmentVal !== 'all') {
    const segNum = parseInt(segmentVal, 10);
    if (!isNaN(segNum) && segNum > 0) {
      filtered = filtered.slice((segNum - 1) * 20, segNum * 20);
    }
  }

  // Shuffle flashcard deck configuration
  studySession.words = filtered.sort(() => Math.random() - 0.5);
  studySession.currentIndex = 0;

  // Visual interface setup
  const emptyState = document.getElementById('study-empty-state');
  const cardArea = document.getElementById('flashcard-area');
  const introState = document.getElementById('study-intro-state');
  const flashcard = document.getElementById('flashcard');

  flashcard.classList.remove('flipped');

  if (studySession.words.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (cardArea) cardArea.style.display = 'none';
    if (introState) introState.style.display = 'none';
    updateStudyProgress(0, 0);
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (cardArea) cardArea.style.display = 'none'; // 시작 버튼 누르기 전까지 가림
    if (introState) introState.style.display = 'block'; // 시작 인트로 카드 보임

    // Populate scope label
    const scopeEl = document.getElementById('study-intro-scope');
    if (scopeEl) {
      if (filterVal === 'due') {
        scopeEl.textContent = '오늘 복습할 단어만';
      } else if (filterVal === 'all') {
        scopeEl.textContent = '전체 보관 단어';
      } else {
        scopeEl.textContent = lessonVal === 'all' ? `${filterVal} (전체 레슨)` : `${filterVal} — ${lessonVal}`;
      }
    }

    // Populate count label
    const countEl = document.getElementById('study-intro-count');
    if (countEl) {
      countEl.textContent = `${studySession.words.length}개`;
    }

    updateStudyProgress(0, studySession.words.length);
  }
}

function startActiveStudySession() {
  const introState = document.getElementById('study-intro-state');
  const cardArea = document.getElementById('flashcard-area');
  const emptyState = document.getElementById('study-empty-state');
  
  if (emptyState) emptyState.style.display = 'none';
  if (introState) introState.style.display = 'none';
  if (cardArea) cardArea.style.display = 'flex';
  
  renderActiveFlashcard();
}

function renderActiveFlashcard() {
  const card = studySession.words[studySession.currentIndex];
  if (!card) return;

  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('flipped');

  // Fill word levels / boxes values
  const levelText = card.lesson ? `${card.level} — ${card.lesson}`.toUpperCase() : card.level.toUpperCase();
  const boxText = `Box ${card.box}`;

  const studyMode = document.getElementById('study-mode-select').value;
  const wordFrontEl = document.getElementById('card-front-word');
  const speakBtnFront = document.getElementById('card-speak-btn');
  const hintFrontEl = document.querySelector('.card-front .card-hint');

  const dictationContainer = document.getElementById('card-front-dictation-container');
  const dictationInput = document.getElementById('card-dictation-input');
  const feedbackEl = document.getElementById('card-back-dictation-feedback');

  // Front elements
  document.getElementById('card-front-level').textContent = levelText;
  document.getElementById('card-front-box').textContent = boxText;

  if (studyMode === 'dictation') {
    wordFrontEl.style.display = 'none';
    if (speakBtnFront) speakBtnFront.style.display = 'none';
    if (hintFrontEl) hintFrontEl.style.display = 'none';
    if (dictationContainer) {
      dictationContainer.style.display = 'block';
      if (dictationInput) {
        dictationInput.value = '';
        setTimeout(() => dictationInput.focus(), 150);
      }
    }
    if (feedbackEl) feedbackEl.style.display = 'none';
    
    // Auto pronounce
    setTimeout(() => {
      speakWord(card.word);
    }, 150);
  } else {
    wordFrontEl.style.display = 'block';
    if (hintFrontEl) hintFrontEl.style.display = 'block';
    if (dictationContainer) dictationContainer.style.display = 'none';
    if (feedbackEl) feedbackEl.style.display = 'none';

    if (studyMode === 'kor-first') {
      // 한글뜻 먼저 보기 모드: 앞면에 영어 대신 한글 뜻 노출
      wordFrontEl.textContent = `[${card.pos}] ${card.definition}`;
      wordFrontEl.style.fontSize = '32px'; // 긴 뜻이 들어갈 수 있으므로 폰트 크기 줄임
      if (speakBtnFront) speakBtnFront.style.display = 'none'; // 앞면 발음 스포일러 방지
      if (hintFrontEl) hintFrontEl.textContent = '카드를 탭하거나 스페이스바를 눌러 영어 단어를 확인하세요.';
    } else {
      // 영어단어 먼저 보기 모드: 앞면에 영어 단어 노출
      wordFrontEl.textContent = card.word;
      wordFrontEl.style.fontSize = '54px';
      if (speakBtnFront) speakBtnFront.style.display = 'flex';
      if (hintFrontEl) hintFrontEl.textContent = '카드를 탭하거나 스페이스바를 눌러 뜻을 확인하세요.';
      
      // Auto pronounce word on card flip load ONLY if we see the English word first (eng-first)
      setTimeout(() => {
        speakWord(card.word);
      }, 100);
    }
  }

  // Back elements
  document.getElementById('card-back-level').textContent = levelText;
  document.getElementById('card-back-box').textContent = boxText;
  document.getElementById('card-back-word').textContent = card.word;
  document.getElementById('card-back-pos').textContent = card.pos;
  document.getElementById('card-back-meaning').textContent = card.definition;
  document.getElementById('card-back-example').textContent = card.example ? `"${card.example}"` : "";
  document.getElementById('card-back-example-translation').textContent = card.exampleTranslation ? `"${card.exampleTranslation}"` : "";

  updateStudyProgress(studySession.currentIndex + 1, studySession.words.length);
}

function submitDictation() {
  const currentCard = studySession.words[studySession.currentIndex];
  if (!currentCard) return;

  const inputEl = document.getElementById('card-dictation-input');
  const userText = inputEl.value.trim().toLowerCase();
  const correctText = currentCard.word.trim().toLowerCase();

  const feedbackEl = document.getElementById('card-back-dictation-feedback');
  feedbackEl.style.display = 'block';

  if (userText === correctText) {
    feedbackEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="check-circle" style="width:16px; height:16px;"></i> 정답입니다! 🎉</span> <span style="font-weight:normal; margin-left:8px; opacity:0.8;">(입력: ${inputEl.value})</span>`;
    feedbackEl.style.background = 'rgba(16, 185, 129, 0.15)';
    feedbackEl.style.color = '#10b981';
    feedbackEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
  } else {
    feedbackEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="x-circle" style="width:16px; height:16px;"></i> 오답입니다! ❌</span> <span style="font-weight:normal; margin-left:8px; opacity:0.8;">(입력: ${inputEl.value ? inputEl.value : '없음'} / 정답: ${currentCard.word})</span>`;
    feedbackEl.style.background = 'rgba(239, 68, 68, 0.15)';
    feedbackEl.style.color = '#ef4444';
    feedbackEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }

  // Flip the card
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.add('flipped');

  // Re-create Lucide icons inside the feedback
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Speak word
  speakWord(currentCard.word);
}

function updateStudyProgress(current, total) {
  const progressText = document.getElementById('study-progress-text');
  const progressFill = document.getElementById('study-progress-fill');

  progressText.textContent = `${current} / ${total} 단어`;
  const percentage = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = `${percentage}%`;
}

function evaluateCurrentWord(remembered) {
  const sessionWords = studySession.words;
  const index = studySession.currentIndex;
  if (sessionWords.length === 0 || index >= sessionWords.length) return;

  const currentCard = sessionWords[index];
  
  // Find item in the core global state array
  const targetWord = words.find(w => w.id === currentCard.id);
  
  if (targetWord) {
    if (remembered) {
      // Elevate word Box status
      const oldBox = targetWord.box || 1;
      const newBox = Math.min(oldBox + 1, 5);
      targetWord.box = newBox;
      targetWord.nextReview = Date.now() + LEITNER_INTERVALS[newBox];
      
      // If correct, remove from incorrect list
      removeIncorrectWord(targetWord.id);
    } else {
      // Demote back to Box 1
      targetWord.box = 1;
      targetWord.nextReview = Date.now() + LEITNER_INTERVALS[1];
      
      // If forgotten, add to incorrect list
      addIncorrectWord(targetWord.id);
    }
    
    // Mark as completed today
    markWordCompletedToday(targetWord.id);
    
    saveData();
    incrementStreak();

    // Check if 100% due words are completed today and fire confetti
    const now = Date.now();
    const remainingDue = words.filter(w => !w.nextReview || w.nextReview <= now).length;
    const completedToday = completedTodayWordIds.length;
    const totalDue = remainingDue + completedToday;
    if (totalDue > 0 && remainingDue === 0 && completedToday > 0) {
      const lastConfetti = localStorage.getItem('lingopop_last_confetti_date');
      const todayStr = new Date().toDateString();
      if (lastConfetti !== todayStr) {
        localStorage.setItem('lingopop_last_confetti_date', todayStr);
        if (window.confetti) {
          window.confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    }
  }

  // Slide to next card
  studySession.currentIndex++;

  if (studySession.currentIndex >= studySession.words.length) {
    // Finished current set
    setTimeout(() => {
      document.getElementById('study-empty-state').style.display = 'block';
      document.getElementById('flashcard-area').style.display = 'none';
      updateStudyProgress(studySession.words.length, studySession.words.length);
      updateSegmentNavButtons();
    }, 200);
  } else {
    // Reset flip layout, pause briefly for visual smoothness, then render
    const flashcard = document.getElementById('flashcard');
    const wasFlipped = flashcard.classList.contains('flipped');
    
    if (wasFlipped) {
      flashcard.classList.remove('flipped');
      setTimeout(() => {
        renderActiveFlashcard();
      }, 300); // Wait for turn-back animation to finish
    } else {
      renderActiveFlashcard();
    }
  }
}

function updateSegmentNavButtons() {
  const segSelect = document.getElementById('study-segment-filter');
  const replaySegBtn = document.getElementById('study-replay-segment-btn');
  const nextSegBtn = document.getElementById('study-next-segment-btn');
  const emptyTitle = document.getElementById('study-empty-title');
  const emptyDesc = document.getElementById('study-empty-desc');

  if (!segSelect) return;

  const currentVal = segSelect.value;
  if (currentVal !== 'all') {
    const currentNum = parseInt(currentVal, 10);
    const nextNum = currentNum + 1;
    const nextOption = segSelect.querySelector(`option[value="${nextNum}"]`);

    let hasNav = false;

    if (replaySegBtn) {
      replaySegBtn.style.display = 'inline-flex';
      replaySegBtn.innerHTML = `<i data-lucide="rotate-cw"></i> ${currentNum}구간 한 번 더`;
      hasNav = true;
    }

    if (nextOption && nextSegBtn) {
      nextSegBtn.style.display = 'inline-flex';
      nextSegBtn.innerHTML = `<i data-lucide="arrow-right-circle"></i> 다음 구간 (${nextNum}구간) 학습하기`;
      hasNav = true;
    } else if (nextSegBtn) {
      nextSegBtn.style.display = 'none';
    }

    if (hasNav) {
      if (emptyTitle) emptyTitle.textContent = `${currentNum}구간 단어 학습을 완료했습니다! 🎉`;
      if (emptyDesc) emptyDesc.textContent = `현재 구간을 한 번 더 복습하거나 다음 구간 단어를 이어서 학습해보세요.`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
  }

  if (replaySegBtn) replaySegBtn.style.display = 'none';
  if (nextSegBtn) nextSegBtn.style.display = 'none';
  if (emptyTitle) emptyTitle.textContent = '오늘 공부할 단어를 모두 완료했습니다!';
  if (emptyDesc) emptyDesc.textContent = '새 단어를 추가하거나, 학습 범위 필터를 전체 단어 혹은 수준별 단어로 설정해 추가 학습해보세요.';
}

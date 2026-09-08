/**
 * LingoPop - Quiz Tab Logic
 */

function setupQuiz() {
  document.getElementById('quiz-start-btn').addEventListener('click', startQuiz);
  
  const levelSelect = document.getElementById('quiz-level-select');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      updateLessonFilters('quiz');
    });
  }

  const lessonSelect = document.getElementById('quiz-lesson-select');
  if (lessonSelect) {
    lessonSelect.addEventListener('change', () => {
      updateSegmentFiltersVisibility('quiz');
    });
  }

  document.getElementById('quiz-speak-btn').addEventListener('click', () => {
    const q = quizSession.questions[quizSession.currentIndex];
    if (q) {
      if (quizSession.mode === 'collocation' && q.rawItem.example) {
        speakWord(q.rawItem.example);
      } else {
        speakWord(q.word);
      }
    }
  });

  // Action result handlers
  document.getElementById('quiz-retry-btn').addEventListener('click', () => {
    document.getElementById('quiz-result-container').style.display = 'none';
    document.getElementById('quiz-setup-container').style.display = 'block';
  });

  document.getElementById('quiz-go-study-btn').addEventListener('click', () => {
    // Set level filter to "due" and load Study
    document.getElementById('study-level-filter').value = 'all';
    updateLessonFilters('study');
    document.getElementById('study-lesson-filter').value = 'all';
    document.getElementById('nav-study-btn').click();
    document.getElementById('quiz-result-container').style.display = 'none';
    document.getElementById('quiz-setup-container').style.display = 'block';
  });

  document.getElementById('spelling-submit-btn').addEventListener('click', checkSpellingAnswer);
  document.getElementById('spelling-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkSpellingAnswer();
    }
  });

  document.getElementById('quiz-next-btn').addEventListener('click', loadNextQuestion);

  // Keyboard shortcut listener for quiz (1-4 for choices, Enter/Space for next)
  window.addEventListener('keydown', (e) => {
    const playContainer = document.getElementById('quiz-play-container');
    if (!playContainer || playContainer.style.display !== 'block') return;

    // If typing in spelling mode, don't trigger number hotkeys
    if (document.activeElement && document.activeElement.id === 'spelling-input') {
      return;
    }

    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn && nextBtn.style.display !== 'none' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      loadNextQuestion();
      return;
    }

    if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = parseInt(e.key) - 1;
      const buttons = document.querySelectorAll('.quiz-opt-btn');
      if (buttons && buttons[idx] && !buttons[idx].disabled) {
        e.preventDefault();
        buttons[idx].click();
      }
    }
  });
}

function resetQuizState() {
  if (quizSession.autoAdvanceTimeout) {
    clearTimeout(quizSession.autoAdvanceTimeout);
    quizSession.autoAdvanceTimeout = null;
  }
  clearInterval(quizSession.timerInterval);
  document.getElementById('quiz-play-container').style.display = 'none';
  document.getElementById('quiz-result-container').style.display = 'none';
  document.getElementById('quiz-setup-container').style.display = 'block';
  
  const quizSeg = document.getElementById('quiz-segment-select');
  if (quizSeg) quizSeg.value = 'all';
  updateSegmentFiltersVisibility('quiz');
}

function startQuiz() {
  const mode = document.getElementById('quiz-mode-select').value;
  const level = document.getElementById('quiz-level-select').value;
  const lesson = document.getElementById('quiz-lesson-select').value;
  const count = parseInt(document.getElementById('quiz-count-select').value);

  // Filter pool
  let pool = [...words];
  if (level !== 'all') {
    pool = pool.filter(w => w.level === level);
  }
  if (lesson !== 'all') {
    pool = pool.filter(w => w.lesson === lesson);
  }

  // Ensure sorted index by ID
  pool.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  
  const segmentVal = document.getElementById('quiz-segment-select').value;
  if (segmentVal === '1') {
    pool = pool.slice(0, 20);
  } else if (segmentVal === '2') {
    pool = pool.slice(20, 40);
  }

  if (pool.length < 4 && (mode === 'choice' || mode === 'collocation')) {
    alert("퀴즈를 실행할 단어가 충분하지 않습니다. (최소 4개 이상 필요)\n새 단어를 추가하시거나 레벨 설정을 넓혀보세요.");
    return;
  }
  if (pool.length < 1 && mode === 'spelling') {
    alert("퀴즈를 실행할 단어가 존재하지 않습니다.");
    return;
  }

  // Random selection
  const selected = pool.sort(() => Math.random() - 0.5).slice(0, count);

  // Build structure of questions
  quizSession.mode = mode;
  quizSession.questions = selected.map(wordItem => {
    let options = [];
    if (mode === 'choice') {
      options.push(wordItem.definition);
      
      const distractors = words
        .filter(w => w.id !== wordItem.id)
        .map(w => w.definition);
      
      // Shuffle distractors and pick 3 unique definitions
      const uniqueDistractors = [...new Set(distractors)].sort(() => Math.random() - 0.5);
      
      let countAdded = 0;
      for (let i = 0; i < uniqueDistractors.length && countAdded < 3; i++) {
        if (uniqueDistractors[i] !== wordItem.definition) {
          options.push(uniqueDistractors[i]);
          countAdded++;
        }
      }
      
      // Pad with dummy defaults if we don't have enough definitions
      while (options.length < 4) {
        options.push("임의의 뜻 단어 " + options.length);
      }

      // Shuffle complete choices options
      options = options.sort(() => Math.random() - 0.5);
    } else if (mode === 'collocation') {
      options.push(wordItem.word);

      // Prefer same POS distractors if available, otherwise any other word
      const samePos = words.filter(w => w.id !== wordItem.id && w.pos === wordItem.pos).map(w => w.word);
      const otherPos = words.filter(w => w.id !== wordItem.id && w.pos !== wordItem.pos).map(w => w.word);
      const candidateDistractors = [...new Set([...samePos.sort(() => Math.random() - 0.5), ...otherPos.sort(() => Math.random() - 0.5)])];

      let countAdded = 0;
      for (let i = 0; i < candidateDistractors.length && countAdded < 3; i++) {
        if (candidateDistractors[i].toLowerCase() !== wordItem.word.toLowerCase()) {
          options.push(candidateDistractors[i]);
          countAdded++;
        }
      }
      while (options.length < 4) {
        options.push("단어 " + (options.length + 1));
      }
      options = options.sort(() => Math.random() - 0.5);
    }

    return {
      word: wordItem.word,
      correctAnswer: mode === 'choice' ? wordItem.definition : wordItem.word,
      options: options,
      level: wordItem.level,
      rawItem: wordItem
    };
  });

  quizSession.currentIndex = 0;
  quizSession.score = 0;
  quizSession.wrongWords = [];
  quizSession.startTime = Date.now();
  quizSession.attemptsForQuestion = 0;
  if (quizSession.autoAdvanceTimeout) {
    clearTimeout(quizSession.autoAdvanceTimeout);
    quizSession.autoAdvanceTimeout = null;
  }

  // Show active display card
  document.getElementById('quiz-setup-container').style.display = 'none';
  document.getElementById('quiz-play-container').style.display = 'block';
  document.getElementById('quiz-result-container').style.display = 'none';

  // Timer Initialization
  clearInterval(quizSession.timerInterval);
  quizSession.timer = 0;
  document.getElementById('quiz-timer-text').textContent = '00:00';
  quizSession.timerInterval = setInterval(() => {
    quizSession.timer++;
    const min = String(Math.floor(quizSession.timer / 60)).padStart(2, '0');
    const sec = String(quizSession.timer % 60).padStart(2, '0');
    document.getElementById('quiz-timer-text').textContent = `${min}:${sec}`;
  }, 1000);

  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (quizSession.autoAdvanceTimeout) {
    clearTimeout(quizSession.autoAdvanceTimeout);
    quizSession.autoAdvanceTimeout = null;
  }
  quizSession.attemptsForQuestion = 0;

  const currentIdx = quizSession.currentIndex;
  const totalQuestions = quizSession.questions.length;
  const q = quizSession.questions[currentIdx];

  // Progress UI
  document.getElementById('quiz-current-num').textContent = currentIdx + 1;
  document.getElementById('quiz-total-num').textContent = totalQuestions;
  
  const progressPct = ((currentIdx) / totalQuestions) * 100;
  document.getElementById('quiz-play-progress-fill').style.width = `${progressPct}%`;

  // Clear previous choices and feedback details
  document.getElementById('quiz-options-container').innerHTML = '';
  document.getElementById('quiz-spelling-container').style.display = 'none';
  document.getElementById('quiz-feedback-banner').style.display = 'none';
  document.getElementById('quiz-next-btn').style.display = 'none';
  
  // Reset spelling input
  const spellingInput = document.getElementById('spelling-input');
  spellingInput.value = '';
  spellingInput.disabled = false;
  document.getElementById('spelling-submit-btn').disabled = false;

  // Level Badge
  const levelBadge = document.getElementById('quiz-question-level');
  levelBadge.textContent = q.rawItem.lesson ? `${q.level} — ${q.rawItem.lesson}`.toUpperCase() : q.level.toUpperCase();

  // Set prompt directions
  const questionWord = document.getElementById('quiz-question-word');
  const questionHintText = document.getElementById('quiz-question-hint');

  if (quizSession.mode === 'choice') {
    // Show word, choose translation
    questionWord.style.visibility = 'visible';
    questionWord.textContent = q.word;
    questionHintText.innerHTML = "이 단어의 알맞은 한글 뜻을 선택하세요.";
    
    document.getElementById('quiz-options-container').style.display = 'grid';
    
    // Distribute multiple choice answer cards
    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span class="opt-num-badge">${idx + 1}</span> <span class="opt-text">${optText}</span>`;
      btn.addEventListener('click', () => selectChoiceOption(btn, optText));
      document.getElementById('quiz-options-container').appendChild(btn);
    });

    speakWord(q.word);
  } else if (quizSession.mode === 'collocation') {
    // Collocation Cloze mode: display blanked phrase
    questionWord.style.visibility = 'visible';
    
    // Build cloze HTML with styled blank
    let clozeText = q.rawItem.cloze;
    if (!clozeText && q.rawItem.example) {
      clozeText = q.rawItem.example.replace(new RegExp('\\b' + escapeRegExp(q.word) + '\\b', 'gi'), '_______');
    }
    if (!clozeText) clozeText = '_______';
    
    questionWord.innerHTML = clozeText.replace('_______', `<span class="quiz-blank-highlight pulse" id="active-quiz-blank">_______</span>`);
    
    // Hint text with POS, <<Korean>>, and Korean sentence translation
    let hintHtml = `<span class="pos-tag">[${q.rawItem.pos}]</span> <strong>&lt;&lt;${q.rawItem.definition}&gt;&gt;</strong>`;
    if (q.rawItem.exampleTranslation) {
      hintHtml += ` &bull; <span class="trans-sub">"${q.rawItem.exampleTranslation}"</span>`;
    }
    if (q.rawItem.synonym) {
      hintHtml += ` &bull; <span class="syn-sub">유의어: ${q.rawItem.synonym}</span>`;
    }
    questionHintText.innerHTML = hintHtml;

    document.getElementById('quiz-options-container').style.display = 'grid';

    // 4 English word options
    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn quiz-opt-collocation';
      btn.innerHTML = `<span class="opt-num-badge">${idx + 1}</span> <span class="opt-text">${optText}</span>`;
      btn.addEventListener('click', () => selectChoiceOption(btn, optText));
      document.getElementById('quiz-options-container').appendChild(btn);
    });

  } else {
    // Spelling input mode: hide spelling word, show translation, listen sound
    questionWord.style.visibility = 'hidden';
    questionWord.textContent = '???';
    questionHintText.textContent = "원어민 발음을 듣고 스펠링을 입력하세요.";
    
    document.getElementById('quiz-options-container').style.display = 'none';
    document.getElementById('quiz-spelling-container').style.display = 'block';
    document.getElementById('spelling-meaning-prompt').textContent = `뜻: ${q.rawItem.definition} (${q.rawItem.pos})`;
    
    // Focus spelling box automatically
    setTimeout(() => spellingInput.focus(), 100);
    speakWord(q.word);
  }
}

function selectChoiceOption(selectedBtn, selectedText) {
  const q = quizSession.questions[quizSession.currentIndex];
  const optionButtons = document.querySelectorAll('.quiz-opt-btn');

  quizSession.attemptsForQuestion = (quizSession.attemptsForQuestion || 0) + 1;
  const isCorrect = (selectedText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());

  if (isCorrect) {
    // --- 정답 처리 ---
    // 모든 버튼 비활성화 (추가 클릭 방지)
    optionButtons.forEach(btn => btn.disabled = true);
    selectedBtn.classList.add('correct');
    quizSession.score++;

    if (quizSession.mode === 'collocation') {
      const blank = document.getElementById('active-quiz-blank');
      if (blank) {
        blank.classList.remove('pulse', 'shake');
        blank.classList.add('correct');
        blank.textContent = selectedText;
      }
      // 예문 전체 발음 재생
      if (q.rawItem.example) {
        speakWord(q.rawItem.example);
      }
      
      const praise = quizSession.attemptsForQuestion === 1 ? "정답입니다! 🎉" : "정답입니다! (2차 시도 성공 👏)";
      showQuizFeedback(true, praise, q.rawItem.example ? `"${q.rawItem.example}"` : "완벽해요!");
      document.getElementById('quiz-next-btn').style.display = 'inline-flex';

    } else {
      // 일반 객관식 모드
      const praise = quizSession.attemptsForQuestion === 1 ? "정답입니다!" : "정답입니다! (재시도 성공)";
      showQuizFeedback(true, praise, "완벽해요, 계속 나아갑시다!");
      document.getElementById('quiz-next-btn').style.display = 'inline-flex';
    }

  } else {
    // --- 오답 처리 ---
    selectedBtn.classList.add('incorrect');
    selectedBtn.disabled = true; // 오답 선택한 버튼만 비활성화

    if (quizSession.attemptsForQuestion < 2) {
      // 1번째 오답: 2번까지 기회를 제공!
      if (quizSession.mode === 'collocation') {
        const blank = document.getElementById('active-quiz-blank');
        if (blank) {
          blank.classList.add('shake');
          setTimeout(() => blank.classList.remove('shake'), 450);
        }
      }
      showQuizFeedback(false, "아쉬워요! 한 번 더 기회가 있어요 (1회 남음)", "다른 보기를 다시 골라보세요! 💡");

    } else {
      // 2번째 오답: 기회 모두 소진, 정답 공개 및 오답 처리
      optionButtons.forEach(btn => btn.disabled = true);
      quizSession.wrongWords.push(q.rawItem);
      addIncorrectWord(q.rawItem.id);

      // 정답 버튼 초록색 강조
      optionButtons.forEach(btn => {
        const textSpan = btn.querySelector('.opt-text') || btn.querySelector('span');
        if (textSpan && textSpan.textContent.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          btn.classList.add('correct');
        }
      });

      if (quizSession.mode === 'collocation') {
        const blank = document.getElementById('active-quiz-blank');
        if (blank) {
          blank.innerHTML = `<span class="user-wrong-answer">${selectedText}</span> <span class="arrow">&rarr;</span> <span class="correct-answer">${q.correctAnswer}</span>`;
          blank.classList.add('incorrect');
        }
        showQuizFeedback(false, "기회 소진", `정답은 "${q.correctAnswer}" 입니다. (${q.rawItem.example || ''})`);
        document.getElementById('quiz-next-btn').style.display = 'inline-flex';

      } else {
        showQuizFeedback(false, "기회 소진", `정답은 "${q.correctAnswer}" 입니다.`);
        document.getElementById('quiz-next-btn').style.display = 'inline-flex';
      }
    }
  }
}

function checkSpellingAnswer() {
  const userInput = document.getElementById('spelling-input').value.trim().toLowerCase();
  if (!userInput) return;

  const q = quizSession.questions[quizSession.currentIndex];
  const isCorrect = (userInput === q.word.toLowerCase());

  document.getElementById('spelling-input').disabled = true;
  document.getElementById('spelling-submit-btn').disabled = true;

  // Reveal correct answer spelling
  const questionWord = document.getElementById('quiz-question-word');
  questionWord.textContent = q.word;
  questionWord.style.visibility = 'visible';

  if (isCorrect) {
    quizSession.score++;
    showQuizFeedback(true, "정답입니다!", "정확한 철자입니다!");
    document.getElementById('quiz-next-btn').style.display = 'inline-flex';
  } else {
    quizSession.wrongWords.push(q.rawItem);
    addIncorrectWord(q.rawItem.id);
    showQuizFeedback(false, "오답입니다", `정답은 "${q.word}" 입니다.`);
    document.getElementById('quiz-next-btn').style.display = 'inline-flex';
  }
}

function showQuizFeedback(correct, title, desc) {
  const banner = document.getElementById('quiz-feedback-banner');
  const iconBox = document.getElementById('feedback-icon-box');
  
  iconBox.className = 'feedback-icon-box ' + (correct ? 'correct' : 'incorrect');
  iconBox.innerHTML = correct ? '<i data-lucide="check"></i>' : '<i data-lucide="x"></i>';
  
  document.getElementById('feedback-title').textContent = title;
  document.getElementById('feedback-desc').textContent = desc;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  banner.style.display = 'flex';
}

function loadNextQuestion() {
  if (quizSession.autoAdvanceTimeout) {
    clearTimeout(quizSession.autoAdvanceTimeout);
    quizSession.autoAdvanceTimeout = null;
  }

  quizSession.currentIndex++;

  if (quizSession.currentIndex >= quizSession.questions.length) {
    finishQuiz();
  } else {
    renderQuizQuestion();
  }
}

function finishQuiz() {
  clearInterval(quizSession.timerInterval);
  
  const playContainer = document.getElementById('quiz-play-container');
  const resultContainer = document.getElementById('quiz-result-container');

  playContainer.style.display = 'none';
  resultContainer.style.display = 'block';

  // Render score calculations
  const total = quizSession.questions.length;
  const score = quizSession.score;
  const pct = Math.round((score / total) * 100);

  document.getElementById('result-score').textContent = `${score} / ${total}`;
  document.getElementById('result-accuracy').textContent = `${pct}%`;

  // Render quiz session elapsed time
  const min = Math.floor(quizSession.timer / 60);
  const sec = quizSession.timer % 60;
  document.getElementById('result-time').textContent = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;

  // Render incorrect words list for review
  const wrongSection = document.getElementById('result-wrong-section');
  const wrongContainer = document.getElementById('result-wrong-words-container');
  wrongContainer.innerHTML = '';

  if (quizSession.wrongWords.length > 0) {
    wrongSection.style.display = 'block';
    
    // Deduplicate wrong words list
    const uniqueWrongs = Array.from(new Set(quizSession.wrongWords.map(w => w.id)))
      .map(id => quizSession.wrongWords.find(w => w.id === id));

    uniqueWrongs.forEach(item => {
      const div = document.createElement('div');
      div.className = 'wrong-word-item';
      div.innerHTML = `
        <span class="word">${item.word}</span>
        <span class="meaning">${item.definition}</span>
      `;
      wrongContainer.appendChild(div);
    });
  } else {
    wrongSection.style.display = 'none';
  }
}

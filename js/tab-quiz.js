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
    if (q) speakWord(q.word);
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
}

function resetQuizState() {
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
    if (lesson === 'all') {
      pool = pool.filter(w => w.level === level);
    } else {
      pool = pool.filter(w => w.level === level && w.lesson === lesson);
      // Ensure sorted index by ID
      pool.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      
      const segmentVal = document.getElementById('quiz-segment-select').value;
      if (segmentVal === '1') {
        pool = pool.slice(0, 20);
      } else if (segmentVal === '2') {
        pool = pool.slice(20, 40);
      } else if (segmentVal === '3') {
        pool = pool.slice(40, 60);
      }
    }
  }

  if (pool.length < 4 && mode === 'choice') {
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
    // Generate distractors if multiple choice mode
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
    questionHintText.textContent = "이 단어의 알맞은 한글 뜻을 선택하세요.";
    
    document.getElementById('quiz-options-container').style.display = 'grid';
    
    // Distribute multiple choice answer cards
    q.options.forEach((optText) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span>${optText}</span>`;
      btn.addEventListener('click', () => selectChoiceOption(btn, optText));
      document.getElementById('quiz-options-container').appendChild(btn);
    });

    speakWord(q.word);
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

  // Disable further choice clicks
  optionButtons.forEach(btn => btn.disabled = true);

  const isCorrect = (selectedText === q.correctAnswer);
  
  if (isCorrect) {
    quizSession.score++;
    selectedBtn.classList.add('correct');
    showQuizFeedback(true, "정답입니다!", "완벽해요, 계속 나아갑시다!");
  } else {
    selectedBtn.classList.add('incorrect');
    quizSession.wrongWords.push(q.rawItem);

    // Show correct option button glow
    optionButtons.forEach(btn => {
      if (btn.querySelector('span').textContent === q.correctAnswer) {
        btn.classList.add('correct');
      }
    });
    showQuizFeedback(false, "오답입니다", `정답은 "${q.correctAnswer}" 입니다.`);
  }

  document.getElementById('quiz-next-btn').style.display = 'inline-flex';
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
  } else {
    quizSession.wrongWords.push(q.rawItem);
    showQuizFeedback(false, "오답입니다", `정답은 "${q.word}" 입니다.`);
  }

  document.getElementById('quiz-next-btn').style.display = 'inline-flex';
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

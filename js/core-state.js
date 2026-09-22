/**
 * LingoPop - Core State & Navigation Management
 */

// --- State Configurations ---
const DB_VERSION = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : "2026.09.23.2";
let words = [];
let streak = 0;
let lastStudyDate = null;
let currentUser = null;
let incorrectWordIds = [];
let completedTodayWordIds = [];

// Study session state
let studySession = {
  words: [],
  currentIndex: 0
};

// Quiz session state
let quizSession = {
  words: [],
  currentIndex: 0,
  score: 0,
  mode: 'choice', // 'choice' or 'spelling'
  timer: 0,
  timerInterval: null,
  wrongWords: []
};

// Dictation session state
let dictationSession = {
  words: [],
  currentIndex: 0,
  prompts: [], // array of { word: wordObj, type: 'eng' | 'kor', promptText: string }
  mode: 'kor-only' // 'kor-only', 'eng-only', 'mixed'
};

// Leitner Box Intervals (in milliseconds)
const LEITNER_INTERVALS = {
  1: 24 * 60 * 60 * 1000,      // Box 1: 1 Day
  2: 2 * 24 * 60 * 60 * 1000,  // Box 2: 2 Days
  3: 4 * 24 * 60 * 60 * 1000,  // Box 3: 4 Days
  4: 7 * 24 * 60 * 60 * 1000,  // Box 4: 7 Days
  5: 14 * 24 * 60 * 60 * 1000  // Box 5: 14 Days (Mastered)
};

// --- Initializing Application ---
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupNavigation();
  setupDashboard();
  setupStudy();
  setupQuiz();
  setupDictation();
  setupManage();
  setupModals();
  updateStreakDisplay();
  setupEnvironmentBadge();
  
  // Create initial Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

function setupEnvironmentBadge() {
  const verBadge = document.getElementById('app-version-badge');
  if (verBadge) {
    verBadge.textContent = 'v' + DB_VERSION;
  }
  const envBadge = document.getElementById('env-badge');
  if (envBadge) {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';
    if (isLocal) {
      envBadge.textContent = 'LOCAL';
      envBadge.style.display = 'inline-block';
      envBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      envBadge.style.color = '#f59e0b';
      envBadge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
    } else {
      envBadge.textContent = 'LIVE';
      envBadge.style.display = 'inline-block';
      envBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      envBadge.style.color = '#10b981';
      envBadge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    }
  }
}

// --- LocalStorage & Data Management ---
function loadData() {
  const currentDbVersion = localStorage.getItem('lingopop_db_version');
  const storedWords = localStorage.getItem('lingopop_words');
  
  if (currentDbVersion !== DB_VERSION || !storedWords) {
    console.log("새로운 데이터베이스 버전 감지: 데이터를 최신 상태로 초기화합니다.");
    words = JSON.parse(JSON.stringify(window.defaultWords)); // deep copy
    saveData();
    localStorage.setItem('lingopop_db_version', DB_VERSION);
  } else {
    try {
      words = JSON.parse(storedWords);
      // Migration: 만약 b1 혹은 레슨 분리 데이터 스키마가 없는 기존 데이터가 감지되면 새 단어 목록으로 마이그레이션
      const hasOldWords = words.some(w => w.id === 'b1' || !w.hasOwnProperty('lesson'));
      if (hasOldWords) {
        console.log("레벨/레슨이 분리된 최신 단어 스키마가 감지되지 않아 데이터 마이그레이션을 실행합니다.");
        words = [...window.defaultWords];
        saveData();
      } else {
        // Sync: default-words.js와 로컬스토리지를 정확하게 동기화 (새로운 단어 추가 + 빠진 단어 제거)
        let isSynced = false;
        
        // 1. 없는 단어 추가
        window.defaultWords.forEach(defaultWord => {
          const exists = words.some(w => w.id === defaultWord.id);
          if (!exists) {
            words.push({ ...defaultWord });
            isSynced = true;
          }
        });
        
        // 2. defaultWords에 없는 기존 단어 제거 (레슨 8만 남기기)
        const initialCount = words.length;
        words = words.filter(w => window.defaultWords.some(dw => dw.id === w.id));
        if (words.length !== initialCount) {
          isSynced = true;
        }

        if (isSynced) {
          console.log("기본 단어 목록 동기화 수행 완료");
          saveData();
        }
      }
    } catch (e) {
      console.error("Failed to parse stored words, resetting...", e);
      words = [...window.defaultWords];
      saveData();
    }
  }

  // Load streak details
  streak = parseInt(localStorage.getItem('lingopop_streak')) || 0;
  lastStudyDate = localStorage.getItem('lingopop_last_study_date') || null;

  // Load incorrect words
  try {
    incorrectWordIds = JSON.parse(localStorage.getItem('lingopop_incorrect_words')) || [];
  } catch (e) {
    incorrectWordIds = [];
  }

  // Load completed today list
  const todayStr = new Date().toDateString();
  const lastCompletedDate = localStorage.getItem('lingopop_completed_date');
  if (lastCompletedDate === todayStr) {
    try {
      completedTodayWordIds = JSON.parse(localStorage.getItem('lingopop_completed_today')) || [];
    } catch (e) {
      completedTodayWordIds = [];
    }
  } else {
    completedTodayWordIds = [];
    localStorage.setItem('lingopop_completed_date', todayStr);
    localStorage.setItem('lingopop_completed_today', JSON.stringify([]));
  }

  // Initialize level and lesson filter dropdown values
  updateLevelFilters();
}

function saveData() {
  localStorage.setItem('lingopop_words', JSON.stringify(words));
  localStorage.setItem('lingopop_incorrect_words', JSON.stringify(incorrectWordIds));
  localStorage.setItem('lingopop_completed_today', JSON.stringify(completedTodayWordIds));
  updateDashboardStats();
  updateLevelFilters();
}

function addIncorrectWord(id) {
  if (!incorrectWordIds.includes(id)) {
    incorrectWordIds.push(id);
    saveData();
  }
}

function removeIncorrectWord(id) {
  const index = incorrectWordIds.indexOf(id);
  if (index > -1) {
    incorrectWordIds.splice(index, 1);
    saveData();
  }
}

function markWordCompletedToday(id) {
  if (!completedTodayWordIds.includes(id)) {
    completedTodayWordIds.push(id);
    saveData();
  }
}

function resetDatabase() {
  if (confirm("정말 단어장을 초기화하시겠습니까?\n모든 학습 진행 상태(Box 단계)가 초기화되고 기본 단어 데이터베이스로 복구됩니다.")) {
    words = JSON.parse(JSON.stringify(window.defaultWords)); // deep copy default
    saveData();
    renderManageTable();
    updateDashboardStats();
    alert("단어장이 기본 상태로 성공적으로 초기화되었습니다.");
  }
}

function updateLevelFilters() {
  // Get all unique levels from words (natural ascending sort: Par C1, Par C2)
  const uniqueLevels = Array.from(new Set(words.map(w => w.level))).filter(Boolean).sort();
  
  // Update study filter level dropdown
  const studyFilter = document.getElementById('study-level-filter');
  if (studyFilter) {
    const studyValue = studyFilter.value;
    studyFilter.innerHTML = `
      <option value="all">전체 보관 단어</option>
    `;
    uniqueLevels.forEach(lvl => {
      studyFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    if ([...studyFilter.options].some(opt => opt.value === studyValue)) {
      studyFilter.value = studyValue;
    } else {
      studyFilter.value = 'all';
    }
  }

  // Update quiz filter level dropdown
  const quizFilter = document.getElementById('quiz-level-select');
  if (quizFilter) {
    const quizValue = quizFilter.value;
    quizFilter.innerHTML = `<option value="all">전체 레벨</option>`;
    uniqueLevels.forEach(lvl => {
      quizFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    if ([...quizFilter.options].some(opt => opt.value === quizValue)) {
      quizFilter.value = quizValue;
    } else {
      quizFilter.value = 'all';
    }
  }

  // Update manage filter level dropdown
  const manageFilter = document.getElementById('manage-level-filter');
  if (manageFilter) {
    const manageValue = manageFilter.value;
    manageFilter.innerHTML = `<option value="all">모든 레벨</option>`;
    uniqueLevels.forEach(lvl => {
      manageFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    if ([...manageFilter.options].some(opt => opt.value === manageValue)) {
      manageFilter.value = manageValue;
    } else {
      manageFilter.value = 'all';
    }
  }

  // Update dictation filter level dropdown
  const dictationFilter = document.getElementById('dictation-level-filter');
  if (dictationFilter) {
    const dictationValue = dictationFilter.value;
    dictationFilter.innerHTML = `<option value="all">전체 보관 단어</option>`;
    uniqueLevels.forEach(lvl => {
      dictationFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    if ([...dictationFilter.options].some(opt => opt.value === dictationValue)) {
      dictationFilter.value = dictationValue;
    } else {
      dictationFilter.value = 'all';
    }
  }

  // Populate dynamic lesson filters based on selected levels
  updateLessonFilters('study');
  updateLessonFilters('quiz');
  updateLessonFilters('dictation');
  updateLessonFilters('manage');
}

function getWordUnit(word) {
  if (!word || !word.lesson) return null;
  const match = word.lesson.match(/Unit\s*\d+/i);
  return match ? match[0] : null;
}

function getWordLesson(word) {
  if (!word || !word.lesson) return null;
  if (word.level === 'Par C2') {
    const match = word.lesson.match(/Lesson\s*\d+/i);
    return match ? match[0] : word.lesson;
  }
  return word.lesson;
}

function updateLessonFilters(tabType) {
  let levelVal = '';
  let unitFilterElement = null;
  let unitContainer = null;
  let lessonFilterElement = null;
  let lessonContainer = null;

  if (tabType === 'study') {
    levelVal = document.getElementById('study-level-filter').value;
    unitFilterElement = document.getElementById('study-unit-filter');
    unitContainer = document.getElementById('study-unit-filter-container');
    lessonFilterElement = document.getElementById('study-lesson-filter');
    lessonContainer = document.getElementById('study-lesson-filter-container');
  } else if (tabType === 'quiz') {
    levelVal = document.getElementById('quiz-level-select').value;
    unitFilterElement = document.getElementById('quiz-unit-select');
    unitContainer = document.getElementById('quiz-unit-select-container');
    lessonFilterElement = document.getElementById('quiz-lesson-select');
    lessonContainer = document.getElementById('quiz-lesson-select-container');
  } else if (tabType === 'dictation') {
    levelVal = document.getElementById('dictation-level-filter').value;
    unitFilterElement = document.getElementById('dictation-unit-filter');
    unitContainer = document.getElementById('dictation-unit-filter-container');
    lessonFilterElement = document.getElementById('dictation-lesson-filter');
    lessonContainer = document.getElementById('dictation-lesson-filter-container');
  } else if (tabType === 'manage') {
    levelVal = document.getElementById('manage-level-filter').value;
    unitFilterElement = document.getElementById('manage-unit-filter');
    unitContainer = null;
    lessonFilterElement = document.getElementById('manage-lesson-filter');
    lessonContainer = null;
  }

  if (!lessonFilterElement) return;

  if (levelVal === 'due' || levelVal === 'all') {
    // Hide unit and lesson dropdowns
    if (unitContainer) unitContainer.style.display = 'none';
    if (unitFilterElement && tabType === 'manage') unitFilterElement.style.display = 'none';
    if (lessonContainer) lessonContainer.style.display = 'none';
    if (tabType === 'manage' && lessonFilterElement) lessonFilterElement.style.display = 'none';
    
    updateSegmentFilters(tabType);
    return;
  }

  if (levelVal === 'Par C2') {
    // Show Unit dropdown first
    if (unitContainer) {
      unitContainer.style.display = 'flex';
    } else if (tabType === 'manage' && unitFilterElement) {
      unitFilterElement.style.display = 'inline-block';
    }

    // Populate unique units (e.g. Unit 1, Unit 2)
    const c2Words = words.filter(w => w.level === 'Par C2');
    const uniqueUnits = Array.from(new Set(c2Words.map(w => getWordUnit(w)))).filter(Boolean).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (unitFilterElement) {
      const prevUnit = unitFilterElement.value;
      unitFilterElement.innerHTML = `<option value="all">전체 유닛</option>`;
      uniqueUnits.forEach(u => {
        unitFilterElement.innerHTML += `<option value="${u}">${u}</option>`;
      });
      if (prevUnit && prevUnit !== 'all' && [...unitFilterElement.options].some(opt => opt.value === prevUnit)) {
        unitFilterElement.value = prevUnit;
      } else if (uniqueUnits.length > 0 && (!prevUnit || prevUnit === 'all')) {
        // C2 선택 시 Unit 1 기본 선택
        unitFilterElement.value = uniqueUnits[0];
      } else if ([...unitFilterElement.options].some(opt => opt.value === prevUnit)) {
        unitFilterElement.value = prevUnit;
      } else {
        unitFilterElement.value = 'all';
      }
    }

    // Show Lesson dropdown second
    if (lessonContainer) {
      lessonContainer.style.display = 'flex';
    } else if (tabType === 'manage') {
      lessonFilterElement.style.display = 'inline-block';
    }

    const currentUnit = unitFilterElement ? unitFilterElement.value : 'all';
    let unitRelatedWords = c2Words;
    if (currentUnit !== 'all') {
      unitRelatedWords = c2Words.filter(w => getWordUnit(w) === currentUnit);
    }

    const uniqueLessons = Array.from(new Set(unitRelatedWords.map(w => getWordLesson(w)))).filter(Boolean).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const prevLesson = lessonFilterElement.value;
    lessonFilterElement.innerHTML = `<option value="all">전체 레슨</option>`;
    uniqueLessons.forEach(lsn => {
      lessonFilterElement.innerHTML += `<option value="${lsn}">${lsn}</option>`;
    });

    if (prevLesson && prevLesson !== 'all' && [...lessonFilterElement.options].some(opt => opt.value === prevLesson)) {
      lessonFilterElement.value = prevLesson;
    } else if (uniqueLessons.length > 0 && (!prevLesson || prevLesson === 'all')) {
      // Unit 선택 시 Lesson 1 기본 선택 (30개 단어 15개 구간 즉각 활성화)
      lessonFilterElement.value = uniqueLessons[0];
    } else if ([...lessonFilterElement.options].some(opt => opt.value === prevLesson)) {
      lessonFilterElement.value = prevLesson;
    } else {
      lessonFilterElement.value = 'all';
    }

  } else {
    // Non-C2 levels (e.g. Par C1) -> Hide unit filter, show lesson filter
    if (unitContainer) unitContainer.style.display = 'none';
    if (unitFilterElement && tabType === 'manage') unitFilterElement.style.display = 'none';

    if (lessonContainer) {
      lessonContainer.style.display = 'flex';
    } else if (tabType === 'manage') {
      lessonFilterElement.style.display = 'inline-block';
    }

    const relatedWords = words.filter(w => w.level === levelVal);
    const uniqueLessons = Array.from(new Set(relatedWords.map(w => w.lesson))).filter(Boolean).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const prevValue = lessonFilterElement.value;
    lessonFilterElement.innerHTML = `<option value="all">전체 레슨</option>`;
    uniqueLessons.forEach(lsn => {
      lessonFilterElement.innerHTML += `<option value="${lsn}">${lsn}</option>`;
    });

    if ([...lessonFilterElement.options].some(opt => opt.value === prevValue)) {
      lessonFilterElement.value = prevValue;
    } else {
      lessonFilterElement.value = 'all';
    }
  }

  updateSegmentFilters(tabType);
}

function updateSegmentFilters(tabType) {
  let levelVal = '';
  let unitVal = 'all';
  let lessonVal = 'all';
  let segmentSelect = null;
  let segmentContainer = null;

  if (tabType === 'study') {
    levelVal = document.getElementById('study-level-filter').value;
    const unitEl = document.getElementById('study-unit-filter');
    unitVal = unitEl ? unitEl.value : 'all';
    lessonVal = document.getElementById('study-lesson-filter').value;
    segmentSelect = document.getElementById('study-segment-filter');
    segmentContainer = document.getElementById('study-segment-filter-container');
  } else if (tabType === 'quiz') {
    levelVal = document.getElementById('quiz-level-select').value;
    const unitEl = document.getElementById('quiz-unit-select');
    unitVal = unitEl ? unitEl.value : 'all';
    lessonVal = document.getElementById('quiz-lesson-select').value;
    segmentSelect = document.getElementById('quiz-segment-select');
    segmentContainer = document.getElementById('quiz-segment-select-container');
  } else if (tabType === 'dictation') {
    levelVal = document.getElementById('dictation-level-filter').value;
    const unitEl = document.getElementById('dictation-unit-filter');
    unitVal = unitEl ? unitEl.value : 'all';
    lessonVal = document.getElementById('dictation-lesson-filter').value;
    segmentSelect = document.getElementById('dictation-segment-filter');
    segmentContainer = document.getElementById('dictation-segment-filter-container');
  }

  if (segmentContainer) {
    segmentContainer.style.display = tabType === 'study' ? 'flex' : 'block';
  }

  if (!segmentSelect) return;

  // Calculate matching word pool to determine segment chunk size
  let pool = [...words];
  if (levelVal === 'due') {
    const now = Date.now();
    pool = pool.filter(w => !w.nextReview || w.nextReview <= now);
  } else if (levelVal !== 'all') {
    pool = pool.filter(w => w.level === levelVal);
    if (levelVal === 'Par C2') {
      if (unitVal !== 'all') {
        pool = pool.filter(w => getWordUnit(w) === unitVal);
      }
      if (lessonVal !== 'all') {
        pool = pool.filter(w => getWordLesson(w) === lessonVal || w.lesson === lessonVal);
      }
    } else {
      if (lessonVal !== 'all') {
        pool = pool.filter(w => w.lesson === lessonVal);
      }
    }
  }

  const prevSegment = segmentSelect.value;
  const count = pool.length;

  if (count === 30) {
    // 30 words: divide by 15 words per segment
    segmentSelect.innerHTML = `
      <option value="all">전체 (30단어)</option>
      <option value="1">1구간 (1 ~ 15)</option>
      <option value="2">2구간 (16 ~ 30)</option>
    `;
  } else if (count === 40) {
    // 40 words: divide by 20 words per segment
    segmentSelect.innerHTML = `
      <option value="all">전체 (40단어)</option>
      <option value="1">1구간 (1 ~ 20)</option>
      <option value="2">2구간 (21 ~ 40)</option>
    `;
  } else if (count === 60) {
    // 60 words (e.g. Unit 1 with 2 lessons): 20 words per segment
    segmentSelect.innerHTML = `
      <option value="all">전체 (60단어)</option>
      <option value="1">1구간 (1 ~ 20)</option>
      <option value="2">2구간 (21 ~ 40)</option>
      <option value="3">3구간 (41 ~ 60)</option>
    `;
  } else if (count > 0 && count <= 30) {
    segmentSelect.innerHTML = `
      <option value="all">전체 (${count}단어)</option>
      <option value="1">1구간 (1 ~ ${Math.min(15, count)})</option>
      ${count > 15 ? `<option value="2">2구간 (16 ~ ${count})</option>` : ''}
    `;
  } else {
    segmentSelect.innerHTML = `
      <option value="all">전체</option>
      <option value="1">1구간 (1 ~ 20)</option>
      <option value="2">2구간 (21 ~ 40)</option>
    `;
  }

  if ([...segmentSelect.options].some(opt => opt.value === prevSegment)) {
    segmentSelect.value = prevSegment;
  } else {
    segmentSelect.value = 'all';
  }
}

function updateSegmentFiltersVisibility(tabType) {
  updateSegmentFilters(tabType);
}

// --- Navigation Tab System ---
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabs = document.querySelectorAll('.tab-content');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-target');
      
      navButtons.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const targetElement = document.getElementById(targetTab);
      if (targetElement) {
        targetElement.classList.add('active');
      }

      // Context specific updates when entering tabs
      if (targetTab === 'dashboard-tab' || targetTab === 'stats-tab') {
        updateDashboardStats();
      } else if (targetTab === 'study-tab') {
        const filterPanel = document.querySelector('.study-header');
        if (filterPanel) filterPanel.style.display = 'flex';
        initStudySession(); // 리프레시: 플래시카드 첫 카드부터 다시 학습 시작
      } else if (targetTab === 'quiz-tab') {
        resetQuizState(); // 리프레시: 진행중이던 퀴즈를 리셋하고 설정창으로 돌아감
      } else if (targetTab === 'dictation-tab') {
        resetDictationState(); // 리프레시: 진행중이던 받아쓰기를 리셋하고 설정창으로 돌아감
      } else if (targetTab === 'manage-tab') {
        renderManageTable();
      }
    });
  });
}

// --- Streak System Logic ---
function incrementStreak() {
  const today = new Date().toDateString();
  
  if (lastStudyDate === today) {
    return; // Already studied today
  }

  if (lastStudyDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (new Date(lastStudyDate).toDateString() === yesterday.toDateString()) {
      streak += 1;
    } else {
      streak = 1; // Streak broken, restart
    }
  } else {
    streak = 1; // First study
  }

  lastStudyDate = today;
  localStorage.setItem('lingopop_streak', streak);
  localStorage.setItem('lingopop_last_study_date', lastStudyDate);
  updateStreakDisplay();
}

function updateStreakDisplay() {
  const streakDays = document.getElementById('streak-days');
  if (streakDays) {
    streakDays.textContent = streak;
  }
}

function escapeRegExp(string) {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

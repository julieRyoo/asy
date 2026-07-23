/**
 * LingoPop - Core State & Navigation Management
 */

// --- State Configurations ---
const DB_VERSION = "a2_l08_strictly_v2";
let words = [];
let streak = 0;
let lastStudyDate = null;
let currentUser = null;

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
  
  // Create initial Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

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

  // Initialize level and lesson filter dropdown values
  updateLevelFilters();
}

function saveData() {
  localStorage.setItem('lingopop_words', JSON.stringify(words));
  updateDashboardStats();
  updateLevelFilters();
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
  // Get all unique levels from words
  const uniqueLevels = Array.from(new Set(words.map(w => w.level))).filter(Boolean).sort().reverse();
  
  // Update study filter level dropdown
  const studyFilter = document.getElementById('study-level-filter');
  if (studyFilter) {
    const studyValue = studyFilter.value;
    studyFilter.innerHTML = `
      <option value="due">오늘 복습할 단어만</option>
      <option value="all">전체 보관 단어</option>
    `;
    uniqueLevels.forEach(lvl => {
      studyFilter.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    if ([...studyFilter.options].some(opt => opt.value === studyValue)) {
      studyFilter.value = studyValue;
    } else {
      studyFilter.value = 'due';
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

function updateLessonFilters(tabType) {
  let levelVal = '';
  let lessonFilterElement = null;
  let containerElement = null;

  if (tabType === 'study') {
    levelVal = document.getElementById('study-level-filter').value;
    lessonFilterElement = document.getElementById('study-lesson-filter');
    containerElement = document.getElementById('study-lesson-filter-container');
  } else if (tabType === 'quiz') {
    levelVal = document.getElementById('quiz-level-select').value;
    lessonFilterElement = document.getElementById('quiz-lesson-select');
    containerElement = document.getElementById('quiz-lesson-select-container');
  } else if (tabType === 'dictation') {
    levelVal = document.getElementById('dictation-level-filter').value;
    lessonFilterElement = document.getElementById('dictation-lesson-filter');
    containerElement = document.getElementById('dictation-lesson-filter-container');
  } else if (tabType === 'manage') {
    levelVal = document.getElementById('manage-level-filter').value;
    lessonFilterElement = document.getElementById('manage-lesson-filter');
    containerElement = null; // show/hide handled via style directly in code below
  }

  if (!lessonFilterElement) return;

  if (levelVal === 'due' || levelVal === 'all') {
    // Hide lesson dropdown
    if (containerElement) {
      containerElement.style.display = 'none';
    } else if (tabType === 'manage' && lessonFilterElement) {
      lessonFilterElement.style.display = 'none';
    }
    return;
  }

  // Show lesson dropdown and populate lessons belonging to selected level
  if (containerElement) {
    containerElement.style.display = 'flex';
  } else if (tabType === 'manage') {
    lessonFilterElement.style.display = 'inline-block';
  }

  // Find unique lessons for this level
  const relatedWords = words.filter(w => w.level === levelVal);
  
  // Sort lessons based on alphanumeric ordering
  const uniqueLessons = Array.from(new Set(relatedWords.map(w => w.lesson))).filter(Boolean).sort((a, b) => {
    return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
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

  updateSegmentFiltersVisibility(tabType);
}

function updateSegmentFiltersVisibility(tabType) {
  if (tabType === 'study') {
    const levelVal = document.getElementById('study-level-filter').value;
    const lessonVal = document.getElementById('study-lesson-filter').value;
    const segmentContainer = document.getElementById('study-segment-filter-container');
    if (segmentContainer) {
      if (levelVal !== 'due' && levelVal !== 'all' && lessonVal !== 'all') {
        segmentContainer.style.display = 'flex';
      } else {
        segmentContainer.style.display = 'none';
        document.getElementById('study-segment-filter').value = 'all';
      }
    }
  } else if (tabType === 'quiz') {
    const levelVal = document.getElementById('quiz-level-select').value;
    const lessonVal = document.getElementById('quiz-lesson-select').value;
    const segmentContainer = document.getElementById('quiz-segment-select-container');
    if (segmentContainer) {
      if (levelVal !== 'all' && lessonVal !== 'all') {
        segmentContainer.style.display = 'block';
      } else {
        segmentContainer.style.display = 'none';
        document.getElementById('quiz-segment-select').value = 'all';
      }
    }
  } else if (tabType === 'dictation') {
    const levelVal = document.getElementById('dictation-level-filter').value;
    const lessonVal = document.getElementById('dictation-lesson-filter').value;
    const segmentContainer = document.getElementById('dictation-segment-filter-container');
    if (segmentContainer) {
      if (levelVal !== 'all' && lessonVal !== 'all') {
        segmentContainer.style.display = 'block';
      } else {
        segmentContainer.style.display = 'none';
        document.getElementById('dictation-segment-filter').value = 'all';
      }
    }
  }
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
      if (targetTab === 'dashboard-tab') {
        updateDashboardStats();
      } else if (targetTab === 'study-tab') {
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

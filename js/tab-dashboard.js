/**
 * LingoPop - Dashboard Tab Logic
 */

function setupDashboard() {
  const dashLevelSelect = document.getElementById('dash-level-select');
  if (dashLevelSelect) {
    dashLevelSelect.addEventListener('change', () => {
      renderDashboardLessons();
    });
  }
  updateDashboardStats();
}

function updateDashboardStats() {
  const now = Date.now();
  
  // Update sidebar badge for total due count
  const due = words.filter(w => !w.nextReview || w.nextReview <= now).length;
  const sidebarDueBadge = document.getElementById('sidebar-due-badge');
  if (sidebarDueBadge) {
    if (due > 0) {
      sidebarDueBadge.textContent = due;
      sidebarDueBadge.style.display = 'inline-block';
    } else {
      sidebarDueBadge.style.display = 'none';
    }
  }

  // Populate level dropdown in dashboard
  const uniqueLevels = Array.from(new Set(words.map(w => w.level))).filter(Boolean).sort();
  const dashLevelSelect = document.getElementById('dash-level-select');
  
  if (dashLevelSelect) {
    const prevValue = dashLevelSelect.value;
    dashLevelSelect.innerHTML = `<option value="all">전체 레벨</option>`;
    uniqueLevels.forEach(lvl => {
      dashLevelSelect.innerHTML += `<option value="${lvl}">${lvl}</option>`;
    });
    
    if ([...dashLevelSelect.options].some(opt => opt.value === prevValue)) {
      dashLevelSelect.value = prevValue;
    } else {
      dashLevelSelect.value = 'all';
    }
  }

  renderDashboardLessons();
}

function renderDashboardLessons() {
  const dashLevelSelect = document.getElementById('dash-level-select');
  const levelFilter = dashLevelSelect ? dashLevelSelect.value : 'all';
  const gridContainer = document.getElementById('dash-lessons-grid');
  
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  // Get unique level-lesson combinations
  const groups = {};
  words.forEach(w => {
    if (levelFilter !== 'all' && w.level !== levelFilter) return;
    const key = `${w.level}__${w.lesson}`;
    if (!groups[key]) {
      groups[key] = {
        level: w.level,
        lesson: w.lesson,
        words: []
      };
    }
    groups[key].words.push(w);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    // Sort by level first, then lesson (descending)
    const gA = groups[a];
    const gB = groups[b];
    const lvlCompare = gB.level.localeCompare(gA.level);
    if (lvlCompare !== 0) return lvlCompare;
    return gB.lesson.localeCompare(gA.lesson, undefined, { numeric: true, sensitivity: 'base' });
  });

  if (sortedKeys.length === 0) {
    gridContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; margin: 20px 0;">
        <i data-lucide="alert-circle" style="width: 32px; height: 32px; color: var(--text-secondary); margin-bottom: 12px;"></i>
        <p style="color: var(--text-secondary);">표시할 레슨이 없습니다. 단어를 새로 등록해 주세요.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const now = Date.now();

  sortedKeys.forEach(key => {
    const group = groups[key];
    const totalCount = group.words.length;
    const dueCount = group.words.filter(w => !w.nextReview || w.nextReview <= now).length;
    const masteredCount = group.words.filter(w => w.box === 5).length;
    
    // Calculate average box progression
    let sumProgress = 0;
    group.words.forEach(w => {
      sumProgress += ((w.box - 1) / 4);
    });
    const progressPct = totalCount > 0 ? Math.round((sumProgress / totalCount) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.innerHTML = `
      <div class="lesson-card-header">
        <span class="badge level-badge">${group.level.toUpperCase()}</span>
        <span class="lesson-number">${group.lesson}</span>
      </div>
      <div class="lesson-stats">
        <div class="stat-item">
          <span class="label">총 단어</span>
          <span class="value">${totalCount}개</span>
        </div>
        <div class="stat-item">
          <span class="label">복습 필요</span>
          <span class="value text-warning">${dueCount}개</span>
        </div>
        <div class="stat-item">
          <span class="label">마스터</span>
          <span class="value text-success">${masteredCount}개</span>
        </div>
      </div>
      <div class="lesson-progress-row">
        <div class="progress-info">
          <span>학습 완료율</span>
          <span>${progressPct}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: ${progressPct}%"></div>
        </div>
      </div>
      <div class="lesson-card-actions">
        <button class="btn btn-primary btn-sm btn-study" data-level="${group.level}" data-lesson="${group.lesson}">
          <i data-lucide="book-open"></i>
          <span>학습하기</span>
        </button>
        <button class="btn btn-outline btn-sm btn-quiz" data-level="${group.level}" data-lesson="${group.lesson}">
          <i data-lucide="award"></i>
          <span>퀴즈풀기</span>
        </button>
      </div>
    `;

    // Click triggers
    card.querySelector('.btn-study').addEventListener('click', (e) => {
      const targetLvl = e.currentTarget.getAttribute('data-level');
      const targetLsn = e.currentTarget.getAttribute('data-lesson');
      
      // Go to study tab
      document.getElementById('study-level-filter').value = targetLvl;
      updateLessonFilters('study');
      document.getElementById('study-lesson-filter').value = targetLsn;
      
      const studySeg = document.getElementById('study-segment-filter');
      if (studySeg) studySeg.value = 'all';
      updateSegmentFiltersVisibility('study');
      
      document.getElementById('nav-study-btn').click();
      initStudySession();
    });

    card.querySelector('.btn-quiz').addEventListener('click', (e) => {
      const targetLvl = e.currentTarget.getAttribute('data-level');
      const targetLsn = e.currentTarget.getAttribute('data-lesson');
      
      // Select Level & Lesson in Quiz tab
      document.getElementById('quiz-level-select').value = targetLvl;
      updateLessonFilters('quiz');
      document.getElementById('quiz-lesson-select').value = targetLsn;
      
      const quizSeg = document.getElementById('quiz-segment-select');
      if (quizSeg) quizSeg.value = 'all';
      updateSegmentFiltersVisibility('quiz');
      
      // Go to quiz tab
      const navButtons = document.querySelectorAll('.nav-btn');
      const quizNavBtn = Array.from(navButtons).find(btn => btn.getAttribute('data-target') === 'quiz-tab');
      if (quizNavBtn) {
        quizNavBtn.click();
      }
    });

    gridContainer.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

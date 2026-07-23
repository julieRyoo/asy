/**
 * LingoPop - Manage (Vocabulary Database) Tab Logic
 */

function setupManage() {
  renderManageTable();

  // Search input listeners
  document.getElementById('manage-search').addEventListener('input', renderManageTable);
  
  const levelFilter = document.getElementById('manage-level-filter');
  if (levelFilter) {
    levelFilter.addEventListener('change', () => {
      updateLessonFilters('manage');
      renderManageTable();
    });
  }

  const lessonFilter = document.getElementById('manage-lesson-filter');
  if (lessonFilter) {
    lessonFilter.addEventListener('change', renderManageTable);
  }

  document.getElementById('manage-box-filter').addEventListener('change', renderManageTable);

  const resetProgressBtn = document.getElementById('btn-reset-progress');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', resetBoxes);
  }
}

function resetBoxes() {
  if (confirm("정말 모든 단어의 학습 진도(Box 단계)를 초기화하시겠습니까?\n모든 단어가 Box 1 단계로 돌아가며, 복습 일정이 리셋됩니다.")) {
    words.forEach(w => {
      w.box = 1;
      w.nextReview = 0;
    });
    saveData();
    renderManageTable();
    updateDashboardStats();
    alert("학습 진도가 성공적으로 초기화되었습니다.");
  }
}

function renderManageTable() {
  const searchQuery = document.getElementById('manage-search').value.toLowerCase().trim();
  const levelFilter = document.getElementById('manage-level-filter').value;
  const lessonFilter = document.getElementById('manage-lesson-filter').value;
  const boxFilter = document.getElementById('manage-box-filter').value;

  // Filter global states
  let tableData = words.filter(w => {
    const searchMatch = !searchQuery || 
                        w.word.toLowerCase().includes(searchQuery) ||
                        w.definition.includes(searchQuery) ||
                        w.pos.toLowerCase().includes(searchQuery);
    const levelMatch = (levelFilter === 'all' || w.level === levelFilter);
    const lessonMatch = (levelFilter === 'all' || lessonFilter === 'all' || w.lesson === lessonFilter);
    const boxMatch = (boxFilter === 'all' || String(w.box) === boxFilter);

    return searchMatch && levelMatch && lessonMatch && boxMatch;
  });

  const wrapper = document.querySelector('.words-table-wrapper');
  const emptyAlert = document.getElementById('table-empty-state');
  
  // Hide legacy static table
  const legacyTable = wrapper.querySelector('table.words-table');
  if (legacyTable) legacyTable.style.display = 'none';

  let groupedContainer = document.getElementById('manage-grouped-container');
  if (!groupedContainer) {
    groupedContainer = document.createElement('div');
    groupedContainer.id = 'manage-grouped-container';
    groupedContainer.style.display = 'flex';
    groupedContainer.style.flexDirection = 'column';
    groupedContainer.style.gap = '24px';
    wrapper.insertBefore(groupedContainer, emptyAlert);
  }

  groupedContainer.innerHTML = '';

  if (tableData.length === 0) {
    emptyAlert.style.display = 'block';
    return;
  }
  emptyAlert.style.display = 'none';

  // Group by Level
  const uniqueLevels = Array.from(new Set(tableData.map(w => w.level))).filter(Boolean).sort().reverse();

  uniqueLevels.forEach(level => {
    const levelWords = tableData.filter(w => w.level === level);
    const uniqueLessons = Array.from(new Set(levelWords.map(w => w.lesson))).filter(Boolean).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const levelCard = document.createElement('div');
    levelCard.className = 'glass-panel';
    levelCard.style.padding = '20px';
    levelCard.style.borderRadius = 'var(--radius-lg)';

    levelCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge level-badge" style="font-size: 14px; padding: 4px 12px;">${level.toUpperCase()}</span>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">(총 ${levelWords.length}개 단어)</span>
        </div>
      </div>
    `;

    uniqueLessons.forEach(lsn => {
      const lessonWords = levelWords.filter(w => w.lesson === lsn);
      lessonWords.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

      const lessonSection = document.createElement('div');
      lessonSection.style.marginBottom = '20px';

      const lessonHeader = document.createElement('div');
      lessonHeader.style.display = 'flex';
      lessonHeader.style.alignItems = 'center';
      lessonHeader.style.justifyContent = 'space-between';
      lessonHeader.style.padding = '8px 12px';
      lessonHeader.style.background = 'rgba(255, 255, 255, 0.03)';
      lessonHeader.style.borderRadius = 'var(--radius-sm)';
      lessonHeader.style.marginBottom = '8px';
      lessonHeader.style.border = '1px solid var(--glass-border)';
      lessonHeader.innerHTML = `
        <span style="font-size: 13px; font-weight: 700; color: #fff;">${lsn}</span>
        <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">${lessonWords.length}개 단어</span>
      `;
      lessonSection.appendChild(lessonHeader);

      const tableEl = document.createElement('table');
      tableEl.className = 'words-table';
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">순번</th>
            <th>단어</th>
            <th>품사</th>
            <th>뜻</th>
            <th>학습 박스</th>
            <th>다음 복습일</th>
            <th style="width: 100px; text-align: right;">관리</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = tableEl.querySelector('tbody');
      lessonWords.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        let reviewText = "즉시 복습";
        if (item.nextReview && item.nextReview > Date.now()) {
          const diffMs = item.nextReview - Date.now();
          const diffHours = Math.ceil(diffMs / (60 * 60 * 1000));
          if (diffHours >= 24) {
            reviewText = `${Math.ceil(diffHours / 24)}일 후`;
          } else {
            reviewText = `${diffHours}시간 후`;
          }
        }

        const boxClass = item.box === 5 ? 'box-5-badge' : '';

        tr.innerHTML = `
          <td class="num-cell">${index + 1}</td>
          <td class="word-cell">${item.word}</td>
          <td class="pos-cell">${item.pos}</td>
          <td class="meaning-cell">${item.definition}</td>
          <td class="box-cell"><span class="${boxClass}">Box ${item.box}</span></td>
          <td class="date-cell">${reviewText}</td>
          <td style="text-align: right;">
            <div class="table-action-btns" style="justify-content: flex-end;">
              <button class="btn-icon btn-voice-sm" onclick="window.speakWord('${item.word}')" title="발음 듣기">
                <i data-lucide="volume-2"></i>
              </button>
              <button class="btn-icon" onclick="window.editWord('${item.id}')" title="수정">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn-icon btn-icon-danger" onclick="window.deleteWord('${item.id}')" title="삭제">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      lessonSection.appendChild(tableEl);
      levelCard.appendChild(lessonSection);
    });

    groupedContainer.appendChild(levelCard);
  });

  // Create/update Lucide icons for table
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Attach functions to window object so inline onclick attributes can execute
window.speakWord = speakWord;

window.editWord = function(id) {
  const target = words.find(w => w.id === id);
  if (target) {
    openWordModal(target);
  }
};

window.deleteWord = function(id) {
  if (confirm("이 단어를 정말 삭제하시겠습니까?")) {
    words = words.filter(w => w.id !== id);
    saveData();
    renderManageTable();
  }
};

// --- Modal Add / Edit Controller ---
function setupModals() {
  const modal = document.getElementById('word-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('word-form');

  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Close overlay on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Modal submit actions
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-word-id').value;
    const wordVal = document.getElementById('form-word').value.trim();
    const posVal = document.getElementById('form-pos').value.trim();
    const defVal = document.getElementById('form-definition').value.trim();
    const levelVal = document.getElementById('form-level').value.trim();
    const lessonVal = document.getElementById('form-lesson').value.trim();
    const exampleVal = document.getElementById('form-example').value.trim();
    const transVal = document.getElementById('form-example-trans').value.trim();

    // Check for duplicate words in the same level and lesson
    const isDuplicate = words.some(w => 
      w.id !== id && 
      w.word.toLowerCase() === wordVal.toLowerCase() &&
      w.level.toLowerCase() === levelVal.toLowerCase() &&
      w.lesson.toLowerCase() === lessonVal.toLowerCase()
    );

    if (isDuplicate) {
      alert(`이미 ${levelVal} 레벨의 ${lessonVal} 레슨에 "${wordVal}" 단어가 등록되어 있습니다.`);
      return;
    }

    if (id) {
      // Edit mode
      const idx = words.findIndex(w => w.id === id);
      if (idx !== -1) {
        words[idx] = {
          ...words[idx],
          word: wordVal,
          pos: posVal,
          definition: defVal,
          level: levelVal,
          lesson: lessonVal,
          example: exampleVal,
          exampleTranslation: transVal
        };
      }
    } else {
      // Add Mode
      const newWord = {
        id: 'user_' + Date.now(),
        word: wordVal,
        pos: posVal,
        definition: defVal,
        level: levelVal,
        lesson: lessonVal,
        example: exampleVal,
        exampleTranslation: transVal,
        box: 1,
        nextReview: 0
      };
      words.unshift(newWord); // add to top
    }

    saveData();
    closeModal();
    renderManageTable();
  });
}

function openWordModal(editItem = null) {
  const modal = document.getElementById('word-modal');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (editItem) {
    // Setup for editing
    title.textContent = '영어 단어 수정';
    submitBtn.textContent = '수정 완료';
    
    document.getElementById('edit-word-id').value = editItem.id;
    document.getElementById('form-word').value = editItem.word;
    document.getElementById('form-pos').value = editItem.pos;
    document.getElementById('form-definition').value = editItem.definition;
    document.getElementById('form-level').value = editItem.level;
    document.getElementById('form-lesson').value = editItem.lesson || '';
    document.getElementById('form-example').value = editItem.example || '';
    document.getElementById('form-example-trans').value = editItem.exampleTranslation || '';
  } else {
    // Setup for adding new
    title.textContent = '새로운 영어 단어 추가';
    submitBtn.textContent = '저장하기';
    
    document.getElementById('edit-word-id').value = '';
    document.getElementById('word-form').reset();
  }

  modal.classList.add('active');
}

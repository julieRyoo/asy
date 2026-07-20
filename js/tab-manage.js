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
    // Search matching
    const searchMatch = !searchQuery || 
                        w.word.toLowerCase().includes(searchQuery) ||
                        w.definition.includes(searchQuery) ||
                        w.pos.toLowerCase().includes(searchQuery);
    
    // Level matching
    const levelMatch = (levelFilter === 'all' || w.level === levelFilter);
    
    // Lesson matching
    const lessonMatch = (levelFilter === 'all' || lessonFilter === 'all' || w.lesson === lessonFilter);
    
    // Box matching
    const boxMatch = (boxFilter === 'all' || String(w.box) === boxFilter);

    return searchMatch && levelMatch && lessonMatch && boxMatch;
  });

  const tbody = document.getElementById('words-table-body');
  const emptyAlert = document.getElementById('table-empty-state');
  
  tbody.innerHTML = '';

  if (tableData.length === 0) {
    emptyAlert.style.display = 'block';
  } else {
    emptyAlert.style.display = 'none';

    tableData.forEach(item => {
      const tr = document.createElement('tr');
      
      // Calculate next review text
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
      const lessonDetail = item.lesson ? `<br><small style="color: var(--text-secondary);">${item.lesson}</small>` : '';

      tr.innerHTML = `
        <td class="word-cell">${item.word}</td>
        <td class="pos-cell">${item.pos}</td>
        <td class="meaning-cell">${item.definition}</td>
        <td><span class="badge level-badge">${item.level.toUpperCase()}</span>${lessonDetail}</td>
        <td class="box-cell"><span class="${boxClass}">Box ${item.box}</span></td>
        <td class="date-cell">${reviewText}</td>
        <td>
          <div class="table-action-btns">
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
  }

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

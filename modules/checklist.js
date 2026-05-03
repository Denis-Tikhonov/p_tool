/* ==================== CHECKLISTS MODULE ==================== */
let cachedData = null;
let activeTab = 'safa';

function renderChecklistsHeader(left, center, right) {
  left.innerHTML = `<button class="header-btn" onclick="app.navigateTo('main')" aria-label="Back">←</button>`;
  center.innerHTML = `
    <div class="tab-group">
      <button class="tab-btn ${activeTab === 'safa' ? 'active' : ''}" onclick="switchTab('safa')">SAFA</button>
      <button class="tab-btn ${activeTab === 'customs' ? 'active' : ''}" onclick="switchTab('customs')">Customs</button>
    </div>
  `;
  right.innerHTML = `<button class="header-btn" onclick="openCommitsDrawer()" aria-label="Actions">+</button>`;
}

function switchTab(tab) {
  activeTab = tab;
  renderHeader('checklists');

  document.querySelectorAll('.checklist-group').forEach(g => {
    g.style.display = g.dataset.tab === tab ? 'block' : 'none';
  });
}

function openCommitsDrawer() {
  const overlay = document.getElementById('commitsOverlay');
  const drawer = document.getElementById('commitsDrawer');
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
  }
}

function closeCommitsDrawer() {
  const overlay = document.getElementById('commitsOverlay');
  const drawer = document.getElementById('commitsDrawer');
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
  }
}

function onChecklistCheckboxChange(blockId, itemId) {
  const checkbox = document.getElementById(`chk_${blockId}_${itemId}`);
  const checked = checkbox ? checkbox.checked : false;
  sessionStorage.setItem(`checklist_${blockId}_${itemId}`, checked ? 'true' : 'false');
  updateBlockBadge(blockId);
}

function updateBlockBadge(blockId) {
  const block = document.querySelector(`.checklist-block[data-block-id="${blockId}"]`);
  if (!block) return;

  const checkboxes = block.querySelectorAll('input[type="checkbox"]');
  const allChecked = Array.from(checkboxes).every(ch => ch.checked);

  const badge = block.querySelector('.status-badge');
  if (badge) {
    badge.className = 'status-badge ' + (allChecked ? 'ok' : 'no');
    badge.textContent = allChecked ? 'OK' : 'NO';
  }
}

function toggleBlock(blockId) {
  const block = document.querySelector(`.checklist-block[data-block-id="${blockId}"]`);
  if (!block) return;

  const content = block.querySelector('.block-content');
  const arrow = block.querySelector('.block-arrow');

  const isOpen = content.classList.contains('open');
  if (isOpen) {
    content.classList.remove('open');
    arrow.classList.remove('open');
  } else {
    content.classList.add('open');
    arrow.classList.add('open');
  }
}

function renderChecklists(data) {
  const container = document.getElementById('checklistsContainer');
  if (!container) return;

  let html = '';

  ['safa', 'customs'].forEach(tab => {
    const groups = data[tab] || [];
    const display = tab === activeTab ? 'block' : 'none';

    if (groups.length === 0) {
      html += `<div class="checklist-group" data-tab="${tab}" style="display:${display}"><p class="empty-message">Нет заданий</p></div>`;
      return;
    }

    html += `<div class="checklist-group" data-tab="${tab}" style="display:${display}">`;

    groups.forEach(group => {
      const itemsHtml = group.items.map(item => {
        const key = `checklist_${group.id}_${item.id}`;
        const saved = sessionStorage.getItem(key) === 'true';
        return `
          <label class="checkbox-label">
            <input type="checkbox" id="chk_${group.id}_${item.id}"
              ${saved ? 'checked' : ''}
              onchange="onChecklistCheckboxChange('${group.id}', '${item.id}')">
            <span class="checkbox-text">${escapeHtml(item.label)}</span>
          </label>
        `;
      }).join('');

      const checkboxes = group.items.map(item => {
        return sessionStorage.getItem(`checklist_${group.id}_${item.id}`) === 'true';
      });
      const allChecked = checkboxes.length > 0 && checkboxes.every(v => v);

      html += `
        <div class="checklist-block" data-block-id="${group.id}">
          <div class="block-header" onclick="toggleBlock('${group.id}')">
            <span class="status-badge ${allChecked ? 'ok' : 'no'}">${allChecked ? 'OK' : 'NO'}</span>
            <span class="checklist-block-title">${escapeHtml(group.title)}</span>
            <span class="block-arrow">▼</span>
          </div>
          <div class="block-content">
            ${itemsHtml}
          </div>
        </div>
      `;
    });

    html += '</div>';
  });

  // Drawer markup
  html += `
    <div id="commitsOverlay" class="drawer-overlay" onclick="closeCommitsDrawer()"></div>
    <div id="commitsDrawer" class="drawer-panel">
      <div class="drawer-header">
        <span>Действия</span>
        <button class="drawer-close" onclick="closeCommitsDrawer()">✕</button>
      </div>
      <div class="drawer-item" onclick="alert('Упс... Функция в разработке')">
        <span>📸</span><span>Сделать фото</span>
      </div>
      <div class="drawer-item" onclick="alert('Упс... Функция в разработке')">
        <span>💬</span><span>Комментарий</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function initChecklists() {
  const container = document.getElementById('checklistsContainer');
  if (!container) {
    console.error('Контейнер checklistsContainer не найден!');
    return;
  }

  if (cachedData) {
    renderChecklists(cachedData);
    return;
  }

  app.showSpinner(container);

  fetch('modules/checklist.json')
    .then(r => {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    })
    .then(data => {
      cachedData = data;
      app.hideSpinner(container, '');
      renderChecklists(data);
    })
    .catch(() => {
      app.showError(container, 'Не удалось загрузить чеклисты');
    });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCommitsDrawer();
  }
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

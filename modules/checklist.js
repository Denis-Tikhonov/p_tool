// modules/checklist.js
let cachedData = null;
let activeTab = 'safa';
function renderChecklistsHeader() {
  const left = document.getElementById('headerLeft');
  const center = document.getElementById('headerCenter');
  const right = document.getElementById('headerRight');
  if (left) left.innerHTML = `<button class="icon-btn" aria-label="Меню" onclick="window.app.toggleMenu()">${window.ICONS.menu}</button>`;
  if (center) center.innerHTML = `<div class="tab-group"><button class="tab-btn ${activeTab === 'safa' ? 'active' : ''}" data-tab="safa">SAFA Инспекция</button><button class="tab-btn ${activeTab === 'customs' ? 'active' : ''}" data-tab="customs">Customs Чек-листы</button></div>`;
  if (right) right.innerHTML = `<button class="icon-btn" aria-label="Действия">${window.ICONS.plus}</button>`;
  center?.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeTab = btn.dataset.tab;
      renderChecklistsHeader();
      renderContent();
    });
  });
  const plusBtn = right?.querySelector('.icon-btn');
  if (plusBtn) plusBtn.onclick = () => openCommitsPanel();
}
function openCommitsPanel() {
  const panel = document.getElementById('commitsPanel');
  const overlay = document.getElementById('commitsOverlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
}
function closeCommitsPanel() {
  const panel = document.getElementById('commitsPanel');
  const overlay = document.getElementById('commitsOverlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}
function renderContent() {
  const container = document.getElementById('checklistsContainer');
  if (!container) return;
  const data = cachedData?.[activeTab];
  if (!data || !data.length) {
    container.innerHTML = '<p class="empty-message">Нет заданий</p>';
    return;
  }
  const html = data.map(block => {
    const itemsHtml = block.items.map(item => {
      const checked = sessionStorage.getItem(`checklist_${block.id}_${item.id}`) === 'true';
      return `<div class="checklist-item"><label><input type="checkbox" data-block="${block.id}" data-item="${item.id}" ${checked ? 'checked' : ''}> <span>${item.label}</span></label></div>`;
    }).join('');
    const allChecked = block.items.every(it => sessionStorage.getItem(`checklist_${block.id}_${it.id}`) === 'true');
    const badgeClass = allChecked ? 'ok' : '';
    return `<div class="checklist-block" data-block-id="${block.id}"><div class="block-header"><span class="status-badge ${badgeClass}">${allChecked ? 'OK' : 'NO'}</span><span class="collapsible-title">${block.title}</span><span class="collapsible-chevron">${window.ICONS['chevron-down']}</span></div><div class="block-content">${itemsHtml}</div></div>`;
  }).join('');
  window.app.hideSkeleton(container, html);
  container.querySelectorAll('.block-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const block = header.closest('.checklist-block');
      if (block) block.classList.toggle('open');
    });
  });
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const blockId = cb.dataset.block;
      const itemId = cb.dataset.item;
      sessionStorage.setItem(`checklist_${blockId}_${itemId}`, cb.checked);
      const blockDiv = cb.closest('.checklist-block');
      if (blockDiv) {
        const block = cachedData[activeTab].find(b => b.id === blockId);
        if (block) {
          const allChecked = block.items.every(it => sessionStorage.getItem(`checklist_${blockId}_${it.id}`) === 'true');
          const badge = blockDiv.querySelector('.status-badge');
          if (badge) {
            badge.textContent = allChecked ? 'OK' : 'NO';
            if (allChecked) badge.classList.add('ok'); else badge.classList.remove('ok');
          }
        }
      }
    });
  });
}
function initChecklists() {
  renderChecklistsHeader();
  const container = document.getElementById('checklistsContainer');
  if (!container) { console.error('Контейнер checklistsContainer не найден!'); return; }
  window.app.showSkeleton(container, 'blocks');
  if (cachedData) {
    renderContent();
    return;
  }
  fetch('modules/checklist.json').then(res => res.json()).then(data => {
    cachedData = data;
    renderContent();
  }).catch(() => {
    window.app.showError(container, 'Не удалось загрузить чеклисты', () => initChecklists());
  });
  const panelClose = document.getElementById('commitsPanelClose');
  const overlay = document.getElementById('commitsOverlay');
  if (panelClose) panelClose.onclick = closeCommitsPanel;
  if (overlay) overlay.onclick = closeCommitsPanel;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommitsPanel();
  });
  document.querySelectorAll('.commits-action-item').forEach(btn => {
    btn.addEventListener('click', () => { alert('Функция в разработке'); closeCommitsPanel(); });
  });
}
window.initChecklists = initChecklists;
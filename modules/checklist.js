// modules/checklist.js
// Модуль чеклистов (SAFA / Customs) с аккордеоном, чекбоксами и сохранением состояния

var cachedData = null;

// Восстановление активного таба из localStorage
var activeTab = (function() {
  try {
    return localStorage.getItem('checklistActiveTab') || 'safa';
  } catch (ex) {
    return 'safa';
  }
})();

// ---------------------- Вспомогательные функции ----------------------
function formatNote(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

function renderItems(block) {
  if (!block.items || !block.items.length) return '';
  return block.items.map(function(item) {
    var isRequired = (item.required !== false);
    var noteHtml = item.note ? '<span class="item-note">' + formatNote(item.note) + '</span>' : '';
    return '<label class="checklist-item' + (isRequired ? '' : ' checklist-item--optional') + '">' +
      '<input type="checkbox"' +
      ' data-block="' + block.id + '"' +
      ' data-item="' + item.id + '"' +
      ' data-required="' + (isRequired ? 'true' : 'false') + '">' +
      '<span class="item-body">' +
      '<span class="item-label">' + item.label + '</span>' +
      (isRequired ? '' : '<span class="item-optional-badge">необязательно</span>') +
      noteHtml +
      '</span>' +
      '</label>';
  }).join('');
}

function renderBlock(block) {
  // block.note — отдельный элемент между заголовком и контентом, всегда виден
  var blockNoteHtml = block.note ? '<div class="block-note">' + formatNote(block.note) + '</div>' : '';
  return '<div class="checklist-block" data-block-id="' + block.id + '">' +
    '<div class="checklist-block-header">' +
    '<span class="status-badge" data-badge="' + block.id + '">NO</span>' +
    '<span class="collapsible-title">' + block.title + '</span>' +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    blockNoteHtml +
    '<div class="block-content" data-content="' + block.id + '">' +
    renderItems(block) +
    '</div>' +
    '</div>';
}

function renderAllBlocks(data) {
  var blocks = data[activeTab];
  if (!blocks || blocks.length === 0) {
    return '<p style="padding: 32px 16px; text-align: center; color: var(--color-text-secondary);">Нет данных</p>';
  }
  return blocks.map(renderBlock).join('');
}

function updateBadge(blockId) {
  var blockEl = document.querySelector('.checklist-block[data-block-id="' + blockId + '"]');
  if (!blockEl) return;
  var required = blockEl.querySelectorAll('input[type="checkbox"][data-required="true"]');
  var badge = blockEl.querySelector('.status-badge[data-badge="' + blockId + '"]');
  if (!badge) return;
  if (required.length === 0) {
    badge.textContent = 'OK';
    badge.classList.add('ok');
    return;
  }
  var allChecked = true;
  for (var i = 0; i < required.length; i++) {
    if (!required[i].checked) { allChecked = false; break; }
  }
  badge.textContent = allChecked ? 'OK' : 'NO';
  if (allChecked) {
    badge.classList.add('ok');
  } else {
    badge.classList.remove('ok');
  }
}

function restoreCheckboxState(container) {
  var checkboxes = container.querySelectorAll('input[type="checkbox"]');
  for (var i = 0; i < checkboxes.length; i++) {
    var cb = checkboxes[i];
    var key = 'checklist_' + cb.dataset.block + '_' + cb.dataset.item;
    try {
      if (sessionStorage.getItem(key) === '1') cb.checked = true;
    } catch (ex) {}
  }
  var blocks = container.querySelectorAll('.checklist-block');
  for (var j = 0; j < blocks.length; j++) {
    var id = blocks[j].dataset.blockId;
    if (id) updateBadge(id);
  }
}

// ---------------------- Панель действий (Commits) ----------------------
function openCommitsPanel() {
  var panel = document.getElementById('commitsPanel');
  var overlay = document.getElementById('commitsOverlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeCommitsPanel() {
  var panel = document.getElementById('commitsPanel');
  var overlay = document.getElementById('commitsOverlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}
window.closeCommitsPanel = closeCommitsPanel;

// ---------------------- Хедер модуля ----------------------
function renderChecklistsHeader() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;

  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' +
    window.ICONS.back + '</button>';
  left.onclick = null;

  center.innerHTML = '<div class="tab-group" id="checklistTabGroup">' +
    '<button class="tab-btn' + (activeTab === 'safa' ? ' active' : '') + '" data-tab="safa">SAFA</button>' +
    '<button class="tab-btn' + (activeTab === 'customs' ? ' active' : '') + '" data-tab="customs">Customs</button>' +
    '</div>';

  // Делегирование кликов на табы — защита от дубликатов
  if (!center.dataset.tabDelegated) {
    center.addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      var group = center.querySelector('.tab-group');
      if (group) {
        group.querySelectorAll('.tab-btn').forEach(function(b) {
          b.classList.remove('active');
        });
      }
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      try {
        localStorage.setItem('checklistActiveTab', activeTab);
      } catch (ex) {}
      if (cachedData) {
        renderChecklist(cachedData);
      }
    });
    center.dataset.tabDelegated = 'true';
  }

  right.innerHTML = '<button class="icon-btn" aria-label="Действия" onclick="openCommitsPanel()">' +
    window.ICONS.plus + '</button>';
  right.onclick = null;
}

function renderChecklist(data) {
  var container = document.getElementById('checklistsContainer');
  if (!container || !data) return;
  var html = renderAllBlocks(data);
  app.hideSkeleton(container, html);
  restoreCheckboxState(container);
}

// ---------------------- Основная инициализация ----------------------
function initChecklists() {
  renderChecklistsHeader();

  var container = document.getElementById('checklistsContainer');
  if (!container) {
    console.error('Контейнер checklistsContainer не найден!');
    return;
  }

  // Делегирование событий на контейнер (аккордеон + чекбоксы)
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      // Раскрытие / закрытие блока
      var header = e.target.closest('.checklist-block-header');
      if (header) {
        var block = header.closest('.checklist-block');
        if (block) block.classList.toggle('open');
        return;
      }
    });

    container.addEventListener('change', function(e) {
      var cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      var blockId = cb.dataset.block;
      var itemId = cb.dataset.item;
      try {
        sessionStorage.setItem('checklist_' + blockId + '_' + itemId, cb.checked ? '1' : '0');
      } catch (ex) {}
      updateBadge(blockId);
    });

    container.dataset.delegated = 'true';
  }

  // Если данные уже загружены — сразу рендерим
  if (cachedData) {
    renderChecklist(cachedData);
    return;
  }

  app.showSkeleton(container, 'blocks');

  fetch('modules/checklist.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      cachedData = data;
      var html = renderAllBlocks(data);
      app.hideSkeleton(container, html);
      restoreCheckboxState(container);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить чеклисты');
    });
}

// Глобальный вызов для роутинга
window.initChecklists = initChecklists;
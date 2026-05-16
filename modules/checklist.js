/* ═══════════════════════════════════════════
   МОДУЛЬ: Чеклисты (Checklists)
   ═══════════════════════════════════════════ */

var cachedData = null;
var activeTab = (function() {
  try { return localStorage.getItem('checklistActiveTab') || 'safa'; } catch(ex) { return 'safa'; }
})();

function formatNote(text) {
  return text.replace(/\n/g, '<br>');
}

function renderItems(block) {
  var html = '';
  for (var i = 0; i < block.items.length; i++) {
    var item = block.items[i];
    var isRequired = (item.required !== false);
    var noteHtml = item.note
      ? '<span class="item-note">' + formatNote(item.note) + '</span>'
      : '';
    html += '<label class="checklist-item' + (isRequired ? '' : ' checklist-item--optional') + '">'
      + '<input type="checkbox"'
      + ' data-block="' + block.id + '"'
      + ' data-item="' + item.id + '"'
      + ' data-required="' + (isRequired ? 'true' : 'false') + '">'
      + '<span class="item-body">'
      + '<span class="item-label">' + item.label + '</span>'
      + (isRequired ? '' : '<span class="item-optional-badge">\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E</span>')
      + noteHtml
      + '</span>'
      + '</label>';
  }
  return html;
}

function renderBlock(block) {
  var blockNoteHtml = block.note
    ? '<div class="block-note">' + formatNote(block.note) + '</div>'
    : '';
  return '<div class="checklist-block" data-block-id="' + block.id + '">'
    + '<div class="checklist-block-header">'
    + '<span class="status-badge" data-badge="' + block.id + '">NO</span>'
    + '<span class="collapsible-title">' + block.title + '</span>'
    + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
    + '</div>'
    + blockNoteHtml
    + '<div class="block-content" data-content="' + block.id + '">'
    + renderItems(block)
    + '</div>'
    + '</div>';
}

function renderAllBlocks(data) {
  var blocks = data[activeTab];
  if (!blocks || blocks.length === 0) {
    return '<p style="padding: 32px 16px; text-align: center; color: var(--color-text-secondary);">'
      + '\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</p>';
  }
  var html = '';
  for (var i = 0; i < blocks.length; i++) {
    html += renderBlock(blocks[i]);
  }
  return html;
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
    } catch(ex) {}
  }
  var blocks = container.querySelectorAll('.checklist-block');
  for (var j = 0; j < blocks.length; j++) {
    updateBadge(blocks[j].dataset.blockId);
  }
}

function renderChecklist(data) {
  var container = document.getElementById('checklistsContainer');
  if (!container || !data) return;
  var html = renderAllBlocks(data);
  app.hideSkeleton(container, html);
  restoreCheckboxState(container);
}

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

function initCommitsPanelListeners() {
  var overlay = document.getElementById('commitsOverlay');
  var closeBtn = document.getElementById('commitsPanelClose');
  var cameraBtn = document.getElementById('commitsCameraBtn');
  var notesBtn = document.getElementById('commitsNotesBtn');
  var docsBtn = document.getElementById('commitsDocsBtn');
  var docsIcon = document.getElementById('commitDocsIcon');

  if (docsIcon && window.ICONS) {
    docsIcon.innerHTML = window.ICONS['file-text'] || '';
  }

  if (closeBtn && window.ICONS) {
    closeBtn.innerHTML = window.ICONS.close || '';
  }

  if (cameraBtn && window.ICONS) {
    cameraBtn.innerHTML = window.ICONS.camera + ' \u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0444\u043E\u0442\u043E';
  }

  if (notesBtn && window.ICONS) {
    notesBtn.innerHTML = window.ICONS['message-square'] + ' \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439';
  }

  if (overlay) overlay.addEventListener('click', closeCommitsPanel);
  if (closeBtn) closeBtn.addEventListener('click', closeCommitsPanel);

  if (cameraBtn) {
    cameraBtn.addEventListener('click', function() {
      closeCommitsPanel();
      window.app.openBottomPanel({ autoFocus: 'camera' });
    });
  }
  if (notesBtn) {
    notesBtn.addEventListener('click', function() {
      closeCommitsPanel();
      window.app.openBottomPanel({ autoFocus: 'notes' });
    });
  }
  if (docsBtn) {
    docsBtn.addEventListener('click', function() {
      closeCommitsPanel();
      window.app.openBottomPanel();
    });
  }
}

/* Инициализация слушателей commits-панели при загрузке модуля */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCommitsPanelListeners);
} else {
  initCommitsPanelListeners();
}

function renderChecklistsHeader() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;

  left.innerHTML = '<button class="icon-btn" aria-label="\u041D\u0430\u0437\u0430\u0434" onclick="app.navigateTo(\'main\')">'
    + window.ICONS.back + '</button>';
  left.onclick = null;

  center.innerHTML = '<div class="tab-group" id="checklistTabGroup">'
    + '<button class="tab-btn' + (activeTab === 'safa' ? ' active' : '') + '" data-tab="safa">SAFA</button>'
    + '<button class="tab-btn' + (activeTab === 'customs' ? ' active' : '') + '" data-tab="customs">Customs</button>'
    + '</div>';

  if (!center.dataset.tabDelegated) {
    center.addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      var group = center.querySelector('.tab-group');
      if (group) {
        var btns = group.querySelectorAll('.tab-btn');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.remove('active');
        }
      }
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      try { localStorage.setItem('checklistActiveTab', activeTab); } catch(ex) {}
      renderChecklist(cachedData);
    });
    center.dataset.tabDelegated = 'true';
  }

  right.innerHTML = '<button class="icon-btn" aria-label="\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F">'
    + window.ICONS.plus + '</button>';
  right.onclick = openCommitsPanel;
}

function initChecklists() {
  renderChecklistsHeader();

  var container = document.getElementById('checklistsContainer');
  if (!container) {
    console.error('\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 checklistsContainer \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D!');
    return;
  }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
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
      } catch(ex) {}
      updateBadge(blockId);
    });

    container.dataset.delegated = 'true';
  }

  if (cachedData) {
    renderChecklist(cachedData);
    restoreCheckboxState(container);
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
      app.showError(container, '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0447\u0435\u043A\u043B\u0438\u0441\u0442\u044B');
    });
}

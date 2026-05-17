// modules/flightprocedures.js – Лётные процедуры (согласно 7_MODULE_FLIGHTPROCEDURES.txt)
var cachedProcedures = null;

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `
    <div class="hc-default">Лётные процедуры</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', fpSearchHandler);
    input.addEventListener('input', fpSearchHandler);
  }

  showFPDefaultHeader();
}

function fpSearchHandler(e) {
  var query = e.target.value.trim();
  if (!cachedProcedures) return;
  var filtered = query ? filterProcedures(cachedProcedures, query) : cachedProcedures;
  renderFPList(filtered);
}

function filterProcedures(data, query) {
  var lowerQuery = query.toLowerCase();
  var filteredPhases = [];
  for (var p = 0; p < data.phases.length; p++) {
    var phase = data.phases[p];
    var phaseMatch = phase.title.toLowerCase().indexOf(lowerQuery) !== -1;
    var filteredProcs = [];
    for (var pr = 0; pr < phase.procedures.length; pr++) {
      var proc = phase.procedures[pr];
      var procMatch = proc.title.toLowerCase().indexOf(lowerQuery) !== -1;
      var contentMatch = false;
      if (proc.content) {
        for (var c = 0; c < proc.content.length; c++) {
          var item = proc.content[c];
          if (item.type === 'action' || item.type === 'action-crew') {
            if ((item.label && item.label.toLowerCase().indexOf(lowerQuery) !== -1) ||
                (item.value && item.value.toLowerCase().indexOf(lowerQuery) !== -1)) {
              contentMatch = true;
              break;
            }
          } else if (item.type === 'note' || item.type === 'caution' || item.type === 'warning' || item.type === 'verify') {
            if (item.text && item.text.toLowerCase().indexOf(lowerQuery) !== -1) {
              contentMatch = true;
              break;
            }
          } else if (item.type === 'condition' && item.text && item.text.toLowerCase().indexOf(lowerQuery) !== -1) {
            contentMatch = true;
            break;
          }
        }
      }
      if (phaseMatch || procMatch || contentMatch) {
        filteredProcs.push(proc);
      }
    }
    if (filteredProcs.length > 0) {
      filteredPhases.push({
        id: phase.id,
        title: phase.title,
        time: phase.time,
        procedures: filteredProcs
      });
    }
  }
  return { phases: filteredPhases };
}

function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedProcedures) renderFPList(cachedProcedures);

  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');

  if (left) {
    left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
    left.onclick = null;
  }

  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
    right.onclick = showFPSearchHeader;
  }
}

function showFPSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');

  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  var input = document.getElementById('headerSearchInput');

  if (left) {
    left.innerHTML = '';
    left.onclick = null;
  }

  if (def) def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
    right.onclick = showFPDefaultHeader;
  }
}

function renderContentBlock(item) {
  switch (item.type) {
    case 'action':
      return '<div class="fp-action">' +
        '<span class="fp-action-label">' + escapeHtml(item.label) + '</span>' +
        '<span class="fp-action-dots"></span>' +
        '<span class="fp-action-value">' + escapeHtml(item.value) + '</span>' +
        '</div>';
    case 'action-crew':
      var crewBadge = '';
      if (item.crew === 'C') crewBadge = '<span class="fp-crew-badge">C</span>';
      else if (item.crew === 'F') crewBadge = '<span class="fp-crew-badge">F</span>';
      else if (item.crew === 'CM') crewBadge = '<span class="fp-crew-badge">CM</span>';
      return '<div class="fp-action">' +
        '<span class="fp-action-label">' + escapeHtml(item.label) + '</span>' +
        '<span class="fp-action-dots"></span>' +
        '<span class="fp-action-value">' + escapeHtml(item.value) + '</span>' +
        crewBadge +
        '</div>';
    case 'verify':
      return '<div class="fp-verify">✓ ' + escapeHtml(item.text) + '</div>';
    case 'condition':
      return '<div class="fp-condition"><i>' + escapeHtml(item.text) + '</i></div>';
    case 'note':
      return '<div class="fp-note"><strong>Note:</strong> ' + escapeHtml(item.text) + '</div>';
    case 'caution':
      return '<div class="fp-caution"><strong>CAUTION:</strong> ' + escapeHtml(item.text) + '</div>';
    case 'warning':
      return '<div class="fp-warning"><strong>WARNING:</strong> ' + escapeHtml(item.text) + '</div>';
    case 'tail':
      return '<div class="fp-tail">' + escapeHtml(item.text) + '</div>';
    case 'separator':
      return '<hr class="fp-separator">';
    case 'image':
      var fullSrc = item.fullSrc || item.src;
      return '<img class="fp-photo-thumb" src="' + escapeHtml(item.src) + '" data-full-src="' + escapeHtml(fullSrc) + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
    case 'html':
      return '<div class="fp-html">' + item.html + '</div>';
    default:
      return '';
  }
}

function renderProcedure(proc) {
  var pdfRefHtml = '';
  if (proc.pdfRef) {
    pdfRefHtml = '<button class="fp-pdf-ref" data-pdf="' + escapeHtml(proc.pdfRef.file) + '" data-page="' + (proc.pdfRef.page || 1) + '">' + escapeHtml(proc.pdfRef.label) + '</button>';
  }
  var contentHtml = '';
  if (proc.content && proc.content.length) {
    for (var i = 0; i < proc.content.length; i++) {
      contentHtml += renderContentBlock(proc.content[i]);
    }
  }
  return '<div class="fp-procedure">' +
    '<div class="fp-procedure-header">' +
    '<span class="collapsible-title">' + escapeHtml(proc.title) + '</span>' +
    pdfRefHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-procedure-content">' + contentHtml + '</div>' +
    '</div>';
}

function renderPhase(phase) {
  var timeHtml = phase.time ? '<span class="fp-phase-time">' + escapeHtml(phase.time) + '</span>' : '';
  var proceduresHtml = '';
  for (var i = 0; i < phase.procedures.length; i++) {
    proceduresHtml += renderProcedure(phase.procedures[i]);
  }
  return '<div class="fp-phase">' +
    '<div class="fp-phase-header">' +
    window.ICONS.plane +
    '<span class="collapsible-title">' + escapeHtml(phase.title) + '</span>' +
    timeHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-phase-content">' + proceduresHtml + '</div>' +
    '</div>';
}

function renderFPList(data) {
  var container = document.getElementById('fpContainer');
  if (!container) return;

  if (!data || !data.phases || data.phases.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < data.phases.length; i++) {
    html += renderPhase(data.phases[i]);
  }
  container.innerHTML = html;
}

function initFlightProcedures() {
  renderFPHeader();

  var container = document.getElementById('fpContainer');
  if (!container) {
    console.error('Контейнер fpContainer не найден!');
    return;
  }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.fp-pdf-ref');
      if (pdfBtn) {
        app.openPDFModal(pdfBtn.dataset.pdf, parseInt(pdfBtn.dataset.page) || 1);
        return;
      }
      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) {
        var fpContent = thumb.closest('.fp-procedure-content') || thumb.closest('.fp-phase-content');
        app.openPhotoSwipe(thumb, fpContent);
        return;
      }
      var procHeader = e.target.closest('.fp-procedure-header');
      if (procHeader) {
        procHeader.closest('.fp-procedure').classList.toggle('open');
        return;
      }
      var phaseHeader = e.target.closest('.fp-phase-header');
      if (phaseHeader) {
        phaseHeader.closest('.fp-phase').classList.toggle('open');
        return;
      }
    });
    container.dataset.delegated = 'true';
  }

  if (cachedProcedures) {
    renderFPList(cachedProcedures);
    return;
  }

  app.showSkeleton(container, 'blocks');

  fetch('modules/flightprocedures.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      cachedProcedures = data;
      renderFPList(data);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить лётные процедуры');
    });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
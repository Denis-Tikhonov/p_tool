// modules/flightprocedures.js
var cachedProcedures = null;

function fpFormatText(str) {
  if (!str) return '';
  return str.replace(/\t/g, '\u00a0\u00a0\u00a0\u00a0').replace(/\n/g, '<br>');
}

function renderFPContent(item) {
  switch (item.type) {
    case 'text':
      return '<div class="fp-text">' + fpFormatText(item.text) + '</div>';
    case 'action':
      return '<div class="fp-action"><span class="fp-action-label">' + item.label + '</span><span class="fp-action-dots"></span><span class="fp-action-value">' + item.value + '</span></div>';
    case 'action-crew':
      return '<div class="fp-action"><span class="fp-action-label">' + item.label + '</span><span class="fp-action-dots"></span><span class="fp-action-value">' + item.value + '</span><span class="fp-crew-badge">' + item.crew + '</span></div>';
    case 'verify':
      return '<div class="fp-verify">✓ ' + item.text + '</div>';
    case 'condition':
      return '<div class="fp-condition">' + fpFormatText(item.text) + '</div>';
    case 'note':
      return '<div class="fp-note"><span class="fp-note-icon">📘</span><span>' + fpFormatText(item.text) + '</span></div>';
    case 'caution':
      return '<div class="fp-caution"><span class="fp-caution-icon">⚠️</span><span>' + fpFormatText(item.text) + '</span></div>';
    case 'warning':
      return '<div class="fp-warning"><span class="fp-warning-icon">❗</span><span>' + fpFormatText(item.text) + '</span></div>';
    case 'tail':
      return '<div class="fp-tail">' + item.text + '</div>';
    case 'separator':
      return '<hr class="fp-separator">';
    case 'image':
      return '<img class="fp-photo-thumb" src="' + item.src + '" data-full-src="' + (item.fullSrc || item.src) + '" onerror="this.src=\'icons/android-chrome-192.png\'" loading="lazy">';
    case 'table':
      if (item.content_html) {
        return '<div class="fp-table">' + (item.title ? '<div class="fp-table-title">' + item.title + '</div>' : '') + item.content_html + '</div>';
      } else if (item.src) {
        var placeholderId = 'fp-table-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        setTimeout(function(id, src) {
          fetch(src).then(function(r) { return r.text(); }).then(function(html) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = html;
          }).catch(function() { var el = document.getElementById(id); if (el) el.innerHTML = '<span style="color:var(--color-danger)">Ошибка загрузки таблицы</span>'; });
        }, 0, placeholderId, item.src);
        return '<div class="fp-table">' + (item.title ? '<div class="fp-table-title">' + item.title + '</div>' : '') + '<div id="' + placeholderId + '"><span style="color:var(--color-text-muted);">Загрузка таблицы…</span></div></div>';
      }
      return '';
    default:
      return '';
  }
}

function renderFPProcedure(proc) {
  var pdfRefHtml = '';
  if (proc.pdfRef) {
    pdfRefHtml = '<button class="fp-pdf-ref" data-pdf="' + proc.pdfRef.file + '" data-page="' + (proc.pdfRef.page || 1) + '">' + proc.pdfRef.label + '</button>';
  }
  var contentHtml = '';
  if (proc.content && proc.content.length) {
    for (var i = 0; i < proc.content.length; i++) {
      contentHtml += renderFPContent(proc.content[i]);
    }
  }
  return '<div class="fp-procedure">' +
    '<div class="fp-procedure-header">' +
    '<span class="collapsible-title"><span class="marquee-inner">' + proc.title + '</span></span>' +
    pdfRefHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-procedure-content">' + contentHtml + '</div>' +
    '</div>';
}

function renderFPPhase(phase) {
  var proceduresHtml = '';
  if (phase.procedures && phase.procedures.length) {
    for (var i = 0; i < phase.procedures.length; i++) {
      var p = phase.procedures[i];
      if (p.type === 'section') {
        proceduresHtml += '<div class="fp-section-divider"><span class="fp-section-marker">▸</span><span class="fp-section-label">' + p.label + '</span></div>';
      } else if (p.type === 'text') {
        proceduresHtml += '<div class="fp-text">' + fpFormatText(p.text) + '</div>';
      } else {
        proceduresHtml += renderFPProcedure(p);
      }
    }
  }
  var timeHtml = phase.time ? '<span class="fp-phase-time">' + phase.time + '</span>' : '';
  return '<div class="fp-phase">' +
    '<div class="fp-phase-header">' +
    '<span class="collapsible-title"><span class="marquee-inner">' + phase.title + '</span></span>' +
    timeHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-phase-content">' + proceduresHtml + '</div>' +
    '</div>';
}

function renderFPAll(data) {
  var phases = data.phases || [];
  var html = '';
  for (var i = 0; i < phases.length; i++) {
    var ph = phases[i];
    if (ph.type === 'divider') {
      html += '<div class="fp-phase-divider"><div class="fp-phase-divider-title"><span class="fp-phase-divider-marker">▸</span><span class="fp-phase-divider-label">' + ph.label + '</span></div><hr class="fp-phase-divider-line"></div>';
    } else if (ph.type === 'text') {
      html += '<div class="fp-text fp-text--standalone">' + fpFormatText(ph.text) + '</div>';
    } else if (ph.type === 'time') {
      html += '<div class="fp-time-label"><span class="fp-time-label-icon">⏱️</span><span class="fp-time-label-text">' + ph.time + '</span></div>';
    } else {
      html += renderFPPhase(ph);
    }
  }
  if (!html.trim()) html = '<div class="fp-empty"><div class="fp-empty-icon">' + window.ICONS.plane + '</div><p class="fp-empty-text">Нет данных</p></div>';
  return html;
}

function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedProcedures) {
    var html = renderFPAll(cachedProcedures);
    var container = document.getElementById('fpContainer');
    if (container) { window.app.hideSkeleton(container, html); window.app.initMarquee(container); }
  }
  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  left.innerHTML = '<button class="icon-btn" aria-label="Назад">' + window.ICONS.back + '</button>';
  left.onclick = function() { window.app.navigateTo('main'); };
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showFPSearchHeader;
}

function showFPSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  var input = document.getElementById('headerSearchInput');
  if (def) def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();
  right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
  right.onclick = showFPDefaultHeader;
}

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Лётные процедуры</div>' +
    '<div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      var container = document.getElementById('fpContainer');
      if (!cachedProcedures) return;
      if (query) {
        var lq = query.toLowerCase();
        function matchesPhase(phase) {
          if (phase.title && phase.title.toLowerCase().indexOf(lq) !== -1) return true;
          if (phase.procedures) {
            for (var i = 0; i < phase.procedures.length; i++) {
              var p = phase.procedures[i];
              if (p.title && p.title.toLowerCase().indexOf(lq) !== -1) return true;
              if (p.content) {
                for (var j = 0; j < p.content.length; j++) {
                  var c = p.content[j];
                  if (c.type === 'text' && c.text && c.text.toLowerCase().indexOf(lq) !== -1) return true;
                  if (c.type === 'action' && (c.label.toLowerCase().indexOf(lq) !== -1 || c.value.toLowerCase().indexOf(lq) !== -1)) return true;
                  if (c.type === 'note' && c.text && c.text.toLowerCase().indexOf(lq) !== -1) return true;
                  if (c.type === 'caution' && c.text && c.text.toLowerCase().indexOf(lq) !== -1) return true;
                  if (c.type === 'warning' && c.text && c.text.toLowerCase().indexOf(lq) !== -1) return true;
                  if (c.type === 'verify' && c.text && c.text.toLowerCase().indexOf(lq) !== -1) return true;
                }
              }
            }
          }
          return false;
        }
        var filteredPhases = cachedProcedures.phases.filter(function(ph) {
          if (ph.type === 'divider' || ph.type === 'text' || ph.type === 'time') return false;
          return matchesPhase(ph);
        });
        var filteredData = { phases: filteredPhases };
        var html = renderFPAll(filteredData);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      } else {
        var html = renderFPAll(cachedProcedures);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      }
    });
  }
  showFPDefaultHeader();
}

function initFlightProcedures() {
  renderFPHeader();
  var container = document.getElementById('fpContainer');
  if (!container) { console.error('Контейнер fpContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      if (e.target.closest('.fp-pdf-ref')) {
        var btn = e.target.closest('.fp-pdf-ref');
        window.app.openPDFModal(btn.dataset.pdf, parseInt(btn.dataset.page) || 1);
        return;
      }
      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) {
        var fpContent = thumb.closest('.fp-procedure-content') || thumb.closest('.fp-phase-content');
        window.app.openPhotoSwipe(thumb, fpContent);
        return;
      }
      var procHeader = e.target.closest('.fp-procedure-header');
      if (procHeader) { procHeader.closest('.fp-procedure').classList.toggle('open'); return; }
      var phaseHeader = e.target.closest('.fp-phase-header');
      if (phaseHeader) { phaseHeader.closest('.fp-phase').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }
  window.app.showSkeleton(container, 'blocks');
  fetch('modules/flightprocedures.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      cachedProcedures = data;
      var html = renderFPAll(data);
      window.app.hideSkeleton(container, html);
      window.app.initMarquee(container);
    })
    .catch(function() { window.app.showError(container, 'Не удалось загрузить лётные процедуры'); });
}
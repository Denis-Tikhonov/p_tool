/* modules/flightprocedures.js */
var cachedProcedures = null;

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Лётные процедуры</div>' +
    '<div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', window._fpSearchHandler);
    window._fpSearchHandler = function(e) {
      var query = e.target.value.trim();
      if (!cachedProcedures) return;
      var container = document.getElementById('fpContainer');
      if (!container) return;
      if (query) {
        var lq = query.toLowerCase();
        function matchesPhase(phase) {
          if (phase.type === 'divider') return false;
          if (phase.title.toLowerCase().indexOf(lq) !== -1) return true;
          for (var p = 0; p < phase.procedures.length; p++) {
            var proc = phase.procedures[p];
            if (proc.type === 'section') continue;
            if (proc.title.toLowerCase().indexOf(lq) !== -1) return true;
            if (proc.content) {
              for (var c = 0; c < proc.content.length; c++) {
                var item = proc.content[c];
                if (item.type === 'action' || item.type === 'action-crew') {
                  if ((item.label && item.label.toLowerCase().indexOf(lq) !== -1) ||
                      (item.value && item.value.toLowerCase().indexOf(lq) !== -1)) return true;
                } else if (item.text && item.text.toLowerCase().indexOf(lq) !== -1) return true;
              }
            }
          }
          return false;
        }
        var filtered = cachedProcedures.phases.filter(matchesPhase);
        var html = renderFPList(filtered, true);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      } else {
        var htmlFull = renderFPList(cachedProcedures.phases, false);
        window.app.hideSkeleton(container, htmlFull);
        window.app.initMarquee(container);
      }
    };
    input.addEventListener('input', window._fpSearchHandler);
  }
  showFPDefaultHeader();
}
function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedProcedures) {
    var container = document.getElementById('fpContainer');
    if (container) {
      var html = renderFPList(cachedProcedures.phases, false);
      window.app.hideSkeleton(container, html);
      window.app.initMarquee(container);
    }
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
function renderContentBlock(item) {
  switch (item.type) {
    case 'action':
      return '<div class="fp-action"><span class="fp-action-label">' + item.label + '</span><span class="fp-action-dots"></span><span class="fp-action-value">' + item.value + '</span></div>';
    case 'action-crew':
      var badge = item.crew ? '<span class="fp-crew-badge">' + item.crew + '</span>' : '';
      return '<div class="fp-action">' + (item.label ? '<span class="fp-action-label">' + item.label + '</span>' : '') + '<span class="fp-action-dots"></span><span class="fp-action-value">' + item.value + '</span>' + badge + '</div>';
    case 'verify':
      return '<div class="fp-verify">' + item.text + '</div>';
    case 'condition':
      return '<div class="fp-condition">' + item.text + '</div>';
    case 'note':
      return '<div class="fp-note"><strong>Note:</strong> ' + item.text + '</div>';
    case 'caution':
      return '<div class="fp-caution"><strong>CAUTION:</strong> ' + item.text + '</div>';
    case 'warning':
      return '<div class="fp-warning"><strong>WARNING:</strong> ' + item.text + '</div>';
    case 'tail':
      return '<div class="fp-tail">' + item.text + '</div>';
    case 'separator':
      return '<hr class="fp-separator">';
    case 'image':
      return '<img class="fp-photo-thumb" src="' + item.src + '" data-full-src="' + (item.fullSrc || item.src) + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
    case 'html':
      return '<div class="fp-html">' + item.html + '</div>';
    default: return '';
  }
}
function renderProcedure(proc) {
  var pdfRefHtml = '';
  if (proc.pdfRef) {
    pdfRefHtml = '<button class="fp-pdf-ref" data-pdf="' + proc.pdfRef.file + '" data-page="' + (proc.pdfRef.page || 1) + '">' + proc.pdfRef.label + '</button>';
  }
  var contentHtml = '';
  if (proc.content) {
    for (var i = 0; i < proc.content.length; i++) {
      contentHtml += renderContentBlock(proc.content[i]);
    }
  }
  return '<div class="fp-procedure">' +
    '<div class="fp-procedure-header">' +
    '<span class="collapsible-title"><span class="marquee-inner">' + proc.title + '</span></span>' +
    pdfRefHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-procedure-content">' + contentHtml + '</div></div>';
}
function renderPhase(phase, isSearch) {
  if (phase.type === 'divider') {
    return '<div class="fp-phase-divider">' +
      '<div class="fp-phase-divider-title"><span class="fp-phase-divider-marker">▸</span><span class="fp-phase-divider-label">' + phase.label + '</span></div>' +
      '<hr class="fp-phase-divider-line"></div>';
  }
  var proceduresHtml = '';
  for (var i = 0; i < phase.procedures.length; i++) {
    var proc = phase.procedures[i];
    if (proc.type === 'section') {
      proceduresHtml += '<div class="fp-section-divider"><span class="fp-section-marker">▸</span><span class="fp-section-label">' + proc.label + '</span></div>';
    } else {
      proceduresHtml += renderProcedure(proc);
    }
  }
  var timeHtml = phase.time ? '<span class="fp-phase-time">' + phase.time + '</span>' : '';
  return '<div class="fp-phase">' +
    '<div class="fp-phase-header">' +
    '<span class="collapsible-title"><span class="marquee-inner">' + phase.title + '</span></span>' +
    timeHtml +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="fp-phase-content">' + proceduresHtml + '</div></div>';
}
function renderFPList(phases, isSearch) {
  if (!phases || phases.length === 0) return '<p class="empty-message">' + (isSearch ? 'Ничего не найдено' : 'Нет данных') + '</p>';
  var html = '';
  for (var i = 0; i < phases.length; i++) {
    html += renderPhase(phases[i], isSearch);
  }
  return html;
}
function initFlightProcedures() {
  renderFPHeader();
  var container = document.getElementById('fpContainer');
  if (!container) { console.error('Контейнер fpContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfRef = e.target.closest('.fp-pdf-ref');
      if (pdfRef) { window.app.openPDFModal(pdfRef.dataset.pdf, parseInt(pdfRef.dataset.page) || 1); return; }
      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) { var fpContent = thumb.closest('.fp-procedure-content') || thumb.closest('.fp-phase-content'); window.app.openPhotoSwipe(thumb, fpContent); return; }
      var procHeader = e.target.closest('.fp-procedure-header');
      if (procHeader) { procHeader.closest('.fp-procedure').classList.toggle('open'); return; }
      var phaseHeader = e.target.closest('.fp-phase-header');
      if (phaseHeader) { phaseHeader.closest('.fp-phase').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }
  window.app.showSkeleton(container, 'blocks');
  fetch('modules/flightprocedures.json')
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      cachedProcedures = data;
      var html = renderFPList(data.phases, false);
      window.app.hideSkeleton(container, html);
      window.app.initMarquee(container);
    })
    .catch(function() { window.app.showError(container, 'Не удалось загрузить лётные процедуры'); });
}
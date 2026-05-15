var cachedFP = null;

function initFlightProcedures() {
  renderFPHeader();
  var container = document.getElementById('fpContainer');
  if (!container) { console.error('Контейнер fpContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.fp-pdf-ref');
      if (pdfBtn) { app.openPDFModal(pdfBtn.dataset.pdf, parseInt(pdfBtn.dataset.page) || 1); return; }
      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) { app.openPhotoSwipe(thumb.src, thumb.dataset.fullSrc || thumb.src); return; }
      var procHeader = e.target.closest('.fp-procedure-header');
      if (procHeader) { procHeader.closest('.fp-procedure').classList.toggle('open'); return; }
      var phaseHeader = e.target.closest('.fp-phase-header');
      if (phaseHeader) { phaseHeader.closest('.fp-phase').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }
  app.showSkeleton(container, 'blocks');
  fetch('modules/flightprocedures.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      cachedFP = data.phases || [];
      renderFPList(cachedFP);
      app.hideSkeleton(container, container.innerHTML);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить лётные процедуры');
    });
}

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Лётные процедуры</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', fpSearchHandler);
    input.addEventListener('input', fpSearchHandler);
  }
  showFPDefaultHeader();
}

function fpSearchHandler(e) {
  if (!cachedFP) return;
  var query = e.target.value.trim();
  if (!query) {
    renderFPList(cachedFP);
    return;
  }
  var lower = query.toLowerCase();
  var filteredPhases = [];
  for (var i = 0; i < cachedFP.length; i++) {
    var phase = cachedFP[i];
    var phaseMatch = phase.title.toLowerCase().indexOf(lower) !== -1;
    var filteredProcs = [];
    for (var j = 0; j < phase.procedures.length; j++) {
      var proc = phase.procedures[j];
      var procMatch = proc.title.toLowerCase().indexOf(lower) !== -1;
      var contentMatch = false;
      for (var k = 0; k < proc.content.length; k++) {
        var block = proc.content[k];
        if (block.type === 'action' || block.type === 'action-crew') {
          if ((block.label && block.label.toLowerCase().indexOf(lower) !== -1) || (block.value && block.value.toLowerCase().indexOf(lower) !== -1)) contentMatch = true;
        } else if (block.text && block.text.toLowerCase().indexOf(lower) !== -1) contentMatch = true;
        if (contentMatch) break;
      }
      if (phaseMatch || procMatch || contentMatch) filteredProcs.push(proc);
    }
    if (filteredProcs.length) {
      filteredPhases.push({ title: phase.title, time: phase.time, procedures: filteredProcs, id: phase.id });
    }
  }
  renderFPList(filteredPhases);
}

function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedFP) renderFPList(cachedFP);
  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
  left.onclick = null;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showFPSearchHeader;
}

function showFPSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');
  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  var input = document.getElementById('headerSearchInput');
  left.innerHTML = '';
  left.onclick = null;
  if (def) def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();
  right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
  right.onclick = showFPDefaultHeader;
}

function renderFPList(phases) {
  var container = document.getElementById('fpContainer');
  if (!container) return;
  if (!phases.length) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }
  var html = '';
  for (var p = 0; p < phases.length; p++) {
    var phase = phases[p];
    var timeHtml = phase.time ? '<span class="fp-phase-time">' + phase.time + '</span>' : '';
    var proceduresHtml = '';
    for (var r = 0; r < phase.procedures.length; r++) {
      var proc = phase.procedures[r];
      var pdfRefHtml = '';
      if (proc.pdfRef) {
        pdfRefHtml = '<button class="fp-pdf-ref" data-pdf="' + proc.pdfRef.file + '" data-page="' + (proc.pdfRef.page || 1) + '">' + proc.pdfRef.label + '</button>';
      }
      var contentHtml = '';
      for (var c = 0; c < proc.content.length; c++) {
        var block = proc.content[c];
        contentHtml += renderFPContentBlock(block);
      }
      proceduresHtml += '<div class="fp-procedure"><div class="fp-procedure-header"><span class="collapsible-title">' + proc.title + '</span>' + pdfRefHtml + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span></div><div class="fp-procedure-content">' + contentHtml + '</div></div>';
    }
    html += '<div class="fp-phase"><div class="fp-phase-header"><span>' + window.ICONS.plane + '</span><span class="collapsible-title">' + phase.title + '</span>' + timeHtml + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span></div><div class="fp-phase-content">' + proceduresHtml + '</div></div>';
  }
  container.innerHTML = html;
}

function renderFPContentBlock(block) {
  switch (block.type) {
    case 'action':
      return '<div class="fp-action"><span class="fp-action-label">' + block.label + '</span><span class="fp-action-dots"></span><span class="fp-action-value">' + block.value + '</span></div>';
    case 'action-crew':
      var badge = block.crew === 'C' ? 'C' : (block.crew === 'F' ? 'F' : (block.crew === 'CM' ? 'CM' : ''));
      return '<div class="fp-action"><span class="fp-action-label">' + block.label + '</span><span class="fp-action-dots"></span><span class="fp-action-value">' + block.value + '</span><span class="fp-crew-badge">' + badge + '</span></div>';
    case 'verify':
      return '<div class="fp-verify">✓ ' + block.text + '</div>';
    case 'condition':
      return '<div class="fp-condition">' + block.text + '</div>';
    case 'note':
      return '<div class="fp-note"><strong>Note:</strong> ' + block.text + '</div>';
    case 'caution':
      return '<div class="fp-caution"><strong>CAUTION:</strong> ' + block.text + '</div>';
    case 'warning':
      return '<div class="fp-warning"><strong>WARNING:</strong> ' + block.text + '</div>';
    case 'tail':
      return '<div class="fp-tail">' + block.text + '</div>';
    case 'separator':
      return '<hr class="fp-separator">';
    case 'image':
      return '<img class="fp-photo-thumb" src="' + block.src + '" data-full-src="' + (block.fullSrc || block.src) + '" onerror="this.src=\'icon-192.png\'">';
    case 'html':
      return '<div class="fp-html">' + block.html + '</div>';
    default:
      return '';
  }
}

window.initFlightProcedures = initFlightProcedures;
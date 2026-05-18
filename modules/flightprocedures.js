var cachedProcedures = null;

function initFlightProcedures() {
  renderFPHeader();

  var container = document.getElementById('fpContainer');
  if (!container) { console.error('Контейнер fpContainer не найден!'); return; }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.fp-pdf-ref');
      if (pdfBtn) {
        var page = parseInt(pdfBtn.dataset.page, 10) || 1;
        window.app.openPDFModal(pdfBtn.dataset.pdf, page);
        return;
      }

      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) {
        var fpContent = thumb.closest('.fp-procedure-content') || thumb.closest('.fp-phase-content');
        window.app.openPhotoSwipe(thumb, fpContent);
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

  window.app.showSkeleton(container, 'blocks');

  fetch('modules/flightprocedures.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (data && Array.isArray(data.phases)) {
        cachedProcedures = data.phases.slice();
        renderFPList(cachedProcedures);
      } else {
        throw new Error('Invalid data format');
      }
    })
    .catch(function() {
      window.app.showError(container, 'Не удалось загрузить лётные процедуры');
    });
}

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = `
    <div class="hc-default">Лётные процедуры</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input && !input.dataset.fpSearchListener) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      if (!cachedProcedures) return;
      var filtered = query ? filterFPhases(cachedProcedures, query) : cachedProcedures;
      renderFPList(filtered);
    });
    input.dataset.fpSearchListener = 'true';
  }

  showFPDefaultHeader();
}

function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedProcedures) renderFPList(cachedProcedures);

  var left   = document.getElementById('headerLeft');
  var right  = document.getElementById('headerRight');
  var def    = document.querySelector('.hc-default');
  var srch   = document.querySelector('.hc-search');

  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">'
    + window.ICONS.back + '</button>';
  left.onclick = null;

  if (def)  def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showFPSearchHeader;
}

function showFPSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');

  var left   = document.getElementById('headerLeft');
  var right  = document.getElementById('headerRight');
  var def    = document.querySelector('.hc-default');
  var srch   = document.querySelector('.hc-search');
  var input  = document.getElementById('headerSearchInput');

  left.innerHTML = '';
  left.onclick = null;

  if (def)  def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();

  right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
  right.onclick = showFPDefaultHeader;
}

function filterFPhases(phases, query) {
  var lowerQuery = query.toLowerCase();
  var result = [];
  for (var i = 0; i < phases.length; i++) {
    var phase = phases[i];
    var phaseMatches = (phase.title && phase.title.toLowerCase().indexOf(lowerQuery) !== -1);
    var proceduresCopy = [];
    if (phase.procedures) {
      for (var j = 0; j < phase.procedures.length; j++) {
        var proc = phase.procedures[j];
        var procMatches = (proc.title && proc.title.toLowerCase().indexOf(lowerQuery) !== -1);
        var contentMatches = false;
        if (proc.content) {
          for (var k = 0; k < proc.content.length; k++) {
            var item = proc.content[k];
            if (item.type === 'action') {
              if ((item.label && item.label.toLowerCase().indexOf(lowerQuery) !== -1) ||
                  (item.value && item.value.toLowerCase().indexOf(lowerQuery) !== -1)) {
                contentMatches = true;
                break;
              }
            } else if (item.type === 'action-crew') {
              if ((item.label && item.label.toLowerCase().indexOf(lowerQuery) !== -1) ||
                  (item.value && item.value.toLowerCase().indexOf(lowerQuery) !== -1)) {
                contentMatches = true;
                break;
              }
            } else if (item.type === 'note' || item.type === 'caution' || item.type === 'warning' || item.type === 'verify') {
              if (item.text && item.text.toLowerCase().indexOf(lowerQuery) !== -1) {
                contentMatches = true;
                break;
              }
            } else if (item.type === 'condition') {
              if (item.text && item.text.toLowerCase().indexOf(lowerQuery) !== -1) {
                contentMatches = true;
                break;
              }
            }
          }
        }
        if (phaseMatches || procMatches || contentMatches) {
          proceduresCopy.push(proc);
        }
      }
    }
    if (phaseMatches || proceduresCopy.length > 0) {
      result.push({
        id: phase.id,
        title: phase.title,
        time: phase.time,
        procedures: proceduresCopy.length > 0 ? proceduresCopy : (phaseMatches ? phase.procedures : [])
      });
    }
  }
  return result;
}

function renderFPList(phases) {
  var container = document.getElementById('fpContainer');
  if (!container) return;

  if (!phases || phases.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < phases.length; i++) {
    var phase = phases[i];
    var phaseTimeHtml = phase.time ? '<span class="fp-phase-time">' + phase.time + '</span>' : '';
    var proceduresHtml = '';
    if (phase.procedures) {
      for (var j = 0; j < phase.procedures.length; j++) {
        var proc = phase.procedures[j];
        var pdfRefHtml = '';
        if (proc.pdfRef) {
          pdfRefHtml = '<button class="fp-pdf-ref" data-pdf="' + proc.pdfRef.file + '" data-page="' + (proc.pdfRef.page || 1) + '">'
            + proc.pdfRef.label + '</button>';
        }
        var contentHtml = '';
        if (proc.content) {
          for (var k = 0; k < proc.content.length; k++) {
            var item = proc.content[k];
            if (item.type === 'action') {
              contentHtml += '<div class="fp-action">'
                + '<span class="fp-action-label">' + (item.label || '') + '</span>'
                + '<span class="fp-action-dots"></span>'
                + '<span class="fp-action-value">' + (item.value || '') + '</span>'
                + '</div>';
            } else if (item.type === 'action-crew') {
              contentHtml += '<div class="fp-action">'
                + '<span class="fp-action-label">' + (item.label || '') + '</span>'
                + '<span class="fp-action-dots"></span>'
                + '<span class="fp-action-value">' + (item.value || '') + '</span>'
                + '<span class="fp-crew-badge">' + (item.crew || '') + '</span>'
                + '</div>';
            } else if (item.type === 'verify') {
              contentHtml += '<div class="fp-verify">' + (item.text || '') + '</div>';
            } else if (item.type === 'condition') {
              contentHtml += '<div class="fp-condition">' + (item.text || '') + '</div>';
            } else if (item.type === 'note') {
              contentHtml += '<div class="fp-note"><strong>Note:</strong> ' + (item.text || '') + '</div>';
            } else if (item.type === 'caution') {
              contentHtml += '<div class="fp-caution"><strong>CAUTION:</strong> ' + (item.text || '') + '</div>';
            } else if (item.type === 'warning') {
              contentHtml += '<div class="fp-warning"><strong>WARNING:</strong> ' + (item.text || '') + '</div>';
            } else if (item.type === 'tail') {
              contentHtml += '<div class="fp-tail">' + (item.text || '') + '</div>';
            } else if (item.type === 'separator') {
              contentHtml += '<hr class="fp-separator">';
            } else if (item.type === 'image') {
              var fullSrc = item.fullSrc || item.src;
              contentHtml += '<img class="fp-photo-thumb" src="' + item.src + '" data-full-src="' + fullSrc + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
            } else if (item.type === 'html') {
              contentHtml += '<div class="fp-html">' + (item.html || '') + '</div>';
            }
          }
        }
        proceduresHtml += '<div class="fp-procedure">'
          + '<div class="fp-procedure-header">'
          + '<span class="collapsible-title"><span class="marquee-inner">' + (proc.title || '') + '</span></span>'
          + pdfRefHtml
          + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
          + '</div>'
          + '<div class="fp-procedure-content">' + contentHtml + '</div>'
          + '</div>';
      }
    }
    html += '<div class="fp-phase">'
      + '<div class="fp-phase-header">'
      + '<span class="collapsible-title"><span class="marquee-inner">' + (phase.title || '') + '</span></span>'
      + phaseTimeHtml
      + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
      + '</div>'
      + '<div class="fp-phase-content">' + proceduresHtml + '</div>'
      + '</div>';
  }
  container.innerHTML = html;
  window.app.initMarquee(container);
}
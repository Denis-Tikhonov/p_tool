/* ═══════════════════════════════════════════
   МОДУЛЬ: Лётные процедуры (Flight Procedures)
   ═══════════════════════════════════════════ */

var cachedProcedures = null;
var fpHeaderInputListener = null;

/* ─── Поиск ─── */

function matchesContentSearch(item, query) {
  if (!item) return false;
  var t = item.type;
  if (t === 'action' || t === 'action-crew') {
    if (item.label && item.label.toLowerCase().indexOf(query) !== -1) return true;
    if (item.value && item.value.toLowerCase().indexOf(query) !== -1) return true;
    return false;
  }
  if (t === 'verify' || t === 'condition' || t === 'note'
      || t === 'caution' || t === 'warning' || t === 'tail') {
    return item.text && item.text.toLowerCase().indexOf(query) !== -1;
  }
  if (t === 'html') {
    return item.content && item.content.toLowerCase().indexOf(query) !== -1;
  }
  return false;
}

function matchesProcedureSearch(proc, query) {
  if (proc.title && proc.title.toLowerCase().indexOf(query) !== -1) return true;
  if (!proc.content) return false;
  for (var i = 0; i < proc.content.length; i++) {
    if (matchesContentSearch(proc.content[i], query)) return true;
  }
  return false;
}

function matchesPhaseSearch(phase, query) {
  if (phase.title && phase.title.toLowerCase().indexOf(query) !== -1) return true;
  if (!phase.procedures) return false;
  for (var i = 0; i < phase.procedures.length; i++) {
    if (matchesProcedureSearch(phase.procedures[i], query)) return true;
  }
  return false;
}

/* ─── Рендеринг контент-блоков ─── */

function renderContentItem(item) {
  switch (item.type) {
    case 'action': {
      return '<div class="fp-action">'
        + '<span class="fp-action-label">' + item.label + '</span>'
        + '<span class="fp-action-dots"></span>'
        + '<span class="fp-action-value">' + item.value + '</span>'
        + '</div>';
    }
    case 'action-crew': {
      return '<div class="fp-action">'
        + '<span class="fp-action-label">' + item.label + '</span>'
        + '<span class="fp-action-dots"></span>'
        + '<span class="fp-action-value">' + item.value + '</span>'
        + '<span class="fp-crew-badge">' + item.crew + '</span>'
        + '</div>';
    }
    case 'verify': {
      return '<div class="fp-verify">' + item.text + '</div>';
    }
    case 'condition': {
      return '<div class="fp-condition">' + item.text + '</div>';
    }
    case 'note': {
      return '<div class="fp-note">' + item.text + '</div>';
    }
    case 'caution': {
      return '<div class="fp-caution">' + item.text + '</div>';
    }
    case 'warning': {
      return '<div class="fp-warning">' + item.text + '</div>';
    }
    case 'tail': {
      return '<div class="fp-tail">' + item.text + '</div>';
    }
    case 'separator': {
      return '<hr class="fp-separator">';
    }
    case 'image': {
      return '<img class="fp-photo-thumb"'
        + ' src="' + item.src + '"'
        + ' data-full-src="' + (item.fullSrc || item.src) + '"'
        + ' data-gallery="1"'
        + ' onerror="this.src=\'icon-192.png\'"'
        + ' loading="lazy">';
    }
    case 'html': {
      return '<div class="fp-html">' + item.content + '</div>';
    }
    default:
      return '';
  }
}

/* ─── Рендеринг процедур ─── */

function renderProcedure(proc) {
  var pdfRefHtml = '';
  if (proc.pdfRef) {
    pdfRefHtml = '<button class="fp-pdf-ref"'
      + ' data-pdf="' + proc.pdfRef.file + '"'
      + ' data-page="' + (proc.pdfRef.page || 1) + '">'
      + proc.pdfRef.label
      + '</button>';
  }

  var contentHtml = '';
  if (proc.content) {
    for (var i = 0; i < proc.content.length; i++) {
      contentHtml += renderContentItem(proc.content[i]);
    }
  }

  return '<div class="fp-procedure">'
    + '<div class="fp-procedure-header">'
    + '<span class="collapsible-title">' + proc.title + '</span>'
    + pdfRefHtml
    + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
    + '</div>'
    + '<div class="fp-procedure-content">'
    + contentHtml
    + '</div>'
    + '</div>';
}

/* ─── Рендеринг фаз ─── */

function renderPhase(phase) {
  var phaseIcon = window.ICONS.plane || '';
  var timeHtml = phase.time
    ? '<span class="fp-phase-time">' + phase.time + '</span>'
    : '';

  var proceduresHtml = '';
  if (phase.procedures) {
    for (var i = 0; i < phase.procedures.length; i++) {
      proceduresHtml += renderProcedure(phase.procedures[i]);
    }
  }

  return '<div class="fp-phase">'
    + '<div class="fp-phase-header">'
    + phaseIcon
    + '<span class="collapsible-title">' + phase.title + '</span>'
    + timeHtml
    + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
    + '</div>'
    + '<div class="fp-phase-content">'
    + proceduresHtml
    + '</div>'
    + '</div>';
}

/* ─── Рендеринг всех фаз (с фильтрацией или без) ─── */

function renderAllPhases(phases, query) {
  if (!phases || phases.length === 0) {
    return '<p class="empty-message">\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E</p>';
  }

  var html = '';
  for (var i = 0; i < phases.length; i++) {
    var phase = phases[i];
    if (query) {
      if (!matchesPhaseSearch(phase, query)) continue;
      /* Clone phase with filtered procedures */
      var filteredPhase = {
        id: phase.id,
        title: phase.title,
        time: phase.time,
        procedures: []
      };
      for (var j = 0; j < phase.procedures.length; j++) {
        if (matchesProcedureSearch(phase.procedures[j], query)) {
          filteredPhase.procedures.push(phase.procedures[j]);
        }
      }
      html += renderPhase(filteredPhase);
    } else {
      html += renderPhase(phase);
    }
  }

  if (!html) {
    return '<p class="empty-message">\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E</p>';
  }

  return html;
}

/* ─── Хедер ─── */

function renderFPHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;

  center.innerHTML = '<div class="hc-default">\u041B\u0451\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u044B</div>'
    + '<div class="hc-search">'
    + '<input type="search" id="headerSearchInput"'
    + ' placeholder="\u041F\u043E\u0438\u0441\u043A..." autocomplete="off">'
    + '</div>';

  var input = document.getElementById('headerSearchInput');
  if (input && !fpHeaderInputListener) {
    fpHeaderInputListener = function(e) {
      var query = e.target.value.trim().toLowerCase();
      if (!cachedProcedures) return;
      var container = document.getElementById('fpContainer');
      if (!container) return;
      if (!query) {
        container.innerHTML = renderAllPhases(cachedProcedures.phases, '');
        return;
      }
      container.innerHTML = renderAllPhases(cachedProcedures.phases, query);
    };
    input.addEventListener('input', fpHeaderInputListener);
  }

  showFPDefaultHeader();
}

function showFPDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';

  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');

  if (left) {
    left.innerHTML = '<button class="icon-btn" aria-label="\u041D\u0430\u0437\u0430\u0434"'
      + ' onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
    left.onclick = null;
  }

  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="\u041F\u043E\u0438\u0441\u043A">'
      + window.ICONS.search + '</button>';
    right.onclick = showFPSearchHeader;
  }

  if (cachedProcedures) {
    var container = document.getElementById('fpContainer');
    if (container) container.innerHTML = renderAllPhases(cachedProcedures.phases, '');
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
    right.innerHTML = '<button class="icon-btn" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">'
      + window.ICONS.close + '</button>';
    right.onclick = showFPDefaultHeader;
  }
}

/* ─── Инициализация ─── */

function initFlightProcedures() {
  renderFPHeader();

  var container = document.getElementById('fpContainer');
  if (!container) {
    console.error('\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 fpContainer \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D!');
    return;
  }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      /* 1. PDF-ссылка — не раскрывать процедуру */
      var pdfRef = e.target.closest('.fp-pdf-ref');
      if (pdfRef) {
        window.app.openPDFModal(pdfRef.dataset.pdf, parseInt(pdfRef.dataset.page) || 1);
        return;
      }

      /* 2. Фото — не раскрывать процедуру */
      var thumb = e.target.closest('.fp-photo-thumb');
      if (thumb) {
        var fpContent = thumb.closest('.fp-procedure-content')
          || thumb.closest('.fp-phase-content');
        window.app.openPhotoSwipe(thumb, fpContent);
        return;
      }

      /* 3. Процедура — toggle */
      var procHeader = e.target.closest('.fp-procedure-header');
      if (procHeader) {
        procHeader.closest('.fp-procedure').classList.toggle('open');
        return;
      }

      /* 4. Фаза — toggle */
      var phaseHeader = e.target.closest('.fp-phase-header');
      if (phaseHeader) {
        phaseHeader.closest('.fp-phase').classList.toggle('open');
      }
    });
    container.dataset.delegated = 'true';
  }

  if (cachedProcedures) {
    container.innerHTML = renderAllPhases(cachedProcedures.phases, '');
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
      var html = renderAllPhases(data.phases, '');
      app.hideSkeleton(container, html);
    })
    .catch(function() {
      app.showError(container, '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043B\u0451\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u044B');
    });
}

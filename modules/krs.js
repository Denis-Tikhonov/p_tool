/* ═══════════════════════════════════════════
   МОДУЛЬ: Указания КРС (KRS)
   ═══════════════════════════════════════════ */

var cachedInstructions = null;
var krsHeaderInputListener = null;

function getAgeBadge(dateStr) {
  var years = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365));
  if (years < 1) {
    return '<span class="krs-age-badge krs-age-badge--new" style="color:var(--color-badge-new, #00B050);">new</span>';
  }
  if (years <= 3) {
    return '<span class="krs-age-badge krs-age-badge--medium" style="color:var(--color-badge-medium, #ED7D31);">1-3y</span>';
  }
  return '<span class="krs-age-badge krs-age-badge--old" style="color:var(--color-badge-old, #CD202C);">3y+</span>';
}

function extractFilename(path) {
  if (!path) return '';
  var parts = path.split('/');
  return parts[parts.length - 1] || '';
}

function renderKRSList(instructions) {
  if (!instructions || instructions.length === 0) {
    return '<p class="empty-message">\u041D\u0435\u0442 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0443\u043A\u0430\u0437\u0430\u043D\u0438\u0439</p>';
  }

  var sorted = instructions.slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i];
    var ageBadge = getAgeBadge(item.date);
    var dateFormatted = new Date(item.date).toLocaleDateString('ru-RU');

    var picsHtml = '';
    if (item.pics && Array.isArray(item.pics)) {
      for (var p = 0; p < item.pics.length; p++) {
        picsHtml += '<img class="krs-photo-thumb" src="' + item.pics[p]
          + '" data-full-src="' + item.pics[p]
          + '" data-gallery="1" onerror="this.src=\'icon-192.png\'">';
      }
    } else if (item.pic) {
      picsHtml = '<img class="krs-photo-thumb" src="' + item.pic
        + '" data-full-src="' + item.pic
        + '" data-gallery="1" onerror="this.src=\'icon-192.png\'">';
    }

    var pdfsHtml = '';
    if (item.pdfs && Array.isArray(item.pdfs)) {
      for (var d = 0; d < item.pdfs.length; d++) {
        var pdfName = extractFilename(item.pdfs[d]);
        pdfsHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdfs[d] + '">'
          + window.ICONS['file-text'] + ' ' + pdfName + '</button>';
      }
    } else if (item.pdf) {
      pdfsHtml = '<button class="krs-pdf-btn" data-pdf="' + item.pdf + '">'
        + window.ICONS['file-text'] + ' \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B PDF</button>';
    }

    html += '<div class="krs-block">'
      + '<div class="krs-block-header">'
      + ageBadge
      + '<span class="collapsible-title">' + item.title + '</span>'
      + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
      + '</div>'
      + '<div class="krs-block-content">'
      + '<div class="krs-doc-id">' + dateFormatted + ' | ' + item.name + '</div>'
      + '<p style="white-space:pre-wrap;">' + item.text + '</p>'
      + picsHtml
      + pdfsHtml
      + '</div>'
      + '</div>';
  }

  return html;
}

function renderKRSHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;

  center.innerHTML = '<div class="hc-default">\u0423\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u041A\u0420\u0421</div>'
    + '<div class="hc-search">'
    + '<input type="search" id="headerSearchInput"'
    + ' placeholder="\u041F\u043E\u0438\u0441\u043A..." autocomplete="off">'
    + '</div>';

  var input = document.getElementById('headerSearchInput');
  if (input && !krsHeaderInputListener) {
    krsHeaderInputListener = function(e) {
      var query = e.target.value.trim().toLowerCase();
      if (!cachedInstructions) return;
      if (!query) {
        app.hideSkeleton(document.getElementById('krsContainer'), renderKRSList(cachedInstructions));
        return;
      }
      var filtered = cachedInstructions.filter(function(item) {
        return item.title.toLowerCase().indexOf(query) !== -1
          || item.text.toLowerCase().indexOf(query) !== -1;
      });
      app.hideSkeleton(document.getElementById('krsContainer'), renderKRSList(filtered));
    };
    input.addEventListener('input', krsHeaderInputListener);
  }

  showKRSDefaultHeader();
}

function showKRSDefaultHeader() {
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
    right.onclick = showKRSSearchHeader;
  }

  if (cachedInstructions) {
    var container = document.getElementById('krsContainer');
    if (container) container.innerHTML = renderKRSList(cachedInstructions);
  }
}

function showKRSSearchHeader() {
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
    right.onclick = showKRSDefaultHeader;
  }
}

function initKRS() {
  renderKRSHeader();

  var container = document.getElementById('krsContainer');
  if (!container) {
    console.error('\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 krsContainer \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D!');
    return;
  }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.krs-pdf-btn');
      if (pdfBtn) {
        window.app.openPDFModal(pdfBtn.dataset.pdf, 1);
        return;
      }

      var thumb = e.target.closest('.krs-photo-thumb');
      if (thumb) {
        var krsContent = thumb.closest('.krs-block-content');
        window.app.openPhotoSwipe(thumb, krsContent);
        return;
      }

      var header = e.target.closest('.krs-block-header');
      if (header) {
        header.closest('.krs-block').classList.toggle('open');
      }
    });
    container.dataset.delegated = 'true';
  }

  if (cachedInstructions) {
    container.innerHTML = renderKRSList(cachedInstructions);
    return;
  }

  app.showSkeleton(container, 'blocks');

  fetch('modules/krs.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      cachedInstructions = data.instructions || [];
      var html = renderKRSList(cachedInstructions);
      app.hideSkeleton(container, html);
    })
    .catch(function() {
      app.showError(container, '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0443\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u041A\u0420\u0421');
    });
}

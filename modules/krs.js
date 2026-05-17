// modules/krs.js – Указания КРС (согласно 6_MODULE_KRS.txt)
var cachedInstructions = null;

function renderKRSHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `
    <div class="hc-default">Указания КРС</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', krsSearchHandler);
    input.addEventListener('input', krsSearchHandler);
  }

  showKRSDefaultHeader();
}

function krsSearchHandler(e) {
  var query = e.target.value.trim();
  if (!cachedInstructions) return;
  var filtered = query ? cachedInstructions.filter(function(i) { return matchesKRSQuery(i, query); }) : cachedInstructions;
  renderKRSList(filtered);
}

function matchesKRSQuery(item, query) {
  var lower = query.toLowerCase();
  return (item.title && item.title.toLowerCase().indexOf(lower) !== -1) ||
         (item.text && item.text.toLowerCase().indexOf(lower) !== -1);
}

function showKRSDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedInstructions) renderKRSList(cachedInstructions);

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
    right.onclick = showKRSSearchHeader;
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
    right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
    right.onclick = showKRSDefaultHeader;
  }
}

function getAgeBadge(dateStr) {
  var years = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 365));
  if (years < 1) return '<span class="krs-age-badge krs-age-badge--new">Новый</span>';
  if (years <= 3) return '<span class="krs-age-badge krs-age-badge--mid">Средний</span>';
  return '<span class="krs-age-badge krs-age-badge--old">Старый</span>';
}

function renderKRSList(instructions) {
  var container = document.getElementById('krsContainer');
  if (!container) return;

  if (!instructions || instructions.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var sorted = instructions.slice();
  sorted.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i];
    var dateFormatted = new Date(item.date).toLocaleDateString('ru-RU');
    var ageBadge = getAgeBadge(item.date);

    var contentHtml = '<div class="krs-block-content">' +
      '<div class="krs-meta"><span class="krs-doc-id">от ' + dateFormatted + '</span><span class="krs-author">Автор: ' + escapeHtml(item.name) + '</span></div>' +
      '<div class="krs-text">' + escapeHtml(item.text).replace(/\n/g, '<br>') + '</div>';

    if (item.pic) {
      contentHtml += '<img class="krs-photo-thumb" src="' + escapeHtml(item.pic) + '" data-full-src="' + escapeHtml(item.pic) + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
    }
    if (item.pics && item.pics.length) {
      for (var p = 0; p < item.pics.length; p++) {
        contentHtml += '<img class="krs-photo-thumb" src="' + escapeHtml(item.pics[p]) + '" data-full-src="' + escapeHtml(item.pics[p]) + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
      }
    }
    if (item.pdf) {
      contentHtml += '<button class="krs-pdf-btn" data-pdf="' + escapeHtml(item.pdf) + '">📄 Открыть оригинал PDF</button>';
    }
    if (item.pdfs && item.pdfs.length) {
      for (var pf = 0; pf < item.pdfs.length; pf++) {
        var filename = item.pdfs[pf].split('/').pop();
        contentHtml += '<button class="krs-pdf-btn" data-pdf="' + escapeHtml(item.pdfs[pf]) + '">📄 ' + escapeHtml(filename) + '</button>';
      }
    }

    contentHtml += '</div>';

    html += '<div class="krs-block">' +
      '<div class="krs-block-header">' +
      ageBadge +
      '<span class="collapsible-title">' + escapeHtml(item.title) + '</span>' +
      '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
      '</div>' +
      contentHtml +
      '</div>';
  }
  container.innerHTML = html;
}

function initKRS() {
  renderKRSHeader();

  var container = document.getElementById('krsContainer');
  if (!container) {
    console.error('Контейнер krsContainer не найден!');
    return;
  }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.krs-pdf-btn');
      if (pdfBtn) {
        app.openPDFModal(pdfBtn.dataset.pdf, 1);
        return;
      }
      var thumb = e.target.closest('.krs-photo-thumb');
      if (thumb) {
        var krsContent = thumb.closest('.krs-block-content');
        app.openPhotoSwipe(thumb, krsContent);
        return;
      }
      var header = e.target.closest('.krs-block-header');
      if (header) {
        header.closest('.krs-block').classList.toggle('open');
        return;
      }
    });
    container.dataset.delegated = 'true';
  }

  if (cachedInstructions) {
    renderKRSList(cachedInstructions);
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
      renderKRSList(cachedInstructions);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить указания КРС');
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
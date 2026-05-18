var cachedInstructions = null;

function initKRS() {
  renderKRSHeader();

  var container = document.getElementById('krsContainer');
  if (!container) { console.error('Контейнер krsContainer не найден!'); return; }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.krs-pdf-btn');
      if (pdfBtn) { window.app.openPDFModal(pdfBtn.dataset.pdf, 1); return; }

      var thumb = e.target.closest('.krs-photo-thumb');
      if (thumb) {
        var krsContent = thumb.closest('.krs-block-content');
        window.app.openPhotoSwipe(thumb, krsContent);
        return;
      }

      var header = e.target.closest('.krs-block-header');
      if (header) { header.closest('.krs-block').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }

  if (cachedInstructions) {
    renderKRSList(cachedInstructions);
    return;
  }

  window.app.showSkeleton(container, 'blocks');

  fetch('modules/krs.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (data && Array.isArray(data.instructions)) {
        cachedInstructions = data.instructions.slice();
        cachedInstructions.sort(function(a, b) {
          return new Date(b.date) - new Date(a.date);
        });
        renderKRSList(cachedInstructions);
      } else {
        throw new Error('Invalid data format');
      }
    })
    .catch(function() {
      window.app.showError(container, 'Не удалось загрузить указания КРС');
    });
}

function renderKRSHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = `
    <div class="hc-default">Указания КРС</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input && !input.dataset.krsSearchListener) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      if (!cachedInstructions) return;
      var filtered = query
        ? cachedInstructions.filter(function(item) { return matchesKRSQuery(item, query); })
        : cachedInstructions;
      renderKRSList(filtered);
    });
    input.dataset.krsSearchListener = 'true';
  }

  showKRSDefaultHeader();
}

function showKRSDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedInstructions) renderKRSList(cachedInstructions);

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
  right.onclick = showKRSSearchHeader;
}

function showKRSSearchHeader() {
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
  right.onclick = showKRSDefaultHeader;
}

function getAgeBadge(dateStr) {
  var years = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 365));
  if (years < 1)  return '<span class="krs-age-badge krs-age-badge--new">Новый</span>';
  if (years <= 3) return '<span class="krs-age-badge krs-age-badge--mid">Средний</span>';
  return '<span class="krs-age-badge krs-age-badge--old">Старый</span>';
}

function matchesKRSQuery(item, query) {
  var lowerQuery = query.toLowerCase();
  if (item.title && item.title.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  if (item.text && item.text.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  return false;
}

function renderKRSList(instructions) {
  var container = document.getElementById('krsContainer');
  if (!container) return;

  if (!instructions || instructions.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < instructions.length; i++) {
    var item = instructions[i];
    var dateFormatted = new Date(item.date).toLocaleDateString('ru-RU');
    var ageBadge = getAgeBadge(item.date);

    var contentHtml = '<div class="krs-block-content">'
      + '<div class="krs-doc-id">Дата: ' + dateFormatted + '</div>'
      + '<div><strong>Автор:</strong> ' + (item.name || '—') + '</div>'
      + '<div style="white-space: pre-wrap; margin-top: 8px;">' + (item.text || '') + '</div>';

    if (item.pic) {
      contentHtml += '<img class="krs-photo-thumb" src="' + item.pic + '" data-full-src="' + item.pic + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
    }
    if (item.pics && Array.isArray(item.pics)) {
      for (var p = 0; p < item.pics.length; p++) {
        contentHtml += '<img class="krs-photo-thumb" src="' + item.pics[p] + '" data-full-src="' + item.pics[p] + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
      }
    }
    if (item.pdf) {
      contentHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdf + '">📄 Открыть оригинал PDF</button>';
    }
    if (item.pdfs && Array.isArray(item.pdfs)) {
      for (var pdfIdx = 0; pdfIdx < item.pdfs.length; pdfIdx++) {
        var fileName = item.pdfs[pdfIdx].split('/').pop();
        contentHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdfs[pdfIdx] + '">📄 ' + fileName + '</button>';
      }
    }

    contentHtml += '</div>';

    html += '<div class="krs-block">'
      + '<div class="krs-block-header">'
      + ageBadge
      + '<span class="collapsible-title"><span class="marquee-inner">' + (item.title || '') + '</span></span>'
      + '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>'
      + '</div>'
      + contentHtml
      + '</div>';
  }
  container.innerHTML = html;
  window.app.initMarquee(container);
}
// modules/krs.js
var cachedInstructions = null;

function getAgeBadge(dateStr) {
  var years = Math.floor((Date.now() - new Date(dateStr)) / (1000*60*60*24*365));
  if (years < 1) return '<span class="krs-age-badge krs-age-badge--new">Новый</span>';
  if (years <= 3) return '<span class="krs-age-badge krs-age-badge--mid">Средний</span>';
  return '<span class="krs-age-badge krs-age-badge--old">Старый</span>';
}

function renderDivider(item) {
  var label = item.label ? '<span class="list-divider-label">' + item.label + '</span>' : '';
  return '<div class="list-divider">' + label + '</div>';
}

function renderKRSBlock(item) {
  var badge = getAgeBadge(item.date);
  var dateStr = new Date(item.date).toLocaleDateString('ru-RU');
  var authorHtml = item.name ? '<span class="krs-meta-author">Автор: ' + item.name + '</span>' : '';
  var textHtml = item.text ? '<div class="krs-text">' + item.text.replace(/\n/g, '<br>') + '</div>' : '';
  var pdfsHtml = '';
  if (item.pdf) {
    pdfsHtml = '<div class="krs-pdfs"><button class="krs-pdf-btn" data-pdf="' + item.pdf + '">📄 Открыть оригинал PDF</button></div>';
  } else if (item.pdfs && item.pdfs.length) {
    pdfsHtml = '<div class="krs-pdfs">';
    for (var i = 0; i < item.pdfs.length; i++) {
      var name = item.pdfs[i].split('/').pop();
      pdfsHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdfs[i] + '">📄 ' + name + '</button>';
    }
    pdfsHtml += '</div>';
  }
  var picsHtml = '';
  if (item.pic) {
    picsHtml = '<img class="krs-photo-thumb" src="' + item.pic + '" data-full-src="' + item.pic + '" onerror="this.src=\'icons/android-chrome-192.png\'" loading="lazy">';
  } else if (item.pics && item.pics.length) {
    picsHtml = '';
    for (var j = 0; j < item.pics.length; j++) {
      picsHtml += '<img class="krs-photo-thumb" src="' + item.pics[j] + '" data-full-src="' + item.pics[j] + '" onerror="this.src=\'icons/android-chrome-192.png\'" loading="lazy">';
    }
  }
  return '<div class="krs-block">' +
    '<div class="krs-block-header">' +
    badge +
    '<span class="collapsible-title"><span class="marquee-inner">' + item.title + '</span></span>' +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="krs-block-content">' +
    '<div class="krs-meta"><span class="krs-meta-date">' + dateStr + '</span>' + (item.name ? '<span class="krs-meta-separator">•</span>' + authorHtml : '') + '</div>' +
    textHtml +
    pdfsHtml +
    picsHtml +
    '</div></div>';
}

function renderKRSList(arr, isSearch) {
  var list = arr.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.type === 'divider') {
      if (!isSearch) html += renderDivider(item);
      continue;
    }
    html += renderKRSBlock(item);
  }
  if (!html.trim()) html = '<p class="empty-message">' + (isSearch ? 'Ничего не найдено' : 'Нет актуальных указаний') + '</p>';
  return html;
}

function showKRSDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedInstructions) {
    var html = renderKRSList(cachedInstructions, false);
    var container = document.getElementById('krsContainer');
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
  right.onclick = showKRSSearchHeader;
}

function showKRSSearchHeader() {
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
  right.onclick = showKRSDefaultHeader;
}

function renderKRSHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Указания КРС</div>' +
    '<div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      var container = document.getElementById('krsContainer');
      if (!cachedInstructions) return;
      if (query) {
        var lq = query.toLowerCase();
        var filtered = cachedInstructions.filter(function(item) {
          if (item.type === 'divider') return false;
          return (item.title && item.title.toLowerCase().indexOf(lq) !== -1) ||
                 (item.text && item.text.toLowerCase().indexOf(lq) !== -1);
        });
        var html = renderKRSList(filtered, true);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      } else {
        var html = renderKRSList(cachedInstructions, false);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      }
    });
  }
  showKRSDefaultHeader();
}

function initKRS() {
  renderKRSHeader();
  var container = document.getElementById('krsContainer');
  if (!container) { console.error('Контейнер krsContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.krs-pdf-btn');
      if (pdfBtn) { window.app.openPDFModal(pdfBtn.dataset.pdf, 1); return; }
      var thumb = e.target.closest('.krs-photo-thumb');
      if (thumb) { var krsContent = thumb.closest('.krs-block-content'); window.app.openPhotoSwipe(thumb, krsContent); return; }
      var header = e.target.closest('.krs-block-header');
      if (header) { header.closest('.krs-block').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }
  window.app.showSkeleton(container, 'blocks');
  fetch('modules/krs.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      cachedInstructions = data.instructions || [];
      var html = renderKRSList(cachedInstructions, false);
      window.app.hideSkeleton(container, html);
      window.app.initMarquee(container);
    })
    .catch(function() { window.app.showError(container, 'Не удалось загрузить указания КРС'); });
}
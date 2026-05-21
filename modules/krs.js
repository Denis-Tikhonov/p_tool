/* modules/krs.js */
var cachedInstructions = null;

function getAgeBadge(dateStr) {
  var years = Math.floor((Date.now() - new Date(dateStr)) / (1000*60*60*24*365));
  if (years < 1) return '<span class="krs-age-badge krs-age-badge--new">Новый</span>';
  if (years <= 3) return '<span class="krs-age-badge krs-age-badge--mid">Средний</span>';
  return '<span class="krs-age-badge krs-age-badge--old">Старый</span>';
}
function hasDividers(arr) {
  for (var i = 0; i < arr.length; i++) if (arr[i].type === 'divider') return true;
  return false;
}
function renderDivider(item) {
  var label = item.label ? '<span class="list-divider-label">' + item.label + '</span>' : '';
  return '<div class="list-divider">' + label + '</div>';
}
function renderKRSBlock(item) {
  var badgeHtml = getAgeBadge(item.date);
  var date = new Date(item.date).toLocaleDateString('ru-RU');
  var authorHtml = '<div class="krs-author">Автор: ' + (item.name || '—') + '</div>';
  var textHtml = '<div class="krs-text">' + (item.text || '').replace(/\n/g, '<br>') + '</div>';
  var picsHtml = '';
  if (item.pic) {
    picsHtml += '<img class="krs-photo-thumb" src="' + item.pic + '" data-full-src="' + item.pic + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
  }
  if (item.pics && Array.isArray(item.pics)) {
    for (var i = 0; i < item.pics.length; i++) {
      picsHtml += '<img class="krs-photo-thumb" src="' + item.pics[i] + '" data-full-src="' + item.pics[i] + '" onerror="this.src=\'icon-192.png\'" loading="lazy">';
    }
  }
  var pdfsHtml = '';
  if (item.pdf) {
    pdfsHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdf + '">📄 Открыть оригинал PDF</button>';
  }
  if (item.pdfs && Array.isArray(item.pdfs)) {
    for (var j = 0; j < item.pdfs.length; j++) {
      var fileName = item.pdfs[j].split('/').pop();
      pdfsHtml += '<button class="krs-pdf-btn" data-pdf="' + item.pdfs[j] + '">📄 ' + fileName + '</button>';
    }
  }
  return '<div class="krs-block">' +
    '<div class="krs-block-header">' +
    badgeHtml +
    '<span class="collapsible-title"><span class="marquee-inner">' + item.title + '</span></span>' +
    '<span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span>' +
    '</div>' +
    '<div class="krs-block-content">' +
    '<div class="krs-date">' + date + '</div>' +
    authorHtml +
    textHtml +
    picsHtml +
    pdfsHtml +
    '</div></div>';
}
function renderKRSList(arr, isSearch) {
  var list = arr.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var html = list.map(function(item) {
    if (item.type === 'divider') return isSearch ? '' : renderDivider(item);
    return renderKRSBlock(item);
  }).join('');
  if (!html.trim()) html = '<p class="empty-message">' + (isSearch ? 'Ничего не найдено' : 'Нет актуальных указаний') + '</p>';
  return html;
}
function showKRSDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedInstructions) {
    var container = document.getElementById('krsContainer');
    if (container) {
      var html = renderKRSList(cachedInstructions, false);
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
    input.removeEventListener('input', window._krsSearchHandler);
    window._krsSearchHandler = function(e) {
      var query = e.target.value.trim();
      if (!cachedInstructions) return;
      var container = document.getElementById('krsContainer');
      if (!container) return;
      if (query) {
        var lq = query.toLowerCase();
        var filtered = cachedInstructions.filter(function(item) {
          if (item.type === 'divider') return false;
          return (item.title && item.title.toLowerCase().indexOf(lq) !== -1) || (item.text && item.text.toLowerCase().indexOf(lq) !== -1);
        });
        var html = renderKRSList(filtered, true);
        window.app.hideSkeleton(container, html);
        window.app.initMarquee(container);
      } else {
        var htmlFull = renderKRSList(cachedInstructions, false);
        window.app.hideSkeleton(container, htmlFull);
        window.app.initMarquee(container);
      }
    };
    input.addEventListener('input', window._krsSearchHandler);
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
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      cachedInstructions = data.instructions;
      var html = renderKRSList(cachedInstructions, false);
      window.app.hideSkeleton(container, html);
      window.app.initMarquee(container);
    })
    .catch(function() { window.app.showError(container, 'Не удалось загрузить указания КРС'); });
}
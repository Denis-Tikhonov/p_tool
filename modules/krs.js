var cachedKRS = null;

function initKRS() {
  renderKRSHeader();
  var container = document.getElementById('krsContainer');
  if (!container) { console.error('Контейнер krsContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var pdfBtn = e.target.closest('.krs-pdf-btn');
      if (pdfBtn) { app.openPDFModal(pdfBtn.dataset.pdf, 1); return; }
      var thumb = e.target.closest('.krs-photo-thumb');
      if (thumb) { app.openPhotoSwipe(thumb.src, thumb.src); return; }
      var header = e.target.closest('.krs-block-header');
      if (header) { header.closest('.krs-block').classList.toggle('open'); return; }
    });
    container.dataset.delegated = 'true';
  }
  app.showSkeleton(container, 'blocks');
  fetch('modules/krs.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      cachedKRS = data.instructions || [];
      renderKRSList(cachedKRS);
      app.hideSkeleton(container, container.innerHTML);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить указания КРС');
    });
}

function renderKRSHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Указания КРС</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', krsSearchHandler);
    input.addEventListener('input', krsSearchHandler);
  }
  showKRSDefaultHeader();
}

function krsSearchHandler(e) {
  if (!cachedKRS) return;
  var query = e.target.value.trim();
  var filtered = query ? cachedKRS.filter(function(item) { return matchesKRSSearch(item, query); }) : cachedKRS;
  renderKRSList(filtered);
}

function matchesKRSSearch(item, query) {
  var lower = query.toLowerCase();
  if (item.title.toLowerCase().indexOf(lower) !== -1) return true;
  if (item.text.toLowerCase().indexOf(lower) !== -1) return true;
  return false;
}

function showKRSDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedKRS) renderKRSList(cachedKRS);
  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
  left.onclick = null;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showKRSSearchHeader;
}

function showKRSSearchHeader() {
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
  right.onclick = showKRSDefaultHeader;
}

function renderKRSList(instructions) {
  var container = document.getElementById('krsContainer');
  if (!container) return;
  if (!instructions.length) {
    container.innerHTML = '<p class="empty-message">Нет актуальных указаний</p>';
    return;
  }
  var sorted = instructions.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i];
    var ageYears = Math.floor((Date.now() - new Date(item.date)) / (1000*60*60*24*365));
    var ageEmoji = ageYears < 1 ? '🟢' : (ageYears <= 3 ? '🟡' : '🔴');
    var dateStr = new Date(item.date).toLocaleDateString('ru-RU');
    var picsHtml = '';
    if (item.pics && item.pics.length) {
      for (var p = 0; p < item.pics.length; p++) {
        picsHtml += '<img class="krs-photo-thumb" src="' + item.pics[p] + '" onerror="this.src=\'icon-192.png\'">';
      }
    } else if (item.pic) {
      picsHtml += '<img class="krs-photo-thumb" src="' + item.pic + '" onerror="this.src=\'icon-192.png\'">';
    }
    var pdfHtml = item.pdf ? '<button class="krs-pdf-btn" data-pdf="' + item.pdf + '">📄 Открыть оригинал PDF</button>' : '';
    html += '<div class="krs-block"><div class="krs-block-header"><span>' + ageEmoji + '</span><span class="collapsible-title">' + item.title + '</span><span class="collapsible-chevron">' + window.ICONS['chevron-down'] + '</span></div><div class="krs-block-content"><div><strong>Дата:</strong> ' + dateStr + '</div><div><strong>Автор:</strong> ' + item.name + '</div><div style="white-space: pre-wrap;">' + item.text + '</div>' + picsHtml + pdfHtml + '</div></div>';
  }
  container.innerHTML = html;
}

window.initKRS = initKRS;
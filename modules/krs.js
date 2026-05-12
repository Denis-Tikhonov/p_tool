// modules/krs.js
let cachedInstructions = null;
function renderKRSHeader() {
  const center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `<div class="hc-default">Указания КРС</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>`;
  showKRSDefaultHeader();
}
function showKRSDefaultHeader() {
  const left = document.getElementById('headerLeft');
  const right = document.getElementById('headerRight');
  const def = document.querySelector('.hc-default');
  const srch = document.querySelector('.hc-search');
  if (left) left.innerHTML = `<button class="icon-btn" aria-label="Меню" onclick="window.app.toggleMenu()">${window.ICONS.menu}</button>`;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  if (right) {
    right.innerHTML = `<button class="icon-btn" aria-label="Поиск">${window.ICONS.search}</button>`;
    right.onclick = () => showKRSSearchHeader();
  }
  const input = document.getElementById('headerSearchInput');
  if (input) { input.value = ''; if (cachedInstructions) renderFilteredKRS(''); }
}
function showKRSSearchHeader() {
  const left = document.getElementById('headerLeft');
  const right = document.getElementById('headerRight');
  const def = document.querySelector('.hc-default');
  const srch = document.querySelector('.hc-search');
  const input = document.getElementById('headerSearchInput');
  if (left) left.innerHTML = '';
  if (def) def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (right) {
    right.innerHTML = `<button class="icon-btn" aria-label="Отмена">${window.ICONS.back}</button>`;
    right.onclick = () => showKRSDefaultHeader();
  }
  if (input) input.focus();
}
function getStatusEmoji(dateStr) {
  const years = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000*60*60*24*365));
  if (years < 1) return '🟢';
  if (years < 3) return '🟡';
  return '🔴';
}
function renderKRSList(instructions) {
  if (!instructions.length) return '<p class="empty-message">Нет актуальных указаний</p>';
  const sorted = [...instructions].sort((a,b) => new Date(b.date) - new Date(a.date));
  return sorted.map(item => {
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString('ru-RU');
    const statusEmoji = getStatusEmoji(item.date);
    const picHtml = item.pic ? `<img class="krs-photo-thumb" src="${item.pic}" onerror="this.src='icon-192.png'" data-full="${item.pic}" style="max-width:100%; max-height:200px; border-radius:8px; cursor:pointer;">` : '';
    const pdfHtml = item.pdf ? `<button class="krs-pdf-btn" data-pdf="${item.pdf}">📄 Открыть оригинал PDF</button>` : '';
    return `<div class="krs-block" data-id="${item.id}"><div class="krs-block-header"><span>${statusEmoji}</span><span class="krs-doc-id">${item.id}</span><span class="collapsible-title">${item.title}</span><span class="collapsible-chevron">${window.ICONS['chevron-down']}</span></div><div class="krs-block-content"><div><strong>Дата:</strong> ${dateStr}</div><div><strong>Автор:</strong> ${item.name}</div><div style="white-space:pre-wrap;">${item.text}</div>${picHtml}${pdfHtml}</div></div>`;
  }).join('');
}
function renderFilteredKRS(query) {
  const container = document.getElementById('krsContainer');
  if (!container) return;
  let filtered = cachedInstructions;
  if (query.trim()) {
    const lower = query.toLowerCase();
    filtered = cachedInstructions.filter(i => i.title.toLowerCase().includes(lower) || i.text.toLowerCase().includes(lower));
  }
  const html = renderKRSList(filtered);
  window.app.hideSkeleton(container, html);
  container.querySelectorAll('.krs-block-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.krs-block').classList.toggle('open');
    });
  });
  container.querySelectorAll('.krs-photo-thumb').forEach(img => {
    img.addEventListener('click', () => window.app.openPhotoSwipe(img.src, img.dataset.full || img.src));
  });
  container.querySelectorAll('.krs-pdf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.app.openPDFModal(btn.dataset.pdf, 1);
    });
  });
}
function initKRS() {
  renderKRSHeader();
  const container = document.getElementById('krsContainer');
  if (!container) { console.error('Контейнер krsContainer не найден!'); return; }
  window.app.showSkeleton(container, 'blocks');
  if (cachedInstructions) {
    renderFilteredKRS('');
    const input = document.getElementById('headerSearchInput');
    if (input && !input.listenerAdded) {
      input.addEventListener('input', (e) => renderFilteredKRS(e.target.value));
      input.listenerAdded = true;
    }
    return;
  }
  fetch('modules/krs.json').then(res => res.json()).then(data => {
    cachedInstructions = data.instructions || [];
    renderFilteredKRS('');
    const input = document.getElementById('headerSearchInput');
    if (input && !input.listenerAdded) {
      input.addEventListener('input', (e) => renderFilteredKRS(e.target.value));
      input.listenerAdded = true;
    }
  }).catch(() => {
    window.app.showError(container, 'Не удалось загрузить указания КРС', () => initKRS());
  });
}
window.initKRS = initKRS;
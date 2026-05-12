// modules/flightprocedures.js
let cachedProcedures = null;
function renderFPHeader() {
  const center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `<div class="hc-default">Лётные процедуры</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>`;
  showFPDefaultHeader();
}
function showFPDefaultHeader() {
  const left = document.getElementById('headerLeft');
  const right = document.getElementById('headerRight');
  const def = document.querySelector('.hc-default');
  const srch = document.querySelector('.hc-search');
  if (left) left.innerHTML = `<button class="icon-btn" aria-label="Меню" onclick="window.app.toggleMenu()">${window.ICONS.menu}</button>`;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  if (right) {
    right.innerHTML = `<button class="icon-btn" aria-label="Поиск">${window.ICONS.search}</button>`;
    right.onclick = () => showFPSearchHeader();
  }
  const input = document.getElementById('headerSearchInput');
  if (input) { input.value = ''; if (cachedProcedures) renderFilteredFP(''); }
}
function showFPSearchHeader() {
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
    right.onclick = () => showFPDefaultHeader();
  }
  if (input) input.focus();
}
function renderContentBlock(block) {
  switch (block.type) {
    case 'action': return `<div class="fp-action"><span class="fp-action-label">${block.label}</span><span class="fp-action-dots"></span><span class="fp-action-value">${block.value}</span></div>`;
    case 'action-crew': return `<div class="fp-action"><span class="fp-action-label">${block.label}</span><span class="fp-action-dots"></span><span class="fp-action-value">${block.value}</span><span class="fp-crew-badge">${block.crew}</span></div>`;
    case 'verify': return `<div class="fp-verify">${block.text}</div>`;
    case 'condition': return `<div class="fp-condition">${block.text}</div>`;
    case 'note': return `<div class="fp-note"><strong>Note:</strong> ${block.text}</div>`;
    case 'caution': return `<div class="fp-caution"><strong>CAUTION:</strong> ${block.text}</div>`;
    case 'warning': return `<div class="fp-warning"><strong>WARNING:</strong> ${block.text}</div>`;
    case 'tail': return `<div class="fp-tail">${block.text}</div>`;
    case 'separator': return `<hr class="fp-separator">`;
    case 'image': return `<img class="fp-photo-thumb" src="${block.src}" onerror="this.src='icon-192.png'" data-full="${block.fullSrc || block.src}" style="max-width:100%; max-height:200px; border-radius:8px; cursor:pointer;">`;
    case 'html': return `<div class="fp-html">${block.html}</div>`;
    default: return '';
  }
}
function renderFPList(phases) {
  if (!phases.length) return '<p class="empty-message">Нет данных</p>';
  return phases.map(phase => {
    const icon = window.ICONS.plane;
    const timeHtml = phase.time ? `<span class="fp-phase-time">${phase.time}</span>` : '';
    const proceduresHtml = phase.procedures.map(proc => {
      const pdfHtml = proc.pdfRef ? `<button class="fp-pdf-ref" data-pdf="${proc.pdfRef.file}" data-page="${proc.pdfRef.page}">${proc.pdfRef.label}</button>` : '';
      const contentHtml = proc.content.map(c => renderContentBlock(c)).join('');
      return `<div class="fp-procedure"><div class="fp-procedure-header"><span class="collapsible-title">${proc.title}</span>${pdfHtml}<span class="collapsible-chevron">${window.ICONS['chevron-down']}</span></div><div class="fp-procedure-content">${contentHtml}</div></div>`;
    }).join('');
    return `<div class="fp-phase"><div class="fp-phase-header">${icon}<span class="collapsible-title">${phase.title}</span>${timeHtml}<span class="collapsible-chevron">${window.ICONS['chevron-down']}</span></div><div class="fp-phase-content">${proceduresHtml}</div></div>`;
  }).join('');
}
function renderFilteredFP(query) {
  const container = document.getElementById('fpContainer');
  if (!container) return;
  let filtered = cachedProcedures;
  if (query.trim()) {
    const lower = query.toLowerCase();
    filtered = cachedProcedures.map(phase => {
      const newPhase = { ...phase, procedures: phase.procedures.filter(proc => {
        if (proc.title.toLowerCase().includes(lower)) return true;
        return proc.content.some(c => {
          if (c.type === 'action' || c.type === 'action-crew') return c.label.toLowerCase().includes(lower) || c.value.toLowerCase().includes(lower);
          if (c.type === 'verify' || c.type === 'condition' || c.type === 'note' || c.type === 'caution' || c.type === 'warning' || c.type === 'tail') return c.text.toLowerCase().includes(lower);
          return false;
        });
      }) };
      if (newPhase.procedures.length) return newPhase;
      if (phase.title.toLowerCase().includes(lower)) return { ...phase, procedures: phase.procedures };
      return null;
    }).filter(p => p !== null);
  }
  const html = renderFPList(filtered);
  window.app.hideSkeleton(container, html);
  container.querySelectorAll('.fp-phase-header').forEach(header => {
    header.addEventListener('click', () => header.closest('.fp-phase').classList.toggle('open'));
  });
  container.querySelectorAll('.fp-procedure-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.fp-pdf-ref')) return;
      header.closest('.fp-procedure').classList.toggle('open');
    });
  });
  container.querySelectorAll('.fp-pdf-ref').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.app.openPDFModal(btn.dataset.pdf, parseInt(btn.dataset.page) || 1);
    });
  });
  container.querySelectorAll('.fp-photo-thumb').forEach(img => {
    img.addEventListener('click', () => window.app.openPhotoSwipe(img.src, img.dataset.full || img.src));
  });
}
function initFlightProcedures() {
  renderFPHeader();
  const container = document.getElementById('fpContainer');
  if (!container) { console.error('Контейнер fpContainer не найден!'); return; }
  window.app.showSkeleton(container, 'blocks');
  if (cachedProcedures) {
    renderFilteredFP('');
    const input = document.getElementById('headerSearchInput');
    if (input && !input.listenerAdded) {
      input.addEventListener('input', (e) => renderFilteredFP(e.target.value));
      input.listenerAdded = true;
    }
    return;
  }
  fetch('modules/flightprocedures.json').then(res => res.json()).then(data => {
    cachedProcedures = data.phases || [];
    renderFilteredFP('');
    const input = document.getElementById('headerSearchInput');
    if (input && !input.listenerAdded) {
      input.addEventListener('input', (e) => renderFilteredFP(e.target.value));
      input.listenerAdded = true;
    }
  }).catch(() => {
    window.app.showError(container, 'Не удалось загрузить лётные процедуры', () => initFlightProcedures());
  });
}
window.initFlightProcedures = initFlightProcedures;
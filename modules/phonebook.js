// modules/phonebook.js
let cachedContacts = null;
function normalizeContact(c) {
  if (!Array.isArray(c.phones)) c.phones = [];
  if (!c.name) c.name = '—';
  return c;
}
function renderPhonebookList(contacts) {
  if (!contacts.length) return '<p class="empty-message">Ничего не найдено</p>';
  contacts.sort((a,b) => a.name.localeCompare(b.name, 'ru'));
  return contacts.map(c => {
    normalizeContact(c);
    const phonesHtml = c.phones.map((p, idx, arr) => {
      let badge = '';
      if (p.type === 'work') badge = '<span class="phone-badge">раб.</span>';
      else if (p.type === 'home' || p.type === 'default') badge = '<span class="phone-badge">личн.</span>';
      const separator = idx < arr.length-1 ? '<span class="phone-separator">·</span>' : '';
      return `<a href="tel:${p.tel}" class="contact-phone">${p.display}${badge}</a>${separator}`;
    }).join('');
    const positionHtml = c.position ? `<div class="contact-position">${c.position}</div>` : '';
    const emailHtml = c.email ? `<a href="mailto:${c.email}" class="contact-email">${c.email}</a>` : '';
    return `<div class="contact-item"><div class="contact-avatar">📞</div><div class="contact-info"><div class="contact-name">${c.name}</div>${positionHtml}<div class="contact-phones">${phonesHtml}</div>${emailHtml}</div></div>`;
  }).join('');
}
function renderPhonebookHeader() {
  const left = document.getElementById('headerLeft');
  const center = document.getElementById('headerCenter');
  const right = document.getElementById('headerRight');
  if (!center) return;
  center.innerHTML = `<div class="hc-default">Телефонный справочник</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>`;
  showPhonebookDefaultHeader();
}
function showPhonebookDefaultHeader() {
  const left = document.getElementById('headerLeft');
  const right = document.getElementById('headerRight');
  const def = document.querySelector('.hc-default');
  const srch = document.querySelector('.hc-search');
  if (left) left.innerHTML = `<button class="icon-btn" aria-label="Назад" onclick="window.app.navigateTo('main')">${window.ICONS.back}</button>`;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  if (right) {
    right.innerHTML = `<button class="icon-btn" aria-label="Поиск">${window.ICONS.search}</button>`;
    right.onclick = () => showPhonebookSearchHeader();
  }
  const input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedContacts) renderFilteredPhonebook('');
}
function showPhonebookSearchHeader() {
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
    right.onclick = () => showPhonebookDefaultHeader();
  }
  if (input) input.focus();
}
function renderFilteredPhonebook(query) {
  const container = document.getElementById('phonebookContainer');
  if (!container) return;
  let filtered = cachedContacts;
  if (query.trim()) {
    const lower = query.toLowerCase();
    filtered = cachedContacts.filter(c => {
      if (c.name.toLowerCase().includes(lower)) return true;
      if (c.position && c.position.toLowerCase().includes(lower)) return true;
      if (c.email && c.email.toLowerCase().includes(lower)) return true;
      return c.phones.some(p => p.display.toLowerCase().includes(lower) || p.tel.includes(lower));
    });
  }
  const html = renderPhonebookList(filtered);
  window.app.hideSkeleton(container, html);
}
function initPhonebook() {
  renderPhonebookHeader();
  const container = document.getElementById('phonebookContainer');
  if (!container) { console.error('Контейнер phonebookContainer не найден!'); return; }
  window.app.showSkeleton(container, 'list');
  if (cachedContacts) {
    renderFilteredPhonebook('');
    return;
  }
  fetch('modules/phonebook.json').then(res => res.json()).then(data => {
    cachedContacts = data.contacts || [];
    renderFilteredPhonebook('');
    const input = document.getElementById('headerSearchInput');
    if (input && !input.listenerAdded) {
      input.addEventListener('input', (e) => renderFilteredPhonebook(e.target.value));
      input.listenerAdded = true;
    }
  }).catch(() => {
    window.app.showError(container, 'Не удалось загрузить справочник', () => initPhonebook());
  });
}
window.initPhonebook = initPhonebook;
/* ==================== PHONEBOOK MODULE ==================== */
let cachedContacts = null;
let phonebookSearchMode = false;

function renderPhonebookHeader(left, center, right) {
  if (phonebookSearchMode) {
    left.innerHTML = `<button class="header-search-cancel" onclick="exitPhonebookSearch()">Отмена</button>`;
    center.innerHTML = `<input type="search" class="header-search-input" id="phonebookSearchInput" placeholder="Поиск..." autocomplete="off">`;
    right.innerHTML = '';

    setTimeout(() => {
      const input = document.getElementById('phonebookSearchInput');
      if (input) {
        input.focus();
        input.addEventListener('input', onPhonebookSearch);
      }
    }, 50);
  } else {
    left.innerHTML = `<button class="header-btn" onclick="app.navigateTo('main')" aria-label="Back">←</button>`;
    center.textContent = 'Телефонный справочник';
    right.innerHTML = `<button class="header-btn" onclick="enterPhonebookSearch()" aria-label="Search">🔍</button>`;
  }
}

function enterPhonebookSearch() {
  phonebookSearchMode = true;
  renderHeader('phonebook');
}

function exitPhonebookSearch() {
  phonebookSearchMode = false;
  const input = document.getElementById('phonebookSearchInput');
  if (input) {
    input.value = '';
  }
  renderHeader('phonebook');
  renderContactList(cachedContacts ? cachedContacts.contacts : []);
}

function onPhonebookSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!cachedContacts) return;

  const filtered = cachedContacts.contacts.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.phone.toLowerCase().includes(query)
  );

  renderContactList(filtered);
}

function renderContactList(contacts) {
  const container = document.getElementById('phonebookContainer');
  if (!container) return;

  if (contacts.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const html = sorted.map(contact => `
    <div class="contact-item">
      <div class="contact-avatar">👤</div>
      <div class="contact-info">
        <span class="contact-name">${escapeHtml(contact.name)}</span>
        <span class="contact-phone">
          <a href="tel:${contact.phone.replace(/\s/g, '')}">${escapeHtml(contact.phone)}</a>
        </span>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function initPhonebook() {
  const container = document.getElementById('phonebookContainer');
  if (!container) {
    console.error('Контейнер phonebookContainer не найден!');
    return;
  }

  if (cachedContacts) {
    renderContactList(cachedContacts.contacts);
    return;
  }

  app.showSpinner(container);

  fetch('modules/phonebook.json')
    .then(r => {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    })
    .then(data => {
      cachedContacts = data;
      app.hideSpinner(container, '');
      renderContactList(data.contacts);
    })
    .catch(() => {
      app.showError(container, 'Не удалось загрузить справочник');
    });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

(function() {
  let cachedContacts = null;
  let isSearchMode = false;

  window.initPhonebook = function() {
    const container = document.getElementById('phonebookContainer');
    if (!container) {
      console.error('Контейнер phonebookContainer не найден!');
      return;
    }

    renderPhonebookHeader(false);

    if (cachedContacts) {
      renderContacts(cachedContacts);
      return;
    }

    window.app.showSkeleton(container, 'list');

    fetch('modules/phonebook.json')
      .then(response => response.json())
      .then(data => {
        cachedContacts = data.contacts;
        renderContacts(cachedContacts);
      })
      .catch(() => {
        window.app.showError(container, 'Не удалось загрузить справочник');
      });
  };

  function renderPhonebookHeader(searchMode) {
    const header = document.getElementById('header');
    if (!header) return;

    isSearchMode = searchMode;

    header.innerHTML = `
      <div class="header-layer ${searchMode ? 'hidden' : ''}" id="phonebookHeaderDefault">
        <button class="header-btn" onclick="window.app.navigateTo('main')">
          ${window.ICONS.back}
        </button>
        <div class="header-title">Телефонный справочник</div>
        <button class="header-btn" onclick="window.togglePhonebookSearch()">
          ${window.ICONS.search}
        </button>
      </div>
      <div class="header-layer ${searchMode ? '' : 'hidden'}" id="phonebookHeaderSearch">
        <input 
          type="search" 
          class="header-search-input" 
          id="phonebookSearchInput" 
          placeholder="Поиск..." 
          autocomplete="off"
        >
        <button class="header-cancel" onclick="window.togglePhonebookSearch()">Отмена</button>
      </div>
    `;

    if (searchMode) {
      setTimeout(() => {
        const input = document.getElementById('phonebookSearchInput');
        if (input) {
          input.focus();
          input.addEventListener('input', handlePhonebookSearch);
        }
      }, 100);
    }
  }

  window.togglePhonebookSearch = function() {
    renderPhonebookHeader(!isSearchMode);
    if (!isSearchMode) {
      renderContacts(cachedContacts);
    }
  };

  function handlePhonebookSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderContacts(cachedContacts);
      return;
    }
    const filtered = cachedContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phone.toLowerCase().includes(query)
    );
    renderContacts(filtered);
  }

  function renderContacts(contacts) {
    const container = document.getElementById('phonebookContainer');
    if (!container) return;

    if (!contacts || contacts.length === 0) {
      window.app.hideSpinner(container, '<p class="empty-message">Ничего не найдено</p>');
      return;
    }

    const sorted = contacts.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    
    let html = '';
    sorted.forEach(contact => {
      html += `
        <div class="contact-item">
          <div class="contact-avatar">
            ${window.ICONS.phone}
          </div>
          <div class="contact-info">
            <div class="contact-name">${contact.name}</div>
            <a href="tel:${contact.phone}" class="contact-phone">${contact.phone}</a>
          </div>
        </div>
      `;
    });

    window.app.hideSpinner(container, html);
  }
})();
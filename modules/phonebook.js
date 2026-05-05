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
    const headerLeft = document.getElementById('headerLeft');
    const headerCenter = document.getElementById('headerCenter');
    const headerRight = document.getElementById('headerRight');

    if (!headerLeft || !headerCenter || !headerRight) return;

    isSearchMode = searchMode;

    if (!searchMode) {
      headerLeft.innerHTML = window.getIcon('back');
      headerLeft.onclick = () => window.app.navigateTo('main');
      headerCenter.innerHTML = '<div class="header-title">Телефонный справочник</div>';
      headerRight.innerHTML = '';
      
      const searchBtn = document.createElement('button');
      searchBtn.className = 'icon-btn';
      searchBtn.innerHTML = window.getIcon('search');
      searchBtn.onclick = () => renderPhonebookHeader(true);
      headerRight.appendChild(searchBtn);
    } else {
      headerLeft.innerHTML = '';
      headerCenter.innerHTML = `
        <div class="header-search-wrapper">
          <div class="header-search">
            <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off" style="font-size: 16px;">
          </div>
        </div>
      `;
      headerRight.innerHTML = '<button class="header-cancel" id="searchCancel">Отмена</button>';
      
      setTimeout(() => {
        const input = document.getElementById('headerSearchInput');
        if (input) {
          input.focus();
          input.addEventListener('input', handlePhonebookSearch);
        }
        const cancelBtn = document.getElementById('searchCancel');
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            renderPhonebookHeader(false);
            renderContacts(cachedContacts);
          };
        }
      }, 50);
    }
  }

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
            ${window.getIcon('phone')}
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
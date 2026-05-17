// modules/phonebook.js – Телефонный справочник (согласно 4_MODULE_Phonebook.txt)
var cachedContacts = null;

function renderPhonebookHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `
    <div class="hc-default">Телефонный справочник</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', phonebookSearchHandler);
    input.addEventListener('input', phonebookSearchHandler);
  }

  showPhonebookDefaultHeader();
}

function phonebookSearchHandler(e) {
  var query = e.target.value.trim();
  if (!cachedContacts) return;
  var filtered = query ? cachedContacts.filter(function(c) { return matchesSearch(c, query); }) : cachedContacts;
  renderContactList(filtered);
}

function showPhonebookDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedContacts) renderContactList(cachedContacts);

  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');

  if (left) {
    left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
    left.onclick = null;
  }

  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
    right.onclick = showPhonebookSearchHeader;
  }
}

function showPhonebookSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');

  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  var input = document.getElementById('headerSearchInput');

  if (left) {
    left.innerHTML = '';
    left.onclick = null;
  }

  if (def) def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
    right.onclick = showPhonebookDefaultHeader;
  }
}

function normalizeContact(c) {
  if (!Array.isArray(c.phones)) c.phones = [];
  if (!c.name) c.name = '—';
  return c;
}

function getPhoneBadgeClass(type) {
  return type === 'work' ? 'phone-badge--work' : 'phone-badge--personal';
}

function getPhoneBadgeText(type) {
  return type === 'work' ? 'раб.' : 'личн.';
}

function matchesSearch(contact, query) {
  var lowerQuery = query.toLowerCase();
  if (contact.name.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  if (contact.position && contact.position.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  if (contact.email && contact.email.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  return contact.phones.some(function(phone) {
    return phone.display.toLowerCase().indexOf(lowerQuery) !== -1 || phone.tel.indexOf(lowerQuery) !== -1;
  });
}

function renderContactList(arr) {
  var container = document.getElementById('phonebookContainer');
  if (!container) return;

  if (!arr || arr.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var sorted = arr.slice();
  sorted.sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });

  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var c = normalizeContact(sorted[i]);
    var isMulti = c.phones.length > 1;
    var phonesClass = isMulti ? 'contact-phones contact-phones--multi' : 'contact-phones contact-phones--single';

    var phonesHtml = '';
    for (var p = 0; p < c.phones.length; p++) {
      var phone = c.phones[p];
      var badgeClass = getPhoneBadgeClass(phone.type);
      var badgeText = getPhoneBadgeText(phone.type);
      phonesHtml += '<a href="tel:' + phone.tel + '" class="contact-phone">' +
        phone.display +
        '<span class="phone-badge ' + badgeClass + '">' + badgeText + '</span>' +
        '</a>';
    }

    var positionHtml = c.position ? '<div class="contact-position">' + escapeHtml(c.position) + '</div>' : '';
    var emailHtml = c.email ? '<a href="mailto:' + c.email + '" class="contact-email">' + escapeHtml(c.email) + '</a>' : '';

    html += '<div class="contact-item">' +
      '<div class="contact-avatar">' + window.ICONS.phone + '</div>' +
      '<div class="contact-info">' +
      '<div class="contact-name">' + escapeHtml(c.name) + '</div>' +
      positionHtml +
      '<div class="' + phonesClass + '">' + phonesHtml + '</div>' +
      emailHtml +
      '</div>' +
      '</div>';
  }
  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function initPhonebook() {
  renderPhonebookHeader();

  var container = document.getElementById('phonebookContainer');
  if (!container) {
    console.error('Контейнер phonebookContainer не найден!');
    return;
  }

  if (!container.dataset.delegated) {
    // Нативные ссылки tel/mailto работают без делегирования, но dataset.delegated обязателен
    container.dataset.delegated = 'true';
  }

  if (cachedContacts) {
    renderContactList(cachedContacts);
    return;
  }

  app.showSkeleton(container, 'list');

  fetch('modules/phonebook.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      cachedContacts = data.contacts || [];
      renderContactList(cachedContacts);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить справочник');
    });
}
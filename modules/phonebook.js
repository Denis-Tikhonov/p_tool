var cachedContacts = null;

function initPhonebook() {
  renderPhonebookHeader();

  var container = document.getElementById('phonebookContainer');
  if (!container) { console.error('Контейнер phonebookContainer не найден!'); return; }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      // нативные <a href="tel:"> и <a href="mailto:"> обрабатываются браузером
    });
    container.dataset.delegated = 'true';
  }

  if (cachedContacts) {
    renderContactList(cachedContacts);
    return;
  }

  window.app.showSkeleton(container, 'list');

  fetch('modules/phonebook.json')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (data && Array.isArray(data.contacts)) {
        cachedContacts = data.contacts.slice();
        cachedContacts.sort(function(a, b) {
          return a.name.localeCompare(b.name, 'ru');
        });
        renderContactList(cachedContacts);
      } else {
        throw new Error('Invalid data format');
      }
    })
    .catch(function() {
      window.app.showError(container, 'Не удалось загрузить справочник');
    });
}

function renderPhonebookHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = `
    <div class="hc-default">Телефонный справочник</div>
    <div class="hc-search">
      <input type="search" id="headerSearchInput"
             placeholder="Поиск..." autocomplete="off">
    </div>
  `;

  var input = document.getElementById('headerSearchInput');
  if (input && !input.dataset.searchListener) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      if (!cachedContacts) return;
      var filtered = query
        ? cachedContacts.filter(function(c) { return matchesSearch(c, query); })
        : cachedContacts;
      renderContactList(filtered);
    });
    input.dataset.searchListener = 'true';
  }

  showPhonebookDefaultHeader();
}

function showPhonebookDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');

  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedContacts) renderContactList(cachedContacts);

  var left   = document.getElementById('headerLeft');
  var right  = document.getElementById('headerRight');
  var def    = document.querySelector('.hc-default');
  var srch   = document.querySelector('.hc-search');

  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">'
    + window.ICONS.back + '</button>';
  left.onclick = null;

  if (def)  def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showPhonebookSearchHeader;
}

function showPhonebookSearchHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.add('search-active');

  var left   = document.getElementById('headerLeft');
  var right  = document.getElementById('headerRight');
  var def    = document.querySelector('.hc-default');
  var srch   = document.querySelector('.hc-search');
  var input  = document.getElementById('headerSearchInput');

  left.innerHTML = '';
  left.onclick = null;

  if (def)  def.classList.add('hidden');
  if (srch) srch.classList.add('visible');
  if (input) input.focus();

  right.innerHTML = '<button class="icon-btn" aria-label="Закрыть">' + window.ICONS.close + '</button>';
  right.onclick = showPhonebookDefaultHeader;
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
    return phone.display.toLowerCase().indexOf(lowerQuery) !== -1 ||
           phone.tel.toLowerCase().indexOf(lowerQuery) !== -1;
  });
}

function renderContactList(contacts) {
  var container = document.getElementById('phonebookContainer');
  if (!container) return;

  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < contacts.length; i++) {
    var c = normalizeContact(contacts[i]);
    var isMulti = c.phones.length > 1;
    var phonesClass = isMulti ? 'contact-phones contact-phones--multi' : 'contact-phones contact-phones--single';

    var phonesHtml = '';
    for (var p = 0; p < c.phones.length; p++) {
      var phone = c.phones[p];
      phonesHtml += '<a href="tel:' + phone.tel + '" class="contact-phone">'
        + phone.display
        + '<span class="phone-badge ' + getPhoneBadgeClass(phone.type) + '">'
        + getPhoneBadgeText(phone.type) + '</span></a>';
    }

    var positionHtml = c.position ? '<div class="contact-position">' + c.position + '</div>' : '';
    var emailHtml = c.email ? '<a href="mailto:' + c.email + '" class="contact-email">' + c.email + '</a>' : '';

    html += '<div class="contact-item">'
      + '<div class="contact-avatar">' + window.ICONS.phone + '</div>'
      + '<div class="contact-info">'
      + '<div class="contact-name">' + c.name + '</div>'
      + positionHtml
      + '<div class="' + phonesClass + '">' + phonesHtml + '</div>'
      + emailHtml
      + '</div>'
      + '</div>';
  }
  container.innerHTML = html;
}
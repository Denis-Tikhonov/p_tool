// modules/phonebook.js
var cachedContacts = null;

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

function hasDividers(arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].type === 'divider') return true;
  }
  return false;
}

function renderDivider(item) {
  var label = item.label ? '<span class="list-divider-label">' + item.label + '</span>' : '';
  return '<div class="list-divider">' + label + '</div>';
}

function matchesSearch(contact, query) {
  var lq = query.toLowerCase();
  if (contact.name && contact.name.toLowerCase().indexOf(lq) !== -1) return true;
  if (contact.position && contact.position.toLowerCase().indexOf(lq) !== -1) return true;
  if (contact.email && contact.email.toLowerCase().indexOf(lq) !== -1) return true;
  for (var i = 0; i < contact.phones.length; i++) {
    if (contact.phones[i].display.toLowerCase().indexOf(lq) !== -1) return true;
    if (contact.phones[i].tel.indexOf(lq) !== -1) return true;
  }
  return false;
}

function renderContactItem(c) {
  var phonesHtml = '';
  if (c.phones.length === 1) {
    var p = c.phones[0];
    phonesHtml = '<div class="contact-phones contact-phones--single">' +
      '<a href="tel:' + p.tel + '" class="contact-phone">' +
      p.display + ' <span class="phone-badge ' + getPhoneBadgeClass(p.type) + '">' + getPhoneBadgeText(p.type) + '</span>' +
      '</a></div>';
  } else if (c.phones.length > 1) {
    phonesHtml = '<div class="contact-phones contact-phones--multi">';
    for (var i = 0; i < c.phones.length; i++) {
      var ph = c.phones[i];
      phonesHtml += '<a href="tel:' + ph.tel + '" class="contact-phone">' +
        ph.display + ' <span class="phone-badge ' + getPhoneBadgeClass(ph.type) + '">' + getPhoneBadgeText(ph.type) + '</span>' +
        '</a>';
    }
    phonesHtml += '</div>';
  }

  var emailHtml = '';
  if (c.email) {
    emailHtml = '<a href="mailto:' + c.email + '" class="contact-email">' + c.email + '</a>';
  }

  var positionHtml = c.position ? '<div class="contact-position">' + c.position + '</div>' : '';

  return '<div class="contact-item">' +
    '<div class="contact-avatar">' + window.ICONS.phone + '</div>' +
    '<div class="contact-info">' +
    '<div class="contact-name">' + c.name + '</div>' +
    positionHtml +
    phonesHtml +
    emailHtml +
    '</div></div>';
}

function renderContactList(arr, isSearch) {
  var list = arr.slice();
  if (!isSearch && !hasDividers(list)) {
    list.sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.type === 'divider') {
      if (!isSearch) html += renderDivider(item);
      continue;
    }
    var c = normalizeContact(item);
    html += renderContactItem(c);
  }
  if (!html.trim()) html = '<p class="empty-message">Ничего не найдено</p>';
  var container = document.getElementById('phonebookContainer');
  if (container) container.innerHTML = html;
}

function showPhonebookDefaultHeader() {
  var headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.classList.remove('search-active');
  var input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  if (cachedContacts) renderContactList(cachedContacts, false);
  var left = document.getElementById('headerLeft');
  var right = document.getElementById('headerRight');
  var def = document.querySelector('.hc-default');
  var srch = document.querySelector('.hc-search');
  left.innerHTML = '<button class="icon-btn" aria-label="Назад">' + window.ICONS.back + '</button>';
  left.onclick = function() { window.app.navigateTo('main'); };
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showPhonebookSearchHeader;
}

function showPhonebookSearchHeader() {
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
  right.onclick = showPhonebookDefaultHeader;
}

function renderPhonebookHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Телефонный справочник</div>' +
    '<div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      if (!cachedContacts) return;
      if (query) {
        var filtered = cachedContacts.filter(function(c) {
          if (c.type === 'divider') return false;
          return matchesSearch(c, query);
        });
        renderContactList(filtered, true);
      } else {
        renderContactList(cachedContacts, false);
      }
    });
  }
  showPhonebookDefaultHeader();
}

function initPhonebook() {
  renderPhonebookHeader();
  var container = document.getElementById('phonebookContainer');
  if (!container) { console.error('Контейнер phonebookContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.dataset.delegated = 'true';
  }
  window.app.showSkeleton(container, 'list');
  fetch('modules/phonebook.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      cachedContacts = data.contacts || [];
      renderContactList(cachedContacts, false);
      window.app.hideSkeleton(container, container.innerHTML);
    })
    .catch(function() {
      window.app.showError(container, 'Не удалось загрузить справочник');
    });
}
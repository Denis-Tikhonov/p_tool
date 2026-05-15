var cachedContacts = null;

function initPhonebook() {
  renderPhonebookHeader();
  var container = document.getElementById('phonebookContainer');
  if (!container) { console.error('Контейнер phonebookContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var phone = e.target.closest('.contact-phone');
      if (phone) return; // стандартное поведение href
      var email = e.target.closest('.contact-email');
      if (email) return;
    });
    container.dataset.delegated = 'true';
  }
  app.showSkeleton(container, 'list');
  fetch('modules/phonebook.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      cachedContacts = data.contacts || [];
      renderContactList(cachedContacts);
      app.hideSkeleton(container, container.innerHTML);
    })
    .catch(function() {
      app.showError(container, 'Не удалось загрузить справочник');
    });
}

function renderPhonebookHeader() {
  var center = document.getElementById('headerCenter');
  center.innerHTML = '<div class="hc-default">Телефонный справочник</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>';
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.removeEventListener('input', phonebookSearchHandler);
    input.addEventListener('input', phonebookSearchHandler);
  }
  showPhonebookDefaultHeader();
}

function phonebookSearchHandler(e) {
  if (!cachedContacts) return;
  var query = e.target.value.trim();
  var filtered = query ? cachedContacts.filter(function(c) { return matchesPhonebookSearch(c, query); }) : cachedContacts;
  renderContactList(filtered);
}

function matchesPhonebookSearch(contact, query) {
  var lower = query.toLowerCase();
  if (contact.name.toLowerCase().indexOf(lower) !== -1) return true;
  if (contact.position && contact.position.toLowerCase().indexOf(lower) !== -1) return true;
  if (contact.email && contact.email.toLowerCase().indexOf(lower) !== -1) return true;
  return contact.phones.some(function(p) {
    return p.display.toLowerCase().indexOf(lower) !== -1 || p.tel.indexOf(lower) !== -1;
  });
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
  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
  left.onclick = null;
  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');
  right.innerHTML = '<button class="icon-btn" aria-label="Поиск">' + window.ICONS.search + '</button>';
  right.onclick = showPhonebookSearchHeader;
}

function showPhonebookSearchHeader() {
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
  right.onclick = showPhonebookDefaultHeader;
}

function renderContactList(contacts) {
  var container = document.getElementById('phonebookContainer');
  if (!container) return;
  if (!contacts.length) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }
  var sorted = contacts.slice().sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var c = sorted[i];
    if (!Array.isArray(c.phones)) c.phones = [];
    if (!c.name) c.name = '—';
    var phonesHtml = '';
    var isMulti = c.phones.length > 1;
    var phonesClass = isMulti ? 'contact-phones contact-phones--multi' : 'contact-phones contact-phones--single';
    for (var j = 0; j < c.phones.length; j++) {
      var p = c.phones[j];
      var badgeClass = p.type === 'work' ? 'phone-badge--work' : 'phone-badge--personal';
      var badgeText = p.type === 'work' ? 'раб.' : 'личн.';
      phonesHtml += '<a href="tel:' + p.tel + '" class="contact-phone">' + p.display + '<span class="phone-badge ' + badgeClass + '">' + badgeText + '</span></a>';
    }
    var positionHtml = c.position ? '<div class="contact-position">' + c.position + '</div>' : '';
    var emailHtml = c.email ? '<a href="mailto:' + c.email + '" class="contact-email">' + c.email + '</a>' : '';
    html += '<div class="contact-item"><div class="contact-avatar">📞</div><div class="contact-info"><div class="contact-name">' + c.name + '</div>' + positionHtml + '<div class="' + phonesClass + '">' + phonesHtml + '</div>' + emailHtml + '</div></div>';
  }
  container.innerHTML = html;
}

window.initPhonebook = initPhonebook;
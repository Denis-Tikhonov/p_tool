/* ═══════════════════════════════════════════
   МОДУЛЬ: Телефонный справочник (Phonebook)
   ═══════════════════════════════════════════ */

var cachedContacts = null;
var headerInputListener = null;

function normalizeContact(c) {
  if (!Array.isArray(c.phones)) c.phones = [];
  if (!c.name) c.name = '\u2014';
  return c;
}

function getPhoneBadgeClass(type) {
  return type === 'work' ? 'phone-badge--work' : 'phone-badge--personal';
}

function getPhoneBadgeText(type) {
  return type === 'work' ? '\u0440\u0430\u0431.' : '\u043B\u0438\u0447\u043D.';
}

function matchesSearch(contact, query) {
  var lowerQuery = query.toLowerCase();
  if (contact.name.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  if (contact.position && contact.position.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  if (contact.email && contact.email.toLowerCase().indexOf(lowerQuery) !== -1) return true;
  for (var i = 0; i < contact.phones.length; i++) {
    var phone = contact.phones[i];
    if (phone.display.toLowerCase().indexOf(lowerQuery) !== -1) return true;
    if (phone.tel.indexOf(lowerQuery) !== -1) return true;
  }
  return false;
}

function renderContactList(arr) {
  var container = document.getElementById('phonebookContainer');
  if (!container) return;

  if (!arr || arr.length === 0) {
    container.innerHTML = '<p class="empty-message">\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E</p>';
    return;
  }

  var sorted = arr.slice().sort(function(a, b) {
    return a.name.localeCompare(b.name, 'ru');
  });

  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var c = normalizeContact(sorted[i]);
    var phonesClass = c.phones.length > 1
      ? 'contact-phones contact-phones--multi'
      : 'contact-phones contact-phones--single';

    var phonesHtml = '';
    for (var j = 0; j < c.phones.length; j++) {
      var ph = c.phones[j];
      var badgeClass = getPhoneBadgeClass(ph.type);
      var badgeText = getPhoneBadgeText(ph.type);
      phonesHtml += '<a href="tel:' + ph.tel + '" class="contact-phone">'
        + ph.display
        + ' <span class="phone-badge ' + badgeClass + '">' + badgeText + '</span>'
        + '</a>';
    }

    var positionHtml = c.position
      ? '<div class="contact-position">' + c.position + '</div>'
      : '';

    var emailHtml = c.email
      ? '<a href="mailto:' + c.email + '" class="contact-email">' + c.email + '</a>'
      : '';

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

function renderPhonebookHeader() {
  var center = document.getElementById('headerCenter');
  if (!center) return;

  center.innerHTML = '<div class="hc-default">\u0422\u0435\u043B\u0435\u0444\u043E\u043D\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A</div>'
    + '<div class="hc-search">'
    + '<input type="search" id="headerSearchInput"'
    + ' placeholder="\u041F\u043E\u0438\u0441\u043A..." autocomplete="off">'
    + '</div>';

  var input = document.getElementById('headerSearchInput');
  if (input && !headerInputListener) {
    headerInputListener = function(e) {
      var query = e.target.value.trim();
      if (!cachedContacts) return;
      var filtered = query
        ? cachedContacts.filter(function(c) { return matchesSearch(c, query); })
        : cachedContacts;
      renderContactList(filtered);
    };
    input.addEventListener('input', headerInputListener);
  }

  showPhonebookDefaultHeader();
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
    left.innerHTML = '<button class="icon-btn" aria-label="\u041D\u0430\u0437\u0430\u0434"'
      + ' onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
    left.onclick = null;
  }

  if (def) def.classList.remove('hidden');
  if (srch) srch.classList.remove('visible');

  if (right) {
    right.innerHTML = '<button class="icon-btn" aria-label="\u041F\u043E\u0438\u0441\u043A">'
      + window.ICONS.search + '</button>';
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
    right.innerHTML = '<button class="icon-btn" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">'
      + window.ICONS.close + '</button>';
    right.onclick = showPhonebookDefaultHeader;
  }
}

function initPhonebook() {
  renderPhonebookHeader();

  var container = document.getElementById('phonebookContainer');
  if (!container) {
    console.error('\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 phonebookContainer \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D!');
    return;
  }

  if (!container.dataset.delegated) {
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
      app.hideSkeleton(container, '');
      renderContactList(cachedContacts);
    })
    .catch(function() {
      app.showError(container, '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A');
    });
}

/* modules/faq.js */
function renderFAQHeader() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  left.innerHTML = '<button class="icon-btn" aria-label="Назад">' + window.ICONS.back + '</button>';
  left.onclick = function() { window.app.navigateTo('main'); };
  center.innerHTML = '<div class="hc-default">FAQ</div>';
  right.innerHTML = '';
  right.onclick = null;
}
function renderFAQContent(content) {
  if (!content) return '';
  var safe = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var paragraphs = safe.split(/\n\n+/);
  var result = '';
  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i].trim();
    if (p) result += '<p>' + p.replace(/\n/g, '<br>') + '</p>';
  }
  return result;
}
function renderFAQ(data) {
  var sections = (data && Array.isArray(data.sections)) ? data.sections : [];
  var links = (data && Array.isArray(data.links)) ? data.links : [];
  var html = '';
  if (sections.length > 0) {
    html += '<nav class="faq-toc" aria-label="Оглавление">';
    for (var i = 0; i < sections.length; i++) {
      html += '<a class="faq-toc-link" data-target="faq-section-' + sections[i].id + '" href="#">' + sections[i].title + '</a>';
    }
    if (links.length > 0) {
      html += '<a class="faq-toc-link" data-target="faq-links" href="#">Ссылки</a>';
    }
    html += '</nav>';
  }
  for (var j = 0; j < sections.length; j++) {
    var sec = sections[j];
    html += '<section class="faq-section" id="faq-section-' + sec.id + '">' +
      '<h2 class="faq-section-title">' + sec.title + '</h2>' +
      '<div class="faq-section-body">' + renderFAQContent(sec.content) + '</div></section>';
  }
  if (links.length > 0) {
    html += '<section class="faq-section faq-links-section" id="faq-links">' +
      '<h2 class="faq-section-title">Ссылки</h2><div class="faq-links-list">';
    for (var k = 0; k < links.length; k++) {
      var link = links[k];
      html += '<a class="faq-link-item" href="' + link.url + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="faq-link-icon">' + window.ICONS['external-link'] + '</span>' +
        '<span class="faq-link-label">' + link.label + '</span>' +
        (link.desc ? '<span class="faq-link-desc">' + link.desc + '</span>' : '') +
        '</a>';
    }
    html += '</div></section>';
  }
  return html || '<p class="empty-message">FAQ пуст</p>';
}
function initFAQ() {
  renderFAQHeader();
  var container = document.getElementById('faqContainer');
  if (!container) { console.error('Контейнер faqContainer не найден!'); return; }
  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var tocLink = e.target.closest('.faq-toc-link');
      if (tocLink) {
        e.preventDefault();
        var targetId = tocLink.dataset.target;
        var target = document.getElementById(targetId);
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        container.querySelectorAll('.faq-toc-link').forEach(function(l) { l.classList.remove('faq-toc-link--active'); });
        tocLink.classList.add('faq-toc-link--active');
        return;
      }
    });
    container.dataset.delegated = 'true';
  }
  window.app.showSkeleton(container, 'blocks');
  fetch('modules/faq.json')
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) { var html = renderFAQ(data); window.app.hideSkeleton(container, html); })
    .catch(function() { window.app.showError(container, 'Не удалось загрузить FAQ'); });
}
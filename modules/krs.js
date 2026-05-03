/* ==================== KRS MODULE ==================== */
let cachedInstructions = null;
let krsSearchMode = false;

function renderKRSHeader(left, center, right) {
  if (krsSearchMode) {
    left.innerHTML = `<button class="header-search-cancel" onclick="exitKRSSearch()">Отмена</button>`;
    center.innerHTML = `<input type="search" class="header-search-input" id="krsSearchInput" placeholder="Поиск..." autocomplete="off">`;
    right.innerHTML = '';

    setTimeout(() => {
      const input = document.getElementById('krsSearchInput');
      if (input) {
        input.focus();
        input.addEventListener('input', onKRSSearch);
      }
    }, 50);
  } else {
    left.innerHTML = `<button class="header-btn" onclick="app.navigateTo('main')" aria-label="Back">←</button>`;
    center.textContent = 'Указания КРС';
    right.innerHTML = `<button class="header-btn" onclick="enterKRSSearch()" aria-label="Search">🔍</button>`;
  }
}

function enterKRSSearch() {
  krsSearchMode = true;
  renderHeader('krs');
}

function exitKRSSearch() {
  krsSearchMode = false;
  const input = document.getElementById('krsSearchInput');
  if (input) {
    input.value = '';
  }
  renderHeader('krs');
  if (cachedInstructions) {
    renderKRSList(cachedInstructions.instructions);
  }
}

function onKRSSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!cachedInstructions) return;

  const filtered = cachedInstructions.instructions.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.text.toLowerCase().includes(query)
  );

  renderKRSList(filtered);
}

function getStatusBadge(dateStr) {
  const ageYears = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 365));
  if (ageYears < 1) {
    return { emoji: '🟢', text: 'Актуально', color: '#388E3C' };
  } else if (ageYears <= 3) {
    return { emoji: '🟡', text: 'Проверить', color: '#FBC02D' };
  } else {
    return { emoji: '🔴', text: 'Устарело', color: '#D32F2F' };
  }
}

function toggleKRSBlock(blockId) {
  const block = document.querySelector(`.krs-block[data-block-id="${blockId}"]`);
  if (!block) return;

  const content = block.querySelector('.krs-block-content');
  const arrow = block.querySelector('.block-arrow');

  const isOpen = content.classList.contains('open');
  if (isOpen) {
    content.classList.remove('open');
    arrow.classList.remove('open');
  } else {
    content.classList.add('open');
    arrow.classList.add('open');
  }
}

function openPhotoSwipe(imageUrl) {
  if (window.PhotoSwipe && window.PhotoSwipeUI_Default) {
    const pswpElement = document.querySelector('.pswp');
    const items = [{ src: imageUrl, w: 0, h: 0 }];
    const options = {
      index: 0,
      getThumbBoundsFn: () => ({ x: 0, y: 0, w: 0 })
    };
    const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
    gallery.listen('gettingData', (index, item) => {
      if (item.w === 0 && item.h === 0) {
        const img = new Image();
        img.onload = () => {
          item.w = img.naturalWidth;
          item.h = img.naturalHeight;
          gallery.updateSize(true);
        };
        img.src = item.src;
      }
    });
    gallery.init();
  } else {
    window.open(imageUrl, '_blank');
  }
}

function openPDFModal(pdfUrl) {
  if (!window.pdfjsLib) {
    window.open(pdfUrl, '_blank');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'pdf-modal';
  modal.id = 'pdfModal';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'pdf-modal-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => {
    modal.remove();
  };

  modal.appendChild(closeBtn);
  document.body.appendChild(modal);

  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then(page => {
        const viewport = page.getViewport({ scale: 1 });
        const scale = viewport.width > window.innerWidth ? window.innerWidth / viewport.width : 1;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        modal.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        page.render({ canvasContext: ctx, viewport: scaledViewport });
      });
    }
  }).catch(() => {
    modal.remove();
    window.open(pdfUrl, '_blank');
  });
}

function renderKRSList(instructions) {
  const container = document.getElementById('krsContainer');
  if (!container) return;

  if (instructions.length === 0) {
    container.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    return;
  }

  const sorted = [...instructions].sort((a, b) => new Date(b.date) - new Date(a.date));

  const html = sorted.map(item => {
    const status = getStatusBadge(item.date);
    const formattedDate = new Date(item.date).toLocaleDateString('ru-RU');

    let mediaHtml = '';
    if (item.pic) {
      mediaHtml += `
        <img class="krs-photo-thumb" src="${item.pic}"
          onclick="openPhotoSwipe('${item.pic}')"
          onerror="this.src='icon-192.png'" alt="Фото">
      `;
    }
    if (item.pdf) {
      mediaHtml += `
        <button class="krs-pdf-btn" onclick="openPDFModal('${item.pdf}')">
          📄 Открыть оригинал PDF
        </button>
      `;
    }

    return `
      <div class="krs-block" data-block-id="${item.id}">
        <div class="krs-block-header" onclick="toggleKRSBlock('${item.id}')">
          <span class="status-badge" style="background:${status.color};color:#FFF;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;min-width:28px;text-align:center;">
            ${status.emoji}
          </span>
          <span class="krs-doc-id">${item.id}</span>
          <span class="krs-block-title">${escapeHtml(item.title)}</span>
          <span class="block-arrow">▼</span>
        </div>
        <div class="krs-block-content">
          <div class="krs-date">${formattedDate}</div>
          <div class="krs-author">Автор: ${escapeHtml(item.name)}</div>
          <div class="krs-text">${escapeHtml(item.text)}</div>
          ${mediaHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function initKRS() {
  const container = document.getElementById('krsContainer');
  if (!container) {
    console.error('Контейнер krsContainer не найден!');
    return;
  }

  if (cachedInstructions) {
    renderKRSList(cachedInstructions.instructions);
    return;
  }

  app.showSpinner(container);

  fetch('modules/krs.json')
    .then(r => {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    })
    .then(data => {
      cachedInstructions = data;
      app.hideSpinner(container, '');
      renderKRSList(data.instructions);
    })
    .catch(() => {
      app.showError(container, 'Не удалось загрузить указания КРС');
    });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

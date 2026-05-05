(function() {
  let cachedInstructions = null;
  let isSearchMode = false;
  let openBlocks = {};

  window.initKRS = function() {
    const container = document.getElementById('krsContainer');
    if (!container) {
      console.error('Контейнер krsContainer не найден!');
      return;
    }

    renderKRSHeader(false);

    if (cachedInstructions) {
      renderInstructions(cachedInstructions);
      return;
    }

    window.app.showSkeleton(container, 'blocks');

    fetch('modules/krs.json')
      .then(response => response.json())
      .then(data => {
        cachedInstructions = data.instructions;
        renderInstructions(cachedInstructions);
      })
      .catch(() => {
        window.app.showError(container, 'Не удалось загрузить указания КРС');
      });
  };

  function renderKRSHeader(searchMode) {
    const header = document.getElementById('header');
    if (!header) return;

    isSearchMode = searchMode;

    header.innerHTML = `
      <div class="header-layer ${searchMode ? 'hidden' : ''}" id="krsHeaderDefault">
        <button class="header-btn" onclick="window.app.navigateTo('main')">
          ${window.ICONS.back}
        </button>
        <div class="header-title">Указания КРС</div>
        <button class="header-btn" onclick="window.toggleKRSSearch()">
          ${window.ICONS.search}
        </button>
      </div>
      <div class="header-layer ${searchMode ? '' : 'hidden'}" id="krsHeaderSearch">
        <input 
          type="search" 
          class="header-search-input" 
          id="krsSearchInput" 
          placeholder="Поиск..." 
          autocomplete="off"
        >
        <button class="header-cancel" onclick="window.toggleKRSSearch()">Отмена</button>
      </div>
    `;

    if (searchMode) {
      setTimeout(() => {
        const input = document.getElementById('krsSearchInput');
        if (input) {
          input.focus();
          input.addEventListener('input', handleKRSSearch);
        }
      }, 100);
    }
  }

  window.toggleKRSSearch = function() {
    renderKRSHeader(!isSearchMode);
    if (!isSearchMode) {
      renderInstructions(cachedInstructions);
    }
  };

  function handleKRSSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderInstructions(cachedInstructions);
      return;
    }
    const filtered = cachedInstructions.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.text.toLowerCase().includes(query)
    );
    renderInstructions(filtered);
  }

  function renderInstructions(instructions) {
    const container = document.getElementById('krsContainer');
    if (!container) return;

    if (!instructions || instructions.length === 0) {
      window.app.hideSpinner(container, '<p class="empty-message">Ничего не найдено</p>');
      return;
    }

    const sorted = instructions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    sorted.forEach(item => {
      const age = Math.floor((Date.now() - new Date(item.date)) / (1000*60*60*24*365));
      let badge = '🟢';
      if (age >= 3) badge = '🔴';
      else if (age >= 1) badge = '🟡';

      const isOpen = openBlocks[item.id] || false;

      html += `
        <div class="krs-block-header" onclick="window.toggleKRSBlock('${item.id}')">
          <div class="krs-status-badge">${badge}</div>
          <div class="krs-doc-id">${item.id}</div>
          <div class="block-title">${item.title}</div>
          <div class="block-chevron ${isOpen ? 'rotated' : ''}" id="krs_chevron_${item.id}">
            ${window.ICONS.chevronDown}
          </div>
        </div>
        <div class="krs-block-content ${isOpen ? 'open' : ''}" id="krs_content_${item.id}">
          ${renderKRSContent(item)}
        </div>
      `;
    });

    window.app.hideSpinner(container, html);
  }

  function renderKRSContent(item) {
    const dateStr = new Date(item.date).toLocaleDateString('ru-RU');
    let html = `
      <div class="krs-date">Дата: ${dateStr}</div>
      <div class="krs-author">Автор: ${item.name}</div>
      <div class="krs-text">${item.text}</div>
    `;

    if (item.pic) {
      html += `<img src="${item.pic}" class="krs-photo-thumb" alt="Фото" onerror="this.src='icon-192.png'" onclick="window.openKRSPhoto('${item.pic}')">`;
    }

    if (item.pdf) {
      html += `<button class="krs-pdf-btn" onclick="window.openKRSPDF('${item.pdf}')">📄 Открыть оригинал PDF</button>`;
    }

    return html;
  }

  window.toggleKRSBlock = function(blockId) {
    openBlocks[blockId] = !openBlocks[blockId];
    const content = document.getElementById(`krs_content_${blockId}`);
    const chevron = document.getElementById(`krs_chevron_${blockId}`);
    if (content) {
      content.classList.toggle('open');
    }
    if (chevron) {
      chevron.classList.toggle('rotated');
    }
  };

  window.openKRSPhoto = function(url) {
    if (window.PhotoSwipe && window.PhotoSwipeUI_Default) {
      const pswpElement = document.querySelectorAll('.pswp')[0];
      const items = [{
        src: url,
        w: 1200,
        h: 900
      }];
      const options = {
        index: 0,
        bgOpacity: 0.9,
        shareEl: false
      };
      const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
      gallery.init();
    } else {
      window.open(url, '_blank');
    }
  };

  window.openKRSPDF = function(url) {
    if (window.pdfjsLib) {
      showPDFModal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  function showPDFModal(url) {
    const modal = document.createElement('div');
    modal.className = 'pdf-modal';
    modal.innerHTML = `<button class="pdf-modal-close" onclick="this.parentElement.remove()">✕</button>`;
    document.body.appendChild(modal);

    pdfjsLib.getDocument(url).promise.then(pdf => {
      const numPages = pdf.numPages;
      for (let i = 1; i <= numPages; i++) {
        pdf.getPage(i).then(page => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const scale = viewport.width > window.innerWidth ? window.innerWidth / viewport.width : 1;
          const scaledViewport = page.getViewport({ scale: 1.5 * scale });
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          page.render({
            canvasContext: context,
            viewport: scaledViewport
          });

          modal.appendChild(canvas);
        });
      }
    }).catch(() => {
      modal.remove();
      window.open(url, '_blank');
    });
  }
})();
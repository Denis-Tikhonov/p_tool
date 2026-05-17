// modules/notes.js – Рукописные заметки (согласно 8_MODULE_Notes.txt)
var _notesView = 'list';
var _notesActiveCanvas = null;

// IndexedDB хелперы
function notesOpenDB() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open('pilot-tool-fs', 2);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('handwritten-notes')) {
        db.createObjectStore('handwritten-notes', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function() { resolve(request.result); };
    request.onerror = function() { reject(request.error); };
  });
}

function notesSaveDB(dataURL, thumb) {
  return notesOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('handwritten-notes', 'readwrite');
      var store = tx.objectStore('handwritten-notes');
      var req = store.add({ dataURL: dataURL, thumb: thumb, ts: Date.now() });
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function notesLoadAllDB() {
  return notesOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('handwritten-notes', 'readonly');
      var store = tx.objectStore('handwritten-notes');
      var req = store.getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function notesDeleteDB(id) {
  return notesOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('handwritten-notes', 'readwrite');
      var store = tx.objectStore('handwritten-notes');
      var req = store.delete(id);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function notesClearAllDB() {
  return notesOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('handwritten-notes', 'readwrite');
      var store = tx.objectStore('handwritten-notes');
      var req = store.clear();
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// Хедер
function renderNotesHeader() {
  showNotesListHeader();
}

function showNotesListHeader() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;

  left.innerHTML = '<button class="icon-btn" aria-label="Назад" onclick="app.navigateTo(\'main\')">' + window.ICONS.back + '</button>';
  left.onclick = null;

  center.innerHTML = '<div class="hc-default">Заметки</div>';

  right.innerHTML = '<button class="icon-btn notes-text-btn" id="notesDeleteAllBtn" aria-label="Удалить все">' + window.ICONS['trash-2'] + '</button>';
  right.onclick = null;

  var deleteAllBtn = document.getElementById('notesDeleteAllBtn');
  if (deleteAllBtn) {
    deleteAllBtn.removeEventListener('click', notesDeleteAllHandler);
    deleteAllBtn.addEventListener('click', notesDeleteAllHandler);
  }
}

function notesDeleteAllHandler() {
  notesDeleteAll();
}

function showNotesDrawHeader() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;

  left.innerHTML = '<button class="icon-btn notes-text-btn" id="notesCancelBtn">Отмена</button>';
  left.onclick = null;
  var cancelBtn = document.getElementById('notesCancelBtn');
  if (cancelBtn) {
    cancelBtn.removeEventListener('click', notesCancelHandler);
    cancelBtn.addEventListener('click', notesCancelHandler);
  }

  center.innerHTML = '<div class="hc-default">Новая заметка</div>';

  right.innerHTML = '<button class="icon-btn notes-text-btn" id="notesSaveBtn">Сохранить</button>';
  right.onclick = null;
  var saveBtn = document.getElementById('notesSaveBtn');
  if (saveBtn) {
    saveBtn.removeEventListener('click', notesSaveHandler);
    saveBtn.addEventListener('click', notesSaveHandler);
  }
}

function notesCancelHandler() {
  showNotesList();
}

function notesSaveHandler() {
  notesSaveCurrent();
}

// Список заметок
function showNotesList() {
  _notesView = 'list';
  showNotesListHeader();

  var container = document.getElementById('notesContainer');
  if (!container) return;

  app.showSkeleton(container, 'blocks');

  notesLoadAllDB().then(function(notes) {
    notes.sort(function(a, b) { return b.ts - a.ts; });

    var headerRight = document.getElementById('headerRight');
    if (headerRight) {
      var trashBtn = headerRight.querySelector('button');
      if (trashBtn) trashBtn.style.display = notes.length > 0 ? '' : 'none';
    }

    if (notes.length === 0) {
      app.hideSkeleton(container,
        '<div class="notes-empty">' +
        '<div class="notes-empty-icon">' + window.ICONS['edit-3'] + '</div>' +
        '<p class="notes-empty-text">Нет сохранённых заметок</p>' +
        '<p class="notes-empty-hint">Нажмите «+» чтобы создать первую</p>' +
        '</div>' +
        '<button class="notes-fab" id="notesFabBtn" aria-label="Новая заметка">' + window.ICONS.plus + '</button>'
      );
      var fab = document.getElementById('notesFabBtn');
      if (fab) {
        fab.removeEventListener('click', notesFabHandler);
        fab.addEventListener('click', notesFabHandler);
      }
      return;
    }

    var html = '<div class="notes-grid">';
    for (var i = 0; i < notes.length; i++) {
      var note = notes[i];
      var date = new Date(note.ts).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      html += '<div class="notes-card" data-note-id="' + note.id + '">' +
        '<img class="notes-card-img" ' +
        'src="' + note.thumb + '" ' +
        'data-note-id="' + note.id + '" ' +
        'data-full-src="' + note.dataURL + '" ' +
        'alt="Заметка от ' + date + '" ' +
        'onerror="this.src=\'icon-192.png\'">' +
        '<div class="notes-card-footer">' +
        '<span class="notes-card-date">' + date + '</span>' +
        '<button class="notes-card-delete" data-note-id="' + note.id + '" aria-label="Удалить заметку">' + window.ICONS['trash-2'] + '</button>' +
        '</div>' +
        '</div>';
    }
    html += '</div>';
    html += '<button class="notes-fab" id="notesFabBtn" aria-label="Новая заметка">' + window.ICONS.plus + '</button>';

    app.hideSkeleton(container, html);

    var fab = document.getElementById('notesFabBtn');
    if (fab) {
      fab.removeEventListener('click', notesFabHandler);
      fab.addEventListener('click', notesFabHandler);
    }
  }).catch(function() {
    app.showError(container, 'Не удалось загрузить заметки', showNotesList);
  });
}

function notesFabHandler() {
  showNotesDrawView();
}

// Рисование
function showNotesDrawView() {
  _notesView = 'draw';
  showNotesDrawHeader();

  var container = document.getElementById('notesContainer');
  if (!container) return;

  container.innerHTML =
    '<div class="notes-draw-wrap">' +
    '<div class="notes-draw-toolbar">' +
    '<button class="notes-tool-btn notes-tool-clear" id="notesClearBtn">↺ Очистить</button>' +
    '<div class="notes-stroke-controls">' +
    '<button class="notes-stroke-btn notes-stroke-thin notes-stroke-active" data-width="2" aria-label="Тонкая линия"></button>' +
    '<button class="notes-stroke-btn notes-stroke-mid" data-width="5" aria-label="Средняя линия"></button>' +
    '<button class="notes-stroke-btn notes-stroke-thick" data-width="10" aria-label="Толстая линия"></button>' +
    '</div>' +
    '</div>' +
    '<canvas id="notesCanvas" class="notes-canvas"></canvas>' +
    '</div>';

  initNotesCanvas();
}

function initNotesCanvas() {
  var canvas = document.getElementById('notesCanvas');
  if (!canvas) return;

  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();

  var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 60;
  var toolbarH = 52;
  var w = canvas.offsetWidth;
  var h = window.innerHeight - headerH - toolbarH;
  if (h < 200) h = 200;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  var drawing = false;
  var lastX = 0, lastY = 0;
  var points = [];

  function getPos(e) {
    var rectCanvas = canvas.getBoundingClientRect();
    var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return { x: clientX - rectCanvas.left, y: clientY - rectCanvas.top };
  }

  function onStart(e) {
    e.preventDefault();
    drawing = true;
    var pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    points = [pos];
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onMove(e) {
    e.preventDefault();
    if (!drawing) return;
    var pos = getPos(e);
    points.push(pos);
    if (points.length >= 3) {
      var p0 = points[points.length - 3];
      var p1 = points[points.length - 2];
      var p2 = points[points.length - 1];
      var midX = (p1.x + p2.x) / 2;
      var midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    lastX = pos.x;
    lastY = pos.y;
  }

  function onEnd(e) {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    points = [];
  }

  canvas.addEventListener('pointerdown', onStart, { passive: false });
  canvas.addEventListener('pointermove', onMove, { passive: false });
  canvas.addEventListener('pointerup', onEnd);
  canvas.addEventListener('pointercancel', onEnd);

  var toolbar = document.querySelector('.notes-draw-toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', function(e) {
      var clearBtn = e.target.closest('.notes-tool-clear');
      if (clearBtn) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1a1a1a';
        return;
      }
      var strokeBtn = e.target.closest('.notes-stroke-btn');
      if (strokeBtn) {
        toolbar.querySelectorAll('.notes-stroke-btn').forEach(function(b) {
          b.classList.remove('notes-stroke-active');
        });
        strokeBtn.classList.add('notes-stroke-active');
        ctx.lineWidth = parseInt(strokeBtn.dataset.width, 10) || 3;
        return;
      }
    });
  }

  _notesActiveCanvas = canvas;
}

function notesSaveCurrent() {
  var canvas = _notesActiveCanvas;
  if (!canvas) { showNotesList(); return; }

  var dataURL = canvas.toDataURL('image/png');

  var img = new Image();
  img.onload = function() {
    var thumbCanvas = document.createElement('canvas');
    var scale = Math.min(1, 240 / img.width);
    thumbCanvas.width = Math.round(img.width * scale);
    thumbCanvas.height = Math.round(img.height * scale);
    var tctx = thumbCanvas.getContext('2d');
    tctx.fillStyle = '#FFFFFF';
    tctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    tctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    var thumb = thumbCanvas.toDataURL('image/jpeg', 0.75);

    notesSaveDB(dataURL, thumb).then(function() {
      _notesActiveCanvas = null;
      window.app.showToast('Заметка сохранена');
      showNotesList();
    }).catch(function() {
      window.app.showToast('Ошибка сохранения');
    });
  };
  img.onerror = function() {
    window.app.showToast('Ошибка сохранения');
  };
  img.src = dataURL;
}

function notesDownload(id, src) {
  notesOpenDB().then(function(db) {
    var tx = db.transaction('handwritten-notes', 'readonly');
    var store = tx.objectStore('handwritten-notes');
    var req = store.get(parseInt(id, 10));
    req.onsuccess = function() {
      if (!req.result) return;
      var a = document.createElement('a');
      var date = new Date(req.result.ts);
      var name = 'note_' +
        date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + '_' +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') + '.png';
      a.href = req.result.dataURL;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }).catch(function() {
    window.app.showToast('Не удалось скачать заметку');
  });
}

function notesDeleteOne(id) {
  notesDeleteDB(id).then(function() {
    window.app.showToast('Заметка удалена');
    showNotesList();
  }).catch(function() {
    window.app.showToast('Ошибка удаления');
  });
}

function notesDeleteAll() {
  if (!confirm('Удалить все заметки? Это действие необратимо.')) return;
  notesClearAllDB().then(function() {
    window.app.showToast('Все заметки удалены');
    showNotesList();
  }).catch(function() {
    window.app.showToast('Ошибка удаления');
  });
}

// Инициализация модуля
function initNotes() {
  renderNotesHeader();

  var container = document.getElementById('notesContainer');
  if (!container) { console.error('Контейнер notesContainer не найден!'); return; }

  if (!container.dataset.delegated) {
    container.addEventListener('click', function(e) {
      var fab = e.target.closest('.notes-fab');
      if (fab) { showNotesDrawView(); return; }

      var delBtn = e.target.closest('.notes-card-delete');
      if (delBtn) {
        var id = parseInt(delBtn.dataset.noteId, 10);
        notesDeleteOne(id);
        return;
      }

      var card = e.target.closest('.notes-card-img');
      if (card) {
        var noteId = parseInt(card.dataset.noteId, 10);
        if (noteId) notesDownload(noteId, card.src);
        return;
      }
    });
    container.dataset.delegated = 'true';
  }

  showNotesList();
}
/* ============ Тема оформления ============ */

(function initTheme() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', function () {
        const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', next);
        document.documentElement.setAttribute('data-color-scheme', next);
        try {
            localStorage.setItem('notesapp-theme', next);
        } catch (e) { }
    });
})();

/* ============ Бейдж задач на сегодня ============ */

(function initTodayTasksBadge() {
    const badge = document.getElementById('todayTasksBadge');
    if (!badge) {
        return;
    }

    fetch('/api/tasks')
        .then(response => response.ok ? response.json() : [])
        .then(tasks => {
            const today = formatDateInput(new Date());
            const count = tasks.filter(task => !task.isDone && task.day.split('T')[0] === today).length;

            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('d-none');
            }
        })
        .catch(() => { /* бейдж не критичен */ });
})();

function formatDateInput(date) {
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* ============ Заметки ============ */

let loadedNotes = [];
const noteSaveTimers = new Map();

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('noteContainer')) {
        return; // Страница не содержит заметок (например, страница задач)
    }

    loadNotes();

    const search = document.getElementById('noteSearch');
    if (search) {
        search.addEventListener('input', filterNotes);
    }
});

function filterNotes() {
    const search = document.getElementById('noteSearch');
    const query = search ? search.value.trim().toLowerCase() : '';
    const cards = document.querySelectorAll('#noteContainer .note-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const content = card.querySelector('.note-content').textContent.toLowerCase();
        const matches = title.includes(query) || content.includes(query);

        card.style.display = matches ? '' : 'none';
        if (matches) {
            visibleCount++;
        }
    });

    const noResults = document.getElementById('noResults');
    if (noResults) {
        noResults.style.display = (cards.length > 0 && visibleCount === 0) ? '' : 'none';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadNotes() {
    const container = document.getElementById('noteContainer');

    try {
        const response = await fetch('/api/notes');

        if (!response.ok) {
            throw new Error('Не удалось загрузить заметки');
        }

        loadedNotes = await response.json();

        container.innerHTML = '';

        if (loadedNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🗒️</span>
                    <div class="empty-state-title">Заметок пока нет</div>
                    <div>Нажмите кнопку «+» в правом нижнем углу, чтобы создать первую заметку.</div>
                </div>`;
            return;
        }

        loadedNotes.forEach(note => {
            container.appendChild(createNoteElement(note));
        });

        filterNotes();

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-state text-danger">Ошибка при загрузке заметок</div>';
    }
}

async function addNote() {
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title) {
        alert('Введите заголовок заметки');
        return;
    }

    const newNote = {
        title: title,
        content: content
    };

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newNote)
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении');
        }

        titleInput.value = '';
        contentInput.value = '';

        const modalElement = document.getElementById('addNoteModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modalInstance.hide();

        loadNotes();

    } catch (error) {
        console.error('Ошибка при добавлении заметки:', error);
        alert('Не удалось сохранить заметку');
    }
}

async function deleteNote(id) {
    if (!confirm('Вы уверены, что хотите удалить эту заметку?')) {
        return;
    }

    try {
        const response = await fetch(`/api/notes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            alert('Не удалось удалить заметку');
            return;
        }

        loadNotes();

    } catch (error) {
        console.error('Ошибка при удалении заметки:', error);
        alert('Произошла ошибка при удалении заметки.');
    }
}

/* ---------- Сохранение изменений ---------- */

function getNoteCard(element) {
    return element.closest('.note-card');
}

function markNoteDirty(card) {
    if (!card) {
        return;
    }

    card.dataset.dirty = '1';

    clearTimeout(noteSaveTimers.get(card));
    noteSaveTimers.set(card, setTimeout(() => saveNoteCard(card), 900));
}

function showSaveState(card, text) {
    const state = card.querySelector('.note-save-state');
    if (!state) {
        return;
    }

    state.textContent = text;
    state.classList.add('show');

    clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => state.classList.remove('show'), 1800);
}

async function saveNoteCard(card) {
    if (!card || card.dataset.dirty !== '1') {
        return;
    }

    clearTimeout(noteSaveTimers.get(card));
    noteSaveTimers.delete(card);

    const note = loadedNotes.find(item => String(item.id) === card.dataset.noteId);
    if (!note) {
        return;
    }

    const content = card.querySelector('.note-content').innerHTML;
    const isPinned = card.classList.contains('is-pinned');

    try {
        const response = await fetch(`/api/notes/${note.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: note.title,
                content: content,
                createdAt: note.createdAt,
                isPinned: isPinned
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении');
        }

        note.content = content;
        note.isPinned = isPinned;
        card.dataset.dirty = '0';
        showSaveState(card, 'Сохранено');

    } catch (error) {
        console.error('Ошибка при сохранении заметки:', error);
        showSaveState(card, 'Не сохранено');
    }
}

async function togglePin(button) {
    const card = getNoteCard(button);
    const note = loadedNotes.find(item => String(item.id) === card.dataset.noteId);
    if (!note) {
        return;
    }

    const isPinned = !card.classList.contains('is-pinned');
    card.classList.toggle('is-pinned', isPinned);
    button.classList.toggle('is-pinned-toggle', isPinned);
    button.textContent = isPinned ? '📌' : '📍';
    button.title = isPinned ? 'Открепить' : 'Закрепить';

    // Форсируем сохранение: вместе с контентом уйдёт и новый статус закрепления
    card.dataset.dirty = '1';
    await saveNoteCard(card);

    if (card.dataset.dirty === '1') {
        alert('Не удалось закрепить заметку');
    }

    // Перечитываем список, чтобы закреплённые поднялись наверх
    loadNotes();
}

/* ---------- Форматирование ---------- */

function selectEditorContent(editor) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function hasSelectionIn(editor) {
    const selection = window.getSelection();
    return selection.toString() !== '' && editor.contains(selection.anchorNode);
}

function execFormat(command, btn) {
    const editor = btn.closest('.card-body').querySelector('.note-content');
    editor.focus();

    if (!hasSelectionIn(editor)) {
        selectEditorContent(editor);
    }

    document.execCommand(command, false, null);
    markNoteDirty(getNoteCard(editor));
}

function changeFontSize(delta, btn) {
    const editor = btn.closest('.card-body').querySelector('.note-content');
    editor.focus();

    if (!hasSelectionIn(editor)) {
        selectEditorContent(editor);
    }

    const current = parseInt(editor.dataset.fontSize || '3', 10);
    const newSize = Math.min(7, Math.max(1, current + delta));

    if (newSize === current) {
        return;
    }

    editor.dataset.fontSize = newSize;
    document.execCommand('fontSize', false, newSize);
    markNoteDirty(getNoteCard(editor));
}

function createNoteElement(note) {
    const card = document.createElement('div');
    card.className = 'card note-card' + (note.isPinned ? ' is-pinned' : '');
    card.dataset.noteId = note.id;
    card.dataset.dirty = '0';

    const dateFormatted = new Date(note.createdAt).toLocaleString('ru-RU', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <h5 class="card-title mb-1">${escapeHtml(note.title)}</h5>
                <div class="note-actions">
                    <button type="button" class="btn btn-outline-secondary btn-sm ${note.isPinned ? 'is-pinned-toggle' : ''}"
                            onclick="togglePin(this)" title="${note.isPinned ? 'Открепить' : 'Закрепить'}">
                        ${note.isPinned ? '📌' : '📍'}
                    </button>
                    <button type="button" onclick="deleteNote(${note.id})" class="btn btn-outline-danger btn-sm" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="card-subtitle note-meta mb-0">${dateFormatted}</h6>
                <span class="note-save-state">Сохранено</span>
            </div>
            <div class="btn-toolbar mb-2 note-toolbar" role="toolbar" style="gap: 4px;">
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('bold', this)" title="Жирный">
                    <b>Ж</b>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('italic', this)" title="Курсив">
                    <i>К</i>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('underline', this)" title="Подчёркнутый">
                    <u>П</u>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('strikeThrough', this)" title="Зачёркнутый">
                    <s>З</s>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="changeFontSize(1, this)" title="Увеличить текст">
                    +
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onmousedown="event.preventDefault()"
                        onclick="changeFontSize(-1, this)" title="Уменьшить текст">
                    −
                </button>
            </div>
            <p class="card-text note-content" contenteditable="true" data-font-size="3"
               oninput="markNoteDirty(getNoteCard(this))"
               onblur="saveNoteCard(getNoteCard(this))">${note.content}</p>
        </div>
    `;

    return card;
}

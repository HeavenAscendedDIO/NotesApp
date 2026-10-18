document.addEventListener('DOMContentLoaded', function () {
    loadNotes();

    document.getElementById('noteSearch').addEventListener('input', filterNotes);
});

function filterNotes() {
    const query = document.getElementById('noteSearch').value.trim().toLowerCase();
    const cards = document.querySelectorAll('#noteContainer .card');
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
    noResults.style.display = (cards.length > 0 && visibleCount === 0) ? '' : 'none';
}

async function loadNotes() {
    const container = document.getElementById('noteContainer');

    try {
        const response = await fetch('/api/notes');

        if (!response.ok) {
            throw new Error('Не удалось загрузить заметки');
        }

        const notes = await response.json();

        container.innerHTML = '';

        if (notes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">Заметок пока нет</div>';
            return;
        }

        notes.forEach(note => {
            const noteCard = createNoteElement(note);
            container.appendChild(noteCard);
        });

        filterNotes();

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="text-center text-danger">Ошибка при загрузке заметок</div>';
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

        const createdNote = await response.json();

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
}

function createNoteElement(note) {
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';

    const dateFormatted = new Date(note.createdAt).toLocaleString('ru-RU');

    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title mb-1">${note.title}</h5>
                <button onclick="deleteNote(${note.id})" class="btn btn-outline-danger btn-sm" title="Удалить">
                    🗑️
                </button>
            </div>
            <h6 class="card-subtitle mb-2 text-muted" style="font-size: 0.8rem;">${dateFormatted}</h6>
            <div class="btn-toolbar mb-2 note-toolbar" role="toolbar" style="gap: 4px;">
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('bold', this)" title="Жирный">
                    <b>Ж</b>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('italic', this)" title="Курсив">
                    <i>К</i>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('underline', this)" title="Подчёркнутый">
                    <u>П</u>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="execFormat('strikeThrough', this)" title="Зачёркнутый">
                    <s>З</s>
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="changeFontSize(1, this)" title="Увеличить текст">
                    +
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="width: 34px;"
                        onmousedown="event.preventDefault()"
                        onclick="changeFontSize(-1, this)" title="Уменьшить текст">
                    −
                </button>
            </div>
            <p class="card-text note-content" contenteditable="true" data-font-size="3"
               style="min-height: 1.5rem; outline: none;">${note.content}</p>
        </div>
    `;

    return card;
}
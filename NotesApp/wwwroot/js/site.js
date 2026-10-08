document.addEventListener('DOMContentLoaded', function () {
    loadNotes();
});


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

        const createdNote = await response.json();

        titleInput.value = '';
        contentInput.value = '';

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
            <p class="card-text">${note.content}</p>
        </div>
    `;

    return card;
}
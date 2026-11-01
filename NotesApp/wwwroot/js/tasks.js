let calendar = null;
let loadedTasks = [];

document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'ru',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        firstDay: 1,
        editable: true,
        dayMaxEvents: true,
        events: fetchTasks,
        eventContent: createTaskEventContent,
        datesSet: updateTaskProgress,
        eventsSet: updateTaskProgress,
        dateClick: function (info) {
            openTaskModal(null, info.date);
        },
        eventClick: function (info) {
            openTaskModal(parseInt(info.event.id, 10));
        },
        eventDrop: function (info) {
            updateDay(parseInt(info.event.id, 10), info.event.start);
        }
    });

    calendar.render();
});

async function fetchTasks(info, successCallback, failureCallback) {
    try {
        const response = await fetch('/api/tasks');

        if (!response.ok) {
            throw new Error('Не удалось загрузить задачи');
        }

        loadedTasks = await response.json();
        successCallback(loadedTasks.map(taskToEvent));

    } catch (error) {
        console.error('Ошибка:', error);
        failureCallback(error);
        alert('Не удалось загрузить задачи');
    }
}

function taskToEvent(task) {
    return {
        id: task.id,
        title: task.title,
        start: task.day.split('T')[0],
        allDay: true,
        extendedProps: {
            isDone: task.isDone,
            description: task.description
        },
        color: task.isDone ? 'var(--fc-monarch-secondary)' : null,
        contrastColor: task.isDone ? 'var(--fc-monarch-secondary-foreground)' : null,
        className: task.isDone ? 'task-done' : ''
    };
}

function createTaskEventContent(arg) {
    const taskId = parseInt(arg.event.id, 10);
    const isDone = arg.event.extendedProps.isDone;

    const wrapper = document.createElement('div');
    wrapper.className = 'task-event-content';

    const toggle = document.createElement('span');
    toggle.className = 'task-toggle' + (isDone ? ' is-checked' : '');
    toggle.textContent = isDone ? '✔' : '○';
    toggle.title = isDone ? 'Отметить как невыполненную' : 'Отметить выполненной';

    // Не даём клику по чекбоксу открыть модалку задачи
    toggle.addEventListener('mousedown', event => event.stopPropagation());
    toggle.addEventListener('click', async function (event) {
        event.stopPropagation();
        event.preventDefault();
        await toggleTaskDone(taskId);
    });

    const title = document.createElement('span');
    title.className = 'fc-event-title';
    title.textContent = arg.event.title;

    wrapper.append(toggle, title);

    return { domNodes: [wrapper] };
}

async function toggleTaskDone(id) {
    try {
        const response = await fetch(`/api/tasks/${id}/toggle`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            throw new Error('Ошибка при изменении статуса');
        }

        calendar.refetchEvents();

    } catch (error) {
        console.error('Ошибка при изменении статуса задачи:', error);
        alert('Не удалось изменить статус задачи');
    }
}

function updateTaskProgress() {
    const container = document.getElementById('taskProgress');
    if (!container || !calendar) {
        return;
    }

    const start = calendar.view.activeStart;
    const end = calendar.view.activeEnd;

    const inRange = loadedTasks.filter(task => {
        const day = new Date(task.day.split('T')[0] + 'T00:00:00');
        return day >= start && day < end;
    });

    const total = inRange.length;
    const done = inRange.filter(task => task.isDone).length;

    container.querySelector('.task-progress-text').textContent =
        total === 0 ? 'Задач нет' : `Выполнено ${done} из ${total}`;

    container.querySelector('.progress-bar').style.width =
        total === 0 ? '0%' : `${Math.round(done / total * 100)}%`;
}

function openTaskModal(id, baseDate) {
    const task = id === null ? null : loadedTasks.find(t => t.id === id);

    document.getElementById('taskId').value = task ? task.id : '';
    document.getElementById('taskTitle').value = task ? task.title : '';
    document.getElementById('taskDescription').value = task ? task.description : '';

    const modalLabel = document.getElementById('taskModalLabel');
    const dayInput = document.getElementById('taskDay');
    const deleteButton = document.getElementById('deleteTaskButton');
    const isDoneGroup = document.getElementById('taskIsDoneGroup');

    if (task) {
        modalLabel.textContent = 'Редактирование задачи';
        dayInput.value = task.day.split('T')[0];
        deleteButton.style.display = '';
        isDoneGroup.style.display = '';
        document.getElementById('taskIsDone').checked = task.isDone;
    } else {
        modalLabel.textContent = 'Новая задача';
        dayInput.value = formatDateInput(baseDate || new Date());
        deleteButton.style.display = 'none';
        isDoneGroup.style.display = 'none';
        document.getElementById('taskIsDone').checked = false;
    }

    const modalElement = document.getElementById('taskModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modalInstance.show();
}

async function saveTask() {
    const idInput = document.getElementById('taskId');
    const titleInput = document.getElementById('taskTitle');
    const descriptionInput = document.getElementById('taskDescription');
    const dayInput = document.getElementById('taskDay');

    const title = titleInput.value.trim();
    const day = dayInput.value;

    if (!title) {
        alert('Введите заголовок задачи');
        return;
    }

    if (!day) {
        alert('Выберите день задачи');
        return;
    }

    const isEdit = idInput.value !== '';
    const isDoneInput = document.getElementById('taskIsDone');

    const taskData = {
        title: title,
        description: descriptionInput.value.trim(),
        day: day,
        isDone: isEdit ? isDoneInput.checked : false
    };

    const url = isEdit ? `/api/tasks/${idInput.value}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении');
        }

        const modalElement = document.getElementById('taskModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        calendar.refetchEvents();

    } catch (error) {
        console.error('Ошибка при сохранении задачи:', error);
        alert('Не удалось сохранить задачу');
    }
}

async function deleteTask() {
    const idInput = document.getElementById('taskId');

    if (!idInput.value) {
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${idInput.value}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            alert('Не удалось удалить задачу');
            return;
        }

        const modalElement = document.getElementById('taskModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        calendar.refetchEvents();

    } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
        alert('Произошла ошибка при удалении задачи.');
    }
}

async function updateDay(id, newDate) {
    const task = loadedTasks.find(t => t.id === id);

    if (!task || !newDate) {
        return;
    }

    const taskData = {
        title: task.title,
        description: task.description,
        day: formatDateInput(newDate),
        isDone: task.isDone
    };

    try {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении');
        }

    } catch (error) {
        console.error('Ошибка при изменении дня:', error);
        alert('Не удалось изменить день задачи');
        calendar.refetchEvents();
    }
}

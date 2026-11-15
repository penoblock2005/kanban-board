/**
 * Канбан-доска — Итерация 7
 *
 * Возможности:
 *  - Добавление карточки по кнопке или Enter
 *  - Удаление карточки кнопкой ×
 *  - Drag & Drop между колонками
 *  - Inline-редактирование заголовка по двойному клику
 *  - Модальное окно для описания, приоритета и дедлайна
 *  - Индикатор наличия описания (синяя точка)
 *  - Бейдж приоритета на карточке (низкий/средний/высокий)
 *  - Отображение дедлайна, подсветка просроченных дат
 *  - Панель инструментов: поиск по названию/описанию, фильтр по приоритету
 *  - Счётчики задач в заголовках колонок
 *  - Сохранение всех данных в LocalStorage
 */

(function () {
    'use strict';

    /* ===================== Хранилище (LocalStorage) ===================== */

    var STORAGE_KEY = 'kanban-cards';

    function loadCards() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCards() {
        var cards = [];
        document.querySelectorAll('.card').forEach(function (cardEl) {
            cards.push({
                id: cardEl.dataset.id,
                text: cardEl.querySelector('.card p').textContent,
                description: cardEl.dataset.description || '',
                priority: cardEl.dataset.priority || '',
                deadline: cardEl.dataset.deadline || '',
                column: cardEl.closest('.column').dataset.status
            });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }

    /* ===================== Генерация ID ===================== */

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /* ===================== Добавление карточки ===================== */

    document.querySelectorAll('.add-task-form').forEach(function (form) {
        var input = form.querySelector('.task-input');
        var button = form.querySelector('.add-task-btn');
        var cardsContainer = form.previousElementSibling;

        button.addEventListener('click', function () {
            addCard(input, cardsContainer);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCard(input, cardsContainer);
            }
        });
    });

    function addCard(input, cardsContainer) {
        var text = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }

        var card = createCard(text, '', '', '');
        cardsContainer.appendChild(card);
        input.value = '';
        input.focus();
        saveCards();
        applyFilters();
    }

    /* ===================== Создание карточки ===================== */

    function createCard(text, description, priority, deadline) {
        var id = generateId();
        var card = document.createElement('div');
        card.className = 'card';
        card.draggable = true;
        card.dataset.id = id;
        card.dataset.description = description || '';
        card.dataset.priority = priority || '';
        card.dataset.deadline = deadline || '';

        /* Тело: текст + индикатор + мета + иконки */
        var body = document.createElement('div');
        body.className = 'card-body';

        /* Индикатор описания */
        if (description) {
            var indicator = document.createElement('div');
            indicator.className = 'description-indicator';
            indicator.title = 'Есть описание';
            body.appendChild(indicator);
        }

        /* Текст заголовка */
        var paragraph = document.createElement('p');
        paragraph.textContent = text;
        body.appendChild(paragraph);

        /* Мета-блок: приоритет + дедлайн */
        var meta = document.createElement('div');
        meta.className = 'card-meta';

        if (priority) {
            var badge = document.createElement('span');
            badge.className = 'priority-badge ' + priority;
            badge.textContent = getPriorityLabel(priority);
            meta.appendChild(badge);
        }

        if (deadline) {
            var deadlineEl = document.createElement('span');
            deadlineEl.className = 'card-deadline';
            var isOverdue = isDateOverdue(deadline);
            if (isOverdue) {
                deadlineEl.classList.add('overdue');
            }
            deadlineEl.textContent = formatDate(deadline) + (isOverdue ? ' (просрочено)' : '');
            meta.appendChild(deadlineEl);
        }

        body.appendChild(meta);
        card.appendChild(body);

        /* Панель иконок */
        var actions = document.createElement('div');
        actions.className = 'card-actions';

        /* Кнопка описания */
        var descBtn = document.createElement('button');
        descBtn.className = 'card-icon-btn';
        descBtn.type = 'button';
        descBtn.title = 'Описание';
        descBtn.innerHTML = '&#128203;';
        descBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            openModal(card);
        });
        actions.appendChild(descBtn);

        /* Кнопка удаления */
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-icon-btn delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Удалить задачу';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(30px)';
            setTimeout(function () {
                card.remove();
                saveCards();
                applyFilters();
            }, 200);
        });
        actions.appendChild(deleteBtn);

        card.appendChild(actions);

        /* Двойной клик — inline-редактирование заголовка */
        card.addEventListener('dblclick', function (e) {
            if (e.target.closest('.card-actions')) return;
            startInlineEdit(card, paragraph);
        });

        /* Одинарный клик — открыть модалку */
        card.addEventListener('click', function (e) {
            if (e.target.closest('.card-actions')) return;
            openModal(card);
        });

        return card;
    }

    /* ===================== Утилиты для приоритета и даты ===================== */

    function getPriorityLabel(priority) {
        var labels = {
            low: 'Низкий',
            medium: 'Средний',
            high: 'Высокий'
        };
        return labels[priority] || '';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        return parts[2] + '.' + parts[1];
    }

    function isDateOverdue(dateStr) {
        if (!dateStr) return false;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var deadline = new Date(dateStr + 'T00:00:00');
        return deadline < today;
    }

    /* ===================== Inline-редактирование заголовка ===================== */

    function startInlineEdit(card, paragraph) {
        var currentText = paragraph.textContent;
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'card-title-input';
        input.value = currentText;
        input.maxLength = 120;

        paragraph.style.display = 'none';
        card.querySelector('.card-body').insertBefore(input, paragraph.nextSibling || null);
        input.focus();
        input.select();

        function finishEdit() {
            var newText = input.value.trim();
            if (newText && newText !== currentText) {
                paragraph.textContent = newText;
                card.dataset.title = newText;
                saveCards();
                applyFilters();
            }
            input.replaceWith(paragraph);
            paragraph.style.display = '';
        }

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
            if (e.key === 'Escape') {
                input.value = currentText;
                input.blur();
            }
        });
    }

    /* ===================== Модальное окно ===================== */

    var overlay = document.getElementById('modalOverlay');
    var textarea = document.getElementById('modalDescription');
    var prioritySelect = document.getElementById('modalPriority');
    var deadlineInput = document.getElementById('modalDeadline');
    var saveBtn = overlay.querySelector('.modal-btn-primary');
    var cancelBtn = overlay.querySelector('.modal-btn-secondary');
    var closeBtn = overlay.querySelector('.modal-close');
    var currentCard = null;

    function openModal(card) {
        currentCard = card;
        textarea.value = card.dataset.description || '';
        prioritySelect.value = card.dataset.priority || '';
        deadlineInput.value = card.dataset.deadline || '';
        overlay.classList.add('active');
        setTimeout(function () {
            textarea.focus();
        }, 100);
    }

    function closeModal() {
        overlay.classList.remove('active');
        currentCard = null;
    }

    saveBtn.addEventListener('click', function () {
        if (!currentCard) return;

        var desc = textarea.value.trim();
        var priority = prioritySelect.value;
        var deadline = deadlineInput.value;

        currentCard.dataset.description = desc;
        currentCard.dataset.priority = priority;
        currentCard.dataset.deadline = deadline;

        /* Обновить тело карточки */
        var body = currentCard.querySelector('.card-body');

        /* Индикатор описания */
        var existingIndicator = body.querySelector('.description-indicator');
        if (desc && !existingIndicator) {
            var indicator = document.createElement('div');
            indicator.className = 'description-indicator';
            indicator.title = 'Есть описание';
            var paragraph = body.querySelector('p');
            body.insertBefore(indicator, paragraph);
        } else if (!desc && existingIndicator) {
            existingIndicator.remove();
        }

        /* Обновить мета-блок (приоритет + дедлайн) */
        var existingMeta = body.querySelector('.card-meta');
        if (existingMeta) existingMeta.remove();

        if (priority || deadline) {
            var meta = document.createElement('div');
            meta.className = 'card-meta';

            if (priority) {
                var badge = document.createElement('span');
                badge.className = 'priority-badge ' + priority;
                badge.textContent = getPriorityLabel(priority);
                meta.appendChild(badge);
            }

            if (deadline) {
                var deadlineEl = document.createElement('span');
                deadlineEl.className = 'card-deadline';
                var isOverdue = isDateOverdue(deadline);
                if (isOverdue) {
                    deadlineEl.classList.add('overdue');
                }
                deadlineEl.textContent = formatDate(deadline) + (isOverdue ? ' (просрочено)' : '');
                meta.appendChild(deadlineEl);
            }

            body.appendChild(meta);
        }

        saveCards();
        applyFilters();
        closeModal();
    });

    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal();
        }
    });

    /* ===================== Drag & Drop ===================== */

    document.querySelectorAll('.cards').forEach(function (container) {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });

    function handleDragOver(e) {
        e.preventDefault();
        this.closest('.column').classList.add('drag-over');
    }

    function handleDragLeave() {
        this.closest('.column').classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.closest('.column').classList.remove('drag-over');

        var draggedCard = document.querySelector('.card.dragging');
        if (draggedCard) {
            this.appendChild(draggedCard);
            saveCards();
            applyFilters();
        }
    }

    var board = document.querySelector('.board');

    board.addEventListener('dragstart', function (e) {
        var card = e.target.closest('.card');
        if (!card) return;
        card.classList.add('dragging');
    });

    board.addEventListener('dragend', function () {
        var card = document.querySelector('.card.dragging');
        if (card) card.classList.remove('dragging');
        document.querySelectorAll('.column').forEach(function (col) {
            col.classList.remove('drag-over');
        });
    });

    /* ===================== Поиск и фильтрация ===================== */

    var searchInput = document.getElementById('searchInput');
    var priorityFilter = document.getElementById('priorityFilter');
    var toolbarResults = document.getElementById('toolbarResults');

    searchInput.addEventListener('input', applyFilters);
    priorityFilter.addEventListener('change', applyFilters);

    function applyFilters() {
        var query = searchInput.value.trim().toLowerCase();
        var filterPriority = priorityFilter.value;
        var visibleCount = 0;
        var totalCount = document.querySelectorAll('.card').length;

        document.querySelectorAll('.card').forEach(function (card) {
            var title = (card.querySelector('.card p') || {}).textContent || '';
            var description = card.dataset.description || '';
            var priority = card.dataset.priority || '';

            var matchesSearch = !query ||
                title.toLowerCase().indexOf(query) !== -1 ||
                description.toLowerCase().indexOf(query) !== -1;

            var matchesPriority = !filterPriority || priority === filterPriority;

            if (matchesSearch && matchesPriority) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        /* Обновить счётчики колонок */
        updateColumnCounts();

        /* Обновить счётчик результатов */
        if (query || filterPriority) {
            toolbarResults.textContent = 'Найдено: ' + visibleCount + ' из ' + totalCount;
        } else {
            toolbarResults.textContent = '';
        }
    }

    function updateColumnCounts() {
        document.querySelectorAll('.column').forEach(function (column) {
            var cardsContainer = column.querySelector('.cards');
            var allCards = cardsContainer.querySelectorAll('.card');
            var visibleCards = cardsContainer.querySelectorAll('.card:not([style*="display: none"])');
            var count = visibleCards.length;

            var countEl = column.querySelector('.column-count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'column-count';
                var h2 = column.querySelector('h2');
                if (h2) {
                    h2.appendChild(countEl);
                }
            }

            countEl.textContent = count;

            if (count > 0) {
                countEl.classList.add('has-cards');
            } else {
                countEl.classList.remove('has-cards');
            }
        });
    }

    /* ===================== Загрузка из LocalStorage ===================== */

    function init() {
        var cardsData = loadCards();
        var columns = {
            todo: document.querySelector('[data-status="todo"] .cards'),
            progress: document.querySelector('[data-status="progress"] .cards'),
            done: document.querySelector('[data-status="done"] .cards')
        };

        cardsData.forEach(function (data) {
            var container = columns[data.column];
            if (container) {
                var card = createCard(
                    data.text || 'Без названия',
                    data.description || '',
                    data.priority || '',
                    data.deadline || ''
                );
                card.dataset.id = data.id;
                container.appendChild(card);
            }
        });

        updateColumnCounts();
    }

    init();

})();

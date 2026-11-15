/**
 * Канбан-доска (Vanilla JS)
 * Модуль управления состоянием, LocalStorage, Drag-and-Drop и темами оформления
 */

(function () {
    'use strict';

    // Ключи LocalStorage
    const STORAGE_KEY_TASKS = 'kanban_tasks_v2';
    const STORAGE_KEY_THEME = 'kanban_theme_v2';

    // Демонстрационные данные по умолчанию
    const DEFAULT_TASKS = [
        {
            id: 'task-1',
            title: 'Спроектировать макет интерфейса',
            description: 'Подготовить адаптивные сетки для десктопа и смартфонов.',
            status: 'todo',
            priority: 'high',
            deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
        },
        {
            id: 'task-2',
            title: 'Интеграция переключения темы (Dark/Light)',
            description: 'Настроить CSS-переменные и сохранение состояния в LocalStorage.',
            status: 'progress',
            priority: 'medium',
            deadline: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
        },
        {
            id: 'task-3',
            title: 'Создать базовый каркас проекта',
            description: 'Инициализировать index.html, style.css и script.js.',
            status: 'done',
            priority: 'low',
            deadline: ''
        }
    ];

    // Состояние приложения
    let tasks = [];
    let draggedTaskId = null;
    let editingTaskId = null;

    // DOM-элементы
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggle');
    const searchInput = document.getElementById('searchInput');
    const priorityFilter = document.getElementById('priorityFilter');
    const totalTasksCountEl = document.getElementById('totalTasksCount');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const resetDemoBtn = document.getElementById('resetDemoBtn');

    // Модальное окно
    const taskModal = document.getElementById('taskModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const editTaskTitle = document.getElementById('editTaskTitle');
    const editTaskDesc = document.getElementById('editTaskDesc');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskDeadline = document.getElementById('editTaskDeadline');

    // Колонки
    const columns = {
        todo: document.getElementById('cards-todo'),
        progress: document.getElementById('cards-progress'),
        done: document.getElementById('cards-done')
    };

    const countEls = {
        todo: document.getElementById('count-todo'),
        progress: document.getElementById('count-progress'),
        done: document.getElementById('count-done')
    };

    // ==========================================
    // 1. Инициализация и тема оформления
    // ==========================================

    function initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
        if (savedTheme) {
            htmlEl.setAttribute('data-theme', savedTheme);
        } else {
            // Проверка системной темы
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            htmlEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }

        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        const currentTheme = htmlEl.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    }

    // ==========================================
    // 2. Хранилище задач (LocalStorage)
    // ==========================================

    function loadTasks() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_TASKS);
            if (data) {
                tasks = JSON.parse(data);
            } else {
                tasks = [...DEFAULT_TASKS];
                saveTasks();
            }
        } catch (e) {
            console.error('Ошибка загрузки задач из LocalStorage:', e);
            tasks = [...DEFAULT_TASKS];
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
        } catch (e) {
            console.error('Ошибка сохранения задач в LocalStorage:', e);
        }
    }

    // ==========================================
    // 3. Рендеринг карточек
    // ==========================================

    function renderBoard() {
        const query = (searchInput.value || '').trim().toLowerCase();
        const selectedPriority = priorityFilter.value || 'all';

        // Очищаем списки колонок
        Object.values(columns).forEach(col => { col.innerHTML = ''; });

        const counts = { todo: 0, progress: 0, done: 0 };

        tasks.forEach(task => {
            // Фильтрация
            const matchesQuery = !query || 
                task.title.toLowerCase().includes(query) || 
                (task.description && task.description.toLowerCase().includes(query));

            const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;

            if (matchesQuery && matchesPriority) {
                const cardEl = createCardElement(task);
                if (columns[task.status]) {
                    columns[task.status].appendChild(cardEl);
                }
            }

            if (counts[task.status] !== undefined) {
                counts[task.status]++;
            }
        });

        // Обновляем счётчики
        let totalCount = 0;
        Object.keys(counts).forEach(status => {
            if (countEls[status]) {
                const count = counts[status];
                countEls[status].textContent = count;
                countEls[status].classList.toggle('has-cards', count > 0);
                totalCount += count;
            }
        });

        if (totalTasksCountEl) {
            totalTasksCountEl.textContent = totalCount;
        }
    }

    function createCardElement(task) {
        const card = document.createElement('div');
        card.className = 'card';
        card.draggable = true;
        card.dataset.id = task.id;

        // Приоритет
        const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
        const priorityBadgeHtml = `
            <span class="priority-badge ${task.priority || 'medium'}">
                ● ${priorityLabels[task.priority] || 'Средний'}
            </span>
        `;

        // Дедлайн
        let deadlineHtml = '';
        if (task.deadline) {
            const isOverdue = new Date(task.deadline) < new Date(new Date().toDateString()) && task.status !== 'done';
            deadlineHtml = `
                <span class="card-deadline ${isOverdue ? 'overdue' : ''}" title="${isOverdue ? 'Дедлайн просрочен!' : 'Срок сдачи'}">
                    📅 ${formatDate(task.deadline)}
                </span>
            `;
        }

        // Индикатор описания
        const hasDesc = task.description && task.description.trim().length > 0;
        const descIndicatorHtml = hasDesc ? `
            <span class="description-indicator" title="Есть подробное описание">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="21" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="15" y1="18" x2="3" y2="18"/>
                </svg>
            </span>
        ` : '';

        card.innerHTML = `
            <div class="card-body">
                <div class="card-title-row">
                    <p class="card-title">${escapeHtml(task.title)}</p>
                    <div class="card-actions">
                        <button class="card-icon-btn edit-btn" type="button" title="Редактировать">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="card-icon-btn delete-btn" type="button" title="Удалить задачу">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-meta">
                    ${priorityBadgeHtml}
                    ${deadlineHtml}
                    ${descIndicatorHtml}
                </div>
            </div>
        `;

        // Слушатели Drag and Drop
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        // Клик по карточке для открытия модального окна
        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                deleteTask(task.id);
            } else if (e.target.closest('.edit-btn')) {
                e.stopPropagation();
                openEditModal(task.id);
            } else {
                openEditModal(task.id);
            }
        });

        // Двойной клик: быстрое инлайн-переименование
        const titleEl = card.querySelector('.card-title');
        titleEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            enableInlineEdit(titleEl, task);
        });

        return card;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return dateStr;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================
    // 4. Добавление, удаление, редактирование
    // ==========================================

    function addTask(status, title) {
        const cleanTitle = (title || '').trim();
        if (!cleanTitle) return;

        const newTask = {
            id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            title: cleanTitle,
            description: '',
            status: status || 'todo',
            priority: 'medium',
            deadline: ''
        };

        tasks.push(newTask);
        saveTasks();
        renderBoard();
    }

    function deleteTask(taskId) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderBoard();
    }

    function enableInlineEdit(titleEl, task) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'card-title-input';
        input.value = task.title;
        input.maxLength = 120;

        const parent = titleEl.parentNode;
        parent.replaceChild(input, titleEl);
        input.focus();
        input.select();

        function finishEdit() {
            const val = input.value.trim();
            if (val && val !== task.title) {
                task.title = val;
                saveTasks();
            }
            renderBoard();
        }

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                renderBoard();
            }
        });
    }

    // ==========================================
    // 5. Модальное окно
    // ==========================================

    function openEditModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        editingTaskId = taskId;
        editTaskTitle.value = task.title || '';
        editTaskDesc.value = task.description || '';
        editTaskPriority.value = task.priority || 'medium';
        editTaskDeadline.value = task.deadline || '';

        taskModal.classList.add('active');
        taskModal.setAttribute('aria-hidden', 'false');
        editTaskTitle.focus();
    }

    function closeModal() {
        taskModal.classList.remove('active');
        taskModal.setAttribute('aria-hidden', 'true');
        editingTaskId = null;
    }

    function saveModalData() {
        if (!editingTaskId) return;

        const task = tasks.find(t => t.id === editingTaskId);
        if (!task) return;

        const titleVal = editTaskTitle.value.trim();
        if (!titleVal) {
            alert('Пожалуйста, укажите название задачи.');
            return;
        }

        task.title = titleVal;
        task.description = editTaskDesc.value.trim();
        task.priority = editTaskPriority.value;
        task.deadline = editTaskDeadline.value;

        saveTasks();
        closeModal();
        renderBoard();
    }

    // ==========================================
    // 6. Drag and Drop API
    // ==========================================

    function handleDragStart(e) {
        draggedTaskId = this.dataset.id;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTaskId);
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedTaskId = null;
        document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));
    }

    function setupDragAndDrop() {
        Object.entries(columns).forEach(([status, container]) => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                container.classList.add('drag-over');
            });

            container.addEventListener('dragleave', (e) => {
                if (!container.contains(e.relatedTarget)) {
                    container.classList.remove('drag-over');
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');

                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                if (!taskId) return;

                const task = tasks.find(t => t.id === taskId);
                if (task && task.status !== status) {
                    task.status = status;
                    saveTasks();
                    renderBoard();
                }
            });
        });
    }

    // ==========================================
    // 7. Формы быстрого добавления в колонках
    // ==========================================

    function setupAddForms() {
        document.querySelectorAll('.column').forEach(columnEl => {
            const status = columnEl.dataset.status;
            const input = columnEl.querySelector('.task-input');
            const btn = columnEl.querySelector('.add-task-btn');

            if (!input || !btn) return;

            function submit() {
                const title = input.value.trim();
                if (title) {
                    addTask(status, title);
                    input.value = '';
                }
            }

            btn.addEventListener('click', submit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    submit();
                }
            });
        });
    }

    // ==========================================
    // 8. Навешивание остальных слушателей
    // ==========================================

    function setupEventListeners() {
        // Поиск и фильтрация
        searchInput.addEventListener('input', renderBoard);
        priorityFilter.addEventListener('change', renderBoard);

        // Модальное окно
        modalBackdrop.addEventListener('click', closeModal);
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalSaveBtn.addEventListener('click', saveModalData);

        // Закрытие модального по Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && taskModal.classList.contains('active')) {
                closeModal();
            }
        });

        // Сброс и очистка в подвале
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить ВСЕ карточки с доски?')) {
                tasks = [];
                saveTasks();
                renderBoard();
            }
        });

        resetDemoBtn.addEventListener('click', () => {
            if (confirm('Загрузить демонстрационные задачи по умолчанию?')) {
                tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
                saveTasks();
                renderBoard();
            }
        });
    }

    // ==========================================
    // 9. Старт приложения
    // ==========================================

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        loadTasks();
        setupDragAndDrop();
        setupAddForms();
        setupEventListeners();
        renderBoard();
    });

})();

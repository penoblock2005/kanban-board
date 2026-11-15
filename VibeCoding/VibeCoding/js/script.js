/** итерация 3 — добавил эффект непрозрачности кнопкам
 * Канбан-доска — полная клиентская версия
 *
 * Возможности:
 *  - Добавление карточки по кнопке или Enter
 *  - Удаление карточки кнопкой ×
 *  - Drag & Drop между колонками
 *  - Подсветка колонки при перетаскивании
 */

(function () {
    'use strict';

    /* ===================== Добавление карточки ===================== */

    document.querySelectorAll('.add-task-form').forEach(function (form) {
        var input = form.querySelector('.task-input');
        var button = form.querySelector('.add-task-btn');
        var cardsContainer = form.previousElementSibling;

        // Клик по кнопке
        button.addEventListener('click', function () {
            addCard(input, cardsContainer);
        });

        // Нажатие Enter в поле ввода
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

        var card = createCard(text);
        cardsContainer.appendChild(card);
        input.value = '';
        input.focus();
    }

    /* ===================== Создание карточки ===================== */

    function createCard(text) {
        var card = document.createElement('div');
        card.className = 'card';
        card.draggable = true;

        // Текст задачи
        var paragraph = document.createElement('p');
        paragraph.textContent = text;
        card.appendChild(paragraph);

        // Кнопка удаления
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Удалить задачу';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', function () {
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(30px)';
            setTimeout(function () {
                card.remove();
            }, 200);
        });
        card.appendChild(deleteBtn);

        return card;
    }

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
        }
    }

    /* ===================== Инициализация перетаскивания ===================== */

    // Делегирование: вешаем обработчики на доску, чтобы ловить
    // и динамически добавленные карточки
    var board = document.querySelector('.board');

    board.addEventListener('dragstart', function (e) {
        var card = e.target.closest('.card');
        if (!card) return;
        card.classList.add('dragging');
    });

    board.addEventListener('dragend', function () {
        var card = document.querySelector('.card.dragging');
        if (card) {
            card.classList.remove('dragging');
        }
        document.querySelectorAll('.column').forEach(function (col) {
            col.classList.remove('drag-over');
        });
    });

})();

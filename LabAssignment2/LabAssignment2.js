const apiUrl = 'https://jsonplaceholder.typicode.com/todos';


function showForm() {
    $('#addTodoForm').show();
}
function hideForm() {
    $('#addTodoForm').hide();
}


function loadTodos() {
    $.get(apiUrl, function (todos) {
        $('#todo-container').empty();
        todos.slice(0, 10).forEach(todo => {
            $('#todo-container').append(`
                <div class="border p-2 mb-2" id="todo-${todo.id}">
                    <h5>${todo.title}</h5>
                    <p>Status: ${todo.completed ? 'Completed' : 'Pending'}</p>
                    <button class="btn btn-warning btn-sm me-2" onclick="openEditModal(${todo.id}, '${todo.title}', ${todo.completed})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTodo(${todo.id})">Delete</button>
                </div>
            `);
        });
    });
}


$('#addTodoBtn').click(function () {
    const title = $('#todoTitle').val().trim();
    const status = $('#todoStatus').val().trim().toLowerCase();

    if (title && (status === 'true' || status === 'false')) {
        const completed = status === 'true';

        $.post(apiUrl, { title, completed }, function (todo) {
            $('#todo-container').append(`
                <div class="border p-2 mb-2" id="todo-${todo.id}">
                    <h5>${todo.title}</h5>
                    <p>Status: ${completed ? 'Completed' : 'Pending'}</p>
                    <button class="btn btn-warning btn-sm me-2" onclick="openEditModal(${todo.id}, '${todo.title}', ${completed})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTodo(${todo.id})">Delete</button>
                </div>
            `);
            $('#todoTitle').val('');
            $('#todoStatus').val('');
            hideForm();
        });
    } else {
        alert('Please enter a valid title and status (true or false).');
    }
});


function openEditModal(id, title, completed) {
    $('#editTodoId').val(id);
    $('#editTodoTitle').val(title);
    $('#editTodoStatus').val(completed ? 'true' : 'false');
    new bootstrap.Modal($('#editModal')).show();
}


$('#updateTodoBtn').click(function () {
    const id = $('#editTodoId').val();
    const title = $('#editTodoTitle').val().trim();
    const status = $('#editTodoStatus').val().trim().toLowerCase();

    if (title && (status === 'true' || status === 'false')) {
        const completed = status === 'true';

        $.ajax({
            url: `${apiUrl}/${id}`,
            type: 'PUT',
            data: { title, completed },
            success: function () {
                $(`#todo-${id}`).html(`
                    <h5>${title}</h5>
                    <p>Status: ${completed ? 'Completed' : 'Pending'}</p>
                    <button class="btn btn-warning btn-sm me-2" onclick="openEditModal(${id}, '${title}', ${completed})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTodo(${id})">Delete</button>
                `);
                $('#editModal').modal('hide');
            }
        });
    } else {
        alert('Please enter a valid title and status (true or false).');
    }
});


function deleteTodo(id) {
    $.ajax({
        url: `${apiUrl}/${id}`,
        type: 'DELETE',
        success: function () {
            $(`#todo-${id}`).remove();
        }
    });
}


$(document).ready(function () {
    loadTodos();
});

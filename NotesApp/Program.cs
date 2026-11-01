using Microsoft.Data.Sqlite;
using NotesApp;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();

var app = builder.Build();

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

//app.MapStaticAssets();
app.MapRazorPages();

var dbPath = Path.Combine(app.Environment.ContentRootPath, "databases", "notes.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
var connectionString = new SqliteConnectionStringBuilder { DataSource = dbPath }.ToString();

app.MapGet("/api/notes", () =>
{
    var notes = new List<Note>();

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = """
        SELECT id, title, content, created_at, is_pinned
        FROM notes
        ORDER BY is_pinned DESC, id DESC;
        """;

    using var reader = command.ExecuteReader();
    while (reader.Read())
    {
        notes.Add(new Note
        {
            Id = reader.GetInt32(0),
            Title = reader.GetString(1),
            Content = reader.GetString(2),
            CreatedAt = reader.IsDBNull(3) ? DateTime.Now : DateTime.Parse(reader.GetString(3)),
            IsPinned = !reader.IsDBNull(4) && reader.GetInt32(4) != 0
        });
    }

    return Results.Ok(notes);
});
app.MapPost("/api/notes", (Note newNote) =>
{
    if (string.IsNullOrWhiteSpace(newNote.Title))
    {
        return Results.BadRequest("Заголовок не может быть пустым");
    }

    newNote.CreatedAt = DateTime.Now;

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO notes (title, content, created_at, is_pinned)
        VALUES ($title, $content, $createdAt, $isPinned);
        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$title", newNote.Title);
    command.Parameters.AddWithValue("$content", newNote.Content);
    command.Parameters.AddWithValue("$createdAt", newNote.CreatedAt.ToString("O"));
    command.Parameters.AddWithValue("$isPinned", newNote.IsPinned ? 1 : 0);

    newNote.Id = Convert.ToInt32(command.ExecuteScalar());

    return Results.Json(newNote);
});

app.MapPut("/api/notes/{id:int}", (int id, Note updatedNote) =>
{
    if (string.IsNullOrWhiteSpace(updatedNote.Title))
    {
        return Results.BadRequest("Заголовок не может быть пустым");
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE notes
        SET title = $title, content = $content, is_pinned = $isPinned
        WHERE id = $id;
        """;
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$title", updatedNote.Title);
    command.Parameters.AddWithValue("$content", updatedNote.Content);
    command.Parameters.AddWithValue("$isPinned", updatedNote.IsPinned ? 1 : 0);

    if (command.ExecuteNonQuery() == 0)
    {
        return Results.NotFound();
    }

    updatedNote.Id = id;
    return Results.Json(updatedNote);
});


app.MapDelete("/api/notes/{id:int}", (int id) =>
{
    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = "DELETE FROM notes WHERE id = $id;";
    command.Parameters.AddWithValue("$id", id);

    if (command.ExecuteNonQuery() == 0)
    {
        return Results.NotFound();
    }

    return Results.Ok();
});

app.MapGet("/api/tasks", () =>
{
    var tasks = new List<TaskItem>();

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = "SELECT id, title, description, day, is_done FROM tasks ORDER BY day;";

    using var reader = command.ExecuteReader();
    while (reader.Read())
    {
        tasks.Add(new TaskItem
        {
            Id = reader.GetInt32(0),
            Title = reader.GetString(1),
            Description = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
            Day = DateTime.Parse(reader.GetString(3)),
            IsDone = reader.GetInt32(4) != 0
        });
    }

    return Results.Ok(tasks);
});

app.MapPost("/api/tasks", (TaskItem newTask) =>
{
    if (string.IsNullOrWhiteSpace(newTask.Title))
    {
        return Results.BadRequest("Заголовок не может быть пустым");
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO tasks (title, description, day, is_done)
        VALUES ($title, $description, $day, $isDone);
        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$title", newTask.Title);
    command.Parameters.AddWithValue("$description", newTask.Description ?? string.Empty);
    command.Parameters.AddWithValue("$day", newTask.Day.ToString("yyyy-MM-dd"));
    command.Parameters.AddWithValue("$isDone", newTask.IsDone ? 1 : 0);

    newTask.Id = Convert.ToInt32(command.ExecuteScalar());

    return Results.Json(newTask);
});

app.MapPut("/api/tasks/{id:int}", (int id, TaskItem updatedTask) =>
{
    if (string.IsNullOrWhiteSpace(updatedTask.Title))
    {
        return Results.BadRequest("Заголовок не может быть пустым");
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE tasks
        SET title = $title, description = $description, day = $day, is_done = $isDone
        WHERE id = $id;
        """;
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$title", updatedTask.Title);
    command.Parameters.AddWithValue("$description", updatedTask.Description ?? string.Empty);
    command.Parameters.AddWithValue("$day", updatedTask.Day.ToString("yyyy-MM-dd"));
    command.Parameters.AddWithValue("$isDone", updatedTask.IsDone ? 1 : 0);

    if (command.ExecuteNonQuery() == 0)
    {
        return Results.NotFound();
    }

    updatedTask.Id = id;
    return Results.Json(updatedTask);
});

app.MapPatch("/api/tasks/{id:int}/toggle", (int id) =>
{
    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var toggleCommand = connection.CreateCommand();
    toggleCommand.CommandText = """
        UPDATE tasks SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END
        WHERE id = $id;
        """;
    toggleCommand.Parameters.AddWithValue("$id", id);

    if (toggleCommand.ExecuteNonQuery() == 0)
    {
        return Results.NotFound();
    }

    var readCommand = connection.CreateCommand();
    readCommand.CommandText = "SELECT is_done FROM tasks WHERE id = $id;";
    readCommand.Parameters.AddWithValue("$id", id);

    var isDone = Convert.ToInt32(readCommand.ExecuteScalar()) != 0;

    return Results.Json(new { id, isDone });
});

app.MapDelete("/api/tasks/{id:int}", (int id) =>
{
    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = "DELETE FROM tasks WHERE id = $id;";
    command.Parameters.AddWithValue("$id", id);

    if (command.ExecuteNonQuery() == 0)
    {
        return Results.NotFound();
    }

    return Results.Ok();
});

app.Run();

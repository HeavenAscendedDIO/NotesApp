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

using (var connection = new SqliteConnection(connectionString))
{
    connection.Open();

    var createTable = connection.CreateCommand();
    createTable.CommandText = """
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL
        );
        """;
    createTable.ExecuteNonQuery();

    try
    {
        var addColumn = connection.CreateCommand();
        addColumn.CommandText = "ALTER TABLE notes ADD COLUMN created_at TEXT;";
        addColumn.ExecuteNonQuery();
    }
    catch (SqliteException)
    {
        // Столбец уже существует
    }
}

app.MapGet("/api/notes", () =>
{
    var notes = new List<Note>();

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    var command = connection.CreateCommand();
    command.CommandText = "SELECT id, title, content, created_at FROM notes ORDER BY id;";

    using var reader = command.ExecuteReader();
    while (reader.Read())
    {
        notes.Add(new Note
        {
            Id = reader.GetInt32(0),
            Title = reader.GetString(1),
            Content = reader.GetString(2),
            CreatedAt = reader.IsDBNull(3) ? DateTime.Now : DateTime.Parse(reader.GetString(3))
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
        INSERT INTO notes (title, content, created_at)
        VALUES ($title, $content, $createdAt);
        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$title", newNote.Title);
    command.Parameters.AddWithValue("$content", newNote.Content);
    command.Parameters.AddWithValue("$createdAt", newNote.CreatedAt.ToString("O"));

    newNote.Id = Convert.ToInt32(command.ExecuteScalar());

    return Results.Json(newNote);
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

app.Run();

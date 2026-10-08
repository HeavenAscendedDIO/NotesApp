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

var notes = new List<Note>
{
    new Note {Id = 1, Title = "Первая заметка", Content = "Бебебе"}
};
int nextId = 2;


app.MapGet("/api/notes", () => Results.Ok(notes));
app.MapPost("/api/notes", (Note newNote) =>
{
    if (string.IsNullOrWhiteSpace(newNote.Title))
    {
        return Results.BadRequest("Заголовок не может быть пустым");
    }
    newNote.Id = nextId++;
    newNote.CreatedAt = DateTime.Now;
    notes.Add(newNote);

    return Results.Json(newNote);
});


app.MapDelete("/api/notes/{id:int}", (int id) =>
{
    var noteToDelete = notes.FirstOrDefault(x => x.Id == id);
    if (noteToDelete is null) return Results.NotFound();

    notes.Remove(noteToDelete);
    return Results.Ok();
});

app.Run();

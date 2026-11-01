namespace NotesApp
{
    public record Note
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public bool IsPinned { get; set; }
    }

    public record TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime Day { get; set; } = DateTime.Today;
        public bool IsDone { get; set; }
    }
}

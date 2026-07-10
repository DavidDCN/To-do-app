// ------------------------------------------------------------------
// 1. Fill these in from your Supabase project:
//    Project Settings -> API -> Project URL / anon public key
//    (Reusing the same project as the Auth Demo is fine — it already
//    has the "tasks" table this app expects. Using a different
//    project? Create the table first, see README.md.)
// ------------------------------------------------------------------
const SUPABASE_URL = "https://xrmsjhsdwmvvbmkyigml.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybXNqaHNkd212dmJta3lpZ21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM3NTcsImV4cCI6MjA5OTE2OTc1N30.vWEPW8zmy7xAwlR4WJ9CWHMmgJcC8upkvO-zS1K-ZNA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// NOTE: must match the exact table/column names shown in your
// Supabase Table Editor: table "Tasks" (capital T), columns id / title / completed
const TABLE = "Tasks";
const TEXT_COLUMN = "title";

// ------------------------------------------------------------------
// Element references
// ------------------------------------------------------------------
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const formMessage = document.getElementById("formMessage");

const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");

// ------------------------------------------------------------------
// UI helpers
// ------------------------------------------------------------------
function showMessage(text, kind) {
  formMessage.textContent = text;
  formMessage.classList.toggle("error", kind === "error");
}

function setLoading(isLoading) {
  addBtn.disabled = isLoading;
  addBtn.querySelector(".btn-label").textContent = isLoading ? "Adding…" : "Add task";
}

function renderCount(n) {
  taskCount.textContent = n === 0 ? "" : `${n} ${n === 1 ? "task" : "tasks"}`;
}

// Builds a single <li> for one task row (checkbox, text, edit, delete)
function renderTaskItem(row) {
  const li = document.createElement("li");
  li.className = "task-item" + (row.completed ? " completed" : "");
  li.dataset.id = row.id;

  // Complete/incomplete toggle
  const checkbox = document.createElement("button");
  checkbox.className = "task-checkbox" + (row.completed ? " checked" : "");
  checkbox.type = "button";
  checkbox.setAttribute("aria-label", "Toggle complete");
  checkbox.textContent = row.completed ? "✓" : "";
  checkbox.addEventListener("click", () => toggleTask(row.id, !row.completed));

  // Task text (double-click to edit in place)
  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = row[TEXT_COLUMN];
  text.title = "Double-click to edit";
  text.addEventListener("dblclick", () => enterEditMode(li, row));

  // Action buttons
  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn edit";
  editBtn.type = "button";
  editBtn.textContent = "✎";
  editBtn.setAttribute("aria-label", "Edit task");
  editBtn.addEventListener("click", () => enterEditMode(li, row));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete";
  deleteBtn.type = "button";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.addEventListener("click", () => deleteTask(row.id));

  actions.append(editBtn, deleteBtn);
  li.append(checkbox, text, actions);
  return li;
}

// Swaps the text span for an <input> so the user can edit + save (Update)
function enterEditMode(li, row) {
  if (li.querySelector(".task-edit-input")) return; // already editing

  const textEl = li.querySelector(".task-text");
  const input = document.createElement("input");
  input.className = "task-edit-input";
  input.type = "text";
  input.value = row[TEXT_COLUMN];

  textEl.replaceWith(input);
  input.focus();
  input.select();

  const save = () => {
    const newValue = input.value.trim();
    if (newValue && newValue !== row[TEXT_COLUMN]) {
      updateTaskText(row.id, newValue);
    } else {
      renderTasks(); // no change (or emptied) -> just redraw from source of truth
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") renderTasks();
  });
  input.addEventListener("blur", save);
}

// ------------------------------------------------------------------
// Read — fetch all tasks and paint the list
// ------------------------------------------------------------------
async function renderTasks() {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });

  loadingState.classList.add("hidden");

  if (error) {
    console.error("Fetch tasks error:", error);
    showMessage(error.message, "error");
    return;
  }

  taskList.innerHTML = "";
  data.forEach((row) => taskList.appendChild(renderTaskItem(row)));

  emptyState.classList.toggle("hidden", data.length !== 0);
  renderCount(data.length);
}

// ------------------------------------------------------------------
// Create
// ------------------------------------------------------------------
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = taskInput.value.trim();
  if (!value) return;

  showMessage("", "");
  setLoading(true);

  const { error } = await supabaseClient
    .from(TABLE)
    .insert({ [TEXT_COLUMN]: value, completed: false });

  setLoading(false);

  if (error) {
    console.error("Add task error:", error);
    showMessage(error.message, "error");
    return;
  }

  taskInput.value = "";
  renderTasks();
});

// ------------------------------------------------------------------
// Update — toggle completed
// ------------------------------------------------------------------
async function toggleTask(id, completed) {
  const { error } = await supabaseClient
    .from(TABLE)
    .update({ completed })
    .eq("id", id);

  if (error) {
    console.error("Toggle task error:", error);
    showMessage(error.message, "error");
    return;
  }
  renderTasks();
}

// ------------------------------------------------------------------
// Update — edit task text
// ------------------------------------------------------------------
async function updateTaskText(id, title) {
  const { error } = await supabaseClient
    .from(TABLE)
    .update({ [TEXT_COLUMN]: title })
    .eq("id", id);

  if (error) {
    console.error("Update task error:", error);
    showMessage(error.message, "error");
    return;
  }
  renderTasks();
}

// ------------------------------------------------------------------
// Delete
// ------------------------------------------------------------------
async function deleteTask(id) {
  const { error } = await supabaseClient
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete task error:", error);
    showMessage(error.message, "error");
    return;
  }
  renderTasks();
}

// ------------------------------------------------------------------
// Realtime — keep the list in sync if the table changes elsewhere
// (another tab, the Supabase dashboard, another device, etc.)
// ------------------------------------------------------------------
supabaseClient
  .channel("tasks-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
    renderTasks();
  })
  .subscribe();

// ------------------------------------------------------------------
// Initial load
// ------------------------------------------------------------------
renderTasks();
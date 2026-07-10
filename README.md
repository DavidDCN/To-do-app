# Supabase Task App (CRUD)

A production-style **to-do / task manager** built with plain HTML, CSS, and
JavaScript, backed by a [Supabase](https://supabase.com) Postgres table. This
project exists to make you comfortable with all four CRUD operations against
a real database:

| Operation | Where it happens in `app.js` | Supabase call |
|---|---|---|
| **C**reate | `addForm` submit handler | `.insert({ task, completed: false })` |
| **R**ead | `renderTasks()` | `.select("*").order("id")` |
| **U**pdate | `toggleTask()` / `updateTaskText()` | `.update({ ... }).eq("id", id)` |
| **D**elete | `deleteTask()` | `.delete().eq("id", id)` |

It also keeps the list in sync in real time using Supabase's
`postgres_changes` channel, so edits in another browser tab (or straight in
the Supabase dashboard) show up here automatically.

## Features

- Add a task (**Create**)
- See every task, newest last (**Read**)
- Check a task off, or double-click / hit the pencil icon to rename it (**Update**)
- Remove a task (**Delete**)
- Live sync across tabs/devices via Supabase Realtime
- Zero build step — just static files

## Files

```
todo-app/
├── index.html   # markup: add-task form, task list container
├── style.css    # all styling — no CSS framework
└── app.js       # Supabase client + all CRUD logic
```

## Prerequisites

- A free [Supabase](https://supabase.com) account and project
- Any way to serve static files locally
- Node.js is **not required** to run the app — Supabase is loaded from a CDN
  (`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">` in
  `index.html`). Node is only used below for a local dev server.

## Setup

### 1. Create the `Tasks` table

In your Supabase project: **Table Editor → New table**, or run this in the
**SQL Editor**:

```sql
create table public."Tasks" (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  completed boolean not null default false
);
```

This matches exactly what the app expects: `id` (uuid), `title` (the text of
the to-do), and `completed`.

> **Case sensitivity matters.** If you create the table by typing "Tasks"
> into the dashboard's New Table dialog, Supabase stores it with that exact
> capitalization, and every query must match it exactly
> (`.from("Tasks")`, not `.from("tasks")`). This is the #1 cause of
> *"Could not find the table 'public.tasks' in the schema cache"* errors —
> the table name (or a column name) in your code doesn't match the
> capitalization actually used in the database. Check **Table Editor** for
> the exact spelling if you ever rename things.

### 2. Row Level Security (RLS)

For this demo the table has **RLS disabled** so any request with the anon
key can read/write every row — fine for learning, not fine for a real app
with multiple users. Before you ship this for real:

1. Turn RLS **on** for `tasks` (**Table Editor → tasks → RLS toggle**)
2. Add a `user_id uuid references auth.users` column
3. Add policies so a user can only see/edit their own rows, e.g.:

```sql
alter table public."Tasks" enable row level security;

create policy "Users can manage their own tasks"
  on public."Tasks"
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

(Pair this with the Auth Demo app to get a real `user_id` from
`supabase.auth.getUser()`.)

### 3. Get your API credentials

**Settings → API** → copy the **Project URL** and the **anon / public** key.

### 4. Add your credentials to the code

Open `app.js` and set:

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

If you're reusing the same Supabase project as the Auth Demo, you can leave
these as they are — the `tasks` table lives in the same project.

### 5. Enable Realtime for the table (optional but recommended)

**Database → Replication** → toggle on replication for the `Tasks` table
(or run `alter publication supabase_realtime add table "Tasks";` in the SQL
editor). Without this, the app still works — it just won't auto-refresh
when a row changes somewhere else.

### 6. Run it locally

Opening `index.html` directly (`file://`) can cause quirks with fetch
requests in some browsers — serve it instead. Pick one:

**Option A — no install, using `npx`:**

```bash
npx serve .
```

**Option B — install once, reuse forever:**

```bash
npm install -g live-server
live-server .
```

**Option C — VS Code "Live Server" extension** — right-click `index.html` →
*Open with Live Server*.

Then open the printed `localhost` URL.

## How each CRUD operation works

**Create** — the form's `submit` listener inserts a new row and then
re-fetches the list:

```js
await supabaseClient.from("Tasks").insert({ title: value, completed: false });
```

**Read** — `renderTasks()` pulls every row and rebuilds the `<ul>` from
scratch. This is the single "source of truth" render function — every
create/update/delete calls it again afterward so the UI always reflects the
database, not just local state.

**Update** — two paths: clicking the checkbox toggles `completed`;
double-clicking (or the pencil icon) swaps the task's text for an `<input>`,
and pressing **Enter** or clicking away saves it:

```js
await supabaseClient.from("Tasks").update({ completed }).eq("id", id);
await supabaseClient.from("Tasks").update({ title }).eq("id", id);
```

**Delete** — the ✕ button removes the row by id:

```js
await supabaseClient.from("Tasks").delete().eq("id", id);
```

## Common issues

| Symptom | Likely cause |
|---|---|
| "Could not find the table 'public.tasks' in the schema cache" | Table/column name in the code doesn't match the exact capitalization in Supabase — check **Table Editor** and make sure `app.js` uses the same name (e.g. `Tasks`, not `tasks`) |
| Tasks don't appear after adding one | Wrong `SUPABASE_URL` / `SUPABASE_ANON_KEY` — check **Settings → API** |
| Adding/editing works but nothing updates in a second tab | Realtime replication isn't enabled for `Tasks` (step 5) — the app still works, it just won't auto-sync |
| Everyone can see everyone's tasks | Expected with RLS disabled — see step 2 to lock this down per-user |

## Next steps

- Wire this up to the Auth Demo so each task is scoped to `auth.uid()`
- Add due dates, priority levels, or tags as extra columns
- Add optimistic UI updates instead of re-fetching the whole list after every change
- Add pagination or infinite scroll once the list gets long

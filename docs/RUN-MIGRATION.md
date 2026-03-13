# Run FlowDesk migrations in Supabase

**Step 1** — Create the shared schema and issues table.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Run **in this order**:

### Migration 1: Shared schema (tasks, rocks, projects, emails_processed, scorecard)

- Open `supabase/migrations/20250611000000_flowdesk_shared_schema.sql`.
- Copy its full contents into the SQL Editor.
- Click **Run**. You should see "Success. No rows returned."

### Migration 2: Issues table (Company OS)

- Open `supabase/migrations/20250611000001_flowdesk_issues.sql`.
- Copy its full contents into the SQL Editor.
- Click **Run**.

4. Optional: create a default company for testing (Table Editor → `companies` → Insert row, name e.g. "My Company"). Use that `id` as `company_id` when creating rocks/projects.

**Note:** The first migration creates a trigger so that inserting a row into `rock_milestones` automatically creates a row in `tasks` with `source = 'os_rock'`.

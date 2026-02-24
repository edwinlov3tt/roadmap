# Roadmap MCP Server — Design Document

## Overview

A lightweight MCP server that gives Claude project management capabilities over the Roadmap tool. Claude can read project state, manage tasks, post updates, assess progress, and pull runtime health data from RuntimeScope — all from any coding session.

Installed at the **user level** so it's available in every project.

## Architecture

```
Claude Code (any project)
    │
    ├─ MCP Tools ──► roadmap-mcp (Python, stdio)
    │                    │
    │                    ├──► Roadmap API (v1, Bearer token auth)
    │                    │        └── Projects, Tasks, Milestones, Updates
    │                    │
    │                    └──► RuntimeScope SQLite (read-only)
    │                             └── ~/.runtimescope/projects/{name}/events.db
    │
    └─ Slash Commands ──► .claude/commands/
                              ├── ship.md     (commit + push + update)
                              └── status.md   (quick project assessment)
```

**No local database.** The Roadmap API is the source of truth. RuntimeScope SQLite is read-only for health data.

## Project Resolution

Claude needs to know which roadmap project it's working on. The MCP resolves this through a **mapping file** at `~/.roadmap-mcp/projects.json`:

```json
{
  "mappings": [
    {
      "projectId": 8,
      "name": "Large Feature Test",
      "repoPaths": ["/Users/edwinlovettiii/roadmap-update"],
      "runtimeScopeProject": "roadmap"
    },
    {
      "projectId": 5,
      "name": "Analytics Dashboard",
      "repoPaths": ["/Users/edwinlovettiii/analytics"],
      "runtimeScopeProject": "matchback-platform"
    }
  ]
}
```

**Resolution order:**
1. Explicit `projectId` or `name` passed by Claude
2. Match current working directory against `repoPaths`
3. Fuzzy match project name from context

Tools that need a project accept an optional `project` param. If omitted, auto-detect from cwd.

## MCP Tools

### 1. Awareness

#### `list_projects`
List all roadmap projects with status, progress, and task counts.

**Returns:** Table of projects with: name, status, task progress (done/total), priority, last updated

---

#### `get_project`
Get full detail for one project: fields, task groups with tasks, milestones, recent updates.

**Params:**
- `project` (optional) — project ID, name, or auto-detect from cwd

**Returns:** Complete project state including all task groups, their tasks (with done/not-done), milestones, and the 5 most recent updates.

---

#### `assess_project`
The anchor tool. Pulls project state + RuntimeScope health data and produces an actionable summary.

**Params:**
- `project` (optional) — project ID, name, or auto-detect
- `include_runtime` (bool, default true) — include RuntimeScope data if available

**Returns:**
```
# Project Assessment: Roadmap

## Progress
Status: In Development (55% complete)
  Planning: 5/5 ✓ (complete)
  Dev:      6/11 (55%) ← current phase
  Beta:     0/3
  Live:     0/1

Estimated remaining: ~48 hours across 9 unchecked tasks

## Incomplete Tasks
Dev — Core Development Phase 2:
  [ ] Implement search functionality (est. 8h)
  [ ] Add pagination to project list (est. 4h)
  [ ] Build export/import feature (est. 6h)
  ...

## Recent Activity (last 5 updates)
- 2026-02-24 [In Development]: Fixed destructive PUT endpoint...
- 2026-02-23 [In Development]: Added calendar view...

## Runtime Health (from RuntimeScope)
Sessions: 17 recorded
Web Vitals: LCP good, FCP good, CLS good, INP needs-improvement
API Endpoints: GET /api/public/projects — avg 297ms, 0% error rate
Console Errors: 2 in last session
```

### 2. Task Management

#### `add_task_group`
Create a new task group under a milestone phase.

**Params:**
- `project` (optional)
- `name` — group name (e.g. "Authentication System")
- `milestone` — phase: Requested, Planning, Dev, Beta, or Live
- `tasks` — array of `{name, estimatedHours}` objects
- `startDate` / `endDate` (optional — user sets these, not Claude)

**Behavior:** Fetches existing groups, appends the new one, sends bulk upsert. Preserves all existing groups.

---

#### `add_tasks`
Add tasks to an existing task group.

**Params:**
- `project` (optional)
- `groupName` — name of existing group (fuzzy matched)
- `tasks` — array of `{name, estimatedHours}`

**Behavior:** Fetches groups, finds matching group by name, appends tasks, bulk upserts.

---

#### `complete_tasks`
Mark tasks as done by name.

**Params:**
- `project` (optional)
- `taskNames` — array of task name strings (fuzzy matched against all groups)

**Behavior:** Fetches groups, finds best-matching tasks by name, marks them done, bulk upserts. Returns what was matched and completed. Warns if any names couldn't be matched.

---

#### `update_tasks`
Full task group replacement for reorganization. Sends the complete task group array.

**Params:**
- `project` (optional)
- `taskGroups` — full array in API format

**Behavior:** Direct bulk upsert. Use when Claude needs to restructure groups, not just add/complete.

### 3. Milestones

#### `get_milestones`
List milestones for a project.

**Params:**
- `project` (optional)

---

#### `set_milestones`
Add or update milestones.

**Params:**
- `project` (optional)
- `milestones` — array of `{name, targetDate, icon}`

**Behavior:** Bulk upsert via PUT. Replaces all milestones.

### 4. Updates & Status

#### `post_update`
Post a project update with notes.

**Params:**
- `project` (optional)
- `notes` — what happened (multi-line text)
- `status` (optional) — override update status label

**Behavior:** Posts to the updates endpoint. Notes get AI-cleaned into bullet points by the backend (if ANTHROPIC_API_KEY is set).

---

#### `update_project`
Change project fields.

**Params:**
- `project` (optional)
- `fields` — object with any of: `status`, `priority`, `description`, `current_version`, `project_url`, `start_date`, `end_date`, `next_steps`, etc.

**Behavior:** PATCH-style update (only sends provided fields).

---

#### `create_project`
Create a new project.

**Params:**
- `name`, `description`, `status`, `priority`, `current_version`, etc.
- `taskGroups` (optional) — initial task groups to create after project creation

### 5. Ship (commit + push + update)

#### `ship`
Commit, push to GitHub, and post a project update — all in one call.

**Params:**
- `project` (optional)
- `commitMessage` — git commit message
- `updateNotes` — project update notes (what was accomplished)
- `completedTasks` (optional) — task names to mark done
- `files` (optional) — specific files to stage (default: all modified tracked files)

**Behavior:**
1. `git add` specified files (or `-u` for all tracked)
2. `git commit -m "{message}"`
3. `git push origin {current_branch}`
4. Mark `completedTasks` as done via task group upsert
5. Post project update with `updateNotes`
6. Return summary of everything that happened

This is the "end of session" power tool.

### 6. Setup & Onboarding

#### `track_project`
Bootstrap a new repo into the roadmap system. Creates the project, wires up tracking, and installs RuntimeScope — one tool to go from zero to fully tracked.

**Params:**
- `name` — project name
- `description` (optional) — project description
- `repoPath` (optional) — path to the repo (default: cwd)
- `status` (optional) — initial status (default: "In Planning")
- `priority` (optional) — initial priority (default: "Medium")
- `taskGroups` (optional) — initial task groups to seed
- `installRuntimeScope` (bool, default true) — install RuntimeScope SDK if not detected

**Behavior:**
1. **Check if already tracked** — scan `projects.json` for matching `repoPath`. If found, return existing mapping (idempotent).
2. **Create project** via `POST /api/projects` with name, description, status, priority.
3. **Add mapping** — append entry to `~/.roadmap-mcp/projects.json` with new `projectId`, `name`, `repoPath`, and `runtimeScopeProject` (derived from repo directory name).
4. **Detect RuntimeScope** — check if `@runtimescope/sdk` (or the script tag) exists in the project's `package.json` or HTML entry point.
5. **Install RuntimeScope** (if `installRuntimeScope` is true and not detected):
   - Detect framework (React/Next.js/Vue/plain HTML) from `package.json` or project structure
   - Generate the appropriate SDK snippet (import + init call)
   - Return the snippet and where to add it — **does not auto-modify source files** (Claude handles that in the main conversation)
6. **Seed task groups** — if `taskGroups` provided, send bulk upsert to create initial tasks.
7. **Post initial update** — "Project created and tracking initialized."
8. **Return summary:**
```
# Project Initialized: My New App

Created: projectId 12, status "In Planning"
Tracking: /Users/edwinlovettiii/my-new-app → project 12
RuntimeScope: not detected — snippet provided below

## RuntimeScope Setup
Add this to your app entry point:
  import { RuntimeScope } from '@runtimescope/sdk';
  RuntimeScope.init({ appName: 'my-new-app' });

## Next Steps
- Add initial task groups with `add_task_group`
- Set milestones with `set_milestones`
- Run `/status` to see your project dashboard
```

---

### 7. RuntimeScope Integration

#### `get_runtime_health`
Pull runtime health data from RuntimeScope's SQLite database.

**Params:**
- `project` (optional) — uses `runtimeScopeProject` from mapping
- `sessions` (int, default 5) — how many recent sessions to analyze

**Returns:**
- Session count and date range
- Web Vitals summary (LCP, FCP, CLS, INP, FID, TTFB with ratings)
- API endpoint stats (avg latency, error rates, call counts)
- Console error count
- Performance trends across sessions

**Data source:** `~/.runtimescope/projects/{name}/events.db`
- `sessions` table — connection times, event counts
- `session_metrics` table — JSON blob with webVitals, endpoints, error counts
- `events` table — raw console/network/performance events

## Slash Commands

These go in the user's `~/.claude/commands/` directory for global availability.

### `/ship` (ship.md)
```markdown
Commit all changes, push to GitHub, and update the roadmap project.

1. Use the `ship` MCP tool with:
   - A concise commit message summarizing what changed
   - Update notes describing what was accomplished this session
   - Any task names that were completed

If no project is auto-detected, ask which project to update.
```

### `/status` (status.md)
```markdown
Give me a project status assessment.

Use the `assess_project` MCP tool for the current project (auto-detect from repo).
Include runtime health data if available.
After showing the assessment, suggest what to work on next based on incomplete tasks.
```

### `/track` (track.md)
```markdown
Start tracking this project in the roadmap system.

1. Use the `track_project` MCP tool with:
   - The project name (infer from repo name or ask)
   - A brief description of what the project does
   - The current working directory as repoPath

2. If RuntimeScope is not installed, add the SDK snippet to the app entry point.

3. Suggest initial task groups based on the codebase structure and any TODOs found.
```

### `/tasks` (tasks.md)
```markdown
Show me the current task breakdown for this project.

Use the `get_project` MCP tool and display:
- Task groups organized by milestone phase
- Completed vs incomplete tasks in each group
- Estimated hours remaining
- Suggest any tasks that should be added based on the current codebase state
```

## File Structure

```
roadmap-mcp/
├── server.py              # MCP server (~400 lines)
├── requirements.txt       # mcp, httpx
├── setup.sh               # Install deps, create mapping file, configure MCP
├── README.md
└── commands/              # Slash commands to install globally
    ├── track.md
    ├── ship.md
    ├── status.md
    └── tasks.md
```

## Configuration

### MCP config (`~/.claude.json` or `~/.claude/settings.json`)

```json
{
  "mcpServers": {
    "roadmap": {
      "command": "python3",
      "args": ["/Users/edwinlovettiii/roadmap-mcp/server.py"],
      "env": {
        "ROADMAP_API_URL": "https://feedback.edwinlovett.com/roadmap/api/v1",
        "ROADMAP_API_TOKEN": "${ROADMAP_API_TOKEN}",
        "ROADMAP_ADMIN_EMAIL": "edwin@edwinlovett.com"
      }
    }
  }
}
```

### Project mapping (`~/.roadmap-mcp/projects.json`)

```json
{
  "mappings": [
    {
      "projectId": 8,
      "name": "Large Feature Test",
      "repoPaths": ["/Users/edwinlovettiii/roadmap-update"],
      "runtimeScopeProject": "roadmap"
    }
  ]
}
```

The `setup.sh` script generates this interactively by listing projects from the API and asking which repos map to which.

## Task Quality Guidelines (for CLAUDE.md)

These instructions go in the user-level CLAUDE.md so Claude follows them everywhere:

```
When using roadmap MCP tools to manage tasks:

TASKS should represent meaningful work items (1-8+ hours):
- "Implement user authentication flow"
- "Add WebSocket real-time updates"
- "Build CSV export pipeline"

UPDATES should capture smaller items and session summaries:
- "Fixed CORS config, updated rate limits, cleaned up imports"
- "Debugged calendar view empty blocks — synthetic dates were too narrow"

DO NOT create tasks for:
- Bug fixes that take < 1 hour
- Code cleanup, formatting, linting
- Documentation updates
- Dependency bumps

When estimating hours, be realistic:
- Simple CRUD endpoint: 1-2h
- New UI component with state: 2-4h
- Complex feature (auth, real-time, etc.): 4-8h
- Architecture change: 8-16h

You set estimatedHours. The user sets startDate/endDate.
```

## API Authentication

The MCP server needs two auth methods for different endpoints:

| Endpoint pattern | Auth method | Header |
|-----------------|-------------|--------|
| `GET /api/v1/*` | API token | `Authorization: Bearer {token}` |
| `PUT /api/v1/*` | API token | `Authorization: Bearer {token}` |
| `POST /api/projects/:id/updates` | Admin email | `x-admin-email: {email}` |
| `PUT /api/projects/:id` | Admin email | `x-admin-email: {email}` |
| `PUT /api/projects/:id/task-groups` | Admin email | `x-admin-email: {email}` |
| `PUT /api/projects/:id/milestones` | Admin email | `x-admin-email: {email}` |

The MCP server sets both headers on every request — the backend accepts whichever is relevant.

## What This Replaces

From your dev-tracker, this replaces:
- `list_roadmap_projects` → `list_projects`
- `get_project_details` → `get_project` + `assess_project`
- `push_project_update` → `post_update` + `ship`
- `link_repo_to_project` → `projects.json` mapping file

**Dropped** (not relevant here):
- Session tracking / hooks (overhead, not needed)
- Commit logging to SQLite (git already tracks this)
- ROI reports / hourly rate calculations
- Local SQLite database entirely

**Added:**
- `init_project` — bootstrap new repos into the roadmap system (create project + wire tracking + RuntimeScope detection)
- Task management (add, complete, reorganize)
- Milestone management
- Auto-detection from repo path
- RuntimeScope health data integration
- `ship` tool (commit + push + update in one call)
- `assess_project` with runtime health
- Slash commands for common workflows (`/track`, `/ship`, `/status`, `/tasks`)

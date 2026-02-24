# Roadmap API Documentation

Complete API reference for the Dev Schedule / Roadmap application.

## Base URL

```
https://feedback.edwinlovett.com/roadmap
```

## Authentication

### External API (v1)

All `/api/v1/*` endpoints require a Bearer token:

```
Authorization: Bearer YOUR_API_TOKEN
```

Tokens are 64-character hex strings. Create them via the Admin panel or `POST /api/admin/tokens`.

### Admin API

All admin endpoints (project CRUD, task groups, milestones, updates, images) require:

```
x-admin-email: edwin@edwinlovett.com
```

### Public API

Public endpoints (`/api/public/*`, `/api/fider-tags`) require no authentication.

---

## Rate Limits

| Tier | Limit | Applies To |
|------|-------|------------|
| General | 300 req / 15 min | All endpoints |
| Admin | 50 req / 15 min | `/api/projects/*`, `/api/import-fider-post`, `/api/admin/*` |
| Upload | 30 req / 15 min | Image upload endpoints |

Rate limit headers (`RateLimit-*`) are included in responses.

---

## Project Statuses

| Status | Description |
|--------|-------------|
| `Requested` | Feature requested but not started |
| `In Planning` | Being planned and scoped |
| `In Development` | Active development |
| `In Beta Testing` | Released for beta testing |
| `Live` | Fully released |

## Priority Values

| Priority | Description |
|----------|-------------|
| `none` | No priority set (default) |
| `high` | High demand |
| `leadership` | Leadership priority |

---

## Public Endpoints

### List All Projects (Rich)

Returns all projects with task groups, milestones, images, and scheduling data. This is the primary endpoint used by the frontend.

```
GET /api/public/projects
```

**Response:**

```json
{
  "id": 5,
  "name": "CI/CD Pipeline",
  "current_version": "v0.7.0",
  "description": "Automated build, test, and deployment pipeline",
  "status": "In Development",
  "priority": "high",
  "start_date": "2025-12-20",
  "end_date": "2026-04-20",
  "startDate": "2025-12-20",
  "endDate": "2026-04-20",
  "dateLabel": "Target Launch",
  "startMilestone": "Requested",
  "endMilestone": "Live",
  "launched_date": null,
  "project_url": null,
  "update_count": "3",
  "fider_tag_name": "CI/CD",
  "fider_tag_color": "5AA2FF",
  "images": [
    { "project_id": 5, "src": "/uploads/img.png", "alt": "Screenshot", "sort_order": 0 }
  ],
  "taskGroups": [
    {
      "name": "Planning",
      "milestone": "Planning",
      "startDate": null,
      "endDate": null,
      "estimatedHours": null,
      "tasks": [
        { "id": 1, "name": "Define CI pipeline requirements", "done": true, "sort_order": 0, "estimatedHours": null }
      ]
    }
  ],
  "milestones": [
    { "id": 1, "name": "Beta Release", "targetDate": "2026-03-01", "icon": "◆" }
  ]
}
```

### Get Project Updates

```
GET /api/public/projects/:id/updates
```

**Response:** Array of updates (max 50), ordered by `created_at DESC`.

```json
[
  {
    "id": 12,
    "status": "Completed",
    "notes": ["Added new search filters", "Fixed pagination bug"],
    "created_at": "2025-10-15T10:30:00.000Z"
  }
]
```

### Get Project Milestones

```
GET /api/public/projects/:id/milestones
```

**Response:**

```json
[
  { "id": 1, "name": "Beta Release", "targetDate": "2026-03-01", "icon": "◆" }
]
```

### Get Fider Tags

```
GET /api/fider-tags
```

Returns available Fider tags for project linking.

---

## External API v1 (Token Auth)

### List All Projects

```
GET /api/v1/projects
```

Returns all projects with task groups, milestones, scheduling fields, and update counts.

```bash
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "count": 8,
  "projects": [
    {
      "id": 5,
      "api_key": "3d70f2cb-...",
      "name": "CI/CD Pipeline",
      "status": "In Development",
      "priority": "high",
      "start_date": "2025-12-20",
      "end_date": "2026-04-20",
      "startDate": "2025-12-20",
      "endDate": "2026-04-20",
      "dateLabel": "Target Launch",
      "taskGroups": [...],
      "milestones": [...],
      "update_count": "3"
    }
  ]
}
```

### Get Project by Identifier

Retrieve a single project by `api_key` (UUID) or exact name (case-insensitive).

```
GET /api/v1/projects/:identifier
```

```bash
# By api_key (recommended)
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/3d70f2cb-178d-4e0e-8729-3854d800b0ef" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# By name (URL-encode spaces)
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Response includes:** project fields, `taskGroups`, `milestones`, `updates`, `images`.

### Create Project

```
POST /api/v1/projects
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| description | string | Yes | Project description |
| status | string | No | See status values. Default: `Requested` |
| priority | string | No | `none`, `high`, or `leadership`. Default: `none` |
| current_version | string | No | Version string (e.g. "1.0") |
| start_date | string | No | Start date (`YYYY-MM-DD`) |
| end_date | string | No | End date (`YYYY-MM-DD`) |
| date_label | string | No | Label for end date. Default: `Target Launch` |
| start_milestone | string | No | Starting milestone name. Default: `Requested` |
| end_milestone | string | No | Ending milestone name. Default: `Live` |
| next_steps | string | No | Next steps text |
| launched_date | string | No | Launch date text (e.g. "Q1 2025") |
| project_url | string | No | URL to the project |
| fider_tag_id | number | No | Fider tag ID to link |
| images | file[] | No | Screenshots (multipart/form-data, max 10) |

```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "status": "In Planning",
    "priority": "high",
    "start_date": "2026-01-01",
    "end_date": "2026-06-30"
  }'
```

### Add Project Update

```
POST /api/v1/projects/:identifier/updates
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | Yes | Update notes (multi-line supported) |
| status | string | No | Update status. Default: `In Progress` |
| update_date | string | No | ISO 8601 date. Default: now |

Notes are automatically cleaned and organized by AI (when `ANTHROPIC_API_KEY` is set).

```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/updates" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Completed build pipeline setup\nAdded automated test runner",
    "status": "Completed"
  }'
```

### Upload Images

```
POST /api/v1/projects/:identifier/images
```

Multipart/form-data with `images` field (max 10 files, 5MB each). Validated via magic number check (JPEG, PNG, GIF, WebP, SVG only).

```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/images" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "images=@screenshot1.png" \
  -F "images=@screenshot2.png"
```

### Get Task Groups

```
GET /api/v1/projects/:identifier/task-groups
```

```bash
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/task-groups" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "project_id": 5,
  "project_name": "CI/CD Pipeline",
  "taskGroups": [
    {
      "id": 10,
      "name": "Planning",
      "milestone": "Planning",
      "startDate": null,
      "endDate": null,
      "estimatedHours": null,
      "tasks": [
        { "id": 1, "name": "Define requirements", "done": true, "sort_order": 0, "estimatedHours": null }
      ]
    }
  ]
}
```

### Save Task Groups (Bulk Upsert)

Replaces all task groups and their tasks for a project. Existing groups are deleted and re-created.

```
PUT /api/v1/projects/:identifier/task-groups
```

```bash
curl -X PUT "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/task-groups" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroups": [
      {
        "name": "Planning",
        "milestone": "Planning",
        "startDate": "2026-01-01",
        "endDate": "2026-01-31",
        "estimatedHours": 40,
        "tasks": [
          { "name": "Define requirements", "done": true },
          { "name": "Create wireframes", "done": false, "estimatedHours": 8 }
        ]
      },
      {
        "name": "Development",
        "milestone": "Dev",
        "estimatedHours": 120,
        "tasks": [
          { "name": "Build API endpoints", "done": false, "estimatedHours": 24 },
          { "name": "Create frontend views", "done": false, "estimatedHours": 40 }
        ]
      }
    ]
  }'
```

### Get Milestones

```
GET /api/v1/projects/:identifier/milestones
```

```bash
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/milestones" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Save Milestones (Bulk Upsert)

Replaces all milestones for a project.

```
PUT /api/v1/projects/:identifier/milestones
```

```bash
curl -X PUT "https://feedback.edwinlovett.com/roadmap/api/v1/projects/CI%2FCD%20Pipeline/milestones" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "milestones": [
      { "name": "Alpha Release", "targetDate": "2026-02-15", "icon": "◆" },
      { "name": "Beta Release", "targetDate": "2026-03-01", "icon": "◆" },
      { "name": "Launch", "targetDate": "2026-04-20", "icon": "🚀" }
    ]
  }'
```

---

## Admin Endpoints (Email Auth)

All admin endpoints require the `x-admin-email` header.

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (with images) |
| GET | `/api/projects/:id` | Get project with updates + images |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project (cascades) |

### Task Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/task-groups` | Get task groups with tasks |
| PUT | `/api/projects/:id/task-groups` | Bulk upsert task groups |

### Milestones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/projects/:id/milestones` | Get milestones (public) |
| PUT | `/api/projects/:id/milestones` | Bulk upsert milestones |

### Updates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/updates` | Add update (AI-cleaned notes) |

### Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/images` | List images |
| POST | `/api/projects/:id/images` | Upload image (multipart, 5MB max) |
| PUT | `/api/projects/:projectId/images/:imageId` | Update sort order / alt text |
| DELETE | `/api/projects/:projectId/images/:imageId` | Delete image + file |

### Fider Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fider-tags` | List available Fider tags |
| GET | `/api/fider-completed/:tagId` | Get completed Fider posts for tag |
| POST | `/api/import-fider-post` | Import Fider post as update |

### API Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tokens` | List tokens (masked) |
| POST | `/api/admin/tokens` | Create token |
| DELETE | `/api/admin/tokens/:id` | Delete token |
| POST | `/api/admin/tokens/:id/regenerate` | Regenerate token |

---

## Data Model

### Task Group

```json
{
  "name": "Planning",
  "milestone": "Planning",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "estimatedHours": 40,
  "tasks": [
    {
      "name": "Define requirements",
      "done": true,
      "estimatedHours": 8
    }
  ]
}
```

When `startDate`/`endDate` are null, the frontend generates synthetic dates by distributing groups evenly across the project's date range.

### Milestone

```json
{
  "name": "Beta Release",
  "targetDate": "2026-03-01",
  "icon": "◆"
}
```

### Update

Notes are provided as a string and automatically cleaned into an array of bullet points by AI.

```json
{
  "status": "Completed",
  "notes": ["Added new search filters", "Fixed pagination bug"],
  "raw_notes": "Added new search filters\nFixed pagination bug",
  "update_date": "2025-10-15T10:30:00.000Z"
}
```

---

## Error Responses

```json
{
  "success": false,
  "error": "Error description",
  "hint": "Optional resolution hint"
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad request — missing or invalid parameters |
| 401 | Unauthorized — invalid or missing token/email |
| 404 | Not found — project doesn't exist |
| 429 | Rate limited — too many requests |
| 500 | Internal server error |

---

## Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB connectivity) |
| GET | `/api/docs` | API docs rendered as HTML |
| GET | `/api/claude-guide` | Claude Code integration guide |

---

## Code Examples

### Python

```python
import requests

API_BASE = "https://feedback.edwinlovett.com/roadmap/api/v1"
TOKEN = "YOUR_API_TOKEN"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# List projects with task groups
response = requests.get(f"{API_BASE}/projects", headers=headers)
projects = response.json()["projects"]

for p in projects:
    total_tasks = sum(len(g["tasks"]) for g in p["taskGroups"])
    done_tasks = sum(sum(1 for t in g["tasks"] if t["done"]) for g in p["taskGroups"])
    print(f"{p['name']}: {done_tasks}/{total_tasks} tasks done")

# Save task groups
requests.put(f"{API_BASE}/projects/CI%2FCD%20Pipeline/task-groups", headers=headers, json={
    "taskGroups": [
        {"name": "Sprint 1", "milestone": "Dev", "estimatedHours": 40,
         "tasks": [{"name": "Build API", "done": False}]}
    ]
})
```

### JavaScript (Node.js)

```javascript
const API_BASE = "https://feedback.edwinlovett.com/roadmap/api/v1";
const TOKEN = "YOUR_API_TOKEN";
const headers = { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" };

// Get project with all data
const res = await fetch(`${API_BASE}/projects/CI%2FCD%20Pipeline`, { headers });
const { project } = await res.json();

console.log(`${project.name}: ${project.taskGroups.length} task groups`);
console.log(`Milestones: ${project.milestones.map(m => m.name).join(', ')}`);

// Save milestones
await fetch(`${API_BASE}/projects/CI%2FCD%20Pipeline/milestones`, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    milestones: [
      { name: "Alpha", targetDate: "2026-02-15", icon: "◆" },
      { name: "Launch", targetDate: "2026-04-20", icon: "🚀" }
    ]
  })
});
```

### CI/CD Integration

Post an update after deployment:

```bash
#!/bin/bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/${PROJECT_KEY}/updates" \
  -H "Authorization: Bearer ${ROADMAP_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"notes\": \"Deployed version ${VERSION} to production\",
    \"status\": \"Completed\",
    \"update_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

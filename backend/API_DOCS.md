# Roadmap API v1 Documentation

External API for managing projects and updates in the Roadmap application.

## Base URL

```
https://feedback.edwinlovett.com/roadmap/api/v1
```

## Authentication

All API requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN
```

The API token is a 64-character hex string. Contact the administrator to obtain your token.

### Authentication Errors

| Status Code | Response |
|-------------|----------|
| 401 | `{"error": "Invalid or missing API token", "hint": "Include Authorization: Bearer <token> header"}` |

---

## Endpoints

### List All Projects

Retrieve all projects with their api_keys and basic info.

```
GET /api/v1/projects
```

#### Response

```json
{
  "success": true,
  "count": 16,
  "projects": [
    {
      "id": 5,
      "api_key": "3d70f2cb-178d-4e0e-8729-3854d800b0ef",
      "name": "GeoSearch Pro",
      "current_version": "2.1",
      "description": "Advanced geographic search functionality",
      "status": "Live",
      "launched_date": "Q1 2025",
      "project_url": "https://example.com/geosearch",
      "next_steps": "",
      "created_at": "2025-09-26T05:15:00.000Z",
      "updated_at": "2025-10-15T10:30:00.000Z",
      "last_updated_at": "2025-10-15T10:30:00.000Z",
      "fider_tag_name": "GeoSearch",
      "fider_tag_color": "21C37A",
      "update_count": "5"
    }
  ]
}
```

#### Example

```bash
curl -X GET "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### Get Project by Identifier

Retrieve a single project by its `api_key` (UUID) or exact name (case-insensitive).

```
GET /api/v1/projects/:identifier
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| identifier | string | Project's `api_key` (UUID) OR exact project name |

#### Response

```json
{
  "success": true,
  "project": {
    "id": 5,
    "api_key": "3d70f2cb-178d-4e0e-8729-3854d800b0ef",
    "name": "GeoSearch Pro",
    "current_version": "2.1",
    "description": "Advanced geographic search functionality",
    "status": "Live",
    "fider_tag_name": "GeoSearch",
    "fider_tag_color": "21C37A",
    "updates": [
      {
        "id": 12,
        "status": "Completed",
        "notes": ["Added new search filters", "Fixed pagination bug"],
        "raw_notes": "Added new search filters\nFixed pagination bug",
        "created_at": "2025-10-15T10:30:00.000Z",
        "update_date": "2025-10-15T10:30:00.000Z"
      }
    ],
    "images": [
      {
        "id": 3,
        "src": "/uploads/1758863995451-616049621.png",
        "alt": "Screenshot.png",
        "sort_order": 0,
        "created_at": "2025-09-26T05:19:00.000Z"
      }
    ]
  }
}
```

#### Examples

```bash
# By api_key (recommended)
curl -X GET "https://feedback.edwinlovett.com/roadmap/api/v1/projects/3d70f2cb-178d-4e0e-8729-3854d800b0ef" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# By name (URL-encoded for spaces)
curl -X GET "https://feedback.edwinlovett.com/roadmap/api/v1/projects/GeoSearch%20Pro" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### Create Project

Create a new project with optional screenshots.

```
POST /api/v1/projects
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| description | string | Yes | Project description |
| status | string | No | One of: `Requested`, `In Planning`, `In Development`, `In Beta Testing`, `Live`. Default: `Requested` |
| current_version | string | No | Version string (e.g., "1.0", "beta") |
| next_steps | string | No | Next steps text |
| launched_date | string | No | Launch date text (e.g., "Q1 2025", "TBA") |
| project_url | string | No | URL to the project |
| fider_tag_id | number | No | Fider tag ID to link |
| images | file[] | No | Screenshot images (multipart/form-data) |

#### Response

```json
{
  "success": true,
  "message": "Project created successfully",
  "project": {
    "id": 22,
    "api_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "New Project",
    "description": "Project description here",
    "status": "Requested",
    "images": []
  }
}
```

#### Examples

```bash
# JSON body (no images)
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "This is a new project for tracking",
    "status": "In Planning"
  }'

# With images (multipart/form-data)
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "name=New Project" \
  -F "description=This is a new project" \
  -F "status=In Development" \
  -F "images=@screenshot1.png" \
  -F "images=@screenshot2.png"
```

---

### Add Project Update

Add an update entry to a project's timeline.

```
POST /api/v1/projects/:identifier/updates
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| identifier | string | Project's `api_key` (UUID) OR exact project name |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | Yes | Update notes (can be multi-line) |
| status | string | No | Update status (default: "In Progress") |
| update_date | string | No | ISO 8601 date string (default: now) |

#### Response

```json
{
  "success": true,
  "message": "Update added successfully",
  "project_id": 5,
  "project_name": "GeoSearch Pro",
  "project_api_key": "3d70f2cb-178d-4e0e-8729-3854d800b0ef",
  "update": {
    "id": 45,
    "project_id": 5,
    "status": "In Progress",
    "notes": ["Fixed search performance", "Added caching layer"],
    "raw_notes": "Fixed search performance\nAdded caching layer",
    "update_date": "2025-10-20T14:30:00.000Z",
    "created_at": "2025-10-20T14:30:00.000Z"
  }
}
```

#### Examples

```bash
# By api_key
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/3d70f2cb-178d-4e0e-8729-3854d800b0ef/updates" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Fixed search performance\nAdded caching layer",
    "status": "Completed"
  }'

# By project name
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/GeoSearch%20Pro/updates" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Deployed hotfix for edge case bug",
    "update_date": "2025-10-19T09:00:00Z"
  }'
```

---

### Upload Images to Project

Add screenshots to an existing project.

```
POST /api/v1/projects/:identifier/images
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| identifier | string | Project's `api_key` (UUID) OR exact project name |

#### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| images | file[] | Yes | Image files (max 10 per request) |

#### Response

```json
{
  "success": true,
  "message": "2 image(s) uploaded successfully",
  "project_id": 5,
  "project_name": "GeoSearch Pro",
  "images": [
    {
      "id": 15,
      "project_id": 5,
      "src": "/uploads/1761800000000-123456789.png",
      "alt": "screenshot1.png",
      "sort_order": 1,
      "created_at": "2025-10-20T14:30:00.000Z"
    }
  ]
}
```

#### Example

```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/3d70f2cb-178d-4e0e-8729-3854d800b0ef/images" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "images=@screenshot1.png" \
  -F "images=@screenshot2.png"
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "hint": "Optional hint for resolution"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Invalid or missing API token |
| 404 | Not Found - Project doesn't exist |
| 500 | Internal Server Error |

---

## Project Statuses

Valid status values for projects:

| Status | Description |
|--------|-------------|
| `Requested` | Feature/project has been requested but not started |
| `In Planning` | Currently being planned and scoped |
| `In Development` | Active development in progress |
| `In Beta Testing` | Released for beta testing |
| `Live` | Fully released and available |

---

## Notes Format

When adding updates, the `notes` field can be:
- A single line of text
- Multiple lines separated by newlines (`\n`)

Notes are automatically parsed into an array for display in the timeline.

---

## Code Examples

### Python

```python
import requests

API_BASE = "https://feedback.edwinlovett.com/roadmap/api/v1"
API_TOKEN = "YOUR_API_TOKEN"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# List all projects
response = requests.get(f"{API_BASE}/projects", headers=headers)
projects = response.json()["projects"]

# Add update to a project
update_data = {
    "notes": "Completed feature X\nFixed bug Y",
    "status": "Completed"
}
response = requests.post(
    f"{API_BASE}/projects/GeoSearch%20Pro/updates",
    headers=headers,
    json=update_data
)
print(response.json())
```

### JavaScript (Node.js)

```javascript
const API_BASE = "https://feedback.edwinlovett.com/roadmap/api/v1";
const API_TOKEN = "YOUR_API_TOKEN";

// List all projects
const response = await fetch(`${API_BASE}/projects`, {
  headers: {
    "Authorization": `Bearer ${API_TOKEN}`
  }
});
const data = await response.json();

// Add update
const updateResponse = await fetch(`${API_BASE}/projects/GeoSearch%20Pro/updates`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    notes: "Completed feature X\nFixed bug Y",
    status: "Completed"
  })
});
```

### Using with CI/CD

Add an update after a deployment:

```bash
#!/bin/bash
# deploy-notify.sh

API_TOKEN="${ROADMAP_API_TOKEN}"
PROJECT_KEY="your-project-api-key"

curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/${PROJECT_KEY}/updates" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"notes\": \"Deployed version ${VERSION} to production\",
    \"status\": \"Completed\",
    \"update_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

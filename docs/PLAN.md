# Implementation Plan: External API for Project Updates

## Overview
Add a public API to the roadmap application that allows external services to create projects and post updates via a simple token-based authentication system.

## Architecture Decision

**Chosen Approach: Extend Express Backend**

Rationale:
- Direct PostgreSQL access already configured
- Simpler than setting up Cloudflare Worker + Hyperdrive
- Consistent with existing codebase patterns
- No additional infrastructure needed

Alternative considered: Cloudflare Worker would require proxying to the backend anyway since Workers can't directly connect to PostgreSQL without Hyperdrive setup.

---

## Implementation Steps

### Step 1: Database Schema Changes

Add `api_key` column to `changelog_projects` table for unique project identification:

```sql
ALTER TABLE changelog_projects
ADD COLUMN IF NOT EXISTS api_key VARCHAR(36) UNIQUE;

-- Backfill existing projects with UUIDs
UPDATE changelog_projects
SET api_key = gen_random_uuid()::text
WHERE api_key IS NULL;
```

### Step 2: Environment Configuration

Add to `docker-compose.yml`:
```yaml
environment:
  API_TOKEN: <generated-secure-token>
```

Generate a secure 64-character token that won't expire.

### Step 3: Backend API Changes (`server.js`)

#### 3.1 Add API Token Auth Middleware
```javascript
const apiAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing API token' });
  }
  next();
};
```

#### 3.2 Helper: Find Project by Identifier
```javascript
// Finds project by api_key (UUID) or by name (case-insensitive)
const findProjectByIdentifier = async (identifier) => {
  // Try api_key first (UUID format)
  let result = await pool.query(
    'SELECT * FROM changelog_projects WHERE api_key = $1',
    [identifier]
  );

  if (result.rows.length === 0) {
    // Try by name (case-insensitive)
    result = await pool.query(
      'SELECT * FROM changelog_projects WHERE LOWER(name) = LOWER($1)',
      [identifier]
    );
  }

  return result.rows[0] || null;
};
```

#### 3.3 New Endpoints

**POST /api/v1/projects** - Create project with optional screenshots
- Auth: Bearer token
- Content-Type: multipart/form-data
- Fields: name, description, status, current_version, images[]
- Returns: Project object with api_key

**POST /api/v1/projects/:identifier/updates** - Add update
- Auth: Bearer token
- :identifier = api_key or project name
- Body: { status, notes, update_date? }
- Returns: Created update object

**GET /api/v1/projects/:identifier** - Get project details
- Auth: Bearer token
- Returns: Project with updates and images

**GET /api/v1/projects** - List all projects
- Auth: Bearer token
- Returns: Array of projects with api_keys

### Step 4: Documentation File

Create `/var/roadmap/backend/API_DOCS.md` with:
- Authentication instructions (Bearer token in header)
- All endpoints with request/response examples
- Error codes and handling
- Rate limiting notes (if any)
- Example curl commands and code snippets

Documentation will be a static markdown file in the repo (not served as a web endpoint).

---

## File Changes Summary

| File | Changes |
|------|---------|
| `backend/server.js` | Add apiAuth middleware, findProjectByIdentifier helper, 4 new endpoints, update initTables for api_key |
| `docker-compose.yml` | Add API_TOKEN environment variable |
| `backend/API_DOCS.md` | New file with complete API documentation |

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/projects` | Create new project (with images) |
| GET | `/api/v1/projects` | List all projects |
| GET | `/api/v1/projects/:identifier` | Get project by api_key or name |
| POST | `/api/v1/projects/:identifier/updates` | Add update to project |

---

## Security Considerations

1. **Token Storage**: API_TOKEN stored as environment variable, never in code
2. **Token in Docs**: Documentation will NOT include the actual token
3. **HTTPS**: All requests should go through HTTPS (handled by Cloudflare)
4. **Rate Limiting**: Consider adding rate limiting if abuse is a concern (future enhancement)

---

## Testing Plan

1. Generate API token and add to docker-compose
2. Restart backend container
3. Test endpoints with curl:
   - Create project with image
   - Add update by api_key
   - Add update by project name
   - Verify updates appear in frontend

---

## Rollback Plan

If issues arise:
1. Remove new endpoints from server.js
2. Remove API_TOKEN from docker-compose
3. Restart backend
4. api_key column can remain (harmless)

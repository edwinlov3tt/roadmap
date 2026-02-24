# Roadmap Deployment Update — Digital Ocean Droplet

Instructions for updating the roadmap app on the DO droplet from the old Webpack-based version to the new Vite-based version with admin dashboard, task groups, and v1 API.

## What Changed

The roadmap repo has been significantly rebuilt:
- **Frontend**: Webpack → Vite, `.js` → `.jsx`, entirely new component library (dark glassmorphic design system, admin dashboard, calendar view, task management)
- **Backend**: New tables (task groups, tasks, milestones, API tokens), new v1 API endpoints, `express-rate-limit` added, security hardening
- **Repo structure**: Docs moved to `docs/` folder, old prototype files removed, `.claude/` commands added

## Step-by-Step Update

### 1. Pull the latest code

```bash
cd /path/to/roadmap        # wherever the repo lives on the droplet
git fetch origin
git pull origin main
```

If there are local uncommitted changes, stash them first:
```bash
git stash
git pull origin main
git stash pop              # re-apply if needed
```

### 2. Backend: Install new dependency

The backend has one new npm dependency (`express-rate-limit`). Either Docker rebuild handles this, or if running without Docker:

```bash
cd backend
npm install
```

### 3. Frontend: Full dependency reinstall

The frontend moved from Webpack to Vite with entirely new dependencies (Radix UI, Framer Motion, Lucide icons, Vite). A clean install is safest:

```bash
cd frontend
rm -rf node_modules
npm install
npm run build              # now runs `vite build` instead of `webpack`
```

The build output still goes to `frontend/dist/`.

### 4. Database Migrations — AUTOMATIC

**No manual SQL needed.** The backend's `initTables()` function runs on every startup and uses:
- `CREATE TABLE IF NOT EXISTS` for all new tables
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` for all new columns

New tables that will be created automatically:
- `project_task_groups` — task group management with scheduling fields
- `project_tasks` — individual tasks within groups
- `project_milestones` — timeline milestone markers
- `api_tokens` — v1 API authentication tokens

New columns added to `changelog_projects`:
- `priority` (VARCHAR, default 'none')
- `start_date` (DATE)
- `end_date` (DATE)
- `date_label` (VARCHAR, default 'Target Launch')
- `start_milestone` (VARCHAR, default 'Requested')
- `end_milestone` (VARCHAR, default 'Live')

New columns added to `project_task_groups`:
- `start_date` (DATE)
- `end_date` (DATE)
- `estimated_hours` (NUMERIC)

New columns added to `project_tasks`:
- `estimated_hours` (NUMERIC)

New indexes created for performance:
- `idx_task_groups_project`, `idx_tasks_group`, `idx_milestones_project`

**Existing data is fully preserved.** All migrations are additive (new tables, new nullable columns). Nothing is dropped or altered destructively.

### 5. Docker Configuration Updates

#### Backend Dockerfile

The current `backend/Dockerfile` exposes port 3002. The `server.js` now defaults to port 3005 when no `PORT` env var is set, but the `docker-compose.yml` sets `PORT: 3002` explicitly, so **no Dockerfile change needed** if using docker-compose.

If running without Docker, the backend now starts on port **3005** by default (was 3002).

#### Frontend Dockerfile

The existing Dockerfile should work as-is — it runs `npm run build` which now calls `vite build` instead of `webpack`. The output still goes to `dist/`.

#### nginx.conf — CHECK THIS

The frontend's `vite.config.js` sets `base: '/roadmap/'`, meaning all built asset URLs are prefixed with `/roadmap/`. The current `frontend/nginx.conf` serves from root `/`.

**If the outer nginx/proxy on the droplet strips `/roadmap/` before forwarding to the container**, update the frontend's `nginx.conf` to:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

**If the outer proxy forwards `/roadmap/` path as-is**, update it to:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /roadmap/ {
        alias /usr/share/nginx/html/;
        try_files $uri $uri/ /roadmap/index.html;
    }

    location /roadmap/assets/ {
        alias /usr/share/nginx/html/assets/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        return 301 /roadmap/;
    }
}
```

**How to check**: Look at the outer nginx config (likely in `/etc/nginx/sites-available/` or `/etc/nginx/conf.d/`) for the `location /roadmap/` block and see if it uses `proxy_pass http://...:3003/` (strips prefix) or `proxy_pass http://...:3003/roadmap/` (preserves prefix).

### 6. Environment Variables

Check that `docker-compose.yml` or `.env` has these set:

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No (default 3005, docker-compose sets 3002) | Backend listen port |
| `DB_HOST` | Yes | Postgres host (e.g. `fider-db-1`) |
| `DB_USER` | Yes | Postgres user |
| `DB_PASSWORD` | Yes | Postgres password |
| `DB_NAME` | Yes | Postgres database name |
| `DB_PORT` | No (default 5432) | Postgres port |
| `ANTHROPIC_API_KEY` | Optional | Enables AI-powered note cleaning on project updates. Without it, notes are split by newlines instead. |
| `API_TOKEN` | Optional | Legacy single-token auth. The new system uses `api_tokens` DB table for multi-token support. |

**CORS origins**: The backend restricts CORS to specific origins. Update the `allowedOrigins` array in `server.js` (around line 27) to include your production domain:

```javascript
const allowedOrigins = [
  'https://feedback.edwinlovett.com',
  'https://your-production-domain.com',  // add your domain
  'http://localhost:3003',
  'http://localhost:3005',
];
```

### 7. Rebuild and Deploy

```bash
# Stop running containers
docker-compose down

# Rebuild with fresh images (no cache to ensure clean build)
docker-compose build --no-cache

# Start everything
docker-compose up -d

# Check logs for successful startup
docker-compose logs -f roadmap-backend    # should see "Database tables initialized with new schema"
docker-compose logs -f roadmap-frontend   # should see nginx started
```

### 8. Verify

After deployment, check:

1. **Public view** loads at `/roadmap/` — should show dark glassmorphic Kanban board
2. **Admin login** at `/roadmap/admin` — enter admin email, should see the same board with admin controls
3. **API health**: `curl http://localhost:3002/api/public/projects` — should return project JSON with `taskGroups` and `milestones` arrays
4. **Backend logs**: `docker-compose logs roadmap-backend` — confirm "Database tables initialized" message and no errors

### 9. Create an API Token (Optional)

To use the v1 external API, create a token via the admin API:

```bash
curl -X POST http://localhost:3002/api/admin/api-tokens \
  -H "Content-Type: application/json" \
  -H "x-admin-email: your-admin@email.com" \
  -d '{"name": "CI/CD Token"}'
```

This returns a 64-character hex token for `Authorization: Bearer <token>` on `/api/v1/*` endpoints.

## Rollback

If something breaks:

```bash
git log --oneline -5          # find the previous commit hash
git checkout <previous-hash>  # revert to old code
docker-compose build --no-cache
docker-compose up -d
```

Database changes are safe to leave in place — all new tables/columns are additive and the old code simply ignores them.

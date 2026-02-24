# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dev Schedule / Roadmap application for project tracking, task management, and changelog. Features Kanban board, Gantt timeline, and calendar views with glassmorphic dark UI. Integrates with an external Fider feedback platform via shared PostgreSQL database.

## Build and Development Commands

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm run build         # Production build to dist/
npm run dev           # Development server on port 3003
```

### Backend (Express + Node.js)
```bash
cd backend
npm start            # Start production server (port 3005)
npm run dev          # Start with nodemon for hot reload
```

### Docker
```bash
docker-compose up --build        # Build and run all services
docker-compose up -d             # Run in background
docker-compose logs -f           # Follow logs
docker-compose down              # Stop all services
```

## Architecture

### Services
- **roadmap-backend** (port 3005): Express API server with PostgreSQL connection
- **roadmap-frontend** (port 3003): React SPA (Vite dev / nginx production)
- **postgres**: Connects to external Fider database (fider-db-1 container)

### Frontend Structure
```
frontend/src/
├── App.jsx                          # Main app with admin/public routing
├── index.jsx                        # Entry point
├── components/
│   ├── PublicView.jsx              # Public-facing project display
│   ├── PublicViewExecutive.jsx     # Executive summary view
│   ├── AdminDashboard.jsx          # Admin panel (mirrors public + admin actions)
│   ├── admin/                      # Admin-specific components
│   │   ├── AdminProjectDetail.jsx  # Tabbed project detail modal
│   │   ├── AdminProjectForm.jsx    # Create/edit project form
│   │   ├── AdminTaskGroupEditor.jsx # Task group + task CRUD
│   │   ├── AdminMilestoneEditor.jsx # Milestone CRUD
│   │   ├── AdminUpdateList.jsx     # Update management
│   │   └── AdminImageManager.jsx   # Image upload/manage
│   ├── views/                      # View modes
│   │   ├── BoardView.jsx           # Kanban board
│   │   ├── TimelineView.jsx        # Gantt timeline
│   │   ├── CalendarView.jsx        # Day-by-day scheduling
│   │   └── GalleryView.jsx         # Image gallery
│   ├── ui/                         # Reusable UI components
│   └── layout/AppShell.jsx         # Main layout wrapper
├── constants/statusConfig.js       # Status colors, labels, config
├── utils/
│   ├── dataAdapters.js             # API → view data transformations
│   └── dateUtils.js                # Timezone-aware date parsing/formatting
└── styles/globals.css              # Tailwind + glass design system
```

### Backend API
Single file architecture: `backend/server.js` contains all routes and database logic.

**Public endpoints (no auth):**
- `GET /api/public/projects` - List all projects (with taskGroups, milestones, images)
- `GET /api/public/projects/:id/updates` - Get project updates
- `GET /api/public/projects/:id/milestones` - Get project milestones
- `GET /api/fider-tags` - Get available Fider tags

**Admin endpoints (require `x-admin-email` header):**
- `POST/PUT/DELETE /api/projects/:id` - Project CRUD
- `GET/PUT /api/projects/:id/task-groups` - Task group management (bulk upsert)
- `PUT /api/projects/:id/milestones` - Milestone management (bulk upsert)
- `POST /api/projects/:id/updates` - Add project update (AI-cleaned notes)
- `POST /api/projects/:id/images` - Upload image (multipart, magic number validated)
- `GET/PUT/DELETE /api/projects/:projectId/images/:imageId` - Image management
- `GET/POST/DELETE /api/admin/tokens` - API token management

**External API v1 (require Bearer token):**
- `GET /api/v1/projects` - List projects with taskGroups + milestones
- `GET /api/v1/projects/:identifier` - Get project by api_key or name
- `POST /api/v1/projects` - Create project
- `POST /api/v1/projects/:identifier/updates` - Add update
- `POST /api/v1/projects/:identifier/images` - Upload images
- `GET/PUT /api/v1/projects/:identifier/task-groups` - Task group management
- `GET/PUT /api/v1/projects/:identifier/milestones` - Milestone management

### Security
- CORS restricted to `feedback.edwinlovett.com`, `localhost:3003`, `localhost:3005`
- 3-tier rate limiting: general (300/15min), admin (50/15min), uploads (30/15min)
- Image upload: MIME type + magic number validation (JPEG, PNG, GIF, WebP, SVG)

### Database Schema
Uses Fider's PostgreSQL database with custom tables:
- `changelog_projects` - Main project table (with scheduling fields)
- `changelog_updates` - Project update entries
- `project_task_groups` / `project_tasks` - Task management with scheduling
- `project_milestones` - Timeline markers
- `project_images` - Project screenshots with ordering
- `api_tokens` - External API authentication

See `docs/DATABASE_STRUCTURE.md` for full schema details.

## Documentation

All documentation lives in `docs/`:
- `docs/API_DOCS.md` - Complete API reference (served at `/api/docs`)
- `docs/CLAUDE_CODE_INTEGRATION.md` - Claude Code integration guide
- `docs/DATABASE_STRUCTURE.md` - Full database schema
- `docs/PORT_CONFIGURATION.md` - Port and networking setup
- `docs/PLAN.md` - Original project plan

## Key Integration Points

### Fider Integration
- Projects can link to Fider tags via `fider_tag_id` foreign key
- Completed Fider posts (status=3) can be imported as changelog updates
- Tag colors are pulled from Fider's `tags` table for display

### File Uploads
- Images stored in `backend/uploads/` directory
- Mounted as Docker volume for persistence
- Served at `/uploads/` path via Express static middleware

## URL Routing
Frontend is served under `/roadmap/` path prefix:
- Public view: `/roadmap/`
- Admin view: `/roadmap/admin`
- API Docs: `/roadmap/api/docs`
- Claude Guide: `/roadmap/api/claude-guide`

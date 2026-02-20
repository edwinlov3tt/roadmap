# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roadmap application that displays project tracking and changelog information. Integrates with an external Fider feedback platform via shared PostgreSQL database.

## Build and Development Commands

### Frontend (React + Webpack + Tailwind)
```bash
cd frontend
npm run build         # Production build to dist/
npm run dev           # Development server on port 3003
```

### Backend (Express + Node.js)
```bash
cd backend
npm start            # Start production server
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
- **roadmap-backend** (port 3002): Express API server with PostgreSQL connection
- **roadmap-frontend** (port 3003): React SPA served via nginx
- **postgres**: Connects to external Fider database (fider-db-1 container)

### Frontend Structure
```
frontend/src/
├── App.js                           # Main app with admin/public routing
├── components/
│   ├── PublicView.js               # Public-facing project display
│   ├── AdminView.js                # Admin panel for CRUD operations
│   ├── views/                      # Timeline, Gallery, Board view modes
│   ├── ui/                         # Reusable components (ProjectCard, StatusPill, etc.)
│   └── layout/AppShell.js          # Main layout wrapper
└── styles/globals.css              # Tailwind imports
```

### Backend API
Single file architecture: `backend/server.js` contains all routes and database logic.

**Public endpoints (no auth):**
- `GET /api/public/projects` - List all projects
- `GET /api/public/projects/:id/updates` - Get project updates
- `GET /api/fider-tags` - Get available Fider tags

**Admin endpoints (require `x-admin-email` header):**
- `POST/PUT/DELETE /api/projects/:id` - Project CRUD
- `POST /api/projects/:id/images` - Upload image (multipart form)
- `POST /api/projects/:id/updates` - Add project update
- `POST /api/import-fider-post` - Import Fider post as update

### Database Schema
Uses Fider's PostgreSQL database with custom tables:
- `changelog_projects` - Main project table (links to `tags` via `fider_tag_id`)
- `changelog_updates` - Project update entries
- `project_images` - Project screenshots with ordering
- `project_next_steps`, `project_ideas`, `project_timeline` - Extended project metadata

See DATABASE_STRUCTURE.md for full schema details.

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

Webpack config and nginx handle the path prefix correctly.

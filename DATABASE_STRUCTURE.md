# Roadmap Application Database Structure

## Overview
The roadmap application integrates with the existing Fider PostgreSQL database to display project roadmaps. It uses several Fider tables and extends them with custom roadmap-specific tables.

## Database Connection
- **Host**: 172.19.0.3 (Docker container: fider-db-1)
- **Database**: fider
- **User**: fider
- **Port**: 5432

## Core Tables Used by Roadmap Application

### 1. changelog_projects
**Primary table for roadmap projects**
```sql
CREATE TABLE changelog_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    current_version VARCHAR(50) NOT NULL,
    next_steps TEXT,
    launched_date VARCHAR(100),
    fider_tag_id INTEGER REFERENCES tags(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    project_url VARCHAR(500),
    description TEXT,
    status VARCHAR(50) DEFAULT 'In Development',
    last_updated_at TIMESTAMP DEFAULT NOW(),
    slug VARCHAR(255) UNIQUE
);
```

**Key Fields**:
- `id`: Primary key for projects
- `name`: Project display name
- `status`: Project status ('Live', 'In Beta Testing', 'In Development', 'In Planning')
- `fider_tag_id`: Links to Fider tags for categorization
- `description`: Project description
- `project_url`: External project URL
- `current_version`: Current version number

### 2. tags (Fider Integration)
**Fider's existing tag system used for project categorization**
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    name VARCHAR(30) NOT NULL,
    slug VARCHAR(30) NOT NULL,
    color VARCHAR(6) NOT NULL,
    is_public BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Usage in Roadmap**:
- Provides tag colors and names for project cards
- Links projects to feedback categories via `changelog_projects.fider_tag_id`

### 3. project_images
**Stores project screenshots and images**
```sql
CREATE TABLE project_images (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
    src VARCHAR(500) NOT NULL,
    alt VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Features**:
- Multiple images per project
- Sort ordering for display
- Cascading delete with projects

### 4. posts (Fider Integration)
**Links roadmap projects to Fider feedback posts**
```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    number INTEGER NOT NULL,
    status INTEGER NOT NULL,
    slug VARCHAR(100) NOT NULL,
    response TEXT,
    response_user_id INTEGER REFERENCES users(id),
    response_date TIMESTAMP WITH TIME ZONE,
    original_id INTEGER REFERENCES posts(id)
);
```

## API Endpoints

### Public Endpoints
- `GET /api/projects` - Returns all projects with Fider tag integration
- `GET /api/projects/:id` - Returns single project with full details

### Admin Endpoints
- `GET /api/admin/projects` - Returns all projects for admin interface
- `POST /api/admin/projects` - Creates new project
- `PUT /api/admin/projects/:id` - Updates existing project
- `DELETE /api/admin/projects/:id` - Deletes project
- `POST /api/admin/projects/:id/images` - Uploads project images
- `DELETE /api/admin/images/:id` - Deletes project image
- `POST /api/import/fider` - Imports projects from Fider posts

## Database Relationships

```
changelog_projects (1) ←→ (N) project_images
changelog_projects (N) ←→ (1) tags [via fider_tag_id]
posts (1) ←→ (N) post_tags (N) ←→ (1) tags
```

## Project Status Flow
1. **In Planning** - Initial concept phase
2. **In Development** - Active development
3. **In Beta Testing** - Testing phase with limited users
4. **Live** - Production release

## Key Features
- **Fider Integration**: Projects can be linked to Fider feedback via tags
- **Image Management**: Multiple images per project with ordering
- **Status Tracking**: Progress through development lifecycle
- **Version Tracking**: Current version display
- **External Links**: Project URLs and Fider feedback links

## Data Migration Notes
- The roadmap application was initially connected to a separate SiteGround database
- Migration restored connection to local Fider PostgreSQL container
- All existing project data (7 projects) was successfully preserved
- Foreign key relationships with Fider tables are properly maintained

## Backup Strategy
- Original SiteGround configuration backed up to `server.js.siteground-backup`
- Local Fider database provides the source of truth
- Docker container `fider-db-1` contains all data
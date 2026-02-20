# Roadmap Application - Port Configuration Documentation

## Overview
This document provides a comprehensive overview of all port configurations, API endpoints, and routing for the roadmap application stack.

## Port Configuration

| Service | Port | Docker Port Mapping | Purpose | Status |
|---------|------|-------------------|---------|--------|
| **roadmap-backend** | 3002 | 3002:3002 | API server | ✅ Running |
| **roadmap-frontend** | 3003 | 3003:80 | Frontend nginx | ✅ Running |
| **fider (main app)** | 3000 | 3000:3000 | Feedback platform | ✅ Running |
| **gtm-crawler-backend** | 3001 | 3001:3001 | GTM crawler API | ✅ Running |
| **gtm-crawler-frontend** | 8080 | 8080:80 | GTM crawler UI | ✅ Running |
| **postgres (roadmap)** | 5432 | Internal only | Database | ✅ Running |
| **postgres (fider)** | 5432 | Internal only | Fider database | ✅ Running |

## Nginx Routing Configuration

### Domain Routing
- **feedback.edwinlovett.com** → Main server block for roadmap and fider
- **gtm.edwinlovett.com** → GTM crawler server block
- **localhost** → Routes to GTM crawler (due to server_name configuration)

### URL Routing Patterns

#### Roadmap Application Routes
```nginx
# API Routes (exact match for priority)
location = /roadmap/api/public/projects {
    → proxy_pass http://localhost:3002/api/public/projects
}

# All other API routes
location ^~ /roadmap/api/ {
    → proxy_pass http://localhost:3002/api/[path]
}

# Static file uploads
location /uploads/ {
    → alias /var/roadmap/backend/uploads/
}

# Frontend application
location /roadmap/ {
    → proxy_pass http://localhost:3003/
}
```

#### Main Fider Application
```nginx
location / {
    → proxy_pass http://localhost:3000
}
```

## API Endpoints

### Public Endpoints (No Authentication)
- `GET /roadmap/api/public/projects` - Get all projects for public view
- `GET /roadmap/api/public/projects/:id/updates` - Get project updates
- `GET /roadmap/api/fider-tags` - Get available Fider tags

### Admin Endpoints (Require x-admin-email header)
**Authentication**: Header `x-admin-email: edwin@edwinlovett.com`

#### Project Management
- `POST /roadmap/api/projects` - Create new project
- `PUT /roadmap/api/projects/:id` - Update project
- `DELETE /roadmap/api/projects/:id` - Delete project
- `GET /roadmap/api/projects` - Get all projects (admin view)

#### Image Management
- `POST /roadmap/api/projects/:id/images` - Upload project image
- `DELETE /roadmap/api/projects/:projectId/images/:imageId` - Delete image
- `PUT /roadmap/api/projects/:projectId/images/:imageId` - Update image

#### Updates & Fider Integration
- `POST /roadmap/api/projects/:id/updates` - Add project update
- `GET /roadmap/api/fider-completed/:tagId` - Get completed Fider posts
- `POST /roadmap/api/import-fider-post` - Import Fider post as update

## Testing Commands

### Test API Connectivity
```bash
# Test public API (works with any host)
curl -H "Accept: application/json" http://localhost:3002/api/public/projects

# Test through nginx (requires proper host header)
curl -H "Host: feedback.edwinlovett.com" -H "Accept: application/json" http://localhost/roadmap/api/public/projects

# Test Fider integration
curl -H "Host: feedback.edwinlovett.com" http://localhost/roadmap/api/fider-tags
```

### Test CRUD Operations
```bash
# Create project (requires auth)
curl -H "Host: feedback.edwinlovett.com" \
     -H "Content-Type: application/json" \
     -H "x-admin-email: edwin@edwinlovett.com" \
     -X POST http://localhost/roadmap/api/projects \
     -d '{"name":"Test Project","current_version":"1.0.0","description":"Test","status":"In Development"}'

# Update project
curl -H "Host: feedback.edwinlovett.com" \
     -H "Content-Type: application/json" \
     -H "x-admin-email: edwin@edwinlovett.com" \
     -X PUT http://localhost/roadmap/api/projects/[ID] \
     -d '{"name":"Updated Name","status":"Live"}'

# Delete project
curl -H "Host: feedback.edwinlovett.com" \
     -H "x-admin-email: edwin@edwinlovett.com" \
     -X DELETE http://localhost/roadmap/api/projects/[ID]
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway on API calls**
   - Check if backend container is running: `docker ps | grep roadmap-backend`
   - Check backend logs: `docker logs roadmap-roadmap-backend-1`
   - Verify port 3002 is accessible: `curl http://localhost:3002/api/public/projects`

2. **API returns HTML instead of JSON**
   - Issue: nginx routing to wrong server (localhost routes to GTM crawler)
   - Solution: Use proper Host header: `-H "Host: feedback.edwinlovett.com"`
   - Alternative: Access directly via feedback.edwinlovett.com domain

3. **Frontend not loading**
   - Check frontend container: `docker ps | grep roadmap-frontend`
   - Verify port 3003: `curl http://localhost:3003/`
   - Check nginx configuration: `nginx -t`

4. **Image uploads failing**
   - Verify uploads directory exists: `ls -la /var/roadmap/backend/uploads/`
   - Check multer configuration in backend
   - Verify nginx serves uploads: `curl -H "Host: feedback.edwinlovett.com" http://localhost/uploads/[filename]`
   - Ensure volume mount is working: `docker exec roadmap-roadmap-backend-1 ls /app/uploads/`
   - Check for missing files: Remove orphaned database references for deleted files

5. **Database connection issues**
   - Check PostgreSQL container: `docker ps | grep postgres`
   - Verify database credentials in docker-compose.yml
   - Test connection from backend container

### Health Check Script
```bash
#!/bin/bash
echo "=== Roadmap Application Health Check ==="
echo "1. Backend API:"
curl -s -H "Accept: application/json" http://localhost:3002/api/public/projects | jq length

echo "2. Frontend:"
curl -s -I http://localhost:3003/ | grep "HTTP"

echo "3. API through nginx:"
curl -s -H "Host: feedback.edwinlovett.com" -H "Accept: application/json" http://localhost/roadmap/api/public/projects | jq length

echo "4. Fider integration:"
curl -s -H "Host: feedback.edwinlovett.com" http://localhost/roadmap/api/fider-tags | jq length

echo "5. Container status:"
docker ps | grep roadmap
```

## Configuration Files

### Key Files
- `/var/roadmap/docker-compose.yml` - Container orchestration
- `/etc/nginx/sites-enabled/feedback` - Main nginx routing
- `/var/roadmap/backend/server.js` - API server
- `/var/roadmap/frontend/nginx.conf` - Frontend nginx config

### Environment Variables
- `PORT: 3002` - Backend server port
- Database connection variables in docker-compose.yml

### Volume Mounts
- `./backend/uploads:/app/uploads` - Persist uploaded images on host filesystem
- No full backend mount to avoid node_modules conflicts

## Security Notes

1. **Authentication**: Simple header-based auth for admin operations
2. **File uploads**: Stored in `/var/roadmap/backend/uploads/`
3. **CORS**: Configured in backend for cross-origin requests
4. **SSL**: Handled by Cloudflare, nginx uses self-signed certs for origin

---

**Last Updated**: September 26, 2025
**Version**: 1.0.0
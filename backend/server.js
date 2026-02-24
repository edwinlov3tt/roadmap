const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3005;

// Database connection to local Fider PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'fider',
  host: process.env.DB_HOST || '172.19.0.3',
  database: process.env.DB_NAME || 'fider',
  password: process.env.DB_PASSWORD || 't1WEn72Z0+2P8JN5dqtoPHj2nUSMsuCs',
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// CORS — restrict to known origins
const allowedOrigins = [
  'https://feedback.edwinlovett.com',
  'http://localhost:3003',
  'http://localhost:3005',
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,                   // Stricter for admin/auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                   // Stricter for uploads
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later' },
});

app.use(generalLimiter);

// Stricter rate limits on admin and auth endpoints
app.use('/api/projects', authLimiter);
app.use('/api/import-fider-post', authLimiter);
app.use('/api/admin', authLimiter);

app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check MIME type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'), false)
    }
  }
})

// Validate file magic numbers (first bytes) to prevent MIME spoofing
const IMAGE_SIGNATURES = {
  'ffd8ff':   'image/jpeg',   // JPEG
  '89504e47': 'image/png',    // PNG
  '47494638': 'image/gif',    // GIF
  '52494646': 'image/webp',   // WebP (RIFF container)
  '3c3f786d': 'image/svg+xml',// SVG (<?xml)
  '3c737667': 'image/svg+xml',// SVG (<svg)
};

function validateImageMagicNumber(filePath) {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    const hex = buffer.toString('hex');
    return Object.keys(IMAGE_SIGNATURES).some(sig => hex.startsWith(sig));
  } catch {
    return false;
  }
}

// Add request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// Database connection with retry logic
const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Connected to database successfully');
      return;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) {
        console.error('All database connection attempts failed');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Initialize database connection
connectWithRetry();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Simple admin auth middleware
const adminAuth = (req, res, next) => {
  const email = req.headers['x-admin-email'];
  if (email === 'edwin@edwinlovett.com') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API token auth middleware for external API access
const apiAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Missing API token',
      hint: 'Include Authorization: Bearer <token> header'
    });
  }

  try {
    // Check token against database
    const result = await pool.query(
      'SELECT id, name FROM api_tokens WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid API token',
        hint: 'Token not found or has been revoked'
      });
    }

    // Update last_used_at timestamp
    await pool.query(
      'UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1',
      [result.rows[0].id]
    );

    // Attach token info to request for logging
    req.apiToken = result.rows[0];
    next();
  } catch (error) {
    console.error('API auth error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Helper: Find project by api_key (UUID) or by name (case-insensitive)
const findProjectByIdentifier = async (identifier) => {
  // Decode URL-encoded identifier (for names with spaces)
  const decoded = decodeURIComponent(identifier);

  // Try api_key first (UUID format)
  let result = await pool.query(
    'SELECT * FROM changelog_projects WHERE api_key = $1',
    [decoded]
  );

  if (result.rows.length === 0) {
    // Try by name (case-insensitive)
    result = await pool.query(
      'SELECT * FROM changelog_projects WHERE LOWER(name) = LOWER($1)',
      [decoded]
    );
  }

  return result.rows[0] || null;
};

// Helper function to generate slug from name
const generateSlug = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

// AI-powered note cleaning using Claude API
const cleanNotesWithAI = async (notes) => {
  try {
    // Processing notes with AI
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Clean up and organize these project notes into clear, concise bullet points. Make them professional and actionable. Remove any redundancy and structure them logically:

"${notes}"

Respond ONLY with a JSON array of strings, where each string is a bullet point (without bullet symbols). Do not include any other text or formatting.`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    const responseText = response.data.content[0].text;
    const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to parse as JSON
    try {
      const bulletPoints = JSON.parse(cleanedResponse);
      return Array.isArray(bulletPoints) ? bulletPoints : [notes];
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse:', cleanedResponse);
      // If JSON parsing fails, try to extract array-like content
      const lines = cleanedResponse.split('\n').filter(line => line.trim());
      return lines.length > 0 ? lines : [notes];
    }
  } catch (error) {
    console.error('Error processing notes with AI:', error);
    // Fallback: split by newlines and clean up
    return notes.split('\n').filter(line => line.trim()).map(line => line.trim());
  }
};

// Create changelog tables if they don't exist
const initTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS changelog_projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        current_version VARCHAR(50) NOT NULL,
        next_steps TEXT,
        launched_date VARCHAR(100),
        project_url VARCHAR(500),
        fider_tag_id INTEGER REFERENCES tags(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        description TEXT,
        status VARCHAR(50) DEFAULT 'In Development',
        last_updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add new columns if they don't exist
    const alterQueries = [
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Development'`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS project_url VARCHAR(500)`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS api_key VARCHAR(36) UNIQUE`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'none'`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS start_date DATE`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS end_date DATE`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS date_label VARCHAR(50) DEFAULT 'Target Launch'`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS start_milestone VARCHAR(50) DEFAULT 'Requested'`,
      `ALTER TABLE changelog_projects ADD COLUMN IF NOT EXISTS end_milestone VARCHAR(50) DEFAULT 'Live'`
    ];

    for (const query of alterQueries) {
      try {
        await pool.query(query);
      } catch (error) {
        // Column already exists or error adding: handled
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS changelog_updates (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        notes JSONB NOT NULL,
        raw_notes TEXT,
        fider_post_id INTEGER REFERENCES posts(id),
        created_at TIMESTAMP DEFAULT NOW(),
        update_date TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add update_date column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE changelog_updates
        ADD COLUMN IF NOT EXISTS update_date TIMESTAMP DEFAULT NOW()
      `);
    } catch (error) {
      // Column already exists: handled
    }

    // Create new tables for enhanced features
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_images (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        src VARCHAR(500) NOT NULL,
        alt VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_next_steps (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        blocking BOOLEAN DEFAULT false,
        owner VARCHAR(255),
        eta DATE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_ideas (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        why TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_timeline (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        phase VARCHAR(100) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        done BOOLEAN DEFAULT false,
        current BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Task groups and tasks for v3 milestone progress
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_task_groups (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        milestone VARCHAR(50) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        task_group_id INTEGER REFERENCES project_task_groups(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        done BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add scheduling columns to task groups and tasks
    await pool.query(`
      ALTER TABLE project_task_groups ADD COLUMN IF NOT EXISTS start_date DATE;
      ALTER TABLE project_task_groups ADD COLUMN IF NOT EXISTS end_date DATE;
      ALTER TABLE project_task_groups ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,1);
    `);

    await pool.query(`
      ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,1);
    `);

    // Project milestones for timeline markers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES changelog_projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_date DATE NOT NULL,
        icon VARCHAR(10) DEFAULT '◆',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status ON changelog_projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_updated ON changelog_projects(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_projects_slug ON changelog_projects(slug);
      CREATE INDEX IF NOT EXISTS idx_updates_project ON changelog_updates(project_id);
      CREATE INDEX IF NOT EXISTS idx_images_project ON project_images(project_id);
      CREATE INDEX IF NOT EXISTS idx_next_steps_project ON project_next_steps(project_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_project ON project_ideas(project_id);
      CREATE INDEX IF NOT EXISTS idx_timeline_project ON project_timeline(project_id);
      CREATE INDEX IF NOT EXISTS idx_task_groups_project ON project_task_groups(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_group ON project_tasks(task_group_id);
      CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
    `);

    // Create API tokens table for external API authentication
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP
      )
    `);

    console.log('Database tables initialized with new schema');
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};

// Initialize tables on startup
initTables();

// API Routes

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cp.*, t.name as fider_tag_name, t.color as fider_tag_color,
             COUNT(cu.id) as update_count
      FROM changelog_projects cp
      LEFT JOIN tags t ON cp.fider_tag_id = t.id
      LEFT JOIN changelog_updates cu ON cp.id = cu.project_id
      GROUP BY cp.id, t.name, t.color
      ORDER BY cp.updated_at DESC
    `);

    // Fetch images for all projects
    const projectIds = result.rows.map(p => p.id);
    if (projectIds.length > 0) {
      const imagesResult = await pool.query(`
        SELECT * FROM project_images
        WHERE project_id = ANY($1)
        ORDER BY project_id, sort_order ASC
      `, [projectIds]);

      // Group images by project_id
      const imagesByProject = {};
      imagesResult.rows.forEach(img => {
        if (!imagesByProject[img.project_id]) {
          imagesByProject[img.project_id] = [];
        }
        imagesByProject[img.project_id].push(img);
      });

      // Add images to each project
      result.rows.forEach(project => {
        project.images = imagesByProject[project.id] || [];
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project with updates
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectResult = await pool.query(`
      SELECT cp.*, t.name as fider_tag_name, t.color as fider_tag_color
      FROM changelog_projects cp
      LEFT JOIN tags t ON cp.fider_tag_id = t.id
      WHERE cp.id = $1
    `, [req.params.id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updatesResult = await pool.query(`
      SELECT cu.*, p.title as fider_post_title
      FROM changelog_updates cu
      LEFT JOIN posts p ON cu.fider_post_id = p.id
      WHERE cu.project_id = $1
      ORDER BY cu.created_at DESC
    `, [req.params.id]);

    const imagesResult = await pool.query(`
      SELECT *
      FROM project_images
      WHERE project_id = $1
      ORDER BY sort_order ASC
    `, [req.params.id]);

    const project = projectResult.rows[0];
    project.updates = updatesResult.rows;
    project.images = imagesResult.rows;

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project (admin only)
app.post('/api/projects', adminAuth, async (req, res) => {
  try {
    const { name, current_version, next_steps, launched_date, project_url, fider_tag_id, description, status,
            priority, start_date, end_date, date_label, start_milestone, end_milestone } = req.body;

    // Validate status values
    const validStatuses = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'];
    const projectStatus = status && validStatuses.includes(status) ? status : 'Requested';

    const result = await pool.query(`
      INSERT INTO changelog_projects
        (name, current_version, next_steps, launched_date, project_url, fider_tag_id,
         description, status, priority, start_date, end_date, date_label,
         start_milestone, end_milestone, last_updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *
    `, [name, current_version, next_steps, launched_date, project_url, fider_tag_id,
        description, projectStatus, priority || 'none', start_date || null, end_date || null,
        date_label || 'Target Launch', start_milestone || 'Requested', end_milestone || 'Live']);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update existing project (admin only)
app.put('/api/projects/:id', adminAuth, async (req, res) => {
  try {
    const { name, current_version, next_steps, launched_date, project_url, fider_tag_id, description, status,
            priority, start_date, end_date, date_label, start_milestone, end_milestone } = req.body;

    // Validate status values
    const validStatuses = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'];
    const projectStatus = status && validStatuses.includes(status) ? status : 'Requested';

    const result = await pool.query(`
      UPDATE changelog_projects
      SET name = $1, current_version = $2, next_steps = $3, launched_date = $4,
          project_url = $5, fider_tag_id = $6, description = $7, status = $8,
          priority = $9, start_date = $10, end_date = $11, date_label = $12,
          start_milestone = $13, end_milestone = $14,
          updated_at = NOW(), last_updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `, [name, current_version, next_steps, launched_date, project_url, fider_tag_id,
        description, projectStatus, priority || 'none', start_date || null, end_date || null,
        date_label || 'Target Launch', start_milestone || 'Requested', end_milestone || 'Live',
        req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Archive/Delete project (admin only)
app.delete('/api/projects/:id', adminAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    // First delete all updates for this project (cascade should handle this, but being explicit)
    await pool.query('DELETE FROM changelog_updates WHERE project_id = $1', [projectId]);

    // Then delete the project
    const result = await pool.query(
      'DELETE FROM changelog_projects WHERE id = $1 RETURNING *',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully', project: result.rows[0] });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get task groups for a project (admin only)
app.get('/api/projects/:id/task-groups', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tg.id, tg.project_id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      WHERE tg.project_id = $1
      GROUP BY tg.id
      ORDER BY tg.sort_order
    `, [req.params.id]);

    const taskGroups = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      milestone: row.milestone,
      startDate: row.start_date,
      endDate: row.end_date,
      estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
      tasks: row.tasks || [],
    }));

    res.json(taskGroups);
  } catch (error) {
    console.error('Error fetching task groups:', error);
    res.status(500).json({ error: 'Failed to fetch task groups' });
  }
});

// Bulk upsert task groups for a project (admin only)
app.put('/api/projects/:id/task-groups', adminAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const projectId = req.params.id;
    const { taskGroups } = req.body;

    await client.query('BEGIN');

    // Delete existing groups (cascades to tasks)
    await client.query('DELETE FROM project_task_groups WHERE project_id = $1', [projectId]);

    // Insert new groups and their tasks
    for (let i = 0; i < taskGroups.length; i++) {
      const group = taskGroups[i];
      const groupResult = await client.query(
        `INSERT INTO project_task_groups (project_id, name, milestone, sort_order, start_date, end_date, estimated_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [projectId, group.name, group.milestone, i, group.startDate || null, group.endDate || null, group.estimatedHours || null]
      );
      const groupId = groupResult.rows[0].id;

      if (group.tasks && group.tasks.length > 0) {
        for (let j = 0; j < group.tasks.length; j++) {
          const task = group.tasks[j];
          await client.query(
            `INSERT INTO project_tasks (task_group_id, name, done, sort_order, completed_at, estimated_hours)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [groupId, task.name, task.done || false, j, task.done ? new Date() : null, task.estimatedHours || null]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Re-fetch and return the saved structure
    const result = await client.query(`
      SELECT tg.id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      WHERE tg.project_id = $1
      GROUP BY tg.id
      ORDER BY tg.sort_order
    `, [projectId]);

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      milestone: row.milestone,
      startDate: row.start_date,
      endDate: row.end_date,
      estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
      tasks: row.tasks || [],
    })));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving task groups:', error);
    res.status(500).json({ error: 'Failed to save task groups' });
  } finally {
    client.release();
  }
});

// Get milestones for a project (public)
app.get('/api/public/projects/:id/milestones', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, target_date, icon, sort_order
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY sort_order
    `, [req.params.id]);

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      targetDate: row.target_date,
      icon: row.icon,
    })));
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Bulk upsert milestones for a project (admin only)
app.put('/api/projects/:id/milestones', adminAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const projectId = req.params.id;
    const { milestones } = req.body;

    await client.query('BEGIN');

    // Delete existing milestones
    await client.query('DELETE FROM project_milestones WHERE project_id = $1', [projectId]);

    // Insert new milestones
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      await client.query(
        `INSERT INTO project_milestones (project_id, name, target_date, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, m.name, m.targetDate, m.icon || '◆', i]
      );
    }

    await client.query('COMMIT');

    // Re-fetch and return
    const result = await client.query(`
      SELECT id, name, target_date, icon, sort_order
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY sort_order
    `, [projectId]);

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      targetDate: row.target_date,
      icon: row.icon,
    })));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving milestones:', error);
    res.status(500).json({ error: 'Failed to save milestones' });
  } finally {
    client.release();
  }
});

// Add update to project (admin only)
app.post('/api/projects/:id/updates', adminAuth, async (req, res) => {
  try {
    const { status, notes, update_date } = req.body;
    const cleanedNotes = await cleanNotesWithAI(notes);

    // Use provided update_date or default to now
    const updateDate = update_date || new Date().toISOString();

    const result = await pool.query(`
      INSERT INTO changelog_updates (project_id, status, notes, raw_notes, update_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.params.id, status, JSON.stringify(cleanedNotes), notes, updateDate]);

    // Update project's updated_at timestamp
    await pool.query(`
      UPDATE changelog_projects 
      SET updated_at = NOW() 
      WHERE id = $1
    `, [req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding update:', error);
    res.status(500).json({ error: 'Failed to add update' });
  }
});

// Get available Fider tags
app.get('/api/fider-tags', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, color, is_public
      FROM tags
      WHERE tenant_id = 1 AND is_public = true
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching Fider tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get completed Fider posts for a tag
app.get('/api/fider-completed/:tagId', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.description, p.created_at, p.status,
             u.name as author_name, u.email as author_email
      FROM posts p
      JOIN post_tags pt ON p.id = pt.post_id
      JOIN users u ON p.user_id = u.id
      WHERE pt.tag_id = $1 AND p.status = 3 AND p.tenant_id = 1
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [req.params.tagId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching completed Fider posts:', error);
    res.status(500).json({ error: 'Failed to fetch completed posts' });
  }
});

// Import completed Fider post as changelog update
app.post('/api/import-fider-post', adminAuth, async (req, res) => {
  try {
    const { projectId, fiderPostId, status = 'Completed' } = req.body;

    // Get the Fider post details
    const postResult = await pool.query(`
      SELECT title, description FROM posts WHERE id = $1 AND tenant_id = 1
    `, [fiderPostId]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fider post not found' });
    }

    const post = postResult.rows[0];
    const notes = `${post.title}\n${post.description || ''}`;
    const cleanedNotes = await cleanNotesWithAI(notes);

    const result = await pool.query(`
      INSERT INTO changelog_updates (project_id, status, notes, raw_notes, fider_post_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [projectId, status, JSON.stringify(cleanedNotes), notes, fiderPostId]);

    // Update project's updated_at timestamp
    await pool.query(`
      UPDATE changelog_projects 
      SET updated_at = NOW() 
      WHERE id = $1
    `, [projectId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error importing Fider post:', error);
    res.status(500).json({ error: 'Failed to import Fider post' });
  }
});

// Upload image for project (admin only)
app.post('/api/projects/:id/images', uploadLimiter, adminAuth, upload.single('image'), async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file magic number to prevent MIME spoofing
    if (!validateImageMagicNumber(req.file.path)) {
      fs.unlinkSync(req.file.path); // Clean up the invalid file
      return res.status(400).json({ error: 'Invalid image file' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const altText = req.body.alt || req.file.originalname;

    // Get current max sort_order for this project
    const maxOrderResult = await pool.query(`
      SELECT COALESCE(MAX(sort_order), 0) as max_order
      FROM project_images
      WHERE project_id = $1
    `, [projectId]);

    const sortOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await pool.query(`
      INSERT INTO project_images (project_id, src, alt, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [projectId, imageUrl, altText, sortOrder]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get images for project
app.get('/api/projects/:id/images', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM project_images
      WHERE project_id = $1
      ORDER BY sort_order ASC
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image (admin only)
app.delete('/api/projects/:projectId/images/:imageId', adminAuth, async (req, res) => {
  try {
    const { projectId, imageId } = req.params;

    // Get image details before deleting
    const imageResult = await pool.query(`
      SELECT src FROM project_images
      WHERE id = $1 AND project_id = $2
    `, [imageId, projectId]);

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageSrc = imageResult.rows[0].src;

    // Delete from database
    await pool.query(`
      DELETE FROM project_images
      WHERE id = $1 AND project_id = $2
    `, [imageId, projectId]);

    // Delete file from filesystem
    const filePath = path.join(__dirname, imageSrc);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Update image order (admin only)
app.put('/api/projects/:projectId/images/:imageId', adminAuth, async (req, res) => {
  try {
    const { projectId, imageId } = req.params;
    const { sort_order, alt } = req.body;

    const result = await pool.query(`
      UPDATE project_images
      SET sort_order = COALESCE($1, sort_order),
          alt = COALESCE($2, alt)
      WHERE id = $3 AND project_id = $4
      RETURNING *
    `, [sort_order, alt, imageId, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// ============================================================
// API Token Management (Admin only)
// ============================================================

// List all API tokens (admin only) - tokens are masked
app.get('/api/admin/tokens', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name,
             CONCAT(LEFT(token, 8), '...', RIGHT(token, 8)) as token_masked,
             created_at, last_used_at
      FROM api_tokens
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      tokens: result.rows
    });
  } catch (error) {
    console.error('Error fetching API tokens:', error);
    res.status(500).json({ error: 'Failed to fetch API tokens' });
  }
});

// Create new API token (admin only)
app.post('/api/admin/tokens', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Token name is required' });
    }

    // Generate a secure random token (64 hex characters)
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(`
      INSERT INTO api_tokens (name, token)
      VALUES ($1, $2)
      RETURNING id, name, token, created_at
    `, [name.trim(), token]);

    res.status(201).json({
      success: true,
      message: 'API token created successfully',
      token: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating API token:', error);
    res.status(500).json({ error: 'Failed to create API token' });
  }
});

// Delete API token (admin only)
app.delete('/api/admin/tokens/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM api_tokens WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      success: true,
      message: `API token "${result.rows[0].name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting API token:', error);
    res.status(500).json({ error: 'Failed to delete API token' });
  }
});

// Regenerate API token (admin only) - creates new token with same name
app.post('/api/admin/tokens/:id/regenerate', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Generate a new secure random token
    const crypto = require('crypto');
    const newToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(`
      UPDATE api_tokens
      SET token = $1, created_at = NOW(), last_used_at = NULL
      WHERE id = $2
      RETURNING id, name, token, created_at
    `, [newToken, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      success: true,
      message: 'API token regenerated successfully',
      token: result.rows[0]
    });
  } catch (error) {
    console.error('Error regenerating API token:', error);
    res.status(500).json({ error: 'Failed to regenerate API token' });
  }
});

// Serve API documentation as HTML
app.get('/api/docs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const marked = require('marked');

  const mdPath = path.join(__dirname, '..', 'docs', 'API_DOCS.md');

  if (!fs.existsSync(mdPath)) {
    return res.status(404).send('API documentation not found');
  }

  const markdown = fs.readFileSync(mdPath, 'utf8');
  const html = marked.parse(markdown);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roadmap API Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-dark.min.css">
  <style>
    body {
      background-color: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      max-width: 980px;
      margin: 0 auto;
    }
    .markdown-body {
      background-color: transparent;
    }
    .markdown-body pre {
      background-color: #161b22;
    }
    .markdown-body code {
      background-color: #21262d;
    }
    .markdown-body table {
      display: table;
      width: 100%;
    }
    .markdown-body table th,
    .markdown-body table td {
      background-color: #161b22;
      border-color: #30363d;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #58a6ff;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <a href="/roadmap/admin" class="back-link">← Back to Admin</a>
  <article class="markdown-body">
    ${html}
  </article>
</body>
</html>
  `);
});

// Serve Claude Code integration guide as HTML
app.get('/api/claude-guide', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const marked = require('marked');

  const mdPath = path.join(__dirname, '..', 'docs', 'CLAUDE_CODE_INTEGRATION.md');

  if (!fs.existsSync(mdPath)) {
    return res.status(404).send('Claude Code integration guide not found');
  }

  const markdown = fs.readFileSync(mdPath, 'utf8');
  const html = marked.parse(markdown);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Code Integration Guide - Roadmap API</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-dark.min.css">
  <style>
    body {
      background-color: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      max-width: 980px;
      margin: 0 auto;
    }
    .markdown-body {
      background-color: transparent;
    }
    .markdown-body pre {
      background-color: #161b22;
    }
    .markdown-body code {
      background-color: #21262d;
    }
    .markdown-body table {
      display: table;
      width: 100%;
    }
    .markdown-body table th,
    .markdown-body table td {
      background-color: #161b22;
      border-color: #30363d;
    }
    .nav-links {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .nav-links a {
      color: #58a6ff;
      text-decoration: none;
    }
    .nav-links a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="nav-links">
    <a href="/roadmap/admin">← Back to Admin</a>
    <a href="/roadmap/api/docs">API Documentation</a>
  </div>
  <article class="markdown-body">
    ${html}
  </article>
</body>
</html>
  `);
});

// Public changelog view (no auth required)
app.get('/api/public/projects', async (req, res) => {
  try {
    const projectsResult = await pool.query(`
      SELECT cp.id, cp.name, cp.current_version, cp.launched_date, cp.project_url,
             cp.description, cp.status, cp.next_steps, cp.last_updated_at,
             cp.priority, cp.start_date, cp.end_date, cp.date_label,
             cp.start_milestone, cp.end_milestone,
             t.name as fider_tag_name, t.color as fider_tag_color,
             COUNT(cu.id) as update_count
      FROM changelog_projects cp
      LEFT JOIN tags t ON cp.fider_tag_id = t.id
      LEFT JOIN changelog_updates cu ON cp.id = cu.project_id
      GROUP BY cp.id, t.name, t.color
      ORDER BY cp.last_updated_at DESC
    `);

    // Get images for all projects
    const imagesResult = await pool.query(`
      SELECT project_id, src, alt, sort_order
      FROM project_images
      ORDER BY project_id, sort_order ASC
    `);

    // Group images by project_id
    const imagesByProject = {};
    imagesResult.rows.forEach(image => {
      if (!imagesByProject[image.project_id]) {
        imagesByProject[image.project_id] = [];
      }
      imagesByProject[image.project_id].push(image);
    });

    // Get task groups with nested tasks for all projects
    const taskGroupsResult = await pool.query(`
      SELECT tg.id, tg.project_id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      GROUP BY tg.id
      ORDER BY tg.project_id, tg.sort_order
    `);

    // Group task groups by project_id
    const taskGroupsByProject = {};
    taskGroupsResult.rows.forEach(group => {
      if (!taskGroupsByProject[group.project_id]) {
        taskGroupsByProject[group.project_id] = [];
      }
      taskGroupsByProject[group.project_id].push({
        name: group.name,
        milestone: group.milestone,
        startDate: group.start_date,
        endDate: group.end_date,
        estimatedHours: group.estimated_hours ? parseFloat(group.estimated_hours) : null,
        tasks: group.tasks || [],
      });
    });

    // Get milestones for all projects
    const milestonesResult = await pool.query(`
      SELECT id, project_id, name, target_date, icon, sort_order
      FROM project_milestones
      ORDER BY project_id, sort_order
    `);

    const milestonesByProject = {};
    milestonesResult.rows.forEach(m => {
      if (!milestonesByProject[m.project_id]) {
        milestonesByProject[m.project_id] = [];
      }
      milestonesByProject[m.project_id].push({
        id: m.id,
        name: m.name,
        targetDate: m.target_date,
        icon: m.icon,
      });
    });

    // Combine all data for each project
    const projectsWithData = projectsResult.rows.map(project => ({
      ...project,
      images: imagesByProject[project.id] || [],
      taskGroups: taskGroupsByProject[project.id] || [],
      milestones: milestonesByProject[project.id] || [],
      startDate: project.start_date,
      endDate: project.end_date,
      dateLabel: project.date_label || (project.status === 'Live' ? 'Launched' : 'Target Launch'),
      startMilestone: project.start_milestone,
      endMilestone: project.end_milestone,
    }));

    res.json(projectsWithData);
  } catch (error) {
    console.error('Error fetching public projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Public project updates (no auth required)
app.get('/api/public/projects/:id/updates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, status, notes, created_at
      FROM changelog_updates
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching public updates:', error);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});


// ============================================================
// External API v1 Endpoints (Token-based authentication)
// ============================================================

// GET /api/v1/projects - List all projects with api_keys, task groups, milestones
app.get('/api/v1/projects', apiAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cp.id, cp.api_key, cp.name, cp.current_version, cp.description,
             cp.status, cp.priority, cp.launched_date, cp.project_url, cp.next_steps,
             cp.start_date, cp.end_date, cp.date_label, cp.start_milestone, cp.end_milestone,
             cp.created_at, cp.updated_at, cp.last_updated_at,
             t.name as fider_tag_name, t.color as fider_tag_color,
             COUNT(cu.id) as update_count
      FROM changelog_projects cp
      LEFT JOIN tags t ON cp.fider_tag_id = t.id
      LEFT JOIN changelog_updates cu ON cp.id = cu.project_id
      GROUP BY cp.id, t.name, t.color
      ORDER BY cp.updated_at DESC
    `);

    // Get task groups for all projects
    const taskGroupsResult = await pool.query(`
      SELECT tg.id, tg.project_id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      GROUP BY tg.id
      ORDER BY tg.project_id, tg.sort_order
    `);
    const taskGroupsByProject = {};
    taskGroupsResult.rows.forEach(g => {
      if (!taskGroupsByProject[g.project_id]) taskGroupsByProject[g.project_id] = [];
      taskGroupsByProject[g.project_id].push({
        id: g.id, name: g.name, milestone: g.milestone,
        startDate: g.start_date, endDate: g.end_date,
        estimatedHours: g.estimated_hours ? parseFloat(g.estimated_hours) : null,
        tasks: g.tasks || [],
      });
    });

    // Get milestones for all projects
    const milestonesResult = await pool.query(`
      SELECT id, project_id, name, target_date, icon, sort_order
      FROM project_milestones ORDER BY project_id, sort_order
    `);
    const milestonesByProject = {};
    milestonesResult.rows.forEach(m => {
      if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
      milestonesByProject[m.project_id].push({
        id: m.id, name: m.name, targetDate: m.target_date, icon: m.icon,
      });
    });

    const projects = result.rows.map(p => ({
      ...p,
      startDate: p.start_date,
      endDate: p.end_date,
      dateLabel: p.date_label,
      startMilestone: p.start_milestone,
      endMilestone: p.end_milestone,
      taskGroups: taskGroupsByProject[p.id] || [],
      milestones: milestonesByProject[p.id] || [],
    }));

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error('API v1 - Error listing projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// GET /api/v1/projects/:identifier - Get project by api_key or name
app.get('/api/v1/projects/:identifier', apiAuth, async (req, res) => {
  try {
    const project = await findProjectByIdentifier(req.params.identifier);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        hint: 'Use api_key (UUID) or exact project name'
      });
    }

    // Get updates for the project
    const updatesResult = await pool.query(`
      SELECT id, status, notes, raw_notes, created_at, update_date
      FROM changelog_updates
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [project.id]);

    // Get images for the project
    const imagesResult = await pool.query(`
      SELECT id, src, alt, sort_order, created_at
      FROM project_images
      WHERE project_id = $1
      ORDER BY sort_order ASC
    `, [project.id]);

    // Get task groups with tasks
    const taskGroupsResult = await pool.query(`
      SELECT tg.id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      WHERE tg.project_id = $1
      GROUP BY tg.id
      ORDER BY tg.sort_order
    `, [project.id]);

    const taskGroups = taskGroupsResult.rows.map(g => ({
      id: g.id, name: g.name, milestone: g.milestone,
      startDate: g.start_date, endDate: g.end_date,
      estimatedHours: g.estimated_hours ? parseFloat(g.estimated_hours) : null,
      tasks: g.tasks || [],
    }));

    // Get milestones
    const milestonesResult = await pool.query(`
      SELECT id, name, target_date, icon, sort_order
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY sort_order
    `, [project.id]);

    const milestones = milestonesResult.rows.map(m => ({
      id: m.id, name: m.name, targetDate: m.target_date, icon: m.icon,
    }));

    // Get tag info
    let tagInfo = null;
    if (project.fider_tag_id) {
      const tagResult = await pool.query(
        'SELECT name, color FROM tags WHERE id = $1',
        [project.fider_tag_id]
      );
      if (tagResult.rows.length > 0) {
        tagInfo = tagResult.rows[0];
      }
    }

    res.json({
      success: true,
      project: {
        ...project,
        startDate: project.start_date,
        endDate: project.end_date,
        dateLabel: project.date_label,
        startMilestone: project.start_milestone,
        endMilestone: project.end_milestone,
        fider_tag_name: tagInfo?.name || null,
        fider_tag_color: tagInfo?.color || null,
        taskGroups,
        milestones,
        updates: updatesResult.rows,
        images: imagesResult.rows
      }
    });
  } catch (error) {
    console.error('API v1 - Error fetching project:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// POST /api/v1/projects - Create new project with optional images
app.post('/api/v1/projects', apiAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { name, description, status, current_version, next_steps, launched_date, project_url, fider_tag_id,
            priority, start_date, end_date, date_label, start_milestone, end_milestone } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'description'],
        optional: ['status', 'current_version', 'next_steps', 'launched_date', 'project_url', 'fider_tag_id',
                    'priority', 'start_date', 'end_date', 'date_label', 'start_milestone', 'end_milestone', 'images']
      });
    }

    // Validate status
    const validStatuses = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'];
    const projectStatus = status && validStatuses.includes(status) ? status : 'Requested';

    // Generate unique api_key
    const apiKeyResult = await pool.query('SELECT gen_random_uuid()::text as api_key');
    const apiKey = apiKeyResult.rows[0].api_key;

    // Create project
    const projectResult = await pool.query(`
      INSERT INTO changelog_projects (name, description, status, current_version, next_steps, launched_date, project_url, fider_tag_id, api_key,
                                       priority, start_date, end_date, date_label, start_milestone, end_milestone, last_updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `, [name, description, projectStatus, current_version || '', next_steps || '', launched_date || '', project_url || '', fider_tag_id || null, apiKey,
        priority || 'none', start_date || null, end_date || null, date_label || 'Target Launch', start_milestone || 'Requested', end_milestone || 'Live']);

    const project = projectResult.rows[0];

    // Handle uploaded images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/${file.filename}`;
        const altText = file.originalname;

        const imageResult = await pool.query(`
          INSERT INTO project_images (project_id, src, alt, sort_order)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [project.id, imageUrl, altText, i]);

        uploadedImages.push(imageResult.rows[0]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        ...project,
        images: uploadedImages
      }
    });
  } catch (error) {
    console.error('API v1 - Error creating project:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// POST /api/v1/projects/:identifier/updates - Add update to project
app.post('/api/v1/projects/:identifier/updates', apiAuth, async (req, res) => {
  try {
    const project = await findProjectByIdentifier(req.params.identifier);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        hint: 'Use api_key (UUID) or exact project name'
      });
    }

    const { status, notes, update_date } = req.body;

    // Validate required fields
    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: notes',
        required: ['notes'],
        optional: ['status', 'update_date']
      });
    }

    // Default status
    const updateStatus = status || 'In Progress';

    // Clean notes with AI if ANTHROPIC_API_KEY is set, otherwise use raw notes
    let cleanedNotes;
    if (process.env.ANTHROPIC_API_KEY) {
      cleanedNotes = await cleanNotesWithAI(notes);
    } else {
      // Split by newlines and clean up
      cleanedNotes = notes.split('\n').filter(line => line.trim()).map(line => line.trim());
    }

    // Use provided update_date or default to now
    const updateDate = update_date || new Date().toISOString();

    const result = await pool.query(`
      INSERT INTO changelog_updates (project_id, status, notes, raw_notes, update_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [project.id, updateStatus, JSON.stringify(cleanedNotes), notes, updateDate]);

    // Update project's updated_at and last_updated_at timestamps
    await pool.query(`
      UPDATE changelog_projects
      SET updated_at = NOW(), last_updated_at = NOW()
      WHERE id = $1
    `, [project.id]);

    res.status(201).json({
      success: true,
      message: 'Update added successfully',
      project_id: project.id,
      project_name: project.name,
      project_api_key: project.api_key,
      update: result.rows[0]
    });
  } catch (error) {
    console.error('API v1 - Error adding update:', error);
    res.status(500).json({ success: false, error: 'Failed to add update' });
  }
});

// POST /api/v1/projects/:identifier/images - Upload images to existing project
app.post('/api/v1/projects/:identifier/images', apiAuth, upload.array('images', 10), async (req, res) => {
  try {
    const project = await findProjectByIdentifier(req.params.identifier);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        hint: 'Use api_key (UUID) or exact project name'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided',
        hint: 'Send images as multipart/form-data with field name "images"'
      });
    }

    // Get current max sort_order
    const maxOrderResult = await pool.query(`
      SELECT COALESCE(MAX(sort_order), 0) as max_order
      FROM project_images
      WHERE project_id = $1
    `, [project.id]);
    let sortOrder = maxOrderResult.rows[0].max_order;

    const uploadedImages = [];
    for (const file of req.files) {
      sortOrder++;
      const imageUrl = `/uploads/${file.filename}`;
      const altText = file.originalname;

      const imageResult = await pool.query(`
        INSERT INTO project_images (project_id, src, alt, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [project.id, imageUrl, altText, sortOrder]);

      uploadedImages.push(imageResult.rows[0]);
    }

    res.status(201).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      project_id: project.id,
      project_name: project.name,
      images: uploadedImages
    });
  } catch (error) {
    console.error('API v1 - Error uploading images:', error);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

// GET /api/v1/projects/:identifier/task-groups - Get task groups for a project
app.get('/api/v1/projects/:identifier/task-groups', apiAuth, async (req, res) => {
  try {
    const project = await findProjectByIdentifier(req.params.identifier);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found', hint: 'Use api_key (UUID) or exact project name' });
    }

    const result = await pool.query(`
      SELECT tg.id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      WHERE tg.project_id = $1
      GROUP BY tg.id
      ORDER BY tg.sort_order
    `, [project.id]);

    res.json({
      success: true,
      project_id: project.id,
      project_name: project.name,
      taskGroups: result.rows.map(g => ({
        id: g.id, name: g.name, milestone: g.milestone,
        startDate: g.start_date, endDate: g.end_date,
        estimatedHours: g.estimated_hours ? parseFloat(g.estimated_hours) : null,
        tasks: g.tasks || [],
      }))
    });
  } catch (error) {
    console.error('API v1 - Error fetching task groups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task groups' });
  }
});

// PUT /api/v1/projects/:identifier/task-groups - Bulk upsert task groups
app.put('/api/v1/projects/:identifier/task-groups', apiAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const project = await findProjectByIdentifier(req.params.identifier);
    if (!project) {
      client.release();
      return res.status(404).json({ success: false, error: 'Project not found', hint: 'Use api_key (UUID) or exact project name' });
    }

    const { taskGroups } = req.body;
    if (!Array.isArray(taskGroups)) {
      client.release();
      return res.status(400).json({ success: false, error: 'taskGroups must be an array' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM project_task_groups WHERE project_id = $1', [project.id]);

    for (let i = 0; i < taskGroups.length; i++) {
      const group = taskGroups[i];
      const groupResult = await client.query(
        `INSERT INTO project_task_groups (project_id, name, milestone, sort_order, start_date, end_date, estimated_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [project.id, group.name, group.milestone || 'Planning', i, group.startDate || null, group.endDate || null, group.estimatedHours || null]
      );
      const groupId = groupResult.rows[0].id;

      if (group.tasks && group.tasks.length > 0) {
        for (let j = 0; j < group.tasks.length; j++) {
          const task = group.tasks[j];
          await client.query(
            `INSERT INTO project_tasks (task_group_id, name, done, sort_order, completed_at, estimated_hours)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [groupId, task.name, task.done || false, j, task.done ? new Date() : null, task.estimatedHours || null]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Re-fetch saved structure
    const result = await client.query(`
      SELECT tg.id, tg.name, tg.milestone, tg.sort_order,
             tg.start_date, tg.end_date, tg.estimated_hours,
             json_agg(
               json_build_object('id', t.id, 'name', t.name, 'done', t.done, 'sort_order', t.sort_order, 'estimatedHours', t.estimated_hours)
               ORDER BY t.sort_order
             ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM project_task_groups tg
      LEFT JOIN project_tasks t ON tg.id = t.task_group_id
      WHERE tg.project_id = $1
      GROUP BY tg.id
      ORDER BY tg.sort_order
    `, [project.id]);

    res.json({
      success: true,
      message: 'Task groups saved successfully',
      project_id: project.id,
      taskGroups: result.rows.map(g => ({
        id: g.id, name: g.name, milestone: g.milestone,
        startDate: g.start_date, endDate: g.end_date,
        estimatedHours: g.estimated_hours ? parseFloat(g.estimated_hours) : null,
        tasks: g.tasks || [],
      }))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('API v1 - Error saving task groups:', error);
    res.status(500).json({ success: false, error: 'Failed to save task groups' });
  } finally {
    client.release();
  }
});

// GET /api/v1/projects/:identifier/milestones - Get milestones for a project
app.get('/api/v1/projects/:identifier/milestones', apiAuth, async (req, res) => {
  try {
    const project = await findProjectByIdentifier(req.params.identifier);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found', hint: 'Use api_key (UUID) or exact project name' });
    }

    const result = await pool.query(`
      SELECT id, name, target_date, icon, sort_order
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY sort_order
    `, [project.id]);

    res.json({
      success: true,
      project_id: project.id,
      project_name: project.name,
      milestones: result.rows.map(m => ({
        id: m.id, name: m.name, targetDate: m.target_date, icon: m.icon,
      }))
    });
  } catch (error) {
    console.error('API v1 - Error fetching milestones:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
  }
});

// PUT /api/v1/projects/:identifier/milestones - Bulk upsert milestones
app.put('/api/v1/projects/:identifier/milestones', apiAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const project = await findProjectByIdentifier(req.params.identifier);
    if (!project) {
      client.release();
      return res.status(404).json({ success: false, error: 'Project not found', hint: 'Use api_key (UUID) or exact project name' });
    }

    const { milestones } = req.body;
    if (!Array.isArray(milestones)) {
      client.release();
      return res.status(400).json({ success: false, error: 'milestones must be an array' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM project_milestones WHERE project_id = $1', [project.id]);

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      await client.query(
        `INSERT INTO project_milestones (project_id, name, target_date, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [project.id, m.name, m.targetDate, m.icon || '◆', i]
      );
    }

    await client.query('COMMIT');

    const result = await client.query(`
      SELECT id, name, target_date, icon, sort_order
      FROM project_milestones WHERE project_id = $1 ORDER BY sort_order
    `, [project.id]);

    res.json({
      success: true,
      message: 'Milestones saved successfully',
      project_id: project.id,
      milestones: result.rows.map(m => ({
        id: m.id, name: m.name, targetDate: m.target_date, icon: m.icon,
      }))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('API v1 - Error saving milestones:', error);
    res.status(500).json({ success: false, error: 'Failed to save milestones' });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Roadmap API server running on port ${port}`);
});
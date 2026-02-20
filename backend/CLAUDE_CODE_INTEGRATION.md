# Roadmap Update Instructions for Claude Code

Add the following section to your project's CLAUDE.md file to enable automatic roadmap updates.

---

## Copy This Section to Your Project's CLAUDE.md

```markdown
## Posting Roadmap Updates

After completing significant work, post an update to the project roadmap so stakeholders can track progress.

### When to Post Updates
- New features or functionality added
- Significant bug fixes
- Major refactors or improvements
- Integration of new services
- Performance optimizations

Do NOT post for: minor typos, small cleanups, config changes, or debugging that didn't result in changes.

### How to Post

Replace `PROJECT_NAME` with your project's exact name (URL-encoded if it has spaces):

\`\`\`bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/PROJECT_NAME/updates" \
  -H "Authorization: Bearer API_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Your update here",
    "status": "Completed"
  }'
\`\`\`

### Writing Updates for Stakeholders

Write in **simple, non-technical English**. Focus on WHAT changed and WHY it matters to users.

**Template:** `[Action verb] [what was done] [benefit to user/business]`

**Good examples:**
- "Added ability to filter search results by date range, making it easier to find recent items."
- "Fixed an issue where the page would sometimes load slowly. Load times improved by 50%."
- "Added dark mode support. Users can now switch between light and dark themes in settings."

**Bad examples (too technical):**
- "Refactored useEffect hook to implement memoization with useMemo"
- "Fixed N+1 query issue in ProjectsController#index"

**Action verbs:** Added, Fixed, Improved, Updated, Removed, Integrated

**Status values:** `Completed`, `In Progress`, `Testing`, `On Hold`
```

---

## Full API Reference

### Base URL
```
https://feedback.edwinlovett.com/roadmap/api/v1
```

### Authentication
All requests require a Bearer token:
```
Authorization: Bearer YOUR_API_TOKEN
```

### Endpoints

#### List All Projects
```bash
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Project Details
```bash
# By name (URL-encode spaces as %20)
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/My%20Project" \
  -H "Authorization: Bearer TOKEN"

# By api_key (UUID)
curl "https://feedback.edwinlovett.com/roadmap/api/v1/projects/abc123-def456-..." \
  -H "Authorization: Bearer TOKEN"
```

#### Post Update
```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/PROJECT_NAME/updates" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Description of what was done",
    "status": "Completed"
  }'
```

#### Create New Project
```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Name",
    "description": "What this project does and who it helps",
    "status": "In Development"
  }'
```

### Status Values for Projects
| Status | Description |
|--------|-------------|
| `Requested` | Feature requested but not started |
| `In Planning` | Being planned and scoped |
| `In Development` | Active development |
| `In Beta Testing` | Released for testing |
| `Live` | Fully released |

---

## Getting an API Token

1. Go to the Admin panel: https://feedback.edwinlovett.com/roadmap/admin
2. Click "API Keys" button
3. Create a new key with a descriptive name (e.g., "GTM Crawler CI/CD")
4. Copy the token immediately - it won't be shown again!

---

## Example Workflow

After deploying a new feature to the "GTM Crawler" project:

```bash
curl -X POST "https://feedback.edwinlovett.com/roadmap/api/v1/projects/GTM%20Crawler/updates" \
  -H "Authorization: Bearer a4b494fc..." \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Added automatic retry logic for failed crawls. The system now retries up to 3 times before marking a crawl as failed, reducing the need for manual intervention.",
    "status": "Completed"
  }'
```

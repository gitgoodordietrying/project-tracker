# Project Tracker

Localhost project dashboard. Human-agent shared ledger.

- **Data:** `data/projects.json` (source of truth — read/write directly)
- **Config:** `data/config.json` (valid types, groups, phases, statuses — read before creating/updating projects)
- **Web UI:** `http://localhost:7777` (start with `npm start`)
- **API:** REST at `http://localhost:7777/api/projects`

## Agent Operations

```bash
# Read config to get valid field values
cat data/config.json | jq '.types | keys'

# List active projects
cat data/projects.json | jq '.projects[] | select(.status == "active") | {name, phase, status}'

# Via API (when server is running)
curl http://localhost:7777/api/projects
curl http://localhost:7777/api/config

# Create a project
curl -X POST http://localhost:7777/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "type": "code", "phase": "planning"}'

# Update a project
curl -X PUT http://localhost:7777/api/projects/prj_abc123 \
  -H "Content-Type: application/json" \
  -d '{"phase": "development", "status": "active"}'
```

## Key Rules

- Always read `data/config.json` for valid types, groups, phases, and statuses — do not hardcode values
- The server re-reads from disk on every request, so direct file edits are picked up immediately
- Project IDs use the format `prj_` + 6 random alphanumeric characters

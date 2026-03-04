# Project Tracker

Centralized project progress dashboard. Human-agent shared ledger.

- **Data:** `data/projects.json` (source of truth — always read/write this directly)
- **Web UI:** `http://localhost:7777` (start with `npm start` or `start.bat`)
- **API:** REST at `/api/projects` (CRUD)
- **Agent integration:** See README.md for API docs and CLAUDE.md integration guide

## Quick Reference

Types: `code`, `creative`, `life`, `business`
Phases: `discovery` → `planning` → `development` → `polish` → `maintenance`
Statuses: `active`, `paused`, `done`, `cancelled`, `archived`

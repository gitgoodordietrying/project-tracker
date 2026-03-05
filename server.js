const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = 7777;
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_CONFIG = {
  types: {
    code: { label: 'Code', color: '#58a6ff' },
    game: { label: 'Game Dev', color: '#f778ba' },
    creative: { label: 'Creative', color: '#bc8cff' },
    education: { label: 'Education', color: '#79c0ff' },
    business: { label: 'Business', color: '#e3b341' },
    house: { label: 'House', color: '#f0883e' },
    garden: { label: 'Garden & Farm', color: '#3fb950' },
    travel: { label: 'Travel', color: '#a5d6ff' },
    lifestyle: { label: 'Lifestyle', color: '#8b949e' }
  },
  groups: {
    digital: { label: 'Digital', color: '#58a6ff' },
    physical: { label: 'Physical', color: '#f0883e' },
    social: { label: 'Social', color: '#bc8cff' }
  },
  phases: ['discovery', 'planning', 'development', 'polish', 'maintenance'],
  phaseLabels: { discovery: 'Discovery', planning: 'Planning', development: 'Development', polish: 'Polish', maintenance: 'Maintenance' },
  statuses: ['active', 'paused', 'done', 'cancelled', 'archived'],
  scanPaths: []
};

// First-run: create data directory and bootstrap files
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  const example = path.join(__dirname, 'data', 'projects.example.json');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, DATA_FILE);
    console.log('Created projects.json from example data');
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ meta: { version: 1, lastModified: new Date().toISOString() }, projects: [] }, null, 2));
    console.log('Created empty projects.json');
  }
}

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  console.log('Created config.json with defaults');
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading projects.json:', e.message);
    return { meta: { version: 1, lastModified: new Date().toISOString() }, projects: [] };
  }
}

function writeData(data) {
  data.meta.lastModified = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading config.json:', e.message);
    return DEFAULT_CONFIG;
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function generateId() {
  return 'prj_' + Math.random().toString(36).substring(2, 8);
}

// --- Config API ---

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.put('/api/config', (req, res) => {
  const config = req.body;
  if (!config.types || !config.groups || !config.phases || !config.statuses) {
    return res.status(400).json({ error: 'Missing required config fields' });
  }
  writeConfig(config);
  res.json({ ok: true });
});

// --- Scan API ---

app.post('/api/scan', (req, res) => {
  const config = readConfig();
  const scanPaths = config.scanPaths || [];
  if (!scanPaths.length) {
    return res.json({ repos: [] });
  }

  const repos = [];
  const skipDirs = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', '__pycache__', '.next', '.nuxt']);

  function walk(dir, depth, parentFolder) {
    if (depth > 4) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // skip unreadable dirs
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || skipDirs.has(entry.name)) {
        // Check if .git exists at this level (means current dir is a repo)
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const gitDir = path.join(fullPath, '.git');
      if (fs.existsSync(gitDir)) {
        repos.push({
          name: entry.name,
          path: fullPath,
          parentFolder: path.basename(dir)
        });
      } else {
        walk(fullPath, depth + 1, path.basename(dir));
      }
    }
  }

  for (const scanPath of scanPaths) {
    const resolved = path.resolve(scanPath);
    if (fs.existsSync(resolved)) {
      walk(resolved, 0, path.basename(resolved));
    }
  }

  res.json({ repos });
});

// --- Projects API ---

app.get('/api/projects', (req, res) => {
  const data = readData();
  res.json(data.projects);
});

app.get('/api/projects/:id', (req, res) => {
  const data = readData();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const data = readData();
  const now = new Date().toISOString();
  const project = {
    id: generateId(),
    name: req.body.name || 'Untitled',
    type: req.body.type || 'code',
    group: req.body.group || 'digital',
    phase: req.body.phase || 'discovery',
    status: req.body.status || 'active',
    category: req.body.category || 'personal',
    path: req.body.path || '',
    description: req.body.description || '',
    notes: req.body.notes || '',
    startDate: req.body.startDate || now.split('T')[0],
    endDate: req.body.endDate || null,
    tags: req.body.tags || [],
    links: req.body.links || [],
    createdAt: now,
    updatedAt: now
  };
  data.projects.push(project);
  writeData(data);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = { ...data.projects[idx], ...req.body, id: data.projects[idx].id, updatedAt: new Date().toISOString() };
  data.projects[idx] = updated;
  writeData(data);
  res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.projects.splice(idx, 1);
  writeData(data);
  res.status(204).end();
});

app.post('/api/projects/:id/open-folder', (req, res) => {
  const data = readData();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!project.path) return res.status(400).json({ error: 'No path set' });
  const folderPath = path.resolve(project.path);
  let cmd, args;
  if (process.platform === 'win32') {
    cmd = 'explorer.exe';
    args = [folderPath];
  } else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [folderPath];
  } else {
    cmd = 'xdg-open';
    args = [folderPath];
  }
  execFile(cmd, args, (err) => {
    if (err && process.platform !== 'win32') return res.status(500).json({ error: 'Failed to open folder' });
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Project Tracker running at http://localhost:${PORT}`);
});

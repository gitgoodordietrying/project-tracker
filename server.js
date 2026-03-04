const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 7777;
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// First-run: copy example data if no projects.json exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_FILE)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const example = path.join(__dirname, 'data', 'projects.example.json');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, DATA_FILE);
    console.log('Created projects.json from example data');
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ meta: { version: 1, lastModified: new Date().toISOString() }, projects: [] }, null, 2));
    console.log('Created empty projects.json');
  }
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  data.meta.lastModified = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return 'prj_' + Math.random().toString(36).substring(2, 8);
}

// List all projects
app.get('/api/projects', (req, res) => {
  const data = readData();
  res.json(data.projects);
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
  const data = readData();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// Create project
app.post('/api/projects', (req, res) => {
  const data = readData();
  const now = new Date().toISOString();
  const project = {
    id: generateId(),
    name: req.body.name || 'Untitled',
    type: req.body.type || 'code',
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

// Update project
app.put('/api/projects/:id', (req, res) => {
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = { ...data.projects[idx], ...req.body, id: data.projects[idx].id, updatedAt: new Date().toISOString() };
  data.projects[idx] = updated;
  writeData(data);
  res.json(updated);
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.projects.splice(idx, 1);
  writeData(data);
  res.status(204).end();
});

// Open folder in Windows Explorer
app.post('/api/projects/:id/open-folder', (req, res) => {
  const data = readData();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!project.path) return res.status(400).json({ error: 'No path set' });
  const cmd = process.platform === 'win32' ? `explorer "${project.path.replace(/\//g, '\\')}"` :
    process.platform === 'darwin' ? `open "${project.path}"` : `xdg-open "${project.path}"`;
  exec(cmd, (err) => {
    if (err && process.platform !== 'win32') return res.status(500).json({ error: 'Failed to open folder' });
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Project Tracker running at http://localhost:${PORT}`);
});

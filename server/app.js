const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const documentsRoutes = require('./routes/documents');
const { getDatabaseStatus, getStorageMode } = require('./lib/database');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: getStorageMode(),
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', documentsRoutes);

const clientBuildPath = path.join(__dirname, 'client', 'build');

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  app.get(/^(?!\/api).*/, (req, res) => {
    if (req.method !== 'GET') {
      return res.sendStatus(405);
    }

    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

module.exports = app;

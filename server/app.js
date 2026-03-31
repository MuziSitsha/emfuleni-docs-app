require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const documentsRoutes = require('./routes/documents');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: 'file',
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

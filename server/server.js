const fs = require('fs');
const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const clientBuildPath = path.join(__dirname, 'client', 'build');

app.listen(PORT, () => {
  const staticMode = fs.existsSync(clientBuildPath) ? 'with client build' : 'API only';
  console.log(`Server running on port ${PORT} (${staticMode})`);
});

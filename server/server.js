const fs = require('fs');
const path = require('path');
const app = require('./app');
const {
  connectToDatabase,
  getStorageMode,
  isMongoConfigured,
  isMongoRequired,
} = require('./lib/database');

const PORT = process.env.PORT || 5000;
const clientBuildPath = path.join(__dirname, 'client', 'build');

async function startServer() {
  if (isMongoRequired() && !isMongoConfigured()) {
    throw new Error(
      'MongoDB is required for this deployment. Set MONGODB_URI before starting the server.'
    );
  }

  if (isMongoConfigured()) {
    await connectToDatabase();
  }

  app.listen(PORT, () => {
    const staticMode = fs.existsSync(clientBuildPath) ? 'with client build' : 'API only';
    console.log(
      `Server running on port ${PORT} (${staticMode}, storage: ${getStorageMode()})`
    );
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

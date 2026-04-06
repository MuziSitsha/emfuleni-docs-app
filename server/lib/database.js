const mongoose = require('mongoose');

const mongoUri = String(process.env.MONGODB_URI || '').trim();
const requireMongo = String(process.env.REQUIRE_MONGO || '').trim() === 'true';

let connectionPromise = null;

function isMongoConfigured() {
  return Boolean(mongoUri);
}

function getStorageMode() {
  return isMongoConfigured() ? 'mongo' : 'file';
}

function isMongoRequired() {
  return requireMongo;
}

function getDatabaseStatus() {
  if (!isMongoConfigured()) {
    return 'not-configured';
  }

  if (mongoose.connection.readyState === 1) {
    return 'connected';
  }

  if (mongoose.connection.readyState === 2) {
    return 'connecting';
  }

  return 'disconnected';
}

async function connectToDatabase() {
  if (!isMongoConfigured()) {
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
  return true;
}

module.exports = {
  connectToDatabase,
  getDatabaseStatus,
  getStorageMode,
  isMongoConfigured,
  isMongoRequired,
};

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const documentsRoutes = require('./routes/documents');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', documentsRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emfuleni';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });

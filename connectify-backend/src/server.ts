import mongoose from 'mongoose';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocketService } from './services/socket.service';

const PORT = env.PORT;
const MONGO_URI = env.MONGO_URI;

const server = http.createServer(app);

// Initialize Socket.io service
initSocketService(server);

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    // Start Server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

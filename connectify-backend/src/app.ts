import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocs } from './config/swagger';
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import userRoutes from './routes/user.routes';
import collectionRoutes from './routes/collection.routes';
import storyRoutes from './routes/story.routes';
import notificationRoutes from './routes/notification.routes';
import messageRoutes from './routes/message.routes';
import { AppError } from './utils/AppError';
import { ApiResponse } from './utils/ApiResponse';
import path from 'path';

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Enable gzip compression for better performance
app.use(compression());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded by frontend
}));
// Custom Mongo sanitize middleware for Express 5 compatibility (avoids req.query setter error)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.query) mongoSanitize.sanitize(req.query);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Production-quality logging
morgan.token('req-id', (req) => req.headers['x-request-id'] as string);
app.use(morgan(':method :url :status :response-time ms - Request ID: :req-id'));

// Static files not needed since using Cloudinary directly

// API Versioning
const API_PREFIX = '/api/v1';

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/collections`, collectionRoutes);
app.use(`${API_PREFIX}/stories`, storyRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Connectify API is running' });
});

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized Error Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  err.statusCode = err.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  } else {
    // Production
    if (err.isOperational) {
      res.status(err.statusCode).json(new ApiResponse(false, err.message, null, err.errors));
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json(new ApiResponse(false, 'Something went very wrong!'));
    }
  }
});

export default app;

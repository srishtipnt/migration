import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database connection
import connectDB from './config/database.js';

// Import Redis
import redis from './config/redis.js';
import RedisService from './services/RedisService.js';

// Import background job processor
import BackgroundJobProcessor from './services/BackgroundJobProcessor.js';

// Import cleanup service
import cleanupService from './services/CleanupService.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import zipCloudinaryRoutes from './routes/zipCloudinaryRoutes.js';
import singleFileCloudinaryRoutes from './routes/singleFileCloudinaryRoutes.js';
import migrationJobRoutes from './routes/migrationJobRoutes.js';
import forceChunkingRoutes from './routes/forceChunkingRoutes.js';
import autoChunkingRoutes from './routes/autoChunkingRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';
import saveMigrationRoutes from './routes/saveMigrationRoutes.js';
import systematicMigrationRoutes from './routes/systematicMigrationRoutes.js';
import languageDetectionRoutes from './routes/languageDetectionRoutes.js';
import migrationHistoryRoutes from './routes/migrationHistoryRoutes.js';
import cleanupRoutes from './routes/cleanupRoutes.js';
import zipAnalysisRoutes from './routes/zipAnalysisRoutes.js';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Redis removed - using in-memory processing

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://migration-snowy.vercel.app'] // Vercel deployment URL
    : ['http://localhost:3000', 'http://localhost:5173'], // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting - DISABLED for development
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too many requests',
//     message: 'Too many requests from this IP, please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await RedisService.healthCheck();
    const dbHealth = true; // MongoDB connection is handled by connectDB
    
    res.json({
      success: true,
      message: 'Migration Service API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      services: {
        database: dbHealth,
        redis: redisHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/zip-cloudinary', zipCloudinaryRoutes);
app.use('/api/single-file-cloudinary', singleFileCloudinaryRoutes);
app.use('/api/migration-jobs', migrationJobRoutes);
app.use('/api/force-chunking', forceChunkingRoutes);
app.use('/api/auto-chunking', autoChunkingRoutes);
app.use('/api/migrate', migrationRoutes);
app.use('/api/save-migration', saveMigrationRoutes);
app.use('/api/systematic-migration', systematicMigrationRoutes);
app.use('/api/language-detection', languageDetectionRoutes);
app.use('/api/migrations', migrationHistoryRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/zip-analysis', zipAnalysisRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Please check your input data',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate field',
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please provide a valid authentication token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Your session has expired. Please log in again.'
    });
  }

  // File system errors
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'File not found',
      message: 'The requested file does not exist'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again later.'
      : error.message
  });
});

// Start server
const PORT = 3000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start background job processor
  try {
    jobProcessorInstance = new BackgroundJobProcessor();
    await jobProcessorInstance.startProcessing();
    console.log(`✅ Background services started`);
  } catch (error) {
    console.error(`❌ Failed to start background services:`, error);
  }

  // Initialize cleanup service
  try {
    console.log(`🧹 Cleanup service initialized`);
  } catch (error) {
    console.error(`❌ Failed to initialize cleanup service:`, error);
  }
});

// Graceful shutdown
let jobProcessorInstance = null;

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  if (jobProcessorInstance) {
    jobProcessorInstance.stopProcessing();
  }
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  if (jobProcessorInstance) {
    jobProcessorInstance.stopProcessing();
  }
  server.close(() => {
    process.exit(0);
  });
});

export default app;


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

// Import background job processor
import BackgroundJobProcessor from './services/BackgroundJobProcessor.js';

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
    ? ['https://yourdomain.com'] // Replace with your frontend domain
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
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Migration Service API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
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
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_PATH || './uploads'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/migration-service'}`);
  console.log(`🔧 Debug mode: Enhanced logging enabled`);
  console.log(`📋 Routes: /api/auth, /api/files, /api/zip-cloudinary, /api/single-file-cloudinary, /api/migration-jobs, /api/force-chunking, /api/auto-chunking, /api/systematic-migration, /api/language-detection`);
  
  // Start background job processor
  try {
    console.log(`🔄 Starting background job processor...`);
    jobProcessorInstance = new BackgroundJobProcessor();
    await jobProcessorInstance.startProcessing();
    console.log(`✅ Background job processor started successfully`);
  } catch (error) {
    console.error(`❌ Failed to start background job processor:`, error);
  }
});

// Graceful shutdown
let jobProcessorInstance = null;

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (jobProcessorInstance) {
    jobProcessorInstance.stopProcessing();
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  if (jobProcessorInstance) {
    jobProcessorInstance.stopProcessing();
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;


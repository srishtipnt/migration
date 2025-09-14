import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis, isRedisCompatible } from '../config/redis.js';
import MigrationJob from '../models/MigrationJob.js';
import FileStorage from '../models/FileStorage.js';
import fs from 'fs-extra';
import path from 'path';

// Create migration queue with error handling for old Redis versions
let migrationQueue;
let queueEvents;
let migrationWorker;

if (redis && isRedisCompatible()) {
  try {
    migrationQueue = new Queue('migration', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Queue events for monitoring
    queueEvents = new QueueEvents('migration', {
      connection: redis,
    });
    
    console.log('✅ BullMQ queue initialized successfully');
  } catch (error) {
    console.warn('⚠️  BullMQ initialization failed:', error.message);
    console.warn('⚠️  Job queue functionality will be disabled');
    
    // Create comprehensive mock objects to prevent crashes
    migrationQueue = {
      add: () => Promise.reject(new Error('Job queue disabled - initialization failed')),
      getJobs: () => Promise.resolve([]),
      getJob: () => Promise.resolve(null),
      clean: () => Promise.resolve([]),
      close: () => Promise.resolve(),
      getWaiting: () => Promise.resolve([]),
      getActive: () => Promise.resolve([]),
      getCompleted: () => Promise.resolve([]),
      getFailed: () => Promise.resolve([]),
      pause: () => Promise.resolve(),
      resume: () => Promise.resolve(),
      isPaused: () => Promise.resolve(false),
      getJobCounts: () => Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 }),
      getRepeatableJobs: () => Promise.resolve([]),
      removeRepeatableByKey: () => Promise.resolve(),
      obliterate: () => Promise.resolve(),
    };
    
    queueEvents = {
      close: () => Promise.resolve(),
      on: () => {}, // Mock event handler
    };
  }
} else {
  console.warn('⚠️  Redis not available or incompatible - job queue functionality disabled');
  
  // Create comprehensive mock objects to prevent crashes
  migrationQueue = {
    add: () => Promise.reject(new Error('Job queue disabled - Redis not available')),
    getJobs: () => Promise.resolve([]),
    getJob: () => Promise.resolve(null),
    clean: () => Promise.resolve([]),
    close: () => Promise.resolve(),
    getWaiting: () => Promise.resolve([]),
    getActive: () => Promise.resolve([]),
    getCompleted: () => Promise.resolve([]),
    getFailed: () => Promise.resolve([]),
    pause: () => Promise.resolve(),
    resume: () => Promise.resolve(),
    isPaused: () => Promise.resolve(false),
    getJobCounts: () => Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    getRepeatableJobs: () => Promise.resolve([]),
    removeRepeatableByKey: () => Promise.resolve(),
    obliterate: () => Promise.resolve(),
  };
  
  queueEvents = {
    close: () => Promise.resolve(),
    on: () => {}, // Mock event handler
  };
}

// File processing function (placeholder - implement actual migration logic)
const processFile = async (file, migrationOptions, customSettings) => {
  // This is a placeholder for actual file migration logic
  // You would implement the actual migration here based on your requirements
  
  const inputPath = file.filePath;
  const outputDir = path.dirname(inputPath).replace('input', 'output');
  
  // Ensure output directory exists
  await fs.ensureDir(outputDir);
  
  // Read input file
  const fileContent = await fs.readFile(inputPath, 'utf8');
  
  // Apply migration transformations based on options
  let migratedContent = fileContent;
  
  // Example transformations (customize based on your needs)
  if (migrationOptions.includes('es6-to-es2022')) {
    // Convert ES6 to ES2022
    migratedContent = migrateES6ToES2022(fileContent);
  }
  
  if (migrationOptions.includes('commonjs-to-esm')) {
    // Convert CommonJS to ESM
    migratedContent = migrateCommonJSToESM(migratedContent);
  }
  
  if (migrationOptions.includes('typescript-conversion')) {
    // Convert JavaScript to TypeScript
    migratedContent = migrateToTypeScript(migratedContent);
  }
  
  // Write migrated file
  const outputPath = path.join(outputDir, `migrated_${file.fileName}`);
  await fs.writeFile(outputPath, migratedContent, 'utf8');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
};

// Migration worker with error handling
if (redis && isRedisCompatible()) {
  try {
    migrationWorker = new Worker('migration', async (job) => {
      const { jobId, sessionId, migrationOptions, fileFilters, customSettings } = job.data;
      
      try {
        console.log(`🚀 Starting migration job ${jobId}`);
        
        // Update job status to running
        const migrationJob = await MigrationJob.findById(jobId);
        if (!migrationJob) {
          throw new Error(`Migration job ${jobId} not found`);
        }
        
        await migrationJob.start();
        
        // Get input files for this session
        const inputFiles = await FileStorage.find({ 
          sessionId: migrationJob.sessionId,
          type: 'input'
        });
        
        migrationJob.totalFiles = inputFiles.length;
        await migrationJob.save();
        
        if (inputFiles.length === 0) {
          await migrationJob.complete();
          return { success: true, message: 'No files to process' };
        }
        
        // Process each file
        for (let i = 0; i < inputFiles.length; i++) {
          const file = inputFiles[i];
          
          // Update progress
          const progress = Math.round(((i + 1) / inputFiles.length) * 100);
          await migrationJob.updateProgress(progress, file.originalName);
          
          // Update job progress
          await job.updateProgress(progress);
          
          try {
            // Simulate file processing (replace with actual migration logic)
            await processFile(file, migrationOptions, customSettings);
            
            // Create output file record
            const outputFile = new FileStorage({
              sessionId: migrationJob.sessionId,
              originalName: file.originalName,
              fileName: `migrated_${file.fileName}`,
              filePath: path.join(process.env.UPLOAD_PATH || './uploads', 'sessions', sessionId, 'output', `migrated_${file.fileName}`),
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              type: 'output',
              status: 'completed',
              metadata: {
                migrationOptions,
                customSettings,
                processedAt: new Date()
              }
            });
            
            await outputFile.save();
            
            // Update job counters
            migrationJob.processedFiles++;
            migrationJob.successfulFiles++;
            await migrationJob.save();
            
            console.log(`✅ Processed file: ${file.originalName}`);
            
          } catch (fileError) {
            console.error(`❌ Error processing file ${file.originalName}:`, fileError);
            
            // Add error to job
            await migrationJob.addError(
              file._id.toString(),
              'PROCESSING_ERROR',
              fileError.message
            );
            
            migrationJob.processedFiles++;
            migrationJob.failedFiles++;
            await migrationJob.save();
          }
        }
        
        // Complete the job
        await migrationJob.complete();
        console.log(`🎉 Migration job ${jobId} completed successfully`);
        
        return {
          success: true,
          message: 'Migration completed',
          processedFiles: migrationJob.processedFiles,
          successfulFiles: migrationJob.successfulFiles,
          failedFiles: migrationJob.failedFiles
        };
        
      } catch (error) {
        console.error(`❌ Migration job ${jobId} failed:`, error);
        
        // Update job status to failed
        const migrationJob = await MigrationJob.findById(jobId);
        if (migrationJob) {
          await migrationJob.fail(error.message);
        }
        
        throw error;
      }
    }, {
      connection: redis,
      concurrency: parseInt(process.env.MIGRATION_CONCURRENCY) || 1,
    });

  } catch (workerError) {
    console.warn('⚠️  Migration worker initialization failed:', workerError.message);
    console.warn('⚠️  Worker functionality will be disabled');
    
    // Create mock worker to prevent crashes
    migrationWorker = {
      on: () => {},
      close: () => Promise.resolve(),
    };
  }
} else {
  console.warn('⚠️  Redis not available or incompatible - worker functionality disabled');
  
  // Create mock worker to prevent crashes
  migrationWorker = {
    on: () => {},
    close: () => Promise.resolve(),
  };
}

// Placeholder migration functions (implement actual logic)
const migrateES6ToES2022 = (content) => {
  // Implement ES6 to ES2022 migration
  return content;
};

const migrateCommonJSToESM = (content) => {
  // Implement CommonJS to ESM migration
  return content;
};

const migrateToTypeScript = (content) => {
  // Implement JavaScript to TypeScript migration
  return content;
};

// Worker event handlers
migrationWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

migrationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

migrationWorker.on('progress', (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

// Queue event handlers
queueEvents.on('completed', ({ jobId }) => {
  console.log(`🎉 Queue: Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`💥 Queue: Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📈 Queue: Job ${jobId} progress:`, data);
});

// Utility functions
const addMigrationJob = async (sessionId, migrationOptions, fileFilters, customSettings) => {
  try {
    // Create migration job record
    const migrationJob = new MigrationJob({
      sessionId,
      migrationOptions,
      fileFilters,
      customSettings,
      status: 'pending',
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      errors: []
    });

    await migrationJob.save();

    // Add job to queue
    const job = await migrationQueue.add('migration', {
      jobId: migrationJob._id,
      sessionId,
      migrationOptions,
      fileFilters,
      customSettings
    });

    console.log(`📝 Migration job created: ${migrationJob._id}`);
    return migrationJob;

  } catch (error) {
    console.error('❌ Failed to create migration job:', error);
    throw error;
  }
};

const getJobStatus = async (jobId) => {
  try {
    const job = await migrationQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason
    };
  } catch (error) {
    console.error('❌ Failed to get job status:', error);
    throw error;
  }
};

const pauseQueue = async () => {
  await migrationQueue.pause();
};

const resumeQueue = async () => {
  await migrationQueue.resume();
};

const getQueueStats = async () => {
  try {
    const waiting = await migrationQueue.getWaiting();
    const active = await migrationQueue.getActive();
    const completed = await migrationQueue.getCompleted();
    const failed = await migrationQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    console.error('❌ Error fetching queue stats:', error);
    // Return default stats when queue is disabled
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0
    };
  }
};

// Graceful shutdown
const closeQueue = async () => {
  try {
    await migrationQueue.close();
    await migrationWorker.close();
    await queueEvents.close();
    console.log('🔌 Migration queue closed gracefully');
  } catch (error) {
    console.error('❌ Error closing migration queue:', error);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', closeQueue);
process.on('SIGINT', closeQueue);

export {
  addMigrationJob,
  getJobStatus,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  closeQueue,
  migrationQueue,
  migrationWorker,
  queueEvents
};

export default migrationQueue;

import { Queue, Worker } from 'bullmq';
import { redis, isRedisCompatible } from '../config/redis.js';
import TreeSitterWorker from '../workers/treeSitterWorker.js';

// Only create queue if Redis is available and compatible
let treeSitterQueue = null;
let treeSitterWorkerInstance = null;

if (redis && isRedisCompatible()) {
  try {
    // Create Tree-sitter analysis queue
    treeSitterQueue = new Queue('tree-sitter-analysis', {
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

    // Create Tree-sitter worker
    const treeSitterWorker = new TreeSitterWorker();

    // Create worker instance
    treeSitterWorkerInstance = new Worker(
      'tree-sitter-analysis',
      async (job) => {
        console.log(`Processing Tree-sitter analysis job ${job.id}`);
        return await treeSitterWorker.processAnalysisJob(job);
      },
      {
        connection: redis,
        concurrency: 2, // Process up to 2 jobs concurrently
      }
    );
  } catch (error) {
    console.warn('⚠️  Tree-sitter queue initialization failed:', error.message);
    treeSitterQueue = null;
    treeSitterWorkerInstance = null;
  }

  // Worker event handlers (only if worker was created successfully)
  if (treeSitterWorkerInstance) {
    treeSitterWorkerInstance.on('completed', (job, result) => {
      console.log(`Tree-sitter analysis job ${job.id} completed:`, result);
    });

    treeSitterWorkerInstance.on('failed', (job, err) => {
      console.error(`Tree-sitter analysis job ${job.id} failed:`, err);
    });

    treeSitterWorkerInstance.on('error', (err) => {
      console.error('Tree-sitter worker error:', err);
    });
  }

  // Queue event handlers (only if queue was created successfully)
  if (treeSitterQueue) {
    treeSitterQueue.on('waiting', (jobId) => {
      console.log(`Tree-sitter analysis job ${jobId} is waiting`);
    });

    treeSitterQueue.on('active', (job) => {
      console.log(`Tree-sitter analysis job ${job.id} is now active`);
    });

    treeSitterQueue.on('completed', (job, result) => {
      console.log(`Tree-sitter analysis job ${job.id} completed successfully`);
    });

    treeSitterQueue.on('failed', (job, err) => {
      console.error(`Tree-sitter analysis job ${job.id} failed:`, err);
    });

    console.log('Tree-sitter analysis queue and worker initialized');
  }
} else {
  console.warn('Redis not available or incompatible - Tree-sitter queue functionality disabled');
}

// Export queue and worker instance for use in other modules
export { treeSitterQueue, treeSitterWorkerInstance };
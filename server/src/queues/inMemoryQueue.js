// In-memory queue system to replace Redis-based BullMQ
import EventEmitter from 'events';

class InMemoryQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.jobs = new Map();
    this.waiting = [];
    this.active = [];
    this.completed = [];
    this.failed = [];
    this.jobIdCounter = 0;
    this.concurrency = options.concurrency || 1;
    this.isPaused = false;
    this.worker = null;
  }

  async add(jobName, data, options = {}) {
    const jobId = ++this.jobIdCounter;
    const job = {
      id: jobId,
      name: jobName,
      data,
      options: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 10,
        removeOnFail: 5,
        ...options
      },
      progress: 0,
      status: 'waiting',
      createdAt: new Date(),
      processedOn: null,
      finishedOn: null,
      failedReason: null,
      attempts: 0
    };

    this.jobs.set(jobId, job);
    this.waiting.push(job);
    
    this.emit('waiting', job);
    
    // Process job if worker is available and not paused
    if (this.worker && !this.isPaused) {
      this.processNext();
    }

    return job;
  }

  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  async getJobs() {
    return Array.from(this.jobs.values());
  }

  async getWaiting() {
    return this.waiting;
  }

  async getActive() {
    return this.active;
  }

  async getCompleted() {
    return this.completed;
  }

  async getFailed() {
    return this.failed;
  }

  async getJobCounts() {
    return {
      waiting: this.waiting.length,
      active: this.active.length,
      completed: this.completed.length,
      failed: this.failed.length,
      total: this.jobs.size
    };
  }

  async pause() {
    this.isPaused = true;
  }

  async resume() {
    this.isPaused = false;
    this.processNext();
  }

  async isPaused() {
    return this.isPaused;
  }

  async clean(grace, status, limit) {
    // Simple cleanup - remove old completed/failed jobs
    const now = Date.now();
    const jobsToRemove = [];

    for (const job of this.completed) {
      if (now - job.finishedOn.getTime() > grace) {
        jobsToRemove.push(job.id);
      }
    }

    for (const job of this.failed) {
      if (now - job.finishedOn.getTime() > grace) {
        jobsToRemove.push(job.id);
      }
    }

    jobsToRemove.forEach(jobId => {
      this.jobs.delete(jobId);
      this.completed = this.completed.filter(job => job.id !== jobId);
      this.failed = this.failed.filter(job => job.id !== jobId);
    });

    return jobsToRemove.length;
  }

  async close() {
    this.removeAllListeners();
    this.jobs.clear();
    this.waiting = [];
    this.active = [];
    this.completed = [];
    this.failed = [];
  }

  async obliterate() {
    await this.close();
  }

  processNext() {
    if (this.isPaused || this.active.length >= this.concurrency || this.waiting.length === 0) {
      return;
    }

    const job = this.waiting.shift();
    if (!job) return;

    job.status = 'active';
    job.processedOn = new Date();
    this.active.push(job);

    this.emit('active', job);

    // Process job asynchronously
    this.processJob(job);
  }

  async processJob(job) {
    try {
      if (this.worker) {
        await this.worker(job);
      }
      
      job.status = 'completed';
      job.finishedOn = new Date();
      this.active = this.active.filter(j => j.id !== job.id);
      this.completed.push(job);
      
      this.emit('completed', job);
    } catch (error) {
      job.attempts++;
      
      if (job.attempts < job.options.attempts) {
        // Retry job
        job.status = 'waiting';
        job.processedOn = null;
        this.active = this.active.filter(j => j.id !== job.id);
        this.waiting.unshift(job);
        
        // Wait before retry
        setTimeout(() => {
          this.processNext();
        }, job.options.backoff.delay * Math.pow(2, job.attempts - 1));
        
        this.emit('failed', job, error);
      } else {
        // Job failed permanently
        job.status = 'failed';
        job.finishedOn = new Date();
        job.failedReason = error.message;
        this.active = this.active.filter(j => j.id !== job.id);
        this.failed.push(job);
        
        this.emit('failed', job, error);
      }
    }

    // Process next job
    this.processNext();
  }

  setWorker(worker) {
    this.worker = worker;
  }

  async updateProgress(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      this.emit('progress', job, progress);
    }
  }
}

// Create singleton instances
const migrationQueue = new InMemoryQueue('migration', { concurrency: 1 });
const treeSitterQueue = new InMemoryQueue('treesitter', { concurrency: 1 });

export { migrationQueue, treeSitterQueue };
export default migrationQueue;

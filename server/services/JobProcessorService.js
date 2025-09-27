import BackgroundJobProcessor from './BackgroundJobProcessor.js';
import connectDB from '../config/database.js';

class JobProcessorService {
  constructor() {
    this.processor = new BackgroundJobProcessor();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('🔄 Job processor service already running');
      return;
    }

    try {
      console.log('🚀 Starting Job Processor Service...');
      
      // Connect to database
      await connectDB();
      console.log('✅ Database connected');
      
      // Start the background processor
      this.processor.startProcessing();
      this.isRunning = true;
      
      console.log('✅ Job Processor Service started successfully');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error('❌ Failed to start Job Processor Service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Job Processor Service...');
    
    try {
      this.processor.stopProcessing();
      this.isRunning = false;
      console.log('✅ Job Processor Service stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new JobProcessorService();
  service.start();
}

export default JobProcessorService;

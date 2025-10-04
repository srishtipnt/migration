import cron from 'node-cron';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import FileStorage from '../models/FileStorage.js';
import MigrationJob from '../models/MigrationJob.js';
import CodeChunk from '../models/CodeChunk.js';

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.setupCronJob();
  }

  /**
   * Setup cron job to run every 30 minutes
   */
  setupCronJob() {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      console.log('🧹 Starting scheduled cleanup of pending uploads...');
      this.cleanupPendingUploads();
    });

    console.log('✅ Cleanup cron job scheduled to run every 30 minutes');
  }

  /**
   * Clean up pending uploads from MongoDB and Cloudinary
   */
  async cleanupPendingUploads() {
    if (this.isRunning) {
      console.log('🧹 Cleanup already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🧹 Starting cleanup of pending uploads...');

      // Find pending migration jobs older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const pendingJobs = await MigrationJob.find({
        status: 'pending',
        createdAt: { $lt: oneHourAgo }
      });

      console.log(`🧹 Found ${pendingJobs.length} pending migration jobs to clean up`);

      let cleanedJobs = 0;
      let cleanedFiles = 0;
      let cleanedChunks = 0;
      let cloudinaryDeleted = 0;

      for (const job of pendingJobs) {
        try {
          console.log(`🧹 Cleaning up job: ${job.sessionId}`);

          // 1. Find all files associated with this session
          const files = await FileStorage.find({ sessionId: job.sessionId });
          console.log(`🧹 Found ${files.length} files for session ${job.sessionId}`);

          // 2. Delete files from Cloudinary
          for (const file of files) {
            if (file.storageType === 'cloudinary' && file.public_id) {
              try {
                await this.deleteFromCloudinary(file.public_id, file.resource_type);
                cloudinaryDeleted++;
                console.log(`☁️  Deleted from Cloudinary: ${file.public_id}`);
              } catch (error) {
                console.error(`❌ Failed to delete from Cloudinary: ${file.public_id}`, error.message);
              }
            }
          }

          // 3. Delete code chunks associated with this job
          const chunks = await CodeChunk.find({ jobId: job._id });
          if (chunks.length > 0) {
            await CodeChunk.deleteMany({ jobId: job._id });
            cleanedChunks += chunks.length;
            console.log(`🧹 Deleted ${chunks.length} code chunks for job ${job.sessionId}`);
          }

          // 4. Delete files from MongoDB
          if (files.length > 0) {
            await FileStorage.deleteMany({ sessionId: job.sessionId });
            cleanedFiles += files.length;
            console.log(`🧹 Deleted ${files.length} files from MongoDB for session ${job.sessionId}`);
          }

          // 5. Delete the migration job
          await MigrationJob.findByIdAndDelete(job._id);
          cleanedJobs++;
          console.log(`🧹 Deleted migration job: ${job.sessionId}`);

        } catch (error) {
          console.error(`❌ Error cleaning up job ${job.sessionId}:`, error.message);
        }
      }

      // Also clean up orphaned files (files without associated jobs)
      await this.cleanupOrphanedFiles();

      const duration = Date.now() - startTime;
      console.log(`🧹 Cleanup completed in ${duration}ms:`);
      console.log(`   - Jobs cleaned: ${cleanedJobs}`);
      console.log(`   - Files cleaned: ${cleanedFiles}`);
      console.log(`   - Chunks cleaned: ${cleanedChunks}`);
      console.log(`   - Cloudinary assets deleted: ${cloudinaryDeleted}`);

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up orphaned files (files without associated migration jobs)
   */
  async cleanupOrphanedFiles() {
    try {
      console.log('🧹 Checking for orphaned files...');

      // Find files older than 2 hours that don't have associated migration jobs
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      // Get all unique session IDs from files
      const fileSessions = await FileStorage.distinct('sessionId', {
        createdAt: { $lt: twoHoursAgo },
        sessionId: { $ne: null }
      });

      let orphanedFiles = 0;
      let orphanedCloudinary = 0;

      for (const sessionId of fileSessions) {
        // Check if there's a migration job for this session
        const job = await MigrationJob.findOne({ sessionId });
        
        if (!job) {
          // No job found, these are orphaned files
          const files = await FileStorage.find({ sessionId });
          
          // Delete from Cloudinary
          for (const file of files) {
            if (file.storageType === 'cloudinary' && file.public_id) {
              try {
                await this.deleteFromCloudinary(file.public_id, file.resource_type);
                orphanedCloudinary++;
              } catch (error) {
                console.error(`❌ Failed to delete orphaned file from Cloudinary: ${file.public_id}`, error.message);
              }
            }
          }

          // Delete from MongoDB
          await FileStorage.deleteMany({ sessionId });
          orphanedFiles += files.length;
          console.log(`🧹 Cleaned up ${files.length} orphaned files for session ${sessionId}`);
        }
      }

      if (orphanedFiles > 0) {
        console.log(`🧹 Cleaned up ${orphanedFiles} orphaned files and ${orphanedCloudinary} Cloudinary assets`);
      }

    } catch (error) {
      console.error('❌ Error cleaning up orphaned files:', error);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFromCloudinary(publicId, resourceType = 'raw') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true // Also invalidate CDN cache
      });
      
      if (result.result === 'ok' || result.result === 'not found') {
        return true;
      } else {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
      }
    } catch (error) {
      console.error(`❌ Cloudinary deletion error for ${publicId}:`, error.message);
      throw error;
    }
  }

  /**
   * Manual cleanup trigger (for testing or manual execution)
   */
  async triggerCleanup() {
    console.log('🧹 Manual cleanup triggered');
    await this.cleanupPendingUploads();
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const pendingJobs = await MigrationJob.countDocuments({
        status: 'pending',
        createdAt: { $lt: oneHourAgo }
      });

      const oldFiles = await FileStorage.countDocuments({
        createdAt: { $lt: twoHoursAgo }
      });

      const totalFiles = await FileStorage.countDocuments();
      const totalJobs = await MigrationJob.countDocuments();

      return {
        pendingJobsToClean: pendingJobs,
        oldFilesToClean: oldFiles,
        totalFiles,
        totalJobs,
        isRunning: this.isRunning
      };
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const cleanupService = new CleanupService();

export default cleanupService;

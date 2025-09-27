import apiService from './api';

interface CleanupSession {
  sessionId: string;
  type: 'zip' | 'single';
  uploadedAt: Date;
  fileCount: number;
  fileIds?: string[]; // For single files, track the actual file IDs
  abortController?: AbortController; // For cancelling active uploads
}

class CleanupService {
  private currentSessions: Map<string, CleanupSession> = new Map();
  private cleanupCallbacks: Set<() => void> = new Set();

  constructor() {
    // Set up navigation cleanup for web app navigation only
    this.setupAppNavigationCleanup();
  }

  /**
   * Register a cleanup callback that will be called when cleanup is needed
   */
  onCleanup(callback: () => void) {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  /**
   * Register a new upload session for tracking
   */
  registerSession(sessionId: string, type: 'zip' | 'single', fileCount: number = 1, fileIds?: string[], abortController?: AbortController) {
    console.log(`🧹 Registering ${type} session for cleanup: ${sessionId}`);
    this.currentSessions.set(sessionId, {
      sessionId,
      type,
      uploadedAt: new Date(),
      fileCount,
      fileIds: fileIds || [],
      abortController
    });
  }

  /**
   * Commit a session (mark as completed, remove from cleanup tracking)
   */
  commitSession(sessionId: string) {
    console.log(`✅ Committing session: ${sessionId}`);
    this.currentSessions.delete(sessionId);
  }

  /**
   * Get all current sessions that need cleanup
   */
  getCurrentSessions(): CleanupSession[] {
    return Array.from(this.currentSessions.values());
  }

  /**
   * Cleanup specific session
   */
  async cleanupSession(sessionId: string): Promise<boolean> {
    const session = this.currentSessions.get(sessionId);
    if (!session) {
      console.log(`⚠️  Session ${sessionId} not found for cleanup`);
      return false;
    }

    try {
      console.log(`🧹 Cleaning up ${session.type} session: ${sessionId}`);
      console.log(`🧹 Session details:`, {
        sessionId: session.sessionId,
        type: session.type,
        fileCount: session.fileCount,
        fileIds: session.fileIds
      });
      
      if (session.type === 'zip') {
        // For ZIP files, use the session cleanup API
        console.log(`🧹 Calling cleanupOrphanedSession for ZIP session: ${sessionId}`);
        const result = await apiService.cleanupOrphanedSession(sessionId);
        console.log(`🧹 ZIP cleanup result:`, result);
      } else {
        // For single files, delete individual files by their IDs
        if (session.fileIds && session.fileIds.length > 0) {
          console.log(`🧹 Deleting ${session.fileIds.length} single files:`, session.fileIds);
          for (const fileId of session.fileIds) {
            try {
              console.log(`🧹 Deleting single file: ${fileId}`);
              const result = await apiService.deleteSingleFile(fileId);
              console.log(`✅ Deleted single file: ${fileId}`, result);
            } catch (error) {
              console.error(`❌ Failed to delete single file ${fileId}:`, error);
            }
          }
        } else {
          // Fallback: clean up orphaned single files
          console.log(`🧹 No file IDs found, cleaning up orphaned single files`);
          const result = await apiService.cleanupOrphanedSingleFiles(0);
          console.log(`🧹 Orphaned cleanup result:`, result);
        }
      }

      this.currentSessions.delete(sessionId);
      console.log(`✅ Successfully cleaned up session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to cleanup session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup all current sessions
   */
  async cleanupAllSessions(): Promise<{ success: number; failed: number }> {
    const sessions = Array.from(this.currentSessions.keys());
    let success = 0;
    let failed = 0;

    console.log(`🧹 Cleaning up ${sessions.length} sessions`);

    for (const sessionId of sessions) {
      const result = await this.cleanupSession(sessionId);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`🧹 Cleanup completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Trigger cleanup for tab switching
   */
  async cleanupOnTabSwitch(fromTab: 'zip' | 'single', toTab: 'zip' | 'single') {
    console.log(`🔄 Tab switch detected: ${fromTab} → ${toTab}`);
    
    // Clean up sessions from the tab we're leaving
    const sessionsToCleanup = Array.from(this.currentSessions.values())
      .filter(session => session.type === fromTab);

    if (sessionsToCleanup.length === 0) {
      console.log(`✅ No sessions to cleanup for ${fromTab} tab`);
      return;
    }

    console.log(`🧹 Cleaning up ${sessionsToCleanup.length} sessions from ${fromTab} tab`);
    
    for (const session of sessionsToCleanup) {
      await this.cleanupSession(session.sessionId);
    }
  }

  /**
   * Set up web app navigation cleanup (not browser tab switching)
   */
  private setupAppNavigationCleanup() {
    // Only handle beforeunload for actual page navigation/refresh/close
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      const sessions = this.getCurrentSessions();
      if (sessions.length > 0) {
        console.log(`🧹 Page navigation detected with ${sessions.length} active sessions`);
        
        // Trigger cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Cleanup callback error:', error);
          }
        });

        // Note: We can't use async operations in beforeunload
        // The actual cleanup will happen on the server side based on timestamps
        event.preventDefault();
        event.returnValue = `You have ${sessions.length} upload session(s) in progress. Are you sure you want to leave?`;
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Remove visibility change listener - we don't want to cleanup on browser tab switching
    // Only cleanup on actual page navigation within the app
  }

  /**
   * Trigger cleanup for app navigation (call this when navigating within the app)
   */
  async cleanupOnAppNavigation() {
    const sessions = this.getCurrentSessions();
    if (sessions.length === 0) {
      console.log('✅ No active sessions to cleanup');
      return { success: 0, failed: 0 };
    }

    console.log(`🧹 App navigation detected - cleaning up ${sessions.length} sessions`);
    
    // First, cancel any active uploads
    const cancelledUploads = this.cancelAllActiveUploads();
    if (cancelledUploads > 0) {
      console.log(`🚫 Cancelled ${cancelledUploads} active uploads before cleanup`);
    }
    
    // Trigger cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup callback error:', error);
      }
    });

    // Then cleanup all sessions (only completed uploads)
    return await this.cleanupAllSessions();
  }

  /**
   * Trigger cleanup for app navigation (synchronous version for cleanup functions)
   */
  cleanupOnAppNavigationSync() {
    const sessions = this.getCurrentSessions();
    if (sessions.length === 0) {
      console.log('✅ No active sessions to cleanup');
      return;
    }

    console.log(`🧹 App navigation cleanup triggered for ${sessions.length} sessions`);
    
    // Start cleanup but don't wait for it (fire and forget)
    this.cleanupOnAppNavigation().then(result => {
      console.log(`🧹 App navigation cleanup completed: ${result.success} success, ${result.failed} failed`);
    }).catch(error => {
      console.error('🧹 App navigation cleanup failed:', error);
    });
  }

  /**
   * Cancel all active uploads
   */
  cancelAllActiveUploads() {
    console.log('🚫 Cancelling all active uploads...');
    let cancelledCount = 0;
    
    this.currentSessions.forEach((session, sessionId) => {
      if (session.abortController) {
        console.log(`🚫 Cancelling ${session.type} upload: ${sessionId}`);
        console.log(`🚫 AbortController signal aborted: ${session.abortController.signal.aborted}`);
        session.abortController.abort();
        console.log(`🚫 AbortController aborted: ${session.abortController.signal.aborted}`);
        cancelledCount++;
      }
    });
    
    console.log(`🚫 Cancelled ${cancelledCount} active uploads`);
    return cancelledCount;
  }

  /**
   * Get active uploads count
   */
  getActiveUploadsCount(): number {
    return Array.from(this.currentSessions.values())
      .filter(session => session.abortController && !session.abortController.signal.aborted)
      .length;
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    const sessions = this.getCurrentSessions();
    const zipSessions = sessions.filter(s => s.type === 'zip');
    const singleSessions = sessions.filter(s => s.type === 'single');
    
    return {
      totalSessions: sessions.length,
      zipSessions: zipSessions.length,
      singleSessions: singleSessions.length,
      totalFiles: sessions.reduce((sum, s) => sum + s.fileCount, 0)
    };
  }
}

export default new CleanupService();

import { useEffect } from 'react';
import { useUpload } from '../contexts/UploadContext';

/**
 * Hook to prevent browser navigation (back/forward buttons, page refresh, etc.) during uploads
 */
export const useNavigationBlocker = () => {
  const { uploadState } = useUpload();

  useEffect(() => {
    if (!uploadState.isUploading) {
      return;
    }

    // Prevent page refresh
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Upload in progress. Are you sure you want to leave?';
      return 'Upload in progress. Are you sure you want to leave?';
    };

    // Prevent browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      if (uploadState.isUploading) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        
        // Show a warning to the user
        const shouldLeave = window.confirm(
          'Upload in progress. Are you sure you want to leave? This may cause data loss.'
        );
        
        if (!shouldLeave) {
          // Stay on current page
          return;
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push a state to the history stack to enable popstate detection
    if (uploadState.isUploading) {
      window.history.pushState(null, '', window.location.href);
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [uploadState.isUploading]);
};

export default useNavigationBlocker;

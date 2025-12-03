import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// This component runs in the background and periodically checks for due scheduled notifications
export default function ScheduledNotificationProcessor() {
  const lastRunRef = useRef(0);

  useEffect(() => {
    const checkAndProcess = async () => {
      const now = Date.now();
      // Only run every 60 seconds to avoid too many API calls
      if (now - lastRunRef.current < 60000) return;
      lastRunRef.current = now;

      try {
        const response = await base44.functions.invoke('processScheduledNotifications', {});
        if (response.data?.processed > 0) {
          console.log('Processed scheduled notifications:', response.data);
        }
      } catch (err) {
        // Silently fail - this is a background process
        console.error('Scheduled notification processor error:', err);
      }
    };

    // Run immediately on mount
    checkAndProcess();

    // Then run every 60 seconds
    const interval = setInterval(checkAndProcess, 60000);

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
}
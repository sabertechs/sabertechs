import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const typeConfig = {
  info: { icon: Info, color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700" },
  alert: { icon: AlertTriangle, color: "bg-red-500", bgColor: "bg-red-50", textColor: "text-red-700" },
  success: { icon: CheckCircle, color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700" },
  warning: { icon: AlertCircle, color: "bg-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700" },
  announcement: { icon: Megaphone, color: "bg-indigo-500", bgColor: "bg-indigo-50", textColor: "text-indigo-700" },
  approval: { icon: CheckCircle, color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700" },
  deadline: { icon: AlertTriangle, color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700" },
};

export default function NotificationPopup({ userEmail }) {
  const [popupNotification, setPopupNotification] = useState(null);
  // Use a ref so it never causes effect re-runs
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userEmail) return;

    const checkNotifications = async () => {
      let notifications;
      try {
        notifications = await base44.entities.Notification.filter(
          { recipient_email: userEmail, is_read: false },
          '-created_date',
          5
        );
      } catch (e) {
        return;
      }

      // Find the newest one we haven't shown yet
      const newNotification = notifications.find(n => !seenIdsRef.current.has(n.id));
      if (!newNotification) return;

      // Mark as seen immediately so it never re-appears
      seenIdsRef.current.add(newNotification.id);

      // Mark as read in DB right away to prevent repeat across sessions/reloads
      try {
        await base44.entities.Notification.update(newNotification.id, { is_read: true });
      } catch (e) {
        // continue showing popup even if update fails
      }

      setPopupNotification(newNotification);
      playNotificationSound();

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setPopupNotification(prev => prev?.id === newNotification.id ? null : prev);
      }, 10000);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [userEmail]); // ← removed seenIds from deps — use ref instead

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 150);
    } catch (e) { /* audio not supported */ }
  };

  const handleDismiss = () => {
    setPopupNotification(null);
  };

  const config = typeConfig[popupNotification?.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {popupNotification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className={`${config.bgColor} border-2 border-white rounded-2xl shadow-2xl overflow-hidden`}>
            <div className={`${config.color} h-1.5`} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`${config.color} p-2 rounded-xl flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-semibold ${config.textColor}`}>
                      {popupNotification.title}
                    </h3>
                    <button
                      onClick={handleDismiss}
                      className="p-1 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {popupNotification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleDismiss}
                      className={`${config.color} hover:opacity-90 text-white text-xs px-3 py-1 h-7`}
                    >
                      Dismiss
                    </Button>
                    {popupNotification.link && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.location.href = popupNotification.link;
                          handleDismiss();
                        }}
                        className="text-xs px-3 py-1 h-7"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
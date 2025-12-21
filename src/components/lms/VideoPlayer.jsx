import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle } from "lucide-react";

const getYouTubeId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export default function VideoPlayer({ videoUrl, onComplete }) {
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const youtubeId = getYouTubeId(videoUrl);

  useEffect(() => {
    if (!youtubeId) return;

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: youtubeId,
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
              const interval = setInterval(() => {
                const currentTime = playerRef.current?.getCurrentTime() || 0;
                const duration = playerRef.current?.getDuration() || 1;
                const progress = (currentTime / duration) * 100;
                
                if (progress >= 90 && !completed) {
                  setCompleted(true);
                  if (onComplete) onComplete();
                  clearInterval(interval);
                }
              }, 1000);
              return () => clearInterval(interval);
            } else {
              setPlaying(false);
            }
          }
        }
      });
    };
  }, [youtubeId, completed, onComplete]);

  useEffect(() => {
    if (youtubeId) return;
    
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      if (progress >= 90 && !completed) {
        setCompleted(true);
        if (onComplete) onComplete();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [completed, onComplete, youtubeId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  if (youtubeId) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-black">
            <div id="youtube-player" className="w-full aspect-video" />
            {completed && (
              <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm z-10">
                <CheckCircle className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            src={videoUrl}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          
          {completed && (
            <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
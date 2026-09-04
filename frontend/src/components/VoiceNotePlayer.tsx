import React, { useState, useRef, useMemo, useEffect } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceNotePlayerProps {
  src: string;
  className?: string;
}

const SPEED_OPTIONS = [1, 1.5, 2];

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function VoiceNotePlayer({ src, className = "" }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Ref flags: ensure duration workaround runs EXACTLY ONCE per audio source
  const hasFixedDuration = useRef(false);
  const isPerformingInitialSeek = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentSpeed = SPEED_OPTIONS[speedIndex];
  const isDurationValid = isFinite(duration) && !isNaN(duration) && duration > 0;

  // Reset duration fix flags when audio src changes
  useEffect(() => {
    hasFixedDuration.current = false;
    isPerformingInitialSeek.current = false;
  }, [src]);

  // Generate deterministic bar heights (36 bars) for waveform aesthetic
  const barHeights = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const h = Math.abs(Math.sin((i + 1) * 0.45) * 65 + Math.cos((i + 1) * 0.9) * 25 + 10);
      return Math.max(15, Math.min(100, Math.round(h)));
    });
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.playbackRate = currentSpeed;
      audioRef.current.play().catch((err) => {
        console.error("Playback error:", err);
        setHasError(true);
      });
    }
  };

  const handleTimeUpdate = () => {
    // Only update time during normal playback/seeking, not during initial duration workaround seek
    if (audioRef.current && !isPerformingInitialSeek.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const checkAndFixDuration = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;

    if (isFinite(dur) && !isNaN(dur) && dur > 0) {
      setDuration(dur);
      // If we performed the 1e101 seek workaround, reset time back to 0 now that duration is fixed
      if (isPerformingInitialSeek.current) {
        isPerformingInitialSeek.current = false;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      hasFixedDuration.current = true;
    } else if (!hasFixedDuration.current && !isPerformingInitialSeek.current) {
      // Audio duration is Infinity/NaN -> trigger single-seek workaround once
      isPerformingInitialSeek.current = true;
      try {
        audioRef.current.currentTime = 1e101;
      } catch {
        isPerformingInitialSeek.current = false;
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[nextIndex];
    }
  };

  const seekFromMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current || !isDurationValid) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * duration;

    // Set currentTime directly on HTML5 Audio element
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    seekFromMouseEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      seekFromMouseEvent(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const progressFraction = isDurationValid ? currentTime / duration : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Audio recording unavailable or failed to load.</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-md ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={checkAndFixDuration}
        onDurationChange={checkAndFixDuration}
        onCanPlay={checkAndFixDuration}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
          aria-label={isPlaying ? "Pause recording" : "Play recording"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-zinc-900" />
          ) : (
            <Play className="h-4 w-4 fill-zinc-900 ml-0.5" />
          )}
        </Button>

        {/* Waveform Container with Click & Drag Seeking */}
        <div
          ref={waveformRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 flex items-center gap-[3px] h-9 px-1 cursor-pointer select-none"
        >
          {barHeights.map((heightPercent, idx) => {
            const barFraction = idx / barHeights.length;
            const isPlayed = barFraction <= progressFraction;

            return (
              <div
                key={idx}
                style={{ height: `${heightPercent}%` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed ? "bg-zinc-100" : "bg-zinc-800 hover:bg-zinc-700"
                }`}
                title={
                  isDurationValid
                    ? `Seek to ${formatAudioTime((idx / barHeights.length) * duration)}`
                    : "Seek audio"
                }
              />
            );
          })}
        </div>

        {/* Speed Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={cycleSpeed}
          className="h-8 px-2.5 text-xs font-mono font-medium border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 shrink-0 cursor-pointer"
        >
          {currentSpeed}x
        </Button>
      </div>

      {/* Time & Info Row */}
      <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1">
          <Volume2 className="h-3 w-3 text-zinc-500" />
          Voice Note Recording
        </span>
        <span>
          {isDurationValid
            ? `${formatAudioTime(currentTime)} / ${formatAudioTime(duration)}`
            : formatAudioTime(currentTime)}
        </span>
      </div>
    </div>
  );
}

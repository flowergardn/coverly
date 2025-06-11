import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const BASE_PLAY_TIME = 3;
const HINT_BONUS_TIME = 2;
const MAX_PLAY_TIME = 15;
const SECONDS_IN_MINUTE = 60;

export default function SnippetPlayer({
  hintLevel,
  previewUrl,
}: {
  hintLevel: number;
  previewUrl: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const allowedPlayTime = Math.min(
    BASE_PLAY_TIME + hintLevel * HINT_BONUS_TIME,
    MAX_PLAY_TIME,
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTime >= allowedPlayTime && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTime, allowedPlayTime, isPlaying]);

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    if (hasPlayedOnce && currentTime >= allowedPlayTime) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setHasPlayedOnce(true);
      })
      .catch((error) => {
        console.error("Audio play failed:", error);
      });
  }, [allowedPlayTime, currentTime, hasPlayedOnce, previewUrl]);

  const toggleAudio = useCallback(() => {
    if (isPlaying) pauseAudio();
    else playAudio();
  }, [isPlaying, pauseAudio, playAudio]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleAudio();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * allowedPlayTime;

    audio.currentTime = Math.min(newTime, allowedPlayTime);
    setCurrentTime(audio.currentTime);

    if (!isPlaying) setCurrentTime(audio.currentTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / SECONDS_IN_MINUTE);
    const s = Math.floor(seconds % SECONDS_IN_MINUTE);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-md">
      <audio ref={audioRef} src={previewUrl} preload="metadata" />

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            onClick={toggleAudio}
            onKeyDown={handleKeyDown}
            variant="outline"
            size="sm"
            className={cn(
              "text-primary border-black bg-transparent transition hover:bg-zinc-200",
              !isPlaying ? "animate-pulse" : "",
            )}
            aria-label={
              isPlaying ? "Pause audio preview" : "Play audio preview"
            }
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <>
                <Pause className="mr-1 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" />
                Play
              </>
            )}
          </Button>

          <div className="text-primary text-sm tabular-nums">
            {formatTime(currentTime)}
          </div>
        </div>

        <div
          ref={progressBarRef}
          onClick={handleSeek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={allowedPlayTime}
          aria-valuenow={currentTime}
          tabIndex={0}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio) return;

            let newTime = audio.currentTime;
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              if (e.key === "ArrowRight") {
                newTime = Math.min(newTime + 1, allowedPlayTime);
              } else {
                newTime = Math.min(newTime - 1, allowedPlayTime);
              }
              audio.currentTime = newTime;
              setCurrentTime(newTime);
              e.preventDefault();
            }
          }}
          className="relative h-3 cursor-pointer overflow-hidden rounded-full"
          aria-label="Audio progress bar"
        >
          <div
            className="absolute top-0 left-0 h-full bg-zinc-200 transition-all duration-150 ease-out"
            style={{
              width: `${(currentTime / allowedPlayTime) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

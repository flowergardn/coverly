"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Lightbulb,
  RotateCcw,
  CheckCircle,
  XCircle,
  Music,
  Share2,
  Check,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { setWin } from "./set-win";
import SnippetPlayer from "../snippet-player";

interface GameClientProps {
  wonGame?: boolean;
  artistName: string;
  fullCoverUrl: string;
  correctSongName: string;
  allSongs: string[];
  croppedImageUrls: string[];
  previewUrl: string | null;
}

const MAX_ATTEMPTS = 5;

export function GameClient({
  wonGame,
  artistName,
  fullCoverUrl,
  correctSongName,
  allSongs,
  croppedImageUrls,
  previewUrl,
}: GameClientProps) {
  const [guess, setGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    wonGame ? "won" : "playing",
  );
  const [attempts, setAttempts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const maxHints = croppedImageUrls.length - 1;

  useEffect(() => {
    if (gameState !== "playing") setShowCover(true);
  }, [gameState]);

  const filteredSongs = allSongs
    .filter(
      (song) =>
        song.toLowerCase().includes(guess.toLowerCase()) && guess.length > 0,
    )
    .slice(0, 5);

  const handleGuess = (songName: string) => {
    const trimmedGuess = songName.trim();
    if (!trimmedGuess || attempts.includes(trimmedGuess)) return;

    const newAttempts = [...attempts, trimmedGuess];
    setAttempts(newAttempts);
    setGuess("");
    setShowSuggestions(false);

    if (trimmedGuess.toLowerCase() === correctSongName.toLowerCase()) {
      setGameState("won");
      void setWin(artistName, correctSongName);
    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      setGameState("lost");
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      handleGuess(guess);
    }
  };

  const getHint = () => {
    if (hintLevel < maxHints) {
      setHintLevel((prev) => prev + 1);
    }
  };

  const resetGame = () => {
    setAttempts([]);
    setGameState("playing");
    setShowCover(false);
    setGuess("");
    setHintLevel(0);
  };

  const isCorrectGuess = (attempt: string) =>
    attempt.toLowerCase() === correctSongName.toLowerCase();

  const generateShareText = () => {
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const squares = [];

    for (const attempt of attempts) {
      if (isCorrectGuess(attempt)) {
        squares.push("🟩");
        break;
      } else squares.push("🟥");
    }

    if (gameState !== "won") {
      const remainingAttempts = MAX_ATTEMPTS - attempts.length;
      for (let i = 0; i < remainingAttempts; i++) {
        squares.push("⬜");
      }
    }

    const hintsUsed =
      hintLevel > 0
        ? ` (${hintLevel} hint${hintLevel !== 1 ? "s" : ""} used)`
        : "";
    const result =
      gameState === "won"
        ? `${attempts.length}/${MAX_ATTEMPTS}`
        : `${MAX_ATTEMPTS}/${MAX_ATTEMPTS}`;

    return `Coverly ${today} - ${artistName}
${result}${hintsUsed}

${squares.join("")}`;
  };

  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      const textArea = document.createElement("textarea");
      textArea.value = generateShareText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const justWon = attempts.length >= 1 || !wonGame;
  const currentImageUrl = showCover
    ? fullCoverUrl
    : croppedImageUrls[hintLevel];

  if (!currentImageUrl) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="mb-2 flex items-center justify-center gap-2 text-4xl font-bold text-white">
          <Music className="h-8 w-8" />
          Coverly
        </h1>
        <p className="text-xl text-gray-300">
          Today&apos;s track by{" "}
          <span className="font-semibold text-white">{artistName}</span>
        </p>
      </div>

      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            {gameState === "won" && "🎉 Congratulations!"}
            {gameState === "lost" && "😔 Game Over"}
            {gameState === "playing" && "Guess the song"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Image
                src={currentImageUrl}
                alt={
                  showCover
                    ? `Full song cover for ${correctSongName}`
                    : `Cropped song cover - hint level ${hintLevel}`
                }
                width={showCover ? 300 : 200}
                height={showCover ? 300 : 200}
                className="rounded-lg shadow-lg transition-all duration-500"
                style={showCover ? {} : { imageRendering: "pixelated" }}
              />
              {hintLevel > 0 && gameState === "playing" && (
                <Badge
                  variant="default"
                  className="absolute -top-2 -right-2 bg-white font-bold text-black"
                >
                  Hint {hintLevel}/{maxHints}
                </Badge>
              )}
            </div>
          </div>

          {previewUrl && gameState === "playing" && (
            <SnippetPlayer hintLevel={hintLevel} previewUrl={previewUrl} />
          )}

          {gameState === "won" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Correct! The song was:{" "}
                <strong>&quot;{correctSongName}&quot;</strong>
                {justWon && (
                  <>
                    <br />
                    You got it in {attempts.length} attempt
                    {attempts.length !== 1 ? "s" : ""} with {hintLevel} hint
                    {hintLevel !== 1 ? "s" : ""}. Check back tomorrow for
                    another!
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {gameState === "lost" && (
            <Alert>
              <XCircle />
              <AlertDescription>
                Game over! The correct song was{" "}
                <strong>&quot;{correctSongName}&quot;</strong>
                <br />
                Better luck tomorrow!
              </AlertDescription>
            </Alert>
          )}

          {gameState === "playing" && (
            <div className="space-y-4">
              <form onSubmit={handleInputSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Type your guess..."
                  value={guess}
                  onChange={(e) => {
                    setGuess(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSuggestions(guess.length > 0)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  className="border-gray-700 bg-gray-900 text-lg text-white placeholder:text-gray-400 focus:border-white focus:ring-white"
                  autoComplete="off"
                />

                {showSuggestions && filteredSongs.length > 0 && (
                  <div className="bg-background absolute top-full right-0 left-0 z-10 mt-1 rounded-md border shadow-lg">
                    {filteredSongs.map((song, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleGuess(song)}
                        className="hover:bg-secondary w-full px-4 py-2 text-left text-white transition-colors first:rounded-t-md last:rounded-b-md"
                      >
                        {song}
                      </button>
                    ))}
                  </div>
                )}
              </form>

              <div className="text-center text-gray-400">
                <p>{MAX_ATTEMPTS - attempts.length} attempts remaining</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {gameState === "playing" && hintLevel < maxHints && (
              <Button onClick={getHint} variant="outline">
                <Lightbulb className="mr-2 h-4 w-4" />
                Get Hint ({maxHints - hintLevel} left)
              </Button>
            )}

            {gameState === "playing" && hintLevel > 0 && (
              <Button
                onClick={resetGame}
                variant="outline"
                className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            )}

            {gameState !== "playing" && justWon && (
              <Button
                onClick={copyResults}
                variant="outline"
                className="border-white bg-transparent text-white hover:bg-white hover:text-black"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Results
                  </>
                )}
              </Button>
            )}
          </div>

          {attempts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Your Attempts:</h3>
              <div className="space-y-1">
                {attempts.map((attempt, index) => (
                  <Alert
                    key={index}
                    variant={
                      isCorrectGuess(attempt) ? "success" : "destructive"
                    }
                  >
                    {isCorrectGuess(attempt) ? (
                      <CheckCircle className="h-4 w-4 text-black" />
                    ) : (
                      <XCircle className="h-4 w-4 text-white" />
                    )}
                    <span>{attempt}</span>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

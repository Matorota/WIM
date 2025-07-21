import React from "react";
import { useGameStore } from "../store/gameStore";

export const GameControls: React.FC = () => {
  const { isPaused, gameSpeed, gameTime, pauseGame, resumeGame, setGameSpeed } =
    useGameStore();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(
        seconds % 60
      ).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  };

  return (
    <div className="absolute top-4 left-4 bg-slate-800 border border-slate-600 rounded p-3">
      <div className="flex items-center space-x-4">
        {/* Game Time */}
        <div className="text-white">
          <div className="text-sm font-medium">Game Time</div>
          <div className="text-lg font-mono">{formatTime(gameTime)}</div>
        </div>

        {/* Pause/Resume */}
        <button
          onClick={isPaused ? resumeGame : pauseGame}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isPaused
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-yellow-600 hover:bg-yellow-700 text-white"
          }`}
        >
          {isPaused ? "▶️ Resume" : "⏸️ Pause"}
        </button>

        {/* Game Speed */}
        <div className="text-white">
          <div className="text-sm font-medium mb-1">Speed</div>
          <div className="flex space-x-1">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setGameSpeed(speed)}
                className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                  gameSpeed === speed
                    ? "bg-blue-600 text-white"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

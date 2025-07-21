import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { GameCanvas } from "./GameCanvas";
import { ResourceBar } from "./ResourceBar";
import { CommandPanel } from "./CommandPanel";
import { MiniMap } from "./MiniMap";
import { GameControls } from "./GameControls";
import { PauseMenu } from "./PauseMenu";

export const GameView: React.FC = () => {
  const { tick, isGameStarted, isPaused } = useGameStore();
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPauseMenu(!showPauseMenu);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showPauseMenu]);

  // Game loop
  useEffect(() => {
    if (!isGameStarted) return;

    const gameLoop = setInterval(() => {
      if (!isPaused && !showPauseMenu) {
        tick();
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [tick, isGameStarted, isPaused, showPauseMenu]);

  if (!isGameStarted) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Game not started</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <ResourceBar />

      <div className="flex-1 flex relative">
        <div className="flex-1 flex items-center justify-center p-4">
          <GameCanvas />
        </div>

        <CommandPanel />

        {/* Overlay Components */}
        <GameControls />
        <MiniMap />

        {/* ESC Menu Button */}
        <button
          onClick={() => setShowPauseMenu(true)}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 transition-colors"
        >
          Menu (ESC)
        </button>
      </div>

      <PauseMenu
        isOpen={showPauseMenu}
        onClose={() => setShowPauseMenu(false)}
      />
    </div>
  );
};

import { useState } from "react";
import { RTSCanvas } from "./components/RTSCanvas";
import { GameUI } from "./components/GameUI";
import { useRTSGameStore } from "./store/rtsGameStore";
import type { GameConfig } from "./types/rts-game";

function App() {
  const [showMenu, setShowMenu] = useState(true);
  const { startGame, isGameStarted } = useRTSGameStore();

  const handleStartGame = (config: GameConfig) => {
    startGame(config);
    setShowMenu(false);
  };

  if (showMenu && !isGameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center">Modern RTS</h1>
          <p className="text-gray-300 mb-6 text-center">
            Age of Empires-style real-time strategy game with modern units and
            intuitive controls.
          </p>

          <div className="space-y-4">
            <button
              onClick={() =>
                handleStartGame({
                  mapSize: "medium",
                  gameMode: "singleplayer",
                  aiOpponents: 1,
                  difficulty: "medium",
                  victoryCondition: "domination",
                  startingResources: "medium",
                })
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold"
            >
              Quick Start (1v1)
            </button>

            <button
              onClick={() =>
                handleStartGame({
                  mapSize: "large",
                  gameMode: "singleplayer",
                  aiOpponents: 2,
                  difficulty: "medium",
                  victoryCondition: "domination",
                  startingResources: "medium",
                })
              }
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded font-semibold"
            >
              Campaign (1v2)
            </button>

            <button
              onClick={() =>
                handleStartGame({
                  mapSize: "small",
                  gameMode: "singleplayer",
                  aiOpponents: 1,
                  difficulty: "easy",
                  victoryCondition: "domination",
                  startingResources: "high",
                })
              }
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded font-semibold"
            >
              Easy Mode
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <h3 className="font-semibold mb-2">How to Play:</h3>
            <ul className="space-y-1">
              <li>• Train villagers to gather resources</li>
              <li>• Build houses to increase population</li>
              <li>• Create military buildings to train soldiers</li>
              <li>• Right-click to command units</li>
              <li>• Use WASD or arrow keys to pan camera</li>
              <li>• Mouse wheel to zoom</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <RTSCanvas width={1200} height={700} />
      </div>
      <GameUI />

      <button
        onClick={() => setShowMenu(true)}
        className="fixed top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
      >
        Menu
      </button>
    </div>
  );
}

export default App;

import React, { useState } from "react";
import type { GameConfig } from "../types/game";

interface GameSetupProps {
  onStartGame: (config: GameConfig) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [config, setConfig] = useState<GameConfig>({
    mapSize: "medium",
    aiOpponents: 1,
    difficulty: "medium",
    victoryCondition: "domination",
    enableFogOfWar: true,
    startingResources: "normal",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGame(config);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-700 rounded-lg shadow-2xl p-8 w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Modern Warfare Strategy
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Map Size */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Map Size
            </label>
            <select
              value={config.mapSize}
              onChange={(e) =>
                setConfig({ ...config, mapSize: e.target.value as any })
              }
              className="w-full bg-slate-600 text-white rounded px-3 py-2 border border-slate-500 focus:border-blue-400 focus:outline-none"
            >
              <option value="small">Small (80x60)</option>
              <option value="medium">Medium (100x75)</option>
              <option value="large">Large (120x90)</option>
            </select>
          </div>

          {/* AI Opponents */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              AI Opponents: {config.aiOpponents}
            </label>
            <input
              type="range"
              min="1"
              max="4"
              value={config.aiOpponents}
              onChange={(e) =>
                setConfig({ ...config, aiOpponents: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              AI Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => setConfig({ ...config, difficulty })}
                  className={`py-2 px-4 rounded font-medium transition-colors ${
                    config.difficulty === difficulty
                      ? "bg-blue-600 text-white"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Victory Condition */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Victory Condition
            </label>
            <select
              value={config.victoryCondition}
              onChange={(e) =>
                setConfig({
                  ...config,
                  victoryCondition: e.target.value as any,
                })
              }
              className="w-full bg-slate-600 text-white rounded px-3 py-2 border border-slate-500 focus:border-blue-400 focus:outline-none"
            >
              <option value="domination">
                Domination (Destroy all enemies)
              </option>
              <option value="economic">
                Economic (Reach resource targets)
              </option>
              <option value="diplomatic">Diplomatic (Form alliances)</option>
            </select>
          </div>

          {/* Starting Resources */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Starting Resources
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "normal", "high"] as const).map((resources) => (
                <button
                  key={resources}
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, startingResources: resources })
                  }
                  className={`py-2 px-4 rounded font-medium transition-colors ${
                    config.startingResources === resources
                      ? "bg-green-600 text-white"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  {resources.charAt(0).toUpperCase() + resources.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.enableFogOfWar}
                onChange={(e) =>
                  setConfig({ ...config, enableFogOfWar: e.target.checked })
                }
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="text-white">Enable Fog of War</span>
            </label>
          </div>

          {/* Start Game Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
};

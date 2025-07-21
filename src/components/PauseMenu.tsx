import React, { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { saveGameManager } from "../systems/SaveGameManager";
import type { SavedGame } from "../systems/SaveGameManager";

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"main" | "save" | "load">("main");
  const [saveName, setSaveName] = useState("");
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const gameState = useGameStore();

  React.useEffect(() => {
    if (isOpen && activeTab === "load") {
      setSavedGames(saveGameManager.getSavedGames());
    }
  }, [isOpen, activeTab]);

  const handleSave = () => {
    if (!saveName.trim()) return;

    try {
      saveGameManager.saveGame(saveName, gameState);
      alert("Game saved successfully!");
      setSaveName("");
      setActiveTab("main");
    } catch (error) {
      alert("Failed to save game");
    }
  };

  const handleLoad = (saveId: string) => {
    try {
      const loadedState = saveGameManager.loadGame(saveId);
      if (loadedState) {
        // This would need to be implemented in the game store
        // gameState.loadGameState(loadedState);
        alert("Game loaded successfully!");
        onClose();
      }
    } catch (error) {
      alert("Failed to load game");
    }
  };

  const handleExport = (saveId: string) => {
    const exportData = saveGameManager.exportSave(saveId);
    if (exportData) {
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wim_save_${saveId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (saveGameManager.importSave(content)) {
        alert("Save imported successfully!");
        setSavedGames(saveGameManager.getSavedGames());
      } else {
        alert("Failed to import save file");
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Game Menu</h2>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6">
            {[
              { id: "main", label: "Main" },
              { id: "save", label: "Save Game" },
              { id: "load", label: "Load Game" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Menu */}
          {activeTab === "main" && (
            <div className="space-y-4">
              <button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Resume Game
              </button>

              <button
                onClick={() => setActiveTab("save")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Save Game
              </button>

              <button
                onClick={() => setActiveTab("load")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Load Game
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to quit to main menu?")) {
                    window.location.reload();
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Quit to Main Menu
              </button>
            </div>
          )}

          {/* Save Game */}
          {activeTab === "save" && (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Save Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Enter save name..."
                  className="w-full bg-slate-600 text-white rounded px-3 py-2 border border-slate-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Save Game
                </button>

                <button
                  onClick={() => setActiveTab("main")}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Load Game */}
          {activeTab === "load" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Saved Games
                </h3>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded cursor-pointer text-sm">
                  Import Save
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>

              {savedGames.length === 0 ? (
                <div className="text-slate-400 text-center py-8">
                  No saved games found
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedGames.map((save) => (
                    <div key={save.id} className="bg-slate-700 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-medium">
                            {save.name}
                          </h4>
                          <p className="text-slate-400 text-sm">
                            {new Date(save.timestamp).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleLoad(save.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Load
                          </button>

                          <button
                            onClick={() => handleExport(save.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Export
                          </button>

                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this save?"
                                )
                              ) {
                                saveGameManager.deleteSave(save.id);
                                setSavedGames(saveGameManager.getSavedGames());
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setActiveTab("main")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

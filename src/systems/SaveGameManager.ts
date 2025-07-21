import type { GameState } from "../types/game";

export interface SavedGame {
  id: string;
  name: string;
  timestamp: number;
  gameState: GameState;
  screenshot?: string;
}

class SaveGameManager {
  private storageKey = "wim_saved_games";

  public saveGame(name: string, gameState: GameState): SavedGame {
    const savedGame: SavedGame = {
      id: gameState.gameId,
      name,
      timestamp: Date.now(),
      gameState: { ...gameState },
    };

    const savedGames = this.getSavedGames();
    const existingIndex = savedGames.findIndex(
      (save) => save.id === savedGame.id
    );

    if (existingIndex >= 0) {
      savedGames[existingIndex] = savedGame;
    } else {
      savedGames.push(savedGame);
    }

    // Keep only the 10 most recent saves
    savedGames.sort((a, b) => b.timestamp - a.timestamp);
    if (savedGames.length > 10) {
      savedGames.splice(10);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(savedGames));
    return savedGame;
  }

  public loadGame(saveId: string): GameState | null {
    const savedGames = this.getSavedGames();
    const savedGame = savedGames.find((save) => save.id === saveId);
    return savedGame ? savedGame.gameState : null;
  }

  public getSavedGames(): SavedGame[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to load saved games:", error);
      return [];
    }
  }

  public deleteSave(saveId: string): void {
    const savedGames = this.getSavedGames().filter(
      (save) => save.id !== saveId
    );
    localStorage.setItem(this.storageKey, JSON.stringify(savedGames));
  }

  public exportSave(saveId: string): string | null {
    const savedGame = this.getSavedGames().find((save) => save.id === saveId);
    return savedGame ? JSON.stringify(savedGame) : null;
  }

  public importSave(saveData: string): boolean {
    try {
      const savedGame: SavedGame = JSON.parse(saveData);
      const savedGames = this.getSavedGames();

      // Validate the save structure
      if (!savedGame.id || !savedGame.gameState) {
        throw new Error("Invalid save data structure");
      }

      const existingIndex = savedGames.findIndex(
        (save) => save.id === savedGame.id
      );
      if (existingIndex >= 0) {
        savedGames[existingIndex] = savedGame;
      } else {
        savedGames.push(savedGame);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(savedGames));
      return true;
    } catch (error) {
      console.error("Failed to import save:", error);
      return false;
    }
  }
}

export const saveGameManager = new SaveGameManager();

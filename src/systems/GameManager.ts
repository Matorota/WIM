import { AIPlayer, createAIPlayer } from "../ai/AIPlayer";
import { useGameStore } from "../store/gameStore";

class GameManager {
  private aiPlayers: Map<string, AIPlayer> = new Map();
  private gameStarted = false;

  public initializeAI() {
    const gameState = useGameStore.getState();
    const aiPlayerIds = gameState.players
      .filter((p) => p.isAI)
      .map((p) => p.id);

    this.aiPlayers.clear();

    aiPlayerIds.forEach((playerId) => {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        const aiPlayer = createAIPlayer(playerId, player.difficulty);
        this.aiPlayers.set(playerId, aiPlayer);
      }
    });

    this.gameStarted = true;
  }

  public updateAI() {
    if (!this.gameStarted) return;

    this.aiPlayers.forEach((aiPlayer) => {
      aiPlayer.makeDecisions();
    });
  }

  public reset() {
    this.aiPlayers.clear();
    this.gameStarted = false;
  }
}

export const gameManager = new GameManager();

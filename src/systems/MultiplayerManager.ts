// Multiplayer system foundation
// This is a basic structure for future multiplayer implementation

export interface MultiplayerConfig {
  mode: "host" | "join";
  roomId?: string;
  playerName: string;
  maxPlayers: number;
}

export interface GameMessage {
  type:
    | "unit_move"
    | "unit_attack"
    | "build_construction"
    | "unit_production"
    | "game_state_sync";
  playerId: string;
  timestamp: number;
  data: any;
}

export interface Room {
  id: string;
  name: string;
  host: string;
  players: string[];
  maxPlayers: number;
  isGameStarted: boolean;
  gameConfig: any;
}

class MultiplayerManager {
  private isConnected = false;
  private currentRoom: Room | null = null;
  private messageQueue: GameMessage[] = [];

  // WebSocket connection for real multiplayer (not implemented)
  private ws: WebSocket | null = null;

  public createRoom(config: MultiplayerConfig): Promise<Room> {
    // In a real implementation, this would connect to a server
    return new Promise((resolve) => {
      const room: Room = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${config.playerName}'s Game`,
        host: config.playerName,
        players: [config.playerName],
        maxPlayers: config.maxPlayers,
        isGameStarted: false,
        gameConfig: {},
      };

      this.currentRoom = room;
      this.isConnected = true;

      setTimeout(() => resolve(room), 100);
    });
  }

  public joinRoom(roomId: string, playerName: string): Promise<Room> {
    // In a real implementation, this would connect to a server
    return new Promise((resolve, reject) => {
      // Simulate room not found
      if (Math.random() < 0.3) {
        reject(new Error("Room not found"));
        return;
      }

      const room: Room = {
        id: roomId,
        name: "Sample Room",
        host: "Host Player",
        players: ["Host Player", playerName],
        maxPlayers: 4,
        isGameStarted: false,
        gameConfig: {},
      };

      this.currentRoom = room;
      this.isConnected = true;

      setTimeout(() => resolve(room), 100);
    });
  }

  public sendMessage(message: Omit<GameMessage, "timestamp">): void {
    if (!this.isConnected) return;

    const fullMessage: GameMessage = {
      ...message,
      timestamp: Date.now(),
    };

    // In a real implementation, send via WebSocket
    this.messageQueue.push(fullMessage);

    // For now, just log the message
    console.log("Sending multiplayer message:", fullMessage);
  }

  public getMessages(): GameMessage[] {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    return messages;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.isConnected = false;
    this.currentRoom = null;
    this.messageQueue = [];
  }

  public isInRoom(): boolean {
    return this.isConnected && this.currentRoom !== null;
  }

  public getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  // Hot-seat multiplayer (local multiplayer)
  public enableHotSeatMode(playerCount: number): void {
    // This would modify the game store to support turn-based local multiplayer
    console.log(`Hot-seat mode enabled for ${playerCount} players`);
  }
}

export const multiplayerManager = new MultiplayerManager();

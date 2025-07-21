// Core game types and interfaces

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  difficulty: "easy" | "medium" | "hard";
  strategy: "aggressive" | "defensive" | "balanced";
  resources: Resources;
  isAlive: boolean;
}

export interface Resources {
  oil: number;
  steel: number;
  energy: number;
  money: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  position: Position;
  playerId: string;
  health: number;
  maxHealth: number;
  damage: number;
  range: number;
  speed: number;
  isSelected: boolean;
  target?: Position;
  isMoving: boolean;
  lastMoved: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Position;
  playerId: string;
  health: number;
  maxHealth: number;
  isConstructed: boolean;
  constructionProgress: number;
  isSelected: boolean;
  productionQueue: ProductionItem[];
}

export interface ProductionItem {
  type: UnitType;
  progress: number;
  cost: Resources;
}

export type UnitType =
  | "infantry"
  | "tank"
  | "drone"
  | "jet"
  | "helicopter"
  | "missile_launcher"
  | "engineer";

export type BuildingType =
  | "command_center"
  | "barracks"
  | "vehicle_factory"
  | "airbase"
  | "power_plant"
  | "oil_refinery"
  | "steel_mill"
  | "research_lab"
  | "defense_turret";

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: Resources;
  researchTime: number;
  prerequisites: string[];
  unlocks: string[];
}

export interface GameState {
  gameId: string;
  isGameStarted: boolean;
  isPaused: boolean;
  gameSpeed: number;
  currentTick: number;
  players: Player[];
  currentPlayerId: string;
  units: Unit[];
  buildings: Building[];
  mapSize: { width: number; height: number };
  fogOfWar: boolean[][];
  selectedUnits: string[];
  selectedBuildings: string[];
  camera: { x: number; y: number; zoom: number };
  gameMode: "singleplayer" | "multiplayer";
  victoryCondition: "domination" | "economic" | "diplomatic";
  gameTime: number;
}

export interface GameConfig {
  mapSize: "small" | "medium" | "large";
  aiOpponents: number;
  difficulty: "easy" | "medium" | "hard";
  victoryCondition: "domination" | "economic" | "diplomatic";
  enableFogOfWar: boolean;
  startingResources: "low" | "normal" | "high";
}

export interface AIStrategy {
  type: "aggressive" | "defensive" | "balanced";
  buildOrder: BuildingType[];
  unitComposition: Record<UnitType, number>;
  expansionTiming: number;
  attackTiming: number;
  defensePriority: number;
}

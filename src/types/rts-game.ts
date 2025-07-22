// Modern Age of Empires-style RTS Game Types

export interface Position {
  x: number;
  y: number;
}

export interface Resources {
  wood: number;
  food: number;
  stone: number;
  gold: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  resources: Resources;
  population: number;
  maxPopulation: number;
  isAlive: boolean;
}

export type UnitType =
  | "villager"
  | "soldier"
  | "archer"
  | "cavalry"
  | "tank"
  | "engineer";
export type BuildingType =
  | "town_center"
  | "house"
  | "barracks"
  | "archery_range"
  | "stable"
  | "factory"
  | "farm"
  | "lumber_mill"
  | "mining_camp"
  | "tower";

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
  isMoving: boolean;
  target?: Position;
  task:
    | "idle"
    | "gathering"
    | "building"
    | "attacking"
    | "moving"
    | "depositing";
  gatheringTarget?: string; // Resource node ID
  carryingResources?: {
    type: keyof Resources;
    amount: number;
  };
  buildTarget?: string; // Building ID under construction
  attackTarget?: string; // Enemy unit/building ID
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
  rallyPoint?: Position;
  size: { width: number; height: number };
}

export interface ProductionItem {
  type: UnitType;
  progress: number;
  cost: Resources;
  timeRemaining: number;
}

export interface ResourceNode {
  id: string;
  type: keyof Resources;
  position: Position;
  maxResources: number;
  currentResources: number;
  workersAssigned: string[];
  isExhausted: boolean;
}

export interface GameState {
  gameId: string;
  isGameStarted: boolean;
  isPaused: boolean;
  gameSpeed: number;
  currentTick: number;
  gameTime: number;

  players: Player[];
  currentPlayerId: string;

  units: Unit[];
  buildings: Building[];
  resourceNodes: ResourceNode[];

  mapSize: { width: number; height: number };
  selectedUnits: string[];
  selectedBuildings: string[];

  camera: { x: number; y: number; zoom: number };

  gameMode: "singleplayer" | "multiplayer";
  victoryCondition: "domination" | "economic" | "time";
}

export interface GameConfig {
  mapSize: "small" | "medium" | "large";
  gameMode: "singleplayer" | "multiplayer";
  aiOpponents: number;
  difficulty: "easy" | "medium" | "hard";
  victoryCondition: "domination" | "economic" | "time";
  startingResources: "low" | "medium" | "high";
}

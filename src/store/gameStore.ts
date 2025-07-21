import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  GameState,
  Player,
  Unit,
  Building,
  Resources,
  Position,
  UnitType,
  BuildingType,
} from "../types/game";
import { v4 as uuidv4 } from "uuid";
import { gameManager } from "../systems/GameManager";

interface GameStore extends GameState {
  // Game controls
  startGame: (config: any) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setGameSpeed: (speed: number) => void;

  // Player actions
  selectUnits: (unitIds: string[]) => void;
  selectBuildings: (buildingIds: string[]) => void;
  moveUnitsTo: (position: Position) => void;
  attackTarget: (targetId: string) => void;

  // Building actions
  constructBuilding: (type: BuildingType, position: Position) => void;
  produceUnit: (buildingId: string, unitType: UnitType) => void;

  // Resource management
  updateResources: (playerId: string, resources: Partial<Resources>) => void;
  canAfford: (playerId: string, cost: Resources) => boolean;

  // Camera controls
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;

  // Game logic
  tick: () => void;

  // Fog of war
  updateFogOfWar: (playerId: string) => void;
}

const initialResources: Resources = {
  oil: 1000,
  steel: 1000,
  energy: 1000,
  money: 2000,
};

const createInitialPlayer = (
  id: string,
  name: string,
  color: string,
  isAI: boolean = false
): Player => ({
  id,
  name,
  color,
  isAI,
  difficulty: "medium",
  strategy: "balanced",
  resources: { ...initialResources },
  isAlive: true,
});

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameId: "",
    isGameStarted: false,
    isPaused: false,
    gameSpeed: 1,
    currentTick: 0,
    players: [],
    currentPlayerId: "",
    units: [],
    buildings: [],
    mapSize: { width: 100, height: 100 },
    fogOfWar: [],
    selectedUnits: [],
    selectedBuildings: [],
    camera: { x: 0, y: 0, zoom: 1 },
    gameMode: "singleplayer",
    victoryCondition: "domination",
    gameTime: 0,

    // Actions
    startGame: (config) => {
      const gameId = uuidv4();
      const humanPlayer = createInitialPlayer(
        "player1",
        "Player 1",
        "#3b82f6",
        false
      );
      const aiPlayers = Array.from(
        { length: config.aiOpponents || 1 },
        (_, i) =>
          createInitialPlayer(
            `ai${i + 1}`,
            `AI ${i + 1}`,
            ["#ef4444", "#10b981", "#f59e0b"][i] || "#6b7280",
            true
          )
      );

      const mapWidth =
        config.mapSize === "small"
          ? 80
          : config.mapSize === "large"
          ? 120
          : 100;
      const mapHeight =
        config.mapSize === "small" ? 60 : config.mapSize === "large" ? 90 : 75;

      // Initialize fog of war
      const fogOfWar = Array.from({ length: mapHeight }, () =>
        Array(mapWidth).fill(true)
      );

      // Create starting buildings for each player
      const buildings: Building[] = [];
      const units: Unit[] = [];

      [humanPlayer, ...aiPlayers].forEach((player, index) => {
        const startX = index === 0 ? 10 : mapWidth - 15;
        const startY = index === 0 ? 10 : mapHeight - 15;

        // Command center
        buildings.push({
          id: uuidv4(),
          type: "command_center",
          position: { x: startX, y: startY },
          playerId: player.id,
          health: 1000,
          maxHealth: 1000,
          isConstructed: true,
          constructionProgress: 100,
          isSelected: false,
          productionQueue: [],
        });

        // Starting units
        for (let i = 0; i < 3; i++) {
          units.push({
            id: uuidv4(),
            type: "infantry",
            position: { x: startX + i * 2, y: startY + 3 },
            playerId: player.id,
            health: 100,
            maxHealth: 100,
            damage: 25,
            range: 3,
            speed: 1,
            isSelected: false,
            isMoving: false,
            lastMoved: 0,
          });
        }
      });

      set({
        gameId,
        isGameStarted: true,
        isPaused: false,
        players: [humanPlayer, ...aiPlayers],
        currentPlayerId: humanPlayer.id,
        mapSize: { width: mapWidth, height: mapHeight },
        fogOfWar,
        buildings,
        units,
        victoryCondition: config.victoryCondition || "domination",
        gameTime: 0,
        currentTick: 0,
      });

      // Initialize AI after game setup
      setTimeout(() => gameManager.initializeAI(), 100);
    },

    pauseGame: () => set({ isPaused: true }),
    resumeGame: () => set({ isPaused: false }),
    setGameSpeed: (speed) => set({ gameSpeed: speed }),

    selectUnits: (unitIds) => {
      set((state) => ({
        units: state.units.map((unit) => ({
          ...unit,
          isSelected: unitIds.includes(unit.id),
        })),
        selectedUnits: unitIds,
        selectedBuildings: [],
      }));
    },

    selectBuildings: (buildingIds) => {
      set((state) => ({
        buildings: state.buildings.map((building) => ({
          ...building,
          isSelected: buildingIds.includes(building.id),
        })),
        selectedBuildings: buildingIds,
        selectedUnits: [],
      }));
    },

    moveUnitsTo: (position) => {
      const { selectedUnits, units, currentPlayerId } = get();
      if (selectedUnits.length === 0) return;

      set({
        units: units.map((unit) => {
          if (
            selectedUnits.includes(unit.id) &&
            unit.playerId === currentPlayerId
          ) {
            return {
              ...unit,
              target: position,
              isMoving: true,
            };
          }
          return unit;
        }),
      });
    },

    attackTarget: (targetId) => {
      // Implementation for attack logic
      console.log("Attack target:", targetId);
    },

    constructBuilding: (type, position) => {
      const { currentPlayerId } = get();
      const buildingCosts: Record<BuildingType, Resources> = {
        command_center: { oil: 0, steel: 500, energy: 0, money: 1000 },
        barracks: { oil: 50, steel: 200, energy: 100, money: 300 },
        vehicle_factory: { oil: 100, steel: 400, energy: 200, money: 600 },
        airbase: { oil: 200, steel: 600, energy: 300, money: 1000 },
        power_plant: { oil: 0, steel: 300, energy: 0, money: 500 },
        oil_refinery: { oil: 0, steel: 250, energy: 150, money: 400 },
        steel_mill: { oil: 100, steel: 200, energy: 200, money: 450 },
        research_lab: { oil: 50, steel: 300, energy: 250, money: 700 },
        defense_turret: { oil: 30, steel: 150, energy: 100, money: 250 },
      };

      const cost = buildingCosts[type];
      if (!get().canAfford(currentPlayerId, cost)) return;

      const newBuilding: Building = {
        id: uuidv4(),
        type,
        position,
        playerId: currentPlayerId,
        health: 100,
        maxHealth: 100,
        isConstructed: false,
        constructionProgress: 0,
        isSelected: false,
        productionQueue: [],
      };

      set((state) => ({
        buildings: [...state.buildings, newBuilding],
        players: state.players.map((player) =>
          player.id === currentPlayerId
            ? {
                ...player,
                resources: {
                  oil: player.resources.oil - cost.oil,
                  steel: player.resources.steel - cost.steel,
                  energy: player.resources.energy - cost.energy,
                  money: player.resources.money - cost.money,
                },
              }
            : player
        ),
      }));
    },

    produceUnit: (buildingId, unitType) => {
      const { buildings, currentPlayerId } = get();
      const building = buildings.find((b) => b.id === buildingId);
      if (!building || building.playerId !== currentPlayerId) return;

      const unitCosts: Record<UnitType, Resources> = {
        infantry: { oil: 0, steel: 20, energy: 10, money: 100 },
        tank: { oil: 50, steel: 100, energy: 30, money: 300 },
        drone: { oil: 20, steel: 60, energy: 40, money: 200 },
        jet: { oil: 100, steel: 150, energy: 80, money: 500 },
        helicopter: { oil: 80, steel: 120, energy: 60, money: 400 },
        missile_launcher: { oil: 60, steel: 80, energy: 50, money: 350 },
        engineer: { oil: 0, steel: 30, energy: 20, money: 150 },
      };

      const cost = unitCosts[unitType];
      if (!get().canAfford(currentPlayerId, cost)) return;

      const productionItem = {
        type: unitType,
        progress: 0,
        cost,
      };

      set((state) => ({
        buildings: state.buildings.map((b) =>
          b.id === buildingId
            ? { ...b, productionQueue: [...b.productionQueue, productionItem] }
            : b
        ),
        players: state.players.map((player) =>
          player.id === currentPlayerId
            ? {
                ...player,
                resources: {
                  oil: player.resources.oil - cost.oil,
                  steel: player.resources.steel - cost.steel,
                  energy: player.resources.energy - cost.energy,
                  money: player.resources.money - cost.money,
                },
              }
            : player
        ),
      }));
    },

    updateResources: (playerId, resources) => {
      set((state) => ({
        players: state.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                resources: { ...player.resources, ...resources },
              }
            : player
        ),
      }));
    },

    canAfford: (playerId, cost) => {
      const player = get().players.find((p) => p.id === playerId);
      if (!player) return false;

      return (
        player.resources.oil >= cost.oil &&
        player.resources.steel >= cost.steel &&
        player.resources.energy >= cost.energy &&
        player.resources.money >= cost.money
      );
    },

    setCamera: (camera) => set({ camera }),

    updateFogOfWar: (playerId) => {
      const { units, buildings, fogOfWar, mapSize } = get();
      const playerUnits = units.filter((u) => u.playerId === playerId);
      const playerBuildings = buildings.filter((b) => b.playerId === playerId);

      const newFogOfWar = fogOfWar.map((row) => [...row]);

      // Reveal areas around player units and buildings
      [...playerUnits, ...playerBuildings].forEach((entity) => {
        const visionRange = 8;
        for (let dx = -visionRange; dx <= visionRange; dx++) {
          for (let dy = -visionRange; dy <= visionRange; dy++) {
            const x = Math.floor(entity.position.x + dx);
            const y = Math.floor(entity.position.y + dy);
            if (x >= 0 && x < mapSize.width && y >= 0 && y < mapSize.height) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= visionRange) {
                newFogOfWar[y][x] = false;
              }
            }
          }
        }
      });

      set({ fogOfWar: newFogOfWar });
    },

    tick: () => {
      const state = get();
      if (!state.isGameStarted || state.isPaused) return;

      const newTick = state.currentTick + 1;

      // Update game time
      const newGameTime = state.gameTime + (1000 / 60) * state.gameSpeed;

      // Update unit movement
      const updatedUnits = state.units.map((unit) => {
        if (unit.isMoving && unit.target) {
          const dx = unit.target.x - unit.position.x;
          const dy = unit.target.y - unit.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.5) {
            return { ...unit, isMoving: false, target: undefined };
          }

          const moveX = (dx / distance) * unit.speed * 0.1;
          const moveY = (dy / distance) * unit.speed * 0.1;

          return {
            ...unit,
            position: {
              x: unit.position.x + moveX,
              y: unit.position.y + moveY,
            },
          };
        }
        return unit;
      });

      // Update building construction and production
      const updatedBuildings = state.buildings.map((building) => {
        if (!building.isConstructed) {
          const newProgress = Math.min(100, building.constructionProgress + 2);
          return {
            ...building,
            constructionProgress: newProgress,
            isConstructed: newProgress >= 100,
          };
        }

        // Update production queue
        if (building.productionQueue.length > 0) {
          const updatedQueue = [...building.productionQueue];
          updatedQueue[0] = {
            ...updatedQueue[0],
            progress: Math.min(100, updatedQueue[0].progress + 1),
          };

          // If production is complete, create the unit
          if (updatedQueue[0].progress >= 100) {
            const unitType = updatedQueue[0].type;
            const newUnit: Unit = {
              id: uuidv4(),
              type: unitType,
              position: {
                x: building.position.x + 2,
                y: building.position.y + 2,
              },
              playerId: building.playerId,
              health: 100,
              maxHealth: 100,
              damage:
                unitType === "infantry" ? 25 : unitType === "tank" ? 75 : 50,
              range: unitType === "jet" ? 10 : unitType === "tank" ? 5 : 3,
              speed: unitType === "jet" ? 3 : unitType === "infantry" ? 1 : 2,
              isSelected: false,
              isMoving: false,
              lastMoved: newTick,
            };

            updatedQueue.shift(); // Remove completed production

            set((state) => ({
              units: [...state.units, newUnit],
            }));
          }

          return { ...building, productionQueue: updatedQueue };
        }

        return building;
      });

      // Resource generation
      const updatedPlayers = state.players.map((player) => {
        const playerBuildings = updatedBuildings.filter(
          (b) => b.playerId === player.id && b.isConstructed
        );
        const resourceGain = {
          oil:
            playerBuildings.filter((b) => b.type === "oil_refinery").length *
            10,
          steel:
            playerBuildings.filter((b) => b.type === "steel_mill").length * 8,
          energy:
            playerBuildings.filter((b) => b.type === "power_plant").length * 15,
          money:
            playerBuildings.filter((b) => b.type === "command_center").length *
            20,
        };

        return {
          ...player,
          resources: {
            oil: player.resources.oil + resourceGain.oil,
            steel: player.resources.steel + resourceGain.steel,
            energy: player.resources.energy + resourceGain.energy,
            money: player.resources.money + resourceGain.money,
          },
        };
      });

      set({
        currentTick: newTick,
        gameTime: newGameTime,
        units: updatedUnits,
        buildings: updatedBuildings,
        players: updatedPlayers,
      });

      // Update fog of war for current player
      get().updateFogOfWar(state.currentPlayerId);

      // Update AI every few ticks
      if (newTick % 60 === 0) {
        // Every second
        gameManager.updateAI();
      }
    },
  }))
);

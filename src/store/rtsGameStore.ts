import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  GameState,
  GameConfig,
  Player,
  Unit,
  Building,
  ResourceNode,
  Resources,
  Position,
  UnitType,
  BuildingType,
} from "../types/rts-game";

interface RTSGameStore extends GameState {
  // Game controls
  startGame: (config: GameConfig) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  
  // Unit selection and control
  selectUnits: (unitIds: string[]) => void;
  selectBuildings: (buildingIds: string[]) => void;
  clearSelection: () => void;
  
  // Unit commands
  moveUnitsTo: (position: Position) => void;
  attackTarget: (targetId: string) => void;
  gatherResource: (nodeId: string) => void;
  buildStructure: (buildingType: BuildingType, position: Position) => void;
  
  // Building commands
  trainUnit: (buildingId: string, unitType: UnitType) => void;
  setRallyPoint: (buildingId: string, position: Position) => void;
  
  // Camera controls
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  panCamera: (deltaX: number, deltaY: number) => void;
  zoomCamera: (delta: number, centerX?: number, centerY?: number) => void;
  
  // Game logic
  tick: () => void;
  
  // Helper functions
  canAfford: (playerId: string, cost: Resources) => boolean;
  getUnitsInArea: (center: Position, radius: number) => Unit[];
  findNearestResourceNode: (position: Position, resourceType: keyof Resources) => ResourceNode | null;
  findNearestDropOff: (position: Position, playerId: string) => Building | null;
}

const initialResources: Resources = {
  wood: 200,
  food: 200,
  stone: 100,
  gold: 100,
};

const createPlayer = (
  id: string,
  name: string,
  color: string,
  isAI: boolean = false
): Player => ({
  id,
  name,
  color,
  isAI,
  resources: { ...initialResources },
  population: 0,
  maxPopulation: 5, // Start with low population cap
  isAlive: true,
});

const unitStats = {
  villager: { health: 25, damage: 3, range: 1, speed: 1.2, cost: { wood: 0, food: 50, stone: 0, gold: 0 } },
  soldier: { health: 60, damage: 7, range: 1, speed: 1.0, cost: { wood: 0, food: 60, stone: 0, gold: 20 } },
  archer: { health: 30, damage: 4, range: 7, speed: 1.0, cost: { wood: 25, food: 45, stone: 0, gold: 25 } },
  cavalry: { health: 100, damage: 10, range: 1, speed: 1.8, cost: { wood: 0, food: 80, stone: 0, gold: 70 } },
  tank: { health: 180, damage: 25, range: 8, speed: 0.8, cost: { wood: 0, food: 0, stone: 100, gold: 150 } },
  engineer: { health: 35, damage: 2, range: 1, speed: 1.1, cost: { wood: 0, food: 75, stone: 0, gold: 50 } },
};

const buildingStats = {
  town_center: { health: 500, size: { width: 4, height: 4 }, cost: { wood: 0, food: 0, stone: 600, gold: 0 } },
  house: { health: 100, size: { width: 2, height: 2 }, cost: { wood: 30, food: 0, stone: 0, gold: 0 } },
  barracks: { health: 150, size: { width: 3, height: 3 }, cost: { wood: 175, food: 0, stone: 0, gold: 0 } },
  archery_range: { health: 150, size: { width: 3, height: 3 }, cost: { wood: 175, food: 0, stone: 0, gold: 0 } },
  stable: { health: 180, size: { width: 3, height: 3 }, cost: { wood: 175, food: 0, stone: 0, gold: 0 } },
  factory: { health: 200, size: { width: 4, height: 3 }, cost: { wood: 200, food: 0, stone: 150, gold: 100 } },
  farm: { health: 80, size: { width: 2, height: 2 }, cost: { wood: 60, food: 0, stone: 0, gold: 0 } },
  lumber_mill: { health: 120, size: { width: 2, height: 2 }, cost: { wood: 100, food: 0, stone: 0, gold: 0 } },
  mining_camp: { health: 120, size: { width: 2, height: 2 }, cost: { wood: 100, food: 0, stone: 0, gold: 0 } },
  tower: { health: 250, size: { width: 2, height: 2 }, cost: { wood: 50, food: 0, stone: 125, gold: 0 } },
};

export const useRTSGameStore = create<RTSGameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameId: "",
    isGameStarted: false,
    isPaused: false,
    gameSpeed: 1,
    currentTick: 0,
    gameTime: 0,
    players: [],
    currentPlayerId: "",
    units: [],
    buildings: [],
    resourceNodes: [],
    mapSize: { width: 120, height: 80 },
    selectedUnits: [],
    selectedBuildings: [],
    camera: { x: 0, y: 0, zoom: 1 },
    gameMode: "singleplayer",
    victoryCondition: "domination",

    startGame: (config) => {
      const gameId = uuidv4();
      const humanPlayer = createPlayer("player1", "Player 1", "#0066cc", false);
      const aiPlayers = Array.from({ length: config.aiOpponents || 1 }, (_, i) =>
        createPlayer(
          `ai${i + 1}`,
          `AI ${i + 1}`,
          ["#cc0000", "#00cc00", "#cccc00"][i] || "#666666",
          true
        )
      );

      const mapWidth = config.mapSize === "small" ? 80 : config.mapSize === "large" ? 160 : 120;
      const mapHeight = config.mapSize === "small" ? 60 : config.mapSize === "large" ? 120 : 80;

      // Create starting buildings and units
      const buildings: Building[] = [];
      const units: Unit[] = [];
      const resourceNodes: ResourceNode[] = [];

      // Generate resource nodes
      const generateResourceNodes = () => {
        const nodeTypes: (keyof Resources)[] = ['wood', 'food', 'stone', 'gold'];
        const nodesPerType = 8;

        nodeTypes.forEach(type => {
          for (let i = 0; i < nodesPerType; i++) {
            const x = Math.random() * (mapWidth - 10) + 5;
            const y = Math.random() * (mapHeight - 10) + 5;
            
            resourceNodes.push({
              id: uuidv4(),
              type,
              position: { x, y },
              maxResources: type === 'wood' ? 500 : type === 'food' ? 300 : 400,
              currentResources: type === 'wood' ? 500 : type === 'food' ? 300 : 400,
              workersAssigned: [],
              isExhausted: false,
            });
          }
        });
      };

      generateResourceNodes();

      // Create starting structures and units for each player
      [humanPlayer, ...aiPlayers].forEach((player, index) => {
        const startX = index === 0 ? 15 : mapWidth - 25;
        const startY = index === 0 ? 15 : mapHeight - 25;

        // Town Center
        buildings.push({
          id: uuidv4(),
          type: "town_center",
          position: { x: startX, y: startY },
          playerId: player.id,
          health: buildingStats.town_center.health,
          maxHealth: buildingStats.town_center.health,
          isConstructed: true,
          constructionProgress: 100,
          isSelected: false,
          productionQueue: [],
          size: buildingStats.town_center.size,
        });

        // Starting villagers
        for (let i = 0; i < 3; i++) {
          units.push({
            id: uuidv4(),
            type: "villager",
            position: { x: startX + 6 + i * 2, y: startY + 6 },
            playerId: player.id,
            health: unitStats.villager.health,
            maxHealth: unitStats.villager.health,
            damage: unitStats.villager.damage,
            range: unitStats.villager.range,
            speed: unitStats.villager.speed,
            isSelected: false,
            isMoving: false,
            task: 'idle',
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
        buildings,
        units,
        resourceNodes,
        victoryCondition: config.victoryCondition,
        gameTime: 0,
        currentTick: 0,
        selectedUnits: [],
        selectedBuildings: [],
        camera: { x: 15, y: 15, zoom: 1 }, // Start camera at player base
      });
    },

    pauseGame: () => set({ isPaused: true }),
    resumeGame: () => set({ isPaused: false }),

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

    clearSelection: () => {
      set((state) => ({
        units: state.units.map(unit => ({ ...unit, isSelected: false })),
        buildings: state.buildings.map(building => ({ ...building, isSelected: false })),
        selectedUnits: [],
        selectedBuildings: [],
      }));
    },

    moveUnitsTo: (position) => {
      const { selectedUnits, units, currentPlayerId } = get();
      if (selectedUnits.length === 0) return;

      set({
        units: units.map((unit) => {
          if (selectedUnits.includes(unit.id) && unit.playerId === currentPlayerId) {
            return {
              ...unit,
              target: position,
              isMoving: true,
              task: 'moving',
              gatheringTarget: undefined,
              buildTarget: undefined,
              attackTarget: undefined,
            };
          }
          return unit;
        }),
      });
    },

    gatherResource: (nodeId) => {
      const { selectedUnits, units, currentPlayerId, resourceNodes } = get();
      const node = resourceNodes.find(n => n.id === nodeId);
      if (!node || selectedUnits.length === 0) return;

      set({
        units: units.map((unit) => {
          if (selectedUnits.includes(unit.id) && unit.playerId === currentPlayerId && unit.type === 'villager') {
            return {
              ...unit,
              target: node.position,
              isMoving: true,
              task: 'gathering',
              gatheringTarget: nodeId,
              buildTarget: undefined,
              attackTarget: undefined,
            };
          }
          return unit;
        }),
      });
    },

    buildStructure: (buildingType, position) => {
      const { selectedUnits, units, currentPlayerId } = get();
      const builderUnit = units.find(u => 
        selectedUnits.includes(u.id) && 
        u.playerId === currentPlayerId && 
        (u.type === 'villager' || u.type === 'engineer')
      );
      
      if (!builderUnit) return;

      const cost = buildingStats[buildingType].cost;
      if (!get().canAfford(currentPlayerId, cost)) return;

      const newBuilding: Building = {
        id: uuidv4(),
        type: buildingType,
        position,
        playerId: currentPlayerId,
        health: buildingStats[buildingType].health,
        maxHealth: buildingStats[buildingType].health,
        isConstructed: false,
        constructionProgress: 0,
        isSelected: false,
        productionQueue: [],
        size: buildingStats[buildingType].size,
      };

      set((state) => ({
        buildings: [...state.buildings, newBuilding],
        units: state.units.map(unit => 
          unit.id === builderUnit.id 
            ? { ...unit, task: 'building', buildTarget: newBuilding.id, target: position, isMoving: true }
            : unit
        ),
        players: state.players.map((player) =>
          player.id === currentPlayerId
            ? {
                ...player,
                resources: {
                  wood: player.resources.wood - cost.wood,
                  food: player.resources.food - cost.food,
                  stone: player.resources.stone - cost.stone,
                  gold: player.resources.gold - cost.gold,
                },
              }
            : player
        ),
      }));
    },

    trainUnit: (buildingId, unitType) => {
      const { buildings, currentPlayerId } = get();
      const building = buildings.find((b) => b.id === buildingId);
      if (!building || building.playerId !== currentPlayerId || !building.isConstructed) return;

      const cost = unitStats[unitType].cost;
      if (!get().canAfford(currentPlayerId, cost)) return;

      const productionItem = {
        type: unitType,
        progress: 0,
        cost,
        timeRemaining: 3000, // 3 seconds
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
                  wood: player.resources.wood - cost.wood,
                  food: player.resources.food - cost.food,
                  stone: player.resources.stone - cost.stone,
                  gold: player.resources.gold - cost.gold,
                },
              }
            : player
        ),
      }));
    },

    setRallyPoint: (buildingId, position) => {
      set((state) => ({
        buildings: state.buildings.map(building => 
          building.id === buildingId 
            ? { ...building, rallyPoint: position }
            : building
        ),
      }));
    },

    setCamera: (camera) => set({ camera }),

    panCamera: (deltaX, deltaY) => {
      set((state) => ({
        camera: {
          ...state.camera,
          x: state.camera.x + deltaX,
          y: state.camera.y + deltaY,
        },
      }));
    },

    zoomCamera: (delta, centerX = 0, centerY = 0) => {
      set((state) => {
        const newZoom = Math.max(0.3, Math.min(3.0, state.camera.zoom + delta));
        
        // Zoom towards the specified center point
        const zoomFactor = newZoom / state.camera.zoom;
        const newX = centerX - (centerX - state.camera.x) * zoomFactor;
        const newY = centerY - (centerY - state.camera.y) * zoomFactor;
        
        return {
          camera: {
            x: newX,
            y: newY,
            zoom: newZoom,
          },
        };
      });
    },

    canAfford: (playerId, cost) => {
      const player = get().players.find((p) => p.id === playerId);
      if (!player) return false;

      return (
        player.resources.wood >= cost.wood &&
        player.resources.food >= cost.food &&
        player.resources.stone >= cost.stone &&
        player.resources.gold >= cost.gold
      );
    },

    getUnitsInArea: (center, radius) => {
      return get().units.filter(unit => {
        const distance = Math.sqrt(
          Math.pow(unit.position.x - center.x, 2) + 
          Math.pow(unit.position.y - center.y, 2)
        );
        return distance <= radius;
      });
    },

    findNearestResourceNode: (position, resourceType) => {
      const nodes = get().resourceNodes.filter(node => 
        node.type === resourceType && !node.isExhausted
      );
      
      let nearest = null;
      let minDistance = Infinity;
      
      nodes.forEach(node => {
        const distance = Math.sqrt(
          Math.pow(node.position.x - position.x, 2) + 
          Math.pow(node.position.y - position.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = node;
        }
      });
      
      return nearest;
    },

    findNearestDropOff: (position, playerId) => {
      const dropOffBuildings = get().buildings.filter(building => 
        building.playerId === playerId && 
        building.isConstructed &&
        (building.type === 'town_center' || building.type === 'lumber_mill' || building.type === 'mining_camp')
      );
      
      let nearest = null;
      let minDistance = Infinity;
      
      dropOffBuildings.forEach(building => {
        const distance = Math.sqrt(
          Math.pow(building.position.x - position.x, 2) + 
          Math.pow(building.position.y - position.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = building;
        }
      });
      
      return nearest;
    },

    attackTarget: (targetId) => {
      // TODO: Implement attack logic
      console.log("Attack target:", targetId);
    },

    tick: () => {
      const state = get();
      if (!state.isGameStarted || state.isPaused) return;

      const deltaTime = 1000 / 60; // 60 FPS
      const newTick = state.currentTick + 1;
      const newGameTime = state.gameTime + deltaTime;

      // Update unit movement and tasks
      const updatedUnits = state.units.map((unit) => {
        if (unit.isMoving && unit.target) {
          const dx = unit.target.x - unit.position.x;
          const dy = unit.target.y - unit.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.5) {
            // Reached target
            let updatedUnit = { 
              ...unit, 
              isMoving: false, 
              target: undefined,
              position: unit.target
            };

            // Handle task-specific logic when reaching target
            if (unit.task === 'gathering' && unit.gatheringTarget) {
              const node = state.resourceNodes.find(n => n.id === unit.gatheringTarget);
              if (node && !node.isExhausted && !unit.carryingResources) {
                // Start gathering
                updatedUnit = {
                  ...updatedUnit,
                  carryingResources: {
                    type: node.type,
                    amount: Math.min(10, node.currentResources) // Gather 10 resources
                  }
                };
              }
            } else if (unit.task === 'building' && unit.buildTarget) {
              // Continue building when at construction site
              updatedUnit = { ...updatedUnit, task: 'building' };
            } else {
              updatedUnit = { ...updatedUnit, task: 'idle' as const };
            }

            return updatedUnit;
          }

          // Continue moving
          const moveX = (dx / distance) * unit.speed * 0.02;
          const moveY = (dy / distance) * unit.speed * 0.02;

          return {
            ...unit,
            position: {
              x: unit.position.x + moveX,
              y: unit.position.y + moveY,
            },
          };
        }

        // Handle resource depositing
        if (unit.carryingResources && unit.task !== 'gathering') {
          const dropOff = get().findNearestDropOff(unit.position, unit.playerId);
          if (dropOff) {
            const distance = Math.sqrt(
              Math.pow(dropOff.position.x - unit.position.x, 2) + 
              Math.pow(dropOff.position.y - unit.position.y, 2)
            );
            if (distance < 3) {
              // Deposit resources
              const resourceType = unit.carryingResources.type;
              const amount = unit.carryingResources.amount;
              
              set((state) => ({
                players: state.players.map(player => 
                  player.id === unit.playerId 
                    ? {
                        ...player,
                        resources: {
                          ...player.resources,
                          [resourceType]: player.resources[resourceType] + amount
                        }
                      }
                    : player
                )
              }));
              
              return {
                ...unit,
                carryingResources: undefined,
                task: 'idle' as const
              };
            } else {
              // Move to drop off
              return {
                ...unit,
                target: dropOff.position,
                isMoving: true,
                task: 'depositing' as const
              };
            }
          }
        }

        return unit;
      });

      // Update building construction and production
      const updatedBuildings = state.buildings.map((building) => {
        if (!building.isConstructed) {
          // Find builders working on this building
          const builders = updatedUnits.filter(unit => 
            unit.buildTarget === building.id && 
            unit.task === 'building' &&
            !unit.isMoving
          );
          
          if (builders.length > 0) {
            const newProgress = Math.min(100, building.constructionProgress + builders.length * 0.5);
            return {
              ...building,
              constructionProgress: newProgress,
              isConstructed: newProgress >= 100,
            };
          }
        }

        // Update production queue
        if (building.productionQueue.length > 0 && building.isConstructed) {
          const updatedQueue = [...building.productionQueue];
          updatedQueue[0] = {
            ...updatedQueue[0],
            timeRemaining: Math.max(0, updatedQueue[0].timeRemaining - deltaTime),
            progress: Math.min(100, ((3000 - updatedQueue[0].timeRemaining) / 3000) * 100)
          };

          // If production is complete, create the unit
          if (updatedQueue[0].timeRemaining <= 0) {
            const unitType = updatedQueue[0].type;
            const spawnPosition = building.rallyPoint || {
              x: building.position.x + building.size.width + 1,
              y: building.position.y + building.size.height + 1,
            };

            const newUnit: Unit = {
              id: uuidv4(),
              type: unitType,
              position: spawnPosition,
              playerId: building.playerId,
              health: unitStats[unitType].health,
              maxHealth: unitStats[unitType].health,
              damage: unitStats[unitType].damage,
              range: unitStats[unitType].range,
              speed: unitStats[unitType].speed,
              isSelected: false,
              isMoving: false,
              task: 'idle',
              lastMoved: newTick,
            };

            updatedQueue.shift(); // Remove completed production

            set((state) => ({
              units: [...state.units, newUnit],
              players: state.players.map(player => 
                player.id === building.playerId 
                  ? { ...player, population: player.population + 1 }
                  : player
              )
            }));
          }

          return { ...building, productionQueue: updatedQueue };
        }

        return building;
      });

      // Update resource nodes
      const updatedResourceNodes = state.resourceNodes.map(node => {
        const workers = updatedUnits.filter(unit => 
          unit.gatheringTarget === node.id && 
          unit.task === 'gathering' && 
          !unit.isMoving &&
          !unit.carryingResources
        );
        
        if (workers.length > 0) {
          const extractionRate = workers.length * 0.1; // Extract resources based on worker count
          const newResources = Math.max(0, node.currentResources - extractionRate);
          
          return {
            ...node,
            currentResources: newResources,
            isExhausted: newResources <= 0,
            workersAssigned: workers.map(w => w.id)
          };
        }
        
        return { ...node, workersAssigned: [] };
      });

      set({
        currentTick: newTick,
        gameTime: newGameTime,
        units: updatedUnits,
        buildings: updatedBuildings,
        resourceNodes: updatedResourceNodes,
      });
    },
  }))
);

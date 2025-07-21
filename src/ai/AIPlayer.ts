import type {
  Player,
  Unit,
  Building,
  Position,
  UnitType,
  BuildingType,
  AIStrategy,
} from "../types/game";
import { useGameStore } from "../store/gameStore";

export class AIPlayer {
  private playerId: string;
  private strategy: AIStrategy;
  private lastDecisionTime: number = 0;

  constructor(playerId: string, strategy: AIStrategy) {
    this.playerId = playerId;
    this.strategy = strategy;
  }

  public makeDecisions() {
    const gameState = useGameStore.getState();
    const currentTime = gameState.currentTick;

    // Make decisions every few seconds
    if (currentTime - this.lastDecisionTime < 180) return; // 3 seconds at 60fps

    this.lastDecisionTime = currentTime;

    const player = gameState.players.find((p) => p.id === this.playerId);
    if (!player || !player.isAlive) return;

    const myUnits = gameState.units.filter((u) => u.playerId === this.playerId);
    const myBuildings = gameState.buildings.filter(
      (b) => b.playerId === this.playerId
    );
    const enemies = gameState.players.filter(
      (p) => p.id !== this.playerId && p.isAlive
    );

    // Strategy-based decisions
    switch (this.strategy.type) {
      case "aggressive":
        this.executeAggressiveStrategy(
          myUnits,
          myBuildings,
          enemies,
          gameState
        );
        break;
      case "defensive":
        this.executeDefensiveStrategy(myUnits, myBuildings, enemies, gameState);
        break;
      case "balanced":
        this.executeBalancedStrategy(myUnits, myBuildings, enemies, gameState);
        break;
    }
  }

  private executeAggressiveStrategy(
    myUnits: Unit[],
    myBuildings: Building[],
    _enemies: Player[],
    gameState: any
  ) {
    // Focus on unit production and early attacks
    this.manageEconomy(myBuildings, true);
    this.buildUnits(myBuildings, ["infantry", "tank"], gameState);

    if (myUnits.length >= 5) {
      this.attackEnemies(myUnits, gameState);
    }
  }

  private executeDefensiveStrategy(
    myUnits: Unit[],
    myBuildings: Building[],
    _enemies: Player[],
    gameState: any
  ) {
    // Focus on defense buildings and economic growth
    this.manageEconomy(myBuildings, false);
    this.buildDefenses(myBuildings, gameState);
    this.buildUnits(myBuildings, ["infantry", "missile_launcher"], gameState);

    // Only attack if we have overwhelming force
    if (myUnits.length >= 10) {
      this.attackEnemies(myUnits, gameState);
    }
  }

  private executeBalancedStrategy(
    myUnits: Unit[],
    myBuildings: Building[],
    _enemies: Player[],
    gameState: any
  ) {
    // Balance between economy, defense, and offense
    this.manageEconomy(myBuildings, false);

    if (myBuildings.length < 3) {
      this.expandBase(myBuildings, gameState);
    }

    this.buildUnits(myBuildings, ["infantry", "tank", "drone"], gameState);

    if (myUnits.length >= 7) {
      this.attackEnemies(myUnits, gameState);
    }
  }

  private manageEconomy(myBuildings: Building[], _aggressive: boolean) {
    const gameState = useGameStore.getState();
    const player = gameState.players.find((p) => p.id === this.playerId);
    if (!player) return;

    const powerPlants = myBuildings.filter(
      (b) => b.type === "power_plant" && b.isConstructed
    );
    const oilRefineries = myBuildings.filter(
      (b) => b.type === "oil_refinery" && b.isConstructed
    );
    const steelMills = myBuildings.filter(
      (b) => b.type === "steel_mill" && b.isConstructed
    );

    // Build economic buildings if we have resources
    if (player.resources.money >= 500 && powerPlants.length < 2) {
      this.tryBuildBuilding("power_plant", myBuildings);
    }

    if (player.resources.money >= 400 && oilRefineries.length < 2) {
      this.tryBuildBuilding("oil_refinery", myBuildings);
    }

    if (player.resources.money >= 450 && steelMills.length < 2) {
      this.tryBuildBuilding("steel_mill", myBuildings);
    }
  }

  private buildUnits(
    myBuildings: Building[],
    preferredUnits: UnitType[],
    gameState: any
  ) {
    const productionBuildings = myBuildings.filter(
      (b) =>
        ["barracks", "vehicle_factory", "airbase"].includes(b.type) &&
        b.isConstructed &&
        b.productionQueue.length === 0
    );

    productionBuildings.forEach((building) => {
      let unitType: UnitType | null = null;

      switch (building.type) {
        case "barracks":
          if (preferredUnits.includes("infantry")) unitType = "infantry";
          else if (preferredUnits.includes("engineer")) unitType = "engineer";
          break;
        case "vehicle_factory":
          if (preferredUnits.includes("tank")) unitType = "tank";
          else if (preferredUnits.includes("missile_launcher"))
            unitType = "missile_launcher";
          break;
        case "airbase":
          if (preferredUnits.includes("drone")) unitType = "drone";
          else if (preferredUnits.includes("jet")) unitType = "jet";
          else if (preferredUnits.includes("helicopter"))
            unitType = "helicopter";
          break;
      }

      if (unitType) {
        gameState.produceUnit(building.id, unitType);
      }
    });
  }

  private buildDefenses(myBuildings: Building[], _gameState: any) {
    const defenses = myBuildings.filter(
      (b) => b.type === "defense_turret" && b.isConstructed
    );
    const commandCenters = myBuildings.filter(
      (b) => b.type === "command_center" && b.isConstructed
    );

    if (defenses.length < commandCenters.length * 2) {
      this.tryBuildBuilding("defense_turret", myBuildings);
    }
  }

  private expandBase(myBuildings: Building[], _gameState: any) {
    const barracks = myBuildings.filter((b) => b.type === "barracks");
    const vehicleFactories = myBuildings.filter(
      (b) => b.type === "vehicle_factory"
    );

    if (barracks.length === 0) {
      this.tryBuildBuilding("barracks", myBuildings);
    } else if (vehicleFactories.length === 0) {
      this.tryBuildBuilding("vehicle_factory", myBuildings);
    }
  }

  private tryBuildBuilding(
    buildingType: BuildingType,
    myBuildings: Building[]
  ) {
    const gameState = useGameStore.getState();
    const player = gameState.players.find((p) => p.id === this.playerId);
    if (!player) return;

    // Find a suitable position near existing buildings
    const commandCenter = myBuildings.find((b) => b.type === "command_center");
    if (!commandCenter) return;

    const position: Position = {
      x: commandCenter.position.x + Math.random() * 10 - 5,
      y: commandCenter.position.y + Math.random() * 10 - 5,
    };

    // Check if AI can afford the building
    const buildingCosts: Record<BuildingType, any> = {
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

    const cost = buildingCosts[buildingType];
    if (gameState.canAfford(this.playerId, cost)) {
      gameState.constructBuilding(buildingType, position);
    }
  }

  private attackEnemies(myUnits: Unit[], gameState: any) {
    const enemyUnits = gameState.units.filter(
      (u: Unit) => u.playerId !== this.playerId
    );
    const enemyBuildings = gameState.buildings.filter(
      (b: Building) => b.playerId !== this.playerId
    );

    if (enemyUnits.length === 0 && enemyBuildings.length === 0) return;

    // Group units for attack
    const attackUnits = myUnits.filter((u) => !u.isMoving);
    if (attackUnits.length < 3) return;

    // Find closest enemy target
    let closestTarget: Position | null = null;
    let closestDistance = Infinity;

    [...enemyUnits, ...enemyBuildings].forEach((target) => {
      const distance = Math.sqrt(
        Math.pow(attackUnits[0].position.x - target.position.x, 2) +
          Math.pow(attackUnits[0].position.y - target.position.y, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = target.position;
      }
    });

    if (closestTarget) {
      // Move attack units to enemy position
      attackUnits.forEach((unit) => {
        gameState.units = gameState.units.map((u: Unit) =>
          u.id === unit.id ? { ...u, target: closestTarget, isMoving: true } : u
        );
      });
    }
  }
}

export const createAIPlayer = (
  playerId: string,
  difficulty: "easy" | "medium" | "hard"
): AIPlayer => {
  let strategy: AIStrategy;

  switch (difficulty) {
    case "easy":
      strategy = {
        type: "defensive",
        buildOrder: ["barracks", "power_plant", "oil_refinery"],
        unitComposition: {
          infantry: 3,
          tank: 1,
          drone: 1,
          jet: 0,
          helicopter: 0,
          missile_launcher: 1,
          engineer: 1,
        },
        expansionTiming: 300,
        attackTiming: 600,
        defensePriority: 0.8,
      };
      break;
    case "hard":
      strategy = {
        type: "aggressive",
        buildOrder: ["barracks", "vehicle_factory", "airbase", "steel_mill"],
        unitComposition: {
          infantry: 2,
          tank: 3,
          drone: 2,
          jet: 1,
          helicopter: 1,
          missile_launcher: 2,
          engineer: 1,
        },
        expansionTiming: 120,
        attackTiming: 180,
        defensePriority: 0.3,
      };
      break;
    default: // medium
      strategy = {
        type: "balanced",
        buildOrder: [
          "barracks",
          "power_plant",
          "vehicle_factory",
          "oil_refinery",
        ],
        unitComposition: {
          infantry: 3,
          tank: 2,
          drone: 1,
          jet: 1,
          helicopter: 0,
          missile_launcher: 1,
          engineer: 1,
        },
        expansionTiming: 200,
        attackTiming: 400,
        defensePriority: 0.5,
      };
  }

  return new AIPlayer(playerId, strategy);
};

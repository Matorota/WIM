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
import { TerrainManager } from "../systems/TerrainManager";
import { IntelligentUnitController } from "../systems/IntelligentUnitController";

interface AIObjective {
  type: "build" | "attack" | "defend" | "expand" | "scout";
  priority: number;
  target?: Position | string;
  unitType?: UnitType;
  buildingType?: BuildingType;
  executionTime?: number;
}

interface EconomicPlan {
  targetWorkerCount: number;
  resourcePriority: "balanced" | "oil" | "steel";
  expansionThreshold: number;
  buildingQueue: BuildingType[];
  nextBuildTime: number;
}

interface MilitaryPlan {
  preferredUnits: UnitType[];
  targetArmySize: number;
  attackThreshold: number;
  defensePositions: Position[];
  aggressiveMode: boolean;
  lastAttackTime: number;
  unitProductionQueue: UnitType[];
}

interface StrategicState {
  phase: "early" | "mid" | "late";
  economicPlan: EconomicPlan;
  militaryPlan: MilitaryPlan;
  currentObjectives: AIObjective[];
  enemyThreatLevel: number;
  controlledArea: Position[];
}

export class AdvancedAI {
  private playerId: string;
  private strategy: AIStrategy;
  private lastDecisionTime: number = 0;
  private strategicState: StrategicState;
  private scoutPositions: Position[] = [];
  private lastScoutTime: number = 0;
  private terrainManager: TerrainManager;
  private unitController: IntelligentUnitController;

  constructor(playerId: string, strategy: AIStrategy) {
    this.playerId = playerId;
    this.strategy = strategy;
    this.strategicState = this.initializeStrategicState();
    this.initializeBuildOrder();
    this.terrainManager = new TerrainManager({ width: 50, height: 50 }); // 50x50 map
    this.unitController = new IntelligentUnitController(this.terrainManager);
  }

  private initializeStrategicState(): StrategicState {
    return {
      phase: "early",
      economicPlan: {
        targetWorkerCount: 15,
        resourcePriority: "balanced",
        expansionThreshold: 500,
        buildingQueue: ["power_plant", "barracks", "vehicle_factory", "defense_turret"],
        nextBuildTime: 0,
      },
      militaryPlan: {
        preferredUnits: ["infantry", "tank"],
        targetArmySize: 15,
        attackThreshold: 6,
        defensePositions: [],
        aggressiveMode: true,
        lastAttackTime: 0,
        unitProductionQueue: ["infantry", "infantry", "tank", "missile_launcher"],
      },
      currentObjectives: [],
      enemyThreatLevel: 0,
      controlledArea: [],
    };
  }

  private initializeBuildOrder(): void {
    // Build order is now handled by the building queue in economic plan
    // This method is kept for compatibility but no longer needed
  }

  public makeDecisions(): void {
    const gameStore = useGameStore.getState();
    const currentTime = Date.now();

    // Make decisions every 2 seconds
    if (currentTime - this.lastDecisionTime < 2000) return;
    this.lastDecisionTime = currentTime;

    const player = gameStore.players.find((p) => p.id === this.playerId);
    if (!player || !player.isAlive) return;

    const myUnits = gameStore.units.filter((u) => u.playerId === this.playerId);
    const myBuildings = gameStore.buildings.filter(
      (b) => b.playerId === this.playerId
    );
    const enemyUnits = gameStore.units.filter(
      (u) => u.playerId !== this.playerId
    );

    // Update unit controller with current game state
    this.unitController.update(myUnits, myBuildings, enemyUnits, 16); // ~60 FPS

    // Update strategic state
    this.updateStrategicState(myUnits, myBuildings, enemyUnits, player);

    // Execute strategic decisions
    this.executeEconomicDecisions(myUnits, myBuildings, player);
    this.executeMilitaryDecisions(myUnits, myBuildings, enemyUnits);
    this.executeScoutingDecisions(myUnits);
    this.executeDefensiveDecisions(myUnits, myBuildings, enemyUnits);
    this.executeAttackDecisions(myUnits, enemyUnits);
  }

  private updateStrategicState(
    myUnits: Unit[],
    myBuildings: Building[],
    enemyUnits: Unit[],
    _player: Player
  ): void {
    // Update game phase
    const totalUnits = myUnits.length;
    const totalBuildings = myBuildings.length;

    if (totalUnits < 10 && totalBuildings < 3) {
      this.strategicState.phase = "early";
    } else if (totalUnits < 25 && totalBuildings < 6) {
      this.strategicState.phase = "mid";
    } else {
      this.strategicState.phase = "late";
    }

    // Update threat level based on enemy proximity
    this.strategicState.enemyThreatLevel = this.calculateThreatLevel(
      myBuildings,
      enemyUnits
    );

    // Update economic plan based on phase
    switch (this.strategicState.phase) {
      case "early":
        this.strategicState.economicPlan.targetWorkerCount = 8;
        this.strategicState.militaryPlan.targetArmySize = 6;
        break;
      case "mid":
        this.strategicState.economicPlan.targetWorkerCount = 12;
        this.strategicState.militaryPlan.targetArmySize = 12;
        break;
      case "late":
        this.strategicState.economicPlan.targetWorkerCount = 16;
        this.strategicState.militaryPlan.targetArmySize = 20;
        break;
    }

    // Adjust strategy based on threat level
    if (this.strategicState.enemyThreatLevel > 0.7) {
      this.strategicState.militaryPlan.preferredUnits = ["tank", "infantry"];
    } else if (this.strategicState.enemyThreatLevel > 0.4) {
      this.strategicState.militaryPlan.preferredUnits = ["infantry", "drone"];
    }
  }

  private calculateThreatLevel(
    myBuildings: Building[],
    enemyUnits: Unit[]
  ): number {
    if (myBuildings.length === 0) return 0;

    const commandCenter = myBuildings.find((b) => b.type === "command_center");
    if (!commandCenter) return 0;

    let threatLevel = 0;
    const maxThreatDistance = 15;

    enemyUnits.forEach((enemy) => {
      const distance = this.getDistance(commandCenter.position, enemy.position);
      if (distance < maxThreatDistance) {
        const proximityThreat = 1 - distance / maxThreatDistance;
        const unitThreat = this.getUnitThreatValue(enemy.type);
        threatLevel += proximityThreat * unitThreat;
      }
    });

    return Math.min(threatLevel / 5, 1); // Normalize to 0-1
  }

  private getUnitThreatValue(unitType: UnitType): number {
    switch (unitType) {
      case "infantry":
        return 0.3;
      case "tank":
        return 0.8;
      case "jet":
        return 0.6;
      case "drone":
        return 0.4;
      case "helicopter":
        return 0.5;
      case "missile_launcher":
        return 0.9;
      case "engineer":
        return 0.1;
      default:
        return 0.5;
    }
  }

  private executeEconomicDecisions(
    myUnits: Unit[],
    myBuildings: Building[],
    player: Player
  ): void {
    const currentTime = Date.now();
    
    // Build workers if needed (using engineer units as workers)
    const workerCount = myUnits.filter((u) => u.type === "engineer").length;
    if (workerCount < this.strategicState.economicPlan.targetWorkerCount) {
      this.tryTrainUnit("engineer", myBuildings);
    }

    // Assign workers to resource zones intelligently
    this.assignWorkersToResources(myUnits);

    // Intelligent building construction based on queue and resources
    const totalResources = player.resources.oil + player.resources.steel + player.resources.energy;
    
    if (currentTime >= this.strategicState.economicPlan.nextBuildTime && totalResources >= 200) {
      if (this.strategicState.economicPlan.buildingQueue.length > 0) {
        const nextBuilding = this.strategicState.economicPlan.buildingQueue.shift()!;
        
        // Check if we have required resources for this specific building
        if (this.canAffordBuilding(nextBuilding, player.resources)) {
          this.tryBuildBuilding(nextBuilding, myBuildings);
          this.strategicState.economicPlan.nextBuildTime = currentTime + 5000; // Wait 5 seconds between builds
          
          // Replenish building queue based on current needs
          this.updateBuildingQueue(myBuildings, myUnits.length);
        } else {
          // Put building back at front of queue if can't afford
          this.strategicState.economicPlan.buildingQueue.unshift(nextBuilding);
        }
      } else {
        // Generate new building queue if empty
        this.updateBuildingQueue(myBuildings, myUnits.length);
      }
    }

    // Expand if resources are high and we have enough infrastructure
    if (totalResources >= this.strategicState.economicPlan.expansionThreshold && myBuildings.length >= 3) {
      this.tryExpand(myBuildings);
    }
  }

  private canAffordBuilding(buildingType: BuildingType, resources: Player['resources']): boolean {
    // Define building costs
    const costs = {
      command_center: { oil: 500, steel: 300, energy: 200 },
      power_plant: { oil: 150, steel: 100, energy: 50 },
      barracks: { oil: 200, steel: 150, energy: 100 },
      vehicle_factory: { oil: 300, steel: 250, energy: 150 },
      defense_turret: { oil: 100, steel: 200, energy: 50 },
    };

    const cost = costs[buildingType as keyof typeof costs];
    if (!cost) return false;

    return resources.oil >= cost.oil && 
           resources.steel >= cost.steel && 
           resources.energy >= cost.energy;
  }

  private updateBuildingQueue(myBuildings: Building[], totalUnits: number): void {
    const buildingCounts = {
      power_plant: myBuildings.filter(b => b.type === 'power_plant').length,
      barracks: myBuildings.filter(b => b.type === 'barracks').length,
      vehicle_factory: myBuildings.filter(b => b.type === 'vehicle_factory').length,
      defense_turret: myBuildings.filter(b => b.type === 'defense_turret').length,
    };

    // Smart building priorities based on current state
    if (buildingCounts.power_plant < 2) {
      this.strategicState.economicPlan.buildingQueue.push('power_plant');
    }
    
    if (buildingCounts.barracks < 2) {
      this.strategicState.economicPlan.buildingQueue.push('barracks');
    }
    
    if (buildingCounts.vehicle_factory < 1 && totalUnits > 5) {
      this.strategicState.economicPlan.buildingQueue.push('vehicle_factory');
    }
    
    if (buildingCounts.defense_turret < 3) {
      this.strategicState.economicPlan.buildingQueue.push('defense_turret');
    }

    // Add more production facilities as army grows
    if (totalUnits > 10) {
      if (buildingCounts.barracks < 3) {
        this.strategicState.economicPlan.buildingQueue.push('barracks');
      }
      if (buildingCounts.vehicle_factory < 2) {
        this.strategicState.economicPlan.buildingQueue.push('vehicle_factory');
      }
    }
  }

  private assignWorkersToResources(myUnits: Unit[]): void {
    const workers = myUnits.filter((u) => u.type === "engineer");
    const resourceZones = this.terrainManager.getResourceZones();

    // Find unassigned workers
    const unassignedWorkers = workers.filter((worker) => {
      // Check if worker is already assigned to a resource zone
      return !resourceZones.some((zone) =>
        zone.workersAssigned.includes(worker.id)
      );
    });

    // Assign workers to zones based on priority
    unassignedWorkers.forEach((worker) => {
      // Find the best resource zone for this worker
      const availableZones = resourceZones.filter(
        (zone) => !zone.isExhausted && zone.workersAssigned.length < 3 // Max 3 workers per zone
      );

      if (availableZones.length > 0) {
        // Sort zones by distance and resource priority
        const sortedZones = availableZones.sort((a, b) => {
          const distanceA = this.getDistance(worker.position, a.position);
          const distanceB = this.getDistance(worker.position, b.position);

          // Prioritize based on current economic plan
          const priorityA = this.getResourcePriority(a.type);
          const priorityB = this.getResourcePriority(b.type);

          // Combine distance and priority
          return distanceA / priorityA - distanceB / priorityB;
        });

        const bestZone = sortedZones[0];
        this.unitController.gatherResources(worker.id, bestZone.id, 5);
      }
    });
  }

  private getResourcePriority(
    resourceType: "oil" | "steel" | "energy"
  ): number {
    switch (this.strategicState.economicPlan.resourcePriority) {
      case "oil":
        return resourceType === "oil" ? 3 : resourceType === "steel" ? 2 : 1;
      case "steel":
        return resourceType === "steel" ? 3 : resourceType === "oil" ? 2 : 1;
      default: // balanced
        return 2; // Equal priority for all resources
    }
  }

  private executeMilitaryDecisions(
    myUnits: Unit[],
    myBuildings: Building[],
    enemyUnits: Unit[]
  ): void {
    const currentTime = Date.now();
    const militaryUnits = myUnits.filter((u) => u.type !== "engineer");
    const targetArmySize = this.strategicState.militaryPlan.targetArmySize;

    // Continuous unit production based on queue
    if (this.strategicState.militaryPlan.unitProductionQueue.length > 0) {
      const nextUnit = this.strategicState.militaryPlan.unitProductionQueue.shift()!;
      this.tryTrainUnit(nextUnit, myBuildings);
      // Always replenish production queue
      this.updateUnitProductionQueue(militaryUnits.length, enemyUnits.length);
    } else {
      this.updateUnitProductionQueue(militaryUnits.length, enemyUnits.length);
    }

    // Build military units if below target
    if (militaryUnits.length < targetArmySize) {
      const preferredUnit = this.strategicState.militaryPlan.preferredUnits[0];
      this.tryTrainUnit(preferredUnit, myBuildings);
    }

    // Set up defense positions
    if (this.strategicState.militaryPlan.defensePositions.length === 0) {
      this.establishDefensePositions(myBuildings);
    }

    // Organize units into combat groups
    this.organizeCombatGroups(militaryUnits, enemyUnits);

    // Execute combat tactics
    this.executeCombatTactics(militaryUnits, enemyUnits);

    // Aggressive attack strategy
    if (this.strategicState.militaryPlan.aggressiveMode && 
        militaryUnits.length >= this.strategicState.militaryPlan.attackThreshold &&
        currentTime - this.strategicState.militaryPlan.lastAttackTime > 30000) { // Attack every 30 seconds
      
      this.launchCoordinatedAttack(militaryUnits, enemyUnits);
      this.strategicState.militaryPlan.lastAttackTime = currentTime;
    }
  }

  private updateUnitProductionQueue(currentMilitaryCount: number, enemyCount: number): void {
    // Smart unit production based on current situation
    const queue = this.strategicState.militaryPlan.unitProductionQueue;
    
    // Always maintain basic infantry
    if (currentMilitaryCount < 3) {
      queue.push('infantry', 'infantry');
    }
    
    // Add heavy units as we grow
    if (currentMilitaryCount >= 3) {
      queue.push('tank');
    }
    
    // Counter enemy with specialized units
    if (enemyCount > 5) {
      queue.push('missile_launcher', 'helicopter');
    }
    
    // Advanced units for late game
    if (currentMilitaryCount > 8) {
      queue.push('jet', 'drone');
    }
    
    // Always have some basic units
    queue.push('infantry', 'tank');
  }

  private launchCoordinatedAttack(militaryUnits: Unit[], enemyUnits: Unit[]): void {
    if (enemyUnits.length === 0) return;

    // Find enemy base or concentrated enemy forces
    const enemyCenter = this.findEnemyCenter(enemyUnits);
    
    // Select attack force (leave some for defense)
    const attackForce = militaryUnits.slice(0, Math.floor(militaryUnits.length * 0.7));
    
    if (attackForce.length >= 3) {
      // Create coordinated attack group
      this.unitController.createCombatGroup(
        attackForce.map(u => u.id),
        'attack',
        enemyCenter
      );
      
      console.log(`AI launching coordinated attack with ${attackForce.length} units at position`, enemyCenter);
    }
  }

  private findEnemyCenter(enemyUnits: Unit[]): Position {
    if (enemyUnits.length === 0) return { x: 25, y: 25 };
    
    // Find the center of enemy forces
    const avgX = enemyUnits.reduce((sum, unit) => sum + unit.position.x, 0) / enemyUnits.length;
    const avgY = enemyUnits.reduce((sum, unit) => sum + unit.position.y, 0) / enemyUnits.length;
    
    return { x: Math.round(avgX), y: Math.round(avgY) };
  }

  private organizeCombatGroups(
    militaryUnits: Unit[],
    enemyUnits: Unit[]
  ): void {
    const currentGroups = this.unitController.getCombatGroups();
    const unassignedUnits = militaryUnits.filter(
      (unit) => !currentGroups.some((group) => group.unitIds.includes(unit.id))
    );

    if (unassignedUnits.length < 3) return; // Wait for more units

    // Create attack group if enemies are present
    if (enemyUnits.length > 0) {
      const attackUnits = unassignedUnits
        .filter(
          (unit) => unit.type === "tank" || unit.type === "missile_launcher"
        )
        .slice(0, 4);

      if (attackUnits.length >= 2) {
        const target = this.findBestAttackTarget(enemyUnits);
        this.unitController.createCombatGroup(
          attackUnits.map((u) => u.id),
          "attack",
          target
        );
      }
    }

    // Create defense group for base protection
    const defenseUnits = unassignedUnits
      .filter((unit) => unit.type === "infantry" || unit.type === "tank")
      .slice(0, 3);

    if (defenseUnits.length >= 2) {
      const commandCenter = this.getCommandCenter();
      if (commandCenter) {
        this.unitController.createCombatGroup(
          defenseUnits.map((u) => u.id),
          "defend",
          commandCenter.position
        );
      }
    }

    // Create scout group for reconnaissance
    const scoutUnits = unassignedUnits
      .filter((unit) => unit.type === "drone" || unit.type === "helicopter")
      .slice(0, 2);

    if (scoutUnits.length >= 1) {
      this.unitController.createCombatGroup(
        scoutUnits.map((u) => u.id),
        "scout"
      );
    }
  }

  private executeCombatTactics(
    militaryUnits: Unit[],
    enemyUnits: Unit[]
  ): void {
    // Assess immediate threats and respond
    const threats = this.unitController.getThreatMap();
    const highPriorityThreats = threats.filter(
      (threat) => threat.threatLevel > 0.7
    );

    if (highPriorityThreats.length > 0) {
      // Emergency response - send nearby units to counter threats
      highPriorityThreats.forEach((threat) => {
        const nearbyDefenders = militaryUnits.filter((unit) => {
          const distance = this.getDistance(unit.position, threat.position);
          return distance < 10 && !unit.target; // Not already engaged
        });

        nearbyDefenders.slice(0, 2).forEach((defender) => {
          this.unitController.attackTarget(defender.id, threat.enemyUnitId, 9);
        });
      });
    }

    // Coordinate group attacks when opportunity arises
    const attackGroups = this.unitController
      .getCombatGroups()
      .filter((group) => group.role === "attack");

    attackGroups.forEach((group) => {
      if (group.unitIds.length >= 3) {
        // Look for vulnerable enemy targets
        const vulnerableTargets = enemyUnits.filter((enemy) => {
          const nearbyAllies = enemyUnits.filter(
            (ally) =>
              ally.id !== enemy.id &&
              this.getDistance(ally.position, enemy.position) < 5
          ).length;
          return nearbyAllies < 2; // Isolated or weakly defended
        });

        if (vulnerableTargets.length > 0) {
          const target = vulnerableTargets[0];
          // Focus fire on vulnerable target
          group.unitIds.forEach(unitId => {
            this.unitController.attackTarget(unitId, target.id, 9);
          });
        }
      }
    });
  }

  private findBestAttackTarget(enemyUnits: Unit[]): Position {
    // Prioritize high-value targets
    const priorityTargets = enemyUnits.filter(
      (unit) => unit.type === "missile_launcher" || unit.type === "tank"
    );

    if (priorityTargets.length > 0) {
      return priorityTargets[0].position;
    }

    // Fall back to any enemy unit
    return enemyUnits[0]?.position || { x: 25, y: 25 };
  }

  private getCommandCenter(): Building | undefined {
    const gameStore = useGameStore.getState();
    const myBuildings = gameStore.buildings.filter(
      (b) => b.playerId === this.playerId
    );
    return myBuildings.find((b) => b.type === "command_center");
  }

  private executeScoutingDecisions(myUnits: Unit[]): void {
    const currentTime = Date.now();
    if (currentTime - this.lastScoutTime < 15000) return; // Scout every 15 seconds

    const scouts = myUnits
      .filter((u) => u.type === "drone" || u.type === "infantry")
      .slice(0, 2);
    if (scouts.length === 0) return;

    const gameStore = useGameStore.getState();
    const mapSize = gameStore.mapSize;

    // Generate scout positions if not set
    if (this.scoutPositions.length === 0) {
      this.scoutPositions = [
        { x: mapSize.width * 0.25, y: mapSize.height * 0.25 },
        { x: mapSize.width * 0.75, y: mapSize.height * 0.25 },
        { x: mapSize.width * 0.25, y: mapSize.height * 0.75 },
        { x: mapSize.width * 0.75, y: mapSize.height * 0.75 },
      ];
    }

    // Send scouts to unexplored areas using intelligent pathfinding
    scouts.forEach((scout, index) => {
      if (index < this.scoutPositions.length) {
        const targetPosition = this.scoutPositions[index];
        // Use unit controller for intelligent movement
        this.unitController.moveUnit(scout.id, targetPosition, 4);
      }
    });

    this.lastScoutTime = currentTime;
  }

  private executeDefensiveDecisions(
    myUnits: Unit[],
    myBuildings: Building[],
    enemyUnits: Unit[]
  ): void {
    const gameStore = useGameStore.getState();
    const commandCenter = myBuildings.find((b) => b.type === "command_center");
    if (!commandCenter) return;

    // Check for nearby enemies
    const nearbyEnemies = enemyUnits.filter(
      (enemy) => this.getDistance(commandCenter.position, enemy.position) < 10
    );

    if (nearbyEnemies.length > 0) {
      // Move idle military units to defend
      const defenders = myUnits.filter(
        (u) => u.type !== "engineer" && !u.target
      );

      defenders.forEach((defender) => {
        const closestEnemy = this.findClosestUnit(
          defender.position,
          nearbyEnemies
        );
        if (closestEnemy) {
          gameStore.selectUnits([defender.id]);
          gameStore.moveUnitsTo(closestEnemy.position);
        }
      });
    }
  }

  private executeAttackDecisions(myUnits: Unit[], enemyUnits: Unit[]): void {
    const militaryUnits = myUnits.filter((u) => u.type !== "engineer");
    const attackThreshold = this.strategicState.militaryPlan.attackThreshold;

    // Only attack if we have enough units
    if (militaryUnits.length < attackThreshold) return;

    const gameStore = useGameStore.getState();
    const enemyBuildings = gameStore.buildings.filter(
      (b) => b.playerId !== this.playerId
    );

    if (enemyBuildings.length === 0) return;

    // Find target based on strategy
    let target: Position;
    switch (this.strategy.type) {
      case "aggressive":
        // Target closest enemy building
        const closest = this.findClosestBuilding(
          militaryUnits[0].position,
          enemyBuildings
        );
        target = closest ? closest.position : enemyBuildings[0].position;
        break;
      case "defensive":
        // Only counter-attack
        const nearbyEnemies = enemyUnits.filter((enemy) =>
          militaryUnits.some(
            (unit) => this.getDistance(unit.position, enemy.position) < 8
          )
        );
        if (nearbyEnemies.length === 0) return;
        target = nearbyEnemies[0].position;
        break;
      default:
        // Balanced approach - target weakest enemy base
        const weakestBase = enemyBuildings.reduce((weakest, building) =>
          building.health < weakest.health ? building : weakest
        );
        target = weakestBase.position;
    }

    // Send attack force
    const attackForce = militaryUnits.slice(
      0,
      Math.floor(militaryUnits.length * 0.7)
    );
    const attackerIds = attackForce.map((unit) => unit.id);

    if (attackerIds.length > 0) {
      gameStore.selectUnits(attackerIds);
      gameStore.moveUnitsTo(target);
    }
  }

  private tryTrainUnit(unitType: UnitType, buildings: Building[]): void {
    const gameStore = useGameStore.getState();

    // Find appropriate building for unit type
    const trainingBuilding = buildings.find((building) => {
      if (!building.isConstructed) return false;

      switch (unitType) {
        case "infantry":
        case "engineer":
          return building.type === "barracks";
        case "tank":
          return building.type === "vehicle_factory";
        case "jet":
        case "helicopter":
          return building.type === "airbase";
        case "drone":
          return building.type === "research_lab";
        case "missile_launcher":
          return building.type === "defense_turret";
        default:
          return building.type === "barracks";
      }
    });

    if (trainingBuilding) {
      gameStore.produceUnit(trainingBuilding.id, unitType);
    }
  }

  private tryBuildBuilding(
    buildingType: BuildingType,
    buildings: Building[]
  ): void {
    const gameStore = useGameStore.getState();
    const commandCenter = buildings.find((b) => b.type === "command_center");
    if (!commandCenter) return;

    // Find suitable build position near command center
    const buildPosition = this.findBuildPosition(
      commandCenter.position,
      buildings
    );
    if (buildPosition) {
      gameStore.constructBuilding(buildingType, buildPosition);
    }
  }

  private tryExpand(buildings: Building[]): void {
    const gameStore = useGameStore.getState();
    const mapSize = gameStore.mapSize;

    // Find expansion position away from current base
    const expansionPosition = this.findExpansionPosition(buildings, mapSize);
    if (expansionPosition) {
      gameStore.constructBuilding("command_center", expansionPosition);
    }
  }

  private findBuildPosition(
    nearPosition: Position,
    existingBuildings: Building[]
  ): Position | null {
    const attempts = 20;
    const buildRadius = 8;

    for (let i = 0; i < attempts; i++) {
      const angle = (Math.PI * 2 * i) / attempts;
      const radius = 3 + (i / attempts) * buildRadius;

      const candidate: Position = {
        x: Math.round(nearPosition.x + Math.cos(angle) * radius),
        y: Math.round(nearPosition.y + Math.sin(angle) * radius),
      };

      // Check if position is clear
      const isClear = !existingBuildings.some(
        (building) => this.getDistance(building.position, candidate) < 3
      );

      if (isClear && candidate.x >= 0 && candidate.y >= 0) {
        return candidate;
      }
    }

    return null;
  }

  private findExpansionPosition(
    buildings: Building[],
    mapSize: { width: number; height: number }
  ): Position | null {
    const commandCenters = buildings.filter((b) => b.type === "command_center");
    if (commandCenters.length === 0) return null;

    const expansionCandidates: Position[] = [
      {
        x: Math.floor(mapSize.width * 0.2),
        y: Math.floor(mapSize.height * 0.2),
      },
      {
        x: Math.floor(mapSize.width * 0.8),
        y: Math.floor(mapSize.height * 0.2),
      },
      {
        x: Math.floor(mapSize.width * 0.2),
        y: Math.floor(mapSize.height * 0.8),
      },
      {
        x: Math.floor(mapSize.width * 0.8),
        y: Math.floor(mapSize.height * 0.8),
      },
      {
        x: Math.floor(mapSize.width * 0.5),
        y: Math.floor(mapSize.height * 0.2),
      },
      {
        x: Math.floor(mapSize.width * 0.5),
        y: Math.floor(mapSize.height * 0.8),
      },
    ];

    // Find position furthest from existing command centers
    let bestPosition: Position | null = null;
    let maxDistance = 0;

    expansionCandidates.forEach((candidate) => {
      const minDistanceToExisting = Math.min(
        ...commandCenters.map((cc) => this.getDistance(cc.position, candidate))
      );

      if (minDistanceToExisting > maxDistance) {
        maxDistance = minDistanceToExisting;
        bestPosition = candidate;
      }
    });

    return bestPosition;
  }

  private establishDefensePositions(buildings: Building[]): void {
    const commandCenter = buildings.find((b) => b.type === "command_center");
    if (!commandCenter) return;

    // Create defensive perimeter around command center
    const defenseRadius = 6;
    const positions = 8;

    for (let i = 0; i < positions; i++) {
      const angle = (Math.PI * 2 * i) / positions;
      const position: Position = {
        x: Math.round(
          commandCenter.position.x + Math.cos(angle) * defenseRadius
        ),
        y: Math.round(
          commandCenter.position.y + Math.sin(angle) * defenseRadius
        ),
      };
      this.strategicState.militaryPlan.defensePositions.push(position);
    }
  }

  private findClosestUnit(position: Position, units: Unit[]): Unit | null {
    if (units.length === 0) return null;

    return units.reduce((closest, unit) => {
      const distance = this.getDistance(position, unit.position);
      const closestDistance = this.getDistance(position, closest.position);
      return distance < closestDistance ? unit : closest;
    });
  }

  private findClosestBuilding(
    position: Position,
    buildings: Building[]
  ): Building | null {
    if (buildings.length === 0) return null;

    return buildings.reduce((closest, building) => {
      const distance = this.getDistance(position, building.position);
      const closestDistance = this.getDistance(position, closest.position);
      return distance < closestDistance ? building : closest;
    });
  }

  private getDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
  }

  // Public methods for external integration
  public getStrategicState(): StrategicState {
    return this.strategicState;
  }

  public setStrategy(strategy: AIStrategy): void {
    this.strategy = strategy;
    this.initializeBuildOrder();
  }

  public getCurrentPhase(): string {
    return this.strategicState.phase;
  }

  public getThreatLevel(): number {
    return this.strategicState.enemyThreatLevel;
  }
}

export default AdvancedAI;

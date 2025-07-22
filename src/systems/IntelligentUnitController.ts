import type { Unit, Building, Position, UnitType } from "../types/game";
import { TerrainManager } from "./TerrainManager";

export interface UnitCommand {
  id: string;
  unitId: string;
  type: "move" | "attack" | "gather" | "patrol" | "guard" | "build_assist";
  target: Position | string;
  priority: number;
  createdAt: number;
  issuedBy: "player" | "ai";
}

export interface CombatGroup {
  id: string;
  unitIds: string[];
  role: "attack" | "defend" | "scout" | "raid";
  target?: Position;
  formation: Position[];
  leader?: string;
}

export interface ThreatAssessment {
  enemyUnitId: string;
  position: Position;
  threatLevel: number;
  unitType: UnitType;
  lastSeen: number;
  isEngaged: boolean;
}

export class IntelligentUnitController {
  private terrainManager: TerrainManager;
  private activeCommands: Map<string, UnitCommand> = new Map();
  private combatGroups: Map<string, CombatGroup> = new Map();
  private threatMap: Map<string, ThreatAssessment> = new Map();
  private unitPaths: Map<string, Position[]> = new Map();

  constructor(terrainManager: TerrainManager) {
    this.terrainManager = terrainManager;
  }

  public update(
    units: Unit[],
    buildings: Building[],
    enemyUnits: Unit[],
    _deltaTime: number
  ): void {
    // Update threat assessments
    this.updateThreatAssessment(enemyUnits);

    // Process active commands
    this.processCommands(units, buildings, _deltaTime);

    // Update combat groups
    this.updateCombatGroups(units, enemyUnits);

    // Execute intelligent behaviors
    this.executeUnitBehaviors(units, buildings, enemyUnits);
  }

  private updateThreatAssessment(enemyUnits: Unit[]): void {
    // Clear old threats
    const currentTime = Date.now();
    for (const [id, threat] of this.threatMap.entries()) {
      if (currentTime - threat.lastSeen > 30000) {
        // 30 seconds
        this.threatMap.delete(id);
      }
    }

    // Update current threats
    enemyUnits.forEach((enemy) => {
      const threat: ThreatAssessment = {
        enemyUnitId: enemy.id,
        position: enemy.position,
        threatLevel: this.calculateThreatLevel(enemy),
        unitType: enemy.type,
        lastSeen: currentTime,
        isEngaged: false,
      };

      this.threatMap.set(enemy.id, threat);
    });
  }

  private calculateThreatLevel(enemy: Unit): number {
    let threatLevel = 1;

    // Base threat by unit type
    switch (enemy.type) {
      case "tank":
        threatLevel = 0.9;
        break;
      case "missile_launcher":
        threatLevel = 1.0;
        break;
      case "jet":
        threatLevel = 0.7;
        break;
      case "helicopter":
        threatLevel = 0.6;
        break;
      case "infantry":
        threatLevel = 0.3;
        break;
      case "drone":
        threatLevel = 0.4;
        break;
      case "engineer":
        threatLevel = 0.1;
        break;
    }

    // Modify by health
    threatLevel *= enemy.health / enemy.maxHealth;

    return threatLevel;
  }

  public issueCommand(command: UnitCommand): void {
    this.activeCommands.set(command.id, command);
  }

  public createCombatGroup(
    unitIds: string[],
    role: CombatGroup["role"],
    target?: Position
  ): string {
    const groupId = `group_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const group: CombatGroup = {
      id: groupId,
      unitIds: [...unitIds],
      role,
      target,
      formation: this.calculateFormation(unitIds.length, role),
      leader: unitIds[0], // First unit is leader
    };

    this.combatGroups.set(groupId, group);
    return groupId;
  }

  private calculateFormation(
    unitCount: number,
    role: CombatGroup["role"]
  ): Position[] {
    const formation: Position[] = [];

    switch (role) {
      case "attack":
        // Line formation for attacks
        for (let i = 0; i < unitCount; i++) {
          formation.push({ x: i * 2, y: 0 });
        }
        break;

      case "defend":
        // Arc formation for defense
        const arcRadius = Math.max(2, unitCount / 2);
        for (let i = 0; i < unitCount; i++) {
          const angle = (i / (unitCount - 1)) * Math.PI - Math.PI / 2;
          formation.push({
            x: Math.cos(angle) * arcRadius,
            y: Math.sin(angle) * arcRadius,
          });
        }
        break;

      case "scout":
        // Spread formation for scouting
        for (let i = 0; i < unitCount; i++) {
          const angle = (i / unitCount) * 2 * Math.PI;
          formation.push({
            x: Math.cos(angle) * 3,
            y: Math.sin(angle) * 3,
          });
        }
        break;

      case "raid":
        // Tight formation for raids
        for (let i = 0; i < unitCount; i++) {
          formation.push({ x: (i % 2) * 1.5, y: Math.floor(i / 2) * 1.5 });
        }
        break;
    }

    return formation;
  }

  private processCommands(
    units: Unit[],
    buildings: Building[],
    _deltaTime: number
  ): void {
    const currentTime = Date.now();
    const commandsToRemove: string[] = [];

    for (const [commandId, command] of this.activeCommands.entries()) {
      const unit = units.find((u) => u.id === command.unitId);
      if (!unit) {
        commandsToRemove.push(commandId);
        continue;
      }

      switch (command.type) {
        case "move":
          this.executeMoveCommand(
            unit,
            command.target as Position,
            units,
            buildings
          );
          break;

        case "attack":
          this.executeAttackCommand(unit, command.target as string, units);
          break;

        case "gather":
          this.executeGatherCommand(unit, command.target as string);
          break;

        case "patrol":
          this.executePatrolCommand(
            unit,
            command.target as Position,
            units,
            buildings
          );
          break;

        case "guard":
          this.executeGuardCommand(unit, command.target as string, units);
          break;
      }

      // Remove old commands
      if (currentTime - command.createdAt > 60000) {
        // 1 minute timeout
        commandsToRemove.push(commandId);
      }
    }

    commandsToRemove.forEach((id) => this.activeCommands.delete(id));
  }

  private executeMoveCommand(
    unit: Unit,
    target: Position,
    units: Unit[],
    buildings: Building[]
  ): void {
    const distance = this.getDistance(unit.position, target);

    if (distance < 1) {
      // Reached destination
      this.activeCommands.delete(unit.id);
      return;
    }

    // Get or calculate path
    let path = this.unitPaths.get(unit.id);
    if (!path || path.length === 0) {
      path = this.terrainManager.findPath(
        unit.position,
        target,
        units,
        buildings
      );
      this.unitPaths.set(unit.id, path);
    }

    // Move along path
    if (path.length > 1) {
      const nextPoint = path[1];
      const moveDistance = unit.speed * 0.016; // Assuming 60 FPS

      const direction = {
        x: nextPoint.x - unit.position.x,
        y: nextPoint.y - unit.position.y,
      };

      const directionLength = Math.sqrt(
        direction.x * direction.x + direction.y * direction.y
      );

      if (directionLength > 0) {
        direction.x /= directionLength;
        direction.y /= directionLength;

        unit.position.x += direction.x * moveDistance;
        unit.position.y += direction.y * moveDistance;

        // Check if reached next waypoint
        if (this.getDistance(unit.position, nextPoint) < 0.5) {
          path.shift(); // Remove reached waypoint
        }
      }
    }
  }

  private executeAttackCommand(
    unit: Unit,
    targetId: string,
    units: Unit[]
  ): void {
    const target = units.find((u) => u.id === targetId);
    if (!target) {
      this.activeCommands.delete(unit.id);
      return;
    }

    const distance = this.getDistance(unit.position, target.position);

    if (distance <= unit.range) {
      // In range, attack
      this.performAttack(unit, target);
    } else {
      // Move closer
      const moveCommand: UnitCommand = {
        id: `move_${unit.id}_${Date.now()}`,
        unitId: unit.id,
        type: "move",
        target: target.position,
        priority: 8,
        createdAt: Date.now(),
        issuedBy: "ai",
      };
      this.issueCommand(moveCommand);
    }
  }

  private executeGatherCommand(unit: Unit, zoneId: string): void {
    const resourceZones = this.terrainManager.getResourceZones();
    const zone = resourceZones.find((z) => z.id === zoneId);

    if (!zone || zone.isExhausted) {
      this.activeCommands.delete(unit.id);
      return;
    }

    const distance = this.getDistance(unit.position, zone.position);

    if (distance <= zone.radius) {
      // In gathering range
      if (!zone.workersAssigned.includes(unit.id)) {
        this.terrainManager.assignWorkerToZone(unit.id, zoneId);
      }
    } else {
      // Move to resource zone
      const moveCommand: UnitCommand = {
        id: `move_${unit.id}_${Date.now()}`,
        unitId: unit.id,
        type: "move",
        target: zone.position,
        priority: 5,
        createdAt: Date.now(),
        issuedBy: "ai",
      };
      this.issueCommand(moveCommand);
    }
  }

  private executePatrolCommand(
    unit: Unit,
    patrolPoint: Position,
    units: Unit[],
    buildings: Building[]
  ): void {
    // Simple patrol between unit's starting position and patrol point
    const startPos = unit.position; // Should store original position
    const distance1 = this.getDistance(unit.position, patrolPoint);
    const distance2 = this.getDistance(unit.position, startPos);

    const target = distance1 < distance2 ? startPos : patrolPoint;
    this.executeMoveCommand(unit, target, units, buildings);
  }

  private executeGuardCommand(
    unit: Unit,
    targetId: string,
    units: Unit[]
  ): void {
    const guardTarget = units.find((u) => u.id === targetId);
    if (!guardTarget) {
      this.activeCommands.delete(unit.id);
      return;
    }

    // Stay close to guard target
    const distance = this.getDistance(unit.position, guardTarget.position);
    if (distance > 3) {
      const moveCommand: UnitCommand = {
        id: `move_${unit.id}_${Date.now()}`,
        unitId: unit.id,
        type: "move",
        target: guardTarget.position,
        priority: 6,
        createdAt: Date.now(),
        issuedBy: "ai",
      };
      this.issueCommand(moveCommand);
    }

    // Look for nearby threats
    const nearbyThreats = Array.from(this.threatMap.values()).filter(
      (threat) => this.getDistance(threat.position, guardTarget.position) < 8
    );

    if (nearbyThreats.length > 0) {
      const closestThreat = nearbyThreats.reduce((closest, threat) =>
        this.getDistance(threat.position, unit.position) <
        this.getDistance(closest.position, unit.position)
          ? threat
          : closest
      );

      const attackCommand: UnitCommand = {
        id: `attack_${unit.id}_${Date.now()}`,
        unitId: unit.id,
        type: "attack",
        target: closestThreat.enemyUnitId,
        priority: 9,
        createdAt: Date.now(),
        issuedBy: "ai",
      };
      this.issueCommand(attackCommand);
    }
  }

  private updateCombatGroups(units: Unit[], enemyUnits: Unit[]): void {
    for (const [groupId, group] of this.combatGroups.entries()) {
      // Remove dead units from group
      group.unitIds = group.unitIds.filter((unitId) =>
        units.some((unit) => unit.id === unitId)
      );

      if (group.unitIds.length === 0) {
        this.combatGroups.delete(groupId);
        continue;
      }

      // Update group behavior based on role
      switch (group.role) {
        case "attack":
          this.updateAttackGroup(group, units, enemyUnits);
          break;
        case "defend":
          this.updateDefenseGroup(group, units, enemyUnits);
          break;
        case "scout":
          this.updateScoutGroup(group, units);
          break;
        case "raid":
          this.updateRaidGroup(group, units, enemyUnits);
          break;
      }
    }
  }

  private updateAttackGroup(
    group: CombatGroup,
    units: Unit[],
    enemyUnits: Unit[]
  ): void {
    if (!group.target) return;

    const groupUnits = units.filter((unit) => group.unitIds.includes(unit.id));

    // Find nearest enemy to target
    const nearestEnemy = enemyUnits.reduce((nearest, enemy) => {
      const distanceToTarget = this.getDistance(enemy.position, group.target!);
      const nearestDistance = this.getDistance(nearest.position, group.target!);
      return distanceToTarget < nearestDistance ? enemy : nearest;
    }, enemyUnits[0]);

    if (nearestEnemy) {
      // Issue attack commands to all group members
      groupUnits.forEach((unit) => {
        const attackCommand: UnitCommand = {
          id: `group_attack_${unit.id}_${Date.now()}`,
          unitId: unit.id,
          type: "attack",
          target: nearestEnemy.id,
          priority: 8,
          createdAt: Date.now(),
          issuedBy: "ai",
        };
        this.issueCommand(attackCommand);
      });
    }
  }

  private updateDefenseGroup(
    group: CombatGroup,
    units: Unit[],
    enemyUnits: Unit[]
  ): void {
    if (!group.target) return;

    const groupUnits = units.filter((unit) => group.unitIds.includes(unit.id));

    // Position units in defensive formation around target
    groupUnits.forEach((unit, index) => {
      if (index < group.formation.length) {
        const formationPos = {
          x: group.target!.x + group.formation[index].x,
          y: group.target!.y + group.formation[index].y,
        };

        const distance = this.getDistance(unit.position, formationPos);
        if (distance > 1) {
          const moveCommand: UnitCommand = {
            id: `defense_move_${unit.id}_${Date.now()}`,
            unitId: unit.id,
            type: "move",
            target: formationPos,
            priority: 7,
            createdAt: Date.now(),
            issuedBy: "ai",
          };
          this.issueCommand(moveCommand);
        }
      }
    });

    // Attack nearby enemies
    const nearbyEnemies = enemyUnits.filter(
      (enemy) => this.getDistance(enemy.position, group.target!) < 12
    );

    if (nearbyEnemies.length > 0) {
      groupUnits.forEach((unit) => {
        const closestEnemy = nearbyEnemies.reduce((closest, enemy) =>
          this.getDistance(enemy.position, unit.position) <
          this.getDistance(closest.position, unit.position)
            ? enemy
            : closest
        );

        const attackCommand: UnitCommand = {
          id: `defense_attack_${unit.id}_${Date.now()}`,
          unitId: unit.id,
          type: "attack",
          target: closestEnemy.id,
          priority: 8,
          createdAt: Date.now(),
          issuedBy: "ai",
        };
        this.issueCommand(attackCommand);
      });
    }
  }

  private updateScoutGroup(group: CombatGroup, units: Unit[]): void {
    const groupUnits = units.filter((unit) => group.unitIds.includes(unit.id));

    // Spread scouts across the map
    groupUnits.forEach((unit, index) => {
      if (index < group.formation.length) {
        const scoutTarget = {
          x: group.target?.x || 25 + group.formation[index].x * 5,
          y: group.target?.y || 25 + group.formation[index].y * 5,
        };

        const moveCommand: UnitCommand = {
          id: `scout_move_${unit.id}_${Date.now()}`,
          unitId: unit.id,
          type: "patrol",
          target: scoutTarget,
          priority: 4,
          createdAt: Date.now(),
          issuedBy: "ai",
        };
        this.issueCommand(moveCommand);
      }
    });
  }

  private updateRaidGroup(
    group: CombatGroup,
    units: Unit[],
    enemyUnits: Unit[]
  ): void {
    const groupUnits = units.filter((unit) => group.unitIds.includes(unit.id));

    // Target isolated enemy units or weak buildings
    const isolatedEnemies = enemyUnits.filter((enemy) => {
      const nearbyAllies = enemyUnits.filter(
        (ally) =>
          ally.id !== enemy.id &&
          this.getDistance(ally.position, enemy.position) < 5
      ).length;
      return nearbyAllies < 2;
    });

    if (isolatedEnemies.length > 0) {
      const target = isolatedEnemies[0];

      groupUnits.forEach((unit) => {
        const attackCommand: UnitCommand = {
          id: `raid_attack_${unit.id}_${Date.now()}`,
          unitId: unit.id,
          type: "attack",
          target: target.id,
          priority: 7,
          createdAt: Date.now(),
          issuedBy: "ai",
        };
        this.issueCommand(attackCommand);
      });
    }
  }

  private executeUnitBehaviors(
    units: Unit[],
    _buildings: Building[],
    _enemyUnits: Unit[]
  ): void {
    units.forEach((unit) => {
      // Skip units with active commands
      if (this.activeCommands.has(unit.id)) return;

      // Automatic threat response
      const nearbyThreats = Array.from(this.threatMap.values()).filter(
        (threat) =>
          this.getDistance(threat.position, unit.position) < unit.range + 2
      );

      if (nearbyThreats.length > 0) {
        const closestThreat = nearbyThreats.reduce((closest, threat) =>
          this.getDistance(threat.position, unit.position) <
          this.getDistance(closest.position, unit.position)
            ? threat
            : closest
        );

        const attackCommand: UnitCommand = {
          id: `auto_attack_${unit.id}_${Date.now()}`,
          unitId: unit.id,
          type: "attack",
          target: closestThreat.enemyUnitId,
          priority: 6,
          createdAt: Date.now(),
          issuedBy: "ai",
        };
        this.issueCommand(attackCommand);
      }
    });
  }

  private performAttack(attacker: Unit, target: Unit): void {
    // Simple attack logic - reduce target health
    const damage = Math.min(attacker.damage, target.health);
    target.health -= damage;

    if (target.health <= 0) {
      // Target destroyed, remove attack command
      this.activeCommands.delete(attacker.id);
    }
  }

  private getDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
  }

  // Public API methods
  public moveUnit(
    unitId: string,
    target: Position,
    priority: number = 5
  ): void {
    const command: UnitCommand = {
      id: `move_${unitId}_${Date.now()}`,
      unitId,
      type: "move",
      target,
      priority,
      createdAt: Date.now(),
      issuedBy: "player",
    };
    this.issueCommand(command);
  }

  public attackTarget(
    unitId: string,
    targetId: string,
    priority: number = 8
  ): void {
    const command: UnitCommand = {
      id: `attack_${unitId}_${Date.now()}`,
      unitId,
      type: "attack",
      target: targetId,
      priority,
      createdAt: Date.now(),
      issuedBy: "player",
    };
    this.issueCommand(command);
  }

  public gatherResources(
    unitId: string,
    zoneId: string,
    priority: number = 4
  ): void {
    const command: UnitCommand = {
      id: `gather_${unitId}_${Date.now()}`,
      unitId,
      type: "gather",
      target: zoneId,
      priority,
      createdAt: Date.now(),
      issuedBy: "player",
    };
    this.issueCommand(command);
  }

  public getThreatMap(): ThreatAssessment[] {
    return Array.from(this.threatMap.values());
  }

  public getCombatGroups(): CombatGroup[] {
    return Array.from(this.combatGroups.values());
  }
}

export default IntelligentUnitController;

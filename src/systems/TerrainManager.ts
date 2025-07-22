import type { Position, Unit, Building } from "../types/game";

export interface ResourceZone {
  id: string;
  type: "oil" | "steel" | "energy";
  position: Position;
  radius: number;
  totalResources: number;
  remainingResources: number;
  gatheringRate: number;
  workersAssigned: string[];
  isExhausted: boolean;
}

export interface TerrainTile {
  position: Position;
  type: "grass" | "water" | "mountain" | "forest" | "road";
  isPassable: boolean;
  movementCost: number;
  resourceZone?: ResourceZone;
}

export interface PathNode {
  position: Position;
  gCost: number; // Distance from start
  hCost: number; // Distance to target
  fCost: number; // Total cost
  parent?: PathNode;
}

export class TerrainManager {
  private terrain: TerrainTile[][] = [];
  private resourceZones: Map<string, ResourceZone> = new Map();
  private mapSize: { width: number; height: number };

  constructor(mapSize: { width: number; height: number }) {
    this.mapSize = mapSize;
    this.generateTerrain();
    this.generateResourceZones();
  }

  private generateTerrain(): void {
    // Initialize terrain grid
    for (let y = 0; y < this.mapSize.height; y++) {
      this.terrain[y] = [];
      for (let x = 0; x < this.mapSize.width; x++) {
        // Generate realistic terrain distribution
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - this.mapSize.width / 2, 2) +
            Math.pow(y - this.mapSize.height / 2, 2)
        );

        let terrainType: TerrainTile["type"] = "grass";
        let isPassable = true;
        let movementCost = 1;

        // Generate varied terrain based on noise and position
        const noiseValue = this.generateNoise(x, y);

        if (noiseValue > 0.7) {
          terrainType = "mountain";
          isPassable = false;
          movementCost = Infinity;
        } else if (noiseValue > 0.5) {
          terrainType = "forest";
          movementCost = 2;
        } else if (noiseValue < 0.2 && distanceFromCenter > 10) {
          terrainType = "water";
          isPassable = false;
          movementCost = Infinity;
        } else if (Math.random() > 0.9) {
          terrainType = "road";
          movementCost = 0.5;
        }

        // Add random obstacles
        if (isPassable && Math.random() > 0.95 && distanceFromCenter > 5) {
          terrainType = "mountain";
          isPassable = false;
          movementCost = Infinity;
        }

        this.terrain[y][x] = {
          position: { x, y },
          type: terrainType,
          isPassable,
          movementCost,
        };
      }
    }

    // Ensure spawn areas are clear
    this.clearSpawnAreas();
  }

  private clearSpawnAreas(): void {
    // Clear areas around player spawn points
    const spawnAreas = [
      { x: 5, y: 5 }, // Top-left spawn
      { x: this.mapSize.width - 5, y: this.mapSize.height - 5 }, // Bottom-right spawn
    ];

    spawnAreas.forEach((spawn) => {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = spawn.x + dx;
          const y = spawn.y + dy;

          if (
            x >= 0 &&
            x < this.mapSize.width &&
            y >= 0 &&
            y < this.mapSize.height
          ) {
            this.terrain[y][x] = {
              position: { x, y },
              type: "grass",
              isPassable: true,
              movementCost: 1,
            };
          }
        }
      }
    });
  }

  private generateNoise(x: number, y: number): number {
    // Simple Perlin-like noise for terrain generation
    const frequency = 0.1;
    return (
      (Math.sin(x * frequency) * Math.cos(y * frequency) +
        Math.sin(x * frequency * 2) * Math.cos(y * frequency * 2) * 0.5 +
        Math.sin(x * frequency * 4) * Math.cos(y * frequency * 4) * 0.25) /
        1.75 +
      0.5
    );
  }

  private generateResourceZones(): void {
    const resourceTypes: ResourceZone["type"][] = ["oil", "steel", "energy"];
    const zonesPerType = 3;

    resourceTypes.forEach((resourceType) => {
      for (let i = 0; i < zonesPerType; i++) {
        const position = this.findValidResourcePosition();
        if (position) {
          const zone: ResourceZone = {
            id: `${resourceType}_${i}`,
            type: resourceType,
            position,
            radius: 3,
            totalResources: 5000 + Math.random() * 3000,
            remainingResources: 0,
            gatheringRate:
              resourceType === "oil" ? 50 : resourceType === "steel" ? 40 : 60,
            workersAssigned: [],
            isExhausted: false,
          };
          zone.remainingResources = zone.totalResources;

          this.resourceZones.set(zone.id, zone);

          // Mark terrain tiles within the zone
          for (
            let y = Math.max(0, position.y - zone.radius);
            y <= Math.min(this.mapSize.height - 1, position.y + zone.radius);
            y++
          ) {
            for (
              let x = Math.max(0, position.x - zone.radius);
              x <= Math.min(this.mapSize.width - 1, position.x + zone.radius);
              x++
            ) {
              const distance = Math.sqrt(
                Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2)
              );
              if (distance <= zone.radius) {
                this.terrain[y][x].resourceZone = zone;
              }
            }
          }
        }
      }
    });
  }

  private findValidResourcePosition(): Position | null {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(Math.random() * this.mapSize.width);
      const y = Math.floor(Math.random() * this.mapSize.height);

      // Check if position is valid (not water or mountain, not too close to other resources)
      if (
        this.terrain[y] &&
        this.terrain[y][x] &&
        this.terrain[y][x].isPassable &&
        !this.terrain[y][x].resourceZone
      ) {
        // Check distance from other resource zones
        let tooClose = false;
        for (const zone of this.resourceZones.values()) {
          const distance = Math.sqrt(
            Math.pow(x - zone.position.x, 2) + Math.pow(y - zone.position.y, 2)
          );
          if (distance < 10) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          return { x, y };
        }
      }
    }

    return null;
  }

  public findPath(
    start: Position,
    end: Position,
    units: Unit[],
    buildings: Building[]
  ): Position[] {
    // A* pathfinding algorithm with obstacle avoidance
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      position: start,
      gCost: 0,
      hCost: this.getDistance(start, end),
      fCost: 0,
    };
    startNode.fCost = startNode.gCost + startNode.hCost;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest fCost
      let currentNode = openSet[0];
      let currentIndex = 0;

      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost) {
          currentNode = openSet[i];
          currentIndex = i;
        }
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(`${currentNode.position.x},${currentNode.position.y}`);

      // Check if we reached the goal
      if (this.getDistance(currentNode.position, end) < 1) {
        return this.reconstructPath(currentNode);
      }

      // Check all neighbors
      const neighbors = this.getNeighbors(currentNode.position);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (
          closedSet.has(neighborKey) ||
          !this.isPassable(neighbor, units, buildings)
        ) {
          continue;
        }

        const gCost = currentNode.gCost + this.getMovementCost(neighbor);
        const hCost = this.getDistance(neighbor, end);
        const fCost = gCost + hCost;

        const existingNode = openSet.find(
          (node) =>
            node.position.x === neighbor.x && node.position.y === neighbor.y
        );

        if (!existingNode) {
          openSet.push({
            position: neighbor,
            gCost,
            hCost,
            fCost,
            parent: currentNode,
          });
        } else if (gCost < existingNode.gCost) {
          existingNode.gCost = gCost;
          existingNode.fCost = gCost + existingNode.hCost;
          existingNode.parent = currentNode;
        }
      }
    }

    // No path found, return direct line as fallback
    return [end];
  }

  private getNeighbors(position: Position): Position[] {
    const neighbors: Position[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const x = position.x + dx;
        const y = position.y + dy;

        if (
          x >= 0 &&
          x < this.mapSize.width &&
          y >= 0 &&
          y < this.mapSize.height
        ) {
          neighbors.push({ x, y });
        }
      }
    }

    return neighbors;
  }

  private isPassable(
    position: Position,
    units: Unit[],
    buildings: Building[]
  ): boolean {
    // Check terrain passability
    if (!this.terrain[position.y] || !this.terrain[position.y][position.x]) {
      return false;
    }

    const tile = this.terrain[position.y][position.x];
    if (!tile.isPassable) {
      return false;
    }

    // Check for building obstacles (buildings need more space)
    for (const building of buildings) {
      const distance = this.getDistance(position, building.position);
      if (distance < 2.5) {
        // Buildings block a larger area
        return false;
      }
    }

    // More lenient unit collision (allow some overlap for better movement)
    const nearbyUnits = units.filter(
      (unit) => this.getDistance(position, unit.position) < 0.8
    );

    return nearbyUnits.length < 1; // Only allow one unit per tile
  }

  private getMovementCost(position: Position): number {
    if (!this.terrain[position.y] || !this.terrain[position.y][position.x]) {
      return Infinity;
    }

    return this.terrain[position.y][position.x].movementCost;
  }

  private reconstructPath(node: PathNode): Position[] {
    const path: Position[] = [];
    let current: PathNode | undefined = node;

    while (current) {
      path.unshift(current.position);
      current = current.parent;
    }

    return path;
  }

  private getDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
  }

  public getTerrain(): TerrainTile[][] {
    return this.terrain;
  }

  public getResourceZones(): ResourceZone[] {
    return Array.from(this.resourceZones.values());
  }

  public getResourceZone(position: Position): ResourceZone | undefined {
    if (!this.terrain[position.y] || !this.terrain[position.y][position.x]) {
      return undefined;
    }

    return this.terrain[position.y][position.x].resourceZone;
  }

  public assignWorkerToZone(workerId: string, zoneId: string): boolean {
    const zone = this.resourceZones.get(zoneId);
    if (zone && !zone.isExhausted && zone.workersAssigned.length < 5) {
      zone.workersAssigned.push(workerId);
      return true;
    }
    return false;
  }

  public removeWorkerFromZone(workerId: string, zoneId: string): void {
    const zone = this.resourceZones.get(zoneId);
    if (zone) {
      zone.workersAssigned = zone.workersAssigned.filter(
        (id) => id !== workerId
      );
    }
  }

  public gatherResources(zoneId: string, deltaTime: number): number {
    const zone = this.resourceZones.get(zoneId);
    if (!zone || zone.isExhausted || zone.workersAssigned.length === 0) {
      return 0;
    }

    const gathered = Math.min(
      (zone.gatheringRate * zone.workersAssigned.length * deltaTime) / 1000,
      zone.remainingResources
    );

    zone.remainingResources -= gathered;

    if (zone.remainingResources <= 0) {
      zone.isExhausted = true;
      zone.workersAssigned = [];
    }

    return gathered;
  }
}

export default TerrainManager;

import type { Position } from '../types/game';

export interface ResourceNode {
  id: string;
  type: 'oil' | 'steel' | 'energy';
  position: Position;
  maxResources: number;
  currentResources: number;
  extractionRate: number;
  workersAssigned: string[];
  maxWorkers: number;
  isExhausted: boolean;
  radius: number;
}

export interface ResourceBuilding {
  id: string;
  type: 'power_plant' | 'refinery' | 'mine';
  position: Position;
  resourceType: 'oil' | 'steel' | 'energy';
  productionRate: number;
  playerId: string;
}

export class ResourceManager {
  private resourceNodes: Map<string, ResourceNode> = new Map();
  private resourceBuildings: Map<string, ResourceBuilding> = new Map();
  private mapSize: { width: number; height: number };

  constructor(mapSize: { width: number; height: number }) {
    this.mapSize = mapSize;
    this.generateResourceNodes();
  }

  private generateResourceNodes(): void {
    const nodeTypes: ResourceNode['type'][] = ['oil', 'steel', 'energy'];
    const nodesPerType = 4; // Limited number of nodes

    nodeTypes.forEach(nodeType => {
      for (let i = 0; i < nodesPerType; i++) {
        const position = this.findValidNodePosition();
        if (position) {
          const node: ResourceNode = {
            id: `${nodeType}_node_${i}`,
            type: nodeType,
            position,
            maxResources: 3000 + Math.random() * 2000, // Limited resources per node
            currentResources: 0,
            extractionRate: nodeType === 'oil' ? 30 : nodeType === 'steel' ? 25 : 35,
            workersAssigned: [],
            maxWorkers: 3,
            isExhausted: false,
            radius: 2
          };
          node.currentResources = node.maxResources;
          this.resourceNodes.set(node.id, node);
        }
      }
    });
  }

  private findValidNodePosition(): Position | null {
    const maxAttempts = 50;
    const minDistanceFromEdge = 5;
    const minDistanceBetweenNodes = 8;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = minDistanceFromEdge + Math.random() * (this.mapSize.width - 2 * minDistanceFromEdge);
      const y = minDistanceFromEdge + Math.random() * (this.mapSize.height - 2 * minDistanceFromEdge);

      // Check distance from other nodes
      let validPosition = true;
      for (const node of this.resourceNodes.values()) {
        const distance = Math.sqrt(
          Math.pow(x - node.position.x, 2) + Math.pow(y - node.position.y, 2)
        );
        if (distance < minDistanceBetweenNodes) {
          validPosition = false;
          break;
        }
      }

      if (validPosition) {
        return { x: Math.round(x), y: Math.round(y) };
      }
    }

    return null;
  }

  public getResourceNodes(): ResourceNode[] {
    return Array.from(this.resourceNodes.values());
  }

  public getNodeAt(position: Position): ResourceNode | undefined {
    for (const node of this.resourceNodes.values()) {
      const distance = Math.sqrt(
        Math.pow(position.x - node.position.x, 2) + 
        Math.pow(position.y - node.position.y, 2)
      );
      if (distance <= node.radius) {
        return node;
      }
    }
    return undefined;
  }

  public assignWorkerToNode(workerId: string, nodeId: string): boolean {
    const node = this.resourceNodes.get(nodeId);
    if (node && !node.isExhausted && node.workersAssigned.length < node.maxWorkers) {
      if (!node.workersAssigned.includes(workerId)) {
        node.workersAssigned.push(workerId);
        return true;
      }
    }
    return false;
  }

  public removeWorkerFromNode(workerId: string): void {
    for (const node of this.resourceNodes.values()) {
      const index = node.workersAssigned.indexOf(workerId);
      if (index !== -1) {
        node.workersAssigned.splice(index, 1);
        break;
      }
    }
  }

  public extractResources(nodeId: string, deltaTime: number): { type: 'oil' | 'steel' | 'energy'; amount: number } | null {
    const node = this.resourceNodes.get(nodeId);
    if (!node || node.isExhausted || node.workersAssigned.length === 0) {
      return null;
    }

    const extractionAmount = Math.min(
      (node.extractionRate * node.workersAssigned.length * deltaTime) / 1000,
      node.currentResources
    );

    node.currentResources -= extractionAmount;

    if (node.currentResources <= 0) {
      node.isExhausted = true;
      node.workersAssigned = [];
    }

    return {
      type: node.type,
      amount: extractionAmount
    };
  }

  public addResourceBuilding(building: ResourceBuilding): void {
    this.resourceBuildings.set(building.id, building);
  }

  public removeResourceBuilding(buildingId: string): void {
    this.resourceBuildings.delete(buildingId);
  }

  public generateResourcesFromBuildings(deltaTime: number): { [playerId: string]: { oil: number; steel: number; energy: number } } {
    const playerResources: { [playerId: string]: { oil: number; steel: number; energy: number } } = {};

    for (const building of this.resourceBuildings.values()) {
      if (!playerResources[building.playerId]) {
        playerResources[building.playerId] = { oil: 0, steel: 0, energy: 0 };
      }

      const production = (building.productionRate * deltaTime) / 1000;
      playerResources[building.playerId][building.resourceType] += production;
    }

    return playerResources;
  }

  public getNearestNodeOfType(position: Position, resourceType: 'oil' | 'steel' | 'energy'): ResourceNode | null {
    let nearestNode: ResourceNode | null = null;
    let nearestDistance = Infinity;

    for (const node of this.resourceNodes.values()) {
      if (node.type === resourceType && !node.isExhausted && node.workersAssigned.length < node.maxWorkers) {
        const distance = Math.sqrt(
          Math.pow(position.x - node.position.x, 2) + 
          Math.pow(position.y - node.position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestNode = node;
        }
      }
    }

    return nearestNode;
  }

  public getResourceStatistics(): { totalNodes: number; exhaustedNodes: number; activeWorkers: number } {
    const totalNodes = this.resourceNodes.size;
    let exhaustedNodes = 0;
    let activeWorkers = 0;

    for (const node of this.resourceNodes.values()) {
      if (node.isExhausted) {
        exhaustedNodes++;
      }
      activeWorkers += node.workersAssigned.length;
    }

    return { totalNodes, exhaustedNodes, activeWorkers };
  }
}

export default ResourceManager;

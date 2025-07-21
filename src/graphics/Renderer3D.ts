import type { Unit, Building, Position } from '../types/game';

export interface Camera3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom: number;
  target: Position;
}

export interface RenderObject3D {
  id: string;
  type: 'unit' | 'building' | 'terrain' | 'effect';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  model: string;
  health?: number;
  maxHealth?: number;
}

export class Renderer3D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera3D;
  private renderQueue: RenderObject3D[] = [];
  private animationTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.camera = {
      position: { x: 25, y: 25, z: 15 },
      rotation: { x: -0.3, y: 0, z: 0 },
      zoom: 1,
      target: { x: 25, y: 25 }
    };
  }

  public render(units: Unit[], buildings: Building[], deltaTime: number): void {
    this.animationTime += deltaTime;
    
    // Clear canvas with gradient sky
    this.renderSky();
    
    // Build render queue
    this.buildRenderQueue(units, buildings);
    
    // Sort by depth (Z-buffer)
    this.sortRenderQueue();
    
    // Render all objects
    this.renderQueue.forEach(obj => this.renderObject(obj));
    
    // Render UI elements
    this.renderUI(units, buildings);
    
    // Clear queue for next frame
    this.renderQueue = [];
  }

  private getPlayerColor(playerId: string): string {
    // Return distinct colors for different players
    switch (playerId) {
      case 'player': return '#4A90E2'; // Blue for human player
      case 'ai': return '#E24A4A';     // Red for AI player
      case 'ai1': return '#E24A4A';    // Red for AI player 1
      case 'ai2': return '#FFA500';    // Orange for AI player 2
      case 'ai3': return '#9B59B6';    // Purple for AI player 3
      default: return '#808080';       // Gray for unknown players
    }
  }

  private getUnitColor(playerId: string): string {
    // Slightly different shades for units vs buildings
    switch (playerId) {
      case 'player': return '#2E8B57'; // Green for human player units
      case 'ai': return '#CD5C5C';     // Red for AI units
      case 'ai1': return '#CD5C5C';    // Red for AI player 1 units
      case 'ai2': return '#FF8C00';    // Dark orange for AI player 2 units
      case 'ai3': return '#8E44AD';    // Dark purple for AI player 3 units
      default: return '#696969';       // Dark gray for unknown players
    }
  }

  private renderSky(): void {
    // Create sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.7, '#E0F6FF'); // Light blue
    gradient.addColorStop(1, '#90EE90'); // Light green (ground)
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private buildRenderQueue(units: Unit[], buildings: Building[]): void {
    // Add terrain grid
    this.addTerrainToQueue();
    
    // Add buildings
    buildings.forEach(building => {
      this.renderQueue.push({
        id: building.id,
        type: 'building',
        position: { x: building.position.x, y: building.position.y, z: this.getBuildingHeight(building.type) },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: this.getBuildingHeight(building.type) },
        color: this.getPlayerColor(building.playerId),
        model: building.type,
        health: building.health,
        maxHealth: building.maxHealth
      });
    });
    
    // Add units
    units.forEach(unit => {
      // Add movement animation
      const bobOffset = Math.sin(this.animationTime * 0.003 + unit.position.x) * 0.1;
      
      this.renderQueue.push({
        id: unit.id,
        type: 'unit',
        position: { x: unit.position.x, y: unit.position.y, z: 0.5 + bobOffset },
        rotation: { x: 0, y: this.getUnitRotation(unit), z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: this.getUnitColor(unit.playerId),
        model: unit.type,
        health: unit.health,
        maxHealth: unit.maxHealth
      });
    });
  }

  private addTerrainToQueue(): void {
    // Add terrain tiles with varied appearance
    for (let x = 0; x < 50; x += 1) {
      for (let y = 0; y < 50; y += 1) {
        // Sample terrain type at this position (this would come from TerrainManager in a real implementation)
        const noiseValue = this.generateSimpleNoise(x, y);
        let terrainColor = '#90EE90'; // Default grass
        let isObstacle = false;
        
        if (noiseValue > 0.7) {
          terrainColor = '#696969'; // Mountains
          isObstacle = true;
        } else if (noiseValue > 0.5) {
          terrainColor = '#228B22'; // Forest
        } else if (noiseValue < 0.2) {
          terrainColor = '#4169E1'; // Water
          isObstacle = true;
        }
        
        this.renderQueue.push({
          id: `terrain_${x}_${y}`,
          type: 'terrain',
          position: { x, y, z: isObstacle ? 0.5 : 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: isObstacle ? 1 : 0.1 },
          color: terrainColor,
          model: 'terrain_tile'
        });
      }
    }
  }

  private generateSimpleNoise(x: number, y: number): number {
    // Simple noise function for terrain variation
    const frequency = 0.1;
    return (
      (Math.sin(x * frequency) * Math.cos(y * frequency) +
        Math.sin(x * frequency * 2) * Math.cos(y * frequency * 2) * 0.5 +
        Math.sin(x * frequency * 4) * Math.cos(y * frequency * 4) * 0.25) /
        1.75 +
      0.5
    );
  }

  private getBuildingHeight(buildingType: string): number {
    switch (buildingType) {
      case 'command_center': return 3;
      case 'barracks': return 2;
      case 'vehicle_factory': return 2.5;
      case 'power_plant': return 4;
      case 'defense_turret': return 1.5;
      default: return 2;
    }
  }

  private getUnitRotation(unit: Unit): number {
    // Calculate rotation based on movement direction or target
    if (unit.target) {
      const dx = unit.target.x - unit.position.x;
      const dy = unit.target.y - unit.position.y;
      return Math.atan2(dy, dx);
    }
    return 0;
  }

  private sortRenderQueue(): void {
    // Sort by Z position first, then by Y position for proper depth
    this.renderQueue.sort((a, b) => {
      const depthA = this.calculateDepth(a.position);
      const depthB = this.calculateDepth(b.position);
      return depthB - depthA; // Render farthest first
    });
  }

  private calculateDepth(position: { x: number; y: number; z: number }): number {
    // Calculate distance from camera for depth sorting
    const dx = position.x - this.camera.position.x;
    const dy = position.y - this.camera.position.y;
    const dz = position.z - this.camera.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private renderObject(obj: RenderObject3D): void {
    const screenPos = this.project3DToScreen(obj.position);
    
    if (screenPos.x < 0 || screenPos.x > this.canvas.width || 
        screenPos.y < 0 || screenPos.y > this.canvas.height) {
      return; // Frustum culling
    }

    this.ctx.save();
    
    switch (obj.type) {
      case 'building':
        this.renderBuilding(obj, screenPos);
        break;
      case 'unit':
        this.renderUnit(obj, screenPos);
        break;
      case 'terrain':
        this.renderTerrain(obj, screenPos);
        break;
    }
    
    this.ctx.restore();
  }

  private project3DToScreen(pos3D: { x: number; y: number; z: number }): { x: number; y: number; scale: number } {
    // Simple isometric projection
    const isoX = (pos3D.x - pos3D.y) * Math.cos(Math.PI / 6);
    const isoY = (pos3D.x + pos3D.y) * Math.sin(Math.PI / 6) - pos3D.z;
    
    // Apply camera transformation
    const screenX = (isoX - this.camera.position.x + 25) * this.camera.zoom * 12 + this.canvas.width / 2;
    const screenY = (isoY - this.camera.position.y + 25) * this.camera.zoom * 8 + this.canvas.height / 2;
    
    // Calculate scale based on distance
    const distance = this.calculateDepth(pos3D);
    const scale = Math.max(0.3, 1 - distance * 0.02) * this.camera.zoom;
    
    return { x: screenX, y: screenY, scale };
  }

  private renderBuilding(obj: RenderObject3D, screenPos: { x: number; y: number; scale: number }): void {
    const size = 20 * screenPos.scale;
    const height = obj.scale.z * 15 * screenPos.scale;
    
    // Draw building shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(screenPos.x - size/2 + 3, screenPos.y + 3, size, size/2);
    
    // Draw building base (3D effect)
    this.ctx.fillStyle = this.darkenColor(obj.color, 0.3);
    this.ctx.fillRect(screenPos.x - size/2, screenPos.y - height + size/2, size, height);
    
    // Draw building top
    this.ctx.fillStyle = obj.color;
    this.ctx.fillRect(screenPos.x - size/2, screenPos.y - height, size, size/2);
    
    // Draw building front face
    this.ctx.fillStyle = this.darkenColor(obj.color, 0.1);
    this.ctx.fillRect(screenPos.x - size/2, screenPos.y - height/2, size, height/2);
    
    // Add building details based on type
    this.addBuildingDetails(obj.model, screenPos, size);
    
    // Health bar
    if (obj.health !== undefined && obj.maxHealth !== undefined) {
      this.renderHealthBar(screenPos.x, screenPos.y - height - 10, obj.health, obj.maxHealth);
    }
  }

  private renderUnit(obj: RenderObject3D, screenPos: { x: number; y: number; scale: number }): void {
    const size = 12 * screenPos.scale;
    
    // Draw unit shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(screenPos.x + 2, screenPos.y + 2, size/2, size/4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw unit body
    this.ctx.fillStyle = obj.color;
    this.ctx.beginPath();
    
    switch (obj.model) {
      case 'tank':
        // Tank body
        this.ctx.fillRect(screenPos.x - size/2, screenPos.y - size/2, size, size * 0.7);
        // Tank turret
        this.ctx.fillStyle = this.darkenColor(obj.color, 0.2);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y - size/4, size/3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'jet':
        // Jet triangle
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - size/2);
        this.ctx.lineTo(screenPos.x - size/2, screenPos.y + size/2);
        this.ctx.lineTo(screenPos.x + size/2, screenPos.y + size/2);
        this.ctx.closePath();
        this.ctx.fill();
        break;
        
      case 'helicopter':
        // Helicopter body
        this.ctx.beginPath();
        this.ctx.ellipse(screenPos.x, screenPos.y, size/2, size/3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Rotor (animated)
        this.ctx.strokeStyle = obj.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        // Rotate rotor based on animation time
        const rotor1X = screenPos.x + Math.cos(this.animationTime * 0.02) * size;
        const rotor1Y = screenPos.y - size/2;
        const rotor2X = screenPos.x - Math.cos(this.animationTime * 0.02) * size;
        const rotor2Y = screenPos.y - size/2;
        this.ctx.moveTo(rotor1X, rotor1Y);
        this.ctx.lineTo(rotor2X, rotor2Y);
        this.ctx.stroke();
        break;
        
      default:
        // Default unit (infantry)
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, size/2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
    
    // Health bar
    if (obj.health !== undefined && obj.maxHealth !== undefined) {
      this.renderHealthBar(screenPos.x, screenPos.y - size - 5, obj.health, obj.maxHealth);
    }
  }

  private renderTerrain(_obj: RenderObject3D, screenPos: { x: number; y: number; scale: number }): void {
    const size = 12 * screenPos.scale; // Smaller tiles for better detail
    
    // Draw terrain tile
    this.ctx.fillStyle = _obj.color;
    this.ctx.fillRect(screenPos.x - size/2, screenPos.y - size/2, size, size);
    
    // Add subtle grid lines for grass
    if (_obj.color === '#90EE90') {
      this.ctx.strokeStyle = 'rgba(100, 150, 100, 0.2)';
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeRect(screenPos.x - size/2, screenPos.y - size/2, size, size);
    }
    
    // Add texture for obstacles
    if (_obj.position.z > 0.2) {
      // Mountains or obstacles - add some texture
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.fillRect(screenPos.x - size/2 + 1, screenPos.y - size/2 + 1, size - 2, size - 2);
    }
  }

  private addBuildingDetails(buildingType: string, screenPos: { x: number; y: number; scale: number }, size: number): void {
    this.ctx.fillStyle = '#FFD700';
    
    switch (buildingType) {
      case 'command_center':
        // Add antenna
        this.ctx.fillRect(screenPos.x - 1, screenPos.y - size * 2, 2, size/2);
        break;
      case 'power_plant':
        // Add cooling towers
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x - size/4, screenPos.y - size, size/6, 0, Math.PI * 2);
        this.ctx.arc(screenPos.x + size/4, screenPos.y - size, size/6, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'defense_turret':
        // Add gun barrel
        this.ctx.fillRect(screenPos.x - size/8, screenPos.y - size, size/4, size/3);
        break;
    }
  }

  private renderHealthBar(x: number, y: number, health: number, maxHealth: number): void {
    const barWidth = 20;
    const barHeight = 3;
    const healthRatio = health / maxHealth;
    
    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
    
    // Health
    this.ctx.fillStyle = healthRatio > 0.5 ? '#4CAF50' : healthRatio > 0.25 ? '#FFA500' : '#F44336';
    this.ctx.fillRect(x - barWidth/2, y, barWidth * healthRatio, barHeight);
  }

  private renderUI(units: Unit[], buildings: Building[]): void {
    // Render minimap
    this.renderMinimap(units, buildings);
    
    // Render FPS and stats
    this.renderStats();
  }

  private renderMinimap(units: Unit[], buildings: Building[]): void {
    const minimapSize = 150;
    const minimapX = this.canvas.width - minimapSize - 10;
    const minimapY = 10;
    
    // Minimap background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Minimap border
    this.ctx.strokeStyle = '#FFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw units and buildings on minimap
    const scale = minimapSize / 50;
    
    buildings.forEach(building => {
      this.ctx.fillStyle = building.playerId === 'player' ? '#4A90E2' : '#E24A4A';
      this.ctx.fillRect(
        minimapX + building.position.x * scale - 1,
        minimapY + building.position.y * scale - 1,
        3, 3
      );
    });
    
    units.forEach(unit => {
      this.ctx.fillStyle = unit.playerId === 'player' ? '#2E8B57' : '#CD5C5C';
      this.ctx.fillRect(
        minimapX + unit.position.x * scale,
        minimapY + unit.position.y * scale,
        1, 1
      );
    });
    
    // Camera view indicator
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      minimapX + (this.camera.position.x - 10) * scale,
      minimapY + (this.camera.position.y - 10) * scale,
      20 * scale,
      20 * scale
    );
  }

  private renderStats(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 60);
    
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Camera: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)})`, 15, 25);
    this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 15, 40);
    this.ctx.fillText(`Objects: ${this.renderQueue.length}`, 15, 55);
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * factor));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Camera controls
  public moveCamera(dx: number, dy: number): void {
    this.camera.position.x += dx;
    this.camera.position.y += dy;
    
    // Clamp camera to map bounds
    this.camera.position.x = Math.max(10, Math.min(40, this.camera.position.x));
    this.camera.position.y = Math.max(10, Math.min(40, this.camera.position.y));
  }

  public zoomCamera(delta: number): void {
    this.camera.zoom = Math.max(0.5, Math.min(3, this.camera.zoom + delta));
  }

  public setCamera(position: Position): void {
    this.camera.position.x = position.x;
    this.camera.position.y = position.y;
  }

  public getCamera(): Camera3D {
    return { ...this.camera };
  }
}

export default Renderer3D;

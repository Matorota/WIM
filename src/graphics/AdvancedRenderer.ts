import type { Unit, Building, Position } from "../types/game";

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  tileSize: number;
  camera: { x: number; y: number; zoom: number };
  mapSize: { width: number; height: number };
}

export interface AnimationFrame {
  id: string;
  startTime: number;
  duration: number;
  fromPosition: Position;
  toPosition: Position;
  type: "movement" | "attack" | "construction" | "explosion";
}

// Unified context type to handle both Canvas and OffscreenCanvas contexts
type RenderingContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

class AdvancedRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private animations: Map<string, AnimationFrame> = new Map();
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;

  constructor(config: RenderConfig) {
    this.config = config;
    const context = config.canvas.getContext("2d");
    if (!context) throw new Error("Canvas context not available");
    this.ctx = context;

    // Create offscreen canvas for better performance
    this.offscreenCanvas = new OffscreenCanvas(
      config.canvas.width,
      config.canvas.height
    );
    const offscreenContext = this.offscreenCanvas.getContext("2d");
    if (!offscreenContext) throw new Error("Offscreen context not available");
    this.offscreenCtx = offscreenContext;

    this.setupCanvasOptimizations();
  }

  private setupCanvasOptimizations(): void {
    // Enable hardware acceleration hints
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = "high";
  }

  public updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public render(
    units: Unit[],
    buildings: Building[],
    fogOfWar: boolean[][],
    selectedUnits: string[],
    selectedBuildings: string[]
  ): void {
    // Clear the offscreen canvas
    this.offscreenCtx.fillStyle = "#0a0a0a";
    this.offscreenCtx.fillRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );

    // Update animations
    this.updateAnimations();

    // Render layers in order
    this.renderGrid();
    this.renderTerrain();
    this.renderFogOfWar(fogOfWar);
    this.renderBuildings(buildings, selectedBuildings);
    this.renderUnits(units, selectedUnits);
    this.renderAnimations();
    this.renderUI();

    // Copy offscreen canvas to main canvas
    this.ctx.clearRect(
      0,
      0,
      this.config.canvas.width,
      this.config.canvas.height
    );
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  private renderGrid(): void {
    const ctx = this.offscreenCtx;
    const { tileSize, camera, mapSize } = this.config;

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Calculate visible range to optimize rendering
    const startX = Math.max(0, Math.floor(camera.x - 2));
    const endX = Math.min(
      mapSize.width,
      Math.ceil(
        camera.x + this.offscreenCanvas.width / (tileSize * camera.zoom) + 2
      )
    );
    const startY = Math.max(0, Math.floor(camera.y - 2));
    const endY = Math.min(
      mapSize.height,
      Math.ceil(
        camera.y + this.offscreenCanvas.height / (tileSize * camera.zoom) + 2
      )
    );

    ctx.beginPath();
    for (let x = startX; x <= endX; x++) {
      const screenX = (x - camera.x) * tileSize * camera.zoom;
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.offscreenCanvas.height);
    }
    for (let y = startY; y <= endY; y++) {
      const screenY = (y - camera.y) * tileSize * camera.zoom;
      ctx.moveTo(0, screenY);
      ctx.lineTo(this.offscreenCanvas.width, screenY);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private renderTerrain(): void {
    // Add terrain variation for visual interest
    const ctx = this.offscreenCtx;
    const { tileSize, camera, mapSize } = this.config;

    for (let x = 0; x < mapSize.width; x += 4) {
      for (let y = 0; y < mapSize.height; y += 4) {
        const screenX = (x - camera.x) * tileSize * camera.zoom;
        const screenY = (y - camera.y) * tileSize * camera.zoom;

        if (
          screenX < -tileSize ||
          screenX > this.offscreenCanvas.width ||
          screenY < -tileSize ||
          screenY > this.offscreenCanvas.height
        )
          continue;

        // Simple noise-based terrain variation
        const noise = (x * 0.1 + y * 0.1) % 1;
        if (noise > 0.7) {
          ctx.fillStyle = "#2a2a2a";
          ctx.fillRect(
            screenX,
            screenY,
            tileSize * camera.zoom * 2,
            tileSize * camera.zoom * 2
          );
        }
      }
    }
  }

  private renderFogOfWar(fogOfWar: boolean[][]): void {
    if (fogOfWar.length === 0) return;

    const ctx = this.offscreenCtx;
    const { tileSize, camera } = this.config;

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";

    for (let y = 0; y < fogOfWar.length; y++) {
      for (let x = 0; x < fogOfWar[y].length; x++) {
        if (fogOfWar[y][x]) {
          const screenX = (x - camera.x) * tileSize * camera.zoom;
          const screenY = (y - camera.y) * tileSize * camera.zoom;

          if (
            screenX < -tileSize ||
            screenX > this.offscreenCanvas.width ||
            screenY < -tileSize ||
            screenY > this.offscreenCanvas.height
          )
            continue;

          ctx.fillRect(
            screenX,
            screenY,
            tileSize * camera.zoom,
            tileSize * camera.zoom
          );
        }
      }
    }
  }

  private renderBuildings(
    buildings: Building[],
    selectedBuildings: string[]
  ): void {
    const ctx = this.offscreenCtx;
    const { tileSize, camera } = this.config;

    buildings.forEach((building) => {
      const screenX = (building.position.x - camera.x) * tileSize * camera.zoom;
      const screenY = (building.position.y - camera.y) * tileSize * camera.zoom;
      const size = tileSize * camera.zoom * 2;

      // Skip if outside viewport
      if (
        screenX < -size ||
        screenX > this.offscreenCanvas.width ||
        screenY < -size ||
        screenY > this.offscreenCanvas.height
      )
        return;

      // Render building with enhanced graphics
      this.renderBuildingSprite(ctx, building, screenX, screenY, size);

      // Selection highlight
      if (selectedBuildings.includes(building.id)) {
        this.renderSelectionHighlight(ctx, screenX, screenY, size, "#ffff00");
      }

      // Health bar
      if (building.health < building.maxHealth) {
        this.renderHealthBar(
          ctx,
          screenX,
          screenY - 8,
          size,
          building.health / building.maxHealth,
          "#ff4444",
          "#44ff44"
        );
      }

      // Construction progress
      if (!building.isConstructed) {
        this.renderProgressBar(
          ctx,
          screenX,
          screenY + size - 6,
          size,
          building.constructionProgress / 100,
          "#ffff44"
        );
      }
    });
  }

  private renderUnits(units: Unit[], selectedUnits: string[]): void {
    const ctx = this.offscreenCtx;
    const { tileSize, camera } = this.config;

    units.forEach((unit) => {
      const animatedPosition = this.getAnimatedPosition(unit);
      const screenX = (animatedPosition.x - camera.x) * tileSize * camera.zoom;
      const screenY = (animatedPosition.y - camera.y) * tileSize * camera.zoom;
      const size = tileSize * camera.zoom * 0.8;

      // Skip if outside viewport
      if (
        screenX < -size ||
        screenX > this.offscreenCanvas.width ||
        screenY < -size ||
        screenY > this.offscreenCanvas.height
      )
        return;

      // Render unit with enhanced graphics
      this.renderUnitSprite(ctx, unit, screenX, screenY, size);

      // Selection highlight
      if (selectedUnits.includes(unit.id)) {
        this.renderSelectionHighlight(ctx, screenX, screenY, size, "#ffff00");
      }

      // Health bar
      if (unit.health < unit.maxHealth) {
        this.renderHealthBar(
          ctx,
          screenX,
          screenY - 6,
          size,
          unit.health / unit.maxHealth,
          "#ff4444",
          "#44ff44"
        );
      }

      // Movement target
      if (unit.target && selectedUnits.includes(unit.id)) {
        this.renderMovementPath(ctx, animatedPosition, unit.target);
      }
    });
  }

  private renderBuildingSprite(
    ctx: RenderingContext,
    building: Building,
    x: number,
    y: number,
    size: number
  ): void {
    // Enhanced building rendering with gradients and shadows
    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x + 2, y + 2, size, size);

    // Building color based on player
    const baseColor = this.getPlayerColor(building.playerId);

    // Gradient fill
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, this.darkenColor(baseColor, 0.3));
    ctx.fillStyle = gradient;

    // Building shape based on type
    switch (building.type) {
      case "command_center":
        ctx.fillRect(x, y, size, size);
        // Central structure
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 2);
        break;
      case "barracks":
        ctx.fillRect(x, y, size * 0.8, size * 0.6);
        // Door
        ctx.fillStyle = "#333333";
        ctx.fillRect(x + size * 0.3, y + size * 0.4, size * 0.2, size * 0.2);
        break;
      case "vehicle_factory":
        ctx.fillRect(x, y, size * 0.9, size * 0.8);
        // Large door
        ctx.fillStyle = "#333333";
        ctx.fillRect(x + size * 0.1, y + size * 0.5, size * 0.7, size * 0.3);
        break;
      default:
        ctx.fillRect(x, y, size * 0.7, size * 0.7);
    }

    ctx.restore();
  }

  private renderUnitSprite(
    ctx: RenderingContext,
    unit: Unit,
    x: number,
    y: number,
    size: number
  ): void {
    // Enhanced unit rendering with gradients and shadows
    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x + 1, y + 1, size, size);

    const baseColor = this.getPlayerColor(unit.playerId);

    // Unit shape based on type with enhanced graphics
    switch (unit.type) {
      case "infantry":
        // Gradient circle for infantry
        const gradient = ctx.createRadialGradient(
          x + size / 2,
          y + size / 2,
          0,
          x + size / 2,
          y + size / 2,
          size / 2
        );
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 0.4));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "tank":
        // Tank body
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size * 0.8);
        // Tank turret
        ctx.fillStyle = this.lightenColor(baseColor, 0.2);
        ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 2);
        // Cannon
        ctx.fillStyle = "#666666";
        ctx.fillRect(x + size / 2 - 2, y - 5, 4, size / 2);
        break;

      case "jet":
        // Triangle for jet with gradient
        const jetGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        jetGradient.addColorStop(0, baseColor);
        jetGradient.addColorStop(1, this.darkenColor(baseColor, 0.3));
        ctx.fillStyle = jetGradient;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
        break;

      case "drone":
        // Small square for drone
        ctx.fillStyle = baseColor;
        ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 2);
        // Propellers
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.stroke();
        break;

      default:
        // Default unit
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size);
    }

    ctx.restore();
  }

  private renderSelectionHighlight(
    ctx: RenderingContext,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderHealthBar(
    ctx: RenderingContext,
    x: number,
    y: number,
    width: number,
    health: number,
    lowColor: string,
    highColor: string
  ): void {
    const barHeight = 4;

    // Background
    ctx.fillStyle = "#333333";
    ctx.fillRect(x, y, width, barHeight);

    // Health
    const healthColor = health > 0.5 ? highColor : lowColor;
    ctx.fillStyle = healthColor;
    ctx.fillRect(x, y, width * health, barHeight);
  }

  private renderProgressBar(
    ctx: RenderingContext,
    x: number,
    y: number,
    width: number,
    progress: number,
    color: string
  ): void {
    const barHeight = 6;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, width, barHeight);

    // Progress
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * progress, barHeight);
  }

  private renderMovementPath(
    ctx: RenderingContext,
    from: Position,
    to: Position
  ): void {
    const { tileSize, camera } = this.config;
    const fromScreenX = (from.x - camera.x) * tileSize * camera.zoom;
    const fromScreenY = (from.y - camera.y) * tileSize * camera.zoom;
    const toScreenX = (to.x - camera.x) * tileSize * camera.zoom;
    const toScreenY = (to.y - camera.y) * tileSize * camera.zoom;

    ctx.save();
    ctx.strokeStyle = "#44ff44";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(fromScreenX, fromScreenY);
    ctx.lineTo(toScreenX, toScreenY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderAnimations(): void {
    // Render active animations (explosions, effects, etc.)
    this.animations.forEach((animation) => {
      this.renderAnimation(animation);
    });
  }

  private renderAnimation(animation: AnimationFrame): void {
    const ctx = this.offscreenCtx;
    const { tileSize, camera } = this.config;
    const progress = Math.min(
      1,
      (Date.now() - animation.startTime) / animation.duration
    );

    const currentX =
      animation.fromPosition.x +
      (animation.toPosition.x - animation.fromPosition.x) * progress;
    const currentY =
      animation.fromPosition.y +
      (animation.toPosition.y - animation.fromPosition.y) * progress;

    const screenX = (currentX - camera.x) * tileSize * camera.zoom;
    const screenY = (currentY - camera.y) * tileSize * camera.zoom;

    switch (animation.type) {
      case "explosion":
        this.renderExplosion(ctx, screenX, screenY, progress);
        break;
      case "construction":
        this.renderConstructionEffect(ctx, screenX, screenY, progress);
        break;
    }
  }

  private renderExplosion(
    ctx: RenderingContext,
    x: number,
    y: number,
    progress: number
  ): void {
    const size = 50 * progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer explosion
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    outerGradient.addColorStop(0, "#ffaa00");
    outerGradient.addColorStop(0.5, "#ff4400");
    outerGradient.addColorStop(1, "#aa0000");

    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner explosion
    const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    innerGradient.addColorStop(0, "#ffffff");
    innerGradient.addColorStop(1, "#ffaa00");

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderConstructionEffect(
    ctx: RenderingContext,
    x: number,
    y: number,
    progress: number
  ): void {
    ctx.save();
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);

    const size = 30;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    ctx.restore();
  }

  private renderUI(): void {
    // Render any UI elements that need to be on the canvas
    // (most UI should be in React components)
  }

  private updateAnimations(): void {
    const currentTime = Date.now();
    const toRemove: string[] = [];

    this.animations.forEach((animation, id) => {
      if (currentTime >= animation.startTime + animation.duration) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.animations.delete(id));
  }

  private getAnimatedPosition(unit: Unit): Position {
    const animation = this.animations.get(unit.id);
    if (!animation || animation.type !== "movement") {
      return unit.position;
    }

    const progress = Math.min(
      1,
      (Date.now() - animation.startTime) / animation.duration
    );
    return {
      x:
        animation.fromPosition.x +
        (animation.toPosition.x - animation.fromPosition.x) * progress,
      y:
        animation.fromPosition.y +
        (animation.toPosition.y - animation.fromPosition.y) * progress,
    };
  }

  private getPlayerColor(playerId: string): string {
    // Return colors for different players
    const colors: Record<string, string> = {
      player1: "#3b82f6",
      ai1: "#ef4444",
      ai2: "#10b981",
      ai3: "#f59e0b",
      ai4: "#8b5cf6",
    };
    return colors[playerId] || "#666666";
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace("#", "");
    const r = Math.min(
      255,
      parseInt(hex.substr(0, 2), 16) + Math.floor(255 * factor)
    );
    const g = Math.min(
      255,
      parseInt(hex.substr(2, 2), 16) + Math.floor(255 * factor)
    );
    const b = Math.min(
      255,
      parseInt(hex.substr(4, 2), 16) + Math.floor(255 * factor)
    );
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(
      0,
      parseInt(hex.substr(0, 2), 16) - Math.floor(255 * factor)
    );
    const g = Math.max(
      0,
      parseInt(hex.substr(2, 2), 16) - Math.floor(255 * factor)
    );
    const b = Math.max(
      0,
      parseInt(hex.substr(4, 2), 16) - Math.floor(255 * factor)
    );
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  public addAnimation(animation: AnimationFrame): void {
    this.animations.set(animation.id, animation);
  }

  public removeAnimation(id: string): void {
    this.animations.delete(id);
  }
}

export default AdvancedRenderer;

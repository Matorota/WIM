import React, { useRef, useEffect, useCallback } from "react";
import { useGameStore } from "../store/gameStore";

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    units,
    buildings,
    mapSize,
    camera,
    fogOfWar,
    currentPlayerId,
    selectedUnits,
    selectedBuildings,
    selectUnits,
    selectBuildings,
    moveUnitsTo,
    setCamera,
  } = useGameStore();

  const TILE_SIZE = 32;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  const drawGame = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Clear canvas
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw grid
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let x = 0; x < mapSize.width; x++) {
        const screenX = (x - camera.x) * TILE_SIZE * camera.zoom;
        if (screenX >= -TILE_SIZE && screenX <= CANVAS_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, CANVAS_HEIGHT);
          ctx.stroke();
        }
      }
      for (let y = 0; y < mapSize.height; y++) {
        const screenY = (y - camera.y) * TILE_SIZE * camera.zoom;
        if (screenY >= -TILE_SIZE && screenY <= CANVAS_HEIGHT) {
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(CANVAS_WIDTH, screenY);
          ctx.stroke();
        }
      }

      // Draw fog of war
      if (fogOfWar.length > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        for (let y = 0; y < fogOfWar.length; y++) {
          for (let x = 0; x < fogOfWar[y].length; x++) {
            if (fogOfWar[y][x]) {
              const screenX = (x - camera.x) * TILE_SIZE * camera.zoom;
              const screenY = (y - camera.y) * TILE_SIZE * camera.zoom;
              ctx.fillRect(
                screenX,
                screenY,
                TILE_SIZE * camera.zoom,
                TILE_SIZE * camera.zoom
              );
            }
          }
        }
      }

      // Draw buildings
      buildings.forEach((building) => {
        const screenX =
          (building.position.x - camera.x) * TILE_SIZE * camera.zoom;
        const screenY =
          (building.position.y - camera.y) * TILE_SIZE * camera.zoom;
        const size = TILE_SIZE * camera.zoom * 2;

        // Check if building is in fog of war
        const fogX = Math.floor(building.position.x);
        const fogY = Math.floor(building.position.y);
        if (fogOfWar[fogY] && fogOfWar[fogY][fogX]) return;

        // Building color based on player
        const player = useGameStore
          .getState()
          .players.find((p) => p.id === building.playerId);
        ctx.fillStyle = player?.color || "#666";

        // Building shape based on type
        if (building.type === "command_center") {
          ctx.fillRect(screenX, screenY, size, size);
          ctx.fillStyle = "#fff";
          ctx.fillRect(
            screenX + size / 4,
            screenY + size / 4,
            size / 2,
            size / 2
          );
        } else if (building.type === "barracks") {
          ctx.fillRect(screenX, screenY, size * 0.8, size * 0.6);
        } else {
          ctx.fillRect(screenX, screenY, size * 0.7, size * 0.7);
        }

        // Selection highlight
        if (selectedBuildings.includes(building.id)) {
          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 3;
          ctx.strokeRect(screenX - 2, screenY - 2, size + 4, size + 4);
        }

        // Health bar
        if (building.health < building.maxHealth) {
          const barWidth = size;
          const barHeight = 4;
          const healthPercent = building.health / building.maxHealth;

          ctx.fillStyle = "#ff0000";
          ctx.fillRect(screenX, screenY - 8, barWidth, barHeight);
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(
            screenX,
            screenY - 8,
            barWidth * healthPercent,
            barHeight
          );
        }

        // Construction progress
        if (!building.isConstructed) {
          const progressPercent = building.constructionProgress / 100;
          ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
          ctx.fillRect(screenX, screenY + size - 6, size * progressPercent, 6);
        }
      });

      // Draw units
      units.forEach((unit) => {
        const screenX = (unit.position.x - camera.x) * TILE_SIZE * camera.zoom;
        const screenY = (unit.position.y - camera.y) * TILE_SIZE * camera.zoom;
        const size = TILE_SIZE * camera.zoom * 0.8;

        // Check if unit is in fog of war
        const fogX = Math.floor(unit.position.x);
        const fogY = Math.floor(unit.position.y);
        if (fogOfWar[fogY] && fogOfWar[fogY][fogX]) return;

        // Unit color based on player
        const player = useGameStore
          .getState()
          .players.find((p) => p.id === unit.playerId);
        ctx.fillStyle = player?.color || "#666";

        // Unit shape based on type
        if (unit.type === "infantry") {
          ctx.beginPath();
          ctx.arc(
            screenX + size / 2,
            screenY + size / 2,
            size / 3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (unit.type === "tank") {
          ctx.fillRect(screenX, screenY, size, size * 0.8);
          // Tank cannon
          ctx.fillStyle = "#888";
          ctx.fillRect(screenX + size / 2 - 2, screenY - 5, 4, size / 2);
        } else if (unit.type === "jet") {
          // Triangle for jet
          ctx.beginPath();
          ctx.moveTo(screenX + size / 2, screenY);
          ctx.lineTo(screenX, screenY + size);
          ctx.lineTo(screenX + size, screenY + size);
          ctx.closePath();
          ctx.fill();
        } else {
          // Default square
          ctx.fillRect(screenX, screenY, size, size);
        }

        // Selection highlight
        if (selectedUnits.includes(unit.id)) {
          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX - 2, screenY - 2, size + 4, size + 4);
        }

        // Health bar
        if (unit.health < unit.maxHealth) {
          const barWidth = size;
          const barHeight = 3;
          const healthPercent = unit.health / unit.maxHealth;

          ctx.fillStyle = "#ff0000";
          ctx.fillRect(screenX, screenY - 6, barWidth, barHeight);
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(
            screenX,
            screenY - 6,
            barWidth * healthPercent,
            barHeight
          );
        }

        // Movement target
        if (unit.target && selectedUnits.includes(unit.id)) {
          const targetScreenX =
            (unit.target.x - camera.x) * TILE_SIZE * camera.zoom;
          const targetScreenY =
            (unit.target.y - camera.y) * TILE_SIZE * camera.zoom;

          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(screenX + size / 2, screenY + size / 2);
          ctx.lineTo(targetScreenX, targetScreenY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    },
    [
      units,
      buildings,
      mapSize,
      camera,
      fogOfWar,
      selectedUnits,
      selectedBuildings,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGame(ctx);
  }, [drawGame]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = clickX / (TILE_SIZE * camera.zoom) + camera.x;
    const worldY = clickY / (TILE_SIZE * camera.zoom) + camera.y;

    // Check if clicking on a unit or building
    let clickedSomething = false;

    // Check buildings first
    for (const building of buildings) {
      const distance = Math.sqrt(
        Math.pow(worldX - building.position.x, 2) +
          Math.pow(worldY - building.position.y, 2)
      );
      if (distance < 2 && building.playerId === currentPlayerId) {
        selectBuildings([building.id]);
        clickedSomething = true;
        break;
      }
    }

    if (!clickedSomething) {
      // Check units
      for (const unit of units) {
        const distance = Math.sqrt(
          Math.pow(worldX - unit.position.x, 2) +
            Math.pow(worldY - unit.position.y, 2)
        );
        if (distance < 1 && unit.playerId === currentPlayerId) {
          if (e.ctrlKey) {
            // Add to selection
            selectUnits([...selectedUnits, unit.id]);
          } else {
            selectUnits([unit.id]);
          }
          clickedSomething = true;
          break;
        }
      }
    }

    // If nothing was clicked and we have units selected, move them
    if (!clickedSomething && selectedUnits.length > 0) {
      moveUnitsTo({ x: worldX, y: worldY });
    }

    // Clear selection if nothing was clicked
    if (!clickedSomething && !e.ctrlKey) {
      selectUnits([]);
      selectBuildings([]);
    }
  };

  const handleMouseMove = (_e: React.MouseEvent<HTMLCanvasElement>) => {
    // Camera panning could be implemented here
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, camera.zoom * zoomFactor));
    setCamera({ ...camera, zoom: newZoom });
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      className="border border-gray-600 bg-gray-900 cursor-crosshair"
    />
  );
};

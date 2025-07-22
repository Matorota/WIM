import React, { useRef, useEffect, useCallback, useState } from "react";
import { useRTSGameStore } from "../store/rtsGameStore";
import type { Position } from "../types/rts-game";

interface RTSCanvasProps {
  width: number;
  height: number;
}

export const RTSCanvas: React.FC<RTSCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Position>({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{
    start: Position;
    end: Position;
  } | null>(null);

  const {
    units,
    buildings,
    resourceNodes,
    selectedUnits,
    selectedBuildings,
    camera,
    mapSize,
    currentPlayerId,
    players,
    selectUnits,
    selectBuildings,
    clearSelection,
    moveUnitsTo,
    gatherResource,
    panCamera,
    zoomCamera,
    tick,
    isGameStarted,
  } = useRTSGameStore();

  // Game loop
  useEffect(() => {
    if (!isGameStarted) return;

    const gameLoop = setInterval(() => {
      tick();
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [tick, isGameStarted]);

  // Screen to world coordinate conversion
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Position => {
      return {
        x: screenX / camera.zoom + camera.x,
        y: screenY / camera.zoom + camera.y,
      };
    },
    [camera]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = screenToWorld(mouseX, mouseY);

      setIsMouseDown(true);
      setLastMousePos({ x: mouseX, y: mouseY });

      if (e.button === 2) {
        // Right click
        e.preventDefault();

        // Check if clicking on resource node
        const clickedNode = resourceNodes.find((node) => {
          const distance = Math.sqrt(
            Math.pow(node.position.x - worldPos.x, 2) +
              Math.pow(node.position.y - worldPos.y, 2)
          );
          return distance < 2;
        });

        if (clickedNode && selectedUnits.length > 0) {
          gatherResource(clickedNode.id);
        } else if (selectedUnits.length > 0) {
          moveUnitsTo(worldPos);
        }
      } else if (e.button === 0) {
        // Left click
        setSelectionBox({
          start: { x: mouseX, y: mouseY },
          end: { x: mouseX, y: mouseY },
        });
      }
    },
    [screenToWorld, resourceNodes, selectedUnits, gatherResource, moveUnitsTo]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isMouseDown) {
        if (e.buttons === 4) {
          // Middle mouse for panning
          const deltaX = (mouseX - lastMousePos.x) / camera.zoom;
          const deltaY = (mouseY - lastMousePos.y) / camera.zoom;
          panCamera(-deltaX, -deltaY);
          setLastMousePos({ x: mouseX, y: mouseY });
        } else if (selectionBox) {
          setSelectionBox({
            ...selectionBox,
            end: { x: mouseX, y: mouseY },
          });
        }
      }
    },
    [isMouseDown, lastMousePos, camera.zoom, panCamera, selectionBox]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsMouseDown(false);

      if (selectionBox && e.button === 0) {
        const start = screenToWorld(selectionBox.start.x, selectionBox.start.y);
        const end = screenToWorld(selectionBox.end.x, selectionBox.end.y);

        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        if (Math.abs(maxX - minX) < 1 && Math.abs(maxY - minY) < 1) {
          // Single click selection
          const clickedUnit = units.find((unit) => {
            const distance = Math.sqrt(
              Math.pow(unit.position.x - start.x, 2) +
                Math.pow(unit.position.y - start.y, 2)
            );
            return distance < 1.5 && unit.playerId === currentPlayerId;
          });

          const clickedBuilding = buildings.find((building) => {
            const inBounds =
              start.x >= building.position.x &&
              start.x <= building.position.x + building.size.width &&
              start.y >= building.position.y &&
              start.y <= building.position.y + building.size.height;
            return inBounds && building.playerId === currentPlayerId;
          });

          if (clickedUnit) {
            selectUnits([clickedUnit.id]);
          } else if (clickedBuilding) {
            selectBuildings([clickedBuilding.id]);
          } else {
            clearSelection();
          }
        } else {
          // Box selection
          const selectedUnitIds = units
            .filter(
              (unit) =>
                unit.position.x >= minX &&
                unit.position.x <= maxX &&
                unit.position.y >= minY &&
                unit.position.y <= maxY &&
                unit.playerId === currentPlayerId
            )
            .map((unit) => unit.id);

          if (selectedUnitIds.length > 0) {
            selectUnits(selectedUnitIds);
          } else {
            clearSelection();
          }
        }
      }

      setSelectionBox(null);
    },
    [
      selectionBox,
      screenToWorld,
      units,
      buildings,
      currentPlayerId,
      selectUnits,
      selectBuildings,
      clearSelection,
    ]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = screenToWorld(mouseX, mouseY);

      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomCamera(zoomDelta, worldPos.x, worldPos.y);
    },
    [screenToWorld, zoomCamera]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panSpeed = 10 / camera.zoom;

      switch (e.key) {
        case "ArrowUp":
        case "w":
          panCamera(0, -panSpeed);
          break;
        case "ArrowDown":
        case "s":
          panCamera(0, panSpeed);
          break;
        case "ArrowLeft":
        case "a":
          panCamera(-panSpeed, 0);
          break;
        case "ArrowRight":
        case "d":
          panCamera(panSpeed, 0);
          break;
        case "Escape":
          clearSelection();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera.zoom, panCamera, clearSelection]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = "#2a5f2a"; // Green grass background
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Apply camera transform
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5 / camera.zoom;
    const gridSize = 10;
    for (let x = 0; x < mapSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapSize.height);
      ctx.stroke();
    }
    for (let y = 0; y < mapSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapSize.width, y);
      ctx.stroke();
    }

    // Draw resource nodes
    resourceNodes.forEach((node) => {
      if (node.isExhausted) return;

      ctx.fillStyle = {
        wood: "#8B4513",
        food: "#32CD32",
        stone: "#708090",
        gold: "#FFD700",
      }[node.type];

      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, 2, 0, 2 * Math.PI);
      ctx.fill();

      // Resource amount indicator
      ctx.fillStyle = "white";
      ctx.font = `${12 / camera.zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        node.currentResources.toString(),
        node.position.x,
        node.position.y - 3
      );
    });

    // Draw buildings
    buildings.forEach((building) => {
      const player = players.find((p) => p.id === building.playerId);
      if (!player) return;

      // Building body
      ctx.fillStyle = building.isConstructed
        ? player.color
        : "rgba(128,128,128,0.5)";
      ctx.fillRect(
        building.position.x,
        building.position.y,
        building.size.width,
        building.size.height
      );

      // Building border
      ctx.strokeStyle = building.isSelected ? "#FFFF00" : "#000000";
      ctx.lineWidth = building.isSelected ? 3 / camera.zoom : 1 / camera.zoom;
      ctx.strokeRect(
        building.position.x,
        building.position.y,
        building.size.width,
        building.size.height
      );

      // Construction progress
      if (!building.isConstructed) {
        const progressHeight =
          (building.size.height * building.constructionProgress) / 100;
        ctx.fillStyle = player.color;
        ctx.fillRect(
          building.position.x,
          building.position.y + building.size.height - progressHeight,
          building.size.width,
          progressHeight
        );
      }

      // Building type label
      ctx.fillStyle = "white";
      ctx.font = `${10 / camera.zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        building.type.replace("_", " "),
        building.position.x + building.size.width / 2,
        building.position.y + building.size.height / 2
      );

      // Rally point
      if (building.rallyPoint) {
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2 / camera.zoom;
        ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(
          building.position.x + building.size.width / 2,
          building.position.y + building.size.height / 2
        );
        ctx.lineTo(building.rallyPoint.x, building.rallyPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(
          building.rallyPoint.x,
          building.rallyPoint.y,
          0.5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    });

    // Draw units
    units.forEach((unit) => {
      const player = players.find((p) => p.id === unit.playerId);
      if (!player) return;

      // Unit body
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(unit.position.x, unit.position.y, 0.8, 0, 2 * Math.PI);
      ctx.fill();

      // Unit border
      ctx.strokeStyle = unit.isSelected ? "#FFFF00" : "#000000";
      ctx.lineWidth = unit.isSelected ? 3 / camera.zoom : 1 / camera.zoom;
      ctx.beginPath();
      ctx.arc(unit.position.x, unit.position.y, 0.8, 0, 2 * Math.PI);
      ctx.stroke();

      // Unit type indicator
      const typeSymbol = {
        villager: "V",
        soldier: "S",
        archer: "A",
        cavalry: "C",
        tank: "T",
        engineer: "E",
      }[unit.type];

      ctx.fillStyle = "white";
      ctx.font = `${8 / camera.zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        typeSymbol,
        unit.position.x,
        unit.position.y + 2 / camera.zoom
      );

      // Health bar
      if (unit.health < unit.maxHealth) {
        const barWidth = 1.5;
        const barHeight = 0.2;
        const healthPercent = unit.health / unit.maxHealth;

        ctx.fillStyle = "red";
        ctx.fillRect(
          unit.position.x - barWidth / 2,
          unit.position.y - 1.5,
          barWidth,
          barHeight
        );

        ctx.fillStyle = "green";
        ctx.fillRect(
          unit.position.x - barWidth / 2,
          unit.position.y - 1.5,
          barWidth * healthPercent,
          barHeight
        );
      }

      // Movement target
      if (unit.target) {
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([3 / camera.zoom, 3 / camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(unit.position.x, unit.position.y);
        ctx.lineTo(unit.target.x, unit.target.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Carrying resources indicator
      if (unit.carryingResources) {
        ctx.fillStyle = {
          wood: "#8B4513",
          food: "#32CD32",
          stone: "#708090",
          gold: "#FFD700",
        }[unit.carryingResources.type];

        ctx.beginPath();
        ctx.arc(
          unit.position.x + 0.5,
          unit.position.y - 0.5,
          0.3,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    });

    ctx.restore();

    // Draw UI elements (not affected by camera)

    // Selection box
    if (selectionBox) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        Math.min(selectionBox.start.x, selectionBox.end.x),
        Math.min(selectionBox.start.y, selectionBox.end.y),
        Math.abs(selectionBox.end.x - selectionBox.start.x),
        Math.abs(selectionBox.end.y - selectionBox.start.y)
      );
      ctx.setLineDash([]);
    }

    // Minimap
    const minimapSize = 150;
    const minimapX = width - minimapSize - 10;
    const minimapY = 10;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

    // Minimap content
    const scaleX = minimapSize / mapSize.width;
    const scaleY = minimapSize / mapSize.height;

    // Buildings on minimap
    buildings.forEach((building) => {
      const player = players.find((p) => p.id === building.playerId);
      if (!player) return;

      ctx.fillStyle = player.color;
      ctx.fillRect(
        minimapX + building.position.x * scaleX,
        minimapY + building.position.y * scaleY,
        Math.max(2, building.size.width * scaleX),
        Math.max(2, building.size.height * scaleY)
      );
    });

    // Camera view on minimap
    ctx.strokeStyle = "#FFFF00";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      minimapX + camera.x * scaleX,
      minimapY + camera.y * scaleY,
      (width / camera.zoom) * scaleX,
      (height / camera.zoom) * scaleY
    );
  }, [
    width,
    height,
    camera,
    mapSize,
    resourceNodes,
    buildings,
    units,
    players,
    selectedUnits,
    selectedBuildings,
    selectionBox,
    currentPlayerId,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-600 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

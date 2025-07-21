import React, { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import type { Position } from "../types/game";
import AdvancedRenderer from "../graphics/AdvancedRenderer";
import Renderer3D from "../graphics/Renderer3D";

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AdvancedRenderer | null>(null);
  const renderer3DRef = useRef<Renderer3D | null>(null);
  const [use3D, setUse3D] = useState(true); // Toggle for 3D mode
  const [localCamera, setLocalCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [selectionEnd, setSelectionEnd] = useState<Position>({ x: 0, y: 0 });

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

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current && !renderer3DRef.current) {
      rendererRef.current = new AdvancedRenderer({
        canvas: canvasRef.current,
        tileSize: TILE_SIZE,
        camera: localCamera,
        mapSize,
      });
      
      // Initialize 3D renderer
      renderer3DRef.current = new Renderer3D(canvasRef.current);
    }
  }, [localCamera, mapSize]);

  // Update local camera when store camera changes
  useEffect(() => {
    setLocalCamera(camera);
  }, [camera]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      if (rendererRef.current) {
        rendererRef.current.updateConfig({
          canvas,
          camera: localCamera,
          tileSize: TILE_SIZE * localCamera.zoom,
          mapSize,
        });
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [localCamera, mapSize]);

  // Enhanced render function using AdvancedRenderer or 3D Renderer
  const render = useCallback(() => {
    if (use3D && renderer3DRef.current) {
      // Use 3D renderer
      renderer3DRef.current.render(units, buildings, 16); // ~60 FPS
      
      // Update camera from local camera
      renderer3DRef.current.setCamera({ x: localCamera.x, y: localCamera.y });
    } else if (rendererRef.current) {
      // Use 2D renderer
      rendererRef.current.updateConfig({
        camera: localCamera,
        tileSize: TILE_SIZE,
        mapSize,
      });

      // Render using the advanced renderer
      rendererRef.current.render(
        units,
        buildings,
        fogOfWar,
        selectedUnits,
        selectedBuildings
      );
    }

    // Draw selection box if selecting
    if (isSelecting) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            Math.min(selectionStart.x, selectionEnd.x),
            Math.min(selectionStart.y, selectionEnd.y),
            Math.abs(selectionEnd.x - selectionStart.x),
            Math.abs(selectionEnd.y - selectionStart.y)
          );
          ctx.setLineDash([]);
        }
      }
    }
  }, [
    units,
    buildings,
    fogOfWar,
    selectedUnits,
    selectedBuildings,
    localCamera,
    mapSize,
    isSelecting,
    selectionStart,
    selectionEnd,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  const screenToWorld = (screenX: number, screenY: number): Position => {
    return {
      x: localCamera.x + screenX / (TILE_SIZE * localCamera.zoom),
      y: localCamera.y + screenY / (TILE_SIZE * localCamera.zoom),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 2) {
      // Right click
      e.preventDefault();
      const worldPos = screenToWorld(x, y);

      if (selectedUnits.length > 0) {
        moveUnitsTo(worldPos);

        // Add movement animation for selected units
        if (rendererRef.current) {
          selectedUnits.forEach((unitId) => {
            const unit = units.find((u) => u.id === unitId);
            if (unit) {
              rendererRef.current!.addAnimation({
                id: `move_${unitId}`,
                startTime: Date.now(),
                duration: 1000,
                fromPosition: unit.position,
                toPosition: worldPos,
                type: "movement",
              });
            }
          });
        }
      }
      return;
    }

    if (e.button === 0) {
      // Left click
      if (e.shiftKey) {
        // Start selection box
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
      } else {
        const worldPos = screenToWorld(x, y);

        // Single unit/building selection
        let clickedSomething = false;

        // Check buildings first
        for (const building of buildings) {
          const distance = Math.sqrt(
            Math.pow(worldPos.x - building.position.x, 2) +
              Math.pow(worldPos.y - building.position.y, 2)
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
              Math.pow(worldPos.x - unit.position.x, 2) +
                Math.pow(worldPos.y - unit.position.y, 2)
            );
            if (distance < 1 && unit.playerId === currentPlayerId) {
              selectUnits([unit.id]);
              clickedSomething = true;
              break;
            }
          }
        }

        if (!clickedSomething) {
          // Clear selection and start panning
          selectUnits([]);
          selectBuildings([]);
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting) {
      setSelectionEnd({ x, y });
    } else if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / (TILE_SIZE * localCamera.zoom);
      const deltaY = (e.clientY - dragStart.y) / (TILE_SIZE * localCamera.zoom);

      if (use3D && renderer3DRef.current) {
        // 3D camera movement
        renderer3DRef.current.moveCamera(-deltaX * 0.1, -deltaY * 0.1);
      } else {
        // 2D camera movement
        const newCamera = {
          ...localCamera,
          x: localCamera.x - deltaX,
          y: localCamera.y - deltaY,
        };

        setLocalCamera(newCamera);
        setCamera(newCamera);
      }
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const startWorld = screenToWorld(selectionStart.x, selectionStart.y);
        const endWorld = screenToWorld(selectionEnd.x, selectionEnd.y);

        const minX = Math.min(startWorld.x, endWorld.x);
        const maxX = Math.max(startWorld.x, endWorld.x);
        const minY = Math.min(startWorld.y, endWorld.y);
        const maxY = Math.max(startWorld.y, endWorld.y);

        // Select units in area
        const selectedUnitIds: string[] = [];
        units.forEach((unit) => {
          if (
            unit.playerId === currentPlayerId &&
            unit.position.x >= minX &&
            unit.position.x <= maxX &&
            unit.position.y >= minY &&
            unit.position.y <= maxY
          ) {
            selectedUnitIds.push(unit.id);
          }
        });
        selectUnits(selectedUnitIds);
      }
      setIsSelecting(false);
    }

    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    if (use3D && renderer3DRef.current) {
      // 3D zoom
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      renderer3DRef.current.zoomCamera(zoomDelta);
    } else {
      // 2D zoom
      const newCamera = {
        ...localCamera,
        zoom: Math.max(0.2, Math.min(3, localCamera.zoom * zoomFactor)),
      };
      setLocalCamera(newCamera);
      setCamera(newCamera);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      {/* 3D Toggle Button */}
      <button
        onClick={() => setUse3D(!use3D)}
        className={`absolute top-4 right-4 z-10 px-4 py-2 rounded font-semibold transition-colors ${
          use3D 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-600 text-white hover:bg-gray-700'
        }`}
      >
        {use3D ? '3D Mode' : '2D Mode'}
      </button>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className="w-full h-full border border-gray-700 bg-gray-900 cursor-crosshair"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm">
        <div className="space-y-1">
          <div>Left Click: Select unit/building</div>
          <div>Shift + Left Click + Drag: Select multiple units</div>
          <div>Right Click: Move selected units</div>
          <div>Mouse Wheel: Zoom in/out</div>
          <div>Drag: Pan camera</div>
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
        <div>Zoom: {Math.round(localCamera.zoom * 100)}%</div>
        <div>
          Selected: {selectedUnits.length} units, {selectedBuildings.length}{" "}
          buildings
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;

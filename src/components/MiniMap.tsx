import React, { useRef, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export const MiniMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { units, buildings, mapSize, camera, setCamera } = useGameStore();

  const MINIMAP_SIZE = 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear minimap
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Scale factors
    const scaleX = MINIMAP_SIZE / mapSize.width;
    const scaleY = MINIMAP_SIZE / mapSize.height;

    // Draw buildings
    buildings.forEach((building) => {
      const x = building.position.x * scaleX;
      const y = building.position.y * scaleY;
      const size = 4;

      const player = useGameStore
        .getState()
        .players.find((p) => p.id === building.playerId);
      ctx.fillStyle = player?.color || "#666";
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    });

    // Draw units
    units.forEach((unit) => {
      const x = unit.position.x * scaleX;
      const y = unit.position.y * scaleY;
      const size = 2;

      const player = useGameStore
        .getState()
        .players.find((p) => p.id === unit.playerId);
      ctx.fillStyle = player?.color || "#666";
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    });

    // Draw camera viewport
    const viewportWidth = (window.innerWidth / 32) * scaleX; // Approximate viewport width
    const viewportHeight = (window.innerHeight / 32) * scaleY; // Approximate viewport height
    const viewportX = camera.x * scaleX;
    const viewportY = camera.y * scaleY;

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }, [units, buildings, mapSize, camera]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coordinates to world coordinates
    const worldX = (clickX / MINIMAP_SIZE) * mapSize.width;
    const worldY = (clickY / MINIMAP_SIZE) * mapSize.height;

    // Center camera on clicked position
    setCamera({
      ...camera,
      x: worldX - 20, // Offset to center
      y: worldY - 15,
    });
  };

  return (
    <div className="absolute top-4 right-4 bg-slate-800 border border-slate-600 rounded p-2">
      <div className="text-white text-sm font-medium mb-2">Mini Map</div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onClick={handleMinimapClick}
        className="border border-slate-600 cursor-pointer bg-gray-900"
      />
    </div>
  );
};

import React from "react";
import { useGameStore } from "../store/gameStore";

export const ResourceBar: React.FC = () => {
  const { players, currentPlayerId } = useGameStore();
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  if (!currentPlayer) return null;

  const { resources } = currentPlayer;

  const formatResource = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
      <div className="flex space-x-6 text-white">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="font-medium">Oil:</span>
          <span className="text-amber-400">
            {formatResource(resources.oil)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span className="font-medium">Steel:</span>
          <span className="text-gray-300">
            {formatResource(resources.steel)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="font-medium">Energy:</span>
          <span className="text-blue-400">
            {formatResource(resources.energy)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="font-medium">Money:</span>
          <span className="text-green-400">
            ${formatResource(resources.money)}
          </span>
        </div>
      </div>
    </div>
  );
};

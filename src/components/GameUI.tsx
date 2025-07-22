import React from "react";
import { useRTSGameStore } from "../store/rtsGameStore";
import type { UnitType, BuildingType } from "../types/rts-game";

export const GameUI: React.FC = () => {
  const {
    players,
    currentPlayerId,
    selectedUnits,
    selectedBuildings,
    units,
    buildings,
    trainUnit,
    canAfford,
  } = useRTSGameStore();

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const selectedUnit =
    selectedUnits.length === 1
      ? units.find((u) => u.id === selectedUnits[0])
      : null;
  const selectedBuilding =
    selectedBuildings.length === 1
      ? buildings.find((b) => b.id === selectedBuildings[0])
      : null;

  if (!currentPlayer) return null;

  const unitCosts = {
    villager: { wood: 0, food: 50, stone: 0, gold: 0 },
    soldier: { wood: 0, food: 60, stone: 0, gold: 20 },
    archer: { wood: 25, food: 45, stone: 0, gold: 25 },
    cavalry: { wood: 0, food: 80, stone: 0, gold: 70 },
    tank: { wood: 0, food: 0, stone: 100, gold: 150 },
    engineer: { wood: 0, food: 75, stone: 0, gold: 50 },
  };

  const buildingCosts = {
    town_center: { wood: 0, food: 0, stone: 600, gold: 0 },
    house: { wood: 30, food: 0, stone: 0, gold: 0 },
    barracks: { wood: 175, food: 0, stone: 0, gold: 0 },
    archery_range: { wood: 175, food: 0, stone: 0, gold: 0 },
    stable: { wood: 175, food: 0, stone: 0, gold: 0 },
    factory: { wood: 200, food: 0, stone: 150, gold: 100 },
    farm: { wood: 60, food: 0, stone: 0, gold: 0 },
    lumber_mill: { wood: 100, food: 0, stone: 0, gold: 0 },
    mining_camp: { wood: 100, food: 0, stone: 0, gold: 0 },
    tower: { wood: 50, food: 0, stone: 125, gold: 0 },
  };

  const handleTrainUnit = (unitType: UnitType) => {
    if (selectedBuilding) {
      trainUnit(selectedBuilding.id, unitType);
    }
  };

  const ResourceDisplay = () => (
    <div className="bg-gray-800 text-white p-4 rounded">
      <h3 className="text-lg font-bold mb-2">Resources</h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-yellow-400">🪵</div>
          <div>{currentPlayer.resources.wood}</div>
        </div>
        <div className="text-center">
          <div className="text-green-400">🌾</div>
          <div>{currentPlayer.resources.food}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">🗿</div>
          <div>{currentPlayer.resources.stone}</div>
        </div>
        <div className="text-center">
          <div className="text-yellow-300">💰</div>
          <div>{currentPlayer.resources.gold}</div>
        </div>
      </div>
      <div className="mt-2 text-sm">
        Population: {currentPlayer.population}/{currentPlayer.maxPopulation}
      </div>
    </div>
  );

  const UnitPanel = () => {
    if (!selectedUnit) return null;

    return (
      <div className="bg-gray-800 text-white p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Selected Unit</h3>
        <div className="space-y-2">
          <div>Type: {selectedUnit.type}</div>
          <div>
            Health: {selectedUnit.health}/{selectedUnit.maxHealth}
          </div>
          <div>Task: {selectedUnit.task}</div>
          {selectedUnit.carryingResources && (
            <div>
              Carrying: {selectedUnit.carryingResources.amount}{" "}
              {selectedUnit.carryingResources.type}
            </div>
          )}
        </div>
      </div>
    );
  };

  const BuildingPanel = () => {
    if (!selectedBuilding) return null;

    const canTrainUnits = [
      "town_center",
      "barracks",
      "archery_range",
      "stable",
      "factory",
    ].includes(selectedBuilding.type);
    const availableUnits: UnitType[] =
      selectedBuilding.type === "town_center"
        ? ["villager"]
        : selectedBuilding.type === "barracks"
        ? ["soldier"]
        : selectedBuilding.type === "archery_range"
        ? ["archer"]
        : selectedBuilding.type === "stable"
        ? ["cavalry"]
        : selectedBuilding.type === "factory"
        ? ["tank", "engineer"]
        : [];

    return (
      <div className="bg-gray-800 text-white p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Selected Building</h3>
        <div className="space-y-2 mb-4">
          <div>Type: {selectedBuilding.type.replace("_", " ")}</div>
          <div>
            Health: {selectedBuilding.health}/{selectedBuilding.maxHealth}
          </div>
          <div>
            Status:{" "}
            {selectedBuilding.isConstructed
              ? "Complete"
              : `${selectedBuilding.constructionProgress}%`}
          </div>
          {selectedBuilding.productionQueue.length > 0 && (
            <div>
              Queue:{" "}
              {selectedBuilding.productionQueue
                .map((item) => item.type)
                .join(", ")}
            </div>
          )}
        </div>

        {canTrainUnits && selectedBuilding.isConstructed && (
          <div>
            <h4 className="font-semibold mb-2">Train Units</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableUnits.map((unitType) => {
                const cost = unitCosts[unitType];
                const affordable = canAfford(currentPlayerId, cost);

                return (
                  <button
                    key={unitType}
                    onClick={() => handleTrainUnit(unitType)}
                    disabled={!affordable}
                    className={`p-2 rounded text-sm ${
                      affordable
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-600 cursor-not-allowed"
                    }`}
                  >
                    <div>{unitType}</div>
                    <div className="text-xs">
                      {cost.wood > 0 && `🪵${cost.wood} `}
                      {cost.food > 0 && `🌾${cost.food} `}
                      {cost.stone > 0 && `🗿${cost.stone} `}
                      {cost.gold > 0 && `💰${cost.gold}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const BuildingMenu = () => {
    const canBuild = selectedUnits.some((unitId) => {
      const unit = units.find((u) => u.id === unitId);
      return unit && (unit.type === "villager" || unit.type === "engineer");
    });

    if (!canBuild) return null;

    const buildingTypes: BuildingType[] = [
      "house",
      "barracks",
      "archery_range",
      "stable",
      "factory",
      "farm",
      "lumber_mill",
      "mining_camp",
      "tower",
    ];

    return (
      <div className="bg-gray-800 text-white p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Build</h3>
        <div className="grid grid-cols-3 gap-2">
          {buildingTypes.map((buildingType) => {
            const cost = buildingCosts[buildingType];
            const affordable = canAfford(currentPlayerId, cost);

            return (
              <button
                key={buildingType}
                onClick={() => {
                  // For now, just log. In real implementation, you'd enter building placement mode
                  console.log(`Building ${buildingType}`);
                }}
                disabled={!affordable}
                className={`p-2 rounded text-xs ${
                  affordable
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                <div>{buildingType.replace("_", " ")}</div>
                <div className="text-xs">
                  {cost.wood > 0 && `🪵${cost.wood} `}
                  {cost.food > 0 && `🌾${cost.food} `}
                  {cost.stone > 0 && `🗿${cost.stone} `}
                  {cost.gold > 0 && `💰${cost.gold}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 p-4">
      <div className="flex gap-4">
        <ResourceDisplay />

        {selectedUnits.length === 1 && <UnitPanel />}
        {selectedBuildings.length === 1 && <BuildingPanel />}
        {selectedUnits.length > 0 && <BuildingMenu />}

        {selectedUnits.length === 0 && selectedBuildings.length === 0 && (
          <div className="bg-gray-800 text-white p-4 rounded">
            <h3 className="text-lg font-bold">Controls</h3>
            <div className="text-sm space-y-1">
              <div>• Left click: Select units/buildings</div>
              <div>• Right click: Move/Attack/Gather</div>
              <div>• Mouse wheel: Zoom</div>
              <div>• WASD/Arrow keys: Pan camera</div>
              <div>• ESC: Clear selection</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { useGameStore } from "../store/gameStore";
import type { UnitType, BuildingType } from "../types/game";

export const CommandPanel: React.FC = () => {
  const {
    selectedUnits,
    selectedBuildings,
    units,
    buildings,
    currentPlayerId,
    constructBuilding,
    produceUnit,
    canAfford,
    players,
  } = useGameStore();

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const selectedUnitData = units.filter((u) => selectedUnits.includes(u.id));
  const selectedBuildingData = buildings.filter((b) =>
    selectedBuildings.includes(b.id)
  );

  const buildingCosts = {
    barracks: { oil: 50, steel: 200, energy: 100, money: 300 },
    vehicle_factory: { oil: 100, steel: 400, energy: 200, money: 600 },
    airbase: { oil: 200, steel: 600, energy: 300, money: 1000 },
    power_plant: { oil: 0, steel: 300, energy: 0, money: 500 },
    oil_refinery: { oil: 0, steel: 250, energy: 150, money: 400 },
    steel_mill: { oil: 100, steel: 200, energy: 200, money: 450 },
    research_lab: { oil: 50, steel: 300, energy: 250, money: 700 },
    defense_turret: { oil: 30, steel: 150, energy: 100, money: 250 },
  };

  const unitCosts = {
    infantry: { oil: 0, steel: 20, energy: 10, money: 100 },
    tank: { oil: 50, steel: 100, energy: 30, money: 300 },
    drone: { oil: 20, steel: 60, energy: 40, money: 200 },
    jet: { oil: 100, steel: 150, energy: 80, money: 500 },
    helicopter: { oil: 80, steel: 120, energy: 60, money: 400 },
    missile_launcher: { oil: 60, steel: 80, energy: 50, money: 350 },
    engineer: { oil: 0, steel: 30, energy: 20, money: 150 },
  };

  const handleBuildingConstruction = (type: BuildingType) => {
    // For demo, place at a default position - in a real game, this would be interactive
    constructBuilding(type, { x: 20, y: 20 });
  };

  const handleUnitProduction = (unitType: UnitType) => {
    if (selectedBuildingData.length > 0) {
      produceUnit(selectedBuildingData[0].id, unitType);
    }
  };

  const renderBuildingOptions = () => {
    const canBuildFrom = selectedBuildingData.filter(
      (b) => b.type === "command_center"
    );
    if (canBuildFrom.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">
          Construct Buildings
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(buildingCosts).map(([building, cost]) => {
            const canAffordBuilding =
              currentPlayer && canAfford(currentPlayerId, cost);
            return (
              <button
                key={building}
                onClick={() =>
                  handleBuildingConstruction(building as BuildingType)
                }
                disabled={!canAffordBuilding}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  canAffordBuilding
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                <div>{building.replace("_", " ").toUpperCase()}</div>
                <div className="text-xs">
                  ${cost.money} | {cost.steel}S | {cost.energy}E
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUnitProduction = () => {
    if (selectedBuildingData.length === 0) return null;

    const building = selectedBuildingData[0];
    let availableUnits: UnitType[] = [];

    switch (building.type) {
      case "barracks":
        availableUnits = ["infantry", "engineer"];
        break;
      case "vehicle_factory":
        availableUnits = ["tank", "missile_launcher"];
        break;
      case "airbase":
        availableUnits = ["jet", "helicopter", "drone"];
        break;
      default:
        return null;
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Produce Units</h3>
        <div className="grid grid-cols-2 gap-2">
          {availableUnits.map((unitType) => {
            const cost = unitCosts[unitType];
            const canAffordUnit =
              currentPlayer && canAfford(currentPlayerId, cost);

            return (
              <button
                key={unitType}
                onClick={() => handleUnitProduction(unitType)}
                disabled={!canAffordUnit}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  canAffordUnit
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                <div>{unitType.replace("_", " ").toUpperCase()}</div>
                <div className="text-xs">
                  ${cost.money} | {cost.steel}S | {cost.energy}E
                </div>
              </button>
            );
          })}
        </div>

        {building.productionQueue.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-white mb-2">
              Production Queue
            </h4>
            {building.productionQueue.map((item, index) => (
              <div key={index} className="bg-slate-700 p-2 rounded mb-1">
                <div className="flex justify-between text-sm text-white">
                  <span>{item.type.replace("_", " ").toUpperCase()}</span>
                  <span>{Math.round(item.progress)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUnitInfo = () => {
    if (selectedUnitData.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">
          Selected Units ({selectedUnitData.length})
        </h3>

        {selectedUnitData.slice(0, 5).map((unit) => (
          <div key={unit.id} className="bg-slate-700 p-2 rounded">
            <div className="flex justify-between text-sm text-white">
              <span>{unit.type.replace("_", " ").toUpperCase()}</span>
              <span>
                {unit.health}/{unit.maxHealth} HP
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}

        {selectedUnitData.length > 5 && (
          <div className="text-sm text-gray-400">
            +{selectedUnitData.length - 5} more units selected
          </div>
        )}
      </div>
    );
  };

  const renderBuildingInfo = () => {
    if (selectedBuildingData.length === 0) return null;

    const building = selectedBuildingData[0];

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">
          {building.type.replace("_", " ").toUpperCase()}
        </h3>

        <div className="bg-slate-700 p-2 rounded">
          <div className="flex justify-between text-sm text-white">
            <span>Health</span>
            <span>
              {building.health}/{building.maxHealth}
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{
                width: `${(building.health / building.maxHealth) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {!building.isConstructed && (
          <div className="bg-slate-700 p-2 rounded">
            <div className="flex justify-between text-sm text-white">
              <span>Construction</span>
              <span>{Math.round(building.constructionProgress)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${building.constructionProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
      <div className="space-y-6">
        {selectedBuildingData.length > 0 && (
          <>
            {renderBuildingInfo()}
            {renderUnitProduction()}
            {renderBuildingOptions()}
          </>
        )}

        {selectedUnitData.length > 0 && renderUnitInfo()}

        {selectedUnits.length === 0 &&
          selectedBuildings.length === 0 &&
          renderBuildingOptions()}
      </div>
    </div>
  );
};

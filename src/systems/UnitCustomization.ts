import type { UnitType } from "../types/game";

export interface UnitUpgrade {
  id: string;
  name: string;
  description: string;
  cost: {
    oil: number;
    steel: number;
    energy: number;
    money: number;
  };
  effects: {
    healthMultiplier?: number;
    damageMultiplier?: number;
    speedMultiplier?: number;
    rangeMultiplier?: number;
    specialAbility?: string;
  };
  prerequisites: string[];
}

export interface CustomUnit {
  baseType: UnitType;
  upgrades: string[];
  totalCost: {
    oil: number;
    steel: number;
    energy: number;
    money: number;
  };
  stats: {
    health: number;
    damage: number;
    speed: number;
    range: number;
  };
}

const availableUpgrades: Record<UnitType, UnitUpgrade[]> = {
  infantry: [
    {
      id: "armor_plating",
      name: "Armor Plating",
      description: "Increases infantry survivability",
      cost: { oil: 0, steel: 50, energy: 20, money: 100 },
      effects: { healthMultiplier: 1.5 },
      prerequisites: [],
    },
    {
      id: "advanced_weapons",
      name: "Advanced Weapons",
      description: "Better firearms for increased damage",
      cost: { oil: 20, steel: 30, energy: 40, money: 150 },
      effects: { damageMultiplier: 1.3 },
      prerequisites: [],
    },
    {
      id: "combat_stimulants",
      name: "Combat Stimulants",
      description: "Increases movement and reaction speed",
      cost: { oil: 0, steel: 0, energy: 50, money: 200 },
      effects: { speedMultiplier: 1.4 },
      prerequisites: ["advanced_weapons"],
    },
  ],

  tank: [
    {
      id: "reactive_armor",
      name: "Reactive Armor",
      description: "Advanced armor system",
      cost: { oil: 30, steel: 100, energy: 50, money: 300 },
      effects: { healthMultiplier: 1.8 },
      prerequisites: [],
    },
    {
      id: "cannon_upgrade",
      name: "Cannon Upgrade",
      description: "Larger caliber main gun",
      cost: { oil: 50, steel: 80, energy: 30, money: 250 },
      effects: { damageMultiplier: 1.5, rangeMultiplier: 1.2 },
      prerequisites: [],
    },
    {
      id: "improved_engine",
      name: "Improved Engine",
      description: "Better mobility and speed",
      cost: { oil: 60, steel: 40, energy: 60, money: 200 },
      effects: { speedMultiplier: 1.3 },
      prerequisites: [],
    },
  ],

  drone: [
    {
      id: "stealth_coating",
      name: "Stealth Coating",
      description: "Reduces detection range",
      cost: { oil: 40, steel: 20, energy: 80, money: 300 },
      effects: { specialAbility: "stealth" },
      prerequisites: [],
    },
    {
      id: "extended_battery",
      name: "Extended Battery",
      description: "Longer operation time and range",
      cost: { oil: 0, steel: 30, energy: 100, money: 200 },
      effects: { rangeMultiplier: 1.5, speedMultiplier: 1.1 },
      prerequisites: [],
    },
    {
      id: "precision_targeting",
      name: "Precision Targeting",
      description: "Advanced targeting systems",
      cost: { oil: 20, steel: 60, energy: 120, money: 400 },
      effects: { damageMultiplier: 1.4, rangeMultiplier: 1.3 },
      prerequisites: ["extended_battery"],
    },
  ],

  jet: [
    {
      id: "afterburner",
      name: "Afterburner",
      description: "Increased speed and maneuverability",
      cost: { oil: 100, steel: 50, energy: 80, money: 500 },
      effects: { speedMultiplier: 1.6 },
      prerequisites: [],
    },
    {
      id: "air_to_air_missiles",
      name: "Air-to-Air Missiles",
      description: "Enhanced anti-aircraft capability",
      cost: { oil: 80, steel: 100, energy: 60, money: 600 },
      effects: { damageMultiplier: 1.7, rangeMultiplier: 1.4 },
      prerequisites: [],
    },
  ],

  helicopter: [
    {
      id: "armor_kit",
      name: "Armor Kit",
      description: "Additional protection systems",
      cost: { oil: 40, steel: 80, energy: 40, money: 300 },
      effects: { healthMultiplier: 1.4 },
      prerequisites: [],
    },
    {
      id: "hellfire_missiles",
      name: "Hellfire Missiles",
      description: "Anti-tank missile system",
      cost: { oil: 60, steel: 90, energy: 50, money: 400 },
      effects: { damageMultiplier: 1.6, specialAbility: "anti_armor" },
      prerequisites: [],
    },
  ],

  missile_launcher: [
    {
      id: "guided_system",
      name: "Guided System",
      description: "Improved accuracy and range",
      cost: { oil: 30, steel: 70, energy: 100, money: 350 },
      effects: { rangeMultiplier: 1.8, damageMultiplier: 1.2 },
      prerequisites: [],
    },
    {
      id: "multi_launch",
      name: "Multi-Launch System",
      description: "Can fire multiple missiles",
      cost: { oil: 50, steel: 100, energy: 80, money: 500 },
      effects: { damageMultiplier: 2.0, specialAbility: "multi_shot" },
      prerequisites: ["guided_system"],
    },
  ],

  engineer: [
    {
      id: "advanced_tools",
      name: "Advanced Tools",
      description: "Faster construction and repair",
      cost: { oil: 0, steel: 40, energy: 30, money: 150 },
      effects: { specialAbility: "fast_build" },
      prerequisites: [],
    },
    {
      id: "combat_engineer",
      name: "Combat Engineer",
      description: "Can fight while building",
      cost: { oil: 20, steel: 50, energy: 40, money: 200 },
      effects: { damageMultiplier: 1.5, healthMultiplier: 1.3 },
      prerequisites: ["advanced_tools"],
    },
  ],
};

class UnitCustomizationManager {
  public getAvailableUpgrades(unitType: UnitType): UnitUpgrade[] {
    return availableUpgrades[unitType] || [];
  }

  public createCustomUnit(
    baseType: UnitType,
    selectedUpgrades: string[],
    researchedUpgrades: string[]
  ): CustomUnit | null {
    const availableUps = this.getAvailableUpgrades(baseType);
    const validUpgrades = selectedUpgrades.filter(
      (upgradeId) =>
        availableUps.some((up) => up.id === upgradeId) &&
        researchedUpgrades.includes(upgradeId)
    );

    // Check prerequisites
    for (const upgradeId of validUpgrades) {
      const upgrade = availableUps.find((up) => up.id === upgradeId);
      if (!upgrade) continue;

      for (const prereq of upgrade.prerequisites) {
        if (!validUpgrades.includes(prereq)) {
          return null; // Prerequisites not met
        }
      }
    }

    const baseStats = this.getBaseStats(baseType);
    const upgrades = validUpgrades.map(
      (id) => availableUps.find((up) => up.id === id)!
    );

    let totalCost = this.getBaseCost(baseType);
    let finalStats = { ...baseStats };

    // Apply upgrades
    upgrades.forEach((upgrade) => {
      totalCost.oil += upgrade.cost.oil;
      totalCost.steel += upgrade.cost.steel;
      totalCost.energy += upgrade.cost.energy;
      totalCost.money += upgrade.cost.money;

      if (upgrade.effects.healthMultiplier) {
        finalStats.health *= upgrade.effects.healthMultiplier;
      }
      if (upgrade.effects.damageMultiplier) {
        finalStats.damage *= upgrade.effects.damageMultiplier;
      }
      if (upgrade.effects.speedMultiplier) {
        finalStats.speed *= upgrade.effects.speedMultiplier;
      }
      if (upgrade.effects.rangeMultiplier) {
        finalStats.range *= upgrade.effects.rangeMultiplier;
      }
    });

    return {
      baseType,
      upgrades: validUpgrades,
      totalCost,
      stats: {
        health: Math.round(finalStats.health),
        damage: Math.round(finalStats.damage),
        speed: Math.round(finalStats.speed * 10) / 10,
        range: Math.round(finalStats.range),
      },
    };
  }

  private getBaseStats(unitType: UnitType) {
    const baseStats: Record<
      UnitType,
      { health: number; damage: number; speed: number; range: number }
    > = {
      infantry: { health: 100, damage: 25, speed: 1, range: 3 },
      tank: { health: 300, damage: 75, speed: 2, range: 5 },
      drone: { health: 50, damage: 40, speed: 3, range: 8 },
      jet: { health: 150, damage: 80, speed: 4, range: 10 },
      helicopter: { health: 200, damage: 60, speed: 3, range: 7 },
      missile_launcher: { health: 120, damage: 100, speed: 1, range: 12 },
      engineer: { health: 80, damage: 15, speed: 1, range: 2 },
    };

    return baseStats[unitType];
  }

  private getBaseCost(unitType: UnitType) {
    const baseCosts: Record<
      UnitType,
      { oil: number; steel: number; energy: number; money: number }
    > = {
      infantry: { oil: 0, steel: 20, energy: 10, money: 100 },
      tank: { oil: 50, steel: 100, energy: 30, money: 300 },
      drone: { oil: 20, steel: 60, energy: 40, money: 200 },
      jet: { oil: 100, steel: 150, energy: 80, money: 500 },
      helicopter: { oil: 80, steel: 120, energy: 60, money: 400 },
      missile_launcher: { oil: 60, steel: 80, energy: 50, money: 350 },
      engineer: { oil: 0, steel: 30, energy: 20, money: 150 },
    };

    return { ...baseCosts[unitType] };
  }
}

export const unitCustomizationManager = new UnitCustomizationManager();

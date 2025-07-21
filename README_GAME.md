# Modern Warfare Strategy (WIM)

A browser-based real-time strategy game built with React, TypeScript, and modern web technologies. Set in the 21st century, players command modern military forces including tanks, drones, jets, and infantry in tactical combat scenarios.

## 🎮 Features

### Core Gameplay

- **Real-time Strategy**: Command and control units in real-time combat
- **Modern Military Units**: Infantry, tanks, drones, jets, helicopters, missile launchers, and engineers
- **Base Building**: Construct command centers, barracks, vehicle factories, airbases, and resource buildings
- **Resource Management**: Manage oil, steel, energy, and money to fuel your war machine
- **Fog of War**: Explore the battlefield and discover enemy positions
- **AI Opponents**: Face up to 4 AI opponents with different difficulty levels and strategies

### Game Modes

- **Single Player Campaign**: Battle against AI opponents
- **Skirmish Mode**: Quick battles with customizable settings
- **Hot-seat Multiplayer**: Local multiplayer support (foundation laid for online multiplayer)

### AI System

- **Three AI Strategies**:
  - **Aggressive**: Fast expansion and early attacks
  - **Defensive**: Strong economy and defensive positions
  - **Balanced**: Mix of offense and defense
- **Difficulty Levels**: Easy, Medium, and Hard AI opponents
- **Dynamic Decision Making**: AI adapts strategies based on game state

### Advanced Features

- **Unit Customization**: Upgrade units with armor, weapons, and special abilities
- **Technology Research**: Unlock new units and upgrades through research
- **Save/Load System**: Save games locally with export/import functionality
- **Victory Conditions**:
  - Domination (destroy all enemies)
  - Economic (reach resource targets)
  - Diplomatic (form alliances)

### User Interface

- **Interactive Canvas**: Click-to-select units and buildings
- **Mini-map**: Navigate large battlefields easily
- **Resource Bar**: Real-time resource tracking
- **Command Panel**: Build units and structures
- **Game Controls**: Pause, speed adjustment, and game time tracking
- **Keyboard Shortcuts**: ESC for menu, Ctrl for multi-select

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
# Run linting
npm run lint

# Preview production build
npm run preview
```

## 🎯 How to Play

### Basic Controls

- **Left Click**: Select units/buildings
- **Ctrl + Left Click**: Add to selection
- **Right Click**: Move selected units
- **Mouse Wheel**: Zoom in/out
- **ESC**: Open game menu

### Game Setup

1. Choose map size (Small, Medium, Large)
2. Select number of AI opponents (1-4)
3. Set AI difficulty and strategy
4. Choose victory condition
5. Configure starting resources

### Building Your Base

1. Start with a Command Center and basic infantry
2. Build a Barracks to train more infantry
3. Construct resource buildings (Power Plant, Oil Refinery, Steel Mill)
4. Expand with Vehicle Factory and Airbase for advanced units
5. Build Defense Turrets to protect your base

### Combat

- Group units for coordinated attacks
- Use different unit types strategically
- Infantry for scouts and base defense
- Tanks for heavy assault
- Drones for reconnaissance
- Jets for air superiority
- Consider unit strengths and weaknesses

### Victory

- **Domination**: Destroy all enemy units and buildings
- **Economic**: Accumulate target amounts of all resources
- **Diplomatic**: Form lasting alliances (future feature)

## 🛠 Technical Architecture

### Frontend Stack

- **React 19**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **Canvas API**: Game rendering

### Game Systems

- **Game Loop**: 60fps real-time updates
- **State Management**: Centralized game state with Zustand
- **AI System**: Modular AI with strategy patterns
- **Save System**: Local storage with import/export
- **Collision Detection**: Simple distance-based collision
- **Pathfinding**: Basic movement system (can be enhanced)

## 🎊 Acknowledgments

- Inspired by classic RTS games like Age of Empires and Command & Conquer
- Built with modern web technologies for accessibility and performance
- Designed for both casual and strategic players

---

**Have fun commanding your forces and achieving victory!** 🏆

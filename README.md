# Modern Warfare Strategy (WIM)

A browser-based real-time strategy game built with React, TypeScript, and modern web technologies.

![Game Screenshot](https://img.shields.io/badge/Status-Playable-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

## Live Demo

Visit the live game at: `http://localhost:5173` (when running locally)

## Overview

Command modern military forces in this 21st-century real-time strategy game. Build bases, manage resources, and lead armies of tanks, drones, jets, and infantry against intelligent AI opponents.

### Key Features

- **Real-time Strategy Combat** - Command units in real-time battles
- **Smart AI Opponents** - Face up to 4 AI enemies with different strategies
- **Base Building** - Construct military facilities and resource buildings
- **Resource Management** - Balance oil, steel, energy, and money
- **Fog of War** - Explore and discover the battlefield
- **Save/Load System** - Continue your campaigns
- **Modern UI** - Intuitive controls and professional interface

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Matorota/REPO_NAME.git
cd REPO_NAME

# Install dependencies
npm install

# Start the game
npm run dev
```

## How to Play

1. **Setup**: Choose map size, AI opponents, and difficulty
2. **Build**: Start with Command Center, add Barracks and resource buildings
3. **Expand**: Train units and explore the map
4. **Conquer**: Attack enemy bases and achieve victory!

### Controls

- **Left Click**: Select units/buildings
- **Right Click**: Move units
- **Mouse Wheel**: Zoom
- **ESC**: Game menu

## Tech Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool
- **Canvas API** - Game rendering

## Architecture

```
src/
├── components/     # React UI components
├── store/         # Game state management
├── systems/       # Game systems (AI, save/load, multiplayer)
├── ai/           # AI decision making
└── types/        # TypeScript definitions
```

## Roadmap

- Network Multiplayer - Online battles
- Campaign Mode - Story-driven missions
- Map Editor - Custom battlefields
- Advanced Graphics - WebGL rendering
- Mobile Support - Touch controls

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

Inspired by classic RTS games like Age of Empires and Command & Conquer, built with modern web technologies for accessibility and performance.

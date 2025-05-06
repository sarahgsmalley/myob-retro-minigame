# MYOB Retro Runner

An HTML5 Canvas-based endless runner game featuring the MYOB brand colours and theme.

![MYOB Retro Runner Game Screenshot](assets/game-screenshot.png)

## Game Description

MYOB Retro Runner is a browser-based endless runner game where players control a character that must jump over enemies (the Tax Man) while collecting coins for points. The game features increasing difficulty, power-ups, and special visual effects.

The game was developed with the help of AI using the Cursor IDE in order to test how the AI could assist in rapid prototyping. All images were also generated using AI.

## Game Mechanics

### Core Gameplay

- **Controls**: Press Space or Up Arrow to jump. Press again while in the air for a double-jump.
- **Character Movement**: The character remains in a fixed horizontal position while the background and obstacles scroll toward the player.
- **Scoring**: Points are earned in two ways:
  - Time-based: 10 points per second of play
  - Coins: 50 points per regular coin, 150 points per high-value coin
- **Game Over**: Occurs when the player collides with an enemy.

### Unique Features

- **Progressive Difficulty**: Speed increases gradually over time and accelerates at score milestones (1000, 2000, 5000, 10000 points).
- **Double Jump**: Allows reaching high-value coins that appear at greater heights.
- **Power-Up System**: Collecting 20 coins activates a power-up mode that:
  - Makes the player invincible for 10 seconds
  - Applies a speed boost
  - Adds rainbow visual effects and particles
  - Spawns a sequence of coins and enemies to navigate through
- **Recovery Period**: After a power-up ends, the game provides a 2-second safety period with no enemies nearby.
- **Visual Effects**:
  - Particle effects for double jumps
  - Rainbow glow and sparkles during power-up mode
  - High-value coins have a pulsing glow effect
  - Text shadows throughout the game

## Technical Implementation

### Architecture

The game is built using vanilla JavaScript with the HTML5 Canvas API, requiring no external libraries or frameworks. This ensures fast performance and broad browser compatibility.

Key components include:

- **Canvas Rendering**: All game elements are drawn on a single HTML5 canvas
- **Game Loop**: Utilizes requestAnimationFrame for smooth animation
- **Collision Detection**: Uses rectangle-based hitboxes with adjustable margins
- **Particle System**: Manages sparkles and visual effects
- **Dynamic Difficulty**: Scales enemy spacing and speed based on player progress

### Files

- **index.html**: Basic HTML structure with canvas element
- **style.css**: Minimal CSS styling for the game container
- **game.js**: All game logic, rendering, and mechanics
- **assets/**: Folder containing game images and sprites

## Running the Game

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Click the game canvas or press Space/Up Arrow to start
4. Jump over enemies and collect coins!

## Browser Compatibility

The game works best in modern browsers that support HTML5 Canvas:
- Chrome
- Firefox
- Safari
- Edge
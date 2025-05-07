// ====== CONFIGURATION ======
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 533;
const GROUND_Y = CANVAS_HEIGHT - 60;
const GRAVITY = 0.5;
const TERMINAL_VELOCITY = 9;
const JUMP_VELOCITY = -13;
const DOUBLE_JUMP_VELOCITY = -14; // Stronger second jump
const INITIAL_SCROLL_SPEED = 4; // Starting game speed
const MAX_SCROLL_SPEED = 12;    // Maximum possible game speed
const SPEED_INCREASE_INTERVAL = 1000; // Time between speed increases (ms)
const SPEED_INCREASE_AMOUNT = 0.05;  // How much speed increases each interval
const COIN_SIZE = 32;
const ENEMY_WIDTH = 56;
const ENEMY_HEIGHT = 68; // Match player height
const PLAYER_WIDTH = 56;
const PLAYER_HEIGHT = 68;
const COLLISION_MARGIN = 12; // Pixels to shrink the collision box from the visible sprite
const SCORE_INCREASE_PER_SECOND = 10; // Points per second
const SCORE_INCREASE_PER_COIN = 50;   // Points per coin collected
const POWERUP_COINS_REQUIRED = 20;  // Coins needed to trigger power-up
const POWERUP_DURATION = 10000;     // Power-up duration in ms (10 seconds)
const POWERUP_SPEED_BOOST = 3;      // How much faster during power-up
const POWERUP_RECOVERY_DURATION = 2000; // Recovery period after power-up ends (ms)
const MIN_COINS_ON_SCREEN = 3;  // Minimum coins that should be on screen
const MIN_ENEMIES_ON_SCREEN = 1; // Minimum enemies on screen (increases with score)
const POWER_UP_ENTITY_BOOST = true; // Spawn extra entities when power-up activates
const HIGH_COIN_CHANCE = 0.25;      // 25% chance for higher-value coins 
const HIGH_COIN_HEIGHT_MIN = 280;   // Higher minimum height (was 200)
const HIGH_COIN_HEIGHT_MAX = 350;   // Higher maximum height (was 250)
const HIGH_COIN_BONUS = 3;          // Bonus multiplier for high coins (3x points)
const HIGH_COIN_SIZE = 40;          // Slightly larger size for high-value coins
const COIN_HORIZONTAL_GAP_MIN = 120; // Minimum horizontal gap between coins
const COIN_VERTICAL_TIERS = [
  { min: 60, max: 120 },   // Low tier (regular jump)
  { min: 150, max: 200 },  // Mid tier (challenging jump)
  { min: 280, max: 350 }   // High tier (double jump required)
];
const ENEMY_BASE_GAP_MIN = 400;  // Minimum gap between enemies at start
const ENEMY_BASE_GAP_MAX = 800;  // Maximum gap between enemies at start
const ENEMY_GAP_REDUCTION_FACTOR = 0.65; // How much the gap shrinks as speed increases
const ENEMY_MIN_GAP_LIMIT = 120;  // Absolute minimum gap regardless of speed
const ENEMY_SPAWN_VARIANCE = 0.3;     // Random variance in enemy spawn timing (0-1)

// ====== COLOR PALETTE ======
const COLOR_PURPLE = '#7b14ef';
const COLOR_LIGHT_PURPLE = '#c497fe';
const COLOR_VERY_LIGHT_PURPLE = '#ebdcfd';
const COLOR_PINK = '#fe02a7';
const COLOR_CREAM = '#e6e0d1';

// ====== LOAD ASSETS ======
const playerStillImg = new Image();
playerStillImg.src = 'assets/player-still.png';

const playerJumpImg = new Image();
playerJumpImg.src = 'assets/player-jump.png';

const coinImg = new Image();
coinImg.src = 'assets/coin.png';

const enemyImg = new Image();
enemyImg.src = 'assets/enemy.png';

// We'll initialize the background image after the canvas is created

// ====== GAME STATE ======
let canvas, ctx;
let gameState = 'start'; // 'start', 'running', 'gameover'
let player, coins, enemies, score, totalScore, gameStartTime, scrollSpeed, lastSpeedIncrease, lastCoinSpawn, lastEnemySpawn;
let bgImg, bgOffset = 0, bgLoaded = false;
let powerUpActive = false;
let powerUpStartTime = 0;
let powerUpCoinsCollected = 0;
let normalScrollSpeed = 0;  // Store normal speed during power-up
let powerUpRecoveryActive = false;
let powerUpRecoveryEndTime = 0;
let powerUpColors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7b14ef', '#fe02a7', '#c497fe', '#ebdcfd']; // Rainbow colors
let sparkles = []; // Array to hold sparkle particles
let lastGameOverTime = 0; // Track when game over happened
let canRestart = true; // Flag to prevent multiple quick restarts

// ====== OBJECTS ======
function resetGame() {
  player = {
    x: 100,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vy: 0,
    onGround: true,
    jumpsRemaining: 2,
  };
  coins = [];
  enemies = [];
  score = 0;
  totalScore = 0;
  
  // Always reset to initial speed
  scrollSpeed = INITIAL_SCROLL_SPEED;
  
  const now = performance.now();
  gameStartTime = now;
  lastSpeedIncrease = now;
  lastCoinSpawn = now;
  lastEnemySpawn = now;
  
  // Reset power-up related vars
  powerUpActive = false;
  powerUpStartTime = 0;
  powerUpCoinsCollected = 0;
  normalScrollSpeed = INITIAL_SCROLL_SPEED;
  
  // Reset recovery state
  powerUpRecoveryActive = false;
  powerUpRecoveryEndTime = 0;
  
  // Clear any sparkles/particles
  sparkles = [];
  
  // Spawn initial entities with proper spacing
  // First coin
  const coinY = GROUND_Y - COIN_SIZE - 60 - Math.random() * 80;
  coins.push({
    x: CANVAS_WIDTH + 100,
    y: coinY,
    size: COIN_SIZE,
    isHighValue: false
  });
  
  // First enemy - much further to the right
  enemies.push({
    x: CANVAS_WIDTH + 500, // Place enemy much further away
    y: GROUND_Y - ENEMY_HEIGHT,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT
  });
}

// ====== INPUT ======
document.addEventListener('keydown', (e) => {
  if (gameState === 'running' && (e.code === 'Space' || e.code === 'ArrowUp')) {
    // Handle both ground jump and double jump
    if (player.onGround) {
      // First jump from ground
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      player.jumpsRemaining = 1; // One more jump available
    } else if (player.jumpsRemaining > 0) {
      // Double jump in air
      player.vy = DOUBLE_JUMP_VELOCITY;
      player.jumpsRemaining = 0;
      
      // Create double jump effect (small burst of particles)
      createDoubleJumpEffect();
    }
  } else if (gameState === 'gameover' && e.code === 'Space') {
    // Only allow restart if enough time has passed and the flag allows it
    if (canRestart && performance.now() - lastGameOverTime > 300) {
      canRestart = false; // Prevent multiple restarts until explicitly allowed
      startGame();
    }
  }
});

canvas = document.getElementById('gameCanvas');
ctx = canvas.getContext('2d');

// Initialize background image after canvas is ready
bgImg = new Image();
bgImg.onload = function() {
  console.log('Background loaded successfully!');
  bgLoaded = true;
  // Force a redraw when the image loads
  if (gameState === 'start') {
    showStartScreen();
  }
};
bgImg.onerror = function() {
  console.error('Failed to load background image');
};
bgImg.src = 'assets/background.png';

// Add existing click event listener
canvas.addEventListener('click', (e) => {
  if (gameState === 'gameover') {
    // Update button hit area to match new size/position
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;
    const buttonY = CANVAS_HEIGHT / 2 + 70;
    
    if (
      mx > buttonX && 
      mx < buttonX + buttonWidth &&
      my > buttonY && 
      my < buttonY + buttonHeight
    ) {
      startGame();
    }
  }
});

// Add mousemove event listener for cursor changes
canvas.addEventListener('mousemove', (e) => {
  if (gameState === 'gameover') {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;
    const buttonY = CANVAS_HEIGHT / 2 + 70;
    
    // Check if mouse is over the button
    if (
      mx > buttonX && 
      mx < buttonX + buttonWidth &&
      my > buttonY && 
      my < buttonY + buttonHeight
    ) {
      canvas.style.cursor = 'pointer'; // Change cursor to hand
    } else {
      canvas.style.cursor = 'default'; // Reset cursor
    }
  } else {
    canvas.style.cursor = 'default'; // Reset cursor when not in game over state
  }
});

// ====== GAME LOOP ======
function startGame() {
  resetGame(); // This now guarantees consistent speed
  gameState = 'running';
  canRestart = true; // Reset the restart flag
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameState !== 'running') return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ====== UPDATE ======
function update() {
  const now = performance.now();
  
  // Ensure we only update when truly running
  if (gameState !== 'running') return;
  
  // Update power-up state
  updatePowerUpState(now);
  
  // Calculate time-based score - recalculate from scratch each frame
  const gameRunningTime = (now - gameStartTime) / 1000; // seconds since game started
  const timeBasedScore = Math.floor(gameRunningTime * SCORE_INCREASE_PER_SECOND);
  const coinBasedScore = score * SCORE_INCREASE_PER_COIN;
  totalScore = timeBasedScore + coinBasedScore;
  
  // Update difficulty (handles speed increases and spawning)
  updateDifficulty(now);
  
  // Update background scroll position
  bgOffset -= scrollSpeed * 0.5;
  if (bgOffset <= -CANVAS_WIDTH) bgOffset += CANVAS_WIDTH;
  
  // Player physics with terminal velocity
  player.vy += GRAVITY;
  
  // Apply terminal velocity cap (prevents falling too fast)
  if (player.vy > TERMINAL_VELOCITY) {
    player.vy = TERMINAL_VELOCITY;
  }
  
  player.y += player.vy;
  if (player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.onGround = true;
    player.jumpsRemaining = 2; // Reset jump counter when landing
  }
  
  // Move coins and enemies
  coins.forEach((coin) => (coin.x -= scrollSpeed));
  enemies.forEach((enemy) => (enemy.x -= scrollSpeed));
  
  // Remove off-screen coins/enemies
  coins = coins.filter((coin) => coin.x + COIN_SIZE > 0);
  enemies = enemies.filter((enemy) => enemy.x + ENEMY_WIDTH > 0);
  
  // Modify coin collection to track towards power-up
  coins.forEach((coin, i) => {
    if (rectsCollide(player, { 
      x: coin.x, 
      y: coin.y, 
      width: coin.size, 
      height: coin.size 
    })) {
      // Base score for all coins is 1
      score++;
      
      // Award bonus points for high-value coins
      if (coin.isHighValue) {
        totalScore += SCORE_INCREASE_PER_COIN * HIGH_COIN_BONUS;
        
        // Add extra sparkles for high-value coins
        for (let j = 0; j < 12; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 3;
          
          sparkles.push({
            x: coin.x + coin.size/2,
            y: coin.y + coin.size/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 4,
            life: 1.0,
            color: powerUpColors[Math.floor(Math.random() * powerUpColors.length)]
          });
        }
      } else {
        totalScore += SCORE_INCREASE_PER_COIN;
      }
      
      coins.splice(i, 1);
      
      // Track coins for power-up
      if (!powerUpActive) {
        powerUpCoinsCollected++;
        
        // Check if we've collected enough for power-up
        if (powerUpCoinsCollected >= POWERUP_COINS_REQUIRED) {
          activatePowerUp();
        }
      }
    }
  });
  
  // Enemy collision (skip if power-up is active for invincibility)
  if (!powerUpActive) {
    for (let enemy of enemies) {
      // Create adjusted collision boxes that are slightly smaller than the visible sprites
      const playerCollisionBox = {
        x: player.x + COLLISION_MARGIN,
        y: player.y + COLLISION_MARGIN,
        width: player.width - (COLLISION_MARGIN * 2),
        height: player.height - (COLLISION_MARGIN * 2)
      };
      
      const enemyCollisionBox = {
        x: enemy.x + COLLISION_MARGIN,
        y: enemy.y + COLLISION_MARGIN, 
        width: enemy.width - (COLLISION_MARGIN * 2),
        height: enemy.height - (COLLISION_MARGIN * 2)
      };
      
      if (rectsCollide(playerCollisionBox, enemyCollisionBox)) {
        gameOver();
        return;
      }
    }
  }

  // Update jump particles along with other sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const sparkle = sparkles[i];
    
    // If the sparkle has velocity (jump particles), update position
    if (sparkle.vx !== undefined) {
      sparkle.x += sparkle.vx;
      sparkle.y += sparkle.vy;
      sparkle.vy += 0.1; // Gravity effect on particles
    } else {
      sparkle.y -= 0.8; // Original sparkles just float up
    }
    
    // Fade out and remove
    sparkle.life -= 0.03;
    if (sparkle.life <= 0) {
      sparkles.splice(i, 1);
    }
  }

  // Verify max height of player with double jump (debug/tuning purposes)
  /*
  // Uncomment for testing jump heights
  if (player.onGround) {
    // Track max height during jumps
    player.maxHeight = 0;
  } else {
    // Track the highest point reached
    player.maxHeight = Math.max(player.maxHeight || 0, GROUND_Y - (player.y + player.height));
    
    // Show in console for debugging
    if (player.prevY && player.y > player.prevY && player.maxHeight > 0) {
      console.log("Jump peak height:", Math.round(player.maxHeight), "pixels from ground");
    }
    player.prevY = player.y;
  }
  */
}

// Check if two rectangles overlap
function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Check if two objects' horizontal positions overlap with a minimum gap
function checkPositionOverlap(x1, width1, x2, width2, minGap) {
  const right1 = x1 + width1;
  const right2 = x2 + width2;
  
  // Return true if objects are too close (including the required gap)
  return (x1 - minGap < right2) && (right1 + minGap > x2);
}

// Function to draw the background
function drawBackground() {
  // Always draw a colored background for safety
  ctx.fillStyle = COLOR_VERY_LIGHT_PURPLE;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw the image if it's loaded
  if (bgLoaded && bgImg.complete && bgImg.naturalWidth > 0) {
    // Calculate positions carefully to avoid seams
    // Ensure bgOffset is always a whole number to prevent subpixel rendering issues
    const roundedOffset = Math.round(bgOffset);
    
    // Draw first image
    ctx.drawImage(bgImg, roundedOffset, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Calculate exact position for second image (exactly at the end of first image)
    const secondImageX = roundedOffset + CANVAS_WIDTH;
    
    // Draw second image with a 1px overlap to prevent seams
    ctx.drawImage(bgImg, secondImageX - 1, 0, CANVAS_WIDTH + 2, CANVAS_HEIGHT);
    
    // If we need a third image (when first image is scrolled almost completely off-screen)
    if (roundedOffset < -CANVAS_WIDTH + 100) {
      // Draw third image
      ctx.drawImage(bgImg, secondImageX + CANVAS_WIDTH - 1, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}

// ====== RENDER ======
function render() {
  // Background
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground();

  // Change rendering order: first enemies, then player, then coins
  
  // Enemies (SVG)
  enemies.forEach((enemy) => {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
  });
  
  // Player (PNG for still/jump with power-up effect)
  let playerImgToDraw = playerStillImg;
  if (!player.onGround && player.vy < 0) {
    playerImgToDraw = playerJumpImg;
  }

  // Draw the player with power-up effects if active
  if (powerUpActive) {
    // Rainbow effect when powered up with enhanced visuals
    ctx.save();
    
    // Calculate pulse effect (0-1) based on time - make it faster
    const pulseTime = performance.now() % 500 / 500; // 0-1 twice every second
    const pulseSize = 4 + Math.sin(pulseTime * Math.PI * 4) * 3; // Slightly smaller pulse
    
    // Draw rainbow glow behind player - more colorful rings but smaller
    for (let i = 0; i < powerUpColors.length; i++) {
      // More vibrant glow
      ctx.globalAlpha = 0.8 - (i * 0.07);
      ctx.fillStyle = powerUpColors[(i + Math.floor(performance.now() / 100)) % powerUpColors.length]; // Rotating colors
      
      // Draw colored halos that pulse - make them smaller
      ctx.beginPath();
      ctx.arc(
        player.x + player.width/2, 
        player.y + player.height/2, 
        Math.max(player.width, player.height)/1.8 + pulseSize + (i * 3), // Smaller radius
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Add sparkle effect
    // Generate new sparkles
    if (Math.random() < 0.4) { // 40% chance each frame
      for (let i = 0; i < 2; i++) { // Add 2 sparkles at a time
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 20;
        sparkles.push({
          x: player.x + player.width/2 + Math.cos(angle) * distance,
          y: player.y + player.height/2 + Math.sin(angle) * distance,
          size: Math.random() * 6 + 2,
          life: 1.0, // Full life
          color: powerUpColors[Math.floor(Math.random() * powerUpColors.length)]
        });
      }
    }
    
    // Draw and update sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sparkle = sparkles[i];
      
      // Draw the sparkle
      ctx.globalAlpha = sparkle.life;
      ctx.fillStyle = sparkle.color;
      
      // Draw star shape
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const starAngle = j * Math.PI / 4;
        const radius = (j % 2 === 0) ? sparkle.size : sparkle.size / 2;
        const x = sparkle.x + Math.cos(starAngle) * radius;
        const y = sparkle.y + Math.sin(starAngle) * radius;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      // Update sparkle life
      sparkle.life -= 0.03;
      sparkle.y -= 0.8; // Make sparkles float upward
      
      // Remove dead sparkles
      if (sparkle.life <= 0) {
        sparkles.splice(i, 1);
      }
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
    
    // Draw the actual player image on top
    ctx.drawImage(playerImgToDraw, player.x, player.y, player.width, player.height);
    
    // Draw power-up timer with more emphasis
    const timeLeft = Math.ceil((POWERUP_DURATION - (performance.now() - powerUpStartTime)) / 1000);
    
    if (timeLeft > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      
      // Animated timer text
      const timerPulse = 1 + Math.sin(performance.now() / 150) * 0.1; // Subtle size pulsing
      
      // Draw timer above player with pulsing size
      ctx.font = `bold ${Math.floor(22 * timerPulse)}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.fillText(`${timeLeft}s`, player.x + player.width/2 + 1.5, player.y - 15 + 1.5);
      
      // Rainbow color cycling for timer
      const timerColor = powerUpColors[Math.floor(performance.now() / 200) % powerUpColors.length];
      ctx.fillStyle = timerColor;
      ctx.fillText(`${timeLeft}s`, player.x + player.width/2, player.y - 15);
      
      ctx.restore();
    }
  } else {
    // Normal player drawing
    ctx.drawImage(playerImgToDraw, player.x, player.y, player.width, player.height);
    
    // Draw power-up progress if we've collected some coins
    if (powerUpCoinsCollected > 0) {
      ctx.save();
      // Position power-up counter at top right
      ctx.textAlign = 'right';
      drawTextWithShadow(`Power-Up: ${powerUpCoinsCollected}/${POWERUP_COINS_REQUIRED}`, CANVAS_WIDTH - 20, 32, 18);
      ctx.restore();
    }
  }

  // Coins (draw last to ensure they appear on top)
  coins.forEach((coin) => {
    // Check if this is a high-value coin (high coins are larger and have a special property)
    if (coin.isHighValue) {
      // Draw special high-value coin (larger, with sparkle effect)
      ctx.save();
      
      // Pulsing glow effect
      const pulseTime = performance.now() % 1000 / 1000;
      const pulseSize = 1 + Math.sin(pulseTime * Math.PI * 2) * 0.1;
      
      // Outer glow (larger for high coins)
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(
        coin.x + coin.size/2, 
        coin.y + coin.size/2, 
        coin.size/1.5 + 5, 
        0, Math.PI * 2
      );
      ctx.fillStyle = '#fe02a7'; // Pink glow
      ctx.fill();
      
      // Inner coin
      ctx.globalAlpha = 1;
      ctx.drawImage(coinImg, coin.x, coin.y, coin.size * pulseSize, coin.size * pulseSize);
      
      // Draw a small "3x" indicator
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "Inter", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${HIGH_COIN_BONUS}x`, coin.x + coin.size/2, coin.y - 5);
      
      ctx.restore();
    } else {
      // Regular coin
      ctx.drawImage(coinImg, coin.x, coin.y, coin.size, coin.size);
    }
  });

  // Score with shadow effect
  ctx.save();
  ctx.textAlign = 'left'; // Left align for everything
  
  const labelX = 20;      // Position for labels (moved left)
  const valueX = 100;     // Position for values (closer to labels)
  
  // Function to draw text with shadow - reused from showStartScreen
  function drawTextWithShadow(text, x, y, fontSize, isBold = false) {
    // Text shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Fully opaque black
    ctx.font = (isBold ? 'bold ' : '') + fontSize + 'px "Inter", Arial, sans-serif';
    ctx.fillText(text, x + 1.5, y + 1.5); // Reduced shadow offset for closer shadow
    
    // Main text
    ctx.fillStyle = '#FFFFFF'; // White text instead of purple
    ctx.fillText(text, x, y);
  }
  
  // Draw labels and values with shadow
  drawTextWithShadow(`Coins:`, labelX, 32, 24);
  drawTextWithShadow(`${score}`, valueX, 32, 24);
  
  drawTextWithShadow(`Score:`, labelX, 64, 24);
  drawTextWithShadow(`${totalScore}`, valueX, 64, 24);
  
  ctx.restore();

  // Game over overlay with shadows
  if (gameState === 'gameover') {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
    
    ctx.textAlign = 'center';
    
    // Helper function for text shadows in game over screen
    function drawGameOverText(text, x, y, fontSize, color, isBold = false) {
      ctx.save();
      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Black shadow
      ctx.font = (isBold ? 'bold ' : '') + fontSize + 'px "Inter", Arial, sans-serif';
      ctx.fillText(text, x + 1.5, y + 1.5); // Shadow offset
      
      // Main text
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    }
    
    // Game Over title in pink with shadow
    drawGameOverText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, 48, '#FFFFFF', true);
    
    // Scores with shadow - in white
    drawGameOverText(`Coins Collected: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10, 24, '#FFFFFF');
    drawGameOverText(`Final Score: ${totalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, 24, '#FFFFFF');
    
    // Button background - make it larger and more inviting
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;
    const buttonY = CANVAS_HEIGHT / 2 + 70;
    
    // Draw drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    // Gradient for button background
    const grad = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    grad.addColorStop(0, '#a46cff'); // Lighter purple top
    grad.addColorStop(1, COLOR_PURPLE); // MYOB purple bottom
    ctx.fillStyle = grad;
    // Draw rounded rectangle for button background
    const radius = 16;
    ctx.beginPath();
    ctx.moveTo(buttonX + radius, buttonY);
    ctx.lineTo(buttonX + buttonWidth - radius, buttonY);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + radius);
    ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - radius);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - radius, buttonY + buttonHeight);
    ctx.lineTo(buttonX + radius, buttonY + buttonHeight);
    ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - radius);
    ctx.lineTo(buttonX, buttonY + radius);
    ctx.quadraticCurveTo(buttonX, buttonY, buttonX + radius, buttonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // White border
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(buttonX + radius, buttonY);
    ctx.lineTo(buttonX + buttonWidth - radius, buttonY);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + radius);
    ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - radius);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - radius, buttonY + buttonHeight);
    ctx.lineTo(buttonX + radius, buttonY + buttonHeight);
    ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - radius);
    ctx.lineTo(buttonX, buttonY + radius);
    ctx.quadraticCurveTo(buttonX, buttonY, buttonX + radius, buttonY);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    
    // Button text - "Play Again?" - with matching shadow style and white text
    drawGameOverText('Play Again?', CANVAS_WIDTH / 2, buttonY + buttonHeight/2 + 7, 22, '#FFFFFF', true);
    
    ctx.restore();
  }
}

// ====== GAME OVER ======
function gameOver() {
  gameState = 'gameover';
  lastGameOverTime = performance.now();
  
  // Force a complete reset of speed-related variables right away
  scrollSpeed = INITIAL_SCROLL_SPEED;
  normalScrollSpeed = INITIAL_SCROLL_SPEED;
  
  // Make sure power-up is deactivated
  powerUpActive = false;
  powerUpStartTime = 0;
  
  // Make sure all particles are cleared
  sparkles = [];
}

// ====== INIT ======
function showStartScreen() {
  // Use requestAnimationFrame to create continuous animation
  if (gameState === 'start') {
    requestAnimationFrame(showStartScreen);
  }
  
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground();

  // Add transparent black overlay for the start screen ONLY here
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
  
  // Improved shadow function for bouncing text to prevent jitter
  function drawTextWithShadow(text, x, y, fontSize, isBold = false) {
    ctx.save();
    
    // Ensure both text and shadow use the same exact position calculations
    // Round positions to avoid subpixel rendering which causes jitter
    const posX = Math.round(x);
    const posY = Math.round(y);
    
    ctx.textAlign = 'center';
    ctx.font = (isBold ? 'bold ' : '') + fontSize + 'px "Inter", Arial, sans-serif';
    
    // Text shadow - drawn at a fixed offset from the main text
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillText(text, posX + 1.5, posY + 1.5);
    
    // Main text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, posX, posY);
    
    ctx.restore();
  }
  
  // Calculate bounce effect based on time - all texts use the same bounce
  const now = performance.now();
  // Round the bounce value to whole pixels to prevent jitter
  const bounce = Math.round(Math.sin(now / 800) * 8); // 800ms period, 8px amplitude
  
  // Draw all text with the same bounce effect
  drawTextWithShadow('MYOB Retro Runner', CANVAS_WIDTH / 2, (CANVAS_HEIGHT / 2 - 40) + bounce, 40, true);
  drawTextWithShadow('Press Space or Up Arrow to Jump, twice for Double Jump!', CANVAS_WIDTH / 2, (CANVAS_HEIGHT / 2) + bounce, 22);
  drawTextWithShadow('Collect coins for extra score, some are worth triple!', CANVAS_WIDTH / 2, (CANVAS_HEIGHT / 2 + 36) + bounce, 22);
  drawTextWithShadow('Collect 20 coins for a Power-Up!', CANVAS_WIDTH / 2, (CANVAS_HEIGHT / 2 + 72) + bounce, 22);
  drawTextWithShadow('Press Space or Up Arrow to Start', CANVAS_WIDTH / 2, (CANVAS_HEIGHT / 2 + 120) + bounce, 20, true);
}

// ====== ASSET LOADING AND MAIN ======
let assetsLoaded = 0;
const totalAssets = 4; // Background is handled separately
[playerStillImg, playerJumpImg, coinImg, enemyImg].forEach(img => {
  img.onload = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
      main(); // Start the game only when all images are loaded
    }
  };
});

function main() {
  // Start the animation loop for the start screen
  gameState = 'start';
  requestAnimationFrame(showStartScreen);
  
  // Set up event listeners
  document.addEventListener('keydown', (e) => {
    if (gameState === 'start' && (e.code === 'Space' || e.code === 'ArrowUp')) {
      startGame();
    }
  });
}

// Handles speed increases and entity spawning based on game progress
function updateDifficulty(now) {
  if (gameState !== 'running') return;
  
  // ===== GAME SPEED PROGRESSION =====
  // Increase game speed gradually over time with boost at score milestones
  if (now - lastSpeedIncrease > SPEED_INCREASE_INTERVAL) {
    const baseIncrease = SPEED_INCREASE_AMOUNT;
    
    // Apply speed multiplier based on score milestones
    // Higher scores lead to faster speed increases
    let multiplier = 1.0;
    
    if (totalScore > 10000) multiplier = 3.0;
    else if (totalScore > 5000) multiplier = 2.5;
    else if (totalScore > 2000) multiplier = 2.0;
    else if (totalScore > 1000) multiplier = 1.5;
    
    const actualIncrease = baseIncrease * multiplier;
    
    // Apply speed increase with cap
    if (scrollSpeed < MAX_SCROLL_SPEED) {
      scrollSpeed = Math.min(scrollSpeed + actualIncrease, MAX_SCROLL_SPEED);
    }
    
    lastSpeedIncrease = now;
  }
  
  // Track current speed relative to starting speed for difficulty scaling
  const speedRatio = scrollSpeed / INITIAL_SCROLL_SPEED;
  
  // ===== COIN SPAWNING LOGIC =====
  // Find coins currently visible on screen
  const visibleCoins = coins.filter(coin => coin.x > 0 && coin.x < CANVAS_WIDTH);
  const needCoins = visibleCoins.length < MIN_COINS_ON_SCREEN;
  
  // Check if we need to enforce horizontal spacing
  let canSpawnCoin = true;
  if (coins.length > 0) {
    const lastCoinX = coins[coins.length - 1].x;
    if (lastCoinX > CANVAS_WIDTH - COIN_HORIZONTAL_GAP_MIN) {
      canSpawnCoin = false;
    }
  }
  
  // Coin spawn timing accelerates with game speed
  const coinSpawnDelay = Math.max(700 - (speedRatio * 100), 300) + Math.random() * 600;
  const timeForNewCoin = now - lastCoinSpawn > coinSpawnDelay;
  
  // Spawn a new coin if needed and possible
  if ((needCoins || timeForNewCoin) && canSpawnCoin) {
    // Determine if this should be a high-value coin (can only be reached with double jump)
    const isHighCoin = Math.random() < HIGH_COIN_CHANCE;
    
    let y, size;
    
    if (isHighCoin) {
      // High-value coin positioned high, only reachable with double jump
      const tier = COIN_VERTICAL_TIERS[2]; // High tier
      y = GROUND_Y - tier.min - Math.random() * (tier.max - tier.min);
      size = HIGH_COIN_SIZE; // Larger size for high-value coins
    } else if (visibleCoins.length === 0 || Math.random() < 0.6) {
      // Most regular coins in the low tier for easy collection
      const tier = COIN_VERTICAL_TIERS[0]; // Low tier
      y = GROUND_Y - tier.min - Math.random() * (tier.max - tier.min);
      size = COIN_SIZE;
    } else {
      // Some coins in the middle tier for regular jumps
      const tier = COIN_VERTICAL_TIERS[1]; // Mid tier
      y = GROUND_Y - tier.min - Math.random() * (tier.max - tier.min);
      size = COIN_SIZE;
    }
    
    // Calculate spawn position with appropriate spacing
    const minSpacing = needCoins ? 50 : COIN_HORIZONTAL_GAP_MIN;
    const extraGap = Math.random() * 150; // Random additional space
    
    let spawnX = CANVAS_WIDTH + extraGap;
    
    // If we have existing coins, ensure minimum gap from the last one
    if (coins.length > 0) {
      const lastCoin = coins[coins.length - 1];
      spawnX = Math.max(spawnX, lastCoin.x + minSpacing + extraGap);
    }
    
    // Check against ALL enemy positions to avoid overlap
    let overlapsWithEnemy;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    
    do {
      overlapsWithEnemy = false;
      
      // Check against all enemies
      for (const enemy of enemies) {
        // Use a larger minimum gap for better separation
        if (checkPositionOverlap(spawnX, size, enemy.x, enemy.width, 75)) {
          // Move coin past this enemy with a safe margin
          spawnX = enemy.x + enemy.width + 75 + Math.random() * 50;
          overlapsWithEnemy = true;
          break;
        }
      }
      
      attempts++;
      // If we've tried too many times, just accept the position
    } while (overlapsWithEnemy && attempts < MAX_ATTEMPTS);
    
    // Add the new coin with appropriate properties
    coins.push({ 
      x: spawnX, 
      y, 
      size,
      isHighValue: isHighCoin // Track if this is a high-value coin
    });
    
    lastCoinSpawn = now;
  }
  
  // ===== ENEMY SPAWNING LOGIC =====
  // Skip enemy spawning during recovery period
  if (powerUpRecoveryActive) {
    return;
  }
  
  // Calculate difficulty factor that increases exponentially with speed
  const difficultyFactor = Math.pow(speedRatio, 1.8); // Exponential difficulty scaling
  
  // Enemy spawn timing decreases as difficulty increases
  const baseEnemySpawnDelay = Math.max(1400 - (difficultyFactor * 350), 400);
  const randomVariance = 1 + (Math.random() * ENEMY_SPAWN_VARIANCE * 2 - ENEMY_SPAWN_VARIANCE);
  const enemySpawnDelay = baseEnemySpawnDelay * randomVariance;
  
  const timeForNewEnemy = now - lastEnemySpawn > enemySpawnDelay;
  
  // Calculate dynamic gap between enemies based on speed
  // As speed increases, enemies get closer together
  let minGap = ENEMY_BASE_GAP_MIN / Math.max(difficultyFactor, 1) * ENEMY_GAP_REDUCTION_FACTOR;
  minGap = Math.max(minGap, ENEMY_MIN_GAP_LIMIT); // Don't go below absolute minimum

  // Maximum gap also decreases with speed for more challenge
  let maxGap = ENEMY_BASE_GAP_MAX / Math.max(difficultyFactor, 1) * ENEMY_GAP_REDUCTION_FACTOR;
  maxGap = Math.max(maxGap, minGap + 100); // Ensure max is always higher than min

  // Check if we can spawn based on spacing from last enemy
  let canSpawnEnemy = true;
  if (enemies.length > 0) {
    const lastEnemyX = enemies[enemies.length - 1].x;
    if (lastEnemyX > CANVAS_WIDTH - minGap) {
      canSpawnEnemy = false;
    }
  }
  
  // Dynamic enemy count increases as score increases
  let currentMinEnemies = MIN_ENEMIES_ON_SCREEN;
  if (totalScore > 5000) {
    currentMinEnemies = 3; // More enemies at higher scores
  } else if (totalScore > 2000) {
    currentMinEnemies = 2;
  }
  
  // Count enemies currently visible on screen
  const visibleEnemies = enemies.filter(enemy => enemy.x > 0 && enemy.x < CANVAS_WIDTH);
  const needEnemies = visibleEnemies.length < currentMinEnemies;
  
  // Spawn a new enemy if needed and possible
  if ((needEnemies || timeForNewEnemy) && canSpawnEnemy) {
    const y = GROUND_Y - ENEMY_HEIGHT;
    
    // Calculate spawn position with randomness
    const randomGap = minGap + Math.random() * (maxGap - minGap);
    let spawnX = CANVAS_WIDTH + randomGap * 0.3; // Start a bit past the screen edge
    
    // If we have enemies, ensure proper spacing from the last one
    if (enemies.length > 0) {
      const lastEnemy = enemies[enemies.length - 1];
      spawnX = Math.max(spawnX, lastEnemy.x + randomGap);
    }
    
    // Check for coin overlaps and adjust if needed
    let overlapsWithCoin = false;
    let adjustmentAttempts = 0;
    const MAX_ADJUSTMENTS = 3;
    
    do {
      overlapsWithCoin = false;
      for (const coin of coins) {
        if (checkPositionOverlap(spawnX, ENEMY_WIDTH, coin.x, coin.size, 75)) {
          // Move past this coin with a gap
          spawnX = coin.x + coin.size + 100 + Math.random() * 50;
          overlapsWithCoin = true;
          break;
        }
      }
      adjustmentAttempts++;
    } while (overlapsWithCoin && adjustmentAttempts < MAX_ADJUSTMENTS);
    
    // Add the new enemy
    enemies.push({ x: spawnX, y, width: ENEMY_WIDTH, height: ENEMY_HEIGHT });
    lastEnemySpawn = now;
  }
}

// Create visual particle effect when player performs a double jump
function createDoubleJumpEffect() {
  // Number of particles to create
  const jumpParticleCount = 8;
  // Colors to use for particles (white and purple shades)
  const jumpParticleColors = ['#FFFFFF', '#c497fe', '#ebdcfd'];
  
  // Create particles in a circular pattern around the player's feet
  for (let i = 0; i < jumpParticleCount; i++) {
    // Calculate angle for even distribution in a circle
    const angle = (i / jumpParticleCount) * Math.PI * 2;
    // Random speed for natural variation
    const speed = 2 + Math.random() * 2;
    
    // Add a new particle to the sparkles array
    sparkles.push({
      x: player.x + player.width / 2,
      y: player.y + player.height,
      vx: Math.cos(angle) * speed, // X velocity based on angle
      vy: Math.sin(angle) * speed, // Y velocity based on angle
      size: 3 + Math.random() * 3,
      life: 1.0, // Full life that will decrease over time
      color: jumpParticleColors[Math.floor(Math.random() * jumpParticleColors.length)]
    });
  }
}

// Check for power-up end and handle recovery period
function updatePowerUpState(now) {
  if (powerUpActive) {
    // Check if power-up duration has expired
    if (now - powerUpStartTime >= POWERUP_DURATION) {
      // End power-up
      powerUpActive = false;
      scrollSpeed = normalScrollSpeed; // Restore original speed
      sparkles = []; // Clear all sparkles when power-up ends
      
      // Start recovery period - gives player a safe transition after power-up ends
      powerUpRecoveryActive = true;
      powerUpRecoveryEndTime = now + POWERUP_RECOVERY_DURATION;
      
      // Move all visible and soon-to-appear enemies off-screen to create a gap
      // This creates a safe zone for the player after power-up invincibility ends
      const visibleEnemies = enemies.filter(enemy => enemy.x > -ENEMY_WIDTH && enemy.x < CANVAS_WIDTH + 300);
      visibleEnemies.forEach(enemy => {
        // Move enemies that are visible or about to appear off to the right
        enemy.x = CANVAS_WIDTH + 400 + Math.random() * 200;
      });
    }
  } else if (powerUpRecoveryActive) {
    // Check if recovery period is over
    if (now >= powerUpRecoveryEndTime) {
      powerUpRecoveryActive = false;
    }
  }
}

// Activate power-up mode with invincibility and special effects
function activatePowerUp() {
  powerUpActive = true;
  powerUpStartTime = performance.now();
  normalScrollSpeed = scrollSpeed;  // Store the current speed
  scrollSpeed += POWERUP_SPEED_BOOST;  // Apply speed boost
  
  // Reset the counter for next power-up
  powerUpCoinsCollected = 0;
  
  // Spawn special power-up entities if enabled
  if (POWER_UP_ENTITY_BOOST) {
    // Calculate starting position that doesn't overlap with existing enemies
    let coinStartX = CANVAS_WIDTH + 100;
    
    // Find appropriate starting position that avoids existing enemies
    for (const enemy of enemies) {
      if (enemy.x > CANVAS_WIDTH && enemy.x < coinStartX + 200) {
        coinStartX = enemy.x + enemy.width + 100;
      }
    }
    
    // Spawn a sequence of coins in a wave pattern with alternating heights
    for (let i = 0; i < 5; i++) {
      const coinX = coinStartX + (i * 150); // Spaced out coins
      
      // Alternate between low regular coins and high special coins
      let coinY, coinSize, isHighValue;
      
      if (i % 2 === 0) {
        // Regular coins at lower height (easier to collect)
        const tier = COIN_VERTICAL_TIERS[0];
        coinY = GROUND_Y - tier.min - Math.random() * (tier.max - tier.min);
        coinSize = COIN_SIZE;
        isHighValue = false;
      } else {
        // High-value coins at higher positions (require double-jump)
        const tier = COIN_VERTICAL_TIERS[2];
        coinY = GROUND_Y - tier.min - Math.random() * (tier.max - tier.min);
        coinSize = HIGH_COIN_SIZE;
        isHighValue = true;
      }
      
      coins.push({ 
        x: coinX, 
        y: coinY,
        size: coinSize,
        isHighValue
      });
    }
    
    // Spawn enemies after the coins to show off invincibility
    let enemyX = coinStartX + 750; // Start enemies well after coins
    
    for (let i = 0; i < 3; i++) {
      // Variable gaps between power-up enemies
      const gap = 150 + Math.random() * 150;
      
      if (i > 0) {
        enemyX += gap;
      }
      
      const enemyY = GROUND_Y - ENEMY_HEIGHT;
      enemies.push({ x: enemyX, y: enemyY, width: ENEMY_WIDTH, height: ENEMY_HEIGHT });
    }
  }
  
  console.log("MYOB Business Power-Up Activated!");
} 
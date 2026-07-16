const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


const marioSpriteSheet = new Image();
marioSpriteSheet.src = 'frames/sprite.png'; 

// --- Assets for obstacles & sounds ---
const obstacleImg = new Image();
obstacleImg.src = 'frames/obstacle.png'; // coloca una imagen de obstáculo en frames/obstacle.png

const sfxJump = new Audio('sfx/jump.wav');
const sfxHit = new Audio('sfx/hit.wav');
const sfxScore = new Audio('sfx/score.wav');

const w = 60;  
const h = 100; 

const animations = {
    idleRight: { row: 0, totalFrames: 1 },
    idleLeft:  { row: 1, totalFrames: 1 },
    walkRight: { row: 2, totalFrames: 3 }, 
    walkLeft:  { row: 3, totalFrames: 3 },
    jumpRight: { row: 4, totalFrames: 1 },
    jumpLeft:  { row: 5, totalFrames: 1 },
    crouch:    { row: 6, totalFrames: 1 }
};

const animationState = {
    name: 'idleRight',
    frameIndex: 0, 
    frameTimer: 0
};

const controls = {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpPressed: false
};

const character = {
    x: 120,
    y: 0,
    width: 60,
    height: 100,
    baseHeight: 100,   
    crouchHeight: 70,  
    // physics in px/s units
    speed: 5,
    jumpSpeed: 900,        // px/s initial jump impulse (aumentado)
    gravity: 2200,         // px/s^2 (ajustado)
    velocityY: 0,          // px/s
    facing: 1,
    isJumping: false,
    isCrouching: false
};

let lastTime = 0;
const walkFrameInterval = 100;

const clouds = [
    { x: 100, y: 50, radius: 30 },
    { x: 400, y: 80, radius: 40 },
    { x: 800, y: 40, radius: 25 },
    { x: 1200, y: 90, radius: 45 },
    { x: 1600, y: 60, radius: 35 }
];

function getFloorY() {
    return canvas.height - 40; 
}

// --- New: Game state for infinite runner ---
const game = {
    baseSpeed: 600,            // px/sec (más rápido por defecto)
    speed: 600,                // px/sec (will increase)
    maxSpeed: 1400,            // cap
    distance: 0,              // pixels traveled
    score: 0,                 // derived from distance
    prevScore: 0,
    spawnTimer: 0,            // ms
    spawnInterval: 1000,      // ms (will randomize)
    speedIncreaseDistance: 350, // increase every X pixels
    lastSpeedIncreaseAt: 0,
    obstacles: [],
    platforms: [],
    running: false,
    gameOver: false,
    highscore: Number(localStorage.getItem('mario_highscore') || 0),
    state: 'menu' // 'menu' | 'running' | 'paused' | 'gameover'
};

const collisionPad = 8; // reduce collision box for forgiving collisions

function reachableApex() {
    // maximum vertical displacement of feet from jump start (px)
    return (character.jumpSpeed * character.jumpSpeed) / (2 * character.gravity);
}

function spawnPlatform(xOffset = 0) {
    const floor = getFloorY();
    const apex = reachableApex();
    // Place platform at about 55-70% of apex so it's reachable but requires effort
    const ratio = 0.6 + Math.random() * 0.1; // 0.6 - 0.7
    const platformTopAboveFloor = Math.max(40, Math.floor(apex * ratio));
    const platformThickness = 12;
    const platformWidth = Math.floor(120 + Math.random() * 140); // 120 - 260

    const x = canvas.width + 150 + xOffset + Math.random() * 120;
    const y = floor - platformTopAboveFloor - platformThickness; // y = top of platform

    const platform = {
        x,
        y,
        width: platformWidth,
        height: platformThickness,
        color: '#7a5330'
    };
    game.platforms.push(platform);
}

function spawnObstacle() {
    // Create a pipe-like obstacle (como tubos de Mario)
    const width = 80; // pipe width
    // limit heights to values that are reasonable given jump physics
    const minH = 60, maxH = 140; // reduced maxH
    const height = Math.floor(Math.random() * (maxH - minH + 1)) + minH;

    const x = canvas.width + 50;
    const y = getFloorY() - height;

    const useImage = obstacleImg.complete && obstacleImg.naturalWidth > 0;

    const obstacle = {
        x,
        y,
        width,
        height,
        color: '#2db34a', // green pipe
        useImage,
        type: 'pipe'
    };
    game.obstacles.push(obstacle);

    // If pipe is tall relative to reachable apex, spawn a platform before it to help the player
    const apex = reachableApex();
    if (height > apex * 0.75) {
        // spawn platform slightly before the pipe so player can land and then jump further
        spawnPlatform(-120);
    }
}

function resetGame() {
    game.speed = game.baseSpeed;
    game.distance = 0;
    game.score = 0;
    game.prevScore = 0;
    game.spawnTimer = 0;
    game.obstacles = [];
    game.platforms = [];
    game.lastSpeedIncreaseAt = 0;
    game.running = true;
    game.gameOver = false;
    game.state = 'running';
    character.x = Math.round(canvas.width * 0.18);
    character.y = getFloorY() - character.height;
    character.velocityY = 0;
}

function endGame() {
    game.gameOver = true;
    game.running = false;
    game.state = 'gameover';
    try { sfxHit.play(); } catch (e) {}
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('mario_highscore', String(game.highscore));
    }
}

function updateObstacles(deltaTime) {
    // move obstacles
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed * (deltaTime / 1000);
        // remove if off-screen
        if (obs.x + obs.width < -50) {
            game.obstacles.splice(i, 1);
        }
    }

    // move platforms
    for (let i = game.platforms.length - 1; i >= 0; i--) {
        const p = game.platforms[i];
        p.x -= game.speed * (deltaTime / 1000);
        if (p.x + p.width < -50) game.platforms.splice(i, 1);
    }

    // spawn logic
    game.spawnTimer += deltaTime;
    if (game.spawnTimer >= game.spawnInterval) {
        // decide randomly to spawn a pipe or a platform cluster
        const r = Math.random();
        if (r < 0.75) {
            spawnObstacle();
        } else {
            // spawn a reachable platform-only obstacle to vary pace
            spawnPlatform();
        }
        game.spawnTimer = 0;
        // randomize next interval (faster when speed higher)
        const min = Math.max(420, 900 - Math.floor((game.speed - game.baseSpeed) / 1.4));
        game.spawnInterval = min + Math.random() * 600;
    }
}

function checkCollisions() {
    // obstacles collisions (pipes)
    for (const obs of game.obstacles) {
        if (rectsIntersect(
            character.x + collisionPad, character.y + collisionPad, character.width - collisionPad * 2, character.height - collisionPad * 2,
            obs.x, obs.y, obs.width, obs.height)) {
            return true;
        }
    }
    // platforms: handled in updateCharacter for landing, so no death on hitting them
    return false;
}

function rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x2 > x1 + w1 ||
             x2 + w2 < x1 ||
             y2 > y1 + h1 ||
             y2 + h2 < y1);
}

function updateGameSpeed() {
    // increase speed every time distance passes a threshold
    if (game.distance - game.lastSpeedIncreaseAt >= game.speedIncreaseDistance) {
        game.lastSpeedIncreaseAt = game.distance;
        game.speed = Math.min(game.maxSpeed, Math.floor(game.speed * 1.06));
    }
}

function drawPipe(obs) {
    // Draw main body
    ctx.fillStyle = obs.color;
    ctx.fillRect(Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
    // Draw top lip
    ctx.fillStyle = '#1f8a2f';
    ctx.fillRect(Math.round(obs.x - 6), Math.round(obs.y - 12), obs.width + 12, 12);
    // Inner darker shading
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(Math.round(obs.x + 6), Math.round(obs.y + 8), obs.width - 12, Math.max(4, obs.height - 12));
}

function drawObstacles() {
    for (const obs of game.obstacles) {
        if (obs.type === 'pipe') {
            if (obs.useImage && obstacleImg.complete && obstacleImg.naturalWidth > 0) {
                ctx.drawImage(obstacleImg, Math.round(obs.x), Math.round(obs.y - 12), obs.width, obs.height + 12);
            } else {
                drawPipe(obs);
            }
        } else {
            if (obs.useImage && obstacleImg.complete && obstacleImg.naturalWidth > 0) {
                ctx.drawImage(obstacleImg, Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
            } else {
                ctx.fillStyle = obs.color;
                ctx.fillRect(Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
                // simple shadow
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(Math.round(obs.x), Math.round(obs.y + obs.height - 6), obs.width, 6);
            }
        }
    }
    // draw platforms
    for (const p of game.platforms) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.width, p.height);
        // top edge
        ctx.fillStyle = '#5b3e2a';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.width, 3);
    }
}

function drawUI() {
    ctx.fillStyle = '#111';
    ctx.font = '22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Puntuación: ' + game.score, canvas.width - 20, 40);
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('Récord: ' + game.highscore, 20, 40);

    if (game.state === 'menu') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width/2 - 220, canvas.height/2 - 120, 440, 240);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '28px monospace';
        ctx.fillText('Carrera infinita - Mario', canvas.width/2, canvas.height/2 - 40);
        ctx.font = '18px monospace';
        ctx.fillText('Presiona ENTER o ESPACIO para comenzar', canvas.width/2, canvas.height/2);
        ctx.fillText('Salta: ESPACIO/ARRIBA/W  -  Agacharse: ABAJO/S', canvas.width/2, canvas.height/2 + 36);
        ctx.fillText('P: Pausa / R: Reiniciar después de Game Over', canvas.width/2, canvas.height/2 + 72);
    }

    if (game.state === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width/2 - 160, canvas.height/2 - 60, 320, 120);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '26px monospace';
        ctx.fillText('Pausado', canvas.width/2, canvas.height/2);
        ctx.font = '16px monospace';
        ctx.fillText('Presiona P para continuar', canvas.width/2, canvas.height/2 + 36);
    }

    if (game.state === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width/2 - 220, canvas.height/2 - 100, 440, 200);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '28px monospace';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 20);
        ctx.font = '18px monospace';
        ctx.fillText('Puntuación: ' + game.score + '   Récord: ' + game.highscore, canvas.width/2, canvas.height/2 + 16);
        ctx.fillText('Presiona R para reiniciar', canvas.width/2, canvas.height/2 + 56);
    }
}

function updateScore(deltaTime) {
    // distance in pixels
    game.distance += game.speed * (deltaTime / 1000);
    game.score = Math.floor(game.distance / 10);

    if (game.score > game.prevScore) {
        // play score sound every 10 points (tweakable)
        if (game.score % 10 === 0) {
            try { sfxScore.play(); } catch (e) {}
        }
        game.prevScore = game.score;
    }
}

function updateCharacter(deltaTime) {
    // deltaTime in ms -> convert to seconds
    const dt = deltaTime / 1000;

    // Keep the original character controls for jumping/crouching but lock horizontal free movement for runner feel
    character.isCrouching = controls.down && !character.isJumping;
    character.height = character.isCrouching ? character.crouchHeight : character.baseHeight;

    // store previous bottom for platform landing checks
    const prevBottom = character.y + character.height;

    // physics: velocity in px/s, gravity in px/s^2
    character.velocityY += character.gravity * dt;
    character.y += character.velocityY * dt;

    const floor = getFloorY();

    // platform landing (only when falling)
    if (character.velocityY >= 0) {
        for (const p of game.platforms) {
            const platformTop = p.y;
            const platformLeft = p.x;
            const platformRight = p.x + p.width;
            const charLeft = character.x + 4;
            const charRight = character.x + character.width - 4;

            const nowBottom = character.y + character.height;
            // if previously above platform top and now below or equal, and horizontally overlapping, land
            if (prevBottom <= platformTop && nowBottom >= platformTop && charRight > platformLeft && charLeft < platformRight) {
                // land on platform
                character.y = platformTop - character.height;
                character.velocityY = 0;
                character.isJumping = false;
                // small nudge to avoid repeated detection
                break;
            }
        }
    }

    if (character.y + character.height >= floor) {
        character.y = floor - character.height;
        character.velocityY = 0;
        character.isJumping = false;
    }

    // keep character roughly left
    character.x = Math.max(40, Math.min(Math.round(canvas.width * 0.4) - character.width/2, character.x));

    if (character.isJumping) {
        animationState.name = character.facing < 0 ? 'jumpLeft' : 'jumpRight';
    } else if (character.isCrouching) {
        animationState.name = 'crouch';
    } else {
        animationState.name = 'walkRight';
    }

    const currentAnim = animations[animationState.name];
    if (animationState.name !== 'walkLeft' && animationState.name !== 'walkRight') {
        animationState.frameIndex = 0;
        animationState.frameTimer = 0;
    } else {
        animationState.frameTimer += deltaTime;
        if (animationState.frameTimer >= walkFrameInterval) {
            animationState.frameIndex = (animationState.frameIndex + 1) % currentAnim.totalFrames;
            animationState.frameTimer -= walkFrameInterval;
        }
    }
}

function drawCharacter() {
    if (!marioSpriteSheet.complete) return;

    const currentAnim = animations[animationState.name] || animations.idleRight;
    let sx = 0 + (animationState.frameIndex * w); 
    let sy = currentAnim.row * h; 

    ctx.save();
    ctx.translate(character.x + character.width / 2, character.y + character.height / 2);
    ctx.drawImage(
        marioSpriteSheet,
        sx, sy, w, h, 
        -character.width / 2, -character.height / 2, character.width, character.height 
    );
    ctx.restore();
}

function drawEnvironment() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let i = 0; i < clouds.length; i++) {
        let cloud = clouds[i];
        // tie cloud speed to game speed but slower for parallax
        cloud.x -= Math.max(0.2, (game.speed / game.baseSpeed) * 0.2);
        if (cloud.x < -150) cloud.x = canvas.width + 100;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.radius, cloud.y - 10, cloud.radius * 1.2, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.radius * 2, cloud.y, cloud.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (game.state === 'running') {
        updateCharacter(deltaTime);
        updateObstacles(deltaTime);
        updateScore(deltaTime);
        updateGameSpeed();

        if (checkCollisions()) {
            endGame();
        }
    } else if (game.state === 'paused') {
        // do nothing (freeze updates) but still render
    } else if (game.state === 'menu') {
        // idle animations allowed
        updateCharacter(deltaTime);
    } else if (game.state === 'gameover') {
        // show final state, let character fall if not on floor
        updateCharacter(deltaTime);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEnvironment(); 
    drawObstacles();
    drawCharacter();
    drawUI();

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// --- Input handling ---
function updateControls(key, isDown) {
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') controls.left = isDown;
    if (key === 'ArrowRight' || key === 'd' || key === 'D') controls.right = isDown;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') controls.up = isDown;
    if (key === 'ArrowDown' || key === 's' || key === 'S') controls.down = isDown;
    if (key === ' ' || key === 'Spacebar') controls.jumpPressed = isDown;
}

document.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(event.key)) {
        event.preventDefault();
    }
    updateControls(event.key, true);

    const quiereSaltar = event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W';
    
    if (quiereSaltar && !character.isJumping && !character.isCrouching && game.state === 'running') {
        // set velocity in px/s
        character.velocityY = -character.jumpSpeed;
        character.isJumping = true;
        try { sfxJump.play(); } catch (e) {}
    }

    // Start from menu with Enter or Space
    if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') && game.state === 'menu') {
        resetGame();
    }

    // Restart on R when game over
    if ((event.key === 'r' || event.key === 'R') && game.state === 'gameover') {
        resetGame();
    }

    // Pause/unpause
    if (event.key === 'p' || event.key === 'P') {
        if (game.state === 'running') {
            game.state = 'paused';
        } else if (game.state === 'paused') {
            game.state = 'running';
            // reset timers so the loop continues smoothly
            lastTime = performance.now();
        }
    }
});

document.addEventListener('keyup', (event) => {
    updateControls(event.key, false);
});

// initialize character x and y
character.x = Math.round(canvas.width * 0.18);
character.y = getFloorY() - character.height;

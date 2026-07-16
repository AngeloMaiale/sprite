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
    jumpSpeed: 900,        // px/s initial jump impulse
    gravity: 2200,         // px/s^2
    velocityY: 0,          // px/s
    facing: 1,
    isJumping: false,
    isCrouching: false,
    fastFall: false
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

// --- Game state ---
const game = {
    baseSpeed: 650,            // px/sec
    speed: 650,
    maxSpeed: 1800,
    distance: 0,
    score: 0,
    prevScore: 0,
    spawnTimer: 0,
    spawnInterval: 900,
    speedIncreaseDistance: 300,
    lastSpeedIncreaseAt: 0,
    obstacles: [], // pipes
    spikes: [],
    running: false,
    gameOver: false,
    highscore: Number(localStorage.getItem('mario_highscore') || 0),
    state: 'menu',
    lastObstacleX: null
};

const collisionPad = 8; // forgiving collision

// Fast-fall multiplier when holding down in air
const FAST_FALL_MULT = 2.6; // times gravity when fast-falling

function reachableApex() {
    // maximum vertical displacement of feet from jump start (px)
    return (character.jumpSpeed * character.jumpSpeed) / (2 * character.gravity);
}

function spawnObstacleAtX(x) {
    // pipe
    const width = 80;
    const minH = 60, maxH = 140;
    const height = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
    const y = getFloorY() - height;
    const useImage = obstacleImg.complete && obstacleImg.naturalWidth > 0;
    const obstacle = { x, y, width, height, color: '#2db34a', useImage, type: 'pipe' };
    game.obstacles.push(obstacle);
    game.lastObstacleX = x;
    // If pipe too tall, spawn a spike earlier instead of platform (platforms removed)
}

function spawnSpikeAtX(x) {
    // spiky ball in air
    const radius = 16 + Math.floor(Math.random() * 10); // 16-25
    // place spike at mid air so player must fast-fall or avoid
    const minAboveGround = 80; // min distance above ground
    const maxAboveGround = Math.max(120, Math.floor(reachableApex() * 0.6));
    const above = Math.floor(minAboveGround + Math.random() * (maxAboveGround - minAboveGround + 1));
    const y = getFloorY() - above - radius * 2;
    const spike = { x, y, width: radius*2, height: radius*2, radius, type: 'spike' };
    game.spikes.push(spike);
    game.lastObstacleX = x;
}

function isOverlappingAny(x, width) {
    // check against existing pipes and spikes
    for (const o of [...game.obstacles, ...game.spikes]) {
        if (x < o.x + o.width + 40 && x + width + 40 > o.x) return true;
    }
    return false;
}

function spawnNextObstacle() {
    // calculate airtime and min gap in pixels
    const airtime = (2 * character.jumpSpeed) / character.gravity; // s
    const landingBuffer = 0.55; // seconds extra
    const minGapTime = Math.max(0.6, airtime + landingBuffer);
    const minGapPx = Math.ceil(game.speed * minGapTime);
    const safety = 60; // horizontal safety px
    const spread = 120; // random extra px

    let baseX = canvas.width + 50;
    if (game.lastObstacleX) baseX = Math.max(baseX, game.lastObstacleX + minGapPx + safety);

    // choose type
    const r = Math.random();
    let chosen = r < 0.65 ? 'pipe' : 'spike';

    // compute final X trying to avoid overlap
    let tries = 0;
    let newX = baseX + Math.floor(Math.random() * spread);
    while (isOverlappingAny(newX, chosen === 'pipe' ? 80 : 40) && tries < 6) {
        newX += 80 + Math.floor(Math.random() * 80);
        tries++;
    }

    if (chosen === 'pipe') spawnObstacleAtX(newX);
    else spawnSpikeAtX(newX);
}

function resetGame() {
    game.speed = game.baseSpeed;
    game.distance = 0;
    game.score = 0;
    game.prevScore = 0;
    game.spawnTimer = 0;
    game.obstacles = [];
    game.spikes = [];
    game.lastObstacleX = null;
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
    // move pipes
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed * (deltaTime / 1000);
        if (obs.x + obs.width < -50) game.obstacles.splice(i, 1);
    }
    // move spikes
    for (let i = game.spikes.length - 1; i >= 0; i--) {
        const s = game.spikes[i];
        s.x -= game.speed * (deltaTime / 1000);
        if (s.x + s.width < -50) game.spikes.splice(i, 1);
    }

    // spawn logic based on pixel spacing rather than only timers
    game.spawnTimer += deltaTime;
    const spawnEveryMs = Math.max(300, Math.floor(1000 * (Math.max(0.5, (2 * character.jumpSpeed) / character.gravity + 0.4))));
    // adapt spawn when faster
    if (game.spawnTimer >= game.spawnInterval) {
        spawnNextObstacle();
        game.spawnTimer = 0;
        // adapt spawnInterval with speed but keep min
        const min = Math.max(600, 1000 - Math.floor((game.speed - game.baseSpeed) / 1.6));
        game.spawnInterval = min + Math.random() * 600;
    }
}

function checkCollisions() {
    // check pipes
    for (const obs of game.obstacles) {
        if (rectsIntersect(character.x + collisionPad, character.y + collisionPad, character.width - collisionPad * 2, character.height - collisionPad * 2,
            obs.x, obs.y, obs.width, obs.height)) return true;
    }
    // check spikes (use circle vs rect approximation)
    for (const s of game.spikes) {
        const cx = s.x + s.radius;
        const cy = s.y + s.radius;
        // closest point on rect to circle center
        const closestX = Math.max(character.x, Math.min(cx, character.x + character.width));
        const closestY = Math.max(character.y, Math.min(cy, character.y + character.height));
        const dx = cx - closestX;
        const dy = cy - closestY;
        if (dx * dx + dy * dy < s.radius * s.radius) return true;
    }
    return false;
}

function rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x2 > x1 + w1 || x2 + w2 < x1 || y2 > y1 + h1 || y2 + h2 < y1);
}

function updateGameSpeed() {
    if (game.distance - game.lastSpeedIncreaseAt >= game.speedIncreaseDistance) {
        game.lastSpeedIncreaseAt = game.distance;
        game.speed = Math.min(game.maxSpeed, Math.floor(game.speed * 1.07));
    }
}

function drawPipe(obs) {
    ctx.fillStyle = obs.color;
    ctx.fillRect(Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
    ctx.fillStyle = '#1f8a2f';
    ctx.fillRect(Math.round(obs.x - 6), Math.round(obs.y - 12), obs.width + 12, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(Math.round(obs.x + 6), Math.round(obs.y + 8), obs.width - 12, Math.max(4, obs.height - 12));
}

function drawObstacles() {
    for (const obs of game.obstacles) {
        if (obs.useImage && obstacleImg.complete && obstacleImg.naturalWidth > 0) ctx.drawImage(obstacleImg, Math.round(obs.x), Math.round(obs.y - 12), obs.width, obs.height + 12);
        else drawPipe(obs);
    }
    for (const s of game.spikes) {
        // draw spiky ball
        const cx = Math.round(s.x + s.radius);
        const cy = Math.round(s.y + s.radius);
        ctx.fillStyle = '#aa2222';
        ctx.beginPath();
        ctx.arc(cx, cy, s.radius, 0, Math.PI * 2);
        ctx.fill();
        // spikes (simple radial lines)
        ctx.strokeStyle = '#6b0000';
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const x1 = cx + Math.cos(a) * (s.radius + 2);
            const y1 = cy + Math.sin(a) * (s.radius + 2);
            const x0 = cx + Math.cos(a) * (s.radius - 2);
            const y0 = cy + Math.sin(a) * (s.radius - 2);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
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
        ctx.fillText('Salta: ESPACIO/ARRIBA/W  -  Agacharse: ABAJO/S (en aire: baja rápido)', canvas.width/2, canvas.height/2 + 36);
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
    game.distance += game.speed * (deltaTime / 1000);
    game.score = Math.floor(game.distance / 10);
    if (game.score > game.prevScore) {
        if (game.score % 10 === 0) { try { sfxScore.play(); } catch (e) {} }
        game.prevScore = game.score;
    }
}

function updateCharacter(deltaTime) {
    const dt = deltaTime / 1000;

    // crouch on ground, fast-fall in air when holding down
    character.isCrouching = controls.down && !character.isJumping;
    character.fastFall = controls.down && character.isJumping;
    character.height = character.isCrouching ? character.crouchHeight : character.baseHeight;

    const prevBottom = character.y + character.height;

    const gravityToApply = character.fastFall ? character.gravity * FAST_FALL_MULT : character.gravity;
    character.velocityY += gravityToApply * dt;
    character.y += character.velocityY * dt;

    const floor = getFloorY();

    if (character.y + character.height >= floor) {
        character.y = floor - character.height;
        character.velocityY = 0;
        character.isJumping = false;
        character.fastFall = false;
    }

    // keep character roughly left
    character.x = Math.max(40, Math.min(Math.round(canvas.width * 0.4) - character.width/2, character.x));

    if (character.isJumping) animationState.name = character.facing < 0 ? 'jumpLeft' : 'jumpRight';
    else if (character.isCrouching) animationState.name = 'crouch';
    else animationState.name = 'walkRight';

    const currentAnim = animations[animationState.name];
    if (animationState.name !== 'walkLeft' && animationState.name !== 'walkRight') {
        animationState.frameIndex = 0; animationState.frameTimer = 0;
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
    ctx.drawImage(marioSpriteSheet, sx, sy, w, h, -character.width / 2, -character.height / 2, character.width, character.height);
    ctx.restore();
}

function drawEnvironment() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let i = 0; i < clouds.length; i++) {
        let cloud = clouds[i];
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
        if (checkCollisions()) endGame();
    } else if (game.state === 'paused') {
        // freeze updates
    } else if (game.state === 'menu' || game.state === 'gameover') {
        updateCharacter(deltaTime);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEnvironment(); drawObstacles(); drawCharacter(); drawUI();
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
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(event.key)) event.preventDefault();
    updateControls(event.key, true);

    const quiereSaltar = event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W';
    if (quiereSaltar && !character.isJumping && !character.isCrouching && game.state === 'running') {
        character.velocityY = -character.jumpSpeed; character.isJumping = true; try { sfxJump.play(); } catch (e) {}
    }

    // Start from menu
    if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') && game.state === 'menu') resetGame();
    // Restart
    if ((event.key === 'r' || event.key === 'R') && game.state === 'gameover') resetGame();
    // Pause
    if (event.key === 'p' || event.key === 'P') {
        if (game.state === 'running') game.state = 'paused';
        else if (game.state === 'paused') { game.state = 'running'; lastTime = performance.now(); }
    }
});

document.addEventListener('keyup', (event) => { updateControls(event.key, false); });

// initialize character
character.x = Math.round(canvas.width * 0.18);
character.y = getFloorY() - character.height;

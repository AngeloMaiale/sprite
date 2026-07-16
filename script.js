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
    speed: 5,
    jumpSpeed: 15,
    gravity: 0.8,      
    velocityY: 0,
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
    baseSpeed: 300,            // px/sec
    speed: 300,                // px/sec (will increase)
    maxSpeed: 900,            // cap
    distance: 0,              // pixels traveled
    score: 0,                 // derived from distance
    spawnTimer: 0,            // ms
    spawnInterval: 1400,      // ms (will randomize)
    speedIncreaseDistance: 500, // increase every X pixels
    lastSpeedIncreaseAt: 0,
    obstacles: [],
    running: true,
    gameOver: false,
    highscore: Number(localStorage.getItem('mario_highscore') || 0)
};

function spawnObstacle() {
    const minW = 20, maxW = 60;
    const minH = 30, maxH = 90;
    const width = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
    const height = Math.floor(Math.random() * (maxH - minH + 1)) + minH;

    const x = canvas.width + 50;
    const y = getFloorY() - height;

    const obstacle = {
        x,
        y,
        width,
        height,
        color: '#2b2b2b'
    };
    game.obstacles.push(obstacle);
}

function resetGame() {
    game.speed = game.baseSpeed;
    game.distance = 0;
    game.score = 0;
    game.spawnTimer = 0;
    game.obstacles = [];
    game.lastSpeedIncreaseAt = 0;
    game.running = true;
    game.gameOver = false;
    character.y = getFloorY() - character.height;
    character.velocityY = 0;
}

function endGame() {
    game.gameOver = true;
    game.running = false;
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

    // spawn logic
    game.spawnTimer += deltaTime;
    if (game.spawnTimer >= game.spawnInterval) {
        spawnObstacle();
        game.spawnTimer = 0;
        // randomize next interval (faster when speed higher)
        const min = Math.max(600, 1200 - Math.floor((game.speed - game.baseSpeed) / 2));
        game.spawnInterval = min + Math.random() * 900;
    }
}

function checkCollisions() {
    for (const obs of game.obstacles) {
        if (rectsIntersect(character.x, character.y, character.width, character.height,
            obs.x, obs.y, obs.width, obs.height)) {
            return true;
        }
    }
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

function drawObstacles() {
    for (const obs of game.obstacles) {
        ctx.fillStyle = obs.color;
        ctx.fillRect(Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
        // simple shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(Math.round(obs.x), Math.round(obs.y + obs.height - 6), obs.width, 6);
    }
}

function drawUI() {
    ctx.fillStyle = '#111';
    ctx.font = '22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Score: ' + game.score, canvas.width - 20, 40);
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('High: ' + game.highscore, 20, 40);

    if (game.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width/2 - 200, canvas.height/2 - 70, 400, 140);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '28px monospace';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10);
        ctx.font = '18px monospace';
        ctx.fillText('Presiona R para reiniciar', canvas.width/2, canvas.height/2 + 30);
    }
}

function updateScore(deltaTime) {
    // distance in pixels
    game.distance += game.speed * (deltaTime / 1000);
    game.score = Math.floor(game.distance / 10);
}

function updateCharacter(deltaTime) {
    // Keep the original character controls for jumping/crouching but lock horizontal free movement for runner feel
    const movingLeft = false; // controls.left;
    const movingRight = false; // controls.right;
    
    character.isCrouching = controls.down && !character.isJumping;
    character.height = character.isCrouching ? character.crouchHeight : character.baseHeight;

    // horizontal movement: keep character mostly fixed on x in runner mode
    // but allow slight shift with left/right if desired (disabled here)

    character.velocityY += character.gravity;
    character.y += character.velocityY;

    const floor = getFloorY();
    if (character.y + character.height >= floor) {
        character.y = floor - character.height;
        character.velocityY = 0;
        character.isJumping = false;
    }

    character.x = Math.max(0, Math.min(canvas.width - character.width, character.x));

    
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

    if (game.running) {
        updateCharacter(deltaTime);
        updateObstacles(deltaTime);
        updateScore(deltaTime);
        updateGameSpeed();

        if (checkCollisions()) {
            endGame();
        }
    } else {
        // allow character to fall to ground if needed
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
    
    if (quiereSaltar && !character.isJumping && !character.isCrouching && !game.gameOver) {
        character.velocityY = -character.jumpSpeed;
        character.isJumping = true;
    }

    // Restart on R
    if ((event.key === 'r' || event.key === 'R') && game.gameOver) {
        resetGame();
    }
});


document.addEventListener('keyup', (event) => {
    updateControls(event.key, false);
});

character.y = getFloorY() - character.height;

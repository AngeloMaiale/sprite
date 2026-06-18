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
    
    if (quiereSaltar && !character.isJumping && !character.isCrouching) {
        character.velocityY = -character.jumpSpeed;
        character.isJumping = true;
    }
});



document.addEventListener('keyup', (event) => {
    updateControls(event.key, false);
});

character.y = getFloorY() - character.height;

function updateCharacter(deltaTime) {
    const movingLeft = controls.left;
    const movingRight = controls.right;
    
    character.isCrouching = controls.down && !character.isJumping;
    character.height = character.isCrouching ? character.crouchHeight : character.baseHeight;

    if (!character.isCrouching) {
        if (movingLeft && !movingRight) {
            character.x -= character.speed;
            character.facing = -1;
        }
        if (movingRight && !movingLeft) {
            character.x += character.speed;
            character.facing = 1;
        }
    }

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
    } else if (movingLeft && !character.isCrouching) {
        animationState.name = 'walkLeft';
    } else if (movingRight && !character.isCrouching) {
        animationState.name = 'walkRight';
    } else {
        animationState.name = character.facing < 0 ? 'idleLeft' : 'idleRight';
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
        
        cloud.x -= 0.2;
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

    updateCharacter(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawEnvironment(); 
    drawCharacter();

    requestAnimationFrame(animate);
}


requestAnimationFrame(animate);
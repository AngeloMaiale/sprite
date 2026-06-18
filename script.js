const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function loadFrame(src) {
    const image = new Image();
    image.src = src;
    return image;
}

function loadFrameSet(paths) {
    return paths.map((src) => {
        const image = new Image();
        image.src = src;
        return image;
    });
}

function loadFrameWithFallback(primarySrc, fallbackSrc) {
    const image = new Image();
    image.onerror = () => {
        if (image.src !== fallbackSrc) {
            image.src = fallbackSrc;
        }
    };
    image.src = primarySrc;
    return image;
}

const animations = {
    idleRight: loadFrame('frames/idle/right/Mario_idle.png'),
    idleLeft: loadFrame('frames/idle/left/Mario_idle2.png'),
    walkRight: loadFrameSet([
        'frames/walk/right/Mario_walk1.png',
        'frames/walk/right/Mario_walk2.png',
        'frames/walk/right/Mario_walk3.png'
    ]),
    walkLeft: loadFrameSet([
        'frames/walk/left/Mario_walk4.png',
        'frames/walk/left/Mario_walk5.png',
        'frames/walk/left/Mario_walk6.png'
    ]),
    jumpRight: loadFrame('frames/jump/right/Mario_jump.png'),
    jumpLeft: loadFrame('frames/jump/left/Mario_jump2.png'),
    crouch: loadFrame('frames/crouch/Mario_crouch.png')
};

const animationState = {
    name: 'idle',
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
    speed: 4,
    jumpSpeed: 14,
    gravity: 0.7,
    velocityY: 0,
    facing: 1,
    isJumping: false,
    isCrouching: false
};

let lastTime = 0;
const walkFrameInterval = 100;

function groundY(characterHeight = character.height) {
    return canvas.height - characterHeight - 20;
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

    if ((event.key === ' ' || event.key === 'Spacebar') && !character.isJumping) {
        character.velocityY = -character.jumpSpeed;
        character.isJumping = true;
        animationState.name = character.facing < 0 ? 'jumpLeft' : 'jumpRight';
    }
});

document.addEventListener('keyup', (event) => {
    updateControls(event.key, false);
});

character.y = groundY();

function updateCharacter(deltaTime) {
    const movingLeft = controls.left;
    const movingRight = controls.right;
    const crouching = controls.down && !character.isJumping;

    character.isCrouching = crouching;
    character.height = character.isCrouching ? 70 : 100;

    if (movingLeft && !movingRight) {
        character.x -= character.speed;
        character.facing = -1;
    }

    if (movingRight && !movingLeft) {
        character.x += character.speed;
        character.facing = 1;
    }

    if (character.isJumping) {
        character.velocityY += character.gravity;
        character.y += character.velocityY;
    }

    const floor = groundY(character.height);

    if (character.y >= floor) {
        character.y = floor;
        character.velocityY = 0;
        character.isJumping = false;
    }

    character.width = 60;
    character.y = Math.min(character.y, canvas.height - character.height - 20);
    character.x = Math.max(0, Math.min(canvas.width - character.width, character.x));

    if (character.isJumping) {
        animationState.name = character.facing < 0 ? 'jumpLeft' : 'jumpRight';
    } else if (character.isCrouching) {
        animationState.name = 'crouch';
    } else if (movingLeft) {
        animationState.name = 'walkLeft';
    } else if (movingRight) {
        animationState.name = 'walkRight';
    } else {
        animationState.name = character.facing < 0 ? 'idleLeft' : 'idleRight';
    }

    if (animationState.name !== 'walkLeft' && animationState.name !== 'walkRight') {
        animationState.frameIndex = 0;
        animationState.frameTimer = 0;
    } else {
        animationState.frameTimer += deltaTime;

        if (animationState.frameTimer >= walkFrameInterval) {
            const currentWalkAnimation = animations[animationState.name];
            animationState.frameIndex = (animationState.frameIndex + 1) % currentWalkAnimation.length;
            animationState.frameTimer -= walkFrameInterval;
        }
    }
}

function drawCharacter() {
    const drawWidth = character.width;
    const drawHeight = character.height;
    const drawX = character.x;
    const drawY = character.y;
    const currentAnimation = animations[animationState.name] || animations.idleRight;
    const frameImage = Array.isArray(currentAnimation)
        ? currentAnimation[animationState.frameIndex] || currentAnimation[0]
        : currentAnimation;

    if (!frameImage || !frameImage.complete) {
        return;
    }

    ctx.save();
    ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);

    ctx.drawImage(
        frameImage,
        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
    );

    ctx.restore();
}

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    updateCharacter(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCharacter();

    requestAnimationFrame(animate);
}

let loadedFrames = 0;
const totalFrames = Object.values(animations).reduce((sum, animation) => {
    return sum + (Array.isArray(animation) ? animation.length : 1);
}, 0);

Object.values(animations).forEach((animation) => {
    const images = Array.isArray(animation) ? animation : [animation];

    images.forEach((image) => {
        image.onload = () => {
            loadedFrames += 1;

            if (loadedFrames === totalFrames) {
                requestAnimationFrame(animate);
            }
        };
    });
});

if (totalFrames === 0) {
    requestAnimationFrame(animate);
}
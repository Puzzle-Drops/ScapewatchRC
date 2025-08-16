class PlayerAnimation {
    constructor() {
        this.facing = 'south';
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.spriteSheet = null;
        this.isWalking = false;
        this.lastPosition = null;
        
        // Configuration
        this.spriteSize = 48;
        this.frameRate = 150; // ms per frame
        this.directions = {
            'south': 0,
            'east': 1,
            'north': 2,
            'west': 3
        };
    }
    
    initialize() {
        this.spriteSheet = loadingManager.getImage('playerSprite');
        if (this.spriteSheet) {
            console.log('Player sprite sheet loaded successfully');
        } else {
            console.error('Failed to load player sprite sheet');
        }
    }
    
    updateFacing(player) {
        // Determine if walking based on path
        if (player.path && player.path.length > 0 && player.pathIndex < player.path.length) {
            this.isWalking = true;
            
            // Calculate direction to next waypoint
            const target = player.path[player.pathIndex];
            const dx = target.x - player.position.x;
            const dy = target.y - player.position.y;
            
            // Set facing based on dominant axis
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? 'east' : 'west';
            } else if (Math.abs(dy) > 0.1) {
                this.facing = dy > 0 ? 'south' : 'north';
            }
        } else {
            this.isWalking = false;
        }
    }
    
    update(deltaTime, player) {
        this.updateFacing(player);
        
        if (this.isWalking) {
            this.animationTimer += deltaTime;
            if (this.animationTimer >= this.frameRate) {
                this.animationFrame = (this.animationFrame + 1) % 4;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0;
            this.animationTimer = 0;
        }
    }
    
    draw(ctx, x, y, scale) {
        if (!this.spriteSheet) return false;
        
        const row = this.directions[this.facing];
        const col = this.animationFrame;
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this.spriteSheet,
            col * this.spriteSize,
            row * this.spriteSize,
            this.spriteSize,
            this.spriteSize,
            x - scale/2,
            y - scale/2,
            scale,
            scale
        );
        
        return true; // Successfully drew sprite
    }
}

// Create global instance
window.playerAnimation = new PlayerAnimation();

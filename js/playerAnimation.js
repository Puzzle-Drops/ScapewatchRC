class PlayerAnimation {
constructor() {
    this.facing = 'south';
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.spriteSheet = null;
    this.isWalking = false;
    this.lastPosition = null;
    this.previousFacing = 'south'; // Track previous direction for hysteresis
    
    // Configuration
    this.spriteSize = 48;
    this.frameRate = 150; // ms per frame
    this.directions = {
        'south': 0,
        'east': 1,
        'north': 2,
        'west': 3
    };
    
    // Hysteresis threshold - prevents flickering at diagonal angles
    // When already facing horizontal, need 60% vertical to switch
    // When already facing vertical, need 60% horizontal to switch
    this.directionBias = 0.05; // 5% bias toward current direction
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
        
        // Calculate the ratio of horizontal to vertical movement
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const total = absDx + absDy;
        
        // Skip if barely moving
        if (total < 0.1) {
            return;
        }
        
        const horizontalRatio = absDx / total;
        const verticalRatio = absDy / total;
        
        // Apply hysteresis based on current facing direction
        let newFacing = this.facing;
        
        // If currently facing horizontal (east/west)
        if (this.facing === 'east' || this.facing === 'west') {
            // Only switch to vertical if vertical movement is significantly more (60%+)
            if (verticalRatio > 0.5 + this.directionBias) {
                newFacing = dy > 0 ? 'south' : 'north';
            } else {
                // Stay horizontal, just update east/west
                newFacing = dx > 0 ? 'east' : 'west';
            }
        }
        // If currently facing vertical (north/south)
        else {
            // Only switch to horizontal if horizontal movement is significantly more (60%+)
            if (horizontalRatio > 0.5 + this.directionBias) {
                newFacing = dx > 0 ? 'east' : 'west';
            } else {
                // Stay vertical, just update north/south
                newFacing = dy > 0 ? 'south' : 'north';
            }
        }
        
        this.facing = newFacing;
        this.previousFacing = newFacing;
    } else {
        // When idle, always face south
        this.isWalking = false;
        this.facing = 'south';
        this.previousFacing = 'south';
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
    
    // Draw sprite centered at the position
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

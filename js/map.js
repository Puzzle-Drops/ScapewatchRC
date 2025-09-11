class MapRenderer {
    constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Apply crisp rendering settings
    this.applyNoSmoothing();
    
    this.camera = {
        x: 4395, // Start at player position
        y: 1882, // Start at player position
        zoom: 14, // Current zoom level
        minZoom: 2, // Maximum zoom out (see more of the map)
        maxZoom: 50, // Maximum zoom in (see less of the map, bigger sprites)
        zoomSpeed: 1 // How much to zoom per wheel tick
    };
    this.worldMap = loadingManager.getImage('worldMap');
    this.showNodeText = true; // Flag for showing node text
    this.showCollisionDebug = false; // Flag for showing collision areas
    this.mapCache = null; // Cached map canvas
    this.initMapCache();
    
    // Set up zoom controls
    this.setupZoomControls();
}

    isWaterPosition(x, y) {
        // Check if a position is water based on map color
        if (!this.worldMap) return false;
        
        // Create the color check canvas only once with performance optimization
        if (!this.colorCheckCanvas) {
            try {
                this.colorCheckCanvas = document.createElement('canvas');
                this.colorCheckCanvas.width = this.worldMap.width;
                this.colorCheckCanvas.height = this.worldMap.height;
                // IMPORTANT: Add willReadFrequently for better performance
                this.colorCheckCtx = this.colorCheckCanvas.getContext('2d', { 
                    willReadFrequently: true 
                });
                this.colorCheckCtx.drawImage(this.worldMap, 0, 0);
                console.log('Color check canvas created for water detection');
            } catch (error) {
                console.error('Failed to create color check canvas:', error);
                return false;
            }
        }
        
        // Safety check
        if (!this.colorCheckCtx) return false;
        
        // Get pixel data at position
        const pixelX = Math.floor(x);
        const pixelY = Math.floor(y);
        
        // Bounds check
        if (pixelX < 0 || pixelY < 0 || pixelX >= this.worldMap.width || pixelY >= this.worldMap.height) {
            return false;
        }
        
        try {
            const pixelData = this.colorCheckCtx.getImageData(pixelX, pixelY, 1, 1).data;
            
            // Check if it's water color RGB(104, 125, 170)
            return pixelData[0] === 104 && pixelData[1] === 125 && pixelData[2] === 170;
        } catch (error) {
            console.error('Failed to get pixel data:', error);
            return false;
        }
    }

    applyNoSmoothing() {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.ctx.imageSmoothingQuality = 'low';
    }

    initMapCache() {
        if (!this.worldMap) return;
        
        // Create offscreen canvas for map cache
        this.mapCache = document.createElement('canvas');
        this.mapCache.width = this.worldMap.width;
        this.mapCache.height = this.worldMap.height;
        
        const cacheCtx = this.mapCache.getContext('2d');
        // Render map once to cache
        cacheCtx.drawImage(this.worldMap, 0, 0);
        
        console.log('Map cached to offscreen canvas');
    }

    setupZoomControls() {
    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Determine zoom direction
        const zoomDelta = e.deltaY > 0 ? -this.camera.zoomSpeed : this.camera.zoomSpeed;
        this.zoomCamera(this.camera.zoom + zoomDelta);
    });
    
    // Keyboard zoom controls (+ and - keys)
    window.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=') {
            this.zoomCamera(this.camera.zoom + this.camera.zoomSpeed);
        } else if (e.key === '-' || e.key === '_') {
            this.zoomCamera(this.camera.zoom - this.camera.zoomSpeed);
        }
    });
}

zoomCamera(newZoom) {
    // Clamp zoom to min/max
    this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, newZoom));
    
    // Ensure we re-apply no smoothing after zoom change
    this.applyNoSmoothing();
    
    console.log(`Zoom: ${this.camera.zoom.toFixed(1)} (min: ${this.camera.minZoom}, max: ${this.camera.maxZoom})`);
}

    render() {
        // Ensure no smoothing is applied (in case context was reset)
        this.applyNoSmoothing();
        
        // Initialize map cache if not done yet (in case image loaded after constructor)
        if (!this.mapCache && this.worldMap) {
            this.initMapCache();
        }
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update camera to follow player
        this.updateCamera();

        // Save context state
        this.ctx.save();

        // Apply camera transform
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw world map (only visible portion from cache)
        if (this.mapCache) {
            // Calculate visible bounds in world coordinates
            const viewWidth = this.canvas.width / this.camera.zoom;
            const viewHeight = this.canvas.height / this.camera.zoom;
            
            const viewLeft = this.camera.x - viewWidth / 2;
            const viewRight = this.camera.x + viewWidth / 2;
            const viewTop = this.camera.y - viewHeight / 2;
            const viewBottom = this.camera.y + viewHeight / 2;
            
            // Clamp to map boundaries
            const mapWidth = this.mapCache.width;
            const mapHeight = this.mapCache.height;
            
            const sourceX = Math.max(0, viewLeft);
            const sourceY = Math.max(0, viewTop);
            const sourceWidth = Math.min(viewRight, mapWidth) - sourceX;
            const sourceHeight = Math.min(viewBottom, mapHeight) - sourceY;
            
            // Only draw if there's something visible
            if (sourceWidth > 0 && sourceHeight > 0) {
                this.ctx.drawImage(
                    this.mapCache,
                    sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle
                    sourceX, sourceY, sourceWidth, sourceHeight   // Destination rectangle
                );
            }
        }

        // Draw collision debug overlay if enabled
        if (this.showCollisionDebug && window.collision) {
            collision.drawDebug(this.ctx, this.camera);
        }

        // Draw nodes
        this.drawNodes();

        // Draw player path
        this.drawPlayerPath();

        // Draw player
        this.drawPlayer();

        // Restore context state
        this.ctx.restore();
    }

    updateCamera() {
        // Camera instantly follows the player position (no lerp, no rounding)
        this.camera.x = player.position.x;
        this.camera.y = player.position.y;
    }

    drawNodes() {
        const allNodes = nodes.getAllNodes();

        for (const [id, node] of Object.entries(allNodes)) {
            // Only draw nodes within view
            const screenDist = distance(
                node.position.x,
                node.position.y,
                this.camera.x,
                this.camera.y
            );

            if (screenDist < 1500 / this.camera.zoom) {
                this.drawNode(node);
            }
        }
    }

    drawNode(node) {
        // Center the node on its pixel position
        const x = Math.floor(node.position.x) + 0.5;
        const y = Math.floor(node.position.y) + 0.5;

        // Draw icons based on node type
        if (node.type === 'bank') {
            const bankIcon = loadingManager.getImage('skill_bank');
            if (bankIcon) {
                // Draw icon centered on the pixel center
                this.ctx.drawImage(bankIcon, x - 2, y - 2, 4, 4);
            }
        } else if (node.type === 'quest') {
            const questIcon = loadingManager.getImage('skill_quests');
            if (questIcon) {
                // Draw icon centered on the pixel center
                this.ctx.drawImage(questIcon, x - 2, y - 2, 4, 4);
            }
        } else if (node.type === 'skill' && node.activities) {
            // Get unique skills from activities
            const skillSet = new Set();
            const activities = loadingManager.getData('activities');
            
            for (const activityId of node.activities) {
                const activity = activities[activityId];
                if (activity && activity.skill) {
                    skillSet.add(activity.skill);
                }
            }
            
            const uniqueSkills = Array.from(skillSet);
            const iconSize = 4;
            const spacing = 0.5;
            const totalWidth = uniqueSkills.length * iconSize + (uniqueSkills.length - 1) * spacing;
            const startX = x - totalWidth / 2;
            
            // Draw skill icons
            uniqueSkills.forEach((skill, index) => {
                const skillIcon = loadingManager.getImage(`skill_${skill}`);
                if (skillIcon) {
                    const iconX = startX + index * (iconSize + spacing);
                    this.ctx.drawImage(skillIcon, iconX, y - 2, iconSize, iconSize);
                }
            });
        }

        // Node name (only if flag is set)
        if (this.showNodeText) {
            this.ctx.font = '2px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 0.25;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            this.ctx.strokeText(node.name, x, y - 2.5); // adjusted for smaller icons
            this.ctx.fillText(node.name, x, y - 2.5);
        }
    }

    // Get the color for a skill
    getSkillColor(skillId) {
        const skillColors = {
            'mining': '#808080',      // Grey rock color
            'fishing': '#5DADE2',     // Light blue
            'woodcutting': '#27AE60', // Green
            'cooking': '#8E44AD',     // Purple
            'attack': '#C0392B',
            'strength': '#E74C3C',
            'defence': '#3498DB',
            'magic': '#2E86AB',
            'ranged': '#16A085',
            'prayer': '#F4D03F',
            'runecraft': '#5B2C6F',
            'construction': '#A04000',
            'agility': '#2E4053',
            'herblore': '#239B56',
            'thieving': '#884EA0',
            'crafting': '#935116',
            'fletching': '#0E6655',
            'slayer': '#641E16',
            'hunter': '#5D4E37',
            'smithing': '#515A5A',
            'firemaking': '#DC7633',
            'farming': '#1E8449',
            'sailing': '#1E90FF'
        };
        
        return skillColors[skillId] || '#f39c12'; // Default orange
    }

    drawPlayer() {
    // Use the actual player position for smooth movement
    const { x, y } = player.position;

    // Scale sprite size based on zoom level
// At zoom 14 (default), sprite is 3 pixels - this is the MINIMUM size
// When zooming in past 14, sprite gets bigger
// When zooming out below 14, sprite stays at 3 (never gets smaller)
const defaultSpriteSize = 3;
const spriteScale = Math.max(defaultSpriteSize, Math.min(10, defaultSpriteSize * (this.camera.zoom / 14)));

    // Try to draw sprite, fallback to circle if it fails
    if (!window.playerAnimation || !playerAnimation.draw(this.ctx, x, y, spriteScale)) {
        // Fallback to original circle drawing
        this.drawPlayerCircle(x, y);
    }

    // Scale status rings based on zoom
// At zoom 14 (default), ring radius is 2 and line width is 0.4
const ringZoomScale = this.camera.zoom / 14;
const ringRadius = Math.max(1, Math.min(4, 2 * ringZoomScale));
const ringLineWidth = Math.max(0.2, Math.min(1, 0.4 * ringZoomScale));

// Activity indicator OR stun indicator OR banking indicator OR path prep indicator
// (These are drawn AFTER the sprite)
if (player.isBanking) {
    // Show banking progress (golden circle that depletes counter-clockwise)
    const bankingProgress = player.getBankingProgress();
    if (bankingProgress > 0) {
        this.ctx.beginPath();
        // Start from top, go counter-clockwise based on remaining progress
        this.ctx.arc(x, y, ringRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * bankingProgress));
        this.ctx.strokeStyle = '#f39c12'; // Golden color for banking
        this.ctx.lineWidth = ringLineWidth;
        this.ctx.stroke();
    }
} else if (player.isPreparingPath) {
    // Show path preparation progress (white circle that depletes counter-clockwise)
    const pathPrepProgress = player.getPathPreparationProgress();
    if (pathPrepProgress > 0) {
        this.ctx.beginPath();
        // Start from top, go counter-clockwise based on remaining progress
        this.ctx.arc(x, y, ringRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pathPrepProgress));
        this.ctx.strokeStyle = '#ffffff'; // White color for path preparation
        this.ctx.lineWidth = ringLineWidth;
        this.ctx.stroke();
    }
} else if (player.isStunned) {
    // Show stun progress (counter-clockwise from full)
    const stunProgress = player.getStunProgress();
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, -Math.PI / 2, -Math.PI / 2 - (Math.PI * 2 * stunProgress));
    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = ringLineWidth;
    this.ctx.stroke();
} else if (player.currentActivity) {
    // Get the skill for the current activity
    let activityColor = '#f39c12'; // Default orange
    
    const activityData = loadingManager.getData('activities')[player.currentActivity];
    if (activityData && activityData.skill) {
        activityColor = this.getSkillColor(activityData.skill);
    }
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * player.activityProgress));
    this.ctx.strokeStyle = activityColor;
    this.ctx.lineWidth = ringLineWidth;
    this.ctx.stroke();
}
}

drawPlayerCircle(x, y) {
    // Fallback circle drawing (original code)
    this.ctx.beginPath();
    this.ctx.arc(x, y, 1.2, 0, Math.PI * 2);  // was 6, now 1.2
    this.ctx.fillStyle = player.isStunned ? '#e74c3c' : '#2ecc71'; // Red when stunned
    this.ctx.fill();
    this.ctx.strokeStyle = player.isStunned ? '#c0392b' : '#27ae60';
    this.ctx.lineWidth = 0.4; // reduced from 2
    this.ctx.stroke();
}

    drawPlayerPath() {
    if (!player.path || player.path.length === 0) return;

// INVERSE scale path visuals - thicker when zoomed OUT
// At zoom 14 (default), line width is 0.4 and dot radius is 0.3
// At zoom 1 (max out), we want thick lines so they're visible
// At zoom 50 (max in), we want thin lines since everything is big
const inverseZoomScale = 14 / this.camera.zoom;
const lineWidth = Math.max(0.2, Math.min(8, 0.4 * inverseZoomScale));
const dotRadius = Math.max(0.2, Math.min(6, 0.3 * inverseZoomScale));
const dashSize = Math.max(0.5, Math.min(20, 1 * inverseZoomScale));

    // Draw the path from destination back to player (reversed)
    this.ctx.beginPath();
    
    // Start from the final destination
    const destination = player.path[player.path.length - 1];
    this.ctx.moveTo(destination.x, destination.y);
    
    // Draw backwards through the path
    for (let i = player.path.length - 2; i >= player.pathIndex; i--) {
        this.ctx.lineTo(player.path[i].x, player.path[i].y);
    }
    
    // End at player position
    this.ctx.lineTo(player.position.x, player.position.y);
    
    this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([dashSize, dashSize]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw waypoint markers (only for remaining waypoints)
    this.ctx.fillStyle = 'rgba(46, 204, 113, 0.8)';
    for (let i = player.pathIndex; i < player.path.length; i++) {
        const point = player.path[i];
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

    handleClick(screenX, screenY) {
        // Convert screen coordinates to game coordinates using scaling system
        const gameCoords = scalingSystem.screenToGame(screenX, screenY);
        
        // Then convert to world coordinates
        const worldX = (gameCoords.x - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const worldY = (gameCoords.y - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

        // Check if clicked on a node (adjusted for pixel-centered positions)
        const clickedNode = nodes.getNodeAt(worldX, worldY);
        if (clickedNode) {
            console.log('Clicked node:', clickedNode.name);
            // Could add manual node interaction here
        }
    }

    toggleCollisionDebug() {
        this.showCollisionDebug = !this.showCollisionDebug;
    }

    toggleNodeText() {
        this.showNodeText = !this.showNodeText;
    }
}

// Add keyboard shortcuts for debug features
window.addEventListener('keydown', (e) => {
    if (window.map) {
        if (e.key === 'c' || e.key === 'C') {
            map.toggleCollisionDebug();
        } else if (e.key === 'n' || e.key === 'N') {
            map.toggleNodeText();
        }
    }
});

// Make MapRenderer available globally
window.MapRenderer = MapRenderer;

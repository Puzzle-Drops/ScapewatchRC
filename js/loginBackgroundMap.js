class LoginBackgroundMap {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.worldMap = null;
        this.animationId = null;
        
        // ==================== CONFIGURATION ====================
        // Zoom level (higher = more zoomed in)
        this.zoomLevel = 7;
        
        // Pan speed (pixels per second)
        this.panSpeed = 20;
        
        // Positions to cycle through
        this.positions = [
            {x: 4163, y: 2129},  // tut island (start)
            {x: 4394, y: 1881},  // Lumbridge
            {x: 4394, y: 956},  // Wildy
            {x: 4026, y: 956},  // Position 4
            {x: 4026, y: 1881},  // Position 5
            {x: 3384, y: 1348},  // Position 6
            // Add more positions here as needed
            // Example additional positions:
            // {x: 3200, y: 1500},
            // {x: 3000, y: 1300},
            // {x: 3500, y: 1100},
            // {x: 4000, y: 1400},
        ];
        // ==================== END CONFIGURATION ====================
        
        this.currentPositionIndex = 0;
        this.currentPosition = null;
        this.targetPosition = null;
        this.lastTime = 0;
        this.isRunning = false;
    }
    
    initialize() {
        this.canvas = document.getElementById('login-background-canvas');
        if (!this.canvas) {
            console.error('Login background canvas not found');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.applyNoSmoothing();
        
        // Get the world map from loading manager
        this.worldMap = loadingManager.getImage('worldMap');
        if (!this.worldMap) {
            console.error('World map not loaded for login background');
            return false;
        }
        
        // Initialize positions
        if (this.positions.length < 2) {
            console.error('Need at least 2 positions for login background animation');
            return false;
        }
        
        this.currentPosition = {...this.positions[0]};
        this.targetPosition = {...this.positions[1]};
        this.currentPositionIndex = 0;
        
        // Set canvas size to match scaled container
        this.resizeCanvas();
        
        // Start animation
        this.startAnimation();
        
        console.log('Login background map initialized with', this.positions.length, 'positions');
        return true;
    }
    
    applyNoSmoothing() {
        if (!this.ctx) return;
        
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.ctx.imageSmoothingQuality = 'low';
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        // Match the scaled container dimensions
        this.canvas.width = 2560;
        this.canvas.height = 1440;
        this.applyNoSmoothing(); // Reapply after resize
    }
    
    startAnimation() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
        console.log('Login background animation started');
    }
    
    stopAnimation() {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('Login background animation stopped');
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Render
        this.render();
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updatePosition(deltaTime) {
        if (!this.currentPosition || !this.targetPosition) return;
        
        // Calculate distance to target
        const dx = this.targetPosition.x - this.currentPosition.x;
        const dy = this.targetPosition.y - this.currentPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            // Reached target, move to next position
            this.currentPositionIndex = (this.currentPositionIndex + 1) % this.positions.length;
            const nextIndex = (this.currentPositionIndex + 1) % this.positions.length;
            
            // Update current and target positions
            this.currentPosition = {...this.positions[this.currentPositionIndex]};
            this.targetPosition = {...this.positions[nextIndex]};
            
            console.log(`Login background: Moving from position ${this.currentPositionIndex} to ${nextIndex}`);
        } else {
            // Move towards target
            const moveDistance = this.panSpeed * deltaTime;
            const moveRatio = Math.min(moveDistance / distance, 1);
            
            this.currentPosition.x += dx * moveRatio;
            this.currentPosition.y += dy * moveRatio;
        }
    }
    
    render() {
        if (!this.ctx || !this.canvas) return;
        
        // Clear canvas with black background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.worldMap || !this.currentPosition) return;
        
        // Apply transform for camera
        this.ctx.save();
        
        // Center and scale
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(-this.currentPosition.x, -this.currentPosition.y);
        
        // Calculate visible bounds to optimize rendering
        const viewWidth = this.canvas.width / this.zoomLevel;
        const viewHeight = this.canvas.height / this.zoomLevel;
        const viewLeft = this.currentPosition.x - viewWidth / 2;
        const viewTop = this.currentPosition.y - viewHeight / 2;
        
        // Draw the map (could optimize by only drawing visible portion)
        this.ctx.drawImage(this.worldMap, 0, 0);
        
        this.ctx.restore();
    }
    
    // Configuration helper methods
    setZoomLevel(zoom) {
        this.zoomLevel = Math.max(1, Math.min(50, zoom));
        console.log('Login background zoom set to:', this.zoomLevel);
    }
    
    setPanSpeed(speed) {
        this.panSpeed = Math.max(10, Math.min(200, speed));
        console.log('Login background pan speed set to:', this.panSpeed);
    }
    
    addPosition(x, y) {
        this.positions.push({x, y});
        console.log('Added position to login background:', {x, y});
    }
    
    clearPositions() {
        this.positions = [];
        this.currentPositionIndex = 0;
        console.log('Cleared all login background positions');
    }
    
    // Debug method to jump to a specific position
    jumpToPosition(index) {
        if (index >= 0 && index < this.positions.length) {
            this.currentPositionIndex = index;
            this.currentPosition = {...this.positions[index]};
            const nextIndex = (index + 1) % this.positions.length;
            this.targetPosition = {...this.positions[nextIndex]};
            console.log(`Jumped to position ${index}`);
        }
    }
}

// Create global instance
window.loginBackgroundMap = new LoginBackgroundMap();

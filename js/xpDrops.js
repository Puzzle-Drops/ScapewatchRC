class XPDropManager {
    constructor() {
        this.container = null;
        this.drops = [];
        this.dropId = 0;
    }
    
    initialize() {
        // Create container if it doesn't exist
        this.container = document.getElementById('xp-drops-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'xp-drops-container';
            this.container.className = 'xp-drops-container';
            document.getElementById('game-container').appendChild(this.container);
        }
    }
    
    addDrop(skillId, amount) {
        // Don't show drops for 0 XP
        if (amount <= 0) return;
        
        // Create drop element
        const drop = document.createElement('div');
        drop.className = 'xp-drop';
        drop.id = `xp-drop-${this.dropId++}`;
        
        // Create icon
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${skillId}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'xp-drop-icon';
        } else {
            // Fallback if icon not found
            iconElement.style.display = 'none';
        }
        
        // Create text
        const textElement = document.createElement('span');
        textElement.className = 'xp-drop-text';
        textElement.textContent = `+${formatNumber(amount)}`;
        
        // Assemble drop
        drop.appendChild(iconElement);
        drop.appendChild(textElement);
        
        // Add to container
        this.container.appendChild(drop);
        
        // Remove after animation completes (1.8s)
        setTimeout(() => {
            if (drop.parentNode) {
                drop.parentNode.removeChild(drop);
            }
        }, 1800);
        
        // Track drop
        this.drops.push({
            id: drop.id,
            element: drop,
            timestamp: Date.now()
        });
        
        // Clean up old drops from tracking array
        this.cleanupOldDrops();
    }
    
    cleanupOldDrops() {
        const now = Date.now();
        this.drops = this.drops.filter(drop => {
            // Remove from tracking after 2 seconds
            return now - drop.timestamp < 2000;
        });
    }
}

// Create global instance
window.xpDropManager = new XPDropManager();

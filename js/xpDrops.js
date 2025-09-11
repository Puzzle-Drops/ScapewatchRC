class XPDropManager {
    constructor() {
        this.container = null;
        this.celebrationContainer = null;
        this.drops = [];
        this.dropId = 0;
        
        // Celebration queue system
        this.celebrationQueue = [];
        this.currentCelebration = null;
        this.celebrationInProgress = false;
    }
    
    initialize() {
        // Create XP drops container if it doesn't exist
        this.container = document.getElementById('xp-drops-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'xp-drops-container';
            this.container.className = 'xp-drops-container';
            document.getElementById('game-container').appendChild(this.container);
        }
        
        // Create celebration container for level ups and task completions
        this.celebrationContainer = document.getElementById('celebration-container');
        if (!this.celebrationContainer) {
            this.celebrationContainer = document.createElement('div');
            this.celebrationContainer.id = 'celebration-container';
            this.celebrationContainer.className = 'celebration-container';
            document.getElementById('game-container').appendChild(this.celebrationContainer);
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
    
    // Queue a level up celebration
    showLevelUp(skillId, newLevel) {
        this.queueCelebration({
            type: 'levelup',
            skillId: skillId,
            newLevel: newLevel,
            duration: 3000
        });
    }
    
    // Queue a task completion celebration
    showTaskComplete(task) {
        this.queueCelebration({
            type: 'taskComplete',
            task: task,
            duration: 2500
        });
    }
    
    // Add celebration to queue and process
    queueCelebration(celebrationData) {
        this.celebrationQueue.push(celebrationData);
        this.processCelebrationQueue();
    }
    
    // Process the celebration queue
    processCelebrationQueue() {
        // If already showing a celebration, wait
        if (this.celebrationInProgress || this.celebrationQueue.length === 0) {
            return;
        }
        
        // Get next celebration from queue
        const nextCelebration = this.celebrationQueue.shift();
        this.celebrationInProgress = true;
        this.currentCelebration = nextCelebration;
        
        // Show the appropriate celebration
        if (nextCelebration.type === 'levelup') {
            this.displayLevelUp(nextCelebration);
        } else if (nextCelebration.type === 'taskComplete') {
            this.displayTaskComplete(nextCelebration);
        }
        
        // Schedule next celebration after this one finishes
        setTimeout(() => {
            this.celebrationInProgress = false;
            this.currentCelebration = null;
            // Process next celebration in queue if any
            this.processCelebrationQueue();
        }, nextCelebration.duration);
    }
    
    // Display level up celebration
    displayLevelUp(data) {
        // Create celebration element
        const celebration = document.createElement('div');
        celebration.className = 'level-up-celebration';
        
        // Create LEVEL UP text
        const levelUpText = document.createElement('div');
        levelUpText.className = 'celebration-title';
        levelUpText.textContent = 'LEVEL UP!';
        
        // Create skill info row
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        // Create icon
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${data.skillId}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        // Create level text
        const levelText = document.createElement('span');
        levelText.className = 'celebration-level';
        levelText.textContent = `Lv ${data.newLevel}`;
        
        // Assemble skill info
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(levelText);
        
        // Assemble celebration
        celebration.appendChild(levelUpText);
        celebration.appendChild(skillInfo);
        
        // Add fireworks
        this.createFireworks();
        
        // Add to container
        this.celebrationContainer.appendChild(celebration);
        
        // Remove after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display task completion celebration
    displayTaskComplete(data) {
        // Create celebration element
        const celebration = document.createElement('div');
        celebration.className = 'task-complete-celebration';
        
        // Create skill info row
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        // Create icon
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${data.task.skill}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        // Create text
        const completeText = document.createElement('span');
        completeText.className = 'celebration-complete';
        completeText.textContent = 'Task Complete!';
        
        // Assemble
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(completeText);
        celebration.appendChild(skillInfo);
        
        // Add smaller fireworks for task completion
        this.createFireworks(true);
        
        // Add to container
        this.celebrationContainer.appendChild(celebration);
        
        // Remove after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Create fireworks effect
    createFireworks(isSmall = false) {
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = isSmall ? 'fireworks-small' : 'fireworks';
        
        // Create multiple firework bursts
        const burstCount = isSmall ? 3 : 5;
        for (let i = 0; i < burstCount; i++) {
            const burst = document.createElement('div');
            burst.className = 'firework-burst';
            burst.style.left = `${20 + Math.random() * 60}%`;
            burst.style.top = `${20 + Math.random() * 60}%`;
            burst.style.animationDelay = `${Math.random() * 0.5}s`;
            
            // Create particles for each burst
            for (let j = 0; j < 12; j++) {
                const particle = document.createElement('div');
                particle.className = 'firework-particle';
                particle.style.transform = `rotate(${j * 30}deg)`;
                burst.appendChild(particle);
            }
            
            fireworksContainer.appendChild(burst);
        }
        
        this.celebrationContainer.appendChild(fireworksContainer);
        
        // Remove fireworks after animation
        setTimeout(() => {
            if (fireworksContainer.parentNode) {
                fireworksContainer.parentNode.removeChild(fireworksContainer);
            }
        }, 3000);
    }
    
    cleanupOldDrops() {
        const now = Date.now();
        this.drops = this.drops.filter(drop => {
            // Remove from tracking after 2 seconds
            return now - drop.timestamp < 2000;
        });
    }
    
    // Debug method to see queue status
    getQueueStatus() {
        return {
            queueLength: this.celebrationQueue.length,
            inProgress: this.celebrationInProgress,
            current: this.currentCelebration
        };
    }
}

// Create global instance
window.xpDropManager = new XPDropManager();

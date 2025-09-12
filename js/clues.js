class ClueManager {
    constructor() {
        this.clues = {}; // Store active clues by tier
        
        // Clue configuration
        this.CLUE_CONFIG = {
            easy: {
                dropRate: 1/5,
                steps: 1,
                maxLevel: 1,
                itemName: 'Easy Clue',
                casketName: 'Easy Casket'
            },
            medium: {
                dropRate: 1/500,
                steps: [1, 2], // 1-2 steps randomly
                maxLevel: 20,
                itemName: 'Medium Clue',
                casketName: 'Medium Casket'
            },
            hard: {
                dropRate: 1/1000,
                steps: [2, 3], // 2-3 steps
                maxLevel: 40,
                itemName: 'Hard Clue',
                casketName: 'Hard Casket'
            },
            elite: {
                dropRate: 1/1500,
                steps: [3, 4], // 3-4 steps
                maxLevel: 60,
                itemName: 'Elite Clue',
                casketName: 'Elite Casket'
            },
            master: {
                dropRate: 1/2500,
                steps: [4, 5], // 4-5 steps
                maxLevel: 99,
                itemName: 'Master Clue',
                casketName: 'Master Casket'
            }
        };
    }
    
    // Roll for clue drops on activity completion
    rollForClue() {
        // Roll for each tier from highest to lowest
        // This way if you roll a master, you don't also get easier clues
        const tiers = ['master', 'elite', 'hard', 'medium', 'easy'];
        
        for (const tier of tiers) {
            const config = this.CLUE_CONFIG[tier];
            
            // Check if player already has this tier clue
            if (this.hasClue(tier)) {
                continue;
            }
            
            // Roll for drop
            if (Math.random() < config.dropRate) {
                this.generateClue(tier);
                return; // Only drop one clue per activity
            }
        }
    }
    
    // Check if player has a clue of this tier
    hasClue(tier) {
        // Check bank for existing clue
        const clueItemId = `${tier}_clue`;
        return bank.getItemCount(clueItemId) > 0;
    }
    
    // Generate a new clue
    generateClue(tier) {
        const config = this.CLUE_CONFIG[tier];
        
        // Determine number of steps
        let stepCount;
        if (Array.isArray(config.steps)) {
            // Random between min and max
            const min = config.steps[0];
            const max = config.steps[1];
            stepCount = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            stepCount = config.steps;
        }
        
        // Get valid nodes for this tier
        const validNodes = nodes.getNodesForClueTier(config.maxLevel);
        
        if (validNodes.length < stepCount) {
            console.error(`Not enough valid nodes for ${tier} clue!`);
            return;
        }
        
        // Select random unique nodes
        const selectedNodes = [];
        const availableNodes = [...validNodes]; // Copy array
        
        for (let i = 0; i < stepCount; i++) {
            const randomIndex = Math.floor(Math.random() * availableNodes.length);
            const nodeId = availableNodes.splice(randomIndex, 1)[0];
            selectedNodes.push(nodeId);
        }
        
        // Create clue data
        const clueData = {
            tier: tier,
            steps: selectedNodes,
            completed: new Array(selectedNodes.length).fill(false),
            timestamp: Date.now()
        };
        
        // Store in memory
        this.clues[tier] = clueData;
        
        // Add to bank as special clue item
        const clueItemId = `${tier}_clue`;
        bank.deposit(clueItemId, 1);
        
        // Save clue data (will implement proper persistence later)
        this.saveClueData();
        
        console.log(`${config.itemName} dropped!`);
        console.log(`Steps required: ${selectedNodes.map(id => nodes.getNode(id).name).join(', ')}`);
        
        // Show celebration if XP drop manager exists
        if (window.xpDropManager) {
            xpDropManager.showClueObtained(tier);
        }
    }
    
    // Called when player arrives at a node
    onNodeVisit(nodeId) {
        // Check all active clues for this node
        for (const [tier, clueData] of Object.entries(this.clues)) {
            const stepIndex = clueData.steps.indexOf(nodeId);
            
            if (stepIndex !== -1 && !clueData.completed[stepIndex]) {
                // Mark this step as complete
                clueData.completed[stepIndex] = true;
                
                const nodeName = nodes.getNode(nodeId).name;
                console.log(`Clue step completed: ${nodeName}`);
                
                // Check if entire clue is complete
                if (this.isClueComplete(tier)) {
                    console.log(`${this.CLUE_CONFIG[tier].itemName} completed! Click it in bank to receive casket.`);
                }
                
                // Update UI if bank is open
                if (window.ui && ui.bankOpen) {
                    ui.updateBank();
                }
                
                this.saveClueData();
            }
        }
    }
    
    // Check if a clue is fully complete
    isClueComplete(tier) {
        const clueData = this.clues[tier];
        if (!clueData) return false;
        
        return clueData.completed.every(step => step === true);
    }
    
    // Convert completed clue to casket
    convertToCasket(tier) {
        const clueData = this.clues[tier];
        if (!clueData || !this.isClueComplete(tier)) {
            console.log('Clue not complete!');
            return false;
        }
        
        // Remove clue from bank
        const clueItemId = `${tier}_clue`;
        bank.withdraw(clueItemId, 1);
        
        // Add casket to bank
        const casketItemId = `${tier}_casket`;
        bank.deposit(casketItemId, 1);
        
        // Remove from active clues
        delete this.clues[tier];
        
        console.log(`${this.CLUE_CONFIG[tier].itemName} converted to ${this.CLUE_CONFIG[tier].casketName}!`);
        
        this.saveClueData();
        
        // Update UI
        if (window.ui && ui.bankOpen) {
            ui.updateBank();
        }
        
        return true;
    }
    
    // Get clue data for a tier (for UI display)
    getClueData(tier) {
        return this.clues[tier];
    }
    
    // Save clue data (temporary - will hook into firebase later)
    saveClueData() {
        // This will be integrated with firebase save system
        // For now just store in memory
    }
    
    // Load clue data
    loadClueData(data) {
        if (data && data.clues) {
            this.clues = data.clues;
        }
    }
}

// Create global instance
window.clueManager = new ClueManager();

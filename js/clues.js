class ClueManager {
constructor() {
        this.clues = {}; // Store active clues by tier
        this.completedClues = {
            easy: 0,
            medium: 0,
            hard: 0,
            elite: 0,
            master: 0
        }; // Track completed clues by tier
        
        // Clue configuration
        this.CLUE_CONFIG = {
            easy: {
                dropRate: 1/250,
                steps: 1,
                maxLevel: 1,
                itemName: 'Easy Clue',
                casketName: 'Easy Casket'
            },
            medium: {
                dropRate: 1/500,
                steps: [1, 1],
                maxLevel: 20,
                itemName: 'Medium Clue',
                casketName: 'Medium Casket'
            },
            hard: {
                dropRate: 1/1000,
                steps: [1, 2],
                maxLevel: 40,
                itemName: 'Hard Clue',
                casketName: 'Hard Casket'
            },
            elite: {
                dropRate: 1/1500,
                steps: [2, 3],
                maxLevel: 60,
                itemName: 'Elite Clue',
                casketName: 'Elite Casket'
            },
            master: {
                dropRate: 1/2500,
                steps: [3, 4],
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

// Refresh task UI to show clue indicators
if (window.ui) {
    ui.updateTasks();
}
    }
    
// Called when player arrives at a node
onNodeVisit(nodeId) {
    // Get the node we're visiting and its nearest bank
    const visitedNode = window.nodes ? nodes.getNode(nodeId) : null;
    const nodesEffectivelyVisited = new Set([nodeId]);
    
    // If this node has a nearest bank, we're effectively "at" that bank too
    if (visitedNode && visitedNode.nearestBank) {
        nodesEffectivelyVisited.add(visitedNode.nearestBank);
    }
    
    // Check all active clues for any of these nodes
    for (const [tier, clueData] of Object.entries(this.clues)) {
        let stepCompleted = false;
        let completedNodeName = null;
        
        // Check each node we're effectively visiting
        for (const effectiveNodeId of nodesEffectivelyVisited) {
            const stepIndex = clueData.steps.indexOf(effectiveNodeId);
            
            if (stepIndex !== -1 && !clueData.completed[stepIndex]) {
                // Mark this step as complete
                clueData.completed[stepIndex] = true;
                stepCompleted = true;
                
                const completedNode = nodes.getNode(effectiveNodeId);
                completedNodeName = completedNode ? completedNode.name : effectiveNodeId;
                console.log(`Clue step completed: ${completedNodeName} (via ${nodeId === effectiveNodeId ? 'direct visit' : 'nearest bank'})`);
                
                // Show step completion celebration
                if (window.xpDropManager) {
                    xpDropManager.showClueStepComplete(tier);
                }
            }
        }
        
        // If we completed any steps, check if entire clue is complete
        if (stepCompleted) {
            if (this.isClueComplete(tier)) {
                console.log(`${this.CLUE_CONFIG[tier].itemName} completed! Click it in bank to receive casket.`);
                
                // Show clue completion celebration
                if (window.xpDropManager) {
                    xpDropManager.showClueComplete(tier);
                }
            }
            
            // Update UI if bank is open
            if (window.ui && ui.bankOpen) {
                ui.updateBank();
            }
            
this.saveClueData();

// Update floating display
this.updateCompletedCluesDisplay();
            
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
    async convertToCasket(tier) {
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
        
        // INCREMENT COMPLETED CLUES COUNTER
        this.completedClues[tier]++;
        console.log(`${this.CLUE_CONFIG[tier].casketName} obtained! Total ${tier} clues completed: ${this.completedClues[tier]}`);
        
        // Show casket obtained celebration
        if (window.xpDropManager) {
            xpDropManager.showCasketObtained(tier);
        }
        
        this.saveClueData();
        
        // Update UI
        if (window.ui && ui.bankOpen) {
            ui.updateBank();
        }

        // Update floating display
        this.updateCompletedCluesDisplay();
        
        return true;
    }

// Open a casket and roll rewards
    async openCasket(tier) {
        const casketItemId = `${tier}_casket`;
        const casketCount = bank.getItemCount(casketItemId);
        
        if (casketCount === 0) {
            console.log('No casket to open!');
            return false;
        }
        
        // Withdraw one casket
        bank.withdraw(casketItemId, 1);
        
        // Roll rewards
        const rewards = this.rollCasketRewards(tier);
        
        // Add rewards to bank immediately
        for (const reward of rewards) {
            bank.deposit(reward.itemId, reward.quantity);
            console.log(`Received ${reward.quantity} ${reward.itemId} from ${tier} casket`);
        }
        
        // Show rewards modal (items are already in bank)
        this.showCasketRewards(tier, rewards);
        
        return true;
    }
    
    // Roll rewards based on tier
    rollCasketRewards(tier) {
        const casketData = loadingManager.getData('caskets');
        if (!casketData || !casketData[tier]) {
            console.error(`No casket data for tier: ${tier}`);
            return [];
        }
        
        const rewardPool = casketData[tier];
        const rewards = [];
        const usedItemIds = new Set();
        
        // Always add coins first
        const coinsData = rewardPool.find(r => r.itemId === 'coins');
        if (coinsData) {
            const quantity = Math.floor(Math.random() * (coinsData.maxRoll - coinsData.minRoll + 1)) + coinsData.minRoll;
            rewards.push({
                itemId: 'coins',
                quantity: quantity
            });
            usedItemIds.add('coins');
        }
        
        // Filter out coins from pool for other items
        const itemPool = rewardPool.filter(r => r.itemId !== 'coins');
        
        // Determine number of additional items based on tier
        let additionalItems = 1; // easy
        if (tier === 'medium') additionalItems = 2;
        else if (tier === 'hard') additionalItems = 3;
        else if (tier === 'elite') additionalItems = 4;
        else if (tier === 'master') additionalItems = 5;
        
        // Roll for additional items (no duplicates)
        for (let i = 0; i < additionalItems && itemPool.length > 0; i++) {
            // Filter out already used items
            const availableItems = itemPool.filter(item => !usedItemIds.has(item.itemId));
            
            if (availableItems.length === 0) break;
            
            const randomIndex = Math.floor(Math.random() * availableItems.length);
            const itemData = availableItems[randomIndex];
            
            const quantity = Math.floor(Math.random() * (itemData.maxRoll - itemData.minRoll + 1)) + itemData.minRoll;
            
            rewards.push({
                itemId: itemData.itemId,
                quantity: quantity
            });
            
            usedItemIds.add(itemData.itemId);
        }
        
        return rewards;
    }
    
    // Show casket rewards in modal
    showCasketRewards(tier, rewards) {
        const modal = document.getElementById('casket-rewards-modal');
        const header = document.getElementById('casket-header');
        const grid = document.getElementById('casket-rewards-grid');
        
        if (!modal || !header || !grid) return;
        
        // Clear previous content
        header.innerHTML = '';
        grid.innerHTML = '';
        
        // Create header (without the casket count)
        const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
        
        header.innerHTML = `
            <img class="casket-header-icon" src="assets/items/${tier}_casket.png" alt="${tierName} Casket">
            <span>${tierName} Casket Rewards!</span>
        `;
        
        // Create reward slots using same style as bank slots
        rewards.forEach((reward, index) => {
            const itemData = loadingManager.getData('items')[reward.itemId];
            if (!itemData) return;
            
            const slot = document.createElement('div');
            slot.className = 'casket-reward-slot';
            
            // Use the same item creation as bank slots
            if (window.ui) {
                // For coins, use the getCoinImage function
                if (reward.itemId === 'coins') {
                    const coinImage = ui.getCoinImage(reward.quantity);
                    const img = document.createElement('img');
                    img.src = `assets/items/${coinImage}.png`;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    slot.appendChild(img);
                } else {
                    const img = document.createElement('img');
                    img.src = `assets/items/${reward.itemId}.png`;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    slot.appendChild(img);
                }
                
                // Add quantity display if more than 1
                if (reward.quantity > 1) {
                    const countDiv = document.createElement('div');
                    countDiv.className = 'item-count';
                    
                    // Use the formatItemCount method from UI
                    const formatted = ui.formatItemCount(reward.quantity);
                    countDiv.textContent = formatted.text;
                    countDiv.style.color = formatted.color;
                    
                    slot.appendChild(countDiv);
                }
            }
            
            slot.title = `${itemData.name} x${formatNumber(reward.quantity)}`;
            
            grid.appendChild(slot);
            
            // Add staggered animation with highlight class
            setTimeout(() => {
                slot.classList.add('highlight');
            }, index * 200);
        });
        
        // Show modal
        modal.style.display = 'flex';
    }

    // Destroy a clue
destroyClue(tier) {
    const clueData = this.clues[tier];
    if (!clueData) {
        console.log('No clue to destroy');
        return false;
    }
    
    // Remove clue from bank
    const clueItemId = `${tier}_clue`;
    bank.withdraw(clueItemId, 1);
    
    // Remove from active clues
    delete this.clues[tier];
    
    console.log(`${this.CLUE_CONFIG[tier].itemName} destroyed!`);
    
    this.saveClueData();
    
// Update UI
if (window.ui) {
    ui.updateBank();
    ui.updateTasks(); // Also update tasks to remove clue indicators
}

    // Update floating display
this.updateCompletedCluesDisplay();

return true;
}
    
    // Get clue data for a tier (for UI display)
    getClueData(tier) {
        return this.clues[tier];
    }

// Get all clues that contain a specific node (only incomplete steps)
getCluesContainingNode(nodeId) {
    //console.log(`[getCluesContainingNode] Called with nodeId: ${nodeId}`);
    const matchingClues = [];
    
    //console.log(`[getCluesContainingNode] Checking against clues:`, this.clues);
    
    for (const [tier, clueData] of Object.entries(this.clues)) {
        //console.log(`[getCluesContainingNode] Checking ${tier} clue with steps:`, clueData.steps);
        
        // Find the step index for this node
        const stepIndex = clueData.steps.indexOf(nodeId);
        
        // Only add if this step exists AND is not completed
        if (stepIndex !== -1 && !clueData.completed[stepIndex]) {
            //console.log(`[getCluesContainingNode] ✅ FOUND INCOMPLETE MATCH: ${nodeId} is in ${tier} clue at step ${stepIndex}`);
            matchingClues.push(tier);
        } else if (stepIndex !== -1 && clueData.completed[stepIndex]) {
            //console.log(`[getCluesContainingNode] ⏭️ Step already complete: ${nodeId} in ${tier} clue`);
        } else {
            //console.log(`[getCluesContainingNode] ❌ No match: ${nodeId} not in ${tier} clue`);
        }
    }
    
    //console.log(`[getCluesContainingNode] Returning matches:`, matchingClues);
    return matchingClues;
}

    // Update the floating completed clues display
updateCompletedCluesDisplay() {
    const container = document.getElementById('floating-completed-clues');
    if (!container) return;
    
    // Clear current display
    container.innerHTML = '';
    
    // Define tier order (highest to lowest)
    const tierOrder = ['master', 'elite', 'hard', 'medium', 'easy'];
    
    // Find all completed clues
    const completedClues = [];
    for (const tier of tierOrder) {
        if (this.clues[tier] && this.isClueComplete(tier)) {
            completedClues.push(tier);
        }
    }
    
    // Create display elements for each completed clue
    completedClues.forEach(tier => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'floating-clue-item';
        clueDiv.title = `Click to convert to casket`;
        
        // Add click handler to convert to casket
        clueDiv.addEventListener('click', () => {
            if (window.clueManager) {
                clueManager.convertToCasket(tier);
            }
        });
        
        // Create clue image
        const img = document.createElement('img');
        img.src = `assets/items/${tier}_clue.png`;
        img.alt = `${tier} clue`;
        clueDiv.appendChild(img);
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'floating-clue-tooltip';
        
        const config = this.CLUE_CONFIG[tier];
        const titleText = config ? config.itemName : `${tier} clue`;
        
        tooltip.innerHTML = `
            <div class="floating-clue-tooltip-title">✓ ${titleText} Complete!</div>
            <div>Click to receive casket</div>
        `;
        
        clueDiv.appendChild(tooltip);
        container.appendChild(clueDiv);
    });
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
    
    // Load completed clues counts - ensure all tiers are initialized
    if (data && data.completedClues) {
        // Merge loaded data with defaults to ensure all tiers exist
        this.completedClues = {
            easy: data.completedClues.easy || 0,
            medium: data.completedClues.medium || 0,
            hard: data.completedClues.hard || 0,
            elite: data.completedClues.elite || 0,
            master: data.completedClues.master || 0
        };
    } else {
        // No saved data - initialize all to 0
        this.completedClues = {
            easy: 0,
            medium: 0,
            hard: 0,
            elite: 0,
            master: 0
        };
    }

    // Update floating display
    this.updateCompletedCluesDisplay();
    
    // Refresh task UI to show clue indicators for loaded clues
    if (window.ui) {
        ui.updateTasks();
    }
}

}

// Create global instance
window.clueManager = new ClueManager();

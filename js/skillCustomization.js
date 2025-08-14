class SkillCustomizationUI {
    constructor() {
        this.isOpen = false;
        this.currentSkillId = null;
        this.overlay = null;
        this.initialize();
    }
    
    initialize() {
        // Create the overlay element
        this.createOverlay();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'skill-customization-overlay';
        this.overlay.className = 'skill-customization-overlay';
        this.overlay.style.display = 'none';
        
        const container = document.createElement('div');
        container.className = 'skill-customization-container';
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'skill-customization-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());
        
        // Content area
        const content = document.createElement('div');
        content.className = 'skill-customization-content';
        content.id = 'skill-customization-content';
        
        container.appendChild(closeBtn);
        container.appendChild(content);
        this.overlay.appendChild(container);
        
        // Add to scaled container
        const scaledContainer = document.getElementById('scaled-container');
        if (scaledContainer) {
            scaledContainer.appendChild(this.overlay);
        } else {
            document.body.appendChild(this.overlay);
        }
    }
    
    open(skillId) {
        this.currentSkillId = skillId;
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.render();
    }
    
    close() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
        this.currentSkillId = null;
    }
    
    render() {
        if (!this.currentSkillId) return;
        
        const content = document.getElementById('skill-customization-content');
        content.innerHTML = '';
        
        const skill = skills.skills[this.currentSkillId];
        const skillData = loadingManager.getData('skills')[this.currentSkillId];
        
        // Header
        const header = this.createHeader(skill, skillData);
        content.appendChild(header);
        
        // Speed bonuses
        const speedBonuses = this.createSpeedBonuses();
        content.appendChild(speedBonuses);
        
        // Main content area with tasks and nodes
        const mainContent = document.createElement('div');
        mainContent.className = 'skill-customization-main';
        
        // Tasks column
        const tasksColumn = this.createTasksColumn();
        mainContent.appendChild(tasksColumn);
        
        // Nodes column
        const nodesColumn = this.createNodesColumn();
        mainContent.appendChild(nodesColumn);
        
        content.appendChild(mainContent);
    }
    
    createHeader(skill, skillData) {
        const header = document.createElement('div');
        header.className = 'skill-customization-header';
        
        // Left side - skill info
        const leftSide = document.createElement('div');
        leftSide.className = 'header-left';
        
        // Skill icon and name
        const titleDiv = document.createElement('div');
        titleDiv.className = 'skill-title';
        
        const icon = loadingManager.getImage(`skill_${this.currentSkillId}`);
        if (icon) {
            const iconImg = document.createElement('img');
            iconImg.src = icon.src;
            iconImg.className = 'skill-icon-large';
            titleDiv.appendChild(iconImg);
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skill-name';
        nameSpan.textContent = `${skillData.name} Customization`;
        titleDiv.appendChild(nameSpan);
        
        // Skill stats
        const statsDiv = document.createElement('div');
        statsDiv.className = 'skill-stats';
        
        const levelSpan = document.createElement('span');
        levelSpan.textContent = `Level ${skill.level}`;
        
        const xpSpan = document.createElement('span');
        xpSpan.textContent = `${formatNumber(Math.floor(skill.xp))} XP`;
        
        const rcSpentSpan = document.createElement('span');
        const rcSpent = runeCreditManager.rcSpentPerSkill[this.currentSkillId] || 0;
        rcSpentSpan.textContent = `${rcSpent} RC spent on ${skillData.name}`;
        
        const tasksSpan = document.createElement('span');
        const taskCount = this.getSkillTaskCount();
        tasksSpan.textContent = `${taskCount} ${skillData.name} tasks completed`;
        
        statsDiv.appendChild(levelSpan);
        statsDiv.appendChild(xpSpan);
        statsDiv.appendChild(rcSpentSpan);
        statsDiv.appendChild(tasksSpan);
        
        leftSide.appendChild(titleDiv);
        leftSide.appendChild(statsDiv);
        
        // Right side - RuneCred
        const rightSide = document.createElement('div');
        rightSide.className = 'header-right';
        
        const rcDiv = document.createElement('div');
        rcDiv.className = 'runecred-display';
        rcDiv.id = 'runecred-display';
        rcDiv.innerHTML = `RuneCred: <span class="rc-amount">${runeCreditManager.runecred}</span>`;
        
        const totalTasksDiv = document.createElement('div');
        totalTasksDiv.className = 'total-tasks';
        totalTasksDiv.textContent = `${runeCreditManager.totalTasksCompleted} tasks completed`;
        
        rightSide.appendChild(rcDiv);
        rightSide.appendChild(totalTasksDiv);
        
        header.appendChild(leftSide);
        header.appendChild(rightSide);
        
        return header;
    }
    
    createSpeedBonuses() {
        const container = document.createElement('div');
        container.className = 'speed-bonuses';
        
        const totalBonus = runeCreditManager.getSkillSpeedBonus(this.currentSkillId);
        const bonusPercent = Math.round(totalBonus * 100);
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'speed-bonus-title';
        
        // Create the percentage span
        const percentSpan = document.createElement('span');
        percentSpan.className = 'bonus-percent';
        percentSpan.textContent = `+${bonusPercent}%  `;
        
        // Create the text
        const textSpan = document.createElement('span');
        textSpan.textContent = '  increased speed';
        
        // Create bonuses container
        const bonusesDiv = document.createElement('div');
        bonusesDiv.className = 'speed-bonus-list';
        
        // Pet bonus
        const petBonus = this.createBonusItem('pet', 
            runeCreditManager.speedBonuses.pets[this.currentSkillId],
            runeCreditManager.speedBonuses.shinyPets[this.currentSkillId]);
        bonusesDiv.appendChild(petBonus);
        
        // Cape bonus
        const capeBonus = this.createBonusItem('cape',
            runeCreditManager.speedBonuses.skillCapes[this.currentSkillId],
            runeCreditManager.speedBonuses.trimmedCapes[this.currentSkillId]);
        bonusesDiv.appendChild(capeBonus);
        
        // Max cape bonus
        const maxCapeBonus = this.createBonusItem('maxcape',
            runeCreditManager.speedBonuses.maxCape,
            false);
        bonusesDiv.appendChild(maxCapeBonus);
        
        // Assemble all on one line
        titleDiv.appendChild(percentSpan);
        titleDiv.appendChild(textSpan);
        titleDiv.appendChild(bonusesDiv);
        
        container.appendChild(titleDiv);
        
        return container;
    }
    
    createBonusItem(type, hasRegular, hasUpgraded) {
        const item = document.createElement('div');
        item.className = 'speed-bonus-item';
        
        let text = '';
        let active = false;
        
        if (type === 'pet') {
            if (hasUpgraded) {
                text = '+10% shiny pet';
                active = true;
            } else if (hasRegular) {
                text = '+5% pet';
                active = true;
            } else {
                text = '+5% pet';
            }
        } else if (type === 'cape') {
            if (hasUpgraded) {
                text = '+10% trimmed cape';
                active = true;
            } else if (hasRegular) {
                text = '+5% skill cape';
                active = true;
            } else {
                text = '+5% skill cape';
            }
        } else if (type === 'maxcape') {
            text = '+5% max cape';
            active = hasRegular;
        }
        
        if (active) {
            item.classList.add('active');
        }
        
        item.textContent = text;
        return item;
    }
    
    createTasksColumn() {
        const column = document.createElement('div');
        column.className = 'customization-column';
        
        const title = document.createElement('h3');
        title.textContent = 'Tasks';
        column.appendChild(title);
        
        const tasksList = document.createElement('div');
        tasksList.className = 'tasks-list';
        
        // Get all possible tasks for this skill
        const possibleTasks = this.getPossibleTasks();
        
        // Get current player level
        const currentLevel = skills.getLevel(this.currentSkillId);
        
        // Calculate total weight for percentage calculation
        // Only include tasks the player can actually get
        let totalWeight = 0;
        for (const task of possibleTasks) {
            if (currentLevel >= task.requiredLevel) {
                const weight = runeCreditManager.getTaskWeight(this.currentSkillId, task.itemId);
                totalWeight += weight;
            }
        }
        
        for (const task of possibleTasks) {
            const taskRow = this.createTaskRow(task, totalWeight, currentLevel);
            tasksList.appendChild(taskRow);
        }
        
        column.appendChild(tasksList);
        return column;
    }
    
    createTaskRow(task, totalWeight, currentLevel) {
        const row = document.createElement('div');
        row.className = 'task-row';
        row.dataset.taskId = task.itemId;
        
        // Check if player has the level for this task
        const hasLevel = currentLevel >= task.requiredLevel;
        
        // Grey out if player doesn't have the level
        if (!hasLevel) {
            row.classList.add('unavailable');
        }
        
        // Add hover events for highlighting nodes
        // IMPORTANT: These work the same for both available and unavailable tasks
        row.addEventListener('mouseenter', () => {
            // Add hover outline class based on availability
            if (hasLevel) {
                row.classList.add('hover-outline-green');
            } else {
                row.classList.add('hover-outline-red');
            }
            // Highlight nodes - pass availability status
            this.highlightNodesForTask(task.itemId, hasLevel);
        });
        
        row.addEventListener('mouseleave', () => {
            // Remove both possible hover outline classes
            row.classList.remove('hover-outline-green');
            row.classList.remove('hover-outline-red');
            // Clear node highlights
            this.clearNodeHighlights();
        });
        
        // Task info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'task-info';
        
        const weight = runeCreditManager.getTaskWeight(this.currentSkillId, task.itemId);
        // Only show percentage if player can get this task
        const percentage = hasLevel ? Math.round((weight / totalWeight) * 100) : 0;
        
        const modifier = runeCreditManager.getQuantityModifier(this.currentSkillId, task.itemId);
        const minQty = Math.round(task.minCount * modifier);
        const maxQty = Math.round(task.maxCount * modifier);
        
        const itemData = loadingManager.getData('items')[task.itemId];
        const itemName = task.displayName || (itemData ? itemData.name : task.itemId);
        
        // Get level requirement
        const levelReq = task.requiredLevel || 1;
        
        // Create level span with appropriate color
        const levelClass = hasLevel ? 'task-level-has' : 'task-level-needs';
        
        infoDiv.innerHTML = `
            <span class="task-level ${levelClass}">Lv ${levelReq}</span>
            <span class="task-chance">${hasLevel ? percentage + '%' : '-'}</span>
            <span class="task-name">${itemName}</span>
            <span class="task-quantity">(${minQty}-${maxQty})</span>
        `;
        
        // Control buttons
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'task-controls';
        
        // Get current modification levels
        const weightLevel = runeCreditManager.taskModLevels[this.currentSkillId]?.[task.itemId] || 0;
        const qtyLevel = runeCreditManager.quantityModLevels[this.currentSkillId]?.[task.itemId] || 0;
        
        // Only enable controls if player has the level
        if (hasLevel) {
            // Weight controls
            const weightUp = this.createControlButton('+', () => {
                if (runeCreditManager.modifyTaskWeight(this.currentSkillId, task.itemId, true)) {
                    this.render();
                }
            }, weightLevel);
            
            const weightDown = this.createControlButton('-', () => {
                if (runeCreditManager.modifyTaskWeight(this.currentSkillId, task.itemId, false)) {
                    this.render();
                }
            }, weightLevel);
            
            // Quantity controls
            const qtyUp = this.createControlButton('+', () => {
                if (runeCreditManager.modifyTaskQuantity(this.currentSkillId, task.itemId, true)) {
                    this.render();
                }
            }, qtyLevel);
            
            const qtyDown = this.createControlButton('-', () => {
                if (runeCreditManager.modifyTaskQuantity(this.currentSkillId, task.itemId, false)) {
                    this.render();
                }
            }, qtyLevel);
            
            controlsDiv.appendChild(weightUp);
            controlsDiv.appendChild(weightDown);
            controlsDiv.appendChild(qtyUp);
            controlsDiv.appendChild(qtyDown);
        } else {
            // Add disabled placeholder buttons
            for (let i = 0; i < 4; i++) {
                const btn = document.createElement('button');
                btn.className = 'control-button disabled';
                btn.disabled = true;
                btn.textContent = i % 2 === 0 ? '+' : '-';
                controlsDiv.appendChild(btn);
            }
        }
        
        row.appendChild(infoDiv);
        row.appendChild(controlsDiv);
        
        return row;
    }
    
    createNodesColumn() {
        const column = document.createElement('div');
        column.className = 'customization-column';
        
        const title = document.createElement('h3');
        title.textContent = 'Nodes';
        column.appendChild(title);
        
        const nodesList = document.createElement('div');
        nodesList.className = 'nodes-list';
        
        // Get all possible nodes for this skill
        const possibleNodes = this.getPossibleNodes();
        
        // Get current player level
        const currentLevel = skills.getLevel(this.currentSkillId);
        
        for (const nodeId of possibleNodes) {
            const nodeRow = this.createNodeRow(nodeId, currentLevel);
            nodesList.appendChild(nodeRow);
        }
        
        column.appendChild(nodesList);
        return column;
    }
    
    createNodeRow(nodeId, currentLevel) {
        const row = document.createElement('div');
        row.className = 'node-row';
        row.dataset.nodeId = nodeId;
        
        const nodeData = nodes.getNode(nodeId);
        
        // Check if node has any activities the player can do
        const hasUsableActivities = this.nodeHasUsableActivities(nodeId, currentLevel);
        
        // Grey out if no usable activities
        if (!hasUsableActivities) {
            row.classList.add('unavailable');
        }
        
        // Add hover events for highlighting
        // IMPORTANT: These work the same for both available and unavailable nodes
        row.addEventListener('mouseenter', () => {
            // Add hover outline class based on availability
            if (hasUsableActivities) {
                row.classList.add('hover-outline-green');
            } else {
                row.classList.add('hover-outline-red');
            }
            // Highlight matching tasks
            this.highlightTasksForNode(nodeId, currentLevel);
        });
        
        row.addEventListener('mouseleave', () => {
            // Remove both possible hover outline classes
            row.classList.remove('hover-outline-green');
            row.classList.remove('hover-outline-red');
            // Clear task highlights
            this.clearTaskHighlights();
        });
        
        // Node info with bank distance
        const infoDiv = document.createElement('div');
        infoDiv.className = 'node-info';
        
        // Create weight display (hidden by default)
        const weightDisplay = document.createElement('span');
        weightDisplay.className = 'node-weight-display';
        weightDisplay.style.display = 'none';
        
        if (nodeData) {
            let nodeText = nodeData.name;
            
            // Add bank information if available
            if (nodeData.nearestBank && nodeData.nearestBankDistance) {
                const bankNode = nodes.getNode(nodeData.nearestBank);
                const bankName = bankNode ? bankNode.name : nodeData.nearestBank.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                nodeText += ` (${bankName}: ${nodeData.nearestBankDistance} yards)`;
            }
            
            infoDiv.appendChild(weightDisplay);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'node-name';
            nameSpan.textContent = nodeText;
            infoDiv.appendChild(nameSpan);
        } else {
            infoDiv.appendChild(weightDisplay);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'node-name';
            nameSpan.textContent = nodeId;
            infoDiv.appendChild(nameSpan);
        }
        
        // Control buttons
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'node-controls';
        
        // Get current modification level
        const nodeLevel = runeCreditManager.nodeModLevels[this.currentSkillId]?.[nodeId] || 0;
        
        // Only enable controls if node has usable activities
        if (hasUsableActivities) {
            const weightUp = this.createControlButton('+', () => {
                if (runeCreditManager.modifyNodeWeight(this.currentSkillId, nodeId, true)) {
                    this.render();
                }
            }, nodeLevel);
            
            const weightDown = this.createControlButton('-', () => {
                if (runeCreditManager.modifyNodeWeight(this.currentSkillId, nodeId, false)) {
                    this.render();
                }
            }, nodeLevel);
            
            controlsDiv.appendChild(weightUp);
            controlsDiv.appendChild(weightDown);
        } else {
            // Add disabled placeholder buttons
            for (let i = 0; i < 2; i++) {
                const btn = document.createElement('button');
                btn.className = 'control-button disabled';
                btn.disabled = true;
                btn.textContent = i === 0 ? '+' : '-';
                controlsDiv.appendChild(btn);
            }
        }
        
        row.appendChild(infoDiv);
        row.appendChild(controlsDiv);
        
        return row;
    }
    
    nodeHasUsableActivities(nodeId, currentLevel) {
        const nodeData = nodes.getNode(nodeId);
        if (!nodeData || !nodeData.activities) return false;
        
        const activitiesData = loadingManager.getData('activities');
        
        for (const activityId of nodeData.activities) {
            const activity = activitiesData[activityId];
            if (!activity || activity.skill !== this.currentSkillId) continue;
            
            // Check if player has level for this activity
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel >= requiredLevel) {
                return true;
            }
        }
        
        return false;
    }
    
    createControlButton(text, onClick, modLevel) {
        const btn = document.createElement('button');
        btn.className = 'control-button';
        btn.textContent = text;
        
        // Show orb based on modification level
        if (modLevel !== 0) {
            const isPositive = modLevel > 0;
            const showOrb = (text === '+' && isPositive) || (text === '-' && !isPositive);
            
            if (showOrb) {
                const orbClass = isPositive ? 'mod-orb-green' : 'mod-orb-red';
                btn.innerHTML = `${text}<span class="${orbClass}">${Math.abs(modLevel)}</span>`;
            }
        }
        
        btn.addEventListener('click', onClick);
        return btn;
    }
    
    highlightTasksForNode(nodeId, currentLevel) {
        // Clear existing highlights
        this.clearTaskHighlights();
        
        // Get node data
        const nodeData = nodes.getNode(nodeId);
        if (!nodeData || !nodeData.activities) return;
        
        // Get activities data
        const activitiesData = loadingManager.getData('activities');
        
        // Build list of possible task itemIds from this node's activities
        // Track which ones the player can actually do
        const possibleTaskIds = new Map(); // itemId -> canDo (boolean)
        
        for (const activityId of nodeData.activities) {
            const activity = activitiesData[activityId];
            if (!activity || activity.skill !== this.currentSkillId) continue;
            
            // Check if player has level for this activity
            const activityRequiredLevel = activity.requiredLevel || 1;
            const canDoActivity = currentLevel >= activityRequiredLevel;
            
            // Map activity to task itemIds based on skill type
            if (this.currentSkillId === 'runecraft') {
                possibleTaskIds.set(`runecraft_trips_${activityId}`, canDoActivity);
            } else if (this.currentSkillId === 'agility') {
                possibleTaskIds.set(`agility_laps_${activityId}`, canDoActivity);
            } else if (this.currentSkillId === 'thieving') {
                possibleTaskIds.set(`thieving_${activityId}`, canDoActivity);
            } else if (this.currentSkillId === 'firemaking') {
                if (activity.firemakingTable) {
                    for (const logData of activity.firemakingTable) {
                        // Check if player can do this specific log
                        const canDoLog = currentLevel >= logData.requiredLevel;
                        possibleTaskIds.set(logData.logId, canDoLog && canDoActivity);
                    }
                }
            } else if (this.currentSkillId === 'cooking') {
                if (activity.cookingTable) {
                    for (const recipe of activity.cookingTable) {
                        // Check if player can do this specific recipe
                        const canDoRecipe = currentLevel >= recipe.requiredLevel;
                        possibleTaskIds.set(recipe.rawItemId, canDoRecipe && canDoActivity);
                    }
                }
            } else {
                // Standard gathering skills - get items from rewards
                if (activity.rewards) {
                    for (const reward of activity.rewards) {
                        if (reward.itemId && !this.isIgnoredItemForHighlight(reward.itemId)) {
                            const rewardLevel = reward.requiredLevel || activityRequiredLevel;
                            const canDoReward = currentLevel >= rewardLevel;
                            possibleTaskIds.set(reward.itemId, canDoReward && canDoActivity);
                        }
                    }
                }
                if (activity.alternatingRewards) {
                    for (const reward of activity.alternatingRewards) {
                        if (reward.itemId && !this.isIgnoredItemForHighlight(reward.itemId)) {
                            const rewardLevel = reward.requiredLevel || activityRequiredLevel;
                            const canDoReward = currentLevel >= rewardLevel;
                            possibleTaskIds.set(reward.itemId, canDoReward && canDoActivity);
                        }
                    }
                }
            }
        }
        
        // Highlight matching task rows with appropriate color
        const taskRows = document.querySelectorAll('.task-row');
        taskRows.forEach(row => {
            const taskId = row.dataset.taskId;
            if (possibleTaskIds.has(taskId)) {
                const canDo = possibleTaskIds.get(taskId);
                if (canDo) {
                    row.classList.add('green-outline');
                } else {
                    row.classList.add('red-outline');
                }
            }
        });
    }
    
    highlightNodesForTask(taskItemId, isAvailable = true) {
        // Clear existing highlights
        this.clearNodeHighlights();
        
        // Get current player level
        const currentLevel = skills.getLevel(this.currentSkillId);
        
        // Get all nodes that can do this task (regardless of level)
        const compatibleNodes = this.getNodesForTask(taskItemId, currentLevel);
        
        // Calculate weights for these nodes
        const nodeWeights = this.calculateNodeWeightsForTask(compatibleNodes);
        
        // Hide all nodes first
        const nodeRows = document.querySelectorAll('.node-row');
        nodeRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // Show and highlight matching nodes
        nodeRows.forEach(row => {
            const nodeId = row.dataset.nodeId;
            if (nodeWeights.has(nodeId)) {
                row.style.display = 'flex';
                // Use outline color based on whether the task is available to the player
                if (isAvailable) {
                    row.classList.add('green-outline');
                } else {
                    row.classList.add('red-outline');
                }
                
                // Show weight percentage at the front
                const weightDisplay = row.querySelector('.node-weight-display');
                if (weightDisplay) {
                    const percentage = nodeWeights.get(nodeId);
                    weightDisplay.textContent = `${percentage}%`;
                    weightDisplay.style.display = 'inline';
                }
            }
        });
    }
    
    getNodesForTask(taskItemId, currentLevel) {
        const compatibleNodes = new Set();
        const allNodes = nodes.getAllNodes();
        const activitiesData = loadingManager.getData('activities');
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            for (const activityId of node.activities) {
                const activity = activitiesData[activityId];
                if (!activity || activity.skill !== this.currentSkillId) continue;
                
                // Don't check level here - we want to see all nodes that offer this task
                
                // Check if this activity can produce the task item
                let canProduce = false;
                
                if (this.currentSkillId === 'runecraft') {
                    canProduce = taskItemId === `runecraft_trips_${activityId}`;
                } else if (this.currentSkillId === 'agility') {
                    canProduce = taskItemId === `agility_laps_${activityId}`;
                } else if (this.currentSkillId === 'thieving') {
                    canProduce = taskItemId === `thieving_${activityId}`;
                } else if (this.currentSkillId === 'firemaking') {
                    if (activity.firemakingTable) {
                        canProduce = activity.firemakingTable.some(log => log.logId === taskItemId);
                    }
                } else if (this.currentSkillId === 'cooking') {
                    if (activity.cookingTable) {
                        canProduce = activity.cookingTable.some(recipe => recipe.rawItemId === taskItemId);
                    }
                } else {
                    // Standard gathering skills
                    if (activity.rewards) {
                        canProduce = activity.rewards.some(r => r.itemId === taskItemId);
                    }
                    if (!canProduce && activity.alternatingRewards) {
                        canProduce = activity.alternatingRewards.some(r => r.itemId === taskItemId);
                    }
                }
                
                if (canProduce) {
                    compatibleNodes.add(nodeId);
                    break;
                }
            }
        }
        
        return Array.from(compatibleNodes);
    }
    
    calculateNodeWeightsForTask(nodeIds) {
        const weights = new Map();
        
        if (nodeIds.length === 0) return weights;
        
        // Calculate total weight
        let totalWeight = 0;
        for (const nodeId of nodeIds) {
            const weight = runeCreditManager.getNodeWeight(this.currentSkillId, nodeId);
            totalWeight += weight;
        }
        
        // Calculate percentages
        for (const nodeId of nodeIds) {
            const weight = runeCreditManager.getNodeWeight(this.currentSkillId, nodeId);
            const percentage = Math.round((weight / totalWeight) * 100);
            weights.set(nodeId, percentage);
        }
        
        return weights;
    }
    
    clearTaskHighlights() {
        const taskRows = document.querySelectorAll('.task-row');
        taskRows.forEach(row => {
            row.classList.remove('green-outline');
            row.classList.remove('red-outline');
        });
    }
    
    clearNodeHighlights() {
        const nodeRows = document.querySelectorAll('.node-row');
        nodeRows.forEach(row => {
            row.classList.remove('green-outline');
            row.classList.remove('red-outline');
            row.style.display = 'flex'; // Show all nodes again
            
            // Hide weight display
            const weightDisplay = row.querySelector('.node-weight-display');
            if (weightDisplay) {
                weightDisplay.style.display = 'none';
            }
        });
    }
    
    isIgnoredItemForHighlight(itemId) {
        const ignored = ['burnt_food', 'uncut_sapphire', 'uncut_emerald', 'uncut_ruby', 'uncut_diamond', 'ashes'];
        return ignored.includes(itemId);
    }
    
    getPossibleTasks() {
        const skill = skillRegistry.getSkill(this.currentSkillId);
        if (!skill) return [];
        
        if (skill.getAllPossibleTasksForUI) {
            return skill.getAllPossibleTasksForUI();
        }
        
        return [];
    }
    
    getItemDisplayName(itemId) {
        if (itemId.startsWith('agility_laps_')) {
            return itemId.replace('agility_laps_', '').replace(/_/g, ' ') + ' laps';
        }
        if (itemId.startsWith('thieving_')) {
            return itemId.replace('thieving_', '').replace(/_/g, ' ');
        }
        if (itemId.startsWith('runecraft_trips_')) {
            return itemId.replace('runecraft_trips_', '').replace(/_/g, ' ');
        }
        
        const itemData = loadingManager.getData('items')[itemId];
        return itemData ? itemData.name : itemId.replace(/_/g, ' ');
    }
    
    getItemCounts(itemId) {
        const defaultCounts = { min: 20, max: 50 };
        return defaultCounts;
    }
    
    getPossibleNodes() {
        const possibleNodes = new Set();
        const activities = loadingManager.getData('activities');
        
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== this.currentSkillId) continue;
            
            const allNodes = nodes.getAllNodes();
            for (const [nodeId, node] of Object.entries(allNodes)) {
                if (node.activities && node.activities.includes(activityId)) {
                    possibleNodes.add(nodeId);
                }
            }
        }
        
        return Array.from(possibleNodes);
    }
    
    getSkillTaskCount() {
        let count = 0;
        if (window.taskManager) {
            for (const task of taskManager.completedTasks) {
                if (task.skill === this.currentSkillId) {
                    count++;
                }
            }
        }
        return count;
    }
    
    updateRuneCred() {
        const display = document.getElementById('runecred-display');
        if (display) {
            display.innerHTML = `RuneCred: <span class="rc-amount">${runeCreditManager.runecred}</span>`;
        }
    }
}

// Create global instance
window.skillCustomizationUI = new SkillCustomizationUI();

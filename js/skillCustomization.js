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
        titleDiv.innerHTML = `<span class="bonus-percent">+${bonusPercent}%</span> increased speed`;
        
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
        
        container.appendChild(titleDiv);
        container.appendChild(bonusesDiv);
        
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
        
        // Calculate total weight for percentage calculation
        let totalWeight = 0;
        for (const task of possibleTasks) {
            const weight = runeCreditManager.getTaskWeight(this.currentSkillId, task.itemId);
            totalWeight += weight;
        }
        
        for (const task of possibleTasks) {
            const taskRow = this.createTaskRow(task, totalWeight);
            tasksList.appendChild(taskRow);
        }
        
        column.appendChild(tasksList);
        return column;
    }
    
    createTaskRow(task, totalWeight) {
        const row = document.createElement('div');
        row.className = 'task-row';
        
        // Task info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'task-info';
        
        const weight = runeCreditManager.getTaskWeight(this.currentSkillId, task.itemId);
        const percentage = Math.round((weight / totalWeight) * 100);
        
        const modifier = runeCreditManager.getQuantityModifier(this.currentSkillId, task.itemId);
        const minQty = Math.round(task.minCount * modifier);
        const maxQty = Math.round(task.maxCount * modifier);
        
        const itemData = loadingManager.getData('items')[task.itemId];
        const itemName = task.displayName || (itemData ? itemData.name : task.itemId);
        
        infoDiv.innerHTML = `
            <span class="task-chance">${percentage}%</span>
            <span class="task-name">${itemName}</span>
            <span class="task-quantity">(${minQty}-${maxQty})</span>
        `;
        
        // Control buttons
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'task-controls';
        
        // Weight controls
        const weightUp = this.createControlButton('+', () => {
            if (runeCreditManager.modifyTaskWeight(this.currentSkillId, task.itemId, true)) {
                this.render();
            }
        }, runeCreditManager.rcPools.tasks[this.currentSkillId]?.[task.itemId] || 0);
        
        const weightDown = this.createControlButton('-', () => {
            if (runeCreditManager.modifyTaskWeight(this.currentSkillId, task.itemId, false)) {
                this.render();
            }
        }, 0);
        
        // Quantity controls
        const qtyUp = this.createControlButton('+', () => {
            if (runeCreditManager.modifyTaskQuantity(this.currentSkillId, task.itemId, true)) {
                this.render();
            }
        }, runeCreditManager.rcPools.quantities[this.currentSkillId]?.[task.itemId] || 0);
        
        const qtyDown = this.createControlButton('-', () => {
            if (runeCreditManager.modifyTaskQuantity(this.currentSkillId, task.itemId, false)) {
                this.render();
            }
        }, 0);
        
        controlsDiv.appendChild(weightUp);
        controlsDiv.appendChild(weightDown);
        controlsDiv.appendChild(qtyUp);
        controlsDiv.appendChild(qtyDown);
        
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
        
        for (const nodeId of possibleNodes) {
            const nodeRow = this.createNodeRow(nodeId);
            nodesList.appendChild(nodeRow);
        }
        
        column.appendChild(nodesList);
        return column;
    }
    
    createNodeRow(nodeId) {
        const row = document.createElement('div');
        row.className = 'node-row';
        
        const nodeData = nodes.getNode(nodeId);
        
        // Node info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'node-info';
        infoDiv.textContent = nodeData ? nodeData.name : nodeId;
        
        // Control buttons
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'node-controls';
        
        const weightUp = this.createControlButton('+', () => {
            if (runeCreditManager.modifyNodeWeight(this.currentSkillId, nodeId, true)) {
                this.render();
            }
        }, runeCreditManager.rcPools.nodes[this.currentSkillId]?.[nodeId] || 0);
        
        const weightDown = this.createControlButton('-', () => {
            if (runeCreditManager.modifyNodeWeight(this.currentSkillId, nodeId, false)) {
                this.render();
            }
        }, 0);
        
        controlsDiv.appendChild(weightUp);
        controlsDiv.appendChild(weightDown);
        
        row.appendChild(infoDiv);
        row.appendChild(controlsDiv);
        
        return row;
    }
    
    createControlButton(text, onClick, spentAmount) {
        const btn = document.createElement('button');
        btn.className = 'control-button';
        btn.textContent = text;
        
        if (spentAmount > 0) {
            btn.innerHTML = `${text}<span class="spent-amount">${spentAmount}</span>`;
        }
        
        btn.addEventListener('click', onClick);
        return btn;
    }
    
getPossibleTasks() {
    // Get the skill object
    const skill = skillRegistry.getSkill(this.currentSkillId);
    if (!skill) return [];
    
    // Use the new method that returns ALL possible tasks
    const possibleTasks = skill.getAllPossibleTasks ? 
        skill.getAllPossibleTasks() : [];
    
    // Ensure all tasks have proper structure
    return possibleTasks.map(task => ({
        itemId: task.itemId,
        displayName: task.displayName || this.getItemDisplayName(task.itemId),
        minCount: task.minCount || 20,
        maxCount: task.maxCount || 50,
        requiredLevel: task.requiredLevel || 1
    }));
}

getItemDisplayName(itemId) {
    // Handle special virtual items
    if (itemId.startsWith('agility_laps_')) {
        return itemId.replace('agility_laps_', '').replace(/_/g, ' ') + ' laps';
    }
    if (itemId.startsWith('thieving_')) {
        return itemId.replace('thieving_', '').replace(/_/g, ' ');
    }
    if (itemId.startsWith('runecraft_trips_')) {
        return itemId.replace('runecraft_trips_', '').replace(/_/g, ' ');
    }
    
    // Get from items data
    const itemData = loadingManager.getData('items')[itemId];
    return itemData ? itemData.name : itemId.replace(/_/g, ' ');
}
    
    getItemCounts(itemId) {
        // Get counts from skill-specific data
        // This is hardcoded per skill for now
        const defaultCounts = { min: 20, max: 50 };
        
        // You would need to extract these from each skill's determineTargetCount method
        // For now, returning defaults
        return defaultCounts;
    }
    
    getPossibleNodes() {
        const possibleNodes = new Set();
        const activities = loadingManager.getData('activities');
        
        // Find all nodes that have activities for this skill
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== this.currentSkillId) continue;
            
            // Find nodes with this activity
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
        // Count completed tasks for this skill
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

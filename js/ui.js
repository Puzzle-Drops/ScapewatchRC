class UIManager {
    constructor() {
        this.currentPanel = 'inventory';
        this.bankOpen = false;
        this.itemOrder = null;
        this.itemOrderMap = {};
        this.minimized = false; // Track minimized state
        this.initializeUI();
    }

    // ==================== INITIALIZATION ====================

    initializeUI() {
        // Initialize item order from items.json
        this.initializeItemOrder();
        
        // Set up panel switching
        this.setupPanelButtons();
        
        // Set up modal close buttons
        this.setupModalButtons();
        
        // Initial updates
        this.updateInventory();
        this.updateSkillsList();
        this.updateTasks();
    }

    initializeItemOrder() {
        const itemsData = loadingManager.getData('items');
        this.itemOrder = Object.keys(itemsData);
        
        this.itemOrderMap = {};
        this.itemOrder.forEach((itemId, index) => {
            this.itemOrderMap[itemId] = index;
        });
    }

    setupPanelButtons() {
    const buttons = document.querySelectorAll('.panel-btn');
    
    buttons.forEach(btn => {
        // Skip the pause button - it has its own handler
        if (btn.id === 'pause-toggle') {
            return;
        }
        
        btn.addEventListener('click', (e) => {
            const panel = btn.dataset.panel;
            
            // Check if clicking the already active panel (to minimize/maximize)
            if (btn.classList.contains('active') && panel !== 'bank' && panel !== 'shop') {
                this.toggleMinimize();
                return;
            }
            
            // Handle bank and shop buttons (keep minimized state)
            if (panel === 'bank') {
                this.openBank();
                return;
            } else if (panel === 'shop') {
                this.openShop();
                return;
            }
            
            // For regular panels, restore if minimized then switch
            if (this.minimized) {
                this.restore();
            }
            
            this.switchPanel(panel);
        });
    });
}

    setupModalButtons() {
    // Bank X close button
    const bankCloseX = document.getElementById('bank-close-x');
    if (bankCloseX) {
        bankCloseX.addEventListener('click', () => {
            this.closeBank();
        });
    }
    
    // Shop X close button (handled by shop.js)
}

    // ==================== MINIMIZE/MAXIMIZE FUNCTIONALITY ====================

    toggleMinimize() {
        if (this.minimized) {
            this.restore();
        } else {
            this.minimize();
        }
    }

    minimize() {
        this.minimized = true;
        const uiPanel = document.querySelector('.ui-panel');
        const panelContent = document.querySelector('.panel-content');
        
        if (uiPanel) {
            uiPanel.classList.add('minimized');
        }
        
        if (panelContent) {
            panelContent.style.display = 'none';
        }
        
        console.log('UI Panel minimized');
    }

    restore() {
        this.minimized = false;
        const uiPanel = document.querySelector('.ui-panel');
        const panelContent = document.querySelector('.panel-content');
        
        if (uiPanel) {
            uiPanel.classList.remove('minimized');
        }
        
        if (panelContent) {
            panelContent.style.display = 'block';
        }
        
        // Refresh current panel content
        this.refreshCurrentPanel();
        
        console.log('UI Panel restored');
    }

    refreshCurrentPanel() {
        switch (this.currentPanel) {
            case 'inventory':
                this.updateInventory();
                break;
            case 'skills':
                this.updateSkillsList();
                break;
            case 'tasks':
                this.updateTasks();
                break;
        }
    }

    // ==================== PANEL MANAGEMENT ====================

    switchPanel(panelName) {
        // Update button states
        document.querySelectorAll('.panel-btn').forEach(btn => {
            if (btn.dataset.panel === panelName) {
                btn.classList.add('active');
            } else if (btn.dataset.panel !== 'bank' && btn.dataset.panel !== 'shop') {
                btn.classList.remove('active');
            }
        });
        
        // Update panel visibility
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanel = document.getElementById(`${panelName}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        this.currentPanel = panelName;
        
        // Update panel content
        switch (panelName) {
            case 'inventory':
                this.updateInventory();
                break;
            case 'skills':
                this.updateSkillsList();
                break;
            case 'tasks':
                this.updateTasks();
                break;
        }
    }

    // ==================== INVENTORY DISPLAY ====================

    updateInventory() {
        if (this.currentPanel !== 'inventory' || this.minimized) return;
        
        const inventoryGrid = document.getElementById('inventory-grid');
        if (!inventoryGrid) return;
        
        inventoryGrid.innerHTML = '';

        for (let i = 0; i < inventory.maxSlots; i++) {
            const slot = inventory.slots[i];
            if (slot) {
                const slotDiv = this.createItemSlot(slot.itemId, slot.quantity, 'inventory-slot');
                inventoryGrid.appendChild(slotDiv);
            } else {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'inventory-slot';
                inventoryGrid.appendChild(emptySlot);
            }
        }
    }

    // ==================== SKILLS DISPLAY ====================

    updateSkillsList() {
        if (this.currentPanel !== 'skills' || this.minimized) return;
        
        const skillsList = document.getElementById('skills-list');
        if (!skillsList) return;
        
        skillsList.innerHTML = '';

        const allSkills = skills.getAllSkills();
        
        // Define skill layout order
        const skillLayout = [
            // Column 1
            ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runecraft', 'construction'],
            // Column 2
            ['hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter'],
            // Column 3
            ['mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'sailing']
        ];

        // Create skills in column order
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 3; col++) {
                const skillId = skillLayout[col][row];
                if (!skillId || !allSkills[skillId]) continue;

                const skillDiv = this.createSkillElement(skillId, allSkills[skillId]);
                skillsList.appendChild(skillDiv);
            }
        }

        // Add total level and combat level
        const levelDiv = this.createLevelTotals(allSkills);
        skillsList.appendChild(levelDiv);
    }

    createSkillElement(skillId, skill) {
        const skillDiv = document.createElement('div');
        skillDiv.className = 'skill-item';
        
        skillDiv.addEventListener('click', () => {
            if (window.skillCustomizationUI) {
                skillCustomizationUI.open(skillId);
            }
        });
        skillDiv.style.cursor = 'pointer';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'skill-content';
        
        // Add skill icon
        const iconElement = this.createSkillIcon(skillId, skill);
        if (iconElement) {
            contentDiv.appendChild(iconElement);
        }
        
        // Create level display
        const levelDiv = document.createElement('div');
        levelDiv.className = 'skill-level';
        levelDiv.textContent = skill.level;
        contentDiv.appendChild(levelDiv);
        
        // Create progress bar
        const progressBar = this.createSkillProgressBar(skill);
        
        // Create tooltip
        const tooltip = this.createSkillTooltip(skill);
        
        skillDiv.appendChild(contentDiv);
        skillDiv.appendChild(progressBar);
        skillDiv.appendChild(tooltip);
        
        return skillDiv;
    }

    createSkillIcon(skillId, skill) {
        const preloadedIcon = loadingManager.getImage(`skill_${skillId}`);
        if (preloadedIcon) {
            const icon = document.createElement('img');
            icon.className = 'skill-icon';
            icon.src = preloadedIcon.src;
            return icon;
        } else {
            const textDiv = document.createElement('div');
            textDiv.style.fontSize = '12px';
            textDiv.style.fontWeight = 'bold';
            textDiv.style.width = '24px';
            textDiv.textContent = skill.name.substring(0, 3);
            return textDiv;
        }
    }

    createSkillProgressBar(skill) {
        const progressBar = document.createElement('div');
        progressBar.className = 'skill-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'skill-progress-fill';
        
        const xpPercent = skill.level < 99 ? 
            ((skill.xp - getXpForLevel(skill.level)) / 
            (getXpForLevel(skill.level + 1) - getXpForLevel(skill.level))) * 100 : 100;
        
        progressFill.style.width = `${xpPercent}%`;
        progressBar.appendChild(progressFill);
        
        return progressBar;
    }

    createSkillTooltip(skill) {
        const tooltip = document.createElement('div');
        tooltip.className = 'skill-tooltip';
        
        let tooltipContent = `${skill.name}<br>Level ${skill.level}<br>`;
        
        if (skill.level < 99) {
            const totalXp = Math.floor(skill.xp);
            const nextLevelXp = getXpForLevel(skill.level + 1);
            const xpToNext = nextLevelXp - totalXp;
            
            tooltipContent += `${formatNumber(totalXp)}/${formatNumber(nextLevelXp)} exp<br>`;
            tooltipContent += `${formatNumber(xpToNext)} exp to level ${skill.level + 1}`;
        } else {
            tooltipContent += `${formatNumber(Math.floor(skill.xp))} exp`;
        }
        
        tooltip.innerHTML = tooltipContent;
        return tooltip;
    }

    createLevelTotals(allSkills) {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'level-total';
        
        const totalLevelItem = this.createLevelItem(
            'skill_skills',
            skills.getTotalLevel(),
            '#f39c12',
            `Total Level: ${skills.getTotalLevel()}<br>Total Exp: ${formatNumber(this.calculateTotalExp(allSkills))}`
        );
        
        // Add click handler to open Skill Customization (global mode)
        totalLevelItem.addEventListener('click', () => {
            if (window.skillCustomizationUI) {
                skillCustomizationUI.openSkillCustomization();
            }
        });
        totalLevelItem.style.cursor = 'pointer';
        
        const combatLevelItem = this.createLevelItem(
            'skill_combat',
            skills.getCombatLevel(),
            '#e74c3c',
            `Combat Level: ${skills.getCombatLevel()}`
        );
        
        levelDiv.appendChild(totalLevelItem);
        levelDiv.appendChild(combatLevelItem);
        
        return levelDiv;
    }

    createLevelItem(iconKey, value, color, tooltipText) {
        const levelItem = document.createElement('div');
        levelItem.className = 'level-item';
        levelItem.style.position = 'relative';
        
        const icon = loadingManager.getImage(iconKey);
        if (icon) {
            const iconImg = document.createElement('img');
            iconImg.className = 'level-icon';
            iconImg.src = icon.src;
            levelItem.appendChild(iconImg);
        }
        
        const text = document.createElement('div');
        text.style.fontSize = '34px';
        text.style.fontWeight = 'bold';
        text.style.color = color;
        text.textContent = value;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'skill-tooltip';
        tooltip.style.textAlign = 'left';
        tooltip.innerHTML = tooltipText;
        
        levelItem.appendChild(text);
        levelItem.appendChild(tooltip);
        
        return levelItem;
    }

    calculateTotalExp(allSkills) {
        let totalExp = 0;
        for (const skill of Object.values(allSkills)) {
            totalExp += Math.floor(skill.xp);
        }
        return totalExp;
    }

    // ==================== TASKS DISPLAY ====================

    updateTasks() {
    if (this.currentPanel !== 'tasks' || this.minimized) return;
    
    const tasksList = document.getElementById('tasks-list');
    if (!tasksList || !window.taskManager) return;

    // Update all task progress first to ensure accuracy
    taskManager.updateAllProgress();
    
    tasksList.innerHTML = '';
    
    // Create sections for current, next, and regular tasks
    
    // Current Task Section
    if (taskManager.currentTask) {
        const currentSection = document.createElement('div');
        currentSection.className = 'task-section';
        
        const currentHeader = document.createElement('div');
        currentHeader.className = 'task-section-header';
        currentHeader.textContent = 'Current Task';
        
        const currentTaskDiv = this.createTaskElement(taskManager.currentTask, -1, true); // -1 means no reroll
        
        currentSection.appendChild(currentHeader);
        currentSection.appendChild(currentTaskDiv);
        tasksList.appendChild(currentSection);
    }
    
    // Next Task Section
    if (taskManager.nextTask) {
        const nextSection = document.createElement('div');
        nextSection.className = 'task-section';
        
        const nextHeader = document.createElement('div');
        nextHeader.className = 'task-section-header';
        nextHeader.textContent = 'Next Task';
        
        const nextTaskDiv = this.createTaskElement(taskManager.nextTask, -1, false); // No reroll, no progress
        
        nextSection.appendChild(nextHeader);
        nextSection.appendChild(nextTaskDiv);
        tasksList.appendChild(nextSection);
    }
    
    // Regular Tasks Section
    if (taskManager.tasks.length > 0) {
        const regularSection = document.createElement('div');
        regularSection.className = 'task-section';
        
        const regularHeader = document.createElement('div');
        regularHeader.className = 'task-section-header';
        regularHeader.textContent = 'Tasks';
        
        const regularTasksContainer = document.createElement('div');
        regularTasksContainer.className = 'regular-tasks-container';
        
        taskManager.tasks.forEach((taskSlot, index) => {
            const taskDiv = this.createSelectableTaskElement(taskSlot, index);
            regularTasksContainer.appendChild(taskDiv);
        });
        
        regularSection.appendChild(regularHeader);
        regularSection.appendChild(regularTasksContainer);
        tasksList.appendChild(regularSection);
    }
}

    createTaskElement(task, rerollIndex, showProgress) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        
        // Add skill-based class for styling
        taskDiv.classList.add(`task-skill-${task.skill}`);
        
        // Container for icon and content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        // Skill icon
const iconDiv = document.createElement('div');
iconDiv.className = 'task-icon';
// Add skill-colored border for current and next tasks
iconDiv.classList.add(`skill-border-${task.skill}`);

const skillIcon = loadingManager.getImage(`skill_${task.skill}`);
if (skillIcon) {
    const icon = document.createElement('img');
    icon.src = skillIcon.src;
    iconDiv.appendChild(icon);
} else {
    // Fallback text
    iconDiv.textContent = task.skill.substring(0, 3).toUpperCase();
}

// Add task quantity badge
const quantityBadge = document.createElement('div');
quantityBadge.className = 'task-quantity-badge';
quantityBadge.textContent = task.targetCount;
iconDiv.appendChild(quantityBadge);
        
        // Task details container
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'task-details';
        
        // Header with description and optional reroll button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'task-header';
        
        const descDiv = document.createElement('div');
        descDiv.className = 'task-description';
        descDiv.textContent = task.description;
        
        headerDiv.appendChild(descDiv);
        
        // Add reroll button only for regular tasks
        if (rerollIndex >= 0) {
            const rerollBtn = document.createElement('button');
            rerollBtn.className = 'task-reroll';
            rerollBtn.textContent = '↻';
            rerollBtn.title = 'Reroll task';
            rerollBtn.addEventListener('click', () => {
                if (window.taskManager) {
                    taskManager.rerollTask(rerollIndex);
                }
            });
            headerDiv.appendChild(rerollBtn);
        }
        
        detailsDiv.appendChild(headerDiv);
        
        // Progress section (only for current task)
        if (showProgress) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'task-progress';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'task-progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = `task-progress-fill skill-${task.skill}`;
            progressFill.style.width = `${task.progress * 100}%`;
            
            progressBar.appendChild(progressFill);
            
            const countDiv = document.createElement('div');
            countDiv.className = 'task-count';
            
            // All tasks now properly track their own progress
            const current = Math.floor(task.progress * task.targetCount);
            countDiv.textContent = `${current}/${task.targetCount}`;
            
            progressDiv.appendChild(progressBar);
            progressDiv.appendChild(countDiv);
            detailsDiv.appendChild(progressDiv);
        }
        
        // Assemble the task element
        taskContent.appendChild(iconDiv);
        taskContent.appendChild(detailsDiv);
        taskDiv.appendChild(taskContent);
        
        // Mark complete tasks
        if (task.progress >= 1) {
            taskDiv.classList.add('task-complete');
        }
        
        return taskDiv;
    }

createSelectableTaskElement(taskSlot, slotIndex) {
    const selectedTask = taskSlot.options[taskSlot.selectedIndex || 0];
    
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item selectable-task';
    
    // Add skill-based class for styling
    taskDiv.classList.add(`task-skill-${selectedTask.skill}`);
    
    // Container for icon and content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Icon container that will expand on hover
    const iconContainer = document.createElement('div');
    iconContainer.className = 'task-icon-container';
    
    // Create all 3 skill icons
    const iconsWrapper = document.createElement('div');
    iconsWrapper.className = 'task-icons-wrapper';
    
    // Reorder options so selected is always last (rightmost)
    const reorderedOptions = [];
    const selectedIndex = taskSlot.selectedIndex || 0;
    
    // Add non-selected options first
    taskSlot.options.forEach((task, idx) => {
        if (idx !== selectedIndex) {
            reorderedOptions.push({ task, originalIndex: idx });
        }
    });
    
    // Add selected option last
    reorderedOptions.push({ 
        task: taskSlot.options[selectedIndex], 
        originalIndex: selectedIndex 
    });
    
    // Create icons in reordered sequence
reorderedOptions.forEach((option, displayIndex) => {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'task-icon-option';
    
    // Mark if this is the selected one (will be last/rightmost)
    if (option.originalIndex === selectedIndex) {
        iconDiv.classList.add('selected');
        iconDiv.classList.add(`skill-border-${option.task.skill}`);
    }
    
    const skillIcon = loadingManager.getImage(`skill_${option.task.skill}`);
    if (skillIcon) {
        const icon = document.createElement('img');
        icon.src = skillIcon.src;
        iconDiv.appendChild(icon);
    } else {
        // Fallback text
        iconDiv.textContent = option.task.skill.substring(0, 3).toUpperCase();
    }
    
    // Add task quantity display
    const quantityDiv = document.createElement('div');
    quantityDiv.className = 'task-quantity-badge';
    quantityDiv.textContent = option.task.targetCount;
    iconDiv.appendChild(quantityDiv);
        
        // Add hover handler to preview task
        iconDiv.addEventListener('mouseenter', () => {
            // Update the task details preview
            const descDiv = taskDiv.querySelector('.task-description');
            if (descDiv) {
                descDiv.textContent = option.task.description;
            }
        });
        
        // Add click handler to select task
        iconDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.taskManager) {
                taskManager.selectTaskOption(slotIndex, option.originalIndex);
            }
        });
        
        iconsWrapper.appendChild(iconDiv);
    });
    
    // Add mouse leave handler to restore selected task description
    iconsWrapper.addEventListener('mouseleave', () => {
        const descDiv = taskDiv.querySelector('.task-description');
        if (descDiv) {
            descDiv.textContent = selectedTask.description;
        }
    });
    
    iconContainer.appendChild(iconsWrapper);
    
    // Task details container
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'task-details';
    
    // Header with description and reroll button
    const headerDiv = document.createElement('div');
    headerDiv.className = 'task-header';
    
    const descDiv = document.createElement('div');
    descDiv.className = 'task-description';
    descDiv.textContent = selectedTask.description;
    
    headerDiv.appendChild(descDiv);
    
    // Add reroll button
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'task-reroll';
    rerollBtn.textContent = '↻';
    rerollBtn.title = 'Reroll task';
    rerollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.taskManager) {
            taskManager.rerollTask(slotIndex);
        }
    });
    headerDiv.appendChild(rerollBtn);
    
    detailsDiv.appendChild(headerDiv);
    
    // Assemble the task element
    taskContent.appendChild(iconContainer);
    taskContent.appendChild(detailsDiv);
    taskDiv.appendChild(taskContent);
    
    // Mark complete tasks
    if (selectedTask.progress >= 1) {
        taskDiv.classList.add('task-complete');
    }
    
    return taskDiv;
}

    // ==================== BANK DISPLAY ====================

    openBank() {
        this.bankOpen = true;
        const modal = document.getElementById('bank-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateBank();
        }
    }

    closeBank() {
        this.bankOpen = false;
        const modal = document.getElementById('bank-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateBank() {
        if (!this.bankOpen) return;
        
        const bankGrid = document.getElementById('bank-grid');
        if (!bankGrid) return;
        
        bankGrid.innerHTML = '';

        const bankItems = bank.getAllItems();
        
        // Sort bank items according to items.json order
        const sortedItems = Object.entries(bankItems).sort((a, b) => {
            const indexA = this.itemOrderMap[a[0]] ?? Number.MAX_VALUE;
            const indexB = this.itemOrderMap[b[0]] ?? Number.MAX_VALUE;
            return indexA - indexB;
        });

        for (const [itemId, quantity] of sortedItems) {
            const slotDiv = this.createItemSlot(itemId, quantity, 'bank-slot');
            bankGrid.appendChild(slotDiv);
        }
    }

    // ==================== SHOP DISPLAY ====================

    openShop() {
        if (window.shop) {
            shop.open();
        }
    }

    closeShop() {
        if (window.shop) {
            shop.close();
        }
    }

    // ==================== ITEM DISPLAY HELPERS ====================

    createItemSlot(itemId, quantity, slotClass) {
        const slotDiv = document.createElement('div');
        slotDiv.className = slotClass;
        
        const itemData = loadingManager.getData('items')[itemId];
        
        const imgElement = this.createItemImage(itemId, quantity);

// Check if it's an img element or a container div
if (imgElement.tagName === 'IMG') {
    imgElement.onerror = function() {
        this.style.display = 'none';
        const textDiv = document.createElement('div');
        textDiv.style.fontSize = '12px';
        textDiv.textContent = itemData.name.substring(0, 3);
        slotDiv.appendChild(textDiv);
    };
}
// If it's a div container (bank note), error handling is already set up inside createItemImage

slotDiv.appendChild(imgElement);
        
        // Only show count if quantity is greater than 1
        if (quantity > 1) {
            const countDiv = this.createItemCount(itemId, quantity);
            slotDiv.appendChild(countDiv);
        }
        
        slotDiv.title = `${itemData.name} x${formatNumber(quantity)}`;
        
        return slotDiv;
    }

    createItemImage(itemId, quantity) {
    const itemData = loadingManager.getData('items')[itemId];
    
    // Check if this is a bank note
    if (itemData && itemData.category === 'note' && itemData.convertsTo) {
        // Create a container for the bank note
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        
        // Bank note background
        const noteImg = document.createElement('img');
        noteImg.src = 'assets/items/bank_note.png';
        noteImg.style.position = 'absolute';
        noteImg.style.width = '100%';
        noteImg.style.height = '100%';
        noteImg.style.objectFit = 'contain';
        noteImg.style.zIndex = '1';
        
        // Item image on top of the note
        const itemImg = document.createElement('img');
        itemImg.src = `assets/items/${itemData.convertsTo}.png`;
        itemImg.style.position = 'relative';
        itemImg.style.width = '60%';  // Smaller to fit within the note
        itemImg.style.height = '60%';
        itemImg.style.objectFit = 'contain';
        itemImg.style.zIndex = '2';
        
        // Handle image load errors for bank note
        noteImg.onerror = function() {
            // If bank note image fails, just show the item
            container.innerHTML = '';
            const fallbackImg = document.createElement('img');
            fallbackImg.src = `assets/items/${itemData.convertsTo}.png`;
            fallbackImg.style.width = '100%';
            fallbackImg.style.height = '100%';
            fallbackImg.style.objectFit = 'contain';
            container.appendChild(fallbackImg);
        };
        
        // Handle image load errors for item
        itemImg.onerror = function() {
            this.style.display = 'none';
            const textDiv = document.createElement('div');
            textDiv.style.fontSize = '10px';
            textDiv.style.position = 'relative';
            textDiv.style.zIndex = '2';
            const convertedItemData = loadingManager.getData('items')[itemData.convertsTo];
            textDiv.textContent = convertedItemData ? convertedItemData.name.substring(0, 3) : '?';
            container.appendChild(textDiv);
        };
        
        container.appendChild(noteImg);
        container.appendChild(itemImg);
        
        return container;
    }
    
    // Regular item handling
    const img = document.createElement('img');
    
    if (itemId === 'coins') {
        const coinImage = this.getCoinImage(quantity);
        img.src = `assets/items/${coinImage}.png`;
    } else {
        img.src = `assets/items/${itemId}.png`;
    }
    
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    return img;
}

    createItemCount(itemId, quantity) {
        const countDiv = document.createElement('div');
        countDiv.className = 'item-count';
        
        // Use the new universal formatting for all items
        const formatted = this.formatItemCount(quantity);
        countDiv.textContent = formatted.text;
        countDiv.style.color = formatted.color;
        
        return countDiv;
    }

    getCoinImage(quantity) {
        if (quantity >= 10000) return 'coins_10000';
        if (quantity >= 1000) return 'coins_1000';
        if (quantity >= 250) return 'coins_250';
        if (quantity >= 100) return 'coins_100';
        if (quantity >= 25) return 'coins_25';
        if (quantity >= 5) return 'coins_5';
        if (quantity >= 4) return 'coins_4';
        if (quantity >= 3) return 'coins_3';
        if (quantity >= 2) return 'coins_2';
        return 'coins_1';
    }

    formatItemCount(quantity) {
        // 10M or more - green color
        if (quantity >= 10000000) {
            const millions = Math.floor(quantity / 1000000);
            return { 
                text: `${millions}M`, 
                color: '#2ecc71'  // Green
            };
        }
        
        // 100K to 9,999,999 - white color
        if (quantity >= 100000) {
            const thousands = Math.floor(quantity / 1000);
            return { 
                text: `${thousands}K`, 
                color: '#ffffff'  // White
            };
        }
        
        // Below 100K - gold color with commas
        return { 
            text: formatNumber(quantity),  // Uses existing comma formatting
            color: '#FFD700'  // Gold
        };
    }
}

class UIManager {
    constructor() {
        this.currentPanel = 'inventory';
        this.bankOpen = false;
        this.itemOrder = null;
        this.itemOrderMap = {};
        this.minimized = false; // Track minimized state

        // Pet notification properties
        this.petNotificationContainer = null;
        this.activePets = [];
        
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

        // Initialize equipment system
        this.initializeEquipment();

        // Initialize pet notification container
        this.initializePetNotifications();
        
        // Initial updates
        this.updateInventory();
        this.updateSkillsList();
        this.updateTasks();
        this.updateFloatingCurrentTask();
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
        
        btn.addEventListener('click', (e) => {
            const panel = btn.dataset.panel;

            if (panel === 'hiscores') {
                if (window.hiScoresManager) {
                    hiScoresManager.open();
                }
                return;
            }
            
            // Check if clicking the already active panel (to minimize/maximize)
            if (btn.classList.contains('active') && panel !== 'bank') {
                this.toggleMinimize();
                return;
            }
            
            // Handle bank button (special case - opens modal)
            if (panel === 'bank') {
                this.openBank();
                return;
            }
            
            // For all regular panels (skills, tasks, shop, inventory), restore if minimized then switch
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
        
        // Casket X close button
        const casketCloseX = document.getElementById('casket-close-x');
        if (casketCloseX) {
            casketCloseX.addEventListener('click', () => {
                this.closeCasketRewards();
            });
        }
        
        // Shop X close button (handled by shop.js)
    }
    
    closeCasketRewards() {
        const modal = document.getElementById('casket-rewards-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Update bank display to show new items
        this.updateBank();
    }

// ==================== PET NOTIFICATION METHODS ====================

initializePetNotifications() {
    // Create container if it doesn't exist
    this.petNotificationContainer = document.getElementById('floating-pet-notifications');
    if (!this.petNotificationContainer) {
        this.petNotificationContainer = document.createElement('div');
        this.petNotificationContainer.id = 'floating-pet-notifications';
        this.petNotificationContainer.className = 'floating-pet-notifications';
        
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.petNotificationContainer);
        }
    }
}

showPetNotification(skillId, petType) {
    // Create pet notification element
    const petDiv = document.createElement('div');
    petDiv.className = 'floating-pet-item';
    petDiv.classList.add(petType === 'shiny' ? 'pet-shiny' : 'pet-regular');
    
    // Add click handler to open skill customization
    petDiv.addEventListener('click', () => {
        // Dismiss this notification
        this.dismissPet(petDiv, skillId);
        
        // Open skill customization for this skill
        if (window.skillCustomizationUI) {
            skillCustomizationUI.open(skillId);
        }
    });
    
    // Create pet image
    const img = document.createElement('img');
    img.src = `assets/pets/${skillId}_pet${petType === 'shiny' ? '(s)' : ''}.png`;
    img.alt = `${skillId} pet`;
    petDiv.appendChild(img);
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'floating-pet-tooltip';
    
    const skillsData = loadingManager.getData('skills');
    const skillName = skillsData[skillId] ? skillsData[skillId].name : skillId;
    const petName = petType === 'shiny' ? `Shiny ${skillName} Pet` : `${skillName} Pet`;
    
    tooltip.innerHTML = `
        <div class="floating-pet-tooltip-title">${petName} Obtained!</div>
        <div>Click to view in Skill Customization</div>
    `;
    
    petDiv.appendChild(tooltip);
    
    // Add to container
    this.petNotificationContainer.appendChild(petDiv);
    
    // Track active pet
    this.activePets.push({ element: petDiv, skillId, petType });
}

dismissPet(petElement, skillId) {
    // Remove from DOM with fade animation
    petElement.style.opacity = '0';
    setTimeout(() => {
        if (petElement.parentNode) {
            petElement.parentNode.removeChild(petElement);
        }
    }, 300);
    
    // Remove from tracking
    this.activePets = this.activePets.filter(p => p.element !== petElement);
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
    
    // Remove active state from current panel button
    document.querySelectorAll('.panel-btn').forEach(btn => {
        if (btn.dataset.panel === this.currentPanel) {
            btn.classList.remove('active');
        }
    });
    
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
    this.updateFloatingCurrentTask();
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
        case 'shop':
            this.updateShop();
            break;
    }
}

    // ==================== PANEL MANAGEMENT ====================

    switchPanel(panelName) {
        // Update button states
        // Close shop if switching away from it
        if (this.currentPanel === 'shop' && panelName !== 'shop' && window.shop) {
            shop.isOpen = false;
        }
        
        document.querySelectorAll('.panel-btn').forEach(btn => {
            if (btn.dataset.panel === panelName) {
                btn.classList.add('active');
            } else if (btn.dataset.panel !== 'bank') {
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
        
        // Update panel content - check if needs full update
        switch (panelName) {
            case 'inventory':
                // Always do full update when switching to panel
                this.updateInventory();
                this.inventoryNeedsFullUpdate = false;
                break;
            case 'skills':
                this.updateSkillsList();
                break;
            case 'tasks':
                this.updateTasks();
                break;
            case 'shop':
                if (window.shop) {
                    shop.isOpen = true;
                }
                this.updateShop();
                break;
            case 'equipment':
                this.updateEquipment();
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

    // Create special clue slot for bank
createClueSlot(itemId, quantity) {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'bank-slot clue-slot';
    
    const itemData = loadingManager.getData('items')[itemId];
    
    // Check if it's a clue
    if (itemData.category === 'clue') {
        // Extract tier from itemId (e.g., "easy_clue" -> "easy")
        const tier = itemId.replace('_clue', '');
        const clueData = window.clueManager ? clueManager.getClueData(tier) : null;
        
        if (clueData) {
            // Check if complete
            const isComplete = clueManager.isClueComplete(tier);
            if (isComplete) {
                slotDiv.classList.add('clue-complete');
                
                // Add click handler to convert to casket
                slotDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.clueManager) {
                        clueManager.convertToCasket(tier);
                    }
                });
                slotDiv.style.cursor = 'pointer';
            }
            
            // Add right-click handler for destroy option
            slotDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Create context menu
                const existingMenu = document.querySelector('.context-menu');
                if (existingMenu) existingMenu.remove();
                
                const menu = document.createElement('div');
                menu.className = 'context-menu';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
                
                const destroyOption = document.createElement('div');
                destroyOption.className = 'context-menu-item';
                destroyOption.textContent = 'Destroy Clue';
                destroyOption.addEventListener('click', () => {
                    if (confirm(`Are you sure you want to destroy this ${tier} clue?`)) {
                        if (window.clueManager) {
                            clueManager.destroyClue(tier);
                        }
                    }
                    menu.remove();
                });
                
                menu.appendChild(destroyOption);
                document.body.appendChild(menu);
                
                // Remove menu when clicking elsewhere
                const removeMenu = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', removeMenu);
                    }
                };
                setTimeout(() => document.addEventListener('click', removeMenu), 0);
            });
            
            // Create the item image
            const img = document.createElement('img');
            img.src = `assets/items/${itemId}.png`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            slotDiv.appendChild(img);
            
            // Add step completion overlay
            const overlay = this.createClueStepOverlay(clueData);
            slotDiv.appendChild(overlay);
            
            // Create custom tooltip
            const tooltip = this.createClueTooltip(tier, clueData, isComplete);
            slotDiv.appendChild(tooltip);
        } else {
            // No clue data, show normal item
            const imgElement = this.createItemImage(itemId, quantity);
            slotDiv.appendChild(imgElement);
            slotDiv.title = `${itemData.name} x${formatNumber(quantity)}`;
        }
    } else if (itemData.category === 'casket') {
        // Handle casket display
        slotDiv.classList.add('casket-slot');
        
        const imgElement = this.createItemImage(itemId, quantity);
        slotDiv.appendChild(imgElement);
        
        // Add quantity display for stackable caskets
        if (quantity > 1) {
            const countDiv = this.createItemCount(itemId, quantity);
            slotDiv.appendChild(countDiv);
        }
        
        slotDiv.title = `${itemData.name} x${formatNumber(quantity)}`;
        
        // Add click handler to open casket
        slotDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            const tier = itemId.replace('_casket', '');
            if (window.clueManager) {
                clueManager.openCasket(tier);
            }
        });
        slotDiv.style.cursor = 'pointer';
    } else {
        // Regular item
        const imgElement = this.createItemImage(itemId, quantity);
        slotDiv.appendChild(imgElement);
        
        if (quantity > 1) {
            const countDiv = this.createItemCount(itemId, quantity);
            slotDiv.appendChild(countDiv);
        }
        
        slotDiv.title = `${itemData.name} x${formatNumber(quantity)}`;
    }
    
    return slotDiv;
}

    // Create step overlay for clue scrolls
createClueStepOverlay(clueData) {
    const overlay = document.createElement('div');
    overlay.className = 'clue-step-overlay';
    
    clueData.completed.forEach((isComplete, index) => {
        const stepIndicator = document.createElement('div');
        stepIndicator.className = 'clue-step-indicator';
        
        if (isComplete) {
            stepIndicator.innerHTML = '✓';
            stepIndicator.classList.add('step-indicator-complete');
        } else {
            stepIndicator.innerHTML = '✗';
            stepIndicator.classList.add('step-indicator-incomplete');
        }
        
        overlay.appendChild(stepIndicator);
    });
    
    return overlay;
}
    
// Create tooltip for clue scrolls
createClueTooltip(tier, clueData, isComplete) {
    const tooltip = document.createElement('div');
    tooltip.className = 'clue-tooltip';
    
    const config = window.clueManager ? clueManager.CLUE_CONFIG[tier] : null;
    const titleText = config ? config.itemName : `${tier} clue`;
    
    let content = `<div class="clue-tooltip-title">${titleText}</div>`;
    
    if (isComplete) {
        content += '<div class="clue-complete-text">✓ Complete! Click to receive casket</div>';
    }
    
    content += '<div class="clue-steps-header">Node Steps:</div>';
    content += '<div class="clue-steps-list">';
    
    for (let i = 0; i < clueData.steps.length; i++) {
        const nodeId = clueData.steps[i];
        const node = window.nodes ? nodes.getNode(nodeId) : null;
        const nodeName = node ? node.name : nodeId;
        const completed = clueData.completed[i];
        
        const icon = completed ? 
            '<span class="step-complete">✓</span>' : 
            '<span class="step-incomplete">✗</span>';
            
        content += `<div class="clue-step">${icon} ${nodeName}</div>`;
    }
    
    content += '</div>';
    tooltip.innerHTML = content;
    
    return tooltip;
}

    // ==================== TARGETED INVENTORY UPDATES ====================
    
    updateInventorySlots(slotIndices) {
        // Only update if inventory panel is visible
        if (this.currentPanel !== 'inventory' || this.minimized) {
            // Still need to update the full inventory if we switch to it later
            this.inventoryNeedsFullUpdate = true;
            return;
        }
        
        const inventoryGrid = document.getElementById('inventory-grid');
        if (!inventoryGrid) return;
        
        // Update only the changed slots
        for (const slotIndex of slotIndices) {
            const slot = inventory.slots[slotIndex];
            const slotElement = inventoryGrid.children[slotIndex];
            
            if (!slotElement) continue;
            
            // Create new slot content
            const newSlot = slot ? 
                this.createItemSlot(slot.itemId, slot.quantity, 'inventory-slot') :
                document.createElement('div');
                
            if (!slot) {
                newSlot.className = 'inventory-slot';
            }
            
            // Replace the old slot element
            inventoryGrid.replaceChild(newSlot, slotElement);
        }
    }

    updateBankSlots(itemsChanged) {
        // Only update if bank is open
        if (!this.bankOpen) {
            this.bankNeedsFullUpdate = true;
            return;
        }
        
        // For bank, we need to rebuild since items can be added/removed dynamically
        // But we can optimize this later with a more complex slot mapping system
        this.updateBank();
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

    // ==================== TARGETED UI UPDATES ====================
    
    // Update a single skill's UI element
    updateSingleSkillUI(skillId) {
        // Only update if skills panel is visible
        if (this.currentPanel !== 'skills' || this.minimized) return;
        
        const skillsList = document.getElementById('skills-list');
        if (!skillsList) return;
        
        // Find the skill element
        const skillElements = skillsList.querySelectorAll('.skill-item');
        let skillElement = null;
        let elementIndex = -1;
        
        // Skills are in a specific layout order, need to find the right one
        const skillLayout = [
            ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runecraft', 'construction'],
            ['hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter'],
            ['mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'sailing']
        ];
        
        // Calculate which element index this skill should be at
        let targetIndex = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 3; col++) {
                if (skillLayout[col][row] === skillId) {
                    elementIndex = targetIndex;
                    break;
                }
                targetIndex++;
            }
            if (elementIndex !== -1) break;
        }
        
        if (elementIndex !== -1 && skillElements[elementIndex]) {
            skillElement = skillElements[elementIndex];
        }
        
        if (!skillElement) return;
        
        // Get the skill data
        const skill = skills.getAllSkills()[skillId];
        if (!skill) return;
        
        // Update level display
        const levelDiv = skillElement.querySelector('.skill-level');
        if (levelDiv) {
            levelDiv.textContent = skill.level;
        }
        
        // Update progress bar
        const progressFill = skillElement.querySelector('.skill-progress-fill');
        if (progressFill) {
            const xpPercent = skill.level < 99 ? 
                ((skill.xp - getXpForLevel(skill.level)) / 
                (getXpForLevel(skill.level + 1) - getXpForLevel(skill.level))) * 100 : 100;
            progressFill.style.width = `${xpPercent}%`;
        }
        
        // Update tooltip
        const tooltip = skillElement.querySelector('.skill-tooltip');
        if (tooltip) {
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
        }
    }
    
// Update only task progress bars (not full task rebuild)
    updateTaskProgressBarsOnly() {
        // Update floating task progress bars
        this.updateFloatingTaskProgressBars();
        
        // Update panel task progress bars if visible
        this.updatePanelTaskProgressBars();
    }
    
    // New helper: Update floating task progress bars
    updateFloatingTaskProgressBars() {
        const floatingContainer = document.getElementById('floating-current-task');
        if (!floatingContainer || !window.taskManager || !taskManager.currentTask) return;
        
        // Update TASK progress bar
        const taskBar = floatingContainer.querySelector('.task-progress-bar');
        if (taskBar) {
            const taskFill = taskBar.querySelector('.task-progress-fill');
            const taskText = taskBar.querySelector('.progress-bar-text');
            
            if (taskFill) {
                taskFill.style.width = `${taskManager.currentTask.progress * 100}%`;
            }
            
            if (taskText) {
                const current = Math.floor(taskManager.currentTask.progress * taskManager.currentTask.targetCount);
                const percentage = (taskManager.currentTask.progress * 100).toFixed(2);
                
                taskText.innerHTML = `
                    <span class="progress-text-left">${current}</span>
                    <span class="progress-text-center">${percentage}%</span>
                    <span class="progress-text-right">${taskManager.currentTask.targetCount}</span>
                `;
            }
        }
        
        // Update LEVEL progress bar
        this.updateFloatingTaskLevelProgress();
    }
    
    // New helper: Update panel task progress bars  
    updatePanelTaskProgressBars() {
        if (this.currentPanel !== 'tasks' || this.minimized) return;
        
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList || !window.taskManager || !taskManager.currentTask) return;
        
        // Find current task element
        const currentTaskSection = tasksList.querySelector('.task-section');
        if (currentTaskSection) {
            const progressFill = currentTaskSection.querySelector('.task-progress-fill');
            const progressText = currentTaskSection.querySelector('.progress-bar-text');
            
            if (progressFill) {
                progressFill.style.width = `${taskManager.currentTask.progress * 100}%`;
            }
            
            if (progressText) {
                const current = Math.floor(taskManager.currentTask.progress * taskManager.currentTask.targetCount);
                const percentage = (taskManager.currentTask.progress * 100).toFixed(2);
                
                progressText.innerHTML = `
                    <span class="progress-text-left">${current}</span>
                    <span class="progress-text-center">${percentage}%</span>
                    <span class="progress-text-right">${taskManager.currentTask.targetCount}</span>
                `;
            }
        }
    }
    
    // Update floating task's level progress bar only
    updateFloatingTaskLevelProgress() {
        const floatingContainer = document.getElementById('floating-current-task');
        if (!floatingContainer || !window.taskManager || !taskManager.currentTask) return;
        
        // Find the level progress bar in floating task
        const levelBar = floatingContainer.querySelector('.level-progress-bar');
        if (!levelBar) return;
        
        const allSkills = skills.getAllSkills();
        const skillData = allSkills[taskManager.currentTask.skill];
        if (!skillData) return;
        
        // Calculate level progress
        const currentLevel = skillData.level;
        let levelProgress = 0;
        let leftLabel = '';
        let rightLabel = '';
        
        if (currentLevel < 99) {
            const nextLevel = currentLevel + 1;
            const currentLevelXp = getXpForLevel(currentLevel);
            const nextLevelXp = getXpForLevel(nextLevel);
            const xpIntoLevel = skillData.xp - currentLevelXp;
            const xpNeeded = nextLevelXp - currentLevelXp;
            levelProgress = (xpIntoLevel / xpNeeded) * 100;
            leftLabel = `Lv ${currentLevel}`;
            rightLabel = `Lv ${nextLevel}`;
        } else if (skillData.xp < 50000000) {
            const level99Xp = 13034431;
            const targetXp = 50000000;
            const xpProgress = skillData.xp - level99Xp;
            const xpNeeded = targetXp - level99Xp;
            levelProgress = (xpProgress / xpNeeded) * 100;
            leftLabel = 'Lv 99';
            rightLabel = '50M';
        } else {
            const startXp = 50000000;
            const targetXp = 200000000;
            const xpProgress = skillData.xp - startXp;
            const xpNeeded = targetXp - startXp;
            levelProgress = Math.min((xpProgress / xpNeeded) * 100, 100);
            leftLabel = '50M';
            rightLabel = '200M';
        }
        
        // Update the fill
        const levelFill = levelBar.querySelector('.level-progress-fill');
        if (levelFill) {
            levelFill.style.width = `${levelProgress}%`;
        }
        
        // Update the text
        const levelText = levelBar.querySelector('.progress-bar-text');
        if (levelText) {
            const levelPercentage = levelProgress.toFixed(2);
            levelText.innerHTML = `
                <span class="progress-text-left">${leftLabel}</span>
                <span class="progress-text-center">${levelPercentage}%</span>
                <span class="progress-text-right">${rightLabel}</span>
            `;
        }
    }

    // Update total level display and tooltip
    updateTotalLevelDisplay() {
        // Only update if skills panel is visible
        if (this.currentPanel !== 'skills' || this.minimized) return;
        
        const skillsList = document.getElementById('skills-list');
        if (!skillsList) return;
        
        // Find the level-total container (it's the last child)
        const levelTotalDiv = skillsList.querySelector('.level-total');
        if (!levelTotalDiv) return;
        
        // Update total level
        const totalLevelItem = levelTotalDiv.children[0]; // First child is total level
        if (totalLevelItem) {
            const totalLevelText = totalLevelItem.querySelector('div[style*="font-size: 34px"]');
            if (totalLevelText) {
                totalLevelText.textContent = skills.getTotalLevel();
            }
            
            // Update tooltip with new total exp
            const tooltip = totalLevelItem.querySelector('.skill-tooltip');
            if (tooltip) {
                const allSkills = skills.getAllSkills();
                const totalExp = this.calculateTotalExp(allSkills);
                tooltip.innerHTML = `Total Level: ${skills.getTotalLevel()}<br>Total Exp: ${formatNumber(totalExp)}`;
            }
        }
    }
    
    // Update combat level display
    updateCombatLevelDisplay() {
        // Only update if skills panel is visible
        if (this.currentPanel !== 'skills' || this.minimized) return;
        
        const skillsList = document.getElementById('skills-list');
        if (!skillsList) return;
        
        // Find the level-total container
        const levelTotalDiv = skillsList.querySelector('.level-total');
        if (!levelTotalDiv) return;
        
        // Update combat level (second child)
        const combatLevelItem = levelTotalDiv.children[1]; // Second child is combat level
        if (combatLevelItem) {
            const combatLevelText = combatLevelItem.querySelector('div[style*="font-size: 34px"]');
            if (combatLevelText) {
                combatLevelText.textContent = skills.getCombatLevel();
            }
            
            // Update tooltip
            const tooltip = combatLevelItem.querySelector('.skill-tooltip');
            if (tooltip) {
                tooltip.innerHTML = `Combat Level: ${skills.getCombatLevel()}`;
            }
        }
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
        // Update floating current task display (always)
        this.updateFloatingCurrentTask();
        
        // Update task panel (only if visible)
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

    updateFloatingCurrentTask() {
        const floatingContainer = document.getElementById('floating-current-task');
        
        if (!floatingContainer || !window.taskManager) return;
        
        // Update task progress
        if (taskManager.currentTask && taskManager.currentTask.progress < 1) {
            taskManager.updateAllProgress();
        }
        
        // Clear container directly (no inner content div)
        floatingContainer.innerHTML = '';
        
        if (taskManager.currentTask) {
            // Show the container
            floatingContainer.style.display = 'block';
            
            // Create task element (reusing the same method for consistency)
            const taskDiv = this.createTaskElement(taskManager.currentTask, -1, true, true);
            
            // Add task directly to floating container (no header, no wrapper)
            floatingContainer.appendChild(taskDiv);
        } else {
            // Hide if no current task
            floatingContainer.style.display = 'none';
        }
    }

    createTaskElement(task, rerollIndex, showProgress, isFloating = false) {
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

// Add task quantity badge (but not for floating display)
if (!isFloating) {
    const quantityBadge = document.createElement('div');
    quantityBadge.className = 'task-quantity-badge';
    quantityBadge.textContent = task.targetCount;
    iconDiv.appendChild(quantityBadge);
}

// Add clue indicator if this task's node OR its bank is in any active clue
if (!isFloating && window.clueManager) {
    // Check both the task node and its nearest bank
    let matchingClues = new Set();
    
    // Check the task node itself
    const taskNodeClues = clueManager.getCluesContainingNode(task.nodeId);
    taskNodeClues.forEach(tier => matchingClues.add(tier));
    
    // Check the task node's nearest bank
    const taskNode = window.nodes ? nodes.getNode(task.nodeId) : null;
    if (taskNode && taskNode.nearestBank) {
        const bankClues = clueManager.getCluesContainingNode(taskNode.nearestBank);
        bankClues.forEach(tier => matchingClues.add(tier));
    }
    
    // If we found any matching clues, show the indicator
    if (matchingClues.size > 0) {
        // Show the first matching clue
        const clueTier = Array.from(matchingClues)[0];
        const clueIndicator = document.createElement('div');
        clueIndicator.className = 'task-clue-indicator';
        
        const clueImg = document.createElement('img');
        clueImg.src = `assets/items/${clueTier}_clue.png`;
        clueImg.alt = `${clueTier} clue`;
        clueIndicator.appendChild(clueImg);
        
        iconDiv.appendChild(clueIndicator);
    }
}
        
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
            
            // Check if enough RuneCred
            const hasEnoughCred = window.runeCreditManager && runeCreditManager.runeCred >= 5;
            if (!hasEnoughCred) {
                rerollBtn.classList.add('disabled');
                rerollBtn.disabled = true;
            }
            
            // Create tooltip for reroll button
            const rerollTooltip = document.createElement('div');
            rerollTooltip.className = 'reroll-tooltip';
            const currentRuneCred = window.runeCreditManager ? runeCreditManager.runeCred : 0;
            rerollTooltip.innerHTML = `
                <div class="reroll-tooltip-header">Reroll All Options</div>
                <div class="reroll-tooltip-cost">Cost: 5 Rune Cred</div>
                <div class="reroll-tooltip-balance ${hasEnoughCred ? '' : 'insufficient'}">
                    You have: ${currentRuneCred} Rune Cred
                </div>
            `;
            rerollBtn.appendChild(rerollTooltip);
            
            rerollBtn.addEventListener('click', () => {
                if (window.taskManager && hasEnoughCred) {
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
            
            // Task progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'task-progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = `task-progress-fill skill-${task.skill}`;
            progressFill.style.width = `${task.progress * 100}%`;
            
            progressBar.appendChild(progressFill);
            
            // Add text overlay for task progress
            const progressText = document.createElement('div');
            progressText.className = 'progress-bar-text';
            
            const current = Math.floor(task.progress * task.targetCount);
            const percentage = (task.progress * 100).toFixed(2);
            
            progressText.innerHTML = `
                <span class="progress-text-left">${current}</span>
                <span class="progress-text-center">${percentage}%</span>
                <span class="progress-text-right">${task.targetCount}</span>
            `;
            
            progressBar.appendChild(progressText);
            progressDiv.appendChild(progressBar);
            
            // Add level progress bar if we're in the floating display
            if (isFloating && window.skills) {
                const allSkills = skills.getAllSkills();
                const skillData = allSkills[task.skill];
                if (skillData) {
                    // Level progress bar
                    const levelBar = document.createElement('div');
                    levelBar.className = 'level-progress-bar';
                    
                    // Calculate level progress
                    const currentLevel = skillData.level;
                    let levelProgress = 0;
                    let leftLabel = '';
                    let rightLabel = '';
                    
                    if (currentLevel < 99) {
                        // Normal level progression
                        const nextLevel = currentLevel + 1;
                        const currentLevelXp = getXpForLevel(currentLevel);
                        const nextLevelXp = getXpForLevel(nextLevel);
                        const xpIntoLevel = skillData.xp - currentLevelXp;
                        const xpNeeded = nextLevelXp - currentLevelXp;
                        levelProgress = (xpIntoLevel / xpNeeded) * 100;
                        leftLabel = `Lv ${currentLevel}`;
                        rightLabel = `Lv ${nextLevel}`;
                    } else if (skillData.xp < 50000000) {
                        // Level 99 but under 50M - show progress to 50M
                        const level99Xp = 13034431; // XP at level 99
                        const targetXp = 50000000;
                        const xpProgress = skillData.xp - level99Xp;
                        const xpNeeded = targetXp - level99Xp;
                        levelProgress = (xpProgress / xpNeeded) * 100;
                        leftLabel = 'Lv 99';
                        rightLabel = '50M';
                    } else {
                        // 50M or above - show progress to 200M
                        const startXp = 50000000;
                        const targetXp = 200000000;
                        const xpProgress = skillData.xp - startXp;
                        const xpNeeded = targetXp - startXp;
                        levelProgress = Math.min((xpProgress / xpNeeded) * 100, 100);
                        leftLabel = '50M';
                        rightLabel = '200M';
                    }
                    
                    const levelFill = document.createElement('div');
                    levelFill.className = 'level-progress-fill';
                    levelFill.style.width = `${levelProgress}%`;
                    
                    levelBar.appendChild(levelFill);
                    
                    // Add text overlay for level progress
                    const levelText = document.createElement('div');
                    levelText.className = 'progress-bar-text';
                    
                    const levelPercentage = levelProgress.toFixed(2);
                    
                    levelText.innerHTML = `
                        <span class="progress-text-left">${leftLabel}</span>
                        <span class="progress-text-center">${levelPercentage}%</span>
                        <span class="progress-text-right">${rightLabel}</span>
                    `;
                    
                    levelBar.appendChild(levelText);
                    progressDiv.appendChild(levelBar);
                    
                }
            }
            
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
    
    // Create all 3 skill icons + reroll button
    const iconsWrapper = document.createElement('div');
    iconsWrapper.className = 'task-icons-wrapper';
    
    // NEW: Add reroll button as the FIRST element (leftmost when expanded)
    const rerollDiv = document.createElement('div');
    rerollDiv.className = 'task-icon-option reroll-option';
    rerollDiv.innerHTML = '↻';
    
    // Check if enough RuneCred
    const hasEnoughCred = window.runeCreditManager && runeCreditManager.runeCred >= 5;
    if (!hasEnoughCred) {
        rerollDiv.classList.add('disabled');
    }
    
    // Create tooltip for smart reroll
    const rerollTooltip = document.createElement('div');
    rerollTooltip.className = 'reroll-tooltip small-reroll-tooltip';
    const currentRuneCred = window.runeCreditManager ? runeCreditManager.runeCred : 0;
    rerollTooltip.innerHTML = `
        <div class="reroll-tooltip-header">Reroll Other Options</div>
        <div class="reroll-tooltip-cost">Cost: 5 Rune Cred</div>
        <div class="reroll-tooltip-balance ${hasEnoughCred ? '' : 'insufficient'}">
            You have: ${currentRuneCred} Rune Cred
        </div>
    `;
    rerollDiv.appendChild(rerollTooltip);
    
    // Add click handler for smart reroll (only reroll non-selected)
    rerollDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.taskManager && hasEnoughCred) {
            taskManager.rerollNonSelectedOptions(slotIndex);
        }
    });
    
    iconsWrapper.appendChild(rerollDiv);
    
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
        
        // Add skill class for hover styling (for ALL options, not just selected)
        iconDiv.classList.add(`task-skill-${option.task.skill}`);
        
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

// Add clue indicator if this task's node OR its bank is in any active clue
if (window.clueManager) {
    // Check both the task node and its nearest bank
    let matchingClues = new Set();
    
    // Check the task node itself
    const taskNodeClues = clueManager.getCluesContainingNode(option.task.nodeId);
    taskNodeClues.forEach(tier => matchingClues.add(tier));
    
    // Check the task node's nearest bank
    const taskNode = window.nodes ? nodes.getNode(option.task.nodeId) : null;
    if (taskNode && taskNode.nearestBank) {
        const bankClues = clueManager.getCluesContainingNode(taskNode.nearestBank);
        bankClues.forEach(tier => matchingClues.add(tier));
    }
    
    // If we found any matching clues, show the indicator
    if (matchingClues.size > 0) {
        // Show the first matching clue
        const clueTier = Array.from(matchingClues)[0];
        const clueIndicator = document.createElement('div');
        clueIndicator.className = 'task-clue-indicator';
        
        const clueImg = document.createElement('img');
        clueImg.src = `assets/items/${clueTier}_clue.png`;
        clueImg.alt = `${clueTier} clue`;
        clueIndicator.appendChild(clueImg);
        
        iconDiv.appendChild(clueIndicator);
    }
}
        
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
    
    // Header with description (NO REROLL BUTTON HERE ANYMORE)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'task-header';
    
    const descDiv = document.createElement('div');
    descDiv.className = 'task-description';
    descDiv.textContent = selectedTask.description;
    
    headerDiv.appendChild(descDiv);
    // NO REROLL BUTTON ADDED HERE
    
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
    
    // Update bank header with total value and clue counts
    this.updateBankHeader();
    
    bankGrid.innerHTML = '';

    const bankItems = bank.getAllItems();
    
    // Sort bank items according to items.json order
    const sortedItems = Object.entries(bankItems).sort((a, b) => {
        const indexA = this.itemOrderMap[a[0]] ?? Number.MAX_VALUE;
        const indexB = this.itemOrderMap[b[0]] ?? Number.MAX_VALUE;
        return indexA - indexB;
    });

    for (const [itemId, quantity] of sortedItems) {
        // Check if this is a clue or casket
        const itemData = loadingManager.getData('items')[itemId];
        if (itemData && (itemData.category === 'clue' || itemData.category === 'casket')) {
            const slotDiv = this.createClueSlot(itemId, quantity);
            bankGrid.appendChild(slotDiv);
        } else {
            const slotDiv = this.createItemSlot(itemId, quantity, 'bank-slot');
            bankGrid.appendChild(slotDiv);
        }
    }
}

    // Update bank header with total value and clue counts
updateBankHeader() {
    const modal = document.querySelector('#bank-modal .modal-content');
    if (!modal) return;
    
    // Find or create header
    let header = modal.querySelector('.bank-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'bank-header';
        modal.insertBefore(header, modal.firstChild);
    }
    
    // Calculate total bank value
let totalValue = 0;
const bankItems = bank.getAllItems();
const shopData = loadingManager.getData('shop');

// Create a map of itemId to basePrice from shop.json
const itemPrices = {};
for (const category of ['supplies', 'resources', 'runes']) {
    if (shopData[category]) {
        for (const item of shopData[category]) {
            itemPrices[item.itemId] = item.basePrice;
        }
    }
}

for (const [itemId, quantity] of Object.entries(bankItems)) {
    if (itemId === 'coins') {
        // Coins are always worth 1 gp each
        totalValue += quantity;
    } else if (itemPrices[itemId]) {
        // Item exists in shop, use its base price
        totalValue += itemPrices[itemId] * quantity;
    }
    // Items not in shop are worth 0 (no else needed)
}
    
    // Get clue completion counts
    let totalClues = 0;
    const clueData = window.clueManager ? clueManager.completedClues : {};
    for (const tier of ['easy', 'medium', 'hard', 'elite', 'master']) {
        totalClues += (clueData[tier] || 0);
    }
    
    // Build header HTML
    let headerHTML = `
        <div class="bank-header-left">
            <h2>Bank: <span class="bank-value">${formatNumber(totalValue)}</span></h2>
        </div>
        <div class="bank-header-right">
    `;
    
    // Add total clues with all_clue icon
    if (totalClues > 0) {
        headerHTML += `
            <div class="clue-count-item">
                <img src="assets/ui/all_clue.png" class="clue-count-icon" alt="Total">
                <span class="clue-count-number">${totalClues}</span>
            </div>
        `;
        
        // Add individual clue tiers
        for (const tier of ['easy', 'medium', 'hard', 'elite', 'master']) {
            const count = clueData[tier] || 0;
            if (count > 0) {
                headerHTML += `
                    <div class="clue-count-item">
                        <img src="assets/items/${tier}_clue.png" class="clue-count-icon" alt="${tier}">
                        <span class="clue-count-number">${count}</span>
                    </div>
                `;
            }
        }
    }
    
    headerHTML += `</div>`;
    header.innerHTML = headerHTML;
}

// ==================== SHOP DISPLAY ====================

updateShop() {
    if (this.currentPanel !== 'shop' || this.minimized) return;
    
    const shopContainer = document.getElementById('shop-container');
    if (!shopContainer || !window.shop) return;
    
    shopContainer.innerHTML = '';
    
    // Shop header with bank gold display
const headerDiv = document.createElement('div');
headerDiv.className = 'shop-header';

const titleDiv = document.createElement('div');
titleDiv.className = 'shop-title';
titleDiv.textContent = 'SHOP';

// Add Buy/Sell toggle
const toggleDiv = document.createElement('div');
toggleDiv.className = 'shop-mode-toggle';

const buyBtn = document.createElement('button');
buyBtn.className = 'shop-toggle-btn' + (!shop.isSellMode ? ' active' : '');
buyBtn.textContent = 'Buy';
buyBtn.addEventListener('click', () => {
    shop.toggleMode('buy');
});

const sellBtn = document.createElement('button');
sellBtn.className = 'shop-toggle-btn' + (shop.isSellMode ? ' active' : '');
sellBtn.textContent = 'Sell';
sellBtn.addEventListener('click', () => {
    shop.toggleMode('sell');
});

toggleDiv.appendChild(buyBtn);
toggleDiv.appendChild(sellBtn);

const goldDiv = document.createElement('div');
goldDiv.className = 'shop-gold';
const bankGold = window.bank ? bank.getItemCount('coins') : 0;
goldDiv.textContent = `Bank: ${formatNumber(bankGold)} gp`;

headerDiv.appendChild(titleDiv);
headerDiv.appendChild(toggleDiv);
headerDiv.appendChild(goldDiv);
shopContainer.appendChild(headerDiv);
    
    // SUPPLIES category
    const suppliesDiv = document.createElement('div');
    suppliesDiv.className = 'shop-category';
    
    const suppliesHeader = document.createElement('div');
    suppliesHeader.className = 'shop-category-header';
    suppliesHeader.textContent = 'SUPPLIES';
    suppliesDiv.appendChild(suppliesHeader);
    
    if (shop.currentStock.supplies) {
        const suppliesItem = this.createShopItem('supplies', shop.currentStock.supplies);
        suppliesDiv.appendChild(suppliesItem);
    }
    
    shopContainer.appendChild(suppliesDiv);
    
    // RESOURCES category (with 2 items)
    const resourcesDiv = document.createElement('div');
    resourcesDiv.className = 'shop-category';
    
    const resourcesHeader = document.createElement('div');
    resourcesHeader.className = 'shop-category-header';
    resourcesHeader.textContent = 'RESOURCES';
    resourcesDiv.appendChild(resourcesHeader);
    
    if (shop.currentStock.resources1) {
        const resource1Item = this.createShopItem('resources1', shop.currentStock.resources1);
        resourcesDiv.appendChild(resource1Item);
    }
    
    if (shop.currentStock.resources2) {
        const resource2Item = this.createShopItem('resources2', shop.currentStock.resources2);
        resourcesDiv.appendChild(resource2Item);
    }
    
    shopContainer.appendChild(resourcesDiv);
    
    // RUNES category
    const runesDiv = document.createElement('div');
    runesDiv.className = 'shop-category';
    
    const runesHeader = document.createElement('div');
    runesHeader.className = 'shop-category-header';
    runesHeader.textContent = 'RUNES';
    runesDiv.appendChild(runesHeader);
    
    if (shop.currentStock.runes) {
        const runesItem = this.createShopItem('runes', shop.currentStock.runes);
        runesDiv.appendChild(runesItem);
    }
    
    shopContainer.appendChild(runesDiv);
}

createShopItem(stockKey, stock) {
    // Item container with 2 columns
    const itemContainer = document.createElement('div');
    itemContainer.className = 'shop-item-container';
    
    // LEFT COLUMN - Icon with quantity overlay and amount input
    const leftColumn = document.createElement('div');
    leftColumn.className = 'shop-column-left';
    
    // Icon with quantity overlay (same as bank)
    const iconDiv = document.createElement('div');
    iconDiv.className = 'shop-item-icon';
    const itemData = loadingManager.getData('items')[stock.itemId];
    
    const img = document.createElement('img');
    img.src = `assets/items/${stock.itemId}.png`;
    img.onerror = function() {
        this.style.display = 'none';
        const textDiv = document.createElement('div');
        textDiv.className = 'shop-icon-fallback';
        textDiv.textContent = itemData ? itemData.name.substring(0, 3) : '?';
        iconDiv.appendChild(textDiv);
    };
    iconDiv.appendChild(img);
    
    // Add bank quantity overlay (same style as bank slots)
    const bankCount = window.bank ? bank.getItemCount(stock.itemId) : 0;
    if (bankCount > 0) {
        const countDiv = document.createElement('div');
        countDiv.className = 'item-count shop-item-count';
        
        // Use the same formatting as bank
        const formatted = this.formatItemCount(bankCount);
        countDiv.textContent = formatted.text;
        countDiv.style.color = formatted.color;
        
        iconDiv.appendChild(countDiv);
    }
    
    // Amount input (at bottom)
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'shop-quantity-input';
    quantityInput.placeholder = 'Amount';
    quantityInput.min = '1';
    quantityInput.max = '10000';
    
    leftColumn.appendChild(iconDiv);
    leftColumn.appendChild(quantityInput);
    
    // RIGHT COLUMN - Name, price, total cost/gain, button
    const rightColumn = document.createElement('div');
    rightColumn.className = 'shop-column-right';
    
    // Top section for name and price info
    const rightTopSection = document.createElement('div');
    rightTopSection.className = 'shop-right-top';
    
    // Item name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'shop-item-name';
    nameDiv.textContent = itemData ? itemData.name : stock.itemId;
    
    // Price display (changes label based on mode)
    const priceDiv = document.createElement('div');
    priceDiv.className = 'shop-item-price';
    
    if (window.shop && shop.isSellMode) {
        // SELL MODE
        const sellPrice = Math.max(1, Math.floor(stock.currentPrice * 0.2));
        const minSellPrice = Math.max(1, Math.floor(Math.ceil(stock.basePrice * 0.5) * 0.2));
        const maxSellPrice = Math.max(1, Math.floor(Math.floor(stock.basePrice * 2) * 0.2));
        priceDiv.innerHTML = `Sell price: <span class="price-amount">${formatNumber(sellPrice)} gp</span> <span class="price-range">(${formatNumber(minSellPrice)}-${formatNumber(maxSellPrice)})</span>`;
    } else {
        // BUY MODE
        const minPrice = Math.ceil(stock.basePrice * 0.5);
        const maxPrice = Math.floor(stock.basePrice * 2);
        priceDiv.innerHTML = `Buy price: <span class="price-amount">${formatNumber(stock.currentPrice)} gp</span> <span class="price-range">(${formatNumber(minPrice)}-${formatNumber(maxPrice)})</span>`;
    }
    
    // Total cost/gain display (ALWAYS VISIBLE to reserve space)
    const totalDiv = document.createElement('div');
    totalDiv.className = shop.isSellMode ? 'shop-total-gain' : 'shop-total-cost';
    totalDiv.style.visibility = 'hidden';  // Use visibility instead of display
    totalDiv.textContent = '\u00A0';  // Non-breaking space to maintain height
    
    rightTopSection.appendChild(nameDiv);
    rightTopSection.appendChild(priceDiv);
    rightTopSection.appendChild(totalDiv);
    
    // Buy/Sell button
    const actionBtn = document.createElement('button');
    actionBtn.className = shop.isSellMode ? 'shop-sell-btn' : 'shop-buy-btn';
    actionBtn.textContent = shop.isSellMode ? 'Sell' : 'Buy';
    actionBtn.disabled = true;
    
    // Update total on input
    quantityInput.addEventListener('input', () => {
        const quantity = parseInt(quantityInput.value) || 0;
        if (quantity > 0) {
            if (shop.isSellMode) {
                // Sell mode calculations
                const sellPrice = Math.max(1, Math.floor(stock.currentPrice * 0.2));
                const totalGain = quantity * sellPrice;
                totalDiv.textContent = `+${formatNumber(totalGain)} gp`;
                totalDiv.style.visibility = 'visible';  // Show the text
                
                const currentBankCount = window.bank ? bank.getItemCount(stock.itemId) : 0;
                actionBtn.disabled = currentBankCount < quantity;
            } else {
                // Buy mode calculations
                const totalCost = quantity * stock.currentPrice;
                totalDiv.textContent = `-${formatNumber(totalCost)} gp`;
                totalDiv.style.visibility = 'visible';  // Show the text
                
                const bankGold = window.bank ? bank.getItemCount('coins') : 0;
                actionBtn.disabled = bankGold < totalCost;
            }
        } else {
            totalDiv.textContent = '\u00A0';  // Keep non-breaking space
            totalDiv.style.visibility = 'hidden';  // Hide but maintain space
            actionBtn.disabled = true;
        }
    });
    
    // Button handler
    actionBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value) || 0;
        if (quantity > 0) {
            if (shop.transactItem(stockKey, quantity)) {
                quantityInput.value = '';
                totalDiv.textContent = '\u00A0';  // Reset to space
                totalDiv.style.visibility = 'hidden';
                actionBtn.disabled = true;
                this.updateShop(); // Refresh display
            }
        }
    });
    
    rightColumn.appendChild(rightTopSection);
    rightColumn.appendChild(actionBtn);
    
    // Assemble
    itemContainer.appendChild(leftColumn);
    itemContainer.appendChild(rightColumn);
    
    return itemContainer;
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

    // ==================== EQUIPMENT DISPLAY ====================
    
    initializeEquipment() {
        // Initialize equipment data structure if needed
        if (!window.equipmentPanels) {
            window.equipmentPanels = {
                melee: {},
                ranged: {},
                magic: {}
            };
            window.gearScores = {
                melee: 0,
                ranged: 0,
                magic: 0
            };
        }
        
        // Set up tab switching
        this.setupEquipmentTabs();
    }
    
    setupEquipmentTabs() {
    // Use event delegation on the parent container for better reliability
    const tabContainer = document.querySelector('.equipment-tabs');
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.equipment-tab');
            if (!tab) return;
            
            // Prevent any default behavior
            e.preventDefault();
            e.stopPropagation();
            
            // Update active tab
            const tabs = document.querySelectorAll('.equipment-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Get the style and update display
            const style = tab.dataset.style;
            if (style) {
                this.displayEquipmentForStyle(style);
            }
        });
    }
}
    
    updateEquipment() {
    // Initialize if first time
    if (!window.equipmentPanels) {
        this.initializeEquipment();
    }
    
    // Display current tab
    const activeTab = document.querySelector('.equipment-tab.active');
    const style = activeTab ? activeTab.dataset.style : 'melee';
    this.displayEquipmentForStyle(style);
}

    displayEquipmentForStyle(style) {
    const grid = document.getElementById('equipment-grid');
    if (!grid) return;
    
    // Update gear score display
    const gearScoreElement = document.getElementById('gear-score-value');
    const gearScoreLabel = document.querySelector('.gear-score-label');
    if (gearScoreElement && window.gearScores) {
        gearScoreElement.textContent = window.gearScores[style] || 0;
    }
    if (gearScoreLabel) {
        const styleLabel = style.charAt(0).toUpperCase() + style.slice(1);
        gearScoreLabel.textContent = `${styleLabel} Gear Score:`;
    }
    
    // Update max hit display
    const maxHitElement = document.getElementById('max-hit-value');
    const maxHitLabel = document.querySelector('.max-hit-label');
    if (maxHitElement) {
        // Calculate max hit for this style using combat manager
        let maxHit = 0;
        if (window.combatManager) {
            maxHit = combatManager.calculateMaxHitForStyle(style);
        } else {
            // If combat manager doesn't exist yet, create a temporary one just for calculation
            const tempCombatManager = new CombatManager();
            maxHit = tempCombatManager.calculateMaxHitForStyle(style);
        }
        maxHitElement.textContent = maxHit;
    }
    if (maxHitLabel) {
        const styleLabel = style.charAt(0).toUpperCase() + style.slice(1);
        maxHitLabel.textContent = `${styleLabel} Max Hit:`;
    }
    
    // Clear grid
    grid.innerHTML = '';
        
        // Add SVG for connection lines (behind items)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('equipment-lines');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        // Create the connection lines
        // Line 1: Head (col 2, row 1) to Feet (col 2, row 5)
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '50%');
        line1.setAttribute('y1', '10%');  // Center of row 1
        line1.setAttribute('x2', '50%');
        line1.setAttribute('y2', '90%');  // Center of row 5
        line1.classList.add('equipment-line');
        
        // Line 2: Cape (col 1, row 2) to Blessing (col 3, row 2)
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '16.66%');  // Center of col 1
        line2.setAttribute('y1', '30%');      // Center of row 2
        line2.setAttribute('x2', '83.33%');  // Center of col 3
        line2.setAttribute('y2', '30%');     // Center of row 2
        line2.classList.add('equipment-line');
        
        // Line 3: Cape (col 1, row 2) to Hands (col 1, row 5)
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line3.setAttribute('x1', '16.66%');  // Center of col 1
        line3.setAttribute('y1', '30%');     // Center of row 2
        line3.setAttribute('x2', '16.66%');  // Center of col 1
        line3.setAttribute('y2', '90%');     // Center of row 5
        line3.classList.add('equipment-line');
        
        // Line 4: Blessing (col 3, row 2) to Unique Ring (col 3, row 5)
        const line4 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line4.setAttribute('x1', '83.33%');  // Center of col 3
        line4.setAttribute('y1', '30%');     // Center of row 2
        line4.setAttribute('x2', '83.33%');  // Center of col 3
        line4.setAttribute('y2', '90%');     // Center of row 5
        line4.classList.add('equipment-line');
        
        svg.appendChild(line1);
        svg.appendChild(line2);
        svg.appendChild(line3);
        svg.appendChild(line4);
        
        grid.appendChild(svg);
        
        // Equipment slot layout (5 rows x 3 columns)
        const slotLayout = [
            [null, 'head', null],
            ['cape', 'neck', 'blessing'],
            ['weapon', 'body', 'shield'],
            ['accessory', 'legs', 'combatring'],
            ['hands', 'feet', 'uniquering']
        ];
        
        // Create grid slots (these will appear on top of the SVG)
        for (const row of slotLayout) {
            for (const slot of row) {
                const slotDiv = this.createEquipmentSlot(slot, style);
                grid.appendChild(slotDiv);
            }
        }
    }
    
createEquipmentSlot(slotType, combatStyle) {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'equipment-slot';
    
    if (!slotType) {
        // Empty placeholder slot
        slotDiv.classList.add('equipment-slot-empty');
        return slotDiv;
    }
    
    // Add slot type class for styling
    slotDiv.classList.add(`equipment-slot-${slotType}`);
    
    // Special handling for blessing slot in ranged/magic modes
    if (slotType === 'blessing' && (combatStyle === 'ranged' || combatStyle === 'magic')) {
        const blessingOptions = this.getBlessingOptions(combatStyle);
        
        // If we have ANY options, show the selector (whether equipped or not)
        if (blessingOptions.length > 0) {
            // Get currently equipped item
            const equippedItem = window.equipmentPanels && 
                               window.equipmentPanels[combatStyle] && 
                               window.equipmentPanels[combatStyle][slotType];
            
            // Create selector container
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'blessing-selector-container';
            
            const optionsWrapper = document.createElement('div');
            optionsWrapper.className = 'blessing-options-wrapper';
            
            // Track if we found the equipped item in options
            let foundEquipped = false;
            
            // Add each option
            blessingOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'blessing-option';
                
                // Check if this is the currently equipped item
                const isEquipped = equippedItem && equippedItem.itemId === option.itemId;
                if (isEquipped) {
                    optionDiv.classList.add('selected');
                    foundEquipped = true;
                }
                
                // Container for the item display
                const itemContainer = document.createElement('div');
                itemContainer.className = 'blessing-item-container';
                
                // Background (equipped slot or empty slot)
                const bgImg = document.createElement('img');
                bgImg.src = isEquipped ? 'assets/ui/equippedslot.png' : 'assets/ui/blessingslot.png';
                bgImg.className = 'blessing-slot-bg';
                itemContainer.appendChild(bgImg);
                
                // Item image
                const itemImg = document.createElement('img');
                itemImg.src = `assets/items/${option.itemId}.png`;
                itemImg.className = 'blessing-item-image';
                itemContainer.appendChild(itemImg);
                
                // Quantity badge
                const quantityDiv = document.createElement('div');
                quantityDiv.className = 'blessing-quantity-badge';
                const formatted = this.formatItemCount(option.quantity);
                quantityDiv.textContent = formatted.text;
                quantityDiv.style.color = formatted.color;
                itemContainer.appendChild(quantityDiv);
                
                optionDiv.appendChild(itemContainer);
                
                // Tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'blessing-tooltip';
                const styleLabel = combatStyle.charAt(0).toUpperCase() + combatStyle.slice(1);
                tooltip.innerHTML = `
                    <div class="blessing-tooltip-name">${option.name}</div>
                    <div class="blessing-tooltip-bonus">+${option.combatBonus} ${styleLabel} Bonus</div>
                    <div class="blessing-tooltip-quantity">Quantity: ${formatNumber(option.quantity)}</div>
                `;
                optionDiv.appendChild(tooltip);
                
                // Click handler to equip
                optionDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Update equipment
                    if (!window.equipmentPanels[combatStyle]) {
                        window.equipmentPanels[combatStyle] = {};
                    }
                    
                    const items = loadingManager.getData('items');
                    const itemData = items[option.itemId];
                    
                    window.equipmentPanels[combatStyle]['blessing'] = {
                        itemId: option.itemId,
                        name: itemData.name,
                        combatBonus: option.combatBonus
                    };
                    
                    // Update gear score
                    bank.updateGearScore(combatStyle);
                    
                    // Refresh display
                    this.displayEquipmentForStyle(combatStyle);
                });
                
                optionsWrapper.appendChild(optionDiv);
            });
            
            // If equipped item exists but wasn't in options (maybe sold/used), add empty slot as selected
            if (equippedItem && !foundEquipped) {
                // Clear the invalid equipment
                delete window.equipmentPanels[combatStyle]['blessing'];
                bank.updateGearScore(combatStyle);
                
                // Add empty option as selected
                const emptyOption = document.createElement('div');
                emptyOption.className = 'blessing-option selected';
                
                const itemContainer = document.createElement('div');
                itemContainer.className = 'blessing-item-container';
                
                const bgImg = document.createElement('img');
                bgImg.src = 'assets/ui/blessingslot.png';
                bgImg.className = 'blessing-slot-bg';
                itemContainer.appendChild(bgImg);
                
                emptyOption.appendChild(itemContainer);
                optionsWrapper.appendChild(emptyOption);
            }
            
            // If nothing equipped, add empty slot option at the end as selected
            if (!equippedItem) {
                const emptyOption = document.createElement('div');
                emptyOption.className = 'blessing-option selected';
                
                const itemContainer = document.createElement('div');
                itemContainer.className = 'blessing-item-container';
                
                const bgImg = document.createElement('img');
                bgImg.src = 'assets/ui/blessingslot.png';
                bgImg.className = 'blessing-slot-bg';
                itemContainer.appendChild(bgImg);
                
                emptyOption.appendChild(itemContainer);
                optionsWrapper.appendChild(emptyOption);
            }
            
            selectorContainer.appendChild(optionsWrapper);
            slotDiv.appendChild(selectorContainer);
            
            return slotDiv;
        }
    }
    
    // Normal equipment slot handling (for non-blessing slots or when no options)
    // Get equipped item for this slot/style (if any)
    const equippedItem = window.equipmentPanels && 
                       window.equipmentPanels[combatStyle] && 
                       window.equipmentPanels[combatStyle][slotType];
    
    if (equippedItem) {
        // Show equipped slot with item
        
        // Create container for the equipped slot (acts like a bank slot)
        const slotContainer = document.createElement('div');
        slotContainer.className = 'equipped-slot-container';
        
        // Layer 1: Equipped slot background (replaces the normal slot icon)
        const bgImg = document.createElement('img');
        bgImg.src = 'assets/ui/equippedslot.png';
        bgImg.className = 'equipment-slot-bg-image';
        slotContainer.appendChild(bgImg);
        
        // Layer 2: Equipped item image on top
        const itemImg = document.createElement('img');
        itemImg.src = `assets/items/${equippedItem.itemId}.png`;
        itemImg.className = 'equipment-item-overlay';
        slotContainer.appendChild(itemImg);
        
        // Add quantity display for blessing slot (arrows/runes) - inside the container
        if (slotType === 'blessing') {
            // Get quantity from bank (since equipped items pull from bank)
            const quantity = window.bank ? bank.getItemCount(equippedItem.itemId) : 0;
            if (quantity > 0) {
                const countDiv = this.createEquipmentItemCount(quantity);
                slotContainer.appendChild(countDiv);
            }
        }
        
        slotDiv.appendChild(slotContainer);
        
        // Add tooltip (outside the container, directly on slotDiv)
        const tooltip = document.createElement('div');
        tooltip.className = 'equipment-tooltip';
        const styleLabel = combatStyle.charAt(0).toUpperCase() + combatStyle.slice(1);
        
        // Build tooltip content
        let tooltipContent = `
            <div class="equipment-tooltip-name">${equippedItem.name}</div>
            <div class="equipment-tooltip-bonus">+${equippedItem.combatBonus} ${styleLabel} Bonus</div>
        `;
        
        // Add quantity to tooltip for blessing slot
        if (slotType === 'blessing') {
            const quantity = window.bank ? bank.getItemCount(equippedItem.itemId) : 0;
            if (quantity > 0) {
                tooltipContent += `<div class="equipment-tooltip-quantity">Quantity: ${formatNumber(quantity)}</div>`;
            }
        }
        
        tooltip.innerHTML = tooltipContent;
        slotDiv.appendChild(tooltip);
    } else {
        // Show empty slot icon at full opacity
        const img = document.createElement('img');
        img.src = `assets/ui/${slotType}slot.png`;
        img.className = 'equipment-slot-icon';
        slotDiv.appendChild(img);
    }
    
    return slotDiv;
}

// Helper method to get available blessing options from bank
getBlessingOptions(combatStyle) {
    const options = [];
    const items = loadingManager.getData('items');
    const bankItems = bank.getAllItems();
    
    console.log('Getting blessing options for combat style:', combatStyle);
    console.log('Bank items:', bankItems);
    
    // Find all matching items in bank
    for (const [itemId, quantity] of Object.entries(bankItems)) {
        const itemData = items[itemId];
        if (!itemData || quantity <= 0) continue;
        
        // Check if this is a blessing slot equipment item
        if (itemData.category === 'equipment' && 
            itemData.equipmentSlot === 'blessing' &&
            itemData.combatStyle === combatStyle &&
            itemData.combatBonus) {
            
            console.log('Found matching item:', itemId, itemData);
            
            options.push({
                itemId: itemId,
                name: itemData.name,
                combatBonus: itemData.combatBonus,
                quantity: quantity
            });
        }
    }
    
    // Sort by combat bonus (lowest to highest)
    options.sort((a, b) => a.combatBonus - b.combatBonus);
    
    console.log('Final blessing options:', options);
    return options;
}

    // Create item count display specifically for equipment slots
createEquipmentItemCount(quantity) {
    const countDiv = document.createElement('div');
    countDiv.className = 'equipment-item-count';
    
    // Use the same formatting as bank items
    const formatted = this.formatItemCount(quantity);
    countDiv.textContent = formatted.text;
    countDiv.style.color = formatted.color;
    
    return countDiv;
}


    
}

// Make UIManager available globally
window.UIManager = UIManager;

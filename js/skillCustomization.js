class SkillCustomizationUI {
    constructor() {
        this.isOpen = false;
        this.currentSkillId = null; // null means global Skill Customization
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
        
        // Create two-column layout wrapper
        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'skill-customization-layout';
        
        // Left column - Completed tasks for this skill (or all skills)
        const completedColumn = document.createElement('div');
        completedColumn.className = 'skill-customization-completed';
        completedColumn.id = 'skill-customization-completed';
        
        // Right column - Main content area
        const content = document.createElement('div');
        content.className = 'skill-customization-content';
        content.id = 'skill-customization-content';
        
        layoutWrapper.appendChild(completedColumn);
        layoutWrapper.appendChild(content);
        
        container.appendChild(closeBtn);
        container.appendChild(layoutWrapper);
        this.overlay.appendChild(container);
        
        // Add to scaled container
        const scaledContainer = document.getElementById('scaled-container');
        if (scaledContainer) {
            scaledContainer.appendChild(this.overlay);
        } else {
            document.body.appendChild(this.overlay);
        }
    }
    
    // Open for a specific skill
    open(skillId) {
        this.currentSkillId = skillId;
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.render();
    }
    
    // Open for global Skill Customization (no specific skill)
    openSkillCustomization() {
        this.currentSkillId = null; // null indicates global mode
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
        // Determine if we're in global mode or skill-specific mode
        if (this.currentSkillId === null) {
            // Global Skill Customization mode
            this.renderGlobalCustomization();
        } else {
            // Skill-specific customization mode
            this.renderSkillSpecificCustomization();
        }
    }
    
    // ==================== GLOBAL SKILL CUSTOMIZATION ====================
    
    renderGlobalCustomization() {
        // Render completed tasks column (ALL skills)
        this.renderAllCompletedTasks();
        
        // Render main content
        const content = document.getElementById('skill-customization-content');
        content.innerHTML = '';
        
        // Header
        const header = this.createGlobalHeader();
        content.appendChild(header);
        
        // Capes and Pets section - UPDATED
        const capesAndPets = this.createGlobalCapesAndPetsSection();
        content.appendChild(capesAndPets);
        
        // Three-column skill weight layout
        const skillColumns = this.createSkillColumns();
        content.appendChild(skillColumns);
    }
    
    renderAllCompletedTasks() {
        const completedColumn = document.getElementById('skill-customization-completed');
        completedColumn.innerHTML = '';
        
        // Header for completed tasks
        const header = document.createElement('div');
        header.className = 'completed-tasks-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Skill History';
        header.appendChild(title);
        
        completedColumn.appendChild(header);
        
        // Get ALL completed tasks
        const allCompletedTasks = this.getAllCompletedTasks();
        
        // Stats section
        const statsDiv = document.createElement('div');
        statsDiv.className = 'completed-tasks-stats';
        
        const totalCompleted = allCompletedTasks.length;
        const statsText = document.createElement('div');
        statsText.className = 'completed-stats-text';
        statsText.textContent = `${totalCompleted} Skill tasks completed`;
        statsDiv.appendChild(statsText);
        
        completedColumn.appendChild(statsDiv);
        
        // Scrollable list container
        const listContainer = document.createElement('div');
        listContainer.className = 'completed-tasks-scroll';
        
        if (allCompletedTasks.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'completed-tasks-empty';
            emptyDiv.textContent = 'No Skill tasks completed yet';
            listContainer.appendChild(emptyDiv);
        } else {
            // Show tasks in reverse order (most recent first)
            allCompletedTasks.slice().reverse().forEach((task, reverseIndex) => {
                const actualIndex = allCompletedTasks.length - reverseIndex;
                const taskRow = this.createCompletedTaskRow(task, actualIndex);
                listContainer.appendChild(taskRow);
            });
        }
        
        completedColumn.appendChild(listContainer);
    }
    
    getAllCompletedTasks() {
        if (!window.taskManager) return [];
        return taskManager.getCompletedTasks();
    }
    
    createGlobalHeader() {
        const header = document.createElement('div');
        header.className = 'skill-customization-header';
        
        // Left side - global skill info
        const leftSide = document.createElement('div');
        leftSide.className = 'header-left';
        
        // Skill icon and name
        const titleDiv = document.createElement('div');
        titleDiv.className = 'skill-title';
        
        const icon = loadingManager.getImage('skill_skills');
        if (icon) {
            const iconImg = document.createElement('img');
            iconImg.src = icon.src;
            iconImg.className = 'skill-icon-large';
            titleDiv.appendChild(iconImg);
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skill-name';
        nameSpan.textContent = 'Skill Customization';
        titleDiv.appendChild(nameSpan);
        
        // Global stats
        const statsDiv = document.createElement('div');
        statsDiv.className = 'skill-stats';
        
        const totalLevel = skills.getTotalLevel();
        const levelSpan = document.createElement('span');
        levelSpan.textContent = `Total Level ${totalLevel}`;
        
        const totalXp = this.calculateTotalXp();
        const xpSpan = document.createElement('span');
        xpSpan.textContent = `${formatNumber(totalXp)} Total XP`;
        
        const creditsSpentSpan = document.createElement('span');
        const creditsSpent = runeCreditManager.skillCredSpent || 0;
        creditsSpentSpan.textContent = `${creditsSpent} Skill Cred spent`;
        
        statsDiv.appendChild(levelSpan);
        statsDiv.appendChild(xpSpan);
        statsDiv.appendChild(creditsSpentSpan);
        
        leftSide.appendChild(titleDiv);
        leftSide.appendChild(statsDiv);
        
        // Right side - Credits Display
        const rightSide = document.createElement('div');
        rightSide.className = 'header-right';
        
        // Skill Cred (primary, larger)
        const skillCredDiv = document.createElement('div');
        skillCredDiv.className = 'skill-cred-display';
        skillCredDiv.id = 'skill-cred-display';
        const availableSkillCred = runeCreditManager.getAvailableSkillCred();
        const totalSkillCred = runeCreditManager.skillCred;
        skillCredDiv.innerHTML = `Skill Cred: <span class="cred-amount">${availableSkillCred}/${totalSkillCred}</span>`;
        
        // Container for other credits (just Rune Cred for global view)
        const otherCredsDiv = document.createElement('div');
        otherCredsDiv.className = 'other-credits';
        
        // Rune Cred
        const runeCredDiv = document.createElement('div');
        runeCredDiv.className = 'secondary-cred';
        runeCredDiv.innerHTML = `Rune Cred: <span class="cred-amount-secondary">${runeCreditManager.runeCred}</span>`;
        
        otherCredsDiv.appendChild(runeCredDiv);
        
        rightSide.appendChild(skillCredDiv);
        rightSide.appendChild(otherCredsDiv);
        
        header.appendChild(leftSide);
        header.appendChild(rightSide);
        
        return header;
    }
    
    calculateTotalXp() {
        let total = 0;
        if (window.skills) {
            for (const skill of Object.values(skills.skills)) {
                total += Math.floor(skill.xp);
            }
        }
        return total;
    }
    
    // UPDATED - Create the 4-row capes and pets section for global view
    createGlobalCapesAndPetsSection() {
        const container = document.createElement('div');
        container.className = 'capes-and-pets-section';
        
        // Get all skill IDs
        const skillsData = loadingManager.getData('skills');
        const skillIds = Object.keys(skillsData);
        
        // Row 1: Regular Capes
        const capesRow = this.createAchievementRow('Capes:', skillIds, 'cape');
        
        // Row 2: Trimmed Capes
        const trimmedRow = this.createAchievementRow('Trimmed:', skillIds, 'trimmedCape');
        
        // Row 3: Regular Pets
        const petsRow = this.createAchievementRow('Pets:', skillIds, 'pet');
        
        // Row 4: Shiny Pets
        const shinyRow = this.createAchievementRow('Shiny:', skillIds, 'shinyPet');
        
        container.appendChild(capesRow);
        container.appendChild(trimmedRow);
        container.appendChild(petsRow);
        container.appendChild(shinyRow);
        
        return container;
    }
    
    // Helper to create an achievement row
createAchievementRow(label, skillIds, type) {
    const row = document.createElement('div');
    row.className = 'achievement-row';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'achievement-label';
    labelDiv.textContent = label;
    
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'achievement-items';
    
    // Add max cape for cape rows OR invisible placeholder for pet rows
    if (type === 'cape' || type === 'trimmedCape') {
        const maxCapeType = type === 'cape' ? 'maxCape' : 'trimmedMaxCape';
        const maxCapeItem = this.createUnlockItem(null, maxCapeType, true); // true for global view
        itemsContainer.appendChild(maxCapeItem);
    } else if (type === 'pet' || type === 'shinyPet') {
        // Add invisible placeholder to align with cape rows
        const placeholder = document.createElement('div');
        placeholder.className = 'unlock-item-placeholder';
        itemsContainer.appendChild(placeholder);
    }
    
    // Add items for each skill
    for (const skillId of skillIds) {
        const item = this.createUnlockItem(skillId, type, true); // true for global view
        itemsContainer.appendChild(item);
    }
        
        row.appendChild(labelDiv);
        row.appendChild(itemsContainer);
        
        return row;
    }
    
    // Create a single unlock item (cape or pet) with locked/unlocked state
    createUnlockItem(skillId, type, isGlobalView = false) {
        const item = document.createElement('div');
        item.className = 'unlock-item';
        
        // Determine if unlocked
        const isUnlocked = runeCreditManager.hasUnlock(skillId, type);
        
        // Add locked/unlocked class
        if (isUnlocked) {
            item.classList.add('unlocked');
        } else {
            item.classList.add('locked');
        }
        
        // Create image
        const img = document.createElement('img');
        
        // Determine image path
        let imagePath = '';
        let tooltipText = '';
        
        if (type === 'maxCape') {
            imagePath = 'assets/capes/max_cape.png';
            tooltipText = 'Max Cape (All skills 99)';
        } else if (type === 'trimmedMaxCape') {
            imagePath = 'assets/capes/max_cape(t).png';
            tooltipText = 'Trimmed Max Cape (All skills 200M XP)';
        } else if (skillId) {
            const skillData = loadingManager.getData('skills')[skillId];
            const skillName = skillData ? skillData.name : skillId;
            
            switch (type) {
                case 'cape':
                    imagePath = `assets/capes/${skillId}_cape.png`;
                    tooltipText = `${skillName} Cape`;
                    break;
                case 'trimmedCape':
                    imagePath = `assets/capes/${skillId}_cape(t).png`;
                    tooltipText = `${skillName} Trimmed Cape`;
                    break;
                case 'pet':
                    imagePath = `assets/pets/${skillId}_pet.png`;
                    tooltipText = `${skillName} Pet`;
                    break;
                case 'shinyPet':
                    imagePath = `assets/pets/${skillId}_pet(s).png`;
                    tooltipText = `${skillName} Pet (Shiny)`;
                    break;
            }
        }
        
        img.src = imagePath;
        img.className = 'unlock-image';
        
        // Handle image load error
        img.onerror = function() {
            // Fallback to skill icon or text
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'unlock-fallback';
            fallback.textContent = '?';
            item.appendChild(fallback);
        };
        
        item.appendChild(img);
        
        // Add quantity display for pets (if multiple)
        if ((type === 'pet' || type === 'shinyPet') && skillId) {
            const petStats = runeCreditManager.getPetStats(skillId);
            const count = type === 'pet' ? petStats.regular : petStats.shiny;
            
            if (count > 1) {
                const quantityDiv = document.createElement('div');
                quantityDiv.className = 'pet-quantity';
                quantityDiv.textContent = formatNumber(count);
                item.appendChild(quantityDiv);
            }
        }
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'unlock-tooltip';
        tooltip.textContent = tooltipText;
        item.appendChild(tooltip);
        
        return item;
    }
    
    createSkillColumns() {
        const container = document.createElement('div');
        container.className = 'skill-weight-columns';
        
        // Define the three columns of skills
        const skillColumns = [
            // Column 1
            ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runecraft', 'construction'],
            // Column 2
            ['hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter'],
            // Column 3
            ['mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming']
        ];
        
        // Get registered skills to filter properly
        const registeredSkills = new Set();
        if (window.skillRegistry && window.skillRegistry.initialized) {
            for (const skill of skillRegistry.getAllSkills()) {
                registeredSkills.add(skill.id);
            }
        }
        
        // Calculate total weight for percentage calculation (only registered skills)
        let totalWeight = 0;
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            // Only include registered skills in weight calculation
            if (registeredSkills.has(skillId)) {
                const weight = runeCreditManager.getSkillWeight(skillId);
                totalWeight += weight;
            }
        }
        
        // Create each column
        for (const columnSkills of skillColumns) {
            const column = document.createElement('div');
            column.className = 'skill-weight-column';
            
            for (const skillId of columnSkills) {
                const skillRow = this.createSkillWeightRow(skillId, totalWeight, registeredSkills);
                column.appendChild(skillRow);
            }
            
            container.appendChild(column);
        }
        
        return container;
    }
    
    createSkillWeightRow(skillId, totalWeight, registeredSkills) {
    const row = document.createElement('div');
    row.className = 'skill-weight-row';
    
    // Skill info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'skill-weight-info';
    
    // Percentage
    const isRegistered = registeredSkills.has(skillId);
    let percentage = 0;
    if (isRegistered && totalWeight > 0) {
        const weight = runeCreditManager.getSkillWeight(skillId);
        percentage = Math.round((weight / totalWeight) * 100);
    }
    
    const percentSpan = document.createElement('span');
    percentSpan.className = 'skill-weight-percent';
    percentSpan.textContent = isRegistered ? `${percentage}%` : '-';
    infoDiv.appendChild(percentSpan);
    
    // Level
    const currentLevel = skills.getLevel(skillId);
    const levelSpan = document.createElement('span');
    levelSpan.className = 'skill-weight-level';
    levelSpan.textContent = `Lv ${currentLevel}`;
    infoDiv.appendChild(levelSpan);
    
    // Icon
    const icon = loadingManager.getImage(`skill_${skillId}`);
    if (icon) {
        const iconImg = document.createElement('img');
        iconImg.src = icon.src;
        iconImg.className = 'skill-weight-icon';
        infoDiv.appendChild(iconImg);
    }
    
    // Name
    const skillData = loadingManager.getData('skills')[skillId];
    const nameSpan = document.createElement('span');
    nameSpan.className = 'skill-weight-name';
    nameSpan.textContent = skillData.name;
    infoDiv.appendChild(nameSpan);
        
        // Control buttons
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'skill-weight-controls';
        
        // Only enable controls if skill is registered
        if (isRegistered) {
            // Get current modification level
            const modLevel = runeCreditManager.skillModLevels[skillId] || 0;
            
            // Weight controls - PASS true FOR useSkillCred IN GLOBAL MODE
            const weightUp = this.createControlButton('+', () => {
                if (runeCreditManager.modifySkillWeight(skillId, true, true)) { // true for useSkillCred
                    this.render();
                    this.updateCredits();
                }
            }, modLevel);
            
            const weightDown = this.createControlButton('-', () => {
                if (runeCreditManager.modifySkillWeight(skillId, false, true)) { // true for useSkillCred
                    this.render();
                    this.updateCredits();
                }
            }, modLevel);
            
            controlsDiv.appendChild(weightUp);
            controlsDiv.appendChild(weightDown);
        } else {
            // Add disabled placeholder buttons for unregistered skills
            for (let i = 0; i < 2; i++) {
                const btn = document.createElement('button');
                btn.className = 'control-button disabled';
                btn.disabled = true;
                btn.textContent = i === 0 ? '+' : '-';
                controlsDiv.appendChild(btn);
            }
            
            // Grey out unregistered skills
            row.classList.add('unavailable');
        }
        
        row.appendChild(infoDiv);
        row.appendChild(controlsDiv);
        
        return row;
    }
    
    // ==================== SKILL-SPECIFIC CUSTOMIZATION ====================
    
    renderSkillSpecificCustomization() {
        // This is all the existing code for individual skills
        this.renderCompletedTasks();
        
        const content = document.getElementById('skill-customization-content');
        content.innerHTML = '';
        
        const skill = skills.skills[this.currentSkillId];
        const skillData = loadingManager.getData('skills')[this.currentSkillId];
        
        // Header
        const header = this.createHeader(skill, skillData);
        content.appendChild(header);
        
        // Speed bonuses - UPDATED to use images
        const speedBonuses = this.createImageSpeedBonuses();
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
    
    renderCompletedTasks() {
        const completedColumn = document.getElementById('skill-customization-completed');
        completedColumn.innerHTML = '';
        
        // Header for completed tasks
        const header = document.createElement('div');
        header.className = 'completed-tasks-header';
        
        const skillData = loadingManager.getData('skills')[this.currentSkillId];
        const title = document.createElement('h3');
        title.textContent = `${skillData.name} History`;
        header.appendChild(title);
        
        completedColumn.appendChild(header);
        
        // Get completed tasks for this skill
        const completedTasksForSkill = this.getCompletedTasksForSkill();
        
        // Stats section
        const statsDiv = document.createElement('div');
        statsDiv.className = 'completed-tasks-stats';
        
        const totalCompleted = completedTasksForSkill.length;
        const statsText = document.createElement('div');
        statsText.className = 'completed-stats-text';
        statsText.textContent = `${totalCompleted} ${skillData.name} tasks completed`;
        statsDiv.appendChild(statsText);
        
        completedColumn.appendChild(statsDiv);
        
        // Scrollable list container
        const listContainer = document.createElement('div');
        listContainer.className = 'completed-tasks-scroll';
        
        if (completedTasksForSkill.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'completed-tasks-empty';
            emptyDiv.textContent = `No ${skillData.name} tasks completed yet`;
            listContainer.appendChild(emptyDiv);
        } else {
            // Show tasks in reverse order (most recent first)
            completedTasksForSkill.slice().reverse().forEach(taskInfo => {
                const taskRow = this.createCompletedTaskRow(taskInfo.task, taskInfo.globalIndex);
                listContainer.appendChild(taskRow);
            });
        }
        
        completedColumn.appendChild(listContainer);
    }
    
    getCompletedTasksForSkill() {
        if (!window.taskManager) return [];
        
        const allCompleted = taskManager.getCompletedTasks();
        const skillTasks = [];
        
        // Filter and track global index
        allCompleted.forEach((task, index) => {
            if (task.skill === this.currentSkillId) {
                skillTasks.push({
                    task: task,
                    globalIndex: index + 1 // 1-based index
                });
            }
        });
        
        return skillTasks;
    }
    
    createCompletedTaskRow(task, globalIndex) {
    const row = document.createElement('div');
    row.className = 'completed-task-row';
    
    // Task number
    const numberDiv = document.createElement('div');
    numberDiv.className = 'completed-task-number';
    numberDiv.textContent = `#${globalIndex}`;
    
    // Separator 1
    const sep1 = document.createElement('div');
    sep1.className = 'completed-task-separator';
    sep1.textContent = '|';
    
    // Skill icon (NEW)
    const iconDiv = document.createElement('div');
    iconDiv.className = 'completed-task-skill-icon';
    if (task.skill) {
        const skillIcon = loadingManager.getImage(`skill_${task.skill}`);
        if (skillIcon) {
            const icon = document.createElement('img');
            icon.src = skillIcon.src;
            iconDiv.appendChild(icon);
        } else {
            // Fallback text if icon doesn't load
            iconDiv.textContent = task.skill.substring(0, 3).toUpperCase();
        }
    }
    
    // Task description (full, on one line)
    const descDiv = document.createElement('div');
    descDiv.className = 'completed-task-description';
    descDiv.textContent = task.description;
    
    // Separator 2
    const sep2 = document.createElement('div');
    sep2.className = 'completed-task-separator';
    sep2.textContent = '|';
    
    // Time ago
    const timeDiv = document.createElement('div');
    timeDiv.className = 'completed-task-time';
    if (task.completedAt) {
        timeDiv.textContent = this.getTimeAgo(task.completedAt);
    } else {
        timeDiv.textContent = '-';
    }
    
    row.appendChild(numberDiv);
    row.appendChild(sep1);
    row.appendChild(iconDiv);  // Add icon before description
    row.appendChild(descDiv);
    row.appendChild(sep2);
    row.appendChild(timeDiv);
    
    return row;
}
    
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
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
        
        const creditsSpentSpan = document.createElement('span');
        const creditsSpent = runeCreditManager.creditsSpentPerSkill[this.currentSkillId] || 0;
        const skillCredName = runeCreditManager.getSkillCredName(this.currentSkillId);
        creditsSpentSpan.textContent = `${creditsSpent} ${skillCredName} spent`;
        
        statsDiv.appendChild(levelSpan);
        statsDiv.appendChild(xpSpan);
        statsDiv.appendChild(creditsSpentSpan);
        
        leftSide.appendChild(titleDiv);
        leftSide.appendChild(statsDiv);
        
        // Right side - Credits Display (now shows all three types)
        const rightSide = document.createElement('div');
        rightSide.className = 'header-right';
        
        // Skill-specific credits (primary, larger)
        const skillCredDiv = document.createElement('div');
        skillCredDiv.className = 'skill-cred-display';
        skillCredDiv.id = 'skill-cred-display';
        // Calculate total and available credits
        const availableCredits = runeCreditManager.getSkillCredits(this.currentSkillId);
        const totalCredits = 10 + (runeCreditManager.tasksPerSkill[this.currentSkillId] || 0);
        skillCredDiv.innerHTML = `${skillCredName}: <span class="cred-amount">${availableCredits}/${totalCredits}</span>`;
        
        // Container for other credits
        const otherCredsDiv = document.createElement('div');
        otherCredsDiv.className = 'other-credits';
        
        // Rune Cred
        const runeCredDiv = document.createElement('div');
        runeCredDiv.className = 'secondary-cred';
        runeCredDiv.innerHTML = `Rune Cred: <span class="cred-amount-secondary">${runeCreditManager.runeCred}</span>`;
        
        // Skill Cred (not spent yet, so available = total)
        const globalSkillCredDiv = document.createElement('div');
        globalSkillCredDiv.className = 'secondary-cred';
        const skillCredTotal = runeCreditManager.skillCred;
        globalSkillCredDiv.innerHTML = `Skill Cred: <span class="cred-amount-secondary">${skillCredTotal}/${skillCredTotal}</span>`;
        
        // Tasks completed for this skill
        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'skill-tasks-completed';
        const tasksCompleted = runeCreditManager.tasksPerSkill[this.currentSkillId] || 0;
        tasksDiv.textContent = `${tasksCompleted} ${skillData.name} tasks earned credits`;
        
        otherCredsDiv.appendChild(runeCredDiv);
        otherCredsDiv.appendChild(globalSkillCredDiv);
        
        rightSide.appendChild(skillCredDiv);
        rightSide.appendChild(otherCredsDiv);
        rightSide.appendChild(tasksDiv);
        
        header.appendChild(leftSide);
        header.appendChild(rightSide);
        
        return header;
    }
    
    // UPDATED - Create image-based speed bonuses for individual skill view
createImageSpeedBonuses() {
    const container = document.createElement('div');
    container.className = 'speed-bonuses';
    
    const totalBonus = runeCreditManager.getSkillSpeedBonus(this.currentSkillId);
    const bonusPercent = Math.round(totalBonus * 100);
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'speed-bonus-title';
    
    // Create bonuses images container FIRST (before the text)
    const bonusesDiv = document.createElement('div');
    bonusesDiv.className = 'speed-bonus-images';
    
    // Add all 6 bonus types as images
    const bonusTypes = [
        { type: 'pet', bonus: '+5%', tooltip: 'Pet' },
        { type: 'shinyPet', bonus: '+10%', tooltip: 'Shiny Pet' },
        { type: 'skillCape', bonus: '+5%', tooltip: 'Skill Cape' },
        { type: 'trimmedCape', bonus: '+10%', tooltip: 'Trimmed Skill Cape' },
        { type: 'maxCape', bonus: '+5%', tooltip: 'Max Cape' },
        { type: 'trimmedMaxCape', bonus: '+10%', tooltip: 'Trimmed Max Cape' }
    ];
    
    for (const bonusInfo of bonusTypes) {
        const bonusItem = this.createSpeedBonusImage(bonusInfo);
        bonusesDiv.appendChild(bonusItem);
    }
    
    // Add images to the title div FIRST
    titleDiv.appendChild(bonusesDiv);
    
    // THEN add the percentage and text
    const percentSpan = document.createElement('span');
    percentSpan.className = 'bonus-percent';
    percentSpan.textContent = `+${bonusPercent}%`;
    
    const textSpan = document.createElement('span');
    textSpan.textContent = ' increased speed';
    
    titleDiv.appendChild(percentSpan);
    titleDiv.appendChild(textSpan);
    
    container.appendChild(titleDiv);
    
    return container;
}
    
    // Create a single speed bonus image
    createSpeedBonusImage(bonusInfo) {
        const item = document.createElement('div');
        item.className = 'speed-bonus-image-item';
        
        // Check if unlocked
        const isUnlocked = runeCreditManager.hasUnlock(this.currentSkillId, bonusInfo.type);
        
        if (isUnlocked) {
            item.classList.add('unlocked');
        } else {
            item.classList.add('locked');
        }
        
        // Create image
        const img = document.createElement('img');
        img.className = 'speed-bonus-img';
        
        // Determine image path based on type
        let imagePath = '';
        let fullTooltip = '';
        
        switch (bonusInfo.type) {
            case 'pet':
                imagePath = `assets/pets/${this.currentSkillId}_pet.png`;
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
            case 'shinyPet':
                imagePath = `assets/pets/${this.currentSkillId}_pet(s).png`;
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
            case 'skillCape':
                imagePath = `assets/capes/${this.currentSkillId}_cape.png`;
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
            case 'trimmedCape':
                imagePath = `assets/capes/${this.currentSkillId}_cape(t).png`;
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
            case 'maxCape':
                imagePath = 'assets/capes/max_cape.png';
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
            case 'trimmedMaxCape':
                imagePath = 'assets/capes/max_cape(t).png';
                fullTooltip = `${bonusInfo.tooltip} ${bonusInfo.bonus}`;
                break;
        }
        
        img.src = imagePath;
        
        // Handle image error
        img.onerror = function() {
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'speed-bonus-fallback';
            fallback.textContent = bonusInfo.bonus;
            item.appendChild(fallback);
        };
        
        item.appendChild(img);
        
        // Add quantity for pets if multiple
        if ((bonusInfo.type === 'pet' || bonusInfo.type === 'shinyPet')) {
            const petStats = runeCreditManager.getPetStats(this.currentSkillId);
            const count = bonusInfo.type === 'pet' ? petStats.regular : petStats.shiny;
            
            if (count > 1) {
                const quantityDiv = document.createElement('div');
                quantityDiv.className = 'pet-quantity';
                quantityDiv.textContent = formatNumber(count);
                item.appendChild(quantityDiv);
            }
        }
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'speed-bonus-tooltip';
        tooltip.textContent = fullTooltip;
        item.appendChild(tooltip);
        
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
let minQty = Math.round(task.minCount * modifier);
let maxQty = Math.round(task.maxCount * modifier);

// Clamp both to minimum of 1
minQty = Math.max(1, minQty);
maxQty = Math.max(1, maxQty);

// Ensure max is at least as large as min
maxQty = Math.max(minQty, maxQty);
        
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
            // Weight controls - DON'T pass useSkillCred (use skill-specific credits)
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
    
    updateCredits() {
        // Check if we're in global mode or skill-specific mode
        if (this.currentSkillId === null) {
            // Global mode - update Skill Cred display
            const skillCredDisplay = document.getElementById('skill-cred-display');
            if (skillCredDisplay) {
                const availableSkillCred = runeCreditManager.getAvailableSkillCred();
                const totalSkillCred = runeCreditManager.skillCred;
                skillCredDisplay.innerHTML = `Skill Cred: <span class="cred-amount">${availableSkillCred}/${totalSkillCred}</span>`;
            }
        } else {
            // Skill-specific mode - update skill-specific credits
            const skillCredDisplay = document.getElementById('skill-cred-display');
            if (skillCredDisplay) {
                const skillCredName = runeCreditManager.getSkillCredName(this.currentSkillId);
                const availableCredits = runeCreditManager.getSkillCredits(this.currentSkillId);
                const totalCredits = 10 + (runeCreditManager.tasksPerSkill[this.currentSkillId] || 0);
                skillCredDisplay.innerHTML = `${skillCredName}: <span class="cred-amount">${availableCredits}/${totalCredits}</span>`;
            }
        }
        
        // Update other credit displays (always the same)
        const runeCredElements = document.querySelectorAll('.secondary-cred');
        if (runeCredElements.length >= 1) {
            runeCredElements[0].innerHTML = `Rune Cred: <span class="cred-amount-secondary">${runeCreditManager.runeCred}</span>`;
            if (runeCredElements.length >= 2) {
                const skillCredTotal = runeCreditManager.skillCred;
                runeCredElements[1].innerHTML = `Skill Cred: <span class="cred-amount-secondary">${skillCredTotal}/${skillCredTotal}</span>`;
            }
        }
    }
}

// Create global instance
window.skillCustomizationUI = new SkillCustomizationUI();

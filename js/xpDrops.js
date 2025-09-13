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
        
        // Track XP milestones to avoid duplicate celebrations
        this.xpMilestones = {}; // skillId -> highest milestone reached
        this.totalLevelMilestone = 0; // Highest total level milestone reached
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
// Round to 1 decimal place
const roundedAmount = Math.round(amount * 10) / 10;
textElement.textContent = `+${formatNumber(roundedAmount)}`;
        
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
    
    // Check for XP milestones
    checkXPMilestones(skillId, newXP) {
        // Initialize milestone tracking for this skill if needed
        if (!this.xpMilestones[skillId]) {
            this.xpMilestones[skillId] = 0;
        }
        
        // Check every 10M milestone
        const newMilestone = Math.floor(newXP / 10000000) * 10000000;
        const oldMilestone = this.xpMilestones[skillId];
        
        if (newMilestone > oldMilestone && newMilestone > 0) {
            this.xpMilestones[skillId] = newMilestone;
            
            // Queue the milestone celebration
            this.queueCelebration({
                type: 'xpMilestone',
                skillId: skillId,
                milestone: newMilestone,
                duration: 3000
            });
            
            // Check for 50M trimmed cape
            if (newMilestone === 50000000) {
                this.queueCelebration({
                    type: 'trimmedCape',
                    skillId: skillId,
                    duration: 3500
                });
            }
            
            // Check for 200M
            if (newMilestone === 200000000) {
                this.checkFor200MAll();
            }
        }
    }
    
    // Check total level milestones
    checkTotalLevel(totalLevel) {
        const milestone = Math.floor(totalLevel / 100) * 100;
        
        if (milestone > this.totalLevelMilestone && milestone > 0) {
            this.totalLevelMilestone = milestone;
            
            this.queueCelebration({
                type: 'totalLevel',
                level: milestone,
                duration: 3000
            });
        }
    }
    
    // Check if all skills are 99
    checkMaxCape() {
        if (!window.skills) return;
        
        const allSkills = skills.getAllSkills();
        let allMaxed = true;
        
        for (const skill of Object.values(allSkills)) {
            if (skill.level < 99) {
                allMaxed = false;
                break;
            }
        }
        
        if (allMaxed) {
            this.queueCelebration({
                type: 'maxCape',
                duration: 5000
            });
        }
    }
    
    // Check if all skills are 50M XP
    checkTrimmedMaxCape() {
        if (!window.skills) return;
        
        const allSkills = skills.getAllSkills();
        let allTrimmed = true;
        
        for (const skill of Object.values(allSkills)) {
            if (skill.xp < 50000000) {
                allTrimmed = false;
                break;
            }
        }
        
        if (allTrimmed) {
            this.queueCelebration({
                type: 'trimmedMaxCape',
                duration: 5000
            });
        }
    }
    
    // Check if all skills are 200M XP
    checkFor200MAll() {
        if (!window.skills) return;
        
        const allSkills = skills.getAllSkills();
        let all200M = true;
        
        for (const skill of Object.values(allSkills)) {
            if (skill.xp < 200000000) {
                all200M = false;
                break;
            }
        }
        
        if (all200M) {
            this.queueCelebration({
                type: 'all200M',
                duration: 6000
            });
        }
    }
    
    // Queue a level up celebration
    showLevelUp(skillId, newLevel) {
        this.queueCelebration({
            type: 'levelup',
            skillId: skillId,
            newLevel: newLevel,
            duration: 3000
        });
        
        // Check for level 99 skill cape
        if (newLevel === 99) {
            this.queueCelebration({
                type: 'cape',
                skillId: skillId,
                duration: 3500
            });
            
            // Check if this completes max cape
            this.checkMaxCape();
        }
    }
    
    // Queue a task completion celebration
    showTaskComplete(task) {
        this.queueCelebration({
            type: 'taskComplete',
            task: task,
            duration: 2500
        });
    }
    
    // Queue a pet obtained celebration
    showPetObtained(skillId, isShiny = false) {
        this.queueCelebration({
            type: 'petObtained',
            skillId: skillId,
            isShiny: isShiny,
            duration: 4000
        });
    }

    // Queue a clue obtained celebration
showClueObtained(tier) {
    this.queueCelebration({
        type: 'clueObtained',
        tier: tier,
        duration: 3000
    });
}

    // Show clue step completion
showClueStepComplete(tier) {
    this.queueCelebration({
        type: 'clueStep',
        tier: tier,
        duration: 2000
    });
}

// Show full clue completion
showClueComplete(tier) {
    this.queueCelebration({
        type: 'clueComplete',
        tier: tier,
        duration: 3000
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
        switch(nextCelebration.type) {
            case 'levelup':
                this.displayLevelUp(nextCelebration);
                break;
            case 'taskComplete':
                this.displayTaskComplete(nextCelebration);
                break;
            case 'clueObtained':
                this.displayClueObtained(nextCelebration);
                break;
            case 'clueStep':
                this.displayClueStep(nextCelebration);
                break;
            case 'clueComplete':
                this.displayClueComplete(nextCelebration);
                break;
            case 'xpMilestone':
                this.displayXPMilestone(nextCelebration);
                break;
            case 'cape':
                this.displaySkillCape(nextCelebration);
                break;
            case 'trimmedCape':
                this.displayTrimmedCape(nextCelebration);
                break;
            case 'totalLevel':
                this.displayTotalLevel(nextCelebration);
                break;
            case 'petObtained':
                this.displayPetObtained(nextCelebration);
                break;
            case 'maxCape':
                this.displayMaxCape(nextCelebration);
                break;
            case 'trimmedMaxCape':
                this.displayTrimmedMaxCape(nextCelebration);
                break;
            case 'all200M':
                this.displayAll200M(nextCelebration);
                break;
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
        const celebration = document.createElement('div');
        celebration.className = 'level-up-celebration';
        
        const levelUpText = document.createElement('div');
        levelUpText.className = 'celebration-title';
        levelUpText.textContent = 'LEVEL UP!';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${data.skillId}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        const levelText = document.createElement('span');
        levelText.className = 'celebration-level';
        levelText.textContent = `Lv ${data.newLevel}`;
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(levelText);
        
        celebration.appendChild(levelUpText);
        celebration.appendChild(skillInfo);
        
        this.createFireworks();
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display XP milestone (10M, 20M, 30M, etc.)
    displayXPMilestone(data) {
        const celebration = document.createElement('div');
        celebration.className = 'level-up-celebration';
        
        const millions = data.milestone / 1000000;
        const titleText = document.createElement('div');
        titleText.className = 'celebration-title';
        titleText.textContent = `${millions} MILLION!`;
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${data.skillId}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        const xpText = document.createElement('span');
        xpText.className = 'celebration-level';
        xpText.textContent = `${millions}M`;
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(xpText);
        
        celebration.appendChild(titleText);
        celebration.appendChild(skillInfo);
        
        this.createFireworks();
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display skill cape unlock
    displaySkillCape(data) {
        const celebration = document.createElement('div');
        celebration.className = 'cape-unlock-celebration';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const capeIcon = loadingManager.getImage(`cape_${data.skillId}`);
        if (capeIcon) {
            iconElement.src = capeIcon.src;
            iconElement.className = 'celebration-cape-icon';
        }
        
        const unlockText = document.createElement('span');
        unlockText.className = 'celebration-unlock';
        unlockText.textContent = 'Skill Cape Unlocked!';
        
        skillInfo.appendChild(iconElement);
        celebration.appendChild(skillInfo);
        celebration.appendChild(unlockText);
        
        this.createFireworks(false, true); // Special cape fireworks
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display trimmed cape unlock
    displayTrimmedCape(data) {
        const celebration = document.createElement('div');
        celebration.className = 'cape-unlock-celebration';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const capeIcon = loadingManager.getImage(`cape_${data.skillId}_t`);
        if (capeIcon) {
            iconElement.src = capeIcon.src;
            iconElement.className = 'celebration-cape-icon';
        }
        
        const unlockText = document.createElement('span');
        unlockText.className = 'celebration-unlock-gold';
        unlockText.textContent = 'Trimmed Cape Unlocked!';
        
        skillInfo.appendChild(iconElement);
        celebration.appendChild(skillInfo);
        celebration.appendChild(unlockText);
        
        this.createFireworks(false, true); // Special cape fireworks
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display total level milestone
    displayTotalLevel(data) {
        const celebration = document.createElement('div');
        celebration.className = 'level-up-celebration';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const skillsIcon = loadingManager.getImage('skill_skills');
        if (skillsIcon) {
            iconElement.src = skillsIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        const levelText = document.createElement('span');
        levelText.className = 'celebration-level';
        levelText.textContent = `${data.level} Total Level!`;
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(levelText);
        
        celebration.appendChild(skillInfo);
        
        this.createFireworks();
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display pet obtained
    displayPetObtained(data) {
        const celebration = document.createElement('div');
        celebration.className = 'pet-obtained-celebration';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const petIcon = loadingManager.getImage(`pet_${data.skillId}${data.isShiny ? '_s' : ''}`);
        if (petIcon) {
            iconElement.src = petIcon.src;
            iconElement.className = 'celebration-pet-icon';
        }
        
        const petText = document.createElement('span');
        petText.className = data.isShiny ? 'celebration-pet-shiny' : 'celebration-pet';
        petText.textContent = data.isShiny ? 'SHINY Pet Obtained!' : 'Pet Obtained!';
        
        skillInfo.appendChild(iconElement);
        celebration.appendChild(skillInfo);
        celebration.appendChild(petText);
        
        this.createFireworks(false, false, data.isShiny);
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }

    displayClueObtained(data) {
    const celebration = document.createElement('div');
    celebration.className = 'clue-obtained-celebration';
    
    const clueInfo = document.createElement('div');
    clueInfo.className = 'celebration-skill-info';
    
    // Create clue icon
    const iconElement = document.createElement('img');
    iconElement.src = `assets/items/${data.tier}_clue.png`;
    iconElement.className = 'celebration-clue-icon';
    
    // Format tier name
    const tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
    
    const clueText = document.createElement('span');
    clueText.className = 'celebration-clue';
    clueText.textContent = `${tierName} Clue Obtained!`;
    
    clueInfo.appendChild(iconElement);
    celebration.appendChild(clueInfo);
    celebration.appendChild(clueText);
    
    // Small fireworks for clues
    this.createFireworks(true);
    this.celebrationContainer.appendChild(celebration);
    
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, data.duration);
}

    // Display clue step completion
displayClueStep(data) {
    const celebration = document.createElement('div');
    celebration.className = 'clue-step-celebration';
    
    const clueInfo = document.createElement('div');
    clueInfo.className = 'celebration-skill-info';
    
    // Create clue icon
    const iconElement = document.createElement('img');
    iconElement.src = `assets/items/${data.tier}_clue.png`;
    iconElement.className = 'celebration-clue-icon';
    
    // Format tier name
    const tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
    
    const stepText = document.createElement('span');
    stepText.className = 'celebration-clue-step';
    stepText.textContent = `${tierName} Step!`;
    
    clueInfo.appendChild(iconElement);
    celebration.appendChild(clueInfo);
    celebration.appendChild(stepText);
    
    this.celebrationContainer.appendChild(celebration);
    
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, data.duration);
}

// Display full clue completion
displayClueComplete(data) {
    const celebration = document.createElement('div');
    celebration.className = 'clue-complete-celebration';
    
    const clueInfo = document.createElement('div');
    clueInfo.className = 'celebration-skill-info';
    
    // Create casket icon
    const iconElement = document.createElement('img');
    iconElement.src = `assets/items/${data.tier}_casket.png`;
    iconElement.className = 'celebration-casket-icon';
    
    // Format tier name
    const tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
    
    const completeText = document.createElement('span');
    completeText.className = 'celebration-clue-complete';
    completeText.textContent = `${tierName} Complete!`;
    
    clueInfo.appendChild(iconElement);
    celebration.appendChild(clueInfo);
    celebration.appendChild(completeText);
    
    // Add small fireworks for completion
    this.createFireworks(true);
    this.celebrationContainer.appendChild(celebration);
    
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, data.duration);
}
    
    // Display max cape
    displayMaxCape(data) {
        const celebration = document.createElement('div');
        celebration.className = 'max-cape-celebration';
        
        const congratsText = document.createElement('div');
        congratsText.className = 'celebration-congrats';
        congratsText.textContent = 'Congratulations!';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const maxCapeIcon = loadingManager.getImage('cape_max');
        if (maxCapeIcon) {
            iconElement.src = maxCapeIcon.src;
            iconElement.className = 'celebration-max-cape-icon';
        }
        
        const maxText = document.createElement('span');
        maxText.className = 'celebration-max';
        maxText.textContent = 'YOU MAXED!';
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(maxText);
        
        celebration.appendChild(congratsText);
        celebration.appendChild(skillInfo);
        
        this.createFireworks(false, false, false, true); // Epic fireworks
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display trimmed max cape
    displayTrimmedMaxCape(data) {
        const celebration = document.createElement('div');
        celebration.className = 'max-cape-celebration';
        
        const congratsText = document.createElement('div');
        congratsText.className = 'celebration-congrats-big';
        congratsText.textContent = 'CONGRATULATIONS!';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const maxCapeIcon = loadingManager.getImage('cape_max_t');
        if (maxCapeIcon) {
            iconElement.src = maxCapeIcon.src;
            iconElement.className = 'celebration-max-cape-icon';
        }
        
        const maxText = document.createElement('span');
        maxText.className = 'celebration-max-gold';
        maxText.textContent = 'YOU MAXED AGAIN!';
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(maxText);
        
        celebration.appendChild(congratsText);
        celebration.appendChild(skillInfo);
        
        this.createFireworks(false, false, false, true); // Epic fireworks
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display 200M all skills
    displayAll200M(data) {
        const celebration = document.createElement('div');
        celebration.className = 'max-cape-celebration';
        
        const congratsText = document.createElement('div');
        congratsText.className = 'celebration-congrats-rainbow';
        congratsText.textContent = 'OMG CONGRATULATIONS!';
        
        const whyText = document.createElement('div');
        whyText.className = 'celebration-why';
        whyText.textContent = '..but why did you do that?';
        
        celebration.appendChild(congratsText);
        celebration.appendChild(whyText);
        
        this.createFireworks(false, false, false, true); // Epic fireworks
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Display task completion celebration
    displayTaskComplete(data) {
        const celebration = document.createElement('div');
        celebration.className = 'task-complete-celebration';
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'celebration-skill-info';
        
        const iconElement = document.createElement('img');
        const skillIcon = loadingManager.getImage(`skill_${data.task.skill}`);
        if (skillIcon) {
            iconElement.src = skillIcon.src;
            iconElement.className = 'celebration-icon';
        }
        
        const completeText = document.createElement('span');
        completeText.className = 'celebration-complete';
        completeText.textContent = 'Task Complete!';
        
        skillInfo.appendChild(iconElement);
        skillInfo.appendChild(completeText);
        celebration.appendChild(skillInfo);
        
        this.createFireworks(true);
        this.celebrationContainer.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, data.duration);
    }
    
    // Create fireworks effect
    createFireworks(isSmall = false, isCape = false, isShiny = false, isEpic = false) {
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = isSmall ? 'fireworks-small' : 'fireworks';
        
        if (isEpic) {
            fireworksContainer.className = 'fireworks-epic';
        } else if (isShiny) {
            fireworksContainer.className = 'fireworks-shiny';
        } else if (isCape) {
            fireworksContainer.className = 'fireworks-cape';
        }
        
        const burstCount = isEpic ? 8 : (isSmall ? 3 : 5);
        for (let i = 0; i < burstCount; i++) {
            const burst = document.createElement('div');
            burst.className = 'firework-burst';
            burst.style.left = `${20 + Math.random() * 60}%`;
            burst.style.top = `${20 + Math.random() * 60}%`;
            burst.style.animationDelay = `${Math.random() * 0.5}s`;
            
            for (let j = 0; j < 12; j++) {
                const particle = document.createElement('div');
                particle.className = 'firework-particle';
                particle.style.transform = `rotate(${j * 30}deg)`;
                burst.appendChild(particle);
            }
            
            fireworksContainer.appendChild(burst);
        }
        
        this.celebrationContainer.appendChild(fireworksContainer);
        
        setTimeout(() => {
            if (fireworksContainer.parentNode) {
                fireworksContainer.parentNode.removeChild(fireworksContainer);
            }
        }, 3000);
    }
    
    cleanupOldDrops() {
        const now = Date.now();
        this.drops = this.drops.filter(drop => {
            return now - drop.timestamp < 2000;
        });
    }
}

// Create global instance
window.xpDropManager = new XPDropManager();

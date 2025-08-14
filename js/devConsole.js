class DevConsole {
    constructor() {
        this.visible = false;
        this.history = [];
        this.historyIndex = -1;
        this.commandHistory = [];
        this.maxHistory = 100;
        this.consoleOutput = [];
        this.maxConsoleOutput = 500;
        
        // Testing speed modifiers
        this.speedModifiers = {
            playerSpeed: 3, // Default 3 tiles/second
            actionDuration: 1.0, // Multiplier for action durations
            defaultPlayerSpeed: 3,
            defaultActionDuration: 1.0
        };
        
        // Store original skill methods for speed modifications
        this.originalSkillMethods = null;
        
        // Capture console methods before anything else loads
        this.captureConsole();
        
        this.initializeCommands();
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // ==================== INITIALIZATION ====================

    initializeCommands() {
        this.commands = {
            // Help
            help: {
                description: 'Show available commands',
                usage: 'help [command]',
                fn: (args) => this.cmdHelp(args)
            },
            
            // Console management
            clear: {
                description: 'Clear command output',
                usage: 'clear',
                fn: () => this.cmdClearCommands()
            },
            clearconsole: {
                description: 'Clear console output',
                usage: 'clearconsole',
                fn: () => this.cmdClearConsole()
            },
            clearall: {
                description: 'Clear both command and console output',
                usage: 'clearall',
                fn: () => this.cmdClearAll()
            },
            
            // Player commands
            tp: {
                description: 'Teleport to coordinates or node',
                usage: 'tp <x> <y> or tp <nodeId>',
                fn: (args) => this.cmdTeleport(args)
            },
            pos: {
                description: 'Show current position',
                usage: 'pos',
                fn: () => this.cmdPosition()
            },
            resetplayer: {
                description: 'Reset player to starting position',
                usage: 'resetplayer',
                fn: () => this.cmdResetPlayer()
            },
            
            // Speed controls
            playerspeed: {
                description: 'Set player movement speed',
                usage: 'playerspeed [speed] (default: 3 tiles/sec)',
                fn: (args) => this.cmdPlayerSpeed(args)
            },
            actionspeed: {
                description: 'Set action duration multiplier',
                usage: 'actionspeed [multiplier] (0.01 = 100x faster, 0.1 = 10x faster, 2 = 2x slower)',
                fn: (args) => this.cmdActionSpeed(args)
            },
            testmode: {
                description: 'Toggle fast testing mode',
                usage: 'testmode [on/off]',
                fn: (args) => this.cmdTestMode(args)
            },
            t: {
                description: 'Toggle fast testing mode (shortcut)',
                usage: 't',
                fn: (args) => this.cmdTestMode(args)
            },
            resetspeeds: {
                description: 'Reset all speeds to default',
                usage: 'resetspeeds',
                fn: () => this.cmdResetSpeeds()
            },
            r: {
                description: 'Reset all speeds to default (shortcut)',
                usage: 'r',
                fn: () => this.cmdResetSpeeds()
            },
            
            // Skill commands
            setlevel: {
                description: 'Set skill level',
                usage: 'setlevel <skill> <level>',
                fn: (args) => this.cmdSetLevel(args)
            },
            addxp: {
                description: 'Add XP to skill',
                usage: 'addxp <skill> <amount>',
                fn: (args) => this.cmdAddXp(args)
            },
            maxskills: {
                description: 'Set all skills to 99',
                usage: 'maxskills',
                fn: () => this.cmdMaxSkills()
            },
            
            // Inventory commands
            give: {
                description: 'Add items to inventory',
                usage: 'give <itemId> [quantity]',
                fn: (args) => this.cmdGive(args)
            },
            clearinv: {
                description: 'Clear inventory',
                usage: 'clearinv',
                fn: () => this.cmdClearInv()
            },
            
            // Bank commands
            bank: {
                description: 'Add items to bank',
                usage: 'bank <itemId> [quantity]',
                fn: (args) => this.cmdBank(args)
            },
            giveall: {
                description: 'Add all items to bank',
                usage: 'giveall [quantity]',
                fn: (args) => this.cmdGiveAll(args)
            },
            
            // Task commands
            tasks: {
                description: 'List all current tasks',
                usage: 'tasks',
                fn: () => this.cmdListTasks()
            },
            completetask: {
                description: 'Instantly complete a task',
                usage: 'completetask <index>',
                fn: (args) => this.cmdCompleteTask(args)
            },
            rerolltask: {
                description: 'Reroll a specific task',
                usage: 'rerolltask <index>',
                fn: (args) => this.cmdRerollTask(args)
            },
            cleartasks: {
                description: 'Clear all tasks and regenerate',
                usage: 'cleartasks',
                fn: () => this.cmdClearTasks()
            },
            generatetasks: {
                description: 'Generate new batch of tasks',
                usage: 'generatetasks',
                fn: () => this.cmdGenerateTasks()
            },
            
            // AI commands
            pauseai: {
                description: 'Toggle AI pause',
                usage: 'pauseai',
                fn: () => this.cmdPauseAI()
            },
            aistatus: {
                description: 'Show AI status and current task',
                usage: 'aistatus',
                fn: () => this.cmdAIStatus()
            },
            
            // Activity commands
            startactivity: {
                description: 'Start an activity',
                usage: 'startactivity <activityId>',
                fn: (args) => this.cmdStartActivity(args)
            },
            stopactivity: {
                description: 'Stop current activity',
                usage: 'stopactivity',
                fn: () => this.cmdStopActivity()
            },
            
            // Debug commands
            nodes: {
                description: 'List all nodes or search',
                usage: 'nodes [search]',
                fn: (args) => this.cmdNodes(args)
            },
            items: {
                description: 'List all items or search',
                usage: 'items [search]',
                fn: (args) => this.cmdItems(args)
            },
            activities: {
                description: 'List all activities or search',
                usage: 'activities [search]',
                fn: (args) => this.cmdActivities(args)
            },
            collision: {
                description: 'Toggle collision debug',
                usage: 'collision',
                fn: () => this.cmdCollision()
            },
            nodetext: {
                description: 'Toggle node text',
                usage: 'nodetext',
                fn: () => this.cmdNodeText()
            },
            
            // ==================== NEW RUNECRED COMMANDS ====================
            rc: {
                description: 'Show or set RuneCred amount',
                usage: 'rc [amount]',
                fn: (args) => this.cmdRuneCred(args)
            },
            addrc: {
                description: 'Add RuneCred',
                usage: 'addrc <amount>',
                fn: (args) => this.cmdAddRuneCred(args)
            },
            rcstatus: {
                description: 'Show RuneCred status and weights',
                usage: 'rcstatus [skill]',
                fn: (args) => this.cmdRuneCreditStatus(args)
            },
            rcpersist: {
                description: 'Toggle RuneCred persistence',
                usage: 'rcpersist [on/off]',
                fn: (args) => this.cmdRuneCreditPersistence(args)
            },
            rcreset: {
                description: 'Reset all RuneCred data',
                usage: 'rcreset',
                fn: () => this.cmdResetRuneCred()
            },
            setweight: {
                description: 'Set skill weight level',
                usage: 'setweight <skill> <level> (-10 to 10)',
                fn: (args) => this.cmdSetWeight(args)
            },
            completetasks: {
                description: 'Complete multiple tasks instantly',
                usage: 'completetasks <count>',
                fn: (args) => this.cmdCompleteTasks(args)
            },
            
            // ==================== PET & CAPE COMMANDS ====================
            pet: {
                description: 'Grant pet for a skill',
                usage: 'pet <skill> [shiny]',
                fn: (args) => this.cmdPet(args)
            },
            removepet: {
                description: 'Remove pet for a skill',
                usage: 'removepet <skill>',
                fn: (args) => this.cmdRemovePet(args)
            },
            allpets: {
                description: 'Grant all pets',
                usage: 'allpets [shiny]',
                fn: (args) => this.cmdAllPets(args)
            },
            cape: {
                description: 'Grant skill cape',
                usage: 'cape <skill> [trimmed]',
                fn: (args) => this.cmdCape(args)
            },
            allcapes: {
                description: 'Grant all skill capes',
                usage: 'allcapes [trimmed]',
                fn: (args) => this.cmdAllCapes(args)
            },
            maxcape: {
                description: 'Toggle max cape',
                usage: 'maxcape [on/off]',
                fn: (args) => this.cmdMaxCape(args)
            },
            speedbonuses: {
                description: 'Show all speed bonuses',
                usage: 'speedbonuses',
                fn: () => this.cmdSpeedBonuses()
            },
            resetbonuses: {
                description: 'Reset all speed bonuses',
                usage: 'resetbonuses',
                fn: () => this.cmdResetBonuses()
            }
        };
    }

    captureConsole() {
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console)
        };

        // Capture window errors
        window.addEventListener('error', (e) => {
            this.addConsoleOutput({
                type: 'error',
                message: e.message,
                file: e.filename,
                line: e.lineno,
                col: e.colno,
                timestamp: Date.now()
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.addConsoleOutput({
                type: 'error',
                message: `Unhandled Promise Rejection: ${e.reason}`,
                timestamp: Date.now()
            });
        });

        // Override console methods
        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.addConsoleOutput({
                type: 'log',
                message: this.formatConsoleArgs(args),
                timestamp: Date.now()
            });
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.addConsoleOutput({
                type: 'error',
                message: this.formatConsoleArgs(args),
                timestamp: Date.now()
            });
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.addConsoleOutput({
                type: 'warn',
                message: this.formatConsoleArgs(args),
                timestamp: Date.now()
            });
        };

        console.info = (...args) => {
            this.originalConsole.info(...args);
            this.addConsoleOutput({
                type: 'info',
                message: this.formatConsoleArgs(args),
                timestamp: Date.now()
            });
        };

        console.debug = (...args) => {
            this.originalConsole.debug(...args);
            this.addConsoleOutput({
                type: 'debug',
                message: this.formatConsoleArgs(args),
                timestamp: Date.now()
            });
        };
    }

    formatConsoleArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    addConsoleOutput(output) {
        this.consoleOutput.push(output);
        
        // Limit console output size
        while (this.consoleOutput.length > this.maxConsoleOutput) {
            this.consoleOutput.shift();
        }
        
        // Update UI if console is visible
        if (this.visible && this.consoleOutputDiv) {
            this.appendConsoleOutput(output);
        }
    }

    appendConsoleOutput(output) {
        const entry = document.createElement('div');
        entry.className = `console-output-entry console-output-${output.type}`;
        
        // Format timestamp
        const time = new Date(output.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
        
        // Build entry content
        let content = `[${timeStr}] `;
        
        if (output.file && output.line) {
            const filename = output.file.split('/').pop();
            content += `${filename}:${output.line} - `;
        }
        
        content += output.message;
        
        entry.textContent = content;
        this.consoleOutputDiv.appendChild(entry);
        
        // Auto-scroll to bottom
        this.consoleOutputDiv.scrollTop = this.consoleOutputDiv.scrollHeight;
        
        // Limit displayed entries
        while (this.consoleOutputDiv.children.length > this.maxConsoleOutput) {
            this.consoleOutputDiv.removeChild(this.consoleOutputDiv.firstChild);
        }
    }

    initialize() {
        this.createUI();
        this.setupEventListeners();
        
        // Display any console output that was captured before UI was ready
        if (this.consoleOutput.length > 0) {
            this.consoleOutput.forEach(output => this.appendConsoleOutput(output));
        }
    }

    createUI() {
        // Create console container
        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'dev-console';
        consoleDiv.className = 'dev-console';
        consoleDiv.style.display = 'none';
        
        // Create split container
        const splitContainer = document.createElement('div');
        splitContainer.className = 'dev-console-split';
        
        // LEFT SIDE - Commands
        const leftSide = document.createElement('div');
        leftSide.className = 'dev-console-left';
        
        // Create header for left side
        const leftHeader = document.createElement('div');
        leftHeader.className = 'dev-console-header';
        leftHeader.innerHTML = '<span>Commands</span><span style="color: #666; font-size: 12px; margin-left: 10px;">Press ` to toggle</span>';
        
        // Create output area for commands
        const outputDiv = document.createElement('div');
        outputDiv.id = 'dev-console-output';
        outputDiv.className = 'dev-console-output';
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'dev-console-input-container';
        
        // Create prompt
        const prompt = document.createElement('span');
        prompt.className = 'dev-console-prompt';
        prompt.textContent = '> ';
        
        // Create input field
        const input = document.createElement('input');
        input.id = 'dev-console-input';
        input.className = 'dev-console-input';
        input.type = 'text';
        input.autocomplete = 'off';
        
        inputContainer.appendChild(prompt);
        inputContainer.appendChild(input);
        
        leftSide.appendChild(leftHeader);
        leftSide.appendChild(outputDiv);
        leftSide.appendChild(inputContainer);
        
        // RIGHT SIDE - Console Output
        const rightSide = document.createElement('div');
        rightSide.className = 'dev-console-right';
        
        // Create header for right side
        const rightHeader = document.createElement('div');
        rightHeader.className = 'dev-console-header';
        rightHeader.innerHTML = '<span>Console Output</span><span style="color: #666; font-size: 12px; margin-left: 10px;">Logs & Errors</span>';
        
        // Create console output area
        const consoleOutputDiv = document.createElement('div');
        consoleOutputDiv.id = 'console-output';
        consoleOutputDiv.className = 'console-output';
        
        rightSide.appendChild(rightHeader);
        rightSide.appendChild(consoleOutputDiv);
        
        // Assemble the console
        splitContainer.appendChild(leftSide);
        splitContainer.appendChild(rightSide);
        consoleDiv.appendChild(splitContainer);
        
        // Add to scaled container
        const scaledContainer = document.getElementById('scaled-container');
        if (scaledContainer) {
            scaledContainer.appendChild(consoleDiv);
        } else {
            // Fallback to body if scaled container doesn't exist yet
            document.body.appendChild(consoleDiv);
        }
        
        this.consoleDiv = consoleDiv;
        this.outputDiv = outputDiv;
        this.inputField = input;
        this.consoleOutputDiv = consoleOutputDiv;
    }

    setupEventListeners() {
        // Toggle console with ` key
        window.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        // Handle input
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(this.inputField.value);
                this.inputField.value = '';
                this.historyIndex = -1;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.consoleDiv.style.display = this.visible ? 'block' : 'none';
        
        if (this.visible) {
            this.inputField.focus();
            if (this.outputDiv.children.length === 0) {
                this.log('Developer Console - Type "help" for commands', 'info');
            }
            
            // Display all captured console output when toggling on
            if (this.consoleOutputDiv && this.consoleOutput.length > 0) {
                // Clear existing display
                this.consoleOutputDiv.innerHTML = '';
                
                // Re-display all captured output
                this.consoleOutput.forEach(output => {
                    this.appendConsoleOutput(output);
                });
            }
        }
    }

    log(message, type = 'normal') {
        const entry = document.createElement('div');
        entry.className = `dev-console-entry dev-console-${type}`;
        entry.textContent = message;
        
        this.outputDiv.appendChild(entry);
        this.outputDiv.scrollTop = this.outputDiv.scrollHeight;
        
        // Limit history
        while (this.outputDiv.children.length > this.maxHistory) {
            this.outputDiv.removeChild(this.outputDiv.firstChild);
        }
    }

    executeCommand(commandStr) {
        if (!commandStr.trim()) return;
        
        // Add to history
        this.commandHistory.unshift(commandStr);
        if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
        }
        
        // Log the command
        this.log(`> ${commandStr}`, 'command');
        
        // Parse command
        const parts = commandStr.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Execute command
        if (this.commands[cmd]) {
            try {
                this.commands[cmd].fn(args);
            } catch (error) {
                this.log(`Error: ${error.message}`, 'error');
            }
        } else {
            this.log(`Unknown command: ${cmd}`, 'error');
        }
    }

    navigateHistory(direction) {
        if (direction === -1 && this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
        } else if (direction === 1 && this.historyIndex > -1) {
            this.historyIndex--;
        }
        
        if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
            this.inputField.value = this.commandHistory[this.historyIndex];
        } else if (this.historyIndex === -1) {
            this.inputField.value = '';
        }
    }

    // ==================== HELPER METHODS ====================

    requireSystem(systemName, windowProperty) {
        if (!window[windowProperty]) {
            this.log(`${systemName} not initialized yet`, 'error');
            return false;
        }
        return true;
    }

    parseIntArg(arg, name, min = null, max = null) {
        const value = parseInt(arg);
        if (isNaN(value)) {
            this.log(`${name} must be a number`, 'error');
            return null;
        }
        if (min !== null && value < min) {
            this.log(`${name} must be at least ${min}`, 'error');
            return null;
        }
        if (max !== null && value > max) {
            this.log(`${name} must be at most ${max}`, 'error');
            return null;
        }
        return value;
    }

    parseFloatArg(arg, name, min = null, max = null) {
        const value = parseFloat(arg);
        if (isNaN(value)) {
            this.log(`${name} must be a number`, 'error');
            return null;
        }
        if (min !== null && value < min) {
            this.log(`${name} must be at least ${min}`, 'error');
            return null;
        }
        if (max !== null && value > max) {
            this.log(`${name} must be at most ${max}`, 'error');
            return null;
        }
        return value;
    }

    validateSkill(skillId) {
        if (!this.requireSystem('Skills', 'skills')) return null;
        
        const skill = skills.skills[skillId.toLowerCase()];
        if (!skill) {
            this.log(`Unknown skill: ${skillId}`, 'error');
            return null;
        }
        return skillId.toLowerCase();
    }

    validateItem(itemId) {
        if (!this.requireSystem('Loading manager', 'loadingManager')) return null;
        
        const items = loadingManager.getData('items');
        if (!items || !items[itemId]) {
            this.log(`Unknown item: ${itemId}`, 'error');
            return null;
        }
        return itemId;
    }

    validateActivity(activityId) {
        if (!this.requireSystem('Loading manager', 'loadingManager')) return null;
        
        const activities = loadingManager.getData('activities');
        if (!activities || !activities[activityId]) {
            this.log(`Unknown activity: ${activityId}`, 'error');
            return null;
        }
        return activityId;
    }

    searchData(dataType, searchTerm) {
        if (!this.requireSystem('Loading manager', 'loadingManager')) return [];
        
        const data = loadingManager.getData(dataType);
        if (!data) {
            this.log(`${dataType} data not loaded`, 'error');
            return [];
        }
        
        let matches = Object.entries(data);
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            matches = matches.filter(([id, item]) => {
                // Search in ID
                if (id.toLowerCase().includes(search)) return true;
                // Search in name
                if (item.name && item.name.toLowerCase().includes(search)) return true;
                // Search in skill (for activities)
                if (item.skill && item.skill.toLowerCase().includes(search)) return true;
                return false;
            });
        }
        
        return matches;
    }

    // ==================== SPEED CONTROL COMMANDS ====================

    cmdPlayerSpeed(args) {
        if (args.length === 0) {
            this.log(`Current player speed: ${this.speedModifiers.playerSpeed} tiles/second`, 'info');
            this.log(`Default: ${this.speedModifiers.defaultPlayerSpeed} tiles/second`, 'info');
            return;
        }
        
        const speed = this.parseFloatArg(args[0], 'Speed', 0.1, 100);
        if (speed === null) return;
        
        this.speedModifiers.playerSpeed = speed;
        
        // Apply to player if exists
        if (window.player) {
            player.movementSpeed = speed;
        }
        
        this.log(`Player speed set to ${speed} tiles/second`, 'success');
    }

    cmdActionSpeed(args) {
        if (args.length === 0) {
            this.log(`Current action speed multiplier: ${this.speedModifiers.actionDuration}x`, 'info');
            this.log(`(0.01 = 100x faster, 0.1 = 10x faster, 1.0 = normal, 2.0 = 2x slower)`, 'info');
            return;
        }
        
        const multiplier = this.parseFloatArg(args[0], 'Multiplier', 0.001, 10);
        if (multiplier === null) return;
        
        this.speedModifiers.actionDuration = multiplier;
        
        // Hook into skill registry if it exists
        if (window.skillRegistry && window.skillRegistry.initialized) {
            // Store original methods if not already stored
            if (!this.originalSkillMethods) {
                this.originalSkillMethods = {};
            }
            
            // Override getDuration methods for all skills
            const allSkills = skillRegistry.getAllSkills();
            for (const skill of allSkills) {
                // Store original method if not already stored
                if (!this.originalSkillMethods[skill.id]) {
                    this.originalSkillMethods[skill.id] = skill.getDuration.bind(skill);
                }
                
                // Override with multiplier
                const originalMethod = this.originalSkillMethods[skill.id];
                skill.getDuration = (baseDuration, level, activityData) => {
                    const duration = originalMethod(baseDuration, level, activityData);
                    return duration * window.devConsole.speedModifiers.actionDuration;
                };
            }
        }
        
        this.log(`Action speed multiplier set to ${multiplier}x`, 'success');
        if (multiplier < 1) {
            this.log(`Actions are now ${Math.round(1/multiplier)}x faster`, 'info');
        } else if (multiplier > 1) {
            this.log(`Actions are now ${multiplier}x slower`, 'info');
        }
    }

    cmdTestMode(args) {
        const mode = args.length > 0 ? args[0].toLowerCase() : 'toggle';
        
        let enable = false;
        if (mode === 'toggle') {
            enable = this.speedModifiers.playerSpeed === this.speedModifiers.defaultPlayerSpeed;
        } else {
            enable = mode === 'on' || mode === 'true' || mode === '1';
        }
        
        if (enable) {
            // Fast testing mode
            this.speedModifiers.playerSpeed = 30; // 30 tiles/sec
            this.speedModifiers.actionDuration = 0.01; // 100x faster actions
            
            if (window.player) {
                player.movementSpeed = 30;
            }
            
            // Apply action speed
            this.cmdActionSpeed(['0.01']);
            
            this.log('Test mode ENABLED', 'success');
            this.log('- Player speed: 30 tiles/sec', 'info');
            this.log('- Actions: 100x faster', 'info');
        } else {
            // Reset to defaults
            this.cmdResetSpeeds();
        }
    }

    cmdResetSpeeds() {
        this.speedModifiers.playerSpeed = this.speedModifiers.defaultPlayerSpeed;
        this.speedModifiers.actionDuration = this.speedModifiers.defaultActionDuration;
        
        if (window.player) {
            player.movementSpeed = this.speedModifiers.defaultPlayerSpeed;
        }
        
        // Restore original skill methods if they were overridden
        if (this.originalSkillMethods && window.skillRegistry) {
            const allSkills = skillRegistry.getAllSkills();
            for (const skill of allSkills) {
                if (this.originalSkillMethods[skill.id]) {
                    skill.getDuration = this.originalSkillMethods[skill.id];
                }
            }
        }
        
        this.log('All speeds reset to default', 'success');
    }

    // ==================== COMMAND IMPLEMENTATIONS ====================

    cmdHelp(args) {
        if (args.length > 0) {
            const cmd = args[0].toLowerCase();
            if (this.commands[cmd]) {
                this.log(`${cmd}: ${this.commands[cmd].description}`, 'info');
                this.log(`Usage: ${this.commands[cmd].usage}`, 'info');
            } else {
                this.log(`Unknown command: ${cmd}`, 'error');
            }
        } else {
            this.log('Available commands:', 'info');
            
            // Group commands by category
            const categories = {
                'Console': ['help', 'clear', 'clearconsole', 'clearall'],
                'Player': ['tp', 'pos', 'resetplayer'],
                'Speed': ['playerspeed', 'actionspeed', 'testmode', 't', 'resetspeeds', 'r'],
                'Skills': ['setlevel', 'addxp', 'maxskills'],
                'Inventory': ['give', 'clearinv'],
                'Bank': ['bank', 'giveall'],
                'Tasks': ['tasks', 'completetask', 'rerolltask', 'cleartasks', 'generatetasks', 'completetasks'],
                'RuneCred': ['rc', 'addrc', 'rcstatus', 'rcpersist', 'rcreset', 'setweight'],
                'Pets & Capes': ['pet', 'removepet', 'allpets', 'cape', 'allcapes', 'maxcape', 'speedbonuses', 'resetbonuses'],
                'AI': ['pauseai', 'aistatus'],
                'Activity': ['startactivity', 'stopactivity'],
                'Debug': ['nodes', 'items', 'activities', 'collision', 'nodetext']
            };
            
            for (const [category, cmds] of Object.entries(categories)) {
                this.log(`--- ${category} ---`, 'info');
                for (const cmdName of cmds) {
                    if (this.commands[cmdName]) {
                        this.log(`  ${cmdName} - ${this.commands[cmdName].description}`, 'info');
                    }
                }
            }
        }
    }

    cmdClearCommands() {
        this.outputDiv.innerHTML = '';
        this.log('Command output cleared', 'success');
    }

    cmdClearConsole() {
        this.consoleOutputDiv.innerHTML = '';
        this.consoleOutput = [];
        this.log('Console output cleared', 'success');
    }

    cmdClearAll() {
        this.outputDiv.innerHTML = '';
        this.consoleOutputDiv.innerHTML = '';
        this.consoleOutput = [];
        this.log('All output cleared', 'success');
    }

    cmdTeleport(args) {
        if (!this.requireSystem('Player', 'player')) return;
        
        if (args.length === 2) {
            // Teleport to coordinates
            const x = this.parseIntArg(args[0], 'X coordinate');
            const y = this.parseIntArg(args[1], 'Y coordinate');
            if (x === null || y === null) return;
            
            player.position.x = x;
            player.position.y = y;
            player.path = [];
            player.targetPosition = null;
            player.targetNode = null;
            player.currentNode = null;
            player.stopActivity();
            
            this.log(`Teleported to ${x}, ${y}`, 'success');
        } else if (args.length === 1) {
            // Teleport to node
            const nodeId = args[0];
            const node = nodes.getNode(nodeId);
            
            if (!node) {
                this.log(`Node not found: ${nodeId}`, 'error');
                return;
            }
            
            player.position.x = node.position.x + 0.5;
            player.position.y = node.position.y + 0.5;
            player.path = [];
            player.targetPosition = null;
            player.targetNode = null;
            player.currentNode = nodeId;
            player.stopActivity();
            
            this.log(`Teleported to ${node.name} (${nodeId})`, 'success');
        } else {
            this.log('Usage: tp <x> <y> or tp <nodeId>', 'error');
        }
    }

    cmdPosition() {
        if (!this.requireSystem('Player', 'player')) return;
        
        this.log(`Position: ${Math.round(player.position.x)}, ${Math.round(player.position.y)}`, 'info');
        if (player.currentNode) {
            const node = nodes.getNode(player.currentNode);
            this.log(`Current node: ${player.currentNode} (${node ? node.name : 'unknown'})`, 'info');
        } else {
            this.log(`Current node: none`, 'info');
        }
    }

    cmdResetPlayer() {
        if (!this.requireSystem('Test scenario', 'testScenario')) return;
        
        testScenario.resetPlayer();
        this.log('Player reset to starting position', 'success');
    }

    cmdSetLevel(args) {
        if (args.length !== 2) {
            this.log('Usage: setlevel <skill> <level>', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const level = this.parseIntArg(args[1], 'Level', 1, 99);
        if (level === null) return;
        
        if (window.testScenario) {
            testScenario.setSkillLevel(skillId, level);
        } else {
            // Direct method if testScenario not available
            const targetXp = window.getXpForLevel(level);
            const skill = skills.skills[skillId];
            if (skill) {
                skill.xp = targetXp;
                skill.level = level;
                skill.xpForNextLevel = window.getXpForLevel(level + 1);
            }
        }
        
        // Update speed bonuses after changing levels
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log(`Set ${skillId} to level ${level}`, 'success');
    }

    cmdAddXp(args) {
        if (args.length !== 2) {
            this.log('Usage: addxp <skill> <amount>', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const amount = this.parseIntArg(args[1], 'Amount', 0);
        if (amount === null) return;
        
        skills.addXp(skillId, amount);
        
        // Update speed bonuses after adding XP
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log(`Added ${window.formatNumber(amount)} XP to ${skillId}`, 'success');
    }

    cmdMaxSkills() {
        if (!this.requireSystem('Test scenario', 'testScenario')) return;
        
        testScenario.maxAllSkills();
        
        // Update speed bonuses after maxing skills
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log('All skills set to 99', 'success');
    }

    cmdGive(args) {
        if (!this.requireSystem('Inventory', 'inventory')) return;
        
        if (args.length < 1) {
            this.log('Usage: give <itemId> [quantity]', 'error');
            return;
        }
        
        const itemId = this.validateItem(args[0]);
        if (!itemId) return;
        
        const quantity = args.length > 1 ? this.parseIntArg(args[1], 'Quantity', 1) : 1;
        if (quantity === null) return;
        
        const items = loadingManager.getData('items');
        const added = inventory.addItem(itemId, quantity);
        this.log(`Added ${added} ${items[itemId].name} to inventory`, 'success');
    }

    cmdClearInv() {
        if (!this.requireSystem('Inventory', 'inventory')) return;
        
        inventory.clear();
        this.log('Inventory cleared', 'success');
    }

    cmdBank(args) {
        if (!this.requireSystem('Bank', 'bank')) return;
        
        if (args.length < 1) {
            this.log('Usage: bank <itemId> [quantity]', 'error');
            return;
        }
        
        const itemId = this.validateItem(args[0]);
        if (!itemId) return;
        
        const quantity = args.length > 1 ? this.parseIntArg(args[1], 'Quantity', 1) : 1;
        if (quantity === null) return;
        
        const items = loadingManager.getData('items');
        bank.deposit(itemId, quantity);
        this.log(`Added ${quantity} ${items[itemId].name} to bank`, 'success');
    }

    cmdGiveAll(args) {
        if (!this.requireSystem('Test scenario', 'testScenario')) return;
        
        const quantity = args.length > 0 ? this.parseIntArg(args[0], 'Quantity', 1) : 100;
        if (quantity === null) return;
        
        testScenario.giveAllItems(quantity);
        this.log(`Added ${quantity} of each item to bank`, 'success');
    }

    // ==================== TASK COMMANDS ====================

    cmdListTasks() {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        const tasks = taskManager.getAllTasks();
        
        if (tasks.length === 0) {
            this.log('No tasks available', 'info');
            return;
        }
        
        this.log('=== CURRENT TASKS ===', 'info');
        
        // Check which task is current (first incomplete)
        const currentTask = taskManager.getFirstIncompleteTask();
        
        tasks.forEach((task, index) => {
            const isComplete = task.progress >= 1;
            const isCurrent = task === currentTask;
            
            let status = '';
            if (isCurrent) status = ' [ACTIVE]';
            else if (isComplete) status = ' [COMPLETE]';
            
            let progressText = '';
            if (task.isCookingTask) {
                // Cooking task - show raw food consumed
                const consumed = task.rawFoodConsumed || 0;
                progressText = `${consumed}/${task.targetCount}`;
            } else {
                // Gathering task - show items collected
                const current = Math.floor(task.progress * task.targetCount);
                progressText = `${current}/${task.targetCount}`;
            }
            
            const percentage = Math.floor(task.progress * 100);
            
            this.log(
                `#${index + 1}: ${task.description} - ${progressText} (${percentage}%)${status}`,
                isComplete ? 'success' : (isCurrent ? 'command' : 'info')
            );
        });
        
        // Show AI status if available
        if (window.ai && window.ai.currentTask) {
            this.log('', 'info');
            this.log(`AI working on: ${window.ai.currentTask.description}`, 'info');
        }
    }

    cmdCompleteTask(args) {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: completetask <index>', 'error');
            this.log('Example: completetask 1 (completes first task)', 'info');
            return;
        }
        
        const index = this.parseIntArg(args[0], 'Task index', 1, taskManager.tasks.length);
        if (index === null) return;
        
        const taskIndex = index - 1; // Convert to 0-based index
        const task = taskManager.tasks[taskIndex];
        
        if (!task) {
            this.log(`Task #${index} not found`, 'error');
            return;
        }
        
        // For gathering tasks, add items to bank to complete
        if (!task.isCookingTask) {
            const currentCount = taskManager.getCurrentItemCount(task.itemId);
            const needed = task.targetCount - currentCount + (task.startingCount || 0);
            
            if (needed > 0) {
                bank.deposit(task.itemId, needed);
                this.log(`Added ${needed} ${task.itemId} to bank`, 'info');
            }
        } else {
            // For cooking tasks, just mark as complete
            task.rawFoodConsumed = task.targetCount;
        }
        
        // Mark task as complete
        taskManager.setTaskProgress(task, 1);
        
        this.log(`Completed task: ${task.description}`, 'success');
        
        // Update UI
        if (window.ui) {
            window.ui.updateTasks();
        }
    }

    cmdCompleteTasks(args) {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: completetasks <count>', 'error');
            return;
        }
        
        const count = this.parseIntArg(args[0], 'Count', 1, 10000);
        if (count === null) return;
        
        let completed = 0;
        
        for (let i = 0; i < count; i++) {
            // Complete the current task
            const currentTask = taskManager.getFirstIncompleteTask();
            if (!currentTask) {
                this.log('No more tasks to complete', 'info');
                break;
            }
            
            // Mark as complete
            taskManager.setTaskProgress(currentTask, 1);
            completed++;
        }
        
        this.log(`Completed ${completed} tasks`, 'success');
        this.log(`Total RuneCred: ${runeCreditManager.runecred}`, 'info');
        
        // Update UI
        if (window.ui) {
            window.ui.updateTasks();
        }
    }

    cmdRerollTask(args) {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: rerolltask <index>', 'error');
            this.log('Example: rerolltask 1 (rerolls first task)', 'info');
            return;
        }
        
        const index = this.parseIntArg(args[0], 'Task index', 1, taskManager.tasks.length);
        if (index === null) return;
        
        const taskIndex = index - 1; // Convert to 0-based index
        const oldTask = taskManager.tasks[taskIndex];
        
        if (!oldTask) {
            this.log(`Task #${index} not found`, 'error');
            return;
        }
        
        this.log(`Rerolling task: ${oldTask.description}`, 'info');
        taskManager.rerollTask(taskIndex);
        
        const newTask = taskManager.tasks[taskIndex];
        if (newTask && newTask !== oldTask) {
            this.log(`New task: ${newTask.description}`, 'success');
        }
    }

    cmdClearTasks() {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        taskManager.clearTasks();
        this.log('All tasks cleared', 'success');
        
        // Generate new tasks
        taskManager.generateNewTasks();
        this.log('Generated new batch of tasks', 'success');
    }

    cmdGenerateTasks() {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        taskManager.generateNewTasks();
        this.log('Generated new batch of tasks', 'success');
    }

    // ==================== RUNECRED COMMANDS ====================

    cmdRuneCred(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            this.log(`Current RuneCred: ${runeCreditManager.runecred}`, 'info');
            this.log(`Total tasks completed: ${runeCreditManager.totalTasksCompleted}`, 'info');
            this.log(`Milestones reached: ${runeCreditManager.lastMilestone}`, 'info');
            return;
        }
        
        const amount = this.parseIntArg(args[0], 'Amount', 0, 1000000);
        if (amount === null) return;
        
        runeCreditManager.runecred = amount;
        runeCreditManager.saveData();
        this.log(`Set RuneCred to ${amount}`, 'success');
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.updateRuneCred();
        }
    }

    cmdAddRuneCred(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: addrc <amount>', 'error');
            return;
        }
        
        const amount = this.parseIntArg(args[0], 'Amount', 1, 100000);
        if (amount === null) return;
        
        runeCreditManager.runecred += amount;
        runeCreditManager.saveData();
        this.log(`Added ${amount} RuneCred (total: ${runeCreditManager.runecred})`, 'success');
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.updateRuneCred();
        }
    }

    cmdRuneCreditStatus(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            // Show overall status
            this.log('=== RUNECRED STATUS ===', 'info');
            this.log(`RuneCred: ${runeCreditManager.runecred}`, 'info');
            this.log(`Tasks completed: ${runeCreditManager.totalTasksCompleted}`, 'info');
            this.log(`Persistence: ${runeCreditManager.enablePersistence ? 'ENABLED' : 'DISABLED'}`, 'info');
            
            // Show skills with modified weights
            const modifiedSkills = Object.entries(runeCreditManager.skillModLevels)
                .filter(([_, level]) => level !== 0);
            
            if (modifiedSkills.length > 0) {
                this.log('', 'info');
                this.log('Modified skill weights:', 'info');
                for (const [skillId, level] of modifiedSkills) {
                    const weight = runeCreditManager.getSkillWeight(skillId);
                    this.log(`  ${skillId}: Level ${level} (${weight.toFixed(2)}x weight)`, 'info');
                }
            }
        } else {
            // Show status for specific skill
            const skillId = this.validateSkill(args[0]);
            if (!skillId) return;
            
            this.log(`=== ${skillId.toUpperCase()} RUNECRED STATUS ===`, 'info');
            
            // Skill weight
            const skillLevel = runeCreditManager.skillModLevels[skillId] || 0;
            const skillWeight = runeCreditManager.getSkillWeight(skillId);
            this.log(`Skill weight: Level ${skillLevel} (${skillWeight.toFixed(2)}x)`, 'info');
            
            // RC spent on this skill
            const rcSpent = runeCreditManager.rcSpentPerSkill[skillId] || 0;
            this.log(`RC spent: ${rcSpent}`, 'info');
            
            // Speed bonus
            const speedBonus = runeCreditManager.getSkillSpeedBonus(skillId);
            this.log(`Speed bonus: +${Math.round(speedBonus * 100)}%`, 'info');
            
            // Show modified tasks
            const modifiedTasks = Object.entries(runeCreditManager.taskModLevels[skillId] || {})
                .filter(([_, level]) => level !== 0);
            
            if (modifiedTasks.length > 0) {
                this.log('', 'info');
                this.log('Modified task weights:', 'info');
                for (const [itemId, level] of modifiedTasks) {
                    const weight = runeCreditManager.getTaskWeight(skillId, itemId);
                    this.log(`  ${itemId}: Level ${level} (${weight.toFixed(2)}x)`, 'info');
                }
            }
            
            // Show modified nodes
            const modifiedNodes = Object.entries(runeCreditManager.nodeModLevels[skillId] || {})
                .filter(([_, level]) => level !== 0);
            
            if (modifiedNodes.length > 0) {
                this.log('', 'info');
                this.log('Modified node weights:', 'info');
                for (const [nodeId, level] of modifiedNodes) {
                    const weight = runeCreditManager.getNodeWeight(skillId, nodeId);
                    this.log(`  ${nodeId}: Level ${level} (${weight.toFixed(2)}x)`, 'info');
                }
            }
        }
    }

    cmdRuneCreditPersistence(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            this.log(`RuneCred persistence is ${runeCreditManager.enablePersistence ? 'ENABLED' : 'DISABLED'}`, 'info');
            return;
        }
        
        const mode = args[0].toLowerCase();
        const enable = mode === 'on' || mode === 'true' || mode === '1';
        
        runeCreditManager.togglePersistence(enable);
        this.log(`RuneCred persistence ${enable ? 'ENABLED' : 'DISABLED'}`, 'success');
    }

    cmdResetRuneCred() {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        // Reset all RuneCred data
        runeCreditManager.runecred = 500;
        runeCreditManager.totalTasksCompleted = 0;
        runeCreditManager.lastMilestone = 0;
        
        // Reset all modifications
        for (const skillId of Object.keys(runeCreditManager.skillModLevels)) {
            runeCreditManager.skillModLevels[skillId] = 0;
            runeCreditManager.taskModLevels[skillId] = {};
            runeCreditManager.nodeModLevels[skillId] = {};
            runeCreditManager.quantityModLevels[skillId] = {};
            runeCreditManager.rcSpentPerSkill[skillId] = 0;
            
            // Reset RC pools
            runeCreditManager.rcPools.skills[skillId] = 0;
            runeCreditManager.rcPools.tasks[skillId] = {};
            runeCreditManager.rcPools.nodes[skillId] = {};
            runeCreditManager.rcPools.quantities[skillId] = {};
        }
        
        // Reset speed bonuses (but keep actual skill levels)
        for (const skillId of Object.keys(runeCreditManager.speedBonuses.pets)) {
            runeCreditManager.speedBonuses.pets[skillId] = false;
            runeCreditManager.speedBonuses.shinyPets[skillId] = false;
            runeCreditManager.speedBonuses.skillCapes[skillId] = false;
            runeCreditManager.speedBonuses.trimmedCapes[skillId] = false;
        }
        runeCreditManager.speedBonuses.maxCape = false;
        
        // Update based on current levels
        runeCreditManager.updateSpeedBonuses();
        
        // Save if persistence is enabled
        runeCreditManager.saveData();
        
        this.log('All RuneCred data reset', 'success');
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.render();
        }
    }

    cmdSetWeight(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length !== 2) {
            this.log('Usage: setweight <skill> <level> (-10 to 10)', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const level = this.parseIntArg(args[1], 'Level', -10, 10);
        if (level === null) return;
        
        // Calculate cost/refund
        const currentLevel = runeCreditManager.skillModLevels[skillId] || 0;
        const baseCost = 25;
        
        // Reset to 0 first (refund current)
        if (currentLevel !== 0) {
            const refund = baseCost * Math.abs(currentLevel) * (Math.abs(currentLevel) + 1) / 2;
            runeCreditManager.runecred += refund;
            runeCreditManager.rcPools.skills[skillId] = 0;
            runeCreditManager.rcSpentPerSkill[skillId] = 0;
        }
        
        // Set to new level (charge for new)
        if (level !== 0) {
            const cost = baseCost * Math.abs(level) * (Math.abs(level) + 1) / 2;
            if (runeCreditManager.runecred < cost) {
                this.log(`Not enough RuneCred! Need ${cost}, have ${runeCreditManager.runecred}`, 'error');
                return;
            }
            runeCreditManager.runecred -= cost;
            runeCreditManager.rcPools.skills[skillId] = cost;
            runeCreditManager.rcSpentPerSkill[skillId] = cost;
        }
        
        runeCreditManager.skillModLevels[skillId] = level;
        const weight = runeCreditManager.getSkillWeight(skillId);
        
        runeCreditManager.saveData();
        this.log(`Set ${skillId} weight to level ${level} (${weight.toFixed(2)}x)`, 'success');
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.render();
        }
    }

    // ==================== PET & CAPE COMMANDS ====================

    cmdPet(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length < 1) {
            this.log('Usage: pet <skill> [shiny]', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const isShiny = args[1] && args[1].toLowerCase() === 'shiny';
        
        if (isShiny) {
            runeCreditManager.speedBonuses.shinyPets[skillId] = true;
            runeCreditManager.speedBonuses.pets[skillId] = false; // Shiny overrides regular
            this.log(`Granted shiny pet for ${skillId} (+10% speed)`, 'success');
        } else {
            runeCreditManager.speedBonuses.pets[skillId] = true;
            runeCreditManager.speedBonuses.shinyPets[skillId] = false; // Regular overrides shiny
            this.log(`Granted pet for ${skillId} (+5% speed)`, 'success');
        }
        
        runeCreditManager.saveData();
    }

    cmdRemovePet(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: removepet <skill>', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        runeCreditManager.speedBonuses.pets[skillId] = false;
        runeCreditManager.speedBonuses.shinyPets[skillId] = false;
        
        runeCreditManager.saveData();
        this.log(`Removed pet for ${skillId}`, 'success');
    }

    cmdAllPets(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        const isShiny = args[0] && args[0].toLowerCase() === 'shiny';
        
        for (const skillId of Object.keys(runeCreditManager.speedBonuses.pets)) {
            if (isShiny) {
                runeCreditManager.speedBonuses.shinyPets[skillId] = true;
                runeCreditManager.speedBonuses.pets[skillId] = false;
            } else {
                runeCreditManager.speedBonuses.pets[skillId] = true;
                runeCreditManager.speedBonuses.shinyPets[skillId] = false;
            }
        }
        
        runeCreditManager.saveData();
        this.log(`Granted all ${isShiny ? 'shiny ' : ''}pets`, 'success');
    }

    cmdCape(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length < 1) {
            this.log('Usage: cape <skill> [trimmed]', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const isTrimmed = args[1] && args[1].toLowerCase() === 'trimmed';
        
        if (isTrimmed) {
            // Set skill to 200M XP for trimmed cape
            const skill = skills.skills[skillId];
            if (skill) {
                skill.xp = 200000000;
                skill.level = 99;
            }
            runeCreditManager.speedBonuses.trimmedCapes[skillId] = true;
            runeCreditManager.speedBonuses.skillCapes[skillId] = true; // Also have regular
            this.log(`Granted trimmed cape for ${skillId} (+10% speed)`, 'success');
        } else {
            // Set skill to 99 for regular cape
            if (window.testScenario) {
                testScenario.setSkillLevel(skillId, 99);
            }
            runeCreditManager.speedBonuses.skillCapes[skillId] = true;
            this.log(`Granted skill cape for ${skillId} (+5% speed)`, 'success');
        }
        
        runeCreditManager.updateSpeedBonuses();
        runeCreditManager.saveData();
        
        if (window.ui) ui.updateSkillsList();
    }

    cmdAllCapes(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        const isTrimmed = args[0] && args[0].toLowerCase() === 'trimmed';
        
        for (const skillId of Object.keys(skills.skills)) {
            if (isTrimmed) {
                // Set to 200M XP
                const skill = skills.skills[skillId];
                if (skill) {
                    skill.xp = 200000000;
                    skill.level = 99;
                }
            } else {
                // Set to level 99
                if (window.testScenario) {
                    testScenario.setSkillLevel(skillId, 99);
                }
            }
        }
        
        runeCreditManager.updateSpeedBonuses();
        runeCreditManager.saveData();
        
        if (window.ui) ui.updateSkillsList();
        this.log(`Granted all ${isTrimmed ? 'trimmed ' : ''}skill capes`, 'success');
    }

    cmdMaxCape(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            const hasMaxCape = runeCreditManager.speedBonuses.maxCape;
            this.log(`Max cape: ${hasMaxCape ? 'OWNED' : 'NOT OWNED'}`, 'info');
            return;
        }
        
        const mode = args[0].toLowerCase();
        const enable = mode === 'on' || mode === 'true' || mode === '1';
        
        if (enable) {
            // Set all skills to 99 first
            this.cmdMaxSkills();
            runeCreditManager.speedBonuses.maxCape = true;
            this.log('Granted max cape (+5% global speed)', 'success');
        } else {
            runeCreditManager.speedBonuses.maxCape = false;
            this.log('Removed max cape', 'success');
        }
        
        runeCreditManager.saveData();
    }

    cmdSpeedBonuses() {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        this.log('=== SPEED BONUSES ===', 'info');
        
        // Show skills with bonuses
        for (const skillId of Object.keys(skills.skills)) {
            const bonuses = [];
            
            if (runeCreditManager.speedBonuses.shinyPets[skillId]) {
                bonuses.push('Shiny Pet (+10%)');
            } else if (runeCreditManager.speedBonuses.pets[skillId]) {
                bonuses.push('Pet (+5%)');
            }
            
            if (runeCreditManager.speedBonuses.trimmedCapes[skillId]) {
                bonuses.push('Trimmed Cape (+10%)');
            } else if (runeCreditManager.speedBonuses.skillCapes[skillId]) {
                bonuses.push('Cape (+5%)');
            }
            
            if (bonuses.length > 0) {
                const totalBonus = runeCreditManager.getSkillSpeedBonus(skillId);
                this.log(`${skillId}: ${bonuses.join(', ')} = +${Math.round(totalBonus * 100)}%`, 'info');
            }
        }
        
        if (runeCreditManager.speedBonuses.maxCape) {
            this.log('Max Cape: +5% global bonus', 'info');
        }
        
        // Show skills without bonuses
        const skillsWithoutBonuses = Object.keys(skills.skills).filter(skillId => {
            return !runeCreditManager.speedBonuses.pets[skillId] &&
                   !runeCreditManager.speedBonuses.shinyPets[skillId] &&
                   !runeCreditManager.speedBonuses.skillCapes[skillId] &&
                   !runeCreditManager.speedBonuses.trimmedCapes[skillId];
        });
        
        if (skillsWithoutBonuses.length > 0) {
            this.log('', 'info');
            this.log('Skills without bonuses: ' + skillsWithoutBonuses.join(', '), 'info');
        }
    }

    cmdResetBonuses() {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        // Reset all speed bonuses
        for (const skillId of Object.keys(runeCreditManager.speedBonuses.pets)) {
            runeCreditManager.speedBonuses.pets[skillId] = false;
            runeCreditManager.speedBonuses.shinyPets[skillId] = false;
            runeCreditManager.speedBonuses.skillCapes[skillId] = false;
            runeCreditManager.speedBonuses.trimmedCapes[skillId] = false;
        }
        runeCreditManager.speedBonuses.maxCape = false;
        
        // Update based on current skill levels
        runeCreditManager.updateSpeedBonuses();
        runeCreditManager.saveData();
        
        this.log('All speed bonuses reset (bonuses from actual skill levels restored)', 'success');
    }

    // ==================== AI COMMANDS ====================

    cmdPauseAI() {
        if (!this.requireSystem('Game', 'gameState')) return;
        
        gameState.paused = !gameState.paused;
        const pauseBtn = document.getElementById('pause-toggle');
        if (pauseBtn) {
            pauseBtn.textContent = gameState.paused ? 'Resume AI' : 'Pause AI';
        }
        this.log(`AI ${gameState.paused ? 'paused' : 'resumed'}`, 'success');
    }

    cmdAIStatus() {
        if (!this.requireSystem('AI', 'ai')) return;
        
        this.log('=== AI STATUS ===', 'info');
        
        // Paused state
        const isPaused = window.gameState ? gameState.paused : false;
        this.log(`State: ${isPaused ? 'PAUSED' : 'RUNNING'}`, isPaused ? 'error' : 'success');
        
        // Current task
        if (ai.currentTask) {
            const progress = Math.floor(ai.currentTask.progress * 100);
            this.log(`Current Task: ${ai.currentTask.description}`, 'info');
            this.log(`Progress: ${progress}%`, 'info');
            this.log(`Node: ${ai.currentTask.nodeId}`, 'info');
            this.log(`Activity: ${ai.currentTask.activityId}`, 'info');
        } else {
            this.log('Current Task: None (selecting...)', 'info');
        }
        
        // Player status
        if (window.player) {
            this.log('', 'info');
            this.log('=== PLAYER STATUS ===', 'info');
            
            if (player.isMoving()) {
                this.log('Status: Moving', 'info');
                if (player.targetNode) {
                    this.log(`Target: ${player.targetNode}`, 'info');
                }
            } else if (player.isPerformingActivity()) {
                this.log('Status: Performing Activity', 'info');
                this.log(`Activity: ${player.currentActivity}`, 'info');
                const progress = Math.floor(player.activityProgress * 100);
                this.log(`Progress: ${progress}%`, 'info');
            } else {
                this.log('Status: Idle', 'info');
            }
            
            this.log(`Current Node: ${player.currentNode || 'none'}`, 'info');
        }
        
        // Decision cooldown
        this.log('', 'info');
        this.log(`Decision Cooldown: ${Math.floor(ai.decisionCooldown)}ms`, 'info');
    }

    cmdStartActivity(args) {
        if (!this.requireSystem('Player', 'player')) return;
        
        if (args.length !== 1) {
            this.log('Usage: startactivity <activityId>', 'error');
            return;
        }
        
        const activityId = this.validateActivity(args[0]);
        if (!activityId) return;
        
        const activities = loadingManager.getData('activities');
        player.startActivity(activityId);
        this.log(`Started activity: ${activities[activityId].name}`, 'success');
    }

    cmdStopActivity() {
        if (!this.requireSystem('Player', 'player')) return;
        
        player.stopActivity();
        this.log('Activity stopped', 'success');
    }

    cmdNodes(args) {
        const search = args.length > 0 ? args.join(' ').toLowerCase() : '';
        const matches = this.searchData('nodes', search);
        
        if (matches.length === 0) {
            this.log('No nodes found', 'info');
            return;
        }
        
        this.log(`Found ${matches.length} nodes:`, 'info');
        matches.slice(0, 20).forEach(([id, node]) => {
            this.log(`  ${id}: ${node.name} (${node.position.x}, ${node.position.y})`, 'info');
        });
        
        if (matches.length > 20) {
            this.log(`  ... and ${matches.length - 20} more`, 'info');
        }
    }

    cmdItems(args) {
        const search = args.length > 0 ? args.join(' ').toLowerCase() : '';
        const matches = this.searchData('items', search);
        
        if (matches.length === 0) {
            this.log('No items found', 'info');
            return;
        }
        
        this.log(`Found ${matches.length} items:`, 'info');
        matches.slice(0, 20).forEach(([id, item]) => {
            this.log(`  ${id}: ${item.name}`, 'info');
        });
        
        if (matches.length > 20) {
            this.log(`  ... and ${matches.length - 20} more`, 'info');
        }
    }

    cmdActivities(args) {
        const search = args.length > 0 ? args.join(' ').toLowerCase() : '';
        const matches = this.searchData('activities', search);
        
        if (matches.length === 0) {
            this.log('No activities found', 'info');
            return;
        }
        
        this.log(`Found ${matches.length} activities:`, 'info');
        matches.slice(0, 20).forEach(([id, activity]) => {
            this.log(`  ${id}: ${activity.name} (${activity.skill} lvl ${activity.requiredLevel})`, 'info');
        });
        
        if (matches.length > 20) {
            this.log(`  ... and ${matches.length - 20} more`, 'info');
        }
    }

    cmdCollision() {
        if (!this.requireSystem('Map', 'map')) return;
        
        map.toggleCollisionDebug();
        this.log(`Collision debug ${map.showCollisionDebug ? 'enabled' : 'disabled'}`, 'success');
    }

    cmdNodeText() {
        if (!this.requireSystem('Map', 'map')) return;
        
        map.toggleNodeText();
        this.log(`Node text ${map.showNodeText ? 'enabled' : 'disabled'}`, 'success');
    }
}

// Create global instance
window.devConsole = new DevConsole();

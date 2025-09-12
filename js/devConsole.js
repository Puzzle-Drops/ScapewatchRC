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
            // === HELP & CONSOLE ===
            help: {
                description: 'Show available commands',
                usage: 'help [command]',
                fn: (args) => this.cmdHelp(args)
            },
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
            
            // === PLAYER COMMANDS ===
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
            
            // === SPEED CONTROLS ===
            playerspeed: {
                description: 'Set player movement speed',
                usage: 'playerspeed [speed] (default: 3 tiles/sec)',
                fn: (args) => this.cmdPlayerSpeed(args)
            },
            actionspeed: {
                description: 'Set action duration multiplier',
                usage: 'actionspeed [multiplier] (0.01 = 100x faster)',
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
            
            // === SKILLS ===
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
            maxallxp: {
                description: 'Set all skills to 200M XP',
                usage: 'maxallxp',
                fn: () => this.cmdMaxAllXp()
            },
            skillstats: {
                description: 'Show skill statistics',
                usage: 'skillstats [skill]',
                fn: (args) => this.cmdSkillStats(args)
            },
            
            // === INVENTORY & BANK ===
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
            bank: {
                description: 'Add items to bank',
                usage: 'bank <itemId> [quantity]',
                fn: (args) => this.cmdBank(args)
            },
            clearbank: {
                description: 'Clear bank',
                usage: 'clearbank',
                fn: () => this.cmdClearBank()
            },
            giveall: {
                description: 'Add all items to bank',
                usage: 'giveall [quantity]',
                fn: (args) => this.cmdGiveAll(args)
            },
            bankstats: {
                description: 'Show bank statistics',
                usage: 'bankstats',
                fn: () => this.cmdBankStats()
            },
            
            // === TASKS ===
            tasks: {
                description: 'List all current tasks',
                usage: 'tasks',
                fn: () => this.cmdListTasks()
            },
            completetask: {
                description: 'Complete current task instantly',
                usage: 'completetask',
                fn: () => this.cmdCompleteCurrentTask()
            },
            completetasks: {
                description: 'Complete multiple tasks',
                usage: 'completetasks <count>',
                fn: (args) => this.cmdCompleteTasks(args)
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
            taskstats: {
                description: 'Show task completion statistics',
                usage: 'taskstats',
                fn: () => this.cmdTaskStats()
            },
            
            // === RUNECRED SYSTEM ===
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
            skillcred: {
                description: 'Show or set Skill Cred',
                usage: 'skillcred [spent]',
                fn: (args) => this.cmdSkillCred(args)
            },
            skillcredits: {
                description: 'Show or set skill-specific credits',
                usage: 'skillcredits <skill> [amount]',
                fn: (args) => this.cmdSkillCredits(args)
            },
            rcstatus: {
                description: 'Show complete RuneCred status',
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
                description: 'Set skill weight directly',
                usage: 'setweight <skill> <level> (-10 to 10)',
                fn: (args) => this.cmdSetWeight(args)
            },
            
            // === PETS ===
            pet: {
                description: 'Grant pet for a skill',
                usage: 'pet <skill> [shiny] [count]',
                fn: (args) => this.cmdPet(args)
            },
            removepet: {
                description: 'Remove all pets for a skill',
                usage: 'removepet <skill>',
                fn: (args) => this.cmdRemovePet(args)
            },
            allpets: {
                description: 'Grant all pets',
                usage: 'allpets [shiny]',
                fn: (args) => this.cmdAllPets(args)
            },
            petstats: {
                description: 'Show pet statistics',
                usage: 'petstats [skill]',
                fn: (args) => this.cmdPetStats(args)
            },

            // === CLUES ===
            clue: {
                description: 'Generate a clue scroll',
                usage: 'clue <tier> (easy/medium/hard/elite/master)',
                fn: (args) => this.cmdClue(args)
            },
            forceclue: {
                description: 'Force next activity to drop a clue',
                usage: 'forceclue <tier>',
                fn: (args) => this.cmdForceClue(args)
            },
            cluestats: {
                description: 'Show clue scroll statistics',
                usage: 'cluestats',
                fn: () => this.cmdClueStats()
            },
            
            // === CAPES ===
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
            capestats: {
                description: 'Show cape ownership',
                usage: 'capestats',
                fn: () => this.cmdCapeStats()
            },
            
            // === SPEED BONUSES ===
            speedbonuses: {
                description: 'Show all speed bonuses',
                usage: 'speedbonuses',
                fn: () => this.cmdSpeedBonuses()
            },
            resetbonuses: {
                description: 'Reset all speed bonuses',
                usage: 'resetbonuses',
                fn: () => this.cmdResetBonuses()
            },
            
            // === AI CONTROL ===
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
            aistart: {
                description: 'Start AI if paused',
                usage: 'aistart',
                fn: () => this.cmdAIStart()
            },
            aistop: {
                description: 'Stop AI',
                usage: 'aistop',
                fn: () => this.cmdAIStop()
            },
            
            // === ACTIVITY CONTROL ===
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
            
            // === DEBUG TOOLS ===
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
            
            // === PRESETS ===
            preset: {
                description: 'Load a testing preset',
                usage: 'preset <name> (fishing, mining, runecraft, agility, all99)',
                fn: (args) => this.cmdPreset(args)
            },
            save: {
                description: 'Save current state',
                usage: 'save <name>',
                fn: (args) => this.cmdSaveState(args)
            },
            load: {
                description: 'Load saved state',
                usage: 'load <name>',
                fn: (args) => this.cmdLoadState(args)
            },
            liststates: {
                description: 'List saved states',
                usage: 'liststates',
                fn: () => this.cmdListStates()
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
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.autocomplete();
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

    autocomplete() {
        const currentValue = this.inputField.value.toLowerCase();
        if (!currentValue) return;
        
        const matches = Object.keys(this.commands).filter(cmd => 
            cmd.startsWith(currentValue)
        );
        
        if (matches.length === 1) {
            this.inputField.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            this.log('Possible commands: ' + matches.join(', '), 'info');
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
            this.log('Valid skills: ' + Object.keys(skills.skills).join(', '), 'info');
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

    // ==================== HELP COMMAND ====================

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
            this.log('=== AVAILABLE COMMANDS ===', 'info');
            
            // Group commands by category
            const categories = {
                'Console': ['help', 'clear', 'clearconsole', 'clearall'],
                'Player': ['tp', 'pos', 'resetplayer'],
                'Speed': ['playerspeed', 'actionspeed', 'testmode', 't', 'resetspeeds'],
                'Skills': ['setlevel', 'addxp', 'maxskills', 'maxallxp', 'skillstats'],
                'Inventory': ['give', 'clearinv', 'bank', 'clearbank', 'giveall', 'bankstats'],
                'Tasks': ['tasks', 'completetask', 'completetasks', 'rerolltask', 'cleartasks', 'taskstats'],
                'RuneCred': ['rc', 'addrc', 'skillcred', 'skillcredits', 'rcstatus', 'rcpersist', 'rcreset', 'setweight'],
                'Pets': ['pet', 'removepet', 'allpets', 'petstats'],
                'Clues': ['clue', 'forceclue', 'cluestats'],
                'Capes': ['cape', 'allcapes', 'maxcape', 'capestats'],
                'Speed Bonuses': ['speedbonuses', 'resetbonuses'],
                'AI': ['pauseai', 'aistatus', 'aistart', 'aistop'],
                'Activity': ['startactivity', 'stopactivity'],
                'Debug': ['nodes', 'items', 'activities', 'collision', 'nodetext'],
                'Presets': ['preset', 'save', 'load', 'liststates']
            };
            
            for (const [category, cmds] of Object.entries(categories)) {
                this.log(``, 'info');
                this.log(`--- ${category} ---`, 'info');
                for (const cmdName of cmds) {
                    if (this.commands[cmdName]) {
                        this.log(`  ${cmdName} - ${this.commands[cmdName].description}`, 'info');
                    }
                }
            }
            
            this.log(``, 'info');
            this.log('Type "help <command>" for detailed usage', 'info');
        }
    }

    // ==================== CONSOLE COMMANDS ====================

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

    // ==================== PLAYER COMMANDS ====================

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
        if (!this.requireSystem('Player', 'player')) return;
        
        player.position.x = 4395;
        player.position.y = 1882;
        player.currentNode = 'lumbridge_bank';
        player.stopActivity();
        player.path = [];
        player.pathIndex = 0;
        player.targetPosition = null;
        player.targetNode = null;
        
        this.log('Player reset to starting position', 'success');
    }

    // ==================== SPEED COMMANDS ====================

    cmdPlayerSpeed(args) {
    if (args.length === 0) {
        if (window.player) {
            const currentSpeed = player.getMovementSpeed();
            const onWater = player.isOnWater();
            const baseSpeed = onWater ? player.baseWaterSpeed : player.baseLandSpeed;
            
            this.log('=== MOVEMENT SPEED INFO ===', 'info');
            this.log(`Current terrain: ${onWater ? 'WATER' : 'LAND'}`, 'info');
            this.log(`Base ${onWater ? 'water' : 'land'} speed: ${baseSpeed} tiles/sec`, 'info');
            
            // Show skill bonuses
            if (onWater) {
                const sailingLevel = window.skills ? skills.getLevel('sailing') : 1;
                const sailingBonus = 1 + (sailingLevel - 1) * 0.025;
                this.log(`Sailing bonus (Lv ${sailingLevel}): x${sailingBonus.toFixed(2)}`, 'info');
            } else {
                const agilityLevel = window.skills ? skills.getLevel('agility') : 1;
                const agilityBonus = 1 + (agilityLevel - 1) * 0.025;
                this.log(`Agility bonus (Lv ${agilityLevel}): x${agilityBonus.toFixed(2)}`, 'info');
            }
            
            this.log(`Dev multiplier: x${player.speedMultiplier}`, 'info');
            this.log(`Final speed: ${currentSpeed.toFixed(1)} tiles/sec`, 'success');
        } else {
            this.log(`Speed multiplier: ${this.speedModifiers.playerSpeed}x`, 'info');
        }
        this.log('', 'info');
        this.log('Usage: playerspeed <multiplier> - Set speed multiplier', 'info');
        this.log('       playerspeed land <speed> - Set base land speed', 'info');
        this.log('       playerspeed water <speed> - Set base water speed', 'info');
        return;
    }
    
    // Check for land/water specific commands
    if (args.length === 2 && (args[0] === 'land' || args[0] === 'water')) {
        const type = args[0];
        const speed = this.parseFloatArg(args[1], `${type} speed`, 0.1, 100);
        if (speed === null) return;
        
        if (!window.player) {
            this.log('Player not initialized yet', 'error');
            return;
        }
        
        if (type === 'land') {
            player.baseLandSpeed = speed;
            this.log(`Base land speed set to ${speed} tiles/sec`, 'success');
        } else {
            player.baseWaterSpeed = speed;
            this.log(`Base water speed set to ${speed} tiles/sec`, 'success');
        }
        
        const currentSpeed = player.getMovementSpeed();
        this.log(`Current speed: ${currentSpeed.toFixed(1)} tiles/sec on ${player.isOnWater() ? 'water' : 'land'}`, 'info');
        return;
    }
    
    // Regular multiplier command
    const multiplier = this.parseFloatArg(args[0], 'Multiplier', 0.1, 100);
    if (multiplier === null) return;
    
    this.speedModifiers.playerSpeed = multiplier;
    
    // Apply to player if exists
    if (window.player) {
        player.speedMultiplier = multiplier;
        
        const currentSpeed = player.getMovementSpeed();
        this.log(`Speed multiplier set to ${multiplier}x`, 'success');
        this.log(`Current speed: ${currentSpeed.toFixed(1)} tiles/sec on ${player.isOnWater() ? 'water' : 'land'}`, 'info');
    } else {
        this.log(`Speed multiplier set to ${multiplier}x (will apply when player loads)`, 'success');
    }
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
        this.speedModifiers.playerSpeed = 10; // 10x multiplier
        this.speedModifiers.actionDuration = 0.01; // 100x faster actions
        
        if (window.player) {
            player.speedMultiplier = 10;
            
            // Also boost base speeds for extreme testing
            player.baseLandSpeed = 5;  // Up from 3
            player.baseWaterSpeed = 8; // Up from 5
        }
        
        // Apply action speed
        this.cmdActionSpeed(['0.01']);
        
        this.log('=== TEST MODE ENABLED ===', 'success');
        this.log('Movement changes:', 'info');
        this.log('  - Speed multiplier: 10x', 'info');
        this.log('  - Base land speed: 5 tiles/sec', 'info');
        this.log('  - Base water speed: 8 tiles/sec', 'info');
        
        if (window.player) {
            const currentSpeed = player.getMovementSpeed();
            const terrain = player.isOnWater() ? 'water' : 'land';
            this.log(`  - Current speed: ${currentSpeed.toFixed(1)} tiles/sec on ${terrain}`, 'success');
        }
        
        this.log('Action changes:', 'info');
        this.log('  - Actions: 100x faster', 'info');
    } else {
        // Reset to defaults
        this.cmdResetSpeeds();
    }
}

    cmdResetSpeeds() {
    this.speedModifiers.playerSpeed = this.speedModifiers.defaultPlayerSpeed;
    this.speedModifiers.actionDuration = this.speedModifiers.defaultActionDuration;
    
    if (window.player) {
        // Reset all movement values to defaults
        player.speedMultiplier = 1;
        player.baseLandSpeed = 3;
        player.baseWaterSpeed = 5;
        
        const currentSpeed = player.getMovementSpeed();
        const terrain = player.isOnWater() ? 'water' : 'land';
        
        this.log('=== SPEEDS RESET TO DEFAULT ===', 'success');
        this.log(`Base land speed: 3 tiles/sec`, 'info');
        this.log(`Base water speed: 5 tiles/sec`, 'info');
        this.log(`Speed multiplier: 1x`, 'info');
        this.log(`Current speed: ${currentSpeed.toFixed(1)} tiles/sec on ${terrain}`, 'info');
    } else {
        this.log('All speeds reset to default', 'success');
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
}

    // ==================== SKILL COMMANDS ====================

    cmdSetLevel(args) {
        if (args.length !== 2) {
            this.log('Usage: setlevel <skill> <level>', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const level = this.parseIntArg(args[1], 'Level', 1, 99);
        if (level === null) return;
        
        const targetXp = getXpForLevel(level);
        const skill = skills.skills[skillId];
        if (skill) {
            skill.xp = targetXp;
            skill.level = level;
            skill.xpForNextLevel = getXpForLevel(level + 1);
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
        
        const actualGained = skills.addXp(skillId, amount);
        
        // Update speed bonuses after adding XP
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log(`Added ${formatNumber(actualGained)} XP to ${skillId}`, 'success');
        
        const skill = skills.skills[skillId];
        this.log(`${skillId} is now level ${skill.level} with ${formatNumber(Math.floor(skill.xp))} XP`, 'info');
    }

    cmdMaxSkills() {
        if (!this.requireSystem('Skills', 'skills')) return;
        
        for (const skillId of Object.keys(skills.skills)) {
            const skill = skills.skills[skillId];
            skill.xp = getXpForLevel(99);
            skill.level = 99;
            skill.xpForNextLevel = getXpForLevel(100);
        }
        
        // Update speed bonuses after maxing skills
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log('All skills set to level 99', 'success');
    }

    cmdMaxAllXp() {
        if (!this.requireSystem('Skills', 'skills')) return;
        
        for (const skillId of Object.keys(skills.skills)) {
            const skill = skills.skills[skillId];
            skill.xp = 200000000;
            skill.level = 99;
            skill.xpForNextLevel = 200000000;
        }
        
        // Update speed bonuses
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
        
        if (window.ui) ui.updateSkillsList();
        this.log('All skills set to 200M XP', 'success');
    }

    cmdSkillStats(args) {
        if (!this.requireSystem('Skills', 'skills')) return;
        
        if (args.length > 0) {
            const skillId = this.validateSkill(args[0]);
            if (!skillId) return;
            
            const skill = skills.skills[skillId];
            this.log(`=== ${skill.name.toUpperCase()} STATS ===`, 'info');
            this.log(`Level: ${skill.level}`, 'info');
            this.log(`XP: ${formatNumber(Math.floor(skill.xp))}`, 'info');
            
            if (skill.level < 99) {
                const nextLevel = getXpForLevel(skill.level + 1);
                const xpToNext = nextLevel - skill.xp;
                this.log(`XP to next level: ${formatNumber(Math.floor(xpToNext))}`, 'info');
            }
            
            // Show speed bonuses
            if (window.runeCreditManager) {
                const speedBonus = runeCreditManager.getSkillSpeedBonus(skillId);
                if (speedBonus > 0) {
                    this.log(`Speed bonus: +${Math.round(speedBonus * 100)}%`, 'info');
                }
            }
        } else {
            // Show overall stats
            this.log('=== SKILL STATISTICS ===', 'info');
            this.log(`Total Level: ${skills.getTotalLevel()}`, 'info');
            this.log(`Combat Level: ${skills.getCombatLevel()}`, 'info');
            
            let totalXp = 0;
            let maxedSkills = 0;
            let maxXpSkills = 0;
            
            for (const skill of Object.values(skills.skills)) {
                totalXp += Math.floor(skill.xp);
                if (skill.level >= 99) maxedSkills++;
                if (skill.xp >= 200000000) maxXpSkills++;
            }
            
            this.log(`Total XP: ${formatNumber(totalXp)}`, 'info');
            this.log(`Skills at 99: ${maxedSkills}/${Object.keys(skills.skills).length}`, 'info');
            this.log(`Skills at 200M XP: ${maxXpSkills}/${Object.keys(skills.skills).length}`, 'info');
        }
    }

    // ==================== INVENTORY & BANK COMMANDS ====================

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
        
        if (added < quantity) {
            this.log(`Only ${added} of ${quantity} added (inventory full)`, 'warn');
        }
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
    const itemData = items[itemId];
    
    // Check if this is a noted item
    if (itemData.category === 'note') {
        this.log(`Cannot add noted items directly to bank. Notes must be deposited from inventory.`, 'error');
        this.log(`Use "give ${itemId} ${quantity}" to add to inventory first`, 'info');
        return;
    }
    
    bank.deposit(itemId, quantity);
    this.log(`Added ${quantity} ${itemData.name} to bank`, 'success');
}

    cmdClearBank() {
        if (!this.requireSystem('Bank', 'bank')) return;
        
        bank.items = {};
        if (window.ui) ui.updateBank();
        this.log('Bank cleared', 'success');
    }

    cmdGiveAll(args) {
    if (!this.requireSystem('Bank', 'bank')) return;
    
    const quantity = args.length > 0 ? this.parseIntArg(args[0], 'Quantity', 1) : 100;
    if (quantity === null) return;
    
    const items = loadingManager.getData('items');
    let count = 0;
    let skipped = 0;
    
    for (const [itemId, itemData] of Object.entries(items)) {
        // Skip noted items
        if (itemData.category === 'note') {
            skipped++;
            continue;
        }
        bank.deposit(itemId, quantity);
        count++;
    }
    
    this.log(`Added ${quantity} of each item to bank (${count} items)`, 'success');
    if (skipped > 0) {
        this.log(`Skipped ${skipped} noted items`, 'info');
    }
}

    cmdBankStats() {
        if (!this.requireSystem('Bank', 'bank')) return;
        
        this.log('=== BANK STATISTICS ===', 'info');
        this.log(`Unique items: ${bank.getUniqueItems()}`, 'info');
        this.log(`Total items: ${formatNumber(bank.getTotalItems())}`, 'info');
        
        // Show top 5 items by quantity
        const items = Object.entries(bank.items).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (items.length > 0) {
            this.log('', 'info');
            this.log('Top items by quantity:', 'info');
            const itemsData = loadingManager.getData('items');
            for (const [itemId, quantity] of items) {
                const itemName = itemsData[itemId]?.name || itemId;
                this.log(`  ${itemName}: ${formatNumber(quantity)}`, 'info');
            }
        }
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
        
        // Current task
        if (taskManager.currentTask) {
            const task = taskManager.currentTask;
            const progressText = `${Math.floor(task.progress * task.targetCount)}/${task.targetCount}`;
            const percentage = Math.floor(task.progress * 100);
            
            this.log(`CURRENT: ${task.description} - ${progressText} (${percentage}%)`, 
                task.progress >= 1 ? 'success' : 'command');
        }
        
        // Next task
        if (taskManager.nextTask) {
            this.log(`NEXT: ${taskManager.nextTask.description}`, 'info');
        }
        
        // Regular tasks
        if (taskManager.tasks.length > 0) {
            this.log('', 'info');
            this.log('Rerollable tasks:', 'info');
            taskManager.tasks.forEach((task, index) => {
                this.log(`  #${index + 1}: ${task.description}`, 'info');
            });
        }
        
        // Show AI status
        if (window.ai && window.ai.currentTask) {
            this.log('', 'info');
            this.log(`AI working on: ${window.ai.currentTask.description}`, 'info');
        }
    }

    cmdCompleteCurrentTask() {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        if (!taskManager.currentTask) {
            this.log('No current task to complete', 'error');
            return;
        }
        
        const task = taskManager.currentTask;
        
        // Set progress to complete
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
            if (!taskManager.currentTask) {
                break;
            }
            
            // Complete current task
            taskManager.setTaskProgress(taskManager.currentTask, 1);
            completed++;
        }
        
        this.log(`Completed ${completed} tasks`, 'success');
        
        if (window.runeCreditManager) {
            this.log(`Total RuneCred: ${runeCreditManager.runecred}`, 'info');
        }
        
        // Update UI
        if (window.ui) {
            window.ui.updateTasks();
        }
    }

    cmdRerollTask(args) {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        if (args.length !== 1) {
            this.log('Usage: rerolltask <index> (1-5)', 'error');
            return;
        }
        
        const index = this.parseIntArg(args[0], 'Task index', 1, taskManager.tasks.length);
        if (index === null) return;
        
        const taskIndex = index - 1;
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
        
        taskManager.generateNewTasks();
        this.log('Generated new batch of tasks', 'success');
    }

    cmdTaskStats() {
        if (!this.requireSystem('Task Manager', 'taskManager')) return;
        
        this.log('=== TASK STATISTICS ===', 'info');
        
        const completed = taskManager.getCompletedTasks();
        this.log(`Tasks completed: ${completed.length}`, 'info');
        
        if (completed.length > 0) {
            // Count by skill
            const bySkill = {};
            for (const task of completed) {
                if (!bySkill[task.skill]) bySkill[task.skill] = 0;
                bySkill[task.skill]++;
            }
            
            this.log('', 'info');
            this.log('Completed by skill:', 'info');
            for (const [skill, count] of Object.entries(bySkill)) {
                this.log(`  ${skill}: ${count}`, 'info');
            }
            
            // Show last 5 completed
            this.log('', 'info');
            this.log('Recently completed:', 'info');
            const recent = completed.slice(-5).reverse();
            for (const task of recent) {
                this.log(`  - ${task.description}`, 'info');
            }
        }
    }

    // ==================== RUNECRED COMMANDS ====================

    cmdRuneCred(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            this.log(`Current RuneCred: ${runeCreditManager.runecred}`, 'info');
            return;
        }
        
        const amount = this.parseIntArg(args[0], 'Amount', 0, 1000000);
        if (amount === null) return;
        
        runeCreditManager.runecred = amount;
        runeCreditManager.saveData();
        this.log(`Set RuneCred to ${amount}`, 'success');
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
    }

    cmdSkillCred(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            const available = runeCreditManager.getAvailableSkillCred();
            const total = runeCreditManager.skillCred;
            this.log(`Skill Cred: ${available}/${total} (${runeCreditManager.skillCredSpent} spent)`, 'info');
            return;
        }
        
        const spent = this.parseIntArg(args[0], 'Spent amount', 0, 10000);
        if (spent === null) return;
        
        runeCreditManager.skillCredSpent = spent;
        runeCreditManager.saveData();
        
        const available = runeCreditManager.getAvailableSkillCred();
        const total = runeCreditManager.skillCred;
        this.log(`Set Skill Cred spent to ${spent} (${available}/${total} available)`, 'success');
    }

    cmdSkillCredits(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length < 1) {
            this.log('Usage: skillcredits <skill> [amount]', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        if (args.length === 1) {
            const credits = runeCreditManager.getSkillCredits(skillId);
            const name = runeCreditManager.getSkillCredName(skillId);
            this.log(`${name}: ${credits}`, 'info');
            return;
        }
        
        const amount = this.parseIntArg(args[1], 'Amount', 0, 10000);
        if (amount === null) return;
        
        runeCreditManager.skillCredits[skillId] = amount;
        runeCreditManager.saveData();
        
        const name = runeCreditManager.getSkillCredName(skillId);
        this.log(`Set ${name} to ${amount}`, 'success');
    }

    cmdRuneCreditStatus(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length === 0) {
            // Show overall status
            this.log('=== RUNECRED STATUS ===', 'info');
            this.log(`RuneCred: ${runeCreditManager.runecred}`, 'info');
            
            const availableSkillCred = runeCreditManager.getAvailableSkillCred();
            const totalSkillCred = runeCreditManager.skillCred;
            this.log(`Skill Cred: ${availableSkillCred}/${totalSkillCred}`, 'info');
            
            this.log(`Tasks completed: ${runeCreditManager.totalTasksCompleted}`, 'info');
            this.log(`Persistence: ${runeCreditManager.enablePersistence ? 'ENABLED' : 'DISABLED'}`, 'info');
            
            // Show skills with credits
            this.log('', 'info');
            this.log('Skill-specific credits:', 'info');
            for (const [skillId, credits] of Object.entries(runeCreditManager.skillCredits)) {
                if (credits > 10) { // Only show if more than starting amount
                    const name = runeCreditManager.getSkillCredName(skillId);
                    this.log(`  ${name}: ${credits}`, 'info');
                }
            }
            
            // Show modified weights
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
            
            // Skill credits
            const credits = runeCreditManager.getSkillCredits(skillId);
            const credName = runeCreditManager.getSkillCredName(skillId);
            this.log(`${credName}: ${credits}`, 'info');
            
            // Skill weight
            const skillLevel = runeCreditManager.skillModLevels[skillId] || 0;
            const skillWeight = runeCreditManager.getSkillWeight(skillId);
            this.log(`Skill weight: Level ${skillLevel} (${skillWeight.toFixed(2)}x)`, 'info');
            
            // Speed bonus
            const speedBonus = runeCreditManager.getSkillSpeedBonus(skillId);
            this.log(`Speed bonus: +${Math.round(speedBonus * 100)}%`, 'info');
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
        
        // Reset all data
        runeCreditManager.runecred = 5;
        runeCreditManager.skillCredSpent = 0;
        runeCreditManager.totalTasksCompleted = 0;
        
        // Reset all skills to starting credits
        for (const skillId of Object.keys(runeCreditManager.skillCredits)) {
            runeCreditManager.skillCredits[skillId] = 10;
            runeCreditManager.skillModLevels[skillId] = 0;
            runeCreditManager.taskModLevels[skillId] = {};
            runeCreditManager.nodeModLevels[skillId] = {};
            runeCreditManager.quantityModLevels[skillId] = {};
        }
        
        // Update and save
        runeCreditManager.updateSkillCred();
        runeCreditManager.saveData();
        
        this.log('All RuneCred data reset to defaults', 'success');
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
        
        // Set directly without cost
        runeCreditManager.skillModLevels[skillId] = level;
        const weight = runeCreditManager.getSkillWeight(skillId);
        
        runeCreditManager.saveData();
        this.log(`Set ${skillId} weight to level ${level} (${weight.toFixed(2)}x)`, 'success');
    }

    // ==================== PET COMMANDS ====================

    cmdPet(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length < 1) {
            this.log('Usage: pet <skill> [shiny] [count]', 'error');
            return;
        }
        
        const skillId = this.validateSkill(args[0]);
        if (!skillId) return;
        
        const isShiny = args[1] && args[1].toLowerCase() === 'shiny';
        const countArg = isShiny ? args[2] : args[1];
        const count = countArg ? this.parseIntArg(countArg, 'Count', 1, 100) : 1;
        if (count === null) return;
        
        // Initialize if needed
        if (!runeCreditManager.petCounts[skillId]) {
            runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
        }
        
        if (isShiny) {
            runeCreditManager.petCounts[skillId].shiny += count;
            runeCreditManager.totalShinyPetsObtained += count;
            runeCreditManager.totalPetsObtained += count;
            runeCreditManager.speedBonuses.shinyPets[skillId] = true;
            this.log(`Granted ${count} shiny ${skillId} pet(s) (+10% speed)`, 'success');
        } else {
            runeCreditManager.petCounts[skillId].regular += count;
            runeCreditManager.totalPetsObtained += count;
            runeCreditManager.speedBonuses.pets[skillId] = true;
            this.log(`Granted ${count} ${skillId} pet(s) (+5% speed)`, 'success');
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
        
        // Reset pet counts
        if (runeCreditManager.petCounts[skillId]) {
            const counts = runeCreditManager.petCounts[skillId];
            runeCreditManager.totalPetsObtained -= (counts.regular + counts.shiny);
            runeCreditManager.totalShinyPetsObtained -= counts.shiny;
            runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
        }
        
        runeCreditManager.speedBonuses.pets[skillId] = false;
        runeCreditManager.speedBonuses.shinyPets[skillId] = false;
        
        runeCreditManager.saveData();
        this.log(`Removed all pets for ${skillId}`, 'success');
    }

    cmdAllPets(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        const isShiny = args[0] && args[0].toLowerCase() === 'shiny';
        
        for (const skillId of Object.keys(runeCreditManager.speedBonuses.pets)) {
            // Initialize if needed
            if (!runeCreditManager.petCounts[skillId]) {
                runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
            }
            
            if (isShiny) {
                runeCreditManager.petCounts[skillId].shiny = 1;
                runeCreditManager.speedBonuses.shinyPets[skillId] = true;
                runeCreditManager.speedBonuses.pets[skillId] = false;
            } else {
                runeCreditManager.petCounts[skillId].regular = 1;
                runeCreditManager.speedBonuses.pets[skillId] = true;
                runeCreditManager.speedBonuses.shinyPets[skillId] = false;
            }
        }
        
        // Recalculate totals
        runeCreditManager.totalPetsObtained = 0;
        runeCreditManager.totalShinyPetsObtained = 0;
        for (const counts of Object.values(runeCreditManager.petCounts)) {
            runeCreditManager.totalPetsObtained += counts.regular + counts.shiny;
            runeCreditManager.totalShinyPetsObtained += counts.shiny;
        }
        
        runeCreditManager.saveData();
        this.log(`Granted all ${isShiny ? 'shiny ' : ''}pets`, 'success');
    }

    cmdPetStats(args) {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        if (args.length > 0) {
            const skillId = this.validateSkill(args[0]);
            if (!skillId) return;
            
            const stats = runeCreditManager.getPetStats(skillId);
            this.log(`=== ${skillId.toUpperCase()} PET STATS ===`, 'info');
            this.log(`Regular pets: ${stats.regular}`, 'info');
            this.log(`Shiny pets: ${stats.shiny}`, 'info');
            this.log(`Total: ${stats.total}`, 'info');
            
            if (runeCreditManager.speedBonuses.shinyPets[skillId]) {
                this.log('Speed bonus: +10% (shiny)', 'info');
            } else if (runeCreditManager.speedBonuses.pets[skillId]) {
                this.log('Speed bonus: +5% (regular)', 'info');
            }
        } else {
            const stats = runeCreditManager.getGlobalPetStats();
            this.log('=== GLOBAL PET STATS ===', 'info');
            this.log(`Total pets obtained: ${stats.total}`, 'info');
            this.log(`Regular pets: ${stats.regular}`, 'info');
            this.log(`Shiny pets: ${stats.shiny}`, 'info');
            
            // List skills with pets
            const skillsWithPets = [];
            for (const [skillId, counts] of Object.entries(runeCreditManager.petCounts)) {
                if (counts.regular > 0 || counts.shiny > 0) {
                    skillsWithPets.push(`${skillId} (${counts.regular}R/${counts.shiny}S)`);
                }
            }
            
            if (skillsWithPets.length > 0) {
                this.log('', 'info');
                this.log('Skills with pets:', 'info');
                this.log('  ' + skillsWithPets.join(', '), 'info');
            }
        }
    }

    // ==================== CLUE COMMANDS ====================

    cmdClue(args) {
        if (!window.clueManager) {
            this.log('Clue manager not initialized', 'error');
            return;
        }
        
        if (args.length !== 1) {
            this.log('Usage: clue <tier> (easy/medium/hard/elite/master)', 'error');
            return;
        }
        
        const tier = args[0].toLowerCase();
        const validTiers = ['easy', 'medium', 'hard', 'elite', 'master'];
        
        if (!validTiers.includes(tier)) {
            this.log(`Invalid tier: ${tier}`, 'error');
            this.log('Valid tiers: easy, medium, hard, elite, master', 'info');
            return;
        }
        
        // Check if player already has this tier
        if (clueManager.hasClue(tier)) {
            this.log(`You already have a ${tier} clue scroll!`, 'error');
            this.log('Complete or drop the existing one first', 'info');
            return;
        }
        
        // Generate the clue (simulates getting it from an activity)
        clueManager.generateClue(tier);
        
        const config = clueManager.CLUE_CONFIG[tier];
        this.log(`${config.itemName} obtained!`, 'success');
        
        // Show the steps
        const clueData = clueManager.getClueData(tier);
        if (clueData) {
            this.log(`Steps required (${clueData.steps.length}):`, 'info');
            for (const nodeId of clueData.steps) {
                const node = window.nodes ? nodes.getNode(nodeId) : null;
                const nodeName = node ? node.name : nodeId;
                this.log(`  - ${nodeName}`, 'info');
            }
        }
        
        // Update UI if bank is open
        if (window.ui && ui.bankOpen) {
            ui.updateBank();
        }
    }

    cmdForceClue(args) {
        if (!window.clueManager) {
            this.log('Clue manager not initialized', 'error');
            return;
        }
        
        if (args.length !== 1) {
            this.log('Usage: forceclue <tier>', 'error');
            return;
        }
        
        const tier = args[0].toLowerCase();
        const validTiers = ['easy', 'medium', 'hard', 'elite', 'master'];
        
        if (!validTiers.includes(tier)) {
            this.log(`Invalid tier: ${tier}`, 'error');
            this.log('Valid tiers: easy, medium, hard, elite, master', 'info');
            return;
        }
        
        // Check if player already has this tier
        if (clueManager.hasClue(tier)) {
            this.log(`You already have a ${tier} clue scroll!`, 'error');
            return;
        }
        
        // Store original drop rate
        const originalDropRate = clueManager.CLUE_CONFIG[tier].dropRate;
        
        // Temporarily set drop rate to 100% for this tier
        clueManager.CLUE_CONFIG[tier].dropRate = 1;
        
        this.log(`Next activity completion will drop a ${tier} clue scroll`, 'success');
        
        // Restore original drop rate after a short delay to ensure it applies
        setTimeout(() => {
            clueManager.CLUE_CONFIG[tier].dropRate = originalDropRate;
        }, 100);
    }

    cmdClueStats() {
        if (!window.clueManager) {
            this.log('Clue manager not initialized', 'error');
            return;
        }
        
        this.log('=== CLUE SCROLL STATISTICS ===', 'info');
        
        // Show drop rates
        this.log('', 'info');
        this.log('Drop rates:', 'info');
        for (const [tier, config] of Object.entries(clueManager.CLUE_CONFIG)) {
            const dropRate = config.dropRate;
            const oneIn = Math.round(1 / dropRate);
            this.log(`  ${tier}: 1/${oneIn} (${(dropRate * 100).toFixed(2)}%)`, 'info');
        }
        
        // Show active clues
        const activeClues = Object.keys(clueManager.clues);
        if (activeClues.length > 0) {
            this.log('', 'info');
            this.log('Active clues:', 'info');
            
            for (const tier of activeClues) {
                const clueData = clueManager.getClueData(tier);
                if (clueData) {
                    const completed = clueData.completed.filter(c => c).length;
                    const total = clueData.steps.length;
                    const isComplete = clueManager.isClueComplete(tier);
                    
                    let status = `${completed}/${total} steps`;
                    if (isComplete) {
                        status = 'COMPLETE - Click in bank for casket';
                    }
                    
                    this.log(`  ${tier}: ${status}`, isComplete ? 'success' : 'info');
                    
                    // Show steps
                    for (let i = 0; i < clueData.steps.length; i++) {
                        const nodeId = clueData.steps[i];
                        const node = window.nodes ? nodes.getNode(nodeId) : null;
                        const nodeName = node ? node.name : nodeId;
                        const icon = clueData.completed[i] ? '✓' : '✗';
                        this.log(`    ${icon} ${nodeName}`, 'info');
                    }
                }
            }
        } else {
            this.log('', 'info');
            this.log('No active clues', 'info');
        }
        
        // Show clues in bank
        if (window.bank) {
            const cluesInBank = [];
            const casketsInBank = [];
            
            for (const itemId of Object.keys(bank.items)) {
                if (itemId.startsWith('_clue')) {
                    cluesInBank.push(itemId);
                } else if (itemId.startsWith('_casket')) {
                    casketsInBank.push(itemId);
                }
            }
            
            if (cluesInBank.length > 0) {
                this.log('', 'info');
                this.log('Clues in bank:', 'info');
                for (const itemId of cluesInBank) {
                    const quantity = bank.getItemCount(itemId);
                    const tier = itemId.replace('_clue', '');
                    this.log(`  ${tier} clue: ${quantity}`, 'info');
                }
            }
            
            if (casketsInBank.length > 0) {
                this.log('', 'info');
                this.log('Caskets in bank:', 'info');
                for (const itemId of casketsInBank) {
                    const quantity = bank.getItemCount(itemId);
                    const tier = itemId.replace('_casket', '');
                    this.log(`  ${tier} casket: ${quantity}`, 'info');
                }
            }
        }
    }

    // ==================== CAPE COMMANDS ====================

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
                skill.xpForNextLevel = 200000000;
            }
            runeCreditManager.speedBonuses.trimmedCapes[skillId] = true;
            runeCreditManager.speedBonuses.skillCapes[skillId] = true;
            this.log(`Granted trimmed cape for ${skillId} (+10% speed)`, 'success');
        } else {
            // Set skill to 99 for regular cape
            const skill = skills.skills[skillId];
            if (skill) {
                skill.xp = getXpForLevel(99);
                skill.level = 99;
                skill.xpForNextLevel = getXpForLevel(100);
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
                    skill.xpForNextLevel = 200000000;
                }
            } else {
                // Set to level 99
                const skill = skills.skills[skillId];
                if (skill) {
                    skill.xp = getXpForLevel(99);
                    skill.level = 99;
                    skill.xpForNextLevel = getXpForLevel(100);
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
            const hasTrimmedMaxCape = runeCreditManager.speedBonuses.trimmedMaxCape;
            
            if (hasTrimmedMaxCape) {
                this.log('Max cape: TRIMMED (+10% global speed)', 'info');
            } else if (hasMaxCape) {
                this.log('Max cape: OWNED (+5% global speed)', 'info');
            } else {
                this.log('Max cape: NOT OWNED', 'info');
            }
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
            runeCreditManager.speedBonuses.trimmedMaxCape = false;
            this.log('Removed max cape', 'success');
        }
        
        runeCreditManager.saveData();
    }

    cmdCapeStats() {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        this.log('=== CAPE OWNERSHIP ===', 'info');
        
        let regularCapes = 0;
        let trimmedCapes = 0;
        
        for (const skillId of Object.keys(skills.skills)) {
            if (runeCreditManager.speedBonuses.trimmedCapes[skillId]) {
                trimmedCapes++;
            } else if (runeCreditManager.speedBonuses.skillCapes[skillId]) {
                regularCapes++;
            }
        }
        
        this.log(`Regular skill capes: ${regularCapes}`, 'info');
        this.log(`Trimmed skill capes: ${trimmedCapes}`, 'info');
        
        if (runeCreditManager.speedBonuses.trimmedMaxCape) {
            this.log('Max cape: TRIMMED', 'info');
        } else if (runeCreditManager.speedBonuses.maxCape) {
            this.log('Max cape: REGULAR', 'info');
        } else {
            this.log('Max cape: NOT OWNED', 'info');
        }
        
        // List skills with capes
        const withCapes = [];
        const withTrimmed = [];
        
        for (const skillId of Object.keys(skills.skills)) {
            if (runeCreditManager.speedBonuses.trimmedCapes[skillId]) {
                withTrimmed.push(skillId);
            } else if (runeCreditManager.speedBonuses.skillCapes[skillId]) {
                withCapes.push(skillId);
            }
        }
        
        if (withTrimmed.length > 0) {
            this.log('', 'info');
            this.log('Trimmed capes:', 'info');
            this.log('  ' + withTrimmed.join(', '), 'info');
        }
        
        if (withCapes.length > 0) {
            this.log('', 'info');
            this.log('Regular capes:', 'info');
            this.log('  ' + withCapes.join(', '), 'info');
        }
    }

    // ==================== SPEED BONUS COMMANDS ====================

    cmdSpeedBonuses() {
        if (!this.requireSystem('RuneCred Manager', 'runeCreditManager')) return;
        
        this.log('=== SPEED BONUSES ===', 'info');
        
        // Global bonuses
        if (runeCreditManager.speedBonuses.trimmedMaxCape) {
            this.log('Trimmed Max Cape: +10% global bonus', 'info');
        } else if (runeCreditManager.speedBonuses.maxCape) {
            this.log('Max Cape: +5% global bonus', 'info');
        }
        
        // Per-skill bonuses
        const skillBonuses = [];
        
        for (const skillId of Object.keys(skills.skills)) {
            const bonuses = [];
            let totalBonus = 0;
            
            if (runeCreditManager.speedBonuses.shinyPets[skillId]) {
                bonuses.push('Shiny Pet (+10%)');
                totalBonus += 0.10;
            } else if (runeCreditManager.speedBonuses.pets[skillId]) {
                bonuses.push('Pet (+5%)');
                totalBonus += 0.05;
            }
            
            if (runeCreditManager.speedBonuses.trimmedCapes[skillId]) {
                bonuses.push('Trimmed Cape (+10%)');
                totalBonus += 0.10;
            } else if (runeCreditManager.speedBonuses.skillCapes[skillId]) {
                bonuses.push('Cape (+5%)');
                totalBonus += 0.05;
            }
            
            if (bonuses.length > 0) {
                skillBonuses.push({
                    skill: skillId,
                    bonuses: bonuses,
                    total: totalBonus
                });
            }
        }
        
        if (skillBonuses.length > 0) {
            this.log('', 'info');
            this.log('Per-skill bonuses:', 'info');
            for (const info of skillBonuses) {
                this.log(`  ${info.skill}: ${info.bonuses.join(', ')} = +${Math.round(info.total * 100)}%`, 'info');
            }
        }
        
        // Skills without bonuses
        const withoutBonuses = Object.keys(skills.skills).filter(skillId => {
            return !runeCreditManager.speedBonuses.pets[skillId] &&
                   !runeCreditManager.speedBonuses.shinyPets[skillId] &&
                   !runeCreditManager.speedBonuses.skillCapes[skillId] &&
                   !runeCreditManager.speedBonuses.trimmedCapes[skillId];
        });
        
        if (withoutBonuses.length > 0) {
            this.log('', 'info');
            this.log('Skills without bonuses: ' + withoutBonuses.join(', '), 'info');
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
            
            // Reset pet counts
            runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
        }
        runeCreditManager.speedBonuses.maxCape = false;
        runeCreditManager.speedBonuses.trimmedMaxCape = false;
        
        // Reset pet totals
        runeCreditManager.totalPetsObtained = 0;
        runeCreditManager.totalShinyPetsObtained = 0;
        
        // Update based on current skill levels
        runeCreditManager.updateSpeedBonuses();
        runeCreditManager.saveData();
        
        this.log('All speed bonuses reset', 'success');
    }

    // ==================== AI COMMANDS ====================

    cmdPauseAI() {
        if (!this.requireSystem('Game', 'gameState')) return;
        
        gameState.paused = !gameState.paused;
        const pauseBtn = document.getElementById('pause-toggle');
        if (pauseBtn) {
            const icon = pauseBtn.querySelector('.pause-icon');
            if (icon) {
                icon.textContent = gameState.paused ? '▶' : '⏸';
                pauseBtn.title = gameState.paused ? 'Resume AI' : 'Pause AI';
            }
        }
        this.log(`AI ${gameState.paused ? 'paused' : 'resumed'}`, 'success');
    }

    cmdAIStart() {
        if (!this.requireSystem('Game', 'gameState')) return;
        
        gameState.paused = false;
        const pauseBtn = document.getElementById('pause-toggle');
        if (pauseBtn) {
            const icon = pauseBtn.querySelector('.pause-icon');
            if (icon) {
                icon.textContent = '⏸';
                pauseBtn.title = 'Pause AI';
            }
        }
        this.log('AI started', 'success');
    }

    cmdAIStop() {
        if (!this.requireSystem('Game', 'gameState')) return;
        
        gameState.paused = true;
        const pauseBtn = document.getElementById('pause-toggle');
        if (pauseBtn) {
            const icon = pauseBtn.querySelector('.pause-icon');
            if (icon) {
                icon.textContent = '▶';
                pauseBtn.title = 'Resume AI';
            }
        }
        this.log('AI stopped', 'success');
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
            this.log('Current Task: None', 'info');
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
            } else if (player.isBanking) {
                this.log('Status: Banking', 'info');
            } else {
                this.log('Status: Idle', 'info');
            }
            
            this.log(`Current Node: ${player.currentNode || 'none'}`, 'info');
            this.log(`Inventory: ${inventory.getUsedSlots()}/${inventory.maxSlots} slots`, 'info');
        }
        
        // Decision cooldown
        this.log('', 'info');
        this.log(`Decision Cooldown: ${Math.floor(ai.decisionCooldown)}ms`, 'info');
    }

    // ==================== ACTIVITY COMMANDS ====================

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
        
        if (player.currentActivity) {
            const activities = loadingManager.getData('activities');
            const activityName = activities[player.currentActivity]?.name || player.currentActivity;
            player.stopActivity();
            this.log(`Stopped activity: ${activityName}`, 'success');
        } else {
            this.log('No activity in progress', 'info');
        }
    }

    // ==================== DEBUG COMMANDS ====================

    cmdNodes(args) {
        const search = args.length > 0 ? args.join(' ').toLowerCase() : '';
        const matches = this.searchData('nodes', search);
        
        if (matches.length === 0) {
            this.log('No nodes found', 'info');
            return;
        }
        
        this.log(`Found ${matches.length} nodes:`, 'info');
        matches.slice(0, 20).forEach(([id, node]) => {
            let info = `  ${id}: ${node.name} (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`;
            if (node.type) info += ` [${node.type}]`;
            this.log(info, 'info');
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
            let info = `  ${id}: ${item.name}`;
            if (item.stackable) info += ' [stackable]';
            this.log(info, 'info');
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

    // ==================== PRESET COMMANDS ====================

    cmdPreset(args) {
        if (args.length !== 1) {
            this.log('Usage: preset <name>', 'error');
            this.log('Available presets: fishing, mining, runecraft, agility, all99', 'info');
            return;
        }
        
        const preset = args[0].toLowerCase();
        
        switch (preset) {
            case 'fishing':
                this.loadFishingPreset();
                break;
            case 'mining':
                this.loadMiningPreset();
                break;
            case 'runecraft':
                this.loadRunecraftPreset();
                break;
            case 'agility':
                this.loadAgilityPreset();
                break;
            case 'all99':
                this.loadAll99Preset();
                break;
            default:
                this.log(`Unknown preset: ${preset}`, 'error');
                this.log('Available presets: fishing, mining, runecraft, agility, all99', 'info');
        }
    }

    loadFishingPreset() {
        this.log('Loading fishing preset...', 'info');
        
        // Set fishing level
        this.cmdSetLevel(['fishing', '50']);
        this.cmdSetLevel(['cooking', '50']);
        
        // Add fishing supplies
        bank.deposit('fishing_bait', 10000);
        bank.deposit('feather', 10000);
        bank.deposit('raw_shrimps', 100);
        bank.deposit('raw_anchovies', 100);
        
        // Teleport to fishing spot
        this.cmdTeleport(['lumbridge_fishing']);
        
        this.log('Fishing preset loaded', 'success');
    }

    loadMiningPreset() {
        this.log('Loading mining preset...', 'info');
        
        // Set mining level
        this.cmdSetLevel(['mining', '50']);
        this.cmdSetLevel(['smithing', '50']);
        
        // Add ores to bank
        bank.deposit('copper_ore', 100);
        bank.deposit('tin_ore', 100);
        bank.deposit('iron_ore', 100);
        
        // Teleport to mining spot
        this.cmdTeleport(['lumbridge_mine']);
        
        this.log('Mining preset loaded', 'success');
    }

    loadRunecraftPreset() {
        this.log('Loading runecraft preset...', 'info');
        
        // Set runecraft level
        this.cmdSetLevel(['runecraft', '50']);
        
        // Add runecraft supplies
        bank.deposit('rune_essence', 10000);
        bank.deposit('small_pouch', 1);
        bank.deposit('medium_pouch', 1);
        bank.deposit('large_pouch', 1);
        bank.deposit('giant_pouch', 1);
        
        // Teleport to bank
        this.cmdTeleport(['lumbridge_bank']);
        
        this.log('Runecraft preset loaded', 'success');
    }

    loadAgilityPreset() {
        this.log('Loading agility preset...', 'info');
        
        // Set agility level
        this.cmdSetLevel(['agility', '50']);
        
        // Teleport to agility course
        this.cmdTeleport(['draynor_rooftop']);
        
        this.log('Agility preset loaded', 'success');
    }

    loadAll99Preset() {
        this.log('Loading all 99 preset...', 'info');
        
        // Max all skills
        this.cmdMaxSkills();
        
        // Add useful items
        bank.deposit('coins', 10000000);
        bank.deposit('fishing_bait', 10000);
        bank.deposit('feather', 10000);
        bank.deposit('rune_essence', 10000);
        
        // Grant max cape
        this.cmdMaxCape(['on']);
        
        this.log('All 99 preset loaded', 'success');
    }

    cmdSaveState(args) {
        if (args.length !== 1) {
            this.log('Usage: save <name>', 'error');
            return;
        }
        
        const name = args[0];
        const state = {
            skills: {},
            inventory: inventory.getAllItems(),
            bank: bank.getAllItems(),
            runecred: runeCreditManager.runecred,
            position: { x: player.position.x, y: player.position.y },
            currentNode: player.currentNode
        };
        
        // Save skill levels
        for (const [id, skill] of Object.entries(skills.skills)) {
            state.skills[id] = {
                level: skill.level,
                xp: skill.xp
            };
        }
        
        localStorage.setItem(`devconsole_state_${name}`, JSON.stringify(state));
        this.log(`State saved as "${name}"`, 'success');
    }

    cmdLoadState(args) {
        if (args.length !== 1) {
            this.log('Usage: load <name>', 'error');
            return;
        }
        
        const name = args[0];
        const saved = localStorage.getItem(`devconsole_state_${name}`);
        
        if (!saved) {
            this.log(`No saved state found with name "${name}"`, 'error');
            return;
        }
        
        const state = JSON.parse(saved);
        
        // Restore skills
        for (const [id, data] of Object.entries(state.skills)) {
            if (skills.skills[id]) {
                skills.skills[id].level = data.level;
                skills.skills[id].xp = data.xp;
                skills.skills[id].xpForNextLevel = getXpForLevel(data.level + 1);
            }
        }
        
        // Restore inventory
        inventory.clear();
        for (const [itemId, quantity] of Object.entries(state.inventory)) {
            inventory.addItem(itemId, quantity);
        }
        
        // Restore bank
        bank.items = {};
        for (const [itemId, quantity] of Object.entries(state.bank)) {
            bank.deposit(itemId, quantity);
        }
        
        // Restore runecred
        if (state.runecred) {
            runeCreditManager.runecred = state.runecred;
        }
        
        // Restore position
        if (state.position) {
            player.position.x = state.position.x;
            player.position.y = state.position.y;
        }
        
        if (state.currentNode) {
            player.currentNode = state.currentNode;
        }
        
        // Update UI
        if (window.ui) {
            ui.updateSkillsList();
            ui.updateInventory();
            ui.updateBank();
        }
        
        this.log(`State "${name}" loaded`, 'success');
    }

    cmdListStates() {
        const states = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('devconsole_state_')) {
                states.push(key.replace('devconsole_state_', ''));
            }
        }
        
        if (states.length === 0) {
            this.log('No saved states found', 'info');
        } else {
            this.log('Saved states:', 'info');
            for (const state of states) {
                this.log(`  - ${state}`, 'info');
            }
        }
    }
}

// Create global instance
window.devConsole = new DevConsole();

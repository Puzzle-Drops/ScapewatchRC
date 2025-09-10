// Game state
window.gameState = {
    running: false,
    paused: false,
    lastTime: 0,
    deltaTime: 0,
    fps: 0,
    frameCount: 0,
    fpsTime: 0,
    isLoggedIn: false  // Added for Firebase
};

// Initialize the game
async function init() {
    // Initialize Firebase first
    firebaseManager.initialize();
    
    // Initialize scaling system early so loading screen is scaled
    scalingSystem.initialize();
    
    // Add assets to load
    loadingManager.addImage('worldMap', 'assets/map.png');
    loadingManager.addImage('collisionMap', 'assets/collision-map.png');
    loadingManager.addImage('playerSprite', 'assets/player-sheet.png');
    loadingManager.addImage('sailSprite', 'assets/sail-sheet.png');
    
    // Add skill icons
    const skillIcons = [
        'agility', 'attack', 'bank', 'combat', 'construction', 'cooking', 
        'crafting', 'defence', 'farming', 'firemaking', 'fishing', 'fletching', 
        'herblore', 'hitpoints', 'hunter', 'magic', 'mining', 'prayer', 
        'quests', 'ranged', 'runecraft', 'sailing', 'skills', 'slayer', 'smithing', 
        'strength', 'thieving', 'woodcutting'
    ];
    
    for (const icon of skillIcons) {
        loadingManager.addImage(`skill_${icon}`, `assets/skills/${icon}.png`);
    }

    loadingManager.addImage('bank_note', 'assets/items/bank_note.png');

    // Add cape and pet images
    const skillsForAssets = [
        'agility', 'attack', 'construction', 'cooking', 
        'crafting', 'defence', 'farming', 'firemaking', 'fishing', 'fletching', 
        'herblore', 'hitpoints', 'hunter', 'magic', 'mining', 'prayer', 
        'ranged', 'runecraft', 'sailing', 'slayer', 'smithing', 
        'strength', 'thieving', 'woodcutting'
    ];

    // Load capes
    for (const skill of skillsForAssets) {
        loadingManager.addImage(`cape_${skill}`, `assets/capes/${skill}_cape.png`);
        loadingManager.addImage(`cape_${skill}_t`, `assets/capes/${skill}_cape(t).png`);
    }

    // Load max capes
    loadingManager.addImage('cape_max', 'assets/capes/max_cape.png');
    loadingManager.addImage('cape_max_t', 'assets/capes/max_cape(t).png');

    // Load pets
    for (const skill of skillsForAssets) {
        loadingManager.addImage(`pet_${skill}`, `assets/pets/${skill}_pet.png`);
        loadingManager.addImage(`pet_${skill}_s`, `assets/pets/${skill}_pet(s).png`);
    }
    
    loadingManager.addJSON('skills', 'data/skills.json');
    loadingManager.addJSON('items', 'data/items.json');
    loadingManager.addJSON('nodes', 'data/nodes.json');
    loadingManager.addJSON('activities', 'data/activities.json');
    loadingManager.addJSON('shop', 'data/shop.json');

    // Set completion callback
    loadingManager.onComplete = () => {
        startGame();
    };

    // Start loading
    try {
        await loadingManager.loadAll();
    } catch (error) {
        console.error('Failed to load game assets:', error);
        document.querySelector('.loading-text').textContent = 'Failed to load game assets. Please refresh.';
    }
}

async function startGame() {
    // Hide loading screen
    document.getElementById('loading-screen').style.display = 'none';
    
    // Initialize dev console BEFORE login check
    if (window.DevConsole) {
        window.devConsole = new DevConsole();
        console.log('Dev console initialized - Press ` (backtick) to open');
    }
    
    // Check if user is logged in
    if (!gameState.isLoggedIn && !firebaseManager.isOfflineMode) {
        // Show login screen
        document.getElementById('login-screen').style.display = 'flex';
        
        // Initialize and start the background map animation
        if (window.loginBackgroundMap) {
            loginBackgroundMap.initialize();
        }
        
        setupAuthHandlers();
        return;
    }
    
    // Continue with game initialization
    continueGameStart();
}

async function continueGameStart() {
    // Stop login background animation if it's running
    if (window.loginBackgroundMap) {
        loginBackgroundMap.stopAnimation();
    }
    
    // Show game container
    document.getElementById('game-container').style.display = 'block';
    
    // Scaling system is already initialized
    scalingSystem.setupInitialScaling();

    // Initialize collision system first
    window.collision = new CollisionSystem();
    await collision.initialize();
    
    // Initialize pathfinding with collision system
    window.pathfinding = new Pathfinding(collision);
    
    // Initialize skill registry before other systems
    await skillRegistry.initialize();
    
    // Initialize game systems (order matters!)
    window.skills = new SkillsManager();
    window.runeCreditManager = new RuneCreditManager();
    window.inventory = new Inventory();
    window.bank = new Bank();
    window.shop = new ShopSystem();
    shop.initialize();
    window.taskManager = new TaskManager();
    window.player = new Player();
    window.nodes = new NodeManager();
    window.map = new MapRenderer();
    window.ui = new UIManager();
    window.ai = new AIManager();

    // Initialize player animation
if (window.playerAnimation) {
    playerAnimation.initialize();
}

// Initialize hi-scores
if (window.hiScoresManager) {
    hiScoresManager.initialize();
}

    // Load saved game data if logged in
if (firebaseManager.currentUser) {
    const loadSuccess = await firebaseManager.loadGame();

    // IMPORTANT: Give AI a grace period after loading
    if (window.ai) {
        ai.decisionCooldown = 2000; // 2 second grace period
    }
    
    // Start auto-save
    firebaseManager.startAutoSave();
    
    // Show account info
    showAccountInfo();
    
    // If no save data or new account, ensure tasks are generated
    if (!loadSuccess) {
        console.log('No save data loaded, generating initial tasks...');
        taskManager.generateInitialTasks();
    }
} else {
    // Offline mode or not logged in - initialize tasks normally
    taskManager.initialize();
}

// Always ensure we have a full task queue
taskManager.ensureFullTaskQueue();

    // Run test scenario if enabled
    if (window.testScenario) {
        testScenario.run();
    }

    // Canvas sizing is handled by scalingSystem
    map.render();

    // Set up pause control with icon toggle
    document.getElementById('pause-toggle').addEventListener('click', () => {
        gameState.paused = !gameState.paused;
        const pauseBtn = document.getElementById('pause-toggle');
        const icon = pauseBtn.querySelector('.pause-icon');
        if (icon) {
            icon.textContent = gameState.paused ? '▶' : '⏸';
            pauseBtn.title = gameState.paused ? 'Resume AI' : 'Pause AI';
        }
    });

    // Set up ESC key handler for closing popups
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            // Check and close popups in priority order (most recent/important first)
            
            // 1. Check Skill Customization overlay (highest priority as it's the most complex)
            if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
                window.skillCustomizationUI.close();
                e.preventDefault();
                return;
            }
            
            // 2. Check Shop modal
            if (window.shop && window.shop.isOpen) {
                window.shop.close();
                e.preventDefault();
                return;
            }
            
            // 3. Check Bank modal
            if (window.ui && window.ui.bankOpen) {
                window.ui.closeBank();
                e.preventDefault();
                return;
            }
        }
    });

    // Start game loop
    gameState.running = true;
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Setup authentication handlers
function setupAuthHandlers() {
    // Tab switching
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            const tabName = e.target.dataset.tab;
            // Hide all forms
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('forgot-form').style.display = 'none';
            
            // Show selected form
            if (tabName === 'login') {
                document.getElementById('login-form').style.display = 'block';
            } else if (tabName === 'signup') {
                document.getElementById('signup-form').style.display = 'block';
            } else if (tabName === 'forgot') {
                document.getElementById('forgot-form').style.display = 'block';
            }
        });
    });
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            document.getElementById('login-error').textContent = '';
            await firebaseManager.login(username, password);
            gameState.isLoggedIn = true;
            document.getElementById('login-screen').style.display = 'none';
            continueGameStart();
        } catch (error) {
            document.getElementById('login-error').textContent = error.message;
        }
    });
    
    // Signup form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        try {
            document.getElementById('signup-error').textContent = '';
            await firebaseManager.signUp(username, email, password);
            gameState.isLoggedIn = true;
            document.getElementById('login-screen').style.display = 'none';
            continueGameStart();
        } catch (error) {
            document.getElementById('signup-error').textContent = error.message;
        }
    });
    
    // Play offline button
    document.getElementById('play-offline-btn').addEventListener('click', () => {
        firebaseManager.isOfflineMode = true;
        gameState.isLoggedIn = true;
        document.getElementById('login-screen').style.display = 'none';
        continueGameStart();
    });

    // Forgot password form
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('forgot-username').value;
        
        try {
            document.getElementById('forgot-error').textContent = '';
            document.getElementById('forgot-success').style.display = 'none';
            
            // Get email from username
            const email = await firebaseManager.getEmailFromUsername(username);
            
            // Send reset email
            await firebaseManager.resetPassword(email);
            
            // Show success message
            document.getElementById('forgot-success').textContent = 'Password reset email sent! Check your inbox.';
            document.getElementById('forgot-success').style.display = 'block';
            
            // Clear form
            document.getElementById('forgot-username').value = '';
        } catch (error) {
            document.getElementById('forgot-error').textContent = error.message;
        }
    });
}

// Show account info in game
function showAccountInfo() {
    if (firebaseManager.isOfflineMode) {
        return; // Don't show for offline mode
    }
    
    const accountDiv = document.createElement('div');
    accountDiv.className = 'account-info';
    accountDiv.innerHTML = `
        <span class="account-username">${firebaseManager.username}</span>
        <button class="logout-everywhere-btn" onclick="firebaseManager.forceLogoutAllSessions().then(() => location.reload())" title="Logout all devices">⚠</button>
        <button class="logout-btn" onclick="firebaseManager.logout()">Logout</button>
    `;
    document.getElementById('game-container').appendChild(accountDiv);
}

function gameLoop(currentTime) {
    if (!gameState.running) return;

    // Calculate delta time since last frame
    const deltaTime = currentTime - gameState.lastTime;
    gameState.lastTime = currentTime;
    gameState.deltaTime = deltaTime;
    
    // Update FPS counter
    gameState.frameCount++;
    if (currentTime - gameState.fpsTime >= 1000) {
        gameState.fps = gameState.frameCount;
        gameState.frameCount = 0;
        gameState.fpsTime = currentTime;
    }
    
    // Update game systems with delta time
    if (!gameState.paused) {
        ai.update(deltaTime);
        player.update(deltaTime);
    }

    // Update task progress
    if (window.taskManager) {
        taskManager.updateAllProgress();
    }

    // Render the map
    map.render();
    
    // Continue loop - runs at monitor refresh rate
    requestAnimationFrame(gameLoop);
}

// Start initialization when page loads
window.addEventListener('DOMContentLoaded', init);

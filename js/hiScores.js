// Import httpsCallable for Firebase Functions
const { httpsCallable } = window.firestoreHelpers || {};

// Helper function for number formatting (assuming it exists globally or is imported)
// If not, you'll need to define it or import it.
// Example:
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
}


class HiScoresManager {
    constructor() {
        this.isOpen = false;
        this.currentCategory = 'overall';
        this.currentPage = 0;
        this.pageSize = 25;
        // Client-side cache for leaderboard pages
        this.leaderboardCache = new Map(); // Stores { category: { page: data, timestamp: time } }
        this.clientCacheTimeout = 60 * 1000; // 1 minute client-side cache for leaderboard pages
        
        this.compareMode = false;
        this.compareUsers = [];
        this.lastUpdateTime = null; // From server metadata
        this.totalPlayers = 0;      // From server metadata
    }
    
    // Initialize the hi-scores system
    initialize() {
        this.setupEventListeners();
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('hiscores-close-x');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    // Open the hi-scores modal
    open() {
        this.isOpen = true;
        const modal = document.getElementById('hiscores-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.render();
            this.loadCategory('overall');
        }
    }
    
    // Close the hi-scores modal
    close() {
        this.isOpen = false;
        const modal = document.getElementById('hiscores-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.compareMode = false;
        this.compareUsers = [];
        // Clear any specific display elements that might be lingering
        const leaderboardContainer = document.getElementById('hiscores-leaderboard');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = '';
        }
    }
    
    // Render the hi-scores UI
    render() {
        this.renderCategories();
        this.renderControls();
    }
    
    // Render the category list (left side)
    renderCategories() {
        const container = document.getElementById('hiscores-categories');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Title
        const title = document.createElement('h3');
        title.className = 'hiscores-title';
        title.textContent = 'Hiscores';
        container.appendChild(title);
        
        // Categories list - start with just Overall
        const categories = [
            { id: 'overall', name: 'Overall', icon: 'skill_skills' }
        ];

        // Add all skills next
        const skillsData = window.loadingManager.getData('skills'); // Use window.loadingManager
        for (const skillId of Object.keys(skillsData)) {
            categories.push({
                id: `skill_${skillId}`,
                name: skillsData[skillId].name,
                icon: `skill_${skillId}`
            });
        }

        // Add Tasks, Pets, Shiny Pets, and Clues at the end
        categories.push(
            { id: 'tasks', name: 'Tasks', icon: 'ui_tasks' },
            { id: 'pets', name: 'Pets', icon: 'ui_pets' },
            { id: 'shinyPets', name: 'Shiny Pets', icon: 'ui_pets_shiny' },
            { id: 'cluesTotal', name: 'All Clues', icon: 'ui_all_clue' },
            { id: 'clueseasy', name: 'Easy Clues', icon: 'items_easy_clue' },
            { id: 'cluesmedium', name: 'Medium Clues', icon: 'items_medium_clue' },
            { id: 'clueshard', name: 'Hard Clues', icon: 'items_hard_clue' },
            { id: 'clueselite', name: 'Elite Clues', icon: 'items_elite_clue' },
            { id: 'cluesmaster', name: 'Master Clues', icon: 'items_master_clue' }
        );
        
        const list = document.createElement('div');
        list.className = 'hiscores-category-list';
        
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'hiscores-category-item';
            if (this.currentCategory === cat.id) {
                item.classList.add('active');
            }
            
            // Add icon if available
            if (cat.icon) {
                const icon = window.loadingManager.getImage(cat.icon); // Use window.loadingManager
                if (icon) {
                    const iconImg = document.createElement('img');
                    iconImg.src = icon.src;
                    iconImg.className = 'category-icon';
                    item.appendChild(iconImg);
                }
            }
            
            const text = document.createElement('span');
            text.textContent = cat.name;
            item.appendChild(text);
            
            item.addEventListener('click', () => {
                this.loadCategory(cat.id);
            });
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    // Render the controls (right side)
    renderControls() {
        const container = document.getElementById('hiscores-controls');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Search by name
        const nameSearch = document.createElement('div');
        nameSearch.className = 'hiscores-search-section';
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Search by name';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'hiscores-search-input';
        nameInput.placeholder = 'Username';
        
        const nameBtn = document.createElement('button');
        nameBtn.className = 'hiscores-search-btn';
        nameBtn.textContent = 'Search';
        nameBtn.addEventListener('click', () => {
            this.searchByName(nameInput.value);
        });
        
        nameSearch.appendChild(nameLabel);
        nameSearch.appendChild(nameInput);
        nameSearch.appendChild(nameBtn);
        
        // Search by rank
        const rankSearch = document.createElement('div');
        rankSearch.className = 'hiscores-search-section';
        
        const rankLabel = document.createElement('label');
        rankLabel.textContent = 'Search by rank';
        
        const rankInput = document.createElement('input');
        rankInput.type = 'number';
        rankInput.className = 'hiscores-search-input';
        rankInput.placeholder = 'Rank';
        rankInput.min = '1';
        
        const rankBtn = document.createElement('button');
        rankBtn.className = 'hiscores-search-btn';
        rankBtn.textContent = 'Search';
        rankBtn.addEventListener('click', () => {
            const rank = parseInt(rankInput.value);
            if (rank > 0) {
                this.searchByRank(rank);
            }
        });
        
        rankSearch.appendChild(rankLabel);
        rankSearch.appendChild(rankInput);
        rankSearch.appendChild(rankBtn);
        
        // Compare users
        const compareSection = document.createElement('div');
        compareSection.className = 'hiscores-search-section';
        
        const compareLabel = document.createElement('label');
        compareLabel.textContent = 'Compare Users';
        
        const user1Input = document.createElement('input');
        user1Input.type = 'text';
        user1Input.className = 'hiscores-search-input';
        user1Input.placeholder = 'User 1';
        
        const user2Input = document.createElement('input');
        user2Input.type = 'text';
        user2Input.className = 'hiscores-search-input';
        user2Input.placeholder = 'User 2';
        
        const compareBtn = document.createElement('button');
        compareBtn.className = 'hiscores-search-btn';
        compareBtn.textContent = 'Compare';
        compareBtn.addEventListener('click', () => {
            this.compareUsersDisplay(user1Input.value, user2Input.value);
        });
        
        compareSection.appendChild(compareLabel);
        compareSection.appendChild(user1Input);
        compareSection.appendChild(user2Input);
        compareSection.appendChild(compareBtn);
        
        container.appendChild(nameSearch);
        container.appendChild(rankSearch);
        container.appendChild(compareSection);
        
        // Your rank button
        const yourRankBtn = document.createElement('button');
        yourRankBtn.className = 'hiscores-your-rank-btn';
        yourRankBtn.textContent = 'View Your Rank';
        yourRankBtn.addEventListener('click', () => {
            if (window.firebaseManager.username) { // Use window.firebaseManager
                this.searchByName(window.firebaseManager.username);
            }
        });
        
        container.appendChild(yourRankBtn);
    }
    
    // Load a category
    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        this.currentPage = 0;
        this.compareMode = false;
        
        // Update active state in categories
        document.querySelectorAll('.hiscores-category-item').forEach((item, index) => {
            item.classList.remove('active');
            const text = item.querySelector('span')?.textContent;
            
            let itemCategoryId = null;
            // Map text content back to category ID
            switch (text) {
                case 'Overall': itemCategoryId = 'overall'; break;
                case 'Tasks': itemCategoryId = 'tasks'; break;
                case 'Pets': itemCategoryId = 'pets'; break;
                case 'Shiny Pets': itemCategoryId = 'shinyPets'; break;
                case 'All Clues': itemCategoryId = 'cluesTotal'; break;
                case 'Easy Clues': itemCategoryId = 'clueseasy'; break;
                case 'Medium Clues': itemCategoryId = 'cluesmedium'; break;
                case 'Hard Clues': itemCategoryId = 'clueshard'; break;
                case 'Elite Clues': itemCategoryId = 'clueselite'; break;
                case 'Master Clues': itemCategoryId = 'cluesmaster'; break;
                default:
                    const skillsData = window.loadingManager.getData('skills');
                    for (const skillId of Object.keys(skillsData)) {
                        if (skillsData[skillId].name === text) {
                            itemCategoryId = `skill_${skillId}`;
                            break;
                        }
                    }
            }
            
            if (itemCategoryId === categoryId) {
                item.classList.add('active');
            }
        });
        
        // Load and display data
        await this.loadLeaderboard();
    }
    
    // Load leaderboard data
    async loadLeaderboard() {
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        // Show loading
        container.innerHTML = '<div class="hiscores-loading">Loading...</div>';
        
        try {
            const data = await this.fetchLeaderboardData(this.currentCategory, this.currentPage);
            this.displayLeaderboard(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            container.innerHTML = '<div class="hiscores-error">Failed to load leaderboard</div>';
        }
    }
    
    // Fetch leaderboard data from Firebase Functions (uses client-side cache)
    async fetchLeaderboardData(category, page) {
        // Check client-side cache first
        const cacheKey = `${category}-${page}`;
        const cachedEntry = this.leaderboardCache.get(cacheKey);

        if (cachedEntry && (Date.now() - cachedEntry.timestamp < this.clientCacheTimeout)) {
            console.log(`[HiScoresManager] Using client-side cache for ${cacheKey}`);
            this.lastUpdateTime = cachedEntry.metadata.lastUpdated;
            this.totalPlayers = cachedEntry.metadata.totalPlayers;
            return cachedEntry.data;
        }

        try {
            if (!window.firebaseManager.functions) {
                console.error('Firebase Functions not initialized');
                return [];
            }
            
            const getHiscores = httpsCallable(window.firebaseManager.functions, 'getHiscores');
            const result = await getHiscores({
                category: category,
                page: page,
                pageSize: this.pageSize
            });
            
            if (!result.data.success) {
                console.error('Failed to fetch hiscores:', result.data.message);
                return [];
            }
            
            this.lastUpdateTime = result.data.metadata.lastUpdated;
            this.totalPlayers = result.data.metadata.totalPlayers;
            
            // Store in client-side cache
            this.leaderboardCache.set(cacheKey, {
                data: result.data.data,
                metadata: result.data.metadata,
                timestamp: Date.now()
            });

            return result.data.data;
            
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            if (error.code === 'functions/not-found') {
                console.error('Hiscores function not deployed');
            } else if (error.code === 'functions/permission-denied') {
                console.error('Permission denied for hiscores access');
            } else if (error.code === 'functions/unavailable') {
                console.error('Firebase Functions temporarily unavailable');
            }
            return [];
        }
    }
    
    // Display leaderboard
    displayLeaderboard(data) {
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Title with icon
        const titleContainer = document.createElement('div');
        titleContainer.className = 'hiscores-leaderboard-title-container';

        const title = document.createElement('h2');
        title.className = 'hiscores-leaderboard-title';

        let iconKey = null;
        if (this.currentCategory === 'overall') { iconKey = 'skill_skills'; }
        else if (this.currentCategory === 'tasks') { iconKey = 'ui_tasks'; }
        else if (this.currentCategory === 'pets') { iconKey = 'ui_pets'; }
        else if (this.currentCategory === 'shinyPets') { iconKey = 'ui_pets_shiny'; }
        else if (this.currentCategory === 'cluesTotal') { iconKey = 'ui_all_clue'; }
        else if (this.currentCategory === 'clueseasy') { iconKey = 'items_easy_clue'; }
        else if (this.currentCategory === 'cluesmedium') { iconKey = 'items_medium_clue'; }
        else if (this.currentCategory === 'clueshard') { iconKey = 'items_hard_clue'; }
        else if (this.currentCategory === 'clueselite') { iconKey = 'items_elite_clue'; }
        else if (this.currentCategory === 'cluesmaster') { iconKey = 'items_master_clue'; }
        else if (this.currentCategory.startsWith('skill_')) { iconKey = this.currentCategory; }

        if (iconKey) {
            const icon = window.loadingManager.getImage(iconKey);
            if (icon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-title-icon';
                iconImg.src = icon.src;
                titleContainer.appendChild(iconImg);
            }
        }

        title.textContent = this.getLeaderboardTitle();
        titleContainer.appendChild(title);
        container.appendChild(titleContainer);
        
        // Table
        const table = document.createElement('table');
        table.className = 'hiscores-table';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        if (this.currentCategory === 'overall' || this.currentCategory.startsWith('skill_')) {
            headerRow.innerHTML = '<th>Rank</th><th>Name</th><th>Level</th><th>XP</th>';
        } else {
            headerRow.innerHTML = '<th>Rank</th><th>Name</th><th>Score</th>';
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        
        data.forEach(player => {
            const row = document.createElement('tr');
            
            if (player.uid === window.firebaseManager.currentUser?.uid) { // Use window.firebaseManager
                row.classList.add('hiscores-own-rank');
            }
            
            // Map the lowercase category to the field name for clues
            const clueFieldMap = {
                'cluesTotal': 'cluesTotal', 'clueseasy': 'cluesEasy', 'cluesmedium': 'cluesMedium',
                'clueshard': 'cluesHard', 'clueselite': 'cluesElite', 'cluesmaster': 'cluesMaster'
            };
            const clueField = clueFieldMap[this.currentCategory];

            if (this.currentCategory === 'overall') {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player.totalLevel}</td>
                    <td>${formatNumber(player.totalXp)}</td>
                `;
            } else if (this.currentCategory.startsWith('skill_')) {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player.level || 1}</td>
                    <td>${formatNumber(player.xp || 0)}</td>
                `;
            } else if (this.currentCategory === 'tasks') {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${formatNumber(player.tasksCompleted || 0)}</td>
                `;
            } else if (this.currentCategory === 'pets') {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player.petsTotal || 0}</td>
                `;
            } else if (this.currentCategory === 'shinyPets') {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player.petsShiny || 0}</td>
                `;
            } else if (clueField) {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player[clueField] || 0}</td>
                `;
            }
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Add click handlers for names
        container.querySelectorAll('.hiscores-name').forEach(nameEl => {
            nameEl.style.cursor = 'pointer';
            nameEl.addEventListener('click', () => {
                this.showPlayerStats(nameEl.textContent);
            });
        });
        
        // Pagination
        const pagination = document.createElement('div');
        pagination.className = 'hiscores-pagination';
        
        if (this.currentPage > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Previous';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.loadLeaderboard();
            });
            pagination.appendChild(prevBtn);
        }
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${this.currentPage + 1}`;
        pagination.appendChild(pageInfo);
        
        // Only show next button if there might be more data
        // This is a heuristic; `totalPages` from metadata might be more accurate if available
        if (data.length === this.pageSize) { 
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next →';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadLeaderboard();
            });
            pagination.appendChild(nextBtn);
        }
        
        container.appendChild(pagination);
    }
    
    // Get leaderboard title
    getLeaderboardTitle() {
        if (this.currentCategory === 'overall') return 'Overall Hiscores';
        if (this.currentCategory === 'tasks') return 'Tasks Hiscores';
        if (this.currentCategory === 'pets') return 'Pets Hiscores';
        if (this.currentCategory === 'shinyPets') return 'Shiny Pets Hiscores';
        if (this.currentCategory === 'cluesTotal') return 'All Clues Hiscores';
        if (this.currentCategory === 'clueseasy') return 'Easy Clues Hiscores';
        if (this.currentCategory === 'cluesmedium') return 'Medium Clues Hiscores';
        if (this.currentCategory === 'clueshard') return 'Hard Clues Hiscores';
        if (this.currentCategory === 'clueselite') return 'Elite Clues Hiscores';
        if (this.currentCategory === 'cluesmaster') return 'Master Clues Hiscores';
        if (this.currentCategory.startsWith('skill_')) {
            const skillId = this.currentCategory.replace('skill_', '');
            const skillsData = window.loadingManager.getData('skills');
            return `${skillsData[skillId].name} Hiscores`;
        }
        return 'Hiscores';
    }
    
    // Search by username
    async searchByName(username) {
        if (!username) return;
        
        try {
            if (!window.firebaseManager.functions) {
                console.error('Firebase Functions not initialized');
                alert('Firebase Functions not initialized.');
                return;
            }

            const getHiscores = httpsCallable(window.firebaseManager.functions, 'getHiscores');
            const result = await getHiscores({
                category: this.currentCategory,
                searchUsername: username,
                pageSize: this.pageSize
            });
            
            if (result.data.success && result.data.data.length > 0) {
                // If a user is found, the server returns the page centered on them
                // Update current page to match the one returned by the server
                this.currentPage = result.data.metadata.page || 0; 
                this.displayLeaderboard(result.data.data);
                
                // Highlight the searched user
                setTimeout(() => {
                    const rows = document.querySelectorAll('.hiscores-table tbody tr');
                    rows.forEach(row => {
                        const nameCell = row.cells[1];
                        if (nameCell && nameCell.textContent.toLowerCase() === username.toLowerCase()) {
                            row.classList.add('hiscores-highlight');
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }, 100);
            } else {
                alert(result.data.message || `Player "${username}" not found in this category.`);
            }
        } catch (error) {
            console.error('Failed to search player:', error);
            alert('Failed to search for player. Please try again.');
        }
    }
    
    // Search by rank
    async searchByRank(rank) {
        if (!rank || rank <= 0) return;

        // Calculate the page the rank falls on
        this.currentPage = Math.floor((rank - 1) / this.pageSize);
        await this.loadLeaderboard();
        
        // Highlight the specific rank
        setTimeout(() => {
            const rows = document.querySelectorAll('.hiscores-table tbody tr');
            rows.forEach(row => {
                const rankCell = row.cells[0];
                if (parseInt(rankCell.textContent) === rank) {
                    row.classList.add('hiscores-highlight');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }, 100);
    }
    
    // --- OPTIMIZED: Show individual player stats ---
    async showPlayerStats(username) {
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '<div class="hiscores-loading">Loading player stats...</div>';
        
        try {
            if (!window.firebaseManager.functions) {
                console.error('Firebase Functions not initialized');
                alert('Firebase Functions not initialized.');
                return;
            }

            // ONE call to the new Cloud Function to get the complete profile
            const getPlayerHiscoresProfile = httpsCallable(window.firebaseManager.functions, 'getPlayerHiscoresProfile');
            const result = await getPlayerHiscoresProfile({ username: username });
            
            if (!result.data.success || !result.data.data) {
                container.innerHTML = '<div class="hiscores-error">Player not found or profile unavailable</div>';
                return;
            }
            
            const profile = result.data.data;
            const skillsData = window.loadingManager.getData('skills'); // Use window.loadingManager

            container.innerHTML = '';
            
            // Title
            const title = document.createElement('h2');
            title.className = 'hiscores-leaderboard-title';
            title.textContent = `Personal Hiscores for ${username}`;
            container.appendChild(title);
            
            // Skills table
            const skillsTable = document.createElement('table');
            skillsTable.className = 'hiscores-table';
            
            const skillsHead = document.createElement('thead');
            skillsHead.innerHTML = '<tr><th>Skill</th><th>Rank</th><th>Level</th><th>XP</th></tr>';
            skillsTable.appendChild(skillsHead);
            
            const skillsBody = document.createElement('tbody');
            
            // Overall with icon
            this.addProfileRow(
                skillsBody, 
                'Overall', 
                'skill_skills', 
                profile.ranks.overall, 
                profile.values.totalLevel, 
                formatNumber(profile.values.totalXp)
            );

            // Individual skills with icons
            for (const skillId of Object.keys(skillsData)) {
                const category = `skill_${skillId}`;
                this.addProfileRow(
                    skillsBody,
                    skillsData[skillId].name,
                    category,
                    profile.ranks[category],
                    profile.values[`level_${skillId}`],
                    formatNumber(profile.values[`xp_${skillId}`])
                );
            }
            
            skillsTable.appendChild(skillsBody);
            container.appendChild(skillsTable);
            
            // Categories table
            const catTable = document.createElement('table');
            catTable.className = 'hiscores-table';
            
            const catHead = document.createElement('thead');
            catHead.innerHTML = '<tr><th>Category</th><th>Rank</th><th>Score</th></tr>';
            catTable.appendChild(catHead);
            
            const catBody = document.createElement('tbody');
            
            // Tasks with icon
            this.addProfileRow(
                catBody, 
                'Tasks', 
                'ui_tasks', 
                profile.ranks.tasks, 
                profile.values.tasksCompleted
            );
            
            // Pets with icon
            this.addProfileRow(
                catBody, 
                'Pets', 
                'ui_pets', 
                profile.ranks.pets, 
                profile.values.petsTotal
            );
            
            // Shiny Pets with icon
            this.addProfileRow(
                catBody, 
                'Shiny Pets', 
                'ui_pets_shiny', 
                profile.ranks.shinyPets, 
                profile.values.petsShiny
            );

            // All Clues with icon
            this.addProfileRow(
                catBody, 
                'All Clues', 
                'ui_all_clue', 
                profile.ranks.cluesTotal, 
                profile.values.cluesTotal
            );

            // Individual Clue Tiers
            const clueTiers = [
                { id: 'easy', name: 'Easy Clues', icon: 'easy_clue', category: 'clueseasy' },
                { id: 'medium', name: 'Medium Clues', icon: 'medium_clue', category: 'cluesmedium' },
                { id: 'hard', name: 'Hard Clues', icon: 'hard_clue', category: 'clueshard' },
                { id: 'elite', name: 'Elite Clues', icon: 'elite_clue', category: 'clueselite' },
                { id: 'master', name: 'Master Clues', icon: 'master_clue', category: 'cluesmaster' }
            ];
            
            for (const tier of clueTiers) {
                const fieldName = `clues${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`;
                let iconKey = `items_${tier.icon}`;
                this.addProfileRow(
                    catBody,
                    tier.name,
                    iconKey, // Use iconKey directly, addProfileRow will handle direct: prefix if needed
                    profile.ranks[tier.category],
                    profile.values[fieldName]
                );
            }
            
            catTable.appendChild(catBody);
            container.appendChild(catTable);
            
            // Back button
            const backBtn = document.createElement('button');
            backBtn.className = 'hiscores-back-btn';
            backBtn.textContent = '← Back to Leaderboard';
            backBtn.addEventListener('click', () => {
                this.loadLeaderboard();
            });
            container.appendChild(backBtn);
            
        } catch (error) {
            console.error('Failed to load player stats:', error);
            container.innerHTML = `<div class="hiscores-error">Failed to load player stats: ${error.message}</div>`;
        }
    }

    // Helper for adding rows to player profile tables
    addProfileRow(tbody, label, iconKey, rank, value, xpValue = null) {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.className = 'hiscores-skill-name-cell';

        // Icon handling
        if (iconKey) {
            let iconSrc = null;
            if (iconKey.startsWith('direct:')) {
                iconSrc = iconKey.replace('direct:', '');
            } else {
                const icon = window.loadingManager.getImage(iconKey);
                if (icon) {
                    iconSrc = icon.src;
                } else if (iconKey.startsWith('items_')) {
                    const itemId = iconKey.replace('items_', '');
                    iconSrc = `assets/items/${itemId}.png`; // Fallback for items
                }
            }
            if (iconSrc) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = iconSrc;
                nameCell.appendChild(iconImg);
            }
        }
        const labelText = document.createElement('span');
        labelText.textContent = label;
        nameCell.appendChild(labelText);
        row.appendChild(nameCell);

        row.innerHTML += `<td>${rank || 'Unranked'}</td>`;
        if (xpValue !== null) { // For skills (Level and XP)
            row.innerHTML += `<td>${value}</td><td>${xpValue}</td>`;
        } else { // For categories (Score)
            row.innerHTML += `<td>${formatNumber(value || 0)}</td>`;
        }
        tbody.appendChild(row);
    }
    
    // --- REMOVED: getPlayerRank and getPlayerRankForSkill no longer make network calls ---
    // These functions are now obsolete as the profile object contains all the ranks.
    // They are replaced by accessing profile.ranks[category] directly.

    // --- OPTIMIZED: Compare two users ---
    async compareUsersDisplay(user1, user2) {
        if (!user1 || !user2) {
            alert('Please enter two usernames to compare');
            return;
        }
        
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '<div class="hiscores-loading">Loading comparison...</div>';
        
        try {
            if (!window.firebaseManager.functions) {
                console.error('Firebase Functions not initialized');
                alert('Firebase Functions not initialized.');
                return;
            }

            // ONE call to the new Cloud Function to get both complete profiles
            const comparePlayersHiscores = httpsCallable(window.firebaseManager.functions, 'comparePlayersHiscores');
            const result = await comparePlayersHiscores({ username1: user1, username2: user2 });
            
            if (!result.data.success || !result.data.data) {
                container.innerHTML = '<div class="hiscores-error">One or both players not found for comparison.</div>';
                return;
            }

            const profile1 = result.data.data.player1;
            const profile2 = result.data.data.player2;
            const skillsData = window.loadingManager.getData('skills');
            
            container.innerHTML = '';
            
            // Title
            const title = document.createElement('h2');
            title.className = 'hiscores-leaderboard-title';
            title.textContent = `Comparing ${user1} vs ${user2}`;
            container.appendChild(title);
            
            // Skills comparison table
            const skillsTable = document.createElement('table');
            skillsTable.className = 'hiscores-compare-table';
            
            const skillsHead = document.createElement('thead');
            skillsHead.innerHTML = `
                <tr>
                    <th>Skill</th>
                    <th colspan="2">${profile1.username}</th>
                    <th colspan="2">${profile2.username}</th>
                    <th>Winner</th>
                </tr>
                <tr class="hiscores-subheader">
                    <th></th>
                    <th>Rank</th>
                    <th>Level</th>
                    <th>Rank</th>
                    <th>Level</th>
                    <th></th>
                </tr>
            `;
            skillsTable.appendChild(skillsHead);
            
            const skillsBody = document.createElement('tbody');
            
            // Overall comparison with icon
            this.addCompareRowWithRank(
                skillsBody, 
                'Overall', 
                'skill_skills',
                profile1.ranks.overall, profile1.values.totalLevel,
                profile2.ranks.overall, profile2.values.totalLevel,
                profile1.values.totalXp, profile2.values.totalXp // Pass XP for tie-breaking comparison
            );
            
            // Individual skills comparison with icons
            for (const skillId of Object.keys(skillsData)) {
                const category = `skill_${skillId}`;
                this.addCompareRowWithRank(
                    skillsBody,
                    skillsData[skillId].name,
                    category,
                    profile1.ranks[category], profile1.values[`level_${skillId}`],
                    profile2.ranks[category], profile2.values[`level_${skillId}`],
                    profile1.values[`xp_${skillId}`], profile2.values[`xp_${skillId}`] // Pass XP for tie-breaking
                );
            }
            
            skillsTable.appendChild(skillsBody);
            container.appendChild(skillsTable);
            
            // Categories comparison table
            const catTable = document.createElement('table');
            catTable.className = 'hiscores-compare-table';
            catTable.style.marginTop = '20px';
            
            const catHead = document.createElement('thead');
            catHead.innerHTML = `
                <tr>
                    <th>Category</th>
                    <th colspan="2">${profile1.username}</th>
                    <th colspan="2">${profile2.username}</th>
                    <th>Winner</th>
                </tr>
                <tr class="hiscores-subheader">
                    <th></th>
                    <th>Rank</th>
                    <th>Score</th>
                    <th>Rank</th>
                    <th>Score</th>
                    <th></th>
                </tr>
            `;
            catTable.appendChild(catHead);
            
            const catBody = document.createElement('tbody');
            
            // Tasks comparison
            this.addCompareRowWithRank(
                catBody,
                'Tasks',
                'ui_tasks',
                profile1.ranks.tasks, profile1.values.tasksCompleted,
                profile2.ranks.tasks, profile2.values.tasksCompleted
            );
            
            // Pets comparison
            this.addCompareRowWithRank(
                catBody,
                'Pets',
                'ui_pets',
                profile1.ranks.pets, profile1.values.petsTotal,
                profile2.ranks.pets, profile2.values.petsTotal
            );
            
            // Shiny Pets comparison
            this.addCompareRowWithRank(
                catBody,
                'Shiny Pets',
                'ui_pets_shiny',
                profile1.ranks.shinyPets, profile1.values.petsShiny,
                profile2.ranks.shinyPets, profile2.values.petsShiny
            );

            // All Clues comparison
            this.addCompareRowWithRank(
                catBody,
                'All Clues',
                'ui_all_clue',
                profile1.ranks.cluesTotal, profile1.values.cluesTotal,
                profile2.ranks.cluesTotal, profile2.values.cluesTotal
            );

            // Individual Clue Tier comparisons
            const clueTiers = [
                { id: 'easy', name: 'Easy Clues', icon: 'easy_clue', category: 'clueseasy' },
                { id: 'medium', name: 'Medium Clues', icon: 'medium_clue', category: 'cluesmedium' },
                { id: 'hard', name: 'Hard Clues', icon: 'hard_clue', category: 'clueshard' },
                { id: 'elite', name: 'Elite Clues', icon: 'elite_clue', category: 'clueselite' },
                { id: 'master', name: 'Master Clues', icon: 'master_clue', category: 'cluesmaster' }
            ];
            
            for (const tier of clueTiers) {
                const fieldName = `clues${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`;
                let iconKey = `items_${tier.icon}`;
                
                this.addCompareRowWithRank(
                    catBody,
                    tier.name,
                    iconKey, // addCompareRowWithRank will handle direct: prefix if needed
                    profile1.ranks[tier.category], profile1.values[fieldName],
                    profile2.ranks[tier.category], profile2.values[fieldName]
                );
            }
            
            catTable.appendChild(catBody);
            container.appendChild(catTable);
            
            // Back button
            const backBtn = document.createElement('button');
            backBtn.className = 'hiscores-back-btn';
            backBtn.textContent = '← Back to Leaderboard';
            backBtn.addEventListener('click', () => {
                this.loadLeaderboard();
            });
            container.appendChild(backBtn);
            
        } catch (error) {
            console.error('Failed to compare users:', error);
            container.innerHTML = `<div class="hiscores-error">Failed to compare users: ${error.message}</div>`;
        }
    }

    // Helper method for adding rows to player profile comparison tables
    // Now accepts an optional tieBreakerValue1/2 for cases like XP for same level
    async addCompareRowWithRank(tbody, label, iconKey, rank1, value1, rank2, value2, tieBreakerValue1 = 0, tieBreakerValue2 = 0) {
        const row = document.createElement('tr');
        
        // Name cell with icon
        const labelCell = document.createElement('td');
        labelCell.className = 'hiscores-skill-name-cell';
        
        if (iconKey) {
            let iconSrc = null;
            if (iconKey.startsWith('direct:')) {
                iconSrc = iconKey.replace('direct:', '');
            } else {
                const icon = window.loadingManager.getImage(iconKey);
                if (icon) {
                    iconSrc = icon.src;
                } else if (iconKey.startsWith('items_')) {
                    const itemId = iconKey.replace('items_', '');
                    iconSrc = `assets/items/${itemId}.png`;
                }
            }
            if (iconSrc) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = iconSrc;
                labelCell.appendChild(iconImg);
            }
        }
        const labelText = document.createElement('span');
        labelText.textContent = label;
        labelCell.appendChild(labelText);
        
        // User 1 data
        const rank1Cell = document.createElement('td');
        rank1Cell.className = 'hiscores-compare-rank';
        rank1Cell.textContent = rank1 || 'Unranked'; // Display 'Unranked' if rank is null/undefined
        
        const value1Formatted = typeof value1 === 'number' && value1 > 10000 ? formatNumber(value1) : value1;
        const value1Cell = document.createElement('td');
        value1Cell.className = 'hiscores-compare-value';
        value1Cell.textContent = value1Formatted || '0';
        
        // User 2 data
        const rank2Cell = document.createElement('td');
        rank2Cell.className = 'hiscores-compare-rank';
        rank2Cell.textContent = rank2 || 'Unranked'; // Display 'Unranked' if rank is null/undefined
        
        const value2Formatted = typeof value2 === 'number' && value2 > 10000 ? formatNumber(value2) : value2;
        const value2Cell = document.createElement('td');
        value2Cell.className = 'hiscores-compare-value';
        value2Cell.textContent = value2Formatted || '0';
        
        // Winner cell
        const winnerCell = document.createElement('td');
        winnerCell.className = 'hiscores-compare-winner';
        
        // Determine winner (lower rank number is better, unless it's "Unranked")
        const rank1Num = (rank1 === 'Unranked' || rank1 === undefined || rank1 === null) ? Infinity : parseInt(rank1);
        const rank2Num = (rank2 === 'Unranked' || rank2 === undefined || rank2 === null) ? Infinity : parseInt(rank2);
        
        // Use a more robust comparison that considers value and tie-breaker (like XP for levels)
        let winnerIndicator = '=';
        let color1 = ''; // Default
        let color2 = ''; // Default

        if (rank1Num < rank2Num) {
            winnerIndicator = '←';
            color1 = '#2ecc71'; // Green for winner
            color2 = '#e74c3c'; // Red for loser
        } else if (rank2Num < rank1Num) {
            winnerIndicator = '→';
            color1 = '#e74c3c';
            color2 = '#2ecc71';
        } else if (rank1Num !== Infinity && value1 !== undefined && value2 !== undefined) {
             // If ranks are tied, use value (level/score). Higher is better.
            if (value1 > value2) {
                winnerIndicator = '←';
                color1 = '#2ecc71';
                color2 = '#e74c3c';
            } else if (value2 > value1) {
                winnerIndicator = '→';
                color1 = '#e74c3c';
                color2 = '#2ecc71';
            } else if (tieBreakerValue1 !== undefined && tieBreakerValue2 !== undefined) {
                 // If value also tied, use tieBreakerValue (XP). Higher is better.
                if (tieBreakerValue1 > tieBreakerValue2) {
                    winnerIndicator = '←';
                    color1 = '#2ecc71';
                    color2 = '#e74c3c';
                } else if (tieBreakerValue2 > tieBreakerValue1) {
                    winnerIndicator = '→';
                    color1 = '#e74c3c';
                    color2 = '#2ecc71';
                }
            }
        }

        winnerCell.textContent = winnerIndicator;
        winnerCell.style.color = (winnerIndicator === '=') ? '#f39c12' : '#2ecc71'; // Gold for tie, Green for winner

        rank1Cell.style.color = color1;
        value1Cell.style.color = color1;
        rank2Cell.style.color = color2;
        value2Cell.style.color = color2;
        
        row.appendChild(labelCell);
        row.appendChild(rank1Cell);
        row.appendChild(value1Cell);
        row.appendChild(rank2Cell);
        row.appendChild(value2Cell);
        row.appendChild(winnerCell);
        
        tbody.appendChild(row);
    }
    
    // addCompareRow is no longer needed as addCompareRowWithRank is more comprehensive
}

// Create global instance
window.hiScoresManager = new HiScoresManager();

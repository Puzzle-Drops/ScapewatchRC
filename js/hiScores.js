class HiScoresManager {
    constructor() {
        this.isOpen = false;
        this.currentCategory = 'overall';
        this.currentPage = 0;
        this.pageSize = 25;
        this.cachedData = {};
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastUpdate = 0;
        this.updateThrottle = 5 * 60 * 1000; // 5 minutes between updates
        this.compareMode = false;
        this.compareUsers = [];
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
        const skillsData = loadingManager.getData('skills');
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
            { id: 'cluesEasy', name: 'Easy Clues', icon: 'items_easy_clue' },
            { id: 'cluesMedium', name: 'Medium Clues', icon: 'items_medium_clue' },
            { id: 'cluesHard', name: 'Hard Clues', icon: 'items_hard_clue' },
            { id: 'cluesElite', name: 'Elite Clues', icon: 'items_elite_clue' },
            { id: 'cluesMaster', name: 'Master Clues', icon: 'items_master_clue' }
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
                const icon = loadingManager.getImage(cat.icon);
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
            if (firebaseManager.username) {
                this.searchByName(firebaseManager.username);
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
            // Check if this item's text or data matches the category
            const text = item.querySelector('span')?.textContent;
            const categories = ['Overall', 'Tasks', 'Pets', 'Shiny Pets'];
            const skillsData = loadingManager.getData('skills');
            
            let itemCategoryId = null;
            if (categories.includes(text)) {
                if (text === 'Overall') itemCategoryId = 'overall';
                else if (text === 'Tasks') itemCategoryId = 'tasks';
                else if (text === 'Pets') itemCategoryId = 'pets';
                else if (text === 'Shiny Pets') itemCategoryId = 'shinyPets';
            } else {
                // It's a skill
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
    
    // Get category index
    getCategoryIndex(categoryId) {
        const categories = ['overall', 'tasks', 'pets', 'shinyPets'];
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            categories.push(`skill_${skillId}`);
        }
        return categories.indexOf(categoryId);
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
    
    // Fetch leaderboard data from Firebase with improved error handling
async fetchLeaderboardData(category, page) {
    if (!firebaseManager.db) {
        console.error('Firebase database not initialized');
        return [];
    }
    
    // Check connection health before making queries
    if (!firebaseManager.connectionHealthy) {
        console.warn('Firebase connection unhealthy, skipping hiscores query');
        return [];
    }
    
    const { query, collection, orderBy, limit, getDocs, startAfter } = window.firestoreHelpers;
    const startAt = page * this.pageSize;
    let queryConstraints = [];
    
    try {
        if (category === 'overall') {
            queryConstraints = [
                orderBy('totalLevel', 'desc'),
                orderBy('totalXp', 'desc'),
                orderBy('totalLevelFirstReached', 'asc'),
                limit(this.pageSize)
            ];
        } else if (category === 'tasks') {
            queryConstraints = [
                orderBy('tasksCompleted', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'pets') {
            queryConstraints = [
                orderBy('petsTotal', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'shinyPets') {
            queryConstraints = [
                orderBy('petsShiny', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesTotal') {
            queryConstraints = [
                orderBy('cluesTotal', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesEasy') {
            queryConstraints = [
                orderBy('cluesEasy', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesMedium') {
            queryConstraints = [
                orderBy('cluesMedium', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesHard') {
            queryConstraints = [
                orderBy('cluesHard', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesElite') {
            queryConstraints = [
                orderBy('cluesElite', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category === 'cluesMaster') {
            queryConstraints = [
                orderBy('cluesMaster', 'desc'),
                limit(this.pageSize)
            ];
        } else if (category.startsWith('skill_')) {
            const skillId = category.replace('skill_', '');
            queryConstraints = [
                orderBy(`level_${skillId}`, 'desc'),
                orderBy(`xp_${skillId}`, 'desc'),
                orderBy(`levelFirst_${skillId}`, 'asc'),
                limit(this.pageSize)
            ];
        } else {
            return [];
        }
        
        // Apply offset for pagination
        if (startAt > 0) {
            try {
                const previousQuery = query(collection(firebaseManager.db, 'hiscores'), ...queryConstraints);
                const previousPage = await getDocs(previousQuery);
                if (previousPage.docs.length > 0) {
                    const lastDoc = previousPage.docs[previousPage.docs.length - 1];
                    queryConstraints.push(startAfter(lastDoc));
                }
            } catch (paginationError) {
                console.error('Failed to apply pagination:', paginationError);
                // Continue without pagination rather than failing entirely
            }
        }
        
        const q = query(collection(firebaseManager.db, 'hiscores'), ...queryConstraints);
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map((doc, index) => ({
            rank: startAt + index + 1,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        
        // Handle specific error types
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.error('Missing index for query. Check the Firebase console for a link to create it.');
            // Could show user a message about index creation needed
        } else if (error.code === 'permission-denied') {
            console.error('Permission denied for hiscores access');
            // Could show user they need to be logged in
        } else if (error.code === 'unavailable') {
            console.error('Firebase service temporarily unavailable');
            // Network issue - could retry later
        } else if (error.message && error.message.includes('Failed to get document from cache')) {
            console.error('Cache read failed, likely due to connection issues');
        }
        
        // Return empty array so UI can handle gracefully
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

        // Add icon based on category
        let iconKey = null;
        if (this.currentCategory === 'overall') {
            iconKey = 'skill_skills';
        } else if (this.currentCategory === 'tasks') {
            iconKey = 'ui_tasks';
        } else if (this.currentCategory === 'pets') {
            iconKey = 'ui_pets';
        } else if (this.currentCategory === 'shinyPets') {
            iconKey = 'ui_pets_shiny';
        } else if (this.currentCategory.startsWith('skill_')) {
            iconKey = this.currentCategory;
        }

        if (iconKey) {
            const icon = loadingManager.getImage(iconKey);
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
            
            if (player.uid === firebaseManager.currentUser?.uid) {
                row.classList.add('hiscores-own-rank');
            }
            
            if (this.currentCategory === 'overall') {
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player.totalLevel}</td>
                    <td>${formatNumber(player.totalXp)}</td>
                `;
            } else if (this.currentCategory.startsWith('skill_')) {
                const skillId = this.currentCategory.replace('skill_', '');
                row.innerHTML = `
                    <td>${player.rank}</td>
                    <td class="hiscores-name" data-uid="${player.uid}">${player.username}</td>
                    <td>${player[`level_${skillId}`] || 1}</td>
                    <td>${formatNumber(player[`xp_${skillId}`] || 0)}</td>
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
            } else if (this.currentCategory.startsWith('clues')) {
                const clueField = this.currentCategory === 'cluesTotal' ? 'cluesTotal' :
                                  this.currentCategory;
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
        if (this.currentCategory === 'cluesEasy') return 'Easy Clues Hiscores';
        if (this.currentCategory === 'cluesMedium') return 'Medium Clues Hiscores';
        if (this.currentCategory === 'cluesHard') return 'Hard Clues Hiscores';
        if (this.currentCategory === 'cluesElite') return 'Elite Clues Hiscores';
        if (this.currentCategory === 'cluesMaster') return 'Master Clues Hiscores';
        if (this.currentCategory.startsWith('skill_')) {
            const skillId = this.currentCategory.replace('skill_', '');
            const skillsData = loadingManager.getData('skills');
            return `${skillsData[skillId].name} Hiscores`;
        }
        return 'Hiscores';
    }
    
    // Search by username
    async searchByName(username) {
        if (!username) return;
        
        try {
            const { query, collection, where, limit, getDocs } = window.firestoreHelpers;
            const q = query(
                collection(firebaseManager.db, 'hiscores'),
                where('username', '==', username),
                limit(1)
            );
            const userQuery = await getDocs(q);
            
            if (!userQuery.empty) {
                const userData = userQuery.docs[0].data();
                this.showPlayerStats(username);
            } else {
                alert('Player not found');
            }
        } catch (error) {
            console.error('Failed to search player:', error);
        }
    }
    
    // Search by rank
    async searchByRank(rank) {
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
    
    // Show individual player stats
    async showPlayerStats(username) {
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '<div class="hiscores-loading">Loading player stats...</div>';
        
        try {
            const { query, collection, where, limit, getDocs } = window.firestoreHelpers;
            const q = query(
                collection(firebaseManager.db, 'hiscores'),
                where('username', '==', username),
                limit(1)
            );
            const userQuery = await getDocs(q);
            
            if (userQuery.empty) {
                container.innerHTML = '<div class="hiscores-error">Player not found</div>';
                return;
            }
            
            const userData = userQuery.docs[0].data();
            const uid = userQuery.docs[0].id;
            
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
            const overallRank = await this.getPlayerRank(uid, 'overall');
            const overallRow = document.createElement('tr');
            const overallNameCell = document.createElement('td');
            overallNameCell.className = 'hiscores-skill-name-cell';

            const overallIcon = loadingManager.getImage('skill_skills');
            if (overallIcon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = overallIcon.src;
                overallNameCell.appendChild(iconImg);
            }
            const overallText = document.createElement('span');
            overallText.textContent = 'Overall';
            overallNameCell.appendChild(overallText);

            overallRow.appendChild(overallNameCell);
            overallRow.innerHTML += `
                <td>${overallRank}</td>
                <td>${userData.totalLevel}</td>
                <td>${formatNumber(userData.totalXp)}</td>
            `;
            skillsBody.appendChild(overallRow);

            // Individual skills with icons
            const skillsData = loadingManager.getData('skills');
            for (const skillId of Object.keys(skillsData)) {
                const skillRank = await this.getPlayerRankForSkill(uid, skillId);
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.className = 'hiscores-skill-name-cell';
                
                const skillIcon = loadingManager.getImage(`skill_${skillId}`);
                if (skillIcon) {
                    const iconImg = document.createElement('img');
                    iconImg.className = 'hiscores-inline-icon';
                    iconImg.src = skillIcon.src;
                    nameCell.appendChild(iconImg);
                }
                const skillText = document.createElement('span');
                skillText.textContent = skillsData[skillId].name;
                nameCell.appendChild(skillText);
                
                row.appendChild(nameCell);
                row.innerHTML += `
                    <td>${skillRank}</td>
                    <td>${userData[`level_${skillId}`] || 1}</td>
                    <td>${formatNumber(userData[`xp_${skillId}`] || 0)}</td>
                `;
                skillsBody.appendChild(row);
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
            const tasksRank = await this.getPlayerRank(uid, 'tasks');
            const tasksRow = document.createElement('tr');
            const tasksNameCell = document.createElement('td');
            tasksNameCell.className = 'hiscores-skill-name-cell';

            const tasksIcon = loadingManager.getImage('ui_tasks');
            if (tasksIcon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = tasksIcon.src;
                tasksNameCell.appendChild(iconImg);
            }
            const tasksText = document.createElement('span');
            tasksText.textContent = 'Tasks';
            tasksNameCell.appendChild(tasksText);

            tasksRow.appendChild(tasksNameCell);
            tasksRow.innerHTML += `
                <td>${tasksRank}</td>
                <td>${formatNumber(userData.tasksCompleted || 0)}</td>
            `;
            catBody.appendChild(tasksRow);

            // Pets with icon
            const petsRank = await this.getPlayerRank(uid, 'pets');
            const petsRow = document.createElement('tr');
            const petsNameCell = document.createElement('td');
            petsNameCell.className = 'hiscores-skill-name-cell';

            const petsIcon = loadingManager.getImage('ui_pets');
            if (petsIcon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = petsIcon.src;
                petsNameCell.appendChild(iconImg);
            }
            const petsText = document.createElement('span');
            petsText.textContent = 'Pets';
            petsNameCell.appendChild(petsText);

            petsRow.appendChild(petsNameCell);
            petsRow.innerHTML += `
                <td>${petsRank}</td>
                <td>${userData.petsTotal || 0}</td>
            `;
            catBody.appendChild(petsRow);

            // Shiny Pets with icon
            const shinyRank = await this.getPlayerRank(uid, 'shinyPets');
            const shinyRow = document.createElement('tr');
            const shinyNameCell = document.createElement('td');
            shinyNameCell.className = 'hiscores-skill-name-cell';

            const shinyIcon = loadingManager.getImage('ui_pets_shiny');
            if (shinyIcon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = shinyIcon.src;
                shinyNameCell.appendChild(iconImg);
            }
            const shinyText = document.createElement('span');
            shinyText.textContent = 'Shiny Pets';
            shinyNameCell.appendChild(shinyText);

            shinyRow.appendChild(shinyNameCell);
            shinyRow.innerHTML += `
                <td>${shinyRank}</td>
                <td>${userData.petsShiny || 0}</td>
            `;
            catBody.appendChild(shinyRow);

            // All Clues with icon
            const cluesRank = await this.getPlayerRank(uid, 'cluesTotal');
            const cluesRow = document.createElement('tr');
            const cluesNameCell = document.createElement('td');
            cluesNameCell.className = 'hiscores-skill-name-cell';

            const cluesIcon = loadingManager.getImage('ui_all_clue');
            if (cluesIcon) {
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = cluesIcon.src;
                cluesNameCell.appendChild(iconImg);
            }
            const cluesText = document.createElement('span');
            cluesText.textContent = 'All Clues';
            cluesNameCell.appendChild(cluesText);

            cluesRow.appendChild(cluesNameCell);
            cluesRow.innerHTML += `
                <td>${cluesRank}</td>
                <td>${userData.cluesTotal || 0}</td>
            `;
            catBody.appendChild(cluesRow);

            // Individual Clue Tiers
            const clueTiers = [
                { id: 'easy', name: 'Easy Clues' },
                { id: 'medium', name: 'Medium Clues' },
                { id: 'hard', name: 'Hard Clues' },
                { id: 'elite', name: 'Elite Clues' },
                { id: 'master', name: 'Master Clues' }
            ];
            
            for (const tier of clueTiers) {
                const tierRank = await this.getPlayerRank(uid, `clues${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`);
                const tierRow = document.createElement('tr');
                const tierNameCell = document.createElement('td');
                tierNameCell.className = 'hiscores-skill-name-cell';
                
                // Try to get icon or use direct path
                const tierIcon = loadingManager.getImage(`items_${tier.id}_clue`);
                if (tierIcon) {
                    const iconImg = document.createElement('img');
                    iconImg.className = 'hiscores-inline-icon';
                    iconImg.src = tierIcon.src;
                    tierNameCell.appendChild(iconImg);
                } else {
                    // Direct path fallback
                    const iconImg = document.createElement('img');
                    iconImg.className = 'hiscores-inline-icon';
                    iconImg.src = `assets/items/${tier.id}_clue.png`;
                    tierNameCell.appendChild(iconImg);
                }
                
                const tierText = document.createElement('span');
                tierText.textContent = tier.name;
                tierNameCell.appendChild(tierText);
                
                tierRow.appendChild(tierNameCell);
                
                const fieldName = `clues${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`;
                tierRow.innerHTML += `
                    <td>${tierRank}</td>
                    <td>${userData[fieldName] || 0}</td>
                `;
                
                catBody.appendChild(tierRow);
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
            container.innerHTML = '<div class="hiscores-error">Failed to load player stats</div>';
        }
    }
    
    // Get player rank for a category
    async getPlayerRank(uid, category) {
        try {
            const { getDoc, doc, query, collection, where, orderBy, endBefore, getDocs, getCountFromServer } = window.firestoreHelpers;
            const playerDoc = await getDoc(doc(firebaseManager.db, 'hiscores', uid));
            if (!playerDoc.exists()) return 'Unranked';
            
            const playerData = playerDoc.data();
            
            if (category === 'overall') {
                const playerLevel = playerData.totalLevel;
                const playerXp = playerData.totalXp;
                const playerFirstReached = playerData.totalLevelFirstReached || firebaseManager.SENTINEL_DATE;
                
                // Use ORDER BY with endBefore to count players ahead
                const q = query(
                    collection(firebaseManager.db, 'hiscores'),
                    orderBy('totalLevel', 'desc'),
                    orderBy('totalXp', 'desc'),
                    orderBy('totalLevelFirstReached', 'asc'),
                    endBefore(playerLevel, playerXp, playerFirstReached)
                );
                
                const snapshot = await getCountFromServer(q);
                return snapshot.data().count + 1;
                
            } else if (category === 'tasks') {
                const playerTasks = playerData.tasksCompleted || 0;
                const q = query(
                    collection(firebaseManager.db, 'hiscores'),
                    where('tasksCompleted', '>', playerTasks)
                );
                const snapshot = await getDocs(q);
                return snapshot.size + 1;
            } else if (category === 'pets') {
                const playerPets = playerData.petsTotal || 0;
                const q = query(
                    collection(firebaseManager.db, 'hiscores'),
                    where('petsTotal', '>', playerPets)
                );
                const snapshot = await getDocs(q);
                return snapshot.size + 1;
            } else if (category === 'shinyPets') {
                const playerShiny = playerData.petsShiny || 0;
                const q = query(
                    collection(firebaseManager.db, 'hiscores'),
                    where('petsShiny', '>', playerShiny)
                );
                const snapshot = await getDocs(q);
                return snapshot.size + 1;
            } else if (category.startsWith('clues')) {
                const clueField = category === 'cluesTotal' ? 'cluesTotal' : category;
                const playerClues = playerData[clueField] || 0;
                const q = query(
                    collection(firebaseManager.db, 'hiscores'),
                    where(clueField, '>', playerClues)
                );
                const snapshot = await getDocs(q);
                return snapshot.size + 1;
            }
            
            return 'Error';
        } catch (error) {
            console.error('Failed to get player rank:', error);
            return 'Error';
        }
    }

    // Get player rank for a specific skill
    async getPlayerRankForSkill(uid, skillId) {
        try {
            const { getDoc, doc, query, collection, orderBy, endBefore, getCountFromServer } = window.firestoreHelpers;
            const playerDoc = await getDoc(doc(firebaseManager.db, 'hiscores', uid));
            if (!playerDoc.exists()) return 'Unranked';
            
            const playerData = playerDoc.data();
            const playerLevel = playerData[`level_${skillId}`] || 1;
            const playerXp = playerData[`xp_${skillId}`] || 0;
            const playerFirstReached = playerData[`levelFirst_${skillId}`] || firebaseManager.SENTINEL_DATE;
            
            // Use ORDER BY with endBefore to count players ahead
            const q = query(
                collection(firebaseManager.db, 'hiscores'),
                orderBy(`level_${skillId}`, 'desc'),
                orderBy(`xp_${skillId}`, 'desc'),
                orderBy(`levelFirst_${skillId}`, 'asc'),
                endBefore(playerLevel, playerXp, playerFirstReached)
            );
            
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count + 1;
            
        } catch (error) {
            console.error('Failed to get player skill rank:', error);
            return 'Error';
        }
    }
    
    // Compare two users
    async compareUsersDisplay(user1, user2) {
        if (!user1 || !user2) {
            alert('Please enter two usernames to compare');
            return;
        }
        
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '<div class="hiscores-loading">Loading comparison...</div>';
        
        try {
            const { query, collection, where, limit, getDocs } = window.firestoreHelpers;
            
            // Fetch both users
            const q1 = query(
                collection(firebaseManager.db, 'hiscores'),
                where('username', '==', user1),
                limit(1)
            );
            const user1Query = await getDocs(q1);
            
            const q2 = query(
                collection(firebaseManager.db, 'hiscores'),
                where('username', '==', user2),
                limit(1)
            );
            const user2Query = await getDocs(q2);
            
            if (user1Query.empty || user2Query.empty) {
                container.innerHTML = '<div class="hiscores-error">One or both players not found</div>';
                return;
            }
            
            const user1Data = user1Query.docs[0].data();
            const user2Data = user2Query.docs[0].data();
            const user1Id = user1Query.docs[0].id;
            const user2Id = user2Query.docs[0].id;
            
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
                    <th colspan="2">${user1}</th>
                    <th colspan="2">${user2}</th>
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
            const overallRank1 = await this.getPlayerRank(user1Id, 'overall');
            const overallRank2 = await this.getPlayerRank(user2Id, 'overall');
            await this.addCompareRowWithRank(
                skillsBody, 
                'Overall', 
                'skill_skills',
                overallRank1, user1Data.totalLevel,
                overallRank2, user2Data.totalLevel
            );
            
            // Individual skills comparison with icons
            const skillsData = loadingManager.getData('skills');
            for (const skillId of Object.keys(skillsData)) {
                const rank1 = await this.getPlayerRankForSkill(user1Id, skillId);
                const rank2 = await this.getPlayerRankForSkill(user2Id, skillId);
                await this.addCompareRowWithRank(
                    skillsBody,
                    skillsData[skillId].name,
                    `skill_${skillId}`,
                    rank1, user1Data[`level_${skillId}`] || 1,
                    rank2, user2Data[`level_${skillId}`] || 1
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
                    <th colspan="2">${user1}</th>
                    <th colspan="2">${user2}</th>
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
            const tasksRank1 = await this.getPlayerRank(user1Id, 'tasks');
            const tasksRank2 = await this.getPlayerRank(user2Id, 'tasks');
            await this.addCompareRowWithRank(
                catBody,
                'Tasks',
                'ui_tasks',
                tasksRank1, user1Data.tasksCompleted || 0,
                tasksRank2, user2Data.tasksCompleted || 0
            );
            
            // Pets comparison
            const petsRank1 = await this.getPlayerRank(user1Id, 'pets');
            const petsRank2 = await this.getPlayerRank(user2Id, 'pets');
            await this.addCompareRowWithRank(
                catBody,
                'Pets',
                'ui_pets',
                petsRank1, user1Data.petsTotal || 0,
                petsRank2, user2Data.petsTotal || 0
            );
            
            // Shiny Pets comparison
            const shinyRank1 = await this.getPlayerRank(user1Id, 'shinyPets');
            const shinyRank2 = await this.getPlayerRank(user2Id, 'shinyPets');
            await this.addCompareRowWithRank(
                catBody,
                'Shiny Pets',
                'ui_pets_shiny',
                shinyRank1, user1Data.petsShiny || 0,
                shinyRank2, user2Data.petsShiny || 0
            );

            // All Clues comparison
            const cluesRank1 = await this.getPlayerRank(user1Id, 'cluesTotal');
            const cluesRank2 = await this.getPlayerRank(user2Id, 'cluesTotal');
            await this.addCompareRowWithRank(
                catBody,
                'All Clues',
                'ui_all_clue',
                cluesRank1, user1Data.cluesTotal || 0,
                cluesRank2, user2Data.cluesTotal || 0
            );

            // Individual Clue Tier comparisons
            const clueTiers = [
                { id: 'easy', name: 'Easy Clues', icon: 'easy_clue' },
                { id: 'medium', name: 'Medium Clues', icon: 'medium_clue' },
                { id: 'hard', name: 'Hard Clues', icon: 'hard_clue' },
                { id: 'elite', name: 'Elite Clues', icon: 'elite_clue' },
                { id: 'master', name: 'Master Clues', icon: 'master_clue' }
            ];
            
            for (const tier of clueTiers) {
                const fieldName = `clues${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`;
                const tierRank1 = await this.getPlayerRank(user1Id, fieldName);
                const tierRank2 = await this.getPlayerRank(user2Id, fieldName);
                
                // Try to use preloaded icon or fallback to direct path
                let iconKey = `items_${tier.icon}`;
                if (!loadingManager.getImage(iconKey)) {
                    // If not preloaded, we'll handle it in addCompareRowWithRank
                    iconKey = null;
                }
                
                await this.addCompareRowWithRank(
                    catBody,
                    tier.name,
                    iconKey || `direct:assets/items/${tier.icon}.png`, // Use direct path prefix
                    tierRank1, user1Data[fieldName] || 0,
                    tierRank2, user2Data[fieldName] || 0
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
            container.innerHTML = '<div class="hiscores-error">Failed to compare users</div>';
        }
    }

    // New helper method for comparison rows with ranks
    async addCompareRowWithRank(tbody, label, iconKey, rank1, value1, rank2, value2) {
        const row = document.createElement('tr');
        
        // Name cell with icon
        const labelCell = document.createElement('td');
        labelCell.className = 'hiscores-skill-name-cell';
        
        if (iconKey) {
            if (iconKey.startsWith('direct:')) {
                // Handle direct path
                const iconImg = document.createElement('img');
                iconImg.className = 'hiscores-inline-icon';
                iconImg.src = iconKey.replace('direct:', '');
                labelCell.appendChild(iconImg);
            } else {
                // Try preloaded image
                const icon = loadingManager.getImage(iconKey);
                if (icon) {
                    const iconImg = document.createElement('img');
                    iconImg.className = 'hiscores-inline-icon';
                    iconImg.src = icon.src;
                    labelCell.appendChild(iconImg);
                } else if (iconKey.startsWith('items_')) {
                    // Fallback for items not preloaded
                    const itemId = iconKey.replace('items_', '');
                    const iconImg = document.createElement('img');
                    iconImg.className = 'hiscores-inline-icon';
                    iconImg.src = `assets/items/${itemId}.png`;
                    labelCell.appendChild(iconImg);
                }
            }
        }
        const labelText = document.createElement('span');
        labelText.textContent = label;
        labelCell.appendChild(labelText);
        
        // User 1 data
        const rank1Cell = document.createElement('td');
        rank1Cell.className = 'hiscores-compare-rank';
        rank1Cell.textContent = rank1;
        
        const value1Cell = document.createElement('td');
        value1Cell.className = 'hiscores-compare-value';
        value1Cell.textContent = typeof value1 === 'number' && value1 > 10000 ? 
            formatNumber(value1) : value1;
        
        // User 2 data
        const rank2Cell = document.createElement('td');
        rank2Cell.className = 'hiscores-compare-rank';
        rank2Cell.textContent = rank2;
        
        const value2Cell = document.createElement('td');
        value2Cell.className = 'hiscores-compare-value';
        value2Cell.textContent = typeof value2 === 'number' && value2 > 10000 ? 
            formatNumber(value2) : value2;
        
        // Winner cell
        const winnerCell = document.createElement('td');
        winnerCell.className = 'hiscores-compare-winner';
        
        // Determine winner (lower rank number is better, unless it's "Unranked")
        const rank1Num = rank1 === 'Unranked' ? Infinity : parseInt(rank1);
        const rank2Num = rank2 === 'Unranked' ? Infinity : parseInt(rank2);
        
        let winner = 0; // 0 for tie, 1 for user1, 2 for user2
        
        if (rank1Num < rank2Num) {
            winnerCell.textContent = '←';
            winnerCell.style.color = '#2ecc71';
            rank1Cell.style.color = '#2ecc71';
            value1Cell.style.color = '#2ecc71';
            rank2Cell.style.color = '#e74c3c';
            value2Cell.style.color = '#e74c3c';
            winner = 1;
        } else if (rank2Num < rank1Num) {
            winnerCell.textContent = '→';
            winnerCell.style.color = '#2ecc71';
            rank2Cell.style.color = '#2ecc71';
            value2Cell.style.color = '#2ecc71';
            rank1Cell.style.color = '#e74c3c';
            value1Cell.style.color = '#e74c3c';
            winner = 2;
        } else {
            winnerCell.textContent = '=';
            winnerCell.style.color = '#f39c12';
            winner = 0;
        }
        
        row.appendChild(labelCell);
        row.appendChild(rank1Cell);
        row.appendChild(value1Cell);
        row.appendChild(rank2Cell);
        row.appendChild(value2Cell);
        row.appendChild(winnerCell);
        
        tbody.appendChild(row);
        
        return winner; // Return the winner for tally tracking
    }
    
    // Add a comparison row
    addCompareRow(tbody, label, value1, value2, format = false) {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.textContent = label;
        
        const value1Cell = document.createElement('td');
        value1Cell.textContent = format ? formatNumber(value1) : value1;
        
        const value2Cell = document.createElement('td');
        value2Cell.textContent = format ? formatNumber(value2) : value2;
        
        // Color coding
        if (value1 > value2) {
            value1Cell.style.color = '#2ecc71';
            value2Cell.style.color = '#e74c3c';
        } else if (value2 > value1) {
            value1Cell.style.color = '#e74c3c';
            value2Cell.style.color = '#2ecc71';
        }
        
        row.appendChild(labelCell);
        row.appendChild(value1Cell);
        row.appendChild(value2Cell);
        tbody.appendChild(row);
    }
}

// Create global instance
window.hiScoresManager = new HiScoresManager();

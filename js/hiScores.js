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
        
        // Categories list
        const categories = [
            { id: 'overall', name: 'Overall', icon: 'skill_skills' },
            { id: 'tasks', name: 'Tasks', icon: 'skill_quests' },
            { id: 'pets', name: 'Pets', icon: null },
            { id: 'shinyPets', name: 'Shiny Pets', icon: null }
        ];
        
        // Add all skills
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            categories.push({
                id: `skill_${skillId}`,
                name: skillsData[skillId].name,
                icon: `skill_${skillId}`
            });
        }
        
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
    
    // Fetch leaderboard data from Firebase
async fetchLeaderboardData(category, page) {
    if (!firebaseManager.db) return [];
    
    const startAt = page * this.pageSize;
    let query;
    
    try {
        if (category === 'overall') {
            query = firebaseManager.db.collectionGroup('hiscores')
                .orderBy('totalLevel', 'desc')
                .orderBy('totalXp', 'desc')
                .limit(this.pageSize);
        } else if (category === 'tasks') {
            query = firebaseManager.db.collection('hiscores')
                .orderBy('tasksCompleted', 'desc')
                .limit(this.pageSize);
        } else if (category === 'pets') {
            query = firebaseManager.db.collection('hiscores')
                .orderBy('petsTotal', 'desc')
                .limit(this.pageSize);
        } else if (category === 'shinyPets') {
            query = firebaseManager.db.collection('hiscores')
                .orderBy('petsShiny', 'desc')
                .limit(this.pageSize);
        } else if (category.startsWith('skill_')) {
            const skillId = category.replace('skill_', '');
            query = firebaseManager.db.collectionGroup('hiscores')
                .orderBy(`level_${skillId}`, 'desc')
                .orderBy(`xp_${skillId}`, 'desc')
                .limit(this.pageSize);
        } else {
            return [];
        }
        
        // Apply offset for pagination
        if (startAt > 0) {
            const previousPage = await query.limit(startAt).get();
            if (previousPage.docs.length > 0) {
                const lastDoc = previousPage.docs[previousPage.docs.length - 1];
                query = query.startAfter(lastDoc);
            }
        }
        
        const snapshot = await query.get();
        return snapshot.docs.map((doc, index) => ({
            rank: startAt + index + 1,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Check if it's an index error
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.error('Missing index for query. Check the Firebase console for a link to create it.');
        }
        return [];
    }
}
    
    // Display leaderboard
    displayLeaderboard(data) {
        const container = document.getElementById('hiscores-leaderboard');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Title
        const title = document.createElement('h2');
        title.className = 'hiscores-leaderboard-title';
        title.textContent = this.getLeaderboardTitle();
        container.appendChild(title);
        
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
            const userQuery = await firebaseManager.db.collection('hiscores')
                .where('username', '==', username)
                .limit(1)
                .get();
            
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
            const userQuery = await firebaseManager.db.collection('hiscores')
                .where('username', '==', username)
                .limit(1)
                .get();
            
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
            
            // Overall
            const overallRank = await this.getPlayerRank(uid, 'overall');
            const overallRow = document.createElement('tr');
            overallRow.innerHTML = `
                <td>Overall</td>
                <td>${overallRank}</td>
                <td>${userData.totalLevel}</td>
                <td>${formatNumber(userData.totalXp)}</td>
            `;
            skillsBody.appendChild(overallRow);
            
            // Individual skills
            const skillsData = loadingManager.getData('skills');
            for (const skillId of Object.keys(skillsData)) {
                const skillRank = await this.getPlayerRankForSkill(uid, skillId);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${skillsData[skillId].name}</td>
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
            
            // Tasks
            const tasksRank = await this.getPlayerRank(uid, 'tasks');
            const tasksRow = document.createElement('tr');
            tasksRow.innerHTML = `
                <td>Tasks</td>
                <td>${tasksRank}</td>
                <td>${formatNumber(userData.tasksCompleted || 0)}</td>
            `;
            catBody.appendChild(tasksRow);
            
            // Pets
            const petsRank = await this.getPlayerRank(uid, 'pets');
            const petsRow = document.createElement('tr');
            petsRow.innerHTML = `
                <td>Pets</td>
                <td>${petsRank}</td>
                <td>${userData.petsTotal || 0}</td>
            `;
            catBody.appendChild(petsRow);
            
            // Shiny Pets
            const shinyRank = await this.getPlayerRank(uid, 'shinyPets');
            const shinyRow = document.createElement('tr');
            shinyRow.innerHTML = `
                <td>Shiny Pets</td>
                <td>${shinyRank}</td>
                <td>${userData.petsShiny || 0}</td>
            `;
            catBody.appendChild(shinyRow);
            
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
        const playerDoc = await firebaseManager.db.collection('hiscores').doc(uid).get();
        if (!playerDoc.exists) return 'Unranked';
        
        const playerData = playerDoc.data();
        let query;
        
        if (category === 'overall') {
            const playerLevel = playerData.totalLevel;
            const playerXp = playerData.totalXp;
            // Count players with better stats
            query = await firebaseManager.db.collectionGroup('hiscores')
                .where('totalLevel', '>', playerLevel)
                .get();
            
            // Also count players with same level but more XP
            const sameLevelQuery = await firebaseManager.db.collectionGroup('hiscores')
                .where('totalLevel', '==', playerLevel)
                .where('totalXp', '>', playerXp)
                .get();
            
            return query.size + sameLevelQuery.size + 1;
        } else if (category === 'tasks') {
            const playerTasks = playerData.tasksCompleted || 0;
            query = await firebaseManager.db.collection('hiscores')
                .where('tasksCompleted', '>', playerTasks)
                .get();
            return query.size + 1;
        } else if (category === 'pets') {
            const playerPets = playerData.petsTotal || 0;
            query = await firebaseManager.db.collection('hiscores')
                .where('petsTotal', '>', playerPets)
                .get();
            return query.size + 1;
        } else if (category === 'shinyPets') {
            const playerShiny = playerData.petsShiny || 0;
            query = await firebaseManager.db.collection('hiscores')
                .where('petsShiny', '>', playerShiny)
                .get();
            return query.size + 1;
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
        const playerDoc = await firebaseManager.db.collection('hiscores').doc(uid).get();
        if (!playerDoc.exists) return 'Unranked';
        
        const playerData = playerDoc.data();
        const playerLevel = playerData[`level_${skillId}`] || 1;
        const playerXp = playerData[`xp_${skillId}`] || 0;
        
        // Count players with higher level
        const higherLevelQuery = await firebaseManager.db.collectionGroup('hiscores')
            .where(`level_${skillId}`, '>', playerLevel)
            .get();
        
        // Count players with same level but more XP
        const sameLevelQuery = await firebaseManager.db.collectionGroup('hiscores')
            .where(`level_${skillId}`, '==', playerLevel)
            .where(`xp_${skillId}`, '>', playerXp)
            .get();
        
        return higherLevelQuery.size + sameLevelQuery.size + 1;
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
            // Fetch both users
            const user1Query = await firebaseManager.db.collection('hiscores')
                .where('username', '==', user1)
                .limit(1)
                .get();
            
            const user2Query = await firebaseManager.db.collection('hiscores')
                .where('username', '==', user2)
                .limit(1)
                .get();
            
            if (user1Query.empty || user2Query.empty) {
                container.innerHTML = '<div class="hiscores-error">One or both players not found</div>';
                return;
            }
            
            const user1Data = user1Query.docs[0].data();
            const user2Data = user2Query.docs[0].data();
            
            container.innerHTML = '';
            
            // Title
            const title = document.createElement('h2');
            title.className = 'hiscores-leaderboard-title';
            title.textContent = `Comparing ${user1} vs ${user2}`;
            container.appendChild(title);
            
            // Comparison table
            const table = document.createElement('table');
            table.className = 'hiscores-compare-table';
            
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Stat</th>
                    <th>${user1}</th>
                    <th>${user2}</th>
                </tr>
            `;
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            
            // Overall
            this.addCompareRow(tbody, 'Overall Level', user1Data.totalLevel, user2Data.totalLevel);
            this.addCompareRow(tbody, 'Total XP', user1Data.totalXp, user2Data.totalXp, true);
            
            // Skills
            const skillsData = loadingManager.getData('skills');
            for (const skillId of Object.keys(skillsData)) {
                this.addCompareRow(
                    tbody,
                    skillsData[skillId].name,
                    user1Data[`level_${skillId}`] || 1,
                    user2Data[`level_${skillId}`] || 1
                );
            }
            
            // Other stats
            this.addCompareRow(tbody, 'Tasks', user1Data.tasksCompleted || 0, user2Data.tasksCompleted || 0);
            this.addCompareRow(tbody, 'Pets', user1Data.petsTotal || 0, user2Data.petsTotal || 0);
            this.addCompareRow(tbody, 'Shiny Pets', user1Data.petsShiny || 0, user2Data.petsShiny || 0);
            
            table.appendChild(tbody);
            container.appendChild(table);
            
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

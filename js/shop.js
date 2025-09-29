class ShopSystem {
    constructor() {
        this.isOpen = false;
        this.isSellMode = false;
        this.currentStock = {
            supplies: null,
            resources1: null,
            resources2: null,
            runes: null
        };
        this.previousStock = {
            supplies: null,
            resources1: null,
            resources2: null,
            runes: null
        };
        this.shopData = null;
    }

    initialize() {
        // Load shop data
        this.shopData = loadingManager.getData('shop');
        if (!this.shopData) {
            console.error('Shop data not loaded!');
            return;
        }
        
        // Generate initial random stock
        this.rotateStock();
        
        console.log('Shop system initialized with stock:', this.currentStock);
    }

    // Rotate stock for all categories (called on task completion)
    rotateStock() {
        // Rotate supplies
        this.rotateCategory('supplies', 'supplies');
        
        // Rotate resources - ensure both are different from each other and previous
        this.rotateResources();
        
        // Rotate runes
        this.rotateCategory('runes', 'runes');
        
        // Update display if shop is open
        if (this.isOpen && window.ui) {
            window.ui.updateShop();
        }
    }

    // Special rotation for resources to ensure both slots are unique
    rotateResources() {
        const items = this.shopData['resources'];
        if (!items || items.length < 2) {
            console.error('Not enough resource items for shop!');
            return;
        }
        
        // Get list of items to exclude (previous resources1 and resources2)
        const excludeItems = [];
        if (this.currentStock.resources1) {
            excludeItems.push(this.currentStock.resources1.itemId);
        }
        if (this.currentStock.resources2) {
            excludeItems.push(this.currentStock.resources2.itemId);
        }
        
        // Filter available items
        let availableItems = items.filter(item => 
            !excludeItems.includes(item.itemId)
        );
        
        // If not enough items available, just exclude duplicates within current rotation
        if (availableItems.length < 2) {
            availableItems = items;
        }
        
        // Pick first resource
        const firstIndex = Math.floor(Math.random() * availableItems.length);
        const firstItem = availableItems[firstIndex];
        
        // Store previous and set new resources1
        this.previousStock.resources1 = this.currentStock.resources1;
        this.currentStock.resources1 = {
            itemId: firstItem.itemId,
            basePrice: firstItem.basePrice,
            currentPrice: this.rollPrice(firstItem.basePrice)
        };
        
        // Remove first item from available for second selection
        availableItems = availableItems.filter(item => item.itemId !== firstItem.itemId);
        
        // Pick second resource
        if (availableItems.length > 0) {
            const secondIndex = Math.floor(Math.random() * availableItems.length);
            const secondItem = availableItems[secondIndex];
            
            // Store previous and set new resources2
            this.previousStock.resources2 = this.currentStock.resources2;
            this.currentStock.resources2 = {
                itemId: secondItem.itemId,
                basePrice: secondItem.basePrice,
                currentPrice: this.rollPrice(secondItem.basePrice)
            };
        }
    }

    // Rotate a single category, ensuring no repeat
    rotateCategory(category, stockKey) {
        const items = this.shopData[category];
        if (!items || items.length === 0) return;
        
        // If only one item in category, can't rotate
        if (items.length === 1) {
            const item = items[0];
            this.currentStock[stockKey] = {
                itemId: item.itemId,
                basePrice: item.basePrice,
                currentPrice: this.rollPrice(item.basePrice)
            };
            return;
        }
        
        // Get available items (exclude previous if it exists)
        let availableItems = items;
        if (this.currentStock[stockKey]) {
            availableItems = items.filter(item => 
                item.itemId !== this.currentStock[stockKey].itemId
            );
        }
        
        // Pick random item from available
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const selectedItem = availableItems[randomIndex];
        
        // Store previous and set new
        this.previousStock[stockKey] = this.currentStock[stockKey];
        this.currentStock[stockKey] = {
            itemId: selectedItem.itemId,
            basePrice: selectedItem.basePrice,
            currentPrice: this.rollPrice(selectedItem.basePrice)
        };
    }

    // Roll a random price between 0.5x and 2x base price (whole numbers only)
    rollPrice(basePrice) {
        const min = Math.ceil(basePrice * 0.5);
        const max = Math.floor(basePrice * 2);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Open the shop panel
    open() {
        this.isOpen = true;
        // Panel switching is handled by UI
    }

    // Close the shop panel
    close() {
        this.isOpen = false;
    }

    // Toggle between buy and sell modes
toggleMode(mode) {
    this.isSellMode = (mode === 'sell');
    // Update display if shop is open
    if (this.isOpen && window.ui) {
        window.ui.updateShop();
    }
}

    // Buy or sell an item depending on mode
transactItem(stockKey, quantity) {
    if (this.isSellMode) {
        return this.sellItem(stockKey, quantity);
    } else {
        return this.buyItem(stockKey, quantity);
    }
}

    // Buy an item - now takes stockKey instead of category
    buyItem(stockKey, quantity) {
        const stock = this.currentStock[stockKey];
        if (!stock) {
            console.error(`No stock in slot: ${stockKey}`);
            return false;
        }
        
        const totalCost = stock.currentPrice * quantity;
        
        // Check if player has enough gold in bank
        const bankGold = window.bank ? bank.getItemCount('coins') : 0;
        if (bankGold < totalCost) {
            console.log(`Not enough gold in bank! Need ${totalCost}, have ${bankGold}`);
            return false;
        }
        
        // Get item data
        const itemData = loadingManager.getData('items')[stock.itemId];
        if (!itemData) {
            console.error(`Item data not found for ${stock.itemId}`);
            return false;
        }
        
        // Perform the transaction - withdraw gold from bank
        const withdrawn = bank.withdraw('coins', totalCost);
        if (withdrawn !== totalCost) {
            console.error('Failed to withdraw gold from bank!');
            return false;
        }
        
        // Add items directly to bank
        bank.deposit(stock.itemId, quantity);
        
        console.log(`Bought ${quantity} ${itemData.name} for ${totalCost} gold (sent to bank)`);
        
        // Update displays
        if (window.ui) {
            window.ui.updateBank();
            window.ui.updateShop();
        }
        
        return true;
    }

    sellItem(stockKey, quantity) {
    const stock = this.currentStock[stockKey];
    if (!stock) {
        console.error(`No stock in slot: ${stockKey}`);
        return false;
    }
    
    // Check if player has enough items in bank
    const bankCount = window.bank ? bank.getItemCount(stock.itemId) : 0;
    if (bankCount < quantity) {
        console.log(`Not enough items in bank! Have ${bankCount}, trying to sell ${quantity}`);
        return false;
    }
    
    // Calculate sell price (20% of current price, minimum 1 gp)
    const sellPrice = Math.max(1, Math.floor(stock.currentPrice * 0.2));
    const totalGain = sellPrice * quantity;
    
    // Get item data
    const itemData = loadingManager.getData('items')[stock.itemId];
    if (!itemData) {
        console.error(`Item data not found for ${stock.itemId}`);
        return false;
    }
    
    // Perform the transaction - withdraw items from bank
    const withdrawn = bank.withdraw(stock.itemId, quantity);
    if (withdrawn !== quantity) {
        console.error('Failed to withdraw items from bank!');
        return false;
    }
    
    // Add gold to bank
    bank.deposit('coins', totalGain);
    
    console.log(`Sold ${quantity} ${itemData.name} for ${totalGain} gold`);
    
    // Update displays
    if (window.ui) {
        window.ui.updateBank();
        window.ui.updateShop();
    }
    
    return true;
}

    // Get current stock for save/load
    getState() {
        return {
            currentStock: this.currentStock,
            previousStock: this.previousStock
        };
    }

    // Load saved stock state
    loadState(state) {
        if (state.currentStock) {
            this.currentStock = state.currentStock;
        }
        if (state.previousStock) {
            this.previousStock = state.previousStock;
        }
    }
}

// Make ShopSystem available globally
window.ShopSystem = ShopSystem;

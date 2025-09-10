class ShopSystem {
    constructor() {
        this.isOpen = false;
        this.currentStock = {
            supplies: null,
            resources: null,
            runes: null
        };
        this.previousStock = {
            supplies: null,
            resources: null,
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
        for (const category of ['supplies', 'resources', 'runes']) {
            this.rotateCategory(category);
        }
        
        // Update display if shop is open
        if (this.isOpen && window.ui) {
            window.ui.updateShop();
        }
    }

    // Rotate a single category, ensuring no repeat
    rotateCategory(category) {
        const items = this.shopData[category];
        if (!items || items.length === 0) return;
        
        // If only one item in category, can't rotate
        if (items.length === 1) {
            const item = items[0];
            this.currentStock[category] = {
                itemId: item.itemId,
                basePrice: item.basePrice,
                currentPrice: this.rollPrice(item.basePrice)
            };
            return;
        }
        
        // Get available items (exclude previous if it exists)
        let availableItems = items;
        if (this.currentStock[category]) {
            availableItems = items.filter(item => 
                item.itemId !== this.currentStock[category].itemId
            );
        }
        
        // Pick random item from available
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const selectedItem = availableItems[randomIndex];
        
        // Store previous and set new
        this.previousStock[category] = this.currentStock[category];
        this.currentStock[category] = {
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

    // Buy an item
    buyItem(category, quantity) {
        const stock = this.currentStock[category];
        if (!stock) {
            console.error(`No stock in category: ${category}`);
            return false;
        }
        
        const totalCost = stock.currentPrice * quantity;
        
        // Check if player has enough gold in bank
        const bankGold = window.bank ? bank.getItemCount('coins') : 0;
        if (bankGold < totalCost) {
            console.log(`Not enough gold in bank! Need ${totalCost}, have ${bankGold}`);
            return false;
        }
        
        // Check inventory space for non-stackable items
        const itemData = loadingManager.getData('items')[stock.itemId];
        if (!itemData) {
            console.error(`Item data not found for ${stock.itemId}`);
            return false;
        }
        
        // Calculate slots needed
        let slotsNeeded = 0;
        if (!itemData.stackable) {
            slotsNeeded = quantity;
        } else {
            // Check if we already have a stack
            const currentCount = inventory.getItemCount(stock.itemId);
            if (currentCount === 0) {
                slotsNeeded = 1; // Need one new slot for the stack
            }
            // Otherwise it goes into existing stack
        }
        
        const emptySlots = inventory.getEmptySlots();
        if (slotsNeeded > emptySlots) {
            console.log(`Not enough inventory space! Need ${slotsNeeded} slots, have ${emptySlots}`);
            return false;
        }
        
        // Perform the transaction - withdraw gold from bank
        const withdrawn = bank.withdraw('coins', totalCost);
        if (withdrawn !== totalCost) {
            console.error('Failed to withdraw gold from bank!');
            return false;
        }
        
        // Add items to inventory
        const added = inventory.addItem(stock.itemId, quantity);
        
        if (added < quantity) {
            // Shouldn't happen due to our checks, but handle it
            console.error(`Only added ${added} of ${quantity} items`);
            // Refund the difference
            const refund = (quantity - added) * stock.currentPrice;
            bank.deposit('coins', refund);
        }
        
        console.log(`Bought ${added} ${itemData.name} for ${totalCost} gold`);
        
        // Update displays
        if (window.ui) {
            window.ui.updateInventory();
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

class Bank {
    constructor() {
        this.items = {}; // itemId -> quantity
    }

    deposit(itemId, quantity) {
        if (!this.items[itemId]) {
            this.items[itemId] = 0;
        }
        this.items[itemId] += quantity;
        
        // Invalidate task cache
        if (window.taskManager) {
            taskManager.invalidateCache();
        }
        
        // Notify UI - using new UI system
        if (window.ui) {
            window.ui.updateBank();
        }
        
        // DON'T update task progress here - it will be handled by the next AI decision
        // This prevents double-counting when banking
    }

    withdraw(itemId, quantity) {
        if (!this.items[itemId] || this.items[itemId] < quantity) {
            return 0;
        }

        this.items[itemId] -= quantity;
        if (this.items[itemId] <= 0) {
            delete this.items[itemId];
        }

        // Invalidate task cache
        if (window.taskManager) {
            taskManager.invalidateCache();
        }

        // Notify UI - using new UI system
        if (window.ui) {
            window.ui.updateBank();
        }

        return quantity;
    }

    // Withdraw up to a maximum amount (useful for non-stackable items)
    withdrawUpTo(itemId, maxQuantity) {
        if (!this.items[itemId]) {
            return 0;
        }

        const available = this.items[itemId];
        const toWithdraw = Math.min(available, maxQuantity);

        this.items[itemId] -= toWithdraw;
        if (this.items[itemId] <= 0) {
            delete this.items[itemId];
        }

        // Notify UI - using new UI system
        if (window.ui) {
            window.ui.updateBank();
        }

        return toWithdraw;
    }

    getItemCount(itemId) {
        return this.items[itemId] || 0;
    }

    depositAll() {
        const inventory = window.inventory;
        let deposited = 0;

        for (let i = 0; i < inventory.maxSlots; i++) {
            const slot = inventory.slots[i];
            if (slot) {
                // Check if this is a noted item that needs conversion
                const itemData = loadingManager.getData('items')[slot.itemId];
                if (itemData && itemData.category === 'note' && itemData.convertsTo) {
                    // Convert noted item to regular item
                    this.deposit(itemData.convertsTo, slot.quantity);
                    console.log(`Converted ${slot.quantity} ${itemData.name} to ${itemData.convertsTo}`);
                } else {
                    // Regular deposit
                    this.deposit(slot.itemId, slot.quantity);
                }
                deposited += slot.quantity;
            }
        }

        inventory.clear();
        
        // Scan and equip best equipment after banking
        this.scanAndEquipBestItems();
        
        // Note: deposit() and clear() already notify UI, no need to do it again
        
        return deposited;
    }

    depositItem(itemId) {
        const inventory = window.inventory;
        const count = inventory.getItemCount(itemId);
        if (count > 0) {
            const removed = inventory.removeItem(itemId, count);
            this.deposit(itemId, removed);
            return removed;
        }
        return 0;
    }

    getAllItems() {
        return { ...this.items };
    }

    getTotalItems() {
        return Object.values(this.items).reduce((sum, count) => sum + count, 0);
    }

    getUniqueItems() {
        return Object.keys(this.items).length;
    }

            // ==================== EQUIPMENT MANAGEMENT ====================
    
    // Scan bank for equipment and auto-equip best items
    scanAndEquipBestItems() {
        // Prevent recursive calls
        if (this._scanningEquipment) {
            return;
        }
        this._scanningEquipment = true;
        
        // Initialize equipment panels if needed
        if (!window.equipmentPanels) {
            window.equipmentPanels = {
                melee: {},
                ranged: {},
                magic: {}
            };
            window.gearScores = {
                melee: 0,
                ranged: 0,
                magic: 0
            };
        }
        
        // Clear current equipment
        for (const style of ['melee', 'ranged', 'magic']) {
            window.equipmentPanels[style] = {};
            window.gearScores[style] = 0;
        }
        
        // Track best item per slot per combat style
        const bestItems = {
            melee: {},
            ranged: {},
            magic: {}
        };
        
        // Scan all items in bank
        const items = loadingManager.getData('items');
        for (const [itemId, quantity] of Object.entries(this.items)) {
            const itemData = items[itemId];
            
            // Skip non-equipment
            if (!itemData || itemData.category !== 'equipment') continue;
            if (quantity <= 0) continue;
            
            const slot = itemData.equipmentSlot;
            const combatStyles = itemData.combatStyle;
            const bonus = itemData.combatBonus || 0;
            
            if (!slot || !combatStyles) continue;
            
            // Handle both single style (string) and multiple styles (array)
            const styles = Array.isArray(combatStyles) ? combatStyles : [combatStyles];
            
            // Check each applicable combat style
            for (const style of styles) {
                // Normalize style names (handle both "magic" and "mage")
                const normalizedStyle = style === 'mage' ? 'magic' : style;
                
                // Skip if not a valid style
                if (!['melee', 'ranged', 'magic'].includes(normalizedStyle)) continue;
                
                // Check if this is better than current best for this slot/style
                if (!bestItems[normalizedStyle][slot] || bestItems[normalizedStyle][slot].combatBonus < bonus) {
                    bestItems[normalizedStyle][slot] = {
                        itemId: itemId,
                        name: itemData.name,
                        combatBonus: bonus,
                        combatStyle: normalizedStyle
                    };
                }
            }
        }
        
        // Equip the best items and calculate gear scores
        for (const style of ['melee', 'ranged', 'magic']) {
            let totalBonus = 0;
            for (const [slot, item] of Object.entries(bestItems[style])) {
                window.equipmentPanels[style][slot] = item;
                totalBonus += item.combatBonus;
            }
            window.gearScores[style] = totalBonus;
        }
        
        console.log('Equipment panels updated:', window.equipmentPanels);
        console.log('Gear scores:', window.gearScores);
        
        // Update UI if equipment panel is open
        if (window.ui && window.ui.currentPanel === 'equipment') {
            window.ui.updateEquipment();
        }
    }

    
}

// Make Bank available globally
window.Bank = Bank;

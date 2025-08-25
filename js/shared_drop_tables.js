// Shared drop tables used by multiple skills/activities
class SharedDropTables {
    constructor() {
        this.tables = {
            // Herb table - ordered to match items.json
            herbs: [
                { itemId: 'grimy_guam_leaf', chance: 1/22.3 },
                { itemId: 'grimy_marrentill', chance: 1/29.7 },
                { itemId: 'grimy_tarromin', chance: 1/39.6 },
                { itemId: 'grimy_harralander', chance: 1/50.9 },
                { itemId: 'grimy_ranarr_weed', chance: 1/64.8 },
                { itemId: 'grimy_toadflax', chance: 1/1000 },
                { itemId: 'grimy_irit_leaf', chance: 1/89 },
                { itemId: 'grimy_avantoe', chance: 1/118.7 },
                { itemId: 'grimy_kwuarm', chance: 1/142.5 },
                { itemId: 'grimy_snapdragon', chance: 1/800 },
                { itemId: 'grimy_cadantine', chance: 1/178.1 },
                { itemId: 'grimy_lantadyme', chance: 1/237.4 },
                { itemId: 'grimy_dwarf_weed', chance: 1/237.4 },
                { itemId: 'grimy_torstol', chance: 1/1600 }
            ],
            
            // Master Farmer seed table - ordered to match items.json
            // Note: potato_seed is handled separately with 80% chance
            master_farmer_seeds: [
                { itemId: 'snape_grass_seed', chance: 1/260 },
                { itemId: 'limpwurt_seed', chance: 1/86.3 },
                { itemId: 'potato_cactus_seed', chance: 1/2460 },
                { itemId: 'guam_seed', chance: 1/63 },
                { itemId: 'marrentill_seed', chance: 1/95.6 },
                { itemId: 'tarromin_seed', chance: 1/140 },
                { itemId: 'harralander_seed', chance: 1/206 },
                { itemId: 'ranarr_seed', chance: 1/320 },
                { itemId: 'toadflax_seed', chance: 1/443 },
                { itemId: 'irit_seed', chance: 1/651 },
                { itemId: 'avantoe_seed', chance: 1/947 },
                { itemId: 'kwuarm_seed', chance: 1/1389 },
                { itemId: 'snapdragon_seed', chance: 1/2400 },
                { itemId: 'cadantine_seed', chance: 1/2976 },
                { itemId: 'lantadyme_seed', chance: 1/4167 },
                { itemId: 'dwarf_weed_seed', chance: 1/6944 },
                { itemId: 'torstol_seed', chance: 1/12000 }
            ]
        };
    }
    
    rollHerbTable() {
        const roll = Math.random();
        let cumulative = 0;
        
        for (const herb of this.tables.herbs) {
            cumulative += herb.chance;
            if (roll < cumulative) {
                return { itemId: herb.itemId, quantity: 1 };
            }
        }
        
        return null; // No herb dropped
    }
    
    rollMasterFarmerSeeds() {
        // 1/5 chance (20%) for special seeds, otherwise potato seed
        if (Math.random() > 0.2) {
            return { itemId: 'potato_seed', quantity: 1 };
        }
        
        // Roll for special seeds
        const roll = Math.random();
        let cumulative = 0;
        
        for (const seed of this.tables.master_farmer_seeds) {
            cumulative += seed.chance;
            if (roll < cumulative) {
                return { itemId: seed.itemId, quantity: 1 };
            }
        }
        
        // Fallback to potato seed (shouldn't normally reach here)
        return { itemId: 'potato_seed', quantity: 1 };
    }
    
    getTable(tableName) {
        return this.tables[tableName] || null;
    }
}

// Create global instance
window.sharedDropTables = new SharedDropTables();

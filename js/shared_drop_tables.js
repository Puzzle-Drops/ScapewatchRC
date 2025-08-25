// Shared drop tables used by multiple skills/activities
class SharedDropTables {
    constructor() {
        this.tables = {
            // Herb table - ordered to match items.json
            // Moderately flattened distribution: common herbs ~5%, rare herbs ~0.2%
            herbs: [
                { itemId: 'grimy_guam_leaf', chance: 1/20 },       // 5% - Very common
                { itemId: 'grimy_marrentill', chance: 1/25 },      // 4% - Very common
                { itemId: 'grimy_tarromin', chance: 1/33 },        // 3% - Common
                { itemId: 'grimy_harralander', chance: 1/45 },     // 2.2% - Common
                { itemId: 'grimy_ranarr_weed', chance: 1/80 },     // 1.25% - Valuable mid-tier
                { itemId: 'grimy_toadflax', chance: 1/150 },       // 0.67% - Mid-tier
                { itemId: 'grimy_irit_leaf', chance: 1/100 },      // 1% - Mid-tier
                { itemId: 'grimy_avantoe', chance: 1/120 },        // 0.83% - Mid-high tier
                { itemId: 'grimy_kwuarm', chance: 1/140 },         // 0.71% - High tier
                { itemId: 'grimy_snapdragon', chance: 1/200 },     // 0.5% - Valuable high tier
                { itemId: 'grimy_cadantine', chance: 1/180 },      // 0.56% - High tier
                { itemId: 'grimy_lantadyme', chance: 1/250 },      // 0.4% - Very rare
                { itemId: 'grimy_dwarf_weed', chance: 1/300 },     // 0.33% - Very rare
                { itemId: 'grimy_torstol', chance: 1/500 }         // 0.2% - Rarest herb
            ],
            
            // Master Farmer seed table - ordered to match items.json
            // Note: potato_seed is handled separately with 80% chance
            // Moderately flattened distribution: common seeds ~3-5%, rare seeds ~0.05%
            master_farmer_seeds: [
                { itemId: 'snape_grass_seed', chance: 1/50 },      // 2% - Secondary ingredient
                { itemId: 'limpwurt_seed', chance: 1/40 },         // 2.5% - Secondary ingredient
                { itemId: 'potato_cactus_seed', chance: 1/800 },   // 0.125% - Rare secondary
                { itemId: 'guam_seed', chance: 1/20 },             // 5% - Very common herb
                { itemId: 'marrentill_seed', chance: 1/25 },       // 4% - Very common herb
                { itemId: 'tarromin_seed', chance: 1/35 },         // 2.86% - Common herb
                { itemId: 'harralander_seed', chance: 1/50 },      // 2% - Common herb
                { itemId: 'ranarr_seed', chance: 1/150 },          // 0.67% - Valuable mid-tier
                { itemId: 'toadflax_seed', chance: 1/200 },        // 0.5% - Mid-tier herb
                { itemId: 'irit_seed', chance: 1/300 },            // 0.33% - Mid-tier herb
                { itemId: 'avantoe_seed', chance: 1/400 },         // 0.25% - Mid-high tier
                { itemId: 'kwuarm_seed', chance: 1/500 },          // 0.2% - High tier herb
                { itemId: 'snapdragon_seed', chance: 1/800 },      // 0.125% - Valuable high tier
                { itemId: 'cadantine_seed', chance: 1/1000 },      // 0.1% - Very high tier
                { itemId: 'lantadyme_seed', chance: 1/1500 },      // 0.067% - Very rare herb
                { itemId: 'dwarf_weed_seed', chance: 1/1800 },     // 0.056% - Very rare herb
                { itemId: 'torstol_seed', chance: 1/2000 }         // 0.05% - Rarest (1 in 2000)
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
        // 1/2 chance (50%) for special seeds, otherwise potato seed
        if (Math.random() > 0.5) {
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

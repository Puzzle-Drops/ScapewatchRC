class NodeManager {
    constructor() {
        this.nodes = {};
        this.loadNodes();
    }

    loadNodes() {
        this.nodes = loadingManager.getData('nodes');
        
        // Validate nodes are in walkable positions after collision system loads
        setTimeout(() => {
            if (window.collision && window.collision.initialized) {
                this.validateNodePositions();
            } else {
                // If collision isn't ready, keep trying
                const retryInterval = setInterval(() => {
                    if (window.collision && window.collision.initialized) {
                        this.validateNodePositions();
                        clearInterval(retryInterval);
                    }
                }, 100);
            }
        }, 250);
    }

    validateNodePositions() {
        let invalidNodes = [];
        
        for (const [id, node] of Object.entries(this.nodes)) {
            // Check if the exact position is walkable
            const isWalkable = collision.isWalkable(
                Math.floor(node.position.x), 
                Math.floor(node.position.y)
            );
            
            if (!isWalkable) {
                invalidNodes.push(id);
                console.warn(`Node ${id} (${node.name}) is in a non-walkable position at (${node.position.x}, ${node.position.y})!`);
            }
            
            // Validate that nearestBank exists if specified
            if (node.nearestBank && !this.nodes[node.nearestBank]) {
                console.warn(`Node ${id} references non-existent bank: ${node.nearestBank}`);
            }
        }
        
        if (invalidNodes.length > 0) {
            console.warn(`Found ${invalidNodes.length} nodes in non-walkable positions. These nodes will be excluded from pathfinding.`);
        } else {
            console.log('All nodes are in walkable positions.');
        }
    }

    getNode(nodeId) {
        return this.nodes[nodeId];
    }

    getNodesOfType(type) {
        return Object.values(this.nodes).filter(node => node.type === type);
    }

    getNearestNodeWithActivity(position, activityId) {
        const nodesWithActivity = Object.values(this.nodes).filter(
            node => node.activities && node.activities.includes(activityId)
        );

        let nearest = null;
        let minDistance = Infinity;

        for (const node of nodesWithActivity) {
            // Check if we can actually path to this node
            if (window.pathfinding) {
                const path = pathfinding.findPath(position.x, position.y, node.position.x, node.position.y);
                if (!path) continue; // Skip inaccessible nodes
            }
            
            const dist = distance(position.x, position.y, node.position.x, node.position.y);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = node;
            }
        }

        return nearest;
    }

    getAvailableActivities(nodeId) {
        const node = this.nodes[nodeId];
        if (!node || !node.activities) return [];

        const activities = loadingManager.getData('activities');
        return node.activities.filter(activityId => {
            const activity = activities[activityId];
            return activity && skills.canPerformActivity(activityId);
        });
    }

    getAllNodes() {
        return this.nodes;
    }

    getNodeAt(x, y, radius = 2) {
        for (const [id, node] of Object.entries(this.nodes)) {
            const dist = distance(x, y, node.position.x, node.position.y);
            if (dist <= radius) {
                return node;
            }
        }
        return null;
    }

    // Get the minimum level requirement for a node
getNodeMinLevel(nodeId) {
    const node = this.nodes[nodeId];
    if (!node) return 999; // Invalid node
    
    // Banks are always level 1 for clue purposes
    if (node.type === 'bank') {
        return 1;
    }
    
    // Quest nodes shouldn't be used for clues
    if (node.type === 'quest') {
        return 999;
    }
    
    // For skill nodes, find the minimum level across all activities
    if (!node.activities || node.activities.length === 0) {
        return 999; // No activities
    }
    
    const activities = loadingManager.getData('activities');
    let minLevel = 99;
    
    for (const activityId of node.activities) {
        const activity = activities[activityId];
        if (!activity) continue;
        
        const requiredLevel = activity.requiredLevel || 1;
        minLevel = Math.min(minLevel, requiredLevel);
    }
    
    return minLevel;
}

// Get all nodes valid for a clue tier
getNodesForClueTier(maxLevel) {
    const validNodes = [];
    
    for (const [nodeId, node] of Object.entries(this.nodes)) {
        // Skip quest nodes
        if (node.type === 'quest') continue;
        
        const nodeLevel = this.getNodeMinLevel(nodeId);
        
        // Include if it's a bank (always level 1) or within level range
        if (node.type === 'bank' || nodeLevel <= maxLevel) {
            validNodes.push(nodeId);
        }
    }
    
    return validNodes;
}
    
}

// Make NodeManager available globally
window.NodeManager = NodeManager;

class Pathfinding {
    constructor(collisionSystem) {
        this.collision = collisionSystem;
    }

    // A* pathfinding algorithm
    findPath(startX, startY, endX, endY) {
        if (!this.collision.initialized) {
            console.error('Collision system not initialized');
            return null;
        }

        // Round positions to pixels and center them (add 0.5)
        const start = { x: Math.floor(startX) + 0.5, y: Math.floor(startY) + 0.5 };
        const end = { x: Math.floor(endX) + 0.5, y: Math.floor(endY) + 0.5 };

        // Check if start and end are walkable (use floor since collision uses integer coords)
        if (!this.collision.isWalkable(Math.floor(start.x), Math.floor(start.y))) {
            console.error('Start position is not walkable');
            return null;
        }
        if (!this.collision.isWalkable(Math.floor(end.x), Math.floor(end.y))) {
            console.error(`End position (${Math.floor(endX)}, ${Math.floor(endY)}) is not walkable - Target: ${endX.toFixed(1)}, ${endY.toFixed(1)}`);
            return null;
        }

        // Check if we have line of sight - if so, just go straight
        if (this.collision.isLineOfSight(Math.floor(start.x), Math.floor(start.y), Math.floor(end.x), Math.floor(end.y))) {
            return [start, end];
        }

        // A* implementation
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${start.x},${start.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));
        openSet.enqueue(start, fScore.get(startKey));

        while (!openSet.isEmpty()) {
            const current = openSet.dequeue();
            const currentKey = `${current.x},${current.y}`;

            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // Check all neighbors (getWalkableNeighbors returns integer coords, so center them)
            const neighbors = this.collision.getWalkableNeighbors(Math.floor(current.x), Math.floor(current.y));
            
            for (const neighbor of neighbors) {
                // Center the neighbor on the pixel
                neighbor.x = neighbor.x + 0.5;
                neighbor.y = neighbor.y + 0.5;
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // Calculate tentative g score
                const isDiagonal = Math.abs(neighbor.x - current.x) === 1 && Math.abs(neighbor.y - current.y) === 1;
                const moveCost = isDiagonal ? Math.sqrt(2) : 1;
                const tentativeGScore = gScore.get(currentKey) + moveCost;

                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    // This path is better
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));

                    if (!openSet.contains(neighbor)) {
                        openSet.enqueue(neighbor, fScore.get(neighborKey));
                    }
                }
            }
        }

        // No path found
        console.log('No path found');
        return null;
    }

    heuristic(a, b) {
        // Euclidean distance
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.y}`;
        }
        
        // Ensure all waypoints are centered on pixels
        const centeredPath = path.map(point => ({
            x: Math.floor(point.x) + 0.5,
            y: Math.floor(point.y) + 0.5
        }));

        // Smooth the path
        return this.smoothPath(centeredPath);
    }

    smoothPath(path) {
        if (path.length < 3) return path;

        const smoothed = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            let farthest = current + 1;
            
            // Find the farthest point we can see (use floor for collision checks)
            for (let i = current + 2; i < path.length; i++) {
                if (this.collision.isLineOfSight(
                    Math.floor(path[current].x), 
                    Math.floor(path[current].y), 
                    Math.floor(path[i].x), 
                    Math.floor(path[i].y)
                )) {
                    farthest = i;
                } else {
                    break;
                }
            }

            smoothed.push(path[farthest]);
            current = farthest;
        }

        return smoothed;
    }

    // ==================== WAYPOINT PATH METHODS ====================
    
    // Get a pre-computed path from node to its bank
    getNodeToBankPath(nodeId) {
        const nodeData = window.nodes ? nodes.getNode(nodeId) : null;
        if (!nodeData) return null;
        
        // Banks don't have pathToBank
        if (nodeData.type === 'bank') return null;
        
        return nodeData.pathToBank || null;
    }
    
    // Get a pre-computed path between two banks
    getBankToBankPath(fromBankId, toBankId) {
        if (fromBankId === toBankId) return null;
        
        const fromBank = window.nodes ? nodes.getNode(fromBankId) : null;
        if (!fromBank || fromBank.type !== 'bank') return null;
        
        if (!fromBank.pathsToOtherBanks) return null;
        
        return fromBank.pathsToOtherBanks[toBankId] || null;
    }
    
    // Build a complete waypoint path using hub-and-spoke routing
    buildWaypointPath(fromNodeId, toNodeId) {
        const fromNode = window.nodes ? nodes.getNode(fromNodeId) : null;
        const toNode = window.nodes ? nodes.getNode(toNodeId) : null;
        
        if (!fromNode || !toNode) return null;
        
        // Get the banks for each node
        const fromBank = fromNode.nearestBank;
        const toBank = toNode.nearestBank;
        
        if (!fromBank || !toBank) return null;
        
        const fullPath = [];
        
        // Step 1: From start node to its bank (if not already at bank)
        if (fromNode.type !== 'bank' && fromNode.pathToBank) {
            // Add all waypoints from node to bank
            fullPath.push(...fromNode.pathToBank);
        }
        
        // Step 2: From first bank to second bank (if different banks)
        if (fromBank !== toBank) {
            const bankToBank = this.getBankToBankPath(fromBank, toBank);
            if (bankToBank) {
                // Remove first waypoint if we have waypoints from step 1 (avoid duplicate)
                if (fullPath.length > 0) {
                    fullPath.push(...bankToBank.slice(1));
                } else {
                    fullPath.push(...bankToBank);
                }
            }
        }
        
        // Step 3: From second bank to destination node (if not a bank)
        if (toNode.type !== 'bank' && toNode.pathToBank) {
            // Reverse the path (since it's stored as node→bank, we need bank→node)
            const reversedPath = [...toNode.pathToBank].reverse();
            // Remove first waypoint to avoid duplicate
            if (fullPath.length > 0) {
                fullPath.push(...reversedPath.slice(1));
            } else {
                fullPath.push(...reversedPath);
            }
        }
        
        return fullPath.length > 0 ? fullPath : null;
    }
}

// Priority queue implementation for A*
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift().element;
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    contains(element) {
        return this.elements.some(item => 
            item.element.x === element.x && item.element.y === element.y
        );
    }
}

// Make Pathfinding available globally
window.Pathfinding = Pathfinding;

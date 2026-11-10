// market.js
export const INITIAL_MARKET_CATALOGUE = {
    'Wood': { basePrice: 6, icon: '🪵', supply: 100, minPrice: 2, maxPrice: 20 },
    'Planks': { basePrice: 14, icon: '🪵', supply: 60, minPrice: 5, maxPrice: 40 },
    'Stone': { basePrice: 5, icon: '🪨', supply: 120, minPrice: 2, maxPrice: 16 },
    'Gravel': { basePrice: 11, icon: '⏳', supply: 80, minPrice: 4, maxPrice: 30 },
    'Metal Ore': { basePrice: 22, icon: '🪙', supply: 40, minPrice: 8, maxPrice: 65 },
    'Metal Ingot': { basePrice: 55, icon: '🪙', supply: 20, minPrice: 25, maxPrice: 150 },
    'Raw Meat': { basePrice: 10, icon: '🍖', supply: 90, minPrice: 4, maxPrice: 30 },
    'Raw Fish': { basePrice: 18, icon: '🐟', supply: 60, minPrice: 8, maxPrice: 40 },
    'Cooked Fish': { basePrice: 32, icon: '🐟', supply: 40, minPrice: 15, maxPrice: 65 },
    'Cooked Meat': { basePrice: 22, icon: '🍖', supply: 50, minPrice: 10, maxPrice: 55 },
    'Berry Seeds': { basePrice: 10, minPrice: 5, maxPrice: 20, supply: 50, trend: 'STABLE', icon: '🌱' },
    
    // --- FORAGING & BASIC RESOURCES ---
    'Egg': { basePrice: 8, icon: '🥚', supply: 80, minPrice: 3, maxPrice: 18 },
    'Berries': { basePrice: 4, icon: '🫐', supply: 120, minPrice: 1, maxPrice: 10 },
    'Plant Fiber': { basePrice: 3, icon: '🌿', supply: 150, minPrice: 1, maxPrice: 8 },
    'Stick': { basePrice: 2, icon: '🥢', supply: 200, minPrice: 1, maxPrice: 6 },

    // --- RAW FURS ---
    'Rabbit Fur': { basePrice: 12, icon: '🐰', supply: 40, minPrice: 4, maxPrice: 35 },
    'Deer Fur': { basePrice: 20, icon: '🦌', supply: 30, minPrice: 8, maxPrice: 55 },
    'Wolf Fur': { basePrice: 35, icon: '🐺', supply: 20, minPrice: 12, maxPrice: 90 },
    'Bear Fur': { basePrice: 50, icon: '🐻', supply: 12, minPrice: 20, maxPrice: 130 },
    'Grizzly Fur': { basePrice: 75, icon: '🐻', supply: 8, minPrice: 30, maxPrice: 180 },
    'Moose Fur': { basePrice: 90, icon: '🫎', supply: 5, minPrice: 35, maxPrice: 220 },
    'Fur': { basePrice: 16, icon: '🏷️', supply: 50, minPrice: 6, maxPrice: 45 },

    // --- PROCESSED PELTS ---
    'Rabbit Pelt': { basePrice: 28, icon: '🐰', supply: 40, minPrice: 10, maxPrice: 75 },
    'Deer Pelt': { basePrice: 48, icon: '🦌', supply: 30, minPrice: 18, maxPrice: 120 },
    'Wolf Pelt': { basePrice: 75, icon: '🐺', supply: 20, minPrice: 30, maxPrice: 180 },
    'Bear Pelt': { basePrice: 110, icon: '🐻', supply: 12, minPrice: 45, maxPrice: 260 },
    'Grizzly Pelt': { basePrice: 175, icon: '🐻', supply: 6, minPrice: 65, maxPrice: 400 },
    'Moose Pelt': { basePrice: 210, icon: '🫎', supply: 4, minPrice: 80, maxPrice: 480 },
    'Finished Pelt': { basePrice: 40, icon: '🏷️', supply: 30, minPrice: 15, maxPrice: 100 },

    // --- HUNTING, WEAPONS & EQUIPMENT ---
    'Feather': { basePrice: 7, icon: '🪶', supply: 100, minPrice: 2, maxPrice: 22 },
    'Arrows': { basePrice: 16, icon: '🏹', supply: 70, minPrice: 6, maxPrice: 40 },
    'Spear': { basePrice: 50, icon: '🗡️', supply: 25, minPrice: 20, maxPrice: 125 },
    'Flashlight': { basePrice: 40, icon: '🔦', supply: 20, minPrice: 20, maxPrice: 80 },
    'Bow': { basePrice: 50, icon: '🏹', supply: 20, minPrice: 25, maxPrice: 100 },
    'Hunting Bow': { basePrice: 75, icon: '🏹', supply: 15, minPrice: 35, maxPrice: 140 },

    // --- TOOLS & VARIATIONS ---
    'Stone Axe': { basePrice: 25, icon: '🪓', supply: 30, minPrice: 8, maxPrice: 50 },
    'Metal Axe': { basePrice: 90, icon: '🪓', supply: 10, minPrice: 40, maxPrice: 180 },
    'Stone Pickaxe': { basePrice: 30, icon: '⛏️', supply: 30, minPrice: 10, maxPrice: 60 },
    'Metal Pickaxe': { basePrice: 100, icon: '⛏️', supply: 10, minPrice: 45, maxPrice: 200 },
    
    'Hen': { basePrice: 45, icon: '🐔', supply: 12, minPrice: 20, maxPrice: 90, category: 'livestock', animalType: 'Chickens' },
    'Rooster': { basePrice: 60, icon: '🐓', supply: 6, minPrice: 30, maxPrice: 120, category: 'livestock', animalType: 'Chickens' }};

export const MARKET_EVENTS = [
    { name: 'Normal Market', multiplier: {}, duration: 90 },
    { 
        name: 'Harsh Winter Frost', 
        multiplier: { 
            'Raw Meat': 1.8, 
            'Cooked Meat': 1.6, 
            'Bear Fur': 2.0, 
            'Bear Pelt': 2.2, 
            'Grizzly Pelt': 2.4, 
            'Wolf Pelt': 1.9,
            'Moose Pelt': 2.1
        }, 
        duration: 120 
    },
    { name: 'Construction Boom', multiplier: { 'Wood': 2.2, 'Planks': 2.0, 'Stone': 1.7, 'Metal Ingot': 1.8 }, duration: 120 },
    { 
        name: 'Hunting Surplus', 
        multiplier: { 
            'Raw Meat': 0.5, 
            'Feather': 0.4, 
            'Rabbit Fur': 0.5, 
            'Rabbit Pelt': 0.6,
            'Deer Fur': 0.6
        }, 
        duration: 90 
    },
    { name: 'Metal Scarcity', multiplier: { 'Metal Ore': 2.5, 'Metal Ingot': 2.4, 'Spear': 1.9 }, duration: 120 }
];

export class MarketManager {
    constructor(weatherManager = null) {
        this.weatherManager = weatherManager;
        this.items = {};
        this.currentEvent = MARKET_EVENTS[0];
        this.eventTimer = 0;
        this.updateInterval = 15.0; // Recalculate market prices every 15 seconds
        this.timer = 0;

        this.initMarket();
    }

    initMarket() {
        for (const [name, config] of Object.entries(INITIAL_MARKET_CATALOGUE)) {
            this.items[name] = {
                ...config,
                currentPrice: config.basePrice,
                previousPrice: config.basePrice,
                trend: 'STABLE'
            };
        }
    }

    getBuyPrice(itemName) {
        const item = this.items[itemName];
        if (!item) return 0;
        return Math.ceil(item.currentPrice);
    }

    getSellPrice(itemName) {
        const item = this.items[itemName];
        if (!item) return 0;
        return Math.max(1, Math.floor(item.currentPrice * 0.75));
    }

    fluctuatePrices() {
        this.eventTimer += this.updateInterval;
        if (this.eventTimer >= this.currentEvent.duration) {
            this.eventTimer = 0;
            const nextEventIndex = Math.floor(Math.random() * MARKET_EVENTS.length);
            this.currentEvent = MARKET_EVENTS[nextEventIndex];
        }

        for (const [name, item] of Object.entries(this.items)) {
            item.previousPrice = item.currentPrice;

            const supplyRatio = 100 / Math.max(1, item.supply);
            let targetPrice = item.basePrice * supplyRatio;

            const eventMult = this.currentEvent.multiplier[name] || 1.0;
            targetPrice *= eventMult;

            const noise = 1.0 + (Math.random() * 0.3 - 0.15);
            targetPrice *= noise;

            const newPrice = Math.min(item.maxPrice, Math.max(item.minPrice, Math.round(targetPrice)));
            item.currentPrice = newPrice;

            if (newPrice > item.previousPrice) item.trend = 'UP';
            else if (newPrice < item.previousPrice) item.trend = 'DOWN';
            else item.trend = 'STABLE';

            if (item.supply < 50) item.supply += 1;
            else if (item.supply > 50) item.supply -= 1;
        }
    }

    buyItem(player, itemName, count = 1) {
    const item = this.items[itemName];
    if (!item) return { success: false, reason: 'Item not in catalogue' };

    const totalCost = this.getBuyPrice(itemName) * count;
    if ((player.coins || 0) < totalCost) {
        return { success: false, reason: 'Insufficient Coins!' };
    }



    // --- STANDARD ITEM BRANCH ---
    const added = player.inventory.addItem(itemName, count, item.icon);
    if (!added) {
        return { success: false, reason: 'Inventory Full!' };
    }

    player.coins -= totalCost;
    item.supply = Math.max(1, item.supply - count);
    return { success: true, cost: totalCost };
}

    sellItem(player, itemName, count = 1) {
        const item = this.items[itemName];
        if (!item) return { success: false, reason: 'Item not tradeable' };

        const hasItem = player.inventory.removeItem(itemName, count);
        if (!hasItem) {
            return { success: false, reason: 'Not enough items to sell!' };
        }

        const totalEarned = this.getSellPrice(itemName) * count;
        player.coins = (player.coins || 0) + totalEarned;
        item.supply += count;
        return { success: true, earned: totalEarned };
    }

    update(delta) {
        this.timer += delta;
        if (this.timer >= this.updateInterval) {
            this.timer = 0;
            this.fluctuatePrices();
        }
    }
}
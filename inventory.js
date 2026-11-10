// inventory.js

import * as THREE from 'three';
import { resourceDrop } from './groundInteractables.js';


// Add to inventory.js (or export near your item definitions)

export const TOOL_DURABILITY_LOSS = {
    // Primitive / Stone Tier (High wear rate: 2.0 - 1.5 HP / action)
    'Stone Axe': 2.0,
    'Stone Pickaxe': 2.0,
    'Wooden Hoe': 1.5,
    'Wooden Spear': 1.5,
    'Fishing Rod': 1.5,

    // Intermediate Tier (Standard wear rate: 1.0 HP / action)
    'Hunting Bow': 1.0,
    'Flashlight': 0.5,

    // Metal / High Tier (Low wear rate: 0.5 - 0.25 HP / action)
    'Metal Axe': 0.5,
    'Metal Pickaxe': 0.5,
    'Steel Hoe': 0.25
};

// Default fallback for items not explicitly listed above
export const DEFAULT_DURABILITY_LOSS = 1.0;

export const ITEM_MAX_DURABILITY = {
    'Axe': 80,
    'Stone Axe': 80,
    'Metal Axe': 220,
    'Pickaxe': 80,
    'Stone Pickaxe': 80,
    'Metal Pickaxe': 220,
    'Spear': 10,
    'Bow': 50,
    'Hunting Bow': 50,
    'Fur Cap': 120,
    'Fur Coat': 200,
    'Metal Helmet': 300,
    'Metal Chestplate': 500
};

export const ITEM_STACK_LIMITS = {
    // Tools & Equipment (Unstackable)
    'Axe': 1,
    'Pickaxe': 1,
    'Bow': 1,
    'Spear': 10,
    'Flashlight': 1,
    'Backpack': 1,
    
    // Default cap for resources & consumables
    'DEFAULT': 100
};

export const VALID_RAW_FURS = [
    'Rabbit Fur', 
    'Deer Fur', 
    'Wolf Fur', 
    'Bear Fur', 
    'Grizzly Fur', 
    'Moose Fur', 
    'Fur'
];

export function getMaxStack(itemName) {
    return ITEM_STACK_LIMITS[itemName] || ITEM_STACK_LIMITS['DEFAULT'];
}

export const RECIPES = [
    {
        id: 'furnace',
        name: 'Furnace',
        icon: '🌋',
        count: 1,
        ingredients: [
            { name: 'Stone', count: 10 },
            { name: 'Wood', count: 6 }
        ]
    },
    {
    id: 'a_frame_shelter',
    name: 'A-Frame Shelter',
    icon: '⛺',
    count: 1,
    ingredients: [
        { name: 'Wood', count: 6 },
        { name: 'Plant Fiber', count: 4 }
    ]
},
    {
    id: 'biofuel_canister',
    name: 'Biofuel Canister',
    icon: '⛽',
    count: 1,
    ingredients: [
        { name: 'Animal Fat', count: 2 },
        { name: 'Charcoal', count: 2 }
    ]
},
    {
    id: 'bedroll',
    name: 'Bedroll',
    icon: '🛏️',
    count: 1,
    ingredients: [
        { name: 'Wood', count: 6 },
        { name: 'Fur', count: 3 }
    ]
},
    {
    id: 'fishing_rod',
    name: 'Fishing Rod',
    icon: '🎣',
    count: 1,
    ingredients: [
        { name: 'Wood', count: 4 },
        { name: 'Stick', count: 3 }
    ]
},
    {
    id: 'wooden_hoe',
    name: 'Wooden Hoe',
    icon: '🪵',
    count: 1,
    ingredients: [
        { name: 'Wood', count: 3 },
        { name: 'Stick', count: 2 }
    ]
},
    {
    name: 'Sawmill',
    icon: '🪚',
    type: 'structure',
    ingredients: [{ name: 'Wood', count: 10 }, { name: 'Stone', count: 4 }]
},
{
    name: 'Stone Crusher',
    icon: '⚙️',
    type: 'structure',
    ingredients: [{ name: 'Stone', count: 12 }, { name: 'Wood', count: 6 }]
},
{
    name: 'Fur Processing Stand',
    icon: '🏷️',
    type: 'structure',
    ingredients: [{ name: 'Wood', count: 8 }, { name: 'Stick', count: 4 }]
},
    {
    name: 'Repair Kit',
    icon: '🛠️',
    ingredients: [
        { name: 'Wood', count: 3 },
        { name: 'Stone', count: 2 },
        { name: 'Fur', count: 1 }
    ],
    outputCount: 1
},
    {
    id: 'primitive_small_trap',
    name: 'Primitive Small Trap',
    icon: '🪤',
    count: 1,
    ingredients: [
        { name: 'Stick', count: 3 },
        { name: 'Plant Fiber', count: 2 }
    ]
},
{
    id: 'small_snare',
    name: 'Small Snare',
    icon: '➰',
    count: 1,
    ingredients: [
        { name: 'Plant Fiber', count: 4 },
        { name: 'Stick', count: 2 }
    ]
},
{
    id: 'medium_snare',
    name: 'Medium Snare',
    icon: '🪢',
    count: 1,
    ingredients: [
        { name: 'Plant Fiber', count: 6 },
        { name: 'Stick', count: 3 },
        { name: 'Metal Ingot', count: 1 }
    ]
},
{
    id: 'small_snap_trap',
    name: 'Small Snap Trap',
    icon: '⚙️',
    count: 1,
    ingredients: [
        { name: 'Metal Ingot', count: 2 },
        { name: 'Wood', count: 2 },
        { name: 'Plant Fiber', count: 1 }
    ]
},
{
    id: 'medium_snap_trap',
    name: 'Medium Snap Trap',
    icon: '🪤',
    count: 1,
    ingredients: [
        { name: 'Metal Ingot', count: 5 },
        { name: 'Wood', count: 4 },
        { name: 'Plant Fiber', count: 2 }
    ]
},
    {
    id: 'leather_canteen',
    name: 'Leather Canteen',
    icon: '🫙',
    count: 1,
    ingredients: [
        { name: 'Fur', count: 3 },
        { name: 'Plant Fiber', count: 4 }
    ]
},
    {
        id: 'metal_axe',
        name: 'Metal Axe',
        icon: '🪓',
        count: 1,
        ingredients: [
            { name: 'Metal Ingot', count: 4 },
            { name: 'Stick', count: 3 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'metal_pickaxe',
        name: 'Metal Pickaxe',
        icon: '⛏️',
        count: 1,
        ingredients: [
            { name: 'Metal Ingot', count: 4 },
            { name: 'Stick', count: 3 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'metal_foundation',
        name: 'Metal Foundation',
        icon: '⬛',
        count: 1,
        ingredients: [
            { name: 'Metal Ingot', count: 5 },
            { name: 'Stone', count: 4 }
        ]
    },
    {
        id: 'metal_wall',
        name: 'Metal Wall',
        icon: '🛡️',
        count: 1,
        ingredients: [
            { name: 'Metal Ingot', count: 4 },
            { name: 'Wood', count: 2 }
        ]
    },
    {
        id: 'metal_door',
        name: 'Metal Door',
        icon: '🚪',
        count: 1,
        ingredients: [
            { name: 'Metal Ingot', count: 5 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'stone_axe',
        name: 'Stone Axe',
        icon: '🪓',
        count: 1,
        ingredients: [
            { name: 'Stick', count: 3 },
            { name: 'Stone', count: 2 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'stone_pickaxe',
        name: 'Stone Pickaxe',
        icon: '⛏️',
        count: 1,
        ingredients: [
            { name: 'Stick', count: 3 },
            { name: 'Stone', count: 2 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'spear',
        name: 'Spear',
        icon: '🗡️',
        count: 1,
        maxStack: 10,
        ingredients: [
            { name: 'Stick', count: 4 },
            { name: 'Stone', count: 1 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'hunting_bow',
        name: 'Hunting Bow',
        icon: '🏹',
        count: 1,
        ingredients: [
            { name: 'Stick', count: 5 },
            { name: 'Plant Fiber', count: 4 }
        ]
    },
    {
        id: 'arrows',
        name: 'Arrows',
        icon: '🏹',
        count: 5,
        ingredients: [
            { name: 'Stick', count: 2 },
            { name: 'Feather', count: 2 },
            { name: 'Stone', count: 1 }
        ]
    },
    {
        id: 'fur_cap',
        name: 'Fur Cap',
        icon: '🧢',
        count: 1,
        ingredients: [
            { name: 'Fur', count: 3 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'fur_coat',
        name: 'Fur Coat',
        icon: '🧥',
        count: 1,
        ingredients: [
            { name: 'Fur', count: 6 },
            { name: 'Plant Fiber', count: 4 }
        ]
    },
    {
        id: 'campfire',
        name: 'Campfire',
        icon: '🔥',
        count: 1,
        ingredients: [
            { name: 'Stone', count: 5 },
            { name: 'Stick', count: 4 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
    name: 'Handheld Torch',
    icon: '🔦',
    category: 'Tools',
    ingredients: [
        { name: 'Stick', count: 2 },
        { name: 'Plant Fiber', count: 3 },
        { name: 'Animal Fat', count: 1 }
    ]
},
{
    name: 'Wall Torch',
    icon: '🕯️',
    category: 'Structures',
    ingredients: [
        { name: 'Wood', count: 2 },
        { name: 'Metal Ingot', count: 1 },
        { name: 'Animal Fat', count: 2 }
    ]
},
{
    name: 'Standing Lantern',
    icon: '🪔',
    category: 'Structures',
    ingredients: [
        { name: 'Wood', count: 3 },
        { name: 'Metal Ingot', count: 2 },
        { name: 'Animal Fat', count: 2 }
    ]
},
    {
        id: 'chest',
        name: 'Chest',
        icon: '📦',
        count: 1,
        ingredients: [
            { name: 'Wood', count: 8 }
        ]
    },
    {
        id: 'leather_backpack',
        name: 'Leather Backpack',
        icon: '🎒',
        count: 1,
        ingredients: [
            { name: 'Fur', count: 4 },
            { name: 'Plant Fiber', count: 6 }
        ]
    },
    {
        id: 'bandage',
        name: 'Bandage',
        icon: '🩹',
        count: 1,
        ingredients: [
            { name: 'Plant Fiber', count: 4 }
        ]
    },
    {
        id: 'wooden_foundation',
        name: 'Wooden Foundation',
        icon: '🟫',
        count: 1,
        ingredients: [
            { name: 'Wood', count: 4 },
            { name: 'Stone', count: 2 }
        ]
    },
    {
        id: 'wooden_wall',
        name: 'Wooden Wall',
        icon: '🧱',
        count: 1,
        ingredients: [
            { name: 'Wood', count: 3 }
        ]
    },
    {
        id: 'wooden_door',
        name: 'Wooden Door',
        icon: '🚪',
        count: 1,
        ingredients: [
            { name: 'Wood', count: 4 },
            { name: 'Plant Fiber', count: 2 }
        ]
    },
    {
        id: 'wooden_roof',
        name: 'Wooden Roof',
        icon: '📐',
        count: 1,
        ingredients: [
            { name: 'Wood', count: 3 }
        ]
    }
];



export class Inventory {
    constructor() {
        this.equipmentSlots = {
            head: null,
            chest: null,
            backpack: null,
        };

        // Expanded slots to fit all starting resources cleanly
        this.baseSlotsCount = 15;
        this.inventorySlots = Array(this.baseSlotsCount).fill(null);
        this.backpackSlots = Array(10).fill(null);
        
        this.hotbarSlots = [
    { name: 'Hunting Bow', count: 1, icon: '🏹', durability: 50, maxDurability: 50 },
    { name: 'Arrows', count: 10, icon: '🏹' },
    { name: 'Spear', count: 10, icon: '🗡️'},
    { name: 'Stone Axe', count: 1, icon: '🪓', durability: 100, maxDurability: 100 },
    { name: 'Stone Pickaxe', count: 1, icon: '⛏️', durability: 100, maxDurability: 100 },
];

        // Starter resources (100x of each harvestable / ground pickup item)
        const startingResources = [
            { name: 'Flashlight', count: 1, icon: '🔦' },
            { name: 'Wood', count: 100, icon: '🪵' },
            { name: 'Stone', count: 100, icon: '🪨' },
            { name: 'Stick', count: 100, icon: '🪵' },
            { name: 'Plant Fiber', count: 100, icon: '🌿' },
            { name: 'Berries', count: 100, icon: '🫐' },
            { name: 'Egg', count: 100, icon: '🥚' },
            { name: 'Metal Ore', count: 100, icon: '⚙️' },
            { name: 'Raw Meat', count: 100, icon: '🥩' },
            { name: 'Fur', count: 100, icon: '🧥' },
            { name: 'Feather', count: 100, icon: '🪶' },
            { name: 'Leather Canteen', count: 1, icon: '🫙' }
        ];

        startingResources.forEach((item, index) => {
            if (index < this.baseSlotsCount) {
                this.inventorySlots[index] = item;
            }
        });

        this.activeHotbarIndex = 0;
        this.isOpen = false;
        this.activeTab = 'inventory';
        this.player = null;

        this.activeChest = null;
        this.activeFurnace = null;
        this.activeCampfire = null;
        this.draggedSource = null;
        this.activeATVTrunk = null;

        this.uiContainer = document.getElementById('inventory-ui');
        this.gridContainer = document.getElementById('inventory-grid');
        this.craftingContainer = document.getElementById('crafting-list');
        this.hotbarContainer = document.getElementById('hotbar-ui');
        this.chestSection = document.getElementById('chest-section');
        this.chestGridContainer = document.getElementById('chest-grid');
        this.equipmentGridContainer = document.getElementById('equipment-grid');
        this.backpackSection = document.getElementById('backpack-section');
        this.backpackGridContainer = document.getElementById('backpack-grid');
        this.furnaceSection = document.getElementById('furnace-section');
        this.furnaceGridContainer = document.getElementById('furnace-grid');
        this.campfireSection = document.getElementById('campfire-section');
        this.campfireGridContainer = document.getElementById('campfire-grid');

        this.initTabListeners();
        this.initWorldDropListener(); // <-- Add this call
        this.renderHotbar();
    }

    initTabListeners() {
        document.getElementById('tab-btn-inv')?.addEventListener('click', () => this.switchTab('inventory'));
        document.getElementById('tab-btn-craft')?.addEventListener('click', () => this.switchTab('crafting'));
        document.getElementById('smelt-action-btn')?.addEventListener('click', () => {
            if (this.activeFurnace) {
                if (this.activeFurnace.smelt()) {
                    this.render();
                    this.renderHotbar();
                    this.renderCrafting();
                    this.renderFurnace();
                }
            }
        });
        document.getElementById('cook-action-btn')?.addEventListener('click', () => {
            if (this.activeCampfire) {
                if (this.activeCampfire.cook()) {
                    this.render();
                    this.renderHotbar();
                    this.renderCrafting();
                    this.renderCampfire();
                }
            }
        });
    }

    initWorldDropListener() {
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
        if (e.target.closest('#inventory-ui') || e.target.closest('#hotbar-ui')) return;

        e.preventDefault();
        if (this.draggedSource) {
            const sourceList = this.getListByType(this.draggedSource.type);
            if (sourceList) {
                const item = sourceList[this.draggedSource.index];
                if (item && this.player) {
                    this.dropItemToWorld(item, this.player);
                    sourceList[this.draggedSource.index] = null;
                    this.render();
                    this.renderHotbar();
                    this.renderCrafting();
                    this.renderChest();
                    this.renderFurnace();
                    this.renderCampfire();
                }
            }
            this.draggedSource = null;
        }
    });
}


// Add inside Inventory class (e.g., inventory_2.js) or Player class

damageEquippedTool(slotIndex, customAmount = null) {
    const item = this.hotbarSlots[slotIndex];
    if (!item || item.durability === undefined) return;

    // Look up tier-based loss rate if customAmount isn't specified
    const lossRate = customAmount !== null 
        ? customAmount 
        : (TOOL_DURABILITY_LOSS[item.name] || DEFAULT_DURABILITY_LOSS);

    // Deduct durability (floats allowed)
    item.durability = Math.max(0, item.durability - lossRate);

    // If tool is broken, clear slot & notify player
    if (item.durability <= 0) {
        this.hotbarSlots[slotIndex] = null;
        if (typeof this.showNotification === 'function') {
            this.showNotification(`Your ${item.name} broke!`);
        }
    }

    // Refresh Hotbar & Durability Bar UI
    this.renderHotbar();
}


// Add to Inventory class in inventory.js

openATVTrunk(atv, controls) {
    // Clear other active workstations/chests to prevent UI overlap
    this.activeCampfire = null;
    this.activeFurnace = null;
    this.activeChest = null;
    this.activeSawmill = null;
    this.activeStoneCrusher = null;
    this.activeFurStand = null;

    this.activeATVTrunk = atv;
    this.isOpen = true;

    // Unlock pointer controls to reveal mouse cursor
    if (controls && controls.isLocked) {
        controls.unlock();
    }

    // Safely query DOM elements across different Inventory property names
    const containerEl = (this.ui && this.ui.container) || this.container || document.getElementById('inventory-ui');
    if (containerEl) {
        containerEl.classList.remove('hidden');
    }

    this.renderATVTrunk();
    
    if (typeof this.render === 'function') {
        this.render();
    }
}

canPlaceInATVTrunk(item) {
    if (!item) return false;
    // Allow ALL items into the ATV trunk
    return true;
}

// inventory.js
renderATVTrunk() {
    const trunkSec = document.getElementById('atv-trunk-section');
    if (!trunkSec) return;

    if (!this.activeATVTrunk) {
        trunkSec.classList.add('hidden');
        return;
    }

    trunkSec.classList.remove('hidden');

    // Live UI Fuel Status & Gauge Update
    const fuelStatusText = document.getElementById('atv-fuel-status-text');
    const fuelFill = document.getElementById('atv-ui-fuel-fill');
    const fuelSlotEl = document.getElementById('atv-fuel-input-slot');

    if (fuelStatusText) {
        fuelStatusText.innerText = `Fuel: ${Math.ceil(this.activeATVTrunk.fuel)}% / 100%`;
    }

    if (fuelFill) {
        const pct = Math.max(0, Math.min(100, (this.activeATVTrunk.fuel / this.activeATVTrunk.maxFuel) * 100));
        fuelFill.style.width = `${pct}%`;
    }

    if (fuelSlotEl) {
        fuelSlotEl.innerHTML = `
            <span class="atv-fuel-slot-label">Fuel Slot</span>
            <div class="slot-icon">⛽</div>
        `;
        fuelSlotEl.title = "Drag Biofuel Canister here (+10% Fuel)";
        this.attachDragListeners(fuelSlotEl, 'atvFuel', 0, false);
    }

    // Render 8 Trunk Slots
    const grid = document.getElementById('atv-trunk-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.activeATVTrunk.trunkSlots.forEach((slot, index) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'trunk-slot';
        slotEl.dataset.index = index;

        if (slot) {
            slotEl.innerHTML = `
                <span class="slot-icon">${slot.icon || '📦'}</span>
                <span class="slot-count-badge">x${slot.count}</span>
            `;
            slotEl.title = `${slot.name} (x${slot.count}) - Right-click to retrieve`;
            slotEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('atvTrunk', index);
            });
        } else {
            slotEl.innerHTML = `<span class="empty-slot-label">-</span>`;
        }

        this.attachDragListeners(slotEl, 'atvTrunk', index, !!slot);
        grid.appendChild(slotEl);
    });
}

// inventory.js
dropItemToWorld(item, player) {
    if (!item || !player || !player.controls) return;

    // Use player.scene or fallback to player's camera parent node
    const scene = player.scene || player.camera.parent;
    if (!scene) return;

    const pPos = player.controls.getObject().position;
    const pDir = new THREE.Vector3();
    player.controls.getObject().getWorldDirection(pDir);

    const spawnX = pPos.x - pDir.x * 1.5;
    const spawnZ = pPos.z - pDir.z * 1.5;
    const spawnY = player.environment 
        ? player.environment.getTerrainHeight(spawnX, spawnZ) + 0.2
        : pPos.y;

    new resourceDrop(
        scene,
        spawnX,
        spawnY,
        spawnZ,
        item.name,
        item.icon,
        item.count,
        player.interactables
    );
}

    setPlayer(player) {
        this.player = player;
    }

    getActiveItem() {
        return this.hotbarSlots[this.activeHotbarIndex];
    }

    setActiveHotbarSlot(index) {
        if (index >= 0 && index < this.hotbarSlots.length) {
            this.activeHotbarIndex = index;
            this.renderHotbar();
        }
    }

   getItemCount(name) {
    let total = 0;
    const allSlots = [
        ...this.hotbarSlots, 
        ...this.inventorySlots, 
        ...this.backpackSlots, 
        ...Object.values(this.equipmentSlots)
    ];

    allSlots.forEach(slot => {
        if (!slot) return;
        if (slot.name === name) {
            total += slot.count;
        } else if (name === 'Fur' && isFurOrPelt(slot.name)) {
            total += slot.count;
        }
    });

    return total;
}

hasIngredients(ingredients) {
    return ingredients.every(ing => this.getItemCount(ing.name) >= ing.count);
}

removeIngredients(ingredients) {
    ingredients.forEach(ing => {
        let amountToRemove = ing.count;

        const isMatch = (slotName, reqName, exactOnly) => {
            if (!slotName) return false;
            if (slotName === reqName) return true;
            if (!exactOnly && reqName === 'Fur' && isFurOrPelt(slotName)) return true;
            return false;
        };

        const containers = [this.inventorySlots, this.backpackSlots, this.hotbarSlots];

        // Pass 1: Deduct exact name matches first (e.g. standard 'Fur' before using rare pelts)
        for (let container of containers) {
            if (amountToRemove <= 0) break;
            for (let i = 0; i < container.length; i++) {
                const slot = container[i];
                if (slot && isMatch(slot.name, ing.name, true)) {
                    if (slot.count > amountToRemove) {
                        slot.count -= amountToRemove;
                        amountToRemove = 0;
                        break;
                    } else {
                        amountToRemove -= slot.count;
                        container[i] = null;
                    }
                }
            }
        }

        // Pass 2: Deduct substituted animal furs/pelts if recipe needs 'Fur' and exact matches ran out
        if (amountToRemove > 0 && ing.name === 'Fur') {
            for (let container of containers) {
                if (amountToRemove <= 0) break;
                for (let i = 0; i < container.length; i++) {
                    const slot = container[i];
                    if (slot && isMatch(slot.name, ing.name, false)) {
                        if (slot.count > amountToRemove) {
                            slot.count -= amountToRemove;
                            amountToRemove = 0;
                            break;
                        } else {
                            amountToRemove -= slot.count;
                            container[i] = null;
                        }
                    }
                }
            }
        }
    });
}

    // Creates a Durability Bar HTML element
createDurabilityBarHTML(durability, maxDurability) {
    if (durability === undefined || maxDurability === undefined) return '';
    const pct = Math.max(0, Math.min(100, (durability / maxDurability) * 100));
    let colorClass = 'high';
    if (pct < 25) colorClass = 'low';
    else if (pct < 60) colorClass = 'medium';

    return `
        <div class="durability-bar">
            <div class="durability-fill ${colorClass}" style="width: ${pct}%;"></div>
        </div>
    `;
}

// Damages active hotbar item (Tools/Weapons)
damageActiveItem(amount = 1, player = null) {
    const activeItem = this.hotbarSlots[this.activeHotbarIndex];
    if (!activeItem || activeItem.durability === undefined) return;

    // 1. Clamp durability to 0 to prevent negative values in the UI
    activeItem.durability = Math.max(0, activeItem.durability - amount);

    // 2. Handle Item Breakage
    if (activeItem.durability <= 0) {
        const brokenName = activeItem.name;

        // Clear item from hotbar
        this.hotbarSlots[this.activeHotbarIndex] = null;

        // Route notification safely through player.saveSystem
        if (player && player.saveSystem && typeof player.saveSystem.showNotification === 'function') {
            player.saveSystem.showNotification(`Your ${brokenName} broke!`);
        }

        // Trigger player held mesh update if method exists
        if (player && typeof player.updateHeldItemMesh === 'function') {
            player.updateHeldItemMesh();
        }
    }

    // 3. Refresh UI Elements
    this.renderHotbar();
    this.render();
}

// Damages equipped armor slots
damageEquippedArmor(slotName, amount = 1) {
    const item = this.equipmentSlots[slotName];
    if (!item || item.durability === undefined) return;

    item.durability -= amount;

    if (item.durability <= 0) {
        this.showNotification(`Your ${item.name} broke!`);
        this.equipmentSlots[slotName] = null;
    }

    this.renderEquipment();
    this.render();
}

// Repair Item using Repair Kit
useRepairKitOnSlot(item) {
    if (!item || item.durability === undefined || item.durability >= item.maxDurability) {
        return false;
    }

    // Restore 100% durability
    item.durability = item.maxDurability;
    this.showNotification(`Repaired ${item.name}!`);
    this.render();
    this.renderHotbar();
    this.renderEquipment();
    return true;
}

    addItem(name, count = 1, icon = '🪵') {
    const maxDur = ITEM_MAX_DURABILITY[name];
    // Durable items cannot stack (maxStack = 1)
    const maxStack = maxDur ? 1 : getMaxStack(name);
    let remaining = count;

    // Helper loop to fill existing partial stacks in a container array
    const fillExistingInContainer = (container) => {
        if (!container) return;
        for (let i = 0; i < container.length; i++) {
            if (container[i] && container[i].name === name && container[i].count < maxStack) {
                const space = maxStack - container[i].count;
                const toAdd = Math.min(remaining, space);
                container[i].count += toAdd;
                remaining -= toAdd;
                if (remaining <= 0) break;
            }
        }
    };

    // Helper loop to place remaining count into empty slots in a container array
    const fillEmptyInContainer = (container) => {
        if (!container) return;
        for (let i = 0; i < container.length; i++) {
            if (!container[i]) {
                const toAdd = Math.min(remaining, maxStack);
                const itemObj = { name, count: toAdd, icon };

                // Attach durability properties if item is durable
                if (maxDur) {
                    itemObj.durability = maxDur;
                    itemObj.maxDurability = maxDur;
                }

                container[i] = itemObj;
                remaining -= toAdd;
                if (remaining <= 0) break;
            }
        }
    };

    // --- STAGE 1: Fill existing partial stacks (Skipped for Durable Items) ---
    if (!maxDur) {
        fillExistingInContainer(this.hotbarSlots);
        if (remaining > 0) fillExistingInContainer(this.inventorySlots);
        if (remaining > 0 && this.equipmentSlots?.backpack) {
            fillExistingInContainer(this.backpackSlots);
        }
    }

    // --- STAGE 2: Fill empty slots with remaining items ---
    if (remaining > 0) fillEmptyInContainer(this.hotbarSlots);
    if (remaining > 0) fillEmptyInContainer(this.inventorySlots);
    if (remaining > 0 && this.equipmentSlots?.backpack) {
        fillEmptyInContainer(this.backpackSlots);
    }

    // --- STAGE 3: Refresh UI Displays ---
    this.render();
    this.renderHotbar();
    this.renderCrafting();
    if (typeof this.renderEquipment === 'function') this.renderEquipment();
    if (typeof this.renderBackpack === 'function') this.renderBackpack();

    // Returns true if all items were successfully added; false if inventory was full
    return remaining === 0;
}

// Add inside Inventory class in inventory.js
removeItem(itemName, count = 1) {
    let remainingToDeduct = count;

    const checkAndDeduct = (slotList) => {
        for (let i = 0; i < slotList.length; i++) {
            const slot = slotList[i];
            if (slot && slot.name === itemName) {
                if (slot.count > remainingToDeduct) {
                    slot.count -= remainingToDeduct;
                    remainingToDeduct = 0;
                    break;
                } else {
                    remainingToDeduct -= slot.count;
                    slotList[i] = null;
                }
            }
        }
    };

    checkAndDeduct(this.inventorySlots);
    if (remainingToDeduct > 0 && this.hotbarSlots) checkAndDeduct(this.hotbarSlots);
    if (remainingToDeduct > 0 && this.backpackSlots) checkAndDeduct(this.backpackSlots);

    this.render();
    if (this.renderHotbar) this.renderHotbar();
    if (this.renderBackpack) this.renderBackpack();

    return remainingToDeduct === 0;
}


    isBackpackEmpty() {
        return this.backpackSlots.every(slot => slot === null);
    }

    craft(recipe) {
        if (!this.hasIngredients(recipe.ingredients)) return false;

        this.removeIngredients(recipe.ingredients);
        this.addItem(recipe.name, recipe.count, recipe.icon);

        this.render();
        this.renderHotbar();
        this.renderCrafting();
        return true;
    }

   useItem(slotType, index) {
    if (!this.player) return;
    const slots = this.getListByType(slotType);
    if (!slots) return;

    const item = slots[index];
    if (!item) return;

    // Helper to place item object directly into free inventory slots while preserving durability
    const placeItemObjectInInventory = (itemObj) => {
        const containers = [this.hotbarSlots, this.inventorySlots];
        if (this.equipmentSlots?.backpack) containers.push(this.backpackSlots);

        for (let container of containers) {
            const emptyIdx = container.findIndex(s => s === null);
            if (emptyIdx !== -1) {
                container[emptyIdx] = itemObj;
                return true;
            }
        }
        return false;
    };

    // --- CONTAINER QUICK-RETRIEVAL (CONTAINER -> PLAYER INVENTORY) ---
    if (['chest', 'furnace', 'campfire', 'sawmill', 'stoneCrusher', 'furStand', 'atvTrunk'].includes(slotType)) {
        let transferred = false;
        if (item.durability !== undefined) {
            transferred = placeItemObjectInInventory(item);
        } else {
            transferred = this.addItem(item.name, item.count, item.icon);
        }

        if (transferred) {
            slots[index] = null;
            this.renderAllContainers();
        }
        return;
    }

    if (item.name === 'Biofuel Canister') {
    const targetATV = this.activeATVTrunk || this.player.mountedATV;

    if (targetATV) {
        if (targetATV.fuel < targetATV.maxFuel) {
            targetATV.refuel(10.0); // Restores 10% fuel
            used = true;
            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Refueled ATV (+10% Fuel)!');
            }
        } else {
            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('ATV Fuel Tank is Full!');
            }
            return;
        }
    } else {
        if (this.player.saveSystem) {
            this.player.saveSystem.showNotification('Open ATV UI or Mount ATV to Refuel!');
        }
        return;
    }
}

    // --- QUICK-DEPOSIT (PLAYER INVENTORY -> OPEN STATION / CHEST / ATV TRUNK) ---
    if (['inventory', 'hotbar', 'backpack'].includes(slotType)) {
        // Fur Stand Deposit
        if (this.activeFurStand && VALID_RAW_FURS.includes(item.name)) {
            const input = this.activeFurStand.slots[0];
            const output = this.activeFurStand.slots[1];
            const expectedPelt = this.activeFurStand.getExpectedPelt(item);

            if ((!input || input.name === item.name) && (!output || output.name === expectedPelt.name)) {
                if (!input) {
                    this.activeFurStand.slots[0] = { name: item.name, count: 1, icon: item.icon };
                } else {
                    input.count++;
                }

                item.count--;
                if (item.count <= 0) slots[index] = null;
                this.renderAllContainers();
                return;
            }
        }

        // Sawmill Deposit (Wood/Log -> Slot 0)
        if (this.activeSawmill && (item.name === 'Wood' || item.name === 'Log')) {
            const input = this.activeSawmill.slots[0];
            if (!input || input.name === item.name) {
                if (!input) {
                    this.activeSawmill.slots[0] = { name: item.name, count: 1, icon: item.icon };
                } else {
                    input.count++;
                }
                item.count--;
                if (item.count <= 0) slots[index] = null;
                this.renderAllContainers();
                return;
            }
        }

        // Stone Crusher Deposit (Stone -> Slot 0)
        if (this.activeStoneCrusher && item.name === 'Stone') {
            const input = this.activeStoneCrusher.slots[0];
            if (!input || input.name === item.name) {
                if (!input) {
                    this.activeStoneCrusher.slots[0] = { name: item.name, count: 1, icon: item.icon };
                } else {
                    input.count++;
                }
                item.count--;
                if (item.count <= 0) slots[index] = null;
                this.renderAllContainers();
                return;
            }
        }

        // Furnace Deposit (Metal Ore -> Slot 0, Wood -> Slot 1)
        if (this.activeFurnace) {
            const isFuel = item.name === 'Wood' || item.name === 'Stick';
            let targetIdx = item.name === 'Metal Ore' ? 0 : (isFuel ? 1 : -1);

            if (targetIdx !== -1) {
                const targetSlot = this.activeFurnace.slots[targetIdx];
                if (!targetSlot || targetSlot.name === item.name) {
                    if (!targetSlot) {
                        this.activeFurnace.slots[targetIdx] = { name: item.name, count: 1, icon: item.icon };
                    } else {
                        targetSlot.count++;
                    }
                    item.count--;
                    if (item.count <= 0) slots[index] = null;
                    this.renderAllContainers();
                    return;
                }
            }
        }

        // Campfire Deposit (Raw Meat / Raw Fish / Dirty Water -> Slot 0, Fuel -> Slot 1)
        if (this.activeCampfire) {
            const isFood = item.name === 'Raw Meat' || item.name === 'Raw Fish' || item.name === 'Leather Canteen (Dirty Water)';
            let targetIdx = isFood ? 0 : ((item.name === 'Wood' || item.name === 'Stick') ? 1 : -1);
            
            if (targetIdx !== -1) {
                const targetSlot = this.activeCampfire.slots[targetIdx];
                if (!targetSlot || targetSlot.name === item.name) {
                    if (!targetSlot) {
                        this.activeCampfire.slots[targetIdx] = { name: item.name, count: 1, icon: item.icon };
                    } else {
                        targetSlot.count++;
                    }
                    item.count--;
                    if (item.count <= 0) slots[index] = null;
                    this.renderAllContainers();
                    return;
                }
            }
        }

        // Storage Chest Deposit
        if (this.activeChest) {
            const freeIndex = this.activeChest.slots.findIndex(s => s === null || (s.name === item.name && s.count < getMaxStack(item.name)));
            if (freeIndex !== -1) {
                const targetSlot = this.activeChest.slots[freeIndex];
                if (!targetSlot) {
                    this.activeChest.slots[freeIndex] = { ...item };
                    slots[index] = null;
                } else {
                    const space = getMaxStack(item.name) - targetSlot.count;
                    const toTransfer = Math.min(space, item.count);
                    targetSlot.count += toTransfer;
                    item.count -= toTransfer;
                    if (item.count <= 0) slots[index] = null;
                }
                this.renderAllContainers();
                return;
            }
        }

        // ATV Trunk Deposit
        if (this.activeATVTrunk) {
            const freeIndex = this.activeATVTrunk.trunkSlots.findIndex(s => s === null || (s.name === item.name && s.count < getMaxStack(item.name)));
            if (freeIndex !== -1) {
                const targetSlot = this.activeATVTrunk.trunkSlots[freeIndex];
                if (!targetSlot) {
                    this.activeATVTrunk.trunkSlots[freeIndex] = { ...item };
                    slots[index] = null;
                } else {
                    const space = getMaxStack(item.name) - targetSlot.count;
                    const toTransfer = Math.min(space, item.count);
                    targetSlot.count += toTransfer;
                    item.count -= toTransfer;
                    if (item.count <= 0) slots[index] = null;
                }
                this.renderAllContainers();
                return;
            }
        }
    }

    // --- HEAD ARMOR EQUIPPING (FUR CAP / METAL HELMET) ---
    if (['Fur Cap', 'Metal Helmet'].includes(item.name)) {
        if (slotType !== 'equipment') {
            const currentEquipped = this.equipmentSlots.head;
            this.equipmentSlots.head = item;
            slots[index] = currentEquipped;
        } else {
            const unequipped = this.equipmentSlots.head;
            this.equipmentSlots.head = null;
            if (!placeItemObjectInInventory(unequipped)) {
                this.equipmentSlots.head = unequipped;
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Inventory full!');
                }
            }
        }
        this.renderAllContainers();
        return;
    }

    // --- CHEST ARMOR EQUIPPING (FUR COAT / METAL CHESTPLATE) ---
    if (['Fur Coat', 'Metal Chestplate'].includes(item.name)) {
        if (slotType !== 'equipment') {
            const currentEquipped = this.equipmentSlots.chest;
            this.equipmentSlots.chest = item;
            slots[index] = currentEquipped;
        } else {
            const unequipped = this.equipmentSlots.chest;
            this.equipmentSlots.chest = null;
            if (!placeItemObjectInInventory(unequipped)) {
                this.equipmentSlots.chest = unequipped;
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Inventory full!');
                }
            }
        }
        this.renderAllContainers();
        return;
    }

    // --- BACKPACK EQUIPPING ---
    if (item.name === 'Leather Backpack') {
        if (slotType !== 'equipment') {
            const currentEquipped = this.equipmentSlots.backpack;
            this.equipmentSlots.backpack = item;
            slots[index] = currentEquipped;
        } else {
            if (!this.isBackpackEmpty()) {
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Empty Backpack before unequipping!');
                }
                return;
            }
            const unequipped = this.equipmentSlots.backpack;
            this.equipmentSlots.backpack = null;
            if (!placeItemObjectInInventory(unequipped)) {
                this.equipmentSlots.backpack = unequipped;
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Inventory full!');
                }
            }
        }
        this.renderAllContainers();
        return;
    }

    // --- CONSUMABLES & VEHICLE REFUELING ---
    let used = false;

    if (item.name === 'Biofuel Canister') {
        if (this.player.mountedATV) {
            if (this.player.mountedATV.fuel < this.player.mountedATV.maxFuel) {
                this.player.mountedATV.refuel(50.0);
                used = true;
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Refueled ATV (+50 Fuel)!');
                }
            } else {
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('ATV Fuel Tank is Full!');
                }
                return;
            }
        } else {
            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Mount the ATV to refuel!');
            }
            return;
        }
    } else if (item.name === 'Bandage') {
        if (this.player.health < this.player.maxHealth) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
            used = true;
        }
    } else if (item.name === 'Berries') {
        if (this.player.hunger < this.player.maxHunger || this.player.thirst < this.player.maxThirst) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 15);
            this.player.thirst = Math.min(this.player.maxThirst, this.player.thirst + 5);
            used = true;
        }
    } else if (item.name === 'Egg') {
        if (this.player.hunger < this.player.maxHunger) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 25);
            used = true;
        }
    } else if (item.name === 'Raw Meat') {
        if (this.player.hunger < this.player.maxHunger) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 10);
            this.player.takeDamage(5);
            used = true;
        }
    } else if (item.name === 'Cooked Meat') {
        if (this.player.hunger < this.player.maxHunger || this.player.health < this.player.maxHealth) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 40);
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
            used = true;
        }
    } else if (item.name === 'Raw Fish') {
        if (this.player.hunger < this.player.maxHunger) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 12);
            this.player.takeDamage(4);
            used = true;
        }
    } else if (item.name === 'Cooked Fish') {
        if (this.player.hunger < this.player.maxHunger || this.player.health < this.player.maxHealth) {
            this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 35);
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 15);
            used = true;
        }
    } else if (item.name === 'Leather Canteen (Dirty Water)') {
        if (this.player.thirst < this.player.maxThirst) {
            this.player.thirst = Math.min(this.player.maxThirst, this.player.thirst + 25);
            this.player.isPoisoned = true;
            this.player.poisonTimer = 12.0;

            if (item.count > 1) {
                item.count--;
                this.addItem('Leather Canteen', 1, '🫙');
            } else {
                item.name = 'Leather Canteen';
                item.icon = '🫙';
            }

            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Drank Dirty Water! You feel sick...');
            }

            this.renderAllContainers();
            return;
        }
    } else if (item.name === 'Leather Canteen (Clean Water)' || item.name === 'Leather Canteen (Water)') {
        if (this.player.thirst < this.player.maxThirst) {
            this.player.thirst = Math.min(this.player.maxThirst, this.player.thirst + 70);

            if (item.count > 1) {
                item.count--;
                this.addItem('Leather Canteen', 1, '🫙');
            } else {
                item.name = 'Leather Canteen';
                item.icon = '🫙';
            }

            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Drank Safe Clean Water!');
            }

            this.renderAllContainers();
            return;
        }
    }

    if (used) {
        item.count--;
        if (item.count <= 0) {
            slots[index] = null;
        }
        this.renderAllContainers();
    }
}

    getListByType(type) {
        if (type === 'hotbar') return this.hotbarSlots;
        if (type === 'inventory') return this.inventorySlots;
        if (type === 'backpack') return this.backpackSlots;
        if (type === 'chest' && this.activeChest) return this.activeChest.slots;
        if (type === 'equipment') return this.equipmentSlots;
        if (type === 'furnace' && this.activeFurnace) return this.activeFurnace.slots;
        if (type === 'campfire' && this.activeCampfire) return this.activeCampfire.slots;
        if (type === 'sawmill' && this.activeSawmill) return this.activeSawmill.slots;
        if (type === 'stoneCrusher' && this.activeStoneCrusher) return this.activeStoneCrusher.slots;
        if (type === 'furStand' && this.activeFurStand) return this.activeFurStand.slots;
        if (type === 'atvTrunk' && this.activeATVTrunk) return this.activeATVTrunk.trunkSlots;
        return null;
    }

    swapSlots(fromType, fromIndex, toType, toIndex) {
    if (fromType === toType && fromIndex === toIndex) return;

    const sourceList = this.getListByType(fromType);
    const targetList = this.getListByType(toType);

    if (!sourceList || !targetList) return;

    const sourceItem = sourceList[fromIndex];
    const targetItem = targetList[toIndex];

    // --- REPAIR KIT DRAG & DROP ACTION ---
    if (sourceItem && sourceItem.name === 'Repair Kit' && targetItem) {
        const isDamaged = targetItem.durability !== undefined && 
                          targetItem.maxDurability !== undefined && 
                          targetItem.durability < targetItem.maxDurability;

        if (isDamaged) {
            targetItem.durability = targetItem.maxDurability;
            sourceItem.count--;

            if (sourceItem.count <= 0) {
                sourceList[fromIndex] = null;
            }

            if (this.player && this.player.saveSystem) {
                this.player.saveSystem.showNotification(`Repaired ${targetItem.name}!`);
            }

            this.renderAllContainers();
            this.draggedSource = null;
            return;
        }
    }

    // inventory.js - inside swapSlots(fromType, fromIndex, toType, toIndex)

if (toType === 'atvFuel') {
    if (sourceItem && sourceItem.name === 'Biofuel Canister' && this.activeATVTrunk) {
        if (this.activeATVTrunk.fuel < this.activeATVTrunk.maxFuel) {
            // Refuels 10% (10.0 out of 100 max fuel)
            this.activeATVTrunk.refuel(10.0);
            sourceItem.count--;

            if (sourceItem.count <= 0) {
                sourceList[fromIndex] = null;
            }

            if (this.player && this.player.saveSystem) {
                this.player.saveSystem.showNotification('Refueled ATV (+10% Fuel)!');
            }

            this.renderAllContainers();
        } else {
            if (this.player && this.player.saveSystem) {
                this.player.saveSystem.showNotification('ATV Fuel Tank is Full!');
            }
        }
    }
    return;
}

    // --- CONTAINER & EQUIPMENT VALIDATION ---
    if (toType === 'equipment') {
        if (toIndex === 'backpack' && sourceItem && sourceItem.name !== 'Leather Backpack') return;
        if (toIndex === 'head' && sourceItem && sourceItem.name !== 'Fur Cap') return;
        if (toIndex === 'chest' && sourceItem && sourceItem.name !== 'Fur Coat') return;
    }

    if (toType === 'furnace') {
        const idx = Number(toIndex);
        if (idx === 0 && sourceItem && sourceItem.name !== 'Metal Ore') return;
        if (idx === 1 && sourceItem && sourceItem.name !== 'Wood' && sourceItem.name !== 'Stick') return;
        if (idx === 2) return;
    }

    if (toType === 'campfire') {
        const idx = Number(toIndex);
        const isValidFood = sourceItem && (sourceItem.name === 'Raw Meat' || sourceItem.name === 'Raw Fish' || sourceItem.name === 'Leather Canteen (Dirty Water)');
        if (idx === 0 && sourceItem && !isValidFood) return;
        if (idx === 1 && sourceItem && (sourceItem.name !== 'Wood' && sourceItem.name !== 'Stick')) return;
        if (idx === 2) return;
    }

    if (toType === 'sawmill') {
        const idx = Number(toIndex);
        if (idx === 0 && sourceItem && sourceItem.name !== 'Wood') return;
        if (idx === 1) return;
    }

    if (toType === 'stoneCrusher') {
        const idx = Number(toIndex);
        if (idx === 0 && sourceItem && sourceItem.name !== 'Stone') return;
        if (idx === 1) return;
    }

   // --- FUR STAND VALIDATION ---
if (toType === 'furStand') {
    const idx = Number(toIndex);
    if (idx === 0 && sourceItem && !VALID_RAW_FURS.includes(sourceItem.name)) return;
    if (idx === 1) return; // Prevent dropping items into output slot
}

if (fromType === 'furStand') {
    const idx = Number(fromIndex);
    if (idx === 0 && targetItem && !VALID_RAW_FURS.includes(targetItem.name)) return;
}

    if (fromType === 'equipment' && fromIndex === 'backpack') {
        if (!this.isBackpackEmpty()) {
            if (this.player && this.player.saveSystem) {
                this.player.saveSystem.showNotification('Empty Backpack before unequipping!');
            }
            return;
        }
    }

    // --- STACKING & SWAPPING LOGIC ---
    if (sourceItem && targetItem && sourceItem.name === targetItem.name && fromType !== 'equipment' && toType !== 'equipment') {
        const maxStack = getMaxStack(targetItem.name);
        const spaceLeft = maxStack - targetItem.count;

        if (spaceLeft > 0) {
            const transferAmount = Math.min(spaceLeft, sourceItem.count);
            targetItem.count += transferAmount;
            sourceItem.count -= transferAmount;

            if (sourceItem.count <= 0) {
                sourceList[fromIndex] = null;
            }
        } else {
            // Target is already full, swap slots instead
            sourceList[fromIndex] = targetItem;
            targetList[toIndex] = sourceItem;
        }
    } else {
        sourceList[fromIndex] = targetItem;
        targetList[toIndex] = sourceItem;
    }

    this.renderAllContainers();
}

// Drop Handler for ATV Trunk Slots
handleTrunkDrop(e, targetIndex) {
    e.preventDefault();
    if (!this.activeATV || !this.draggedItemInfo) return;

    const { sourceContainer, sourceIndex } = this.draggedItemInfo;
    const trunkSlots = this.activeATV.trunkSlots;

    // Retrieve source item reference based on container origin
    let sourceItem = null;
    let sourceArray = null;

    if (sourceContainer === 'inventory') {
        sourceArray = this.items;
        sourceItem = sourceArray[sourceIndex];
    } else if (sourceContainer === 'hotbar') {
        sourceArray = this.hotbar;
        sourceItem = sourceArray[sourceIndex];
    } else if (sourceContainer === 'atvTrunk') {
        sourceArray = trunkSlots;
        sourceItem = sourceArray[sourceIndex];
    }

    if (!sourceItem) return;

    const targetItem = trunkSlots[targetIndex];

    // Case A: Target slot is empty -> Move item
    if (!targetItem) {
        trunkSlots[targetIndex] = sourceItem;
        sourceArray[sourceIndex] = null;
    }
    // Case B: Same item type -> Merge stacks up to stack limit (e.g., 99)
    else if (targetItem.name === sourceItem.name) {
        const maxStack = targetItem.maxStack || 99;
        const spaceLeft = maxStack - targetItem.count;

        if (spaceLeft > 0) {
            const transferQty = Math.min(spaceLeft, sourceItem.count);
            targetItem.count += transferQty;
            sourceItem.count -= transferQty;

            if (sourceItem.count <= 0) {
                sourceArray[sourceIndex] = null;
            }
        } else {
            // Stack is full -> Swap items
            trunkSlots[targetIndex] = sourceItem;
            sourceArray[sourceIndex] = targetItem;
        }
    }
    // Case C: Different item type -> Swap items
    else {
        trunkSlots[targetIndex] = sourceItem;
        sourceArray[sourceIndex] = targetItem;
    }

    this.draggedItemInfo = null;

    // Refresh UI
    this.renderInventory();
    this.renderHotbar();
    this.renderATVTrunk();
}

// Quick Shift-Click Transfer Handler
handleTrunkSlotClick(e, index) {
    if (!e.shiftKey || !this.activeATV) return;

    const item = this.activeATV.trunkSlots[index];
    if (!item) return;

    // Quick-move from ATV Trunk to Player Inventory
    const added = this.addItem(item.name, item.count, item.icon, item.durability, item.maxDurability);
    if (added) {
        this.activeATV.trunkSlots[index] = null;
        this.renderInventory();
        this.renderHotbar();
        this.renderATVTrunk();
    }
}
// Helper method to keep UI re-renders clean and complete
renderAllContainers() {
    this.render();
    this.renderHotbar();
    this.renderCrafting();
    if (this.activeChest) this.renderChest();
    if (this.activeFurnace) this.renderFurnace();
    if (this.activeCampfire) this.renderCampfire();
    if (this.activeSawmill) this.renderSawmill();
    if (this.activeStoneCrusher) this.renderStoneCrusher();
    if (this.activeFurStand) this.renderFurStand();
}

    attachDragListeners(slotElement, slotType, index, hasItem) {
        if (hasItem) {
            slotElement.setAttribute('draggable', 'true');

            slotElement.addEventListener('dragstart', (e) => {
                this.draggedSource = { type: slotType, index };
                slotElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedSource));
            });

            slotElement.addEventListener('dragend', () => {
                slotElement.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                this.draggedSource = null;
            });
        }

        slotElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        slotElement.addEventListener('dragenter', (e) => {
            e.preventDefault();
            slotElement.classList.add('drag-over');
        });

        slotElement.addEventListener('dragleave', () => {
            slotElement.classList.remove('drag-over');
        });

        slotElement.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation(); // <-- Prevents event from bubbling to document.body
    slotElement.classList.remove('drag-over');

    if (!this.draggedSource) {
        try {
            this.draggedSource = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch {
            return;
        }
    }

    if (this.draggedSource) {
        this.swapSlots(this.draggedSource.type, this.draggedSource.index, slotType, index);
        this.draggedSource = null;
    }
});
    }

    openChest(chest, controls) {
        this.activeChest = chest;
        this.activeFurnace = null;
        this.activeCampfire = null;
        this.isOpen = true;
        this.uiContainer.classList.remove('hidden');
        if (controls.isLocked) controls.unlock();
        this.switchTab('inventory');
        this.render();
        this.renderChest();
        this.renderFurnace();
        this.renderCampfire();
    }

    // Open Container Handlers
closeContainer() {
    this.activeChest = null;
    this.activeFurnace = null;
    this.activeCampfire = null;
    this.activeSawmill = null;
    this.activeStoneCrusher = null;
    this.activeFurStand = null;
    this.activeATVTrunk = null;

    document.getElementById('chest-section')?.classList.add('hidden');
    document.getElementById('furnace-section')?.classList.add('hidden');
    document.getElementById('campfire-section')?.classList.add('hidden');
    document.getElementById('sawmill-section')?.classList.add('hidden');
    document.getElementById('stone-crusher-section')?.classList.add('hidden');
    document.getElementById('fur-stand-section')?.classList.add('hidden');
}

resetActiveContainers() {
    this.activeChest = null;
    this.activeFurnace = null;
    this.activeCampfire = null;
    this.activeSawmill = null;
    this.activeStoneCrusher = null;
    this.activeFurStand = null;
    this.activeATVTrunk = null;
}

openSawmill(sawmill, controls) {
    this.resetActiveContainers();
    this.activeSawmill = sawmill;
    this.isOpen = true;
    this.uiContainer.classList.remove('hidden');
    if (controls && controls.isLocked) controls.unlock();
    this.switchTab('inventory');
    this.render();
    this.renderSawmill();
}

openStoneCrusher(crusher, controls) {
    this.resetActiveContainers();
    this.activeStoneCrusher = crusher;
    this.isOpen = true;
    this.uiContainer.classList.remove('hidden');
    if (controls && controls.isLocked) controls.unlock();
    this.switchTab('inventory');
    this.render();
    this.renderStoneCrusher();
}

openFurStand(furStand, controls) {
    this.resetActiveContainers();
    this.activeFurStand = furStand;
    this.isOpen = true;
    this.uiContainer.classList.remove('hidden');
    if (controls && controls.isLocked) controls.unlock();
    this.switchTab('inventory');
    this.render();
    this.renderFurStand();
    furStand.inventory = this; // <-- Link inventory reference
}

// Render Handlers
renderSawmill() {
    const section = document.getElementById('sawmill-section');
    if (!section) return;

    if (!this.activeSawmill) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    const slots = section.querySelectorAll('.sawmill-slot');
    const labels = ['Wood Input', 'Planks Output'];

    slots.forEach((slotEl, idx) => {
        const item = this.activeSawmill.slots[idx];
        if (item) {
            slotEl.innerHTML = `
                <span class="sawmill-slot-label">${labels[idx]}</span>
                <div class="slot-icon">${item.icon}</div>
                <span class="slot-count-badge">x${item.count}</span>
            `;
            slotEl.title = `${item.name} (x${item.count}) - Right-click to retrieve`;
            slotEl.oncontextmenu = (e) => {
                e.preventDefault();
                this.useItem('sawmill', idx);
            };
        } else {
            slotEl.innerHTML = `<span class="sawmill-slot-label">${labels[idx]}</span>`;
            slotEl.title = `${labels[idx]} Slot`;
        }
        this.attachDragListeners(slotEl, 'sawmill', idx, !!item);
    });

    this.renderSawmillProgress();
}

renderSawmillProgress() {
    if (!this.activeSawmill) return;
    const fill = document.getElementById('sawmill-progress-fill');
    const status = document.getElementById('sawmill-status-text');
    if (fill && status) {
        if (this.activeSawmill.isProcessing) {
            const pct = (this.activeSawmill.processTimer / this.activeSawmill.processDuration) * 100;
            fill.style.width = `${pct}%`;
            status.innerText = 'Sawing Wood...';
            status.style.color = '#e67e22';
        } else {
            fill.style.width = '0%';
            status.innerText = 'Idle';
            status.style.color = '#aaa';
        }
    }
}

renderStoneCrusher() {
    const section = document.getElementById('stone-crusher-section');
    if (!section) return;

    if (!this.activeStoneCrusher) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    const slots = section.querySelectorAll('.stone-crusher-slot');
    const labels = ['Stone Input', 'Gravel Output'];

    slots.forEach((slotEl, idx) => {
        const item = this.activeStoneCrusher.slots[idx];
        if (item) {
            slotEl.innerHTML = `
                <span class="stone-crusher-slot-label">${labels[idx]}</span>
                <div class="slot-icon">${item.icon}</div>
                <span class="slot-count-badge">x${item.count}</span>
            `;
            slotEl.title = `${item.name} (x${item.count}) - Right-click to retrieve`;
            slotEl.oncontextmenu = (e) => {
                e.preventDefault();
                this.useItem('stoneCrusher', idx);
            };
        } else {
            slotEl.innerHTML = `<span class="stone-crusher-slot-label">${labels[idx]}</span>`;
            slotEl.title = `${labels[idx]} Slot`;
        }
        this.attachDragListeners(slotEl, 'stoneCrusher', idx, !!item);
    });

    this.renderStoneCrusherProgress();
}

renderStoneCrusherProgress() {
    if (!this.activeStoneCrusher) return;
    const fill = document.getElementById('stone-crusher-progress-fill');
    const status = document.getElementById('stone-crusher-status-text');
    if (fill && status) {
        if (this.activeStoneCrusher.isProcessing) {
            const pct = (this.activeStoneCrusher.processTimer / this.activeStoneCrusher.processDuration) * 100;
            fill.style.width = `${pct}%`;
            status.innerText = 'Crushing Stone...';
            status.style.color = '#e67e22';
        } else {
            fill.style.width = '0%';
            status.innerText = 'Idle';
            status.style.color = '#aaa';
        }
    }
}

renderFurStand() {
    const section = document.getElementById('fur-stand-section');
    if (!section) return;

    if (!this.activeFurStand) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    const slots = section.querySelectorAll('.fur-stand-slot');
    const labels = ['Raw Fur', 'Finished Pelt'];

    slots.forEach((slotEl, idx) => {
        const item = this.activeFurStand.slots[idx];
        if (item) {
            slotEl.innerHTML = `
                <span class="fur-stand-slot-label">${labels[idx]}</span>
                <div class="slot-icon">${item.icon}</div>
                <span class="slot-count-badge">x${item.count}</span>
            `;
            slotEl.title = `${item.name} (x${item.count}) - Right-click to retrieve`;
            slotEl.oncontextmenu = (e) => {
                e.preventDefault();
                this.useItem('furStand', idx);
            };
        } else {
            slotEl.innerHTML = `<span class="fur-stand-slot-label">${labels[idx]}</span>`;
            slotEl.title = `${labels[idx]} Slot`;
        }
        this.attachDragListeners(slotEl, 'furStand', idx, !!item);
    });

    this.renderFurStandProgress();
}

renderFurStandProgress() {
    if (!this.activeFurStand) return;
    const fill = document.getElementById('fur-stand-progress-fill');
    const status = document.getElementById('fur-stand-status-text');
    if (fill && status) {
        if (this.activeFurStand.isProcessing) {
            const pct = (this.activeFurStand.processTimer / this.activeFurStand.processDuration) * 100;
            fill.style.width = `${pct}%`;
            status.innerText = 'Processing Fur...';
            status.style.color = '#e67e22';
        } else {
            fill.style.width = '0%';
            status.innerText = 'Idle';
            status.style.color = '#aaa';
        }
    }
}

    openFurnace(furnace, controls) {
        this.activeChest = null;
        this.activeFurnace = furnace;
        this.activeCampfire = null;
        this.isOpen = true;
        this.uiContainer.classList.remove('hidden');
        if (controls.isLocked) controls.unlock();
        this.switchTab('inventory');
        this.render();
        this.renderChest();
        this.renderFurnace();
        this.renderCampfire();
    }

    openCampfire(campfire, controls) {
        this.activeChest = null;
        this.activeFurnace = null;
        this.activeCampfire = campfire;
        this.isOpen = true;
        this.uiContainer.classList.remove('hidden');
        if (controls.isLocked) controls.unlock();
        this.switchTab('inventory');
        this.render();
        this.renderChest();
        this.renderFurnace();
        this.renderCampfire();
    }

    renderFurnace() {
    if (!this.furnaceSection || !this.furnaceGridContainer) return;

    if (!this.activeFurnace) {
        this.furnaceSection.classList.add('hidden');
        return;
    }

    this.furnaceSection.classList.remove('hidden');
    this.furnaceGridContainer.innerHTML = '';

    const labels = ['Ore', 'Fuel', 'Output', 'Charcoal'];
    const slotClasses = [
        'furnace-slot', 
        'furnace-slot', 
        'furnace-slot output-slot', 
        'furnace-slot output-slot'
    ];

    this.activeFurnace.slots.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = slotClasses[index];

        if (item) {
            slot.innerHTML = `
                <span class="furnace-slot-label">${labels[index]}</span>
                <div class="slot-icon">${item.icon}</div>
                <span class="slot-count-badge">x${item.count}</span>
            `;
            slot.title = `${item.name} (x${item.count}) - Right-click to retrieve`;
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('furnace', index);
            });
        } else {
            slot.innerHTML = `<span class="furnace-slot-label">${labels[index]}</span>`;
            slot.title = `${labels[index]} Slot`;
        }

        this.attachDragListeners(slot, 'furnace', index, !!item);
        this.furnaceGridContainer.appendChild(slot);
    });

    // Update progress bar and status text
    const fill = document.getElementById('furnace-progress-fill');
    const statusText = document.getElementById('furnace-status-text');

    if (fill && statusText) {
        const progress = (this.activeFurnace.processTimer / this.activeFurnace.processDuration) * 100;
        fill.style.width = `${progress}%`;

        if (this.activeFurnace.isProcessing) {
            const isSmelting = this.activeFurnace.canSmeltOre();
            const actionLabel = isSmelting ? 'Smelting...' : 'Burning Fuel...';
            const remainingTime = Math.max(0, this.activeFurnace.processDuration - this.activeFurnace.processTimer).toFixed(1);
            
            statusText.innerText = `${actionLabel} (${remainingTime}s)`;
            statusText.style.color = '#e67e22';
        } else if (this.activeFurnace.processTimer > 0) {
            statusText.innerText = 'Paused (Missing Fuel or Ore)';
            statusText.style.color = '#e74c3c';
        } else {
            statusText.innerText = 'Idle (Missing Fuel)';
            statusText.style.color = '#aaa';
        }
    }
}

    renderCampfire() {
    if (!this.campfireSection || !this.campfireGridContainer) return;

    if (!this.activeCampfire) {
        this.campfireSection.classList.add('hidden');
        return;
    }

    this.campfireSection.classList.remove('hidden');
    this.campfireGridContainer.innerHTML = '';

    const labels = ['Food', 'Fuel', 'Output', 'Charcoal'];
    const slotClasses = [
        'campfire-slot', 
        'campfire-slot', 
        'campfire-slot output-slot', 
        'campfire-slot output-slot'
    ];

    this.activeCampfire.slots.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = slotClasses[index];

        if (item) {
            slot.innerHTML = `
                <span class="campfire-slot-label">${labels[index]}</span>
                <div class="slot-icon">${item.icon}</div>
                <span class="slot-count-badge">x${item.count}</span>
            `;
            slot.title = `${item.name} (x${item.count}) - Right-click to retrieve`;
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('campfire', index);
            });
        } else {
            slot.innerHTML = `<span class="campfire-slot-label">${labels[index]}</span>`;
            slot.title = `${labels[index]} Slot`;
        }

        this.attachDragListeners(slot, 'campfire', index, !!item);
        this.campfireGridContainer.appendChild(slot);
    });

    // Update progress bar and status text
    const fill = document.getElementById('campfire-progress-fill');
    const statusText = document.getElementById('campfire-status-text');

    if (fill && statusText) {
        const progress = (this.activeCampfire.processTimer / this.activeCampfire.processDuration) * 100;
        fill.style.width = `${progress}%`;

        if (this.activeCampfire.isProcessing) {
            const hasFood = this.activeCampfire.canCookFood();
            const actionLabel = hasFood ? 'Cooking...' : 'Burning Fuel...';
            const remainingTime = Math.max(0, this.activeCampfire.processDuration - this.activeCampfire.processTimer).toFixed(1);
            
            statusText.innerText = `${actionLabel} (${remainingTime}s)`;
            statusText.style.color = '#e67e22';
        } else {
            statusText.innerText = 'Idle (Missing Fuel)';
            statusText.style.color = '#aaa';
        }
    }
}

   toggle(controls, targetTab = 'inventory') {
    if (this.isOpen && this.activeTab === targetTab) {
        this.isOpen = false;
        this.closeContainer();
    } else {
        this.isOpen = true;
        this.activeTab = targetTab;
    }

    if (this.isOpen) {
        this.uiContainer.classList.remove('hidden');
        if (controls.isLocked) controls.unlock();
        this.switchTab(this.activeTab);
        this.render();
        this.renderCrafting();
        this.renderChest();
        this.renderFurnace();
        this.renderCampfire();
        this.renderSawmill();
        this.renderStoneCrusher();
        this.renderFurStand();
    } else {
        this.uiContainer.classList.add('hidden');
        this.closeContainer();
        if (controls && !controls.isLocked) controls.lock();
    }
}

    switchTab(tabName) {
        this.activeTab = tabName;
        const tabInv = document.getElementById('tab-btn-inv');
        const tabCraft = document.getElementById('tab-btn-craft');
        const viewInv = document.getElementById('inventory-view');
        const viewCraft = document.getElementById('crafting-view');

        if (tabName === 'inventory') {
            tabInv?.classList.add('active');
            tabCraft?.classList.remove('active');
            viewInv?.classList.remove('hidden');
            viewCraft?.classList.add('hidden');
        } else {
            tabCraft?.classList.add('active');
            tabInv?.classList.remove('active');
            viewCraft?.classList.remove('hidden');
            viewInv?.classList.add('hidden');
        }
    }

    renderHotbar() {
    if (!this.hotbarContainer) return;
    this.hotbarContainer.innerHTML = '';

    this.hotbarSlots.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = `hotbar-slot ${index === this.activeHotbarIndex ? 'active' : ''}`;

        if (item) {
            // Generate durability bar HTML if item has durability tracking
            const barHTML = (item.durability !== undefined && item.maxDurability) 
                ? this.createDurabilityBarHTML(item.durability, item.maxDurability) 
                : '';

            // Display count badge only for stackable items with count > 1
            const countBadge = item.count > 1 ? `<span class="slot-count-badge">x${item.count}</span>` : '';

            slot.innerHTML = `
                <span class="slot-num">${index + 1}</span>
                <div class="slot-icon">${item.icon}</div>
                ${countBadge}
                ${barHTML}
            `;

            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('hotbar', index);
            });
        } else {
            slot.innerHTML = `<span class="slot-num">${index + 1}</span>`;
        }

        this.attachDragListeners(slot, 'hotbar', index, !!item);
        this.hotbarContainer.appendChild(slot);
    });
}

    renderEquipment() {
    if (!this.equipmentGridContainer) return;

    const labelMap = { head: '👑 Head', chest: '🧥 Chest', backpack: '🎒 Bag' };
    this.equipmentGridContainer.innerHTML = '';

    ['head', 'chest', 'backpack'].forEach(equipKey => {
        const item = this.equipmentSlots[equipKey];
        const slotEl = document.createElement('div');
        slotEl.className = `equipment-slot ${item ? 'occupied' : ''}`;
        slotEl.setAttribute('data-equip-type', equipKey);

        if (item) {
            // Generate durability bar HTML if armor/item has durability tracking
            const barHTML = (item.durability !== undefined && item.maxDurability) 
                ? this.createDurabilityBarHTML(item.durability, item.maxDurability) 
                : '';

            // Display count badge only if item count is greater than 1
            const countBadge = item.count > 1 ? `<span class="slot-count-badge">x${item.count}</span>` : '';

            slotEl.innerHTML = `
                <div class="slot-icon">${item.icon}</div>
                ${countBadge}
                ${barHTML}
            `;
            slotEl.title = `${item.name} (Right-click to unequip)`;
            slotEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('equipment', equipKey);
            });
        } else {
            slotEl.innerHTML = `<span class="slot-type-label">${labelMap[equipKey]}</span>`;
            slotEl.title = `${labelMap[equipKey]} Slot`;
        }

        this.attachDragListeners(slotEl, 'equipment', equipKey, !!item);
        this.equipmentGridContainer.appendChild(slotEl);
    });
}

    renderBackpack() {
        if (!this.backpackSection || !this.backpackGridContainer) return;

        if (!this.equipmentSlots.backpack) {
            this.backpackSection.classList.add('hidden');
            return;
        }

        this.backpackSection.classList.remove('hidden');
        this.backpackGridContainer.innerHTML = '';

        this.backpackSlots.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'backpack-slot';

            if (item) {
                slot.innerHTML = `
                    <div class="slot-icon">${item.icon}</div>
                    <span class="slot-count-badge">x${item.count}</span>
                `;
                slot.title = `${item.name} (x${item.count}) - Drag or right-click to use`;
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.useItem('backpack', index);
                });
            } else {
                slot.innerHTML = `<span class="empty-slot-label">-</span>`;
            }

            this.attachDragListeners(slot, 'backpack', index, !!item);
            this.backpackGridContainer.appendChild(slot);
        });
    }

  render() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    this.inventorySlots.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';

        if (item) {
            // Generate durability bar HTML if item has durability tracking
            const barHTML = (item.durability !== undefined && item.maxDurability) 
                ? this.createDurabilityBarHTML(item.durability, item.maxDurability) 
                : '';

            // Display count badge only for stackable items with count > 1
            const countBadge = item.count > 1 ? `<span class="slot-count-badge">x${item.count}</span>` : '';

            slot.innerHTML = `
                <div class="slot-icon">${item.icon}</div>
                <div class="slot-details">
                    <span class="slot-name">${item.name}</span>
                </div>
                ${countBadge}
                ${barHTML}
            `;
            slot.title = 'Drag to move | Right-click to consume/equip/use';
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.useItem('inventory', index);
            });
        } else {
            slot.innerHTML = `<span class="empty-slot-label">Empty</span>`;
        }

        this.attachDragListeners(slot, 'inventory', index, !!item);
        this.gridContainer.appendChild(slot);
    });

    this.renderEquipment();
    this.renderBackpack();

    // Workstation & Storage Renders
    if (this.activeFurnace) this.renderFurnace();
    if (this.activeCampfire) this.renderCampfire();
    if (this.activeChest) this.renderChest();
    if (this.activeSawmill) this.renderSawmillProgress();
    if (this.activeStoneCrusher) this.renderStoneCrusherProgress();
    if (this.activeFurStand) this.renderFurStandProgress();

    // ATV Trunk Render (Hides automatically if this.activeATVTrunk is null)
    this.renderATVTrunk();
}
    renderChest() {
        if (!this.chestSection || !this.chestGridContainer) return;

        if (!this.activeChest) {
            this.chestSection.classList.add('hidden');
            return;
        }

        this.chestSection.classList.remove('hidden');
        this.chestGridContainer.innerHTML = '';

        this.activeChest.slots.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'chest-slot';

            if (item) {
                slot.innerHTML = `
                    <div class="slot-icon">${item.icon}</div>
                    <span class="slot-count-badge">x${item.count}</span>
                `;
                slot.title = `${item.name} (x${item.count}) - Drag to Inventory`;
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.useItem('chest', index);
                });
            } else {
                slot.innerHTML = `<span class="empty-slot-label">-</span>`;
            }

            this.attachDragListeners(slot, 'chest', index, !!item);
            this.chestGridContainer.appendChild(slot);
        });
    }

    renderCrafting() {
        if (!this.craftingContainer) return;
        this.craftingContainer.innerHTML = '';

        RECIPES.forEach(recipe => {
            const canCraft = this.hasIngredients(recipe.ingredients);
            const card = document.createElement('div');
            card.className = `crafting-card ${canCraft ? 'craftable' : 'locked'}`;

            let ingredientsHTML = recipe.ingredients.map(ing => {
                const owned = this.getItemCount(ing.name);
                const hasEnough = owned >= ing.count;
                return `<span class="ing-badge ${hasEnough ? 'has-enough' : 'missing'}">${ing.name} ${owned}/${ing.count}</span>`;
            }).join(' ');

            card.innerHTML = `
                <div class="crafting-card-header">
                    <span class="crafting-icon">${recipe.icon}</span>
                    <div class="crafting-title-group">
                        <span class="crafting-name">${recipe.name}</span>
                        <div class="ingredients-list">${ingredientsHTML}</div>
                    </div>
                </div>
                <button class="craft-btn" ${canCraft ? '' : 'disabled'}>Craft</button>
            `;

            const btn = card.querySelector('.craft-btn');
            btn.addEventListener('click', () => {
                this.craft(recipe);
            });

            this.craftingContainer.appendChild(card);
        });
    }
    
}




function isFurOrPelt(itemName) {
    if (!itemName) return false;
    return itemName === 'Fur' || 
           itemName === 'Finished Pelt' || 
           itemName.endsWith(' Fur') || 
           itemName.endsWith(' Pelt');
}
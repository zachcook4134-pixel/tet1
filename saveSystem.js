import * as THREE from 'three';
import { 
    Campfire, StorageChest, WoodenFoundation, WoodenWall, WoodenDoor, WoodenRoof, 
    Furnace, MetalFoundation, MetalWall, MetalDoor, 
    Sawmill, StoneCrusher, FurProcessingStand, Bedroll, AFrameShelter
} from './structures.js';
import { Trap } from './traps.js';
import { WallTorch, StandingLantern } from './torches.js';
import { TilledSoil } from './farming.js';
import { ATV } from './vehicles.js';

export class SaveSystem {
    constructor(player, weatherManager, celestialSky, scene, context = {}) {
        this.player = player;
        this.weatherManager = weatherManager;
        this.celestialSky = celestialSky;
        this.scene = scene;
        
        this.interactables = context.interactables || [];
        this.obstacles = context.obstacles || [];
        this.spatialGrid = context.spatialGrid || null;
        this.marketManager = context.marketManager || null;

        // Extended context references
        this.atvs = context.atvs || [];
        this.trees = context.trees || [];
        this.stoneOres = context.stoneOres || [];
        this.metalOres = context.metalOres || [];

        this.saveKey = 'wilderness_survival_savegame';
        this.placedStructures = [];
    }

    registerStructure(structure, type) {
        if (!this.placedStructures.some(s => s.structure === structure)) {
            this.placedStructures.push({ structure, type });
        }

        if (this.spatialGrid && structure) {
            if (structure.obstacleNodes) {
                structure.obstacleNodes.forEach(node => {
                    const nearby = this.spatialGrid.getNearby(node.position.x, node.position.z);
                    if (!nearby.includes(node)) {
                        this.spatialGrid.insert(node);
                    }
                });
            } else if (structure.radius) {
                const pos = structure.group ? structure.group.position : structure.position;
                if (pos) {
                    const nearby = this.spatialGrid.getNearby(pos.x, pos.z);
                    if (!nearby.includes(structure)) {
                        this.spatialGrid.insert(structure);
                    }
                }
            }
        }
    }

    unregisterStructure(structure) {
        const index = this.placedStructures.findIndex(s => s.structure === structure);
        if (index !== -1) {
            this.placedStructures.splice(index, 1);
        }

        // Clean up roof registry references
        if (this.weatherManager && structure.type === 'Wooden Roof' && structure.mesh) {
            this.weatherManager.unregisterRoof(structure.mesh);
        }

        if (this.spatialGrid && structure) {
            if (structure.obstacleNodes) {
                structure.obstacleNodes.forEach(node => this.spatialGrid.remove(node));
            } else {
                this.spatialGrid.remove(structure);
            }
        }
    }

    save() {
        if (!this.player || !this.player.controls) return false;

        const playerPos = this.player.controls.getObject().position;

        // 1. Player Vitals, Status Effects & Inventory
        const playerData = {
            coins: this.player.coins || 100,
            position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            spawnBedrollPos: this.player.spawnBedroll && this.player.spawnBedroll.group 
                ? { 
                    x: this.player.spawnBedroll.group.position.x, 
                    y: this.player.spawnBedroll.group.position.y, 
                    z: this.player.spawnBedroll.group.position.z 
                  } 
                : null,
            vitals: {
                health: this.player.health,
                stamina: this.player.stamina,
                hunger: this.player.hunger,
                thirst: this.player.thirst,
                bodyTemp: this.player.bodyTemp,
                isPoisoned: this.player.isPoisoned || false,
                poisonTimer: this.player.poisonTimer || 0
            },
            inventorySlots: this.player.inventory.inventorySlots,
            backpackSlots: this.player.inventory.backpackSlots,
            equipmentSlots: this.player.inventory.equipmentSlots,
            hotbarSlots: this.player.inventory.hotbarSlots,
            activeHotbarIndex: this.player.inventory.activeHotbarIndex
        };

        // 2. Weather & Day/Night Celestial State
        const environmentData = {
            time: this.celestialSky ? this.celestialSky.time : 0,
            season: this.weatherManager ? this.weatherManager.currentSeason : 'SPRING',
            currentWeather: this.weatherManager ? this.weatherManager.currentWeather : 'CLEAR',
            totalDaysPassed: this.weatherManager ? this.weatherManager.totalDaysPassed : 0,
            temperature: this.weatherManager ? this.weatherManager.temperature : 15
        };

        // 3. Economy State
        const marketData = this.marketManager ? {
            items: this.marketManager.items,
            currentEvent: this.marketManager.currentEvent,
            eventTimer: this.marketManager.eventTimer
        } : null;

        // 4. Placed Player Structures
        const containerTypes = ['Chest', 'Furnace', 'Campfire', 'Sawmill', 'Stone Crusher', 'Fur Processing Stand'];
        const structuresData = this.placedStructures
            .filter(s => s.structure && !s.structure.isDestroyed)
            .map(s => {
                const pos = s.structure.group.position;
                const rotY = s.structure.group.rotation.y;
                
                let extraState = {};
                if (containerTypes.includes(s.type)) {
                    extraState.slots = s.structure.slots;
                } else if (s.type === 'Wooden Door' || s.type === 'Metal Door') {
                    extraState.isOpen = s.structure.isOpen;
                }

                return { type: s.type, x: pos.x, y: pos.y, z: pos.z, rotationY: rotY, extraState };
            });

        // 5. Active Traps
        const trapsData = (this.player.traps || [])
            .filter(t => t && !t.isDestroyed)
            .map(t => ({
                type: t.trapType,
                x: t.group.position.x,
                y: t.group.position.y,
                z: t.group.position.z,
                state: t.state,
                caughtAnimalType: t.caughtAnimalType
            }));

        // 6. ATV Serialization
       const atvsData = this.atvs.map(atv => ({
    x: atv.group.position.x,
    y: atv.group.position.y,
    z: atv.group.position.z,
    rotationX: atv.group.rotation.x,
    rotationY: atv.group.rotation.y,
    rotationZ: atv.group.rotation.z,
    isHeadlightOn: atv.isHeadlightOn,
    isOccupied: atv.isOccupied,
    fuel: atv.fuel,
    trunkSlots: atv.trunkSlots
}));

        // 7. Farming & Crops Serialization
        const soilsData = [];
        this.interactables.forEach(item => {
            let soil = item.userData?.soil;
            if (!soil && item.children) {
                for (const child of item.children) {
                    if (child.userData?.soil) {
                        soil = child.userData.soil;
                        break;
                    }
                }
            }
            if (soil && soil.group) {
                const pos = soil.group.position;
                const cropData = soil.crop ? {
                    type: soil.crop.type || 'Berry Seeds',
                    stage: soil.crop.stage,
                    growthTimer: soil.crop.growthTimer
                } : null;

                soilsData.push({
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                    crop: cropData
                });
            }
        });

        // 8. Tree Lifecycle Serialization
        const treesData = this.trees.map(tree => ({
            stage: tree.stage,
            health: tree.health,
            isStump: tree.isStump,
            isDestroyed: tree.isDestroyed,
            regrowTimer: tree.regrowTimer,
            growthTimer: tree.growthTimer
        }));

        // 9. Ore Deposits Serialization
        const mapOre = (ore) => ({
            hp: ore.hp,
            isDestroyed: ore.isDestroyed,
            respawnTimer: ore.respawnTimer || 0
        });
        const stoneOresData = this.stoneOres.map(mapOre);
        const metalOresData = this.metalOres.map(mapOre);

        const saveData = {
            version: 2,
            timestamp: Date.now(),
            player: playerData,
            environment: environmentData,
            structures: structuresData,
            traps: trapsData,
            market: marketData,
            atvs: atvsData,
            soils: soilsData,
            trees: treesData,
            stoneOres: stoneOresData,
            metalOres: metalOresData
        };

        try {
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            this.showNotification('Game Saved!');
            return true;
        } catch (err) {
            console.error('Save error:', err);
            if (err.name === 'QuotaExceededError') {
                this.showNotification('Save Failed: Storage Full!');
            } else {
                this.showNotification('Save Failed!');
            }
            return false;
        }
    }

    load() {
        const rawData = localStorage.getItem(this.saveKey);
        if (!rawData) {
            this.showNotification('No Save Found!');
            return false;
        }

        try {
            const saveData = JSON.parse(rawData);

            // 1. Restore Player State
            if (saveData.player) {
                const p = saveData.player;
                this.player.controls.getObject().position.set(p.position.x, p.position.y, p.position.z);
                this.player.coins = p.coins !== undefined ? p.coins : 100;
                
                this.player.health = p.vitals.health;
                this.player.stamina = p.vitals.stamina;
                this.player.hunger = p.vitals.hunger;
                this.player.thirst = p.vitals.thirst;
                if (p.vitals.bodyTemp !== undefined) this.player.bodyTemp = p.vitals.bodyTemp;
                
                this.player.isPoisoned = p.vitals.isPoisoned || false;
                this.player.poisonTimer = p.vitals.poisonTimer || 0;

                if (p.equipmentSlots) this.player.inventory.equipmentSlots = p.equipmentSlots;
                if (p.backpackSlots) this.player.inventory.backpackSlots = p.backpackSlots;
                
                this.player.inventory.inventorySlots = p.inventorySlots;
                this.player.inventory.hotbarSlots = p.hotbarSlots;
                this.player.inventory.activeHotbarIndex = p.activeHotbarIndex || 0;

                this.player.inventory.render();
                this.player.inventory.renderEquipment();
                this.player.inventory.renderBackpack();
                this.player.inventory.renderHotbar();
            }

            // 2. Restore Economy
            if (saveData.market && this.marketManager) {
                this.marketManager.items = saveData.market.items;
                this.marketManager.currentEvent = saveData.market.currentEvent;
                this.marketManager.eventTimer = saveData.market.eventTimer;
            }

            // 3. Restore Environment
            if (saveData.environment) {
                const e = saveData.environment;
                if (this.celestialSky) {
                    this.celestialSky.time = e.time;
                }
                if (this.weatherManager) {
                    this.weatherManager.currentSeason = e.season;
                    this.weatherManager.totalDaysPassed = e.totalDaysPassed;
                    this.weatherManager.temperature = e.temperature;
                    this.weatherManager.setWeather(e.currentWeather);
                }
            }

            // 4. Rebuild Placed Structures & Traps
            this.clearCurrentStructures();
            this.clearCurrentTraps();

            if (saveData.structures && Array.isArray(saveData.structures)) {
                saveData.structures.forEach(sData => {
                    const context = {
                        environment: this.player.environment,
                        interactables: this.interactables,
                        obstacles: this.obstacles,
                        spatialGrid: this.spatialGrid,
                        weatherManager: this.weatherManager,
                        activeInteractables: this.player.activeInteractables
                    };

                    let instance = null;

                    switch (sData.type) {
                        case 'Campfire':
                            instance = new Campfire(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Chest':
                            instance = new StorageChest(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Furnace':
                            instance = new Furnace(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Sawmill':
                            instance = new Sawmill(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Stone Crusher':
                            instance = new StoneCrusher(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Fur Processing Stand':
                            instance = new FurProcessingStand(this.scene, sData.x, sData.y, sData.z, context);
                            if (sData.extraState?.slots) instance.slots = sData.extraState.slots;
                            break;
                        case 'Wooden Foundation':
                            instance = new WoodenFoundation(this.scene, sData.x, sData.y, sData.z, context);
                            break;
                        case 'Metal Foundation':
                            instance = new MetalFoundation(this.scene, sData.x, sData.y, sData.z, context);
                            break;
                        case 'Wooden Wall':
                            instance = new WoodenWall(this.scene, sData.x, sData.y, sData.z, sData.rotationY, context);
                            break;
                        case 'Metal Wall':
                            instance = new MetalWall(this.scene, sData.x, sData.y, sData.z, sData.rotationY, context);
                            break;
                        case 'Wooden Door':
                            instance = new WoodenDoor(this.scene, sData.x, sData.y, sData.z, sData.rotationY, context);
                            if (sData.extraState?.isOpen) instance.toggle();
                            break;
                        case 'Metal Door':
                            instance = new MetalDoor(this.scene, sData.x, sData.y, sData.z, sData.rotationY, context);
                            if (sData.extraState?.isOpen) instance.toggle();
                            break;
                        case 'Wooden Roof':
                            instance = new WoodenRoof(this.scene, sData.x, sData.y, sData.z, context);
                            break;
                        case 'Wall Torch':
                            instance = new WallTorch(this.scene, sData.x, sData.y, sData.z, sData.rotationY, context);
                            break;
                        case 'Standing Lantern':
                            instance = new StandingLantern(this.scene, sData.x, sData.y, sData.z, context);
                            break;
                        case 'Bedroll':
                            instance = new Bedroll(this.scene, sData.x, sData.y, sData.z, { ...context, player: this.player });
                            break;
                        case 'A-Frame Shelter':
                            instance = new AFrameShelter(this.scene, sData.x, sData.y, sData.z, context);
                            break;
                    }

                    if (instance) this.registerStructure(instance, sData.type);
                });
            }

            // 4b. Re-bind Bedroll spawn point reference
            if (saveData.player && saveData.player.spawnBedrollPos) {
                const sPos = saveData.player.spawnBedrollPos;
                const foundBedroll = this.placedStructures.find(s => 
                    s.type === 'Bedroll' && 
                    Math.abs(s.structure.group.position.x - sPos.x) < 0.1 &&
                    Math.abs(s.structure.group.position.z - sPos.z) < 0.1
                );
                if (foundBedroll) {
                    this.player.spawnBedroll = foundBedroll.structure;
                }
            }

            if (saveData.traps && Array.isArray(saveData.traps)) {
                saveData.traps.forEach(tData => {
                    const context = {
                        environment: this.player.environment,
                        interactables: this.interactables,
                        obstacles: this.obstacles,
                        spatialGrid: this.spatialGrid,
                        traps: this.player.traps
                    };

                    const trap = new Trap(this.scene, tData.x, tData.y, tData.z, tData.type, context);
                    if (tData.state === 'CAUGHT') {
                        trap.state = 'CAUGHT';
                        trap.caughtAnimalType = tData.caughtAnimalType;
                        trap.buildTrapMesh();
                    }

                    if (this.player.traps && !this.player.traps.includes(trap)) {
                        this.player.traps.push(trap);
                    }
                });
            }

            // 5. Restore ATVs
            if (saveData.atvs && Array.isArray(saveData.atvs) && this.atvs.length > 0) {
    saveData.atvs.forEach((aData, i) => {
        const atv = this.atvs[i];
        if (!atv) return;

        atv.group.position.set(aData.x, aData.y, aData.z);
        atv.group.rotation.set(aData.rotationX || 0, aData.rotationY || 0, aData.rotationZ || 0);

        // Restore fuel levels
        if (aData.fuel !== undefined) {
            atv.fuel = aData.fuel;
        }

        // Restore ATV trunk inventory items, icons, and stack counts
        if (aData.trunkSlots && Array.isArray(aData.trunkSlots)) {
            atv.trunkSlots = aData.trunkSlots;
        }

        if (atv.isHeadlightOn !== aData.isHeadlightOn) {
            atv.toggleHeadlight();
        }

        if (aData.isOccupied && this.player) {
            this.player.mountATV(atv);
        }
    });
}

            // 6. Restore Soils & Crops
            this.clearCurrentSoilsAndCrops();
            if (saveData.soils && Array.isArray(saveData.soils)) {
                saveData.soils.forEach(sData => {
                    const soil = new TilledSoil(this.scene, sData.x, sData.y, sData.z, {
                        interactables: this.interactables
                    });

                    if (sData.crop) {
                        const crop = soil.plantSeed(sData.crop.type, this.player.crops);
                        if (crop) {
                            crop.stage = sData.crop.stage;
                            crop.growthTimer = sData.crop.growthTimer;
                            crop.updateMeshStage();
                        }
                    }
                });
            }

            // 7. Restore Tree Lifecycles
            if (saveData.trees && Array.isArray(saveData.trees)) {
                saveData.trees.forEach((tData, i) => {
                    const tree = this.trees[i];
                    if (!tree) return;

                    tree.stage = tData.stage;
                    tree.health = tData.health;
                    tree.isStump = tData.isStump;
                    tree.isDestroyed = tData.isDestroyed;
                    tree.regrowTimer = tData.regrowTimer;
                    tree.growthTimer = tData.growthTimer;

                    if (tree.isStump) {
                        tree.buildStumpMesh();
                        tree.markActive();
                    } else if (!tree.isDestroyed) {
                        tree.buildTree();
                        if (tree.stage < 3) tree.markActive();
                        else tree.markInactive();
                    }
                });
            }

            // 8. Restore Ore Deposits
            const restoreOreList = (savedList, targetList) => {
                if (!savedList || !Array.isArray(savedList)) return;
                savedList.forEach((oData, i) => {
                    const ore = targetList[i];
                    if (!ore) return;

                    ore.hp = oData.hp;
                    ore.isDestroyed = oData.isDestroyed;
                    ore.respawnTimer = oData.respawnTimer || 0;

                    if (ore.group) {
                        ore.group.visible = !ore.isDestroyed;
                    }
                });
            };

            restoreOreList(saveData.stoneOres, this.stoneOres);
            restoreOreList(saveData.metalOres, this.metalOres);

            this.showNotification('Game Loaded!');
            return true;
        } catch (err) {
            console.error('Load error:', err);
            this.showNotification('Load Failed!');
            return false;
        }
    }

    clearCurrentStructures() {
        for (let i = this.placedStructures.length - 1; i >= 0; i--) {
            const item = this.placedStructures[i];
            const struct = item.structure;

            if (struct && struct.group) {
                // Clear roof registry reference if applicable
                if (this.weatherManager && item.type === 'Wooden Roof' && struct.mesh) {
                    this.weatherManager.unregisterRoof(struct.mesh);
                }

                this.scene.remove(struct.group);
                
                const intIdx = this.interactables.indexOf(struct.group);
                if (intIdx !== -1) this.interactables.splice(intIdx, 1);

                if (struct.obstacleNodes) {
                    struct.obstacleNodes.forEach(node => {
                        const obsIdx = this.obstacles.indexOf(node);
                        if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1);
                        if (this.spatialGrid) this.spatialGrid.remove(node);
                    });
                } else {
                    const obsIdx = this.obstacles.indexOf(struct);
                    if (obsIdx !== -1) this.obstacles.splice(obsIdx, 1);
                    if (this.spatialGrid) this.spatialGrid.remove(struct);
                }
            }
        }
        this.placedStructures = [];
    }

    clearCurrentTraps() {
        if (!this.player || !this.player.traps) return;
        for (let i = this.player.traps.length - 1; i >= 0; i--) {
            const trap = this.player.traps[i];
            if (trap && typeof trap.destroy === 'function') {
                trap.destroy();
            }
        }
        this.player.traps.length = 0;
    }

    clearCurrentSoilsAndCrops() {
        // Remove active crop meshes & clear player crop references
        if (this.player && this.player.crops) {
            this.player.crops.forEach(crop => {
                if (crop.group) this.scene.remove(crop.group);
            });
            this.player.crops.length = 0;
        }

        // Remove tilled soil meshes & interactable references
        for (let i = this.interactables.length - 1; i >= 0; i--) {
            const item = this.interactables[i];
            let isSoil = item.userData?.type === 'tilledSoil';
            if (!isSoil && item.children) {
                for (const child of item.children) {
                    if (child.userData?.type === 'tilledSoil') {
                        isSoil = true;
                        break;
                    }
                }
            }

            if (isSoil) {
                this.scene.remove(item);
                this.interactables.splice(i, 1);
            }
        }
    }

    exportSaveFile() {
        const rawData = localStorage.getItem(this.saveKey);
        if (!rawData) {
            this.showNotification('No Save to Export!');
            return;
        }
        const blob = new Blob([rawData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wilderness_save_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Save Exported!');
    }

    importSaveFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed.version || !parsed.player) {
                    throw new Error('Invalid save structure');
                }
                localStorage.setItem(this.saveKey, e.target.result);
                this.load();
                this.showNotification('Save Imported!');
            } catch (err) {
                console.error('Import error:', err);
                this.showNotification('Invalid Save File!');
            }
        };
        reader.readAsText(file);
    }

    showNotification(message) {
        let hud = document.getElementById('save-notification');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'save-notification';
            hud.style.cssText = `
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.85);
                color: #f1c40f;
                padding: 8px 18px;
                border: 1px solid #f1c40f;
                border-radius: 6px;
                font-family: monospace;
                font-weight: bold;
                font-size: 14px;
                z-index: 100;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(hud);
        }

        hud.innerText = message;
        hud.style.opacity = '1';

        if (this.notifyTimeout) clearTimeout(this.notifyTimeout);
        this.notifyTimeout = setTimeout(() => {
            hud.style.opacity = '0';
        }, 2200);
    }
}
import * as THREE from 'three';
import { VALID_RAW_FURS } from './inventory.js';

// --- Shared Geometries & Materials ---
const stoneRingMat = new THREE.MeshPhongMaterial({ color: 0x555555, flatShading: true });
const logMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const ashMat = new THREE.MeshPhongMaterial({ color: 0x222222, flatShading: true });
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 });

const chestWoodMat = new THREE.MeshPhongMaterial({ color: 0x6e4727, flatShading: true });
const chestIronMat = new THREE.MeshPhongMaterial({ color: 0x3a3d40, flatShading: true, shininess: 80 });
const chestLatchMat = new THREE.MeshPhongMaterial({ color: 0xd4af37, flatShading: true, shininess: 100 });

// Building Materials & Grid Constants
const woodPlankMat = new THREE.MeshPhongMaterial({ color: 0x734d26, flatShading: true });
const woodBeamMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const ironHardwareMat = new THREE.MeshPhongMaterial({ color: 0x2b2b2b, flatShading: true, shininess: 80 });

const furnaceMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, flatShading: true });
const furnaceGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.9 });
const metalPlankMat = new THREE.MeshPhongMaterial({ color: 0x5a6065, flatShading: true, shininess: 80 });
const metalBeamMat = new THREE.MeshPhongMaterial({ color: 0x2c3033, flatShading: true, shininess: 100 });

export const BUILD_GRID_SIZE = 4.0;
export const WALL_HEIGHT = 3.5;

export class Furnace {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;

        this.radius = 0.9;
        this.isDestroyed = false;

        // Timed Processing Properties
        this.processTimer = 0;
        this.processDuration = 5.0; // 5 seconds per metal ingot
        this.isProcessing = false;

        // 4 Slots: [0] = Ore Input, [1] = Fuel Input, [2] = Ingot Output, [3] = Charcoal Output
        this.slots = [null, null, null, null];

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildFurnace();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        this.markActive();
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables) && !this.activeInteractables.includes(this)) {
            this.activeInteractables.push(this);
        }
    }

    buildFurnace() {
        const baseGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8);
        const base = new THREE.Mesh(baseGeo, furnaceMat);
        base.position.y = 0.6;
        this.group.add(base);

        const holeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.5);
        const hole = new THREE.Mesh(holeGeo, furnaceGlowMat);
        hole.position.set(0, 0.4, 0.45);
        this.group.add(hole);

        const chimneyGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
        const chimney = new THREE.Mesh(chimneyGeo, furnaceMat);
        chimney.position.y = 1.45;
        this.group.add(chimney);

        this.fireLight = new THREE.PointLight(0xff4500, 2.5, 12);
        this.fireLight.position.set(0, 0.4, 0.5);
        this.group.add(this.fireLight);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'furnace', furnace: this };
            }
        });
    }

    hasFuel() {
        const fuelItem = this.slots[1];
        return fuelItem && (fuelItem.name === 'Wood' || fuelItem.name === 'Stick') && fuelItem.count >= 1;
    }

    canSmeltOre() {
        const oreItem = this.slots[0];
        const outputItem = this.slots[2];

        const hasOre = oreItem && oreItem.name === 'Metal Ore' && oreItem.count >= 1;
        const hasOutputSpace = !outputItem || (outputItem.name === 'Metal Ingot');

        return hasOre && hasOutputSpace;
    }

    update(delta) {
        if (this.hasFuel()) {
            this.isProcessing = true;
            this.processTimer += delta;

            // Animate glowing furnace fire light
            if (this.fireLight) {
                this.fireLight.intensity = 2.5 + Math.sin(performance.now() * 0.01) * 0.5;
            }

            // Burn cycle completion
            if (this.processTimer >= this.processDuration) {
                this.processTimer = 0;

                // Always consume 1 fuel item per burn cycle
                this.slots[1].count--;
                if (this.slots[1].count <= 0) this.slots[1] = null;

                // Generate Charcoal byproduct in slot 3
                if (!this.slots[3]) {
                    this.slots[3] = { name: 'Charcoal', count: 1, icon: '⬛' };
                } else if (this.slots[3].name === 'Charcoal') {
                    this.slots[3].count++;
                }

                // Smelt ore if valid ore is present and output slot has space
                if (this.canSmeltOre()) {
                    // Consume 1 Metal Ore
                    this.slots[0].count--;
                    if (this.slots[0].count <= 0) this.slots[0] = null;

                    // Output 1 Metal Ingot
                    if (!this.slots[2]) {
                        this.slots[2] = { name: 'Metal Ingot', count: 1, icon: '🪙' };
                    } else if (this.slots[2].name === 'Metal Ingot') {
                        this.slots[2].count++;
                    }
                }
            }
        } else {
            this.isProcessing = false;
            this.processTimer = 0;

            // Extinguish light when out of fuel
            if (this.fireLight) {
                this.fireLight.intensity = 0.5;
            }
        }
    }
}

export class MetalFoundation {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
    }

    buildMesh() {
        const deckGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.3, BUILD_GRID_SIZE);
        const deck = new THREE.Mesh(deckGeo, metalPlankMat);
        deck.position.y = 0.15;
        this.group.add(deck);

        const postGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
        const postOffsets = [
            [-1.85, -0.15, -1.85], [1.85, -0.15, -1.85],
            [-1.85, -0.15, 1.85],  [1.85, -0.15, 1.85]
        ];
        postOffsets.forEach(pos => {
            const post = new THREE.Mesh(postGeo, metalBeamMat);
            post.position.set(...pos);
            this.group.add(post);
        });

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'foundation', structure: this };
            }
        });
    }
}

export class MetalWall {
    constructor(scene, x, y, z, rotationY = 0, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);

        if (this.obstacles) {
            this.registerObstacles(x, y, z, rotationY);
        }
    }

    registerObstacles(x, y, z, rotationY) {
        const basePos = new THREE.Vector3(x, y, z);
        const yAxis = new THREE.Vector3(0, 1, 0);
        const offsets = [-1.5, -0.75, 0, 0.75, 1.5];

        this.obstacleNodes = offsets.map(offset => {
            const localOffset = new THREE.Vector3(offset, 0, 0).applyAxisAngle(yAxis, rotationY);
            const pos = basePos.clone().add(localOffset);
            return {
                position: pos,
                group: { position: pos },
                radius: 0.75
            };
        });

        this.obstacleNodes.forEach(node => {
            this.obstacles.push(node);
            if (this.spatialGrid) {
                this.spatialGrid.insert(node);
            }
        });
    }

    buildMesh() {
        const wallGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, WALL_HEIGHT, 0.15);
        const wall = new THREE.Mesh(wallGeo, metalPlankMat);
        wall.position.y = WALL_HEIGHT / 2;
        this.group.add(wall);

        const beamGeo = new THREE.BoxGeometry(0.25, WALL_HEIGHT, 0.22);
        const leftBeam = new THREE.Mesh(beamGeo, metalBeamMat);
        leftBeam.position.set(-1.88, WALL_HEIGHT / 2, 0);
        const rightBeam = new THREE.Mesh(beamGeo, metalBeamMat);
        rightBeam.position.set(1.88, WALL_HEIGHT / 2, 0);
        this.group.add(leftBeam, rightBeam);

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'wall', structure: this };
            }
        });
    }
}

export class MetalDoor {
    constructor(scene, x, y, z, rotationY = 0, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.isOpen = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);

        if (this.obstacles) {
            this.registerObstacles(x, y, z, rotationY);
        }
    }

    registerObstacles(x, y, z, rotationY) {
        const basePos = new THREE.Vector3(x, y, z);
        const yAxis = new THREE.Vector3(0, 1, 0);

        const leftPostPos = basePos.clone().add(new THREE.Vector3(-1.85, 0, 0).applyAxisAngle(yAxis, rotationY));
        const rightPostPos = basePos.clone().add(new THREE.Vector3(1.85, 0, 0).applyAxisAngle(yAxis, rotationY));

        this.leftPostNode = { position: leftPostPos, group: { position: leftPostPos }, radius: 0.35 };
        this.rightPostNode = { position: rightPostPos, group: { position: rightPostPos }, radius: 0.35 };

        const panelOffsets = [-0.9, 0, 0.9];
        this.panelNodes = panelOffsets.map(offset => {
            const pos = basePos.clone().add(new THREE.Vector3(offset, 0, 0).applyAxisAngle(yAxis, rotationY));
            return {
                position: pos.clone(),
                closedPos: pos.clone(),
                group: { position: pos.clone() },
                radius: 0.65,
                isDestroyed: false
            };
        });

        this.obstacleNodes = [this.leftPostNode, this.rightPostNode, ...this.panelNodes];

        this.obstacleNodes.forEach(node => {
            this.obstacles.push(node);
            if (this.spatialGrid) {
                this.spatialGrid.insert(node);
            }
        });
    }

    buildMesh() {
        const topFrameGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.2, 0.2);
        const topFrame = new THREE.Mesh(topFrameGeo, metalBeamMat);
        topFrame.position.y = WALL_HEIGHT - 0.1;
        this.group.add(topFrame);

        const sideFrameGeo = new THREE.BoxGeometry(0.5, WALL_HEIGHT, 0.2);
        const leftSide = new THREE.Mesh(sideFrameGeo, metalBeamMat);
        leftSide.position.set(-1.75, WALL_HEIGHT / 2, 0);
        const rightSide = new THREE.Mesh(sideFrameGeo, metalBeamMat);
        rightSide.position.set(1.75, WALL_HEIGHT / 2, 0);
        this.group.add(leftSide, rightSide);

        this.doorPivot = new THREE.Group();
        this.doorPivot.position.set(-1.5, 0, 0);
        this.group.add(this.doorPivot);

        const doorPanelHeight = WALL_HEIGHT - 0.2;
        const doorPanelGeo = new THREE.BoxGeometry(3.0, doorPanelHeight, 0.12);
        const doorPanel = new THREE.Mesh(doorPanelGeo, metalPlankMat);
        doorPanel.position.set(1.5, doorPanelHeight / 2, 0);
        this.doorPivot.add(doorPanel);

        const handleGeo = new THREE.BoxGeometry(0.08, 0.25, 0.18);
        const handle = new THREE.Mesh(handleGeo, ironHardwareMat);
        handle.position.set(2.7, 1.1, 0);
        this.doorPivot.add(handle);

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'door', structure: this };
            }
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.doorPivot.rotation.y = this.isOpen ? Math.PI / 2 : 0;

        if (this.panelNodes) {
            this.panelNodes.forEach(node => {
                if (this.spatialGrid) {
                    this.spatialGrid.remove(node);
                }

                if (this.isOpen) {
                    node.isDestroyed = true;
                    node.position.set(0, -9999, 0);
                    node.group.position.set(0, -9999, 0);
                } else {
                    node.isDestroyed = false;
                    node.position.copy(node.closedPos);
                    node.group.position.copy(node.closedPos);
                    if (this.spatialGrid) {
                        this.spatialGrid.insert(node);
                    }
                }
            });
        }
    }
}

export class Campfire {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;

        this.radius = 0.8;
        this.isDestroyed = false;
        this.animTime = Math.random() * 100;

        // Timed Processing Properties
        this.processTimer = 0;
        this.processDuration = 5.0; // 5 seconds per cooked meat
        this.isProcessing = false;

        // 4 Slots: [0] = Food Input, [1] = Fuel Input, [2] = Cooked Output, [3] = Charcoal Output
        this.slots = [null, null, null, null];

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildCampfire();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        this.markActive();
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables) && !this.activeInteractables.includes(this)) {
            this.activeInteractables.push(this);
        }
    }

    buildCampfire() {
        const ashGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.05, 8);
        const ash = new THREE.Mesh(ashGeo, ashMat);
        ash.position.y = 0.025;
        this.group.add(ash);

        const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0);
        const stoneCount = 10;
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const stone = new THREE.Mesh(stoneGeo, stoneRingMat);
            stone.position.set(Math.cos(angle) * 0.65, 0.1, Math.sin(angle) * 0.65);
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            this.group.add(stone);
        }

        const logGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6);
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const log = new THREE.Mesh(logGeo, logMat);
            log.position.set(Math.cos(angle) * 0.25, 0.25, Math.sin(angle) * 0.25);
            log.rotation.y = angle;
            log.rotation.z = 0.4;
            this.group.add(log);
        }

        // Flames & light are hidden by default until fuel starts burning
        const flameGeo = new THREE.ConeGeometry(0.28, 0.65, 5);
        this.outerFlame = new THREE.Mesh(flameGeo, flameMat);
        this.outerFlame.position.y = 0.45;
        this.outerFlame.visible = false;
        this.group.add(this.outerFlame);

        const innerFlameGeo = new THREE.ConeGeometry(0.16, 0.45, 5);
        this.innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        this.innerFlame.position.y = 0.4;
        this.innerFlame.visible = false;
        this.group.add(this.innerFlame);

        this.fireLight = new THREE.PointLight(0xffaa33, 0, 18);
        this.fireLight.position.y = 0.6;
        this.fireLight.visible = false;
        this.group.add(this.fireLight);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'campfire', campfire: this };
            }
        });
    }

    hasFuel() {
        const fuelItem = this.slots[1];
        return fuelItem && (fuelItem.name === 'Wood' || fuelItem.name === 'Stick') && fuelItem.count >= 1;
    }

    canCookFood() {
        const inputItem = this.slots[0];
        const outputItem = this.slots[2];
        if (!inputItem || inputItem.count < 1) return false;

        if (inputItem.name === 'Raw Meat') {
            return !outputItem || outputItem.name === 'Cooked Meat';
        }

        if (inputItem.name === 'Raw Fish') {
            return !outputItem || outputItem.name === 'Cooked Fish';
        }

        if (inputItem.name === 'Leather Canteen (Dirty Water)') {
            return !outputItem || outputItem.name === 'Leather Canteen (Clean Water)';
        }

        return false;
    }

    update(delta) {
        if (this.hasFuel()) {
            this.isProcessing = true;
            this.processTimer += delta;

            // Turn on flames and point light
            if (this.outerFlame) this.outerFlame.visible = true;
            if (this.innerFlame) this.innerFlame.visible = true;
            if (this.fireLight) this.fireLight.visible = true;

            // Flame scaling and light flicker animations
            this.animTime += delta * 8;
            const scaleY = 1.0 + Math.sin(this.animTime * 2.5) * 0.18 + Math.cos(this.animTime * 4.1) * 0.12;
            const scaleXZ = 1.0 + Math.cos(this.animTime * 3.1) * 0.15;
            
            if (this.outerFlame) {
                this.outerFlame.scale.set(scaleXZ, scaleY, scaleXZ);
                this.outerFlame.rotation.y += delta * 1.5;
            }

            if (this.innerFlame) {
                this.innerFlame.scale.set(scaleXZ * 0.9, scaleY * 1.1, scaleXZ * 0.9);
                this.innerFlame.rotation.y -= delta * 2.0;
            }

            if (this.fireLight) {
                this.fireLight.intensity = 3.2 + Math.sin(this.animTime * 3.5) * 0.8;
            }

            // Burn cycle completion
            if (this.processTimer >= this.processDuration) {
                this.processTimer = 0;

                // Always consume 1 fuel item per burn cycle
                this.slots[1].count--;
                if (this.slots[1].count <= 0) this.slots[1] = null;

                // Generate Charcoal byproduct in slot 3
                if (!this.slots[3]) {
                    this.slots[3] = { name: 'Charcoal', count: 1, icon: '⬛' };
                } else if (this.slots[3].name === 'Charcoal') {
                    this.slots[3].count++;
                }

                // Cook food if a valid recipe item is loaded
                if (this.canCookFood()) {
                    const inputItem = this.slots[0];
                    let outputName = '';
                    let outputIcon = '';

                    if (inputItem.name === 'Raw Meat') {
                        outputName = 'Cooked Meat';
                        outputIcon = '🍖';
                    } else if (inputItem.name === 'Raw Fish') {
                        outputName = 'Cooked Fish';
                        outputIcon = '🐟';
                    } else if (inputItem.name === 'Leather Canteen (Dirty Water)') {
                        outputName = 'Leather Canteen (Clean Water)';
                        outputIcon = '💧';
                    }

                    // Consume 1 food item
                    this.slots[0].count--;
                    if (this.slots[0].count <= 0) this.slots[0] = null;

                    // Output finished item
                    if (!this.slots[2]) {
                        this.slots[2] = { name: outputName, count: 1, icon: outputIcon };
                    } else if (this.slots[2].name === outputName) {
                        this.slots[2].count++;
                    }
                }
            }
        } else {
            this.isProcessing = false;
            this.processTimer = 0;

            // Hide flames and extinguish light when out of fuel
            if (this.outerFlame) this.outerFlame.visible = false;
            if (this.innerFlame) this.innerFlame.visible = false;
            if (this.fireLight) {
                this.fireLight.visible = false;
                this.fireLight.intensity = 0;
            }
        }
    }
}

export class StorageChest {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;

        this.radius = 0.9;
        this.isDestroyed = false;
        
        // 16 Storage Slots
        this.slots = Array(16).fill(null);

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildChest();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
    }

    buildChest() {
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
        const body = new THREE.Mesh(bodyGeo, chestWoodMat);
        body.position.y = 0.35;
        this.group.add(body);

        const bandGeoHorizontal = new THREE.BoxGeometry(1.22, 0.08, 0.82);
        const bandTop = new THREE.Mesh(bandGeoHorizontal, chestIronMat);
        bandTop.position.y = 0.62;
        const bandBottom = new THREE.Mesh(bandGeoHorizontal, chestIronMat);
        bandBottom.position.y = 0.08;
        this.group.add(bandTop, bandBottom);

        const lidGeo = new THREE.BoxGeometry(1.24, 0.22, 0.84);
        const lid = new THREE.Mesh(lidGeo, chestWoodMat);
        lid.position.set(0, 0.81, 0);
        this.group.add(lid);

        const latchGeo = new THREE.BoxGeometry(0.16, 0.18, 0.08);
        const latch = new THREE.Mesh(latchGeo, chestLatchMat);
        latch.position.set(0, 0.65, 0.43);
        this.group.add(latch);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'storageChest',
                    chest: this
                };
            }
        });
    }

    update(delta) {
    }
}

export class WoodenFoundation {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
    }

    buildMesh() {
        const deckGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.3, BUILD_GRID_SIZE);
        const deck = new THREE.Mesh(deckGeo, woodPlankMat);
        deck.position.y = 0.15;
        this.group.add(deck);

        const postGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
        const postOffsets = [
            [-1.85, -0.15, -1.85], [1.85, -0.15, -1.85],
            [-1.85, -0.15, 1.85],  [1.85, -0.15, 1.85]
        ];
        postOffsets.forEach(pos => {
            const post = new THREE.Mesh(postGeo, woodBeamMat);
            post.position.set(...pos);
            this.group.add(post);
        });

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'foundation', structure: this };
            }
        });
    }
}

export class WoodenWall {
    constructor(scene, x, y, z, rotationY = 0, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);

        if (this.obstacles) {
            this.registerObstacles(x, y, z, rotationY);
        }
    }

    registerObstacles(x, y, z, rotationY) {
        const basePos = new THREE.Vector3(x, y, z);
        const yAxis = new THREE.Vector3(0, 1, 0);
        const offsets = [-1.5, -0.75, 0, 0.75, 1.5];

        this.obstacleNodes = offsets.map(offset => {
            const localOffset = new THREE.Vector3(offset, 0, 0).applyAxisAngle(yAxis, rotationY);
            const pos = basePos.clone().add(localOffset);
            return {
                position: pos,
                group: { position: pos },
                radius: 0.75
            };
        });

        this.obstacleNodes.forEach(node => {
            this.obstacles.push(node);
            if (this.spatialGrid) {
                this.spatialGrid.insert(node);
            }
        });
    }

    buildMesh() {
        const wallGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, WALL_HEIGHT, 0.15);
        const wall = new THREE.Mesh(wallGeo, woodPlankMat);
        wall.position.y = WALL_HEIGHT / 2;
        this.group.add(wall);

        const beamGeo = new THREE.BoxGeometry(0.25, WALL_HEIGHT, 0.22);
        const leftBeam = new THREE.Mesh(beamGeo, woodBeamMat);
        leftBeam.position.set(-1.88, WALL_HEIGHT / 2, 0);
        const rightBeam = new THREE.Mesh(beamGeo, woodBeamMat);
        rightBeam.position.set(1.88, WALL_HEIGHT / 2, 0);
        this.group.add(leftBeam, rightBeam);

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'wall', structure: this };
            }
        });
    }
}

export class WoodenDoor {
    constructor(scene, x, y, z, rotationY = 0, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.isOpen = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);

        if (this.obstacles) {
            this.registerObstacles(x, y, z, rotationY);
        }
    }

    registerObstacles(x, y, z, rotationY) {
        const basePos = new THREE.Vector3(x, y, z);
        const yAxis = new THREE.Vector3(0, 1, 0);

        const leftPostPos = basePos.clone().add(new THREE.Vector3(-1.85, 0, 0).applyAxisAngle(yAxis, rotationY));
        const rightPostPos = basePos.clone().add(new THREE.Vector3(1.85, 0, 0).applyAxisAngle(yAxis, rotationY));

        this.leftPostNode = { position: leftPostPos, group: { position: leftPostPos }, radius: 0.35 };
        this.rightPostNode = { position: rightPostPos, group: { position: rightPostPos }, radius: 0.35 };

        const panelOffsets = [-0.9, 0, 0.9];
        this.panelNodes = panelOffsets.map(offset => {
            const pos = basePos.clone().add(new THREE.Vector3(offset, 0, 0).applyAxisAngle(yAxis, rotationY));
            return {
                position: pos.clone(),
                closedPos: pos.clone(),
                group: { position: pos.clone() },
                radius: 0.65,
                isDestroyed: false
            };
        });

        this.obstacleNodes = [this.leftPostNode, this.rightPostNode, ...this.panelNodes];

        this.obstacleNodes.forEach(node => {
            this.obstacles.push(node);
            if (this.spatialGrid) {
                this.spatialGrid.insert(node);
            }
        });
    }

    buildMesh() {
        const topFrameGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.2, 0.2);
        const topFrame = new THREE.Mesh(topFrameGeo, woodBeamMat);
        topFrame.position.y = WALL_HEIGHT - 0.1;
        this.group.add(topFrame);

        const sideFrameGeo = new THREE.BoxGeometry(0.5, WALL_HEIGHT, 0.2);
        const leftSide = new THREE.Mesh(sideFrameGeo, woodBeamMat);
        leftSide.position.set(-1.75, WALL_HEIGHT / 2, 0);
        const rightSide = new THREE.Mesh(sideFrameGeo, woodBeamMat);
        rightSide.position.set(1.75, WALL_HEIGHT / 2, 0);
        this.group.add(leftSide, rightSide);

        this.doorPivot = new THREE.Group();
        this.doorPivot.position.set(-1.5, 0, 0);
        this.group.add(this.doorPivot);

        const doorPanelHeight = WALL_HEIGHT - 0.2;
        const doorPanelGeo = new THREE.BoxGeometry(3.0, doorPanelHeight, 0.12);
        const doorPanel = new THREE.Mesh(doorPanelGeo, woodPlankMat);
        doorPanel.position.set(1.5, doorPanelHeight / 2, 0);
        this.doorPivot.add(doorPanel);

        const handleGeo = new THREE.BoxGeometry(0.08, 0.25, 0.18);
        const handle = new THREE.Mesh(handleGeo, ironHardwareMat);
        handle.position.set(2.7, 1.1, 0);
        this.doorPivot.add(handle);

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'door', structure: this };
            }
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.doorPivot.rotation.y = this.isOpen ? Math.PI / 2 : 0;

        if (this.panelNodes) {
            this.panelNodes.forEach(node => {
                if (this.spatialGrid) {
                    this.spatialGrid.remove(node);
                }

                if (this.isOpen) {
                    node.isDestroyed = true;
                    node.position.set(0, -9999, 0);
                    node.group.position.set(0, -9999, 0);
                } else {
                    node.isDestroyed = false;
                    node.position.copy(node.closedPos);
                    node.group.position.copy(node.closedPos);
                    if (this.spatialGrid) {
                        this.spatialGrid.insert(node);
                    }
                }
            });
        }
    }
}

export class WoodenRoof {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.weatherManager = context.weatherManager;

        this.isRoof = true;
        this.isDestroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.userData = { type: 'building', buildingType: 'roof', structure: this };
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);

        // Register roof with WeatherManager for fast O(1) shelter checks
        if (this.weatherManager) {
            this.weatherManager.registerRoof(this.group);
        }
    }

    buildMesh() {
        const roofGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.15, BUILD_GRID_SIZE);
        const roof = new THREE.Mesh(roofGeo, woodPlankMat);
        roof.position.y = 0.075;
        this.group.add(roof);

        const beamGeo = new THREE.BoxGeometry(0.2, 0.2, BUILD_GRID_SIZE);
        const beam1 = new THREE.Mesh(beamGeo, woodBeamMat);
        beam1.position.set(-1.9, -0.05, 0);
        const beam2 = new THREE.Mesh(beamGeo, woodBeamMat);
        beam2.position.set(1.9, -0.05, 0);
        this.group.add(beam1, beam2);

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'building', buildingType: 'roof', structure: this };
            }
        });
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this.scene) {
            this.scene.remove(this.group);
        }

        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }

        // Unregister from WeatherManager upon destruction
        if (this.weatherManager) {
            this.weatherManager.unregisterRoof(this.group);
        }
    }
    
}

// ==========================================
// SAWMILL, STONE CRUSHER & FUR STAND
// ==========================================

const sawmillWoodMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
const sawmillSteelMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, flatShading: true, shininess: 90 });
const stoneCrusherMat = new THREE.MeshPhongMaterial({ color: 0x34495e, flatShading: true });
const furRackWoodMat = new THREE.MeshPhongMaterial({ color: 0x6e4727, flatShading: true });
const furMat = new THREE.MeshPhongMaterial({ color: 0xa0826c, flatShading: true });

export class Sawmill {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;

        this.radius = 1.2;
        this.isDestroyed = false;
        this.processTimer = 0;
        this.processDuration = 4.0; // 4 seconds per batch
        this.isProcessing = false;

        // 2 Slots: [0] = Input (Wood Log), [1] = Output (Planks)
        this.slots = [null, null];

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        this.markActive();
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables) && !this.activeInteractables.includes(this)) {
            this.activeInteractables.push(this);
        }
    }

    buildMesh() {
        // Table Base
        const tableGeo = new THREE.BoxGeometry(2.0, 0.2, 1.2);
        const table = new THREE.Mesh(tableGeo, sawmillWoodMat);
        table.position.y = 0.8;
        this.group.add(table);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.8, 0.15);
        const legPositions = [[-0.85, 0.4, -0.45], [0.85, 0.4, -0.45], [-0.85, 0.4, 0.45], [0.85, 0.4, 0.45]];
        legPositions.forEach(p => {
            const leg = new THREE.Mesh(legGeo, sawmillWoodMat);
            leg.position.set(...p);
            this.group.add(leg);
        });

        // Circular Saw Blade
        const bladeGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 16);
        this.sawBlade = new THREE.Mesh(bladeGeo, sawmillSteelMat);
        this.sawBlade.rotation.z = Math.PI / 2;
        this.sawBlade.position.set(0, 1.05, 0);
        this.group.add(this.sawBlade);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'sawmill', sawmill: this };
        });
    }

    canProcess() {
        const input = this.slots[0];
        const output = this.slots[1];
        const hasWood = input && (input.name === 'Wood' || input.name === 'Log') && input.count >= 1;
        const hasOutputSpace = !output || (output.name === 'Planks');
        return hasWood && hasOutputSpace;
    }

    update(delta) {
        if (this.canProcess()) {
            this.isProcessing = true;
            this.processTimer += delta;

            // Spin Saw Blade animation
            if (this.sawBlade) this.sawBlade.rotation.x += delta * 18.0;

            if (this.processTimer >= this.processDuration) {
                this.processTimer = 0;

                // Consume 1 Wood -> Output 2 Planks
                this.slots[0].count--;
                if (this.slots[0].count <= 0) this.slots[0] = null;

                if (!this.slots[1]) {
                    this.slots[1] = { name: 'Planks', count: 2, icon: '🪵' };
                } else {
                    this.slots[1].count += 2;
                }
            }
        } else {
            this.isProcessing = false;
            if (!this.slots[0]) this.processTimer = 0;
        }
    }
}

export class StoneCrusher {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;

        this.radius = 1.1;
        this.isDestroyed = false;
        this.processTimer = 0;
        this.processDuration = 4.0;
        this.isProcessing = false;

        // 2 Slots: [0] = Input (Stone Ore / Stone), [1] = Output (Gravel)
        this.slots = [null, null];

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        this.markActive();
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables) && !this.activeInteractables.includes(this)) {
            this.activeInteractables.push(this);
        }
    }

    buildMesh() {
        // Crusher Funnel Hopper
        const hopperGeo = new THREE.ConeGeometry(0.8, 0.9, 6);
        const hopper = new THREE.Mesh(hopperGeo, stoneCrusherMat);
        hopper.rotation.x = Math.PI;
        hopper.position.y = 1.1;
        this.group.add(hopper);

        // Crusher Base Stand
        const baseGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
        const base = new THREE.Mesh(baseGeo, stoneCrusherMat);
        base.position.y = 0.3;
        this.group.add(base);

        // Pounding Hammer Weight
        const hammerGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        this.hammer = new THREE.Mesh(hammerGeo, sawmillSteelMat);
        this.hammer.position.set(0, 0.9, 0);
        this.group.add(this.hammer);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'stoneCrusher', stoneCrusher: this };
        });
    }

    canProcess() {
        const input = this.slots[0];
        const output = this.slots[1];
        const hasStone = input && (input.name === 'Stone' || input.name === 'Stone') && input.count >= 1;
        const hasOutputSpace = !output || (output.name === 'Gravel');
        return hasStone && hasOutputSpace;
    }

    update(delta) {
        if (this.canProcess()) {
            this.isProcessing = true;
            this.processTimer += delta;

            // Reciprocating Hammer Animation
            if (this.hammer) {
                this.hammer.position.y = 0.9 + Math.abs(Math.sin(performance.now() * 0.015)) * 0.25;
            }

            if (this.processTimer >= this.processDuration) {
                this.processTimer = 0;

                // Consume 1 Stone Ore / Stone -> Output 2 Gravel
                this.slots[0].count--;
                if (this.slots[0].count <= 0) this.slots[0] = null;

                if (!this.slots[1]) {
                    this.slots[1] = { name: 'Gravel', count: 2, icon: '⏳' };
                } else {
                    this.slots[1].count += 2;
                }
            }
        } else {
            this.isProcessing = false;
            if (!this.slots[0]) this.processTimer = 0;
        }
    }
}

const shelterWoodMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const shelterThatchMat = new THREE.MeshPhongMaterial({ color: 0x8a7343, flatShading: true });

export class AFrameShelter {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.weatherManager = context.weatherManager;
        this.player = context.player;

        this.radius = 1.4;
        this.isDestroyed = false;
        this.isRoof = true;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        // Register with WeatherManager so standing inside protects from rain/snow
        if (this.weatherManager) {
            this.weatherManager.registerRoof(this.group);
        }
    }

    buildMesh() {
        const height = 2.4;
        const width = 2.6;
        const depth = 3.0;

        // Ridge Beam
        const ridgeGeo = new THREE.CylinderGeometry(0.08, 0.08, depth + 0.4, 6);
        const ridge = new THREE.Mesh(ridgeGeo, shelterWoodMat);
        ridge.rotation.x = Math.PI / 2;
        ridge.position.set(0, height, 0);
        this.group.add(ridge);

        // Sloped Thatch Roofs
        const slopeLen = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height, 2));
        const angle = Math.atan2(width / 2, height);
        const roofGeo = new THREE.BoxGeometry(slopeLen, 0.08, depth);

        const leftRoof = new THREE.Mesh(roofGeo, shelterThatchMat);
        leftRoof.position.set(-width / 4, height / 2, 0);
        leftRoof.rotation.z = angle;
        this.group.add(leftRoof);

        const rightRoof = new THREE.Mesh(roofGeo, shelterThatchMat);
        rightRoof.position.set(width / 4, height / 2, 0);
        rightRoof.rotation.z = -angle;
        this.group.add(rightRoof);

        // Wooden Frame Beams
        const frameLogGeo = new THREE.CylinderGeometry(0.06, 0.07, slopeLen + 0.2, 6);
        [
            [-width / 4, height / 2, depth / 2, angle],
            [width / 4, height / 2, depth / 2, -angle],
            [-width / 4, height / 2, -depth / 2, angle],
            [width / 4, height / 2, -depth / 2, -angle]
        ].forEach(([px, py, pz, rotZ]) => {
            const log = new THREE.Mesh(frameLogGeo, shelterWoodMat);
            log.position.set(px, py, pz);
            log.rotation.z = rotZ;
            this.group.add(log);
        });

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { 
                    type: 'aFrameShelter', 
                    shelter: this, 
                    buildingType: 'roof', 
                    structure: this 
                };
            }
        });
    }

    // Calculates position inside the shelter center at eye level
    getInteriorPosition(eyeHeight = 0.7) {
        const pos = this.group.position.clone();
        pos.y += eyeHeight;
        return pos;
    }

    // Calculates exit position directly outside front entrance (+Z direction)
    getExteriorPosition(eyeHeight = 1.6) {
        const exitOffset = new THREE.Vector3(0, 0, 2.2).applyQuaternion(this.group.quaternion);
        const pos = this.group.position.clone().add(exitOffset);
        pos.y += eyeHeight;
        return pos;
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        if (this.scene) this.scene.remove(this.group);
        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }
        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
        if (this.weatherManager) {
            this.weatherManager.unregisterRoof(this.group);
        }
    }
}


const eggMat = new THREE.MeshPhongMaterial({ color: 0xf5f5dc, flatShading: true });

export class FurProcessingStand {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;
        this.inventory = context.inventory; // Stored inventory context for UI auto-refresh

        this.radius = 1.0;
        this.isDestroyed = false;
        this.processTimer = 0;
        this.processDuration = 5.0; // 5 seconds per pelt
        this.isProcessing = false;

        // 2 Slots: [0] = Raw Fur Input, [1] = Finished Pelt Output
        this.slots = [null, null];

        // Animal Fur to Finished Pelt Translation Map
        this.peltMap = {
            'Rabbit Fur': { name: 'Rabbit Pelt', icon: '🐰' },
            'Deer Fur': { name: 'Deer Pelt', icon: '🦌' },
            'Wolf Fur': { name: 'Wolf Pelt', icon: '🐺' },
            'Bear Fur': { name: 'Bear Pelt', icon: '🐻' },
            'Grizzly Fur': { name: 'Grizzly Pelt', icon: '🐻' },
            'Moose Fur': { name: 'Moose Pelt', icon: '🫎' },
            'Fur': { name: 'Finished Pelt', icon: '🏷️' }
        };

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        this.markActive();
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables) && !this.activeInteractables.includes(this)) {
            this.activeInteractables.push(this);
        }
    }

    buildMesh() {
        // Wooden A-Frame Rack
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6);
        const leftPole = new THREE.Mesh(poleGeo, furRackWoodMat);
        leftPole.position.set(-0.8, 0.9, 0);
        const rightPole = new THREE.Mesh(poleGeo, furRackWoodMat);
        rightPole.position.set(0.8, 0.9, 0);

        const crossGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6);
        const crossTop = new THREE.Mesh(crossGeo, furRackWoodMat);
        crossTop.rotation.z = Math.PI / 2;
        crossTop.position.set(0, 1.6, 0);

        const crossBottom = new THREE.Mesh(crossGeo, furRackWoodMat);
        crossBottom.rotation.z = Math.PI / 2;
        crossBottom.position.set(0, 0.4, 0);

        this.group.add(leftPole, rightPole, crossTop, crossBottom);

        // Stretched Hide Mesh
        const hideGeo = new THREE.BoxGeometry(1.1, 1.0, 0.04);
        this.stretchedHide = new THREE.Mesh(hideGeo, furMat);
        this.stretchedHide.position.set(0, 1.0, 0);
        this.stretchedHide.visible = false;
        this.group.add(this.stretchedHide);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'furStand', furStand: this };
        });
    }

    // Inside class FurProcessingStand in structures.js

getExpectedPelt(furItem) {
    if (!furItem) return null;
    return this.peltMap[furItem.name] || { name: 'Finished Pelt', icon: '🏷️' };
}

canProcess() {
    const input = this.slots[0];
    const output = this.slots[1];
    
    if (!input || input.count < 1) return false;
    if (!VALID_RAW_FURS.includes(input.name)) return false;

    const expectedPelt = this.getExpectedPelt(input);
    if (!expectedPelt) return false;

    // Must be empty or contain the exact matching pelt type
    return !output || (output.name === expectedPelt.name);
}

// Inside FurProcessingStand in structures.js
update(delta) {
    if (this.canProcess()) {
        this.isProcessing = true;
        this.processTimer += delta;

        if (this.stretchedHide) this.stretchedHide.visible = true;

        if (this.processTimer >= this.processDuration) {
            this.processTimer = 0;

            const input = this.slots[0];
            const expectedPelt = this.getExpectedPelt(input);

            // Deduct input fur
            input.count--;
            if (input.count <= 0) this.slots[0] = null;

            // Add expected pelt to output slot
            if (!this.slots[1]) {
                this.slots[1] = { name: expectedPelt.name, count: 1, icon: expectedPelt.icon };
            } else if (this.slots[1].name === expectedPelt.name) {
                this.slots[1].count++;
            }

            // REFRESH UI INSTANTLY
            if (this.inventory && this.inventory.activeFurStand === this) {
                this.inventory.renderFurStand();
                this.inventory.renderCrafting();
            }
        }
    } else {
        const wasProcessing = this.isProcessing;
        this.isProcessing = false;
        if (this.stretchedHide) this.stretchedHide.visible = false;
        if (!this.slots[0]) this.processTimer = 0;

        // Refresh UI if it just stopped processing (e.g. input ran out)
        if (wasProcessing && this.inventory && this.inventory.activeFurStand === this) {
            this.inventory.renderFurStand();
        }
    }
}
}

// Add to structures.js
const marketWoodMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
const marketClothMat = new THREE.MeshPhongMaterial({ color: 0xc0392b, flatShading: true });

export class MarketStand {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.marketUI = context.marketUI;

        this.radius = 1.2;
        this.isDestroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
    }

    buildMesh() {
        const tableGeo = new THREE.BoxGeometry(2.2, 0.9, 1.2);
        const table = new THREE.Mesh(tableGeo, marketWoodMat);
        table.position.y = 0.45;
        this.group.add(table);

        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6);
        const p1 = new THREE.Mesh(poleGeo, marketWoodMat); p1.position.set(-1.0, 1.1, -0.5);
        const p2 = new THREE.Mesh(poleGeo, marketWoodMat); p2.position.set(1.0, 1.1, -0.5);
        const p3 = new THREE.Mesh(poleGeo, marketWoodMat); p3.position.set(-1.0, 1.1, 0.5);
        const p4 = new THREE.Mesh(poleGeo, marketWoodMat); p4.position.set(1.0, 1.1, 0.5);
        this.group.add(p1, p2, p3, p4);

        const canopyGeo = new THREE.BoxGeometry(2.4, 0.15, 1.4);
        const canopy = new THREE.Mesh(canopyGeo, marketClothMat);
        canopy.position.y = 2.2;
        this.group.add(canopy);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'marketStand', marketStand: this };
            }
        });
    }

    interact() {
        if (this.marketUI) {
            this.marketUI.open();
        }
    }

    
}
// --- BEDROLL STRUCTURE ---
const bedrollMat = new THREE.MeshPhongMaterial({ color: 0x7c522b, flatShading: true });
const pillowMat = new THREE.MeshPhongMaterial({ color: 0xdcdde1, flatShading: true });

export class Bedroll {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.player = context.player;

        this.radius = 0.8;
        this.isDestroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        // Automatically set player respawn point upon placement
        if (this.player && typeof this.player.setSpawnPoint === 'function') {
            this.player.setSpawnPoint(this);
        }
    }

    buildMesh() {
        // Mattress Mat
        const matGeo = new THREE.BoxGeometry(1.2, 0.14, 2.0);
        const matMesh = new THREE.Mesh(matGeo, bedrollMat);
        matMesh.position.y = 0.07;
        this.group.add(matMesh);

        // Pillow
        const pillowGeo = new THREE.BoxGeometry(1.0, 0.16, 0.45);
        const pillowMesh = new THREE.Mesh(pillowGeo, pillowMat);
        pillowMesh.position.set(0, 0.15, -0.7);
        this.group.add(pillowMesh);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'bedroll', bedroll: this };
            }
        });
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this.scene) this.scene.remove(this.group);

        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }
        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
    }
}
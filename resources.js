import * as THREE from 'three';

// --- Shared Tree & Log Geometries & Materials ---
const oakTrunkMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const oakLeafMat = new THREE.MeshPhongMaterial({ color: 0x2d6a4f, flatShading: true });

const pineTrunkMat = new THREE.MeshPhongMaterial({ color: 0x3d2314, flatShading: true });
const pineLeafMat = new THREE.MeshPhongMaterial({ color: 0x1b4332, flatShading: true });

const birchTrunkMat = new THREE.MeshPhongMaterial({ color: 0xd8d4cb, flatShading: true });
const birchLeafMat = new THREE.MeshPhongMaterial({ color: 0x52b788, flatShading: true });

const stumpMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
const stumpTopMat = new THREE.MeshPhongMaterial({ color: 0x8a6343, flatShading: true });

const logMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
const logEndMat = new THREE.MeshPhongMaterial({ color: 0x8a6343, flatShading: true });

const leafClusterGeo = new THREE.DodecahedronGeometry(1, 1);
const coneGeo = new THREE.ConeGeometry(1, 1, 6);
const trunkGeo = new THREE.CylinderGeometry(1, 1.2, 1, 8);
const logGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.0, 7);

export class WoodDrop {
    constructor(scene, x, y, z, count = 1, interactables = []) {
        this.scene = scene;
        this.count = count;
        this.interactables = interactables;
        this.isHarvested = false;

        this.group = new THREE.Group();
        // Scatter slightly on spawn
        const offsetX = (Math.random() - 0.5) * 1.8;
        const offsetZ = (Math.random() - 0.5) * 1.8;
        this.group.position.set(x + offsetX, y + 0.2, z + offsetZ);

        // Build log mesh
        const logMesh = new THREE.Mesh(logGeo, [logMat, logEndMat, logMat]);
        logMesh.rotation.z = Math.PI / 2;
        logMesh.rotation.y = Math.random() * Math.PI;
        this.group.add(logMesh);

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'woodDrop',
                    woodDrop: this
                };
            }
        });

        this.scene.add(this.group);
        if (this.interactables) {
            this.interactables.push(this.group);
        }
    }

    collect(inventory) {
        if (this.isHarvested) return;
        this.isHarvested = true;

        inventory.addItem('Wood', this.count, '🪵');

        // Clean up mesh and interactables list
        this.scene.remove(this.group);
        const idx = this.interactables.indexOf(this.group);
        if (idx !== -1) {
            this.interactables.splice(idx, 1);
        }
    }
}

export class Tree {
    constructor(scene, x, y, z, variety = 'oak', stage = 3, interactables = [], obstacles = [], activeTrees = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.z = z;
        this.variety = variety;
        this.stage = stage;
        this.interactables = interactables;
        this.obstacles = obstacles;
        this.activeTrees = activeTrees;

        this.isStump = false;
        this.isFelling = false;
        this.isDestroyed = false;
        this.fallAngle = 0;
        this.fallDirection = new THREE.Vector3(1, 0, 0);

        this.regrowTimer = 0;
        this.regrowDuration = 40;
        this.growthTimer = 0;
        this.growthDuration = 60;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.initStats();
        this.buildTree();
        this.scene.add(this.group);

        // Register obstacle collision
        this.obstacles.push(this);

        // Register active tree status if tree is growing, a stump, or falling
        if (this.stage < 3 || this.isStump || this.isFelling) {
            this.markActive();
        }
    }

    markActive() {
        if (!this.activeTrees) return;
        if (this.activeTrees instanceof Set) {
            this.activeTrees.add(this);
        } else if (Array.isArray(this.activeTrees)) {
            if (!this.activeTrees.includes(this)) {
                this.activeTrees.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeTrees) return;
        if (this.activeTrees instanceof Set) {
            this.activeTrees.delete(this);
        } else if (Array.isArray(this.activeTrees)) {
            const idx = this.activeTrees.indexOf(this);
            if (idx !== -1) {
                this.activeTrees.splice(idx, 1);
            }
        }
    }

    initStats() {
        if (this.isStump) {
            this.health = 20;
            this.maxHealth = 20;
            this.radius = 0.9;
            return;
        }

        switch (this.stage) {
            case 1:
                this.maxHealth = 30;
                this.woodDropRange = [1, 2];
                this.radius = 0.6;
                break;
            case 2:
                this.maxHealth = 60;
                this.woodDropRange = [3, 5];
                this.radius = 1.1;
                break;
            case 3:
            default:
                this.maxHealth = 100;
                this.woodDropRange = [6, 10];
                this.radius = 1.6;
                break;
        }
        this.health = this.maxHealth;
    }

    buildTree() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        if (this.isStump) {
            this.buildStumpMesh();
            return;
        }

        // Scaled up tree multipliers (Stage 1: 0.8x, Stage 2: 1.6x, Stage 3: 2.8x)
        const scale = this.stage === 1 ? 0.8 : this.stage === 2 ? 1.6 : 2.8;

        switch (this.variety) {
            case 'pine':
                this.buildPineMesh(scale);
                break;
            case 'birch':
                this.buildBirchMesh(scale);
                break;
            case 'oak':
            default:
                this.buildOakMesh(scale);
                break;
        }

        this.tagMeshes();
    }

    buildOakMesh(scale) {
        const trunkHeight = 5.5 * scale;
        const trunkRadius = 0.5 * scale;

        const trunk = new THREE.Mesh(trunkGeo, oakTrunkMat);
        trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
        trunk.position.y = trunkHeight / 2;
        this.group.add(trunk);

        const leafClusters = [
            { pos: new THREE.Vector3(0, trunkHeight + 0.8 * scale, 0), r: 2.2 * scale },
            { pos: new THREE.Vector3(1.1 * scale, trunkHeight - 0.2 * scale, 0.8 * scale), r: 1.6 * scale },
            { pos: new THREE.Vector3(-1.1 * scale, trunkHeight - 0.1 * scale, -0.7 * scale), r: 1.7 * scale },
            { pos: new THREE.Vector3(0.7 * scale, trunkHeight + 1.2 * scale, -0.8 * scale), r: 1.5 * scale }
        ];

        leafClusters.forEach(c => {
            const leaves = new THREE.Mesh(leafClusterGeo, oakLeafMat);
            leaves.position.copy(c.pos);
            leaves.scale.set(c.r, c.r, c.r);
            this.group.add(leaves);
        });
    }

    buildPineMesh(scale) {
        const trunkHeight = 7.0 * scale;
        const trunkRadius = 0.4 * scale;

        const trunk = new THREE.Mesh(trunkGeo, pineTrunkMat);
        trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
        trunk.position.y = trunkHeight / 2;
        this.group.add(trunk);

        const layers = 4;
        for (let i = 0; i < layers; i++) {
            const cone = new THREE.Mesh(coneGeo, pineLeafMat);
            const layerScale = (2.8 - i * 0.6) * scale;
            cone.scale.set(layerScale, 2.5 * scale, layerScale);
            cone.position.y = trunkHeight - (i * 1.3 * scale) + 1.2 * scale;
            this.group.add(cone);
        }
    }

    buildBirchMesh(scale) {
        const trunkHeight = 6.0 * scale;
        const trunkRadius = 0.35 * scale;

        const trunk = new THREE.Mesh(trunkGeo, birchTrunkMat);
        trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
        trunk.position.y = trunkHeight / 2;
        this.group.add(trunk);

        const leafClusters = [
            { pos: new THREE.Vector3(0, trunkHeight + 0.8 * scale, 0), r: 1.9 * scale },
            { pos: new THREE.Vector3(0.8 * scale, trunkHeight + 0.1 * scale, 0.5 * scale), r: 1.4 * scale },
            { pos: new THREE.Vector3(-0.8 * scale, trunkHeight + 0.3 * scale, -0.5 * scale), r: 1.5 * scale }
        ];

        leafClusters.forEach(c => {
            const leaves = new THREE.Mesh(leafClusterGeo, birchLeafMat);
            leaves.position.copy(c.pos);
            leaves.scale.set(c.r, c.r, c.r);
            this.group.add(leaves);
        });
    }

    buildStumpMesh() {
        const stumpHeight = 1.0;
        const stumpRadius = 0.9;

        const stump = new THREE.Mesh(trunkGeo, [stumpMat, stumpTopMat, stumpMat]);
        stump.scale.set(stumpRadius, stumpHeight, stumpRadius);
        stump.position.y = stumpHeight / 2;
        this.group.add(stump);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'tree',
                    tree: this
                };
            }
        });
    }

    hit(damage) {
        if (this.isFelling || this.isDestroyed) return;

        this.health -= damage;

        if (this.isStump) {
            if (this.health <= 0) {
                this.destroy();
            }
        } else {
            if (this.health <= 0) {
                this.startFelling();
            }
        }
    }

    startFelling() {
        this.isFelling = true;
        this.fallAngle = 0;
        const angle = Math.random() * Math.PI * 2;
        this.fallDirection.set(Math.cos(angle), 0, Math.sin(angle));
        this.markActive();
    }

    spawnWoodDrops(numDrops) {
        for (let i = 0; i < numDrops; i++) {
            new WoodDrop(this.scene, this.x, this.y, this.z, 1, this.interactables);
        }
    }

    turnIntoStump() {
        this.isFelling = false;
        this.isStump = true;
        this.regrowTimer = this.regrowDuration;
        this.group.rotation.set(0, 0, 0);

        const minWood = this.woodDropRange[0];
        const maxWood = this.woodDropRange[1];
        const count = Math.floor(Math.random() * (maxWood - minWood + 1)) + minWood;
        this.spawnWoodDrops(count);

        this.initStats();
        this.buildTree();
        this.markActive();
    }

    destroy() {
        this.isDestroyed = true;
        this.markInactive();
        
        this.spawnWoodDrops(Math.floor(Math.random() * 2) + 1);

        this.scene.remove(this.group);

        const interactableIdx = this.interactables.indexOf(this.group);
        if (interactableIdx !== -1) {
            this.interactables.splice(interactableIdx, 1);
        }

        const obstacleIdx = this.obstacles.indexOf(this);
        if (obstacleIdx !== -1) {
            this.obstacles.splice(obstacleIdx, 1);
        }
    }

    update(delta) {
        if (this.isDestroyed) {
            this.markInactive();
            return;
        }

        if (this.isFelling) {
            this.fallAngle += delta * 2.5;
            this.group.rotation.z = Math.sin(this.fallAngle) * 1.4;

            if (this.fallAngle >= Math.PI / 2) {
                this.turnIntoStump();
            }
            return;
        }

        if (this.isStump) {
            this.regrowTimer -= delta;
            if (this.regrowTimer <= 0) {
                this.isStump = false;
                this.stage = 1;
                this.initStats();
                this.buildTree();
                this.markActive();
            }
            return;
        }

        if (this.stage < 3) {
            this.growthTimer += delta;
            if (this.growthTimer >= this.growthDuration) {
                this.growthTimer = 0;
                this.stage++;
                this.initStats();
                this.buildTree();
                if (this.stage === 3) {
                    this.markInactive();
                }
            }
        } else {
            this.markInactive();
        }
    }
}
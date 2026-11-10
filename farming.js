// farming.js
import * as THREE from 'three';

const soilMat = new THREE.MeshPhongMaterial({ color: 0x5c4028, flatShading: true });
const sproutMat = new THREE.MeshPhongMaterial({ color: 0x78e08f, flatShading: true });
const plantMat = new THREE.MeshPhongMaterial({ color: 0x27ae60, flatShading: true });
const fruitMat = new THREE.MeshPhongMaterial({ color: 0xff2233, flatShading: true, shininess: 40 });

export class TilledSoil {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables || [];
        this.crop = null;

        this.group = new THREE.Group();
        this.group.position.set(x, y + 0.02, z);

        const geo = new THREE.CylinderGeometry(0.75, 0.8, 0.08, 8);
        const mesh = new THREE.Mesh(geo, soilMat);
        this.group.add(mesh);

        this.tagMeshes();
        this.scene.add(this.group);
        if (this.interactables) this.interactables.push(this.group);
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { type: 'tilledSoil', soil: this };
            }
        });
    }

    plantSeed(seedName, cropsArray = []) {
        if (this.crop) return false;
        this.crop = new Crop(
            this.scene, 
            this.group.position.x, 
            this.group.position.y, 
            this.group.position.z, 
            seedName, 
            this, 
            this.interactables
        );
        if (cropsArray) cropsArray.push(this.crop);
        return true;
    }
}

export class Crop {
    constructor(scene, x, y, z, seedType = 'Berry Seeds', parentSoil = null, interactables = []) {
        this.scene = scene;
        this.seedType = seedType;
        this.parentSoil = parentSoil;
        this.interactables = interactables;

        this.stage = 1; // 1: Sprout, 2: Growing Bush, 3: Mature Harvestable Bush
        this.growthTimer = 0;
        this.growthDuration = 30.0; // Seconds to grow fully
        this.isHarvested = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y + 0.04, z);

        this.buildMesh();
        this.scene.add(this.group);
        if (this.interactables) this.interactables.push(this.group);
    }

    buildMesh() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        if (this.stage === 1) {
            // Stage 1: Small Sprout
            const sproutGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
            const sprout = new THREE.Mesh(sproutGeo, sproutMat);
            sprout.position.y = 0.12;
            this.group.add(sprout);

        } else if (this.stage === 2) {
            // Stage 2: Growing Bush Foliage
            const bushGeo = new THREE.DodecahedronGeometry(0.3, 0);
            const bush = new THREE.Mesh(bushGeo, plantMat);
            bush.position.y = 0.3;
            this.group.add(bush);

        } else if (this.stage === 3) {
            // Stage 3: Mature Bush with Bright Red Berries
            const bushGeo = new THREE.DodecahedronGeometry(0.48, 0);
            const bush = new THREE.Mesh(bushGeo, plantMat);
            bush.position.y = 0.45;
            this.group.add(bush);

            // Cluster of 8 bright red berries placed across top and sides
            const berryGeo = new THREE.DodecahedronGeometry(0.09, 0);
            const berryOffsets = [
                [0.28, 0.55, 0.20],
                [-0.26, 0.48, 0.22],
                [0.22, 0.42, -0.28],
                [-0.28, 0.52, -0.18],
                [0.02, 0.70, 0.12],
                [0.34, 0.36, 0.02],
                [-0.15, 0.40, 0.32],
                [0.10, 0.62, -0.25]
            ];

            berryOffsets.forEach(pos => {
                const berry = new THREE.Mesh(berryGeo, fruitMat);
                berry.position.set(pos[0], pos[1], pos[2]);
                this.group.add(berry);
            });
        }

        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'crop', crop: this };
        });
    }

    update(delta) {
        if (this.stage >= 3 || this.isHarvested) return;

        this.growthTimer += delta;
        if (this.growthTimer >= this.growthDuration * 0.5 && this.stage === 1) {
            this.stage = 2;
            this.buildMesh();
        } else if (this.growthTimer >= this.growthDuration && this.stage === 2) {
            this.stage = 3;
            this.buildMesh();
        }
    }

    harvest(player) {
        if (this.stage < 3 || this.isHarvested) return;
        this.isHarvested = true;

        if (player && player.inventory) {
            player.inventory.addItem('Berries', 4, '🫐');
            player.inventory.addItem('Berry Seeds', 1, '🌱');
        }

        this.scene.remove(this.group);
        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }
        if (this.parentSoil) this.parentSoil.crop = null;
    }
}
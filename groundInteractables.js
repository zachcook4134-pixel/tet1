import * as THREE from 'three';

// --- Shared Module-Level Geometries & Materials ---

// Bush Assets
const bushTrunkGeo = new THREE.CylinderGeometry(0.1, 0.25, 0.8, 6);
const bushTrunkMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const bushFoliageMat = new THREE.MeshPhongMaterial({ color: 0x1e561e, flatShading: true });
const bushFoliageUnitGeo = new THREE.DodecahedronGeometry(1, 1);
const berryGeo = new THREE.SphereGeometry(0.14, 8, 8);
const berryMat = new THREE.MeshPhongMaterial({ 
    color: 0xff1e43, 
    emissive: 0x660011, 
    shininess: 100 
});

// Grass Assets
const grassBladeGeo = new THREE.ConeGeometry(1, 1, 3);
const grassColors = [0x3a5f0b, 0x4d7c0f, 0x2e4808, 0x5b8e15];
const grassMats = grassColors.map(c => new THREE.MeshPhongMaterial({ color: c, flatShading: true }));

// Egg / Nest Assets
const nestGeo = new THREE.TorusGeometry(0.32, 0.1, 6, 12);
const nestMat = new THREE.MeshPhongMaterial({ color: 0x4a3525, flatShading: true });
const bedGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.06, 8);
const bedMat = new THREE.MeshPhongMaterial({ color: 0x3d2b1f, flatShading: true });
const eggBaseGeo = new THREE.SphereGeometry(0.1, 8, 8);
eggBaseGeo.scale(0.85, 1.25, 0.85);
const eggMat = new THREE.MeshPhongMaterial({ 
    color: 0xf4e8d1, 
    shininess: 40,
    flatShading: true 
});

// Stone Assets
const stoneMat = new THREE.MeshPhongMaterial({ 
    color: 0x73777b, 
    flatShading: true,
    shininess: 15
});
const darkStoneMat = new THREE.MeshPhongMaterial({ 
    color: 0x4f5255, 
    flatShading: true,
    shininess: 5
});
const rockUnitGeoL1 = new THREE.DodecahedronGeometry(0.3, 1);
const rockUnitGeoL0 = new THREE.DodecahedronGeometry(0.2, 0);

// Stick Assets
const stickBarkMat = new THREE.MeshPhongMaterial({ color: 0x5a3d28, flatShading: true });
const stickTwigMat = new THREE.MeshPhongMaterial({ color: 0x472f1e, flatShading: true });
const stickMainGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.9, 5);
const stickBranch1Geo = new THREE.CylinderGeometry(0.02, 0.03, 0.35, 5);
const stickBranch2Geo = new THREE.CylinderGeometry(0.015, 0.025, 0.25, 5);

// Ore Drop Chunk Assets
const resourceDropGeo = new THREE.DodecahedronGeometry(0.2, 0);
const stoneDropMat = new THREE.MeshPhongMaterial({ color: 0x73777b, flatShading: true, shininess: 15 });
const metalDropMat = new THREE.MeshPhongMaterial({ color: 0xaa8833, flatShading: true, shininess: 100, emissive: 0x221100 });

// Stone Ore Shared Assets
const stoneOreBaseMat = new THREE.MeshPhongMaterial({ color: 0x65696d, flatShading: true, shininess: 10 });
const stoneOreDarkMat = new THREE.MeshPhongMaterial({ color: 0x484b4e, flatShading: true, shininess: 5 });
const stoneOreHighlightMat = new THREE.MeshPhongMaterial({ color: 0x8a8f94, flatShading: true, shininess: 20 });
const stoneOreMainGeo = new THREE.DodecahedronGeometry(1.2, 1);
const stoneOreSubGeo1 = new THREE.DodecahedronGeometry(0.7, 1);
const stoneOreSubGeo2 = new THREE.DodecahedronGeometry(0.8, 1);
const stoneOreSubGeo3 = new THREE.DodecahedronGeometry(0.5, 0);
const stoneOreSubGeo4 = new THREE.DodecahedronGeometry(0.6, 1);

// Metal Ore Shared Assets
const metalOreBaseMat = new THREE.MeshPhongMaterial({ color: 0x383a3d, flatShading: true, shininess: 15 });
const metalOreDarkMat = new THREE.MeshPhongMaterial({ color: 0x242628, flatShading: true, shininess: 5 });
const metalOreVeinMat = new THREE.MeshPhongMaterial({ 
    color: 0xaa8833, 
    emissive: 0x332200, 
    shininess: 120, 
    flatShading: true 
});
const metalOreCrystalMat = new THREE.MeshPhongMaterial({ 
    color: 0xc8c0b0, 
    emissive: 0x222222, 
    shininess: 150, 
    flatShading: true 
});
const metalOreMainGeo = new THREE.DodecahedronGeometry(1.3, 1);
const metalOreSubGeo1 = new THREE.DodecahedronGeometry(0.8, 1);
const metalOreSubGeo2 = new THREE.DodecahedronGeometry(0.75, 1);
const metalOreVeinGeo1 = new THREE.OctahedronGeometry(0.35, 0);
const metalOreVeinGeo2 = new THREE.DodecahedronGeometry(0.3, 0);
const metalOreVeinGeo3 = new THREE.OctahedronGeometry(0.28, 0);
const metalOreVeinGeo4 = new THREE.DodecahedronGeometry(0.25, 0);
const metalOreVeinGeo5 = new THREE.OctahedronGeometry(0.32, 0);

// Replace resourceDrop constructor mesh creation in groundInteractables.js:

export class resourceDrop {
    constructor(scene, x, y, z, name = 'Stone', icon = '🪨', count = 1, interactables = []) {
        this.scene = scene;
        this.name = name;
        this.icon = icon;
        this.count = count;
        this.interactables = interactables;
        this.isHarvested = false;

        this.group = new THREE.Group();
        const offsetX = (Math.random() - 0.5) * 1.6;
        const offsetZ = (Math.random() - 0.5) * 1.6;
        this.group.position.set(x + offsetX, y + 0.15, z + offsetZ);

        let dropMesh;

        if (name === 'Arrows') {
            const arrowGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6);
            const arrowMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
            dropMesh = new THREE.Mesh(arrowGeo, arrowMat);
            dropMesh.rotation.z = Math.PI / 2;
        } else if (name === 'Spear') {
            const spearGeo = new THREE.CylinderGeometry(0.02, 0.025, 1.2, 6);
            const spearMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
            dropMesh = new THREE.Mesh(spearGeo, spearMat);
            dropMesh.rotation.z = Math.PI / 2;
        } else if (name === 'Raw Meat' || name === 'Cooked Meat') {
            const meatGeo = new THREE.BoxGeometry(0.25, 0.12, 0.35);
            const meatMat = new THREE.MeshPhongMaterial({ 
                color: name === 'Raw Meat' ? 0xb02e2e : 0x6e3b1f, 
                flatShading: true 
            });
            dropMesh = new THREE.Mesh(meatGeo, meatMat);
        } else if (name === 'Feather') {
            const featherGeo = new THREE.BoxGeometry(0.02, 0.01, 0.25);
            const featherMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, flatShading: true });
            dropMesh = new THREE.Mesh(featherGeo, featherMat);
        } else {
            const mat = name === 'Metal Ore' ? metalDropMat : stoneDropMat;
            dropMesh = new THREE.Mesh(resourceDropGeo, mat);
            dropMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dropMesh.scale.set(1.2, 0.8, 1.1);
        }

        this.group.add(dropMesh);

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'resourceDrop',
                    resourceDrop: this
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

        inventory.addItem(this.name, this.count, this.icon);

        this.scene.remove(this.group);
        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) {
                this.interactables.splice(idx, 1);
            }
        }
    }
}

export class BerryBush {
    constructor(scene, x, y, z, activeInteractables = null) {
        this.scene = scene;
        this.activeInteractables = activeInteractables;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        this.minRegrowTime = 15;
        this.maxRegrowTime = 45;
        this.radius = 0.8;

        this.berryMeshes = [];
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildBush();
        this.scene.add(this.group);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildBush() {
        const trunk = new THREE.Mesh(bushTrunkGeo, bushTrunkMat);
        trunk.position.y = 0.4;
        this.group.add(trunk);

        const clusters = [
            { pos: new THREE.Vector3(0, 1.2, 0), radius: 0.9 },
            { pos: new THREE.Vector3(0.5, 1.0, 0.4), radius: 0.7 },
            { pos: new THREE.Vector3(-0.5, 1.1, -0.3), radius: 0.75 },
            { pos: new THREE.Vector3(0.3, 1.3, -0.5), radius: 0.65 },
            { pos: new THREE.Vector3(-0.4, 0.9, 0.5), radius: 0.6 }
        ];

        clusters.forEach(c => {
            const foliage = new THREE.Mesh(bushFoliageUnitGeo, bushFoliageMat);
            foliage.position.copy(c.pos);
            foliage.scale.set(c.radius, c.radius, c.radius);
            this.group.add(foliage);
        });

        const surfaceAngles = [
            [0,  0.0,  0.9,  0.4],
            [0,  0.5,  0.7, -0.5],
            [1,  0.8,  0.2,  0.5],
            [1,  0.6, -0.2,  0.7],
            [2, -0.8,  0.3, -0.4],
            [2, -0.7, -0.1,  0.6],
            [3,  0.3,  0.6, -0.7],
            [3, -0.2,  0.4, -0.8],
            [4, -0.8,  0.1,  0.5],
            [4, -0.3, -0.3,  0.8]
        ];

        surfaceAngles.forEach(([clusterIdx, dx, dy, dz]) => {
            const cluster = clusters[clusterIdx];
            const dir = new THREE.Vector3(dx, dy, dz).normalize();
            const surfaceOffset = cluster.radius + 0.05;
            const berryPos = cluster.pos.clone().add(dir.multiplyScalar(surfaceOffset));

            const berry = new THREE.Mesh(berryGeo, berryMat);
            berry.position.copy(berryPos);

            this.group.add(berry);
            this.berryMeshes.push(berry);
        });

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'berryBush',
                    bush: this
                };
            }
        });
    }

    harvest() {
        if (!this.isMature) return null;

        this.isMature = false;
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        this.berryMeshes.forEach(berry => {
            berry.visible = false;
            berry.scale.set(0, 0, 0);
        });

        this.markActive();

        return { name: 'Berries', count: 3, icon: '🫐' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;
            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            if (progress > 0.25) {
                const scaleProgress = (progress - 0.25) / 0.75;
                this.berryMeshes.forEach(berry => {
                    berry.visible = true;
                    berry.scale.set(scaleProgress, scaleProgress, scaleProgress);
                });
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.berryMeshes.forEach(berry => {
                    berry.visible = true;
                    berry.scale.set(1, 1, 1);
                });
                this.markInactive();
            }
        } else {
            this.markInactive();
        }
    }
}

export class Grass {
    constructor(scene, x, y, z, activeInteractables = null) {
        this.scene = scene;
        this.activeInteractables = activeInteractables;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        this.minRegrowTime = 10;
        this.maxRegrowTime = 25;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildGrassTuft();
        this.scene.add(this.group);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildGrassTuft() {
        const bladeCount = 14;

        for (let i = 0; i < bladeCount; i++) {
            const height = 0.6 + Math.random() * 0.4;
            const width = 0.04 + Math.random() * 0.03;
            const mat = grassMats[Math.floor(Math.random() * grassMats.length)];

            const blade = new THREE.Mesh(grassBladeGeo, mat);
            blade.scale.set(width, height, width);

            const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() * 0.4);
            const distance = Math.random() * 0.18;
            const bx = Math.cos(angle) * distance;
            const bz = Math.sin(angle) * distance;

            blade.position.set(bx, height / 2, bz);

            const tilt = 0.15 + Math.random() * 0.35;
            blade.rotation.x = Math.sin(angle) * tilt;
            blade.rotation.z = -Math.cos(angle) * tilt;
            blade.rotation.y = Math.random() * Math.PI;

            this.group.add(blade);
        }

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'grass',
                    grass: this
                };
            }
        });
    }

    harvest() {
        if (!this.isMature) return null;

        this.isMature = false;
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        this.group.visible = false;
        this.group.scale.set(0, 0, 0);

        this.markActive();

        return { name: 'Plant Fiber', count: 2, icon: '🌿' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;
            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            if (progress > 0.2) {
                const scaleProgress = (progress - 0.2) / 0.8;
                this.group.visible = true;
                this.group.scale.set(scaleProgress, scaleProgress, scaleProgress);
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.group.visible = true;
                this.group.scale.set(1, 1, 1);
                this.markInactive();
            }
        } else {
            this.markInactive();
        }
    }
}

export class Egg {
    constructor(scene, x, y, z, activeInteractables = null) {
        this.scene = scene;
        this.activeInteractables = activeInteractables;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        this.minRegrowTime = 20;
        this.maxRegrowTime = 50;

        this.eggMeshes = [];
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildNest();
        this.scene.add(this.group);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildNest() {
        const nest = new THREE.Mesh(nestGeo, nestMat);
        nest.rotation.x = Math.PI / 2;
        nest.position.y = 0.05;
        this.group.add(nest);

        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = 0.04;
        this.group.add(bed);

        const eggTransforms = [
            { pos: [-0.08, 0.1, -0.05], rot: [0.2, 0, -0.1] },
            { pos: [0.09, 0.1, 0.02], rot: [-0.15, 0, 0.2] },
            { pos: [-0.02, 0.12, 0.08], rot: [0.1, 0, 0.15] }
        ];

        eggTransforms.forEach(t => {
            const egg = new THREE.Mesh(eggBaseGeo, eggMat);
            egg.position.set(...t.pos);
            egg.rotation.set(...t.rot);
            this.group.add(egg);
            this.eggMeshes.push(egg);
        });

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'egg',
                    egg: this
                };
            }
        });
    }

    harvest() {
        if (!this.isMature) return null;

        this.isMature = false;
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        this.eggMeshes.forEach(egg => {
            egg.visible = false;
            egg.scale.set(0, 0, 0);
        });

        this.markActive();

        return { name: 'Egg', count: 2, icon: '🥚' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;
            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            if (progress > 0.3) {
                const scaleProgress = (progress - 0.3) / 0.7;
                this.eggMeshes.forEach(egg => {
                    egg.visible = true;
                    egg.scale.set(scaleProgress, scaleProgress, scaleProgress);
                });
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.eggMeshes.forEach(egg => {
                    egg.visible = true;
                    egg.scale.set(1, 1, 1);
                });
                this.markInactive();
            }
        } else {
            this.markInactive();
        }
    }
}

export class Stone {
    constructor(scene, x, y, z, activeInteractables = null) {
        this.scene = scene;
        this.activeInteractables = activeInteractables;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        this.minRegrowTime = 15;
        this.maxRegrowTime = 40;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildStoneCluster();
        this.scene.add(this.group);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildStoneCluster() {
        const mainRock = new THREE.Mesh(rockUnitGeoL1, stoneMat);
        mainRock.scale.set(1.2, 0.65, 0.9);
        mainRock.position.set(0, 0.12, 0);
        mainRock.rotation.set(0.2, Math.random() * Math.PI, 0.1);
        this.group.add(mainRock);

        const pebbles = [
            { scale: [0.5, 0.4, 0.5], pos: [0.25, 0.07, -0.15], mat: darkStoneMat },
            { scale: [0.4, 0.3, 0.45], pos: [-0.2, 0.05, 0.18], mat: stoneMat }
        ];

        pebbles.forEach(p => {
            const rock = new THREE.Mesh(rockUnitGeoL0, p.mat);
            rock.scale.set(...p.scale);
            rock.position.set(...p.pos);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this.group.add(rock);
        });

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'stone',
                    stone: this
                };
            }
        });
    }

    harvest() {
        if (!this.isMature) return null;

        this.isMature = false;
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        this.group.visible = false;
        this.group.scale.set(0, 0, 0);

        this.markActive();

        return { name: 'Stone', count: 1, icon: '🪨' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;
            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            if (progress > 0.2) {
                const scaleProgress = (progress - 0.2) / 0.8;
                this.group.visible = true;
                this.group.scale.set(scaleProgress, scaleProgress, scaleProgress);
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.group.visible = true;
                this.group.scale.set(1, 1, 1);
                this.markInactive();
            }
        } else {
            this.markInactive();
        }
    }
}

export class Stick {
    constructor(scene, x, y, z, activeInteractables = null) {
        this.scene = scene;
        this.activeInteractables = activeInteractables;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        this.minRegrowTime = 12;
        this.maxRegrowTime = 30;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildStick();
        this.scene.add(this.group);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildStick() {
        const mainStick = new THREE.Mesh(stickMainGeo, stickBarkMat);
        mainStick.rotation.z = Math.PI / 2 + 0.15;
        mainStick.rotation.y = Math.random() * Math.PI * 2;
        mainStick.position.set(0, 0.04, 0);
        this.group.add(mainStick);

        const branch1 = new THREE.Mesh(stickBranch1Geo, stickTwigMat);
        branch1.position.set(0.15, 0.05, 0.08);
        branch1.rotation.set(0.2, 0.8, 1.2);
        this.group.add(branch1);

        const branch2 = new THREE.Mesh(stickBranch2Geo, stickTwigMat);
        branch2.position.set(-0.2, 0.05, -0.05);
        branch2.rotation.set(-0.3, -0.6, 1.0);
        this.group.add(branch2);

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'stick',
                    stick: this
                };
            }
        });
    }

    harvest() {
        if (!this.isMature) return null;

        this.isMature = false;
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        this.group.visible = false;
        this.group.scale.set(0, 0, 0);

        this.markActive();

        return { name: 'Stick', count: 1, icon: '🪵' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;
            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            if (progress > 0.2) {
                const scaleProgress = (progress - 0.2) / 0.8;
                this.group.visible = true;
                this.group.scale.set(scaleProgress, scaleProgress, scaleProgress);
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.group.visible = true;
                this.group.scale.set(1, 1, 1);
                this.markInactive();
            }
        } else {
            this.markInactive();
        }
    }
}

// --- Mineable Stone Ore Deposit ---
export class StoneOre {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.storageArray = context.storageArray;
        this.activeInteractables = context.activeInteractables;

        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.radius = 1.2;
        this.isDestroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildStoneOre();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        if (this.storageArray) this.storageArray.push(this);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildStoneOre() {
        const mainRock = new THREE.Mesh(stoneOreMainGeo, stoneOreBaseMat);
        mainRock.scale.set(1.1, 0.75, 0.95);
        mainRock.position.set(0, 0.5, 0);
        mainRock.rotation.set(0.1, Math.random() * Math.PI, -0.1);
        this.group.add(mainRock);

        const subRocks = [
            { geo: stoneOreSubGeo1, mat: stoneOreDarkMat, scale: [0.9, 0.6, 0.8], pos: [0.6, 0.35, 0.4], rot: [0.3, 0.5, 0.2] },
            { geo: stoneOreSubGeo2, mat: stoneOreHighlightMat, scale: [0.8, 0.7, 0.85], pos: [-0.55, 0.4, -0.3], rot: [-0.2, 1.1, 0.4] },
            { geo: stoneOreSubGeo3, mat: stoneOreBaseMat, scale: [1.0, 0.5, 0.9], pos: [0.2, 0.25, -0.65], rot: [0.4, -0.8, 0.1] },
            { geo: stoneOreSubGeo4, mat: stoneOreDarkMat, scale: [0.75, 0.65, 0.75], pos: [-0.4, 0.3, 0.5], rot: [0.1, 2.0, -0.3] }
        ];

        subRocks.forEach(r => {
            const mesh = new THREE.Mesh(r.geo, r.mat);
            mesh.scale.set(...r.scale);
            mesh.position.set(...r.pos);
            mesh.rotation.set(...r.rot);
            this.group.add(mesh);
        });

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'stoneOre',
                    ore: this
                };
            }
        });
    }

    hit(damage = 25) {
        if (this.isDestroyed) return;

        this.health -= damage;

        // Visual hit impact shake
        this.group.scale.set(0.92, 0.92, 0.92);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.health <= 0) {
            this.spawnresourceDrops(4);
            this.destroy();
        }
    }

    spawnresourceDrops(count = 4) {
        const pos = this.group.position;
        for (let i = 0; i < count; i++) {
            new resourceDrop(this.scene, pos.x, pos.y, pos.z, 'Stone', '🪨', 1, this.interactables);
        }
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.markInactive();

        if (this.scene) {
            this.scene.remove(this.group);
        }

        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }

        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }

        if (this.storageArray) {
            const idx = this.storageArray.indexOf(this);
            if (idx !== -1) this.storageArray.splice(idx, 1);
        }

        // Respawn replacement rock at a new random location on terrain
        if (this.environment) {
            let x, z, groundY;
            let attempts = 0;
            do {
                x = (Math.random() - 0.5) * 960;
                z = (Math.random() - 0.5) * 960;
                groundY = this.environment.getTerrainHeight(x, z);
                attempts++;
            } while (groundY <= -2.0 && attempts < 50);

            if (groundY > -2.0) {
                new StoneOre(this.scene, x, groundY, z, {
                    environment: this.environment,
                    interactables: this.interactables,
                    obstacles: this.obstacles,
                    storageArray: this.storageArray,
                    activeInteractables: this.activeInteractables
                });
            }
        }
    }

    update(delta) {
    }
}

// --- Mineable Metal Ore Deposit ---
export class MetalOre {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.storageArray = context.storageArray;
        this.activeInteractables = context.activeInteractables;

        this.maxHealth = 150;
        this.health = this.maxHealth;
        this.radius = 1.3;
        this.isDestroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildMetalOre();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        if (this.storageArray) this.storageArray.push(this);
    }

    markActive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.add(this);
        } else if (Array.isArray(this.activeInteractables)) {
            if (!this.activeInteractables.includes(this)) {
                this.activeInteractables.push(this);
            }
        }
    }

    markInactive() {
        if (!this.activeInteractables) return;
        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        } else if (Array.isArray(this.activeInteractables)) {
            const idx = this.activeInteractables.indexOf(this);
            if (idx !== -1) {
                this.activeInteractables.splice(idx, 1);
            }
        }
    }

    buildMetalOre() {
        const mainRock = new THREE.Mesh(metalOreMainGeo, metalOreBaseMat);
        mainRock.scale.set(1.15, 0.8, 1.0);
        mainRock.position.set(0, 0.55, 0);
        mainRock.rotation.set(-0.1, Math.random() * Math.PI, 0.15);
        this.group.add(mainRock);

        const subRocks = [
            { geo: metalOreSubGeo1, mat: metalOreDarkMat, scale: [0.85, 0.65, 0.9], pos: [-0.6, 0.4, 0.3], rot: [0.2, 0.8, -0.4] },
            { geo: metalOreSubGeo2, mat: metalOreBaseMat, scale: [0.9, 0.7, 0.8], pos: [0.65, 0.35, -0.3], rot: [-0.3, -1.2, 0.2] }
        ];

        subRocks.forEach(r => {
            const mesh = new THREE.Mesh(r.geo, r.mat);
            mesh.scale.set(...r.scale);
            mesh.position.set(...r.pos);
            mesh.rotation.set(...r.rot);
            this.group.add(mesh);
        });

        const veins = [
            { geo: metalOreVeinGeo1, mat: metalOreVeinMat, pos: [0.35, 0.75, 0.45], rot: [0.4, 0.2, 0.5], scale: [1, 1.4, 0.8] },
            { geo: metalOreVeinGeo2, mat: metalOreCrystalMat, pos: [-0.45, 0.65, -0.35], rot: [-0.5, 0.8, 0.1], scale: [1.2, 0.9, 1.1] },
            { geo: metalOreVeinGeo3, mat: metalOreVeinMat, pos: [-0.2, 0.85, 0.5], rot: [0.8, -0.3, 0.2], scale: [0.9, 1.3, 0.9] },
            { geo: metalOreVeinGeo4, mat: metalOreCrystalMat, pos: [0.5, 0.5, -0.45], rot: [0.1, 1.5, -0.6], scale: [1.1, 1.1, 1.1] },
            { geo: metalOreVeinGeo5, mat: metalOreVeinMat, pos: [0.1, 0.95, -0.2], rot: [-0.2, 0.4, 0.9], scale: [1.3, 0.8, 1.0] }
        ];

        veins.forEach(v => {
            const veinMesh = new THREE.Mesh(v.geo, v.mat);
            veinMesh.position.set(...v.pos);
            veinMesh.rotation.set(...v.rot);
            veinMesh.scale.set(...v.scale);
            this.group.add(veinMesh);
        });

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'metalOre',
                    ore: this
                };
            }
        });
    }

    hit(damage = 25) {
        if (this.isDestroyed) return;

        this.health -= damage;

        // Visual hit impact shake
        this.group.scale.set(0.92, 0.92, 0.92);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.health <= 0) {
            this.spawnresourceDrops(3);
            this.destroy();
        }
    }

    spawnresourceDrops(count = 3) {
        const pos = this.group.position;
        for (let i = 0; i < count; i++) {
            new resourceDrop(this.scene, pos.x, pos.y, pos.z, 'Metal Ore', '⚙️', 1, this.interactables);
        }
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.markInactive();

        if (this.scene) {
            this.scene.remove(this.group);
        }

        if (this.interactables) {
            const idx = this.interactables.indexOf(this.group);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }

        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }

        if (this.storageArray) {
            const idx = this.storageArray.indexOf(this);
            if (idx !== -1) this.storageArray.splice(idx, 1);
        }

        // Respawn replacement metal ore at a new random location on terrain
        if (this.environment) {
            let x, z, groundY;
            let attempts = 0;
            do {
                x = (Math.random() - 0.5) * 960;
                z = (Math.random() - 0.5) * 960;
                groundY = this.environment.getTerrainHeight(x, z);
                attempts++;
            } while (groundY <= -2.0 && attempts < 50);

            if (groundY > -2.0) {
                new MetalOre(this.scene, x, groundY, z, {
                    environment: this.environment,
                    interactables: this.interactables,
                    obstacles: this.obstacles,
                    storageArray: this.storageArray,
                    activeInteractables: this.activeInteractables
                });
            }
        }
    }

    update(delta) {
    }
}
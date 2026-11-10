import * as THREE from 'three';

const woodMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
const metalMat = new THREE.MeshPhongMaterial({ color: 0x3a3d40, flatShading: true, shininess: 80 });
const fiberMat = new THREE.MeshPhongMaterial({ color: 0x8c7355, flatShading: true });
const triggerPlateMat = new THREE.MeshPhongMaterial({ color: 0x8b0000, flatShading: true });

export const TRAP_CONFIGS = {
    'Primitive Small Trap': {
        radius: 0.8,
        triggerDistance: 1.0,
        targets: ['bird', 'rabbit'],
        drops: { 'Raw Meat': 1, 'Feather': 2 }
    },
    'Small Snare': {
        radius: 0.6,
        triggerDistance: 1.0,
        targets: ['rabbit', 'bird'],
        drops: { 'Raw Meat': 1, 'Fur': 1 }
    },
    'Medium Snare': {
        radius: 1.0,
        triggerDistance: 1.5,
        targets: ['wolf', 'deer'],
        drops: { 'Raw Meat': 2, 'Fur': 2 }
    },
    'Small Snap Trap': {
        radius: 0.8,
        triggerDistance: 1.2,
        targets: ['rabbit', 'wolf'],
        drops: { 'Raw Meat': 2, 'Fur': 1 }
    },
    'Medium Snap Trap': {
        radius: 1.4,
        triggerDistance: 2.0,
        targets: ['blackBear', 'grizzlyBear', 'wolf'],
        drops: { 'Raw Meat': 4, 'Fur': 3 }
    }
};



export const ANIMAL_LOOT_TABLE = {
    'rabbit': { 'Raw Meat': 2, 'Rabbit Fur': 2 },
    'bird': { 'Raw Meat': 1, 'Feather': 2 },
    'wolf': { 'Raw Meat': 3, 'Wolf Fur': 3 },
    'deer': { 'Raw Meat': 3, 'Deer Fur': 3 },
    'blackbear': { 'Raw Meat': 6, 'Bear Fur': 3 },
    'grizzlybear': { 'Raw Meat': 8, 'Grizzly Fur': 6 },
    'moose': { 'Raw Meat': 10, 'Moose Fur': 6 }
};

export class Trap {
    constructor(scene, x, y, z, trapType, context = {}) {
        this.scene = scene;
        this.trapType = trapType;
        this.config = TRAP_CONFIGS[trapType] || TRAP_CONFIGS['Primitive Small Trap'];
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.trapsArray = context.trapsArray || context.traps;

        this.state = 'SET'; // 'SET', 'CAUGHT'
        this.caughtAnimalType = null;
        this.isDestroyed = false;
        this.radius = this.config.radius;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildTrapMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);
        if (this.spatialGrid) this.spatialGrid.insert(this);
    }

    buildTrapMesh() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        switch (this.trapType) {
            case 'Primitive Small Trap':
                this.buildPrimitiveBox();
                break;
            case 'Small Snare':
            case 'Medium Snare':
                this.buildSnareMesh();
                break;
            case 'Small Snap Trap':
            case 'Medium Snap Trap':
                this.buildSnapTrapMesh();
                break;
            default:
                this.buildPrimitiveBox();
                break;
        }

        if (this.state === 'CAUGHT' && this.caughtAnimalType) {
            this.addCarcassMesh(this.caughtAnimalType);
        }

        this.tagMeshes();
    }

    buildPrimitiveBox() {
        const scale = 0.8;
        const cageGeo = new THREE.BoxGeometry(0.8 * scale, 0.5 * scale, 0.8 * scale);
        const cage = new THREE.Mesh(cageGeo, woodMat);
        cage.position.y = this.state === 'SET' ? 0.35 : 0.25;
        cage.rotation.z = this.state === 'SET' ? 0.35 : 0;
        this.group.add(cage);

        if (this.state === 'SET') {
            const stickGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5);
            const stick = new THREE.Mesh(stickGeo, woodMat);
            stick.position.set(0.3, 0.2, 0);
            this.group.add(stick);
        }
    }

    buildSnareMesh() {
        const isMed = this.trapType === 'Medium Snare';
        const mult = isMed ? 1.4 : 1.0;

        const stakeGeo = new THREE.CylinderGeometry(0.04 * mult, 0.02 * mult, 0.6 * mult, 6);
        const stake = new THREE.Mesh(stakeGeo, woodMat);
        stake.position.y = 0.2 * mult;
        this.group.add(stake);

        const loopGeo = new THREE.TorusGeometry(0.35 * mult, 0.015 * mult, 6, 12);
        const loop = new THREE.Mesh(loopGeo, fiberMat);
        loop.rotation.x = Math.PI / 2;
        loop.position.set(0, this.state === 'SET' ? 0.15 : 0.02, 0.3 * mult);
        if (this.state === 'CAUGHT') loop.scale.set(0.3, 0.3, 0.3);
        this.group.add(loop);
    }

    buildSnapTrapMesh() {
        const isMed = this.trapType === 'Medium Snap Trap';
        const scale = isMed ? 1.5 : 1.0;

        const baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.06, 0.6 * scale);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.03;
        this.group.add(base);

        const plateGeo = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.04, 8);
        const plate = new THREE.Mesh(plateGeo, triggerPlateMat);
        plate.position.y = 0.06;
        this.group.add(plate);

        const jawAngle = this.state === 'SET' ? 0 : Math.PI / 2.3;

        const leftJawGroup = new THREE.Group();
        leftJawGroup.position.set(-0.35 * scale, 0.05, 0);
        leftJawGroup.rotation.z = jawAngle;
        const jawGeo = new THREE.BoxGeometry(0.04, 0.35 * scale, 0.55 * scale);
        const leftJaw = new THREE.Mesh(jawGeo, metalMat);
        leftJaw.position.y = 0.18 * scale;
        leftJawGroup.add(leftJaw);

        const rightJawGroup = new THREE.Group();
        rightJawGroup.position.set(0.35 * scale, 0.05, 0);
        rightJawGroup.rotation.z = -jawAngle;
        const rightJaw = new THREE.Mesh(jawGeo, metalMat);
        rightJaw.position.y = 0.18 * scale;
        rightJawGroup.add(rightJaw);

        this.group.add(leftJawGroup, rightJawGroup);
    }

    addCarcassMesh(animalType) {
        const carcassGroup = new THREE.Group();
        const type = animalType.toLowerCase();

        if (type.includes('rabbit')) {
            const mat = new THREE.MeshPhongMaterial({ color: 0xa0826c, flatShading: true });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.55), mat);
            body.position.set(0, 0.15, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat);
            head.position.set(0, 0.12, 0.3);
            const earGeo = new THREE.BoxGeometry(0.06, 0.3, 0.04);
            const ear1 = new THREE.Mesh(earGeo, mat);
            ear1.position.set(0.08, 0.25, 0.25);
            const ear2 = new THREE.Mesh(earGeo, mat);
            ear2.position.set(-0.08, 0.25, 0.25);
            carcassGroup.add(body, head, ear1, ear2);
            carcassGroup.rotation.z = Math.PI / 2;
            carcassGroup.position.set(0.12, 0.12, 0);
        } else if (type.includes('bird')) {
            const featherMat = new THREE.MeshPhongMaterial({ color: 0x2b2b2b, flatShading: true });
            const beakMat = new THREE.MeshPhongMaterial({ color: 0xd4a373, flatShading: true });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35), featherMat);
            body.position.set(0, 0.1, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), featherMat);
            head.position.set(0, 0.15, 0.2);
            const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), beakMat);
            beak.rotation.x = Math.PI / 2;
            beak.position.set(0, 0.13, 0.3);
            carcassGroup.add(body, head, beak);
            carcassGroup.rotation.z = Math.PI / 2;
            carcassGroup.position.set(0.06, 0.08, 0);
        } else if (type.includes('wolf')) {
            const mat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.2), mat);
            body.position.set(0, 0.25, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.45), mat);
            head.position.set(0, 0.3, 0.7);
            carcassGroup.add(body, head);
            carcassGroup.rotation.z = Math.PI / 2;
            carcassGroup.position.set(0.25, 0.15, 0);
        } else if (type.includes('deer')) {
            const mat = new THREE.MeshPhongMaterial({ color: 0x8b5a2b, flatShading: true });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 1.4), mat);
            body.position.set(0, 0.3, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.5), mat);
            head.position.set(0, 0.4, 0.85);
            carcassGroup.add(body, head);
            carcassGroup.rotation.z = Math.PI / 2;
            carcassGroup.position.set(0.3, 0.18, 0);
        } else if (type.includes('bear')) {
            const mat = new THREE.MeshPhongMaterial({ color: 0x221a14, flatShading: true });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 1.6), mat);
            body.position.set(0, 0.4, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), mat);
            head.position.set(0, 0.45, 0.95);
            carcassGroup.add(body, head);
            carcassGroup.rotation.z = Math.PI / 2;
            carcassGroup.position.set(0.4, 0.22, 0);
        }

        this.group.add(carcassGroup);
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'trap',
                    trap: this
                };
            }
        });
    }

    trigger(animal) {
        if (this.state !== 'SET') return;

        this.state = 'CAUGHT';

        let typeName = animal.userData?.type || animal.constructor?.name || 'rabbit';
        this.caughtAnimalType = typeName;

        if (animal.destroy) {
            animal.destroy();
        } else if (animal.group && animal.group.parent) {
            animal.group.removeFromParent();
        }

        this.buildTrapMesh();
    }

    harvest(inventory) {
        if (this.state !== 'CAUGHT') return false;

        const animalKey = (this.caughtAnimalType || '').toLowerCase();
        const drops = ANIMAL_LOOT_TABLE[animalKey] || this.config.drops;

        const iconMap = {
            'Raw Meat': '🥩',
            'Fur': '🧥',
            'Feather': '🪶'
        };

        for (const [itemName, qty] of Object.entries(drops)) {
            const icon = iconMap[itemName] || '📦';
            inventory.addItem(itemName, qty, icon);
        }

        this.destroy();
        return true;
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

        if (this.spatialGrid) {
            this.spatialGrid.remove(this);
        }

        if (this.trapsArray) {
            const idx = this.trapsArray.indexOf(this);
            if (idx !== -1) this.trapsArray.splice(idx, 1);
        }
    }

    update(delta, animals = []) {
        if (this.state !== 'SET' || this.isDestroyed) return;

        const trapPos = this.group.position;
        const triggerDistSq = this.config.triggerDistance * this.config.triggerDistance;

        for (let i = 0; i < animals.length; i++) {
            const animal = animals[i];
            if (!animal || animal.isDead || animal.isDestroyed || !animal.group) continue;

            const animType = (animal.userData?.type || animal.constructor.name).toLowerCase();
            const isTarget = this.config.targets.some(t => animType.includes(t.toLowerCase()));

            if (!isTarget) continue;

            const dx = animal.group.position.x - trapPos.x;
            const dz = animal.group.position.z - trapPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq <= triggerDistSq) {
                this.trigger(animal);
                break;
            }
        }
    }
}
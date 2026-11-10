import * as THREE from 'three';

export class Rabbit {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Stats & Harvest Setup
        this.maxHp = 20;
        this.hp = this.maxHp;
        this.radius = 0.4;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 2;
        this.meatPerHit = 1;
        this.furPerHit = 1;
        this.fatPerHit = 1;

        // Vision & Hearing Proximity
        this.detectionDistance = 22.0;
        this.proximityDistance = 8.0;

        // Speeds
        this.baseSpeed = 2.0;
        this.runSpeed = 12.0;

        // Ecosystem Threat Tracking
        this.activeThreat = null;
        this.activeThreatPos = new THREE.Vector3();

        // AI States: 'ROAM', 'IDLE', 'FLEE'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;

        this.animTime = Math.random() * 100;
        this.hopProgress = 0;
        this.isSwimming = false;

        // Group & Mesh Setup
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewTarget();
    }

    buildMesh() {
        const rabbitFurMat = new THREE.MeshPhongMaterial({ color: 0x8a7057, flatShading: true });
        const rabbitBellyMat = new THREE.MeshPhongMaterial({ color: 0xdfd4c5, flatShading: true });
        const rabbitEyeMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 100 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.35, 0.35, 0.55);
        this.bodyMesh = new THREE.Mesh(bodyGeo, rabbitFurMat);
        this.bodyMesh.position.set(0, 0.3, 0);
        this.group.add(this.bodyMesh);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.2, 0.35);
        this.bodyMesh.add(this.headGroup);

        const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.3);
        const head = new THREE.Mesh(headGeo, rabbitFurMat);
        this.headGroup.add(head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const leftEye = new THREE.Mesh(eyeGeo, rabbitEyeMat);
        leftEye.position.set(0.15, 0.05, 0.05);
        const rightEye = new THREE.Mesh(eyeGeo, rabbitEyeMat);
        rightEye.position.set(-0.15, 0.05, 0.05);
        this.headGroup.add(leftEye, rightEye);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.08, 0.35, 0.05);
        const leftEar = new THREE.Mesh(earGeo, rabbitFurMat);
        leftEar.position.set(0.09, 0.28, -0.05);
        leftEar.rotation.x = -0.2;

        const rightEar = new THREE.Mesh(earGeo, rabbitFurMat);
        rightEar.position.set(-0.09, 0.28, -0.05);
        rightEar.rotation.x = -0.2;

        this.headGroup.add(leftEar, rightEar);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const tail = new THREE.Mesh(tailGeo, rabbitBellyMat);
        tail.position.set(0, 0.05, -0.32);
        this.bodyMesh.add(tail);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'rabbit', rabbit: this };
            }
        });
    }

    pickNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 12;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 3 + Math.random() * 4;
    }

    resolveObstacles() {
        if (!this.group || this.isDead) return;

        const myPos = this.group.position;
        const nearbyObstacles = this.spatialGrid 
            ? this.spatialGrid.getNearby(myPos.x, myPos.z)
            : (this.obstacles || []);

        for (let i = 0; i < nearbyObstacles.length; i++) {
            const obstacle = nearbyObstacles[i];
            if (obstacle === this || obstacle.isDestroyed) continue;

            const obsPos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
            if (!obsPos) continue;

            const obsRadius = obstacle.radius || 1.2;
            const dx = myPos.x - obsPos.x;
            const dz = myPos.z - obsPos.z;
            const distSq = dx * dx + dz * dz;
            const minDist = this.radius + obsRadius;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;

                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        const mapLimit = 480;
        myPos.x = THREE.MathUtils.clamp(myPos.x, -mapLimit, mapLimit);
        myPos.z = THREE.MathUtils.clamp(myPos.z, -mapLimit, mapLimit);
    }

    checkDetection(player, allAnimals = []) {
        if (this.isDead) return false;

        const myPos = this.group.position;

        // 1. Check Player Threat
        if (player && player.controls && player.health > 0) {
            const playerPos = player.controls.getObject().position;
            const dist = myPos.distanceTo(playerPos);
            const threshold = player.isSprinting ? this.detectionDistance * 1.4 : this.proximityDistance;
            if (dist <= threshold) {
                this.activeThreat = player;
                this.activeThreatPos.copy(playerPos);
                return true;
            }
        }

        // 2. Check Predators (Wolves, Grizzly Bears, Black Bears, Foxes)
        const predators = ['wolf', 'grizzlybear', 'blackbear', 'fox'];
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(myPos.x, myPos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDead || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (predators.includes(entityType)) {
                const predPos = entity.group ? entity.group.position : entity.position;
                if (!predPos) continue;

                if (myPos.distanceTo(predPos) <= this.detectionDistance) {
                    this.activeThreat = entity;
                    this.activeThreatPos.copy(predPos);
                    return true;
                }
            }
        }

        return false;
    }

    getThreatPosition() {
        if (this.activeThreat) {
            if (this.activeThreat.controls) {
                return this.activeThreat.controls.getObject().position;
            } else if (this.activeThreat.group) {
                return this.activeThreat.group.position;
            }
        }
        return this.activeThreatPos;
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;
        this.hp -= damage;
        if (attacker) {
            this.activeThreat = attacker;
        }

        if (this.hp <= 0) {
            this.die();
        } else {
            this.state = 'FLEE';
            this.fleeTimer = 6;
        }
    }

    die() {
        if (this.isDead || this.isDestroyed) return;
        this.isDead = true;

        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
        if (this.spatialGrid) {
            this.spatialGrid.remove(this);
        }

        this.group.rotation.z = Math.PI / 2;
    }

    harvest(player) {
        if (!this.isDead || this.isDestroyed) return;

        this.harvestHits--;

        if (player && player.inventory) {
            player.inventory.addItem('Raw Meat', this.meatPerHit, '🥩');
            player.inventory.addItem('Rabbit Fur', this.furPerHit, '🧥');
            player.inventory.addItem('Animal Fat', this.fatPerHit, '🧈');
        }

        this.group.scale.multiplyScalar(0.85);

        if (this.harvestHits <= 0) {
            this.destroy();
        }
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
        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
        if (this.spatialGrid) {
            this.spatialGrid.remove(this);
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const pos = this.group.position;

        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(pos.x, pos.z, this.iceHoles)
                : this.environment.getTerrainHeight(pos.x, pos.z);

            if (this.isDead) {
                pos.y = surfaceY + 0.18;
                return;
            }

            const waterLevel = this.environment.waterLevel ?? -5.0;
            const swimDepth = 0.35;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.2) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            pos.y = THREE.MathUtils.lerp(pos.y, targetY, 0.2);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        if (this.checkDetection(player, allAnimals) && this.state !== 'FLEE') {
            this.state = 'FLEE';
            this.fleeTimer = 6;
        }

        const speedMult = this.isSwimming ? 0.4 : 1.0;

        if (this.state === 'FLEE') {
            this.fleeTimer -= safeDelta;
            const threatPos = this.getThreatPosition();
            const dirAway = pos.clone().sub(threatPos);
            dirAway.y = 0;
            dirAway.normalize();

            const perp = new THREE.Vector3(-dirAway.z, 0, dirAway.x).multiplyScalar(Math.sin(this.animTime * 8) * 0.4);
            dirAway.add(perp).normalize();

            pos.x += dirAway.x * this.runSpeed * speedMult * safeDelta;
            pos.z += dirAway.z * this.runSpeed * speedMult * safeDelta;

            this.group.rotation.y = Math.atan2(dirAway.x, dirAway.z);
            
            const distToThreat = pos.distanceTo(threatPos);
            if (this.fleeTimer <= 0 || distToThreat > 45) {
                this.activeThreat = null;
                this.state = 'IDLE';
                this.idleTimer = 1.5;
            }
        } else if (this.state === 'ROAM') {
            this.roamTimer -= safeDelta;
            const dir = this.targetPosition.clone().sub(pos);
            dir.y = 0;
            if (dir.length() < 0.5 || this.roamTimer <= 0) {
                this.state = 'IDLE';
                this.idleTimer = 2 + Math.random() * 3;
            } else {
                dir.normalize();
                pos.x += dir.x * this.baseSpeed * speedMult * safeDelta;
                pos.z += dir.z * this.baseSpeed * speedMult * safeDelta;
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dir.x, dir.z), 0.1);
            }
        } else if (this.state === 'IDLE') {
            this.idleTimer -= safeDelta;
            if (this.idleTimer <= 0) {
                this.pickNewTarget();
                this.state = 'ROAM';
            }
        }

        this.resolveObstacles();

        if (this.isSwimming) {
            this.bodyMesh.position.y = 0.3;
            this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, -0.2, 0.1);
        } else {
            this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, 0, 0.1);
            const isMoving = this.state === 'FLEE' || this.state === 'ROAM';
            if (isMoving) {
                this.hopProgress += safeDelta * (this.state === 'FLEE' ? 18 : 8);
                this.bodyMesh.position.y = 0.3 + Math.abs(Math.sin(this.hopProgress)) * 0.25;
            } else {
                this.bodyMesh.position.y = 0.3;
            }
        }
    }
}

export class Deer {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Stats & Harvest Setup
        this.maxHp = 60;
        this.hp = this.maxHp;
        this.radius = 1.0;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 3;
        this.meatPerHit = 1;
        this.furPerHit = 1;
        this.fatPerHit = 1;

        // Vision & Hearing Setup
        this.detectionDistance = 38.0;
        this.proximityDistance = 14.0;

        // Speeds
        this.baseSpeed = 3.0;
        this.runSpeed = 15.0;

        // Ecosystem Threat Tracking
        this.activeThreat = null;
        this.activeThreatPos = new THREE.Vector3();

        // AI States: 'ROAM', 'IDLE', 'FLEE'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;

        this.animTime = Math.random() * 100;
        this.isSwimming = false;

        // Group & Mesh Setup
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewTarget();
    }

    buildMesh() {
        const deerBodyMat = new THREE.MeshPhongMaterial({ color: 0x9e6238, flatShading: true });
        const deerBellyMat = new THREE.MeshPhongMaterial({ color: 0xe6d5c3, flatShading: true });
        const deerSpotMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });

        // Main Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 1.8);
        this.bodyMesh = new THREE.Mesh(bodyGeo, deerBodyMat);
        this.bodyMesh.position.set(0, 1.3, 0);
        this.group.add(this.bodyMesh);

        // Underbelly
        const bellyGeo = new THREE.BoxGeometry(0.75, 0.3, 1.6);
        const belly = new THREE.Mesh(bellyGeo, deerBellyMat);
        belly.position.set(0, -0.4, 0);
        this.bodyMesh.add(belly);

        // Neck & Head
        this.neckGroup = new THREE.Group();
        this.neckGroup.position.set(0, 0.4, 0.8);
        this.neckGroup.rotation.x = 0.4;
        this.bodyMesh.add(this.neckGroup);

        const neckGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        const neck = new THREE.Mesh(neckGeo, deerBodyMat);
        neck.position.set(0, 0.3, 0);
        this.neckGroup.add(neck);

        const headGeo = new THREE.BoxGeometry(0.42, 0.4, 0.6);
        const head = new THREE.Mesh(headGeo, deerBodyMat);
        head.position.set(0, 0.7, 0.2);
        this.neckGroup.add(head);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.35, 0.12, 0.12);
        const leftEar = new THREE.Mesh(earGeo, deerBodyMat);
        leftEar.position.set(0.3, 0.8, 0.1);
        leftEar.rotation.z = 0.2;

        const rightEar = new THREE.Mesh(earGeo, deerBodyMat);
        rightEar.position.set(-0.3, 0.8, 0.1);
        rightEar.rotation.z = -0.2;
        this.neckGroup.add(leftEar, rightEar);

        // Tail (Flagged up when fleeing)
        const tailGeo = new THREE.BoxGeometry(0.18, 0.35, 0.12);
        this.tailMesh = new THREE.Mesh(tailGeo, deerSpotMat);
        this.tailMesh.position.set(0, 0.2, -0.95);
        this.bodyMesh.add(this.tailMesh);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 1.0, 0.2);
        this.legs = {};
        const pos = {
            fl: [0.3, -0.8, 0.7], fr: [-0.3, -0.8, 0.7],
            bl: [0.3, -0.8, -0.7], br: [-0.3, -0.8, -0.7]
        };

        for (const [k, p] of Object.entries(pos)) {
            const leg = new THREE.Mesh(legGeo, deerBodyMat);
            leg.position.set(...p);
            this.bodyMesh.add(leg);
            this.legs[k] = leg;
        }

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'deer', deer: this };
            }
        });
    }

    pickNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 25;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 6 + Math.random() * 6;
    }

    resolveObstacles() {
        if (!this.group || this.isDead) return;

        const myPos = this.group.position;
        const nearbyObstacles = this.spatialGrid 
            ? this.spatialGrid.getNearby(myPos.x, myPos.z)
            : (this.obstacles || []);

        for (let i = 0; i < nearbyObstacles.length; i++) {
            const obstacle = nearbyObstacles[i];
            if (obstacle === this || obstacle.isDestroyed) continue;

            const obsPos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
            if (!obsPos) continue;

            const obsRadius = obstacle.radius || 1.2;
            const dx = myPos.x - obsPos.x;
            const dz = myPos.z - obsPos.z;
            const distSq = dx * dx + dz * dz;
            const minDist = this.radius + obsRadius;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;

                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        const mapLimit = 480;
        myPos.x = THREE.MathUtils.clamp(myPos.x, -mapLimit, mapLimit);
        myPos.z = THREE.MathUtils.clamp(myPos.z, -mapLimit, mapLimit);
    }

    checkDetection(player, allAnimals = []) {
        if (this.isDead) return false;

        const myPos = this.group.position;

        // 1. Check Player Threat
        if (player && player.controls && player.health > 0) {
            const playerPos = player.controls.getObject().position;
            const dist = myPos.distanceTo(playerPos);
            const threshold = player.isSprinting ? this.detectionDistance * 1.3 : this.proximityDistance;
            if (dist <= threshold) {
                this.activeThreat = player;
                this.activeThreatPos.copy(playerPos);
                return true;
            }
        }

        // 2. Check Predators (Wolves, Grizzly Bears, Black Bears)
        const predators = ['wolf', 'grizzlybear', 'blackbear'];
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(myPos.x, myPos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDead || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (predators.includes(entityType)) {
                const predPos = entity.group ? entity.group.position : entity.position;
                if (!predPos) continue;

                if (myPos.distanceTo(predPos) <= this.detectionDistance) {
                    this.activeThreat = entity;
                    this.activeThreatPos.copy(predPos);
                    return true;
                }
            }
        }

        return false;
    }

    getThreatPosition() {
        if (this.activeThreat) {
            if (this.activeThreat.controls) {
                return this.activeThreat.controls.getObject().position;
            } else if (this.activeThreat.group) {
                return this.activeThreat.group.position;
            }
        }
        return this.activeThreatPos;
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;
        this.hp -= damage;
        if (attacker) {
            this.activeThreat = attacker;
        }

        if (this.hp <= 0) {
            this.die();
        } else {
            this.state = 'FLEE';
            this.fleeTimer = 8;
        }
    }

    die() {
        if (this.isDead || this.isDestroyed) return;
        this.isDead = true;

        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
        if (this.spatialGrid) {
            this.spatialGrid.remove(this);
        }

        this.group.rotation.z = Math.PI / 2;
        if (this.legs) {
            for (const leg of Object.values(this.legs)) {
                leg.rotation.x = 0;
            }
        }
    }

    harvest(player) {
        if (!this.isDead || this.isDestroyed) return;

        this.harvestHits--;

        if (player && player.inventory) {
            player.inventory.addItem('Raw Meat', this.meatPerHit, '🥩');
            player.inventory.addItem('Deer Fur', this.furPerHit, '🧥');
            player.inventory.addItem('Animal Fat', this.fatPerHit, '🧈');
        }

        this.group.scale.multiplyScalar(0.9);

        if (this.harvestHits <= 0) {
            this.destroy();
        }
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
        if (this.obstacles) {
            const idx = this.obstacles.indexOf(this);
            if (idx !== -1) this.obstacles.splice(idx, 1);
        }
        if (this.spatialGrid) {
            this.spatialGrid.remove(this);
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const pos = this.group.position;

        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(pos.x, pos.z, this.iceHoles)
                : this.environment.getTerrainHeight(pos.x, pos.z);

            if (this.isDead) {
                pos.y = surfaceY + 0.4;
                return;
            }

            const waterLevel = this.environment.waterLevel ?? -5.0;
            const swimDepth = 1.3;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.4) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            pos.y = THREE.MathUtils.lerp(pos.y, targetY, 0.15);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        if (this.checkDetection(player, allAnimals) && this.state !== 'FLEE') {
            this.state = 'FLEE';
            this.fleeTimer = 9;
        }

        const speedMult = this.isSwimming ? 0.45 : 1.0;

        if (this.state === 'FLEE') {
            this.fleeTimer -= safeDelta;
            const threatPos = this.getThreatPosition();
            const dirAway = pos.clone().sub(threatPos);
            dirAway.y = 0;
            dirAway.normalize();

            pos.x += dirAway.x * this.runSpeed * speedMult * safeDelta;
            pos.z += dirAway.z * this.runSpeed * speedMult * safeDelta;

            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dirAway.x, dirAway.z), 0.2);
            this.tailMesh.rotation.x = 1.2;

            const distToThreat = pos.distanceTo(threatPos);
            if (this.fleeTimer <= 0 || distToThreat > 60) {
                this.activeThreat = null;
                this.state = 'IDLE';
                this.idleTimer = 2.0;
                this.tailMesh.rotation.x = 0;
            }
        } else if (this.state === 'ROAM') {
            this.roamTimer -= safeDelta;
            const dir = this.targetPosition.clone().sub(pos);
            dir.y = 0;
            if (dir.length() < 1.0 || this.roamTimer <= 0) {
                this.state = 'IDLE';
                this.idleTimer = 3 + Math.random() * 4;
            } else {
                dir.normalize();
                pos.x += dir.x * this.baseSpeed * speedMult * safeDelta;
                pos.z += dir.z * this.baseSpeed * speedMult * safeDelta;
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dir.x, dir.z), 0.1);
            }
        } else if (this.state === 'IDLE') {
            this.idleTimer -= safeDelta;
            if (this.idleTimer <= 0) {
                this.pickNewTarget();
                this.state = 'ROAM';
            }
        }

        this.resolveObstacles();

        const isMoving = this.state === 'FLEE' || this.state === 'ROAM';
        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, this.isSwimming ? -0.2 : 0, 0.1);

        if (isMoving) {
            const speedFactor = this.isSwimming ? 4 : (this.state === 'FLEE' ? 14 : 6);
            const swing = Math.sin(this.animTime * speedFactor) * (this.isSwimming ? 0.3 : 0.6);
            this.legs.fl.rotation.x = swing;
            this.legs.br.rotation.x = swing;
            this.legs.fr.rotation.x = -swing;
            this.legs.bl.rotation.x = -swing;
        } else {
            for (const l of Object.values(this.legs)) l.rotation.x = 0;
        }
    }
}

export class Bird {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Stats & Harvest Setup
        this.maxHp = 10;
        this.hp = this.maxHp;
        this.radius = 0.4;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 1;

        // Vision & Threat Proximity
        this.detectionDistance = 14.0;
        this.proximityDistance = 8.0;

        // Flight Mechanics & States: 'LANDED', 'TAKING_OFF', 'FLYING', 'LANDING'
        this.state = 'LANDED';
        this.altitude = 18.0 + Math.random() * 10;
        this.flyTimer = 0;
        this.flightSpeed = 12.0;

        this.animTime = Math.random() * 100;

        // Group & Mesh Setup
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
    }

    buildMesh() {
        const birdFeatherMat = new THREE.MeshPhongMaterial({ color: 0x4a5d6e, flatShading: true });
        const birdBeakMat = new THREE.MeshPhongMaterial({ color: 0xdf9432, flatShading: true });
        const birdEyeMat = new THREE.MeshPhongMaterial({ color: 0x050505, shininess: 100 });

        // Main Body
        const bodyGeo = new THREE.BoxGeometry(0.2, 0.2, 0.35);
        this.bodyMesh = new THREE.Mesh(bodyGeo, birdFeatherMat);
        this.bodyMesh.position.set(0, 0.1, 0);
        this.group.add(this.bodyMesh);

        // Head & Beak
        const headGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
        const head = new THREE.Mesh(headGeo, birdFeatherMat);
        head.position.set(0, 0.1, 0.2);

        const beakGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
        const beak = new THREE.Mesh(beakGeo, birdBeakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0, 0.12);
        head.add(beak);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const leftEye = new THREE.Mesh(eyeGeo, birdEyeMat);
        leftEye.position.set(0.09, 0.03, 0.04);
        const rightEye = new THREE.Mesh(eyeGeo, birdEyeMat);
        rightEye.position.set(-0.09, 0.03, 0.04);
        head.add(leftEye, rightEye);

        this.bodyMesh.add(head);

        // Wings
        const wingGeo = new THREE.BoxGeometry(0.4, 0.04, 0.2);
        this.leftWing = new THREE.Mesh(wingGeo, birdFeatherMat);
        this.leftWing.position.set(0.22, 0.05, 0);

        this.rightWing = new THREE.Mesh(wingGeo, birdFeatherMat);
        this.rightWing.position.set(-0.22, 0.05, 0);

        this.bodyMesh.add(this.leftWing, this.rightWing);

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = { type: 'bird', bird: this };
            }
        });
    }

    checkDetection(player, allAnimals = []) {
        if (this.isDead || this.state !== 'LANDED') return false;

        const pos = this.group.position;

        // 1. Check Player Proximity
        if (player && player.controls && player.health > 0) {
            const playerPos = player.controls.getObject().position;
            if (pos.distanceTo(playerPos) < this.detectionDistance) {
                return true;
            }
        }

        // 2. Check Nearby Ground Predators (Bears, Wolves, Foxes)
        const predators = ['wolf', 'grizzlybear', 'blackbear', 'fox'];
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(pos.x, pos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDead || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (predators.includes(entityType)) {
                const predPos = entity.group ? entity.group.position : entity.position;
                if (predPos && pos.distanceTo(predPos) < this.proximityDistance) {
                    return true;
                }
            }
        }

        return false;
    }

    hit(damage) {
        if (this.isDestroyed || this.isDead) return;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.die();
        } else {
            this.takeOff();
        }
    }

    takeOff() {
        if (this.state === 'FLYING' || this.state === 'TAKING_OFF' || this.isDead) return;
        this.state = 'TAKING_OFF';
        this.flyTimer = 10 + Math.random() * 10;
    }

    die() {
        if (this.isDead || this.isDestroyed) return;
        this.isDead = true;
        this.group.rotation.z = Math.PI / 2;
    }

    harvest(player) {
        if (!this.isDead || this.isDestroyed) return;

        this.harvestHits--;

        if (player && player.inventory) {
            player.inventory.addItem('Raw Meat', 1, '🥩');
            player.inventory.addItem('Feather', 2, '🪶');
        }

        this.group.scale.multiplyScalar(0.8);

        if (this.harvestHits <= 0) {
            this.destroy();
        }
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
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const pos = this.group.position;
        const surfaceY = typeof this.environment?.getSurfaceHeight === 'function'
            ? this.environment.getSurfaceHeight(pos.x, pos.z, this.iceHoles)
            : (this.environment ? this.environment.getTerrainHeight(pos.x, pos.z) : 0);

        if (this.isDead) {
            pos.y = surfaceY + 0.1;
            return;
        }

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        if (this.checkDetection(player, allAnimals)) {
            this.takeOff();
        }

        if (this.state === 'LANDED') {
            const waterLevel = this.environment?.waterLevel ?? -5.0;
            pos.y = Math.max(surfaceY, waterLevel) + 0.12;
            this.leftWing.rotation.z = 0;
            this.rightWing.rotation.z = 0;

            if (Math.sin(this.animTime * 3) > 0.8) {
                this.bodyMesh.rotation.x = 0.4;
            } else {
                this.bodyMesh.rotation.x = 0;
            }
        } else if (this.state === 'TAKING_OFF') {
            pos.y += 8.0 * safeDelta;
            pos.z += 6.0 * safeDelta;
            this.bodyMesh.rotation.x = -0.3;

            if (pos.y >= surfaceY + this.altitude) {
                this.state = 'FLYING';
            }
        } else if (this.state === 'FLYING') {
            this.flyTimer -= safeDelta;
            const dirX = Math.cos(this.animTime * 0.5);
            const dirZ = Math.sin(this.animTime * 0.5);

            pos.x += dirX * this.flightSpeed * safeDelta;
            pos.z += dirZ * this.flightSpeed * safeDelta;

            const targetAngle = Math.atan2(dirX, dirZ);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.1);

            if (this.flyTimer <= 0) {
                const landingSurfaceY = typeof this.environment?.getSurfaceHeight === 'function'
                    ? this.environment.getSurfaceHeight(pos.x, pos.z, this.iceHoles)
                    : (this.environment ? this.environment.getTerrainHeight(pos.x, pos.z) : 0);
                const waterLevel = this.environment?.waterLevel ?? -5.0;
                
                // Only land on ground above water level
                if (landingSurfaceY > waterLevel + 0.5) {
                    this.state = 'LANDING';
                } else {
                    this.flyTimer = 5.0; // Keep flying if over water
                }
            }
        } else if (this.state === 'LANDING') {
            pos.y -= 6.0 * safeDelta;
            this.bodyMesh.rotation.x = 0.2;

            if (pos.y <= surfaceY + 0.15) {
                this.state = 'LANDED';
            }
        }

        if (this.state !== 'LANDED') {
            const flap = Math.sin(this.animTime * 22) * 0.7;
            this.leftWing.rotation.z = flap;
            this.rightWing.rotation.z = -flap;
        }
    }
}


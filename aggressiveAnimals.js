import * as THREE from 'three';


export class BlackBear {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Bear Stats
        this.maxHp = 120;
        this.hp = this.maxHp;
        this.attackStrength = 20;
        this.radius = 1.1;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 4;
        this.meatPerHit = 2;
        this.furPerHit = 1;
        this.fatPerHit = 2;

        // Ecosystem & Hunger Mechanics
        this.maxHunger = 100;
        this.hunger = 35 + Math.random() * 45;
        this.hungerRate = 1.0;
        this.targetPrey = null;
        this.activeThreat = null;
        this.activeThreatPos = new THREE.Vector3();
        this.eatTimer = 0;

        // Vision, Hearing & Scent Detection Setup
        this.detectionDistance = 35.0;
        this.proximityDistance = 12.0;
        this.detectionAngle = Math.PI * 0.75;

        // Speeds
        this.baseSpeed = 3.5;
        this.runSpeed = 11.0;
        this.attackRange = 2.5;

        // AI States: 'ROAM', 'IDLE', 'FLEE', 'BLUFF_CHARGE', 'ATTACK', 'HUNT', 'EAT'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;
        this.attackTimer = 0;

        // Bluff charge state tracking ('CHARGE' -> 'PAUSE')
        this.bluffStage = 'CHARGE';
        this.bluffTimer = 0;

        // Animation & Status Flags
        this.animTime = Math.random() * 100;
        this.isSwimming = false;
        this.isStriking = false;
        this.slashAnimProgress = 0;

        // Group & Mesh Setup
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildBearMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewRoamTarget();
    }

    buildBearMesh() {
        const furMat = new THREE.MeshPhongMaterial({ color: 0x1c1b1a, flatShading: true });
        const darkFurMat = new THREE.MeshPhongMaterial({ color: 0x121110, flatShading: true });
        const muzzleMat = new THREE.MeshPhongMaterial({ color: 0x6e5239, flatShading: true });
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x050505, flatShading: true, shininess: 80 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 100 });
        const clawMat = new THREE.MeshPhongMaterial({ color: 0x333333, flatShading: true });
        const earInnerMat = new THREE.MeshPhongMaterial({ color: 0x3b2a20, flatShading: true });

        // Main Torso Body
        const bodyGeo = new THREE.BoxGeometry(1.3, 1.2, 2.2);
        this.bodyMesh = new THREE.Mesh(bodyGeo, furMat);
        this.bodyMesh.position.set(0, 1.1, 0);
        this.group.add(this.bodyMesh);

        // Shoulder Hump
        const humpGeo = new THREE.BoxGeometry(1.2, 0.55, 0.95);
        const humpMesh = new THREE.Mesh(humpGeo, darkFurMat);
        humpMesh.position.set(0, 0.7, 0.4);
        this.bodyMesh.add(humpMesh);

        // Rear / Rump
        const rumpGeo = new THREE.BoxGeometry(1.25, 1.0, 0.8);
        const rumpMesh = new THREE.Mesh(rumpGeo, furMat);
        rumpMesh.position.set(0, -0.05, -1.1);
        this.bodyMesh.add(rumpMesh);

        // Head Group
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.35, 1.25);
        this.bodyMesh.add(this.headGroup);

        // Head Base
        const headGeo = new THREE.BoxGeometry(0.85, 0.75, 0.85);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        this.headGroup.add(headMesh);

        // Snout / Muzzle
        const muzzleGeo = new THREE.BoxGeometry(0.52, 0.45, 0.6);
        const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
        muzzleMesh.position.set(0, -0.1, 0.6);
        this.headGroup.add(muzzleMesh);

        // Nose Tip
        const noseGeo = new THREE.BoxGeometry(0.22, 0.16, 0.16);
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.position.set(0, 0.12, 0.32);
        muzzleMesh.add(noseMesh);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.41, 0.18, 0.18);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.41, 0.18, 0.18);
        this.headGroup.add(leftEye, rightEye);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.22, 0.24, 0.12);
        const innerEarGeo = new THREE.BoxGeometry(0.14, 0.16, 0.08);

        const leftEar = new THREE.Mesh(earGeo, furMat);
        leftEar.position.set(0.38, 0.42, -0.15);
        leftEar.rotation.z = -0.2;
        const leftInnerEar = new THREE.Mesh(innerEarGeo, earInnerMat);
        leftInnerEar.position.set(0, 0, 0.03);
        leftEar.add(leftInnerEar);

        const rightEar = new THREE.Mesh(earGeo, furMat);
        rightEar.position.set(-0.38, 0.42, -0.15);
        rightEar.rotation.z = 0.2;
        const rightInnerEar = new THREE.Mesh(innerEarGeo, earInnerMat);
        rightInnerEar.position.set(0, 0, 0.03);
        rightEar.add(rightInnerEar);

        this.headGroup.add(leftEar, rightEar);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const tailMesh = new THREE.Mesh(tailGeo, furMat);
        tailMesh.position.set(0, 0.2, -1.55);
        this.bodyMesh.add(tailMesh);

        // Four Legs with Paw Pointers
        const legGeo = new THREE.BoxGeometry(0.38, 0.85, 0.42);
        const pawGeo = new THREE.BoxGeometry(0.42, 0.2, 0.52);

        this.legs = {};
        const legPositions = {
            frontLeft: [0.48, -0.6, 0.75],
            frontRight: [-0.48, -0.6, 0.75],
            backLeft: [0.5, -0.6, -0.75],
            backRight: [-0.5, -0.6, -0.75]
        };

        for (const [key, pos] of Object.entries(legPositions)) {
            const pivot = new THREE.Group();
            pivot.position.set(...pos);

            const legMesh = new THREE.Mesh(legGeo, darkFurMat);
            legMesh.position.set(0, -0.35, 0);
            pivot.add(legMesh);

            const pawMesh = new THREE.Mesh(pawGeo, clawMat);
            pawMesh.position.set(0, -0.4, 0.05);
            legMesh.add(pawMesh);

            this.bodyMesh.add(pivot);
            this.legs[key] = pivot;
        }

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'blackBear',
                    bear: this
                };
            }
        });
    }

    pickNewRoamTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 30;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 8 + Math.random() * 10;
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

        const bearPos = this.group.position;

        // 1. Scan for Apex Predators (Grizzly Bear) - Black Bears always avoid Grizzly Bears
        const apexPredators = ['grizzlybear'];
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(bearPos.x, bearPos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDead || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (apexPredators.includes(entityType)) {
                const predPos = entity.group ? entity.group.position : entity.position;
                if (!predPos) continue;

                if (bearPos.distanceTo(predPos) <= this.detectionDistance) {
                    this.activeThreat = entity;
                    this.activeThreatPos.copy(predPos);
                    return true;
                }
            }
        }

        // 2. Player Proximity & Vision Cone Check
        if (player && player.controls && player.health > 0) {
            const playerPos = player.controls.getObject().position;
            const dist = bearPos.distanceTo(playerPos);

            let detected = false;
            if (dist <= this.proximityDistance) {
                detected = true;
            } else if (dist <= this.detectionDistance) {
                const dirToPlayer = playerPos.clone().sub(bearPos);
                dirToPlayer.y = 0;
                dirToPlayer.normalize();

                const bearForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
                const angle = bearForward.angleTo(dirToPlayer);

                if (angle <= (this.detectionAngle / 2)) {
                    detected = true;
                }
            }

            if (detected) {
                this.activeThreat = player;
                this.activeThreatPos.copy(playerPos);
                return true;
            }
        }

        return false;
    }

    findPreyTarget(allAnimals = []) {
        const bearPos = this.group.position;
        let closestPrey = null;
        let minDistSq = this.detectionDistance * this.detectionDistance;

        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(bearPos.x, bearPos.z)
            : allAnimals;

        // Black bear prey targets: Deer, Rabbit, or dead animal carcasses
        const preyTypes = ['deer', 'rabbit'];

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (preyTypes.includes(entityType) || entity.isDead) {
                const preyPos = entity.group ? entity.group.position : entity.position;
                if (!preyPos) continue;

                const distSq = bearPos.distanceToSquared(preyPos);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestPrey = entity;
                }
            }
        }

        return closestPrey;
    }

    triggerReaction(threat) {
        if (this.isDead) return;
        this.activeThreat = threat;

        // Black bears are generally skittish and lean toward fleeing or bluff charging
        const threatType = threat?.userData?.type || threat?.constructor?.name?.toLowerCase();
        if (threatType === 'grizzlybear') {
            this.state = 'FLEE';
            this.fleeTimer = 10 + Math.random() * 5;
            return;
        }

        const rand = Math.random();
        if (rand < 0.60) {
            this.state = 'FLEE';
            this.fleeTimer = 8 + Math.random() * 4;
        } else if (rand < 0.85) {
            this.state = 'BLUFF_CHARGE';
            this.bluffStage = 'CHARGE';
            this.bluffTimer = 0;
        } else {
            this.state = 'ATTACK';
            this.attackTimer = 0;
        }
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;

        this.hp -= damage;

        this.group.scale.set(0.92, 0.92, 0.92);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.hp <= 0) {
            this.die();
        } else {
            if (attacker) {
                this.activeThreat = attacker;
            }

            if (this.hp < this.maxHp * 0.35) {
                this.state = 'FLEE';
                this.fleeTimer = 10;
            } else if (this.state === 'ROAM' || this.state === 'IDLE' || this.state === 'BLUFF_CHARGE' || this.state === 'HUNT') {
                this.triggerReaction(attacker || this.activeThreat);
            }
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

        // Lay animal down on its side
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
            player.inventory.addItem('Bear Fur', this.furPerHit, '🧥');
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

    updateAI(delta, player, allAnimals = []) {
        if (this.isDead) return;

        const bearPos = this.group.position;

        // Deplete hunger over time
        this.hunger = Math.max(0, this.hunger - this.hungerRate * delta);

        switch (this.state) {
            case 'ROAM': {
                this.roamTimer -= delta;

                if (this.checkDetection(player, allAnimals)) {
                    this.triggerReaction(this.activeThreat);
                    break;
                }

                // Hunt small prey or scavenge when hungry (< 60)
                if (this.hunger < 60) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                const dir = this.targetPosition.clone().sub(bearPos);
                dir.y = 0;
                const distToTarget = dir.length();

                if (distToTarget < 2.0 || this.roamTimer <= 0) {
                    this.state = 'IDLE';
                    this.idleTimer = 1.5 + Math.random() * 2.5;
                } else {
                    dir.normalize();
                    const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dir.x * moveSpeed * delta;
                    bearPos.z += dir.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dir.x, dir.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.1);
                }
                break;
            }

            case 'IDLE': {
                this.idleTimer -= delta;

                if (this.checkDetection(player, allAnimals)) {
                    this.triggerReaction(this.activeThreat);
                    break;
                }

                if (this.hunger < 60) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                if (this.idleTimer <= 0) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'HUNT': {
                if (this.checkDetection(player, allAnimals)) {
                    this.triggerReaction(this.activeThreat);
                    break;
                }

                if (!this.targetPrey || this.targetPrey.isDestroyed) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    break;
                }

                const preyPos = this.targetPrey.group.position;
                const distToPrey = bearPos.distanceTo(preyPos);

                if (this.targetPrey.isDead) {
                    if (distToPrey <= this.attackRange) {
                        this.state = 'EAT';
                        this.eatTimer = 3.5;
                    } else {
                        const dir = preyPos.clone().sub(bearPos);
                        dir.y = 0;
                        dir.normalize();
                        const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                        bearPos.x += dir.x * moveSpeed * delta;
                        bearPos.z += dir.z * moveSpeed * delta;
                        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dir.x, dir.z), 0.15);
                    }
                    break;
                }

                const dirToPrey = preyPos.clone().sub(bearPos);
                dirToPrey.y = 0;
                dirToPrey.normalize();
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dirToPrey.x, dirToPrey.z), 0.2);

                this.attackTimer -= delta;

                if (distToPrey > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToPrey.x * moveSpeed * delta;
                    bearPos.z += dirToPrey.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        if (typeof this.targetPrey.hit === 'function') {
                            this.targetPrey.hit(this.attackStrength, this);
                        }
                        this.slashAnimProgress = 1.0;
                        this.attackTimer = 1.2;
                    }
                }

                if (distToPrey > 50) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }

            case 'EAT': {
                this.eatTimer -= delta;
                this.hunger = Math.min(this.maxHunger, this.hunger + 30.0 * delta);

                if (this.eatTimer <= 0 || this.hunger >= this.maxHunger) {
                    if (this.targetPrey && typeof this.targetPrey.destroy === 'function') {
                        this.targetPrey.destroy();
                    }
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'FLEE': {
                this.fleeTimer -= delta;

                const threatPos = this.getThreatPosition();
                const dirAway = bearPos.clone().sub(threatPos);
                dirAway.y = 0;
                dirAway.normalize();

                const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                bearPos.x += dirAway.x * moveSpeed * delta;
                bearPos.z += dirAway.z * moveSpeed * delta;

                const targetAngle = Math.atan2(dirAway.x, dirAway.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.15);

                const distToThreat = bearPos.distanceTo(threatPos);
                if (this.fleeTimer <= 0 || distToThreat > 55) {
                    this.activeThreat = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'BLUFF_CHARGE': {
                const threatPos = this.getThreatPosition();
                const distToThreat = bearPos.distanceTo(threatPos);

                if (this.bluffStage === 'CHARGE') {
                    const dirToThreat = threatPos.clone().sub(bearPos);
                    dirToThreat.y = 0;
                    dirToThreat.normalize();

                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToThreat.x * moveSpeed * delta;
                    bearPos.z += dirToThreat.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                    if (distToThreat <= 6.5) {
                        this.bluffStage = 'PAUSE';
                        this.bluffTimer = 2.2;
                    }
                } else if (this.bluffStage === 'PAUSE') {
                    this.bluffTimer -= delta;

                    const dirToThreat = threatPos.clone().sub(bearPos);
                    dirToThreat.y = 0;
                    const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.1);

                    if (this.bluffTimer <= 0) {
                        if (Math.random() < 0.70) {
                            this.state = 'FLEE';
                            this.fleeTimer = 8;
                        } else {
                            this.activeThreat = null;
                            this.pickNewRoamTarget();
                            this.state = 'ROAM';
                        }
                    }
                }
                break;
            }

            case 'ATTACK': {
                const threatPos = this.getThreatPosition();
                const distToThreat = bearPos.distanceTo(threatPos);

                const dirToThreat = threatPos.clone().sub(bearPos);
                dirToThreat.y = 0;
                dirToThreat.normalize();

                const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                this.attackTimer -= delta;

                if (distToThreat > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToThreat.x * moveSpeed * delta;
                    bearPos.z += dirToThreat.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        if (this.activeThreat && typeof this.activeThreat.takeDamage === 'function') {
                            this.activeThreat.takeDamage(this.attackStrength);
                        } else if (this.activeThreat && typeof this.activeThreat.hit === 'function') {
                            this.activeThreat.hit(this.attackStrength, this);
                        }

                        this.slashAnimProgress = 1.0;
                        this.attackTimer = 1.2;
                    }
                }

                if (distToThreat > 50 || (this.activeThreat && this.activeThreat.isDead)) {
                    this.activeThreat = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }
        }
    }

    animateMesh(delta) {
        if (!this.legs || this.isDead) return;

        let moveSpeed = 0;
        if (this.state === 'ROAM') moveSpeed = 3.5;
        else if (this.state === 'FLEE' || this.state === 'HUNT' || (this.state === 'ATTACK' && !this.isStriking) || (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'CHARGE')) {
            moveSpeed = 11.0;
        }

        if (this.isSwimming) moveSpeed *= 0.5;

        let targetBodyPitch = this.isSwimming ? -0.25 : ((this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') ? -0.35 : 0);
        
        if (this.slashAnimProgress > 0) {
            targetBodyPitch = -0.7 * Math.sin(this.slashAnimProgress * Math.PI);
            this.slashAnimProgress = Math.max(0, this.slashAnimProgress - delta * 2.5);
        }

        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetBodyPitch, 0.1);

        if (this.state === 'EAT' && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.45, 0.1);
        } else if (this.isSwimming && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.20, 0.1);
        }

        if (moveSpeed > 0.1 && this.slashAnimProgress === 0) {
            const freq = this.isSwimming ? 4.0 : moveSpeed * 1.5;
            const swing = Math.sin(this.animTime * freq) * (this.isSwimming ? 0.25 : 0.45);

            this.legs.frontLeft.rotation.x = swing;
            this.legs.backRight.rotation.x = swing;
            this.legs.frontRight.rotation.x = -swing;
            this.legs.backLeft.rotation.x = -swing;

            if (this.headGroup) {
                this.headGroup.rotation.y = Math.sin(this.animTime * freq * 0.5) * 0.08;
                if (!this.isSwimming && this.state !== 'EAT') {
                    this.headGroup.rotation.x = Math.cos(this.animTime * freq) * 0.05;
                }
            }
        } else {
            if (this.slashAnimProgress > 0) {
                const swipe = Math.sin(this.slashAnimProgress * Math.PI * 6) * 0.8;
                this.legs.frontLeft.rotation.x = -0.5 + swipe;
                this.legs.frontRight.rotation.x = -0.5 - swipe;
                
                this.legs.backLeft.rotation.x = THREE.MathUtils.lerp(this.legs.backLeft.rotation.x, 0.2, 0.2);
                this.legs.backRight.rotation.x = THREE.MathUtils.lerp(this.legs.backRight.rotation.x, 0.2, 0.2);
            } else {
                for (const leg of Object.values(this.legs)) {
                    leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 0.1);
                }
            }

            if (this.headGroup && this.slashAnimProgress === 0 && this.state !== 'EAT') {
                if (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') {
                    this.headGroup.rotation.y = Math.sin(this.animTime * 14.0) * 0.15;
                } else if (!this.isSwimming) {
                    this.headGroup.rotation.set(0, 0, 0);
                }
            }
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const bearPos = this.group.position;
        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(bearPos.x, bearPos.z, this.iceHoles)
                : this.environment.getTerrainHeight(bearPos.x, bearPos.z);

            if (this.isDead) {
                bearPos.y = surfaceY + 0.5;
                return;
            }

            const waterLevel = -5.0;
            const swimDepth = 1.55;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.5) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            bearPos.y = THREE.MathUtils.lerp(bearPos.y, targetY, 0.15);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        this.updateAI(safeDelta, player, allAnimals);
        this.resolveObstacles();
        this.animateMesh(safeDelta);
    }
}

export class GrizzlyBear {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Grizzly Bear Stats
        this.maxHp = 260;
        this.hp = this.maxHp;
        this.attackStrength = 38;
        this.radius = 1.6;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 5;
        this.meatPerHit = 2;
        this.furPerHit = 2;
        this.fatPerHit = 3;

        // Ecosystem & Hunger Mechanics
        this.maxHunger = 100;
        this.hunger = 40 + Math.random() * 40; // Starts with random hunger level
        this.hungerRate = 1.2; // Depletes over time
        this.targetPrey = null;
        this.eatTimer = 0;

        // Detection Setup
        this.detectionDistance = 42.0;
        this.proximityDistance = 16.0;
        this.detectionAngle = Math.PI * 0.85;

        // Speeds & Range
        this.baseSpeed = 3.8;
        this.runSpeed = 12.0;
        this.attackRange = 3.0;

        // AI States: 'ROAM', 'IDLE', 'FLEE', 'BLUFF_CHARGE', 'ATTACK', 'HUNT', 'EAT'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;
        this.attackTimer = 0;

        this.bluffStage = 'CHARGE';
        this.bluffTimer = 0;

        this.animTime = Math.random() * 100;
        this.isSwimming = false;
        this.isStriking = false;
        this.slashAnimProgress = 0;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildBearMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewRoamTarget();
    }

    buildBearMesh() {
        const mainFurMat = new THREE.MeshPhongMaterial({ color: 0x4a3222, flatShading: true });
        const darkFurMat = new THREE.MeshPhongMaterial({ color: 0x322014, flatShading: true });
        const grizzledHumpMat = new THREE.MeshPhongMaterial({ color: 0x6e5239, flatShading: true });
        const muzzleMat = new THREE.MeshPhongMaterial({ color: 0x8a6d4d, flatShading: true });
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x080808, flatShading: true, shininess: 90 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x050505, shininess: 100 });
        const clawMat = new THREE.MeshPhongMaterial({ color: 0xc2b8a3, flatShading: true, shininess: 30 });
        const earInnerMat = new THREE.MeshPhongMaterial({ color: 0x543a29, flatShading: true });

        // Body
        const bodyGeo = new THREE.BoxGeometry(1.75, 1.6, 2.8);
        this.bodyMesh = new THREE.Mesh(bodyGeo, mainFurMat);
        this.bodyMesh.position.set(0, 1.5, 0);
        this.group.add(this.bodyMesh);

        // Hump
        const humpGeo = new THREE.BoxGeometry(1.65, 0.9, 1.35);
        const humpMesh = new THREE.Mesh(humpGeo, grizzledHumpMat);
        humpMesh.position.set(0, 0.95, 0.5);
        this.bodyMesh.add(humpMesh);

        // Rump
        const rumpGeo = new THREE.BoxGeometry(1.7, 1.4, 1.1);
        const rumpMesh = new THREE.Mesh(rumpGeo, darkFurMat);
        rumpMesh.position.set(0, -0.1, -1.4);
        this.bodyMesh.add(rumpMesh);

        // Head Group
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.45, 1.6);
        this.bodyMesh.add(this.headGroup);

        const headGeo = new THREE.BoxGeometry(1.2, 1.0, 1.1);
        const headMesh = new THREE.Mesh(headGeo, mainFurMat);
        this.headGroup.add(headMesh);

        const muzzleGeo = new THREE.BoxGeometry(0.7, 0.58, 0.8);
        const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
        muzzleMesh.position.set(0, -0.15, 0.75);
        this.headGroup.add(muzzleMesh);

        const noseGeo = new THREE.BoxGeometry(0.28, 0.2, 0.22);
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.position.set(0, 0.15, 0.42);
        muzzleMesh.add(noseMesh);

        const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.58, 0.22, 0.25);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.58, 0.22, 0.25);
        this.headGroup.add(leftEye, rightEye);

        const earGeo = new THREE.BoxGeometry(0.28, 0.3, 0.15);
        const innerEarGeo = new THREE.BoxGeometry(0.18, 0.2, 0.09);

        const leftEar = new THREE.Mesh(earGeo, mainFurMat);
        leftEar.position.set(0.52, 0.55, -0.2);
        leftEar.rotation.z = -0.25;
        const leftInnerEar = new THREE.Mesh(innerEarGeo, earInnerMat);
        leftInnerEar.position.set(0, 0, 0.04);
        leftEar.add(leftInnerEar);

        const rightEar = new THREE.Mesh(earGeo, mainFurMat);
        rightEar.position.set(-0.52, 0.55, -0.2);
        rightEar.rotation.z = 0.25;
        const rightInnerEar = new THREE.Mesh(innerEarGeo, earInnerMat);
        rightInnerEar.position.set(0, 0, 0.04);
        rightEar.add(rightInnerEar);

        this.headGroup.add(leftEar, rightEar);

        const tailGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const tailMesh = new THREE.Mesh(tailGeo, darkFurMat);
        tailMesh.position.set(0, 0.25, -1.95);
        this.bodyMesh.add(tailMesh);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.52, 1.1, 0.56);
        const pawGeo = new THREE.BoxGeometry(0.58, 0.25, 0.7);
        const clawGeo = new THREE.BoxGeometry(0.1, 0.06, 0.25);

        this.legs = {};
        const legPositions = {
            frontLeft: [0.65, -0.85, 0.95],
            frontRight: [-0.65, -0.85, 0.95],
            backLeft: [0.68, -0.85, -0.95],
            backRight: [-0.68, -0.85, -0.95]
        };

        for (const [key, pos] of Object.entries(legPositions)) {
            const pivot = new THREE.Group();
            pivot.position.set(...pos);

            const legMesh = new THREE.Mesh(legGeo, darkFurMat);
            legMesh.position.set(0, -0.45, 0);
            pivot.add(legMesh);

            const pawMesh = new THREE.Mesh(pawGeo, mainFurMat);
            pawMesh.position.set(0, -0.5, 0.08);
            legMesh.add(pawMesh);

            if (key.startsWith('front')) {
                for (let c = -2; c <= 2; c++) {
                    const claw = new THREE.Mesh(clawGeo, clawMat);
                    claw.position.set(c * 0.1, -0.06, 0.4);
                    claw.rotation.x = 0.3;
                    pawMesh.add(claw);
                }
            }

            this.bodyMesh.add(pivot);
            this.legs[key] = pivot;
        }

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'grizzlyBear',
                    bear: this
                };
            }
        });
    }

    pickNewRoamTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 35;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 10 + Math.random() * 12;
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

    checkDetection(player) {
        if (!player || player.health <= 0 || this.isDead) return false;

        const playerPos = player.controls.getObject().position;
        const bearPos = this.group.position;

        const dist = bearPos.distanceTo(playerPos);

        if (dist <= this.proximityDistance) return true;
        if (dist > this.detectionDistance) return false;

        const dirToPlayer = playerPos.clone().sub(bearPos);
        dirToPlayer.y = 0;
        dirToPlayer.normalize();

        const bearForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        const angle = bearForward.angleTo(dirToPlayer);

        return angle <= (this.detectionAngle / 2);
    }

    findPreyTarget(allAnimals = []) {
        const bearPos = this.group.position;
        let closestPrey = null;
        let minDistSq = this.detectionDistance * this.detectionDistance;

        // Query spatial grid for nearby targets or fall back to full array
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(bearPos.x, bearPos.z)
            : allAnimals;

        // Apex predator target list: Moose, Deer, Wolf, Rabbit, Black Bear
        const preyTypes = ['moose', 'deer', 'wolf', 'rabbit', 'blackbear'];

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (preyTypes.includes(entityType)) {
                const preyPos = entity.group ? entity.group.position : entity.position;
                if (!preyPos) continue;

                const distSq = bearPos.distanceToSquared(preyPos);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestPrey = entity;
                }
            }
        }

        return closestPrey;
    }

    triggerReaction(player) {
        if (this.isDead) return;
        const rand = Math.random();

        if (rand < 0.70) {
            this.state = 'ATTACK';
            this.attackTimer = 0;
        } else if (rand < 0.90) {
            this.state = 'BLUFF_CHARGE';
            this.bluffStage = 'CHARGE';
            this.bluffTimer = 0;
        } else {
            this.state = 'FLEE';
            this.fleeTimer = 8 + Math.random() * 4;
        }
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;

        this.hp -= damage;

        this.group.scale.set(0.94, 0.94, 0.94);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.hp <= 0) {
            this.die();
        } else {
            if (this.hp < this.maxHp * 0.15) {
                this.state = 'FLEE';
                this.fleeTimer = 10;
            } else if (this.state === 'ROAM' || this.state === 'IDLE' || this.state === 'BLUFF_CHARGE' || this.state === 'HUNT') {
                if (attacker) {
                    this.triggerReaction(attacker);
                }
            }
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
            player.inventory.addItem('Grizzly Fur', this.furPerHit, '🧥');
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

    updateAI(delta, player, allAnimals = []) {
        if (this.isDead) return;

        const bearPos = this.group.position;
        const playerPos = player ? player.controls.getObject().position : null;
        const distToPlayer = playerPos ? bearPos.distanceTo(playerPos) : Infinity;

        // Deplete hunger over time
        this.hunger = Math.max(0, this.hunger - this.hungerRate * delta);

        switch (this.state) {
            case 'ROAM': {
                this.roamTimer -= delta;

                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                // Hunt prey when hungry (< 65)
                if (this.hunger < 65) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                const dir = this.targetPosition.clone().sub(bearPos);
                dir.y = 0;
                const distToTarget = dir.length();

                if (distToTarget < 2.0 || this.roamTimer <= 0) {
                    this.state = 'IDLE';
                    this.idleTimer = 1.5 + Math.random() * 2.5;
                } else {
                    dir.normalize();
                    const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dir.x * moveSpeed * delta;
                    bearPos.z += dir.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dir.x, dir.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.1);
                }
                break;
            }

            case 'IDLE': {
                this.idleTimer -= delta;

                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                if (this.hunger < 65) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                if (this.idleTimer <= 0) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'HUNT': {
                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                if (!this.targetPrey || this.targetPrey.isDestroyed) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    break;
                }

                const preyPos = this.targetPrey.group.position;
                const distToPrey = bearPos.distanceTo(preyPos);

                if (this.targetPrey.isDead) {
                    if (distToPrey <= this.attackRange) {
                        this.state = 'EAT';
                        this.eatTimer = 4.0;
                    } else {
                        const dir = preyPos.clone().sub(bearPos);
                        dir.y = 0;
                        dir.normalize();
                        const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                        bearPos.x += dir.x * moveSpeed * delta;
                        bearPos.z += dir.z * moveSpeed * delta;
                        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dir.x, dir.z), 0.15);
                    }
                    break;
                }

                const dirToPrey = preyPos.clone().sub(bearPos);
                dirToPrey.y = 0;
                dirToPrey.normalize();
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dirToPrey.x, dirToPrey.z), 0.2);

                this.attackTimer -= delta;

                if (distToPrey > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToPrey.x * moveSpeed * delta;
                    bearPos.z += dirToPrey.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        if (typeof this.targetPrey.hit === 'function') {
                            this.targetPrey.hit(this.attackStrength, this);
                        }
                        this.slashAnimProgress = 1.0;
                        this.attackTimer = 1.1;
                    }
                }

                if (distToPrey > 60) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }

            case 'EAT': {
                this.eatTimer -= delta;
                this.hunger = Math.min(this.maxHunger, this.hunger + 35.0 * delta);

                if (this.eatTimer <= 0 || this.hunger >= this.maxHunger) {
                    if (this.targetPrey && typeof this.targetPrey.destroy === 'function') {
                        this.targetPrey.destroy();
                    }
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'FLEE': {
                this.fleeTimer -= delta;

                const dirAway = bearPos.clone().sub(playerPos);
                dirAway.y = 0;
                dirAway.normalize();

                const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                bearPos.x += dirAway.x * moveSpeed * delta;
                bearPos.z += dirAway.z * moveSpeed * delta;

                const targetAngle = Math.atan2(dirAway.x, dirAway.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.15);

                if (this.fleeTimer <= 0 || distToPlayer > 60) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'BLUFF_CHARGE': {
                if (this.bluffStage === 'CHARGE') {
                    const dirToPlayer = playerPos.clone().sub(bearPos);
                    dirToPlayer.y = 0;
                    dirToPlayer.normalize();

                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToPlayer.x * moveSpeed * delta;
                    bearPos.z += dirToPlayer.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                    if (distToPlayer <= 7.0) {
                        this.bluffStage = 'PAUSE';
                        this.bluffTimer = 1.8;
                    }
                } else if (this.bluffStage === 'PAUSE') {
                    this.bluffTimer -= delta;

                    const dirToPlayer = playerPos.clone().sub(bearPos);
                    dirToPlayer.y = 0;
                    const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.1);

                    if (this.bluffTimer <= 0) {
                        if (Math.random() < 0.60) {
                            this.state = 'ATTACK';
                            this.attackTimer = 0;
                        } else {
                            this.state = 'FLEE';
                            this.fleeTimer = 6;
                        }
                    }
                }
                break;
            }

            case 'ATTACK': {
                const dirToPlayer = playerPos.clone().sub(bearPos);
                dirToPlayer.y = 0;
                dirToPlayer.normalize();

                const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                this.attackTimer -= delta;

                if (distToPlayer > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    bearPos.x += dirToPlayer.x * moveSpeed * delta;
                    bearPos.z += dirToPlayer.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        player.takeDamage(this.attackStrength);
                        this.slashAnimProgress = 1.0;
                        this.attackTimer = 1.1;
                    }
                }

                if (distToPlayer > 60) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }
        }
    }

    animateMesh(delta) {
        if (!this.legs || this.isDead) return;

        let moveSpeed = 0;
        if (this.state === 'ROAM') moveSpeed = 3.8;
        else if (this.state === 'FLEE' || this.state === 'HUNT' || (this.state === 'ATTACK' && !this.isStriking) || (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'CHARGE')) {
            moveSpeed = 12.0;
        }

        if (this.isSwimming) moveSpeed *= 0.5;

        let targetBodyPitch = this.isSwimming ? -0.25 : ((this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') ? -0.4 : 0);
        
        if (this.slashAnimProgress > 0) {
            targetBodyPitch = -0.7 * Math.sin(this.slashAnimProgress * Math.PI);
            this.slashAnimProgress = Math.max(0, this.slashAnimProgress - delta * 2.5);
        }

        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetBodyPitch, 0.1);

        if (this.state === 'EAT' && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.5, 0.1);
        } else if (this.isSwimming && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.20, 0.1);
        }

        if (moveSpeed > 0.1 && this.slashAnimProgress === 0) {
            const freq = this.isSwimming ? 4.0 : moveSpeed * 1.4;
            const swing = Math.sin(this.animTime * freq) * (this.isSwimming ? 0.25 : 0.48);

            this.legs.frontLeft.rotation.x = swing;
            this.legs.backRight.rotation.x = swing;
            this.legs.frontRight.rotation.x = -swing;
            this.legs.backLeft.rotation.x = -swing;

            if (this.headGroup) {
                this.headGroup.rotation.y = Math.sin(this.animTime * freq * 0.5) * 0.1;
                if (!this.isSwimming && this.state !== 'EAT') {
                    this.headGroup.rotation.x = Math.cos(this.animTime * freq) * 0.06;
                }
            }
        } else {
            if (this.slashAnimProgress > 0) {
                const swipe = Math.sin(this.slashAnimProgress * Math.PI * 6) * 0.8;
                this.legs.frontLeft.rotation.x = -0.5 + swipe;
                this.legs.frontRight.rotation.x = -0.5 - swipe;
                
                this.legs.backLeft.rotation.x = THREE.MathUtils.lerp(this.legs.backLeft.rotation.x, 0.2, 0.2);
                this.legs.backRight.rotation.x = THREE.MathUtils.lerp(this.legs.backRight.rotation.x, 0.2, 0.2);
            } else {
                for (const leg of Object.values(this.legs)) {
                    leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 0.1);
                }
            }

            if (this.headGroup && this.slashAnimProgress === 0 && this.state !== 'EAT') {
                if (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') {
                    this.headGroup.rotation.y = Math.sin(this.animTime * 16.0) * 0.18;
                } else if (!this.isSwimming) {
                    this.headGroup.rotation.set(0, 0, 0);
                }
            }
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const bearPos = this.group.position;
        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(bearPos.x, bearPos.z, this.iceHoles)
                : this.environment.getTerrainHeight(bearPos.x, bearPos.z);

            if (this.isDead) {
                bearPos.y = surfaceY + 0.65;
                return;
            }

            const waterLevel = -5.0;
            const swimDepth = 2.15;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.5) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            bearPos.y = THREE.MathUtils.lerp(bearPos.y, targetY, 0.15);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        this.updateAI(safeDelta, player, allAnimals);
        this.resolveObstacles();
        this.animateMesh(safeDelta);
    }
}

export class Moose {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Moose Stats
        this.maxHp = 320;
        this.hp = this.maxHp;
        this.attackStrength = 45;
        this.radius = 1.8;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 5;
        this.meatPerHit = 3;
        this.furPerHit = 2;
        this.fatPerHit = 2;

        // Vision & Proximity Setup
        this.detectionDistance = 45.0;
        this.proximityDistance = 18.0;
        this.detectionAngle = Math.PI * 0.8;

        // Speeds & Range
        this.baseSpeed = 3.2;
        this.runSpeed = 12.5;
        this.attackRange = 3.2;

        // AI & Ecosystem Targeting
        this.activeThreat = null; // Can be player or predator entity
        this.activeThreatPos = new THREE.Vector3();

        // AI States: 'ROAM', 'IDLE', 'FLEE', 'BLUFF_CHARGE', 'ATTACK'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;
        this.attackTimer = 0;

        this.bluffStage = 'CHARGE';
        this.bluffTimer = 0;

        this.animTime = Math.random() * 100;
        this.isSwimming = false;
        this.isStriking = false;
        this.stompAnimProgress = 0;

        // Group & Mesh Setup
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildMooseMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewRoamTarget();
    }

    buildMooseMesh() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b2716, flatShading: true });
        const humpMat = new THREE.MeshPhongMaterial({ color: 0x2b1b0d, flatShading: true });
        const muzzleMat = new THREE.MeshPhongMaterial({ color: 0x211409, flatShading: true });
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x0a0604, flatShading: true, shininess: 80 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x050505, shininess: 100 });
        const hoofMat = new THREE.MeshPhongMaterial({ color: 0x191919, flatShading: true });
        const antlerMat = new THREE.MeshPhongMaterial({ color: 0xbda788, flatShading: true, shininess: 30 });
        const dewlapMat = new THREE.MeshPhongMaterial({ color: 0x27190d, flatShading: true });

        const bodyGeo = new THREE.BoxGeometry(1.6, 1.8, 3.2);
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.bodyMesh.position.set(0, 2.2, 0);
        this.group.add(this.bodyMesh);

        const humpGeo = new THREE.BoxGeometry(1.7, 1.1, 1.5);
        const humpMesh = new THREE.Mesh(humpGeo, humpMat);
        humpMesh.position.set(0, 1.05, 0.6);
        this.bodyMesh.add(humpMesh);

        const rumpGeo = new THREE.BoxGeometry(1.5, 1.5, 1.2);
        const rumpMesh = new THREE.Mesh(rumpGeo, bodyMat);
        rumpMesh.position.set(0, -0.15, -1.6);
        this.bodyMesh.add(rumpMesh);

        this.neckGroup = new THREE.Group();
        this.neckGroup.position.set(0, 0.6, 1.6);
        this.neckGroup.rotation.x = 0.35;
        this.bodyMesh.add(this.neckGroup);

        const neckGeo = new THREE.BoxGeometry(1.1, 1.4, 1.3);
        const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
        neckMesh.position.set(0, 0.5, 0.3);
        this.neckGroup.add(neckMesh);

        const dewlapGeo = new THREE.BoxGeometry(0.3, 0.75, 0.4);
        const dewlapMesh = new THREE.Mesh(dewlapGeo, dewlapMat);
        dewlapMesh.position.set(0, -0.3, 0.4);
        dewlapMesh.rotation.x = -0.2;
        this.neckGroup.add(dewlapMesh);

        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 1.1, 0.7);
        this.headGroup.rotation.x = -0.25;
        this.neckGroup.add(this.headGroup);

        const headGeo = new THREE.BoxGeometry(1.0, 0.9, 1.1);
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headGroup.add(headMesh);

        const muzzleGeo = new THREE.BoxGeometry(0.82, 0.75, 1.35);
        const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
        muzzleMesh.position.set(0, -0.12, 0.95);
        this.headGroup.add(muzzleMesh);

        const noseGeo = new THREE.BoxGeometry(0.86, 0.35, 0.45);
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.position.set(0, -0.1, 0.65);
        muzzleMesh.add(noseMesh);

        const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.52, 0.2, 0.3);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.52, 0.2, 0.3);
        this.headGroup.add(leftEye, rightEye);

        const earGeo = new THREE.BoxGeometry(0.55, 0.2, 0.18);
        const leftEar = new THREE.Mesh(earGeo, bodyMat);
        leftEar.position.set(0.65, 0.35, -0.2);
        leftEar.rotation.z = 0.2;
        leftEar.rotation.y = -0.3;

        const rightEar = new THREE.Mesh(earGeo, bodyMat);
        rightEar.position.set(-0.65, 0.35, -0.2);
        rightEar.rotation.z = -0.2;
        rightEar.rotation.y = 0.3;
        this.headGroup.add(leftEar, rightEar);

        const buildAntler = (isRight) => {
            const side = isRight ? 1 : -1;
            const antlerGroup = new THREE.Group();

            const beamGeo = new THREE.BoxGeometry(0.5, 0.2, 0.22);
            const beam = new THREE.Mesh(beamGeo, antlerMat);
            beam.position.set(side * 0.5, 0.4, 0);
            beam.rotation.z = side * -0.2;
            antlerGroup.add(beam);

            const palmGeo = new THREE.BoxGeometry(1.4, 0.12, 1.8);
            const palm = new THREE.Mesh(palmGeo, antlerMat);
            palm.position.set(side * 1.3, 0.55, 0.2);
            palm.rotation.z = side * -0.35;
            palm.rotation.x = -0.15;
            antlerGroup.add(palm);

            const tinePositions = [
                [side * 1.9, 0.7, 0.9, 0.4],
                [side * 2.1, 0.85, 0.4, 0.2],
                [side * 2.15, 0.9, -0.2, 0.0],
                [side * 1.9, 0.8, -0.7, -0.3],
                [side * 1.3, 0.65, 1.2, 0.5]
            ];

            const tineGeo = new THREE.ConeGeometry(0.09, 0.55, 4);
            tinePositions.forEach(([tx, ty, tz, rotZ]) => {
                const tine = new THREE.Mesh(tineGeo, antlerMat);
                tine.position.set(tx, ty, tz);
                tine.rotation.z = side * -rotZ - 0.2;
                tine.rotation.x = -0.2;
                antlerGroup.add(tine);
            });

            return antlerGroup;
        };

        this.headGroup.add(buildAntler(false));
        this.headGroup.add(buildAntler(true));

        const tailGeo = new THREE.BoxGeometry(0.2, 0.2, 0.25);
        const tailMesh = new THREE.Mesh(tailGeo, bodyMat);
        tailMesh.position.set(0, 0.2, -2.15);
        this.bodyMesh.add(tailMesh);

        const legGeo = new THREE.BoxGeometry(0.42, 1.6, 0.44);
        const hoofGeo = new THREE.BoxGeometry(0.46, 0.3, 0.52);

        this.legs = {};
        const legPositions = {
            frontLeft: [0.65, -1.2, 1.1],
            frontRight: [-0.65, -1.2, 1.1],
            backLeft: [0.62, -1.2, -1.1],
            backRight: [-0.62, -1.2, -1.1]
        };

        for (const [key, pos] of Object.entries(legPositions)) {
            const pivot = new THREE.Group();
            pivot.position.set(...pos);

            const legMesh = new THREE.Mesh(legGeo, humpMat);
            legMesh.position.set(0, -0.7, 0);
            pivot.add(legMesh);

            const hoofMesh = new THREE.Mesh(hoofGeo, hoofMat);
            hoofMesh.position.set(0, -0.85, 0.04);
            legMesh.add(hoofMesh);

            this.bodyMesh.add(pivot);
            this.legs[key] = pivot;
        }

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'moose',
                    moose: this
                };
            }
        });
    }

    pickNewRoamTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 40;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 10 + Math.random() * 12;
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

        const moosePos = this.group.position;

        // 1. Check Player Proximity & Vision Cone
        if (player && player.controls && player.health > 0) {
            const playerPos = player.controls.getObject().position;
            const dist = moosePos.distanceTo(playerPos);

            let detected = false;
            if (dist <= this.proximityDistance) {
                detected = true;
            } else if (dist <= this.detectionDistance) {
                const dirToPlayer = playerPos.clone().sub(moosePos);
                dirToPlayer.y = 0;
                dirToPlayer.normalize();

                const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
                const angle = forward.angleTo(dirToPlayer);

                if (angle <= (this.detectionAngle / 2)) {
                    detected = true;
                }
            }

            if (detected) {
                this.activeThreat = player;
                this.activeThreatPos.copy(playerPos);
                return true;
            }
        }

        // 2. Scan Spatial Grid or Wildlife List for Predators (Grizzly, Black Bear, Wolf)
        const predators = ['grizzlyBear', 'blackBear', 'wolf'];
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(moosePos.x, moosePos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDead || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            if (predators.includes(entityType)) {
                const predPos = entity.group ? entity.group.position : entity.position;
                if (!predPos) continue;

                const dist = moosePos.distanceTo(predPos);
                if (dist <= this.proximityDistance) {
                    this.activeThreat = entity;
                    this.activeThreatPos.copy(predPos);
                    return true;
                }
            }
        }

        return false;
    }

    triggerReaction(threat) {
        if (this.isDead) return;
        this.activeThreat = threat;
        const rand = Math.random();

        if (rand < 0.30) {
            this.state = 'FLEE';
            this.fleeTimer = 9 + Math.random() * 5;
        } else if (rand < 0.70) {
            this.state = 'BLUFF_CHARGE';
            this.bluffStage = 'CHARGE';
            this.bluffTimer = 0;
        } else {
            this.state = 'ATTACK';
            this.attackTimer = 0;
        }
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;

        this.hp -= damage;

        this.group.scale.set(0.94, 0.94, 0.94);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.hp <= 0) {
            this.die();
        } else {
            if (attacker) {
                this.activeThreat = attacker;
            }

            if (this.hp < this.maxHp * 0.25) {
                this.state = 'FLEE';
                this.fleeTimer = 12;
            } else if (this.state === 'ROAM' || this.state === 'IDLE' || this.state === 'BLUFF_CHARGE') {
                this.triggerReaction(attacker || this.activeThreat);
            }
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
            player.inventory.addItem('Moose Fur', this.furPerHit, '🧥');
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

    updateAI(delta, player, allAnimals = []) {
        if (this.isDead) return;

        const moosePos = this.group.position;

        switch (this.state) {
            case 'ROAM': {
                this.roamTimer -= delta;

                if (this.checkDetection(player, allAnimals)) {
                    this.triggerReaction(this.activeThreat);
                    break;
                }

                const dir = this.targetPosition.clone().sub(moosePos);
                dir.y = 0;
                const distToTarget = dir.length();

                if (distToTarget < 2.5 || this.roamTimer <= 0) {
                    this.state = 'IDLE';
                    this.idleTimer = 2.0 + Math.random() * 3.0;
                } else {
                    dir.normalize();
                    const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.45 : 1.0);
                    moosePos.x += dir.x * moveSpeed * delta;
                    moosePos.z += dir.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dir.x, dir.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.08);
                }
                break;
            }

            case 'IDLE': {
                this.idleTimer -= delta;

                if (this.checkDetection(player, allAnimals)) {
                    this.triggerReaction(this.activeThreat);
                    break;
                }

                if (this.idleTimer <= 0) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'FLEE': {
                this.fleeTimer -= delta;

                const threatPos = this.getThreatPosition();
                const dirAway = moosePos.clone().sub(threatPos);
                dirAway.y = 0;
                dirAway.normalize();

                const moveSpeed = this.runSpeed * (this.isSwimming ? 0.45 : 1.0);
                moosePos.x += dirAway.x * moveSpeed * delta;
                moosePos.z += dirAway.z * moveSpeed * delta;

                const targetAngle = Math.atan2(dirAway.x, dirAway.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.12);

                const distToThreat = moosePos.distanceTo(threatPos);
                if (this.fleeTimer <= 0 || distToThreat > 65) {
                    this.activeThreat = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'BLUFF_CHARGE': {
                const threatPos = this.getThreatPosition();
                const distToThreat = moosePos.distanceTo(threatPos);

                if (this.bluffStage === 'CHARGE') {
                    const dirToThreat = threatPos.clone().sub(moosePos);
                    dirToThreat.y = 0;
                    dirToThreat.normalize();

                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.45 : 1.0);
                    moosePos.x += dirToThreat.x * moveSpeed * delta;
                    moosePos.z += dirToThreat.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.18);

                    if (distToThreat <= 7.5) {
                        this.bluffStage = 'PAUSE';
                        this.bluffTimer = 2.0;
                    }
                } else if (this.bluffStage === 'PAUSE') {
                    this.bluffTimer -= delta;

                    const dirToThreat = threatPos.clone().sub(moosePos);
                    dirToThreat.y = 0;
                    const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.08);

                    if (this.bluffTimer <= 0) {
                        if (Math.random() < 0.65) {
                            this.state = 'FLEE';
                            this.fleeTimer = 9;
                        } else {
                            this.activeThreat = null;
                            this.pickNewRoamTarget();
                            this.state = 'ROAM';
                        }
                    }
                }
                break;
            }

            case 'ATTACK': {
                const threatPos = this.getThreatPosition();
                const distToThreat = moosePos.distanceTo(threatPos);

                const dirToThreat = threatPos.clone().sub(moosePos);
                dirToThreat.y = 0;
                dirToThreat.normalize();

                const targetAngle = Math.atan2(dirToThreat.x, dirToThreat.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                this.attackTimer -= delta;

                if (distToThreat > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.45 : 1.0);
                    moosePos.x += dirToThreat.x * moveSpeed * delta;
                    moosePos.z += dirToThreat.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        // Deliver damage to Player or Predator entity
                        if (this.activeThreat && typeof this.activeThreat.takeDamage === 'function') {
                            this.activeThreat.takeDamage(this.attackStrength);
                        } else if (this.activeThreat && typeof this.activeThreat.hit === 'function') {
                            this.activeThreat.hit(this.attackStrength, this);
                        }

                        this.stompAnimProgress = 1.0;
                        this.attackTimer = 1.3;
                    }
                }

                if (distToThreat > 65 || (this.activeThreat && this.activeThreat.isDead)) {
                    this.activeThreat = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }
        }
    }

    animateMesh(delta) {
        if (!this.legs || this.isDead) return;

        let moveSpeed = 0;
        if (this.state === 'ROAM') moveSpeed = 3.2;
        else if (this.state === 'FLEE' || (this.state === 'ATTACK' && !this.isStriking) || (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'CHARGE')) {
            moveSpeed = 12.5;
        }

        if (this.isSwimming) moveSpeed *= 0.45;

        let targetBodyPitch = 0;
        if (this.isSwimming) {
            targetBodyPitch = -0.28;
        } else if (this.stompAnimProgress > 0) {
            targetBodyPitch = -0.5 * Math.sin(this.stompAnimProgress * Math.PI);
            this.stompAnimProgress = Math.max(0, this.stompAnimProgress - delta * 2.5);
        } else if (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') {
            targetBodyPitch = -0.3;
        }

        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetBodyPitch, 0.12);

        if (this.isSwimming && this.neckGroup) {
            this.neckGroup.rotation.x = THREE.MathUtils.lerp(this.neckGroup.rotation.x, 0.1, 0.1);
        } else if (this.neckGroup) {
            this.neckGroup.rotation.x = THREE.MathUtils.lerp(this.neckGroup.rotation.x, 0.35, 0.1);
        }

        if (moveSpeed > 0.1 && this.stompAnimProgress === 0) {
            const freq = this.isSwimming ? 3.5 : moveSpeed * 1.2;
            const swing = Math.sin(this.animTime * freq) * (this.isSwimming ? 0.2 : 0.5);

            this.legs.frontLeft.rotation.x = swing;
            this.legs.backRight.rotation.x = swing;
            this.legs.frontRight.rotation.x = -swing;
            this.legs.backLeft.rotation.x = -swing;

            if (this.headGroup) {
                this.headGroup.rotation.y = Math.sin(this.animTime * freq * 0.5) * 0.08;
            }
        } else {
            if (this.stompAnimProgress > 0) {
                const stompLegAngle = -1.2 * Math.sin(this.stompAnimProgress * Math.PI);
                this.legs.frontLeft.rotation.x = stompLegAngle;
                this.legs.frontRight.rotation.x = stompLegAngle;
            } else {
                for (const leg of Object.values(this.legs)) {
                    leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 0.1);
                }
            }

            if (this.headGroup) {
                if (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') {
                    this.headGroup.rotation.y = Math.sin(this.animTime * 14.0) * 0.2;
                } else {
                    this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, 0, 0.1);
                }
            }
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const moosePos = this.group.position;
        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(moosePos.x, moosePos.z, this.iceHoles)
                : this.environment.getTerrainHeight(moosePos.x, moosePos.z);

            if (this.isDead) {
                moosePos.y = surfaceY + 0.75;
                return;
            }

            const waterLevel = -5.0;
            const swimDepth = 2.4;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.5) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            moosePos.y = THREE.MathUtils.lerp(moosePos.y, targetY, 0.15);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        this.updateAI(safeDelta, player, allAnimals);
        this.resolveObstacles();
        this.animateMesh(safeDelta);
    }
}

export class Wolf {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.spatialGrid = context.spatialGrid;
        this.iceHoles = context.iceHoles || [];
        this.weatherManager = context.weatherManager;

        // Wolf Stats
        this.maxHp = 80;
        this.hp = this.maxHp;
        this.attackStrength = 22;
        this.radius = 1.0;
        this.isDestroyed = false;
        this.isDead = false;
        this.harvestHits = 3;
        this.meatPerHit = 1;
        this.furPerHit = 1;
        this.fatPerHit = 1;

        // Ecosystem & Hunger Mechanics
        this.maxHunger = 100;
        this.hunger = 30 + Math.random() * 40; // Starts with random hunger level
        this.hungerRate = 1.5; // Hunger depleted per second
        this.targetPrey = null;
        this.eatTimer = 0;

        // Detection Setup
        this.detectionDistance = 45.0;
        this.proximityDistance = 15.0;
        this.detectionAngle = Math.PI * 0.9;

        // Speeds & Range
        this.baseSpeed = 4.5;
        this.runSpeed = 14.0;
        this.attackRange = 3.0;

        // AI States: 'ROAM', 'IDLE', 'FLEE', 'BLUFF_CHARGE', 'ATTACK', 'HUNT', 'EAT'
        this.state = 'ROAM';
        this.targetPosition = new THREE.Vector3(x, y, z);
        this.roamTimer = 0;
        this.idleTimer = 0;
        this.fleeTimer = 0;
        this.attackTimer = 0;

        this.bluffStage = 'CHARGE';
        this.bluffTimer = 0;

        this.animTime = Math.random() * 100;
        this.isSwimming = false;
        this.isStriking = false;
        this.biteAnimProgress = 0;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildWolfMesh();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.obstacles) this.obstacles.push(this);

        this.pickNewRoamTarget();
    }

    buildWolfMesh() {
        const furMat = new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true });
        const darkFurMat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true });
        const lightFurMat = new THREE.MeshPhongMaterial({ color: 0x999999, flatShading: true });
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 80 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xcccc22, shininess: 100 });
        const earInnerMat = new THREE.MeshPhongMaterial({ color: 0x332222, flatShading: true });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 1.8);
        this.bodyMesh = new THREE.Mesh(bodyGeo, furMat);
        this.bodyMesh.position.set(0, 0.9, 0);
        this.group.add(this.bodyMesh);

        // Underbelly
        const bellyGeo = new THREE.BoxGeometry(0.65, 0.2, 1.7);
        const bellyMesh = new THREE.Mesh(bellyGeo, lightFurMat);
        bellyMesh.position.set(0, -0.35, 0);
        this.bodyMesh.add(bellyMesh);

        // Head Group
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.3, 1.0);
        this.bodyMesh.add(this.headGroup);

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.7);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        this.headGroup.add(headMesh);

        // Muzzle
        const muzzleGeo = new THREE.BoxGeometry(0.35, 0.3, 0.6);
        const muzzleMesh = new THREE.Mesh(muzzleGeo, lightFurMat);
        muzzleMesh.position.set(0, -0.15, 0.6);
        this.headGroup.add(muzzleMesh);

        // Nose
        const noseGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.position.set(0, 0.05, 0.35);
        muzzleMesh.add(noseMesh);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.25, 0.15, 0.25);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.25, 0.15, 0.25);
        this.headGroup.add(leftEye, rightEye);

        // Pointy Ears
        const earGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
        
        const leftEar = new THREE.Mesh(earGeo, furMat);
        leftEar.position.set(0.2, 0.45, -0.1);
        leftEar.rotation.z = -0.2;
        leftEar.rotation.x = -0.1;
        const leftInnerEar = new THREE.Mesh(earGeo, earInnerMat);
        leftInnerEar.scale.set(0.7, 0.7, 0.7);
        leftInnerEar.position.set(0, 0, 0.02);
        leftEar.add(leftInnerEar);

        const rightEar = new THREE.Mesh(earGeo, furMat);
        rightEar.position.set(-0.2, 0.45, -0.1);
        rightEar.rotation.z = 0.2;
        rightEar.rotation.x = -0.1;
        const rightInnerEar = new THREE.Mesh(earGeo, earInnerMat);
        rightInnerEar.scale.set(0.7, 0.7, 0.7);
        rightInnerEar.position.set(0, 0, 0.02);
        rightEar.add(rightInnerEar);

        this.headGroup.add(leftEar, rightEar);

        // Bushy Tail
        const tailGeo = new THREE.BoxGeometry(0.3, 0.3, 0.8);
        const tailMesh = new THREE.Mesh(tailGeo, darkFurMat);
        tailMesh.position.set(0, 0.1, -1.2);
        tailMesh.rotation.x = -0.4;
        this.bodyMesh.add(tailMesh);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.9, 0.25);
        const pawGeo = new THREE.BoxGeometry(0.22, 0.15, 0.3);

        this.legs = {};
        const legPositions = {
            frontLeft: [0.25, -0.4, 0.7],
            frontRight: [-0.25, -0.4, 0.7],
            backLeft: [0.25, -0.4, -0.7],
            backRight: [-0.25, -0.4, -0.7]
        };

        for (const [key, pos] of Object.entries(legPositions)) {
            const pivot = new THREE.Group();
            pivot.position.set(...pos);

            const legMesh = new THREE.Mesh(legGeo, furMat);
            legMesh.position.set(0, -0.4, 0);
            pivot.add(legMesh);

            const pawMesh = new THREE.Mesh(pawGeo, lightFurMat);
            pawMesh.position.set(0, -0.4, 0.05);
            legMesh.add(pawMesh);

            this.bodyMesh.add(pivot);
            this.legs[key] = pivot;
        }

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.userData = {
                    type: 'wolf',
                    wolf: this
                };
            }
        });
    }

    pickNewRoamTarget() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 40;
        const tx = THREE.MathUtils.clamp(this.group.position.x + Math.cos(angle) * dist, -470, 470);
        const tz = THREE.MathUtils.clamp(this.group.position.z + Math.sin(angle) * dist, -470, 470);
        this.targetPosition.set(tx, 0, tz);
        this.roamTimer = 6 + Math.random() * 8;
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

    checkDetection(player) {
        if (!player || player.health <= 0 || this.isDead) return false;

        const playerPos = player.controls.getObject().position;
        const wolfPos = this.group.position;

        const dist = wolfPos.distanceTo(playerPos);

        if (dist <= this.proximityDistance) return true;
        if (dist > this.detectionDistance) return false;

        const dirToPlayer = playerPos.clone().sub(wolfPos);
        dirToPlayer.y = 0;
        dirToPlayer.normalize();

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        const angle = forward.angleTo(dirToPlayer);

        return angle <= (this.detectionAngle / 2);
    }

    findPreyTarget(allAnimals = []) {
        const wolfPos = this.group.position;
        let closestPrey = null;
        let minDistSq = this.detectionDistance * this.detectionDistance;

        // Query spatial grid for nearby potential prey or fallback to full array
        const candidates = this.spatialGrid 
            ? this.spatialGrid.getNearby(wolfPos.x, wolfPos.z)
            : allAnimals;

        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (!entity || entity === this || entity.isDestroyed) continue;

            const entityType = entity.userData?.type || entity.constructor?.name?.toLowerCase();
            const isPrey = entityType === 'rabbit' || entityType === 'deer' || 
                           entity.constructor?.name === 'Rabbit' || entity.constructor?.name === 'Deer';

            if (isPrey) {
                const preyPos = entity.group ? entity.group.position : entity.position;
                if (!preyPos) continue;

                const distSq = wolfPos.distanceToSquared(preyPos);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestPrey = entity;
                }
            }
        }

        return closestPrey;
    }

    triggerReaction(player) {
        if (this.isDead) return;
        const rand = Math.random();

        if (rand < 0.75) {
            this.state = 'ATTACK';
            this.attackTimer = 0;
        } else if (rand < 0.90) {
            this.state = 'BLUFF_CHARGE';
            this.bluffStage = 'CHARGE';
            this.bluffTimer = 0;
        } else {
            this.state = 'FLEE';
            this.fleeTimer = 6 + Math.random() * 4;
        }
    }

    hit(damage, attacker) {
        if (this.isDestroyed || this.isDead) return;

        this.hp -= damage;

        this.group.scale.set(0.9, 0.9, 0.9);
        setTimeout(() => {
            if (this.group && !this.isDestroyed) this.group.scale.set(1, 1, 1);
        }, 80);

        if (this.hp <= 0) {
            this.die();
        } else {
            if (this.hp < this.maxHp * 0.20) {
                this.state = 'FLEE';
                this.fleeTimer = 8;
            } else if (this.state === 'ROAM' || this.state === 'IDLE' || this.state === 'BLUFF_CHARGE' || this.state === 'HUNT') {
                if (attacker) {
                    this.triggerReaction(attacker);
                }
            }
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
            player.inventory.addItem('Wolf Fur', this.furPerHit, '🧥');
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

    updateAI(delta, player, allAnimals = []) {
        if (this.isDead) return;

        const wolfPos = this.group.position;
        const playerPos = player ? player.controls.getObject().position : null;
        const distToPlayer = playerPos ? wolfPos.distanceTo(playerPos) : Infinity;

        // Deplete hunger over time
        this.hunger = Math.max(0, this.hunger - this.hungerRate * delta);

        switch (this.state) {
            case 'ROAM': {
                this.roamTimer -= delta;

                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                // Check for prey when hungry (< 70)
                if (this.hunger < 70) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                const dir = this.targetPosition.clone().sub(wolfPos);
                dir.y = 0;
                const distToTarget = dir.length();

                if (distToTarget < 2.0 || this.roamTimer <= 0) {
                    this.state = 'IDLE';
                    this.idleTimer = 1.0 + Math.random() * 2.0;
                } else {
                    dir.normalize();
                    const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                    wolfPos.x += dir.x * moveSpeed * delta;
                    wolfPos.z += dir.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dir.x, dir.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.15);
                }
                break;
            }

            case 'IDLE': {
                this.idleTimer -= delta;

                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                if (this.hunger < 70) {
                    const prey = this.findPreyTarget(allAnimals);
                    if (prey) {
                        this.targetPrey = prey;
                        this.state = 'HUNT';
                        break;
                    }
                }

                if (this.idleTimer <= 0) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'HUNT': {
                if (this.checkDetection(player)) {
                    this.triggerReaction(player);
                    break;
                }

                if (!this.targetPrey || this.targetPrey.isDestroyed) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    break;
                }

                const preyPos = this.targetPrey.group.position;
                const distToPrey = wolfPos.distanceTo(preyPos);

                if (this.targetPrey.isDead) {
                    if (distToPrey <= this.attackRange) {
                        this.state = 'EAT';
                        this.eatTimer = 3.5;
                    } else {
                        const dir = preyPos.clone().sub(wolfPos);
                        dir.y = 0;
                        dir.normalize();
                        const moveSpeed = this.baseSpeed * (this.isSwimming ? 0.5 : 1.0);
                        wolfPos.x += dir.x * moveSpeed * delta;
                        wolfPos.z += dir.z * moveSpeed * delta;
                        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dir.x, dir.z), 0.2);
                    }
                    break;
                }

                const dirToPrey = preyPos.clone().sub(wolfPos);
                dirToPrey.y = 0;
                dirToPrey.normalize();
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(dirToPrey.x, dirToPrey.z), 0.25);

                this.attackTimer -= delta;

                if (distToPrey > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    wolfPos.x += dirToPrey.x * moveSpeed * delta;
                    wolfPos.z += dirToPrey.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        this.targetPrey.hit(this.attackStrength, this);
                        this.biteAnimProgress = 1.0;
                        this.attackTimer = 1.0;
                    }
                }

                if (distToPrey > 60) {
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }

            case 'EAT': {
                this.eatTimer -= delta;
                this.hunger = Math.min(this.maxHunger, this.hunger + 30.0 * delta);

                if (this.eatTimer <= 0 || this.hunger >= this.maxHunger) {
                    if (this.targetPrey && typeof this.targetPrey.destroy === 'function') {
                        this.targetPrey.destroy();
                    }
                    this.targetPrey = null;
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'FLEE': {
                this.fleeTimer -= delta;

                const dirAway = wolfPos.clone().sub(playerPos);
                dirAway.y = 0;
                dirAway.normalize();

                const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                wolfPos.x += dirAway.x * moveSpeed * delta;
                wolfPos.z += dirAway.z * moveSpeed * delta;

                const targetAngle = Math.atan2(dirAway.x, dirAway.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.2);

                if (this.fleeTimer <= 0 || distToPlayer > 60) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                }
                break;
            }

            case 'BLUFF_CHARGE': {
                if (this.bluffStage === 'CHARGE') {
                    const dirToPlayer = playerPos.clone().sub(wolfPos);
                    dirToPlayer.y = 0;
                    dirToPlayer.normalize();

                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    wolfPos.x += dirToPlayer.x * moveSpeed * delta;
                    wolfPos.z += dirToPlayer.z * moveSpeed * delta;

                    const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.25);

                    if (distToPlayer <= 6.0) {
                        this.bluffStage = 'PAUSE';
                        this.bluffTimer = 1.5;
                    }
                } else if (this.bluffStage === 'PAUSE') {
                    this.bluffTimer -= delta;

                    const dirToPlayer = playerPos.clone().sub(wolfPos);
                    dirToPlayer.y = 0;
                    const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.15);

                    if (this.bluffTimer <= 0) {
                        if (Math.random() < 0.75) {
                            this.state = 'ATTACK';
                            this.attackTimer = 0;
                        } else {
                            this.state = 'FLEE';
                            this.fleeTimer = 5;
                        }
                    }
                }
                break;
            }

            case 'ATTACK': {
                const dirToPlayer = playerPos.clone().sub(wolfPos);
                dirToPlayer.y = 0;
                dirToPlayer.normalize();

                const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.25);

                this.attackTimer -= delta;

                if (distToPlayer > this.attackRange - 0.2) {
                    const moveSpeed = this.runSpeed * (this.isSwimming ? 0.5 : 1.0);
                    wolfPos.x += dirToPlayer.x * moveSpeed * delta;
                    wolfPos.z += dirToPlayer.z * moveSpeed * delta;
                    this.isStriking = false;
                } else {
                    this.isStriking = true;
                    if (this.attackTimer <= 0) {
                        player.takeDamage(this.attackStrength);
                        this.biteAnimProgress = 1.0;
                        this.attackTimer = 1.0;
                    }
                }

                if (distToPlayer > 60) {
                    this.pickNewRoamTarget();
                    this.state = 'ROAM';
                    this.isStriking = false;
                }
                break;
            }
        }
    }

    animateMesh(delta) {
        if (!this.legs || this.isDead) return;

        let moveSpeed = 0;
        if (this.state === 'ROAM') moveSpeed = 4.5;
        else if (this.state === 'FLEE' || this.state === 'HUNT' || (this.state === 'ATTACK' && !this.isStriking) || (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'CHARGE')) {
            moveSpeed = 14.0;
        }

        if (this.isSwimming) moveSpeed *= 0.5;

        let targetBodyPitch = this.isSwimming ? -0.2 : ((this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') ? -0.3 : 0);
        
        if (this.biteAnimProgress > 0) {
            targetBodyPitch = -0.2 * Math.sin(this.biteAnimProgress * Math.PI); 
            this.biteAnimProgress = Math.max(0, this.biteAnimProgress - delta * 4.0);
        }

        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetBodyPitch, 0.15);

        if (this.state === 'EAT' && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.45, 0.1);
        } else if (this.isSwimming && this.headGroup) {
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.20, 0.15);
        }

        if (moveSpeed > 0.1 && this.biteAnimProgress === 0) {
            const freq = this.isSwimming ? 5.0 : moveSpeed * 1.6;
            const swing = Math.sin(this.animTime * freq) * (this.isSwimming ? 0.3 : 0.6);

            this.legs.frontLeft.rotation.x = swing;
            this.legs.backRight.rotation.x = swing;
            this.legs.frontRight.rotation.x = -swing;
            this.legs.backLeft.rotation.x = -swing;

            if (this.headGroup) {
                this.headGroup.rotation.y = Math.sin(this.animTime * freq * 0.5) * 0.1;
                if (!this.isSwimming && this.state !== 'EAT') {
                    this.headGroup.rotation.x = Math.cos(this.animTime * freq) * 0.08;
                }
            }
        } else {
            if (this.biteAnimProgress > 0) {
                if (this.headGroup) {
                    this.headGroup.rotation.x = 0.6 * Math.sin(this.biteAnimProgress * Math.PI);
                }
                for (const leg of Object.values(this.legs)) {
                    leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 0.2);
                }
            } else {
                for (const leg of Object.values(this.legs)) {
                    leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 0.15);
                }
            }

            if (this.headGroup && this.biteAnimProgress === 0 && this.state !== 'EAT') {
                if (this.state === 'BLUFF_CHARGE' && this.bluffStage === 'PAUSE') {
                    this.headGroup.rotation.y = Math.sin(this.animTime * 18.0) * 0.2;
                } else if (!this.isSwimming) {
                    this.headGroup.rotation.set(0, 0, 0);
                }
            }
        }
    }

    update(delta, player, allAnimals = []) {
        if (this.isDestroyed) return;

        const wolfPos = this.group.position;
        if (this.environment) {
            const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(wolfPos.x, wolfPos.z, this.iceHoles)
                : this.environment.getTerrainHeight(wolfPos.x, wolfPos.z);

            if (this.isDead) {
                wolfPos.y = surfaceY + 0.35;
                return;
            }

            const waterLevel = -5.0;
            const swimDepth = 1.2;
            const floatY = waterLevel - swimDepth;

            let targetY = surfaceY;
            if (surfaceY < floatY) {
                targetY = floatY;
                this.isSwimming = true;
            } else if (surfaceY < waterLevel - 0.5) {
                this.isSwimming = true;
            } else {
                this.isSwimming = false;
            }

            wolfPos.y = THREE.MathUtils.lerp(wolfPos.y, targetY, 0.2);
        }

        if (this.isDead) return;

        const safeDelta = Math.min(delta, 0.1);
        this.animTime += safeDelta;

        this.updateAI(safeDelta, player, allAnimals);
        this.resolveObstacles();
        this.animateMesh(safeDelta);
    }
}
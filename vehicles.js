// vehicles.js
import * as THREE from 'three';

export class ATV {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.environment = context.environment || null;
        this.spatialGrid = context.spatialGrid || null;
        this.obstacles = context.obstacles || null;
        this.iceHoles = context.iceHoles || [];

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.position = this.group.position;

        // Collision & Physics Parameters
        this.radius = 1.2;            
        this.speed = 0;
        this.maxSpeed = 24.0;         
        this.maxReverseSpeed = -8.0;  
        this.acceleration = 16.0;
        this.friction = 12.0;
        this.steeringAngle = 0;
        this.maxSteerAngle = 0.55;    
        this.turnSpeed = 2.4;

        // --- FUEL SYSTEM ---
        this.fuel = 100.0;
        this.maxFuel = 100.0;
        this.fuelBurnRate = 2.5; // Fuel consumed per second while accelerating

        // --- TRUNK STORAGE SYSTEM ---
        this.trunkSlots = Array(8).fill(null);

        this.isOccupied = false;
        this.driver = null;
        this.isHeadlightOn = false;

        this.wheels = [];
        this.handlebars = null;

        this.buildModel();
        this.scene.add(this.group);

        if (context.interactables) context.interactables.push(this.group);
        if (context.obstacles) context.obstacles.push(this);
    }

    buildModel() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xc0392b, flatShading: true }); 
        const frameMat = new THREE.MeshPhongMaterial({ color: 0x1e272e, flatShading: true });
        const seatMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
        const tireMat = new THREE.MeshPhongMaterial({ color: 0x2c3e50, flatShading: true });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, shininess: 80 });
        const rackMat = new THREE.MeshPhongMaterial({ color: 0x333333, flatShading: true });
        this.headlightMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

        // Chassis Frame
        const frameGeo = new THREE.BoxGeometry(1.2, 0.4, 2.2);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = 0.5;
        this.group.add(frame);

        // Front Hood & Fenders
        const hoodGeo = new THREE.BoxGeometry(1.1, 0.45, 1.1);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, 0.85, -0.45);
        this.group.add(hood);

        // Rear Fenders
        const rearBodyGeo = new THREE.BoxGeometry(1.3, 0.5, 0.9);
        const rearBody = new THREE.Mesh(rearBodyGeo, bodyMat);
        rearBody.position.set(0, 0.85, 0.65);
        this.group.add(rearBody);

        // Rear Cargo Rack (Trunk Interaction Mesh)
        const rackGeo = new THREE.BoxGeometry(1.2, 0.15, 0.7);
        this.cargoRack = new THREE.Mesh(rackGeo, rackMat);
        this.cargoRack.position.set(0, 1.1, 0.75);
        this.group.add(this.cargoRack);

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.65, 0.22, 0.9);
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(0, 0.98, 0.15);
        this.group.add(seat);

        // Handlebars Pivot Group
        this.handlebars = new THREE.Group();
        this.handlebars.position.set(0, 1.15, -0.5);

        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8);
        const stem = new THREE.Mesh(stemGeo, metalMat);
        stem.rotation.x = 0.3;
        this.handlebars.add(stem);

        const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8);
        const bar = new THREE.Mesh(barGeo, metalMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 0.22, -0.05);
        this.handlebars.add(bar);

        this.group.add(this.handlebars);

        // Headlight
        const headlightGeo = new THREE.BoxGeometry(0.35, 0.18, 0.12);
        const headlight = new THREE.Mesh(headlightGeo, this.headlightMat);
        headlight.position.set(0, 0.92, -1.02);
        this.group.add(headlight);

        this.headlightSpot = new THREE.SpotLight(0xffffff, 10, 45, Math.PI / 5, 0.4, 1);
        this.headlightSpot.position.set(0, 0.92, -1.05);
        this.headlightSpot.target.position.set(0, 0.3, -10);
        this.headlightSpot.visible = this.isHeadlightOn;
        this.group.add(this.headlightSpot);
        this.group.add(this.headlightSpot.target);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.4, 14);
        wheelGeo.rotateZ(Math.PI / 2);

        const wheelPositions = [
            { name: 'fl', x: -0.75, y: 0.42, z: -0.75, isFront: true },
            { name: 'fr', x: 0.75,  y: 0.42, z: -0.75, isFront: true },
            { name: 'rl', x: -0.75, y: 0.42, z: 0.75,  isFront: false },
            { name: 'rr', x: 0.75,  y: 0.42, z: 0.75,  isFront: false }
        ];

        wheelPositions.forEach(p => {
            const pivot = new THREE.Group();
            pivot.position.set(p.x, p.y, p.z);

            const wheelMesh = new THREE.Mesh(wheelGeo, tireMat);
            pivot.add(wheelMesh);

            this.group.add(pivot);
            this.wheels.push({ pivot, mesh: wheelMesh, isFront: p.isFront });
        });

        this.tagMeshes();
    }

    tagMeshes() {
        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { 
                    type: child === this.cargoRack ? 'atvTrunk' : 'atv', 
                    atv: this 
                };
            }
        });
    }

    toggleHeadlight() {
        this.isHeadlightOn = !this.isHeadlightOn;
        if (this.headlightSpot) this.headlightSpot.visible = this.isHeadlightOn;
        if (this.headlightMat) {
            this.headlightMat.color.setHex(this.isHeadlightOn ? 0xffffff : 0x333333);
        }
    }

    refuel(amount) {
        if (this.fuel >= this.maxFuel) return false;
        this.fuel = Math.min(this.maxFuel, this.fuel + amount);
        return true;
    }

    mount(player) {
        this.isOccupied = true;
        this.driver = player;
    }

    dismount() {
        this.isOccupied = false;
        const p = this.driver;
        this.driver = null;
        return p;
    }

    resolveObstacleCollisions() {
        const atvPos = this.group.position;
        const nearbyObstacles = this.spatialGrid 
            ? this.spatialGrid.getNearby(atvPos.x, atvPos.z)
            : (this.obstacles || []);

        for (let i = 0; i < nearbyObstacles.length; i++) {
            const obstacle = nearbyObstacles[i];
            if (!obstacle || obstacle === this || obstacle.isDestroyed || obstacle.isDead) continue;

            const obsPos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
            if (!obsPos || obstacle.group === this.group) continue;

            const obsRadius = obstacle.radius || 0.8;
            const dx = atvPos.x - obsPos.x;
            const dz = atvPos.z - obsPos.z;
            const distSq = dx * dx + dz * dz;
            const minDist = this.radius + obsRadius;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;

                atvPos.x += (dx / dist) * overlap;
                atvPos.z += (dz / dist) * overlap;
                this.speed *= -0.2;
            }
        }
    }

    update(delta, inputKeys = null) {
        // --- 1. ACCELERATION & FUEL CONSUMPTION LOOP ---
        const hasFuel = this.fuel > 0;

        if (this.isOccupied && inputKeys) {
            if (hasFuel && (inputKeys.forward || inputKeys.backward)) {
                if (inputKeys.forward) {
                    this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
                } else if (inputKeys.backward) {
                    this.speed = Math.max(this.maxReverseSpeed, this.speed - this.acceleration * delta);
                }
                // Burn fuel while actively throttling
                this.fuel = Math.max(0, this.fuel - this.fuelBurnRate * delta);
            } else {
                // Out of fuel or no throttle: apply rolling friction
                if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * delta);
                else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * delta);
            }

            const steerDirection = (inputKeys.left ? 1 : 0) - (inputKeys.right ? 1 : 0);
            if (steerDirection !== 0) {
                this.steeringAngle = THREE.MathUtils.clamp(
                    this.steeringAngle + steerDirection * this.turnSpeed * delta,
                    -this.maxSteerAngle,
                    this.maxSteerAngle
                );
            } else {
                if (this.steeringAngle > 0) this.steeringAngle = Math.max(0, this.steeringAngle - this.turnSpeed * 1.8 * delta);
                else if (this.steeringAngle < 0) this.steeringAngle = Math.min(0, this.steeringAngle + this.turnSpeed * 1.8 * delta);
            }

            if (Math.abs(this.speed) > 0.05) {
                const turnFactor = this.speed >= 0 ? 1 : -1;
                this.group.rotation.y += this.steeringAngle * (this.speed / this.maxSpeed) * 2.2 * delta * turnFactor;
            }
        } else {
            if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * 1.5 * delta);
            else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * 1.5 * delta);
            this.steeringAngle *= 0.9;
        }

        // Animate steering handlebars and wheel spin
        this.handlebars.rotation.y = this.steeringAngle;
        const wheelRollAngle = (this.speed * delta) / 0.42;

        this.wheels.forEach(w => {
            if (w.isFront) w.pivot.rotation.y = this.steeringAngle;
            w.mesh.rotation.x += wheelRollAngle;
        });

        // Move position vector along heading
        if (Math.abs(this.speed) > 0.01) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
            this.group.position.add(forward.multiplyScalar(this.speed * delta));
        }

        this.resolveObstacleCollisions();

        // --- 2. TERRAIN SURFACE & 4-POINT PITCH/ROLL FITTING ---
        // Inside ATV.update(delta, inputKeys) in vehicles.js:

if (this.environment) {
    const pos = this.group.position;

    const surfaceY = typeof this.environment.getSurfaceHeight === 'function'
        ? this.environment.getSurfaceHeight(pos.x, pos.z, this.iceHoles)
        : this.environment.getTerrainHeight(pos.x, pos.z);

    const waterLevel = this.environment.waterLevel ?? -5.0;
    const floatY = waterLevel - 1.3;

    let isSwimming = false;
    let targetY = surfaceY;

    if (surfaceY < floatY) {
        targetY = floatY;
        isSwimming = true;
    } else if (surfaceY < waterLevel - 0.4) {
        isSwimming = true;
    }

    let targetPitch = 0;
    let targetRoll = 0;

    if (!isSwimming) {
        const lenDist = 1.0;
        const widthDist = 0.65;

        const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);

        const getH = (x, z) => typeof this.environment.getSurfaceHeight === 'function'
            ? this.environment.getSurfaceHeight(x, z, this.iceHoles)
            : this.environment.getTerrainHeight(x, z);

        // 4 wheel ground height samples
        const frontY = getH(pos.x + fwd.x * lenDist, pos.z + fwd.z * lenDist);
        const backY  = getH(pos.x - fwd.x * lenDist, pos.z - fwd.z * lenDist);
        const rightY = getH(pos.x + right.x * widthDist, pos.z + right.z * widthDist);
        const leftY  = getH(pos.x - right.x * widthDist, pos.z - right.z * widthDist);

        // Prevent body dipping into terrain peaks by elevating chassis relative to highest wheel contact point
        const maxWheelY = Math.max(frontY, backY, rightY, leftY);
        targetY = Math.max(surfaceY, maxWheelY - 0.05);

        // Calculate slope angles and clamp to ~30 degrees max to prevent clipping
        const rawPitch = Math.atan2(backY - frontY, lenDist * 2.0);
        const rawRoll  = Math.atan2(rightY - leftY, widthDist * 2.0);

        targetPitch = THREE.MathUtils.clamp(rawPitch, -0.52, 0.52);
        targetRoll  = THREE.MathUtils.clamp(rawRoll, -0.52, 0.52);
    } else {
        targetPitch = -0.15;
    }

    pos.y = THREE.MathUtils.lerp(pos.y, targetY, 0.25);

    // Smoothly apply pitch (X) and roll (Z)
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, targetPitch, delta * 8.0);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetRoll, delta * 8.0);
}
    }
}
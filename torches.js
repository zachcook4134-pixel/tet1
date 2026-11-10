// torches.js
import * as THREE from 'three';

// Shared Materials
const woodShaftMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
const metalHousingMat = new THREE.MeshPhongMaterial({ color: 0x2c3033, flatShading: true, shininess: 90 });
const clothWrapMat = new THREE.MeshPhongMaterial({ color: 0x8c7355, flatShading: true });
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 });
const glassMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, shininess: 100 });

/**
 * Calculates a multi-octave fire flicker curve to simulate dynamic flame turbulence.
 */
export function calculateFlicker(time, baseIntensity = 3.5, variance = 0.8) {
    const wave1 = Math.sin(time * 11.2);
    const wave2 = Math.cos(time * 23.7);
    const wave3 = Math.sin(time * 43.1);
    const noise = (wave1 + wave2 + wave3) / 3.0;
    return Math.max(0.2, baseIntensity + noise * variance);
}

export class WallTorch {
    constructor(scene, x, y, z, rotationY = 0, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;
        this.radius = 0.5;
        this.isDestroyed = false;
        this.animTime = Math.random() * 100;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;
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
        // Wall Bracket
        const bracketGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const bracket = new THREE.Mesh(bracketGeo, metalHousingMat);
        this.group.add(bracket);

        const armGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6);
        const arm = new THREE.Mesh(armGeo, metalHousingMat);
        arm.rotation.x = Math.PI / 4;
        arm.position.set(0, 0.08, 0.12);
        this.group.add(arm);

        // Torch Body & Wrapped Fuel Head
        const torchGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.65, 7);
        const torch = new THREE.Mesh(torchGeo, woodShaftMat);
        torch.position.set(0, 0.28, 0.22);
        this.group.add(torch);

        const wrapGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.2, 7);
        const wrap = new THREE.Mesh(wrapGeo, clothWrapMat);
        wrap.position.set(0, 0.48, 0.22);
        this.group.add(wrap);

        // Flame Geometries
        const outerFlameGeo = new THREE.ConeGeometry(0.14, 0.35, 5);
        this.outerFlame = new THREE.Mesh(outerFlameGeo, flameMat);
        this.outerFlame.position.set(0, 0.7, 0.22);
        this.group.add(this.outerFlame);

        const innerFlameGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
        this.innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        this.innerFlame.position.set(0, 0.65, 0.22);
        this.group.add(this.innerFlame);

        // Dynamic Orange Point Light
        this.light = new THREE.PointLight(0xff7700, 3.8, 18);
        this.light.position.set(0, 0.72, 0.22);
        this.group.add(this.light);

        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'building', buildingType: 'wallTorch', structure: this };
        });
    }

    update(delta) {
        if (this.isDestroyed) return;
        this.animTime += delta;

        // Apply dynamic flicker curve
        const intensity = calculateFlicker(this.animTime * 1.5, 3.8, 0.95);
        this.light.intensity = intensity;

        // Animate flame shape deformation
        const scaleY = 1.0 + Math.sin(this.animTime * 14) * 0.15;
        const scaleXZ = 1.0 + Math.cos(this.animTime * 18) * 0.12;

        if (this.outerFlame) {
            this.outerFlame.scale.set(scaleXZ, scaleY, scaleXZ);
            this.outerFlame.rotation.y += delta * 2.0;
        }
        if (this.innerFlame) {
            this.innerFlame.scale.set(scaleXZ * 0.9, scaleY * 1.1, scaleXZ * 0.9);
        }
    }
}

export class StandingLantern {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables;
        this.obstacles = context.obstacles;
        this.activeInteractables = context.activeInteractables;
        this.radius = 0.6;
        this.isDestroyed = false;
        this.animTime = Math.random() * 100;

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
        // Base & Wooden Support Post
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8);
        const post = new THREE.Mesh(postGeo, woodShaftMat);
        post.position.y = 1.1;
        this.group.add(post);

        const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 8);
        const cap = new THREE.Mesh(capGeo, metalHousingMat);
        cap.position.y = 2.24;
        this.group.add(cap);

        // Iron Hanging Arm
        const armGeo = new THREE.BoxGeometry(0.04, 0.04, 0.45);
        const arm = new THREE.Mesh(armGeo, metalHousingMat);
        arm.position.set(0, 2.2, 0.2);
        this.group.add(arm);

        // Enclosed Lantern Housing
        const lanternGroup = new THREE.Group();
        lanternGroup.position.set(0, 1.95, 0.38);

        const roofGeo = new THREE.ConeGeometry(0.22, 0.15, 4);
        const roof = new THREE.Mesh(roofGeo, metalHousingMat);
        roof.position.y = 0.2;
        lanternGroup.add(roof);

        const glassGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 4);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = 0.02;
        lanternGroup.add(glass);

        const baseMetalGeo = new THREE.BoxGeometry(0.3, 0.04, 0.3);
        const baseMetal = new THREE.Mesh(baseMetalGeo, metalHousingMat);
        baseMetal.position.y = -0.15;
        lanternGroup.add(baseMetal);

        // Candle Wick & Flame
        const flameGeo = new THREE.ConeGeometry(0.07, 0.18, 5);
        this.flame = new THREE.Mesh(flameGeo, innerFlameMat);
        this.flame.position.y = -0.05;
        lanternGroup.add(this.flame);

        this.group.add(lanternGroup);

        // Warm Ambient Point Light
        this.light = new THREE.PointLight(0xffa500, 4.5, 24);
        this.light.position.set(0, 1.95, 0.38);
        this.group.add(this.light);

        this.group.traverse(child => {
            if (child.isMesh) child.userData = { type: 'building', buildingType: 'standingLantern', structure: this };
        });
    }

    update(delta) {
        if (this.isDestroyed) return;
        this.animTime += delta;

        const intensity = calculateFlicker(this.animTime * 1.8, 4.5, 0.6);
        this.light.intensity = intensity;

        if (this.flame) {
            const s = 1.0 + Math.sin(this.animTime * 16) * 0.18;
            this.flame.scale.set(s, s * 1.2, s);
        }
    }
}
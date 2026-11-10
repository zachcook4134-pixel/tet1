import * as THREE from 'three';

// --- Procedural Radial Gradient Texture for "Blue Hole" Abyss Effect ---
function createBlueHoleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, '#000d1a');   // Pitch black / deep abyss center
    grad.addColorStop(0.35, '#002b5c');  // Deep sapphire blue
    grad.addColorStop(0.70, '#0077be');  // Vivid electric blue
    grad.addColorStop(0.90, '#00d4ff');  // Vibrant cyan edge
    grad.addColorStop(1.0, '#ffffff');   // Luminous ice border glow

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// --- Shared Materials ---
const blueHoleTexture = createBlueHoleTexture();

const blueHoleWaterMat = new THREE.MeshBasicMaterial({
    map: blueHoleTexture,
    transparent: true,
    opacity: 0.98,
    depthWrite: false // Prevents Z-fighting clipping with ice sheet
});

const iceRimMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
});

const iceChunkMat = new THREE.MeshPhongMaterial({
    color: 0xe0f7ff,
    emissive: 0x004455,
    shininess: 70,
    transparent: true,
    opacity: 0.9,
    flatShading: true
});

const chunkGeo = new THREE.DodecahedronGeometry(0.18, 0);

function createSteamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(200, 245, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(180, 230, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

const steamTexture = createSteamTexture();
const steamMat = new THREE.PointsMaterial({
    size: 0.5,
    map: steamTexture,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

export class IceHole {
    constructor(scene, x, y, z, context = {}) {
        this.scene = scene;
        this.interactables = context.interactables || [];
        this.activeInteractables = context.activeInteractables || null;
        this.iceHolesArray = context.iceHolesArray || [];

        this.radius = 1.2;
        this.freezeDuration = 90.0;
        this.freezeTimer = this.freezeDuration;
        this.isDestroyed = false;
        this.animTime = Math.random() * 10;

        this.group = new THREE.Group();
        
        // --- Elevated position to sit right on top of ice sheet (-4.92) ---
        this.group.position.set(x, -4.92, z);

        this.chunks = [];
        this.buildMesh();
        this.buildSteamVFX();
        this.scene.add(this.group);

        if (this.interactables) this.interactables.push(this.group);
        if (this.iceHolesArray) this.iceHolesArray.push(this);
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
        // 1. Blue Hole Gradient Disc (Elevated slightly above group base)
        const holeGeo = new THREE.CircleGeometry(this.radius, 32);
        holeGeo.rotateX(-Math.PI / 2);
        this.waterMesh = new THREE.Mesh(holeGeo, blueHoleWaterMat);
        this.waterMesh.position.y = 0.01;
        this.waterMesh.renderOrder = 5;
        this.group.add(this.waterMesh);

        // 2. Glowing Ice Border Rim (Elevated slightly above water disc)
        const rimGeo = new THREE.RingGeometry(this.radius * 0.95, this.radius + 0.38, 32);
        rimGeo.rotateX(-Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, iceRimMat);
        rimMesh.position.y = 0.02;
        rimMesh.renderOrder = 6;
        this.group.add(rimMesh);

        // 3. Floating Ice Chunks
        for (let i = 0; i < 4; i++) {
            const chunk = new THREE.Mesh(chunkGeo, iceChunkMat);
            const angle = (i / 4) * Math.PI * 2 + (Math.random() * 0.5);
            const dist = Math.random() * (this.radius * 0.55);
            
            chunk.position.set(Math.cos(angle) * dist, 0.04, Math.sin(angle) * dist);
            const s = 0.6 + Math.random() * 0.6;
            chunk.scale.set(s, s * 0.4, s);
            chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            chunk.renderOrder = 7;
            chunk.userData = { phase: Math.random() * Math.PI * 2 };
            
            this.group.add(chunk);
            this.chunks.push(chunk);
        }

        this.group.traverse(child => {
            if (child.isMesh) {
                child.userData = { ...child.userData, type: 'iceHole', iceHole: this };
            }
        });
    }

    buildSteamVFX() {
        const particleCount = 18;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (this.radius * 0.75);
            pos[i * 3] = Math.cos(angle) * dist;
            pos[i * 3 + 1] = Math.random() * 1.3;
            pos[i * 3 + 2] = Math.sin(angle) * dist;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.steamParticles = new THREE.Points(geo, steamMat);
        this.steamParticles.renderOrder = 8;
        this.group.add(this.steamParticles);
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this.scene) this.scene.remove(this.group);

        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
        });

        const intIdx = this.interactables.indexOf(this.group);
        if (intIdx !== -1) this.interactables.splice(intIdx, 1);

        const arrIdx = this.iceHolesArray.indexOf(this);
        if (arrIdx !== -1) this.iceHolesArray.splice(arrIdx, 1);

        if (this.activeInteractables instanceof Set) {
            this.activeInteractables.delete(this);
        }
    }

    update(delta) {
        if (this.isDestroyed) return;

        this.animTime += delta;
        this.freezeTimer -= delta;

        // Floating ice chunk movement
        this.chunks.forEach(chunk => {
            chunk.position.y = 0.04 + Math.sin(this.animTime * 2.2 + chunk.userData.phase) * 0.012;
            chunk.rotation.y += delta * 0.15;
        });

        // Steam Mist rising
        if (this.steamParticles) {
            const positions = this.steamParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += delta * 0.35;
                if (positions[i * 3 + 1] > 1.3) {
                    positions[i * 3 + 1] = 0.0;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * (this.radius * 0.75);
                    positions[i * 3] = Math.cos(angle) * dist;
                    positions[i * 3 + 2] = Math.sin(angle) * dist;
                }
            }
            this.steamParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Refreeze shrink animation over last 15 seconds
        if (this.freezeTimer <= 15.0) {
            const scale = Math.max(0.1, this.freezeTimer / 15.0);
            this.group.scale.set(scale, 1.0, scale);
        }

        if (this.freezeTimer <= 0) {
            this.destroy();
        }
    }
}
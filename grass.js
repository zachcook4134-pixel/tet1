// grass.js
import * as THREE from 'three';

export class Grass {
    constructor(scene, x, y, z) {
        this.scene = scene;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        // Random regrow timer bounds (seconds)
        this.minRegrowTime = 10;
        this.maxRegrowTime = 25;

        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildGrassTuft();
        this.scene.add(this.group);
    }

    buildGrassTuft() {
        // Natural green palette for grass detail
        const colors = [0x3a5f0b, 0x4d7c0f, 0x2e4808, 0x5b8e15];
        const bladeCount = 14;

        for (let i = 0; i < bladeCount; i++) {
            const height = 0.6 + Math.random() * 0.4;
            const width = 0.04 + Math.random() * 0.03;

            // Low-poly tapered 3D grass blade
            const bladeGeo = new THREE.ConeGeometry(width, height, 3);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const bladeMat = new THREE.MeshPhongMaterial({ 
                color: color, 
                flatShading: true 
            });

            const blade = new THREE.Mesh(bladeGeo, bladeMat);

            // Position blades around the center of the tuft
            const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() * 0.4);
            const distance = Math.random() * 0.18;
            const bx = Math.cos(angle) * distance;
            const bz = Math.sin(angle) * distance;

            blade.position.set(bx, height / 2, bz);

            // Tilt blades outward organically
            const tilt = 0.15 + Math.random() * 0.35;
            blade.rotation.x = Math.sin(angle) * tilt;
            blade.rotation.z = -Math.cos(angle) * tilt;
            blade.rotation.y = Math.random() * Math.PI;

            this.group.add(blade);
        }

        // Attach grass metadata to all child blade meshes for raycasting
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

        // Pick random regrow duration
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        // Hide grass immediately upon harvest
        this.group.visible = false;
        this.group.scale.set(0, 0, 0);

        return { name: 'Plant Fiber', count: 2, icon: '🌿' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;

            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            // Dynamically scale grass back up as it regrows
            if (progress > 0.2) {
                const scaleProgress = (progress - 0.2) / 0.8;
                this.group.visible = true;
                this.group.scale.set(scaleProgress, scaleProgress, scaleProgress);
            }

            if (this.regrowTimer <= 0) {
                this.isMature = true;
                this.group.visible = true;
                this.group.scale.set(1, 1, 1);
            }
        }
    }
}
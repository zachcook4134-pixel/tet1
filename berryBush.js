// berryBush.js
import * as THREE from 'three';

export class BerryBush {
    constructor(scene, x, y, z) {
        this.scene = scene;
        this.isMature = true;
        this.regrowTimer = 0;
        this.currentRegrowDuration = 0;

        // Random regrow bounds (seconds)
        this.minRegrowTime = 15;
        this.maxRegrowTime = 45;

        this.berryMeshes = [];
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);

        this.buildBush();
        this.scene.add(this.group);
    }

    buildBush() {
        // 1. Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.1, 0.25, 0.8, 6);
        const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.4;
        this.group.add(trunk);

        // 2. Leaf Foliage Clusters with explicit positions and radii
        const foliageMat = new THREE.MeshPhongMaterial({ color: 0x1e561e, flatShading: true });
        const clusters = [
            { pos: new THREE.Vector3(0, 1.2, 0), radius: 0.9 },
            { pos: new THREE.Vector3(0.5, 1.0, 0.4), radius: 0.7 },
            { pos: new THREE.Vector3(-0.5, 1.1, -0.3), radius: 0.75 },
            { pos: new THREE.Vector3(0.3, 1.3, -0.5), radius: 0.65 },
            { pos: new THREE.Vector3(-0.4, 0.9, 0.5), radius: 0.6 }
        ];

        clusters.forEach(c => {
            const geo = new THREE.DodecahedronGeometry(c.radius, 1);
            const foliage = new THREE.Mesh(geo, foliageMat);
            foliage.position.copy(c.pos);
            this.group.add(foliage);
        });

        // 3. Guaranteed Outer-Surface Berry Placement
        const berryMat = new THREE.MeshPhongMaterial({ 
            color: 0xff1e43, 
            emissive: 0x660011, 
            shininess: 100 
        });
        const berryRadius = 0.14;

        // Outward direction vectors mapped to foliage cluster indices
        const surfaceAngles = [
            [0,  0.0,  0.9,  0.4],  // Top cluster
            [0,  0.5,  0.7, -0.5],
            [1,  0.8,  0.2,  0.5],  // Front-right cluster
            [1,  0.6, -0.2,  0.7],
            [2, -0.8,  0.3, -0.4],  // Back-left cluster
            [2, -0.7, -0.1,  0.6],
            [3,  0.3,  0.6, -0.7],  // Back-right cluster
            [3, -0.2,  0.4, -0.8],
            [4, -0.8,  0.1,  0.5],  // Front-left cluster
            [4, -0.3, -0.3,  0.8]
        ];

        surfaceAngles.forEach(([clusterIdx, dx, dy, dz]) => {
            const cluster = clusters[clusterIdx];
            const dir = new THREE.Vector3(dx, dy, dz).normalize();

            // Calculate position slightly past the outer radius of the leaf cluster
            const surfaceOffset = cluster.radius + 0.05;
            const berryPos = cluster.pos.clone().add(dir.multiplyScalar(surfaceOffset));

            const berryGeo = new THREE.SphereGeometry(berryRadius, 8, 8);
            const berry = new THREE.Mesh(berryGeo, berryMat);
            berry.position.copy(berryPos);

            this.group.add(berry);
            this.berryMeshes.push(berry);
        });

        // Attach bush reference to all sub-meshes for raycasting
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

        // Pick random regrow duration between min and max bounds
        this.currentRegrowDuration = this.minRegrowTime + Math.random() * (this.maxRegrowTime - this.minRegrowTime);
        this.regrowTimer = this.currentRegrowDuration;

        // Hide berries immediately upon harvesting
        this.berryMeshes.forEach(berry => {
            berry.visible = false;
            berry.scale.set(0, 0, 0);
        });

        return { name: 'Berries', count: 3, icon: '🫐' };
    }

    update(delta) {
        if (!this.isMature) {
            this.regrowTimer -= delta;

            const progress = Math.max(0, 1 - (this.regrowTimer / this.currentRegrowDuration));

            // Dynamically scale berries back up as they regrow
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
            }
        }
    }
}
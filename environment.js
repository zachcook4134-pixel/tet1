import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.terrain = null;
        this.water = null;
        this.noise = new ImprovedNoise();
        this.weatherManager = null;
    }

    // Direct mathematical terrain height lookup (O(1) calculation)
    getTerrainHeight(x, z) {
        const frequency = 0.003;
        const amplitude = 35.0;
        
        let y = this.noise.noise(x * frequency, z * frequency, 0) * amplitude;
        y += this.noise.noise(x * frequency * 2, z * frequency * 2, 0) * (amplitude * 0.25);

        return y;
    }

    // Calculates solid surface height (Terrain height vs Frozen Ice height -4.95)
    getSurfaceHeight(x, z, iceHoles = []) {
        const groundY = this.getTerrainHeight(x, z);
        const isFrozen = this.iceSheet?.visible || (this.weatherManager && this.weatherManager.currentSeason === 'WINTER');

        if (!isFrozen) return groundY;

        // Check if position falls inside an active ice hole cut by the player
        const isOverIceHole = iceHoles.some(hole => {
            if (!hole || hole.isDestroyed) return false;
            const hPos = hole.group ? hole.group.position : hole.position;
            if (!hPos) return false;
            const dx = hPos.x - x;
            const dz = hPos.z - z;
            return (dx * dx + dz * dz) <= (hole.radius * hole.radius);
        });

        if (isFrozen && !isOverIceHole) {
            return Math.max(groundY, -4.95);
        }

        return groundY;
    }

    build() {
        const width = 1000;
        const depth = 1000;
        const segments = 100;

        const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = this.getTerrainHeight(x, z);
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({ 
            color: 0x2d4c1e, 
            shininess: 0,
            flatShading: false
        });

        this.terrain = new THREE.Mesh(geometry, material);
        this.scene.add(this.terrain);

        const waterGeometry = new THREE.PlaneGeometry(width, depth);
        waterGeometry.rotateX(-Math.PI / 2);

        const waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x1ca3ec,
            transparent: true,
            opacity: 0.7,
            shininess: 80
        });

        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.position.y = -5; 
        this.scene.add(this.water);

        // NEW: Ice Sheet Mesh (Winter Surface)
        const iceGeo = new THREE.PlaneGeometry(1000, 1000);
        iceGeo.rotateX(-Math.PI / 2);
        const iceMat = new THREE.MeshPhongMaterial({ 
            color: 0xdaeef8, 
            transparent: true, 
            opacity: 0.95, 
            shininess: 90 
        });
        this.iceSheet = new THREE.Mesh(iceGeo, iceMat);
        this.iceSheet.position.y = -4.95;
        this.iceSheet.visible = false; // Toggled dynamically by WeatherManager
        this.iceSheet.userData = { type: 'iceSheet' };
        this.scene.add(this.iceSheet);
        
        return this.terrain;
    }
}
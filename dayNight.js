import * as THREE from 'three';

export class CelestialSky {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Time parameter: 0 = Dawn, PI/2 = Noon, PI = Sunset, 3PI/2 = Midnight
        this.time = 0; 
        this.dayDuration = 300; // Duration of 1 full day cycle in seconds

        // Orbit radius (kept within camera far plane of 1000)
        this.orbitRadius = 600;

        // Orbital pivot centered on player/camera
        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        // --- SUN MESH SETUP ---
        const sunCoreGeo = new THREE.SphereGeometry(18, 16, 16);
        const sunCoreMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            fog: false // Disable fog so sky visuals stay crisp
        });
        this.sunMesh = new THREE.Mesh(sunCoreGeo, sunCoreMat);
        this.sunMesh.position.set(0, this.orbitRadius, 0);

        // Sun Glow Layer
        const sunGlowGeo = new THREE.SphereGeometry(32, 16, 16);
        const sunGlowMat = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00, 
            transparent: true, 
            opacity: 0.35, 
            fog: false 
        });
        const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
        this.sunMesh.add(sunGlow);

        // Sun Light Source
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.castShadow = true;
        this.sunMesh.add(this.sunLight);

        this.pivot.add(this.sunMesh);

        // --- MOON MESH SETUP ---
        const moonGeo = new THREE.SphereGeometry(14, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({ 
            color: 0xdddddd, 
            fog: false 
        });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.position.set(0, -this.orbitRadius, 0);

        // Moon Glow Layer
        const moonGlowGeo = new THREE.SphereGeometry(22, 16, 16);
        const moonGlowMat = new THREE.MeshBasicMaterial({ 
            color: 0x7799bb, 
            transparent: true, 
            opacity: 0.25, 
            fog: false 
        });
        const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
        this.moonMesh.add(moonGlow);

        // Moon Light Source (Subtle blue-grey ambient night light)
        this.moonLight = new THREE.DirectionalLight(0x446699, 0.25);
        this.moonMesh.add(this.moonLight);

        this.pivot.add(this.moonMesh);

        // Color Palettes for Sky & Fog Transitions
        this.skyDay = new THREE.Color(0x87CEEB);
        this.skySunset = new THREE.Color(0xE26A39);
        this.skyNight = new THREE.Color(0x050714);

        this.fogDay = new THREE.Color(0x87CEEB);
        this.fogSunset = new THREE.Color(0xD17859);
        this.fogNight = new THREE.Color(0x03040A);
    }

    update(delta, hemiLight) {
        // Advance time
        this.time += (delta / this.dayDuration) * Math.PI * 2;
        if (this.time > Math.PI * 2) this.time -= Math.PI * 2;

        // Keep orbital pivot centered on the player's camera position so celestial objects stay at infinity
        this.pivot.position.copy(this.camera.position);

        // Rotate orbit on the Z axis
        this.pivot.rotation.z = this.time;

        // Sun height calculation (-1 to 1)
        const sunY = Math.sin(this.time);

        // Adjust Directional and Hemisphere Light Intensities
        const sunFactor = Math.max(0, sunY);
        this.sunLight.intensity = sunFactor * 1.3;
        
        const moonFactor = Math.max(0, -sunY);
        this.moonLight.intensity = moonFactor * 0.3;

        if (hemiLight) {
            hemiLight.intensity = Math.max(0.08, sunFactor * 0.75);
        }

        // --- DYNAMIC SKY & FOG COLOR TRANSITION ---
        const targetSky = new THREE.Color();
        const targetFog = new THREE.Color();

        if (sunY > 0.15) {
            // Daytime
            targetSky.copy(this.skyDay);
            targetFog.copy(this.fogDay);
        } else if (sunY > -0.15) {
            // Sunrise / Sunset transition
            const t = (sunY + 0.15) / 0.3;
            targetSky.lerpColors(this.skySunset, this.skyDay, t);
            targetFog.lerpColors(this.fogSunset, this.fogDay, t);
        } else {
            // Nighttime
            targetSky.copy(this.skyNight);
            targetFog.copy(this.fogNight);
        }

        // Apply smooth color lerping
        this.scene.background.lerp(targetSky, 0.05);
        if (this.scene.fog) {
            this.scene.fog.color.lerp(targetFog, 0.05);
        }
    }
}
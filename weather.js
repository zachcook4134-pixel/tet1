import * as THREE from 'three';

export const WeatherType = {
    CLEAR: 'CLEAR',
    CLOUDY: 'CLOUDY',
    FOG: 'FOG',
    RAIN: 'RAIN',
    SNOW: 'SNOW',
    STORM: 'STORM'
};

export const SeasonType = {
    SPRING: 'SPRING',
    SUMMER: 'SUMMER',
    AUTUMN: 'AUTUMN',
    WINTER: 'WINTER'
};

export class WeatherManager {
    constructor(scene, camera, environment, celestialSky) {
        this.scene = scene;
        this.camera = camera;
        this.environment = environment;
        this.celestialSky = celestialSky;

        this.shelterRaycaster = new THREE.Raycaster();
        this.isSheltered = false;
        this.shelterTimer = 0;
        this.hudTimer = 0;

        // Dedicated Roof Registry for fast O(1) checks
        this.roofObjects = [];

        this.currentWeather = null;
        
        // --- 1. Lock starting season to WINTER ---
        this.currentSeason = SeasonType.WINTER;

        this.daysPerSeason = 4;
        this.seasonProgress = 0;
        this.totalDaysPassed = 0;
        this.weatherTimer = 0;
        this.weatherDuration = 120;

        this.seasonBaseTemps = {
            [SeasonType.SPRING]: 15,
            [SeasonType.SUMMER]: 26,
            [SeasonType.AUTUMN]: 10,
            [SeasonType.WINTER]: -8
        };

        this.seasonTerrainColors = {
            [SeasonType.SPRING]: new THREE.Color(0x3a6b28),
            [SeasonType.SUMMER]: new THREE.Color(0x2d4c1e),
            [SeasonType.AUTUMN]: new THREE.Color(0x8c5e2b),
            [SeasonType.WINTER]: new THREE.Color(0xdedede)
        };

        // Initialize with base winter temperature
        this.temperature = -8;

        // Optimized Particle Counts
        this.rainParticleCount = 2500;
        this.snowParticleCount = 2000;

        this.rainGroup = null;
        this.snowGroup = null;
        this.cloudGroup = null;

        this.initRainSystem();
        this.initSnowSystem();
        this.initCloudSystem();

        this.ui = {
            container: document.getElementById('weather-ui'),
            icon: document.getElementById('weather-icon'),
            desc: document.getElementById('weather-desc'),
            season: document.getElementById('season-text'),
            temp: document.getElementById('temp-text')
        };

        // --- 2. Start game with active snowfall ---
        this.setWeather(WeatherType.SNOW);

        // --- 3. Instantly set terrain color to snow white on launch ---
        if (this.environment && this.environment.terrain) {
            this.environment.terrain.material.color.copy(this.seasonTerrainColors[SeasonType.WINTER]);
        }

        this.updateAtmosphere();
    }

    registerRoof(roofMesh) {
        if (roofMesh && !this.roofObjects.includes(roofMesh)) {
            this.roofObjects.push(roofMesh);
        }
    }

    unregisterRoof(roofMesh) {
        const idx = this.roofObjects.indexOf(roofMesh);
        if (idx !== -1) this.roofObjects.splice(idx, 1);
    }

    createParticleTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        if (type === 'rain') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(14, 0, 4, 32);
        } else if (type === 'snow') {
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'cloud') {
            const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            grad.addColorStop(0.6, 'rgba(230, 230, 240, 0.3)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    initRainSystem() {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(this.rainParticleCount * 3);
        const velocities = new Float32Array(this.rainParticleCount);

        const radius = 50;
        for (let i = 0; i < this.rainParticleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * radius * 2;
            pos[i * 3 + 1] = Math.random() * 40;
            pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
            velocities[i] = 30 + Math.random() * 15;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.rainVelocities = velocities;

        const mat = new THREE.PointsMaterial({
            size: 1.2,
            map: this.createParticleTexture('rain'),
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.rainGroup = new THREE.Points(geo, mat);
        this.rainGroup.visible = false;
        this.scene.add(this.rainGroup);
    }

    initSnowSystem() {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(this.snowParticleCount * 3);
        const phases = new Float32Array(this.snowParticleCount);

        const radius = 45;
        for (let i = 0; i < this.snowParticleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * radius * 2;
            pos[i * 3 + 1] = Math.random() * 35;
            pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
            phases[i] = Math.random() * Math.PI * 2;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.snowPhases = phases;

        const mat = new THREE.PointsMaterial({
            size: 0.8,
            map: this.createParticleTexture('snow'),
            transparent: true,
            opacity: 0.85,
            depthWrite: false
        });

        this.snowGroup = new THREE.Points(geo, mat);
        this.snowGroup.visible = false;
        this.scene.add(this.snowGroup);
    }

    initCloudSystem() {
        this.cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xdddddd,
            transparent: true,
            opacity: 0.45,
            fog: true
        });

        const cloudGeo = new THREE.DodecahedronGeometry(12, 1);
        for (let i = 0; i < 15; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            cloud.position.set(
                (Math.random() - 0.5) * 300,
                70 + Math.random() * 20,
                (Math.random() - 0.5) * 300
            );
            cloud.scale.set(1.5 + Math.random() * 2, 0.5 + Math.random() * 0.5, 1.2 + Math.random() * 1.5);
            this.cloudGroup.add(cloud);
        }
        this.cloudGroup.visible = false;
        this.scene.add(this.cloudGroup);
    }

    setWeather(type) {
        if (this.currentWeather === type) return;
        this.currentWeather = type;

        this.rainGroup.visible = (type === WeatherType.RAIN || type === WeatherType.STORM);
        this.snowGroup.visible = (type === WeatherType.SNOW);
        this.cloudGroup.visible = (type === WeatherType.CLOUDY || type === WeatherType.RAIN || type === WeatherType.STORM || type === WeatherType.SNOW);

        this.updateHUD();
    }

    rollSeasonalWeather() {
        const rand = Math.random();

        switch (this.currentSeason) {
            case SeasonType.SPRING:
                if (rand < 0.40) this.setWeather(WeatherType.CLEAR);
                else if (rand < 0.70) this.setWeather(WeatherType.RAIN);
                else if (rand < 0.85) this.setWeather(WeatherType.CLOUDY);
                else this.setWeather(WeatherType.FOG);
                break;

            case SeasonType.SUMMER:
                if (rand < 0.55) this.setWeather(WeatherType.CLEAR);
                else if (rand < 0.75) this.setWeather(WeatherType.CLOUDY);
                else if (rand < 0.92) this.setWeather(WeatherType.RAIN);
                else this.setWeather(WeatherType.STORM);
                break;

            case SeasonType.AUTUMN:
                if (rand < 0.35) this.setWeather(WeatherType.CLEAR);
                else if (rand < 0.60) this.setWeather(WeatherType.FOG);
                else if (rand < 0.85) this.setWeather(WeatherType.RAIN);
                else this.setWeather(WeatherType.CLOUDY);
                break;

            case SeasonType.WINTER:
                if (rand < 0.30) this.setWeather(WeatherType.CLEAR);
                else if (rand < 0.75) this.setWeather(WeatherType.SNOW);
                else if (rand < 0.90) this.setWeather(WeatherType.CLOUDY);
                else this.setWeather(WeatherType.FOG);
                break;
        }
    }

    updateCalendar(delta) {
        if (!this.celestialSky) return;

        this.weatherTimer += delta;
        if (this.weatherTimer >= this.weatherDuration) {
            this.weatherTimer = 0;
            this.rollSeasonalWeather();
        }

        const fullDayCycleDuration = this.celestialSky.dayDuration;
        this.totalDaysPassed += (delta / fullDayCycleDuration);

        const seasonIndex = Math.floor((this.totalDaysPassed / this.daysPerSeason) % 4);
        
        // --- 4. Start seasonal sequence with WINTER at index 0 ---
        const seasons = [SeasonType.WINTER, SeasonType.SPRING, SeasonType.SUMMER, SeasonType.AUTUMN];
        
        const newSeason = seasons[seasonIndex];
        if (newSeason !== this.currentSeason) {
            this.currentSeason = newSeason;
            this.rollSeasonalWeather();
            this.updateHUD();
        }
    }

    checkShelterStatus() {
        if (!this.camera) return;

        const playerPos = this.camera.position;
        const upDir = new THREE.Vector3(0, 1, 0);
        this.shelterRaycaster.set(playerPos, upDir);
        this.shelterRaycaster.far = 15.0;

        if (this.roofObjects.length > 0) {
            const hits = this.shelterRaycaster.intersectObjects(this.roofObjects, true);
            this.isSheltered = hits.length > 0;
        } else {
            this.isSheltered = false;
        }
    }

    updateAtmosphere() {
        if (!this.scene.fog) return;

        let targetFogNear = 50;
        let targetFogFar = 750;

        switch (this.currentWeather) {
            case WeatherType.FOG: targetFogNear = 5; targetFogFar = 80; break;
            case WeatherType.RAIN: targetFogNear = 20; targetFogFar = 350; break;
            case WeatherType.STORM: targetFogNear = 10; targetFogFar = 200; break;
            case WeatherType.SNOW: targetFogNear = 15; targetFogFar = 250; break;
            case WeatherType.CLOUDY: targetFogNear = 50; targetFogFar = 500; break;
            case WeatherType.CLEAR: default: targetFogNear = 50; targetFogFar = 750; break;
        }

        this.scene.fog.near = THREE.MathUtils.lerp(this.scene.fog.near, targetFogNear, 0.05);
        this.scene.fog.far = THREE.MathUtils.lerp(this.scene.fog.far, targetFogFar, 0.05);

        if (this.environment && this.environment.terrain) {
            const targetColor = this.seasonTerrainColors[this.currentSeason];
            this.environment.terrain.material.color.lerp(targetColor, 0.01);
        }

        if (this.environment) {
            const isWinter = (this.currentSeason === SeasonType.WINTER);
            if (this.environment.iceSheet) {
                this.environment.iceSheet.visible = isWinter;
            }
            if (this.environment.water) {
                this.environment.water.visible = !isWinter;
            }
        }
    }

    updateParticles(delta, playerPos) {
        const showRain = (this.currentWeather === WeatherType.RAIN || this.currentWeather === WeatherType.STORM);
        const showSnow = (this.currentWeather === WeatherType.SNOW);
        const showClouds = (this.currentWeather === WeatherType.CLOUDY || showRain || showSnow);

        if (this.rainGroup) this.rainGroup.visible = showRain && !this.isSheltered;
        if (this.snowGroup) this.snowGroup.visible = showSnow && !this.isSheltered;
        if (this.cloudGroup) this.cloudGroup.visible = showClouds;

        if (this.rainGroup && this.rainGroup.visible) {
            this.rainGroup.position.set(playerPos.x, 0, playerPos.z);
            const positions = this.rainGroup.geometry.attributes.position.array;

            for (let i = 0; i < this.rainParticleCount; i++) {
                let y = positions[i * 3 + 1] - this.rainVelocities[i] * delta;
                if (y < playerPos.y - 5) {
                    y = playerPos.y + 35;
                }
                positions[i * 3 + 1] = y;
            }
            this.rainGroup.geometry.attributes.position.needsUpdate = true;
        }

        if (this.snowGroup && this.snowGroup.visible) {
            this.snowGroup.position.set(playerPos.x, 0, playerPos.z);
            const positions = this.snowGroup.geometry.attributes.position.array;
            const time = performance.now() * 0.001;

            for (let i = 0; i < this.snowParticleCount; i++) {
                let y = positions[i * 3 + 1] - (3.5 + Math.sin(time + this.snowPhases[i])) * delta * 2.5;
                if (y < playerPos.y - 5) {
                    y = playerPos.y + 30;
                }
                positions[i * 3 + 1] = y;
                positions[i * 3] += Math.sin(time + this.snowPhases[i]) * delta * 1.5;
            }
            this.snowGroup.geometry.attributes.position.needsUpdate = true;
        }

        if (this.cloudGroup && this.cloudGroup.visible) {
            this.cloudGroup.position.x = playerPos.x;
            this.cloudGroup.position.z = playerPos.z;
            this.cloudGroup.rotation.y += delta * 0.01;
        }
    }

    calculateTemperature() {
        const baseTemp = this.seasonBaseTemps[this.currentSeason];
        const sunY = this.celestialSky ? Math.sin(this.celestialSky.time) : 0;
        const dayNightMod = sunY * 7;

        let weatherMod = 0;
        switch (this.currentWeather) {
            case WeatherType.CLEAR: weatherMod = 3; break;
            case WeatherType.CLOUDY: weatherMod = -1; break;
            case WeatherType.FOG: weatherMod = -2; break;
            case WeatherType.RAIN: weatherMod = -4; break;
            case WeatherType.STORM: weatherMod = -6; break;
            case WeatherType.SNOW: weatherMod = -8; break;
        }

        if (this.isSheltered) {
            if (weatherMod < 0) weatherMod = 0;
            weatherMod += 5.0;
        }

        const playerY = this.camera.position.y;
        const altitudeMod = -Math.max(0, (playerY - 10) * 0.15);

        this.temperature = Math.round((baseTemp + dayNightMod + weatherMod + altitudeMod) * 10) / 10;
    }

    updateHUD() {
        if (!this.ui.container) return;

        const weatherData = {
            [WeatherType.CLEAR]: { icon: '☀️', desc: 'Clear Skies' },
            [WeatherType.CLOUDY]: { icon: '⛅', desc: 'Overcast' },
            [WeatherType.FOG]: { icon: '🌫️', desc: 'Dense Fog' },
            [WeatherType.RAIN]: { icon: '🌧️', desc: 'Rainfall' },
            [WeatherType.SNOW]: { icon: '❄️', desc: 'Snowfall' },
            [WeatherType.STORM]: { icon: '⛈️', desc: 'Thunderstorm' }
        };

        const seasonData = {
            [SeasonType.SPRING]: '🌸 Spring',
            [SeasonType.SUMMER]: '☀️ Summer',
            [SeasonType.AUTUMN]: '🍂 Autumn',
            [SeasonType.WINTER]: '❄️ Winter'
        };

        const w = weatherData[this.currentWeather];
        if (w) {
            this.ui.icon.innerText = this.isSheltered ? '🏠' : w.icon;
            this.ui.desc.innerText = this.isSheltered ? `${w.desc} (Sheltered)` : w.desc;
        }
        this.ui.season.innerText = seasonData[this.currentSeason];

        const tempF = Math.round((this.temperature * 9 / 5) + 32);
        this.ui.temp.innerText = `${this.temperature}°C / ${tempF}°F`;
    }

    update(delta) {
        const playerPos = this.camera.position;

        this.shelterTimer += delta;
        if (this.shelterTimer >= 0.2) {
            this.shelterTimer = 0;
            this.checkShelterStatus();
        }

        this.updateCalendar(delta);
        this.calculateTemperature();
        this.updateAtmosphere();
        this.updateParticles(delta, playerPos);

        this.hudTimer += delta;
        if (this.hudTimer >= 0.1) {
            this.hudTimer = 0;
            this.updateHUD();
        }
    }
}
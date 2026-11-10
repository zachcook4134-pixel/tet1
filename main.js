import * as THREE from 'three';
import { Player } from './player.js';
import { Environment } from './environment.js';
import { BerryBush, Grass, Egg, Stone, Stick, StoneOre, MetalOre } from './groundInteractables.js';
import { Tree } from './resources.js';
import { CelestialSky } from './dayNight.js';
import { WeatherManager } from './weather.js';
import { BlackBear, GrizzlyBear, Moose, Wolf } from './aggressiveAnimals.js';
import { Rabbit, Deer, Bird } from './preyAnimals.js';
import { SpatialHashGrid } from './spatialGrid.js';
import { SaveSystem } from './saveSystem.js';
import { Trap } from './traps.js';
import { MarketManager } from './market.js';
import { MarketUI } from './marketUI.js';
import { ATV } from './vehicles.js';
import { IceHole } from './iceHole.js';

// Setup basic scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.Fog(0x87CEEB, 0, 750);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
hemiLight.position.set(0.5, 1, 0.75);
scene.add(hemiLight);

// --- ITEM, RESOURCE & SPATIAL ARRAYS ---
const interactables = [];
const obstacles = [];
const spatialGrid = new SpatialHashGrid(20);
const bushes = [];
const grassTufts = [];
const eggNests = [];
const stones = [];
const sticks = [];
const trees = [];
const activeTrees = new Set();
const activeInteractables = new Set();
const stoneOres = [];
const metalOres = [];
const bears = [];
const mooses = [];
const wolves = [];
const rabbits = [];
const deers = [];
const birds = [];
const traps = [];
const atvs = [];
const iceHoles = [];

// Target caps for wildlife population management
const ANIMAL_CAPS = {
    blackBear: 10,
    grizzlyBear: 6,
    moose: 8,
    wolf: 12,
    rabbit: 20,
    deer: 12,
    bird: 25
};

const celestialSky = new CelestialSky(scene, camera);

// Generate Terrain
const environment = new Environment(scene);
environment.build();

// Make liquid water drinkable
environment.water.userData = { type: 'water' };
interactables.push(environment.water);

// --- INITIALIZE WEATHER SYSTEM ---
const weatherManager = new WeatherManager(scene, camera, environment, celestialSky);

const sharedContext = {
    environment,
    interactables,
    obstacles,
    spatialGrid,
    activeTrees,
    activeInteractables,
    iceHoles
};

// Centralized Obstacle Registration
function registerObstacle(obstacle) {
    obstacles.push(obstacle);
    if (spatialGrid) {
        if (obstacle.obstacleNodes) {
            obstacle.obstacleNodes.forEach(node => spatialGrid.insert(node));
        } else {
            spatialGrid.insert(obstacle);
        }
    }
}

function spawnTrees(targetCount) {
    const varieties = ['oak', 'pine', 'birch'];
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 15;

    while (spawned < targetCount && attempts < maxAttempts) {
        attempts++;
        const x = (Math.random() - 0.5) * 960;
        const z = (Math.random() - 0.5) * 960;

        const groundY = environment.getTerrainHeight(x, z);
        if (groundY > -2.0) {
            const variety = varieties[Math.floor(Math.random() * varieties.length)];
            const stage = Math.floor(Math.random() * 3) + 1;

            const tree = new Tree(scene, x, groundY, z, variety, stage, interactables, obstacles, activeTrees);
            trees.push(tree);
            interactables.push(tree.group);
            spatialGrid.insert(tree);
            spawned++;
        }
    }
}

function spawnGroundPickups(ClassRef, targetCount, storageArray, minHeight = -4.0) {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 20;

    while (spawned < targetCount && attempts < maxAttempts) {
        attempts++;
        const x = (Math.random() - 0.5) * 960;
        const z = (Math.random() - 0.5) * 960;

        const groundY = environment.getTerrainHeight(x, z);
        if (groundY > minHeight) {
            const item = new ClassRef(scene, x, groundY, z, activeInteractables);
            storageArray.push(item);
            interactables.push(item.group);
            if (item.radius) {
                registerObstacle(item);
            }
            spawned++;
        }
    }
}

function spawnOres(ClassRef, targetCount, storageArray, minHeight = -2.0) {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 20;

    while (spawned < targetCount && attempts < maxAttempts) {
        attempts++;
        const x = (Math.random() - 0.5) * 960;
        const z = (Math.random() - 0.5) * 960;

        const groundY = environment.getTerrainHeight(x, z);
        if (groundY > minHeight) {
            const ore = new ClassRef(scene, x, groundY, z, {
                environment,
                interactables,
                obstacles,
                storageArray,
                activeInteractables
            });
            spatialGrid.insert(ore);
            spawned++;
        }
    }
}

function spawnBerryBushes(targetCount) {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 30;
    const minSpacing = 10;

    while (spawned < targetCount && attempts < maxAttempts) {
        attempts++;
        const x = (Math.random() - 0.5) * 960;
        const z = (Math.random() - 0.5) * 960;

        const tooClose = bushes.some(bush => {
            const dx = bush.group.position.x - x;
            const dz = bush.group.position.z - z;
            return Math.sqrt(dx * dx + dz * dz) < minSpacing;
        });

        if (tooClose) continue;

        const groundY = environment.getTerrainHeight(x, z);
        if (groundY > -3.0) {
            const bush = new BerryBush(scene, x, groundY, z, activeInteractables);
            bushes.push(bush);
            interactables.push(bush.group);
            registerObstacle(bush);
            spawned++;
        }
    }
}

function spawnAnimals(blackBearCount, grizzlyCount, mooseCount, wolfCount) {
    const mapSpread = 920; 
    const animalContext = { environment, interactables, obstacles, spatialGrid, iceHoles };

    for (let i = 0; i < blackBearCount; i++) {
        let spawned = false;
        while (!spawned) {
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -4.0) {
                const bear = new BlackBear(scene, x, y, z, animalContext);
                bears.push(bear);
                spatialGrid.insert(bear);
                spawned = true;
            }
        }
    }

    for (let i = 0; i < grizzlyCount; i++) {
        let spawned = false;
        while (!spawned) {
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -4.0) {
                const gbear = new GrizzlyBear(scene, x, y, z, animalContext);
                bears.push(gbear);
                spatialGrid.insert(gbear);
                spawned = true;
            }
        }
    }

    for (let i = 0; i < mooseCount; i++) {
        let spawned = false;
        while (!spawned) {
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -4.0) {
                const moose = new Moose(scene, x, y, z, animalContext);
                mooses.push(moose);
                spatialGrid.insert(moose);
                spawned = true;
            }
        }
    }

    for (let i = 0; i < wolfCount; i++) {
        let spawned = false;
        while (!spawned) {
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -4.0) {
                const wolf = new Wolf(scene, x, y, z, animalContext);
                wolves.push(wolf);
                spatialGrid.insert(wolf);
                spawned = true;
            }
        }
    }
}

function spawnPreyAnimals(rabbitCount, deerCount, birdCount) {
    const mapSpread = 920;
    const animalContext = { environment, interactables, obstacles, spatialGrid, iceHoles };

    for (let i = 0; i < rabbitCount; i++) {
        let spawned = false;
        let attempts = 0;
        while (!spawned && attempts < 50) {
            attempts++;
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -3.0) {
                const rabbit = new Rabbit(scene, x, y, z, animalContext);
                rabbits.push(rabbit);
                spatialGrid.insert(rabbit);
                spawned = true;
            }
        }
    }

    for (let i = 0; i < deerCount; i++) {
        let spawned = false;
        let attempts = 0;
        while (!spawned && attempts < 50) {
            attempts++;
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -3.0) {
                const deer = new Deer(scene, x, y, z, animalContext);
                deers.push(deer);
                spatialGrid.insert(deer);
                spawned = true;
            }
        }
    }

    for (let i = 0; i < birdCount; i++) {
        let spawned = false;
        let attempts = 0;
        while (!spawned && attempts < 50) {
            attempts++;
            const x = (Math.random() - 0.5) * mapSpread;
            const z = (Math.random() - 0.5) * mapSpread;
            const y = environment.getTerrainHeight(x, z);
            if (y > -3.0) {
                birds.push(new Bird(scene, x, y, z, { environment, interactables }));
                spawned = true;
            }
        }
    }
}

// Helper function to calculate spawn position outside player vision (> 80m)
function getRespawnPosition(playerPos, minDistance = 80, mapSpread = 920, minHeight = -4.0) {
    const minDistanceSq = minDistance * minDistance;
    for (let attempts = 0; attempts < 35; attempts++) {
        const x = (Math.random() - 0.5) * mapSpread;
        const z = (Math.random() - 0.5) * mapSpread;
        const dx = x - playerPos.x;
        const dz = z - playerPos.z;

        if (dx * dx + dz * dz > minDistanceSq) {
            const y = environment.getTerrainHeight(x, z);
            if (y > minHeight) {
                return { x, y, z };
            }
        }
    }
    return null;
}

// Wildlife population cleanup and respawn loop
function processWildlifeRespawning(playerPos) {
    // 1. Prune destroyed/harvested entity references from tracking arrays
    for (let i = bears.length - 1; i >= 0; i--) if (bears[i].isDestroyed) bears.splice(i, 1);
    for (let i = mooses.length - 1; i >= 0; i--) if (mooses[i].isDestroyed) mooses.splice(i, 1);
    for (let i = wolves.length - 1; i >= 0; i--) if (wolves[i].isDestroyed) wolves.splice(i, 1);
    for (let i = rabbits.length - 1; i >= 0; i--) if (rabbits[i].isDestroyed) rabbits.splice(i, 1);
    for (let i = deers.length - 1; i >= 0; i--) if (deers[i].isDestroyed) deers.splice(i, 1);
    for (let i = birds.length - 1; i >= 0; i--) if (birds[i].isDestroyed) birds.splice(i, 1);

    const animalContext = { environment, interactables, obstacles, spatialGrid, iceHoles };

    // 2. Check Black Bear count & respawn
    const blackBearCount = bears.filter(b => b instanceof BlackBear).length;
    for (let i = blackBearCount; i < ANIMAL_CAPS.blackBear; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -4.0);
        if (pos) {
            const bear = new BlackBear(scene, pos.x, pos.y, pos.z, animalContext);
            bears.push(bear);
            spatialGrid.insert(bear);
        }
    }

    // 3. Check Grizzly Bear count & respawn
    const grizzlyBearCount = bears.filter(b => b instanceof GrizzlyBear).length;
    for (let i = grizzlyBearCount; i < ANIMAL_CAPS.grizzlyBear; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -4.0);
        if (pos) {
            const gbear = new GrizzlyBear(scene, pos.x, pos.y, pos.z, animalContext);
            bears.push(gbear);
            spatialGrid.insert(gbear);
        }
    }

    // 4. Check Moose count & respawn
    for (let i = mooses.length; i < ANIMAL_CAPS.moose; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -4.0);
        if (pos) {
            const moose = new Moose(scene, pos.x, pos.y, pos.z, animalContext);
            mooses.push(moose);
            spatialGrid.insert(moose);
        }
    }

    // 5. Check Wolf count & respawn
    for (let i = wolves.length; i < ANIMAL_CAPS.wolf; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -4.0);
        if (pos) {
            const wolf = new Wolf(scene, pos.x, pos.y, pos.z, animalContext);
            wolves.push(wolf);
            spatialGrid.insert(wolf);
        }
    }

    // 6. Check Rabbit count & respawn
    for (let i = rabbits.length; i < ANIMAL_CAPS.rabbit; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -3.0);
        if (pos) {
            const rabbit = new Rabbit(scene, pos.x, pos.y, pos.z, animalContext);
            rabbits.push(rabbit);
            spatialGrid.insert(rabbit);
        }
    }

    // 7. Check Deer count & respawn
    for (let i = deers.length; i < ANIMAL_CAPS.deer; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -3.0);
        if (pos) {
            const deer = new Deer(scene, pos.x, pos.y, pos.z, animalContext);
            deers.push(deer);
            spatialGrid.insert(deer);
        }
    }

    // 8. Check Bird count & respawn
    for (let i = birds.length; i < ANIMAL_CAPS.bird; i++) {
        const pos = getRespawnPosition(playerPos, 80, 920, -3.0);
        if (pos) {
            const bird = new Bird(scene, pos.x, pos.y, pos.z, { environment, interactables });
            birds.push(bird);
        }
    }

    // Sync player.animals reference list for traps and target checks
    player.animals = [
        ...bears,
        ...mooses,
        ...wolves,
        ...rabbits,
        ...deers,
        ...birds
    ];
}

// Ground Pickups Config
[
    [Grass, 200, grassTufts, -4.0],
    [Egg, 50, eggNests, -2.0],
    [Stone, 150, stones, -4.0],
    [Stick, 200, sticks, -4.0]
].forEach(args => spawnGroundPickups(...args));

// Ore Deposits Config
[
    [StoneOre, 80, stoneOres, -2.0],
    [MetalOre, 60, metalOres, -2.0]
].forEach(args => spawnOres(...args));

// Environment & Animals Initial Setup
spawnTrees(5000);
spawnBerryBushes(100);
spawnAnimals(ANIMAL_CAPS.blackBear, ANIMAL_CAPS.grizzlyBear, ANIMAL_CAPS.moose, ANIMAL_CAPS.wolf);
spawnPreyAnimals(ANIMAL_CAPS.rabbit, ANIMAL_CAPS.deer, ANIMAL_CAPS.bird);

// Ensure all obstacles in array are indexed into spatial grid
obstacles.forEach(obs => {
    if (obs.obstacleNodes) {
        obs.obstacleNodes.forEach(node => spatialGrid.insert(node));
    } else {
        spatialGrid.insert(obs);
    }
});

// Instantiate Player & Register Ice Hole Array Reference
const player = new Player(camera, document, environment, spatialGrid);
player.scene = scene;
player.weatherManager = weatherManager;
player.interactables = interactables; 
player.obstacles = obstacles;
player.iceHoles = iceHoles;

player.animals = [
    ...bears,
    ...mooses,
    ...wolves,
    ...rabbits,
    ...deers,
    ...birds
];

// Initialize Save System
const saveSystem = new SaveSystem(player, weatherManager, celestialSky, scene, {
    interactables,
    obstacles,
    spatialGrid,
    atvs,
    trees,
    stoneOres,
    metalOres
});
player.saveSystem = saveSystem;

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'F5' || e.code === 'KeyK') {
        e.preventDefault();
        saveSystem.save();
    }
    if (e.code === 'F9' || e.code === 'KeyL') {
        e.preventDefault();
        saveSystem.load();
    }
});

setInterval(() => {
    saveSystem.save();
}, 180000);

scene.add(player.controls.getObject());
player.controls.getObject().position.set(0, 50, 0);

// Handle Click to Play UI
const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => {
    if (!player.inventory.isOpen) {
        player.controls.lock();
    }
});
player.controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
});
player.controls.addEventListener('unlock', () => {
    if (!player.inventory.isOpen) {
        blocker.style.display = 'flex';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game Loop Variables
const clock = new THREE.Clock();
const maxDistSq = 200 * 200;
let respawnTimer = 0;
const RESPAWN_INTERVAL = 10.0; // Check and replenish wildlife counts every 10 seconds
// ATV HUD DOM Elements
const atvHudEl = document.getElementById('atv-hud');
const atvFuelFillEl = document.getElementById('atv-fuel-fill');
const atvFuelTextEl = document.getElementById('atv-fuel-text');

function animate() {
    requestAnimationFrame(animate);

    const timeScale = player.isBulletCamActive ? 0.2 : 1.0;
    const delta = clock.getDelta() * timeScale;

    player.traps = traps;

    celestialSky.update(delta, hemiLight);
    weatherManager.update(delta);
    marketManager.update(delta); // Updates price trends & market event cycle
    player.update(delta);

    const playerPos = player.controls.getObject().position;

    // Periodic wildlife population check & respawning
    respawnTimer += delta;
    if (respawnTimer >= RESPAWN_INTERVAL) {
        respawnTimer = 0;
        processWildlifeRespawning(playerPos);
    }

    // Update active Ice Holes (handles refreezing timers & visual scaling)
    for (let i = iceHoles.length - 1; i >= 0; i--) {
        iceHoles[i].update(delta);
    }

    // Update unmounted ATVs
    atvs.forEach(v => {
        if (!v.isOccupied) {
            v.update(delta);
        }
    });

    // Update Planted Crops Lifecycle
    if (player && player.crops) {
        player.crops.forEach(crop => crop.update(delta));
    }

    bears.forEach(bear => bear.update(delta, player));
    mooses.forEach(moose => moose.update(delta, player));
    wolves.forEach(wolf => wolf.update(delta, player));
    rabbits.forEach(rabbit => rabbit.update(delta, player));
    deers.forEach(deer => deer.update(delta, player));
    birds.forEach(bird => bird.update(delta, player));
    traps.forEach(trap => trap.update(delta, player.animals));

    activeTrees.forEach(tree => {
        const pos = tree.group.position;
        const dx = pos.x - playerPos.x;
        const dz = pos.z - playerPos.z;
        if (dx * dx + dz * dz <= maxDistSq) {
            tree.update(delta);
        }
    });

    // 1. Tick all placed structures (Campfire & Furnace cooking/smelting logic)
    if (saveSystem && saveSystem.placedStructures) {
        saveSystem.placedStructures.forEach(item => {
            if (item.structure && typeof item.structure.update === 'function') {
                item.structure.update(delta);
            }
        });
    }

    activeInteractables.forEach(item => {
        const pos = item.group ? item.group.position : null;
        if (pos) {
            const dx = pos.x - playerPos.x;
            const dz = pos.z - playerPos.z;
            if (dx * dx + dz * dz <= maxDistSq) {
                item.update(delta);
            }
        } else {
            item.update(delta);
        }
    });

    // 2. Real-time UI Render Tick
    if (player && player.inventory && player.inventory.isOpen) {
        if (player.inventory.activeCampfire) player.inventory.renderCampfire();
        if (player.inventory.activeFurnace) player.inventory.renderFurnace();
        if (player.inventory.activeSawmill) player.inventory.renderSawmillProgress();
        if (player.inventory.activeStoneCrusher) player.inventory.renderStoneCrusherProgress();
        if (player.inventory.activeFurStand) player.inventory.renderFurStandProgress();
    }

    // 3. Vehicle Fuel HUD Overlay Tick
    if (player && player.mountedATV) {
        if (atvHudEl) atvHudEl.classList.remove('hidden');
        
        if (player.mountedATV.fuel !== undefined) {
            const pct = Math.max(0, Math.min(100, (player.mountedATV.fuel / player.mountedATV.maxFuel) * 100));
            
            if (atvFuelFillEl) {
                atvFuelFillEl.style.width = `${pct}%`;
            }
            if (atvFuelTextEl) {
                atvFuelTextEl.innerText = `${Math.ceil(player.mountedATV.fuel)}%`;
            }
        }
    } else {
        if (atvHudEl) atvHudEl.classList.add('hidden');
    }

    renderer.render(scene, camera);
}

const marketManager = new MarketManager(weatherManager);
const marketUI = new MarketUI(marketManager, player);
saveSystem.marketManager = marketManager;

// Calculate spawn height FIRST, then create ATV
const atvSpawnX = 8;
const atvSpawnZ = 8;
const atvSpawnY = environment.getTerrainHeight(atvSpawnX, atvSpawnZ);

const atv = new ATV(scene, atvSpawnX, atvSpawnY, atvSpawnZ, sharedContext);
atvs.push(atv);

animate();
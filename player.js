// player.js

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Inventory } from './inventory.js';
import { Projectile } from './projectiles.js';
import { 
    Campfire, StorageChest, WoodenFoundation, WoodenWall, WoodenDoor, WoodenRoof, 
    Furnace, MetalFoundation, MetalWall, MetalDoor, Sawmill, StoneCrusher, 
    FurProcessingStand, Bedroll, AFrameShelter, BUILD_GRID_SIZE, WALL_HEIGHT, 
} from './structures.js';
import { Trap } from './traps.js';
import { WallTorch, StandingLantern, calculateFlicker } from './torches.js';
import { TilledSoil } from './farming.js';
import { FishingSystem } from './fishing.js';
import { IceHole } from './iceHole.js';

export class Player {
    
    constructor(camera, document, environment, spatialGrid = null) {
        this.camera = camera;
        this.environment = environment; 
        this.spatialGrid = spatialGrid;
        this.terrain = environment ? environment.terrain : null;
        this.controls = new PointerLockControls(camera, document.body);
        this.inventory = new Inventory();
        
        this.inventory.setPlayer(this);

        this.mountedATV = null;

        this.spawnBedroll = null;
        this.isInsideShelter = false;
        this.currentShelter = null;

        this.iceHoles = [];

        this.fishingGroup = new THREE.Group();
        this.buildFishingRodModel();
        this.camera.add(this.fishingGroup);

        this.fishingSystem = new FishingSystem(this, this.camera.parent, this.environment);

        this.crops = [];
        this.hoeGroup = new THREE.Group();
        this.buildHoeModel();
        this.camera.add(this.hoeGroup);

        this.torchGroup = new THREE.Group();
        this.buildTorchModel();
        this.camera.add(this.torchGroup);

        this.isPoisoned = false;
        this.poisonTimer = 0;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        this.radius = 0.4;
        this.obstacles = [];
        
        this.interactionRaycaster = new THREE.Raycaster();
        this.interactables = []; 
        this.interactionDistance = 5.0; 

        // Placement Hologram / Building Ghost Setup
        this.hologramGroup = new THREE.Group();
        this.hologramGroup.visible = false;
        this.currentHologramType = null;
        this.hologramValidMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff88, 
            transparent: true, 
            opacity: 0.5, 
            depthWrite: false 
        });
        this.hologramInvalidMat = new THREE.MeshBasicMaterial({ 
            color: 0xff3333, 
            transparent: true, 
            opacity: 0.5, 
            depthWrite: false 
        });

        // Ranged Projectiles & Bullet Cam State
        this.projectiles = [];
        this.animals = [];
        this.isBulletCamActive = false;
        this.activeBulletCamProjectile = null;
        this.savedPlayerPosition = new THREE.Vector3();

        // Tool Groups
        this.axeGroup = new THREE.Group();
        this.pickaxeGroup = new THREE.Group();
        this.flashlightGroup = new THREE.Group();
        this.bowGroup = new THREE.Group();
        this.spearGroup = new THREE.Group();

        // Add tool groups
        this.metalAxeGroup = new THREE.Group();
        this.metalPickaxeGroup = new THREE.Group();

        this.buildMetalAxeModel();
        this.buildMetalPickaxeModel();

        this.camera.add(this.metalAxeGroup);
        this.camera.add(this.metalPickaxeGroup);
        
        this.isFlashlightOn = false;
        this.isSwinging = false;
        this.swingProgress = 0;
        this.swingSpeed = 10;

        this.flashlightSpot = new THREE.SpotLight(0xfff5e0, 15, 140, Math.PI / 6, 0.3, 1);
        this.flashlightSpot.position.set(0.3, -0.25, -0.3);
        this.flashlightSpot.target.position.set(0.3, -0.25, -10);
        this.flashlightSpot.visible = false;
        this.camera.add(this.flashlightSpot);
        this.camera.add(this.flashlightSpot.target);

        this.buildAxeModel();
        this.buildPickaxeModel();
        this.buildFlashlightModel();
        this.buildBowModel();
        this.buildSpearModel();

        this.camera.add(this.axeGroup);
        this.camera.add(this.pickaxeGroup);
        this.camera.add(this.flashlightGroup);
        this.camera.add(this.bowGroup);
        this.camera.add(this.spearGroup);
        
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.isSprinting = false;
        this.isSwimming = false; 
        this.isDead = false;
        
        this.baseSpeed = 50.0; 
        this.sprintMultiplier = 1.8;
        this.jumpForce = 40.0;
        this.gravity = 9.8 * 20.0;
        this.standHeight = 1.6;
        
        this.camera.position.y = this.standHeight;
        
        this.maxHealth = 100;
        this.maxStamina = 100;
        this.maxHunger = 100;
        this.maxThirst = 100;

        // Player Body Temperature System (°C)
        this.maxBodyTemp = 37.0;
        this.bodyTemp = this.maxBodyTemp;
        
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.hunger = this.maxHunger;
        this.thirst = this.maxThirst;
        
        this.ui = {
            health: document.getElementById('health-fill'),
            stamina: document.getElementById('stamina-fill'),
            hunger: document.getElementById('hunger-fill'),
            thirst: document.getElementById('thirst-fill'),
            temp: document.getElementById('temp-fill'),
            tempText: document.getElementById('temp-val-text')
        };
        
        this.initEventListeners(document);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;

        this.stopBulletCam();
        this.isSwinging = false;
        this.swingProgress = 0;

        if (this.controls.isLocked) {
            this.controls.unlock();
        }

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;

        if (this.inventory && this.inventory.isOpen) {
            this.inventory.toggle(this.controls);
        }

        const deathUI = document.getElementById('death-ui');
        if (deathUI) {
            deathUI.classList.remove('hidden');
        }
    }

    respawn() {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.hunger = this.maxHunger;
    this.thirst = this.maxThirst;
    this.bodyTemp = this.maxBodyTemp;

    let spawnX = 0;
    let spawnZ = 0;
    let spawnY = 50;

    // Respawn at bedroll if set and not destroyed
    if (this.spawnBedroll && !this.spawnBedroll.isDestroyed && this.spawnBedroll.group) {
        const pos = this.spawnBedroll.group.position;
        spawnX = pos.x;
        spawnZ = pos.z;
        spawnY = pos.y + (this.standHeight || 1.6) + 0.2;
    } else if (this.environment) {
        const groundY = this.environment.getTerrainHeight(spawnX, spawnZ);
        spawnY = Math.max(groundY + (this.standHeight || 1.6), 2.0);
    }

    this.controls.getObject().position.set(spawnX, spawnY, spawnZ);
    this.velocity.set(0, 0, 0);

    this.isDead = false;
    const deathUI = document.getElementById('death-ui');
    if (deathUI) {
        deathUI.classList.add('hidden');
    }

    this.controls.lock();
}

    getInsulation() {
        let insulation = 0;
        if (this.inventory.equipmentSlots.head && this.inventory.equipmentSlots.head.name === 'Fur Cap') {
            insulation += 8.0;
        }
        if (this.inventory.equipmentSlots.chest && this.inventory.equipmentSlots.chest.name === 'Fur Coat') {
            insulation += 15.0;
        }
        if (this.isInsideShelter) {
        insulation += 20.0;
        }   
        return insulation;
    }

    getCampfireHeat() {
    if (!this.interactables) return 0;
    const playerPos = this.controls.getObject().position;
    let maxHeat = 0;

    for (let i = 0; i < this.interactables.length; i++) {
        const item = this.interactables[i];
        if (!item) continue;
        let campfire = item.userData?.campfire;
        if (!campfire && item.children) {
            for (const child of item.children) {
                if (child.userData?.campfire) {
                    campfire = child.userData.campfire;
                    break;
                }
            }
        }

        // Only grant heat if campfire exists AND is actively burning (isProcessing)
        if (campfire && campfire.isProcessing && campfire.group) {
            const dist = playerPos.distanceTo(campfire.group.position);
            const heatRadius = 8.0;
            if (dist < heatRadius) {
                const heat = (1.0 - (dist / heatRadius)) * 22.0;
                if (heat > maxHeat) maxHeat = heat;
            }
        }
    }
    return maxHeat;
}

    stopBulletCam() {
        if (!this.isBulletCamActive) return;
        this.isBulletCamActive = false;
        this.activeBulletCamProjectile = null;
        this.controls.getObject().position.copy(this.savedPlayerPosition);
    }

    setSpawnPoint(bedroll) {
    this.spawnBedroll = bedroll;
    if (this.saveSystem) {
        this.saveSystem.showNotification('Respawn Point Set!');
    }
}

    takeDamage(amount) {
    if (this.health <= 0 || this.isDead) return;

    let finalDamage = amount;

    if (this.inventory && this.inventory.equipmentSlots) {
        let defense = 0;
        const headArmor = this.inventory.equipmentSlots.head;
        const chestArmor = this.inventory.equipmentSlots.chest;

        if (headArmor) {
            if (headArmor.name === 'Fur Cap') defense += 0.15;
            if (headArmor.name === 'Metal Helmet') defense += 0.35;
            
            // Only apply durability wear on physical hits (amount >= 0.5) without Math.ceil
            if (amount >= 0.5) {
                this.inventory.damageEquippedArmor('head', amount * 0.4);
            }
        }

        if (chestArmor) {
            if (chestArmor.name === 'Fur Coat') defense += 0.25;
            if (chestArmor.name === 'Metal Chestplate') defense += 0.50;
            
            // Only apply durability wear on physical hits (amount >= 0.5) without Math.ceil
            if (amount >= 0.5) {
                this.inventory.damageEquippedArmor('chest', amount * 0.6);
            }
        }

        finalDamage *= (1 - Math.min(0.8, defense));
    }

    this.health = Math.max(0, this.health - finalDamage);

    if (this.ui.health && this.ui.health.parentElement) {
        const bar = this.ui.health.parentElement;
        bar.style.borderColor = '#ff3333';
        setTimeout(() => {
            if (bar) bar.style.borderColor = '#111';
        }, 200);
    }

    if (this.health <= 0) {
        this.die();
    }
}

    buildTorchModel() {
    const shaftMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
    const wrapMat = new THREE.MeshPhongMaterial({ color: 0x8c7355, flatShading: true });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 });

    const shaftGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.65, 7);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    this.torchGroup.add(shaft);

    const wrapGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.18, 7);
    const wrap = new THREE.Mesh(wrapGeo, wrapMat);
    wrap.position.y = 0.28;
    this.torchGroup.add(wrap);

    const outerFlameGeo = new THREE.ConeGeometry(0.1, 0.28, 5);
    this.handheldOuterFlame = new THREE.Mesh(outerFlameGeo, flameMat);
    this.handheldOuterFlame.position.y = 0.48;
    this.torchGroup.add(this.handheldOuterFlame);

    const innerFlameGeo = new THREE.ConeGeometry(0.06, 0.18, 5);
    this.handheldInnerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    this.handheldInnerFlame.position.y = 0.44;
    this.torchGroup.add(this.handheldInnerFlame);

    // Handheld Dynamic Light
    this.torchLight = new THREE.PointLight(0xff7700, 4.0, 25);
    this.torchLight.position.set(0, 0.5, 0);
    this.torchGroup.add(this.torchLight);

    this.torchGroup.position.set(0.32, -0.32, -0.45);
    this.torchGroup.rotation.set(0.2, -0.3, 0.1);
}

buildFishingRodModel() {
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Flexible Rod Shaft
    const rodGeo = new THREE.CylinderGeometry(0.01, 0.025, 1.6, 7);
    const rod = new THREE.Mesh(rodGeo, woodMat);
    rod.rotation.x = -Math.PI / 4;
    rod.position.set(0, 0.4, -0.6);
    this.fishingGroup.add(rod);

    // Reel Cylinder
    const reelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
    const reel = new THREE.Mesh(reelGeo, woodMat);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0.05, -0.1, -0.2);
    this.fishingGroup.add(reel);

    this.fishingGroup.position.set(0.35, -0.35, -0.4);
    this.fishingGroup.rotation.set(0.1, -0.2, 0.1);
}

buildHoeModel() {
    const handleMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, flatShading: true, shininess: 70 });

    const handleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.85, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    this.hoeGroup.add(handle);

    const bladeGeo = new THREE.BoxGeometry(0.18, 0.14, 0.02);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.38, -0.06);
    blade.rotation.x = Math.PI / 3;
    this.hoeGroup.add(blade);

    this.hoeGroup.position.set(0.35, -0.35, -0.5);
    this.hoeGroup.rotation.set(0.2, -0.4, 0.1);
}

    buildMetalAxeModel() {
        const handleMat = new THREE.MeshPhongMaterial({ color: 0x3d2314, flatShading: true });
        const handleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.75, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = -0.2;
        this.metalAxeGroup.add(handle);

        const headMat = new THREE.MeshPhongMaterial({ color: 0x2c3033, flatShading: true, shininess: 100 });
        const headGeo = new THREE.BoxGeometry(0.06, 0.22, 0.16);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.04, 0.3, -0.04);
        this.metalAxeGroup.add(head);

        const edgeMat = new THREE.MeshPhongMaterial({ color: 0xd0d5dd, flatShading: true, shininess: 140 });
        const edgeGeo = new THREE.BoxGeometry(0.02, 0.26, 0.09);
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(0.06, 0.3, -0.08);
        this.metalAxeGroup.add(edge);

        this.metalAxeGroup.position.set(0.35, -0.35, -0.5);
        this.metalAxeGroup.rotation.set(0.2, -0.4, 0.1);
    }

    buildMetalPickaxeModel() {
        const handleMat = new THREE.MeshPhongMaterial({ color: 0x24160c, flatShading: true });
        const handleGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.8, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        this.metalPickaxeGroup.add(handle);

        const headSteelMat = new THREE.MeshPhongMaterial({ color: 0x3a3f44, flatShading: true, shininess: 120 });
        const edgeSteelMat = new THREE.MeshPhongMaterial({ color: 0xe0e6ed, flatShading: true, shininess: 150 });

        const frontPickGeo = new THREE.ConeGeometry(0.045, 0.3, 5);
        const frontPick = new THREE.Mesh(frontPickGeo, edgeSteelMat);
        frontPick.rotation.z = -Math.PI / 2 - 0.25;
        frontPick.position.set(0.15, 0.3, 0);
        this.metalPickaxeGroup.add(frontPick);

        const rearPickGeo = new THREE.ConeGeometry(0.04, 0.22, 5);
        const rearPick = new THREE.Mesh(rearPickGeo, headSteelMat);
        rearPick.rotation.z = Math.PI / 2 + 0.15;
        rearPick.position.set(-0.12, 0.33, 0);
        this.metalPickaxeGroup.add(rearPick);

        this.metalPickaxeGroup.position.set(0.35, -0.35, -0.5);
        this.metalPickaxeGroup.rotation.set(0.2, -0.4, 0.1);
    }

    buildAxeModel() {
        const handleMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
        const handleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.75, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = -0.2;
        handle.position.set(0, 0, 0);
        this.axeGroup.add(handle);

        const headMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, flatShading: true, shininess: 80 });
        const headGeo = new THREE.BoxGeometry(0.06, 0.2, 0.14);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.04, 0.3, -0.04);
        this.axeGroup.add(head);

        const edgeMat = new THREE.MeshPhongMaterial({ color: 0xbdc3c7, flatShading: true, shininess: 100 });
        const edgeGeo = new THREE.BoxGeometry(0.02, 0.24, 0.08);
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(0.06, 0.3, -0.08);
        this.axeGroup.add(edge);

        this.axeGroup.position.set(0.35, -0.35, -0.5);
        this.axeGroup.rotation.set(0.2, -0.4, 0.1);
    }

    buildPickaxeModel() {
        const handleMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
        const handleGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.8, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0, 0);
        this.pickaxeGroup.add(handle);

        const gripMat = new THREE.MeshPhongMaterial({ color: 0x24160c, flatShading: true });
        const gripGeo = new THREE.CylinderGeometry(0.025, 0.027, 0.22, 8);
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.set(0, -0.22, 0);
        this.pickaxeGroup.add(grip);

        const collarMat = new THREE.MeshPhongMaterial({ color: 0x4a4d52, flatShading: true, shininess: 70 });
        const collarGeo = new THREE.BoxGeometry(0.055, 0.09, 0.065);
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.position.set(0, 0.32, 0);
        this.pickaxeGroup.add(collar);

        const headSteelMat = new THREE.MeshPhongMaterial({ color: 0x7a8288, flatShading: true, shininess: 100 });
        const edgeSteelMat = new THREE.MeshPhongMaterial({ color: 0xb5bec6, flatShading: true, shininess: 120 });

        const frontPickGeo = new THREE.ConeGeometry(0.045, 0.28, 5);
        const frontPick = new THREE.Mesh(frontPickGeo, edgeSteelMat);
        frontPick.rotation.z = -Math.PI / 2 - 0.25;
        frontPick.position.set(0.14, 0.3, 0);
        this.pickaxeGroup.add(frontPick);

        const rearPickGeo = new THREE.ConeGeometry(0.04, 0.2, 5);
        const rearPick = new THREE.Mesh(rearPickGeo, headSteelMat);
        rearPick.rotation.z = Math.PI / 2 + 0.15;
        rearPick.position.set(-0.11, 0.33, 0);
        this.pickaxeGroup.add(rearPick);

        const topPinGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const topPin = new THREE.Mesh(topPinGeo, headSteelMat);
        topPin.position.set(0, 0.38, 0);
        this.pickaxeGroup.add(topPin);

        this.pickaxeGroup.position.set(0.35, -0.35, -0.5);
        this.pickaxeGroup.rotation.set(0.2, -0.4, 0.1);
    }

    buildFlashlightModel() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x22252a, flatShading: true });
        const metallicMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, flatShading: true, shininess: 80 });
        const buttonMat = new THREE.MeshPhongMaterial({ color: 0xcc2222, flatShading: true });
        this.flashlightLensMat = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            emissive: 0x000000, 
            shininess: 100 
        });

        const bodyGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.3, 12);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        this.flashlightGroup.add(body);

        const ringGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.015, 12);
        for (let i = -0.08; i <= 0.04; i += 0.04) {
            const ring = new THREE.Mesh(ringGeo, metallicMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = i;
            this.flashlightGroup.add(ring);
        }

        const headGeo = new THREE.CylinderGeometry(0.048, 0.032, 0.1, 12);
        const head = new THREE.Mesh(headGeo, metallicMat);
        head.rotation.x = Math.PI / 2;
        head.position.z = -0.18;
        this.flashlightGroup.add(head);

        const lensGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.01, 12);
        const lens = new THREE.Mesh(lensGeo, this.flashlightLensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.z = -0.231;
        this.flashlightGroup.add(lens);

        const buttonGeo = new THREE.BoxGeometry(0.015, 0.015, 0.03);
        const button = new THREE.Mesh(buttonGeo, buttonMat);
        button.position.set(0, 0.032, 0);
        this.flashlightGroup.add(button);

        this.flashlightGroup.position.set(0.35, -0.3, -0.5);
        this.flashlightGroup.rotation.set(0.1, -0.2, 0);
    }

    buildBowModel() {
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x6e4727, flatShading: true });
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

        const curve = new THREE.TorusGeometry(0.38, 0.018, 6, 12, Math.PI);
        const bowFrame = new THREE.Mesh(curve, woodMat);
        bowFrame.rotation.y = Math.PI / 2;
        this.bowGroup.add(bowFrame);

        const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.75, 4);
        const string = new THREE.Mesh(stringGeo, stringMat);
        string.position.set(0, 0, 0);
        this.bowGroup.add(string);

        this.bowGroup.position.set(0.3, -0.25, -0.45);
        this.bowGroup.rotation.set(0.1, -0.3, 0.2);
    }

    buildSpearModel() {
        const shaftMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
        const tipMat = new THREE.MeshPhongMaterial({ color: 0x65696d, flatShading: true, shininess: 70 });

        const shaftGeo = new THREE.CylinderGeometry(0.018, 0.022, 1.2, 8);
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.rotation.x = Math.PI / 2;
        this.spearGroup.add(shaft);

        const tipGeo = new THREE.ConeGeometry(0.035, 0.2, 5);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = -Math.PI / 2;
        tip.position.z = -0.7;
        this.spearGroup.add(tip);

        this.spearGroup.position.set(0.35, -0.35, -0.4);
        this.spearGroup.rotation.set(0.1, -0.2, 0.1);
    }

    triggerToolSwing() {
        if (this.isSwinging) return;
        this.isSwinging = true;
        this.swingProgress = 0;
    }

    initEventListeners(document) {
    const onKeyDown = (event) => {
        // Prevent key-repeat spam while holding keys like Shift or WASD
        if (event.repeat || this.isDead) return;

        if (event.code === 'KeyQ') {
            this.inventory.toggle(this.controls, 'inventory');
            return;
        }

        if (event.code === 'KeyC') {
            this.inventory.toggle(this.controls, 'crafting');
            return;
        }

        if (event.code === 'KeyF') {
            if (this.mountedATV) {
                this.mountedATV.toggleHeadlight();
                return;
            }
            const activeItem = this.inventory.getActiveItem();
            if (activeItem && activeItem.name === 'Flashlight') {
                this.isFlashlightOn = !this.isFlashlightOn;
            }
            return;
        }

        if (event.code.startsWith('Digit')) {
            const slotIndex = parseInt(event.code.replace('Digit', '')) - 1;
            if (slotIndex >= 0 && slotIndex < 5) {
                this.inventory.setActiveHotbarSlot(slotIndex);
            }
        }

        if (this.inventory.isOpen) return;

        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': 
                if (this.canJump && this.stamina > 10) {
                    this.velocity.y += this.jumpForce;
                    this.stamina -= 10;
                    this.canJump = false;
                }
                break;
            case 'ShiftLeft': this.isSprinting = true; break;
            case 'KeyE':
                this.handleInteraction();
                break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft': this.isSprinting = false; break;
        }
    };

    // Accumulate mouse movement deltas across frames
    const onMouseMove = (event) => {
        if (!this.controls.isLocked || this.isDead || this.inventory.isOpen) return;
        this.mouseDeltaX = (this.mouseDeltaX || 0) + (event.movementX || 0);
        this.mouseDeltaY = (this.mouseDeltaY || 0) + (event.movementY || 0);
    };

    const onMouseDown = (event) => {
        if (this.isDead) return;

        if (event.button === 0 && this.controls.isLocked) {
            this.handlePrimaryAction();
        }
    };

    const onMouseUp = (event) => {
        if (event.button === 0) {
            this.stopBulletCam();
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    
    this.controls.addEventListener('unlock', () => {
        this.stopBulletCam();
    });

    const respawnBtn = document.getElementById('respawn-btn');
    if (respawnBtn) {
        respawnBtn.addEventListener('click', () => {
            this.respawn();
        });
    }
}

   getPlacementTransform(activeName) {
    const buildableNames = [
        'Campfire', 'Chest', 'Furnace', 
        'Sawmill', 'Stone Crusher', 'Fur Processing Stand',
        'Wooden Foundation', 'Wooden Wall', 'Wooden Door', 'Wooden Roof', 
        'Metal Foundation', 'Metal Wall', 'Metal Door', 'Bedroll', 'A-Frame Shelter',
        'Wall Torch', 'Standing Lantern',
        'Primitive Small Trap', 'Small Snare', 'Medium Snare', 'Small Snap Trap', 'Medium Snap Trap',

    ];
    if (!buildableNames.includes(activeName)) return null;

    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.interactionRaycaster.intersectObjects(this.interactables, true);
    const groundIntersects = this.terrain ? this.interactionRaycaster.intersectObject(this.terrain) : [];

    if (intersects.length === 0 && groundIntersects.length === 0) {
        return { hasHit: false };
    }

    let hit = null;
    if (intersects.length > 0 && groundIntersects.length > 0) {
        hit = intersects[0].distance < groundIntersects[0].distance ? intersects[0] : groundIntersects[0];
    } else {
        hit = intersects.length > 0 ? intersects[0] : groundIntersects[0];
    }

    if (!hit || hit.distance > 8.0) {
        return { hasHit: false };
    }

    let spawnX = hit.point.x;
    let spawnY = hit.point.y;
    let spawnZ = hit.point.z;
    let rotationY = 0;
    let isValid = false;

    const freePlacementItems = [
        'Campfire', 'Chest', 'Furnace',
        'Sawmill', 'Stone Crusher', 'Fur Processing Stand', 'Bedroll', 'A-Frame Shelter',
        'Wall Torch', 'Standing Lantern',
        'Primitive Small Trap', 'Small Snare', 'Medium Snare', 'Small Snap Trap', 'Medium Snap Trap',

    ];

    if (freePlacementItems.includes(activeName)) {
        isValid = true;
    } else if (activeName === 'Wooden Foundation' || activeName === 'Metal Foundation') {
        let hitBuilding = null;
        let parent = hit.object;
        while (parent) {
            if (parent.userData && parent.userData.buildingType) {
                hitBuilding = parent.userData;
                break;
            }
            parent = parent.parent;
        }

        if (hitBuilding && hitBuilding.buildingType === 'foundation') {
            const basePos = hitBuilding.structure.group.position;
            const dx = hit.point.x - basePos.x;
            const dz = hit.point.z - basePos.z;

            if (Math.abs(dx) > Math.abs(dz)) {
                spawnX = basePos.x + (dx > 0 ? BUILD_GRID_SIZE : -BUILD_GRID_SIZE);
                spawnZ = basePos.z;
            } else {
                spawnX = basePos.x;
                spawnZ = basePos.z + (dz > 0 ? BUILD_GRID_SIZE / 2 : -BUILD_GRID_SIZE / 2);
            }
            spawnY = basePos.y;
        } else {
            spawnX = Math.round(hit.point.x / BUILD_GRID_SIZE) * BUILD_GRID_SIZE;
            spawnZ = Math.round(hit.point.z / BUILD_GRID_SIZE) * BUILD_GRID_SIZE;
            spawnY = this.environment ? this.environment.getTerrainHeight(spawnX, spawnZ) : hit.point.y;
        }
        isValid = true;
    } else if (activeName === 'Wooden Wall' || activeName === 'Wooden Door' || activeName === 'Metal Wall' || activeName === 'Metal Door') {
        let hitFoundation = null;
        let parent = hit.object;
        while (parent) {
            if (parent.userData && parent.userData.buildingType === 'foundation') {
                hitFoundation = parent.userData.structure;
                break;
            }
            parent = parent.parent;
        }

        if (hitFoundation) {
            const basePos = hitFoundation.group.position;
            const localX = hit.point.x - basePos.x;
            const localZ = hit.point.z - basePos.z;

            if (Math.abs(localX) > Math.abs(localZ)) {
                spawnX = basePos.x + (localX > 0 ? BUILD_GRID_SIZE / 2 : -BUILD_GRID_SIZE / 2);
                spawnZ = basePos.z;
                rotationY = Math.PI / 2;
            } else {
                spawnX = basePos.x;
                spawnZ = basePos.z + (localZ > 0 ? BUILD_GRID_SIZE / 2 : -BUILD_GRID_SIZE / 2);
                rotationY = 0;
            }
            spawnY = basePos.y;
            isValid = true;
        } else {
            isValid = false;
        }
    } else if (activeName === 'Wooden Roof') {
        let hitWall = null;
        let parent = hit.object;
        while (parent) {
            if (parent.userData && (parent.userData.buildingType === 'wall' || parent.userData.buildingType === 'door')) {
                hitWall = parent.userData.structure;
                break;
            }
            parent = parent.parent;
        }

        if (hitWall) {
            const wallPos = hitWall.group.position;
            spawnX = Math.round(wallPos.x / BUILD_GRID_SIZE) * BUILD_GRID_SIZE;
            spawnZ = Math.round(wallPos.z / BUILD_GRID_SIZE) * BUILD_GRID_SIZE;
            spawnY = wallPos.y + WALL_HEIGHT;
            isValid = true;
        } else {
            isValid = false;
        }
    }

    return {
        spawnX,
        spawnY,
        spawnZ,
        rotationY,
        isValid,
        hasHit: true
    };
}

   rebuildHologramMesh(activeName) {
    while (this.hologramGroup.children.length > 0) {
        this.hologramGroup.remove(this.hologramGroup.children[0]);
    }

    const mat = this.hologramValidMat;

    if (activeName === 'Campfire') {
        const ashGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.05, 8);
        const ash = new THREE.Mesh(ashGeo, mat);
        ash.position.y = 0.025;
        this.hologramGroup.add(ash);

        const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0);
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const stone = new THREE.Mesh(stoneGeo, mat);
            stone.position.set(Math.cos(angle) * 0.65, 0.1, Math.sin(angle) * 0.65);
            this.hologramGroup.add(stone);
        }

        const logGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6);
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const log = new THREE.Mesh(logGeo, mat);
            log.position.set(Math.cos(angle) * 0.25, 0.25, Math.sin(angle) * 0.25);
            log.rotation.y = angle;
            log.rotation.z = 0.4;
            this.hologramGroup.add(log);
        }

        const flameGeo = new THREE.ConeGeometry(0.28, 0.65, 5);
        const flame = new THREE.Mesh(flameGeo, mat);
        flame.position.y = 0.45;
        this.hologramGroup.add(flame);
    } else if (activeName === 'Chest') {
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.35;
        this.hologramGroup.add(body);

        const lidGeo = new THREE.BoxGeometry(1.24, 0.22, 0.84);
        const lid = new THREE.Mesh(lidGeo, mat);
        lid.position.set(0, 0.81, 0);
        this.hologramGroup.add(lid);

        const latchGeo = new THREE.BoxGeometry(0.16, 0.18, 0.08);
        const latch = new THREE.Mesh(latchGeo, mat);
        latch.position.set(0, 0.65, 0.43);
        this.hologramGroup.add(latch);
    } else if (activeName === 'Furnace') {
        const baseGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = 0.6;
        this.hologramGroup.add(base);

        const holeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.5);
        const hole = new THREE.Mesh(holeGeo, mat);
        hole.position.set(0, 0.4, 0.45);
        this.hologramGroup.add(hole);

        const chimneyGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
        const chimney = new THREE.Mesh(chimneyGeo, mat);
        chimney.position.y = 1.45;
        this.hologramGroup.add(chimney);
    } else if (activeName === 'Sawmill') {
        const tableGeo = new THREE.BoxGeometry(2.0, 0.2, 1.2);
        const table = new THREE.Mesh(tableGeo, mat);
        table.position.y = 0.8;
        this.hologramGroup.add(table);

        const legGeo = new THREE.BoxGeometry(0.15, 0.8, 0.15);
        const legPositions = [[-0.85, 0.4, -0.45], [0.85, 0.4, -0.45], [-0.85, 0.4, 0.45], [0.85, 0.4, 0.45]];
        legPositions.forEach(p => {
            const leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(...p);
            this.hologramGroup.add(leg);
        });

        const bladeGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 16);
        const sawBlade = new THREE.Mesh(bladeGeo, mat);
        sawBlade.rotation.z = Math.PI / 2;
        sawBlade.position.set(0, 1.05, 0);
        this.hologramGroup.add(sawBlade);
    } else if (activeName === 'Stone Crusher') {
        const hopperGeo = new THREE.ConeGeometry(0.8, 0.9, 6);
        const hopper = new THREE.Mesh(hopperGeo, mat);
        hopper.rotation.x = Math.PI;
        hopper.position.y = 1.1;
        this.hologramGroup.add(hopper);

        const baseGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = 0.3;
        this.hologramGroup.add(base);

        const hammerGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        const hammer = new THREE.Mesh(hammerGeo, mat);
        hammer.position.set(0, 0.9, 0);
        this.hologramGroup.add(hammer);
    } else if (activeName === 'Fur Processing Stand') {
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6);
        const leftPole = new THREE.Mesh(poleGeo, mat);
        leftPole.position.set(-0.8, 0.9, 0);
        const rightPole = new THREE.Mesh(poleGeo, mat);
        rightPole.position.set(0.8, 0.9, 0);

        const crossGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6);
        const crossTop = new THREE.Mesh(crossGeo, mat);
        crossTop.rotation.z = Math.PI / 2;
        crossTop.position.set(0, 1.6, 0);

        const crossBottom = new THREE.Mesh(crossGeo, mat);
        crossBottom.rotation.z = Math.PI / 2;
        crossBottom.position.set(0, 0.4, 0);

        const hideGeo = new THREE.BoxGeometry(1.1, 1.0, 0.04);
        const stretchedHide = new THREE.Mesh(hideGeo, mat);
        stretchedHide.position.set(0, 1.0, 0);

        this.hologramGroup.add(leftPole, rightPole, crossTop, crossBottom, stretchedHide);
    } else if (activeName === 'Wooden Foundation' || activeName === 'Metal Foundation') {
        const deckGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.3, BUILD_GRID_SIZE);
        const deck = new THREE.Mesh(deckGeo, mat);
        deck.position.y = 0.15;
        this.hologramGroup.add(deck);

        const postGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
        const postOffsets = [
            [-1.85, -0.15, -1.85], [1.85, -0.15, -1.85],
            [-1.85, -0.15, 1.85],  [1.85, -0.15, 1.85]
        ];
        postOffsets.forEach(pos => {
            const post = new THREE.Mesh(postGeo, mat);
            post.position.set(...pos);
            this.hologramGroup.add(post);
        });
    } else if (activeName === 'Wooden Wall' || activeName === 'Metal Wall') {
        const wallGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, WALL_HEIGHT, 0.15);
        const wall = new THREE.Mesh(wallGeo, mat);
        wall.position.y = WALL_HEIGHT / 2;
        this.hologramGroup.add(wall);

        const beamGeo = new THREE.BoxGeometry(0.25, WALL_HEIGHT, 0.22);
        const leftBeam = new THREE.Mesh(beamGeo, mat);
        leftBeam.position.set(-1.88, WALL_HEIGHT / 2, 0);
        const rightBeam = new THREE.Mesh(beamGeo, mat);
        rightBeam.position.set(1.88, WALL_HEIGHT / 2, 0);
        this.hologramGroup.add(leftBeam, rightBeam);
    } else if (activeName === 'Wooden Door' || activeName === 'Metal Door') {
        const topFrameGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.2, 0.2);
        const topFrame = new THREE.Mesh(topFrameGeo, mat);
        topFrame.position.y = WALL_HEIGHT - 0.1;
        this.hologramGroup.add(topFrame);

        const sideFrameGeo = new THREE.BoxGeometry(0.5, WALL_HEIGHT, 0.2);
        const leftSide = new THREE.Mesh(sideFrameGeo, mat);
        leftSide.position.set(-1.75, WALL_HEIGHT / 2, 0);
        const rightSide = new THREE.Mesh(sideFrameGeo, mat);
        rightSide.position.set(1.75, WALL_HEIGHT / 2, 0);
        this.hologramGroup.add(leftSide, rightSide);

        const doorPanelHeight = WALL_HEIGHT - 0.2;
        const doorPanelGeo = new THREE.BoxGeometry(3.0, doorPanelHeight, 0.12);
        const doorPanel = new THREE.Mesh(doorPanelGeo, mat);
        doorPanel.position.set(0, doorPanelHeight / 2, 0);
        this.hologramGroup.add(doorPanel);
    } else if (activeName === 'Wooden Roof') {
        const roofGeo = new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.15, BUILD_GRID_SIZE);
        const roof = new THREE.Mesh(roofGeo, mat);
        roof.position.y = 0.075;
        this.hologramGroup.add(roof);

        const beamGeo = new THREE.BoxGeometry(0.2, 0.2, BUILD_GRID_SIZE);
        const beam1 = new THREE.Mesh(beamGeo, mat);
        beam1.position.set(-1.9, -0.05, 0);
        const beam2 = new THREE.Mesh(beamGeo, mat);
        beam2.position.set(1.9, -0.05, 0);
        this.hologramGroup.add(beam1, beam2);
    } else if (activeName === 'Bedroll') {
        const matGeo = new THREE.BoxGeometry(1.2, 0.14, 2.0);
        const matMesh = new THREE.Mesh(matGeo, mat);
        matMesh.position.y = 0.07;
        this.hologramGroup.add(matMesh);

        const pillowGeo = new THREE.BoxGeometry(1.0, 0.16, 0.45);
        const pillowMesh = new THREE.Mesh(pillowGeo, mat);
        pillowMesh.position.set(0, 0.15, -0.7);
        this.hologramGroup.add(pillowMesh);
    } else if (activeName === 'Wall Torch') {
        const bracketGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const bracket = new THREE.Mesh(bracketGeo, mat);
        this.hologramGroup.add(bracket);

        const torchGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.65, 7);
        const torch = new THREE.Mesh(torchGeo, mat);
        torch.position.set(0, 0.28, 0.22);
        this.hologramGroup.add(torch);

        const flameGeo = new THREE.ConeGeometry(0.14, 0.35, 5);
        const flame = new THREE.Mesh(flameGeo, mat);
        flame.position.set(0, 0.7, 0.22);
        this.hologramGroup.add(flame);
    } else if (activeName === 'Standing Lantern') {
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8);
        const post = new THREE.Mesh(postGeo, mat);
        post.position.y = 1.1;
        this.hologramGroup.add(post);

        const armGeo = new THREE.BoxGeometry(0.04, 0.04, 0.45);
        const arm = new THREE.Mesh(armGeo, mat);
        arm.position.set(0, 2.2, 0.2);
        this.hologramGroup.add(arm);

        const glassGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 4);
        const glass = new THREE.Mesh(glassGeo, mat);
        glass.position.set(0, 1.97, 0.38);
        this.hologramGroup.add(glass);
    } else if (activeName === 'Primitive Small Trap') {
        const cageGeo = new THREE.BoxGeometry(0.8 * 0.8, 0.5 * 0.8, 0.8 * 0.8);
        const cage = new THREE.Mesh(cageGeo, mat);
        cage.position.y = 0.35;
        cage.rotation.z = 0.35;
        this.hologramGroup.add(cage);

        const stickGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5);
        const stick = new THREE.Mesh(stickGeo, mat);
        stick.position.set(0.3, 0.2, 0);
        this.hologramGroup.add(stick);
    } else if (activeName === 'Small Snare' || activeName === 'Medium Snare') {
        const mult = activeName === 'Medium Snare' ? 1.4 : 1.0;
        const stakeGeo = new THREE.CylinderGeometry(0.04 * mult, 0.02 * mult, 0.6 * mult, 6);
        const stake = new THREE.Mesh(stakeGeo, mat);
        stake.position.y = 0.2 * mult;

        const loopGeo = new THREE.TorusGeometry(0.35 * mult, 0.015 * mult, 6, 12);
        const loop = new THREE.Mesh(loopGeo, mat);
        loop.rotation.x = Math.PI / 2;
        loop.position.set(0, 0.15, 0.3 * mult);
        this.hologramGroup.add(stake, loop);
    } else if (activeName === 'Small Snap Trap' || activeName === 'Medium Snap Trap') {
        const scale = activeName === 'Medium Snap Trap' ? 1.5 : 1.0;
        const baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.06, 0.6 * scale);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = 0.03;

        const plateGeo = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.04, 8);
        const plate = new THREE.Mesh(plateGeo, mat);
        plate.position.y = 0.06;

        const jawGeo = new THREE.BoxGeometry(0.04, 0.35 * scale, 0.55 * scale);
        const leftJaw = new THREE.Mesh(jawGeo, mat);
        leftJaw.position.set(-0.35 * scale, 0.05 + (0.18 * scale), 0);

        const rightJaw = new THREE.Mesh(jawGeo, mat);
        rightJaw.position.set(0.35 * scale, 0.05 + (0.18 * scale), 0);

        this.hologramGroup.add(base, plate, leftJaw, rightJaw);
    } else if (activeName === 'A-Frame Shelter') {
        const height = 2.4;
        const width = 2.6;
        const depth = 3.0;

        const ridgeGeo = new THREE.CylinderGeometry(0.08, 0.08, depth + 0.4, 6);
        const ridge = new THREE.Mesh(ridgeGeo, mat);
        ridge.rotation.x = Math.PI / 2;
        ridge.position.set(0, height, 0);
        this.hologramGroup.add(ridge);

        const slopeLen = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height, 2));
        const angle = Math.atan2(width / 2, height);
        const roofGeo = new THREE.BoxGeometry(slopeLen, 0.08, depth);

        const leftRoof = new THREE.Mesh(roofGeo, mat);
        leftRoof.position.set(-width / 4, height / 2, 0);
        leftRoof.rotation.z = angle;

        const rightRoof = new THREE.Mesh(roofGeo, mat);
        rightRoof.position.set(width / 4, height / 2, 0);
        rightRoof.rotation.z = -angle;

        this.hologramGroup.add(leftRoof, rightRoof);
    }
}

    updateHologram() {
        const activeItem = this.inventory.getActiveItem();
        const activeName = activeItem ? activeItem.name : null;
        const buildableNames = [
            'Campfire', 'Chest', 'Furnace', 
            'Sawmill', 'Stone Crusher', 'Fur Processing Stand',
            'Wooden Foundation', 'Wooden Wall', 'Wooden Door', 'Wooden Roof', 
            'Metal Foundation', 'Metal Wall', 'Metal Door', 'Bedroll', 'A-Frame Shelter',
            'Primitive Small Trap', 'Small Snare', 'Medium Snare', 'Small Snap Trap', 'Medium Snap Trap',
            'Wall Torch', 'Standing Lantern',
        ];
        if (!activeName || !buildableNames.includes(activeName) || !this.controls.isLocked || this.isBulletCamActive) {
            if (this.hologramGroup) {
                this.hologramGroup.visible = false;
            }
            return;
        }

        if (!this.hologramGroup.parent && this.camera.parent) {
            this.camera.parent.add(this.hologramGroup);
        }

        const transform = this.getPlacementTransform(activeName);

        if (!transform || !transform.hasHit) {
            this.hologramGroup.visible = false;
            return;
        }

        if (this.currentHologramType !== activeName) {
            this.rebuildHologramMesh(activeName);
            this.currentHologramType = activeName;
        }

        const activeMaterial = transform.isValid ? this.hologramValidMat : this.hologramInvalidMat;
        this.hologramGroup.traverse(child => {
            if (child.isMesh) {
                child.material = activeMaterial;
            }
        });

        this.hologramGroup.position.set(transform.spawnX, transform.spawnY, transform.spawnZ);
        this.hologramGroup.rotation.y = transform.rotationY;
        this.hologramGroup.visible = true;
    }

 handlePrimaryAction() {
    if (!this.controls.isLocked) return;

    const activeItem = this.inventory.getActiveItem();
    const activeName = activeItem ? activeItem.name : '';

    // --- 1. Consumable Items & Apparel ---
    const consumableNames = [
        'Fur Cap', 'Fur Coat', 'Bandage', 'Berries', 'Egg', 
        'Raw Meat', 'Cooked Meat', 'Raw Fish', 'Cooked Fish',
        'Leather Canteen (Water)', 'Leather Canteen (Dirty Water)', 
        'Leather Canteen (Clean Water)'
    ];

    if (consumableNames.includes(activeName)) {
        this.inventory.useItem('hotbar', this.inventory.activeHotbarIndex);
        return;
    }

    // --- 2. Bow & Arrow Action ---
    if (activeName === 'Hunting Bow' || activeName === 'Bow') {
        const arrowCount = this.inventory.getItemCount('Arrows');
        if (arrowCount > 0) {
            this.inventory.removeIngredients([{ name: 'Arrows', count: 1 }]);
            this.triggerToolSwing();

            // Applies tier-scaled durability (1.0 HP per shot)
            this.inventory.damageActiveItem(null, this);

            const camDir = new THREE.Vector3();
            this.camera.getWorldDirection(camDir);
            const spawnPos = this.camera.position.clone().add(camDir.clone().multiplyScalar(0.8));

            const proj = new Projectile(this.camera.parent, spawnPos, camDir, 'arrow', {
                interactables: this.interactables,
                animals: this.animals,
                environment: this.environment,
                player: this
            });
            this.projectiles.push(proj);

            this.savedPlayerPosition.copy(this.controls.getObject().position);
            this.isBulletCamActive = true;
            this.activeBulletCamProjectile = proj;
        }
        return;
    }

    // --- 3. Thrown Spear Action ---
    if (activeName === 'Spear' || activeName === 'Wooden Spear') {
        const activeSlotIdx = this.inventory.activeHotbarIndex;

        activeItem.count--;
        if (activeItem.count <= 0) {
            this.inventory.hotbarSlots[activeSlotIdx] = null;
        }
        this.inventory.renderHotbar();

        this.triggerToolSwing();

        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const spawnPos = this.camera.position.clone().add(camDir.clone().multiplyScalar(0.8));

        const proj = new Projectile(this.camera.parent, spawnPos, camDir, 'spear', {
            interactables: this.interactables,
            animals: this.animals,
            environment: this.environment,
            player: this
        });
        this.projectiles.push(proj);

        this.savedPlayerPosition.copy(this.controls.getObject().position);
        this.isBulletCamActive = true;
        this.activeBulletCamProjectile = proj;
        return;
    }

    // --- 3.5. Fishing Rod Action ---
    if (activeName === 'Fishing Rod' && this.fishingSystem) {
        this.triggerToolSwing();
        if (this.fishingSystem.state === 'IDLE') {
            this.fishingSystem.castLine();
        } else {
            this.fishingSystem.reelLine();
        }
        return;
    }

    // --- 3.6. Ice Hole Carving in Winter (Axes & Pickaxes) ---
    const isMetalAxe = activeName === 'Metal Axe';
    const isMetalPickaxe = activeName === 'Metal Pickaxe';
    const isStoneAxe = activeName === 'Stone Axe';
    const isStonePickaxe = activeName === 'Stone Pickaxe';
    const isAxe = isStoneAxe || isMetalAxe;
    const isPickaxe = isStonePickaxe || isMetalPickaxe;

    if ((isAxe || isPickaxe) && this.weatherManager?.currentSeason === 'WINTER') {
        this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const targets = [...this.interactables];
        if (this.environment?.iceSheet) targets.push(this.environment.iceSheet);

        const intersects = this.interactionRaycaster.intersectObjects(targets, true);

        if (intersects.length > 0 && intersects[0].distance <= this.interactionDistance) {
            const hitObj = intersects[0].object;
            const isIceSheetHit = (
                hitObj === this.environment?.iceSheet || 
                hitObj.userData?.type === 'iceSheet'
            );

            if (isIceSheetHit) {
                const hitPt = intersects[0].point;

                // Prevent overlapping holes within 2.5 meters
                const isTooClose = (this.iceHoles || []).some(hole => {
                    const dx = hole.group.position.x - hitPt.x;
                    const dz = hole.group.position.z - hitPt.z;
                    return (dx * dx + dz * dz) < (2.5 * 2.5);
                });

                if (isTooClose) {
                    if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
                        this.saveSystem.showNotification('Ice hole too close!');
                    }
                    return;
                }

                this.triggerToolSwing();

                new IceHole(this.camera.parent, hitPt.x, -5.0, hitPt.z, {
                    interactables: this.interactables,
                    activeInteractables: this.camera.parent ? this.camera.parent.activeInteractables : null,
                    iceHolesArray: this.iceHoles
                });

                const durabilityLoss = (isMetalAxe || isMetalPickaxe) ? 0.5 : 2.0;
                this.inventory.damageActiveItem(durabilityLoss, this);

                if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
                    this.saveSystem.showNotification('Chopped Ice Hole!');
                }
                return;
            }
        }
    }

    // --- 4. Ground Tilling with Hoes (Wooden Hoe & Steel Hoe) ---
    if (activeName.includes('Hoe')) {
        this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const groundIntersects = this.terrain ? this.interactionRaycaster.intersectObject(this.terrain) : [];

        if (groundIntersects.length > 0 && groundIntersects[0].distance <= this.interactionDistance) {
            const hitPt = groundIntersects[0].point;
            
            // Ensure soil plots do not overlap (soil plot radius is ~1.5m)
            const minPlotSpacing = 1.5;
            let isOverlapping = false;

            for (let i = 0; i < this.interactables.length; i++) {
                const item = this.interactables[i];
                if (!item) continue;

                let isSoil = item.userData?.type === 'tilledSoil';
                if (!isSoil && item.children) {
                    for (const child of item.children) {
                        if (child.userData?.type === 'tilledSoil') {
                            isSoil = true;
                            break;
                        }
                    }
                }

                if (isSoil) {
                    const soilPos = item.position;
                    const dx = hitPt.x - soilPos.x;
                    const dz = hitPt.z - soilPos.z;
                    if ((dx * dx + dz * dz) < (minPlotSpacing * minPlotSpacing)) {
                        isOverlapping = true;
                        break;
                    }
                }
            }

            if (isOverlapping) {
                if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
                    this.saveSystem.showNotification('Cannot overlap soil plots!');
                }
                return;
            }

            this.triggerToolSwing();

            new TilledSoil(this.camera.parent, hitPt.x, hitPt.y, hitPt.z, {
                interactables: this.interactables
            });

            // Tier-scaled durability (Wooden Hoe: 1.5 HP, Steel Hoe: 0.25 HP)
            this.inventory.damageActiveItem(null, this);
        }
        return;
    }

    // --- 5. Planting Seeds on Tilled Soil (Berry Seeds, Corn Seeds, etc.) ---
    if (activeName.includes('Seeds')) {
        this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.interactionRaycaster.intersectObjects(this.interactables, true);

        if (intersects.length > 0 && intersects[0].distance <= this.interactionDistance) {
            let currentObj = intersects[0].object;
            let soil = null;
            while (currentObj) {
                if (currentObj.userData && currentObj.userData.type === 'tilledSoil') {
                    soil = currentObj.userData.soil;
                    break;
                }
                currentObj = currentObj.parent;
            }

            if (soil && !soil.crop) {
                const planted = soil.plantSeed(activeName, this.crops);
                if (planted) {
                    activeItem.count--;
                    if (activeItem.count <= 0) {
                        this.inventory.hotbarSlots[this.inventory.activeHotbarIndex] = null;
                    }
                    this.inventory.renderHotbar();
                }
            }
        }
        return;
    }

    // --- 6. Building Grid & Object Placement ---
    const buildableNames = [
        'Campfire', 'Chest', 'Furnace', 
        'Sawmill', 'Stone Crusher', 'Fur Processing Stand',
        'Wooden Foundation', 'Wooden Wall', 'Wooden Door', 'Wooden Roof', 
        'Metal Foundation', 'Metal Wall', 'Metal Door', 'Bedroll', 'A-Frame Shelter',
        'Primitive Small Trap', 'Small Snare', 'Medium Snare', 'Small Snap Trap', 'Medium Snap Trap',
        'Wall Torch', 'Standing Lantern', 'Standing Torch',
    ];

    if (buildableNames.includes(activeName)) {
        const transform = this.getPlacementTransform(activeName);
        if (transform && transform.hasHit && transform.isValid) {
            const { spawnX, spawnY, spawnZ, rotationY } = transform;
            let placedSuccessfully = false;
            let placedInstance = null;

            const buildContext = {
                environment: this.environment,
                interactables: this.interactables,
                obstacles: this.obstacles,
                spatialGrid: this.spatialGrid,
                weatherManager: this.weatherManager,
                activeInteractables: this.camera.parent ? this.camera.parent.activeInteractables : null,
                traps: this.traps
            };

            if (activeName === 'Campfire') {
                placedInstance = new Campfire(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Chest') {
                placedInstance = new StorageChest(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Furnace') {
                placedInstance = new Furnace(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Sawmill') {
                placedInstance = new Sawmill(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Stone Crusher') {
                placedInstance = new StoneCrusher(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Fur Processing Stand') {
                placedInstance = new FurProcessingStand(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (['Primitive Small Trap', 'Small Snare', 'Medium Snare', 'Small Snap Trap', 'Medium Snap Trap'].includes(activeName)) {
                placedInstance = new Trap(this.camera.parent, spawnX, spawnY, spawnZ, activeName, buildContext);
                if (this.traps) this.traps.push(placedInstance);
                placedSuccessfully = true;
            } else if (activeName === 'Wooden Foundation') {
                placedInstance = new WoodenFoundation(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Metal Foundation') {
                placedInstance = new MetalFoundation(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Wooden Wall') {
                placedInstance = new WoodenWall(this.camera.parent, spawnX, spawnY, spawnZ, rotationY, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Metal Wall') {
                placedInstance = new MetalWall(this.camera.parent, spawnX, spawnY, spawnZ, rotationY, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Wooden Door') {
                placedInstance = new WoodenDoor(this.camera.parent, spawnX, spawnY, spawnZ, rotationY, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Metal Door') {
                placedInstance = new MetalDoor(this.camera.parent, spawnX, spawnY, spawnZ, rotationY, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Wooden Roof') {
                placedInstance = new WoodenRoof(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Wall Torch') {
                placedInstance = new WallTorch(this.camera.parent, spawnX, spawnY, spawnZ, rotationY, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Standing Lantern' || activeName === 'Standing Torch') {
                placedInstance = new StandingLantern(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            } else if (activeName === 'Bedroll') {
                placedInstance = new Bedroll(this.camera.parent, spawnX, spawnY, spawnZ, { ...buildContext, player: this });
                placedSuccessfully = true;
            } else if (activeName === 'A-Frame Shelter') {
                placedInstance = new AFrameShelter(this.camera.parent, spawnX, spawnY, spawnZ, buildContext);
                placedSuccessfully = true;
            }

            if (placedSuccessfully) {
                if (this.saveSystem && placedInstance && !activeName.includes('Trap')) {
                    this.saveSystem.registerStructure(placedInstance, activeName);
                }

                activeItem.count--;
                if (activeItem.count <= 0) {
                    this.inventory.hotbarSlots[this.inventory.activeHotbarIndex] = null;
                }
                this.inventory.renderHotbar();
                this.inventory.renderCrafting();
                return;
            }
        }
        return;
    }

    // --- 7. World Interactables Raycasting (Trees, Ores, Animals, & Crops) ---
    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.interactionRaycaster.intersectObjects(this.interactables, true);

    if (intersects.length > 0 && intersects[0].distance <= this.interactionDistance) {
        let hitObject = intersects[0].object;
        let currentObj = hitObject;
        let itemType = null;
        while (currentObj) {
            if (currentObj.userData && currentObj.userData.type) {
                itemType = currentObj.userData.type;
                hitObject = currentObj;
                break;
            }
            currentObj = currentObj.parent;
        }

        const isKnife = activeName.includes('Knife');

        if (itemType === 'tree') {
            if (isAxe) {
                this.triggerToolSwing();
                const tree = hitObject.userData.tree;
                tree.hit(isMetalAxe ? 50 : 25);

                // Tiered Durability: 2.0 HP for Stone, 0.5 HP for Metal
                const durabilityLoss = isMetalAxe ? 0.5 : 2.0;
                this.inventory.damageActiveItem(durabilityLoss, this);
            }
        } else if (itemType === 'stoneOre' || itemType === 'metalOre') {
            if (isPickaxe) {
                this.triggerToolSwing();
                const ore = hitObject.userData.ore;
                ore.hit(isMetalPickaxe ? 50 : 25);

                // Tiered Durability: 2.0 HP for Stone, 0.5 HP for Metal
                const durabilityLoss = isMetalPickaxe ? 0.5 : 2.0;
                this.inventory.damageActiveItem(durabilityLoss, this);
            }
        } else if (itemType === 'crop') {
            const crop = hitObject.userData.crop;
            if (crop && crop.stage === 3) {
                this.triggerToolSwing();
                crop.harvest(this);
            }
        } else if (['blackBear', 'grizzlyBear', 'moose', 'wolf', 'rabbit', 'deer', 'bird'].includes(itemType)) {
            const animal = hitObject.userData.bear || hitObject.userData.moose || hitObject.userData.wolf || 
                           hitObject.userData.rabbit || hitObject.userData.deer || hitObject.userData.bird;

            if (animal && !animal.isDestroyed) {
                this.triggerToolSwing();
                if (animal.isDead) {
                    // Carcass harvesting allowed with Axes, Pickaxes, or Knives
                    if (isAxe || isPickaxe || isKnife) {
                        animal.harvest(this);
                        const durabilityLoss = (isMetalAxe || isMetalPickaxe) ? 0.5 : 2.0;
                        this.inventory.damageActiveItem(durabilityLoss, this);
                    }
                } else {
                    // Melee combat strikes
                    let damage = 15;
                    if (isMetalAxe) damage = 65;
                    else if (isStoneAxe) damage = 35;
                    else if (isMetalPickaxe) damage = 50;
                    else if (isStonePickaxe) damage = 25;
                    else if (isKnife) damage = 30;

                    animal.hit(damage, this);

                    if (activeItem) {
                        const combatLoss = (isMetalAxe || isMetalPickaxe) ? 0.75 : 2.5;
                        this.inventory.damageActiveItem(combatLoss, this);
                    }
                }
            }
        }
    }
}

  handleInteraction() {
    if (!this.controls.isLocked) return;

    // --- 0. Exit Shelter if already inside ---
    if (this.isInsideShelter && this.currentShelter) {
        const exitPos = this.currentShelter.getExteriorPosition(this.standHeight || 1.6);
        this.controls.getObject().position.copy(exitPos);
        this.isInsideShelter = false;
        this.currentShelter = null;
        
        if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
            this.saveSystem.showNotification('Exited Shelter');
        }
        return;
    }

    if (this.mountedATV) {
        this.dismountATV();
        return;
    }

    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    const targets = [...this.interactables];
    if (this.environment) {
        if (this.environment.water) targets.push(this.environment.water);
        if (this.environment.iceSheet) targets.push(this.environment.iceSheet);
        if (this.environment.terrain) targets.push(this.environment.terrain);
    }

    const intersects = this.interactionRaycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0 && intersects[0].distance <= this.interactionDistance) {
        const hitIntersection = intersects[0];
        let hitObject = hitIntersection.object;
        let currentObj = hitObject;
        let itemType = null;

        while (currentObj) {
            if (currentObj.userData && currentObj.userData.type) {
                itemType = currentObj.userData.type;
                hitObject = currentObj;
                break;
            }
            currentObj = currentObj.parent;
        }

        const isWinter = (this.weatherManager?.currentSeason === 'WINTER');

        const isWaterHit = (
            itemType === 'water' || 
            hitIntersection.object === this.environment?.water ||
            hitObject === this.environment?.water
        );

        const isIceSheetHit = (
            itemType === 'iceSheet' ||
            hitIntersection.object === this.environment?.iceSheet ||
            hitObject === this.environment?.iceSheet
        );

        // --- 1. Water & Ice Hole Interaction ---
        if (itemType === 'iceHole' || (isWaterHit && !isWinter)) {
            const activeItem = this.inventory.getActiveItem();

            if (activeItem && activeItem.name === 'Leather Canteen') {
                if (activeItem.count === 1) {
                    activeItem.name = 'Leather Canteen (Dirty Water)';
                    activeItem.icon = '🧪';
                } else {
                    activeItem.count--;
                    this.inventory.addItem('Leather Canteen (Dirty Water)', 1, '🧪');
                }
                this.inventory.renderHotbar();
                
                if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
                    const sourceName = itemType === 'iceHole' ? 'Ice Hole' : 'Water';
                    this.saveSystem.showNotification(`Filled Canteen from ${sourceName}!`);
                }
            } else {
                this.thirst = Math.min(this.maxThirst, this.thirst + 40);
            }
            return;
        }

        // Notify player if attempting to drink from frozen ice surface
        if (isIceSheetHit || (isWaterHit && isWinter)) {
            if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
                this.saveSystem.showNotification('The lake is frozen solid! Chop an ice hole first.');
            }
            return;
        }

        // --- 2. Buildings & Structures ---
       // --- 2. Buildings & Structures ---
if (itemType === 'aFrameShelter') {
    const shelter = hitObject.userData.shelter;
    if (shelter) {
        const seatedHeight = this.crouchHeight || 0.7;
        const interiorPos = shelter.getInteriorPosition(seatedHeight);
        this.controls.getObject().position.copy(interiorPos);
        this.velocity.set(0, 0, 0);
        this.isInsideShelter = true;
        this.currentShelter = shelter;

        if (this.saveSystem && typeof this.saveSystem.showNotification === 'function') {
            this.saveSystem.showNotification('Entered Shelter (Sheltered from weather)');
        }
    }
} else if (itemType === 'building') {
            const buildingType = hitObject.userData.buildingType;
            const structure = hitObject.userData.structure;

            if (buildingType === 'door' && structure) {
                structure.toggle();
            }
        } else if (itemType === 'bedroll') {
            const bedroll = hitObject.userData.bedroll;
            if (bedroll) {
                this.setSpawnPoint(bedroll);
            }
        } else if (itemType === 'trap') {
            const trap = hitObject.userData.trap;
            if (trap) {
                trap.harvest(this.inventory);
            }
        } else if (itemType === 'atvTrunk') {
            const atv = hitObject.userData.atv;
            if (atv) {
                this.inventory.openATVTrunk(atv, this.controls);
            }
        } else if (itemType === 'atv') {
            const atv = hitObject.userData.atv;
            if (atv) {
                this.mountATV(atv);
            }
        } else if (itemType === 'campfire') {
            const campfire = hitObject.userData.campfire;
            if (campfire) {
                this.inventory.openCampfire(campfire, this.controls);
            }
        } else if (itemType === 'furnace') {
            const furnace = hitObject.userData.furnace;
            if (furnace) {
                this.inventory.openFurnace(furnace, this.controls);
            }
        } else if (itemType === 'sawmill') {
            const sawmill = hitObject.userData.sawmill;
            if (sawmill) {
                this.inventory.openSawmill(sawmill, this.controls);
            }
        } else if (itemType === 'stoneCrusher') {
            const crusher = hitObject.userData.stoneCrusher;
            if (crusher) {
                this.inventory.openStoneCrusher(crusher, this.controls);
            }
        } else if (itemType === 'furStand') {
            const furStand = hitObject.userData.furStand;
            if (furStand) {
                this.inventory.openFurStand(furStand, this.controls);
            }
        } else if (itemType === 'storageChest') {
            const chest = hitObject.userData.chest;
            if (chest) this.inventory.openChest(chest, this.controls);
        } else if (itemType === 'woodDrop') {
            const woodDrop = hitObject.userData.woodDrop;
            if (woodDrop) woodDrop.collect(this.inventory);
        } else if (itemType === 'resourceDrop') {
            const resourceDrop = hitObject.userData.resourceDrop;
            if (resourceDrop) resourceDrop.collect(this.inventory);
        } else if (itemType === 'berryBush') {
            const bush = hitObject.userData.bush;
            if (bush) {
                const harvestedItem = bush.harvest();
                if (harvestedItem) {
                    this.inventory.addItem(harvestedItem.name, harvestedItem.count, harvestedItem.icon);
                }
            }
        } else if (itemType === 'grass') {
            const grass = hitObject.userData.grass;
            if (grass) {
                const harvestedItem = grass.harvest();
                if (harvestedItem) {
                    this.inventory.addItem(harvestedItem.name, harvestedItem.count, harvestedItem.icon);
                }
            }
        } else if (itemType === 'egg') {
            const egg = hitObject.userData.egg;
            if (egg) {
                const harvestedItem = egg.harvest();
                if (harvestedItem) {
                    this.inventory.addItem(harvestedItem.name, harvestedItem.count, harvestedItem.icon);
                }
            }
        } else if (itemType === 'stone') {
            const stone = hitObject.userData.stone;
            if (stone) {
                const harvestedItem = stone.harvest();
                if (harvestedItem) {
                    this.inventory.addItem(harvestedItem.name, harvestedItem.count, harvestedItem.icon);
                }
            }
        } else if (itemType === 'stick') {
            const stick = hitObject.userData.stick;
            if (stick) {
                const harvestedItem = stick.harvest();
                if (harvestedItem) {
                    this.inventory.addItem(harvestedItem.name, harvestedItem.count, harvestedItem.icon);
                }
            }
        } else if (itemType === 'food') {
            this.hunger = Math.min(this.maxHunger, this.hunger + 30);
            hitObject.removeFromParent();
            const idx = this.interactables.indexOf(hitObject);
            if (idx !== -1) this.interactables.splice(idx, 1);
        }
    }
}

    updateVitals(delta) {
        let hungerMultiplier = 1.0;
        let thirstMultiplier = 1.0;

        if (this.weatherManager) {
            const temp = this.weatherManager.temperature;
            if (temp < 5) hungerMultiplier = 1.0 + Math.abs(5 - temp) * 0.04;
            if (temp > 25) thirstMultiplier = 1.0 + (temp - 25) * 0.05;
        }

        this.hunger = Math.max(0, this.hunger - (0.5 * hungerMultiplier * delta));
        this.thirst = Math.max(0, this.thirst - (0.8 * thirstMultiplier * delta));
        
        const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        if (this.isSprinting && isMoving && this.stamina > 0) {
            this.stamina = Math.max(0, this.stamina - (5 * delta));
            if (this.stamina === 0) this.isSprinting = false;
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + (8 * delta));
        }

        const ambientTemp = this.weatherManager ? this.weatherManager.temperature : 15;
        const insulation = this.getInsulation();
        const campfireHeat = this.getCampfireHeat();
        const effectiveTemp = ambientTemp + insulation + campfireHeat;

        const targetComfortTemp = 20.0;
        const upperComfortTemp = 35.0;

        if (effectiveTemp < targetComfortTemp) {
            const coldSeverity = (targetComfortTemp - effectiveTemp);
            this.bodyTemp -= coldSeverity * 0.015 * delta;
        } else if (effectiveTemp > upperComfortTemp) {
            const heatSeverity = (effectiveTemp - upperComfortTemp);
            this.bodyTemp += heatSeverity * 0.015 * delta;
        } else {
            if (this.bodyTemp < 37.0) {
                this.bodyTemp = Math.min(37.0, this.bodyTemp + 0.15 * delta);
            } else if (this.bodyTemp > 37.0) {
                this.bodyTemp = Math.max(37.0, this.bodyTemp - 0.15 * delta);
            }
        }

        this.bodyTemp = THREE.MathUtils.clamp(this.bodyTemp, 30.0, 43.0);

        if (this.bodyTemp < 34.0) {
            this.takeDamage((34.0 - this.bodyTemp) * 0.8 * delta);
        } else if (this.bodyTemp > 40.0) {
            this.takeDamage((this.bodyTemp - 40.0) * 1.0 * delta);
        }

        if (this.hunger === 0 || this.thirst === 0) {
            this.takeDamage(2 * delta);
        } else if (this.health < this.maxHealth && this.hunger > 50 && this.thirst > 50 && this.bodyTemp >= 35.0 && this.bodyTemp <= 38.5) {
            this.health = Math.min(this.maxHealth, this.health + (1 * delta));
        }

        if (this.isPoisoned) {
    this.poisonTimer -= delta;
    this.takeDamage(3.0 * delta); // Drains 3 HP per second while sick
    if (this.poisonTimer <= 0) {
        this.isPoisoned = false;
        this.poisonTimer = 0;
    }
}

        this.vitalsUiTimer = (this.vitalsUiTimer || 0) + delta;
        if (this.vitalsUiTimer >= 0.1) {
            this.vitalsUiTimer = 0;

            this.ui.health.style.width = `${(this.health / this.maxHealth) * 100}%`;
            this.ui.stamina.style.width = `${(this.stamina / this.maxStamina) * 100}%`;
            this.ui.hunger.style.width = `${(this.hunger / this.maxHunger) * 100}%`;
            this.ui.thirst.style.width = `${(this.thirst / this.maxThirst) * 100}%`;

            if (this.ui.temp) {
                const tempPercent = Math.max(0, Math.min(100, ((this.bodyTemp - 30.0) / 13.0) * 100));
                this.ui.temp.style.width = `${tempPercent}%`;

                if (this.bodyTemp < 35.0) {
                    this.ui.temp.style.background = '#3498db';
                } else if (this.bodyTemp > 38.5) {
                    this.ui.temp.style.background = '#e74c3c';
                } else {
                    this.ui.temp.style.background = '#2ecc71';
                }
            }

            if (this.ui.tempText) {
                const displayF = Math.round((this.bodyTemp * 9 / 5) + 32);
                this.ui.tempText.innerText = `Temp: ${this.bodyTemp.toFixed(1)}°C / ${displayF}°F`;
            }
        }
    }

    resolveObstacleCollisions() {
        const playerPos = this.controls.getObject().position;

        const nearbyObstacles = this.spatialGrid 
            ? this.spatialGrid.getNearby(playerPos.x, playerPos.z)
            : this.obstacles;

        for (let i = 0; i < nearbyObstacles.length; i++) {
            const obstacle = nearbyObstacles[i];
            if (obstacle.isDestroyed || obstacle.isDead) continue;

            const obsPos = obstacle.group ? obstacle.group.position : (obstacle.position || obstacle);
            if (!obsPos) continue;

            const obsRadius = obstacle.radius || 0.8;
            const dx = playerPos.x - obsPos.x;
            const dz = playerPos.z - obsPos.z;
            const distSq = dx * dx + dz * dz;
            const minDist = this.radius + obsRadius;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;

                playerPos.x += (dx / dist) * overlap;
                playerPos.z += (dz / dist) * overlap;
            }
        }
    }

  update(delta) {
    if (this.isDead) return;
    if (!this.controls.isLocked && !this.inventory.isOpen) return;

    const safeDelta = Math.min(delta, 0.1);

    // Auto-exit shelter if player moves more than 2 meters away
    if (this.isInsideShelter && this.currentShelter) {
        const playerPos = this.controls.getObject().position;
        const shelterPos = this.currentShelter.group.position;
        const dx = playerPos.x - shelterPos.x;
        const dz = playerPos.z - shelterPos.z;

        if (dx * dx + dz * dz > 4.0) {
            this.isInsideShelter = false;
            this.currentShelter = null;
        }
    }

    if (typeof this.updateVitals === 'function') {
        this.updateVitals(delta);
    }
    if (typeof this.updateTemperature === 'function') {
        this.updateTemperature(delta);
    }

    if (this.mountedATV) {
        // Pass WASD driving controls to the ATV
        this.mountedATV.update(safeDelta, {
            forward: this.moveForward,
            backward: this.moveBackward,
            left: this.moveLeft,
            right: this.moveRight
        });

        // 1. Calculate camera position at head height (1.65m above terrain aligned with seat)
        const headOffset = new THREE.Vector3(0, 1.65, 0.15);
        headOffset.applyQuaternion(this.mountedATV.group.quaternion);
        const headWorldPos = this.mountedATV.group.position.clone().add(headOffset);
        this.controls.getObject().position.copy(headWorldPos);

        // 2. Lock camera rotation to face forward with the ATV at all times
        this.controls.getObject().rotation.set(
            this.mountedATV.group.rotation.x,
            this.mountedATV.group.rotation.y,
            this.mountedATV.group.rotation.z
        );

        // Hide held items while driving
        this.axeGroup.visible = false;
        this.metalAxeGroup.visible = false;
        this.pickaxeGroup.visible = false;
        this.metalPickaxeGroup.visible = false;
        if (this.hoeGroup) this.hoeGroup.visible = false;
        if (this.flashlightGroup) this.flashlightGroup.visible = false;
        if (this.torchGroup) this.torchGroup.visible = false;
        if (this.bowGroup) this.bowGroup.visible = false;
        if (this.spearGroup) this.spearGroup.visible = false;
        if (this.fishingGroup) this.fishingGroup.visible = false;

        return;
    }
    
    this.updateVitals(safeDelta);
    this.updateHologram();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.update(safeDelta);
        if (p.isDestroyed) {
            this.projectiles.splice(i, 1);
        }
    }

    if (this.isBulletCamActive && this.activeBulletCamProjectile) {
        if (this.activeBulletCamProjectile.isDestroyed) {
            this.stopBulletCam();
        } else {
            const projPos = this.activeBulletCamProjectile.group.position;
            const projDir = this.activeBulletCamProjectile.velocity.clone().normalize();

            const targetCamPos = projPos.clone().sub(projDir.clone().multiplyScalar(1.2)).add(new THREE.Vector3(0, 0.3, 0));
            this.controls.getObject().position.copy(targetCamPos);

            const lookAtTarget = projPos.clone().add(projDir.clone().multiplyScalar(5.0));
            this.camera.lookAt(lookAtTarget);
        }
    }

    // 1. Retrieve active item & activeName FIRST before checking tool states
    const activeItem = this.inventory.getActiveItem();
    const activeName = activeItem ? activeItem.name : null;

    // 2. Evaluate active tool flags
    const hasMetalAxe = activeName === 'Metal Axe';
    const hasMetalPickaxe = activeName === 'Metal Pickaxe';
    const hasAxe = activeName === 'Stone Axe';
    const hasPickaxe = activeName === 'Pickaxe' || activeName === 'Stone Pickaxe';
    const hasHoe = activeName === 'Wooden Hoe';
    const hasFlashlight = activeName === 'Flashlight';
    const hasTorch = activeName === 'Handheld Torch';
    const hasBow = activeName === 'Hunting Bow';
    const hasSpear = activeName === 'Spear';
    const hasFishingRod = activeName === 'Fishing Rod';

    // 3. Update held 3D mesh visibilities
    this.axeGroup.visible = hasAxe && !this.isBulletCamActive;
    this.metalAxeGroup.visible = hasMetalAxe && !this.isBulletCamActive;
    this.pickaxeGroup.visible = hasPickaxe && !this.isBulletCamActive;
    this.metalPickaxeGroup.visible = hasMetalPickaxe && !this.isBulletCamActive;
    if (this.hoeGroup) {
        this.hoeGroup.visible = hasHoe && !this.isBulletCamActive;
    }
    this.flashlightGroup.visible = hasFlashlight && !this.isBulletCamActive;
    if (this.torchGroup) {
        this.torchGroup.visible = hasTorch && !this.isBulletCamActive;
    }
    this.bowGroup.visible = hasBow && !this.isBulletCamActive;
    this.spearGroup.visible = hasSpear && !this.isBulletCamActive;
    if (this.fishingGroup) {
        this.fishingGroup.visible = hasFishingRod && !this.isBulletCamActive;
    }

    // 4. Update active fishing loop
    if (this.fishingSystem) {
        this.fishingSystem.update(safeDelta);
    }

    // Flashlight Spot & Lens Logic
    const isLightActive = hasFlashlight && this.isFlashlightOn;
    if (this.flashlightSpot) {
        this.flashlightSpot.visible = isLightActive;
    }

    if (this.flashlightLensMat) {
        this.flashlightLensMat.emissive.setHex(isLightActive ? 0xffffaa : 0x000000);
    }

    // Handheld Torch Flicker & Flame Animation
    if (hasTorch && !this.isBulletCamActive && this.torchLight) {
        this.torchAnimTime = (this.torchAnimTime || 0) + safeDelta;
        
        // Dynamic Flame Light Flicker
        this.torchLight.intensity = calculateFlicker(this.torchAnimTime * 2.0, 4.0, 0.9);

        // Procedural Flame Mesh Deformation
        const sXZ = 1.0 + Math.cos(this.torchAnimTime * 16) * 0.12;
        const sY = 1.0 + Math.sin(this.torchAnimTime * 14) * 0.15;
        if (this.handheldOuterFlame) this.handheldOuterFlame.scale.set(sXZ, sY, sXZ);
        if (this.handheldInnerFlame) this.handheldInnerFlame.scale.set(sXZ * 0.9, sY * 1.1, sXZ * 0.9);
    }

    const currentToolGroup = hasMetalAxe ? this.metalAxeGroup :
                           (hasMetalPickaxe ? this.metalPickaxeGroup :
                           (hasAxe ? this.axeGroup : 
                           (hasPickaxe ? this.pickaxeGroup : 
                           (hasHoe ? this.hoeGroup : 
                           (hasBow ? this.bowGroup : 
                           (hasSpear ? this.spearGroup : null))))));

    if (currentToolGroup && this.isSwinging) {
        this.swingProgress += safeDelta * this.swingSpeed;
        if (this.swingProgress >= Math.PI) {
            this.swingProgress = 0;
            this.isSwinging = false;
        }
        const swingFactor = Math.sin(this.swingProgress);
        currentToolGroup.rotation.x = 0.2 - swingFactor * 1.3;
        currentToolGroup.rotation.y = -0.4 + swingFactor * 0.5;
        currentToolGroup.position.z = -0.5 + swingFactor * 0.15;
    } else if (currentToolGroup) {
        if (!hasBow && !hasSpear) {
            currentToolGroup.rotation.set(0.2, -0.4, 0.1);
            currentToolGroup.position.set(0.35, -0.35, -0.5);
        }
    }

    if (!this.controls.isLocked || this.isBulletCamActive) return;

    this.velocity.x -= this.velocity.x * 10.0 * safeDelta;
    this.velocity.z -= this.velocity.z * 10.0 * safeDelta;
    this.velocity.y -= this.gravity * safeDelta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    let currentSpeed = this.baseSpeed;
    
    if (this.isSwimming) {
        currentSpeed *= 0.5; 
    } else if (this.isSprinting && this.stamina > 0) {
        currentSpeed *= this.sprintMultiplier;
    }

    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * safeDelta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * safeDelta;

    this.controls.moveRight(-this.velocity.x * safeDelta);
    this.controls.moveForward(-this.velocity.z * safeDelta);
    this.controls.getObject().position.y += (this.velocity.y * safeDelta);

    this.resolveObstacleCollisions();
    this.resolveATVCollisions();

    const playerPos = this.controls.getObject().position;

    // Use seated height (0.7m) when inside shelter, otherwise standard standing height (1.6m)
    const eyeHeight = this.isInsideShelter ? (this.crouchHeight || 0.7) : (this.standHeight || 1.6); 
    const headOffset = 0.25; 
    const headY = playerPos.y + headOffset;
    const feetY = playerPos.y - eyeHeight;
    const halfTile = 2.0;

    let highestRoofStandingY = -Infinity;

    if (this.interactables) {
        for (let i = 0; i < this.interactables.length; i++) {
            const item = this.interactables[i];
            if (!item) continue;
            
            let struct = item.userData?.structure;
            if (!struct && item.children) {
                for (const child of item.children) {
                    if (child.userData?.structure) {
                        struct = child.userData.structure;
                        break;
                    }
                }
            }

            const isRoof = struct && (struct.isRoof || item.userData?.buildingType === 'roof');
            if (!isRoof || !struct.group) continue;

            // Ignore roof collision snapping for current shelter while inside
            if (this.isInsideShelter && struct === this.currentShelter) continue;

            const rPos = struct.group.position;
            const inX = Math.abs(playerPos.x - rPos.x) <= halfTile;
            const inZ = Math.abs(playerPos.z - rPos.z) <= halfTile;

            if (inX && inZ) {
                const roofBottomY = rPos.y;
                const roofTopY = rPos.y + 0.15;
                const standingY = roofTopY + eyeHeight;

                if (headY >= roofBottomY && feetY < roofBottomY - 0.2) {
                    playerPos.y = roofBottomY - headOffset - 0.05;
                    if (this.velocity.y > 0) {
                        this.velocity.y = 0;
                    }
                } 
                else if (this.velocity.y <= 0 && feetY >= roofTopY - 0.2 && feetY <= roofTopY + 0.5) {
                    if (standingY > highestRoofStandingY) {
                        highestRoofStandingY = standingY;
                    }
                }
            }
        }
    }

    if (this.environment) {
        const groundHeight = this.environment.getTerrainHeight(playerPos.x, playerPos.z);
        const waterLevel = -5.0; 
        const floatHeight = 0.5; 
        
        let targetY = groundHeight + eyeHeight;
        this.isSwimming = false;

        const isWinter = (this.weatherManager?.currentSeason === 'WINTER');

        // Check if player is standing directly over an active Ice Hole
        const isOverIceHole = isWinter && (this.iceHoles || []).some(hole => {
            const dx = hole.group.position.x - playerPos.x;
            const dz = hole.group.position.z - playerPos.z;
            return (dx * dx + dz * dz) <= (hole.radius * hole.radius);
        });

        if (highestRoofStandingY > targetY) {
            targetY = highestRoofStandingY;
        } else if (isWinter && !isOverIceHole) {
            // Solid Ice surface elevation at y = -4.95
            const iceFloorHeight = -4.95 + eyeHeight;
            targetY = Math.max(targetY, iceFloorHeight);
        } else if (targetY < waterLevel + floatHeight) {
            targetY = floatHeight + waterLevel;
            this.isSwimming = true;
        }
        
        if (playerPos.y < targetY) {
            this.velocity.y = 0;
            playerPos.y = targetY;
            
            if (!this.isSwimming) {
                this.canJump = true;
            } else {
                this.canJump = false; 
            }
        }
    }
}

mountATV(atv) {
    if (!atv || atv.isOccupied) return;
    this.mountedATV = atv;
    atv.mount(this);
}

resolveATVCollisions() {
    if (this.isMounted) return;

    const playerPos = this.controls.getObject().position;
    const playerRadius = 0.45;
    const atvs = this.scene?.atvs || (this.mountedATV ? [this.mountedATV] : []);

    atvs.forEach(atv => {
        if (!atv || atv.isDestroyed) return;

        const atvPos = atv.group.position;
        const dx = playerPos.x - atvPos.x;
        const dz = playerPos.z - atvPos.z;
        const distSq = dx * dx + dz * dz;
        const minDist = playerRadius + (atv.radius || 1.2);

        if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;

            playerPos.x += (dx / dist) * overlap;
            playerPos.z += (dz / dist) * overlap;
        }
    });
}

dismountATV() {
    if (!this.mountedATV) return;

    const atv = this.mountedATV;
    const atvPos = atv.group.position;

    // Local coordinate offsets relative to ATV heading (-Z = Forward, +X = Right, -X = Left)
    const candidateOffsets = [
        new THREE.Vector3(1.6, 0, 0),    // 1. Right side
        new THREE.Vector3(-1.6, 0, 0),   // 2. Left side
        new THREE.Vector3(0, 0, 2.0),    // 3. Rear
        new THREE.Vector3(0, 0, -2.0),   // 4. Front
        new THREE.Vector3(1.2, 0, 1.2),  // 5. Rear-Right
        new THREE.Vector3(-1.2, 0, 1.2)  // 6. Rear-Left
    ];

    const raycaster = new THREE.Raycaster();
    const playerRadius = 0.85;
    let selectedPos = null;

    const nearbyObstacles = this.spatialGrid 
        ? this.spatialGrid.getNearby(atvPos.x, atvPos.z) 
        : (this.obstacles || []);

    const iceHoles = this.iceHoles || [];

    for (const offset of candidateOffsets) {
        const worldOffset = offset.clone().applyQuaternion(atv.group.quaternion);
        const targetPos = atvPos.clone().add(worldOffset);

        let surfaceY = atvPos.y;
        if (this.environment) {
            surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(targetPos.x, targetPos.z, iceHoles)
                : this.environment.getTerrainHeight(targetPos.x, targetPos.z);
        }

        const waterLevel = this.environment?.waterLevel ?? -5.0;
        const floatY = waterLevel - 1.3;
        targetPos.y = Math.max(surfaceY, floatY) + (this.standHeight || 1.6);

        const rayOrigin = atvPos.clone();
        rayOrigin.y += 0.8;
        
        const rayDir = targetPos.clone().sub(rayOrigin);
        const rayDistance = rayDir.length();
        rayDir.normalize();

        raycaster.set(rayOrigin, rayDir);
        raycaster.far = rayDistance;

        let isRayBlocked = false;
        if (this.interactables && this.interactables.length > 0) {
            const hits = raycaster.intersectObjects(this.interactables, true);
            
            const validHits = hits.filter(hit => {
                let obj = hit.object;
                while (obj) {
                    if (obj === atv.group) return false;
                    obj = obj.parent;
                }
                return true;
            });

            if (validHits.length > 0) {
                isRayBlocked = true;
            }
        }

        let isObstacleTooClose = false;
        if (!isRayBlocked) {
            for (let i = 0; i < nearbyObstacles.length; i++) {
                const obs = nearbyObstacles[i];
                if (!obs || obs === atv || obs.isDestroyed || obs.isDead) continue;

                const obsPos = obs.group ? obs.group.position : (obs.position || obs);
                if (!obsPos || obs.group === atv.group) continue;

                const obsRadius = obs.radius || 0.8;
                const dx = targetPos.x - obsPos.x;
                const dz = targetPos.z - obsPos.z;
                const distSq = dx * dx + dz * dz;
                const minDist = playerRadius + obsRadius;

                if (distSq < minDist * minDist) {
                    isObstacleTooClose = true;
                    break;
                }
            }
        }

        if (!isRayBlocked && !isObstacleTooClose) {
            selectedPos = targetPos;
            break;
        }
    }

    if (!selectedPos) {
        const fallbackOffset = new THREE.Vector3(0, 0, 1.8).applyQuaternion(atv.group.quaternion);
        selectedPos = atvPos.clone().add(fallbackOffset);
        
        let surfaceY = atvPos.y;
        if (this.environment) {
            surfaceY = typeof this.environment.getSurfaceHeight === 'function'
                ? this.environment.getSurfaceHeight(selectedPos.x, selectedPos.z, iceHoles)
                : this.environment.getTerrainHeight(selectedPos.x, selectedPos.z);
        }
        selectedPos.y = surfaceY + (this.standHeight || 1.6);
    }

    // Execute dismount
    atv.dismount();
    this.isMounted = false;
    this.mountedATV = null;

    // Reposition player controller
    const playerObj = this.controls.getObject();
    playerObj.position.copy(selectedPos);

    // --- FIX CAMERA TILT ON DISMOUNT ---
    // Ensure camera parent is in the scene root if it was attached to ATV
    if (this.camera && this.camera.parent !== this.scene) {
        this.scene.add(this.camera);
    }

    // Zero out Roll (Z) and Pitch (X), maintaining only horizontal Yaw (Y)
    playerObj.rotation.order = 'YXZ';
    playerObj.rotation.z = 0;
    playerObj.rotation.x = 0;
    
    if (this.camera) {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.z = 0;
        this.camera.rotation.x = 0;
    }

    this.pitch = 0;
    if (typeof this.yaw !== 'undefined') {
        playerObj.rotation.y = this.yaw;
    }
}
}
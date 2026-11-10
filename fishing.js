// fishing.js
import * as THREE from 'three';

export const FishingState = {
    IDLE: 'IDLE',
    CAST: 'CAST',
    WAITING: 'WAITING',
    BITING: 'BITING',
    REELING: 'REELING'
};

export class FishingSystem {
    constructor(player, scene = null, environment = null) {
        this.player = player;
        this.scene = scene;
        this.environment = environment;

        this.state = FishingState.IDLE;
        this.bobberGroup = new THREE.Group();
        this.bobberGroup.visible = false;

        this.waitTimer = 0;
        this.biteTimer = 0;
        this.animTime = 0;

        this.buildBobberMesh();
    }

    ensureAddedToScene() {
        if (!this.bobberGroup.parent) {
            const activeScene = this.scene || (this.player && this.player.camera ? this.player.camera.parent : null);
            if (activeScene) {
                activeScene.add(this.bobberGroup);
                this.scene = activeScene;
            }
        }
    }

    buildBobberMesh() {
        // Red Top / White Bottom Float
        const topMat = new THREE.MeshPhongMaterial({ color: 0xe74c3c, flatShading: true });
        const botMat = new THREE.MeshPhongMaterial({ color: 0xecf0f1, flatShading: true });

        const topGeo = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const botGeo = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

        const top = new THREE.Mesh(topGeo, topMat);
        const bot = new THREE.Mesh(botGeo, botMat);

        this.bobberGroup.add(top, bot);

        // Water Splash Ring Effect
        const ringGeo = new THREE.RingGeometry(0.05, 0.25, 12);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        this.splashRing = new THREE.Mesh(ringGeo, ringMat);
        this.splashRing.rotation.x = Math.PI / 2;
        this.splashRing.position.y = 0.01;
        this.splashRing.visible = false;
        this.bobberGroup.add(this.splashRing);
    }

    /**
     * Checks if given world coordinates (x, z) land within an active IceHole's radius.
     */
    findIceHoleAt(x, z) {
        if (this.player?.iceHoles) {
            for (const hole of this.player.iceHoles) {
                if (!hole || hole.isDestroyed || !hole.group) continue;
                const hPos = hole.group.position;
                const dx = hPos.x - x;
                const dz = hPos.z - z;
                if ((dx * dx + dz * dz) <= (hole.radius * hole.radius)) {
                    return hole;
                }
            }
        }
        if (this.player?.interactables) {
            for (const item of this.player.interactables) {
                if (!item) continue;
                let hole = item.userData?.iceHole;
                if (!hole && item.children) {
                    for (const child of item.children) {
                        if (child.userData?.iceHole) {
                            hole = child.userData.iceHole;
                            break;
                        }
                    }
                }
                if (hole && !hole.isDestroyed && hole.group) {
                    const hPos = hole.group.position;
                    const dx = hPos.x - x;
                    const dz = hPos.z - z;
                    if ((dx * dx + dz * dz) <= (hole.radius * hole.radius)) {
                        return hole;
                    }
                }
            }
        }
        return null;
    }

    castLine() {
        if (this.state !== FishingState.IDLE) return;

        this.ensureAddedToScene();

        const waterLevel = this.environment?.waterLevel ?? -5.0;
        const cam = this.player.camera;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), cam);

        // Raycast against interactables, water, ice sheet, and terrain
        const targets = [];
        if (this.player?.interactables) {
            targets.push(...this.player.interactables);
        }
        if (this.environment) {
            if (this.environment.waterMesh) targets.push(this.environment.waterMesh);
            if (this.environment.water) targets.push(this.environment.water);
            if (this.environment.iceSheet) targets.push(this.environment.iceSheet);
            if (this.environment.terrain) targets.push(this.environment.terrain);
        }

        const intersects = raycaster.intersectObjects(targets, true);
        const validIntersects = intersects.filter(hit => hit.distance <= 18.0);

        let targetPos = null;
        let isIceHoleTarget = false;
        const isWinter = (this.player?.weatherManager?.currentSeason === 'WINTER');

        if (validIntersects.length > 0) {
            const hit = validIntersects[0];
            const hitPt = hit.point;

            let directIceHole = null;
            let isIceSheetHit = false;
            let isWaterHit = false;
            let isTerrainHit = (hit.object === this.environment?.terrain || hit.object?.userData?.type === 'terrain');

            let curr = hit.object;
            while (curr) {
                if (curr.userData) {
                    if (curr.userData.type === 'iceHole' || curr.userData.iceHole) {
                        directIceHole = curr.userData.iceHole || curr;
                    }
                    if (curr.userData.type === 'iceSheet') isIceSheetHit = true;
                    if (curr.userData.type === 'water') isWaterHit = true;
                }
                curr = curr.parent;
            }

            if (hit.object === this.environment?.iceSheet) isIceSheetHit = true;
            if (hit.object === this.environment?.waterMesh || hit.object === this.environment?.water) isWaterHit = true;

            const iceHoleAtPoint = directIceHole || this.findIceHoleAt(hitPt.x, hitPt.z);

            if (iceHoleAtPoint) {
                // Target is inside an active Ice Hole
                targetPos = new THREE.Vector3(hitPt.x, waterLevel + 0.05, hitPt.z);
                isIceHoleTarget = true;
            } else if (isWinter || isIceSheetHit) {
                // Cast blocked on solid ice sheet
                if (this.player?.saveSystem) {
                    this.player.saveSystem.showNotification('The lake is frozen! Chop an ice hole first.');
                }
                return;
            } else if (isWaterHit || (isTerrainHit && hitPt.y <= waterLevel + 0.3)) {
                // Open water in non-winter seasons
                targetPos = new THREE.Vector3(hitPt.x, waterLevel + 0.05, hitPt.z);
            }
        } else {
            // Fallback directional ray check
            const forwardDir = new THREE.Vector3();
            cam.getWorldDirection(forwardDir);
            const dropPos = cam.position.clone().add(forwardDir.multiplyScalar(8.0));
            const groundY = this.environment ? this.environment.getTerrainHeight(dropPos.x, dropPos.z) : 0;

            const iceHoleAtDrop = this.findIceHoleAt(dropPos.x, dropPos.z);

            if (iceHoleAtDrop) {
                targetPos = new THREE.Vector3(dropPos.x, waterLevel + 0.05, dropPos.z);
                isIceHoleTarget = true;
            } else if (isWinter && groundY <= waterLevel + 0.3) {
                if (this.player?.saveSystem) {
                    this.player.saveSystem.showNotification('The lake is frozen! Chop an ice hole first.');
                }
                return;
            } else if (!isWinter && groundY <= waterLevel + 0.3) {
                targetPos = new THREE.Vector3(dropPos.x, waterLevel + 0.05, dropPos.z);
            }
        }

        if (!targetPos) {
            if (this.player?.saveSystem) {
                this.player.saveSystem.showNotification('Aim at open water or an ice hole to fish!');
            }
            return;
        }

        this.bobberGroup.position.copy(targetPos);
        this.bobberGroup.visible = true;

        this.state = FishingState.WAITING;
        this.waitTimer = 3.0 + Math.random() * 6.0;
        this.splashRing.visible = false;

        if (this.player?.saveSystem) {
            const msg = isIceHoleTarget ? 'Cast line into ice hole...' : 'Cast line into water...';
            this.player.saveSystem.showNotification(msg);
        }
    }

    reelLine() {
        if (this.state === FishingState.IDLE) return;

        if (this.state === FishingState.BITING) {
            this.player.inventory.addItem('Raw Fish', 1, '🐟');
            this.player.inventory.damageActiveItem(1, this.player);

            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Caught a Fresh Fish! 🐟');
            }
        } else {
            if (this.player.saveSystem) {
                this.player.saveSystem.showNotification('Lost the bait!');
            }
        }

        this.reset();
    }

    reset() {
        this.state = FishingState.IDLE;
        this.bobberGroup.visible = false;
        this.splashRing.visible = false;
        this.waitTimer = 0;
        this.biteTimer = 0;
    }

    update(delta) {
        if (this.state === FishingState.IDLE) return;

        this.ensureAddedToScene();
        const waterLevel = this.environment?.waterLevel ?? -5.0;

        this.animTime += delta;

        if (this.state === FishingState.WAITING) {
            this.bobberGroup.position.y = waterLevel + 0.05 + Math.sin(this.animTime * 3.0) * 0.03;

            this.waitTimer -= delta;
            if (this.waitTimer <= 0) {
                this.state = FishingState.BITING;
                this.biteTimer = 1.8;
                this.splashRing.visible = true;
                
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('Fish on! Click to Reel! 🎣');
                }
            }
        } else if (this.state === FishingState.BITING) {
            this.bobberGroup.position.y = waterLevel - 0.1 + Math.sin(this.animTime * 25.0) * 0.08;
            this.splashRing.scale.setScalar(1.0 + Math.sin(this.animTime * 15.0) * 0.5);

            this.biteTimer -= delta;
            if (this.biteTimer <= 0) {
                if (this.player.saveSystem) {
                    this.player.saveSystem.showNotification('The fish got away...');
                }
                this.reset();
            }
        }
    }
}
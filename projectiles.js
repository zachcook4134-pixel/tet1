import * as THREE from 'three';
import { resourceDrop } from './groundInteractables.js';

export class Projectile {
    constructor(scene, position, direction, type = 'arrow', context = {}) {
        this.scene = scene;
        this.type = type; // 'arrow' or 'spear'
        this.interactables = context.interactables || [];
        this.animals = context.animals || [];
        this.environment = context.environment;
        this.player = context.player;

        this.isDestroyed = false;
        this.speed = type === 'arrow' ? 52.0 : 34.0;
        this.damage = type === 'arrow' ? 40 : 65;
        this.gravity = 14.0;

        this.velocity = direction.clone().multiplyScalar(this.speed);
        
        this.group = new THREE.Group();
        this.group.position.copy(position);

        this.raycaster = new THREE.Raycaster();

        this.buildMesh();
        this.scene.add(this.group);
    }

    buildMesh() {
        if (this.type === 'arrow') {
            // Shaft
            const shaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6);
            const shaftMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.rotation.x = Math.PI / 2;
            this.group.add(shaft);

            // Tip
            const tipGeo = new THREE.ConeGeometry(0.025, 0.12, 4);
            const tipMat = new THREE.MeshPhongMaterial({ color: 0x73777b, flatShading: true, shininess: 80 });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.rotation.x = Math.PI / 2;
            tip.position.z = -0.4;
            this.group.add(tip);

            // Fletching Feathers
            const fletchMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, flatShading: true });
            const fletchGeo = new THREE.BoxGeometry(0.005, 0.08, 0.12);
            const fletch1 = new THREE.Mesh(fletchGeo, fletchMat);
            fletch1.position.z = 0.3;
            const fletch2 = fletch1.clone();
            fletch2.rotation.z = Math.PI / 2;
            this.group.add(fletch1, fletch2);
        } else {
            // Spear Shaft
            const shaftGeo = new THREE.CylinderGeometry(0.025, 0.03, 1.8, 8);
            const shaftMat = new THREE.MeshPhongMaterial({ color: 0x4a2e18, flatShading: true });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.rotation.x = Math.PI / 2;
            this.group.add(shaft);

            // Flint Head
            const headGeo = new THREE.ConeGeometry(0.05, 0.28, 5);
            const headMat = new THREE.MeshPhongMaterial({ color: 0x65696d, flatShading: true, shininess: 60 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.rotation.x = Math.PI / 2;
            head.position.z = -1.0;
            this.group.add(head);
        }

        this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.velocity.clone().normalize());
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.scene.remove(this.group);
    }

    update(delta) {
        if (this.isDestroyed) return;

        const currentPos = this.group.position.clone();

        // Gravity trajectory
        this.velocity.y -= this.gravity * delta;
        const moveVector = this.velocity.clone().multiplyScalar(delta);
        const nextPos = currentPos.clone().add(moveVector);

        // Orient projectile along motion vector
        const dir = moveVector.clone().normalize();
        this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

        // Raycast ahead for collisions
        this.raycaster.set(currentPos, dir);
        const stepDistance = moveVector.length();

        // 1. Check animal hits
        const animalMeshes = [];
        this.animals.forEach(animal => {
            if (animal && !animal.isDestroyed && animal.group) {
                animal.group.traverse(child => {
                    if (child.isMesh) animalMeshes.push(child);
                });
            }
        });

        const animalHits = this.raycaster.intersectObjects(animalMeshes, false);
        if (animalHits.length > 0 && animalHits[0].distance <= stepDistance) {
            const hitMesh = animalHits[0].object;
            const targetAnimal = hitMesh.userData.bear || hitMesh.userData.moose || hitMesh.userData.wolf || 
                                 hitMesh.userData.rabbit || hitMesh.userData.deer || hitMesh.userData.bird;

            if (targetAnimal && !targetAnimal.isDestroyed) {
                targetAnimal.hit(this.damage, this.player);
            }
            this.destroy();
            return;
        }

        // 2. Check Ground/Terrain collision
        let groundY = -100;
        if (this.environment) {
            groundY = this.environment.getTerrainHeight(nextPos.x, nextPos.z);
        }

        if (nextPos.y <= groundY + 0.1) {
            // Drop recoverable pickup item where missile landed
            const dropName = this.type === 'arrow' ? 'Arrows' : 'Spear';
            const dropIcon = this.type === 'arrow' ? '🏹' : '🗡️';
            new resourceDrop(this.scene, nextPos.x, groundY, nextPos.z, dropName, dropIcon, 1, this.interactables);
            
            this.destroy();
            return;
        }

        this.group.position.copy(nextPos);
    }
}
import * as THREE from 'three';
import { MAP_BOUNDS } from '../world.js';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import {
  createBox,
  createCylinder,
  createCone,
  createGroundRing,
  getStandardMat,
  getBasicMat,
} from '../core/meshFactory.js';

/**
 * 🌲 숲속 야생 사냥감 (초기 식량 🍖 확보 수단 — 사냥만으로는 마을 인구 12명 이상 부양 불가)
 */
export class WildPrey {
  constructor(scene, x, z) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, 0, z);
    this.homePos = new THREE.Vector3(x, 0, z);
    this.wanderTarget = new THREE.Vector3(x, 0, z);
    this.wanderTimer = 0;
    this.maxHp = KINGDOM_CONFIG.hunting.preyHp;
    this.hp = this.maxHp;
    this.dead = false;
    this.legs = [];

    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh() {
    const group = new THREE.Group();
    group.add(createBox(0.75, 0.56, 1.2, 0xd97706, [0, 0.65, 0]));
    const neck = createBox(0.32, 0.55, 0.32, 0xd97706, [0, 1.02, 0.42]);
    neck.rotation.x = 0.25;
    group.add(neck);
    group.add(createBox(0.38, 0.34, 0.52, 0xfef3c7, [0, 1.28, 0.58]));

    [-0.14, 0.14].forEach((ox) => {
      const antler = createCone(0.07, 0.42, 5, 0x78350f, [ox, 1.56, 0.48]);
      antler.rotation.z = ox < 0 ? 0.3 : -0.3;
      group.add(antler);
    });

    [
      [-0.22, 0.38],
      [0.22, 0.38],
      [-0.22, -0.38],
      [0.22, -0.38],
    ].forEach(([lx, lz]) => {
      const leg = createBox(0.16, 0.52, 0.16, 0x78350f, [lx, 0.26, lz]);
      group.add(leg);
      this.legs.push(leg);
    });

    group.add(createGroundRing(0.68, 0.88, 0x84cc16, 0.08, 0.72));
    return group;
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt, elapsed) {
    if (this.dead) return;
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 2.0 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const dist = 2.0 + Math.random() * 4.2;
      this.wanderTarget.set(
        THREE.MathUtils.clamp(this.homePos.x + Math.cos(angle) * dist, MAP_BOUNDS.minX + 2, MAP_BOUNDS.maxX - 2),
        0,
        THREE.MathUtils.clamp(this.homePos.z + Math.sin(angle) * dist, MAP_BOUNDS.minZ + 2, MAP_BOUNDS.maxZ - 2)
      );
    }

    const dir = new THREE.Vector3().subVectors(this.wanderTarget, this.position);
    dir.y = 0;
    if (dir.length() > 0.25) {
      dir.normalize();
      this.position.addScaledVector(dir, 2.2 * dt);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      this.legs.forEach((leg, idx) => {
        leg.rotation.x = Math.sin(elapsed * 9 + idx * Math.PI * 0.5) * 0.45;
      });
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

/**
 * 🆘 숲속에 고립된 유민/주민 (집🏠 여유 공간과 식량🍖이 있어야 마을 주민으로 정착 가능)
 */
export class LostSurvivor {
  constructor(scene, x, z) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, 0, z);
    this.rescued = false;
    this.warnCooldown = 0;
    this.beaconOrb = null;

    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh() {
    const group = new THREE.Group();
    group.add(createCylinder(0.32, 0.42, 0.85, 7, 0x0ea5e9, [0, 0.62, 0]));
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), getStandardMat(0xfde68a));
    head.position.y = 1.25;
    group.add(head);

    this.beaconOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), getBasicMat(0x38bdf8));
    this.beaconOrb.position.y = 2.08;
    group.add(this.beaconOrb);
    group.add(createGroundRing(0.95, 1.28, 0x38bdf8, 0.1, 0.85));
    return group;
  }

  update(dt, elapsed) {
    if (this.rescued) return;
    if (this.warnCooldown > 0) this.warnCooldown -= dt;
    this.mesh.position.y = Math.abs(Math.sin(elapsed * 4.5)) * 0.22;
    this.mesh.rotation.y = Math.sin(elapsed * 2.5) * 0.6;
    if (this.beaconOrb) {
      this.beaconOrb.rotation.y = elapsed * 3.5;
      this.beaconOrb.position.y = 2.08 + Math.sin(elapsed * 5) * 0.15;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

/**
 * ⚔️ 구출한 호위 동료 유닛 (함께 사냥하고 적 웨이브를 방어)
 */
export class CompanionUnit {
  constructor(scene, x, z, index = 0) {
    this.scene = scene;
    this.index = index;
    this.position = new THREE.Vector3(x, 0, z);
    this.attackRange = 3.2;
    this.attackDamage = 14;
    this.attackCooldown = 0;

    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh() {
    const group = new THREE.Group();
    const colors = [0x0284c7, 0x16a34a, 0x9333ea, 0xea580c, 0x0d9488, 0xd97706];
    const col = colors[this.index % colors.length];

    group.add(createCylinder(0.3, 0.4, 0.82, 7, col, [0, 0.6, 0]));
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), getStandardMat(0xfde68a));
    head.position.y = 1.22;
    group.add(head);
    group.add(createCone(0.36, 0.35, 7, col, [0, 1.48, 0]));

    const spear = createCylinder(0.05, 0.05, 1.45, 6, 0xfacc15, [0.36, 0.8, 0.25], true, {
      metalness: 0.4,
      roughness: 0.35,
    });
    spear.rotation.x = 0.55;
    group.add(spear);
    return group;
  }

  findTarget(enemies, wildPreys) {
    let targetEntity = null;
    let isPrey = false;
    let bestDist = 6.5;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedCastle) continue;
      const d = enemy.position.distanceTo(this.position);
      if (d < bestDist) {
        bestDist = d;
        targetEntity = enemy;
      }
    }
    if (!targetEntity) {
      for (const prey of wildPreys) {
        if (prey.dead) continue;
        const d = prey.position.distanceTo(this.position);
        if (d < 5.8) {
          bestDist = d;
          targetEntity = prey;
          isPrey = true;
        }
      }
    }
    return { targetEntity, isPrey, bestDist };
  }

  update(dt, elapsed, leaderPos, enemies, wildPreys, combatMult, onHitEnemy, onHitPrey) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const angle = this.index * ((Math.PI * 2) / 6) + elapsed * 0.4;
    const radius = 2.0 + (this.index % 2) * 0.85;
    const desiredPos = new THREE.Vector3(
      THREE.MathUtils.clamp(leaderPos.x + Math.cos(angle) * radius, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(leaderPos.z + Math.sin(angle) * radius, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ)
    );

    const { targetEntity, isPrey, bestDist } = this.findTarget(enemies, wildPreys);
    const moveGoal = targetEntity ? targetEntity.position : desiredPos;
    const toGoal = new THREE.Vector3().subVectors(moveGoal, this.position).setY(0);

    if (toGoal.length() > 0.65) {
      toGoal.normalize();
      this.position.addScaledVector(toGoal, 9.8 * dt);
      this.mesh.rotation.y = Math.atan2(toGoal.x, toGoal.z);
    }
    this.mesh.position.set(this.position.x, Math.abs(Math.sin(elapsed * 8 + this.index)) * 0.1, this.position.z);

    if (targetEntity && bestDist <= this.attackRange && this.attackCooldown <= 0) {
      this.attackCooldown = 0.72;
      const dmg = Math.round(this.attackDamage * combatMult);
      if (isPrey) onHitPrey(targetEntity, dmg);
      else onHitEnemy(targetEntity, dmg);
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

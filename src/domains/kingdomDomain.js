import * as THREE from 'three';
import { MAP_BOUNDS } from '../world.js';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import { eventBus } from '../core/eventBus.js';

/**
 * 🌲 Phase 1: 숲속 야생 사냥감 (사냥 시 식량 🍖 + 코인 🪙 드롭)
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

    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh() {
    const group = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.75,
      flatShading: true,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.8,
      flatShading: true,
    });
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
      flatShading: true,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.56, 1.2), furMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.32), furMat);
    neck.position.set(0, 1.02, 0.42);
    neck.rotation.x = 0.25;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.52), creamMat);
    head.position.set(0, 1.28, 0.58);
    group.add(head);

    [-0.14, 0.14].forEach((ox) => {
      const antler = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 5), hornMat);
      antler.position.set(ox, 1.56, 0.48);
      antler.rotation.z = ox < 0 ? 0.3 : -0.3;
      group.add(antler);
    });

    this.legs = [];
    [
      [-0.22, 0.38],
      [0.22, 0.38],
      [-0.22, -0.38],
      [0.22, -0.38],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), hornMat);
      leg.position.set(lx, 0.26, lz);
      group.add(leg);
      this.legs.push(leg);
    });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.88, 18).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x84cc16,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    ring.position.y = 0.08;
    group.add(ring);

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
 * 🆘 Phase 1: 숲속에 고립된 생존자/동료 (접근 시 구출되어 인구 👥 + 호위 동료로 합류)
 */
export class LostSurvivor {
  constructor(scene, x, z) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, 0, z);
    this.rescued = false;

    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.6,
      flatShading: true,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.65,
      flatShading: true,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.85, 7), bodyMat);
    torso.position.y = 0.62;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), skinMat);
    head.position.y = 1.25;
    group.add(head);

    this.beaconOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    this.beaconOrb.position.y = 2.08;
    group.add(this.beaconOrb);

    const rescueRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.28, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    rescueRing.position.y = 0.1;
    group.add(rescueRing);

    return group;
  }

  update(dt, elapsed) {
    if (this.rescued) return;
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
 * ⚔️ 구출한 동료 유닛 (플레이어 호위 + 야생 사냥 + 침략군 합동 공격)
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
    const armorMat = new THREE.MeshStandardMaterial({
      color: colors[this.index % colors.length],
      roughness: 0.55,
      flatShading: true,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.65,
      flatShading: true,
    });
    const spearMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.4,
      roughness: 0.35,
      flatShading: true,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.82, 7), armorMat);
    torso.position.y = 0.6;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), skinMat);
    head.position.y = 1.22;
    group.add(head);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.35, 7), armorMat);
    hood.position.y = 1.48;
    group.add(hood);

    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.45, 6), spearMat);
    spear.position.set(0.36, 0.8, 0.25);
    spear.rotation.x = 0.55;
    group.add(spear);

    return group;
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

    let targetEntity = null;
    let isPrey = false;
    let bestDist = 6.5;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedCastle) continue;
      const d = enemy.position.distanceTo(this.position);
      if (d < bestDist) {
        bestDist = d;
        targetEntity = enemy;
        isPrey = false;
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

    const moveGoal = targetEntity ? targetEntity.position : desiredPos;
    const toGoal = new THREE.Vector3().subVectors(moveGoal, this.position);
    toGoal.y = 0;
    const dist = toGoal.length();

    if (dist > 0.65) {
      toGoal.normalize();
      this.position.addScaledVector(toGoal, 9.8 * dt);
      this.mesh.rotation.y = Math.atan2(toGoal.x, toGoal.z);
    }

    this.mesh.position.set(
      this.position.x,
      Math.abs(Math.sin(elapsed * 8 + this.index)) * 0.1,
      this.position.z
    );

    if (targetEntity && bestDist <= this.attackRange && this.attackCooldown <= 0) {
      this.attackCooldown = 0.72;
      const dmg = Math.round(this.attackDamage * combatMult);
      if (isPrey) {
        onHitPrey(targetEntity, dmg);
      } else {
        onHitEnemy(targetEntity, dmg);
      }
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

/**
 * 🏰 건국 5단계 도메인 매니저 (부락·농사·기술·시장·세금·대성곽 축조)
 */
export class KingdomDomainManager {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.villageGroup = new THREE.Group();
    this.farmGroup = new THREE.Group();
    this.marketGroup = new THREE.Group();
    this.castleUpgradeGroup = new THREE.Group();
    this.windmillBlades = null;

    this.root.add(this.villageGroup);
    this.root.add(this.farmGroup);
    this.root.add(this.marketGroup);
    this.root.add(this.castleUpgradeGroup);

    // 건국 상태 데이터
    this.food = 35;
    this.population = 2; // 초기 주민 2명
    this.farmLevel = 1; // 초기 작은 텃밭
    this.techLevel = 1;
    this.marketLevel = 1;
    this.castleTier = 1;

    this.foodAccum = 0;
    this.taxTimer = 0;
    this.castleGuardTimer = 0;
    this.preySpawnTimer = 2.0;
    this.survivorSpawnTimer = 3.0;

    this.wildPreys = [];
    this.survivors = [];
    this.companions = [];

    this.castleEndPt = new THREE.Vector3(26, 0, 8);
    this.villagePos = new THREE.Vector3(16, 0, 5);
    this.farmPos = new THREE.Vector3(12, 0, 11);
    this.marketPos = new THREE.Vector3(18, 0, -4);
  }

  initForStage(castleEndPt) {
    this.clearEntities();
    this.castleEndPt.copy(castleEndPt);

    const sx = castleEndPt.x > 0 ? -1 : 1;
    const sz = castleEndPt.z > 0 ? -1 : 1;
    this.villagePos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 8.5, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 3.5, -13, 13)
    );
    this.farmPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 14.5, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 8.5, -13, 13)
    );
    this.marketPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 8.0, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 10.5, -13, 13)
    );

    // 초기 숲 사냥감 3마리 & 고립된 주민 2명 스폰
    for (let i = 0; i < 3; i++) {
      this.spawnWildPrey();
    }
    for (let i = 0; i < 2; i++) {
      this.spawnSurvivor();
    }

    // 기존 구출한 동료 수만큼 호위 동료 재생성
    const compCount = Math.min(KINGDOM_CONFIG.rescue.maxCompanions, Math.max(1, this.population - 1));
    for (let i = 0; i < compCount; i++) {
      this.companions.push(new CompanionUnit(this.scene, 0, 0, i));
    }

    this.rebuildStructures();
  }

  clearEntities() {
    this.wildPreys.forEach((p) => p.destroy());
    this.wildPreys = [];
    this.survivors.forEach((s) => s.destroy());
    this.survivors = [];
    this.companions.forEach((c) => c.destroy());
    this.companions = [];
  }

  spawnWildPrey() {
    if (this.wildPreys.length >= KINGDOM_CONFIG.hunting.maxWildPreys) return;
    const spots = [
      [-23, -12],
      [-20, 12],
      [0, -13],
      [2, 13],
      [-12, -13],
      [14, -12],
    ];
    const [bx, bz] = spots[Math.floor(Math.random() * spots.length)];
    const x = bx + (Math.random() - 0.5) * 4;
    const z = bz + (Math.random() - 0.5) * 3;
    this.wildPreys.push(new WildPrey(this.scene, x, z));
  }

  spawnSurvivor() {
    if (this.survivors.length >= KINGDOM_CONFIG.rescue.maxActiveSurvivors) return;
    const spots = [
      [-24, 11],
      [-15, -12],
      [6, 12],
      [-6, 13],
      [15, -11],
    ];
    const [bx, bz] = spots[Math.floor(Math.random() * spots.length)];
    const x = bx + (Math.random() - 0.5) * 3;
    const z = bz + (Math.random() - 0.5) * 3;
    this.survivors.push(new LostSurvivor(this.scene, x, z));
  }

  getCombatMultiplier() {
    const t = KINGDOM_CONFIG.techs[this.techLevel - 1] || KINGDOM_CONFIG.techs[0];
    return t.combatMult;
  }

  getEconomyMultiplier() {
    const t = KINGDOM_CONFIG.techs[this.techLevel - 1] || KINGDOM_CONFIG.techs[0];
    return t.economyMult;
  }

  getFoodPerSec() {
    const f = KINGDOM_CONFIG.farms[this.farmLevel] || KINGDOM_CONFIG.farms[0];
    const popBonus = 1 + this.population * 0.12;
    return +(f.foodPerSec * popBonus * this.getEconomyMultiplier()).toFixed(1);
  }

  getTaxPerCycle() {
    const m = KINGDOM_CONFIG.markets[this.marketLevel] || KINGDOM_CONFIG.markets[0];
    const popTax = Math.floor(this.population * 2.5);
    const tierBonus = (this.castleTier - 1) * 6;
    return Math.round((m.taxPerCycle + popTax + tierBonus) * this.getEconomyMultiplier());
  }

  rebuildStructures() {
    const clearGrp = (grp) => {
      while (grp.children.length > 0) grp.remove(grp.children[0]);
    };
    clearGrp(this.villageGroup);
    clearGrp(this.farmGroup);
    clearGrp(this.marketGroup);
    clearGrp(this.castleUpgradeGroup);
    this.windmillBlades = null;

    // 1. 작은 부락 (모닥불 + 인구 비례 움막)
    this.villageGroup.position.copy(this.villagePos);
    const fireRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.8, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true })
    );
    fireRing.position.y = 0.11;
    this.villageGroup.add(fireRing);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.78, 6),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    flame.position.y = 0.48;
    this.villageGroup.add(flame);

    const hutCount = Math.min(6, Math.max(1, Math.floor(this.population / 2)));
    const hutWallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true });
    const hutRoofMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    for (let i = 0; i < hutCount; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const hut = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.85, 7), hutWallMat);
      base.position.y = 0.42;
      base.castShadow = true;
      hut.add(base);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.78, 7), hutRoofMat);
      roof.position.y = 1.18;
      roof.castShadow = true;
      hut.add(roof);

      hut.position.set(Math.cos(ang) * 2.2, 0, Math.sin(ang) * 2.2);
      this.villageGroup.add(hut);
    }

    // 2. 농경지 (밀밭 + 회전 풍차)
    if (this.farmLevel > 0) {
      this.farmGroup.position.copy(this.farmPos);
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x713f12, flatShading: true });
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true });
      const plots = Math.min(4, this.farmLevel);
      for (let i = 0; i < plots; i++) {
        const ox = (i % 2 === 0 ? -1 : 1) * 1.45;
        const oz = (Math.floor(i / 2) - 0.5) * 1.65;
        const soil = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 1.4), soilMat);
        soil.position.set(ox, 0.07, oz);
        this.farmGroup.add(soil);

        const crop = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.32 + this.farmLevel * 0.07, 1.1),
          wheatMat
        );
        crop.position.set(ox, 0.25, oz);
        this.farmGroup.add(crop);
      }

      const millTower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.85, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
      );
      millTower.position.set(0, 1.2, -1.8);
      millTower.castShadow = true;
      this.farmGroup.add(millTower);

      const millRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.78, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x9a3412, flatShading: true })
      );
      millRoof.position.set(0, 2.75, -1.8);
      this.farmGroup.add(millRoof);

      const bladesPivot = new THREE.Group();
      bladesPivot.position.set(0, 1.95, -1.15);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 2.0, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, flatShading: true })
        );
        blade.rotation.z = (b * Math.PI) / 2;
        bladesPivot.add(blade);
      }
      this.farmGroup.add(bladesPivot);
      this.windmillBlades = bladesPivot;
    }

    // 3. 시장 & 대시장
    if (this.marketLevel > 0) {
      this.marketGroup.position.copy(this.marketPos);
      const stallColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
      for (let i = 0; i < this.marketLevel; i++) {
        const ox = (i % 2 === 0 ? -1 : 1) * 1.35;
        const oz = (Math.floor(i / 2) - 0.5) * 1.6;
        const stall = new THREE.Group();
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.6, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true })
        );
        counter.position.y = 0.3;
        stall.add(counter);

        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(0.95, 0.7, 4),
          new THREE.MeshStandardMaterial({ color: stallColors[i % 4], flatShading: true })
        );
        canopy.position.y = 1.15;
        canopy.rotation.y = Math.PI / 4;
        stall.add(canopy);

        stall.position.set(ox, 0, oz);
        this.marketGroup.add(stall);
      }
    }

    // 4. 성곽 단계별 증축 (Tier 2~4)
    if (this.castleTier > 1) {
      this.castleUpgradeGroup.position.copy(this.castleEndPt);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.65,
        flatShading: true,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.5,
        roughness: 0.25,
        flatShading: true,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: this.castleTier >= 4 ? 0x7c3aed : 0x1d4ed8,
        roughness: 0.5,
        flatShading: true,
      });

      const wallRing = new THREE.Mesh(
        new THREE.CylinderGeometry(5.4, 5.8, 1.6 + this.castleTier * 0.4, 10, 1, true),
        stoneMat
      );
      wallRing.position.y = 0.85;
      this.castleUpgradeGroup.add(wallRing);

      if (this.castleTier >= 3) {
        [
          [-4.3, -4.3],
          [4.3, -4.3],
          [-4.3, 4.3],
          [4.3, 4.3],
        ].forEach(([tx, tz]) => {
          const bastion = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 4.6, 8), stoneMat);
          bastion.position.set(tx, 2.3, tz);
          bastion.castShadow = true;
          this.castleUpgradeGroup.add(bastion);

          const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.9, 8), roofMat);
          roof.position.set(tx, 5.5, tz);
          this.castleUpgradeGroup.add(roof);
        });
      }

      if (this.castleTier >= 4) {
        const grandSpire = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.0, 7.8, 8), stoneMat);
        grandSpire.position.y = 3.9;
        grandSpire.castShadow = true;
        this.castleUpgradeGroup.add(grandSpire);

        const crownRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.0, 8), goldMat);
        crownRoof.position.y = 9.2;
        this.castleUpgradeGroup.add(crownRoof);

        const auraRing = new THREE.Mesh(
          new THREE.RingGeometry(6.2, 7.0, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
        );
        auraRing.position.y = 0.14;
        this.castleUpgradeGroup.add(auraRing);
      }
    }
  }

  update(dt, elapsed, { playerPos, enemies, onGrantCoins, onFloatingText, onHitEnemy }) {
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z = elapsed * 2.5;
    }

    // 1. 농경지 식량 자동 생산
    this.foodAccum += this.getFoodPerSec() * dt;
    if (this.foodAccum >= 1) {
      const gained = Math.floor(this.foodAccum);
      this.foodAccum -= gained;
      this.food += gained;
    }

    // 2. 대시장 & 부락 세금(Tax/Coin) 자동 징수
    this.taxTimer += dt;
    if (this.taxTimer >= KINGDOM_CONFIG.taxCycleSeconds) {
      this.taxTimer = 0;
      const taxCoins = this.getTaxPerCycle();
      onGrantCoins(taxCoins);
      onFloatingText(this.marketPos.clone().setY(2.3), `+🪙${taxCoins} 시장 세금!`, '#fde047');
      eventBus.emit('kingdom:tax_collected', { amount: taxCoins });
    }

    // 3. 성곽(Tier 2~4) 수호 포탑 자동 사격
    const tierCfg = KINGDOM_CONFIG.castleTiers[this.castleTier - 1];
    if (tierCfg && tierCfg.autoGuardDamage > 0 && enemies.length > 0) {
      this.castleGuardTimer -= dt;
      if (this.castleGuardTimer <= 0) {
        let target = null;
        let minDist = 14.5;
        for (const e of enemies) {
          if (e.dead || e.reachedCastle) continue;
          const d = e.position.distanceTo(this.castleEndPt);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
        if (target) {
          this.castleGuardTimer = 1.05;
          onHitEnemy(target, tierCfg.autoGuardDamage, '#fde047');
        }
      }
    }

    // 4. 야생 사냥감 업데이트 및 플레이어 사냥 판정
    this.preySpawnTimer -= dt;
    if (this.preySpawnTimer <= 0) {
      this.preySpawnTimer = KINGDOM_CONFIG.hunting.respawnInterval;
      this.spawnWildPrey();
    }

    const handlePreyHit = (prey, dmg) => {
      if (prey.dead) return;
      const killed = prey.takeDamage(dmg);
      onFloatingText(prey.position.clone().setY(1.6), `-${dmg}`, '#bef264');
      if (killed) {
        const foodGain = KINGDOM_CONFIG.hunting.foodReward;
        const coinGain = KINGDOM_CONFIG.hunting.coinReward;
        this.food += foodGain;
        onGrantCoins(coinGain);
        onFloatingText(
          prey.position.clone().setY(2.1),
          `🍖+${foodGain} 식량 · 🪙+${coinGain}`,
          '#84cc16'
        );
        eventBus.emit('kingdom:prey_hunted', { foodGain, coinGain });
      }
    };

    for (let i = this.wildPreys.length - 1; i >= 0; i--) {
      const prey = this.wildPreys[i];
      prey.update(dt, elapsed);
      if (!prey.dead && playerPos && prey.position.distanceTo(playerPos) <= 2.9) {
        if (Math.random() < dt * 2.5) {
          handlePreyHit(prey, Math.round(24 * this.getCombatMultiplier()));
        }
      }
      if (prey.dead) {
        prey.destroy();
        this.wildPreys.splice(i, 1);
      }
    }

    // 5. 숲속 생존자/동료 구출 판정
    this.survivorSpawnTimer -= dt;
    if (this.survivorSpawnTimer <= 0) {
      this.survivorSpawnTimer = KINGDOM_CONFIG.rescue.respawnInterval;
      this.spawnSurvivor();
    }

    for (let i = this.survivors.length - 1; i >= 0; i--) {
      const sv = this.survivors[i];
      sv.update(dt, elapsed);
      if (!sv.rescued && playerPos && sv.position.distanceTo(playerPos) <= KINGDOM_CONFIG.rescue.rescueRadius) {
        sv.rescued = true;
        this.population += 1;
        this.food += KINGDOM_CONFIG.rescue.foodBonusOnRescue;
        if (this.companions.length < KINGDOM_CONFIG.rescue.maxCompanions) {
          this.companions.push(
            new CompanionUnit(this.scene, sv.position.x, sv.position.z, this.companions.length)
          );
        }
        this.rebuildStructures();
        onFloatingText(
          sv.position.clone().setY(2.2),
          `👥 동료 구출! (인구 ${this.population}명)`,
          '#38bdf8'
        );
        eventBus.emit('kingdom:survivor_rescued', { population: this.population });
        sv.destroy();
        this.survivors.splice(i, 1);
      }
    }

    // 6. 호위 동료 유닛 업데이트
    const combatMult = this.getCombatMultiplier();
    for (const comp of this.companions) {
      comp.update(
        dt,
        elapsed,
        playerPos,
        enemies,
        this.wildPreys,
        combatMult,
        (enemy, dmg) => onHitEnemy(enemy, dmg, '#38bdf8'),
        handlePreyHit
      );
    }
  }

  getSnapshot() {
    return {
      food: this.food,
      population: this.population,
      farmLevel: this.farmLevel,
      techLevel: this.techLevel,
      marketLevel: this.marketLevel,
      castleTier: this.castleTier,
    };
  }

  applySnapshot(snap) {
    if (!snap) return;
    if (typeof snap.food === 'number') this.food = Math.max(this.food, snap.food);
    if (typeof snap.population === 'number') this.population = Math.max(this.population, snap.population);
    if (typeof snap.farmLevel === 'number') this.farmLevel = Math.max(this.farmLevel, snap.farmLevel);
    if (typeof snap.techLevel === 'number') this.techLevel = Math.max(this.techLevel, snap.techLevel);
    if (typeof snap.marketLevel === 'number') this.marketLevel = Math.max(this.marketLevel, snap.marketLevel);
    if (typeof snap.castleTier === 'number') this.castleTier = Math.max(this.castleTier, snap.castleTier);
    this.rebuildStructures();
  }
}

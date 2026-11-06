import * as THREE from 'three';
import { MAP_BOUNDS } from '../world.js';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import { eventBus } from '../core/eventBus.js';

/**
 * 🌲 숲속 야생 사냥감 (사냥 시 식량 🍖 + 초기 세금 재원 🪙 획득)
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
 * 🆘 숲속에 고립된 유민/주민 (구출 시 마을/타운 인구 👥 증가 + 호위 동료 합류)
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
 * ⚔️ 구출한 호위 동료 유닛
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
 * 🏛️ 현실 경제·방어 건국 도메인 매니저
 * [1단계: 아주 작은 마을] ➔ [2단계: 타운 건설] ➔ [3단계: 시장 완성] ➔ [4단계: 무역소 개설] ➔ [5단계: 성(Castle) 완성]
 */
export class KingdomDomainManager {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.villageGroup = new THREE.Group();
    this.townGroup = new THREE.Group();
    this.marketGroup = new THREE.Group();
    this.tradePostGroup = new THREE.Group();
    this.castleUpgradeGroup = new THREE.Group();
    this.windmillBlades = null;
    this.tradeCartMesh = null;

    this.root.add(this.villageGroup);
    this.root.add(this.townGroup);
    this.root.add(this.marketGroup);
    this.root.add(this.tradePostGroup);
    this.root.add(this.castleUpgradeGroup);

    // 1단계(아주 작은 마을)에서 시작
    this.settlementStep = 1; // 1: 작은 마을, 2: 타운, 3: 시장, 4: 무역소, 5: 성 완성
    this.food = 30;
    this.population = 3;

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
    this.townPos = new THREE.Vector3(12, 0, 11);
    this.marketPos = new THREE.Vector3(18, 0, -4);
    this.tradePostPos = new THREE.Vector3(10, 0, -9);
  }

  getCurrentStepDef() {
    const chain = KINGDOM_CONFIG.settlementChain;
    return chain[Math.min(chain.length - 1, Math.max(0, this.settlementStep - 1))];
  }

  getNextStepDef() {
    const chain = KINGDOM_CONFIG.settlementChain;
    if (this.settlementStep >= chain.length) return null;
    return chain[this.settlementStep];
  }

  getCombatMultiplier() {
    return this.getCurrentStepDef().combatMultiplier || 1.0;
  }

  getFoodPerSec() {
    const def = this.getCurrentStepDef();
    const popBonus = 1 + this.population * 0.1;
    return +(def.foodPerSec * popBonus).toFixed(1);
  }

  getTaxPerCycle() {
    const def = this.getCurrentStepDef();
    const citizenTax = Math.floor(this.population * 2.5);
    return Math.round(def.baseTaxPerCycle + citizenTax);
  }

  initForStage(castleEndPt) {
    this.clearEntities();
    this.castleEndPt.copy(castleEndPt);

    const sx = castleEndPt.x > 0 ? -1 : 1;
    const sz = castleEndPt.z > 0 ? -1 : 1;
    this.villagePos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 8.2, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 3.2, -13, 13)
    );
    this.townPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 14.2, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 8.2, -13, 13)
    );
    this.marketPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 8.0, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 10.2, -13, 13)
    );
    this.tradePostPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 14.5, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 2.5, -13, 13)
    );

    for (let i = 0; i < 3; i++) this.spawnWildPrey();
    for (let i = 0; i < 2; i++) this.spawnSurvivor();

    const compCount = Math.min(KINGDOM_CONFIG.rescue.maxCompanions, Math.max(1, this.population - 2));
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
    this.wildPreys.push(
      new WildPrey(this.scene, bx + (Math.random() - 0.5) * 4, bz + (Math.random() - 0.5) * 3)
    );
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
    this.survivors.push(
      new LostSurvivor(this.scene, bx + (Math.random() - 0.5) * 3, bz + (Math.random() - 0.5) * 3)
    );
  }

  /**
   * 3D 문명 단계별 건축물 재구축
   * 1단계: 아주 작은 마을 (모닥불 + 작은 움막)
   * 2단계: 타운 건설 (타운 회관 + 밀밭 농경지 + 회전 풍차)
   * 3단계: 시장 완성 (타운 상설 시장 천막 + 상점가)
   * 4단계: 무역소 개설 (대무역소 본관 + 금화 교역 마차)
   * 5단계: 성(Castle) 완성 (석조 성벽 + 4대 황금 망루 + 대성곽 첨탑)
   */
  rebuildStructures() {
    const clearGrp = (grp) => {
      while (grp.children.length > 0) grp.remove(grp.children[0]);
    };
    clearGrp(this.villageGroup);
    clearGrp(this.townGroup);
    clearGrp(this.marketGroup);
    clearGrp(this.tradePostGroup);
    clearGrp(this.castleUpgradeGroup);
    this.windmillBlades = null;
    this.tradeCartMesh = null;

    // 1단계 기본: 아주 작은 마을 (모닥불 + 오두막)
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

    const hutCount = Math.min(6, Math.max(2, Math.floor(this.population / 2) + this.settlementStep));
    const hutWallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true });
    const hutRoofMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    for (let i = 0; i < hutCount; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const hut = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.76, 0.85, 7), hutWallMat);
      base.position.y = 0.42;
      base.castShadow = true;
      hut.add(base);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.78, 7), hutRoofMat);
      roof.position.y = 1.18;
      roof.castShadow = true;
      hut.add(roof);

      hut.position.set(Math.cos(ang) * 2.25, 0, Math.sin(ang) * 2.25);
      this.villageGroup.add(hut);
    }

    // 2단계 이상: 타운 (Town Hall + 농경지 + 풍차)
    if (this.settlementStep >= 2) {
      this.townGroup.position.copy(this.townPos);
      const townWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
      const townRoofMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, flatShading: true });
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x713f12, flatShading: true });
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true });

      // 타운 회관 (Town Hall)
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.7), townWallMat);
      hall.position.set(0, 0.7, 0);
      hall.castShadow = true;
      this.townGroup.add(hall);

      const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 4), townRoofMat);
      hallRoof.position.set(0, 1.95, 0);
      hallRoof.rotation.y = Math.PI / 4;
      hallRoof.castShadow = true;
      this.townGroup.add(hallRoof);

      // 타운 외곽 밀밭 & 풍차
      for (let i = 0; i < 2; i++) {
        const ox = (i === 0 ? -1 : 1) * 2.1;
        const soil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.5), soilMat);
        soil.position.set(ox, 0.07, 1.4);
        this.townGroup.add(soil);

        const crop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.2), wheatMat);
        crop.position.set(ox, 0.28, 1.4);
        this.townGroup.add(crop);
      }

      const millTower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.82, 2.3, 8), townWallMat);
      millTower.position.set(0, 1.15, -2.0);
      millTower.castShadow = true;
      this.townGroup.add(millTower);

      const bladesPivot = new THREE.Group();
      bladesPivot.position.set(0, 1.9, -1.35);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 1.95, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, flatShading: true })
        );
        blade.rotation.z = (b * Math.PI) / 2;
        bladesPivot.add(blade);
      }
      this.townGroup.add(bladesPivot);
      this.windmillBlades = bladesPivot;
    }

    // 3단계 이상: 타운 시장 (Market) 완성
    if (this.settlementStep >= 3) {
      this.marketGroup.position.copy(this.marketPos);
      const stallColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
      for (let i = 0; i < 4; i++) {
        const ox = (i % 2 === 0 ? -1 : 1) * 1.4;
        const oz = (Math.floor(i / 2) - 0.5) * 1.65;
        const stall = new THREE.Group();
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.62, 0.85),
          new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true })
        );
        counter.position.y = 0.31;
        stall.add(counter);

        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(0.98, 0.72, 4),
          new THREE.MeshStandardMaterial({ color: stallColors[i], flatShading: true })
        );
        canopy.position.y = 1.18;
        canopy.rotation.y = Math.PI / 4;
        canopy.castShadow = true;
        stall.add(canopy);

        stall.position.set(ox, 0, oz);
        this.marketGroup.add(stall);
      }
    }

    // 4단계 이상: 무역소 (Trading Post) & 교역 마차 개설
    if (this.settlementStep >= 4) {
      this.tradePostGroup.position.copy(this.tradePostPos);
      const guildMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, flatShading: true });
      const goldRoofMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.35,
        roughness: 0.4,
        flatShading: true,
      });

      const guildHall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.65, 1.9), guildMat);
      guildHall.position.y = 0.82;
      guildHall.castShadow = true;
      this.tradePostGroup.add(guildHall);

      const guildRoof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), goldRoofMat);
      guildRoof.position.y = 2.25;
      guildRoof.rotation.y = Math.PI / 4;
      this.tradePostGroup.add(guildRoof);

      // 황금 무역 마차 (Trade Caravan Cart)
      const cart = new THREE.Group();
      const wagon = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.65, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true })
      );
      wagon.position.y = 0.52;
      cart.add(wagon);

      const goldCargo = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, flatShading: true })
      );
      goldCargo.position.y = 0.95;
      cart.add(goldCargo);

      cart.position.set(0, 0, 1.85);
      this.tradePostGroup.add(cart);
      this.tradeCartMesh = cart;
    }

    // 5단계(또는 2~5단계 점진적 성곽 강화): 성(Castle) 완성!
    if (this.settlementStep >= 2) {
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
        color: this.settlementStep >= 5 ? 0x7c3aed : 0x1d4ed8,
        roughness: 0.5,
        flatShading: true,
      });

      const wallRing = new THREE.Mesh(
        new THREE.CylinderGeometry(5.4, 5.8, 1.4 + this.settlementStep * 0.38, 10, 1, true),
        stoneMat
      );
      wallRing.position.y = 0.85;
      this.castleUpgradeGroup.add(wallRing);

      if (this.settlementStep >= 4) {
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

      if (this.settlementStep >= 5) {
        const grandSpire = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.1, 8.2, 8), stoneMat);
        grandSpire.position.y = 4.1;
        grandSpire.castShadow = true;
        this.castleUpgradeGroup.add(grandSpire);

        const crownRoof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 3.2, 8), goldMat);
        crownRoof.position.y = 9.6;
        this.castleUpgradeGroup.add(crownRoof);

        const auraRing = new THREE.Mesh(
          new THREE.RingGeometry(6.3, 7.1, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
        );
        auraRing.position.y = 0.15;
        this.castleUpgradeGroup.add(auraRing);
      }
    }
  }

  update(dt, elapsed, { playerPos, enemies, onGrantCoins, onFloatingText, onHitEnemy }) {
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z = elapsed * 2.5;
    }
    if (this.tradeCartMesh) {
      this.tradeCartMesh.position.x = Math.sin(elapsed * 1.8) * 1.6;
    }

    // 1. 마을·타운 식량 자동 생산
    this.foodAccum += this.getFoodPerSec() * dt;
    if (this.foodAccum >= 1) {
      const gained = Math.floor(this.foodAccum);
      this.foodAccum -= gained;
      this.food += gained;
    }

    // 2. 세금(돈 🪙) 징수 (작은 마을 ➔ 타운 ➔ 시장 ➔ 무역소 ➔ 성 단계에 따라 세금 폭증)
    this.taxTimer += dt;
    if (this.taxTimer >= KINGDOM_CONFIG.taxCycleSeconds) {
      this.taxTimer = 0;
      const taxCoins = this.getTaxPerCycle();
      onGrantCoins(taxCoins);
      const taxAnchor =
        this.settlementStep >= 4
          ? this.tradePostPos
          : this.settlementStep >= 3
            ? this.marketPos
            : this.settlementStep >= 2
              ? this.townPos
              : this.villagePos;
      const sourceLabel =
        this.settlementStep >= 4
          ? '무역·시장 세금'
          : this.settlementStep >= 3
            ? '시장 상업세'
            : this.settlementStep >= 2
              ? '타운 세금'
              : '마을 세금';
      onFloatingText(taxAnchor.clone().setY(2.3), `+🪙${taxCoins} ${sourceLabel}!`, '#fde047');
      eventBus.emit('kingdom:tax_collected', { amount: taxCoins, step: this.settlementStep });
    }

    // 3. 타운/성곽 자동 방어 사격
    const curDef = this.getCurrentStepDef();
    if (curDef && curDef.autoGuardDamage > 0 && enemies.length > 0) {
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
          onHitEnemy(target, curDef.autoGuardDamage, '#fde047');
        }
      }
    }

    // 4. 야생 사냥감 리스폰 및 사냥 판정
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
        const coinGain = KINGDOM_CONFIG.hunting.taxSeedReward;
        this.food += foodGain;
        onGrantCoins(coinGain);
        onFloatingText(
          prey.position.clone().setY(2.1),
          `🍖+${foodGain} 식량 · 🪙+${coinGain}`,
          '#84cc16'
        );
      }
    };

    for (let i = this.wildPreys.length - 1; i >= 0; i--) {
      const prey = this.wildPreys[i];
      prey.update(dt, elapsed);
      if (!prey.dead && playerPos && prey.position.distanceTo(playerPos) <= 2.9) {
        if (Math.random() < dt * 2.6) {
          handlePreyHit(prey, Math.round(24 * this.getCombatMultiplier()));
        }
      }
      if (prey.dead) {
        prey.destroy();
        this.wildPreys.splice(i, 1);
      }
    }

    // 5. 숲속 유민/동료 구출 판정
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
          `👥 주민 합류! (인구 ${this.population}명)`,
          '#38bdf8'
        );
        sv.destroy();
        this.survivors.splice(i, 1);
      }
    }

    // 6. 호위 동료 전투 업데이트
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
      settlementStep: this.settlementStep,
      food: this.food,
      population: this.population,
    };
  }

  applySnapshot(snap) {
    if (!snap) return;
    let changed = false;
    if (typeof snap.settlementStep === 'number' && snap.settlementStep > this.settlementStep) {
      this.settlementStep = snap.settlementStep;
      changed = true;
    }
    if (typeof snap.food === 'number') this.food = Math.max(this.food, snap.food);
    if (typeof snap.population === 'number' && snap.population > this.population) {
      this.population = snap.population;
      changed = true;
    }
    if (changed) this.rebuildStructures();
  }
}

import * as THREE from 'three';
import { MAP_BOUNDS } from '../world.js';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import { eventBus } from '../core/eventBus.js';

/**
 * 🌲 숲속 야생 사냥감 (초기 식량 🍖 확보 수단 — 단, 사냥만으로는 마을 인구 12명 이상 부양 불가)
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
 * 🆘 숲속에 고립된 유민/주민 (집🏠 여유 공간과 식량🍖이 있어야 마을 주민으로 정착 가능!)
 */
export class LostSurvivor {
  constructor(scene, x, z) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, 0, z);
    this.rescued = false;
    this.warnCooldown = 0;

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
 * 🏛️ 현실 인과관계 경제·방어 건국 도메인 매니저
 * - 숲 사냥(12명 한계) ➔ 집 짓기(🏠 인구 상한 확장) ➔ 농사(🌾)·어업(🐟 물고기 잡기)으로 식량 한계 돌파
 *   ➔ 시장(🏪 농사·어업 체계화 & 상업세) ➔ 무역소(⚖️) ➔ 성(🏰) 및 이후 무한 확장 지원
 */
export class KingdomDomainManager {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.villageGroup = new THREE.Group();
    this.farmGroup = new THREE.Group();
    this.fisheryGroup = new THREE.Group();
    this.townGroup = new THREE.Group();
    this.marketGroup = new THREE.Group();
    this.tradePostGroup = new THREE.Group();
    this.castleUpgradeGroup = new THREE.Group();
    this.customFacilityGroup = new THREE.Group();

    this.windmillBlades = [];
    this.fishingBoatMesh = null;
    this.jumpingFishMeshes = [];
    this.tradeCartMesh = null;

    this.root.add(this.villageGroup);
    this.root.add(this.farmGroup);
    this.root.add(this.fisheryGroup);
    this.root.add(this.townGroup);
    this.root.add(this.marketGroup);
    this.root.add(this.tradePostGroup);
    this.root.add(this.castleUpgradeGroup);
    this.root.add(this.customFacilityGroup);

    // 1단계(아주 작은 마을)에서 시작
    this.settlementStep = 1;
    this.food = 35;
    this.population = KINGDOM_CONFIG.populationRules.initialPop;

    // 인과관계형 시설 레벨 (집 · 농사 · 어업 + 런타임 무중단 추가 시설)
    this.facilityLevels = {
      house: 0,
      farm: 0,
      fishery: 0,
    };

    this.foodAccum = 0;
    this.taxTimer = 0;
    this.popGrowthTimer = 0;
    this.castleGuardTimer = 0;
    this.preySpawnTimer = 2.0;
    this.survivorSpawnTimer = 3.0;

    this.wildPreys = [];
    this.survivors = [];
    this.companions = [];

    this.castleEndPt = new THREE.Vector3(26, 0, 8);
    this.villagePos = new THREE.Vector3(16, 0, 5);
    this.farmPos = new THREE.Vector3(11, 0, 9);
    this.fisheryPos = new THREE.Vector3(4, 0, -11);
    this.townPos = new THREE.Vector3(13, 0, 11);
    this.marketPos = new THREE.Vector3(18, 0, -4);
    this.tradePostPos = new THREE.Vector3(10, 0, -9);
  }

  getFacilityLevel(facId) {
    return this.facilityLevels[facId] || 0;
  }

  /**
   * 농사(🌾) + 어업(🐟) + 신규 식량 시설의 총 발전 단계 합산
   */
  getTotalFoodFacilityLevels() {
    let total = 0;
    for (const [key, def] of Object.entries(KINGDOM_CONFIG.facilities)) {
      if (def.unlocksAboveHuntingCap || def.category === 'food_primary') {
        total += this.getFacilityLevel(key);
      }
    }
    return total;
  }

  /**
   * 사냥에만 의존 중인지 여부 (농사·어업이 전혀 없으면 작은 마을에서 12명 이상 부양 불가!)
   */
  isRelyingOnlyOnHunting() {
    return this.getTotalFoodFacilityLevels() === 0;
  }

  /**
   * 현재 집(🏠)과 시설로 수용 가능한 최대 인구 상한
   * - 사냥만 할 때는 집을 아무리 지어도 최대 12명(huntingPopLimit)에서 식량 한계에 걸림!
   * - 농사(🌾)나 어업(🐟)을 시작해야 12명 한계를 돌파하여 대인구를 꾸릴 수 있음
   */
  getRawHousingCapacity() {
    const rules = KINGDOM_CONFIG.populationRules;
    let cap = rules.baseVillageHousing;
    for (const [key, def] of Object.entries(KINGDOM_CONFIG.facilities)) {
      const lv = this.getFacilityLevel(key);
      if (lv > 0 && def.housingBonus) {
        cap += lv * def.housingBonus;
      }
    }
    // 타운/시장/무역소/성 단계 보너스 거주력
    cap += (this.settlementStep - 1) * 2;
    return cap;
  }

  getEffectiveMaxPopulation() {
    const rawCap = this.getRawHousingCapacity();
    const huntingLimit = KINGDOM_CONFIG.populationRules.huntingPopLimit || 12;
    if (this.isRelyingOnlyOnHunting()) {
      return Math.min(rawCap, huntingLimit);
    }
    return rawCap;
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

  /**
   * 🏪 시장(Market) 등에 의한 농사·어업 체계화 배율
   */
  getAgriFishMultiplier() {
    const def = this.getCurrentStepDef();
    return def.agriFishMultiplier || 1.0;
  }

  /**
   * 초당 식량 총 생산량 (기본 수렵 + 체계화된 농사🌾·어업🐟) - 인구 식량 소비량 = 순 식량 증감(/s)
   */
  getGrossFoodProductionPerSec() {
    const def = this.getCurrentStepDef();
    const baseHuntFood = def.foodPerSec || 2.0;

    let agriFishFood = 0;
    for (const [key, facDef] of Object.entries(KINGDOM_CONFIG.facilities)) {
      const lv = this.getFacilityLevel(key);
      if (lv > 0 && facDef.foodPerSec) {
        agriFishFood += lv * facDef.foodPerSec;
      }
    }

    // 시장(🏪) 완성 등으로 농사·어업이 체계화되면 생산량이 대폭 증폭됨
    const sysMult = this.getAgriFishMultiplier();
    return +(baseHuntFood + agriFishFood * sysMult).toFixed(1);
  }

  getFoodConsumptionPerSec() {
    const perPop = KINGDOM_CONFIG.populationRules.foodConsumptionPerPop || 0.28;
    return +(this.population * perPop).toFixed(1);
  }

  getNetFoodPerSec() {
    return +(this.getGrossFoodProductionPerSec() - this.getFoodConsumptionPerSec()).toFixed(1);
  }

  // 기존 호환용
  getFoodPerSec() {
    return this.getNetFoodPerSec();
  }

  /**
   * 주기별 세금(🪙) 수입 계산
   * - 기본 정착지 세금 + 인구 인두세 + 집/농사/어업 시설 세금 + 시장(🏪) 체계화 상업세 보너스
   */
  getTaxPerCycle() {
    const def = this.getCurrentStepDef();
    const citizenTax = Math.floor(this.population * 2.2);
    let facTax = 0;
    for (const [key, facDef] of Object.entries(KINGDOM_CONFIG.facilities)) {
      const lv = this.getFacilityLevel(key);
      if (lv > 0 && facDef.taxBonus) {
        facTax += lv * facDef.taxBonus;
      }
    }
    const marketSynergy = this.settlementStep >= 3 ? Math.round(facTax * 0.55) : 0;
    return Math.round(def.baseTaxPerCycle + citizenTax + facTax + marketSynergy);
  }

  /**
   * 특정 기반 시설(🏠집 / 🌾농사 / 🐟어업 / 기타 확장 시설)의 다음 단계 건설 비용 계산
   */
  getFacilityNextCost(facId) {
    const def = KINGDOM_CONFIG.facilities[facId];
    if (!def) return { coins: 40, food: 20 };
    const lv = this.getFacilityLevel(facId);
    const scale = Math.pow(def.costScale || 1.35, lv);
    return {
      coins: Math.round(def.baseCoinCost * scale),
      food: Math.round(def.baseFoodCost * scale),
    };
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
    this.farmPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 13.5, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 7.8, -13, 13)
    );
    this.fisheryPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 18.0, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z - sz * 6.5, -13, 13)
    );
    this.townPos.set(
      THREE.MathUtils.clamp(castleEndPt.x + sx * 13.5, -24, 24),
      0,
      THREE.MathUtils.clamp(castleEndPt.z + sz * 7.8, -13, 13)
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

    const compCount = Math.min(KINGDOM_CONFIG.rescue.maxCompanions, Math.max(1, Math.floor(this.population / 2)));
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
   * 3D 문명 단계 및 기반 시설(🏠집 · 🌾농사 · 🐟어업 · 🏪시장 · ⚖️무역소 · 🏰성) 재구축
   */
  rebuildStructures() {
    const clearGrp = (grp) => {
      while (grp.children.length > 0) grp.remove(grp.children[0]);
    };
    clearGrp(this.villageGroup);
    clearGrp(this.farmGroup);
    clearGrp(this.fisheryGroup);
    clearGrp(this.townGroup);
    clearGrp(this.marketGroup);
    clearGrp(this.tradePostGroup);
    clearGrp(this.castleUpgradeGroup);
    clearGrp(this.customFacilityGroup);

    this.windmillBlades = [];
    this.fishingBoatMesh = null;
    this.jumpingFishMeshes = [];
    this.tradeCartMesh = null;

    // 1. ⛺ 작은 마을 & 🏠 집(거주지) 군락
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

    const houseLv = this.getFacilityLevel('house');
    const totalHouses = Math.min(12, 2 + houseLv * 2 + (this.settlementStep - 1));
    const hutWallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true });
    const brickWallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, flatShading: true });
    const hutRoofMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    const tileRoofMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, flatShading: true });

    for (let i = 0; i < totalHouses; i++) {
      const ringIdx = i < 6 ? 0 : 1;
      const countInRing = ringIdx === 0 ? Math.min(6, totalHouses) : totalHouses - 6;
      const idxInRing = ringIdx === 0 ? i : i - 6;
      const ang = (idxInRing / Math.max(1, countInRing)) * Math.PI * 2 + ringIdx * 0.4;
      const rad = ringIdx === 0 ? 2.25 : 3.85;

      const hut = new THREE.Group();
      const isUpgradedHouse = i >= 2 || this.settlementStep >= 2;
      if (isUpgradedHouse) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.92, 0.95), brickWallMat);
        base.position.y = 0.46;
        base.castShadow = true;
        hut.add(base);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.75, 4), tileRoofMat);
        roof.position.y = 1.25;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        hut.add(roof);
      } else {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.76, 0.85, 7), hutWallMat);
        base.position.y = 0.42;
        base.castShadow = true;
        hut.add(base);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.78, 7), hutRoofMat);
        roof.position.y = 1.18;
        roof.castShadow = true;
        hut.add(roof);
      }

      hut.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      this.villageGroup.add(hut);
    }

    // 2. 🌾 농사 (밀밭 농경지 & 풍차 — 사냥 12명 한계 돌파)
    const farmLv = this.getFacilityLevel('farm');
    if (farmLv > 0 || this.settlementStep >= 2) {
      const effectiveFarmLv = Math.max(1, farmLv);
      this.farmGroup.position.copy(this.farmPos);
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x713f12, flatShading: true });
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true });
      const millWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });

      const plotCount = Math.min(6, effectiveFarmLv * 2);
      for (let i = 0; i < plotCount; i++) {
        const col = (i % 2 === 0 ? -1 : 1) * 1.9;
        const row = Math.floor(i / 2) * 1.65 - 1.2;
        const soil = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 1.35), soilMat);
        soil.position.set(col, 0.07, row);
        this.farmGroup.add(soil);

        const crop = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, 0.35 + Math.min(0.35, effectiveFarmLv * 0.08), 1.15),
          wheatMat
        );
        crop.position.set(col, 0.28, row);
        this.farmGroup.add(crop);
      }

      const millTower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.82, 2.3, 8), millWallMat);
      millTower.position.set(0, 1.15, -2.2);
      millTower.castShadow = true;
      this.farmGroup.add(millTower);

      const bladesPivot = new THREE.Group();
      bladesPivot.position.set(0, 1.9, -1.55);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 1.95, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, flatShading: true })
        );
        blade.rotation.z = (b * Math.PI) / 2;
        bladesPivot.add(blade);
      }
      this.farmGroup.add(bladesPivot);
      this.windmillBlades.push(bladesPivot);
    }

    // 3. 🐟 어업 부두 (강·호수 물고기 잡기 — 사냥 12명 한계 돌파)
    const fisheryLv = this.getFacilityLevel('fishery');
    if (fisheryLv > 0) {
      this.fisheryGroup.position.copy(this.fisheryPos);

      // 푸른 어장 수면
      const pond = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.8, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, flatShading: true })
      );
      pond.position.y = 0.06;
      this.fisheryGroup.add(pond);

      // 나무 어업 부두(잔교)
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true });
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 2.8), woodMat);
      pier.position.set(0, 0.28, -1.2);
      pier.castShadow = true;
      this.fisheryGroup.add(pier);

      // 어부 오두막 & 건조대
      const hut = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.95, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, flatShading: true })
      );
      hut.position.set(-1.6, 0.48, -2.0);
      hut.castShadow = true;
      this.fisheryGroup.add(hut);

      // 고기잡이 어선 (Fishing Boat)
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 1.65), woodMat);
      hull.position.y = 0.24;
      boat.add(hull);
      const sail = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.1, 3),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
      );
      sail.position.y = 0.9;
      boat.add(sail);
      boat.position.set(0.9, 0.08, 0.6);
      this.fisheryGroup.add(boat);
      this.fishingBoatMesh = boat;

      // 물 위로 튀어오르는 은빛 물고기들
      const fishCount = Math.min(5, 1 + fisheryLv);
      const fishMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        metalness: 0.5,
        roughness: 0.2,
        flatShading: true,
      });
      for (let f = 0; f < fishCount; f++) {
        const fish = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 5), fishMat);
        fish.rotation.z = Math.PI / 2;
        fish.position.set((f - 1) * 0.75, 0.4, 0.4 + (f % 2) * 0.6);
        this.fisheryGroup.add(fish);
        this.jumpingFishMeshes.push(fish);
      }
    }

    // 4. 🏘️ 2단계 이상: 타운 회관 (Town Hall)
    if (this.settlementStep >= 2) {
      this.townGroup.position.copy(this.townPos);
      const townWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
      const townRoofMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, flatShading: true });

      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.7), townWallMat);
      hall.position.set(0, 0.7, 2.2);
      hall.castShadow = true;
      this.townGroup.add(hall);

      const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 4), townRoofMat);
      hallRoof.position.set(0, 1.95, 2.2);
      hallRoof.rotation.y = Math.PI / 4;
      hallRoof.castShadow = true;
      this.townGroup.add(hallRoof);
    }

    // 5. 🏪 3단계 이상: 타운 시장 (Market — 농사·어업을 체계화하여 생산·세금 증폭!)
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

    // 6. ⚖️ 4단계 이상: 무역소 (Trading Post) & 교역 마차
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

    // 7. 🏰 5단계(및 상위 확장 단계): 대성곽(Castle) 완성!
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

  /**
   * 🏗️ 인과관계형 기반 시설 건설/증축 (🏠 집 짓기 / 🌾 농사 / 🐟 어업 / 기타 무중단 확장 시설)
   */
  constructFacility(facId, stateCoinsAccessor, onBanner, onFloatingText) {
    const def = KINGDOM_CONFIG.facilities[facId];
    if (!def) return false;

    const cost = this.getFacilityNextCost(facId);
    const curCoins = stateCoinsAccessor.getCoins();

    if (curCoins < cost.coins || this.food < cost.food) {
      onBanner(
        `🪙 세금 또는 🍖 식량 부족`,
        `${def.emoji} ${def.name} 건설에는 🪙${cost.coins} 세금, 🍖${cost.food} 식량이 필요합니다! (현재: 🪙${curCoins}, 🍖${this.food})`
      );
      return false;
    }

    // 사냥 한계(12명) 안내: 농사·어업 없이 집만 지어 수용량이 12명을 넘어가려 할 때 친절히 안내
    const huntingLimit = KINGDOM_CONFIG.populationRules.huntingPopLimit || 12;
    if (
      facId === 'house' &&
      this.isRelyingOnlyOnHunting() &&
      this.getRawHousingCapacity() >= huntingLimit
    ) {
      onBanner(
        '🏹 사냥 식량의 한계 (최대 12명)!',
        '혼자 사냥해서 모으는 식량으로는 작은 마을에서 12명 이상 인구를 꾸리기 어렵습니다! 먼저 [🌾 농사]나 [🐟 어업]을 시작하세요!'
      );
      return false;
    }

    stateCoinsAccessor.spendCoins(cost.coins);
    this.food -= cost.food;
    this.facilityLevels[facId] = (this.facilityLevels[facId] || 0) + 1;
    const newLv = this.facilityLevels[facId];

    this.rebuildStructures();

    const pos =
      facId === 'farm'
        ? this.farmPos
        : facId === 'fishery'
          ? this.fisheryPos
          : this.villagePos;

    onFloatingText(
      pos.clone().setY(3.0),
      `${def.emoji} ${def.name} Lv.${newLv}! (최대인구 ${this.getEffectiveMaxPopulation()}명)`,
      '#4ade80'
    );
    onBanner(
      `${def.emoji} ${def.name} Lv.${newLv} 완공!`,
      `${def.desc} (현재 인구 수용량: ${this.population}/${this.getEffectiveMaxPopulation()}명)`
    );

    eventBus.emit('kingdom:facility_built', {
      facId,
      level: newLv,
      snapshot: this.getSnapshot(),
    });
    return true;
  }

  update(dt, elapsed, { playerPos, enemies, onGrantCoins, onFloatingText, onHitEnemy }) {
    for (const blades of this.windmillBlades) {
      blades.rotation.z = elapsed * 2.5;
    }
    if (this.fishingBoatMesh) {
      this.fishingBoatMesh.position.y = 0.08 + Math.sin(elapsed * 3.2) * 0.06;
      this.fishingBoatMesh.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
    }
    this.jumpingFishMeshes.forEach((fish, idx) => {
      const jumpPhase = (elapsed * 2.6 + idx * 1.3) % (Math.PI * 2);
      fish.position.y = 0.15 + Math.max(0, Math.sin(jumpPhase)) * 0.85;
      fish.rotation.z = Math.cos(jumpPhase) * 0.8;
    });
    if (this.tradeCartMesh) {
      this.tradeCartMesh.position.x = Math.sin(elapsed * 1.8) * 1.6;
    }

    // 1. 식량 순생산 (수렵 + 시장으로 체계화된 농사🌾·어업🐟 - 인구 식량 소비)
    const netFoodRate = this.getNetFoodPerSec();
    this.foodAccum += netFoodRate * dt;
    if (Math.abs(this.foodAccum) >= 1) {
      const delta = Math.trunc(this.foodAccum);
      this.foodAccum -= delta;
      this.food = Math.max(0, this.food + delta);
    }

    // 2. 집(🏠) 여유 공간이 있고 식량(🍖)이 충분할 때 자연 인구 유입 (단, 사냥만으로는 12명 한계!)
    const maxPop = this.getEffectiveMaxPopulation();
    if (this.population < maxPop && this.food >= KINGDOM_CONFIG.populationRules.minFoodForPopGrowth) {
      this.popGrowthTimer += dt;
      if (this.popGrowthTimer >= KINGDOM_CONFIG.populationRules.naturalGrowthInterval) {
        this.popGrowthTimer = 0;
        this.population += 1;
        if (this.companions.length < KINGDOM_CONFIG.rescue.maxCompanions) {
          this.companions.push(
            new CompanionUnit(this.scene, this.villagePos.x, this.villagePos.z, this.companions.length)
          );
        }
        this.rebuildStructures();
        onFloatingText(
          this.villagePos.clone().setY(2.5),
          `🏠 새 주민 정착! (인구 ${this.population}/${maxPop}명)`,
          '#38bdf8'
        );
      }
    }

    // 3. 세금(돈 🪙) 징수 (시장 완성 시 농사·어업 체계화 상업세 포함)
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
            ? '시장(농·어업 체계화) 세금'
            : this.settlementStep >= 2
              ? '타운 세금'
              : '마을 세금';
      onFloatingText(taxAnchor.clone().setY(2.3), `+🪙${taxCoins} ${sourceLabel}!`, '#fde047');
      eventBus.emit('kingdom:tax_collected', { amount: taxCoins, step: this.settlementStep });
    }

    // 4. 타운/성곽 자동 방어 사격
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

    // 5. 야생 사냥감 리스폰 및 사냥 판정
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
          `🏹 사냥 성공! 🍖+${foodGain} · 🪙+${coinGain}`,
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

    // 6. 숲속 유민/동료 구출 판정 (집 수용 한도 & 12명 사냥 한계 체크!)
    this.survivorSpawnTimer -= dt;
    if (this.survivorSpawnTimer <= 0) {
      this.survivorSpawnTimer = KINGDOM_CONFIG.rescue.respawnInterval;
      this.spawnSurvivor();
    }

    for (let i = this.survivors.length - 1; i >= 0; i--) {
      const sv = this.survivors[i];
      sv.update(dt, elapsed);
      if (!sv.rescued && playerPos && sv.position.distanceTo(playerPos) <= KINGDOM_CONFIG.rescue.rescueRadius) {
        const effMaxPop = this.getEffectiveMaxPopulation();
        const huntingLimit = KINGDOM_CONFIG.populationRules.huntingPopLimit || 12;

        if (this.population >= effMaxPop) {
          if (sv.warnCooldown <= 0) {
            sv.warnCooldown = 2.8;
            if (this.isRelyingOnlyOnHunting() && this.population >= huntingLimit) {
              onFloatingText(
                sv.position.clone().setY(2.3),
                `🏹 사냥 한계(12명)! [🌾농사]나 [🐟어업] 필요!`,
                '#fb923c'
              );
            } else {
              onFloatingText(
                sv.position.clone().setY(2.3),
                `🏠 집 부족(${this.population}/${effMaxPop}명)! [🏠집 짓기] 필요!`,
                '#f87171'
              );
            }
          }
          continue;
        }

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
          `👥 주민 합류! (인구 ${this.population}/${effMaxPop}명)`,
          '#38bdf8'
        );
        sv.destroy();
        this.survivors.splice(i, 1);
      }
    }

    // 7. 호위 동료 전투 업데이트
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
      facilityLevels: { ...this.facilityLevels },
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
    if (snap.facilityLevels && typeof snap.facilityLevels === 'object') {
      for (const [k, lv] of Object.entries(snap.facilityLevels)) {
        if (typeof lv === 'number' && lv > (this.facilityLevels[k] || 0)) {
          this.facilityLevels[k] = lv;
          changed = true;
        }
      }
    }
    if (changed) this.rebuildStructures();
  }
}

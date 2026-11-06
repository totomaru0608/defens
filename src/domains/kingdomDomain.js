import * as THREE from 'three';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import { eventBus } from '../core/eventBus.js';
import { WildPrey, LostSurvivor, CompanionUnit } from '../entities/kingdomUnits.js';
import { rebuildSettlementMeshes } from './settlementBuilder3D.js';

/**
 * 🏛️ 현실 인과관계 경제·방어 건국 도메인 매니저 (Strict <300줄 준수)
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
    this.root.add(
      this.villageGroup, this.farmGroup, this.fisheryGroup, this.townGroup,
      this.marketGroup, this.tradePostGroup, this.castleUpgradeGroup, this.customFacilityGroup
    );

    this.windmillBlades = [];
    this.fishingBoatMesh = null;
    this.jumpingFishMeshes = [];
    this.tradeCartMesh = null;
    this.settlementStep = 1;
    this.food = 35;
    this.population = KINGDOM_CONFIG.populationRules.initialPop;
    this.facilityLevels = { house: 0, farm: 0, fishery: 0 };
    Object.assign(this, { foodAccum: 0, taxTimer: 0, popGrowthTimer: 0, castleGuardTimer: 0, preySpawnTimer: 2.0, survivorSpawnTimer: 3.0 });
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

  getFacilityLevel(facId) { return this.facilityLevels[facId] || 0; }
  getTotalFoodFacilityLevels() {
    return Object.entries(KINGDOM_CONFIG.facilities).reduce(
      (sum, [key, def]) => sum + (def.unlocksAboveHuntingCap || def.category === 'food_primary' ? this.getFacilityLevel(key) : 0), 0
    );
  }
  isRelyingOnlyOnHunting() { return this.getTotalFoodFacilityLevels() === 0; }
  getRawHousingCapacity() {
    let cap = KINGDOM_CONFIG.populationRules.baseVillageHousing;
    for (const [key, def] of Object.entries(KINGDOM_CONFIG.facilities)) {
      if (def.housingBonus) cap += this.getFacilityLevel(key) * def.housingBonus;
    }
    return cap + (this.settlementStep - 1) * 2;
  }
  getEffectiveMaxPopulation() {
    const rawCap = this.getRawHousingCapacity();
    return this.isRelyingOnlyOnHunting() ? Math.min(rawCap, KINGDOM_CONFIG.populationRules.huntingPopLimit || 12) : rawCap;
  }
  getCurrentStepDef() {
    const chain = KINGDOM_CONFIG.settlementChain;
    return chain[Math.min(chain.length - 1, Math.max(0, this.settlementStep - 1))];
  }
  getNextStepDef() {
    const chain = KINGDOM_CONFIG.settlementChain;
    return this.settlementStep >= chain.length ? null : chain[this.settlementStep];
  }
  getCombatMultiplier() { return this.getCurrentStepDef().combatMultiplier || 1.0; }
  getAgriFishMultiplier() { return this.getCurrentStepDef().agriFishMultiplier || 1.0; }

  getGrossFoodProductionPerSec() {
    const baseHuntFood = this.getCurrentStepDef().foodPerSec || 2.0;
    let agriFishFood = 0;
    for (const [key, facDef] of Object.entries(KINGDOM_CONFIG.facilities)) {
      if (facDef.foodPerSec) agriFishFood += this.getFacilityLevel(key) * facDef.foodPerSec;
    }
    return +(baseHuntFood + agriFishFood * this.getAgriFishMultiplier()).toFixed(1);
  }

  getFoodConsumptionPerSec() {
    return +(this.population * (KINGDOM_CONFIG.populationRules.foodConsumptionPerPop || 0.28)).toFixed(1);
  }

  getNetFoodPerSec() { return +(this.getGrossFoodProductionPerSec() - this.getFoodConsumptionPerSec()).toFixed(1); }
  getFoodPerSec() { return this.getNetFoodPerSec(); }

  getTaxPerCycle() {
    const def = this.getCurrentStepDef();
    const citizenTax = Math.floor(this.population * 2.2);
    let facTax = 0;
    for (const [key, facDef] of Object.entries(KINGDOM_CONFIG.facilities)) {
      if (facDef.taxBonus) facTax += this.getFacilityLevel(key) * facDef.taxBonus;
    }
    const marketSynergy = this.settlementStep >= 3 ? Math.round(facTax * 0.55) : 0;
    return Math.round(def.baseTaxPerCycle + citizenTax + facTax + marketSynergy);
  }

  getFacilityNextCost(facId) {
    const def = KINGDOM_CONFIG.facilities[facId];
    if (!def) return { coins: 40, food: 20 };
    const scale = Math.pow(def.costScale || 1.35, this.getFacilityLevel(facId));
    return { coins: Math.round(def.baseCoinCost * scale), food: Math.round(def.baseFoodCost * scale) };
  }

  initForStage(castleEndPt) {
    this.clearEntities();
    this.castleEndPt.copy(castleEndPt);
    const sx = castleEndPt.x > 0 ? -1 : 1, sz = castleEndPt.z > 0 ? -1 : 1;
    const clampX = (dx) => THREE.MathUtils.clamp(castleEndPt.x + sx * dx, -24, 24);
    const clampZ = (dz) => THREE.MathUtils.clamp(castleEndPt.z + sz * dz, -13, 13);

    this.villagePos.set(clampX(8.2), 0, clampZ(3.2));
    this.farmPos.set(clampX(13.5), 0, clampZ(7.8));
    this.fisheryPos.set(clampX(18.0), 0, clampZ(-6.5));
    this.townPos.set(clampX(13.5), 0, clampZ(7.8));
    this.marketPos.set(clampX(8.0), 0, clampZ(10.2));
    this.tradePostPos.set(clampX(14.5), 0, clampZ(2.5));

    for (let i = 0; i < 3; i++) this.spawnWildPrey();
    for (let i = 0; i < 2; i++) this.spawnSurvivor();
    const compCount = Math.min(KINGDOM_CONFIG.rescue.maxCompanions, Math.max(1, Math.floor(this.population / 2)));
    for (let i = 0; i < compCount; i++) this.companions.push(new CompanionUnit(this.scene, 0, 0, i));
    this.rebuildStructures();
  }

  clearEntities() {
    this.wildPreys.forEach((p) => p.destroy()); this.wildPreys = [];
    this.survivors.forEach((s) => s.destroy()); this.survivors = [];
    this.companions.forEach((c) => c.destroy()); this.companions = [];
  }

  spawnWildPrey() {
    if (this.wildPreys.length >= KINGDOM_CONFIG.hunting.maxWildPreys) return;
    const spots = [[-23, -12], [-20, 12], [0, -13], [2, 13], [-12, -13], [14, -12]];
    const [bx, bz] = spots[Math.floor(Math.random() * spots.length)];
    this.wildPreys.push(new WildPrey(this.scene, bx + (Math.random() - 0.5) * 4, bz + (Math.random() - 0.5) * 3));
  }

  spawnSurvivor() {
    if (this.survivors.length >= KINGDOM_CONFIG.rescue.maxActiveSurvivors) return;
    const spots = [[-24, 11], [-15, -12], [6, 12], [-6, 13], [15, -11]];
    const [bx, bz] = spots[Math.floor(Math.random() * spots.length)];
    this.survivors.push(new LostSurvivor(this.scene, bx + (Math.random() - 0.5) * 3, bz + (Math.random() - 0.5) * 3));
  }

  rebuildStructures() { rebuildSettlementMeshes(this); }

  constructFacility(facId, stateCoinsAccessor, onBanner, onFloatingText) {
    const def = KINGDOM_CONFIG.facilities[facId];
    if (!def) return false;
    const cost = this.getFacilityNextCost(facId);
    if (stateCoinsAccessor.getCoins() < cost.coins || this.food < cost.food) {
      onBanner('🪙 세금 또는 🍖 식량 부족', `${def.emoji} ${def.name}에는 🪙${cost.coins}, 🍖${cost.food}가 필요합니다!`);
      return false;
    }
    const huntingLimit = KINGDOM_CONFIG.populationRules.huntingPopLimit || 12;
    if (facId === 'house' && this.isRelyingOnlyOnHunting() && this.getRawHousingCapacity() >= huntingLimit) {
      onBanner('🏹 사냥 식량의 한계 (최대 12명)!', '혼자 사냥으론 12명 이상 부양이 어렵습니다! 먼저 [🌾 농사]나 [🐟 어업]을 시작하세요!');
      return false;
    }
    stateCoinsAccessor.spendCoins(cost.coins);
    this.food -= cost.food;
    const newLv = (this.facilityLevels[facId] || 0) + 1;
    this.facilityLevels[facId] = newLv;
    this.rebuildStructures();

    const pos = facId === 'farm' ? this.farmPos : facId === 'fishery' ? this.fisheryPos : this.villagePos;
    onFloatingText(pos.clone().setY(3.0), `${def.emoji} ${def.name} Lv.${newLv}!`, '#4ade80');
    onBanner(`${def.emoji} ${def.name} Lv.${newLv} 완공!`, `${def.desc} (인구 상한: ${this.getEffectiveMaxPopulation()}명)`);
    eventBus.emit('kingdom:facility_built', { facId, level: newLv, snapshot: this.getSnapshot() });
    return true;
  }

  animateStructuresAndEconomy(dt, elapsed, onGrantCoins, onFloatingText) {
    for (const blades of this.windmillBlades) blades.rotation.z = elapsed * 2.5;
    if (this.fishingBoatMesh) {
      this.fishingBoatMesh.position.y = 0.08 + Math.sin(elapsed * 3.2) * 0.06;
      this.fishingBoatMesh.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
    }
    this.jumpingFishMeshes.forEach((fish, idx) => {
      const ph = (elapsed * 2.6 + idx * 1.3) % (Math.PI * 2);
      fish.position.y = 0.15 + Math.max(0, Math.sin(ph)) * 0.85;
      fish.rotation.z = Math.cos(ph) * 0.8;
    });
    if (this.tradeCartMesh) this.tradeCartMesh.position.x = Math.sin(elapsed * 1.8) * 1.6;

    this.foodAccum += this.getNetFoodPerSec() * dt;
    if (Math.abs(this.foodAccum) >= 1) {
      const delta = Math.trunc(this.foodAccum);
      this.foodAccum -= delta;
      this.food = Math.max(0, this.food + delta);
    }

    const maxPop = this.getEffectiveMaxPopulation();
    if (this.population < maxPop && this.food >= KINGDOM_CONFIG.populationRules.minFoodForPopGrowth) {
      if ((this.popGrowthTimer += dt) >= KINGDOM_CONFIG.populationRules.naturalGrowthInterval) {
        this.popGrowthTimer = 0; this.population += 1; this.rebuildStructures();
        onFloatingText(this.villagePos.clone().setY(2.5), `🏠 새 주민 정착! (${this.population}/${maxPop}명)`, '#38bdf8');
      }
    }

    if ((this.taxTimer += dt) >= KINGDOM_CONFIG.taxCycleSeconds) {
      this.taxTimer = 0;
      const taxCoins = this.getTaxPerCycle();
      onGrantCoins(taxCoins);
      const anchor = this.settlementStep >= 4 ? this.tradePostPos : this.settlementStep >= 3 ? this.marketPos : this.villagePos;
      onFloatingText(anchor.clone().setY(2.3), `+🪙${taxCoins} 세금 징수!`, '#fde047');
    }
  }

  update(dt, elapsed, { playerPos, enemies, onGrantCoins, onFloatingText, onHitEnemy }) {
    this.animateStructuresAndEconomy(dt, elapsed, onGrantCoins, onFloatingText);

    const curDef = this.getCurrentStepDef();
    if (curDef && curDef.autoGuardDamage > 0 && enemies.length > 0 && (this.castleGuardTimer -= dt) <= 0) {
      const target = enemies.find((e) => !e.dead && !e.reachedCastle && e.position.distanceTo(this.castleEndPt) < 14.5);
      if (target) { this.castleGuardTimer = 1.05; onHitEnemy(target, curDef.autoGuardDamage, '#fde047'); }
    }

    if ((this.preySpawnTimer -= dt) <= 0) { this.preySpawnTimer = KINGDOM_CONFIG.hunting.respawnInterval; this.spawnWildPrey(); }
    const handlePreyHit = (prey, dmg) => {
      if (!prey.takeDamage(dmg)) return;
      this.food += KINGDOM_CONFIG.hunting.foodReward;
      onGrantCoins(KINGDOM_CONFIG.hunting.taxSeedReward);
      onFloatingText(prey.position.clone().setY(2.1), `🏹 사냥! 🍖+${KINGDOM_CONFIG.hunting.foodReward}`, '#84cc16');
    };

    for (let i = this.wildPreys.length - 1; i >= 0; i--) {
      const prey = this.wildPreys[i];
      prey.update(dt, elapsed);
      if (!prey.dead && playerPos && prey.position.distanceTo(playerPos) <= 2.9 && Math.random() < dt * 2.6) {
        handlePreyHit(prey, Math.round(24 * this.getCombatMultiplier()));
      }
      if (prey.dead) { prey.destroy(); this.wildPreys.splice(i, 1); }
    }

    if ((this.survivorSpawnTimer -= dt) <= 0) { this.survivorSpawnTimer = KINGDOM_CONFIG.rescue.respawnInterval; this.spawnSurvivor(); }

    for (let i = this.survivors.length - 1; i >= 0; i--) {
      const sv = this.survivors[i];
      sv.update(dt, elapsed);
      if (!sv.rescued && playerPos && sv.position.distanceTo(playerPos) <= KINGDOM_CONFIG.rescue.rescueRadius) {
        const effMax = this.getEffectiveMaxPopulation();
        if (this.population >= effMax) {
          if (sv.warnCooldown <= 0) {
            sv.warnCooldown = 2.8;
            const msg = this.isRelyingOnlyOnHunting() ? '🏹 사냥한계(12명)! [🌾농사/🐟어업] 필요!' : '🏠 집 부족! [🏠집 짓기] 필요!';
            onFloatingText(sv.position.clone().setY(2.3), msg, '#fb923c');
          }
          continue;
        }
        sv.rescued = true; this.population += 1; this.food += KINGDOM_CONFIG.rescue.foodBonusOnRescue;
        if (this.companions.length < KINGDOM_CONFIG.rescue.maxCompanions) {
          this.companions.push(new CompanionUnit(this.scene, sv.position.x, sv.position.z, this.companions.length));
        }
        this.rebuildStructures();
        onFloatingText(sv.position.clone().setY(2.2), `👥 주민 합류! (${this.population}/${effMax}명)`, '#38bdf8');
        sv.destroy(); this.survivors.splice(i, 1);
      }
    }

    const mult = this.getCombatMultiplier();
    for (const comp of this.companions) {
      comp.update(dt, elapsed, playerPos, enemies, this.wildPreys, mult, (e, d) => onHitEnemy(e, d, '#38bdf8'), handlePreyHit);
    }
  }

  getSnapshot() {
    return { settlementStep: this.settlementStep, food: this.food, population: this.population, facilityLevels: { ...this.facilityLevels } };
  }

  applySnapshot(snap) {
    if (!snap) return;
    let changed = false;
    if (typeof snap.settlementStep === 'number' && snap.settlementStep > this.settlementStep) { this.settlementStep = snap.settlementStep; changed = true; }
    if (typeof snap.food === 'number') this.food = Math.max(this.food, snap.food);
    if (typeof snap.population === 'number' && snap.population > this.population) { this.population = snap.population; changed = true; }
    if (snap.facilityLevels && typeof snap.facilityLevels === 'object') {
      for (const [k, lv] of Object.entries(snap.facilityLevels)) {
        if (typeof lv === 'number' && lv > (this.facilityLevels[k] || 0)) { this.facilityLevels[k] = lv; changed = true; }
      }
    }
    if (changed) this.rebuildStructures();
  }
}

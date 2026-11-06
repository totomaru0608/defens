/**
 * 🌍 데이터 주도 세계관 & 인과관계형 건국/방어 레지스트리 (Data-Driven Causal Worldview Registry)
 *
 * [핵심 인과관계 설계 — 현실 경제·인구·식량·세금 순환]
 * 1. 🏹 숲속 사냥과 작은 마을의 한계 (12명 부양 한계):
 *    - 처음에는 혼자서(또는 소수 동료와) 숲속 사냥을 통해 식량(🍖)을 모으며 시작합니다.
 *    - 하지만 사냥만으로 모으는 식량으로는 작은 마을에서 최대 12명(huntingPopLimit: 12) 이상 인구를 꾸리기 어렵습니다.
 * 2. 🏠 집 짓기 (거주지 확장) & 식량 부양:
 *    - 인구가 늘어나려면 반드시 집(🏠)을 지어 수용 인구(Housing Capacity)를 늘려야 합니다.
 *    - 인구가 늘어날수록 매초 식량 소비량도 함께 증가하므로 더 많은 식량이 필요합니다.
 * 3. 🌾 농사 & 🐟 어업(물고기 잡기)으로 사냥의 한계 돌파:
 *    - 12명 이상의 많은 인구를 부양하려면 사냥의 한계를 넘어 땅을 일구는 농사(🌾)와
 *      강·호수에서 물고기를 잡는 어업(🐟)을 시작해야 식량이 안정적으로 대량 생산됩니다.
 * 4. 🏪 시장 완성 ➔ ⚖️ 무역소 개설 ➔ 🏰 성(Castle) 완공:
 *    - 농사와 어업을 더 체계적으로 운영(수확물 유통·보관·도구 보급·가격 형성)하려면 시장(🏪)이 필수입니다.
 *    - 시장이 완성되면 농사·어업 효율이 체계화되어 생산량이 크게 뛰고, 잉여 생산물이 세금(🪙)으로 전환됩니다.
 *    - 이후 무역소(⚖️)와 성(🏰)으로 발전하며, 모든 단계에서 세금(🪙)으로 감시탑·방어탑·울타리·성벽을 세워 자신을 지킵니다.
 * 5. 🛡️ 무중단 무한 확장 (Zero-Downtime Extensibility):
 *    - 게임 플레이 도중 새로운 건물/산업/시대 단계를 레지스트리에 추가하거나 패치해도
 *      진행 중인 게임이 단 1프레임도 중단되거나 초기화되지 않고 즉시 반영됩니다.
 */

export const KINGDOM_CONFIG = {
  schemaVersion: '3.0.0',
  worldviewName: '현실 인과관계 건국 연대기 (수렵 ➔ 집·농사·어업 ➔ 시장 체계화 ➔ 무역소 ➔ 성)',

  // 👥 인구 · 주거 · 사냥 한계(12명) · 식량 소비 규칙
  populationRules: {
    initialPop: 3,
    baseVillageHousing: 6, // 처음 작은 마을 기본 움막 수용 인원 (집을 지어야 늘어남)
    huntingPopLimit: 12, // 사냥만으로는 작은 마을에서 12명 이상 인구를 꾸리기 어려움 (농사/어업 필수)
    housingPerHouseLevel: 4, // 집(🏠) 1단계 증축당 늘어나는 최대 인구 수용량 (+4명)
    foodConsumptionPerPop: 0.28, // 인구 1명당 초당 식량 소비량
    naturalGrowthInterval: 9.0, // 집 여유 공간과 식량이 충분할 때 새 주민이 합류하는 주기(초)
    minFoodForPopGrowth: 20, // 인구 증가에 필요한 최소 여유 식량
  },

  // 🏹 숲 사냥 & 🆘 유민(주민/동료) 합류 설정
  hunting: {
    maxWildPreys: 4,
    respawnInterval: 6.5,
    preyHp: 45,
    foodReward: 16,
    taxSeedReward: 12,
    baseHunterFoodPerSec: 1.8, // 기본 수렵 식량 수급량 (인구 12명 부양 한계)
  },
  rescue: {
    maxActiveSurvivors: 3,
    respawnInterval: 8.0,
    rescueRadius: 2.7,
    foodBonusOnRescue: 14,
    maxCompanions: 6,
  },

  // 세금 징수 주기 (초)
  taxCycleSeconds: 3.2,

  /**
   * 🏗️ 인과관계형 생활·생산 기반 시설 (집 ➔ 농사·어업 ➔ 시장 체계화)
   * - 플레이 중 언제든 새로운 시설(예: 대장간, 목장, 조선소 등)을 추가해도 무중단으로 즉시 동작합니다.
   */
  facilities: {
    house: {
      id: 'house',
      name: '집 짓기',
      emoji: '🏠',
      category: 'housing',
      baseCoinCost: 25,
      baseFoodCost: 15,
      costScale: 1.35,
      housingBonus: 4, // 레벨당 수용 인구 +4명
      foodPerSec: 0,
      taxBonus: 2, // 거주 세대 증가에 따른 기본 인두세 증가
      desc: '주민들이 살 집을 지어 최대 인구 수용량을 +4명 늘립니다. (12명 이상은 농사·어업 필수)',
    },
    farm: {
      id: 'farm',
      name: '농사 개간',
      emoji: '🌾',
      category: 'food_primary',
      baseCoinCost: 35,
      baseFoodCost: 20,
      costScale: 1.4,
      housingBonus: 2,
      foodPerSec: 5.5, // 레벨당 초당 곡물 식량 +5.5 (시장 완성 시 체계화 보너스 추가 증폭!)
      taxBonus: 4,
      unlocksAboveHuntingCap: true, // 12명 수렵 한계 돌파
      desc: '사냥의 한계를 넘어 밀밭과 풍차를 일구어 많은 인구를 먹여 살릴 대량 식량을 생산합니다.',
    },
    fishery: {
      id: 'fishery',
      name: '어업 부두',
      emoji: '🐟',
      category: 'food_primary',
      baseCoinCost: 40,
      baseFoodCost: 20,
      costScale: 1.4,
      housingBonus: 2,
      foodPerSec: 6.5, // 레벨당 초당 물고기 식량 +6.5 + 어획물 거래 세금
      taxBonus: 6,
      unlocksAboveHuntingCap: true, // 12명 수렵 한계 돌파
      desc: '강과 호수에 고기잡이 부두와 어선을 띄워 신선한 물고기 식량과 어업 소득을 확보합니다.',
    },
  },

  /**
   * 🏛️ 문명 및 정착지 발전 5단계 체인 (순차 해금: 작은 마을 -> 타운 -> 시장 -> 무역소 -> 성)
   * 추후 6단계(항구 교역도시), 7단계(왕립 수도) 등 런타임에 무중단 증설 가능
   */
  settlementChain: [
    {
      step: 1,
      id: 'small_village',
      name: '아주 작은 마을',
      badge: '⛺ 1단계: 작은 마을',
      shortLabel: '⛺ 작은 마을',
      desc: '숲속에서 사냥으로 식량을 모으는 작은 마을입니다. 사냥만으로는 최대 12명까지만 부양할 수 있으므로 집(🏠)을 짓고 농사(🌾)와 어업(🐟)을 시작해야 합니다.',
      reqCoins: 0,
      reqFood: 0,
      reqPop: 3,
      reqFoodFacilityLevels: 0,
      baseTaxPerCycle: 8,
      foodPerSec: 2.2,
      agriFishMultiplier: 1.0, // 시장 이전에는 농사·어업이 자급자족 수준(1.0x)
      castleMaxHpBonus: 0,
      combatMultiplier: 1.0,
      autoGuardDamage: 0,
    },
    {
      step: 2,
      id: 'town',
      name: '타운 건설',
      badge: '🏘️ 2단계: 타운',
      shortLabel: '🏘️ 타운 건설',
      desc: '집(🏠)을 지어 인구를 늘리고 농사(🌾)·어업(🐟)을 시작해 작은 마을을 어엿한 타운(Town)으로 발전시켰습니다!',
      reqCoins: 60,
      reqFood: 35,
      reqPop: 6,
      reqFoodFacilityLevels: 1, // 농사 또는 어업 최소 1단계 이상 필요
      baseTaxPerCycle: 16,
      foodPerSec: 4.5,
      agriFishMultiplier: 1.25, // 타운 형성으로 농사·어업 협업 효율 1.25배
      castleMaxHpBonus: 60,
      combatMultiplier: 1.22,
      autoGuardDamage: 14,
    },
    {
      step: 3,
      id: 'market',
      name: '시장 완성 (농사·어업 체계화)',
      badge: '🏪 3단계: 시장 완성',
      shortLabel: '🏪 시장 완성',
      desc: '타운에 상설 시장(Market)이 완성되어 농사(🌾)와 어업(🐟)이 체계적으로 분업·유통됩니다! 농수산물 생산량이 1.75배로 급증하고 상업 세금(🪙)이 쏟아집니다.',
      reqCoins: 110,
      reqFood: 65,
      reqPop: 10,
      reqFoodFacilityLevels: 2, // 농사+어업 합산 2단계 이상일 때 시장 체계화 완성 가능
      baseTaxPerCycle: 30,
      foodPerSec: 8.0,
      agriFishMultiplier: 1.75, // 시장이 농사·어업을 체계화하여 식량 생산 1.75배 증폭!
      castleMaxHpBonus: 130,
      combatMultiplier: 1.48,
      autoGuardDamage: 24,
    },
    {
      step: 4,
      id: 'trading_post',
      name: '무역소 개설',
      badge: '⚖️ 4단계: 무역소',
      shortLabel: '⚖️ 무역소 개설',
      desc: '체계화된 시장의 잉여 농산물과 물고기를 타 지역과 대량 교역하는 무역소를 개설했습니다! 막대한 무역 관세(🪙)로 성(Castle) 축조 자금을 모읍니다.',
      reqCoins: 175,
      reqFood: 100,
      reqPop: 14, // 12명 수렵 한계를 완전히 돌파한 인구 규모
      reqFoodFacilityLevels: 3,
      baseTaxPerCycle: 50,
      foodPerSec: 13.0,
      agriFishMultiplier: 2.2, // 광역 무역망으로 농사·어업 생산성 2.2배!
      castleMaxHpBonus: 220,
      combatMultiplier: 1.8,
      autoGuardDamage: 38,
    },
    {
      step: 5,
      id: 'castle',
      name: '성 (Castle) 완성',
      badge: '🏰 5단계: 성 완성',
      shortLabel: '🏰 성 완성',
      desc: '시장과 무역소에서 모은 세금(🪙)으로 4대 황금 망루와 난공불락의 대성곽(Castle)을 최종 완공하여 부강한 왕국을 세웠습니다!',
      reqCoins: 260,
      reqFood: 150,
      reqPop: 18,
      reqFoodFacilityLevels: 4,
      baseTaxPerCycle: 82,
      foodPerSec: 20.0,
      agriFishMultiplier: 2.8,
      castleMaxHpBonus: 380,
      combatMultiplier: 2.25,
      autoGuardDamage: 60,
    },
  ],

  /**
   * 🛡️ 자신을 지키는 4대 기본 수비 시설 레지스트리 (세금 🪙으로 건설 및 최대 Lv.3 강화)
   */
  fortifications: {
    watchtower: {
      id: 'watchtower',
      name: '감시탑 (망루)',
      emoji: '🔭',
      roleDesc: '넓은 시야와 빠른 연사로 접근하는 적을 조기 발견해 사격합니다.',
      baseCost: 30,
      upgradeCosts: [40, 55],
      range: 11.5,
      fireRate: 0.38,
      damage: 19,
      color: 0xf59e0b,
    },
    defense_tower: {
      id: 'defense_tower',
      name: '방어탑 (화력 포탑)',
      emoji: '🏹',
      roleDesc: '강력한 화포와 중형 화살로 적 무리에 광역 폭발 피해를 입힙니다.',
      baseCost: 45,
      upgradeCosts: [55, 80],
      range: 9.2,
      fireRate: 0.95,
      damage: 46,
      splashRadius: 3.4,
      color: 0xef4444,
    },
    fence: {
      id: 'fence',
      name: '울타리 (목책 방어선)',
      emoji: '🪵',
      roleDesc: '길목 주변에 날카로운 목책 울타리를 쳐서 적의 이동 속도를 크게 늦추고 저지합니다.',
      baseCost: 25,
      upgradeCosts: [35, 50],
      range: 8.2,
      fireRate: 0.65,
      damage: 14,
      slowFactor: 0.42,
      slowDuration: 2.6,
      color: 0xa16207,
    },
    castle_wall: {
      id: 'castle_wall',
      name: '성벽 (석조 보루)',
      emoji: '🧱',
      roleDesc: '견고한 석조 성벽 보루를 세워 충격파 포격과 함께 마을과 성의 방어력을 높입니다.',
      baseCost: 55,
      upgradeCosts: [70, 95],
      range: 9.8,
      fireRate: 0.8,
      damage: 36,
      splashRadius: 2.8,
      slowFactor: 0.55,
      slowDuration: 1.8,
      color: 0x64748b,
    },
  },
};

/**
 * 🛡️ 무중단 라이브 패치(Zero-Downtime Hot Patch) 함수
 * - 플레이 도중 서버나 확장 스튜디오에서 새로운 시설(예: 목장, 광산, 조선소), 새로운 문명 단계(6단계 해상 제국 등),
 *   또는 밸런스 수치를 패치해도 진행 중인 게임을 멈추지 않고 즉시 레지스트리에 병합합니다.
 */
export function hotPatchKingdomConfig(patchData) {
  if (!patchData || typeof patchData !== 'object') return KINGDOM_CONFIG;
  if (Array.isArray(patchData.settlementChain)) {
    KINGDOM_CONFIG.settlementChain = patchData.settlementChain;
  }
  if (patchData.AppendStage && typeof patchData.AppendStage === 'object') {
    registerSettlementStage(patchData.AppendStage);
  }
  if (patchData.facilities && typeof patchData.facilities === 'object') {
    Object.assign(KINGDOM_CONFIG.facilities, patchData.facilities);
  }
  if (patchData.populationRules && typeof patchData.populationRules === 'object') {
    Object.assign(KINGDOM_CONFIG.populationRules, patchData.populationRules);
  }
  if (patchData.fortifications && typeof patchData.fortifications === 'object') {
    Object.assign(KINGDOM_CONFIG.fortifications, patchData.fortifications);
  }
  if (patchData.hunting) Object.assign(KINGDOM_CONFIG.hunting, patchData.hunting);
  if (patchData.rescue) Object.assign(KINGDOM_CONFIG.rescue, patchData.rescue);
  if (typeof patchData.taxCycleSeconds === 'number') {
    KINGDOM_CONFIG.taxCycleSeconds = patchData.taxCycleSeconds;
  }
  if (patchData.schemaVersion) {
    KINGDOM_CONFIG.schemaVersion = patchData.schemaVersion;
  }
  return KINGDOM_CONFIG;
}

/**
 * 런타임에 새로운 발전 단계(예: 6단계 대항구, 7단계 제국 수도 등)를 무중단으로 등록하는 헬퍼
 */
export function registerSettlementStage(stageDef) {
  const existingIdx = KINGDOM_CONFIG.settlementChain.findIndex((s) => s.id === stageDef.id);
  if (existingIdx >= 0) {
    KINGDOM_CONFIG.settlementChain[existingIdx] = {
      ...KINGDOM_CONFIG.settlementChain[existingIdx],
      ...stageDef,
    };
  } else {
    const nextStep = KINGDOM_CONFIG.settlementChain.length + 1;
    KINGDOM_CONFIG.settlementChain.push({
      step: nextStep,
      id: stageDef.id || `stage_${nextStep}`,
      name: stageDef.name || `${nextStep}단계 신문명`,
      badge: stageDef.badge || `🌟 ${nextStep}단계: ${stageDef.name || '신문명'}`,
      shortLabel: stageDef.shortLabel || `🌟 ${stageDef.name || '신문명'}`,
      desc: stageDef.desc || '무중단 라이브 확장으로 추가된 새로운 문명 단계입니다!',
      reqCoins: stageDef.reqCoins ?? 320,
      reqFood: stageDef.reqFood ?? 180,
      reqPop: stageDef.reqPop ?? 20,
      reqFoodFacilityLevels: stageDef.reqFoodFacilityLevels ?? 4,
      baseTaxPerCycle: stageDef.baseTaxPerCycle ?? 110,
      foodPerSec: stageDef.foodPerSec ?? 28,
      agriFishMultiplier: stageDef.agriFishMultiplier ?? 3.4,
      castleMaxHpBonus: stageDef.castleMaxHpBonus ?? 520,
      combatMultiplier: stageDef.combatMultiplier ?? 2.6,
      autoGuardDamage: stageDef.autoGuardDamage ?? 80,
    });
    KINGDOM_CONFIG.settlementChain.sort((a, b) => a.step - b.step);
  }
  return KINGDOM_CONFIG.settlementChain;
}

/**
 * 런타임에 새로운 생산/인프라 시설(예: 목장, 철광산, 범선 어단 등)을 무중단으로 등록하는 헬퍼
 */
export function registerKingdomFacility(facilityDef) {
  if (!facilityDef || !facilityDef.id) return KINGDOM_CONFIG.facilities;
  KINGDOM_CONFIG.facilities[facilityDef.id] = {
    id: facilityDef.id,
    name: facilityDef.name || '신규 시설',
    emoji: facilityDef.emoji || '🏗️',
    category: facilityDef.category || 'custom',
    baseCoinCost: facilityDef.baseCoinCost ?? 45,
    baseFoodCost: facilityDef.baseFoodCost ?? 25,
    costScale: facilityDef.costScale ?? 1.4,
    housingBonus: facilityDef.housingBonus ?? 2,
    foodPerSec: facilityDef.foodPerSec ?? 7.0,
    taxBonus: facilityDef.taxBonus ?? 8,
    unlocksAboveHuntingCap: true,
    desc: facilityDef.desc || '무중단 패치로 추가된 신규 문명 시설입니다.',
  };
  return KINGDOM_CONFIG.facilities;
}

/**
 * 런타임에 새로운 방어 시설을 무중단으로 등록하는 헬퍼
 */
export function registerFortificationType(key, fortDef) {
  KINGDOM_CONFIG.fortifications[key] = fortDef;
  return KINGDOM_CONFIG.fortifications;
}

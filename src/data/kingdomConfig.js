/**
 * 🌍 데이터 주도 세계관 & 건국/방어 레지스트리 (Data-Driven Worldview Registry)
 *
 * [핵심 설계 원칙]
 * 1. 현실 기반 건국 발전 단계:
 *    [1단계: 아주 작은 마을] ➔ [2단계: 타운 건설] ➔ [3단계: 시장 완성] ➔ [4단계: 무역소 개설] ➔ [5단계: 성(Castle) 완성]
 * 2. 4대 핵심 방어 시설 (세금/돈 🪙으로 건설):
 *    [🪵 울타리(Fence)] · [🔭 감시탑(Watchtower)] · [🏹 방어탑(Defense Tower)] · [🧱 성벽(Castle Wall)]
 * 3. 무한 증설 및 무중단 패치(Zero-Downtime Hot Patch):
 *    새로운 발전 단계(예: 대제국, 항구, 신대륙), 새로운 건물, 새로운 방어 시설을 추가할 때
 *    엔진 코드를 건드리지 않고 본 레지스트리에 항목만 추가/패치하면 진행 중인 게임에 즉시 반영됩니다.
 */

export const KINGDOM_CONFIG = {
  schemaVersion: '2.0.0',
  worldviewName: '현실 경제·방어 건국 연대기 (Village to Castle)',

  // 숲 사냥 & 유민(주민/동료) 합류 설정
  hunting: {
    maxWildPreys: 4,
    respawnInterval: 7.0,
    preyHp: 45,
    foodReward: 15,
    taxSeedReward: 12,
  },
  rescue: {
    maxActiveSurvivors: 3,
    respawnInterval: 8.5,
    rescueRadius: 2.7,
    foodBonusOnRescue: 12,
    maxCompanions: 6,
  },

  // 세금 징수 주기 (초)
  taxCycleSeconds: 3.2,

  /**
   * 🏛️ 문명 및 정착지 발전 5단계 체인 (순차 해금: 마을 -> 타운 -> 시장 -> 무역소 -> 성)
   * 추후 6단계(항구 도시), 7단계(왕립 수도) 등 배열에 객체를 추가하는 것만으로 무한 증설 가능
   */
  settlementChain: [
    {
      step: 1,
      id: 'small_village',
      name: '1단계 · 아주 작은 마을',
      shortLabel: '⛺ 작은 마을',
      unlockDesc: '시작 거점: 숲속 개간지에 모닥불과 작은 오두막을 짓고 주민을 모읍니다.',
      coinCost: 0,
      foodCost: 0,
      baseTaxPerCycle: 6,
      foodPerSec: 2.5,
      castleMaxHpBonus: 0,
      combatMultiplier: 1.0,
      autoGuardDamage: 0,
    },
    {
      step: 2,
      id: 'town',
      name: '2단계 · 타운 (Town) 건설',
      shortLabel: '🏘️ 타운 건설',
      unlockDesc: '작은 마을을 발전시켜 타운 회관과 농경지(풍차)를 건설하고 정착 인구를 늘립니다.',
      coinCost: 45,
      foodCost: 25,
      baseTaxPerCycle: 14,
      foodPerSec: 6.0,
      castleMaxHpBonus: 50,
      combatMultiplier: 1.25,
      autoGuardDamage: 12,
    },
    {
      step: 3,
      id: 'market',
      name: '3단계 · 타운 시장 (Market) 완성',
      shortLabel: '🏪 시장 완성',
      unlockDesc: '타운 중심에 상설 시장을 완성하여 물자 거래와 상업 세금(🪙) 징수를 본격화합니다.',
      coinCost: 85,
      foodCost: 45,
      baseTaxPerCycle: 26,
      foodPerSec: 10.5,
      castleMaxHpBonus: 110,
      combatMultiplier: 1.5,
      autoGuardDamage: 22,
    },
    {
      step: 4,
      id: 'trading_post',
      name: '4단계 · 무역소 (Trading Post) 개설',
      shortLabel: '⚖️ 무역소 개설',
      unlockDesc: '시장과 연결된 대무역소를 개설해 교역 마차를 운영하고 막대한 무역 세금을 확보합니다. (성 건설 해금!)',
      coinCost: 135,
      foodCost: 70,
      baseTaxPerCycle: 44,
      foodPerSec: 16.0,
      castleMaxHpBonus: 190,
      combatMultiplier: 1.8,
      autoGuardDamage: 35,
    },
    {
      step: 5,
      id: 'castle',
      name: '5단계 · 성 (Castle) 최종 완성!',
      shortLabel: '👑 성(Castle) 완성',
      unlockDesc: '시장과 무역소에서 모은 세금으로 난공불락의 대성곽을 완공하여 하나의 나라를 완성합니다!',
      coinCost: 210,
      foodCost: 100,
      baseTaxPerCycle: 72,
      foodPerSec: 24.0,
      castleMaxHpBonus: 350,
      combatMultiplier: 2.25,
      autoGuardDamage: 58,
    },
  ],

  /**
   * 🛡️ 자신을 지키는 4대 기본 수비 시설 레지스트리 (세금 🪙으로 건설 및 최대 Lv.3 강화)
   * - 감시탑(Watchtower), 방어탑(Defense Tower), 울타리(Fence), 성벽(Castle Wall)
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
 * 무중단 라이브 패치(Zero-Downtime Hot Patch) 함수
 * - 플레이 도중 서버나 에디터에서 새로운 발전 단계(6단계 등)나 밸런스 수치를 전송받아도
 *   진행 중인 게임을 멈추지 않고 즉시 설정 레지스트리만 갱신합니다.
 */
export function hotPatchKingdomConfig(patchData) {
  if (!patchData || typeof patchData !== 'object') return KINGDOM_CONFIG;
  if (Array.isArray(patchData.settlementChain)) {
    KINGDOM_CONFIG.settlementChain = patchData.settlementChain;
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
 * 런타임 중 새로운 문명 단계(예: 6단계 대항구, 7단계 제국 수도)를 무한 증설하는 API
 */
export function registerSettlementStage(stageDef) {
  const existingIdx = KINGDOM_CONFIG.settlementChain.findIndex((s) => s.id === stageDef.id);
  if (existingIdx >= 0) {
    KINGDOM_CONFIG.settlementChain[existingIdx] = {
      ...KINGDOM_CONFIG.settlementChain[existingIdx],
      ...stageDef,
    };
  } else {
    KINGDOM_CONFIG.settlementChain.push({
      step: KINGDOM_CONFIG.settlementChain.length + 1,
      ...stageDef,
    });
  }
  return KINGDOM_CONFIG.settlementChain;
}

/**
 * 데이터 주도 설계(Data-Driven Architecture) 밸런스 및 건국 단계 설정 테이블
 * - 모든 수치(사냥 보상, 농사 수확량, 기술 발전 배율, 시장 세율, 성 축조 비용)를
 *   로직 코드와 완전히 분리하여 런타임 중 무중단 핫리로드(Hot-Patch)가 가능합니다.
 */
export const KINGDOM_CONFIG = {
  version: '1.0.0',

  // Phase 1: 숲 사냥 & 생존자 구출 설정
  hunting: {
    maxWildPreys: 4,
    respawnInterval: 7.5,
    preyHp: 45,
    foodReward: 18,
    coinReward: 10,
  },
  rescue: {
    maxActiveSurvivors: 3,
    respawnInterval: 9.0,
    rescueRadius: 2.6,
    foodBonusOnRescue: 10,
    maxCompanions: 6,
  },

  // Phase 2 & 3: 부락 & 농경지(밭·풍차) 레벨 테이블
  farms: [
    { level: 0, name: '미개간 공터', foodCost: 0, coinCost: 0, foodPerSec: 1.5 },
    { level: 1, name: '작은 텃밭 (부락 농경)', foodCost: 15, coinCost: 25, foodPerSec: 4.5 },
    { level: 2, name: '관개 밀밭 & 수로', foodCost: 35, coinCost: 45, foodPerSec: 9.0 },
    { level: 3, name: '대형 풍차 농장', foodCost: 65, coinCost: 75, foodPerSec: 16.0 },
    { level: 4, name: '왕실 대농장 단지', foodCost: 110, coinCost: 115, foodPerSec: 26.0 },
  ],

  // Phase 4: 기술 발전(Tech Tree) 테이블
  techs: [
    {
      level: 1,
      name: 'Lv.1 수렵·부락 기술',
      foodCost: 0,
      coinCost: 0,
      combatMult: 1.0,
      economyMult: 1.0,
    },
    {
      level: 2,
      name: 'Lv.2 철기 농경·목공술',
      foodCost: 30,
      coinCost: 40,
      combatMult: 1.28,
      economyMult: 1.35,
    },
    {
      level: 3,
      name: 'Lv.3 길드 상업·석공술',
      foodCost: 65,
      coinCost: 80,
      combatMult: 1.6,
      economyMult: 1.75,
    },
    {
      level: 4,
      name: 'Lv.4 왕립 학술·제국 공학',
      foodCost: 110,
      coinCost: 130,
      combatMult: 2.05,
      economyMult: 2.3,
    },
  ],

  // Phase 4 & 5: 시장(Market) & 세금(Tax) 창출 테이블
  markets: [
    { level: 0, name: '시장 없음', foodCost: 0, coinCost: 0, taxPerCycle: 2 },
    { level: 1, name: '부락 물물교환 장터', foodCost: 20, coinCost: 30, taxPerCycle: 8 },
    { level: 2, name: '상설 교역 시장', foodCost: 45, coinCost: 60, taxPerCycle: 16 },
    { level: 3, name: '왕국 대시장 (Grand Market)', foodCost: 80, coinCost: 95, taxPerCycle: 28 },
    { level: 4, name: '황금 무역 거래소', foodCost: 130, coinCost: 145, taxPerCycle: 45 },
  ],
  taxCycleSeconds: 3.5,

  // Phase 5: 세금으로 완성하는 성곽(Castle) 4단계 테이블
  castleTiers: [
    {
      tier: 1,
      name: 'Tier 1 · 작은 성채 (부락 거점)',
      coinCost: 0,
      foodCost: 0,
      maxHpBonus: 0,
      autoGuardDamage: 0,
    },
    {
      tier: 2,
      name: 'Tier 2 · 석조 내성 (농경 정착읍)',
      coinCost: 70,
      foodCost: 40,
      maxHpBonus: 70,
      autoGuardDamage: 16,
    },
    {
      tier: 3,
      name: 'Tier 3 · 4대 망루 요새 (상업 도시)',
      coinCost: 130,
      foodCost: 75,
      maxHpBonus: 160,
      autoGuardDamage: 30,
    },
    {
      tier: 4,
      name: 'Tier 4 · 왕국 대성곽 (하나의 나라 건국 완성!)',
      coinCost: 210,
      foodCost: 120,
      maxHpBonus: 320,
      autoGuardDamage: 52,
    },
  ],
};

// 무중단 실시간 밸런스 패치 함수 (게임 도중 호출해도 세션 중단 없이 즉시 수치만 교체)
export function hotPatchKingdomConfig(partialConfig) {
  Object.assign(KINGDOM_CONFIG, partialConfig);
  return KINGDOM_CONFIG;
}

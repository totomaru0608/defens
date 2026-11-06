// 기본 스테이지 데이터 및 사용자 커스텀 스테이지(에디터) 저장/불러오기 모듈

const STORAGE_KEY = 'coin_defense_stages_v2';

export const DEFAULT_STAGES = [
  {
    id: 1,
    name: '초록 들판의 관문',
    subtitle: 'STAGE 1 · 호수와 이정표가 있는 평원 가도',
    startCoins: 75,
    castleMaxHp: 100,
    groundColor: 0x62b644,
    groundAltColor: 0x56a63a,
    roadColor: 0xe9cf96,
    roadBorderColor: 0xc8ad73,
    pathPoints: [
      [-28, -15],
      [-18, -13],
      [-10, -4],
      [-14, 7],
      [-3, 12],
      [8, 4],
      [6, -8],
      [17, -9],
      [23, 3],
      [27, 13],
    ],
    buildPads: [
      { x: -16, z: -7, baseCost: 30 },
      { x: -6, z: 3, baseCost: 30 },
      { x: -18, z: 2, baseCost: 30 },
      { x: 1, z: 5, baseCost: 35 },
      { x: 13, z: -2, baseCost: 35 },
      { x: 16, z: 7, baseCost: 40 },
    ],
    // 다채로운 기본 지형물 배치 (산, 호수, 강, 이정표, 바위, 숲)
    props: [
      { type: 'mountain', x: -27, z: 14, scale: 1.35, rot: 0.3 },
      { type: 'mountain', x: 26, z: -15, scale: 1.45, rot: 1.1 },
      { type: 'mountain', x: -2, z: -16, scale: 1.15, rot: 2.2 },
      { type: 'lake', x: -24, z: 2, scale: 1.25, rot: 0.4 },
      { type: 'lake', x: 17, z: -15, scale: 1.1, rot: -0.5 },
      { type: 'river', x: -2, z: -4, scale: 1.2, rot: 0.45 },
      { type: 'signpost', x: -13, z: -10, scale: 1.1, rot: 0.6 },
      { type: 'signpost', x: 3, z: 9, scale: 1.1, rot: -0.4 },
      { type: 'signpost', x: 21, z: 7, scale: 1.1, rot: -0.8 },
      { type: 'rock', x: -8, z: -13, scale: 1.2, rot: 0.9 },
      { type: 'rock', x: 12, z: 12, scale: 1.3, rot: 1.7 },
      { type: 'forest', x: -23, z: -4, scale: 1.15, rot: 0.2 },
      { type: 'forest', x: 9, z: 13, scale: 1.2, rot: 1.4 },
      { type: 'forest', x: 25, z: -5, scale: 1.1, rot: 0.8 },
    ],
    waves: [
      {
        groups: [
          { type: 'imp', count: 8, interval: 1.0, delay: 0 },
          { type: 'raider', count: 6, interval: 1.3, delay: 4 },
        ],
      },
      {
        groups: [
          { type: 'imp', count: 12, interval: 0.75, delay: 0 },
          { type: 'raider', count: 8, interval: 1.1, delay: 3 },
          { type: 'brute', count: 3, interval: 2.5, delay: 6 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: '옛 성벽과 푸른 강 협곡',
    subtitle: 'STAGE 2 · 설산과 강줄기가 흐르는 요새 가도',
    startCoins: 90,
    castleMaxHp: 120,
    groundColor: 0x58b048,
    groundAltColor: 0x4b9d3d,
    roadColor: 0xead29c,
    roadBorderColor: 0xc5aa72,
    pathPoints: [
      [-29, 14],
      [-20, 13],
      [-16, -11],
      [-5, -13],
      [-2, 11],
      [9, 12],
      [12, -11],
      [22, -10],
      [26, 4],
      [28, 14],
    ],
    buildPads: [
      { x: -22, z: 2, baseCost: 30 },
      { x: -10, z: -6, baseCost: 30 },
      { x: -9, z: 4, baseCost: 35 },
      { x: 3, z: 4, baseCost: 35 },
      { x: 5, z: -6, baseCost: 35 },
      { x: 17, z: -3, baseCost: 40 },
      { x: 18, z: 7, baseCost: 40 },
    ],
    props: [
      { type: 'mountain', x: -27, z: -14, scale: 1.5, rot: 0.5 },
      { type: 'mountain', x: 3, z: -16, scale: 1.3, rot: 1.8 },
      { type: 'mountain', x: 27, z: -15, scale: 1.4, rot: 0.9 },
      { type: 'river', x: -10, z: 14, scale: 1.35, rot: 1.4 },
      { type: 'river', x: 16, z: 12, scale: 1.25, rot: -0.3 },
      { type: 'lake', x: -25, z: -5, scale: 1.3, rot: 0.2 },
      { type: 'lake', x: 3, z: 15, scale: 1.15, rot: 0.7 },
      { type: 'signpost', x: -19, z: 8, scale: 1.15, rot: 0.3 },
      { type: 'signpost', x: -1, z: 6, scale: 1.1, rot: -0.5 },
      { type: 'signpost', x: 22, z: -4, scale: 1.1, rot: 0.9 },
      { type: 'rock', x: -13, z: 14, scale: 1.3, rot: 0.4 },
      { type: 'rock', x: 19, z: -15, scale: 1.25, rot: 2.1 },
      { type: 'forest', x: -26, z: 5, scale: 1.2, rot: 0.6 },
      { type: 'forest', x: 28, z: -3, scale: 1.2, rot: 1.1 },
    ],
    waves: [
      {
        groups: [
          { type: 'raider', count: 10, interval: 0.95, delay: 0 },
          { type: 'imp', count: 12, interval: 0.65, delay: 3 },
        ],
      },
      {
        groups: [
          { type: 'imp', count: 15, interval: 0.6, delay: 0 },
          { type: 'brute', count: 4, interval: 2.2, delay: 2 },
          { type: 'sprinter', count: 8, interval: 0.9, delay: 5 },
        ],
      },
      {
        groups: [
          { type: 'raider', count: 14, interval: 0.75, delay: 0 },
          { type: 'brute', count: 6, interval: 1.9, delay: 3 },
          { type: 'sprinter', count: 10, interval: 0.7, delay: 6 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: '왕국 본성 최후의 결전',
    subtitle: 'STAGE 3 · 쌍둥이 호수와 설산 요새 결전',
    startCoins: 110,
    castleMaxHp: 140,
    groundColor: 0x52a842,
    groundAltColor: 0x459436,
    roadColor: 0xedd5a1,
    roadBorderColor: 0xc6a96e,
    pathPoints: [
      [-29, -15],
      [-22, 12],
      [-11, 14],
      [-9, -12],
      [2, -13],
      [4, 13],
      [15, 12],
      [17, -11],
      [26, -6],
      [28, 12],
    ],
    buildPads: [
      { x: -24, z: -1, baseCost: 30 },
      { x: -16, z: 6, baseCost: 30 },
      { x: -15, z: -4, baseCost: 35 },
      { x: -3, z: -6, baseCost: 35 },
      { x: -2, z: 5, baseCost: 35 },
      { x: 10, z: 5, baseCost: 40 },
      { x: 11, z: -5, baseCost: 40 },
      { x: 22, z: 2, baseCost: 45 },
    ],
    props: [
      { type: 'mountain', x: -28, z: 16, scale: 1.5, rot: 0.2 },
      { type: 'mountain', x: -18, z: -15, scale: 1.35, rot: 1.4 },
      { type: 'mountain', x: 9, z: -16, scale: 1.45, rot: 0.8 },
      { type: 'mountain', x: 27, z: -15, scale: 1.4, rot: 2.3 },
      { type: 'lake', x: -4, z: 15, scale: 1.25, rot: 0.3 },
      { type: 'lake', x: 22, z: -14, scale: 1.2, rot: -0.4 },
      { type: 'river', x: -16, z: -12, scale: 1.2, rot: 0.5 },
      { type: 'river', x: 10, z: -12, scale: 1.25, rot: -0.6 },
      { type: 'signpost', x: -25, z: -9, scale: 1.15, rot: 0.4 },
      { type: 'signpost', x: -6, z: 0, scale: 1.15, rot: -0.3 },
      { type: 'signpost', x: 19, z: -2, scale: 1.15, rot: 0.7 },
      { type: 'rock', x: -28, z: 3, scale: 1.3, rot: 1.0 },
      { type: 'rock', x: 9, z: 15, scale: 1.25, rot: 0.5 },
      { type: 'forest', x: -16, z: 15, scale: 1.2, rot: 0.9 },
      { type: 'forest', x: 26, z: 2, scale: 1.15, rot: 1.6 },
    ],
    waves: [
      {
        groups: [
          { type: 'imp', count: 16, interval: 0.55, delay: 0 },
          { type: 'raider', count: 10, interval: 0.85, delay: 2 },
          { type: 'brute', count: 4, interval: 2.0, delay: 4 },
        ],
      },
      {
        groups: [
          { type: 'sprinter', count: 14, interval: 0.65, delay: 0 },
          { type: 'brute', count: 7, interval: 1.7, delay: 2 },
          { type: 'raider', count: 14, interval: 0.7, delay: 5 },
        ],
      },
      {
        groups: [
          { type: 'imp', count: 20, interval: 0.45, delay: 0 },
          { type: 'brute', count: 8, interval: 1.6, delay: 2 },
          { type: 'boss', count: 1, interval: 4.0, delay: 5 },
          { type: 'sprinter', count: 12, interval: 0.65, delay: 7 },
        ],
      },
    ],
  },
];

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadStages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((st, i) => {
          st.id = i + 1;
          if (!Array.isArray(st.props)) st.props = [];
          if (!Array.isArray(st.buildPads)) st.buildPads = [];
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('저장된 스테이지 로드 실패, 기본값을 사용합니다.', e);
  }
  return cloneDeep(DEFAULT_STAGES);
}

export function saveStages(stagesList) {
  stagesList.forEach((st, i) => {
    st.id = i + 1;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stagesList));
  } catch (e) {
    console.warn('스테이지 저장 실패:', e);
  }
}

export function resetStagesToDefault() {
  localStorage.removeItem(STORAGE_KEY);
  return cloneDeep(DEFAULT_STAGES);
}

export function createNewStageTemplate(nextId) {
  return {
    id: nextId,
    name: `새로운 전장 #${nextId}`,
    subtitle: `STAGE ${nextId} · 사용자 정의 방어전`,
    startCoins: 80 + nextId * 10,
    castleMaxHp: 100 + nextId * 15,
    groundColor: 0x5cb346,
    groundAltColor: 0x4ea039,
    roadColor: 0xead29c,
    roadBorderColor: 0xc5aa72,
    pathPoints: [
      [-28, -12],
      [-15, -10],
      [-8, 8],
      [4, 10],
      [10, -8],
      [21, -6],
      [27, 11],
    ],
    buildPads: [
      { x: -16, z: -2, baseCost: 30 },
      { x: -2, z: 3, baseCost: 35 },
      { x: 4, z: -3, baseCost: 35 },
      { x: 16, z: 2, baseCost: 40 },
    ],
    props: [
      { type: 'mountain', x: -26, z: 13, scale: 1.4, rot: 0.4 },
      { type: 'mountain', x: 25, z: -14, scale: 1.35, rot: 1.2 },
      { type: 'lake', x: -18, z: 12, scale: 1.2, rot: 0.2 },
      { type: 'river', x: 14, z: 12, scale: 1.2, rot: 0.5 },
      { type: 'signpost', x: -11, z: -6, scale: 1.1, rot: 0.5 },
      { type: 'signpost', x: 18, z: -1, scale: 1.1, rot: -0.4 },
      { type: 'rock', x: -4, z: -12, scale: 1.25, rot: 0.8 },
      { type: 'forest', x: 2, z: 15, scale: 1.2, rot: 0.3 },
    ],
    waves: [
      {
        groups: [
          { type: 'imp', count: 10 + nextId * 2, interval: 0.8, delay: 0 },
          { type: 'raider', count: 8 + nextId * 2, interval: 1.0, delay: 3 },
        ],
      },
      {
        groups: [
          { type: 'sprinter', count: 8 + nextId * 2, interval: 0.75, delay: 0 },
          { type: 'brute', count: 3 + nextId, interval: 2.0, delay: 2 },
          { type: 'boss', count: nextId >= 3 ? 1 : 0, interval: 4.0, delay: 5 },
        ].filter((g) => g.count > 0),
      },
    ],
  };
}

export let STAGES = loadStages();

export function setStagesList(newList) {
  STAGES = newList;
  saveStages(STAGES);
}

export const PROP_CATALOG = {
  forest: { name: '숲/나무', emoji: '🌲' },
  rock: { name: '바위군', emoji: '🪨' },
  lake: { name: '호수', emoji: '💧' },
  river: { name: '강줄기', emoji: '🌊' },
  mountain: { name: '설산', emoji: '⛰️' },
  signpost: { name: '이정표', emoji: '🪧' },
};

export const TOWER_TYPES = {
  crossbow: {
    id: 'crossbow',
    name: '연사 석궁탑',
    emoji: '🏹',
    baseCost: 30,
    upgradeCosts: [40, 60],
    range: 9.5,
    fireRate: 0.42,
    damage: 20,
    color: 0xf59e0b,
  },
  cannon: {
    id: 'cannon',
    name: '화염 대포탑',
    emoji: '💣',
    baseCost: 45,
    upgradeCosts: [55, 80],
    range: 8.8,
    fireRate: 1.15,
    damage: 46,
    splashRadius: 3.4,
    color: 0xef4444,
  },
  frost: {
    id: 'frost',
    name: '빙결 수정탑',
    emoji: '❄️',
    baseCost: 40,
    upgradeCosts: [50, 70],
    range: 8.5,
    fireRate: 0.75,
    damage: 16,
    slowFactor: 0.48,
    slowDuration: 2.4,
    color: 0x38bdf8,
  },
};

export const ENEMY_TYPES = {
  imp: {
    name: '붉은 돌격병',
    hp: 52,
    speed: 4.3,
    coinReward: 7,
    castleDamage: 6,
    playerDamage: 5,
    scale: 0.78,
    bodyColor: 0xef4444,
    accentColor: 0xfca5a5,
  },
  raider: {
    name: '진홍 전사',
    hp: 95,
    speed: 3.5,
    coinReward: 11,
    castleDamage: 10,
    playerDamage: 9,
    scale: 0.98,
    bodyColor: 0xdc2626,
    accentColor: 0x991b1b,
  },
  sprinter: {
    name: '홍련 기습병',
    hp: 70,
    speed: 5.5,
    coinReward: 10,
    castleDamage: 8,
    playerDamage: 7,
    scale: 0.86,
    bodyColor: 0xf97316,
    accentColor: 0xdc2626,
  },
  brute: {
    name: '붉은 중장갑병',
    hp: 240,
    speed: 2.35,
    coinReward: 22,
    castleDamage: 18,
    playerDamage: 15,
    scale: 1.32,
    bodyColor: 0x991b1b,
    accentColor: 0x450a0a,
  },
  boss: {
    name: '붉은 군단 대장',
    hp: 1150,
    speed: 1.85,
    coinReward: 100,
    castleDamage: 45,
    playerDamage: 24,
    scale: 1.85,
    bodyColor: 0x7f1d1d,
    accentColor: 0xfbbf24,
    isBoss: true,
  },
};

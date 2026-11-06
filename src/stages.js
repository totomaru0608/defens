// 기본 6개 스테이지 데이터, 동물형 적(코끼리/하마/기린) 모션 설정 및 스테이지 에디터 저장 모듈

const STORAGE_KEY = 'coin_defense_stages_v5';

// ComfyUI 동물 모션 스튜디오에서 실시간으로 조절 가능한 동물별 동작 파라미터
export const ANIMAL_MOTION_CONFIG = {
  elephant: {
    strideSpeed: 9.0,
    legSwing: 0.55,
    specialAmp: 1.0, // 코 휘젓기 및 귀 펄럭임 강도
    scaleMult: 1.0,
    bodyColor: 0xb91c1c,
    accentColor: 0xfbbf24,
  },
  hippo: {
    strideSpeed: 11.5,
    legSwing: 0.62,
    specialAmp: 1.0, // 입 크게 벌렸다 다물기(Chomp) 강도
    scaleMult: 1.0,
    bodyColor: 0x9f1239,
    accentColor: 0xf43f5e,
  },
  giraffe: {
    strideSpeed: 13.5,
    legSwing: 0.72,
    specialAmp: 1.0, // 긴 목 앞뒤/좌우 흔들기 강도
    scaleMult: 1.0,
    bodyColor: 0xea580c,
    accentColor: 0xfef08a,
  },
};

export const DEFAULT_STAGES = [
  {
    id: 1,
    name: '초록 들판의 관문',
    subtitle: 'STAGE 1 · 기린·하마·코끼리 야수 군단 출현',
    startCoins: 80,
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
    props: [
      { type: 'mountain', x: -27, z: 14, scale: 1.35, rot: 0.3 },
      { type: 'mountain', x: 26, z: -15, scale: 1.45, rot: 1.1 },
      { type: 'mountain', x: -2, z: -16, scale: 1.15, rot: 2.2 },
      { type: 'lake', x: -24, z: 2, scale: 1.25, rot: 0.4 },
      { type: 'lake', x: 17, z: -15, scale: 1.1, rot: -0.5 },
      { type: 'river', x: -2, z: -4, scale: 1.2, rot: 0.45 },
      { type: 'signpost', x: -13, z: -10, scale: 1.15, rot: 0.6 },
      { type: 'signpost', x: 3, z: 9, scale: 1.15, rot: -0.4 },
      { type: 'signpost', x: 21, z: 7, scale: 1.15, rot: -0.8 },
      { type: 'rock', x: -8, z: -13, scale: 1.2, rot: 0.9 },
      { type: 'rock', x: 12, z: 12, scale: 1.3, rot: 1.7 },
      { type: 'forest', x: -23, z: -4, scale: 1.15, rot: 0.2 },
      { type: 'forest', x: 9, z: 13, scale: 1.2, rot: 1.4 },
      { type: 'forest', x: 25, z: -5, scale: 1.1, rot: 0.8 },
    ],
    waves: [
      {
        groups: [
          { type: 'imp', count: 5, interval: 1.0, delay: 0 },
          { type: 'giraffe', count: 4, interval: 1.6, delay: 1.0 },
          { type: 'hippo', count: 3, interval: 2.2, delay: 3.0 },
        ],
      },
      {
        groups: [
          { type: 'giraffe', count: 6, interval: 1.3, delay: 0 },
          { type: 'hippo', count: 4, interval: 1.9, delay: 2.0 },
          { type: 'elephant', count: 2, interval: 3.0, delay: 4.0 },
          { type: 'raider', count: 5, interval: 1.1, delay: 5.5 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: '옛 성벽과 푸른 강 협곡',
    subtitle: 'STAGE 2 · 하마 돌격대와 강줄기 요새',
    startCoins: 95,
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
      { type: 'signpost', x: -1, z: 6, scale: 1.15, rot: -0.5 },
      { type: 'signpost', x: 22, z: -4, scale: 1.15, rot: 0.9 },
      { type: 'rock', x: -13, z: 14, scale: 1.3, rot: 0.4 },
      { type: 'rock', x: 19, z: -15, scale: 1.25, rot: 2.1 },
      { type: 'forest', x: -26, z: 5, scale: 1.2, rot: 0.6 },
      { type: 'forest', x: 28, z: -3, scale: 1.2, rot: 1.1 },
    ],
    waves: [
      {
        groups: [
          { type: 'giraffe', count: 7, interval: 1.2, delay: 0 },
          { type: 'hippo', count: 5, interval: 1.8, delay: 2.0 },
        ],
      },
      {
        groups: [
          { type: 'imp', count: 10, interval: 0.7, delay: 0 },
          { type: 'hippo', count: 6, interval: 1.7, delay: 2.0 },
          { type: 'elephant', count: 3, interval: 2.8, delay: 4.5 },
        ],
      },
      {
        groups: [
          { type: 'giraffe', count: 10, interval: 0.95, delay: 0 },
          { type: 'elephant', count: 4, interval: 2.6, delay: 2.5 },
          { type: 'brute', count: 4, interval: 2.0, delay: 5.0 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: '바위산과 쌍둥이 호수',
    subtitle: 'STAGE 3 · 전투 코끼리와 호숫가 방어전',
    startCoins: 100,
    castleMaxHp: 130,
    groundColor: 0x54ad4a,
    groundAltColor: 0x47983d,
    roadColor: 0xecd49f,
    roadBorderColor: 0xc4a76d,
    pathPoints: [
      [-28, 0],
      [-19, -12],
      [-7, -11],
      [-5, 9],
      [6, 11],
      [8, -10],
      [19, -9],
      [21, 9],
      [28, 11],
    ],
    buildPads: [
      { x: -18, z: -3, baseCost: 30 },
      { x: -11, z: -4, baseCost: 30 },
      { x: -11, z: 5, baseCost: 35 },
      { x: 1, z: 3, baseCost: 35 },
      { x: 2, z: -6, baseCost: 35 },
      { x: 14, z: -2, baseCost: 40 },
      { x: 15, z: 6, baseCost: 40 },
    ],
    props: [
      { type: 'lake', x: -18, z: 11, scale: 1.45, rot: 0.2 },
      { type: 'lake', x: 14, z: -15, scale: 1.4, rot: -0.6 },
      { type: 'river', x: -1, z: 14, scale: 1.3, rot: 0.8 },
      { type: 'mountain', x: -27, z: -14, scale: 1.45, rot: 0.4 },
      { type: 'mountain', x: 27, z: -14, scale: 1.5, rot: 1.2 },
      { type: 'rock', x: -24, z: 9, scale: 1.4, rot: 0.5 },
      { type: 'rock', x: 0, z: -15, scale: 1.35, rot: 1.6 },
      { type: 'rock', x: 25, z: 0, scale: 1.3, rot: 2.2 },
      { type: 'signpost', x: -22, z: -5, scale: 1.15, rot: 0.5 },
      { type: 'signpost', x: 6, z: 5, scale: 1.15, rot: -0.4 },
      { type: 'signpost', x: 23, z: 5, scale: 1.15, rot: 0.7 },
      { type: 'forest', x: -8, z: 15, scale: 1.25, rot: 0.3 },
      { type: 'forest', x: 25, z: -7, scale: 1.2, rot: 1.1 },
    ],
    waves: [
      {
        groups: [
          { type: 'giraffe', count: 10, interval: 0.9, delay: 0 },
          { type: 'hippo', count: 6, interval: 1.6, delay: 2.0 },
        ],
      },
      {
        groups: [
          { type: 'hippo', count: 8, interval: 1.5, delay: 0 },
          { type: 'elephant', count: 4, interval: 2.5, delay: 2.5 },
        ],
      },
      {
        groups: [
          { type: 'giraffe', count: 12, interval: 0.8, delay: 0 },
          { type: 'elephant', count: 5, interval: 2.3, delay: 2.0 },
          { type: 'boss', count: 1, interval: 4.0, delay: 4.5 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: '설산 기슭의 고원 요새',
    subtitle: 'STAGE 4 · 만년설 산맥과 야수 대군단',
    startCoins: 110,
    castleMaxHp: 140,
    groundColor: 0x4ea346,
    groundAltColor: 0x418f3a,
    roadColor: 0xedd6a4,
    roadBorderColor: 0xc2a469,
    pathPoints: [
      [-29, -14],
      [-14, -14],
      [-20, 4],
      [-6, 13],
      [6, -12],
      [18, -12],
      [12, 8],
      [27, 13],
    ],
    buildPads: [
      { x: -21, z: -7, baseCost: 30 },
      { x: -11, z: -4, baseCost: 35 },
      { x: -13, z: 9, baseCost: 35 },
      { x: -1, z: 2, baseCost: 35 },
      { x: 6, z: -3, baseCost: 40 },
      { x: 18, z: -2, baseCost: 40 },
      { x: 19, z: 6, baseCost: 40 },
    ],
    props: [
      { type: 'mountain', x: -28, z: 14, scale: 1.6, rot: 0.3 },
      { type: 'mountain', x: -4, z: -15, scale: 1.5, rot: 1.1 },
      { type: 'mountain', x: 26, z: -14, scale: 1.55, rot: 1.9 },
      { type: 'mountain', x: 5, z: 15, scale: 1.4, rot: 2.5 },
      { type: 'river', x: -25, z: 2, scale: 1.3, rot: 0.2 },
      { type: 'river', x: 24, z: -1, scale: 1.3, rot: -0.35 },
      { type: 'lake', x: -6, z: -6, scale: 1.15, rot: 0.5 },
      { type: 'signpost', x: -16, z: -10, scale: 1.2, rot: 0.4 },
      { type: 'signpost', x: -4, z: 8, scale: 1.2, rot: -0.6 },
      { type: 'signpost', x: 14, z: -8, scale: 1.2, rot: 0.8 },
      { type: 'rock', x: -25, z: -5, scale: 1.35, rot: 0.7 },
      { type: 'rock', x: 14, z: 14, scale: 1.35, rot: 1.4 },
      { type: 'forest', x: -18, z: 14, scale: 1.25, rot: 0.5 },
      { type: 'forest', x: 27, z: 5, scale: 1.2, rot: 1.2 },
    ],
    waves: [
      {
        groups: [
          { type: 'giraffe', count: 12, interval: 0.75, delay: 0 },
          { type: 'hippo', count: 8, interval: 1.4, delay: 2.0 },
          { type: 'elephant', count: 4, interval: 2.3, delay: 3.5 },
        ],
      },
      {
        groups: [
          { type: 'sprinter', count: 14, interval: 0.6, delay: 0 },
          { type: 'elephant', count: 6, interval: 2.1, delay: 2.0 },
          { type: 'hippo', count: 8, interval: 1.3, delay: 4.5 },
        ],
      },
      {
        groups: [
          { type: 'giraffe', count: 14, interval: 0.65, delay: 0 },
          { type: 'elephant', count: 7, interval: 1.9, delay: 2.0 },
          { type: 'boss', count: 1, interval: 4.0, delay: 4.5 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: '붉은 협곡의 징검다리',
    subtitle: 'STAGE 5 · 굽이치는 강줄기와 코끼리 중장갑단',
    startCoins: 115,
    castleMaxHp: 145,
    groundColor: 0x56a83a,
    groundAltColor: 0x48922f,
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
          { type: 'giraffe', count: 14, interval: 0.65, delay: 0 },
          { type: 'hippo', count: 10, interval: 1.2, delay: 2.0 },
          { type: 'elephant', count: 5, interval: 2.1, delay: 4.0 },
        ],
      },
      {
        groups: [
          { type: 'hippo', count: 12, interval: 1.1, delay: 0 },
          { type: 'elephant', count: 8, interval: 1.8, delay: 2.0 },
          { type: 'giraffe', count: 14, interval: 0.65, delay: 4.5 },
        ],
      },
      {
        groups: [
          { type: 'elephant', count: 9, interval: 1.7, delay: 0 },
          { type: 'hippo', count: 12, interval: 1.1, delay: 2.0 },
          { type: 'boss', count: 1, interval: 5.0, delay: 4.5 },
        ],
      },
    ],
  },
  {
    id: 6,
    name: '황혼의 코끼리 대평원 (최종 결전)',
    subtitle: 'STAGE 6 · 야수 대군단과 쌍둥이 군단장 결전',
    startCoins: 135,
    castleMaxHp: 160,
    groundColor: 0x65a30d,
    groundAltColor: 0x4d7c0f,
    roadColor: 0xfef08a,
    roadBorderColor: 0xd97706,
    pathPoints: [
      [-29, 13],
      [-18, -14],
      [-6, 13],
      [5, -13],
      [16, 13],
      [24, -10],
      [28, 12],
    ],
    buildPads: [
      { x: -23, z: -2, baseCost: 30 },
      { x: -12, z: -1, baseCost: 30 },
      { x: -12, z: 8, baseCost: 35 },
      { x: -1, z: -1, baseCost: 35 },
      { x: 5, z: 7, baseCost: 35 },
      { x: 11, z: -2, baseCost: 40 },
      { x: 20, z: 2, baseCost: 40 },
      { x: 22, z: 10, baseCost: 45 },
    ],
    props: [
      { type: 'mountain', x: -27, z: -14, scale: 1.55, rot: 0.4 },
      { type: 'mountain', x: -5, z: -16, scale: 1.45, rot: 1.2 },
      { type: 'mountain', x: 16, z: -15, scale: 1.5, rot: 2.0 },
      { type: 'mountain', x: 28, z: -15, scale: 1.45, rot: 0.7 },
      { type: 'lake', x: -24, z: 14, scale: 1.35, rot: 0.3 },
      { type: 'lake', x: 4, z: 15, scale: 1.3, rot: -0.5 },
      { type: 'river', x: -16, z: 12, scale: 1.25, rot: 0.4 },
      { type: 'river', x: 12, z: -12, scale: 1.25, rot: -0.4 },
      { type: 'signpost', x: -20, z: 5, scale: 1.2, rot: 0.5 },
      { type: 'signpost', x: 0, z: 6, scale: 1.2, rot: -0.4 },
      { type: 'signpost', x: 18, z: -4, scale: 1.2, rot: 0.8 },
      { type: 'rock', x: -8, z: -12, scale: 1.35, rot: 0.9 },
      { type: 'rock', x: 26, z: 0, scale: 1.35, rot: 1.7 },
      { type: 'forest', x: -27, z: 5, scale: 1.25, rot: 0.6 },
      { type: 'forest', x: 10, z: 15, scale: 1.25, rot: 1.4 },
    ],
    waves: [
      {
        groups: [
          { type: 'giraffe', count: 16, interval: 0.6, delay: 0 },
          { type: 'hippo', count: 12, interval: 1.1, delay: 1.5 },
          { type: 'elephant', count: 6, interval: 1.9, delay: 3.5 },
        ],
      },
      {
        groups: [
          { type: 'hippo', count: 14, interval: 1.0, delay: 0 },
          { type: 'elephant', count: 9, interval: 1.7, delay: 2.0 },
          { type: 'giraffe', count: 16, interval: 0.6, delay: 4.0 },
        ],
      },
      {
        groups: [
          { type: 'elephant', count: 12, interval: 1.5, delay: 0 },
          { type: 'hippo', count: 14, interval: 1.0, delay: 2.0 },
          { type: 'boss', count: 2, interval: 5.5, delay: 4.0 },
          { type: 'giraffe', count: 18, interval: 0.5, delay: 6.0 },
        ],
      },
    ],
  },
];

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 새 스테이지 추가 시 스테이지 번호마다 고유한 지형 색상·길 경로·지형물·웨이브를 생성
export function createNewStageTemplate(nextId) {
  const palettes = [
    { ground: 0x5cb346, alt: 0x4ea039, road: 0xead29c, border: 0xc5aa72, theme: '푸른 고원' },
    { ground: 0x65a30d, alt: 0x4d7c0f, road: 0xfef08a, border: 0xd97706, theme: '황금 들녘' },
    { ground: 0x10b981, alt: 0x059669, road: 0xfde68a, border: 0xb45309, theme: '에메랄드 협곡' },
    { ground: 0x4ade80, alt: 0x22c55e, road: 0xfed7aa, border: 0xc2410c, theme: '바람의 분지' },
  ];
  const pal = palettes[nextId % palettes.length];
  const sign = nextId % 2 === 0 ? 1 : -1;

  return {
    id: nextId,
    name: `${pal.theme} 전장 #${nextId}`,
    subtitle: `STAGE ${nextId} · 야수 군단 공성전`,
    startCoins: 85 + nextId * 10,
    castleMaxHp: 110 + nextId * 15,
    groundColor: pal.ground,
    groundAltColor: pal.alt,
    roadColor: pal.road,
    roadBorderColor: pal.border,
    pathPoints: [
      [-28, -13 * sign],
      [-17, 12 * sign],
      [-6, -11 * sign],
      [5, 12 * sign],
      [16, -10 * sign],
      [27, 12 * sign],
    ],
    buildPads: [
      { x: -22, z: 0, baseCost: 30 },
      { x: -11, z: 2 * sign, baseCost: 30 },
      { x: -1, z: -2 * sign, baseCost: 35 },
      { x: 10, z: 2 * sign, baseCost: 35 },
      { x: 20, z: -1 * sign, baseCost: 40 },
      { x: 21, z: 7 * sign, baseCost: 40 },
    ],
    props: [
      { type: 'mountain', x: -26, z: 14 * sign, scale: 1.45, rot: 0.4 },
      { type: 'mountain', x: 25, z: -14 * sign, scale: 1.4, rot: 1.2 },
      { type: 'lake', x: -16, z: -13 * sign, scale: 1.3, rot: 0.2 },
      { type: 'river', x: 12, z: 13 * sign, scale: 1.25, rot: 0.5 },
      { type: 'signpost', x: -12, z: -5 * sign, scale: 1.15, rot: 0.5 },
      { type: 'signpost', x: 15, z: -3 * sign, scale: 1.15, rot: -0.4 },
      { type: 'rock', x: -3, z: 14 * sign, scale: 1.3, rot: 0.8 },
      { type: 'forest', x: 3, z: -14 * sign, scale: 1.25, rot: 0.3 },
    ],
    waves: [
      {
        groups: [
          { type: 'giraffe', count: 8 + nextId * 2, interval: 0.8, delay: 0 },
          { type: 'hippo', count: 5 + nextId, interval: 1.4, delay: 2.0 },
        ],
      },
      {
        groups: [
          { type: 'elephant', count: 3 + nextId, interval: 2.0, delay: 0 },
          { type: 'hippo', count: 6 + nextId, interval: 1.3, delay: 2.0 },
          { type: 'giraffe', count: 8 + nextId, interval: 0.75, delay: 4.0 },
        ],
      },
      {
        groups: [
          { type: 'elephant', count: 4 + nextId, interval: 1.8, delay: 0 },
          { type: 'boss', count: Math.max(1, Math.floor(nextId / 3)), interval: 5.0, delay: 3.0 },
        ],
      },
    ],
  };
}

export function loadStages() {
  try {
    // 이전 버전(v2, v3, v4) 또는 현재(v5)에 사용자가 추가해둔 스테이지가 있으면 보존 및 마이그레이션
    const keysToTry = [
      STORAGE_KEY,
      'coin_defense_stages_v4',
      'coin_defense_stages_v3',
      'coin_defense_stages_v2',
    ];
    for (const key of keysToTry) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 만약 기본 스테이지만 있고 6스테이지 미만이면 기본 6스테이지로 보강
        while (parsed.length < DEFAULT_STAGES.length) {
          parsed.push(cloneDeep(DEFAULT_STAGES[parsed.length]));
        }
        parsed.forEach((st, i) => {
          st.id = i + 1;
          if (!Array.isArray(st.props) || st.props.length === 0) {
            st.props = cloneDeep(
              (DEFAULT_STAGES[i] || createNewStageTemplate(i + 1)).props
            );
          }
          if (!Array.isArray(st.buildPads) || st.buildPads.length === 0) {
            st.buildPads = cloneDeep(
              (DEFAULT_STAGES[i] || createNewStageTemplate(i + 1)).buildPads
            );
          }
          if (!Array.isArray(st.waves) || st.waves.length === 0) {
            st.waves = cloneDeep(
              (DEFAULT_STAGES[i] || createNewStageTemplate(i + 1)).waves
            );
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
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
  localStorage.removeItem('coin_defense_stages_v4');
  localStorage.removeItem('coin_defense_stages_v3');
  localStorage.removeItem('coin_defense_stages_v2');
  return cloneDeep(DEFAULT_STAGES);
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

// 에디터용 맵 지형 색상 테마 프리셋
export const MAP_THEME_PRESETS = {
  meadow: {
    name: '🌿 초록 들판',
    groundColor: 0x5cb346,
    groundAltColor: 0x4ea039,
    roadColor: 0xead29c,
    roadBorderColor: 0xc5aa72,
  },
  savanna: {
    name: '🌾 황혼 대평원',
    groundColor: 0x65a30d,
    groundAltColor: 0x4d7c0f,
    roadColor: 0xfef08a,
    roadBorderColor: 0xd97706,
  },
  emerald: {
    name: '💎 에메랄드 고원',
    groundColor: 0x10b981,
    groundAltColor: 0x059669,
    roadColor: 0xfde68a,
    roadBorderColor: 0xb45309,
  },
  canyon: {
    name: '🏜️ 사막 협곡',
    groundColor: 0xd97706,
    groundAltColor: 0xb45309,
    roadColor: 0xfef3c7,
    roadBorderColor: 0x92400e,
  },
  snow: {
    name: '❄️ 만년설 요새',
    groundColor: 0x93c5fd,
    groundAltColor: 0x60a5fa,
    roadColor: 0xf1f5f9,
    roadBorderColor: 0x64748b,
  },
  volcanic: {
    name: '🌋 암흑 화산지대',
    groundColor: 0x3f6212,
    groundAltColor: 0x365314,
    roadColor: 0xfdba74,
    roadBorderColor: 0x9a3412,
  },
};

// 에디터용 모래길 경로(pathPoints) 프리셋
export const ROAD_PATH_PRESETS = {
  s_curve: {
    name: '🐍 S자 굽잇길',
    points: [
      [-28, -11],
      [-16, -9],
      [-9, 6],
      [2, 8],
      [10, -6],
      [19, -5],
      [26, 8],
    ],
  },
  zigzag: {
    name: '⚡ 지그재그 협곡길',
    points: [
      [-29, 12],
      [-18, 11],
      [-12, -10],
      [-1, -11],
      [4, 10],
      [16, 11],
      [21, -7],
      [27, -5],
    ],
  },
  double_loop: {
    name: '🌀 이중 루프 평원길',
    points: [
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
  },
  serpentine: {
    name: '🐉 6단 구불길',
    points: [
      [-29, 13],
      [-18, -14],
      [-6, 13],
      [5, -13],
      [16, 13],
      [24, -10],
      [28, 12],
    ],
  },
  grand_arch: {
    name: '🌈 대형 아치 우회길',
    points: [
      [-28, 12],
      [-19, -12],
      [-5, -14],
      [9, -14],
      [20, -9],
      [27, 11],
    ],
  },
  blitz: {
    name: '🏹 대각선 급습길',
    points: [
      [-28, -12],
      [-14, -5],
      [0, 2],
      [14, -4],
      [27, 10],
    ],
  },
};

// 랜덤 구불길 자동 생성 헬퍼
export function generateRandomRoadPath() {
  const numPts = 6 + Math.floor(Math.random() * 3); // 6~8점
  const pts = [];
  const startSign = Math.random() > 0.5 ? 1 : -1;
  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const x = Math.round((-28 + t * 56) * 10) / 10;
    const alt = (i % 2 === 0 ? 1 : -1) * startSign;
    const zMag = 7 + Math.round(Math.random() * 7);
    const z = Math.max(-15, Math.min(15, alt * zMag));
    pts.push([x, z]);
  }
  return pts;
}

// 현재 길 경로(pathPoints) 주변에 건설 구역(buildPads) 자동 배치 헬퍼
export function generateAutoPadsForPath(pathPoints, count = 6) {
  if (!Array.isArray(pathPoints) || pathPoints.length < 2) return [];
  const pads = [];
  const innerCount = Math.min(count, Math.max(4, pathPoints.length));
  for (let i = 0; i < innerCount; i++) {
    const t = (i + 0.6) / innerCount;
    const fIdx = t * (pathPoints.length - 1);
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(pathPoints.length - 1, i0 + 1);
    const frac = fIdx - i0;
    const p0 = pathPoints[i0];
    const p1 = pathPoints[i1];
    const mx = p0[0] + (p1[0] - p0[0]) * frac;
    const mz = p0[1] + (p1[1] - p0[1]) * frac;
    const dx = p1[0] - p0[0];
    const dz = p1[1] - p0[1];
    const len = Math.hypot(dx, dz) || 1;
    const side = i % 2 === 0 ? 1 : -1;
    const nx = (-dz / len) * 5.2 * side;
    const nz = (dx / len) * 5.2 * side;
    const px = Math.round(Math.max(-26, Math.min(24, mx + nx)) * 10) / 10;
    const pz = Math.round(Math.max(-15, Math.min(15, mz + nz)) * 10) / 10;
    pads.push({
      x: px,
      z: pz,
      baseCost: i < 2 ? 30 : i < 4 ? 35 : 40,
    });
  }
  return pads;
}

export const TOWER_TYPES = {
  crossbow: {
    id: 'crossbow',
    name: '감시탑 (망루)',
    emoji: '🔭',
    baseCost: 30,
    upgradeCosts: [40, 55],
    range: 11.2,
    fireRate: 0.38,
    damage: 20,
    color: 0xf59e0b,
  },
  cannon: {
    id: 'cannon',
    name: '방어탑 (화포탑)',
    emoji: '🏹',
    baseCost: 45,
    upgradeCosts: [55, 80],
    range: 9.2,
    fireRate: 1.0,
    damage: 48,
    splashRadius: 3.4,
    color: 0xef4444,
  },
  frost: {
    id: 'frost',
    name: '울타리 (목책진)',
    emoji: '🪵',
    baseCost: 25,
    upgradeCosts: [35, 50],
    range: 8.5,
    fireRate: 0.65,
    damage: 16,
    slowFactor: 0.42,
    slowDuration: 2.6,
    color: 0xa16207,
  },
  wall: {
    id: 'wall',
    name: '성벽 (석조보루)',
    emoji: '🧱',
    baseCost: 55,
    upgradeCosts: [70, 95],
    range: 9.8,
    fireRate: 0.82,
    damage: 38,
    splashRadius: 2.9,
    slowFactor: 0.55,
    slowDuration: 1.8,
    color: 0x64748b,
  },
};

export const ENEMY_TYPES = {
  giraffe: {
    name: '홍련 기린',
    emoji: '🦒',
    isAnimal: true,
    animalType: 'giraffe',
    hp: 95,
    speed: 4.8,
    coinReward: 12,
    castleDamage: 10,
    playerDamage: 8,
    scale: 1.05,
    bodyColor: 0xea580c,
    accentColor: 0xfef08a,
  },
  hippo: {
    name: '진홍 강철하마',
    emoji: '🦛',
    isAnimal: true,
    animalType: 'hippo',
    hp: 190,
    speed: 3.1,
    coinReward: 18,
    castleDamage: 15,
    playerDamage: 13,
    scale: 1.12,
    bodyColor: 0x9f1239,
    accentColor: 0xf43f5e,
  },
  elephant: {
    name: '붉은 전투코끼리',
    emoji: '🐘',
    isAnimal: true,
    animalType: 'elephant',
    hp: 360,
    speed: 2.25,
    coinReward: 30,
    castleDamage: 24,
    playerDamage: 19,
    scale: 1.28,
    bodyColor: 0xb91c1c,
    accentColor: 0xfbbf24,
  },
  imp: {
    name: '붉은 돌격병',
    emoji: '👹',
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
    emoji: '⚔️',
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
    emoji: '🔥',
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
    emoji: '🛡️',
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
    emoji: '👑',
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

import * as THREE from 'three';
import {
  STAGES,
  TOWER_TYPES,
  ENEMY_TYPES,
  PROP_CATALOG,
  MAP_THEME_PRESETS,
  ROAD_PATH_PRESETS,
  ANIMAL_MOTION_CONFIG,
  saveStages,
  setStagesList,
  resetStagesToDefault,
  createNewStageTemplate,
  generateRandomRoadPath,
  generateAutoPadsForPath,
} from './stages.js';
import { buildStageWorld, createTerrainPropMesh, MAP_BOUNDS } from './world.js';
import {
  PlayerHero,
  BuildPad,
  RedEnemy,
  DroppedCoin,
  TowerProjectile,
  buildAnimalRig,
  animateAnimalRig,
} from './entities.js';
import { sfx } from './audio.js';
import { eventBus } from './core/eventBus.js';
import {
  saveLiveSessionSnapshot,
  loadLiveSessionSnapshot,
  clearLiveSessionSnapshot,
  applyZeroDowntimeWorldPatch,
} from './core/liveReloadGuard.js';
import { KingdomDomainManager } from './domains/kingdomDomain.js';
import { MultiplayerNetworkManager } from './network/multiplayerClient.js';
import { KINGDOM_CONFIG } from './data/kingdomConfig.js';

// DOM 참조
const viewportEl = document.getElementById('game-viewport');
const canvasEl = document.getElementById('game-canvas');
const worldLabelsEl = document.getElementById('world-labels');

const stageSelectEl = document.getElementById('stage-select');
const waveTextEl = document.getElementById('wave-text');
const enemyCountTextEl = document.getElementById('enemy-count-text');
const waveProgressFillEl = document.getElementById('wave-progress-fill');

const castleHpTextEl = document.getElementById('castle-hp-text');
const castleHpFillEl = document.getElementById('castle-hp-fill');
const playerHpTextEl = document.getElementById('player-hp-text');
const playerHpFillEl = document.getElementById('player-hp-fill');
const coinCountEl = document.getElementById('coin-count');

const kdStageBadgeEl = document.getElementById('kd-stage-badge');
const kdEconTextEl = document.getElementById('kd-econ-text');
const kdAdvanceBtnEl = document.getElementById('btn-kd-advance');
const kdNextTitleEl = document.getElementById('kd-next-title');
const kdNextCostEl = document.getElementById('kd-next-cost');

const facHouseBtnEl = document.getElementById('btn-fac-house');
const facHouseTitleEl = document.getElementById('fac-house-title');
const facHouseCostEl = document.getElementById('fac-house-cost');

const facFarmBtnEl = document.getElementById('btn-fac-farm');
const facFarmTitleEl = document.getElementById('fac-farm-title');
const facFarmCostEl = document.getElementById('fac-farm-cost');

const facFisheryBtnEl = document.getElementById('btn-fac-fishery');
const facFisheryTitleEl = document.getElementById('fac-fishery-title');
const facFisheryCostEl = document.getElementById('fac-fishery-cost');

const liveExpandBtnEl = document.getElementById('btn-live-expand');

const centerBannerEl = document.getElementById('center-banner');
const bannerSubEl = document.getElementById('banner-subtitle');
const bannerTitleEl = document.getElementById('banner-title');

const combatDockEl = document.getElementById('combat-dock');
const editorDockEl = document.getElementById('editor-dock');
const editorTopbarEl = document.getElementById('editor-topbar');
const editorBtnEl = document.getElementById('btn-editor');
const comfyBtnEl = document.getElementById('btn-comfy');

// ComfyUI 동물 모션 노드 스튜디오 DOM
const comfyOverlayEl = document.getElementById('comfy-overlay');
const comfyPreviewCanvas = document.getElementById('comfy-preview-canvas');
const comfyPreviewCaption = document.getElementById('comfy-preview-caption');
const comfyCloseBtn = document.getElementById('btn-comfy-close');
const comfySpawnBtn = document.getElementById('btn-comfy-spawn');
const comfyExportBtn = document.getElementById('btn-comfy-export');
const comfyStatusText = document.getElementById('comfy-status-text');

const inpStrideSpeed = document.getElementById('inp-stride-speed');
const valStrideSpeed = document.getElementById('val-stride-speed');
const inpLegSwing = document.getElementById('inp-leg-swing');
const valLegSwing = document.getElementById('val-leg-swing');
const inpSpecialAmp = document.getElementById('inp-special-amp');
const valSpecialAmp = document.getElementById('val-special-amp');
const lblSpecialAmp = document.getElementById('lbl-special-amp');
const inpScaleMult = document.getElementById('inp-scale-mult');
const valScaleMult = document.getElementById('val-scale-mult');

const edStageNameInput = document.getElementById('ed-stage-name');
const edStartCoinsInput = document.getElementById('ed-start-coins');
const edCastleHpInput = document.getElementById('ed-castle-hp');
const edMapWaveBtn = document.getElementById('btn-ed-map-wave');
const edAddStageBtn = document.getElementById('btn-ed-add-stage');
const edDelStageBtn = document.getElementById('btn-ed-del-stage');
const edResetAllBtn = document.getElementById('btn-ed-reset-all');
const edPlayBtn = document.getElementById('btn-ed-play');

// 스테이지 맵(테마·경로) & 적 웨이브 상세 에디터 DOM
const mapWaveOverlayEl = document.getElementById('map-wave-overlay');
const mwHeaderTitleEl = document.getElementById('mw-header-title');
const mwApplyPlayBtn = document.getElementById('btn-mw-apply-play');
const mwCloseBtn = document.getElementById('btn-mw-close');
const mwThemePresetsEl = document.getElementById('mw-theme-presets');
const mwRoadPresetsEl = document.getElementById('mw-road-presets');
const mwColGround = document.getElementById('mw-col-ground');
const mwColAlt = document.getElementById('mw-col-alt');
const mwColRoad = document.getElementById('mw-col-road');
const mwColBorder = document.getElementById('mw-col-border');
const mwRandomRoadBtn = document.getElementById('btn-mw-random-road');
const mwReverseRoadBtn = document.getElementById('btn-mw-reverse-road');
const mwAutoPadsBtn = document.getElementById('btn-mw-auto-pads');
const mwAddWpBtn = document.getElementById('btn-mw-add-wp');
const mwWaypointListEl = document.getElementById('mw-waypoint-list');
const mwWaveSummaryEl = document.getElementById('mw-wave-summary');
const mwAddWaveBtn = document.getElementById('btn-mw-add-wave');
const mwWavesListEl = document.getElementById('mw-waves-list');

const edScaleBtn = document.getElementById('btn-ed-scale');
const edRotateBtn = document.getElementById('btn-ed-rotate');
const edClearPropsBtn = document.getElementById('btn-ed-clear-props');

const skillBtnEl = document.getElementById('btn-skill');
const skillStatusEl = document.getElementById('skill-status');
const soundBtnEl = document.getElementById('btn-sound');
const restartBtnEl = document.getElementById('btn-restart');

const modalOverlayEl = document.getElementById('modal-overlay');
const modalBadgeEl = document.getElementById('modal-badge');
const modalTitleEl = document.getElementById('modal-title');
const modalDescEl = document.getElementById('modal-desc');
const modalActionBtn = document.getElementById('btn-modal-action');

// Three.js 렌더러 & 씬 & 아이소메트릭 카메라 초기화
const renderer = new THREE.WebGLRenderer({
  canvas: canvasEl,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7dd3fc);
scene.fog = new THREE.FogExp2(0x7dd3fc, 0.006);

const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 190);
const PLAY_CAMERA_OFFSET = new THREE.Vector3(0, 32, 24);
const EDITOR_CAMERA_OFFSET = new THREE.Vector3(0, 46, 26);
const cameraFocus = new THREE.Vector3(0, 0, 0);

// 조명 구성
const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x3f6212, 0.95);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
dirLight.position.set(22, 42, 26);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 5;
dirLight.shadow.camera.far = 120;
const d = 40;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// 레이캐스터 및 마우스 상태
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
const currentGroundHit = new THREE.Vector3(0, 0, 0);
let hasMouseMoved = false;

// 에디터 브러시 상태
const SCALE_PRESETS = [0.85, 1.2, 1.55];
const editorState = {
  brush: 'forest',
  scaleIdx: 1,
  rotation: 0,
  previewGroup: new THREE.Group(),
  waypointMarkersGroup: new THREE.Group(),
  mapWaveOpen: false,
};
scene.add(editorState.previewGroup);
scene.add(editorState.waypointMarkersGroup);

// 게임 상태 관리
const state = {
  mode: 'intro', // 'intro' | 'playing' | 'stage_clear' | 'victory' | 'defeat'
  editorOpen: false,
  stageIndex: 0,
  coins: 80,
  castleHp: 100,
  castleMaxHp: 100,
  selectedTower: 'crossbow',
  waveIndex: 0,
  waveTimer: 0,
  spawnQueue: [],
  totalStageEnemies: 0,
  defeatedStageEnemies: 0,
  world: null,
  player: null,
  pads: [],
  padLabels: [],
  enemies: [],
  coinsList: [],
  projectiles: [],
  effects: [],
};

// 🏛️ 도메인 분리 모듈 인스턴스: 건국 문명 도메인 & 실시간 멀티플레이어 네트워크
const kingdomDomain = new KingdomDomainManager(scene);
const mpNetwork = new MultiplayerNetworkManager(scene, worldLabelsEl);
let liveSessionSaveTimer = 0;

eventBus.on('mp:kingdom_sync', (remoteSnap) => {
  kingdomDomain.applySnapshot(remoteSnap);
  updateHud();
});

eventBus.on('mp:world_patch', (patchPayload) => {
  applyZeroDowntimeWorldPatch(patchPayload);
  showBanner('⚡ 실시간 월드 무중단 패치 반영', '진행 중인 게임을 중단하지 않고 새로운 세계관 설정이 적용되었습니다!', 2200);
  updateHud();
});

// ==========================================================
// ComfyUI 3D 동물 리깅 & 모션 스튜디오 전용 미니 3D 프리뷰어
// ==========================================================
const comfyStudio = {
  isOpen: false,
  selectedAnimal: 'elephant',
  renderer: null,
  scene: null,
  camera: null,
  rig: null,
  turntable: null,
};

function initComfyPreviewRenderer() {
  if (comfyStudio.renderer) return;
  comfyStudio.renderer = new THREE.WebGLRenderer({
    canvas: comfyPreviewCanvas,
    antialias: true,
    alpha: true,
  });
  comfyStudio.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  comfyStudio.scene = new THREE.Scene();
  comfyStudio.camera = new THREE.PerspectiveCamera(38, 16 / 10, 0.1, 50);
  comfyStudio.camera.position.set(2.8, 2.3, 3.6);
  comfyStudio.camera.lookAt(0, 1.0, 0);

  const amb = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
  comfyStudio.scene.add(amb);
  const dLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
  dLight.position.set(4, 7, 5);
  comfyStudio.scene.add(dLight);

  // 프리뷰 바닥 그리드 원판
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.55, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155, flatShading: true })
  );
  pedestal.position.y = -0.06;
  comfyStudio.scene.add(pedestal);

  comfyStudio.turntable = new THREE.Group();
  comfyStudio.scene.add(comfyStudio.turntable);

  rebuildComfyPreviewAnimal();
}

function rebuildComfyPreviewAnimal() {
  if (!comfyStudio.turntable) return;
  while (comfyStudio.turntable.children.length > 0) {
    comfyStudio.turntable.remove(comfyStudio.turntable.children[0]);
  }
  const aType = comfyStudio.selectedAnimal;
  const cfg = ANIMAL_MOTION_CONFIG[aType];
  comfyStudio.rig = buildAnimalRig(aType, cfg.bodyColor, cfg.accentColor);
  const s = (aType === 'giraffe' ? 0.78 : 0.95) * cfg.scaleMult;
  comfyStudio.rig.root.scale.set(s, s, s);
  comfyStudio.turntable.add(comfyStudio.rig.root);

  const captions = {
    elephant: '🐘 붉은 전투코끼리 (코 휘젓기 + 귀 펄럭임 + 4족 보행)',
    hippo: '🦛 진홍 강철하마 (아래턱 와구와구 개폐 + 4족 돌격)',
    giraffe: '🦒 홍련 기린 (긴 목 리듬 스웨이 + 4족 장거리 질주)',
  };
  const specialLabels = {
    elephant: 'trunk_ear_motion (코/귀 동작 강도)',
    hippo: 'jaw_chomp_amp (하마 입 벌리기 강도)',
    giraffe: 'neck_sway_amp (기린 긴 목 흔들기 강도)',
  };

  comfyPreviewCaption.textContent = captions[aType];
  lblSpecialAmp.textContent = specialLabels[aType];

  inpStrideSpeed.value = String(cfg.strideSpeed);
  valStrideSpeed.textContent = cfg.strideSpeed.toFixed(1);

  inpLegSwing.value = String(cfg.legSwing);
  valLegSwing.textContent = cfg.legSwing.toFixed(2);

  inpSpecialAmp.value = String(cfg.specialAmp);
  valSpecialAmp.textContent = cfg.specialAmp.toFixed(1);

  inpScaleMult.value = String(cfg.scaleMult);
  valScaleMult.textContent = `${cfg.scaleMult.toFixed(2)}x`;
}

function toggleComfyStudio(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !comfyStudio.isOpen;
  comfyStudio.isOpen = next;
  comfyOverlayEl.classList.toggle('hidden', !next);
  comfyBtnEl.classList.toggle('active', next);

  if (next) {
    if (state.mode === 'intro') {
      modalOverlayEl.classList.add('hidden');
      state.mode = 'playing';
    }
    initComfyPreviewRenderer();
    const box = comfyPreviewCanvas.parentElement.getBoundingClientRect();
    comfyStudio.renderer.setSize(Math.max(200, box.width), Math.max(115, box.height), false);
    comfyStudio.camera.aspect = Math.max(200, box.width) / Math.max(115, box.height);
    comfyStudio.camera.updateProjectionMatrix();
    rebuildComfyPreviewAnimal();
  }
}

comfyBtnEl.addEventListener('click', () => toggleComfyStudio());
comfyCloseBtn.addEventListener('click', () => toggleComfyStudio(false));

document.querySelectorAll('.animal-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    comfyStudio.selectedAnimal = tab.dataset.animal;
    document.querySelectorAll('.animal-tab').forEach((t) => t.classList.toggle('active', t === tab));
    rebuildComfyPreviewAnimal();
  });
});

function onComfySliderChange() {
  const aType = comfyStudio.selectedAnimal;
  const cfg = ANIMAL_MOTION_CONFIG[aType];
  cfg.strideSpeed = parseFloat(inpStrideSpeed.value);
  cfg.legSwing = parseFloat(inpLegSwing.value);
  cfg.specialAmp = parseFloat(inpSpecialAmp.value);
  cfg.scaleMult = parseFloat(inpScaleMult.value);

  valStrideSpeed.textContent = cfg.strideSpeed.toFixed(1);
  valLegSwing.textContent = cfg.legSwing.toFixed(2);
  valSpecialAmp.textContent = cfg.specialAmp.toFixed(1);
  valScaleMult.textContent = `${cfg.scaleMult.toFixed(2)}x`;

  if (comfyStudio.rig) {
    const s = (aType === 'giraffe' ? 0.78 : 0.95) * cfg.scaleMult;
    comfyStudio.rig.root.scale.set(s, s, s);
  }
  comfyStatusText.textContent = `${aType.toUpperCase()} 모션 파라미터 반영됨 ✓`;
}

inpStrideSpeed.addEventListener('input', onComfySliderChange);
inpLegSwing.addEventListener('input', onComfySliderChange);
inpSpecialAmp.addEventListener('input', onComfySliderChange);
inpScaleMult.addEventListener('input', onComfySliderChange);

// 전장에 동물 적 즉시 소환 헬퍼
function spawnAnimalIntoStage(animalType, count = 2) {
  if (!state.world) return;
  if (state.mode !== 'playing') {
    modalOverlayEl.classList.add('hidden');
    loadStage(state.stageIndex, state.editorOpen);
  }
  const stageMult = 1 + state.stageIndex * 0.22;
  for (let i = 0; i < count; i++) {
    const enemy = new RedEnemy(scene, animalType, state.world.roadCurve, stageMult);
    enemy.progress = i * 0.025;
    state.enemies.push(enemy);
    state.totalStageEnemies += 1;
  }
  sfx.playTowerBuilt();
  const names = { elephant: '🐘 붉은 전투코끼리', hippo: '🦛 진홍 강철하마', giraffe: '🦒 홍련 기린' };
  showBanner('⚡ ComfyUI 모션 유닛 투입!', `${names[animalType]} ${count}마리가 길 위로 출격합니다!`, 1800);
  updateHud();
}

comfySpawnBtn.addEventListener('click', () => {
  spawnAnimalIntoStage(comfyStudio.selectedAnimal, 2);
  toggleComfyStudio(false);
});

document.querySelectorAll('.quick-spawn-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const aType = btn.dataset.spawn;
    spawnAnimalIntoStage(aType, 1);
    comfyStatusText.textContent = `${aType} 1마리 전장 투입 완료!`;
  });
});

// ComfyUI Workflow JSON 내보내기
comfyExportBtn.addEventListener('click', () => {
  const workflowData = {
    workflow_name: 'coin_defense_3d_animal_motion_workflow',
    created_with: 'Coin Defense ComfyUI 3D Animal Studio',
    animal_motion_configs: ANIMAL_MOTION_CONFIG,
    comfyui_nodes_url: './comfyui_animal_enemies_workflow.json',
  };
  const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'comfyui_animal_motion_workflow.json';
  a.click();
  URL.revokeObjectURL(url);
  comfyStatusText.textContent = 'Workflow JSON 다운로드 완료 ✓';
});

// 반응형 리사이즈 처리 (16:9 뷰포트 기준)
function handleResize() {
  const rect = viewportEl.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(180, Math.round(rect.height));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', handleResize);
new ResizeObserver(handleResize).observe(viewportEl);
handleResize();

// 중앙 알림 배너 표시
let bannerTimeout = null;
function showBanner(subtitle, title, duration = 1800) {
  bannerSubEl.textContent = subtitle;
  bannerTitleEl.textContent = title;
  centerBannerEl.classList.remove('hidden');
  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    centerBannerEl.classList.add('hidden');
  }, duration);
}

// 3D 월드 좌표를 2D 화면 좌표(px)로 변환
function worldToScreen(vec3) {
  const projected = vec3.clone().project(camera);
  const rect = viewportEl.getBoundingClientRect();
  return {
    x: (projected.x * 0.5 + 0.5) * rect.width,
    y: (-projected.y * 0.5 + 0.5) * rect.height,
    visible: projected.z < 1,
  };
}

// 플로팅 텍스트 이펙트 생성
function spawnFloatingText(worldPos, text, color = '#fef08a') {
  const screen = worldToScreen(worldPos);
  if (!screen.visible) return;
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.left = `${screen.x}px`;
  el.style.top = `${screen.y}px`;
  el.style.color = color;
  worldLabelsEl.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// 3D 원형 충격파/베기 시각 이펙트 생성
function spawnRingEffect(pos, maxRadius, color = 0xfde047, duration = 0.28) {
  const geo = new THREE.RingGeometry(0.2, 0.55, 28);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos.x, 0.18, pos.z);
  scene.add(mesh);

  state.effects.push({
    mesh,
    age: 0,
    duration,
    maxRadius,
    update(dt) {
      this.age += dt;
      const t = Math.min(1, this.age / this.duration);
      const scale = 1 + t * (this.maxRadius * 1.85);
      this.mesh.scale.set(scale, 1, scale);
      this.mesh.material.opacity = 0.9 * (1 - t);
      return this.age >= this.duration;
    },
  });
}

// 플레이어에서 건설 구역으로 날아가는 코인 연출
function spawnCoinFeedArc(fromPos, toPos) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 8), mat);
  mesh.rotation.z = Math.PI / 2;
  scene.add(mesh);

  const start = fromPos.clone().setY(1.2);
  const end = toPos.clone().setY(1.3);

  state.effects.push({
    mesh,
    age: 0,
    duration: 0.22,
    update(dt) {
      this.age += dt;
      const t = Math.min(1, this.age / this.duration);
      this.mesh.position.lerpVectors(start, end, t);
      this.mesh.position.y += Math.sin(t * Math.PI) * 1.4;
      this.mesh.rotation.y += dt * 12;
      return this.age >= this.duration;
    },
  });
}

// 스테이지 선택 드롭다운 갱신
function refreshStageSelectUI() {
  stageSelectEl.innerHTML = '';
  STAGES.forEach((st, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `STAGE ${idx + 1}/${STAGES.length} · ${st.name}`;
    if (idx === state.stageIndex) opt.selected = true;
    stageSelectEl.appendChild(opt);
  });

  const curStage = STAGES[state.stageIndex];
  if (curStage) {
    edStageNameInput.value = curStage.name;
    edStartCoinsInput.value = curStage.startCoins;
    edCastleHpInput.value = curStage.castleMaxHp;
  }
}

stageSelectEl.addEventListener('change', () => {
  const idx = parseInt(stageSelectEl.value, 10);
  if (!Number.isNaN(idx) && STAGES[idx]) {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    loadStage(idx, state.editorOpen);
  }
});

// 현재 스테이지 정리
function clearCurrentStage() {
  if (state.world) {
    scene.remove(state.world.worldGroup);
    state.world = null;
  }
  if (state.player) {
    state.player.destroy();
    state.player = null;
  }
  state.pads.forEach((p) => p.destroy());
  state.pads = [];
  state.padLabels.forEach((el) => el.remove());
  state.padLabels = [];

  state.enemies.forEach((e) => e.destroy());
  state.enemies = [];

  state.coinsList.forEach((c) => c.destroy());
  state.coinsList = [];

  state.projectiles.forEach((p) => p.destroy());
  state.projectiles = [];

  state.effects.forEach((ef) => scene.remove(ef.mesh));
  state.effects = [];
}

// 건설 구역 패드 및 라벨 재구성
function rebuildPadsForCurrentStage() {
  state.pads.forEach((p) => p.destroy());
  state.pads = [];
  state.padLabels.forEach((el) => el.remove());
  state.padLabels = [];

  const stageData = STAGES[state.stageIndex];
  (stageData.buildPads || []).forEach((padData, idx) => {
    const pad = new BuildPad(scene, padData, idx);
    state.pads.push(pad);

    const labelEl = document.createElement('div');
    labelEl.className = 'pad-label';
    worldLabelsEl.appendChild(labelEl);
    state.padLabels.push(labelEl);
  });
}

// 스테이지 로드 및 초기화 (언제나 웨이브 진행이 멈추지 않도록 즉시 활성화)
function loadStage(stageIndex, keepEditorOpen = false) {
  clearCurrentStage();

  state.stageIndex = Math.max(0, Math.min(STAGES.length - 1, stageIndex));
  const stageData = STAGES[state.stageIndex];

  state.coins = stageData.startCoins;
  state.castleMaxHp = stageData.castleMaxHp;
  state.castleHp = stageData.castleMaxHp;
  state.waveIndex = 0;
  state.defeatedStageEnemies = 0;

  let totalCount = 0;
  stageData.waves.forEach((w) => {
    w.groups.forEach((g) => {
      totalCount += g.count;
    });
  });
  state.totalStageEnemies = totalCount;

  state.world = buildStageWorld(scene, stageData);

  const curStepDef = kingdomDomain.getCurrentStepDef();
  const hpBonus = curStepDef ? curStepDef.castleMaxHpBonus || 0 : 0;
  state.castleMaxHp = stageData.castleMaxHp + hpBonus;
  state.castleHp = state.castleMaxHp;

  state.player = new PlayerHero(scene, 0, 0);
  cameraFocus.copy(state.player.position);
  camera.position.copy(cameraFocus).add(PLAY_CAMERA_OFFSET);
  camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);

  kingdomDomain.initForStage(state.world.endPt);
  mpNetwork.initStageCoopPartners();

  rebuildPadsForCurrentStage();
  refreshStageSelectUI();

  prepareWave(0);
  state.mode = 'playing';
  setEditorMode(keepEditorOpen, true);
  if (editorState.mapWaveOpen) {
    renderMapWaveStudio();
  }
  showBanner(`STAGE ${state.stageIndex + 1} / ${STAGES.length}`, `${stageData.name} 방어 시작!`);
  updateHud();
}

// 웨이브 스폰 큐 생성
function prepareWave(waveIdx) {
  const stageData = STAGES[state.stageIndex];
  state.waveIndex = waveIdx;
  state.waveTimer = 0;
  state.spawnQueue = [];

  const wave = stageData.waves[waveIdx];
  if (!wave) return;

  wave.groups.forEach((group) => {
    for (let i = 0; i < group.count; i++) {
      state.spawnQueue.push({
        type: group.type,
        spawnTime: group.delay + i * group.interval,
        spawned: false,
      });
    }
  });
  state.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);

  if (waveIdx > 0) {
    showBanner(`STAGE ${state.stageIndex + 1}`, `웨이브 ${waveIdx + 1} 몰려옵니다!`, 1500);
  }
}

// ==========================================================
// 인게임 3D 스테이지 & 지형물 · 맵 · 웨이브 에디터 로직
// ==========================================================

function hexNumberToCss(num) {
  return '#' + Math.max(0, Math.min(0xffffff, Number(num) || 0)).toString(16).padStart(6, '0');
}

function cssHexToNumber(hexStr) {
  return parseInt(String(hexStr).replace('#', ''), 16) || 0x5cb346;
}

// 현재 스테이지의 3D 월드(들판·모래길·성채·지형물)만 즉시 재구축 (전투·타워 유지)
function rebuildStageWorldInPlace() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  if (state.world) {
    scene.remove(state.world.worldGroup);
  }
  state.world = buildStageWorld(scene, stageData);
  // 현재 이동 중인 적들의 길 곡선도 즉시 새 경로로 갱신
  state.enemies.forEach((enemy) => {
    enemy.roadCurve = state.world.roadCurve;
  });
  rebuildWaypointMarkers();
}

// 스테이지 전체 적 마릿수 재계산
function recalculateTotalStageEnemies() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  let totalCount = 0;
  (stageData.waves || []).forEach((w) => {
    (w.groups || []).forEach((g) => {
      totalCount += Math.max(1, Number(g.count) || 1);
    });
  });
  state.totalStageEnemies = Math.max(state.defeatedStageEnemies + state.enemies.length, totalCount);
  updateHud();
}

// 에디터가 열려 있을 때 모래길 경유지(Waypoint) 3D 비콘 표시
function rebuildWaypointMarkers() {
  while (editorState.waypointMarkersGroup.children.length > 0) {
    editorState.waypointMarkersGroup.remove(editorState.waypointMarkersGroup.children[0]);
  }
  if (!state.editorOpen) {
    editorState.waypointMarkersGroup.visible = false;
    return;
  }
  editorState.waypointMarkersGroup.visible = true;
  const stageData = STAGES[state.stageIndex];
  if (!stageData || !Array.isArray(stageData.pathPoints)) return;

  stageData.pathPoints.forEach(([px, pz], idx) => {
    const isStart = idx === 0;
    const isEnd = idx === stageData.pathPoints.length - 1;
    const col = isStart ? 0xef4444 : isEnd ? 0x3b82f6 : 0xfacc15;
    const beacon = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8),
      new THREE.MeshBasicMaterial({ color: col })
    );
    pole.position.y = 1.1;
    beacon.add(pole);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: col })
    );
    orb.position.y = 2.4;
    beacon.add(orb);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 18).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })
    );
    ring.position.y = 0.16;
    beacon.add(ring);

    beacon.position.set(px, 0, pz);
    editorState.waypointMarkersGroup.add(beacon);
  });
}

function rebuildEditorGhostPreview() {
  while (editorState.previewGroup.children.length > 0) {
    editorState.previewGroup.remove(editorState.previewGroup.children[0]);
  }
  if (!state.editorOpen) {
    editorState.previewGroup.visible = false;
    return;
  }

  editorState.previewGroup.visible = true;
  const scale = SCALE_PRESETS[editorState.scaleIdx];
  const brush = editorState.brush;

  if (brush === 'erase') {
    const ringGeo = new THREE.RingGeometry(1.2, 1.65, 24).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.15;
    editorState.previewGroup.add(ring);
  } else if (brush === 'pad') {
    const padPreview = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.95, 0.25, 8),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.7 })
    );
    padPreview.position.y = 0.14;
    editorState.previewGroup.add(padPreview);
  } else if (brush === 'waypoint') {
    const wpPreview = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    wpPreview.position.y = 1.6;
    editorState.previewGroup.add(wpPreview);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    ring.position.y = 0.18;
    editorState.previewGroup.add(ring);
  } else {
    const propMesh = createTerrainPropMesh(brush, scale, editorState.rotation);
    editorState.previewGroup.add(propMesh);

    const ringGeo = new THREE.RingGeometry(1.4 * scale, 1.65 * scale, 24).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.12;
    editorState.previewGroup.add(ring);
  }
}

function setEditorMode(enabled, silentBanner = false) {
  state.editorOpen = Boolean(enabled);
  if (state.editorOpen) {
    editorBtnEl.classList.add('active');
    editorTopbarEl.classList.remove('hidden');
    editorDockEl.classList.remove('hidden');
    combatDockEl.classList.add('hidden');

    rebuildEditorGhostPreview();
    rebuildWaypointMarkers();
    if (!silentBanner) {
      showBanner(
        '🛠️ 스테이지 & 맵·웨이브 에디터',
        '지형물 배치 · 📍길경로점 편집 · 🗺️맵·웨이브 상세편집 가능',
        2200
      );
    }
  } else {
    editorBtnEl.classList.remove('active');
    editorTopbarEl.classList.add('hidden');
    editorDockEl.classList.add('hidden');
    combatDockEl.classList.remove('hidden');
    editorState.previewGroup.visible = false;
    editorState.waypointMarkersGroup.visible = false;
    toggleMapWaveStudio(false);
    if (state.player) state.player.targetMarker.visible = true;
  }
  updateHud();
}

editorBtnEl.addEventListener('click', () => {
  if (state.mode === 'intro') {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    state.mode = 'playing';
  }
  setEditorMode(!state.editorOpen);
});

edPlayBtn.addEventListener('click', () => {
  modalOverlayEl.classList.add('hidden');
  setEditorMode(false);
  if (state.mode !== 'playing') {
    loadStage(state.stageIndex, false);
  } else {
    const stageData = STAGES[state.stageIndex];
    showBanner(`STAGE ${state.stageIndex + 1} / ${STAGES.length}`, `${stageData.name} 전투 진행 중!`, 1500);
  }
});

document.querySelectorAll('.brush-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    editorState.brush = btn.dataset.brush;
    document.querySelectorAll('.brush-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    rebuildEditorGhostPreview();
  });
});

edScaleBtn.addEventListener('click', () => {
  editorState.scaleIdx = (editorState.scaleIdx + 1) % SCALE_PRESETS.length;
  const s = SCALE_PRESETS[editorState.scaleIdx];
  edScaleBtn.textContent = `크기: ${s}x`;
  rebuildEditorGhostPreview();
});

function rotateEditorBrush() {
  editorState.rotation = (editorState.rotation + Math.PI / 4) % (Math.PI * 2);
  rebuildEditorGhostPreview();
}
edRotateBtn.addEventListener('click', rotateEditorBrush);

edClearPropsBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  stageData.props = [];
  saveStages(STAGES);
  rebuildStageWorldInPlace();
  showBanner('지형물 초기화', '현재 스테이지의 지형물을 모두 비웠습니다.', 1400);
});

function onStageMetaInput() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  stageData.name = edStageNameInput.value.trim() || `스테이지 ${state.stageIndex + 1}`;
  stageData.startCoins = Math.max(30, parseInt(edStartCoinsInput.value, 10) || 75);
  stageData.castleMaxHp = Math.max(50, parseInt(edCastleHpInput.value, 10) || 100);
  state.coins = stageData.startCoins;
  state.castleMaxHp = stageData.castleMaxHp;
  state.castleHp = stageData.castleMaxHp;
  saveStages(STAGES);
  refreshStageSelectUI();
  updateHud();
}

edStageNameInput.addEventListener('input', onStageMetaInput);
edStartCoinsInput.addEventListener('change', onStageMetaInput);
edCastleHpInput.addEventListener('change', onStageMetaInput);

edAddStageBtn.addEventListener('click', () => {
  const newStage = createNewStageTemplate(STAGES.length + 1);
  STAGES.push(newStage);
  saveStages(STAGES);
  modalOverlayEl.classList.add('hidden');
  loadStage(STAGES.length - 1, state.editorOpen);
  if (editorState.mapWaveOpen) renderMapWaveStudio();
  showBanner(
    `STAGE ${STAGES.length} 추가 및 출격!`,
    `${newStage.name} — 웨이브가 즉시 시작됩니다!`,
    2200
  );
});

edDelStageBtn.addEventListener('click', () => {
  if (STAGES.length <= 1) {
    showBanner('삭제 불가', '최소 1개의 스테이지는 남아있어야 합니다.', 1600);
    return;
  }
  const removedName = STAGES[state.stageIndex].name;
  STAGES.splice(state.stageIndex, 1);
  saveStages(STAGES);
  const nextIdx = Math.max(0, state.stageIndex - 1);
  loadStage(nextIdx, state.editorOpen);
  if (editorState.mapWaveOpen) renderMapWaveStudio();
  showBanner('스테이지 삭제됨', `'${removedName}' 스테이지가 삭제되었습니다.`, 1600);
});

edResetAllBtn.addEventListener('click', () => {
  const defaults = resetStagesToDefault();
  setStagesList(defaults);
  loadStage(0, state.editorOpen);
  if (editorState.mapWaveOpen) renderMapWaveStudio();
  showBanner('기본값 복원 완료', `기본 ${STAGES.length}개 스테이지와 지형물로 복원되었습니다.`, 1800);
});

// ==========================================================
// 스테이지 맵(테마·경로) & 적 웨이브 편성 상세 에디터 모달
// ==========================================================

function toggleMapWaveStudio(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !editorState.mapWaveOpen;
  editorState.mapWaveOpen = next;
  mapWaveOverlayEl.classList.toggle('hidden', !next);
  if (next) {
    if (comfyStudio.isOpen) toggleComfyStudio(false);
    renderMapWaveStudio();
  }
}

edMapWaveBtn.addEventListener('click', () => {
  toggleMapWaveStudio();
});

mwCloseBtn.addEventListener('click', () => {
  toggleMapWaveStudio(false);
});

mwApplyPlayBtn.addEventListener('click', () => {
  toggleMapWaveStudio(false);
  setEditorMode(false);
  loadStage(state.stageIndex, false);
});

// 테마 프리셋 버튼 초기 생성
Object.entries(MAP_THEME_PRESETS).forEach(([key, preset]) => {
  const btn = document.createElement('button');
  btn.className = 'mw-preset-btn';
  btn.textContent = preset.name;
  btn.addEventListener('click', () => {
    const stageData = STAGES[state.stageIndex];
    if (!stageData) return;
    stageData.groundColor = preset.groundColor;
    stageData.groundAltColor = preset.groundAltColor;
    stageData.roadColor = preset.roadColor;
    stageData.roadBorderColor = preset.roadBorderColor;
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    renderMapWaveStudio();
    sfx.playCoinPickup();
    showBanner('맵 테마 변경', `${preset.name} 테마가 적용되었습니다!`, 1400);
  });
  mwThemePresetsEl.appendChild(btn);
});

// 모래길 모양 프리셋 버튼 초기 생성
Object.entries(ROAD_PATH_PRESETS).forEach(([key, preset]) => {
  const btn = document.createElement('button');
  btn.className = 'mw-preset-btn';
  btn.textContent = preset.name;
  btn.addEventListener('click', () => {
    const stageData = STAGES[state.stageIndex];
    if (!stageData) return;
    stageData.pathPoints = preset.points.map(([px, pz]) => [px, pz]);
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    renderMapWaveStudio();
    sfx.playTowerBuilt();
    showBanner('모래길 경로 변경', `${preset.name} 경로가 적용되었습니다!`, 1400);
  });
  mwRoadPresetsEl.appendChild(btn);
});

function onMapColorPickerChange() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  stageData.groundColor = cssHexToNumber(mwColGround.value);
  stageData.groundAltColor = cssHexToNumber(mwColAlt.value);
  stageData.roadColor = cssHexToNumber(mwColRoad.value);
  stageData.roadBorderColor = cssHexToNumber(mwColBorder.value);
  saveStages(STAGES);
  rebuildStageWorldInPlace();
}

mwColGround.addEventListener('input', onMapColorPickerChange);
mwColAlt.addEventListener('input', onMapColorPickerChange);
mwColRoad.addEventListener('input', onMapColorPickerChange);
mwColBorder.addEventListener('input', onMapColorPickerChange);

mwRandomRoadBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  stageData.pathPoints = generateRandomRoadPath();
  saveStages(STAGES);
  rebuildStageWorldInPlace();
  renderMapWaveStudio();
  sfx.playTowerBuilt();
  showBanner('🎲 랜덤 모래길 생성', '새로운 구불구불한 모래길 경로가 생성되었습니다!', 1500);
});

mwReverseRoadBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  if (!stageData || !Array.isArray(stageData.pathPoints)) return;
  stageData.pathPoints.reverse();
  saveStages(STAGES);
  rebuildStageWorldInPlace();
  renderMapWaveStudio();
  sfx.playCoinPickup();
  showBanner('⇄ 경로 방향 반전', '적 출현 포털과 왕국 성채의 위치가 서로 바뀌었습니다!', 1500);
});

mwAutoPadsBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  stageData.buildPads = generateAutoPadsForPath(stageData.pathPoints, 7);
  saveStages(STAGES);
  rebuildPadsForCurrentStage();
  sfx.playTowerBuilt();
  showBanner('🏗️ 건설 구역 자동 배치', '현재 모래길 주변 최적 위치에 건설 구역이 재배치되었습니다!', 1600);
});

mwAddWpBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  if (!stageData || !Array.isArray(stageData.pathPoints)) return;
  const pts = stageData.pathPoints;
  if (pts.length >= 2) {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const mx = Math.round(((last[0] + prev[0]) / 2) * 10) / 10;
    const mz = Math.round(THREE.MathUtils.clamp((last[1] + prev[1]) / 2 + 5, -15, 15) * 10) / 10;
    pts.splice(pts.length - 1, 0, [mx, mz]);
  } else {
    pts.push([0, 0]);
  }
  saveStages(STAGES);
  rebuildStageWorldInPlace();
  renderMapWaveStudio();
  sfx.playCoinPickup();
});

mwAddWaveBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;
  if (!Array.isArray(stageData.waves)) stageData.waves = [];
  stageData.waves.push({
    groups: [
      { type: 'giraffe', count: 8, interval: 0.85, delay: 0 },
      { type: 'hippo', count: 5, interval: 1.4, delay: 2.0 },
      { type: 'elephant', count: 3, interval: 2.2, delay: 4.0 },
    ],
  });
  saveStages(STAGES);
  recalculateTotalStageEnemies();
  renderMapWaveStudio();
  sfx.playTowerBuilt();
});

function renderMapWaveStudio() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;

  mwHeaderTitleEl.textContent = `🗺️ STAGE ${state.stageIndex + 1} (${stageData.name}) — 맵 & 웨이브 에디터`;

  mwColGround.value = hexNumberToCss(stageData.groundColor ?? 0x5cb346);
  mwColAlt.value = hexNumberToCss(stageData.groundAltColor ?? 0x4ea039);
  mwColRoad.value = hexNumberToCss(stageData.roadColor ?? 0xead29c);
  mwColBorder.value = hexNumberToCss(stageData.roadBorderColor ?? 0xc5aa72);

  // 경유지(Waypoint) 리스트 렌더링
  mwWaypointListEl.innerHTML = '';
  (stageData.pathPoints || []).forEach((pt, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === stageData.pathPoints.length - 1;
    const row = document.createElement('div');
    row.className = 'mw-wp-row';

    const badge = document.createElement('span');
    badge.className = 'mw-wp-badge';
    badge.textContent = isStart ? `🚩 출발 #1` : isEnd ? `🏰 성채 #${idx + 1}` : `📍 경유 #${idx + 1}`;
    row.appendChild(badge);

    const coordWrap = document.createElement('div');
    coordWrap.className = 'mw-wp-coord';

    const xInput = document.createElement('input');
    xInput.type = 'number';
    xInput.step = '1';
    xInput.min = String(MAP_BOUNDS.minX);
    xInput.max = String(MAP_BOUNDS.maxX);
    xInput.value = String(pt[0]);
    xInput.addEventListener('change', () => {
      pt[0] = THREE.MathUtils.clamp(parseFloat(xInput.value) || 0, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      saveStages(STAGES);
      rebuildStageWorldInPlace();
    });

    const zInput = document.createElement('input');
    zInput.type = 'number';
    zInput.step = '1';
    zInput.min = String(MAP_BOUNDS.minZ);
    zInput.max = String(MAP_BOUNDS.maxZ);
    zInput.value = String(pt[1]);
    zInput.addEventListener('change', () => {
      pt[1] = THREE.MathUtils.clamp(parseFloat(zInput.value) || 0, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
      saveStages(STAGES);
      rebuildStageWorldInPlace();
    });

    coordWrap.append('X:', xInput, 'Z:', zInput);
    row.appendChild(coordWrap);

    const delBtn = document.createElement('button');
    delBtn.className = 'mw-wp-del';
    delBtn.textContent = '✕';
    delBtn.title = '이 경유지 삭제 (최소 3개 유지)';
    delBtn.addEventListener('click', () => {
      if (stageData.pathPoints.length <= 3) {
        showBanner('삭제 불가', '모래길은 최소 3개 이상의 경유지가 필요합니다.', 1400);
        return;
      }
      stageData.pathPoints.splice(idx, 1);
      saveStages(STAGES);
      rebuildStageWorldInPlace();
      renderMapWaveStudio();
    });
    row.appendChild(delBtn);

    mwWaypointListEl.appendChild(row);
  });

  // 우측: 웨이브 및 적 그룹 리스트 렌더링
  mwWavesListEl.innerHTML = '';
  let totalStageCount = 0;
  let totalEstCoins = 0;

  const quickTypes = [
    { type: 'giraffe', label: '+🦒 기린', count: 8, interval: 0.85 },
    { type: 'hippo', label: '+🦛 하마', count: 5, interval: 1.35 },
    { type: 'elephant', label: '+🐘 코끼리', count: 3, interval: 2.1 },
    { type: 'imp', label: '+👹 돌격병', count: 10, interval: 0.75 },
    { type: 'raider', label: '+⚔️ 전사', count: 7, interval: 1.0 },
    { type: 'sprinter', label: '+🔥 기습병', count: 8, interval: 0.7 },
    { type: 'brute', label: '+🛡️ 중장갑', count: 4, interval: 1.8 },
    { type: 'boss', label: '+👑 보스', count: 1, interval: 5.0 },
  ];

  (stageData.waves || []).forEach((wave, wIdx) => {
    if (!Array.isArray(wave.groups)) wave.groups = [];
    let waveEnemyCount = 0;
    wave.groups.forEach((g) => {
      const c = Math.max(1, Number(g.count) || 1);
      waveEnemyCount += c;
      totalStageCount += c;
      const eDef = ENEMY_TYPES[g.type] || ENEMY_TYPES.giraffe;
      totalEstCoins += c * (eDef.coinReward || 12);
    });

    const card = document.createElement('div');
    card.className = 'mw-wave-card';

    const head = document.createElement('div');
    head.className = 'mw-wave-head';

    const title = document.createElement('div');
    title.className = 'mw-wave-title';
    title.innerHTML = `<span>🌊 WAVE ${wIdx + 1}</span><small>(총 ${waveEnemyCount}마리 출현)</small>`;
    head.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'mw-wave-actions';

    const testBtn = document.createElement('button');
    testBtn.className = 'mw-test-wave-btn';
    testBtn.textContent = '⚡ 이 웨이브 즉시 출격';
    testBtn.addEventListener('click', () => {
      toggleMapWaveStudio(false);
      state.enemies.forEach((e) => e.destroy());
      state.enemies = [];
      prepareWave(wIdx);
      state.mode = 'playing';
      sfx.playTowerBuilt();
      showBanner(`STAGE ${state.stageIndex + 1}`, `WAVE ${wIdx + 1} 즉시 테스트 출격!`, 1800);
      updateHud();
    });
    actions.appendChild(testBtn);

    const delWaveBtn = document.createElement('button');
    delWaveBtn.className = 'mw-del-wave-btn';
    delWaveBtn.textContent = '🗑️ 삭제';
    delWaveBtn.addEventListener('click', () => {
      if (stageData.waves.length <= 1) {
        showBanner('삭제 불가', '스테이지에는 최소 1개의 웨이브가 있어야 합니다.', 1500);
        return;
      }
      stageData.waves.splice(wIdx, 1);
      saveStages(STAGES);
      recalculateTotalStageEnemies();
      if (state.waveIndex >= stageData.waves.length) {
        prepareWave(0);
      }
      renderMapWaveStudio();
    });
    actions.appendChild(delWaveBtn);

    head.appendChild(actions);
    card.appendChild(head);

    // 빠른 적 그룹 추가 바
    const quickBar = document.createElement('div');
    quickBar.className = 'mw-quick-enemy-bar';
    quickTypes.forEach((qt) => {
      const qBtn = document.createElement('button');
      qBtn.className = 'mw-quick-add-btn';
      qBtn.textContent = qt.label;
      qBtn.addEventListener('click', () => {
        wave.groups.push({
          type: qt.type,
          count: qt.count,
          interval: qt.interval,
          delay: wave.groups.length * 1.5,
        });
        saveStages(STAGES);
        recalculateTotalStageEnemies();
        if (state.waveIndex === wIdx) prepareWave(wIdx);
        renderMapWaveStudio();
        sfx.playCoinPickup();
      });
      quickBar.appendChild(qBtn);
    });
    card.appendChild(quickBar);

    // 적 스폰 그룹 행 렌더링
    const groupList = document.createElement('div');
    groupList.className = 'mw-group-list';

    wave.groups.forEach((group, gIdx) => {
      const gRow = document.createElement('div');
      gRow.className = 'mw-group-row';

      const typeSelect = document.createElement('select');
      Object.entries(ENEMY_TYPES).forEach(([eKey, eDef]) => {
        const opt = document.createElement('option');
        opt.value = eKey;
        opt.textContent = `${eDef.emoji} ${eDef.name} (HP ${eDef.hp})`;
        if (group.type === eKey) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener('change', () => {
        group.type = typeSelect.value;
        saveStages(STAGES);
        if (state.waveIndex === wIdx) prepareWave(wIdx);
        renderMapWaveStudio();
      });
      gRow.appendChild(typeSelect);

      // 마릿수
      const countField = document.createElement('label');
      countField.className = 'mw-group-field';
      const countInp = document.createElement('input');
      countInp.type = 'number';
      countInp.min = '1';
      countInp.max = '80';
      countInp.value = String(group.count);
      countInp.addEventListener('change', () => {
        group.count = Math.max(1, Math.min(80, parseInt(countInp.value, 10) || 1));
        saveStages(STAGES);
        recalculateTotalStageEnemies();
        if (state.waveIndex === wIdx) prepareWave(wIdx);
        renderMapWaveStudio();
      });
      countField.append('마릿수', countInp);
      gRow.appendChild(countField);

      // 스폰 간격(초)
      const intField = document.createElement('label');
      intField.className = 'mw-group-field';
      const intInp = document.createElement('input');
      intInp.type = 'number';
      intInp.min = '0.2';
      intInp.max = '10';
      intInp.step = '0.1';
      intInp.value = String(group.interval);
      intInp.addEventListener('change', () => {
        group.interval = Math.max(0.2, Math.min(10, parseFloat(intInp.value) || 1.0));
        saveStages(STAGES);
        if (state.waveIndex === wIdx) prepareWave(wIdx);
      });
      intField.append('간격(s)', intInp);
      gRow.appendChild(intField);

      // 시작 지연(초)
      const delField = document.createElement('label');
      delField.className = 'mw-group-field';
      const delInp = document.createElement('input');
      delInp.type = 'number';
      delInp.min = '0';
      delInp.max = '30';
      delInp.step = '0.5';
      delInp.value = String(group.delay);
      delInp.addEventListener('change', () => {
        group.delay = Math.max(0, Math.min(30, parseFloat(delInp.value) || 0));
        saveStages(STAGES);
        if (state.waveIndex === wIdx) prepareWave(wIdx);
      });
      delField.append('지연(s)', delInp);
      gRow.appendChild(delField);

      // 그룹 삭제 버튼
      const rmBtn = document.createElement('button');
      rmBtn.className = 'mw-wp-del';
      rmBtn.textContent = '✕';
      rmBtn.title = '이 적 그룹 삭제';
      rmBtn.addEventListener('click', () => {
        if (wave.groups.length <= 1) {
          showBanner('삭제 불가', '웨이브당 최소 1개의 적 그룹이 필요합니다.', 1400);
          return;
        }
        wave.groups.splice(gIdx, 1);
        saveStages(STAGES);
        recalculateTotalStageEnemies();
        if (state.waveIndex === wIdx) prepareWave(wIdx);
        renderMapWaveStudio();
      });
      gRow.appendChild(rmBtn);

      groupList.appendChild(gRow);
    });

    card.appendChild(groupList);
    mwWavesListEl.appendChild(card);
  });

  mwWaveSummaryEl.textContent = `총 ${(stageData.waves || []).length}웨이브 · 적 ${totalStageCount}마리 · 보상 약 🪙${totalEstCoins}`;
}

function eraseNearestAtPoint(worldPt) {
  const stageData = STAGES[state.stageIndex];
  let bestPropIdx = -1;
  let bestPropDist = 3.8;

  (stageData.props || []).forEach((p, idx) => {
    const d = Math.hypot(p.x - worldPt.x, p.z - worldPt.z);
    if (d < bestPropDist) {
      bestPropDist = d;
      bestPropIdx = idx;
    }
  });

  let bestPadIdx = -1;
  let bestPadDist = 2.6;
  (stageData.buildPads || []).forEach((pad, idx) => {
    const d = Math.hypot(pad.x - worldPt.x, pad.z - worldPt.z);
    if (d < bestPadDist) {
      bestPadDist = d;
      bestPadIdx = idx;
    }
  });

  if (bestPropIdx !== -1 && (bestPadIdx === -1 || bestPropDist <= bestPadDist)) {
    const removed = stageData.props.splice(bestPropIdx, 1)[0];
    const mesh = state.world.propInstances[bestPropIdx];
    if (mesh) {
      state.world.propsGroup.remove(mesh);
      state.world.propInstances.splice(bestPropIdx, 1);
    }
    saveStages(STAGES);
    sfx.playEnemyDefeat();
    spawnRingEffect(worldPt, 1.8, 0xef4444, 0.22);
    const info = PROP_CATALOG[removed.type] || { emoji: '🧹', name: '지형물' };
    spawnFloatingText(worldPt.clone().setY(1.8), `${info.emoji} ${info.name} 삭제`, '#f87171');
    return true;
  }

  if (bestPadIdx !== -1) {
    stageData.buildPads.splice(bestPadIdx, 1);
    rebuildPadsForCurrentStage();
    saveStages(STAGES);
    sfx.playEnemyDefeat();
    spawnRingEffect(worldPt, 1.8, 0xef4444, 0.22);
    spawnFloatingText(worldPt.clone().setY(1.8), '🪙 건설 구역 삭제', '#f87171');
    return true;
  }

  return false;
}

// 3D 맵에서 직접 모래길 경유지(Waypoint) 이동 / 추가 / 삭제 처리
function handleWaypointBrushClick(x, z, isRightClick) {
  const stageData = STAGES[state.stageIndex];
  if (!stageData || !Array.isArray(stageData.pathPoints)) return;
  const pts = stageData.pathPoints;
  const targetVec = new THREE.Vector3(x, 0, z);

  // 가장 가까운 기존 경유지 탐색
  let nearestIdx = -1;
  let nearestDist = 4.2;
  pts.forEach(([px, pz], idx) => {
    const d = Math.hypot(px - x, pz - z);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = idx;
    }
  });

  if (isRightClick) {
    if (nearestIdx !== -1 && pts.length > 3) {
      pts.splice(nearestIdx, 1);
      saveStages(STAGES);
      rebuildStageWorldInPlace();
      if (editorState.mapWaveOpen) renderMapWaveStudio();
      sfx.playEnemyDefeat();
      spawnRingEffect(targetVec, 2.0, 0xef4444, 0.25);
      spawnFloatingText(targetVec.clone().setY(2.2), `📍 경유지 #${nearestIdx + 1} 삭제`, '#f87171');
    } else if (pts.length <= 3) {
      showBanner('삭제 불가', '모래길은 최소 3개 이상의 경유지가 필요합니다.', 1400);
    }
    return;
  }

  // 좌클릭: 기존 경유지 근처면 위치 이동, 아니면 가장 가까운 선분 사이에 새 경유지 삽입
  if (nearestIdx !== -1) {
    pts[nearestIdx][0] = x;
    pts[nearestIdx][1] = z;
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    if (editorState.mapWaveOpen) renderMapWaveStudio();
    sfx.playCoinPickup();
    spawnRingEffect(targetVec, 2.2, 0xfacc15, 0.25);
    spawnFloatingText(targetVec.clone().setY(2.2), `📍 경유지 #${nearestIdx + 1} 이동!`, '#fde047');
  } else {
    // 가장 가까운 선분 찾기
    let bestInsertIdx = pts.length - 1;
    let bestSegDist = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const mz = (pts[i][1] + pts[i + 1][1]) / 2;
      const d = Math.hypot(mx - x, mz - z);
      if (d < bestSegDist) {
        bestSegDist = d;
        bestInsertIdx = i + 1;
      }
    }
    pts.splice(bestInsertIdx, 0, [x, z]);
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    if (editorState.mapWaveOpen) renderMapWaveStudio();
    sfx.playTowerBuilt();
    spawnRingEffect(targetVec, 2.4, 0x38bdf8, 0.28);
    spawnFloatingText(targetVec.clone().setY(2.2), `+📍 경유지 #${bestInsertIdx + 1} 추가!`, '#38bdf8');
  }
}

function handleEditorCanvasClick(worldPt, isRightClick = false) {
  const stageData = STAGES[state.stageIndex];
  const x = Math.round(THREE.MathUtils.clamp(worldPt.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX) * 10) / 10;
  const z = Math.round(THREE.MathUtils.clamp(worldPt.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ) * 10) / 10;
  const targetVec = new THREE.Vector3(x, 0, z);

  if (editorState.brush === 'waypoint') {
    handleWaypointBrushClick(x, z, isRightClick);
    return;
  }

  if (isRightClick || editorState.brush === 'erase') {
    eraseNearestAtPoint(targetVec);
    return;
  }

  if (editorState.brush === 'pad') {
    stageData.buildPads.push({ x, z, baseCost: 35 });
    rebuildPadsForCurrentStage();
    saveStages(STAGES);
    sfx.playTowerBuilt();
    spawnRingEffect(targetVec, 2.2, 0xfacc15, 0.28);
    spawnFloatingText(targetVec.clone().setY(2.0), '+🪙 건설 구역 추가!', '#fde047');
    return;
  }

  const scale = SCALE_PRESETS[editorState.scaleIdx];
  const rot = Math.round(editorState.rotation * 100) / 100;
  const newProp = {
    type: editorState.brush,
    x,
    z,
    scale,
    rot,
  };
  if (!Array.isArray(stageData.props)) stageData.props = [];
  stageData.props.push(newProp);

  const mesh = createTerrainPropMesh(newProp.type, newProp.scale, newProp.rot);
  mesh.position.set(x, 0, z);
  state.world.propsGroup.add(mesh);
  state.world.propInstances.push(mesh);

  saveStages(STAGES);
  sfx.playCoinPickup();
  spawnRingEffect(targetVec, 2.2 * scale, 0x4ade80, 0.25);
  const info = PROP_CATALOG[newProp.type] || { emoji: '🌲', name: '지형물' };
  spawnFloatingText(targetVec.clone().setY(2.2), `+${info.emoji} ${info.name} 배치!`, '#4ade80');
}

function updateGroundRaycastFromMouse() {
  if (!hasMouseMoved || !state.world) return;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(state.world.raycastPlane);
  if (hits.length > 0) {
    currentGroundHit.copy(hits[0].point);
    if (state.mode === 'playing' && state.player && !comfyStudio.isOpen && !editorState.mapWaveOpen) {
      state.player.setMoveTarget(currentGroundHit);
    }
    if (state.editorOpen) {
      editorState.previewGroup.position.set(
        THREE.MathUtils.clamp(currentGroundHit.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
        0,
        THREE.MathUtils.clamp(currentGroundHit.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ)
      );
    }
  }
}

viewportEl.addEventListener('pointermove', (e) => {
  const rect = canvasEl.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  hasMouseMoved = true;
  updateGroundRaycastFromMouse();
});

canvasEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

canvasEl.addEventListener('pointerdown', (e) => {
  if (comfyStudio.isOpen || editorState.mapWaveOpen) return;
  const rect = canvasEl.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  hasMouseMoved = true;
  updateGroundRaycastFromMouse();

  if (state.editorOpen) {
    handleEditorCanvasClick(currentGroundHit, e.button === 2);
    return;
  }

  if (e.button === 0 && state.mode === 'playing') {
    triggerPlayerSkill();
  }
});

// 황금 충격파 베기 스킬 발동
function triggerPlayerSkill() {
  const player = state.player;
  if (!player || state.mode !== 'playing') return;
  if (player.skillTimer > 0) return;

  player.skillTimer = player.skillCooldown;
  player.triggerSwing();
  sfx.playSkill();

  spawnRingEffect(player.position, player.skillRadius, 0xfacc15, 0.38);
  spawnFloatingText(
    player.position.clone().setY(2.3),
    '⚡ 황금 충격파!',
    '#fde047'
  );

  state.enemies.forEach((enemy) => {
    if (enemy.dead || enemy.reachedCastle) return;
    const dist = enemy.position.distanceTo(player.position);
    if (dist <= player.skillRadius) {
      enemy.applySlow(0.35, 1.8);
      damageEnemy(enemy, player.skillDamage, '#fde047');
    }
  });
}

// 적 피해 및 처치 시 코인 드롭 처리
function damageEnemy(enemy, amount, color = '#ffffff') {
  if (enemy.dead) return;
  const killed = enemy.takeDamage(amount);
  spawnFloatingText(enemy.position.clone().setY(1.8), `-${amount}`, color);

  if (killed) {
    state.defeatedStageEnemies += 1;
    sfx.playEnemyDefeat();
    spawnRingEffect(enemy.position, 1.4, 0xef4444, 0.22);

    const dropCount = enemy.def.isBoss ? 8 : Math.max(1, Math.round(enemy.coinReward / 6));
    const baseVal = Math.floor(enemy.coinReward / dropCount);
    const remainder = enemy.coinReward - baseVal * dropCount;

    for (let i = 0; i < dropCount; i++) {
      const val = i === 0 ? baseVal + remainder : baseVal;
      state.coinsList.push(new DroppedCoin(scene, enemy.position, val));
    }
  }
}

function selectTowerType(typeKey) {
  if (!TOWER_TYPES[typeKey]) return;
  state.selectedTower = typeKey;
  document.querySelectorAll('.tower-card').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tower === typeKey);
  });
}

document.querySelectorAll('.tower-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectTowerType(btn.dataset.tower);
  });
});

// 🏗️ 인과관계 기반 시설 증축 (🏠 집 짓기 / 🌾 농사 / 🐟 어업)
function triggerBuildFacility(facId) {
  if (state.mode === 'intro') {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    state.mode = 'playing';
  }
  if (state.mode !== 'playing') return;

  const built = kingdomDomain.constructFacility(
    facId,
    {
      getCoins: () => state.coins,
      spendCoins: (amt) => {
        state.coins = Math.max(0, state.coins - amt);
      },
    },
    (sub, title) => showBanner(sub, title, 2300),
    spawnFloatingText
  );

  if (built) {
    sfx.playTowerBuilt();
    mpNetwork.sendPacket({
      type: 'kingdom_upgrade',
      kingdom: kingdomDomain.getSnapshot(),
    });
    saveLiveSessionSnapshot(state, kingdomDomain);
    updateHud();
  }
}

if (facHouseBtnEl) {
  facHouseBtnEl.addEventListener('click', () => triggerBuildFacility('house'));
}
if (facFarmBtnEl) {
  facFarmBtnEl.addEventListener('click', () => triggerBuildFacility('farm'));
}
if (facFisheryBtnEl) {
  facFisheryBtnEl.addEventListener('click', () => triggerBuildFacility('fishery'));
}

// 🌱 무중단 문명·세계관 확장 (Zero-Downtime Program & Worldview Expansion)
const EXPANSION_STAGE_TEMPLATES = [
  {
    id: 'harbor_metropolis',
    name: '대항구 교역도시',
    badge: '⚓ 6단계: 대항구 교역도시',
    shortLabel: '⚓ 대항구 도시',
    desc: '성(Castle) 너머 해안과 강 하구에 원양 범선 항구를 건설해 대륙 간 해양 무역과 원양 어업을 개척했습니다!',
  },
  {
    id: 'royal_academy_capital',
    name: '왕립 학술 수도',
    badge: '🏛️ 7단계: 왕립 학술 수도',
    shortLabel: '🏛️ 왕립 수도',
    desc: '왕립 대학과 과학 공방을 설립하여 자동화 농기구와 대형 조선술로 식량·세금 생산을 극대화했습니다!',
  },
  {
    id: 'golden_empire',
    name: '황금 대제국',
    badge: '👑 8단계: 황금 대제국',
    shortLabel: '👑 황금 대제국',
    desc: '수많은 타운과 시장·무역소·항구를 하나로 묶어 대륙을 호령하는 영원한 황금 대제국을 완성했습니다!',
  },
];

function triggerZeroDowntimeExpansion() {
  if (state.mode === 'intro') {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    state.mode = 'playing';
  }
  const nextStepNum = KINGDOM_CONFIG.settlementChain.length + 1;
  const tplIdx = nextStepNum - 6;
  const tpl = EXPANSION_STAGE_TEMPLATES[tplIdx] || {
    id: `era_stage_${nextStepNum}`,
    name: `신세계 제${nextStepNum}문명`,
    badge: `🌟 ${nextStepNum}단계: 신세계 문명`,
    shortLabel: `🌟 ${nextStepNum}단계 문명`,
    desc: `게임 중단 없이 실시간으로 확장된 제${nextStepNum}단계 문명 세계관입니다!`,
  };

  const newStagePayload = {
    step: nextStepNum,
    id: tpl.id,
    name: tpl.name,
    badge: tpl.badge,
    shortLabel: tpl.shortLabel,
    desc: tpl.desc,
    reqCoins: 200 + (nextStepNum - 5) * 90,
    reqFood: 120 + (nextStepNum - 5) * 50,
    reqPop: 14 + (nextStepNum - 5) * 4,
    reqFoodFacilityLevels: 3 + (nextStepNum - 5),
    baseTaxPerCycle: 90 + (nextStepNum - 5) * 35,
    foodPerSec: 22 + (nextStepNum - 5) * 7,
    agriFishMultiplier: +(2.8 + (nextStepNum - 5) * 0.5).toFixed(1),
    castleMaxHpBonus: 380 + (nextStepNum - 5) * 160,
    combatMultiplier: +(2.25 + (nextStepNum - 5) * 0.35).toFixed(2),
    autoGuardDamage: 60 + (nextStepNum - 5) * 22,
  };

  applyZeroDowntimeWorldPatch({ AppendStage: newStagePayload });
  mpNetwork.sendPacket({
    type: 'world_patch',
    patch: { AppendStage: newStagePayload },
  });

  // 백엔드 서버(/api/world-patch)에도 비동기 브로드캐스트 (오프라인이어도 로컬 무중단 동작)
  fetch('/api/world-patch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ AppendStage: newStagePayload }),
  }).catch(() => {});

  sfx.playTowerBuilt();
  saveLiveSessionSnapshot(state, kingdomDomain);
  updateHud();
  showBanner(
    `🌱 무중단 세계관 확장 완료! (${tpl.badge})`,
    `전투·마을·세금 중단 없이 [${tpl.name}] 단계가 프로그램에 즉시 증설되었습니다!`,
    2600
  );
}

if (liveExpandBtnEl) {
  liveExpandBtnEl.addEventListener('click', () => {
    triggerZeroDowntimeExpansion();
  });
}

// 🏛️ 문명 건국 단계 발전: [1. 아주 작은 마을] ➔ [2. 타운 건설] ➔ [3. 시장 완성(농·어업 체계화)] ➔ [4. 무역소 개설] ➔ [5. 성(Castle) 완성] ➔ [6+ 무중단 확장]
function advanceKingdomSettlement() {
  if (state.mode !== 'playing') return;
  const nextDef = kingdomDomain.getNextStepDef();
  if (!nextDef) {
    showBanner(
      '🏰 현재 최종 문명 단계 달성!',
      '우측 상단 [🌱 무중단 확장] 버튼을 누르면 게임을 멈추지 않고 6단계(대항구)·7단계(왕립 수도) 문명을 계속 증설할 수 있습니다!',
      2500
    );
    return;
  }

  const reqCoins = nextDef.reqCoins || 0;
  const reqFood = nextDef.reqFood || 0;
  const reqPop = nextDef.reqPop || 0;
  const reqFoodFac = nextDef.reqFoodFacilityLevels || 0;
  const curFoodFac = kingdomDomain.getTotalFoodFacilityLevels();

  // 1) 집(🏠)을 지어 인구를 먼저 확보해야 하는 인과관계 체크
  if (kingdomDomain.population < reqPop) {
    showBanner(
      `👥 인구 부족 (현재 ${kingdomDomain.population}명 / 필요 ${reqPop}명)`,
      `${nextDef.badge} 단계로 가려면 먼저 [🏠 집]을 지어 수용 인구를 늘리고 숲에서 주민을 모으세요! (사냥만으론 12명 한계)`,
      2500
    );
    return;
  }

  // 2) 사냥 한계를 넘어 농사(🌾) 또는 어업(🐟) 기반이 갖춰져야 타운/시장(체계화)으로 발전 가능
  if (curFoodFac < reqFoodFac) {
    showBanner(
      `🌾 농사 · 🐟 어업 기반 부족 (현재 합산 Lv.${curFoodFac} / 필요 Lv.${reqFoodFac})`,
      `사냥만으로는 식량 한계가 있습니다! ${nextDef.badge} 건설 및 체계화를 위해 [🌾 농사] 또는 [🐟 어업]을 먼저 확충하세요!`,
      2600
    );
    return;
  }

  // 3) 세금(🪙)과 식량(🍖) 체크
  if (state.coins < reqCoins || kingdomDomain.food < reqFood) {
    showBanner(
      '🪙 세금(돈) 또는 🍖 식량 부족',
      `${nextDef.badge} 건설에는 🪙${reqCoins} 세금, 🍖${reqFood} 식량이 필요합니다! (현재: 🪙${state.coins}, 🍖${kingdomDomain.food})`,
      2200
    );
    return;
  }

  state.coins -= reqCoins;
  kingdomDomain.food -= reqFood;
  const prevDef = kingdomDomain.getCurrentStepDef();
  kingdomDomain.settlementStep += 1;
  kingdomDomain.rebuildStructures();

  const curDef = kingdomDomain.getCurrentStepDef();
  const deltaHp = Math.max(0, (curDef.castleMaxHpBonus || 0) - (prevDef.castleMaxHpBonus || 0));
  state.castleMaxHp += deltaHp;
  state.castleHp = Math.min(state.castleMaxHp, state.castleHp + deltaHp + 35);

  sfx.playStageClear();
  spawnRingEffect(kingdomDomain.castleEndPt, 5.2, 0xfacc15, 0.48);
  spawnFloatingText(
    kingdomDomain.castleEndPt.clone().setY(3.8),
    `${curDef.badge} 완성! (농·어업 효율 x${curDef.agriFishMultiplier || 1})`,
    '#fde047'
  );
  showBanner(`🏛️ 문명 발전: ${curDef.badge}`, curDef.desc, 2600);

  mpNetwork.sendPacket({
    type: 'kingdom_upgrade',
    kingdom: kingdomDomain.getSnapshot(),
  });
  saveLiveSessionSnapshot(state, kingdomDomain);
  updateHud();
}

if (kdAdvanceBtnEl) {
  kdAdvanceBtnEl.addEventListener('click', () => {
    advanceKingdomSettlement();
  });
}

skillBtnEl.addEventListener('click', () => {
  triggerPlayerSkill();
});

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

  if (state.editorOpen && (e.key === 'r' || e.key === 'R')) {
    rotateEditorBrush();
    return;
  }

  if (e.key === '1') selectTowerType('crossbow');
  if (e.key === '2') selectTowerType('cannon');
  if (e.key === '3') selectTowerType('frost');
  if (e.key === '4') selectTowerType('wall');
  if (e.key === '5') advanceKingdomSettlement();
  if (e.key === 'q' || e.key === 'Q') triggerBuildFacility('house');
  if (e.key === 'w' || e.key === 'W') triggerBuildFacility('farm');
  if (e.key === 'e' || e.key === 'E') triggerBuildFacility('fishery');
  if (e.code === 'Space') {
    e.preventDefault();
    triggerPlayerSkill();
  }
});

soundBtnEl.addEventListener('click', () => {
  const on = sfx.toggle();
  soundBtnEl.textContent = on ? '🔊' : '🔇';
});

restartBtnEl.addEventListener('click', () => {
  modalOverlayEl.classList.add('hidden');
  loadStage(state.stageIndex, state.editorOpen);
});

function showModal({ badge, title, desc, buttonText, onAction }) {
  modalBadgeEl.textContent = badge;
  modalTitleEl.textContent = title;
  modalDescEl.innerHTML = desc;
  modalActionBtn.textContent = buttonText;
  modalOverlayEl.classList.remove('hidden');

  modalActionBtn.onclick = () => {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    onAction();
  };
}

modalActionBtn.onclick = () => {
  sfx.init();
  modalOverlayEl.classList.add('hidden');
  loadStage(state.stageIndex, false);
};

function updateHud() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;

  const aliveOrPending = Math.max(0, state.totalStageEnemies - state.defeatedStageEnemies);
  waveTextEl.textContent = `웨이브 ${state.waveIndex + 1}/${stageData.waves.length}`;
  enemyCountTextEl.textContent = `적 ${aliveOrPending}`;

  const progressPct =
    state.totalStageEnemies > 0
      ? Math.min(100, Math.round((state.defeatedStageEnemies / state.totalStageEnemies) * 100))
      : 0;
  waveProgressFillEl.style.width = `${progressPct}%`;

  castleHpTextEl.textContent = `${Math.max(0, Math.ceil(state.castleHp))}/${state.castleMaxHp}`;
  castleHpFillEl.style.width = `${Math.max(0, (state.castleHp / state.castleMaxHp) * 100)}%`;

  if (state.player) {
    playerHpTextEl.textContent = `${Math.max(0, Math.ceil(state.player.hp))}/${state.player.maxHp}`;
    playerHpFillEl.style.width = `${Math.max(0, (state.player.hp / state.player.maxHp) * 100)}%`;

    if (state.player.skillTimer > 0) {
      skillBtnEl.classList.add('cooldown');
      skillStatusEl.textContent = `충격파 ${state.player.skillTimer.toFixed(1)}s`;
    } else {
      skillBtnEl.classList.remove('cooldown');
      skillStatusEl.textContent = '황금 충격파';
    }
  }

  coinCountEl.textContent = `${state.coins}`;

  // 🏛️ 상단 문명 단계 & 식량/인구(12명 사냥 한계 표시)/세금/동맹 현황 및 하단 시설·발전 버튼 업데이트
  const curStepDef = kingdomDomain.getCurrentStepDef();
  const nextStepDef = kingdomDomain.getNextStepDef();
  const effMaxPop = kingdomDomain.getEffectiveMaxPopulation();
  const netFood = kingdomDomain.getNetFoodPerSec();
  const netFoodStr = netFood >= 0 ? `+${netFood}/s` : `${netFood}/s`;
  const huntCapTag = kingdomDomain.isRelyingOnlyOnHunting() ? '(사냥한계12)' : `(체계화x${kingdomDomain.getAgriFishMultiplier()})`;

  if (kdStageBadgeEl && curStepDef) {
    kdStageBadgeEl.textContent = curStepDef.badge;
  }
  if (kdEconTextEl) {
    kdEconTextEl.textContent = `🍖${kingdomDomain.food}(${netFoodStr}) · 👥${kingdomDomain.population}/${effMaxPop}명${huntCapTag} · 🪙세금+${kingdomDomain.getTaxPerCycle()}`;
  }

  // 🏠 집 / 🌾 농사 / 🐟 어업 버튼 상태 갱신
  const updateFacBtn = (facId, btnEl, titleEl, costEl, labelPrefix, effectHint) => {
    if (!btnEl || !titleEl || !costEl) return;
    const lv = kingdomDomain.getFacilityLevel(facId);
    const cost = kingdomDomain.getFacilityNextCost(facId);
    const canAfford = state.coins >= cost.coins && kingdomDomain.food >= cost.food;
    btnEl.classList.toggle('can-afford', canAfford);
    titleEl.textContent = `${labelPrefix} Lv.${lv}`;
    costEl.textContent = `🪙${cost.coins}·🍖${cost.food} (${effectHint})`;
  };

  updateFacBtn('house', facHouseBtnEl, facHouseTitleEl, facHouseCostEl, '🏠 집', '+4명');
  updateFacBtn('farm', facFarmBtnEl, facFarmTitleEl, facFarmCostEl, '🌾 농사', '+식량');
  updateFacBtn('fishery', facFisheryBtnEl, facFisheryTitleEl, facFisheryCostEl, '🐟 어업', '+물고기');

  if (kdAdvanceBtnEl && kdNextTitleEl && kdNextCostEl) {
    const totalStages = KINGDOM_CONFIG.settlementChain.length;
    if (nextStepDef) {
      const reqPop = nextStepDef.reqPop || 0;
      const reqFoodFac = nextStepDef.reqFoodFacilityLevels || 0;
      const curFoodFac = kingdomDomain.getTotalFoodFacilityLevels();
      const canAfford =
        state.coins >= (nextStepDef.reqCoins || 0) &&
        kingdomDomain.food >= (nextStepDef.reqFood || 0) &&
        kingdomDomain.population >= reqPop &&
        curFoodFac >= reqFoodFac;
      kdAdvanceBtnEl.classList.toggle('ready', canAfford);
      kdAdvanceBtnEl.classList.remove('maxed');
      kdNextTitleEl.textContent = `${nextStepDef.shortLabel || nextStepDef.name} (${nextStepDef.step}/${totalStages})`;
      kdNextCostEl.textContent = `🪙${nextStepDef.reqCoins}·🍖${nextStepDef.reqFood}·👥${reqPop}·농/어Lv.${reqFoodFac}`;
    } else {
      kdAdvanceBtnEl.classList.remove('ready');
      kdAdvanceBtnEl.classList.add('maxed');
      kdNextTitleEl.textContent = `🏰 ${totalStages}단계 완성!`;
      kdNextCostEl.textContent = '🌱 우측상단 [무중단 확장] 가능';
    }
  }

  const selectedDef = TOWER_TYPES[state.selectedTower];
  state.pads.forEach((pad, idx) => {
    const labelEl = state.padLabels[idx];
    if (!labelEl) return;

    const anchor = pad.position.clone().setY(pad.level === 0 ? 2.05 : 3.1 + pad.level * 0.35);
    const screen = worldToScreen(anchor);
    if (!screen.visible) {
      labelEl.style.display = 'none';
      return;
    }
    labelEl.style.display = 'flex';
    labelEl.style.left = `${screen.x}px`;
    labelEl.style.top = `${screen.y}px`;

    const playerDist = state.player ? state.player.position.distanceTo(pad.position) : 999;
    const isStanding = state.mode === 'playing' && playerDist < 2.45;
    labelEl.classList.toggle('active-pad', isStanding);

    if (pad.level === 0) {
      const targetCost = pad.getCurrentTargetCost(state.selectedTower);
      const remaining = Math.max(0, targetCost - pad.investedCoins);
      labelEl.classList.toggle('can-afford', state.coins >= remaining);
      labelEl.classList.remove('maxed');
      labelEl.innerHTML = `<span class="pad-coin-icon">🪙</span><span>${remaining}</span><small style="opacity:0.85">${selectedDef.emoji}</small>`;
    } else if (pad.level < pad.maxLevel) {
      const towerDef = TOWER_TYPES[pad.towerType];
      const targetCost = pad.getCurrentTargetCost(pad.towerType);
      const remaining = Math.max(0, targetCost - pad.investedCoins);
      labelEl.classList.toggle('can-afford', state.coins >= remaining);
      labelEl.classList.remove('maxed');
      labelEl.innerHTML = `<span class="pad-coin-icon">${towerDef.emoji}</span><span>Lv.${pad.level} · 🪙${remaining}</span>`;
    } else {
      const towerDef = TOWER_TYPES[pad.towerType];
      labelEl.classList.remove('can-afford');
      labelEl.classList.add('maxed');
      labelEl.innerHTML = `<span>${towerDef.emoji} MAX</span>`;
    }
  });
}

// 메인 게임 업데이트 루프
let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const elapsed = now / 1000;

  // ComfyUI 모션 노드 스튜디오가 열려 있을 때 실시간 3D 동물 모션 프리뷰 렌더링
  if (comfyStudio.isOpen && comfyStudio.renderer && comfyStudio.rig) {
    animateAnimalRig(comfyStudio.rig, comfyStudio.selectedAnimal, elapsed, 0);
    comfyStudio.turntable.rotation.y = elapsed * 0.65;
    comfyStudio.renderer.render(comfyStudio.scene, comfyStudio.camera);
  }

  if (state.mode === 'playing' && state.player && state.world) {
    updateGroundRaycastFromMouse();

    state.player.update(dt, elapsed);

    const camOffset = state.editorOpen ? EDITOR_CAMERA_OFFSET : PLAY_CAMERA_OFFSET;
    const targetCamFocus = state.editorOpen
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(
          THREE.MathUtils.clamp(state.player.position.x, -26, 26),
          0,
          THREE.MathUtils.clamp(state.player.position.z, -16, 16)
        );
    cameraFocus.lerp(targetCamFocus, Math.min(1, 7.5 * dt));
    camera.position.copy(cameraFocus).add(camOffset);
    camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);

    if (state.world.citadel && state.world.citadel.emblem) {
      state.world.citadel.emblem.rotation.y = elapsed * 1.8;
    }

    state.waveTimer += dt;
    const stageMultiplier = 1 + state.stageIndex * 0.22;
    for (const item of state.spawnQueue) {
      if (!item.spawned && state.waveTimer >= item.spawnTime) {
        item.spawned = true;
        const enemy = new RedEnemy(scene, item.type, state.world.roadCurve, stageMultiplier);
        state.enemies.push(enemy);
      }
    }

    const allSpawned = state.spawnQueue.every((q) => q.spawned);
    const stageData = STAGES[state.stageIndex];
    if (
      allSpawned &&
      state.enemies.length === 0 &&
      state.waveIndex < stageData.waves.length - 1
    ) {
      prepareWave(state.waveIndex + 1);
    }

    if (state.player.attackTimer <= 0 && state.enemies.length > 0) {
      let nearest = null;
      let minDist = state.player.attackRange;
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.reachedCastle) continue;
        const d = enemy.position.distanceTo(state.player.position);
        if (d <= minDist) {
          minDist = d;
          nearest = enemy;
        }
      }

      if (nearest) {
        state.player.attackTimer = state.player.attackInterval;
        state.player.faceToward(nearest.position);
        state.player.triggerSwing();
        sfx.playSlash();

        const combatMult = kingdomDomain.getCombatMultiplier();
        spawnRingEffect(state.player.position, state.player.attackRange * 0.85, 0x60a5fa, 0.18);
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.reachedCastle) continue;
          if (enemy.position.distanceTo(state.player.position) <= state.player.attackRange) {
            damageEnemy(enemy, Math.round(state.player.attackDamage * combatMult), '#93c5fd');
          }
        }
      }
    }

    // 🌲 건국 문명 도메인 업데이트 (숲 사냥 · 유민 구출 · 농사 식량 · 시장/무역소 세금 징수 · 성곽 수비)
    kingdomDomain.update(dt, elapsed, {
      playerPos: state.player.position,
      enemies: state.enemies,
      onGrantCoins: (amount) => {
        state.coins += amount;
      },
      onFloatingText: spawnFloatingText,
      onHitEnemy: (enemy, dmg, color) => {
        damageEnemy(enemy, dmg, color);
      },
    });

    // 🌐 실시간 멀티플레이어 & 협동 영주 동기화 업데이트
    mpNetwork.update(dt, elapsed, {
      playerPos: state.player.position,
      kingdomSnapshot: kingdomDomain.getSnapshot(),
      enemies: state.enemies,
      wildPreys: kingdomDomain.wildPreys,
      survivors: kingdomDomain.survivors,
      onHitEnemy: (enemy, dmg, color) => damageEnemy(enemy, dmg, color),
      onHitPrey: (prey, dmg) => {
        if (prey.dead) return;
        const killed = prey.takeDamage(dmg);
        if (killed) {
          kingdomDomain.food += 18;
          state.coins += 12;
          spawnFloatingText(prey.position.clone().setY(2.0), '🏹 동맹 사냥! 🍖+18 · 🪙+12', '#6ee7b7');
        }
      },
      worldToScreen,
    });

    // 🛡️ 무중단 업데이트 가드: 주기적으로 활성 플레이 상태 스냅샷 저장
    liveSessionSaveTimer += dt;
    if (liveSessionSaveTimer >= 2.0) {
      liveSessionSaveTimer = 0;
      saveLiveSessionSnapshot(state, kingdomDomain);
    }

    for (const pad of state.pads) {
      pad.update(dt, elapsed);

      const distToPlayer = pad.position.distanceTo(state.player.position);
      if (distToPlayer < 2.45 && pad.level < pad.maxLevel && pad.feedCooldown <= 0) {
        const targetCost = pad.getCurrentTargetCost(
          pad.level === 0 ? state.selectedTower : pad.towerType
        );
        const needed = targetCost - pad.investedCoins;

        if (needed > 0 && state.coins > 0) {
          const stepCoin = Math.min(5, needed, state.coins);
          state.coins -= stepCoin;
          pad.investedCoins += stepCoin;
          pad.feedCooldown = 0.065;

          sfx.playCoinFeed();
          spawnCoinFeedArc(state.player.position, pad.position);

          if (pad.investedCoins >= targetCost) {
            const buildType = pad.level === 0 ? state.selectedTower : pad.towerType;
            pad.constructOrUpgrade(buildType);
            sfx.playTowerBuilt();
            spawnRingEffect(pad.position, 2.8, 0x4ade80, 0.35);
            const tDef = TOWER_TYPES[pad.towerType];
            spawnFloatingText(
              pad.position.clone().setY(3.2),
              `${tDef.emoji} ${tDef.name} Lv.${pad.level}!`,
              '#4ade80'
            );
          }
        }
      }

      if (pad.level > 0 && pad.fireTimer <= 0 && state.enemies.length > 0) {
        const stats = pad.getStats();
        let bestEnemy = null;
        let maxProgress = -1;

        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.reachedCastle) continue;
          const d = enemy.position.distanceTo(pad.position);
          if (d <= stats.range && enemy.progress > maxProgress) {
            maxProgress = enemy.progress;
            bestEnemy = enemy;
          }
        }

        if (bestEnemy) {
          pad.fireTimer = stats.fireRate;
          if (pad.turretHead) {
            pad.turretHead.lookAt(
              bestEnemy.position.x,
              pad.turretHead.getWorldPosition(new THREE.Vector3()).y,
              bestEnemy.position.z
            );
          }
          sfx.playTowerShot(stats.id);
          const muzzlePos = pad.position.clone().setY(2.4 + pad.level * 0.3);
          state.projectiles.push(new TowerProjectile(scene, muzzlePos, bestEnemy, stats));
        }
      }
    }

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      proj.update(dt);
      if (proj.hit) {
        const st = proj.stats;
        if (st.id === 'cannon') {
          spawnRingEffect(proj.position, st.splashRadius, 0xf97316, 0.26);
          for (const enemy of state.enemies) {
            if (enemy.dead || enemy.reachedCastle) continue;
            if (enemy.position.distanceTo(proj.position) <= st.splashRadius) {
              damageEnemy(enemy, st.damage, '#fb923c');
            }
          }
        } else if (st.id === 'wall') {
          const splash = st.splashRadius || 2.5;
          spawnRingEffect(proj.position, splash, 0xfacc15, 0.28);
          for (const enemy of state.enemies) {
            if (enemy.dead || enemy.reachedCastle) continue;
            if (enemy.position.distanceTo(proj.position) <= splash) {
              enemy.applySlow(st.slowFactor || 0.45, st.slowDuration || 2.4);
              damageEnemy(enemy, st.damage, '#fde047');
            }
          }
        } else if (st.id === 'frost') {
          spawnRingEffect(proj.position, 1.8, 0x38bdf8, 0.22);
          if (proj.targetEnemy && !proj.targetEnemy.dead) {
            proj.targetEnemy.applySlow(st.slowFactor, st.slowDuration);
            damageEnemy(proj.targetEnemy, st.damage, '#7dd3fc');
          }
        } else {
          if (proj.targetEnemy && !proj.targetEnemy.dead) {
            damageEnemy(proj.targetEnemy, st.damage, '#fde047');
          }
        }
        proj.destroy();
        state.projectiles.splice(i, 1);
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemy.update(dt, elapsed, camera.position);

      if (!enemy.dead && !enemy.reachedCastle) {
        const dPlayer = enemy.position.distanceTo(state.player.position);
        if (dPlayer < 1.25 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1.1;
          state.player.hp = Math.max(0, state.player.hp - enemy.playerDamage);
          spawnFloatingText(
            state.player.position.clone().setY(2.2),
            `-${enemy.playerDamage}`,
            '#f87171'
          );

          if (state.player.hp <= 0) {
            state.player.hp = state.player.maxHp;
            state.player.position.set(0, 0, 0);
            state.player.targetPos.set(0, 0, 0);
            state.player.velocity.set(0, 0, 0);
            spawnFloatingText(
              state.player.position.clone().setY(2.4),
              '🛡️ 수비대장 재정비!',
              '#60a5fa'
            );
          }
        }
      }

      if (enemy.reachedCastle) {
        state.castleHp = Math.max(0, state.castleHp - enemy.castleDamage);
        state.defeatedStageEnemies += 1;
        sfx.playCastleHit();
        spawnRingEffect(state.world.endPt, 3.2, 0xef4444, 0.35);
        spawnFloatingText(
          state.world.endPt.clone().setY(3.5),
          `🏰 성채 -${enemy.castleDamage}!`,
          '#ef4444'
        );
        enemy.destroy();
        state.enemies.splice(i, 1);
        continue;
      }

      if (enemy.dead) {
        enemy.destroy();
        state.enemies.splice(i, 1);
      }
    }

    for (let i = state.coinsList.length - 1; i >= 0; i--) {
      const coin = state.coinsList[i];
      coin.update(dt, state.player.position);
      if (coin.collected) {
        state.coins += coin.value;
        sfx.playCoinPickup();
        spawnFloatingText(
          state.player.position.clone().setY(2.1),
          `+🪙${coin.value}`,
          '#fde047'
        );
        coin.destroy();
        state.coinsList.splice(i, 1);
      }
    }

    for (let i = state.effects.length - 1; i >= 0; i--) {
      const done = state.effects[i].update(dt);
      if (done) {
        scene.remove(state.effects[i].mesh);
        state.effects.splice(i, 1);
      }
    }

    if (state.castleHp <= 0) {
      state.mode = 'defeat';
      showModal({
        badge: `STAGE ${state.stageIndex + 1} DEFEAT`,
        title: '🏰 성채가 함락되었습니다!',
        desc: '야수 군단과 적 무리가 성문을 돌파했습니다.<br/>건설 구역에 방어탑을 더 빠르게 배치하고 황금 충격파를 활용해 다시 도전해 보세요!',
        buttonText: `STAGE ${state.stageIndex + 1} 다시 도전하기`,
        onAction: () => loadStage(state.stageIndex, false),
      });
    } else if (
      state.defeatedStageEnemies >= state.totalStageEnemies &&
      state.enemies.length === 0
    ) {
      state.coinsList.forEach((c) => {
        state.coins += c.value;
        c.destroy();
      });
      state.coinsList = [];

      sfx.playStageClear();

      if (state.stageIndex < STAGES.length - 1) {
        state.mode = 'stage_clear';
        const nextStage = STAGES[state.stageIndex + 1];
        showModal({
          badge: `STAGE ${state.stageIndex + 1} CLEAR!`,
          title: `🎉 ${STAGES[state.stageIndex].name} 방어 성공!`,
          desc: `주인공과 방어탑의 활약으로 코끼리·하마·기린 야수 군단을 모두 물리쳤습니다!<br/>다음 전장: <strong>STAGE ${state.stageIndex + 2} - ${nextStage.name}</strong>`,
          buttonText: `다음 스테이지 출격 (STAGE ${state.stageIndex + 2})`,
          onAction: () => loadStage(state.stageIndex + 1, false),
        });
      } else {
        state.mode = 'victory';
        showModal({
          badge: `ALL ${STAGES.length} STAGES CLEARED · VICTORY!`,
          title: '👑 코인 수비대 최종 승리!',
          desc: `총 ${STAGES.length}개 스테이지의 모든 야수 군단과 군단 대장을 완벽히 물리치고 왕국의 성채를 지켜냈습니다!`,
          buttonText: 'STAGE 1부터 다시 플레이',
          onAction: () => loadStage(0, false),
        });
      }
    }

    updateHud();
  }

  renderer.render(scene, camera);
}

loadStage(0, false);

// 🛡️ 무중단 업데이트(Zero-Downtime Live Reload) 세션 복원 검사:
// 플레이 도중 코드/세계관 업데이트나 리로드가 발생했을 때 인트로 모달로 끊기지 않고 즉시 전투 및 마을 상태를 이어서 복원
const savedSession = loadLiveSessionSnapshot();
if (savedSession && typeof savedSession.stageIndex === 'number') {
  if (savedSession.kingdom) {
    kingdomDomain.applySnapshot(savedSession.kingdom);
  }
  loadStage(savedSession.stageIndex, false);
  state.coins = savedSession.coins ?? state.coins;
  state.castleMaxHp = savedSession.castleMaxHp ?? state.castleMaxHp;
  state.castleHp = savedSession.castleHp ?? state.castleHp;
  if (typeof savedSession.waveIndex === 'number' && savedSession.waveIndex > 0) {
    prepareWave(savedSession.waveIndex);
  }
  if (Array.isArray(savedSession.padsState)) {
    savedSession.padsState.forEach((ps, idx) => {
      const pad = state.pads[idx];
      if (pad && ps && ps.level > 0 && ps.towerType) {
        for (let lv = 0; lv < ps.level; lv++) {
          pad.constructOrUpgrade(ps.towerType);
        }
        pad.investedCoins = ps.investedCoins || 0;
      }
    });
  }
  if (savedSession.playerPos && state.player) {
    state.player.position.set(savedSession.playerPos.x || 0, 0, savedSession.playerPos.z || 0);
    state.player.targetPos.copy(state.player.position);
  }
  state.mode = 'playing';
  modalOverlayEl.classList.add('hidden');
  updateHud();
  showBanner('🛡️ 무중단 업데이트 복원 완료', '진행 중이던 마을·타워·세금 상태가 초기화 없이 그대로 이어집니다!', 2200);
} else {
  state.mode = 'intro';
  modalOverlayEl.classList.remove('hidden');
}

window.addEventListener('beforeunload', () => {
  saveLiveSessionSnapshot(state, kingdomDomain);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    saveLiveSessionSnapshot(state, kingdomDomain);
  });
}

requestAnimationFrame(gameLoop);

import * as THREE from 'three';
import {
  STAGES,
  TOWER_TYPES,
  PROP_CATALOG,
  saveStages,
  setStagesList,
  resetStagesToDefault,
  createNewStageTemplate,
} from './stages.js';
import { buildStageWorld, createTerrainPropMesh, MAP_BOUNDS } from './world.js';
import { PlayerHero, BuildPad, RedEnemy, DroppedCoin, TowerProjectile } from './entities.js';
import { sfx } from './audio.js';

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

const centerBannerEl = document.getElementById('center-banner');
const bannerSubEl = document.getElementById('banner-subtitle');
const bannerTitleEl = document.getElementById('banner-title');

const combatDockEl = document.getElementById('combat-dock');
const editorDockEl = document.getElementById('editor-dock');
const editorTopbarEl = document.getElementById('editor-topbar');
const editorBtnEl = document.getElementById('btn-editor');

const edStageNameInput = document.getElementById('ed-stage-name');
const edStartCoinsInput = document.getElementById('ed-start-coins');
const edCastleHpInput = document.getElementById('ed-castle-hp');
const edAddStageBtn = document.getElementById('btn-ed-add-stage');
const edDelStageBtn = document.getElementById('btn-ed-del-stage');
const edResetAllBtn = document.getElementById('btn-ed-reset-all');
const edPlayBtn = document.getElementById('btn-ed-play');

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

// 위에서 비스듬히 내려다보는 아이소메트릭 시점 카메라
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
  brush: 'forest', // 'forest' | 'rock' | 'lake' | 'river' | 'mountain' | 'signpost' | 'pad' | 'erase'
  scaleIdx: 1,
  rotation: 0,
  previewGroup: new THREE.Group(),
};
scene.add(editorState.previewGroup);

// 게임 상태 관리
const state = {
  mode: 'intro', // 'intro' | 'playing' | 'editor' | 'stage_clear' | 'victory' | 'defeat'
  stageIndex: 0,
  coins: 75,
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
    const keepEditor = state.mode === 'editor';
    loadStage(idx, keepEditor);
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

// 스테이지 로드 및 초기화
function loadStage(stageIndex, enterEditor = false) {
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

  // 3D 월드 생성
  state.world = buildStageWorld(scene, stageData);

  // 플레이어 스폰
  state.player = new PlayerHero(scene, 0, 0);
  cameraFocus.copy(state.player.position);
  camera.position.copy(cameraFocus).add(PLAY_CAMERA_OFFSET);
  camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);

  // 건설 구역 생성
  rebuildPadsForCurrentStage();
  refreshStageSelectUI();

  if (enterEditor) {
    setEditorMode(true);
  } else {
    setEditorMode(false);
    prepareWave(0);
    state.mode = 'playing';
    showBanner(`STAGE ${state.stageIndex + 1}`, `${stageData.name} 방어 시작!`);
  }
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
    showBanner(`STAGE ${stageData.id}`, `웨이브 ${waveIdx + 1} 몰려옵니다!`, 1500);
  }
}

// ==========================================================
// 인게임 3D 스테이지 & 지형물 에디터 로직
// ==========================================================

function rebuildEditorGhostPreview() {
  while (editorState.previewGroup.children.length > 0) {
    editorState.previewGroup.remove(editorState.previewGroup.children[0]);
  }
  if (state.mode !== 'editor') {
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
      new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: false, transparent: true, opacity: 0.7 })
    );
    padPreview.position.y = 0.14;
    editorState.previewGroup.add(padPreview);
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

function setEditorMode(enabled) {
  if (enabled) {
    state.mode = 'editor';
    // 에디터 진입 시 현재 스폰된 적과 발사체 정리
    state.enemies.forEach((e) => e.destroy());
    state.enemies = [];
    state.projectiles.forEach((p) => p.destroy());
    state.projectiles = [];
    state.coinsList.forEach((c) => c.destroy());
    state.coinsList = [];

    editorBtnEl.classList.add('active');
    editorTopbarEl.classList.remove('hidden');
    editorDockEl.classList.remove('hidden');
    combatDockEl.classList.add('hidden');
    if (state.player) state.player.targetMarker.visible = false;

    rebuildEditorGhostPreview();
    showBanner('🛠️ 스테이지 & 지형 에디터', '클릭: 지형물 배치 · 우클릭/삭제브러시: 지형물 삭제', 2200);
  } else {
    editorBtnEl.classList.remove('active');
    editorTopbarEl.classList.add('hidden');
    editorDockEl.classList.add('hidden');
    combatDockEl.classList.remove('hidden');
    editorState.previewGroup.visible = false;
    if (state.player) state.player.targetMarker.visible = true;
  }
}

editorBtnEl.addEventListener('click', () => {
  if (state.mode === 'intro') {
    modalOverlayEl.classList.add('hidden');
  }
  if (state.mode === 'editor') {
    loadStage(state.stageIndex, false);
  } else {
    loadStage(state.stageIndex, true);
  }
});

edPlayBtn.addEventListener('click', () => {
  loadStage(state.stageIndex, false);
});

// 에디터 브러시 선택
document.querySelectorAll('.brush-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    editorState.brush = btn.dataset.brush;
    document.querySelectorAll('.brush-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    rebuildEditorGhostPreview();
  });
});

// 크기 변경 버튼
edScaleBtn.addEventListener('click', () => {
  editorState.scaleIdx = (editorState.scaleIdx + 1) % SCALE_PRESETS.length;
  const s = SCALE_PRESETS[editorState.scaleIdx];
  edScaleBtn.textContent = `크기: ${s}x`;
  rebuildEditorGhostPreview();
});

// 회전 버튼
function rotateEditorBrush() {
  editorState.rotation = (editorState.rotation + Math.PI / 4) % (Math.PI * 2);
  rebuildEditorGhostPreview();
}
edRotateBtn.addEventListener('click', rotateEditorBrush);

// 현재 스테이지 모든 지형물 비우기
edClearPropsBtn.addEventListener('click', () => {
  const stageData = STAGES[state.stageIndex];
  stageData.props = [];
  saveStages(STAGES);
  loadStage(state.stageIndex, true);
  showBanner('지형물 초기화', '현재 스테이지의 지형물을 모두 비웠습니다.', 1400);
});

// 스테이지 메타 정보(이름, 시작 코인, 성채 체력) 실시간 수정 반영
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

// 새 스테이지 추가
edAddStageBtn.addEventListener('click', () => {
  const newStage = createNewStageTemplate(STAGES.length + 1);
  STAGES.push(newStage);
  saveStages(STAGES);
  loadStage(STAGES.length - 1, true);
  showBanner('스테이지 추가 완료', `STAGE ${STAGES.length} (${newStage.name}) 생성됨!`, 1800);
});

// 현재 스테이지 삭제
edDelStageBtn.addEventListener('click', () => {
  if (STAGES.length <= 1) {
    showBanner('삭제 불가', '최소 1개의 스테이지는 남아있어야 합니다.', 1600);
    return;
  }
  const removedName = STAGES[state.stageIndex].name;
  STAGES.splice(state.stageIndex, 1);
  saveStages(STAGES);
  const nextIdx = Math.max(0, state.stageIndex - 1);
  loadStage(nextIdx, true);
  showBanner('스테이지 삭제됨', `'${removedName}' 스테이지가 삭제되었습니다.`, 1600);
});

// 모든 스테이지 & 지형물 기본값 복원
edResetAllBtn.addEventListener('click', () => {
  const defaults = resetStagesToDefault();
  setStagesList(defaults);
  loadStage(0, true);
  showBanner('기본값 복원 완료', '기본 3개 스테이지와 지형물로 복원되었습니다.', 1800);
});

// 에디터에서 지형물/건설구역 삭제 헬퍼
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

// 에디터에서 캔버스 클릭 시 지형물/건설구역 배치 또는 삭제
function handleEditorCanvasClick(worldPt, isRightClick = false) {
  const stageData = STAGES[state.stageIndex];
  const x = Math.round(THREE.MathUtils.clamp(worldPt.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX) * 10) / 10;
  const z = Math.round(THREE.MathUtils.clamp(worldPt.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ) * 10) / 10;
  const targetVec = new THREE.Vector3(x, 0, z);

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

  // 지형물(숲, 바위, 호수, 강, 산, 이정표) 배치
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

// 마우스 지면 레이캐스팅
function updateGroundRaycastFromMouse() {
  if (!hasMouseMoved || !state.world) return;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(state.world.raycastPlane);
  if (hits.length > 0) {
    currentGroundHit.copy(hits[0].point);
    if (state.mode === 'playing' && state.player) {
      state.player.setMoveTarget(currentGroundHit);
    } else if (state.mode === 'editor') {
      editorState.previewGroup.position.set(
        THREE.MathUtils.clamp(currentGroundHit.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
        0,
        THREE.MathUtils.clamp(currentGroundHit.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ)
      );
    }
  }
}

// 마우스 이벤트 바인딩
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
  const rect = canvasEl.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  hasMouseMoved = true;
  updateGroundRaycastFromMouse();

  if (state.mode === 'editor') {
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

// 타워 종류 선택 UI 및 단축키
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

skillBtnEl.addEventListener('click', () => {
  triggerPlayerSkill();
});

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

  if (state.mode === 'editor') {
    if (e.key === 'r' || e.key === 'R') {
      rotateEditorBrush();
    }
    return;
  }

  if (e.key === '1') selectTowerType('crossbow');
  if (e.key === '2') selectTowerType('cannon');
  if (e.key === '3') selectTowerType('frost');
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
  if (state.mode === 'intro') return;
  loadStage(state.stageIndex, state.mode === 'editor');
});

// 모달 제어
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

// 초기 시작 모달 버튼
modalActionBtn.onclick = () => {
  sfx.init();
  modalOverlayEl.classList.add('hidden');
  loadStage(0, false);
};

// HUD 및 건설 구역 3D 라벨 업데이트
function updateHud() {
  const stageData = STAGES[state.stageIndex];
  if (!stageData) return;

  const aliveOrPending = Math.max(0, state.totalStageEnemies - state.defeatedStageEnemies);
  waveTextEl.textContent =
    state.mode === 'editor'
      ? `에디터 모드 (지형물 ${(stageData.props || []).length}개)`
      : `웨이브 ${state.waveIndex + 1}/${stageData.waves.length}`;
  enemyCountTextEl.textContent = `적 ${aliveOrPending}`;

  const progressPct =
    state.totalStageEnemies > 0
      ? Math.min(100, Math.round((state.defeatedStageEnemies / state.totalStageEnemies) * 100))
      : 0;
  waveProgressFillEl.style.width = `${progressPct}%`;

  // 성채 HP
  castleHpTextEl.textContent = `${Math.max(0, Math.ceil(state.castleHp))}/${state.castleMaxHp}`;
  castleHpFillEl.style.width = `${Math.max(0, (state.castleHp / state.castleMaxHp) * 100)}%`;

  // 플레이어 HP
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

  // 건설 구역 위 코인 비용 배지 위치 및 텍스트 동기화
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

  if (state.mode === 'editor' && state.world) {
    updateGroundRaycastFromMouse();

    // 에디터 모드에서는 전장 전체가 한눈에 들어오도록 중앙 조망 카메라 유지
    cameraFocus.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, 6 * dt));
    camera.position.lerp(
      new THREE.Vector3().copy(cameraFocus).add(EDITOR_CAMERA_OFFSET),
      Math.min(1, 6 * dt)
    );
    camera.lookAt(cameraFocus.x, 0, cameraFocus.z);

    state.pads.forEach((p) => p.update(dt, elapsed));
    for (let i = state.effects.length - 1; i >= 0; i--) {
      if (state.effects[i].update(dt)) {
        scene.remove(state.effects[i].mesh);
        state.effects.splice(i, 1);
      }
    }
    updateHud();
  } else if (state.mode === 'playing' && state.player && state.world) {
    updateGroundRaycastFromMouse();

    // 1. 플레이어 이동 업데이트
    state.player.update(dt, elapsed);

    // 2. 아이소메트릭 카메라가 플레이어를 부드럽게 추적 (플레이어를 항상 화면 중심 부근에 유지)
    const targetCamFocus = new THREE.Vector3(
      THREE.MathUtils.clamp(state.player.position.x, -26, 26),
      0,
      THREE.MathUtils.clamp(state.player.position.z, -16, 16)
    );
    cameraFocus.lerp(targetCamFocus, Math.min(1, 7.5 * dt));
    camera.position.copy(cameraFocus).add(PLAY_CAMERA_OFFSET);
    camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);

    // 성채 황금 코인 엠블럼 회전
    if (state.world.citadel && state.world.citadel.emblem) {
      state.world.citadel.emblem.rotation.y = elapsed * 1.8;
    }

    // 3. 웨이브 적 스폰 관리
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

    // 4. 플레이어 자동 근접 공격
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

        spawnRingEffect(state.player.position, state.player.attackRange * 0.85, 0x60a5fa, 0.18);
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.reachedCastle) continue;
          if (enemy.position.distanceTo(state.player.position) <= state.player.attackRange) {
            damageEnemy(enemy, state.player.attackDamage, '#93c5fd');
          }
        }
      }
    }

    // 5. 건설 구역 코인 투입 및 방어탑 사격 업데이트
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

      // 설치된 방어탑의 자동 사격
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

    // 6. 방어탑 발사체 업데이트
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

    // 7. 적 무리 이동 및 성채/플레이어 충돌 체크
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

    // 8. 드롭된 코인 수집 업데이트
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

    // 9. 시각 이펙트 업데이트
    for (let i = state.effects.length - 1; i >= 0; i--) {
      const done = state.effects[i].update(dt);
      if (done) {
        scene.remove(state.effects[i].mesh);
        state.effects.splice(i, 1);
      }
    }

    // 10. 성채 함락(패배) 또는 스테이지 클리어 판정
    if (state.castleHp <= 0) {
      state.mode = 'defeat';
      showModal({
        badge: `STAGE ${state.stageIndex + 1} DEFEAT`,
        title: '🏰 성채가 함락되었습니다!',
        desc: '붉은 적 무리가 성문을 돌파했습니다.<br/>건설 구역에 방어탑을 더 빠르게 배치하고 황금 충격파를 활용해 다시 도전해 보세요!',
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
          desc: `주인공과 방어탑의 활약으로 붉은 적 무리를 모두 물리쳤습니다!<br/>다음 전장: <strong>STAGE ${state.stageIndex + 2} - ${nextStage.name}</strong>`,
          buttonText: `다음 스테이지 출격 (STAGE ${state.stageIndex + 2})`,
          onAction: () => loadStage(state.stageIndex + 1, false),
        });
      } else {
        state.mode = 'victory';
        showModal({
          badge: `ALL ${STAGES.length} STAGES CLEARED · VICTORY!`,
          title: '👑 코인 수비대 최종 승리!',
          desc: `총 ${STAGES.length}개 스테이지의 모든 붉은 적 무리와 군단 대장을 완벽히 물리치고 왕국의 성채를 지켜냈습니다!<br/>상단 <strong>🛠️ 에디터</strong>에서 새로운 스테이지나 지형물을 직접 추가해 즐길 수도 있습니다!`,
          buttonText: 'STAGE 1부터 다시 플레이',
          onAction: () => loadStage(0, false),
        });
      }
    }

    updateHud();
  }

  renderer.render(scene, camera);
}

// 초기 배경 프리뷰를 위해 Stage 1 월드를 먼저 렌더링하고 시작 모달을 띄움
loadStage(0, false);
state.mode = 'intro';
modalOverlayEl.classList.remove('hidden');
requestAnimationFrame(gameLoop);

import * as THREE from 'three';
import { STAGES } from './stages.js';
import { MAP_BOUNDS } from './world.js';
import { sfx } from './audio.js';
import { eventBus } from './core/eventBus.js';
import { showBanner, createVfxController } from './core/vfxManager.js';
import { saveLiveSessionSnapshot, applyZeroDowntimeWorldPatch, restoreOrInitLiveSession } from './core/liveReloadGuard.js';
import { KingdomDomainManager } from './domains/kingdomDomain.js';
import { createCombatSystem } from './domains/combatSystem.js';
import { createStageLoader } from './domains/stageLoader.js';
import { MultiplayerNetworkManager } from './network/multiplayerClient.js';
import { createHudController } from './ui/hudController.js';
import { createComfyStudioUI } from './ui/comfyStudioUI.js';
import { createStageEditorController } from './ui/stageEditorController.js';
import { createMapWaveEditorUI } from './ui/mapWaveEditorUI.js';

const viewportEl = document.getElementById('game-viewport');
const canvasEl = document.getElementById('game-canvas');
const worldLabelsEl = document.getElementById('world-labels');
const stageSelectEl = document.getElementById('stage-select');
const modalOverlayEl = document.getElementById('modal-overlay');

const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
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

scene.add(new THREE.HemisphereLight(0xfffbeb, 0x3f6212, 0.95));
const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
dirLight.position.set(22, 42, 26);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
Object.assign(dirLight.shadow.camera, { near: 5, far: 120, left: -40, right: 40, top: 40, bottom: -40 });
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
const currentGroundHit = new THREE.Vector3(0, 0, 0);
let hasMouseMoved = false;

const editorState = {
  brush: 'forest',
  scaleIdx: 1,
  rotation: 0,
  previewGroup: new THREE.Group(),
  waypointMarkersGroup: new THREE.Group(),
  mapWaveOpen: false,
};
scene.add(editorState.previewGroup, editorState.waypointMarkersGroup);

const state = {
  mode: 'intro',
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

const vfx = createVfxController(scene, camera, viewportEl, worldLabelsEl, state);
const kingdomDomain = new KingdomDomainManager(scene);
const mpNetwork = new MultiplayerNetworkManager(scene, worldLabelsEl);
const hud = createHudController({ state, kingdomDomain, mpNetwork, vfx });

let combat = null;
let stageEditor = null;
let mapWaveEditor = null;

const loader = createStageLoader({
  scene, camera, cameraFocus, playCameraOffset: PLAY_CAMERA_OFFSET, worldLabelsEl,
  state, editorState, kingdomDomain, mpNetwork,
  getCombat: () => combat, getHud: () => hud, getStageEditor: () => stageEditor, getMapWaveEditor: () => mapWaveEditor,
});
combat = createCombatSystem({ scene, camera, state, kingdomDomain, vfx, loadStage: loader.loadStage });
const comfyUI = createComfyStudioUI({ scene, state, loadStage: loader.loadStage, updateHud: hud.updateHud });
stageEditor = createStageEditorController({
  state, editorState, vfx,
  rebuildStageWorldInPlace: loader.rebuildStageWorldInPlace,
  rebuildPadsForCurrentStage: loader.rebuildPadsForCurrentStage,
  refreshStageSelectUI: loader.refreshStageSelectUI,
  loadStage: loader.loadStage, updateHud: hud.updateHud, getMapWaveEditor: () => mapWaveEditor,
});
mapWaveEditor = createMapWaveEditorUI({
  state, editorState, comfyUI,
  rebuildStageWorldInPlace: loader.rebuildStageWorldInPlace,
  rebuildPadsForCurrentStage: loader.rebuildPadsForCurrentStage,
  recalculateTotalStageEnemies: loader.recalculateTotalStageEnemies,
  prepareWave: combat.prepareWave, loadStage: loader.loadStage,
  setEditorMode: stageEditor.setEditorMode, updateHud: hud.updateHud,
});

function handleResize() {
  const rect = viewportEl.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(180, Math.round(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', handleResize);
new ResizeObserver(handleResize).observe(viewportEl);
handleResize();

function updateGroundRaycastFromMouse() {
  if (!hasMouseMoved || !state.world) return;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(state.world.raycastPlane);
  if (hits.length === 0) return;
  currentGroundHit.copy(hits[0].point);
  if (state.mode === 'playing' && state.player && !comfyUI.isOpen && !editorState.mapWaveOpen) {
    state.player.setMoveTarget(currentGroundHit);
  }
  if (state.editorOpen) {
    editorState.previewGroup.position.set(
      THREE.MathUtils.clamp(currentGroundHit.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX), 0,
      THREE.MathUtils.clamp(currentGroundHit.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ)
    );
  }
}

viewportEl.addEventListener('pointermove', (e) => {
  const rect = canvasEl.getBoundingClientRect();
  mouseNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  hasMouseMoved = true;
  updateGroundRaycastFromMouse();
});
canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
canvasEl.addEventListener('pointerdown', (e) => {
  if (comfyUI.isOpen || editorState.mapWaveOpen) return;
  if (state.editorOpen) return stageEditor.handleEditorCanvasClick(currentGroundHit, e.button === 2);
  if (e.button === 0 && state.mode === 'playing') combat.triggerPlayerSkill();
});

stageSelectEl.addEventListener('change', () => {
  const idx = parseInt(stageSelectEl.value, 10);
  if (STAGES[idx]) {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    loader.loadStage(idx, state.editorOpen);
  }
});
document.getElementById('btn-skill').addEventListener('click', () => combat.triggerPlayerSkill());
document.getElementById('btn-sound').addEventListener('click', (e) => (e.currentTarget.textContent = sfx.toggle() ? '🔊' : '🔇'));
document.getElementById('btn-restart').addEventListener('click', () => {
  modalOverlayEl.classList.add('hidden');
  loader.loadStage(state.stageIndex, state.editorOpen);
});
document.getElementById('btn-modal-action').onclick = () => {
  sfx.init();
  modalOverlayEl.classList.add('hidden');
  loader.loadStage(state.stageIndex, false);
};

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (state.editorOpen && (e.key === 'r' || e.key === 'R')) return stageEditor.rotateEditorBrush();
  const towerKeys = { '1': 'crossbow', '2': 'cannon', '3': 'frost', '4': 'wall' };
  if (towerKeys[e.key]) return hud.selectTowerType(towerKeys[e.key]);
  if (e.key === '5') return hud.advanceKingdomSettlement();
  const facKeys = { q: 'house', Q: 'house', w: 'farm', W: 'farm', e: 'fishery', E: 'fishery' };
  if (facKeys[e.key]) return hud.triggerBuildFacility(facKeys[e.key]);
  if (e.code === 'Space') { e.preventDefault(); combat.triggerPlayerSkill(); }
});

eventBus.on('mp:kingdom_sync', (snap) => { kingdomDomain.applySnapshot(snap); hud.updateHud(); });
eventBus.on('mp:world_patch', (patch) => {
  applyZeroDowntimeWorldPatch(patch);
  showBanner('⚡ 실시간 월드 무중단 패치 반영', '진행 중인 게임 중단 없이 새 세계관이 적용되었습니다!', 2200);
  hud.updateHud();
});

let lastTime = performance.now();
let liveSaveTimer = 0;

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const elapsed = now / 1000;
  comfyUI.updatePreview(elapsed);

  if (state.mode === 'playing' && state.player && state.world) {
    updateGroundRaycastFromMouse();
    state.player.update(dt, elapsed);
    const camOffset = state.editorOpen ? EDITOR_CAMERA_OFFSET : PLAY_CAMERA_OFFSET;
    const targetFocus = state.editorOpen
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(THREE.MathUtils.clamp(state.player.position.x, -26, 26), 0, THREE.MathUtils.clamp(state.player.position.z, -16, 16));
    cameraFocus.lerp(targetFocus, Math.min(1, 7.5 * dt));
    camera.position.copy(cameraFocus).add(camOffset);
    camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);
    if (state.world.citadel && state.world.citadel.emblem) state.world.citadel.emblem.rotation.y = elapsed * 1.8;

    combat.updateCombatTick(dt, elapsed);
    kingdomDomain.update(dt, elapsed, {
      playerPos: state.player.position, enemies: state.enemies,
      onGrantCoins: (amt) => (state.coins += amt), onFloatingText: vfx.spawnFloatingText, onHitEnemy: combat.damageEnemy,
    });
    mpNetwork.update(dt, elapsed, {
      playerPos: state.player.position, kingdomSnapshot: kingdomDomain.getSnapshot(),
      enemies: state.enemies, wildPreys: kingdomDomain.wildPreys, survivors: kingdomDomain.survivors,
      onHitEnemy: combat.damageEnemy, worldToScreen: vfx.worldToScreen,
      onHitPrey: (prey, dmg) => {
        if (prey.takeDamage(dmg)) {
          kingdomDomain.food += 18; state.coins += 12;
          vfx.spawnFloatingText(prey.position.clone().setY(2.0), '🏹 동맹 사냥! 🍖+18 · 🪙+12', '#6ee7b7');
        }
      },
    });
    if ((liveSaveTimer += dt) >= 2.0) { liveSaveTimer = 0; saveLiveSessionSnapshot(state, kingdomDomain); }
    hud.updateHud();
  }
  renderer.render(scene, camera);
}

restoreOrInitLiveSession({ state, kingdomDomain, loader, combat, hud, modalOverlayEl, showBanner });
requestAnimationFrame(gameLoop);

import * as THREE from 'three';
import {
  STAGES, PROP_CATALOG, saveStages, setStagesList,
  resetStagesToDefault, createNewStageTemplate,
} from '../stages.js';
import { createTerrainPropMesh, MAP_BOUNDS } from '../world.js';
import { sfx } from '../audio.js';
import { showBanner } from '../core/vfxManager.js';
import { clearGroupChildren, createGroundRing } from '../core/meshFactory.js';

const SCALE_PRESETS = [0.85, 1.2, 1.55];

export function createStageEditorController({
  state, editorState, vfx,
  rebuildStageWorldInPlace, rebuildPadsForCurrentStage,
  refreshStageSelectUI, loadStage, updateHud, getMapWaveEditor,
}) {
  const $ = (id) => document.getElementById(id);
  const editorBtnEl = $('btn-editor');
  const editorTopbarEl = $('editor-topbar');
  const editorDockEl = $('editor-dock');
  const combatDockEl = $('combat-dock');
  const modalOverlayEl = $('modal-overlay');
  const edStageNameInput = $('ed-stage-name');
  const edStartCoinsInput = $('ed-start-coins');
  const edCastleHpInput = $('ed-castle-hp');
  const edScaleBtn = $('btn-ed-scale');

  function rebuildWaypointMarkers() {
    clearGroupChildren(editorState.waypointMarkersGroup);
    if (!state.editorOpen) {
      editorState.waypointMarkersGroup.visible = false;
      return;
    }
    editorState.waypointMarkersGroup.visible = true;
    const stageData = STAGES[state.stageIndex];
    if (!stageData || !Array.isArray(stageData.pathPoints)) return;

    stageData.pathPoints.forEach(([px, pz], idx) => {
      const col = idx === 0 ? 0xef4444 : idx === stageData.pathPoints.length - 1 ? 0x3b82f6 : 0xfacc15;
      const beacon = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8),
        new THREE.MeshBasicMaterial({ color: col })
      );
      pole.position.y = 1.1;
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: col }));
      orb.position.y = 2.4;
      beacon.add(pole, orb, createGroundRing(0.75, 1.05, col, 0.16, 0.9));
      beacon.position.set(px, 0, pz);
      editorState.waypointMarkersGroup.add(beacon);
    });
  }

  function rebuildEditorGhostPreview() {
    clearGroupChildren(editorState.previewGroup);
    if (!state.editorOpen) {
      editorState.previewGroup.visible = false;
      return;
    }
    editorState.previewGroup.visible = true;
    const scale = SCALE_PRESETS[editorState.scaleIdx];
    const brush = editorState.brush;

    if (brush === 'erase') {
      editorState.previewGroup.add(createGroundRing(1.2, 1.65, 0xef4444, 0.15, 0.85));
    } else if (brush === 'pad') {
      const padMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.95, 0.25, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.7 })
      );
      padMesh.position.y = 0.14;
      editorState.previewGroup.add(padMesh);
    } else if (brush === 'waypoint') {
      const wpMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      wpMesh.position.y = 1.6;
      editorState.previewGroup.add(wpMesh, createGroundRing(0.9, 1.3, 0xfacc15, 0.18, 0.9));
    } else {
      editorState.previewGroup.add(
        createTerrainPropMesh(brush, scale, editorState.rotation),
        createGroundRing(1.4 * scale, 1.65 * scale, 0x38bdf8, 0.12, 0.75)
      );
    }
  }

  function setEditorMode(enabled, silentBanner = false) {
    state.editorOpen = Boolean(enabled);
    editorBtnEl.classList.toggle('active', state.editorOpen);
    editorTopbarEl.classList.toggle('hidden', !state.editorOpen);
    editorDockEl.classList.toggle('hidden', !state.editorOpen);
    combatDockEl.classList.toggle('hidden', state.editorOpen);

    if (state.editorOpen) {
      rebuildEditorGhostPreview();
      rebuildWaypointMarkers();
      if (!silentBanner) {
        showBanner('🛠️ 스테이지 & 맵·웨이브 에디터', '지형물 배치 · 📍길경로점 편집 · 🗺️맵·웨이브 상세편집 가능', 2200);
      }
    } else {
      editorState.previewGroup.visible = false;
      editorState.waypointMarkersGroup.visible = false;
      const mw = getMapWaveEditor();
      if (mw) mw.toggle(false);
      if (state.player) state.player.targetMarker.visible = true;
    }
    updateHud();
  }

  function rotateEditorBrush() {
    editorState.rotation = (editorState.rotation + Math.PI / 4) % (Math.PI * 2);
    rebuildEditorGhostPreview();
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

    if (bestPropIdx !== -1) {
      const removed = stageData.props.splice(bestPropIdx, 1)[0];
      const mesh = state.world.propInstances[bestPropIdx];
      if (mesh) {
        state.world.propsGroup.remove(mesh);
        state.world.propInstances.splice(bestPropIdx, 1);
      }
      saveStages(STAGES);
      sfx.playEnemyDefeat();
      vfx.spawnRingEffect(worldPt, 1.8, 0xef4444, 0.22);
      const info = PROP_CATALOG[removed.type] || { emoji: '🧹', name: '지형물' };
      vfx.spawnFloatingText(worldPt.clone().setY(1.8), `${info.emoji} ${info.name} 삭제`, '#f87171');
    }
  }

  function handleWaypointBrushClick(x, z, isRightClick) {
    const stageData = STAGES[state.stageIndex];
    if (!stageData || !Array.isArray(stageData.pathPoints)) return;
    const pts = stageData.pathPoints;
    const targetVec = new THREE.Vector3(x, 0, z);

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
        sfx.playEnemyDefeat();
      }
      return;
    }

    if (nearestIdx !== -1) pts[nearestIdx] = [x, z];
    else pts.splice(Math.max(1, pts.length - 1), 0, [x, z]);

    saveStages(STAGES);
    rebuildStageWorldInPlace();
    const mw = getMapWaveEditor();
    if (editorState.mapWaveOpen && mw) mw.render();
    sfx.playTowerBuilt();
    vfx.spawnRingEffect(targetVec, 2.2, 0xfacc15, 0.25);
  }

  function handleEditorCanvasClick(worldPt, isRightClick = false) {
    const stageData = STAGES[state.stageIndex];
    const x = Math.round(THREE.MathUtils.clamp(worldPt.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX) * 10) / 10;
    const z = Math.round(THREE.MathUtils.clamp(worldPt.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ) * 10) / 10;
    const targetVec = new THREE.Vector3(x, 0, z);

    if (editorState.brush === 'waypoint') return handleWaypointBrushClick(x, z, isRightClick);
    if (isRightClick || editorState.brush === 'erase') return eraseNearestAtPoint(targetVec);

    if (editorState.brush === 'pad') {
      stageData.buildPads.push({ x, z, baseCost: 35 });
      rebuildPadsForCurrentStage();
      saveStages(STAGES);
      sfx.playTowerBuilt();
      return;
    }

    const scale = SCALE_PRESETS[editorState.scaleIdx];
    const newProp = { type: editorState.brush, x, z, scale, rot: Math.round(editorState.rotation * 100) / 100 };
    if (!Array.isArray(stageData.props)) stageData.props = [];
    stageData.props.push(newProp);

    const mesh = createTerrainPropMesh(newProp.type, newProp.scale, newProp.rot);
    mesh.position.set(x, 0, z);
    state.world.propsGroup.add(mesh);
    state.world.propInstances.push(mesh);
    saveStages(STAGES);
    sfx.playCoinPickup();
  }

  editorBtnEl.addEventListener('click', () => {
    if (state.mode === 'intro') {
      sfx.init();
      modalOverlayEl.classList.add('hidden');
      state.mode = 'playing';
    }
    setEditorMode(!state.editorOpen);
  });

  $('btn-ed-play').addEventListener('click', () => {
    modalOverlayEl.classList.add('hidden');
    setEditorMode(false);
    if (state.mode !== 'playing') loadStage(state.stageIndex, false);
  });

  document.querySelectorAll('.brush-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      editorState.brush = btn.dataset.brush;
      document.querySelectorAll('.brush-btn').forEach((b) => b.classList.toggle('active', b === btn));
      rebuildEditorGhostPreview();
    });
  });

  edScaleBtn.addEventListener('click', () => {
    editorState.scaleIdx = (editorState.scaleIdx + 1) % SCALE_PRESETS.length;
    edScaleBtn.textContent = `크기: ${SCALE_PRESETS[editorState.scaleIdx]}x`;
    rebuildEditorGhostPreview();
  });

  $('btn-ed-rotate').addEventListener('click', rotateEditorBrush);
  $('btn-ed-clear-props').addEventListener('click', () => {
    STAGES[state.stageIndex].props = [];
    saveStages(STAGES);
    rebuildStageWorldInPlace();
  });

  function onStageMetaInput() {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    st.name = edStageNameInput.value.trim() || `스테이지 ${state.stageIndex + 1}`;
    st.startCoins = Math.max(30, parseInt(edStartCoinsInput.value, 10) || 75);
    st.castleMaxHp = Math.max(50, parseInt(edCastleHpInput.value, 10) || 100);
    saveStages(STAGES);
    refreshStageSelectUI();
    updateHud();
  }
  [edStageNameInput, edStartCoinsInput, edCastleHpInput].forEach((el) => el.addEventListener('change', onStageMetaInput));

  $('btn-ed-add-stage').addEventListener('click', () => {
    STAGES.push(createNewStageTemplate(STAGES.length + 1));
    saveStages(STAGES);
    loadStage(STAGES.length - 1, state.editorOpen);
  });

  $('btn-ed-del-stage').addEventListener('click', () => {
    if (STAGES.length <= 1) return;
    STAGES.splice(state.stageIndex, 1);
    saveStages(STAGES);
    loadStage(Math.max(0, state.stageIndex - 1), state.editorOpen);
  });

  $('btn-ed-reset-all').addEventListener('click', () => {
    setStagesList(resetStagesToDefault());
    loadStage(0, state.editorOpen);
  });

  return { setEditorMode, rotateEditorBrush, rebuildWaypointMarkers, handleEditorCanvasClick };
}

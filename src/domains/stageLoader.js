import { STAGES } from '../stages.js';
import { buildStageWorld } from '../world.js';
import { PlayerHero, BuildPad } from '../entities.js';
import { showBanner } from '../core/vfxManager.js';

export function createStageLoader({
  scene,
  camera,
  cameraFocus,
  playCameraOffset,
  worldLabelsEl,
  state,
  editorState,
  kingdomDomain,
  mpNetwork,
  getCombat,
  getHud,
  getStageEditor,
  getMapWaveEditor,
}) {
  const stageSelectEl = document.getElementById('stage-select');

  function clearCurrentStage() {
    if (state.world) scene.remove(state.world.worldGroup);
    if (state.player) state.player.destroy();
    state.pads.forEach((p) => p.destroy());
    state.padLabels.forEach((el) => el.remove());
    state.enemies.forEach((e) => e.destroy());
    state.coinsList.forEach((c) => c.destroy());
    state.projectiles.forEach((p) => p.destroy());
    state.effects.forEach((ef) => scene.remove(ef.mesh));
    Object.assign(state, {
      world: null,
      player: null,
      pads: [],
      padLabels: [],
      enemies: [],
      coinsList: [],
      projectiles: [],
      effects: [],
    });
  }

  function rebuildPadsForCurrentStage() {
    state.pads.forEach((p) => p.destroy());
    state.padLabels.forEach((el) => el.remove());
    state.pads = [];
    state.padLabels = [];
    (STAGES[state.stageIndex].buildPads || []).forEach((padData, idx) => {
      state.pads.push(new BuildPad(scene, padData, idx));
      const labelEl = document.createElement('div');
      labelEl.className = 'pad-label';
      worldLabelsEl.appendChild(labelEl);
      state.padLabels.push(labelEl);
    });
  }

  function refreshStageSelectUI() {
    stageSelectEl.innerHTML = '';
    STAGES.forEach((st, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `STAGE ${idx + 1}/${STAGES.length} · ${st.name}`;
      if (idx === state.stageIndex) opt.selected = true;
      stageSelectEl.appendChild(opt);
    });
    const cur = STAGES[state.stageIndex];
    if (cur) {
      document.getElementById('ed-stage-name').value = cur.name;
      document.getElementById('ed-start-coins').value = cur.startCoins;
      document.getElementById('ed-castle-hp').value = cur.castleMaxHp;
    }
  }

  function recalculateTotalStageEnemies() {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    let total = 0;
    (st.waves || []).forEach((w) => (w.groups || []).forEach((g) => (total += Math.max(1, Number(g.count) || 1))));
    state.totalStageEnemies = Math.max(state.defeatedStageEnemies + state.enemies.length, total);
    const hud = getHud();
    if (hud) hud.updateHud();
  }

  function rebuildStageWorldInPlace() {
    const stageData = STAGES[state.stageIndex];
    if (!stageData) return;
    if (state.world) scene.remove(state.world.worldGroup);
    state.world = buildStageWorld(scene, stageData);
    state.enemies.forEach((enemy) => (enemy.roadCurve = state.world.roadCurve));
    const ed = getStageEditor();
    if (ed) ed.rebuildWaypointMarkers();
  }

  function loadStage(stageIndex, keepEditorOpen = false) {
    clearCurrentStage();
    state.stageIndex = Math.max(0, Math.min(STAGES.length - 1, stageIndex));
    const stageData = STAGES[state.stageIndex];
    state.coins = stageData.startCoins;
    state.waveIndex = 0;
    state.defeatedStageEnemies = 0;
    recalculateTotalStageEnemies();

    state.world = buildStageWorld(scene, stageData);
    const hpBonus = kingdomDomain.getCurrentStepDef().castleMaxHpBonus || 0;
    state.castleMaxHp = stageData.castleMaxHp + hpBonus;
    state.castleHp = state.castleMaxHp;

    state.player = new PlayerHero(scene, 0, 0);
    cameraFocus.copy(state.player.position);
    camera.position.copy(cameraFocus).add(playCameraOffset);
    camera.lookAt(cameraFocus.x, 0.4, cameraFocus.z);

    kingdomDomain.initForStage(state.world.endPt);
    mpNetwork.initStageCoopPartners();
    rebuildPadsForCurrentStage();
    refreshStageSelectUI();

    const combat = getCombat();
    if (combat) combat.prepareWave(0);
    state.mode = 'playing';

    const ed = getStageEditor();
    if (ed) ed.setEditorMode(keepEditorOpen, true);
    const mw = getMapWaveEditor();
    if (editorState.mapWaveOpen && mw) mw.render();

    showBanner(`STAGE ${state.stageIndex + 1} / ${STAGES.length}`, `${stageData.name} 방어 시작!`);
    const hud = getHud();
    if (hud) hud.updateHud();
  }

  return {
    clearCurrentStage,
    rebuildPadsForCurrentStage,
    refreshStageSelectUI,
    recalculateTotalStageEnemies,
    rebuildStageWorldInPlace,
    loadStage,
  };
}

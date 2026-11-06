import * as THREE from 'three';
import {
  STAGES, ENEMY_TYPES, MAP_THEME_PRESETS, ROAD_PATH_PRESETS,
  saveStages, generateRandomRoadPath, generateAutoPadsForPath,
} from '../stages.js';
import { MAP_BOUNDS } from '../world.js';
import { sfx } from '../audio.js';
import { showBanner } from '../core/vfxManager.js';

const hexNumberToCss = (num) => '#' + Math.max(0, Math.min(0xffffff, Number(num) || 0)).toString(16).padStart(6, '0');
const cssHexToNumber = (hexStr) => parseInt(String(hexStr).replace('#', ''), 16) || 0x5cb346;

export function createMapWaveEditorUI({
  state, editorState, comfyUI,
  rebuildStageWorldInPlace, rebuildPadsForCurrentStage,
  recalculateTotalStageEnemies, loadStage, setEditorMode,
}) {
  const $ = (id) => document.getElementById(id);
  const mapWaveOverlayEl = $('map-wave-overlay');
  const mwHeaderTitleEl = $('mw-header-title');
  const mwThemePresetsEl = $('mw-theme-presets');
  const mwRoadPresetsEl = $('mw-road-presets');
  const mwColGround = $('mw-col-ground');
  const mwColAlt = $('mw-col-alt');
  const mwColRoad = $('mw-col-road');
  const mwColBorder = $('mw-col-border');
  const mwWaypointListEl = $('mw-waypoint-list');
  const mwWaveSummaryEl = $('mw-wave-summary');
  const mwWavesListEl = $('mw-waves-list');

  function toggleMapWaveStudio(forceState) {
    const next = typeof forceState === 'boolean' ? forceState : !editorState.mapWaveOpen;
    editorState.mapWaveOpen = next;
    mapWaveOverlayEl.classList.toggle('hidden', !next);
    if (next) {
      if (comfyUI && comfyUI.isOpen) comfyUI.toggle(false);
      renderMapWaveStudio();
    }
  }

  Object.values(MAP_THEME_PRESETS).forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'mw-preset-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      const st = STAGES[state.stageIndex];
      if (!st) return;
      Object.assign(st, {
        groundColor: preset.groundColor, groundAltColor: preset.groundAltColor,
        roadColor: preset.roadColor, roadBorderColor: preset.roadBorderColor,
      });
      saveStages(STAGES);
      rebuildStageWorldInPlace();
      renderMapWaveStudio();
      sfx.playCoinPickup();
      showBanner('맵 테마 변경', `${preset.name} 테마가 적용되었습니다!`, 1400);
    });
    mwThemePresetsEl.appendChild(btn);
  });

  Object.values(ROAD_PATH_PRESETS).forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'mw-preset-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      const st = STAGES[state.stageIndex];
      if (!st) return;
      st.pathPoints = preset.points.map(([px, pz]) => [px, pz]);
      saveStages(STAGES);
      rebuildStageWorldInPlace();
      renderMapWaveStudio();
      sfx.playTowerBuilt();
      showBanner('모래길 경로 변경', `${preset.name} 경로가 적용되었습니다!`, 1400);
    });
    mwRoadPresetsEl.appendChild(btn);
  });

  function onMapColorChange() {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    st.groundColor = cssHexToNumber(mwColGround.value);
    st.groundAltColor = cssHexToNumber(mwColAlt.value);
    st.roadColor = cssHexToNumber(mwColRoad.value);
    st.roadBorderColor = cssHexToNumber(mwColBorder.value);
    saveStages(STAGES);
    rebuildStageWorldInPlace();
  }
  [mwColGround, mwColAlt, mwColRoad, mwColBorder].forEach((el) => el.addEventListener('input', onMapColorChange));

  $('btn-ed-map-wave').addEventListener('click', () => toggleMapWaveStudio());
  $('btn-mw-close').addEventListener('click', () => toggleMapWaveStudio(false));
  $('btn-mw-apply-play').addEventListener('click', () => {
    toggleMapWaveStudio(false);
    setEditorMode(false);
    loadStage(state.stageIndex, false);
  });

  $('btn-mw-random-road').addEventListener('click', () => {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    st.pathPoints = generateRandomRoadPath();
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    renderMapWaveStudio();
    sfx.playTowerBuilt();
    showBanner('🎲 랜덤 모래길 생성', '새로운 구불구불한 모래길 경로가 생성되었습니다!', 1500);
  });

  $('btn-mw-reverse-road').addEventListener('click', () => {
    const st = STAGES[state.stageIndex];
    if (!st || !Array.isArray(st.pathPoints)) return;
    st.pathPoints.reverse();
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    renderMapWaveStudio();
    sfx.playCoinPickup();
    showBanner('⇄ 경로 방향 반전', '적 출현 포털과 왕국 성채의 위치가 서로 바뀌었습니다!', 1500);
  });

  $('btn-mw-auto-pads').addEventListener('click', () => {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    st.buildPads = generateAutoPadsForPath(st.pathPoints, 7);
    saveStages(STAGES);
    rebuildPadsForCurrentStage();
    sfx.playTowerBuilt();
    showBanner('🏗️ 건설 구역 자동 배치', '현재 모래길 주변 최적 위치에 건설 구역이 재배치되었습니다!', 1600);
  });

  $('btn-mw-add-wp').addEventListener('click', () => {
    const st = STAGES[state.stageIndex];
    if (!st || !Array.isArray(st.pathPoints)) return;
    const pts = st.pathPoints;
    if (pts.length >= 2) {
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      const mx = Math.round(((last[0] + prev[0]) / 2) * 10) / 10;
      const mz = Math.round(THREE.MathUtils.clamp((last[1] + prev[1]) / 2 + 5, -15, 15) * 10) / 10;
      pts.splice(pts.length - 1, 0, [mx, mz]);
    } else pts.push([0, 0]);
    saveStages(STAGES);
    rebuildStageWorldInPlace();
    renderMapWaveStudio();
  });

  $('btn-mw-add-wave').addEventListener('click', () => {
    const st = STAGES[state.stageIndex];
    if (!st) return;
    if (!Array.isArray(st.waves)) st.waves = [];
    st.waves.push({
      groups: [
        { type: 'giraffe', count: 8, interval: 0.85, delay: 0 },
        { type: 'hippo', count: 5, interval: 1.4, delay: 2.0 },
        { type: 'elephant', count: 3, interval: 2.2, delay: 4.0 },
      ],
    });
    saveStages(STAGES);
    recalculateTotalStageEnemies();
    renderMapWaveStudio();
  });

  function renderWaypointsList(stageData) {
    mwWaypointListEl.innerHTML = '';
    (stageData.pathPoints || []).forEach((pt, idx) => {
      const isStart = idx === 0, isEnd = idx === stageData.pathPoints.length - 1;
      const row = document.createElement('div');
      row.className = 'mw-wp-row';

      const badge = document.createElement('span');
      badge.className = 'mw-wp-badge';
      badge.textContent = isStart ? '🚩 출발 #1' : isEnd ? `🏰 성채 #${idx + 1}` : `📍 경유 #${idx + 1}`;
      row.appendChild(badge);

      const coordWrap = document.createElement('div');
      coordWrap.className = 'mw-wp-coord';
      const makeCoordInp = (axisIdx, minV, maxV) => {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = String(pt[axisIdx]);
        inp.addEventListener('change', () => {
          pt[axisIdx] = THREE.MathUtils.clamp(parseFloat(inp.value) || 0, minV, maxV);
          saveStages(STAGES);
          rebuildStageWorldInPlace();
        });
        return inp;
      };
      coordWrap.append('X:', makeCoordInp(0, MAP_BOUNDS.minX, MAP_BOUNDS.maxX), 'Z:', makeCoordInp(1, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ));
      row.appendChild(coordWrap);

      const delBtn = document.createElement('button');
      delBtn.className = 'mw-wp-del';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        if (stageData.pathPoints.length <= 3) return showBanner('삭제 불가', '최소 3개 경유지가 필요합니다.', 1400);
        stageData.pathPoints.splice(idx, 1);
        saveStages(STAGES);
        rebuildStageWorldInPlace();
        renderMapWaveStudio();
      });
      row.appendChild(delBtn);
      mwWaypointListEl.appendChild(row);
    });
  }

  function renderMapWaveStudio() {
    const stageData = STAGES[state.stageIndex];
    if (!stageData) return;

    mwHeaderTitleEl.textContent = `🗺️ STAGE ${state.stageIndex + 1} (${stageData.name}) — 맵 & 웨이브 에디터`;
    mwColGround.value = hexNumberToCss(stageData.groundColor ?? 0x5cb346);
    mwColAlt.value = hexNumberToCss(stageData.groundAltColor ?? 0x4ea039);
    mwColRoad.value = hexNumberToCss(stageData.roadColor ?? 0xead29c);
    mwColBorder.value = hexNumberToCss(stageData.roadBorderColor ?? 0xc5aa72);

    renderWaypointsList(stageData);
    mwWavesListEl.innerHTML = '';
    let totalStageCount = 0;
    let totalEstCoins = 0;

    (stageData.waves || []).forEach((wave, wIdx) => {
      let waveCount = 0;
      (wave.groups || []).forEach((g) => {
        const c = Math.max(1, Number(g.count) || 1);
        waveCount += c;
        totalStageCount += c;
        totalEstCoins += c * ((ENEMY_TYPES[g.type] || ENEMY_TYPES.giraffe).coinReward || 12);
      });

      const card = document.createElement('div');
      card.className = 'mw-wave-card';
      card.innerHTML = `<div class="mw-wave-head"><div class="mw-wave-title"><span>🌊 WAVE ${wIdx + 1}</span><small>(총 ${waveCount}마리)</small></div></div>`;

      const groupList = document.createElement('div');
      groupList.className = 'mw-group-list';
      (wave.groups || []).forEach((group) => {
        const gRow = document.createElement('div');
        gRow.className = 'mw-group-row';
        const sel = document.createElement('select');
        Object.entries(ENEMY_TYPES).forEach(([k, def]) => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = `${def.emoji} ${def.name}`;
          if (group.type === k) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', () => {
          group.type = sel.value;
          saveStages(STAGES);
          renderMapWaveStudio();
        });
        gRow.appendChild(sel);

        const cInp = document.createElement('input');
        cInp.type = 'number';
        cInp.value = String(group.count);
        cInp.addEventListener('change', () => {
          group.count = Math.max(1, parseInt(cInp.value, 10) || 1);
          saveStages(STAGES);
          recalculateTotalStageEnemies();
          renderMapWaveStudio();
        });
        const lbl = document.createElement('label');
        lbl.className = 'mw-group-field';
        lbl.append('마릿수', cInp);
        gRow.appendChild(lbl);
        groupList.appendChild(gRow);
      });
      card.appendChild(groupList);
      mwWavesListEl.appendChild(card);
    });

    mwWaveSummaryEl.textContent = `총 ${(stageData.waves || []).length}웨이브 · 적 ${totalStageCount}마리 · 보상 약 🪙${totalEstCoins}`;
  }

  return { toggle: toggleMapWaveStudio, render: renderMapWaveStudio };
}

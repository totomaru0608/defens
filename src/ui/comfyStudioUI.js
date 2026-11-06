import * as THREE from 'three';
import { ANIMAL_MOTION_CONFIG } from '../stages.js';
import { RedEnemy, buildAnimalRig, animateAnimalRig } from '../entities.js';
import { sfx } from '../audio.js';
import { showBanner } from '../core/vfxManager.js';

export function createComfyStudioUI({ scene, state, loadStage, updateHud }) {
  const comfyBtnEl = document.getElementById('btn-comfy');
  const comfyOverlayEl = document.getElementById('comfy-overlay');
  const comfyPreviewCanvas = document.getElementById('comfy-preview-canvas');
  const comfyPreviewCaption = document.getElementById('comfy-preview-caption');
  const comfyCloseBtn = document.getElementById('btn-comfy-close');
  const comfySpawnBtn = document.getElementById('btn-comfy-spawn');
  const comfyExportBtn = document.getElementById('btn-comfy-export');
  const comfyStatusText = document.getElementById('comfy-status-text');
  const modalOverlayEl = document.getElementById('modal-overlay');

  const inpStrideSpeed = document.getElementById('inp-stride-speed');
  const valStrideSpeed = document.getElementById('val-stride-speed');
  const inpLegSwing = document.getElementById('inp-leg-swing');
  const valLegSwing = document.getElementById('val-leg-swing');
  const inpSpecialAmp = document.getElementById('inp-special-amp');
  const valSpecialAmp = document.getElementById('val-special-amp');
  const lblSpecialAmp = document.getElementById('lbl-special-amp');
  const inpScaleMult = document.getElementById('inp-scale-mult');
  const valScaleMult = document.getElementById('val-scale-mult');

  const studio = {
    isOpen: false,
    selectedAnimal: 'elephant',
    renderer: null,
    scene: null,
    camera: null,
    rig: null,
    turntable: null,
  };

  function initPreviewRenderer() {
    if (studio.renderer) return;
    studio.renderer = new THREE.WebGLRenderer({ canvas: comfyPreviewCanvas, antialias: true, alpha: true });
    studio.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    studio.scene = new THREE.Scene();
    studio.camera = new THREE.PerspectiveCamera(38, 16 / 10, 0.1, 50);
    studio.camera.position.set(2.8, 2.3, 3.6);
    studio.camera.lookAt(0, 1.0, 0);

    studio.scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.2));
    const dLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
    dLight.position.set(4, 7, 5);
    studio.scene.add(dLight);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.55, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, flatShading: true })
    );
    pedestal.position.y = -0.06;
    studio.scene.add(pedestal);

    studio.turntable = new THREE.Group();
    studio.scene.add(studio.turntable);
    rebuildPreviewAnimal();
  }

  function rebuildPreviewAnimal() {
    if (!studio.turntable) return;
    while (studio.turntable.children.length > 0) {
      studio.turntable.remove(studio.turntable.children[0]);
    }
    const aType = studio.selectedAnimal;
    const cfg = ANIMAL_MOTION_CONFIG[aType];
    studio.rig = buildAnimalRig(aType, cfg.bodyColor, cfg.accentColor);
    const s = (aType === 'giraffe' ? 0.78 : 0.95) * cfg.scaleMult;
    studio.rig.root.scale.set(s, s, s);
    studio.turntable.add(studio.rig.root);

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
    const next = typeof forceState === 'boolean' ? forceState : !studio.isOpen;
    studio.isOpen = next;
    comfyOverlayEl.classList.toggle('hidden', !next);
    comfyBtnEl.classList.toggle('active', next);

    if (next) {
      if (state.mode === 'intro') {
        modalOverlayEl.classList.add('hidden');
        state.mode = 'playing';
      }
      initPreviewRenderer();
      const box = comfyPreviewCanvas.parentElement.getBoundingClientRect();
      studio.renderer.setSize(Math.max(200, box.width), Math.max(115, box.height), false);
      studio.camera.aspect = Math.max(200, box.width) / Math.max(115, box.height);
      studio.camera.updateProjectionMatrix();
      rebuildPreviewAnimal();
    }
  }

  function onSliderChange() {
    const aType = studio.selectedAnimal;
    const cfg = ANIMAL_MOTION_CONFIG[aType];
    cfg.strideSpeed = parseFloat(inpStrideSpeed.value);
    cfg.legSwing = parseFloat(inpLegSwing.value);
    cfg.specialAmp = parseFloat(inpSpecialAmp.value);
    cfg.scaleMult = parseFloat(inpScaleMult.value);

    valStrideSpeed.textContent = cfg.strideSpeed.toFixed(1);
    valLegSwing.textContent = cfg.legSwing.toFixed(2);
    valSpecialAmp.textContent = cfg.specialAmp.toFixed(1);
    valScaleMult.textContent = `${cfg.scaleMult.toFixed(2)}x`;

    if (studio.rig) {
      const s = (aType === 'giraffe' ? 0.78 : 0.95) * cfg.scaleMult;
      studio.rig.root.scale.set(s, s, s);
    }
    comfyStatusText.textContent = `${aType.toUpperCase()} 모션 파라미터 반영됨 ✓`;
  }

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

  comfyBtnEl.addEventListener('click', () => toggleComfyStudio());
  comfyCloseBtn.addEventListener('click', () => toggleComfyStudio(false));
  [inpStrideSpeed, inpLegSwing, inpSpecialAmp, inpScaleMult].forEach((el) =>
    el.addEventListener('input', onSliderChange)
  );

  document.querySelectorAll('.animal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      studio.selectedAnimal = tab.dataset.animal;
      document.querySelectorAll('.animal-tab').forEach((t) => t.classList.toggle('active', t === tab));
      rebuildPreviewAnimal();
    });
  });

  comfySpawnBtn.addEventListener('click', () => {
    spawnAnimalIntoStage(studio.selectedAnimal, 2);
    toggleComfyStudio(false);
  });

  document.querySelectorAll('.quick-spawn-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      spawnAnimalIntoStage(btn.dataset.spawn, 1);
      comfyStatusText.textContent = `${btn.dataset.spawn} 1마리 전장 투입 완료!`;
    });
  });

  comfyExportBtn.addEventListener('click', () => {
    const blob = new Blob(
      [JSON.stringify({ workflow_name: 'coin_defense_3d_animal_motion', animal_motion_configs: ANIMAL_MOTION_CONFIG }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comfyui_animal_motion_workflow.json';
    a.click();
    URL.revokeObjectURL(url);
    comfyStatusText.textContent = 'Workflow JSON 다운로드 완료 ✓';
  });

  return {
    get isOpen() {
      return studio.isOpen;
    },
    toggle: toggleComfyStudio,
    updatePreview(elapsed) {
      if (studio.isOpen && studio.renderer && studio.rig) {
        animateAnimalRig(studio.rig, studio.selectedAnimal, elapsed, 0);
        studio.turntable.rotation.y = elapsed * 0.65;
        studio.renderer.render(studio.scene, studio.camera);
      }
    },
  };
}

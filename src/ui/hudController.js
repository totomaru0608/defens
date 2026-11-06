import { STAGES, TOWER_TYPES } from '../stages.js';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import { sfx } from '../audio.js';
import { showBanner } from '../core/vfxManager.js';
import { saveLiveSessionSnapshot, applyZeroDowntimeWorldPatch } from '../core/liveReloadGuard.js';

const EXPANSION_STAGE_TEMPLATES = [
  {
    id: 'harbor_metropolis', name: '대항구 교역도시',
    badge: '⚓ 6단계: 대항구 교역도시', shortLabel: '⚓ 대항구 도시',
    desc: '성(Castle) 너머 해안과 강 하구에 원양 범선 항구를 건설해 대륙 간 해양 무역과 원양 어업을 개척했습니다!',
  },
  {
    id: 'royal_academy_capital', name: '왕립 학술 수도',
    badge: '🏛️ 7단계: 왕립 학술 수도', shortLabel: '🏛️ 왕립 수도',
    desc: '왕립 대학과 과학 공방을 설립하여 자동화 농기구와 대형 조선술로 식량·세금 생산을 극대화했습니다!',
  },
  {
    id: 'golden_empire', name: '황금 대제국',
    badge: '👑 8단계: 황금 대제국', shortLabel: '👑 황금 대제국',
    desc: '수많은 타운과 시장·무역소·항구를 하나로 묶어 대륙을 호령하는 영원한 황금 대제국을 완성했습니다!',
  },
];

export function createHudController({ state, kingdomDomain, mpNetwork, vfx }) {
  const $ = (id) => document.getElementById(id);
  const waveTextEl = $('wave-text');
  const enemyCountTextEl = $('enemy-count-text');
  const waveProgressFillEl = $('wave-progress-fill');
  const castleHpTextEl = $('castle-hp-text');
  const castleHpFillEl = $('castle-hp-fill');
  const playerHpTextEl = $('player-hp-text');
  const playerHpFillEl = $('player-hp-fill');
  const coinCountEl = $('coin-count');
  const skillBtnEl = $('btn-skill');
  const skillStatusEl = $('skill-status');
  const modalOverlayEl = $('modal-overlay');
  const kdStageBadgeEl = $('kd-stage-badge');
  const kdEconTextEl = $('kd-econ-text');
  const kdAdvanceBtnEl = $('btn-kd-advance');
  const kdNextTitleEl = $('kd-next-title');
  const kdNextCostEl = $('kd-next-cost');

  function selectTowerType(typeKey) {
    if (!TOWER_TYPES[typeKey]) return;
    state.selectedTower = typeKey;
    document.querySelectorAll('.tower-card').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tower === typeKey);
    });
  }
  document.querySelectorAll('.tower-card').forEach((btn) => {
    btn.addEventListener('click', () => selectTowerType(btn.dataset.tower));
  });

  function triggerBuildFacility(facId) {
    if (state.mode === 'intro') {
      sfx.init();
      modalOverlayEl.classList.add('hidden');
      state.mode = 'playing';
    }
    if (state.mode !== 'playing') return;

    const built = kingdomDomain.constructFacility(
      facId,
      { getCoins: () => state.coins, spendCoins: (amt) => (state.coins = Math.max(0, state.coins - amt)) },
      (sub, title) => showBanner(sub, title, 2300),
      vfx.spawnFloatingText
    );
    if (built) {
      sfx.playTowerBuilt();
      mpNetwork.sendPacket({ type: 'kingdom_upgrade', kingdom: kingdomDomain.getSnapshot() });
      saveLiveSessionSnapshot(state, kingdomDomain);
      updateHud();
    }
  }

  function advanceKingdomSettlement() {
    if (state.mode !== 'playing') return;
    const nextDef = kingdomDomain.getNextStepDef();
    if (!nextDef) {
      showBanner('🏰 현재 최종 문명 단계 달성!', '우측 상단 [🌱 무중단 확장] 버튼으로 새로운 문명 단계를 계속 증설할 수 있습니다!', 2400);
      return;
    }

    const reqCoins = nextDef.reqCoins || 0;
    const reqFood = nextDef.reqFood || 0;
    const reqPop = nextDef.reqPop || 0;
    const reqFoodFac = nextDef.reqFoodFacilityLevels || 0;

    if (kingdomDomain.population < reqPop) {
      return showBanner(`👥 인구 부족 (${kingdomDomain.population}/${reqPop}명)`, '먼저 [🏠 집]을 지어 수용 인구를 늘리고 주민을 모으세요!', 2400);
    }
    if (kingdomDomain.getTotalFoodFacilityLevels() < reqFoodFac) {
      return showBanner('🌾 농사 · 🐟 어업 기반 부족', `${nextDef.badge} 건설 및 체계화를 위해 [🌾 농사] 또는 [🐟 어업]을 확충하세요!`, 2400);
    }
    if (state.coins < reqCoins || kingdomDomain.food < reqFood) {
      return showBanner('🪙 세금 또는 🍖 식량 부족', `${nextDef.badge}에는 🪙${reqCoins}, 🍖${reqFood}가 필요합니다!`, 2200);
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
    vfx.spawnRingEffect(kingdomDomain.castleEndPt, 5.2, 0xfacc15, 0.48);
    vfx.spawnFloatingText(kingdomDomain.castleEndPt.clone().setY(3.8), `${curDef.badge} 완성!`, '#fde047');
    showBanner(`🏛️ 문명 발전: ${curDef.badge}`, curDef.desc, 2600);

    mpNetwork.sendPacket({ type: 'kingdom_upgrade', kingdom: kingdomDomain.getSnapshot() });
    saveLiveSessionSnapshot(state, kingdomDomain);
    updateHud();
  }

  function triggerZeroDowntimeExpansion() {
    if (state.mode === 'intro') {
      sfx.init();
      modalOverlayEl.classList.add('hidden');
      state.mode = 'playing';
    }
    const nextStepNum = KINGDOM_CONFIG.settlementChain.length + 1;
    const tpl = EXPANSION_STAGE_TEMPLATES[nextStepNum - 6] || {
      id: `era_stage_${nextStepNum}`,
      name: `신세계 제${nextStepNum}문명`,
      badge: `🌟 ${nextStepNum}단계: 신세계 문명`,
      shortLabel: `🌟 ${nextStepNum}단계 문명`,
      desc: `게임 중단 없이 실시간으로 확장된 제${nextStepNum}단계 문명 세계관입니다!`,
    };
    const stepOffset = nextStepNum - 5;
    const newStagePayload = {
      step: nextStepNum, ...tpl,
      reqCoins: 200 + stepOffset * 90, reqFood: 120 + stepOffset * 50,
      reqPop: 14 + stepOffset * 4, reqFoodFacilityLevels: 3 + stepOffset,
      baseTaxPerCycle: 90 + stepOffset * 35, foodPerSec: 22 + stepOffset * 7,
      agriFishMultiplier: +(2.8 + stepOffset * 0.5).toFixed(1),
      castleMaxHpBonus: 380 + stepOffset * 160,
      combatMultiplier: +(2.25 + stepOffset * 0.35).toFixed(2),
      autoGuardDamage: 60 + stepOffset * 22,
    };

    applyZeroDowntimeWorldPatch({ AppendStage: newStagePayload });
    mpNetwork.sendPacket({ type: 'world_patch', patch: { AppendStage: newStagePayload } });
    fetch('/api/world-patch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ AppendStage: newStagePayload }),
    }).catch(() => {});

    sfx.playTowerBuilt();
    saveLiveSessionSnapshot(state, kingdomDomain);
    updateHud();
    showBanner(`🌱 무중단 세계관 확장 완료! (${tpl.badge})`, `게임 중단 없이 [${tpl.name}] 단계가 즉시 증설되었습니다!`, 2500);
  }

  $('btn-fac-house')?.addEventListener('click', () => triggerBuildFacility('house'));
  $('btn-fac-farm')?.addEventListener('click', () => triggerBuildFacility('farm'));
  $('btn-fac-fishery')?.addEventListener('click', () => triggerBuildFacility('fishery'));
  kdAdvanceBtnEl?.addEventListener('click', advanceKingdomSettlement);
  $('btn-live-expand')?.addEventListener('click', triggerZeroDowntimeExpansion);

  function updatePadLabels() {
    const selectedDef = TOWER_TYPES[state.selectedTower];
    state.pads.forEach((pad, idx) => {
      const labelEl = state.padLabels[idx];
      if (!labelEl) return;
      const anchor = pad.position.clone().setY(pad.level === 0 ? 2.05 : 3.1 + pad.level * 0.35);
      const screen = vfx.worldToScreen(anchor);
      if (!screen.visible) {
        labelEl.style.display = 'none';
        return;
      }
      labelEl.style.display = 'flex';
      labelEl.style.left = `${screen.x}px`;
      labelEl.style.top = `${screen.y}px`;

      const playerDist = state.player ? state.player.position.distanceTo(pad.position) : 999;
      labelEl.classList.toggle('active-pad', state.mode === 'playing' && playerDist < 2.45);

      if (pad.level === 0) {
        const remaining = Math.max(0, pad.getCurrentTargetCost(state.selectedTower) - pad.investedCoins);
        labelEl.classList.toggle('can-afford', state.coins >= remaining);
        labelEl.classList.remove('maxed');
        labelEl.innerHTML = `<span class="pad-coin-icon">🪙</span><span>${remaining}</span><small>${selectedDef.emoji}</small>`;
      } else if (pad.level < pad.maxLevel) {
        const towerDef = TOWER_TYPES[pad.towerType];
        const remaining = Math.max(0, pad.getCurrentTargetCost(pad.towerType) - pad.investedCoins);
        labelEl.classList.toggle('can-afford', state.coins >= remaining);
        labelEl.classList.remove('maxed');
        labelEl.innerHTML = `<span class="pad-coin-icon">${towerDef.emoji}</span><span>Lv.${pad.level} · 🪙${remaining}</span>`;
      } else {
        labelEl.classList.remove('can-afford');
        labelEl.classList.add('maxed');
        labelEl.innerHTML = `<span>${TOWER_TYPES[pad.towerType].emoji} MAX</span>`;
      }
    });
  }

  function updateHud() {
    const stageData = STAGES[state.stageIndex];
    if (!stageData) return;

    const aliveOrPending = Math.max(0, state.totalStageEnemies - state.defeatedStageEnemies);
    waveTextEl.textContent = `웨이브 ${state.waveIndex + 1}/${stageData.waves.length}`;
    enemyCountTextEl.textContent = `적 ${aliveOrPending}`;
    const progressPct = state.totalStageEnemies > 0 ? Math.min(100, Math.round((state.defeatedStageEnemies / state.totalStageEnemies) * 100)) : 0;
    waveProgressFillEl.style.width = `${progressPct}%`;

    castleHpTextEl.textContent = `${Math.max(0, Math.ceil(state.castleHp))}/${state.castleMaxHp}`;
    castleHpFillEl.style.width = `${Math.max(0, (state.castleHp / state.castleMaxHp) * 100)}%`;

    if (state.player) {
      playerHpTextEl.textContent = `${Math.max(0, Math.ceil(state.player.hp))}/${state.player.maxHp}`;
      playerHpFillEl.style.width = `${Math.max(0, (state.player.hp / state.player.maxHp) * 100)}%`;
      skillBtnEl.classList.toggle('cooldown', state.player.skillTimer > 0);
      skillStatusEl.textContent = state.player.skillTimer > 0 ? `충격파 ${state.player.skillTimer.toFixed(1)}s` : '황금 충격파';
    }
    coinCountEl.textContent = `${state.coins}`;

    const curStepDef = kingdomDomain.getCurrentStepDef();
    const nextStepDef = kingdomDomain.getNextStepDef();
    const effMaxPop = kingdomDomain.getEffectiveMaxPopulation();
    const netFood = kingdomDomain.getNetFoodPerSec();
    const huntCapTag = kingdomDomain.isRelyingOnlyOnHunting() ? '(사냥한계12)' : `(체계화x${kingdomDomain.getAgriFishMultiplier()})`;

    if (kdStageBadgeEl && curStepDef) kdStageBadgeEl.textContent = curStepDef.badge;
    if (kdEconTextEl) {
      kdEconTextEl.textContent = `🍖${kingdomDomain.food}(${netFood >= 0 ? '+' : ''}${netFood}/s) · 👥${kingdomDomain.population}/${effMaxPop}명${huntCapTag} · 🪙세금+${kingdomDomain.getTaxPerCycle()}`;
    }

    const updateFacBtn = (facId, btnId, titleId, costId, labelPrefix, hint) => {
      const btnEl = $(btnId), titleEl = $(titleId), costEl = $(costId);
      if (!btnEl || !titleEl || !costEl) return;
      const cost = kingdomDomain.getFacilityNextCost(facId);
      btnEl.classList.toggle('can-afford', state.coins >= cost.coins && kingdomDomain.food >= cost.food);
      titleEl.textContent = `${labelPrefix} Lv.${kingdomDomain.getFacilityLevel(facId)}`;
      costEl.textContent = `🪙${cost.coins}·🍖${cost.food} (${hint})`;
    };
    updateFacBtn('house', 'btn-fac-house', 'fac-house-title', 'fac-house-cost', '🏠 집', '+4명');
    updateFacBtn('farm', 'btn-fac-farm', 'fac-farm-title', 'fac-farm-cost', '🌾 농사', '+식량');
    updateFacBtn('fishery', 'btn-fac-fishery', 'fac-fishery-title', 'fac-fishery-cost', '🐟 어업', '+물고기');

    if (kdAdvanceBtnEl && kdNextTitleEl && kdNextCostEl) {
      const totalStages = KINGDOM_CONFIG.settlementChain.length;
      if (nextStepDef) {
        const reqPop = nextStepDef.reqPop || 0;
        const reqFoodFac = nextStepDef.reqFoodFacilityLevels || 0;
        const canAfford =
          state.coins >= (nextStepDef.reqCoins || 0) &&
          kingdomDomain.food >= (nextStepDef.reqFood || 0) &&
          kingdomDomain.population >= reqPop &&
          kingdomDomain.getTotalFoodFacilityLevels() >= reqFoodFac;
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
    updatePadLabels();
  }

  return { updateHud, selectTowerType, triggerBuildFacility, advanceKingdomSettlement };
}

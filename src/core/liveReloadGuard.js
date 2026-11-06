import { KINGDOM_CONFIG, hotPatchKingdomConfig } from '../data/kingdomConfig.js';
import { eventBus } from './eventBus.js';

const LIVE_SESSION_KEY = 'coin_defense_live_session_v1';

/**
 * 🛡️ 무중단 업데이트 & 상태 보존 가드 (Zero-Downtime Live Reload Guard)
 * - 게임 플레이 도중 코드 패치, 밸런스/세계관 증설(Hot-Patch), 혹은 Vite HMR 리로드가 발생해도
 *   현재 진행 중인 스테이지·웨이브·보유 세금(코인)·설치된 방어탑·시설·마을 단계가 그대로 이어집니다.
 */
export function saveLiveSessionSnapshot(state, kingdomDomain) {
  if (!state || state.mode !== 'playing') return;
  try {
    const snapshot = {
      ts: Date.now(),
      stageIndex: state.stageIndex,
      waveIndex: state.waveIndex,
      waveTimer: state.waveTimer,
      coins: state.coins,
      castleHp: state.castleHp,
      castleMaxHp: state.castleMaxHp,
      defeatedStageEnemies: state.defeatedStageEnemies,
      selectedTower: state.selectedTower,
      playerPos: state.player
        ? { x: state.player.position.x, z: state.player.position.z, hp: state.player.hp }
        : null,
      padsState: (state.pads || []).map((p) => ({
        towerType: p.towerType,
        level: p.level,
        investedCoins: p.investedCoins,
      })),
      kingdom: kingdomDomain ? kingdomDomain.getSnapshot() : null,
      settlementChain: KINGDOM_CONFIG.settlementChain,
      facilities: KINGDOM_CONFIG.facilities,
    };
    sessionStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[LiveReloadGuard] 세션 스냅샷 저장 생략:', e);
  }
}

export function loadLiveSessionSnapshot() {
  try {
    const raw = sessionStorage.getItem(LIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - (parsed.ts || 0) < 30 * 60 * 1000) {
      if (Array.isArray(parsed.settlementChain) && parsed.settlementChain.length > KINGDOM_CONFIG.settlementChain.length) {
        KINGDOM_CONFIG.settlementChain = parsed.settlementChain;
      }
      if (parsed.facilities && typeof parsed.facilities === 'object') {
        Object.assign(KINGDOM_CONFIG.facilities, parsed.facilities);
      }
      return parsed;
    }
  } catch (_) {}
  return null;
}

export function clearLiveSessionSnapshot() {
  try {
    sessionStorage.removeItem(LIVE_SESSION_KEY);
  } catch (_) {}
}

export function applyZeroDowntimeWorldPatch(patchPayload) {
  const updated = hotPatchKingdomConfig(patchPayload);
  eventBus.emit('world:hot_patched', updated);
  return updated;
}

export function restoreOrInitLiveSession({ state, kingdomDomain, loader, combat, hud, modalOverlayEl, showBanner }) {
  loader.loadStage(0, false);
  const saved = loadLiveSessionSnapshot();
  if (saved && typeof saved.stageIndex === 'number') {
    if (saved.kingdom) kingdomDomain.applySnapshot(saved.kingdom);
    loader.loadStage(saved.stageIndex, false);
    Object.assign(state, {
      coins: saved.coins ?? state.coins,
      castleMaxHp: saved.castleMaxHp ?? state.castleMaxHp,
      castleHp: saved.castleHp ?? state.castleHp,
      mode: 'playing',
    });
    if (typeof saved.waveIndex === 'number' && saved.waveIndex > 0) combat.prepareWave(saved.waveIndex);
    (saved.padsState || []).forEach((ps, idx) => {
      const pad = state.pads[idx];
      if (pad && ps && ps.level > 0 && ps.towerType) {
        for (let lv = 0; lv < ps.level; lv++) pad.constructOrUpgrade(ps.towerType);
        pad.investedCoins = ps.investedCoins || 0;
      }
    });
    if (modalOverlayEl) modalOverlayEl.classList.add('hidden');
    hud.updateHud();
    showBanner('🛡️ 무중단 업데이트 복원 완료', '진행 중이던 마을·타워·세금 상태가 초기화 없이 이어집니다!', 2200);
  } else {
    state.mode = 'intro';
    if (modalOverlayEl) modalOverlayEl.classList.remove('hidden');
  }
  window.addEventListener('beforeunload', () => saveLiveSessionSnapshot(state, kingdomDomain));
  if (import.meta.hot) import.meta.hot.dispose(() => saveLiveSessionSnapshot(state, kingdomDomain));
}

import { hotPatchKingdomConfig } from '../data/kingdomConfig.js';
import { eventBus } from './eventBus.js';

const LIVE_SESSION_KEY = 'coin_defense_live_session_v1';

/**
 * 🛡️ 무중단 업데이트 & 상태 보존 가드 (Zero-Downtime Live Reload Guard)
 * - 게임 플레이 도중 코드 패치, 밸런스/세계관 증설(Hot-Patch), 혹은 Vite HMR 리로드가 발생해도
 *   현재 진행 중인 스테이지·웨이브·보유 세금(코인)·설치된 방어탑/울타리/감시탑/성벽·
 *   마을 발전 단계(작은 마을➔타운➔시장➔무역소➔성)가 초기화되지 않고 그대로 이어집니다.
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
    // 최근 30분 이내의 활성 플레이 세션이면 복구
    if (parsed && Date.now() - (parsed.ts || 0) < 30 * 60 * 1000) {
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

/**
 * 런타임 중 서버나 에디터로부터 새로운 세계관/밸런스 설정 패치를 수신했을 때
 * 게임을 재시작하지 않고 즉시 반영
 */
export function applyZeroDowntimeWorldPatch(patchPayload) {
  const updated = hotPatchKingdomConfig(patchPayload);
  eventBus.emit('world:hot_patched', updated);
  return updated;
}

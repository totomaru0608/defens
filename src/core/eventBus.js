/**
 * 도메인 간 결합도를 제거하는 중앙 이벤트 버스 및 무중단 상태 스냅샷 매니저
 * - 특정 도메인(사냥, 농사, 시장, 성 축조, 네트워크)을 수정/패치해도
 *   진행 중인 게임 루프나 타 도메인에 영향을 주지 않도록 격리합니다.
 */
class GameEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.warn(`[EventBus] '${event}' 핸들러 실행 중 오류 격리됨:`, err);
      }
    }
  }
}

export const eventBus = new GameEventBus();


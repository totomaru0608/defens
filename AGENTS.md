# 🛡️ AGENTS.md — 코인 건국 수비대 아키텍처 & 스파게티 방지 수칙

이 저장소에서 작업하는 모든 AI 코딩 에이전트는 유지보수성과 코드 재사용성을 최우선으로 삼으며, 아래 규칙을 엄격히 준수해야 합니다.

## 1. 파일 및 함수 길이 제한 (Hard Limits)
- **단일 파일 최대 300줄**: 어떤 `.js` 파일도 **300줄**을 넘어서는 안 됩니다 (`src/main.js`는 **최대 250줄**).
- **거대 파일 수정 시 선(先) 모듈 분리**: 기존 파일이 300줄을 초과한 상태라면, 해당 파일에 코드를 추가하기 전에 반드시 관련 로직을 `src/ui/`, `src/domains/`, `src/entities/`, `src/core/` 하위 파일로 먼저 분리(Refactor & Extract)하세요.
- **함수당 최대 40줄**: 하나의 함수는 한 가지 일만 수행해야 하며 40줄을 넘지 않습니다.

## 2. 계층별 역할 격리 (6-Layer Separation)
1. `src/core/`: `eventBus.js`, `liveReloadGuard.js`, `meshFactory.js` (공통 3D 도형·머티리얼 캐시 팩토리)
2. `src/data/`: `kingdomConfig.js` 등 순수 데이터 레지스트리 (로직 및 Three.js/DOM 참조 금지)
3. `src/entities/`: 3D 유닛/건물/발사체 클래스 (1파일 1클래스 지향)
4. `src/domains/`: 인과관계 경제(사냥 12명 한계 ➔ 집 ➔ 농사·어업 ➔ 시장 체계화 ➔ 무역소 ➔ 성) 및 전투 시뮬레이션 (DOM 직접 조작 금지)
5. `src/ui/`: HUD, 에디터, 모달, ComfyUI 스튜디오 등 순수 DOM/UI 컨트롤러
6. `src/network/` & `server/`: Cloudflare Workers + Durable Objects (`KingdomRoomDO`) 및 실시간 WebSocket 동기화

## 3. 코드 재사용(DRY) 및 무중단 업데이트(Zero-Downtime)
- 3D 메쉬와 머티리얼은 반드시 공통 팩토리 함수와 캐시(`meshFactory`)를 재사용하여 중복 생성을 막습니다.
- 모든 신규 건물·단계·유닛 증설은 `src/data/kingdomConfig.js` 레지스트리와 `src/core/liveReloadGuard.js` 스냅샷 규약을 따라, 플레이 도중 업데이트되어도 진행 중인 게임이 절대 초기화되지 않도록 합니다.

/**
 * ☁️ Cloudflare Workers + Durable Objects 실시간 멀티플레이어 & 무중단 패치 서버
 *
 * [특징]
 * 1. 방(Room/Shard) 단위 Durable Object 격리:
 *    수없이 많은 사용자가 접속해도 `/ws-kingdom?room=kingdom_1`, `kingdom_2` 등으로 자동 분산 처리
 * 2. 무중단 업데이트 (Zero-Downtime Deployment):
 *    코드/세계관 업데이트 시 Durable Object Storage(`ctx.storage`)에 건국 단계(마을➔타운➔시장➔무역소➔성)와
 *    세금 상태가 영구 보존되며, `POST /api/world-patch`로 게임 중단 없이 실시간 밸런스/세계관 증설 가능
 */

export class KingdomRoomDO {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.roomState = {
      settlementStep: 1,
      food: 30,
      population: 3,
      worldPatch: null,
      updatedAt: Date.now(),
    };

    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get('roomState');
      if (saved) {
        this.roomState = { ...this.roomState, ...saved };
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 1. 무중단 실시간 세계관/밸런스 패치 엔드포인트
    if (request.method === 'POST' && url.pathname === '/api/world-patch') {
      const patch = await request.json();
      this.roomState.worldPatch = patch;
      this.roomState.updatedAt = Date.now();
      await this.ctx.storage.put('roomState', this.roomState);

      this.broadcast(
        JSON.stringify({
          type: 'world_patch',
          patch,
          ts: Date.now(),
        })
      );
      return new Response(JSON.stringify({ ok: true, roomState: this.roomState }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // 2. WebSocket 업그레이드 (Cloudflare Hibernatable WebSocket API)
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      // 접속 즉시 현재 방의 건국 단계 및 패치 상태 전송
      server.send(
        JSON.stringify({
          type: 'room_welcome',
          kingdom: {
            settlementStep: this.roomState.settlementStep,
            food: this.roomState.food,
            population: this.roomState.population,
          },
          worldPatch: this.roomState.worldPatch,
          onlineCount: this.ctx.getWebSockets().length,
        })
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response(JSON.stringify({ status: 'ok', roomState: this.roomState }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  async webSocketMessage(ws, message) {
    try {
      const packet = JSON.parse(message);

      if (packet.kingdom) {
        let changed = false;
        if (
          typeof packet.kingdom.settlementStep === 'number' &&
          packet.kingdom.settlementStep > this.roomState.settlementStep
        ) {
          this.roomState.settlementStep = packet.kingdom.settlementStep;
          changed = true;
        }
        if (
          typeof packet.kingdom.population === 'number' &&
          packet.kingdom.population > this.roomState.population
        ) {
          this.roomState.population = packet.kingdom.population;
          changed = true;
        }
        if (changed) {
          await this.ctx.storage.put('roomState', this.roomState);
        }
      }

      this.broadcast(message, ws);
    } catch (_) {}
  }

  async webSocketClose(ws) {
    ws.close();
  }

  broadcast(rawMsg, excludeWs = null) {
    for (const client of this.ctx.getWebSockets()) {
      if (client !== excludeWs) {
        try {
          client.send(rawMsg);
        } catch (_) {}
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/ws-kingdom') || url.pathname.startsWith('/api/world-patch')) {
      const roomName = url.searchParams.get('room') || 'kingdom_channel_1';
      const id = env.KINGDOM_ROOMS.idFromName(roomName);
      const stub = env.KINGDOM_ROOMS.get(id);
      return stub.fetch(request);
    }

    // 정적 에셋 서빙 (Cloudflare Pages / Workers Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Coin Kingdom Defense Cloudflare Worker Active', { status: 200 });
  },
};


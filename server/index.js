import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * 🌐 Node.js 실시간 멀티플레이어 & 무중단 라이브 패치 서버 (server/index.js)
 * - Cloudflare Durable Objects(`server/cloudflare-worker.js`)와 100% 동일한 프로토콜(`/ws-kingdom`, `/api/world-patch`)을 제공합니다.
 * - 외부 패키지 설치 없이 순수 Node.js 표준 모듈(`node:http`, `node:crypto`)만으로 RFC 6455 WebSocket 프레임 송수신을 지원합니다.
 * - Vite 개발 서버 미들웨어로 자동 마운트되거나 단독(`node server/index.js`)으로 실행 가능합니다.
 */

const rooms = new Map();

function getOrCreateRoom(roomId = 'kingdom_channel_1') {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      clients: new Set(),
      state: {
        settlementStep: 1,
        food: 30,
        population: 3,
        worldPatch: null,
        updatedAt: Date.now(),
      },
    });
  }
  return rooms.get(roomId);
}

// RFC 6455 WebSocket 텍스트 프레임 인코딩
function encodeWsFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

// RFC 6455 WebSocket 클라이언트 프레임 디코딩
function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const opcode = firstByte & 0x0f;
    const secondByte = buffer[offset + 1];
    const isMasked = Boolean(secondByte & 0x80);
    let payloadLen = secondByte & 0x7f;
    let headerLen = 2;

    if (opcode === 0x08) {
      return { messages, closed: true, consumed: buffer.length };
    }

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    const frameTotal = headerLen + maskLen + payloadLen;
    if (offset + frameTotal > buffer.length) break;

    const payloadStart = offset + headerLen + maskLen;
    const payload = Buffer.alloc(payloadLen);

    if (isMasked) {
      const maskKey = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[payloadStart + i] ^ maskKey[i % 4];
      }
    } else {
      buffer.copy(payload, 0, payloadStart, payloadStart + payloadLen);
    }

    if (opcode === 0x01) {
      messages.push(payload.toString('utf8'));
    }

    offset += frameTotal;
  }

  return { messages, closed: false, consumed: offset };
}

function broadcastToRoom(room, jsonObj, excludeSocket = null) {
  const frame = encodeWsFrame(JSON.stringify(jsonObj));
  for (const sock of room.clients) {
    if (sock !== excludeSocket && !sock.destroyed) {
      try {
        sock.write(frame);
      } catch (_) {}
    }
  }
}

export function attachKingdomMultiplayerServer(httpServer, middlewares = null) {
  if (middlewares) {
    middlewares.use('/api/world-patch', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const patch = JSON.parse(body || '{}');
            const room = getOrCreateRoom('kingdom_channel_1');
            room.state.worldPatch = patch;
            room.state.updatedAt = Date.now();
            broadcastToRoom(room, {
              type: 'world_patch',
              patch,
              ts: Date.now(),
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, state: room.state }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
        });
        return;
      }
      if (req.method === 'GET') {
        const room = getOrCreateRoom('kingdom_channel_1');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, state: room.state, online: room.clients.size }));
        return;
      }
      next();
    });
  }

  httpServer.on('upgrade', (req, socket) => {
    const url = req.url || '';
    if (!url.startsWith('/ws-kingdom')) return;

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n',
      ].join('\r\n')
    );

    const room = getOrCreateRoom('kingdom_channel_1');
    room.clients.add(socket);

    // 접속 환영 패킷 및 현재 방 상태 동기화
    socket.write(
      encodeWsFrame(
        JSON.stringify({
          type: 'room_welcome',
          kingdom: {
            settlementStep: room.state.settlementStep,
            food: room.state.food,
            population: room.state.population,
          },
          worldPatch: room.state.worldPatch,
          onlineCount: room.clients.size,
        })
      )
    );

    let recvBuf = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);
      const { messages, closed, consumed } = decodeWsFrames(recvBuf);
      if (consumed > 0) {
        recvBuf = recvBuf.subarray(consumed);
      }
      if (closed) {
        room.clients.delete(socket);
        socket.end();
        return;
      }

      for (const raw of messages) {
        try {
          const packet = JSON.parse(raw);
          if (packet.kingdom) {
            if (
              typeof packet.kingdom.settlementStep === 'number' &&
              packet.kingdom.settlementStep > room.state.settlementStep
            ) {
              room.state.settlementStep = packet.kingdom.settlementStep;
            }
            if (
              typeof packet.kingdom.population === 'number' &&
              packet.kingdom.population > room.state.population
            ) {
              room.state.population = packet.kingdom.population;
            }
          }
          broadcastToRoom(room, packet, socket);
        } catch (_) {}
      }
    });

    socket.on('close', () => {
      room.clients.delete(socket);
    });
    socket.on('error', () => {
      room.clients.delete(socket);
    });
  });
}

// 단독 실행 시 (`node server/index.js`)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const PORT = Number(process.env.PORT || 8787);
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    const room = getOrCreateRoom('kingdom_channel_1');
    res.end(
      JSON.stringify({
        service: 'Coin Kingdom Multiplayer Server (Node.js / CF Compatible)',
        onlinePlayers: room.clients.size,
        roomState: room.state,
      })
    );
  });
  attachKingdomMultiplayerServer(server);
  server.listen(PORT, () => {
    console.log(`[KingdomServer] 실시간 멀티플레이어 서버 실행 중: ws://localhost:${PORT}/ws-kingdom`);
  });
}

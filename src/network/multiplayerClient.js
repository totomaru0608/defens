import * as THREE from 'three';
import { MAP_BOUNDS } from '../world.js';
import { eventBus } from '../core/eventBus.js';
import { getStandardMat, createCylinder, createCone, createGroundRing } from '../core/meshFactory.js';

/**
 * 🌐 다중 사용자(Multiplayer) 네트워크 & 협동(Co-op) 플레이어 동기화 모듈 (Strict <300줄 준수)
 * - WebSocket 룸 서버(/ws-kingdom) 및 BroadcastChannel 이중 동기화 지원
 * - 서버 패치/재시작 시에도 자동 재연결(Auto-Reconnect) 및 로컬 상태 보존으로 무중단 동작
 */
export class RemotePlayerAvatar {
  constructor(scene, id, name, role, colorHex, x, z, isBot = false) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.role = role;
    this.colorHex = colorHex;
    this.isBot = isBot;
    this.position = new THREE.Vector3(x, 0, z);
    this.targetPos = new THREE.Vector3(x, 0, z);
    this.lastSeen = performance.now();
    this.attackCooldown = 0;

    this.mesh = this.buildMesh(colorHex);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  buildMesh(colorHex) {
    const group = new THREE.Group();
    const torso = createCylinder(0.38, 0.5, 0.98, 8, colorHex, 0.5, { y: 0.7 });
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), getStandardMat(0xfde68a, 0.65));
    head.position.y = 1.42;
    const helm = createCone(0.4, 0.38, 7, 0xfacc15, 0.35, { y: 1.74 });
    const ring = createGroundRing(0.75, 0.98, colorHex, { y: 0.08 });
    group.add(torso, head, helm, ring);
    return group;
  }

  update(dt, elapsed, { enemies, wildPreys, survivors, onHitEnemy, onHitPrey }) {
    if (!this.isBot) {
      const toTarget = new THREE.Vector3().subVectors(this.targetPos, this.position);
      toTarget.y = 0;
      if (toTarget.length() > 0.1) {
        this.position.lerp(this.targetPos, Math.min(1, 10 * dt));
        this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
      this.mesh.position.set(this.position.x, Math.abs(Math.sin(elapsed * 7)) * 0.1, this.position.z);
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    let goal = null;
    let targetEnemy = null;
    let bestEnemyDist = 14.0;

    for (const e of enemies) {
      if (e.dead || e.reachedCastle) continue;
      const d = e.position.distanceTo(this.position);
      if (d < bestEnemyDist) {
        bestEnemyDist = d;
        targetEnemy = e;
      }
    }

    if (targetEnemy) {
      goal = targetEnemy.position;
      if (bestEnemyDist <= 3.3 && this.attackCooldown <= 0) {
        this.attackCooldown = 0.72;
        onHitEnemy(targetEnemy, 20, '#a7f3d0');
      }
    } else {
      for (const prey of wildPreys) {
        if (prey.dead) continue;
        goal = prey.position;
        if (prey.position.distanceTo(this.position) <= 3.0 && this.attackCooldown <= 0) {
          this.attackCooldown = 0.8;
          onHitPrey(prey, 18);
        }
        break;
      }
    }

    if (!goal && survivors.length > 0) goal = survivors[0].position;

    if (goal) {
      const dir = new THREE.Vector3().subVectors(goal, this.position);
      dir.y = 0;
      if (dir.length() > 1.3) {
        dir.normalize();
        this.position.addScaledVector(dir, 7.6 * dt);
        this.position.x = THREE.MathUtils.clamp(this.position.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
        this.position.z = THREE.MathUtils.clamp(this.position.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    this.mesh.position.set(this.position.x, Math.abs(Math.sin(elapsed * 7.5)) * 0.12, this.position.z);
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

export class MultiplayerNetworkManager {
  constructor(scene, worldLabelsContainer) {
    this.scene = scene;
    this.worldLabelsContainer = worldLabelsContainer;
    this.clientId = 'p_' + Math.random().toString(36).slice(2, 9);
    this.roomId = 'kingdom_channel_1';
    this.peers = new Map();
    this.coopBotsEnabled = true;
    this.syncTimer = 0;
    this.ws = null;
    this.bc = null;
    this.initChannels();
  }

  initChannels() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('coin_kingdom_mp_v1');
      this.bc.onmessage = (ev) => this.handleIncomingPacket(ev.data);
    }
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws-kingdom`);
      ws.onopen = () => {
        this.ws = ws;
        this.sendPacket({ type: 'join', roomId: this.roomId });
      };
      ws.onmessage = (ev) => {
        try {
          this.handleIncomingPacket(JSON.parse(ev.data));
        } catch (_) {}
      };
      ws.onclose = () => {
        this.ws = null;
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      ws.onerror = () => ws.close();
    } catch (_) {}
  }

  sendPacket(payload) {
    const packet = { ...payload, senderId: this.clientId, roomId: this.roomId, ts: Date.now() };
    if (this.bc) {
      try {
        this.bc.postMessage(packet);
      } catch (_) {}
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(packet));
      } catch (_) {}
    }
  }

  handleIncomingPacket(packet) {
    if (!packet || packet.senderId === this.clientId) return;
    if (packet.type === 'room_welcome') {
      if (packet.kingdom) eventBus.emit('mp:kingdom_sync', packet.kingdom);
      if (packet.worldPatch) eventBus.emit('mp:world_patch', packet.worldPatch);
      return;
    }
    if (packet.type === 'world_patch' && packet.patch) {
      eventBus.emit('mp:world_patch', packet.patch);
      return;
    }
    if (packet.type === 'state_sync') {
      let peer = this.peers.get(packet.senderId);
      if (!peer) {
        const avatar = new RemotePlayerAvatar(
          this.scene, packet.senderId, packet.name || `개척자 ${packet.senderId.slice(-3)}`,
          packet.role || '⚔️ 동맹 수비대', 0x10b981, packet.x || 0, packet.z || 0, false
        );
        const labelEl = document.createElement('div');
        labelEl.className = 'pad-label mp-nameplate';
        labelEl.innerHTML = `<span>🌐 ${avatar.name}</span>`;
        this.worldLabelsContainer.appendChild(labelEl);
        peer = { avatar, labelEl };
        this.peers.set(packet.senderId, peer);
      }
      peer.avatar.targetPos.set(packet.x || 0, 0, packet.z || 0);
      peer.avatar.lastSeen = performance.now();
      if (packet.kingdom) eventBus.emit('mp:kingdom_sync', packet.kingdom);
    } else if (packet.type === 'kingdom_upgrade') {
      eventBus.emit('mp:kingdom_sync', packet.kingdom);
    }
  }

  initStageCoopPartners() {
    this.clearPeers();
    if (!this.coopBotsEnabled) return;
    const botConfigs = [
      { id: 'bot_hunter', name: '아린', role: '🏹 숲 수렵가', color: 0x10b981, x: -10, z: -6 },
      { id: 'bot_builder', name: '볼드', role: '🌾 개척 영주', color: 0xa855f7, x: 10, z: 5 },
    ];
    for (const cfg of botConfigs) {
      const avatar = new RemotePlayerAvatar(this.scene, cfg.id, cfg.name, cfg.role, cfg.color, cfg.x, cfg.z, true);
      const labelEl = document.createElement('div');
      labelEl.className = 'pad-label mp-nameplate';
      labelEl.innerHTML = `<span>${cfg.role} · ${cfg.name}</span>`;
      this.worldLabelsContainer.appendChild(labelEl);
      this.peers.set(cfg.id, { avatar, labelEl });
    }
  }

  clearPeers() {
    for (const [, peer] of this.peers) {
      peer.avatar.destroy();
      peer.labelEl.remove();
    }
    this.peers.clear();
  }

  getActivePlayerCount() {
    return 1 + this.peers.size;
  }

  update(dt, elapsed, { playerPos, kingdomSnapshot, enemies, wildPreys, survivors, onHitEnemy, onHitPrey, worldToScreen }) {
    if ((this.syncTimer += dt) >= 0.15 && playerPos) {
      this.syncTimer = 0;
      this.sendPacket({
        type: 'state_sync',
        x: Math.round(playerPos.x * 10) / 10,
        z: Math.round(playerPos.z * 10) / 10,
        kingdom: kingdomSnapshot,
      });
    }

    const now = performance.now();
    for (const [id, peer] of this.peers.entries()) {
      if (!peer.avatar.isBot && now - peer.avatar.lastSeen > 8000) {
        peer.avatar.destroy();
        peer.labelEl.remove();
        this.peers.delete(id);
        continue;
      }
      peer.avatar.update(dt, elapsed, { enemies, wildPreys, survivors, onHitEnemy, onHitPrey });
      const sc = worldToScreen(peer.avatar.position.clone().setY(2.25));
      peer.labelEl.style.display = sc.visible ? 'flex' : 'none';
      if (sc.visible) {
        peer.labelEl.style.left = `${sc.x}px`;
        peer.labelEl.style.top = `${sc.y}px`;
      }
    }
  }
}

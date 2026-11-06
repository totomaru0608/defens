import * as THREE from 'three';
import { makeLowPolyMaterial, MAP_BOUNDS } from './world.js';
import { TOWER_TYPES, ENEMY_TYPES } from './stages.js';

// 각도 보간 헬퍼
function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * Math.min(1, t);
}

// 1. 독창적인 주인공 캐릭터: "코인 수비대장" 3D 모델 및 물리 이동
export class PlayerHero {
  constructor(scene, startX = 0, startZ = 0) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(startX, 0, startZ);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetPos = new THREE.Vector3(startX, 0, startZ);

    // 이동 속도 및 가속도 파라미터 (순간이동 방지, 부드러운 가속/감속)
    this.maxSpeed = 11.8;
    this.acceleration = 52.0;
    this.damping = 10.5;
    this.slowRadius = 2.0;
    this.stopRadius = 0.18;

    // 전투 스탯
    this.maxHp = 120;
    this.hp = 120;
    this.attackRange = 3.8;
    this.attackDamage = 32;
    this.attackInterval = 0.48;
    this.attackTimer = 0;
    this.swingAnimTime = 0;

    // 액티브 스킬 (황금 충격파 베기)
    this.skillCooldown = 4.5;
    this.skillTimer = 0;
    this.skillRadius = 6.2;
    this.skillDamage = 85;

    this.buildModel();
    this.group.position.copy(this.position);
    scene.add(this.group);

    // 마우스 이동 목표 지점 3D 마커
    this.targetMarker = this.createTargetMarker();
    scene.add(this.targetMarker);
  }

  buildModel() {
    this.bodyPivot = new THREE.Group();
    this.group.add(this.bodyPivot);

    const armorMat = makeLowPolyMaterial(0x2563eb);
    const goldMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.4, roughness: 0.35 });
    const skinMat = makeLowPolyMaterial(0xfde68a);
    const capeMat = makeLowPolyMaterial(0xdc2626);
    const steelMat = makeLowPolyMaterial(0xe2e8f0, { metalness: 0.5, roughness: 0.3 });
    const darkMat = makeLowPolyMaterial(0x1e293b);

    // 플레이어 발밑 사거리 표시 링
    const rangeGeo = new THREE.RingGeometry(this.attackRange - 0.12, this.attackRange, 36);
    rangeGeo.rotateX(-Math.PI / 2);
    const rangeMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    });
    this.rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
    this.rangeRing.position.y = 0.08;
    this.group.add(this.rangeRing);

    // 다리 (왼발/오른발)
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.36), darkMat);
    this.leftLeg.position.set(-0.22, 0.28, 0);
    this.leftLeg.castShadow = true;
    this.bodyPivot.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.36), darkMat);
    this.rightLeg.position.set(0.22, 0.28, 0);
    this.rightLeg.castShadow = true;
    this.bodyPivot.add(this.rightLeg);

    // 몸통 갑옷
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.95, 7), armorMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    this.bodyPivot.add(torso);

    // 황금 가슴 벨트
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.56, 0.2, 7), goldMat);
    belt.position.y = 0.65;
    this.bodyPivot.add(belt);

    // 등 뒤 붉은 망토
    this.cape = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.12), capeMat);
    this.cape.position.set(0, 0.92, -0.45);
    this.cape.rotation.x = 0.22;
    this.cape.castShadow = true;
    this.bodyPivot.add(this.cape);

    // 머리 & 로우폴리 투구
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    this.bodyPivot.add(head);

    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.45, 7), armorMat);
    helmet.position.y = 1.92;
    helmet.castShadow = true;
    this.bodyPivot.add(helmet);

    // 투구 위 황금 깃털 장식
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 5), goldMat);
    plume.position.set(0, 2.38, -0.08);
    plume.rotation.x = -0.35;
    plume.castShadow = true;
    this.bodyPivot.add(plume);

    // 왼팔 + 코인 문양 황금 방패
    this.shieldArm = new THREE.Group();
    this.shieldArm.position.set(-0.62, 1.05, 0.18);
    const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 8), goldMat);
    shieldDisc.rotation.z = Math.PI / 2;
    shieldDisc.rotation.y = 0.35;
    shieldDisc.castShadow = true;
    this.shieldArm.add(shieldDisc);
    this.bodyPivot.add(this.shieldArm);

    // 오른팔 + 황금빛 기사 대검
    this.weaponArm = new THREE.Group();
    this.weaponArm.position.set(0.62, 1.08, 0.15);

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 6), goldMat);
    hilt.rotation.x = Math.PI / 2;
    this.weaponArm.add(hilt);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.16), goldMat);
    guard.position.set(0, 0, 0.22);
    this.weaponArm.add(guard);

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.55, 4), steelMat);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0, 1.0);
    blade.castShadow = true;
    this.weaponArm.add(blade);

    this.bodyPivot.add(this.weaponArm);
  }

  createTargetMarker() {
    const group = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.32, 0.52, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.09;
    group.add(ring);

    const dotGeo = new THREE.CircleGeometry(0.16, 12);
    dotGeo.rotateX(-Math.PI / 2);
    const dot = new THREE.Mesh(dotGeo, ringMat);
    dot.position.y = 0.095;
    group.add(dot);

    return group;
  }

  setMoveTarget(worldPoint) {
    // 맵 경계 내부로 목표 지점 클램프
    this.targetPos.x = THREE.MathUtils.clamp(worldPoint.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    this.targetPos.z = THREE.MathUtils.clamp(worldPoint.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
    this.targetPos.y = 0;

    this.targetMarker.position.set(this.targetPos.x, 0, this.targetPos.z);
  }

  update(dt, elapsedTime) {
    // 1. 목표 지점까지의 거리 계산 및 가속도/감속 기반 부드러운 이동
    const toTarget = new THREE.Vector3().subVectors(this.targetPos, this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist > this.stopRadius) {
      const dir = toTarget.clone().normalize();
      // 목표 지점 근처에서 자연스럽게 감속
      const speedFactor = dist < this.slowRadius ? dist / this.slowRadius : 1.0;
      const desiredSpeed = this.maxSpeed * Math.max(0.18, speedFactor);
      const desiredVel = dir.multiplyScalar(desiredSpeed);

      const steer = desiredVel.sub(this.velocity);
      const maxAccelStep = this.acceleration * dt;
      if (steer.length() > maxAccelStep) {
        steer.normalize().multiplyScalar(maxAccelStep);
      }
      this.velocity.add(steer);
    } else {
      // 도착 시 부드럽게 정지
      this.velocity.multiplyScalar(Math.max(0, 1 - this.damping * dt));
    }

    // 최대 속도 제한
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    // 위치 업데이트 및 맵 경계 제한(Clamp)
    this.position.addScaledVector(this.velocity, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
    this.group.position.copy(this.position);

    // 이동 방향으로 부드러운 회전
    const speed = this.velocity.length();
    if (speed > 0.25) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.bodyPivot.rotation.y = lerpAngle(this.bodyPivot.rotation.y, targetAngle, 14 * dt);

      // 걷기 바운스 & 다리 스윙 애니메이션
      const walkCycle = elapsedTime * 13;
      this.bodyPivot.position.y = Math.abs(Math.sin(walkCycle)) * 0.16;
      this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.55;
      this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.55;
      this.cape.rotation.x = 0.28 + Math.min(0.4, speed * 0.03) + Math.sin(walkCycle * 2) * 0.08;
    } else {
      this.bodyPivot.position.y = Math.sin(elapsedTime * 3.5) * 0.04;
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
    }

    // 무기 휘두르기 애니메이션
    if (this.swingAnimTime > 0) {
      this.swingAnimTime = Math.max(0, this.swingAnimTime - dt * 5.5);
      const s = Math.sin((1 - this.swingAnimTime) * Math.PI);
      this.weaponArm.rotation.y = -s * 1.45;
      this.weaponArm.rotation.x = s * 0.45;
    } else {
      this.weaponArm.rotation.y = 0;
      this.weaponArm.rotation.x = 0;
    }

    // 타겟 마커 펄스
    const markerScale = 0.9 + Math.sin(elapsedTime * 6) * 0.12;
    this.targetMarker.scale.set(markerScale, 1, markerScale);

    // 쿨타임 감소 및 미세 체력 회복
    if (this.attackTimer > 0) this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.skillTimer > 0) this.skillTimer = Math.max(0, this.skillTimer - dt);
    if (this.hp < this.maxHp && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + 2.2 * dt);
    }
  }

  faceToward(targetVec) {
    const angle = Math.atan2(targetVec.x - this.position.x, targetVec.z - this.position.z);
    this.bodyPivot.rotation.y = lerpAngle(this.bodyPivot.rotation.y, angle, 0.55);
  }

  triggerSwing() {
    this.swingAnimTime = 1.0;
  }

  destroy() {
    this.scene.remove(this.group);
    this.scene.remove(this.targetMarker);
  }
}

// 2. 건설 구역 (Build Pad) 및 방어탑 (Defense Tower)
export class BuildPad {
  constructor(scene, padData, index) {
    this.scene = scene;
    this.index = index;
    this.position = new THREE.Vector3(padData.x, 0, padData.z);
    this.baseCost = padData.baseCost || 30;

    // 상태: null(미설치) 또는 설치된 타워 정보
    this.towerType = null;
    this.level = 0;
    this.maxLevel = 3;
    this.investedCoins = 0;
    this.requiredCoins = this.baseCost;
    this.feedCooldown = 0;
    this.fireTimer = 0;
    this.popAnim = 0;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.towerGroup = new THREE.Group();
    this.group.add(this.towerGroup);
    this.turretHead = null;

    this.buildPadBase();
  }

  buildPadBase() {
    const stoneMat = makeLowPolyMaterial(0xcbd5e1);
    const rimMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.3, roughness: 0.45 });

    // 팔각형 석재 패드 베이스
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.24, 8), stoneMat);
    base.position.y = 0.12;
    base.receiveShadow = true;
    base.castShadow = true;
    this.group.add(base);

    // 황금 테두리 링
    const ringGeo = new THREE.RingGeometry(1.78, 2.02, 24);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.ringMesh.position.y = 0.08;
    this.group.add(this.ringMesh);

    // 건설 구역 위 회전하는 입체 황금 코인 홀로그램
    this.floatingCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12), rimMat);
    this.floatingCoin.rotation.z = Math.PI / 2;
    this.floatingCoin.position.y = 1.45;
    this.floatingCoin.castShadow = true;
    this.group.add(this.floatingCoin);
  }

  // 현재 건설/강화에 필요한 총 코인 계산
  getCurrentTargetCost(selectedTypeKey) {
    if (this.level === 0) {
      const t = TOWER_TYPES[selectedTypeKey] || TOWER_TYPES.crossbow;
      return Math.round((this.baseCost / 30) * t.baseCost);
    }
    if (this.level >= this.maxLevel) return 0;
    const t = TOWER_TYPES[this.towerType];
    return t.upgradeCosts[this.level - 1] || 50;
  }

  constructOrUpgrade(selectedTypeKey) {
    if (this.level === 0) {
      this.towerType = selectedTypeKey;
      this.level = 1;
    } else if (this.level < this.maxLevel) {
      this.level += 1;
    }
    this.investedCoins = 0;
    this.popAnim = 1.0;
    this.floatingCoin.visible = false;
    this.rebuildTowerMesh();
  }

  rebuildTowerMesh() {
    while (this.towerGroup.children.length > 0) {
      this.towerGroup.remove(this.towerGroup.children[0]);
    }

    const typeDef = TOWER_TYPES[this.towerType];
    const stoneMat = makeLowPolyMaterial(0xe2e8f0);
    const woodMat = makeLowPolyMaterial(0x92400e);
    const accentMat = makeLowPolyMaterial(typeDef.color, {
      metalness: 0.25,
      roughness: 0.4,
    });
    const darkMetalMat = makeLowPolyMaterial(0x334155, { metalness: 0.5, roughness: 0.35 });
    const goldMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.4, roughness: 0.3 });

    const heightScale = 1 + (this.level - 1) * 0.22;

    // 탑 기단부
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.35, 1.7 * heightScale, 7),
      stoneMat
    );
    pillar.position.y = 0.24 + (1.7 * heightScale) / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.towerGroup.add(pillar);

    // 레벨 표시 황금 링
    for (let lv = 0; lv < this.level; lv++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.14, 7), goldMat);
      band.position.y = 0.65 + lv * 0.42;
      this.towerGroup.add(band);
    }

    const topY = 0.24 + 1.7 * heightScale;
    this.turretHead = new THREE.Group();
    this.turretHead.position.set(0, topY + 0.45, 0);
    this.towerGroup.add(this.turretHead);

    if (this.towerType === 'crossbow') {
      // 연사 석궁탑
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.95), woodMat);
      mount.castShadow = true;
      this.turretHead.add(mount);

      const bowArc = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.22), accentMat);
      bowArc.position.set(0, 0.18, 0.45);
      bowArc.castShadow = true;
      this.turretHead.add(bowArc);

      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.35), darkMetalMat);
      barrel.position.set(0, 0.22, 0.35);
      this.turretHead.add(barrel);
    } else if (this.towerType === 'cannon') {
      // 화염 대포탑
      const basecarriage = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 1.05), woodMat);
      this.turretHead.add(basecarriage);

      const cannonBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.48, 1.55, 8),
        darkMetalMat
      );
      cannonBarrel.rotation.x = Math.PI / 2 - 0.18;
      cannonBarrel.position.set(0, 0.28, 0.35);
      cannonBarrel.castShadow = true;
      this.turretHead.add(cannonBarrel);

      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 8), accentMat);
      muzzleRing.rotation.x = Math.PI / 2 - 0.18;
      muzzleRing.position.set(0, 0.4, 1.0);
      this.turretHead.add(muzzleRing);
    } else {
      // 빙결 수정탑
      const crystalMat = makeLowPolyMaterial(0x38bdf8, {
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 0), crystalMat);
      crystal.position.y = 0.38;
      crystal.scale.set(0.85, 1.45, 0.85);
      crystal.castShadow = true;
      this.turretHead.add(crystal);
      this.crystalMesh = crystal;
    }
  }

  getStats() {
    if (this.level === 0) return null;
    const base = TOWER_TYPES[this.towerType];
    const mult = 1 + (this.level - 1) * 0.38;
    return {
      ...base,
      damage: Math.round(base.damage * mult),
      range: base.range + (this.level - 1) * 0.9,
      fireRate: base.fireRate / (1 + (this.level - 1) * 0.15),
    };
  }

  update(dt, elapsedTime) {
    if (this.feedCooldown > 0) this.feedCooldown = Math.max(0, this.feedCooldown - dt);

    if (this.level === 0) {
      this.floatingCoin.rotation.y = elapsedTime * 2.6;
      this.floatingCoin.position.y = 1.35 + Math.sin(elapsedTime * 3.5 + this.index) * 0.18;
    } else {
      if (this.popAnim > 0) {
        this.popAnim = Math.max(0, this.popAnim - dt * 3.2);
        const s = 1 + Math.sin(this.popAnim * Math.PI) * 0.32;
        this.towerGroup.scale.set(s, s, s);
      } else {
        this.towerGroup.scale.set(1, 1, 1);
      }

      if (this.crystalMesh) {
        this.crystalMesh.rotation.y = elapsedTime * 2.2;
        this.crystalMesh.position.y = 0.38 + Math.sin(elapsedTime * 4) * 0.12;
      }
    }

    if (this.fireTimer > 0) {
      this.fireTimer = Math.max(0, this.fireTimer - dt);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

// 3. 길을 따라 이동하는 붉은 적 무리 (Red Enemy Horde)
export class RedEnemy {
  constructor(scene, typeKey, roadCurve, stageMultiplier = 1) {
    this.scene = scene;
    const def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.imp;
    this.typeKey = typeKey;
    this.def = def;
    this.roadCurve = roadCurve;
    this.curveLength = roadCurve.getLength();

    this.maxHp = Math.round(def.hp * stageMultiplier);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.coinReward = def.coinReward;
    this.castleDamage = def.castleDamage;
    this.playerDamage = def.playerDamage;

    // 경로 진행도 (0.0 -> 1.0)
    this.progress = 0;
    // 무리가 자연스럽게 보이도록 좌우 차선 오프셋 부여
    this.laneOffset = (Math.random() - 0.5) * 2.2;
    this.walkSeed = Math.random() * 10;

    this.slowTimer = 0;
    this.slowFactor = 1.0;
    this.attackCooldown = 0;
    this.dead = false;
    this.reachedCastle = false;

    this.position = new THREE.Vector3();
    this.group = new THREE.Group();
    this.buildModel();
    this.updatePositionOnRoad(0);
    this.scene.add(this.group);
  }

  buildModel() {
    const s = this.def.scale;
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.scale.set(s, s, s);
    this.group.add(this.bodyGroup);

    const bodyMat = makeLowPolyMaterial(this.def.bodyColor);
    const accentMat = makeLowPolyMaterial(this.def.accentColor);
    const hornMat = makeLowPolyMaterial(0xfef08a);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 몸통
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.95, 6), bodyMat);
    torso.position.y = 0.65;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // 머리
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), bodyMat);
    head.position.y = 1.38;
    head.castShadow = true;
    this.bodyGroup.add(head);

    // 노란 눈
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.08), eyeMat);
    leftEye.position.set(-0.14, 1.42, 0.36);
    this.bodyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.08), eyeMat);
    rightEye.position.set(0.14, 1.42, 0.36);
    this.bodyGroup.add(rightEye);

    // 뿔 장식
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), hornMat);
    leftHorn.position.set(-0.28, 1.72, 0);
    leftHorn.rotation.z = 0.35;
    this.bodyGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), hornMat);
    rightHorn.position.set(0.28, 1.72, 0);
    rightHorn.rotation.z = -0.35;
    this.bodyGroup.add(rightHorn);

    // 어깨 갑옷 & 무기
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.38), accentMat);
    shoulderL.position.set(-0.55, 0.98, 0);
    this.bodyGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.38), accentMat);
    shoulderR.position.set(0.55, 0.98, 0);
    this.bodyGroup.add(shoulderR);

    const club = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.95, 5), accentMat);
    club.rotation.x = Math.PI / 2;
    club.position.set(0.55, 0.78, 0.48);
    club.castShadow = true;
    this.bodyGroup.add(club);

    // 머리 위 3D 체력바
    const barY = 2.15 * s;
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
    );
    bgPlane.position.y = barY;
    this.group.add(bgPlane);

    this.hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.18, 0.11),
      new THREE.MeshBasicMaterial({
        color: this.def.isBoss ? 0xfacc15 : 0xef4444,
        side: THREE.DoubleSide,
      })
    );
    this.hpBarFill.position.set(0, barY, 0.01);
    this.group.add(this.hpBarFill);
    this.hpBarBg = bgPlane;
  }

  applySlow(factor, duration) {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.scale.x = Math.max(0.001, ratio);
    this.hpBarFill.position.x = -(1 - ratio) * 0.59;

    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  updatePositionOnRoad(dt, elapsedTime = 0) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1.0;
    }

    const currentSpeed = this.baseSpeed * this.slowFactor;
    this.progress += (currentSpeed * dt) / this.curveLength;

    if (this.progress >= 1.0) {
      this.progress = 1.0;
      this.reachedCastle = true;
      return;
    }

    const pt = this.roadCurve.getPointAt(this.progress);
    const tangent = this.roadCurve.getTangentAt(this.progress);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    this.position.copy(pt).addScaledVector(normal, this.laneOffset);
    this.position.y = 0;
    this.group.position.copy(this.position);

    // 진행 방향 바라보기 + 걸음걸이 바운스
    const angle = Math.atan2(tangent.x, tangent.z);
    this.bodyGroup.rotation.y = angle;
    const bob = Math.abs(Math.sin(elapsedTime * 11 + this.walkSeed)) * 0.18;
    this.bodyGroup.position.y = bob;
    this.bodyGroup.rotation.z = Math.sin(elapsedTime * 11 + this.walkSeed) * 0.09;
  }

  update(dt, elapsedTime, cameraPosition) {
    if (this.dead || this.reachedCastle) return;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    this.updatePositionOnRoad(dt, elapsedTime);

    // 체력바가 카메라를 향하도록 빌보드 회전
    if (cameraPosition) {
      this.hpBarBg.lookAt(cameraPosition);
      this.hpBarFill.lookAt(cameraPosition);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

// 4. 적 처치 시 드롭되는 3D 코인 (튀어오른 뒤 플레이어에게 자석처럼 흡수)
export class DroppedCoin {
  constructor(scene, originPos, value = 10) {
    this.scene = scene;
    this.value = value;
    this.position = originPos.clone();
    this.position.y = 0.5;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.2 + Math.random() * 2.5;
    this.velocity = new THREE.Vector3(Math.cos(angle) * speed, 5.5 + Math.random() * 2, Math.sin(angle) * speed);
    this.age = 0;
    this.collected = false;

    const coinMat = makeLowPolyMaterial(0xfacc15, {
      metalness: 0.45,
      roughness: 0.25,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
    });
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 10), coinMat);
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(dt, playerPos) {
    this.age += dt;
    this.mesh.rotation.y += dt * 6.5;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y += 0.9;
    const dist = toPlayer.length();

    // 일정 거리 안이거나 드롭 후 0.55초가 지나면 플레이어에게 자석처럼 빨려 들어감
    if (this.age > 0.35 && (dist < 7.5 || this.age > 1.1)) {
      const pullSpeed = 16 + this.age * 10;
      this.position.addScaledVector(toPlayer.normalize(), pullSpeed * dt);
      if (dist < 1.05) {
        this.collected = true;
      }
    } else {
      // 중력 및 바닥 바운스
      this.velocity.y -= 16.5 * dt;
      this.position.addScaledVector(this.velocity, dt);
      if (this.position.y < 0.38) {
        this.position.y = 0.38;
        this.velocity.y *= -0.45;
        this.velocity.x *= 0.7;
        this.velocity.z *= 0.7;
      }
    }

    this.mesh.position.copy(this.position);
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

// 5. 방어탑 발사체 (석궁 화살, 화염 포탄, 빙결 광선 구체)
export class TowerProjectile {
  constructor(scene, startPos, targetEnemy, stats) {
    this.scene = scene;
    this.position = startPos.clone();
    this.targetEnemy = targetEnemy;
    this.lastTargetPos = targetEnemy.position.clone().setY(0.8);
    this.stats = stats;
    this.speed = stats.id === 'cannon' ? 16 : 24;
    this.hit = false;

    const mat = makeLowPolyMaterial(stats.color, {
      emissive: stats.color,
      emissiveIntensity: 0.4,
    });
    const radius = stats.id === 'cannon' ? 0.32 : 0.2;
    this.mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), mat);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(dt) {
    if (this.targetEnemy && !this.targetEnemy.dead && !this.targetEnemy.reachedCastle) {
      this.lastTargetPos.copy(this.targetEnemy.position).setY(0.85);
    }

    const toTarget = new THREE.Vector3().subVectors(this.lastTargetPos, this.position);
    const dist = toTarget.length();
    if (dist <= this.speed * dt + 0.35) {
      this.position.copy(this.lastTargetPos);
      this.hit = true;
    } else {
      this.position.addScaledVector(toTarget.normalize(), this.speed * dt);
    }
    this.mesh.position.copy(this.position);
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}


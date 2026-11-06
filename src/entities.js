import * as THREE from 'three';
import { makeLowPolyMaterial, MAP_BOUNDS } from './world.js';
import { TOWER_TYPES, ENEMY_TYPES, ANIMAL_MOTION_CONFIG } from './stages.js';

// 각도 보간 헬퍼
function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * Math.min(1, t);
}

// ============================================================================
// ComfyUI 스타일 다관절 3D 동물 적(코끼리, 하마, 기린) 모델 & 모션 리깅 빌더
// ============================================================================
export function buildAnimalRig(animalType, bodyColorHex, accentColorHex) {
  const root = new THREE.Group();
  const cfg = ANIMAL_MOTION_CONFIG[animalType] || {};
  const bodyMat = makeLowPolyMaterial(bodyColorHex ?? cfg.bodyColor ?? 0xdc2626);
  const accentMat = makeLowPolyMaterial(accentColorHex ?? cfg.accentColor ?? 0xfbbf24);
  const ivoryMat = makeLowPolyMaterial(0xfef9c3, { roughness: 0.4 });
  const darkMat = makeLowPolyMaterial(0x1e293b);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const rig = {
    root,
    legs: [], // [FL, FR, BL, BR]
    trunkPivot: null,
    trunkTipPivot: null,
    leftEarPivot: null,
    rightEarPivot: null,
    jawPivot: null,
    neckPivot: null,
    tailPivot: null,
  };

  if (animalType === 'elephant') {
    // 🐘 1. 붉은 전투 코끼리 (War Elephant)
    // 4개의 굵은 다리 관절
    const legCoords = [
      [-0.48, 0.55, 0.58], // FL
      [0.48, 0.55, 0.58],  // FR
      [-0.48, 0.55, -0.58], // BL
      [0.48, 0.55, -0.58],  // BR
    ];
    legCoords.forEach(([lx, ly, lz]) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.72, 7), bodyMat);
      legMesh.position.y = -0.22;
      legMesh.castShadow = true;
      legPivot.add(legMesh);
      root.add(legPivot);
      rig.legs.push(legPivot);
    });

    // 묵직한 코끼리 몸통
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.08, 1.75), bodyMat);
    body.position.set(0, 0.98, 0);
    body.castShadow = true;
    root.add(body);

    // 등 위 전투 안장/휘장
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.05), accentMat);
    saddle.position.set(0, 1.48, -0.05);
    saddle.castShadow = true;
    root.add(saddle);

    // 코끼리 머리
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), bodyMat);
    head.position.set(0, 1.28, 0.98);
    head.castShadow = true;
    root.add(head);

    // 눈
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    eyeL.position.set(-0.36, 1.38, 1.38);
    root.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    eyeR.position.set(0.36, 1.38, 1.38);
    root.add(eyeR);

    // 양쪽 커다란 귀 (펄럭임 관절)
    rig.leftEarPivot = new THREE.Group();
    rig.leftEarPivot.position.set(-0.52, 1.32, 0.88);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.78, 0.12), bodyMat);
    earL.position.set(-0.28, -0.05, 0);
    earL.castShadow = true;
    rig.leftEarPivot.add(earL);
    root.add(rig.leftEarPivot);

    rig.rightEarPivot = new THREE.Group();
    rig.rightEarPivot.position.set(0.52, 1.32, 0.88);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.78, 0.12), bodyMat);
    earR.position.set(0.28, -0.05, 0);
    earR.castShadow = true;
    rig.rightEarPivot.add(earR);
    root.add(rig.rightEarPivot);

    // 2단 관절 코(Trunk) + 양쪽 상아(Tusks)
    rig.trunkPivot = new THREE.Group();
    rig.trunkPivot.position.set(0, 1.15, 1.42);
    const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.62, 6), bodyMat);
    trunkUpper.position.set(0, -0.25, 0.12);
    trunkUpper.rotation.x = 0.35;
    trunkUpper.castShadow = true;
    rig.trunkPivot.add(trunkUpper);

    rig.trunkTipPivot = new THREE.Group();
    rig.trunkTipPivot.position.set(0, -0.5, 0.22);
    const trunkLower = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.55, 6), bodyMat);
    trunkLower.position.set(0, -0.2, 0.14);
    trunkLower.rotation.x = 0.65;
    rig.trunkTipPivot.add(trunkLower);
    rig.trunkPivot.add(rig.trunkTipPivot);
    root.add(rig.trunkPivot);

    // 하얀 상아 한 쌍
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.75, 6), ivoryMat);
      tusk.position.set(side * 0.34, 0.96, 1.58);
      tusk.rotation.x = Math.PI / 2 - 0.35;
      tusk.rotation.z = side * -0.15;
      tusk.castShadow = true;
      root.add(tusk);
    }

    // 꼬리
    rig.tailPivot = new THREE.Group();
    rig.tailPivot.position.set(0, 1.1, -0.88);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 5), darkMat);
    tail.position.set(0, -0.24, -0.08);
    tail.rotation.x = -0.35;
    rig.tailPivot.add(tail);
    root.add(rig.tailPivot);
  } else if (animalType === 'hippo') {
    // 🦛 2. 진홍 강철하마 (Armored Hippo - 입 크게 벌렸다 다무는 Chomp 관절)
    const legCoords = [
      [-0.46, 0.42, 0.55],
      [0.46, 0.42, 0.55],
      [-0.46, 0.42, -0.55],
      [0.46, 0.42, -0.55],
    ];
    legCoords.forEach(([lx, ly, lz]) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.52, 6), bodyMat);
      legMesh.position.y = -0.15;
      legMesh.castShadow = true;
      legPivot.add(legMesh);
      root.add(legPivot);
      rig.legs.push(legPivot);
    });

    // 통통하고 묵직한 하마 몸통
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.95, 1.68), bodyMat);
    body.position.set(0, 0.78, -0.05);
    body.castShadow = true;
    root.add(body);

    // 등 갑옷 징 장식
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.1), accentMat);
    backPlate.position.set(0, 1.28, -0.05);
    root.add(backPlate);

    // 머리 & 윗주둥이
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.78), bodyMat);
    head.position.set(0, 0.96, 0.88);
    head.castShadow = true;
    root.add(head);

    const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.46, 0.72), accentMat);
    upperSnout.position.set(0, 0.88, 1.42);
    upperSnout.castShadow = true;
    root.add(upperSnout);

    // 콧구멍 & 작은 귀 & 눈
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), darkMat);
      nostril.position.set(side * 0.28, 1.14, 1.58);
      root.add(nostril);

      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.14), bodyMat);
      ear.position.set(side * 0.44, 1.38, 0.72);
      root.add(ear);

      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), eyeMat);
      eye.position.set(side * 0.42, 1.15, 1.08);
      root.add(eye);
    }

    // 아래턱 관절 (와구와구 개폐 동작)
    rig.jawPivot = new THREE.Group();
    rig.jawPivot.position.set(0, 0.64, 1.05);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.26, 0.74), bodyMat);
    lowerJaw.position.set(0, -0.06, 0.34);
    lowerJaw.castShadow = true;
    rig.jawPivot.add(lowerJaw);

    // 아래턱 양쪽 하얀 송곳니
    for (const side of [-1, 1]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 5), ivoryMat);
      tooth.position.set(side * 0.34, 0.14, 0.56);
      rig.jawPivot.add(tooth);
    }
    root.add(rig.jawPivot);
  } else {
    // 🦒 3. 홍련 기린 (Crimson Giraffe - 긴 다리 질주 + 긴 목 흔들기 관절)
    const legCoords = [
      [-0.32, 0.88, 0.45],
      [0.32, 0.88, 0.45],
      [-0.32, 0.88, -0.45],
      [0.32, 0.88, -0.45],
    ];
    legCoords.forEach(([lx, ly, lz]) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.95, 6), bodyMat);
      legMesh.position.y = -0.42;
      legMesh.castShadow = true;
      legPivot.add(legMesh);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 6), darkMat);
      hoof.position.y = -0.86;
      legPivot.add(hoof);

      root.add(legPivot);
      rig.legs.push(legPivot);
    });

    // 날렵한 기린 몸통 + 반점 패치
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.72, 1.28), bodyMat);
    body.position.set(0, 1.12, 0);
    body.castShadow = true;
    root.add(body);

    const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 0.36), accentMat);
    spot1.position.set(0, 1.16, 0.18);
    root.add(spot1);

    const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.28, 0.32), accentMat);
    spot2.position.set(0, 1.05, -0.28);
    root.add(spot2);

    // 긴 목 관절 (Neck Pivot)
    rig.neckPivot = new THREE.Group();
    rig.neckPivot.position.set(0, 1.36, 0.48);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.65, 6), bodyMat);
    neck.position.set(0, 0.75, 0.22);
    neck.rotation.x = 0.28;
    neck.castShadow = true;
    rig.neckPivot.add(neck);

    // 목 갈기 장식
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.45, 0.16), accentMat);
    mane.position.set(0, 0.75, 0.04);
    mane.rotation.x = 0.28;
    rig.neckPivot.add(mane);

    // 기린 머리 + 주둥이 + 뿔(오시콘)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.62), bodyMat);
    head.position.set(0, 1.58, 0.56);
    head.castShadow = true;
    rig.neckPivot.add(head);

    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 5), darkMat);
      horn.position.set(side * 0.12, 1.85, 0.45);
      rig.neckPivot.add(horn);

      const hornTip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), accentMat);
      hornTip.position.set(side * 0.12, 2.0, 0.45);
      rig.neckPivot.add(hornTip);

      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
      eye.position.set(side * 0.22, 1.62, 0.66);
      rig.neckPivot.add(eye);
    }

    root.add(rig.neckPivot);

    // 꼬리
    rig.tailPivot = new THREE.Group();
    rig.tailPivot.position.set(0, 1.18, -0.64);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.65, 5), darkMat);
    tail.position.set(0, -0.28, -0.08);
    tail.rotation.x = -0.25;
    rig.tailPivot.add(tail);
    root.add(rig.tailPivot);
  }

  return rig;
}

// 다관절 동물 리깅 실시간 모션 애니메이션 업데이트 (필드 & ComfyUI 스튜디오 공용)
export function animateAnimalRig(rig, animalType, elapsedTime, walkSeed = 0) {
  const cfg = ANIMAL_MOTION_CONFIG[animalType] || {
    strideSpeed: 10,
    legSwing: 0.55,
    specialAmp: 1.0,
  };
  const phase = elapsedTime * cfg.strideSpeed + walkSeed;
  const swing = cfg.legSwing;
  const amp = cfg.specialAmp;

  // 4족 보행 대각선 교차 다리 스윙 (FL & BR 동상, FR & BL 역상)
  if (rig.legs.length === 4) {
    rig.legs[0].rotation.x = Math.sin(phase) * swing;
    rig.legs[1].rotation.x = -Math.sin(phase) * swing;
    rig.legs[2].rotation.x = -Math.sin(phase) * swing;
    rig.legs[3].rotation.x = Math.sin(phase) * swing;
  }

  // 몸통 상하 바운스 및 좌우 롤링
  rig.root.position.y = Math.abs(Math.sin(phase)) * 0.15;
  rig.root.rotation.z = Math.cos(phase) * 0.06;

  if (animalType === 'elephant') {
    // 코끼리: 코(Trunk) 상하/좌우 휘젓기 + 큰 귀 펄럭임
    if (rig.trunkPivot) {
      rig.trunkPivot.rotation.x = Math.sin(phase * 0.85) * 0.42 * amp;
      rig.trunkPivot.rotation.z = Math.cos(phase * 0.6) * 0.28 * amp;
    }
    if (rig.trunkTipPivot) {
      rig.trunkTipPivot.rotation.x = (0.3 + Math.sin(phase * 1.1) * 0.45) * amp;
    }
    if (rig.leftEarPivot && rig.rightEarPivot) {
      const flap = (Math.sin(phase * 1.3) * 0.25 + 0.2) * amp;
      rig.leftEarPivot.rotation.y = -flap;
      rig.rightEarPivot.rotation.y = flap;
    }
  } else if (animalType === 'hippo') {
    // 하마: 거대한 아래턱을 와구와구 벌렸다 다물기 (Chomp)
    if (rig.jawPivot) {
      const chomp = Math.max(0, Math.sin(phase * 0.95)) * 0.68 * amp;
      rig.jawPivot.rotation.x = chomp;
    }
  } else if (animalType === 'giraffe') {
    // 기린: 긴 목이 걸음 리듬에 맞춰 앞뒤 끄덕임 + 좌우 흔들림
    if (rig.neckPivot) {
      rig.neckPivot.rotation.x = Math.sin(phase) * 0.22 * amp;
      rig.neckPivot.rotation.z = Math.cos(phase * 0.5) * 0.14 * amp;
    }
  }

  if (rig.tailPivot) {
    rig.tailPivot.rotation.z = Math.sin(phase * 1.5) * 0.35;
  }
}

// 1. 독창적인 주인공 캐릭터: "코인 수비대장" 3D 모델 및 물리 이동
export class PlayerHero {
  constructor(scene, startX = 0, startZ = 0) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(startX, 0, startZ);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetPos = new THREE.Vector3(startX, 0, startZ);

    // 이동 속도 및 가속도 파라미터
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

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.36), darkMat);
    this.leftLeg.position.set(-0.22, 0.28, 0);
    this.leftLeg.castShadow = true;
    this.bodyPivot.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.36), darkMat);
    this.rightLeg.position.set(0.22, 0.28, 0);
    this.rightLeg.castShadow = true;
    this.bodyPivot.add(this.rightLeg);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.95, 7), armorMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    this.bodyPivot.add(torso);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.56, 0.2, 7), goldMat);
    belt.position.y = 0.65;
    this.bodyPivot.add(belt);

    this.cape = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.12), capeMat);
    this.cape.position.set(0, 0.92, -0.45);
    this.cape.rotation.x = 0.22;
    this.cape.castShadow = true;
    this.bodyPivot.add(this.cape);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    this.bodyPivot.add(head);

    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.45, 7), armorMat);
    helmet.position.y = 1.92;
    helmet.castShadow = true;
    this.bodyPivot.add(helmet);

    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 5), goldMat);
    plume.position.set(0, 2.38, -0.08);
    plume.rotation.x = -0.35;
    plume.castShadow = true;
    this.bodyPivot.add(plume);

    this.shieldArm = new THREE.Group();
    this.shieldArm.position.set(-0.62, 1.05, 0.18);
    const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 8), goldMat);
    shieldDisc.rotation.z = Math.PI / 2;
    shieldDisc.rotation.y = 0.35;
    shieldDisc.castShadow = true;
    this.shieldArm.add(shieldDisc);
    this.bodyPivot.add(this.shieldArm);

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
    this.targetPos.x = THREE.MathUtils.clamp(worldPoint.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    this.targetPos.z = THREE.MathUtils.clamp(worldPoint.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
    this.targetPos.y = 0;

    this.targetMarker.position.set(this.targetPos.x, 0, this.targetPos.z);
  }

  update(dt, elapsedTime) {
    const toTarget = new THREE.Vector3().subVectors(this.targetPos, this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist > this.stopRadius) {
      const dir = toTarget.clone().normalize();
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
      this.velocity.multiplyScalar(Math.max(0, 1 - this.damping * dt));
    }

    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    this.position.addScaledVector(this.velocity, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
    this.group.position.copy(this.position);

    const speed = this.velocity.length();
    if (speed > 0.25) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.bodyPivot.rotation.y = lerpAngle(this.bodyPivot.rotation.y, targetAngle, 14 * dt);

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

    if (this.swingAnimTime > 0) {
      this.swingAnimTime = Math.max(0, this.swingAnimTime - dt * 5.5);
      const s = Math.sin((1 - this.swingAnimTime) * Math.PI);
      this.weaponArm.rotation.y = -s * 1.45;
      this.weaponArm.rotation.x = s * 0.45;
    } else {
      this.weaponArm.rotation.y = 0;
      this.weaponArm.rotation.x = 0;
    }

    const markerScale = 0.9 + Math.sin(elapsedTime * 6) * 0.12;
    this.targetMarker.scale.set(markerScale, 1, markerScale);

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

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.24, 8), stoneMat);
    base.position.y = 0.12;
    base.receiveShadow = true;
    base.castShadow = true;
    this.group.add(base);

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

    this.floatingCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12), rimMat);
    this.floatingCoin.rotation.z = Math.PI / 2;
    this.floatingCoin.position.y = 1.45;
    this.floatingCoin.castShadow = true;
    this.group.add(this.floatingCoin);
  }

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

    const typeDef = TOWER_TYPES[this.towerType] || TOWER_TYPES.crossbow;
    const stoneMat = makeLowPolyMaterial(0xe2e8f0);
    const woodMat = makeLowPolyMaterial(0x92400e);
    const accentMat = makeLowPolyMaterial(typeDef.color, {
      metalness: 0.25,
      roughness: 0.4,
    });
    const darkMetalMat = makeLowPolyMaterial(0x334155, { metalness: 0.5, roughness: 0.35 });
    const goldMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.4, roughness: 0.3 });

    const heightScale = 1 + (this.level - 1) * 0.22;
    this.crystalMesh = null;

    if (this.towerType === 'frost') {
      // 🪵 울타리 (목책 방어선 - 날카로운 통나무 말뚝 원형 진지)
      const stakeCount = 10 + this.level * 2;
      for (let i = 0; i < stakeCount; i++) {
        const ang = (i / stakeCount) * Math.PI * 2;
        const stake = new THREE.Group();
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.2, 1.35 * heightScale, 6),
          woodMat
        );
        post.position.y = (1.35 * heightScale) / 2;
        post.castShadow = true;
        stake.add(post);

        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6), goldMat);
        tip.position.y = 1.35 * heightScale + 0.2;
        stake.add(tip);

        stake.position.set(Math.cos(ang) * 1.38, 0.2, Math.sin(ang) * 1.38);
        stake.rotation.z = -Math.cos(ang) * 0.18;
        stake.rotation.x = Math.sin(ang) * 0.18;
        this.towerGroup.add(stake);
      }

      const centerPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 1.4 * heightScale, 7),
        woodMat
      );
      centerPost.position.y = 0.24 + (1.4 * heightScale) / 2;
      this.towerGroup.add(centerPost);

      const topY = 0.24 + 1.4 * heightScale;
      this.turretHead = new THREE.Group();
      this.turretHead.position.set(0, topY + 0.3, 0);
      this.towerGroup.add(this.turretHead);

      const launcher = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.95), accentMat);
      this.turretHead.add(launcher);
      return;
    }

    if (this.towerType === 'wall') {
      // 🧱 성벽 (석조 보루 - 두꺼운 성곽 블록과 흉벽 Battlements)
      const bastion = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.85 * heightScale, 2.5),
        stoneMat
      );
      bastion.position.y = 0.24 + (1.85 * heightScale) / 2;
      bastion.castShadow = true;
      bastion.receiveShadow = true;
      this.towerGroup.add(bastion);

      const topY = 0.24 + 1.85 * heightScale;
      // 성벽 흉벽(메를론) 8개
      [
        [-0.95, -0.95],
        [0, -0.95],
        [0.95, -0.95],
        [-0.95, 0],
        [0.95, 0],
        [-0.95, 0.95],
        [0, 0.95],
        [0.95, 0.95],
      ].forEach(([mx, mz]) => {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.46), darkMetalMat);
        merlon.position.set(mx, topY + 0.21, mz);
        this.towerGroup.add(merlon);
      });

      this.turretHead = new THREE.Group();
      this.turretHead.position.set(0, topY + 0.42, 0);
      this.towerGroup.add(this.turretHead);

      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.35, 8), darkMetalMat);
      turret.rotation.x = Math.PI / 2 - 0.12;
      turret.position.set(0, 0.2, 0.35);
      this.turretHead.add(turret);
      return;
    }

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.35, 1.75 * heightScale, 7),
      this.towerType === 'crossbow' ? woodMat : stoneMat
    );
    pillar.position.y = 0.24 + (1.75 * heightScale) / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.towerGroup.add(pillar);

    for (let lv = 0; lv < this.level; lv++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.14, 7), goldMat);
      band.position.y = 0.65 + lv * 0.42;
      this.towerGroup.add(band);
    }

    const topY = 0.24 + 1.75 * heightScale;
    this.turretHead = new THREE.Group();
    this.turretHead.position.set(0, topY + 0.45, 0);
    this.towerGroup.add(this.turretHead);

    if (this.towerType === 'crossbow') {
      // 🔭 감시탑 (망루 지붕 + 정찰 석궁)
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.95), woodMat);
      mount.castShadow = true;
      this.turretHead.add(mount);

      const watchRoof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.72, 6), accentMat);
      watchRoof.position.set(0, 0.78, 0);
      this.turretHead.add(watchRoof);

      const bowArc = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.22), goldMat);
      bowArc.position.set(0, 0.18, 0.52);
      bowArc.castShadow = true;
      this.turretHead.add(bowArc);

      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.35), darkMetalMat);
      barrel.position.set(0, 0.22, 0.35);
      this.turretHead.add(barrel);
    } else {
      // 🏹 방어탑 (화력 포탑)
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

// 3. 길을 따라 이동하는 붉은 적 & 동물 야수 무리 (코끼리, 하마, 기린, 보병, 보스)
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

    this.progress = 0;
    this.laneOffset = (Math.random() - 0.5) * 2.1;
    this.walkSeed = Math.random() * 10;

    this.slowTimer = 0;
    this.slowFactor = 1.0;
    this.attackCooldown = 0;
    this.dead = false;
    this.reachedCastle = false;

    this.animalRig = null;
    this.position = new THREE.Vector3();
    this.group = new THREE.Group();
    this.buildModel();
    this.updatePositionOnRoad(0);
    this.scene.add(this.group);
  }

  buildModel() {
    const animalCfg = this.def.isAnimal ? ANIMAL_MOTION_CONFIG[this.def.animalType] : null;
    const s = this.def.scale * (animalCfg ? animalCfg.scaleMult : 1.0);

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.scale.set(s, s, s);
    this.group.add(this.bodyGroup);

    if (this.def.isAnimal) {
      // 코끼리 / 하마 / 기린 다관절 리깅 모델 생성
      this.animalRig = buildAnimalRig(
        this.def.animalType,
        animalCfg?.bodyColor ?? this.def.bodyColor,
        animalCfg?.accentColor ?? this.def.accentColor
      );
      this.bodyGroup.add(this.animalRig.root);
    } else {
      // 일반 붉은 군단 보병 / 보스 모델
      const bodyMat = makeLowPolyMaterial(this.def.bodyColor);
      const accentMat = makeLowPolyMaterial(this.def.accentColor);
      const hornMat = makeLowPolyMaterial(0xfef08a);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.95, 6), bodyMat);
      torso.position.y = 0.65;
      torso.castShadow = true;
      this.bodyGroup.add(torso);

      const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), bodyMat);
      head.position.y = 1.38;
      head.castShadow = true;
      this.bodyGroup.add(head);

      const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.08), eyeMat);
      leftEye.position.set(-0.14, 1.42, 0.36);
      this.bodyGroup.add(leftEye);

      const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.08), eyeMat);
      rightEye.position.set(0.14, 1.42, 0.36);
      this.bodyGroup.add(rightEye);

      const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), hornMat);
      leftHorn.position.set(-0.28, 1.72, 0);
      leftHorn.rotation.z = 0.35;
      this.bodyGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), hornMat);
      rightHorn.position.set(0.28, 1.72, 0);
      rightHorn.rotation.z = -0.35;
      this.bodyGroup.add(rightHorn);

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
    }

    // 머리 위 3D 체력바 (기린은 목이 길어 더 높게 배치)
    const barHeightOffset = this.def.animalType === 'giraffe' ? 3.55 : 2.15;
    const barY = barHeightOffset * s;
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
    );
    bgPlane.position.y = barY;
    this.group.add(bgPlane);

    this.hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.11),
      new THREE.MeshBasicMaterial({
        color: this.def.isBoss ? 0xfacc15 : this.def.isAnimal ? 0xf97316 : 0xef4444,
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
    this.hpBarFill.position.x = -(1 - ratio) * 0.61;

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

    const angle = Math.atan2(tangent.x, tangent.z);
    this.bodyGroup.rotation.y = angle;

    if (this.def.isAnimal && this.animalRig) {
      // 코끼리, 하마, 기린 전용 다관절 모션 애니메이션
      animateAnimalRig(this.animalRig, this.def.animalType, elapsedTime, this.walkSeed);
    } else {
      const bob = Math.abs(Math.sin(elapsedTime * 11 + this.walkSeed)) * 0.18;
      this.bodyGroup.position.y = bob;
      this.bodyGroup.rotation.z = Math.sin(elapsedTime * 11 + this.walkSeed) * 0.09;
    }
  }

  update(dt, elapsedTime, cameraPosition) {
    if (this.dead || this.reachedCastle) return;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    this.updatePositionOnRoad(dt, elapsedTime);

    if (cameraPosition) {
      this.hpBarBg.lookAt(cameraPosition);
      this.hpBarFill.lookAt(cameraPosition);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

// 4. 적 처치 시 드롭되는 3D 코인
export class DroppedCoin {
  constructor(scene, originPos, value = 10) {
    this.scene = scene;
    this.value = value;
    this.position = originPos.clone();
    this.position.y = 0.5;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.2 + Math.random() * 2.5;
    this.velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      5.5 + Math.random() * 2,
      Math.sin(angle) * speed
    );
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

    if (this.age > 0.35 && (dist < 7.5 || this.age > 1.1)) {
      const pullSpeed = 16 + this.age * 10;
      this.position.addScaledVector(toPlayer.normalize(), pullSpeed * dt);
      if (dist < 1.05) {
        this.collected = true;
      }
    } else {
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

// 5. 방어탑 발사체
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

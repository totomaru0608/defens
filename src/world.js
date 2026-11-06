import * as THREE from 'three';

export const MAP_BOUNDS = {
  minX: -32,
  maxX: 32,
  minZ: -19,
  maxZ: 19,
};

// 플랫 셰이딩 로우폴리 재질 헬퍼
export function makeLowPolyMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
  });
}

// 구불구불한 모래길 리본 지오메트리 생성 (+Y 법선 방향 보장)
function createRibbonGeometry(curve, halfWidth, yOffset = 0.06, segments = 180) {
  const points = curve.getPoints(segments);
  const positions = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const tangent = curve.getTangent(i / segments);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const left = new THREE.Vector3().copy(p).addScaledVector(normal, halfWidth);
    const right = new THREE.Vector3().copy(p).addScaledVector(normal, -halfWidth);

    positions.push(left.x, yOffset, left.z);
    positions.push(right.x, yOffset, right.z);

    const v = i / segments;
    uvs.push(0, v, 1, v);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1);
      indices.push(base + 1, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// 작은 성채 (왕국 수호 대상) 생성
function createSmallCitadel(position, lookTarget) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.lookAt(lookTarget.x, position.y, lookTarget.z);
  group.scale.set(0.76, 0.76, 0.76);

  const stoneMat = makeLowPolyMaterial(0xdbe4ee);
  const darkStoneMat = makeLowPolyMaterial(0x94a3b8);
  const roofMat = makeLowPolyMaterial(0x2563eb);
  const goldMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.35, roughness: 0.4 });
  const gateMat = makeLowPolyMaterial(0x451a03);

  const keep = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 4.8), stoneMat);
  keep.position.y = 1.7;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  for (let ix = -2.2; ix <= 2.2; ix += 1.1) {
    for (const iz of [-2.2, 2.2]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), darkStoneMat);
      merlon.position.set(ix, 3.65, iz);
      merlon.castShadow = true;
      group.add(merlon);
    }
  }

  const spireBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), stoneMat);
  spireBase.position.y = 4.0;
  spireBase.castShadow = true;
  group.add(spireBase);

  const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.0, 4), roofMat);
  mainRoof.position.y = 5.75;
  mainRoof.rotation.y = Math.PI / 4;
  mainRoof.castShadow = true;
  group.add(mainRoof);

  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 10), goldMat);
  emblem.rotation.z = Math.PI / 2;
  emblem.position.y = 7.05;
  group.add(emblem);

  const corners = [
    [-2.5, -2.3],
    [2.5, -2.3],
    [-2.5, 2.3],
    [2.5, 2.3],
  ];
  corners.forEach(([cx, cz]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 4.0, 8), stoneMat);
    tower.position.set(cx, 2.0, cz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.4, 8), darkStoneMat);
    ring.position.set(cx, 4.0, cz);
    group.add(ring);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.28, 1.5, 8), roofMat);
    cone.position.set(cx, 4.95, cz);
    cone.castShadow = true;
    group.add(cone);
  });

  const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.8), darkStoneMat);
  gateFrame.position.set(0, 1.2, 2.25);
  group.add(gateFrame);

  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.0, 0.88), gateMat);
  gateDoor.position.set(0, 1.0, 2.28);
  group.add(gateDoor);

  return { group, emblem };
}

// 주변 성벽 세그먼트 생성
function createCastleWallSegment(x1, z1, x2, z2, withWatchtower = true) {
  const group = new THREE.Group();
  const stoneMat = makeLowPolyMaterial(0xd6dee7);
  const trimMat = makeLowPolyMaterial(0x94a3b8);
  const roofMat = makeLowPolyMaterial(0x3b82f6);

  const start = new THREE.Vector3(x1, 0, z1);
  const end = new THREE.Vector3(x2, 0, z2);
  const dist = start.distanceTo(end);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.0, dist), stoneMat);
  wall.position.copy(mid);
  wall.position.y = 1.0;
  wall.lookAt(end.x, 1.0, end.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const count = Math.max(2, Math.floor(dist / 1.7));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const pos = new THREE.Vector3().lerpVectors(start, end, t);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.58), trimMat);
    tooth.position.set(pos.x, 2.18, pos.z);
    tooth.lookAt(end.x, 2.18, end.z);
    tooth.castShadow = true;
    group.add(tooth);
  }

  if (withWatchtower) {
    [start, end].forEach((pt) => {
      const bastion = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 2.9, 7), stoneMat);
      bastion.position.set(pt.x, 1.45, pt.z);
      bastion.castShadow = true;
      bastion.receiveShadow = true;
      group.add(bastion);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.32, 1.3, 7), roofMat);
      cap.position.set(pt.x, 3.5, pt.z);
      cap.castShadow = true;
      group.add(cap);
    });
  }

  return group;
}

// 적 출현 전초기지 관문
function createEnemySpawnGate(position, lookTarget) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.lookAt(lookTarget.x, position.y, lookTarget.z);

  const darkRockMat = makeLowPolyMaterial(0x334155);
  const crimsonMat = makeLowPolyMaterial(0xdc2626, {
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });

  const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.0, 3.8, 6), darkRockMat);
  leftPillar.position.set(-1.9, 1.9, 0);
  leftPillar.castShadow = true;
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.0, 3.8, 6), darkRockMat);
  rightPillar.position.set(1.9, 1.9, 0);
  rightPillar.castShadow = true;
  group.add(rightPillar);

  const arch = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 1.1), darkRockMat);
  arch.position.set(0, 3.7, 0);
  arch.castShadow = true;
  group.add(arch);

  const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.2), crimsonMat);
  portal.position.set(0, 1.65, 0.05);
  group.add(portal);

  return group;
}

// ==========================================================
// 다채로운 지형물 6종 생성 팩토리 (숲, 바위, 호수, 강, 산, 이정표)
// ==========================================================

function createSinglePineTree(scale = 1) {
  const group = new THREE.Group();
  const trunkMat = makeLowPolyMaterial(0x78350f);
  const leafMat1 = makeLowPolyMaterial(0x22c55e);
  const leafMat2 = makeLowPolyMaterial(0x16a34a);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.32 * scale, 1.1 * scale, 6), trunkMat);
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.15 * scale, 1.65 * scale, 7), leafMat1);
  cone1.position.y = 1.55 * scale;
  cone1.castShadow = true;
  group.add(cone1);

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.88 * scale, 1.35 * scale, 7), leafMat2);
  cone2.position.y = 2.35 * scale;
  cone2.castShadow = true;
  group.add(cone2);

  return group;
}

// 1. 🌲 숲 군락 (Forest)
function createForestProp() {
  const group = new THREE.Group();
  const t1 = createSinglePineTree(1.05);
  t1.position.set(0, 0, 0);
  group.add(t1);

  const t2 = createSinglePineTree(0.82);
  t2.position.set(-1.15, 0, 0.75);
  group.add(t2);

  const t3 = createSinglePineTree(0.75);
  t3.position.set(1.05, 0, 0.55);
  group.add(t3);

  // 귀여운 둥근 수풀과 빨간 버섯 디테일
  const bushMat = makeLowPolyMaterial(0x4ade80);
  const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), bushMat);
  bush.position.set(0.35, 0.28, 1.05);
  bush.castShadow = true;
  group.add(bush);

  const stemMat = makeLowPolyMaterial(0xfef3c7);
  const capMat = makeLowPolyMaterial(0xef4444);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 6), stemMat);
  stem.position.set(-0.45, 0.12, 1.15);
  group.add(stem);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 6), capMat);
  cap.position.set(-0.45, 0.28, 1.15);
  group.add(cap);

  return group;
}

// 2. 🪨 바위 군락 (Rock Cluster)
function createRockClusterProp() {
  const group = new THREE.Group();
  const rockMat = makeLowPolyMaterial(0x94a3b8);
  const darkRockMat = makeLowPolyMaterial(0x64748b);
  const mossMat = makeLowPolyMaterial(0x4ade80);

  const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), rockMat);
  mainRock.position.set(0, 0.55, 0);
  mainRock.scale.set(1.25, 0.85, 1.05);
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  group.add(mainRock);

  const subRock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), darkRockMat);
  subRock1.position.set(0.95, 0.35, 0.45);
  subRock1.rotation.set(0.4, 0.8, 0.2);
  subRock1.castShadow = true;
  group.add(subRock1);

  const subRock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
  subRock2.position.set(-0.85, 0.28, 0.35);
  subRock2.rotation.set(0.9, 0.2, 0.5);
  subRock2.castShadow = true;
  group.add(subRock2);

  // 바위 위 초록 이끼 패치
  const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.65, 0.14, 6), mossMat);
  moss.position.set(0, 0.96, 0);
  group.add(moss);

  return group;
}

// 3. 💧 호수 (Lake - 푸른 수면 + 모래 기슭 + 수련잎 + 물가 갈대)
function createLakeProp() {
  const group = new THREE.Group();
  const shoreMat = makeLowPolyMaterial(0xe2c792, { side: THREE.DoubleSide });
  const waterMat = makeLowPolyMaterial(0x0ea5e9, {
    roughness: 0.18,
    metalness: 0.15,
    emissive: 0x0369a1,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  const lilyMat = makeLowPolyMaterial(0x22c55e);
  const flowerMat = makeLowPolyMaterial(0xf472b6);
  const rockMat = makeLowPolyMaterial(0x94a3b8);
  const reedMat = makeLowPolyMaterial(0x65a30d);
  const cattailMat = makeLowPolyMaterial(0x78350f);

  // 모래 기슭 바닥
  const shore = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.45, 0.08, 10), shoreMat);
  shore.position.y = 0.04;
  shore.scale.set(1.2, 1, 0.92);
  shore.receiveShadow = true;
  group.add(shore);

  // 반짝이는 푸른 호수 수면
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.95, 0.11, 10), waterMat);
  water.position.y = 0.065;
  water.scale.set(1.18, 1, 0.9);
  water.receiveShadow = true;
  group.add(water);

  // 수련잎과 연꽃
  const lilyCoords = [
    [-0.9, 0.5],
    [1.1, -0.4],
    [0.2, 0.9],
  ];
  lilyCoords.forEach(([lx, lz], idx) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 7), lilyMat);
    pad.position.set(lx, 0.13, lz);
    group.add(pad);
    if (idx === 0) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 5), flowerMat);
      lotus.position.set(lx, 0.24, lz);
      group.add(lotus);
    }
  });

  // 호숫가 바위와 갈대
  const edgeRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
  edgeRock.position.set(-2.6, 0.32, -1.2);
  edgeRock.castShadow = true;
  group.add(edgeRock);

  for (let i = 0; i < 4; i++) {
    const rx = 2.2 + (i % 2) * 0.32;
    const rz = 0.8 + i * 0.28;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.95, 5), reedMat);
    stem.position.set(rx, 0.48, rz);
    group.add(stem);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 5), cattailMat);
    head.position.set(rx, 0.85, rz);
    group.add(head);
  }

  return group;
}

// 4. 🌊 강줄기 & 나무 다리 (River Segment with Wooden Bridge)
function createRiverProp() {
  const group = new THREE.Group();
  const bankMat = makeLowPolyMaterial(0xd6c08d, { side: THREE.DoubleSide });
  const waterMat = makeLowPolyMaterial(0x0284c7, {
    roughness: 0.2,
    metalness: 0.12,
    emissive: 0x0369a1,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const foamMat = makeLowPolyMaterial(0xe0f2fe);
  const woodMat = makeLowPolyMaterial(0x92400e);
  const darkWoodMat = makeLowPolyMaterial(0x78350f);

  // 강기슭 모래 테두리
  const bank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 8.6), bankMat);
  bank.position.y = 0.035;
  bank.receiveShadow = true;
  group.add(bank);

  // 푸른 강물 본체
  const stream = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.1, 8.6), waterMat);
  stream.position.y = 0.06;
  stream.receiveShadow = true;
  group.add(stream);

  // 물살 거품 디테일
  for (const fz of [-2.6, 0, 2.6]) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 1.2), foamMat);
    foam.position.set(fz * 0.15, 0.12, fz);
    group.add(foam);
  }

  // 강 위를 가로지르는 아기자기한 로우폴리 목재 다리
  const bridgeGroup = new THREE.Group();
  for (let px = -1.4; px <= 1.4; px += 0.46) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 1.8), woodMat);
    plank.position.set(px, 0.26 + (1.5 - Math.abs(px)) * 0.08, 0);
    plank.castShadow = true;
    bridgeGroup.add(plank);
  }
  for (const sideZ of [-0.82, 0.82]) {
    for (const postX of [-1.45, 0, 1.45]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), darkWoodMat);
      post.position.set(postX, 0.55, sideZ);
      post.castShadow = true;
      bridgeGroup.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.1), darkWoodMat);
    rail.position.set(0, 0.82, sideZ);
    bridgeGroup.add(rail);
  }
  group.add(bridgeGroup);

  return group;
}

// 5. ⛰️ 설산 / 바위산 (Mountain with Snow Cap)
function createMountainProp() {
  const group = new THREE.Group();
  const rockMat = makeLowPolyMaterial(0x64748b);
  const darkRockMat = makeLowPolyMaterial(0x475569);
  const snowMat = makeLowPolyMaterial(0xf8fafc, { roughness: 0.5 });

  // 주봉 (Main Peak)
  const mainPeak = new THREE.Mesh(new THREE.ConeGeometry(2.85, 5.2, 7), rockMat);
  mainPeak.position.set(0, 2.6, 0);
  mainPeak.castShadow = true;
  mainPeak.receiveShadow = true;
  group.add(mainPeak);

  // 주봉 만년설 모자 (Snow Cap)
  const mainSnow = new THREE.Mesh(new THREE.ConeGeometry(1.38, 2.35, 7), snowMat);
  mainSnow.position.set(0, 4.1, 0);
  mainSnow.castShadow = true;
  group.add(mainSnow);

  // 좌측 부봉 (Sub Peak 1)
  const subPeak1 = new THREE.Mesh(new THREE.ConeGeometry(2.05, 3.6, 6), darkRockMat);
  subPeak1.position.set(-1.95, 1.8, 0.75);
  subPeak1.castShadow = true;
  subPeak1.receiveShadow = true;
  group.add(subPeak1);

  const subSnow1 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.5, 6), snowMat);
  subSnow1.position.set(-1.95, 2.9, 0.75);
  group.add(subSnow1);

  // 우측 기암 봉우리 (Sub Peak 2)
  const subPeak2 = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.9, 6), rockMat);
  subPeak2.position.set(1.85, 1.45, 0.45);
  subPeak2.castShadow = true;
  group.add(subPeak2);

  return group;
}

// 6. 🪧 이정표 (Wooden Signpost with Direction Arrows & Lantern)
function createSignpostProp() {
  const group = new THREE.Group();
  const stoneMat = makeLowPolyMaterial(0x94a3b8);
  const postMat = makeLowPolyMaterial(0x78350f);
  const boardMat1 = makeLowPolyMaterial(0xd97706);
  const boardMat2 = makeLowPolyMaterial(0xb45309);
  const lanternMat = makeLowPolyMaterial(0xfde047, {
    emissive: 0xf59e0b,
    emissiveIntensity: 0.7,
  });

  // 돌 받침대
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.28, 7), stoneMat);
  base.position.y = 0.14;
  base.castShadow = true;
  group.add(base);

  // 나무 기둥
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.35, 6), postMat);
  post.position.y = 1.25;
  post.castShadow = true;
  group.add(post);

  // 상단 화살표 이정표 판 1 (오른쪽 방향)
  const sign1Group = new THREE.Group();
  sign1Group.position.set(0, 1.95, 0);
  sign1Group.rotation.y = 0.25;
  const board1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.1), boardMat1);
  board1.position.set(0.42, 0, 0);
  board1.castShadow = true;
  sign1Group.add(board1);
  const tip1 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 4), boardMat1);
  tip1.rotation.z = -Math.PI / 2;
  tip1.rotation.x = Math.PI / 4;
  tip1.position.set(1.12, 0, 0);
  sign1Group.add(tip1);
  group.add(sign1Group);

  // 하단 화살표 이정표 판 2 (왼쪽 방향)
  const sign2Group = new THREE.Group();
  sign2Group.position.set(0, 1.52, 0);
  sign2Group.rotation.y = -0.55;
  const board2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.32, 0.1), boardMat2);
  board2.position.set(-0.38, 0, 0);
  board2.castShadow = true;
  sign2Group.add(board2);
  const tip2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), boardMat2);
  tip2.rotation.z = Math.PI / 2;
  tip2.rotation.x = Math.PI / 4;
  tip2.position.set(-1.02, 0, 0);
  sign2Group.add(tip2);
  group.add(sign2Group);

  // 기둥 끝에 매달린 작은 노란 랜턴
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), postMat);
  arm.position.set(-0.22, 2.28, 0);
  group.add(arm);

  const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), lanternMat);
  lantern.position.set(-0.45, 2.08, 0);
  group.add(lantern);

  return group;
}

// 지형물 타입별 3D 메시 생성 (에디터 및 월드 빌더 공용)
export function createTerrainPropMesh(type, scale = 1, rot = 0) {
  let meshGroup;
  switch (type) {
    case 'mountain':
      meshGroup = createMountainProp();
      break;
    case 'lake':
      meshGroup = createLakeProp();
      break;
    case 'river':
      meshGroup = createRiverProp();
      break;
    case 'signpost':
      meshGroup = createSignpostProp();
      break;
    case 'rock':
      meshGroup = createRockClusterProp();
      break;
    case 'forest':
    default:
      meshGroup = createForestProp();
      break;
  }
  meshGroup.scale.set(scale, scale, scale);
  meshGroup.rotation.y = rot;
  return meshGroup;
}

export function buildStageWorld(scene, stageData) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // 1. 초록색 들판 지형 (로우폴리 타일 패치 + 레이캐스트용 지면)
  const groundGeo = new THREE.PlaneGeometry(108, 76, 32, 22);
  groundGeo.rotateX(-Math.PI / 2);

  const posAttr = groundGeo.attributes.position;
  const colors = [];
  const baseCol = new THREE.Color(stageData.groundColor || 0x62b644);
  const altCol = new THREE.Color(stageData.groundAltColor || 0x56a63a);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    if (Math.abs(x) > 36 || Math.abs(z) > 22) {
      posAttr.setY(i, 0.4 * Math.sin(x * 0.25) * Math.cos(z * 0.25) + 0.3);
    }
    const checker = (Math.floor(x / 4) + Math.floor(z / 4)) % 2 === 0;
    const c = checker ? baseCol : altCol;
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  worldGroup.add(groundMesh);

  // 정확한 마우스 레이캐스팅을 위한 평면 지면
  const raycastPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 100).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  worldGroup.add(raycastPlane);

  // 2. 밝은 모래색의 구불구불한 큰 길 생성
  const curvePoints = stageData.pathPoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const roadCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.38);

  const borderGeo = createRibbonGeometry(roadCurve, 2.85, 0.04, 180);
  const borderMesh = new THREE.Mesh(
    borderGeo,
    makeLowPolyMaterial(stageData.roadBorderColor || 0xc8ad73, { side: THREE.DoubleSide })
  );
  borderMesh.receiveShadow = true;
  worldGroup.add(borderMesh);

  const roadGeo = createRibbonGeometry(roadCurve, 2.35, 0.08, 180);
  const roadMesh = new THREE.Mesh(
    roadGeo,
    makeLowPolyMaterial(stageData.roadColor || 0xe9cf96, { side: THREE.DoubleSide, roughness: 0.85 })
  );
  roadMesh.receiveShadow = true;
  worldGroup.add(roadMesh);

  // 길 가장자리 조약돌 장식
  const pebbleMat = makeLowPolyMaterial(0xd6c08d);
  for (let i = 4; i < 145; i += 6) {
    const t = i / 150;
    const pt = roadCurve.getPoint(t);
    const tan = roadCurve.getTangent(t);
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const side = i % 2 === 0 ? 1 : -1;
    const pebble = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.32), pebbleMat);
    pebble.position.copy(pt).addScaledVector(norm, side * (2.55 + (i % 3) * 0.08));
    pebble.position.y = 0.09;
    pebble.rotation.y = Math.atan2(tan.x, tan.z);
    pebble.receiveShadow = true;
    worldGroup.add(pebble);
  }

  // 3. 성채 & 성벽 & 적 스폰 관문 배치
  const startPt = curvePoints[0];
  const secondPt = curvePoints[1];
  const endPt = curvePoints[curvePoints.length - 1];
  const prevEndPt = curvePoints[curvePoints.length - 2];

  const spawnGate = createEnemySpawnGate(startPt, secondPt);
  worldGroup.add(spawnGate);

  const endDir = new THREE.Vector3().subVectors(endPt, prevEndPt).normalize();
  const citadelPos = endPt.clone().addScaledVector(endDir, 2.2);
  const citadel = createSmallCitadel(citadelPos, prevEndPt);
  worldGroup.add(citadel.group);

  // 주변 성벽과 작은 망루
  const wallSegments = [
    [-34, -21, -12, -21, true],
    [-4, -21, 16, -21, true],
    [22, -21, 34, -21, true],
    [-34, 21, -10, 21, true],
    [-2, 21, 18, 21, true],
    [-35, -20, -35, -6, false],
    [35, -20, 35, 4, true],
  ];
  wallSegments.forEach(([x1, z1, x2, z2, hasTower]) => {
    worldGroup.add(createCastleWallSegment(x1, z1, x2, z2, hasTower));
  });

  // 4. 스테이지 데이터의 다채로운 지형물(props: 산, 호수, 강, 이정표, 바위, 숲) 배치
  const propsGroup = new THREE.Group();
  worldGroup.add(propsGroup);

  const propInstances = [];
  if (Array.isArray(stageData.props)) {
    stageData.props.forEach((p, idx) => {
      const mesh = createTerrainPropMesh(p.type, p.scale ?? 1.0, p.rot ?? 0);
      mesh.position.set(p.x, 0, p.z);
      mesh.userData = { propIndex: idx, propData: p };
      propsGroup.add(mesh);
      propInstances.push(mesh);
    });
  }

  // 5. 외곽 배경용 보조 나무/바위 자동 장식 (길, 건설 구역, 지형물과 겹치지 않는 곳에만 배치)
  const sampledRoad = roadCurve.getPoints(90);
  const isNearAnything = (x, z) => {
    for (const rp of sampledRoad) {
      if (Math.hypot(rp.x - x, rp.z - z) < 4.5) return true;
    }
    for (const pad of stageData.buildPads || []) {
      if (Math.hypot(pad.x - x, pad.z - z) < 4.0) return true;
    }
    for (const pr of stageData.props || []) {
      const radius = pr.type === 'mountain' || pr.type === 'lake' || pr.type === 'river' ? 5.2 : 3.4;
      if (Math.hypot(pr.x - x, pr.z - z) < radius) return true;
    }
    if (Math.hypot(citadelPos.x - x, citadelPos.z - z) < 7.2) return true;
    if (Math.hypot(startPt.x - x, startPt.z - z) < 5.8) return true;
    return false;
  };

  let seed = (stageData.id || 1) * 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 42; i++) {
    const x = (rand() - 0.5) * 64;
    const z = (rand() - 0.5) * 36;
    if (isNearAnything(x, z)) continue;

    const tree = createSinglePineTree(0.75 + rand() * 0.4);
    tree.position.set(x, 0, z);
    worldGroup.add(tree);
  }

  return {
    worldGroup,
    propsGroup,
    propInstances,
    raycastPlane,
    roadCurve,
    citadel,
    endPt,
    startPt,
  };
}

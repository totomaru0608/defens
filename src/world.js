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
      // 위쪽(+Y)을 향하는 반시계방향(CCW) 삼각형 인덱스
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

// 작은 성채 (왕국 수호 대상) 생성 - 시야를 가리지 않는 아담한 비율
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

  // 성채 본체(Keep)
  const keep = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 4.8), stoneMat);
  keep.position.y = 1.7;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  // 성채 상단 흉벽(Battlements)
  for (let ix = -2.2; ix <= 2.2; ix += 1.1) {
    for (const iz of [-2.2, 2.2]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), darkStoneMat);
      merlon.position.set(ix, 3.65, iz);
      merlon.castShadow = true;
      group.add(merlon);
    }
  }

  // 중앙 첨탑과 파란 지붕
  const spireBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), stoneMat);
  spireBase.position.y = 4.0;
  spireBase.castShadow = true;
  group.add(spireBase);

  const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.0, 4), roofMat);
  mainRoof.position.y = 5.75;
  mainRoof.rotation.y = Math.PI / 4;
  mainRoof.castShadow = true;
  group.add(mainRoof);

  // 지붕 위 황금 코인 엠블럼
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 10), goldMat);
  emblem.rotation.z = Math.PI / 2;
  emblem.position.y = 7.05;
  group.add(emblem);

  // 4개의 모서리 원형 포탑
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

  // 전면 성문 아치
  const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.8), darkStoneMat);
  gateFrame.position.set(0, 1.2, 2.25);
  group.add(gateFrame);

  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.0, 0.88), gateMat);
  gateDoor.position.set(0, 1.0, 2.28);
  group.add(gateDoor);

  return { group, emblem };
}

// 주변 성벽 세그먼트 생성 (성벽과 작은 망루)
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

  // 성벽 상단 요철(흉벽)
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

// 로우폴리 나무 & 바위 생성
function createLowPolyTree(scale = 1) {
  const group = new THREE.Group();
  const trunkMat = makeLowPolyMaterial(0x78350f);
  const leafMat1 = makeLowPolyMaterial(0x22c55e);
  const leafMat2 = makeLowPolyMaterial(0x16a34a);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.35 * scale, 1.1 * scale, 6), trunkMat);
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.15 * scale, 1.65 * scale, 7), leafMat1);
  cone1.position.y = 1.6 * scale;
  cone1.castShadow = true;
  group.add(cone1);

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.88 * scale, 1.35 * scale, 7), leafMat2);
  cone2.position.y = 2.4 * scale;
  cone2.castShadow = true;
  group.add(cone2);

  return group;
}

function createLowPolyRock(scale = 1) {
  const mat = makeLowPolyMaterial(0x94a3b8);
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * scale, 0), mat);
  mesh.position.y = 0.32 * scale;
  mesh.scale.set(1.2, 0.72, 1.0);
  mesh.rotation.set(Math.random(), Math.random() * Math.PI, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildStageWorld(scene, stageData) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // 1. 초록색 들판 지형 (로우폴리 타일 패치 + 레이캐스트용 지면)
  const groundGeo = new THREE.PlaneGeometry(108, 76, 32, 22);
  groundGeo.rotateX(-Math.PI / 2);

  const posAttr = groundGeo.attributes.position;
  const colors = [];
  const baseCol = new THREE.Color(stageData.groundColor);
  const altCol = new THREE.Color(stageData.groundAltColor);

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

  // 길 테두리 (돌 경계석 느낌)
  const borderGeo = createRibbonGeometry(roadCurve, 2.85, 0.04, 180);
  const borderMesh = new THREE.Mesh(
    borderGeo,
    makeLowPolyMaterial(stageData.roadBorderColor, { side: THREE.DoubleSide })
  );
  borderMesh.receiveShadow = true;
  worldGroup.add(borderMesh);

  // 밝은 모래색 본 길 (어느 각도에서나 선명하게 보이도록 DoubleSide + 높이 0.08)
  const roadGeo = createRibbonGeometry(roadCurve, 2.35, 0.08, 180);
  const roadMesh = new THREE.Mesh(
    roadGeo,
    makeLowPolyMaterial(stageData.roadColor, { side: THREE.DoubleSide, roughness: 0.85 })
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

  // 성채를 길 끝 지점에서 살짝 뒤쪽으로 배치해 플레이어 이동과 시야를 가리지 않게 함
  const endDir = new THREE.Vector3().subVectors(endPt, prevEndPt).normalize();
  const citadelPos = endPt.clone().addScaledVector(endDir, 2.2);
  const citadel = createSmallCitadel(citadelPos, prevEndPt);
  worldGroup.add(citadel.group);

  // 주변 성벽과 작은 망루 (맵 외곽 경계를 따라 깔끔하게 배치)
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

  // 4. 나무, 바위, 꽃덤불을 길과 건설 구역을 피해 절차적 배치
  const sampledRoad = roadCurve.getPoints(90);
  const isNearRoadOrPad = (x, z, minRoadDist = 4.4) => {
    for (const rp of sampledRoad) {
      if (Math.hypot(rp.x - x, rp.z - z) < minRoadDist) return true;
    }
    for (const pad of stageData.buildPads) {
      if (Math.hypot(pad.x - x, pad.z - z) < 3.8) return true;
    }
    if (Math.hypot(citadelPos.x - x, citadelPos.z - z) < 7.0) return true;
    if (Math.hypot(startPt.x - x, startPt.z - z) < 5.5) return true;
    return false;
  };

  let seed = stageData.id * 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 60; i++) {
    const x = (rand() - 0.5) * 66;
    const z = (rand() - 0.5) * 38;
    if (isNearRoadOrPad(x, z, 4.4)) continue;

    if (rand() < 0.72) {
      const tree = createLowPolyTree(0.75 + rand() * 0.45);
      tree.position.set(x, 0, z);
      worldGroup.add(tree);
    } else {
      const rock = createLowPolyRock(0.65 + rand() * 0.55);
      rock.position.set(x, 0.22, z);
      worldGroup.add(rock);
    }
  }

  return {
    worldGroup,
    raycastPlane,
    roadCurve,
    citadel,
    endPt,
    startPt,
  };
}

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
  });
}

// 구불구불한 모래길 리본 지오메트리 생성
function createRibbonGeometry(curve, halfWidth, yOffset = 0.04, segments = 150) {
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
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
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

  const stoneMat = makeLowPolyMaterial(0xdbe4ee);
  const darkStoneMat = makeLowPolyMaterial(0x94a3b8);
  const roofMat = makeLowPolyMaterial(0x2563eb);
  const goldMat = makeLowPolyMaterial(0xfbbf24, { metalness: 0.35, roughness: 0.4 });
  const gateMat = makeLowPolyMaterial(0x451a03);

  // 성채 본체(Keep)
  const keep = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 5.2), stoneMat);
  keep.position.y = 1.9;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  // 성채 상단 흉벽(Battlements)
  for (let ix = -2.4; ix <= 2.4; ix += 1.2) {
    for (const iz of [-2.4, 2.4]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.55), darkStoneMat);
      merlon.position.set(ix, 4.05, iz);
      merlon.castShadow = true;
      group.add(merlon);
    }
  }

  // 중앙 첨탑과 파란 지붕
  const spireBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.8), stoneMat);
  spireBase.position.y = 4.5;
  spireBase.castShadow = true;
  group.add(spireBase);

  const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.4, 4), roofMat);
  mainRoof.position.y = 6.6;
  mainRoof.rotation.y = Math.PI / 4;
  mainRoof.castShadow = true;
  group.add(mainRoof);

  // 지붕 위 황금 코인 엠블럼
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.22, 10), goldMat);
  emblem.rotation.z = Math.PI / 2;
  emblem.position.y = 8.1;
  group.add(emblem);

  // 4개의 모서리 원형 포탑
  const corners = [
    [-2.7, -2.5],
    [2.7, -2.5],
    [-2.7, 2.5],
    [2.7, 2.5],
  ];
  corners.forEach(([cx, cz]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 4.6, 8), stoneMat);
    tower.position.set(cx, 2.3, cz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.45, 8), darkStoneMat);
    ring.position.set(cx, 4.6, cz);
    group.add(ring);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.8, 8), roofMat);
    cone.position.set(cx, 5.7, cz);
    cone.castShadow = true;
    group.add(cone);
  });

  // 전면 성문 아치
  const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.9), darkStoneMat);
  gateFrame.position.set(0, 1.3, 2.45);
  group.add(gateFrame);

  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.98), gateMat);
  gateDoor.position.set(0, 1.1, 2.48);
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

  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, dist), stoneMat);
  wall.position.copy(mid);
  wall.position.y = 1.2;
  wall.lookAt(end.x, 1.2, end.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // 성벽 상단 요철(흉벽)
  const count = Math.max(2, Math.floor(dist / 1.6));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const pos = new THREE.Vector3().lerpVectors(start, end, t);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 0.65), trimMat);
    tooth.position.set(pos.x, 2.6, pos.z);
    tooth.lookAt(end.x, 2.6, end.z);
    tooth.castShadow = true;
    group.add(tooth);
  }

  if (withWatchtower) {
    [start, end].forEach((pt) => {
      const bastion = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 3.4, 7), stoneMat);
      bastion.position.set(pt.x, 1.7, pt.z);
      bastion.castShadow = true;
      bastion.receiveShadow = true;
      group.add(bastion);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 7), roofMat);
      cap.position.set(pt.x, 4.1, pt.z);
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
  });

  const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 4.2, 6), darkRockMat);
  leftPillar.position.set(-2.1, 2.1, 0);
  leftPillar.castShadow = true;
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 4.2, 6), darkRockMat);
  rightPillar.position.set(2.1, 2.1, 0);
  rightPillar.castShadow = true;
  group.add(rightPillar);

  const arch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 1.2), darkRockMat);
  arch.position.set(0, 4.1, 0);
  arch.castShadow = true;
  group.add(arch);

  const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.5), crimsonMat);
  portal.position.set(0, 1.8, 0.05);
  group.add(portal);

  return group;
}

// 로우폴리 나무 & 바위 생성
function createLowPolyTree(scale = 1) {
  const group = new THREE.Group();
  const trunkMat = makeLowPolyMaterial(0x78350f);
  const leafMat1 = makeLowPolyMaterial(0x22c55e);
  const leafMat2 = makeLowPolyMaterial(0x16a34a);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.35 * scale, 1.2 * scale, 6), trunkMat);
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.25 * scale, 1.8 * scale, 7), leafMat1);
  cone1.position.y = 1.75 * scale;
  cone1.castShadow = true;
  group.add(cone1);

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.95 * scale, 1.5 * scale, 7), leafMat2);
  cone2.position.y = 2.65 * scale;
  cone2.castShadow = true;
  group.add(cone2);

  return group;
}

function createLowPolyRock(scale = 1) {
  const mat = makeLowPolyMaterial(0x94a3b8);
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 * scale, 0), mat);
  mesh.position.y = 0.35 * scale;
  mesh.scale.set(1.2, 0.75, 1.0);
  mesh.rotation.set(Math.random(), Math.random() * Math.PI, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildStageWorld(scene, stageData) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // 1. 초록색 들판 지형 (로우폴리 타일 패치 + 레이캐스트용 지면)
  const groundGeo = new THREE.PlaneGeometry(92, 64, 28, 20);
  groundGeo.rotateX(-Math.PI / 2);

  // 가장자리만 살짝 솟아오르게 하고 내부 플레이 구역은 평탄하게 유지
  const posAttr = groundGeo.attributes.position;
  const colors = [];
  const baseCol = new THREE.Color(stageData.groundColor);
  const altCol = new THREE.Color(stageData.groundAltColor);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    if (Math.abs(x) > 35 || Math.abs(z) > 22) {
      posAttr.setY(i, 0.45 * Math.sin(x * 0.3) * Math.cos(z * 0.3) + 0.35);
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
    new THREE.PlaneGeometry(120, 90).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  worldGroup.add(raycastPlane);

  // 2. 밝은 모래색의 구불구불한 큰 길 생성
  const curvePoints = stageData.pathPoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const roadCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.38);

  // 길 테두리 (돌 경계석 느낌)
  const borderGeo = createRibbonGeometry(roadCurve, 2.75, 0.03, 160);
  const borderMesh = new THREE.Mesh(borderGeo, makeLowPolyMaterial(stageData.roadBorderColor));
  borderMesh.receiveShadow = true;
  worldGroup.add(borderMesh);

  // 밝은 모래색 본 길
  const roadGeo = createRibbonGeometry(roadCurve, 2.25, 0.06, 160);
  const roadMesh = new THREE.Mesh(roadGeo, makeLowPolyMaterial(stageData.roadColor));
  roadMesh.receiveShadow = true;
  worldGroup.add(roadMesh);

  // 길 가장자리 조약돌 장식
  const pebbleMat = makeLowPolyMaterial(0xd6c08d);
  for (let i = 4; i < 145; i += 5) {
    const t = i / 150;
    const pt = roadCurve.getPoint(t);
    const tan = roadCurve.getTangent(t);
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const side = i % 2 === 0 ? 1 : -1;
    const pebble = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.32), pebbleMat);
    pebble.position.copy(pt).addScaledVector(norm, side * (2.42 + (i % 3) * 0.08));
    pebble.position.y = 0.08;
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

  const citadel = createSmallCitadel(endPt, prevEndPt);
  worldGroup.add(citadel.group);

  // 주변 성벽과 작은 망루 (북측/남측/측면 방어 성벽)
  const wallSegments = [
    [-33, -20, -12, -20, true],
    [-4, -20, 16, -20, true],
    [22, -20, 33, -20, true],
    [-33, 20, -10, 20, true],
    [-2, 20, 18, 20, true],
    [-34, -19, -34, -6, false],
    [34, -19, 34, 4, true],
  ];
  wallSegments.forEach(([x1, z1, x2, z2, hasTower]) => {
    worldGroup.add(createCastleWallSegment(x1, z1, x2, z2, hasTower));
  });

  // 4. 나무, 바위, 꽃덤불을 길과 건설 구역을 피해 절차적 배치
  const sampledRoad = roadCurve.getPoints(90);
  const isNearRoadOrPad = (x, z, minRoadDist = 4.2) => {
    for (const rp of sampledRoad) {
      if (Math.hypot(rp.x - x, rp.z - z) < minRoadDist) return true;
    }
    for (const pad of stageData.buildPads) {
      if (Math.hypot(pad.x - x, pad.z - z) < 3.6) return true;
    }
    if (Math.hypot(endPt.x - x, endPt.z - z) < 6.5) return true;
    if (Math.hypot(startPt.x - x, startPt.z - z) < 5.5) return true;
    return false;
  };

  // 의사 난수 생성기 (스테이지마다 일정한 배치)
  let seed = stageData.id * 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 65; i++) {
    const x = (rand() - 0.5) * 66;
    const z = (rand() - 0.5) * 38;
    if (isNearRoadOrPad(x, z, 4.3)) continue;

    if (rand() < 0.72) {
      const tree = createLowPolyTree(0.8 + rand() * 0.55);
      tree.position.set(x, 0, z);
      worldGroup.add(tree);
    } else {
      const rock = createLowPolyRock(0.7 + rand() * 0.65);
      rock.position.set(x, 0.25, z);
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


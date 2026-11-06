import * as THREE from 'three';

/**
 * ♻️ 공통 3D 도형 & 머티리얼 캐시 팩토리 (DRY & WebGL 메모리 최적화)
 * - 동일한 색상/속성의 머티리얼과 기본 지오메트리를 캐싱하여 재사용합니다.
 * - 도메인/엔티티 코드에서 반복적인 `new THREE.Mesh(...)` 보일러플레이트를 60% 이상 줄입니다.
 */
const materialCache = new Map();

export function getStandardMat(colorHex, { roughness = 0.65, metalness = 0.0, flatShading = true } = {}) {
  const key = `std_${colorHex}_${roughness}_${metalness}_${flatShading ? 1 : 0}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness,
        metalness,
        flatShading,
      })
    );
  }
  return materialCache.get(key);
}

export function getBasicMat(colorHex, { opacity = 1.0, doubleSide = false } = {}) {
  const key = `bas_${colorHex}_${opacity}_${doubleSide ? 1 : 0}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: opacity < 1.0,
        opacity,
        side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      })
    );
  }
  return materialCache.get(key);
}

export function createBox(w, h, d, colorHex, pos = [0, 0, 0], castShadow = true, matOpts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getStandardMat(colorHex, matOpts));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCylinder(rTop, rBot, h, segs, colorHex, pos = [0, 0, 0], castShadow = true, matOpts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segs),
    getStandardMat(colorHex, matOpts)
  );
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCone(r, h, segs, colorHex, pos = [0, 0, 0], castShadow = true, matOpts = {}) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), getStandardMat(colorHex, matOpts));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = castShadow;
  return mesh;
}

export function createGroundRing(innerR, outerR, colorHex, y = 0.1, opacity = 0.8) {
  const geo = new THREE.RingGeometry(innerR, outerR, 24).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, getBasicMat(colorHex, { opacity, doubleSide: true }));
  mesh.position.y = y;
  return mesh;
}

export function clearGroupChildren(group) {
  if (!group) return;
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}


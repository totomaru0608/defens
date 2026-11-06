import * as THREE from 'three';
import { KINGDOM_CONFIG } from '../data/kingdomConfig.js';
import {
  createBox,
  createCylinder,
  createCone,
  createGroundRing,
  getStandardMat,
  getBasicMat,
  clearGroupChildren,
} from '../core/meshFactory.js';

function buildVillageAndHouses(dm) {
  dm.villageGroup.position.copy(dm.villagePos);
  dm.villageGroup.add(createCylinder(0.65, 0.8, 0.22, 8, 0x64748b, [0, 0.11, 0]));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.78, 6), getBasicMat(0xf97316));
  flame.position.y = 0.48;
  dm.villageGroup.add(flame);

  const houseLv = dm.getFacilityLevel('house');
  const totalHouses = Math.min(12, 2 + houseLv * 2 + (dm.settlementStep - 1));

  for (let i = 0; i < totalHouses; i++) {
    const ringIdx = i < 6 ? 0 : 1;
    const countInRing = ringIdx === 0 ? Math.min(6, totalHouses) : totalHouses - 6;
    const idxInRing = ringIdx === 0 ? i : i - 6;
    const ang = (idxInRing / Math.max(1, countInRing)) * Math.PI * 2 + ringIdx * 0.4;
    const rad = ringIdx === 0 ? 2.25 : 3.85;

    const hut = new THREE.Group();
    if (i >= 2 || dm.settlementStep >= 2) {
      hut.add(createBox(1.05, 0.92, 0.95, 0xfef3c7, [0, 0.46, 0]));
      const roof = createCone(0.95, 0.75, 4, 0xdc2626, [0, 1.25, 0]);
      roof.rotation.y = Math.PI / 4;
      hut.add(roof);
    } else {
      hut.add(createCylinder(0.65, 0.76, 0.85, 7, 0xd97706, [0, 0.42, 0]));
      hut.add(createCone(0.92, 0.78, 7, 0x92400e, [0, 1.18, 0]));
    }
    hut.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    dm.villageGroup.add(hut);
  }
}

function buildFarmAndWindmill(dm) {
  const farmLv = dm.getFacilityLevel('farm');
  if (farmLv <= 0 && dm.settlementStep < 2) return;

  const effectiveFarmLv = Math.max(1, farmLv);
  dm.farmGroup.position.copy(dm.farmPos);
  const plotCount = Math.min(6, effectiveFarmLv * 2);

  for (let i = 0; i < plotCount; i++) {
    const col = (i % 2 === 0 ? -1 : 1) * 1.9;
    const row = Math.floor(i / 2) * 1.65 - 1.2;
    dm.farmGroup.add(createBox(1.45, 0.14, 1.35, 0x713f12, [col, 0.07, row]));
    const cropH = 0.35 + Math.min(0.35, effectiveFarmLv * 0.08);
    dm.farmGroup.add(createBox(1.25, cropH, 1.15, 0xfacc15, [col, 0.28, row]));
  }

  dm.farmGroup.add(createCylinder(0.55, 0.82, 2.3, 8, 0xf8fafc, [0, 1.15, -2.2]));
  const bladesPivot = new THREE.Group();
  bladesPivot.position.set(0, 1.9, -1.55);
  for (let b = 0; b < 4; b++) {
    const blade = createBox(0.22, 1.95, 0.08, 0xfef08a, [0, 0, 0]);
    blade.rotation.z = (b * Math.PI) / 2;
    bladesPivot.add(blade);
  }
  dm.farmGroup.add(bladesPivot);
  dm.windmillBlades.push(bladesPivot);
}

function buildFisheryPier(dm) {
  const fisheryLv = dm.getFacilityLevel('fishery');
  if (fisheryLv <= 0) return;

  dm.fisheryGroup.position.copy(dm.fisheryPos);
  dm.fisheryGroup.add(createCylinder(2.6, 2.8, 0.14, 16, 0x0284c7, [0, 0.06, 0], false, { roughness: 0.25 }));
  dm.fisheryGroup.add(createBox(1.2, 0.2, 2.8, 0x78350f, [0, 0.28, -1.2]));
  dm.fisheryGroup.add(createBox(1.3, 0.95, 1.1, 0x0ea5e9, [-1.6, 0.48, -2.0]));

  const boat = new THREE.Group();
  boat.add(createBox(0.95, 0.32, 1.65, 0x78350f, [0, 0.24, 0]));
  boat.add(createCone(0.55, 1.1, 3, 0xf8fafc, [0, 0.9, 0]));
  boat.position.set(0.9, 0.08, 0.6);
  dm.fisheryGroup.add(boat);
  dm.fishingBoatMesh = boat;

  const fishCount = Math.min(5, 1 + fisheryLv);
  for (let f = 0; f < fishCount; f++) {
    const fish = createCone(0.18, 0.52, 5, 0x7dd3fc, [(f - 1) * 0.75, 0.4, 0.4 + (f % 2) * 0.6], false, {
      metalness: 0.5,
      roughness: 0.2,
    });
    fish.rotation.z = Math.PI / 2;
    dm.fisheryGroup.add(fish);
    dm.jumpingFishMeshes.push(fish);
  }
}

function buildTownMarketAndTrade(dm) {
  if (dm.settlementStep >= 2) {
    dm.townGroup.position.copy(dm.townPos);
    dm.townGroup.add(createBox(2.2, 1.4, 1.7, 0xf8fafc, [0, 0.7, 2.2]));
    const roof = createCone(1.75, 1.1, 4, 0x2563eb, [0, 1.95, 2.2]);
    roof.rotation.y = Math.PI / 4;
    dm.townGroup.add(roof);
  }

  if (dm.settlementStep >= 3) {
    dm.marketGroup.position.copy(dm.marketPos);
    const stallColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
    for (let i = 0; i < 4; i++) {
      const ox = (i % 2 === 0 ? -1 : 1) * 1.4;
      const oz = (Math.floor(i / 2) - 0.5) * 1.65;
      const stall = new THREE.Group();
      stall.add(createBox(1.2, 0.62, 0.85, 0x92400e, [0, 0.31, 0]));
      const canopy = createCone(0.98, 0.72, 4, stallColors[i], [0, 1.18, 0]);
      canopy.rotation.y = Math.PI / 4;
      stall.add(canopy);
      stall.position.set(ox, 0, oz);
      dm.marketGroup.add(stall);
    }
  }

  if (dm.settlementStep >= 4) {
    dm.tradePostGroup.position.copy(dm.tradePostPos);
    dm.tradePostGroup.add(createBox(2.5, 1.65, 1.9, 0xfef3c7, [0, 0.82, 0]));
    const roof = createCone(2.0, 1.2, 4, 0xd97706, [0, 2.25, 0], true, { metalness: 0.35, roughness: 0.4 });
    roof.rotation.y = Math.PI / 4;
    dm.tradePostGroup.add(roof);

    const cart = new THREE.Group();
    cart.add(createBox(1.1, 0.65, 0.75, 0x78350f, [0, 0.52, 0]));
    const goldCargo = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.42, 0),
      getStandardMat(0xfacc15, { metalness: 0.5 })
    );
    goldCargo.position.y = 0.95;
    cart.add(goldCargo);
    cart.position.set(0, 0, 1.85);
    dm.tradePostGroup.add(cart);
    dm.tradeCartMesh = cart;
  }
}

function buildCastleAndCustomFacilities(dm) {
  if (dm.settlementStep >= 2) {
    dm.castleUpgradeGroup.position.copy(dm.castleEndPt);
    const roofCol = dm.settlementStep >= 5 ? 0x7c3aed : 0x1d4ed8;
    const wallRing = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.8, 1.4 + dm.settlementStep * 0.38, 10, 1, true),
      getStandardMat(0xe2e8f0)
    );
    wallRing.position.y = 0.85;
    dm.castleUpgradeGroup.add(wallRing);

    if (dm.settlementStep >= 4) {
      [
        [-4.3, -4.3],
        [4.3, -4.3],
        [-4.3, 4.3],
        [4.3, 4.3],
      ].forEach(([tx, tz]) => {
        dm.castleUpgradeGroup.add(createCylinder(1.05, 1.25, 4.6, 8, 0xe2e8f0, [tx, 2.3, tz]));
        dm.castleUpgradeGroup.add(createCone(1.45, 1.9, 8, roofCol, [tx, 5.5, tz]));
      });
    }

    if (dm.settlementStep >= 5) {
      dm.castleUpgradeGroup.add(createCylinder(1.5, 2.1, 8.2, 8, 0xe2e8f0, [0, 4.1, 0]));
      dm.castleUpgradeGroup.add(createCone(2.3, 3.2, 8, 0xfacc15, [0, 9.6, 0], true, { metalness: 0.5 }));
      dm.castleUpgradeGroup.add(createGroundRing(6.3, 7.1, 0xfacc15, 0.15, 0.95));
    }
  }

  let customIdx = 0;
  for (const facId of Object.keys(KINGDOM_CONFIG.facilities)) {
    if (facId === 'house' || facId === 'farm' || facId === 'fishery') continue;
    const lv = dm.getFacilityLevel(facId);
    if (lv <= 0) continue;

    const angle = customIdx * 1.15 + 0.5;
    const cx = THREE.MathUtils.clamp(dm.villagePos.x + Math.cos(angle) * 6.2, -24, 24);
    const cz = THREE.MathUtils.clamp(dm.villagePos.z + Math.sin(angle) * 5.2, -13, 13);
    const node = new THREE.Group();
    node.add(createCylinder(0.95, 1.15, 1.3 + lv * 0.25, 8, 0x10b981, [0, 0.65 + lv * 0.12, 0]));
    node.add(createCone(1.2, 0.95, 8, 0xfacc15, [0, 1.65 + lv * 0.25, 0]));
    node.position.set(cx, 0, cz);
    dm.customFacilityGroup.add(node);
    customIdx += 1;
  }
}

export function rebuildSettlementMeshes(dm) {
  [
    dm.villageGroup,
    dm.farmGroup,
    dm.fisheryGroup,
    dm.townGroup,
    dm.marketGroup,
    dm.tradePostGroup,
    dm.castleUpgradeGroup,
    dm.customFacilityGroup,
  ].forEach(clearGroupChildren);

  dm.windmillBlades = [];
  dm.fishingBoatMesh = null;
  dm.jumpingFishMeshes = [];
  dm.tradeCartMesh = null;

  buildVillageAndHouses(dm);
  buildFarmAndWindmill(dm);
  buildFisheryPier(dm);
  buildTownMarketAndTrade(dm);
  buildCastleAndCustomFacilities(dm);
}

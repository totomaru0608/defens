import * as THREE from 'three';
import { sfx } from '../audio.js';

let bannerTimeout = null;

export function showBanner(subtitle, title, duration = 1800) {
  const centerBannerEl = document.getElementById('center-banner');
  const bannerSubEl = document.getElementById('banner-subtitle');
  const bannerTitleEl = document.getElementById('banner-title');
  if (!centerBannerEl || !bannerSubEl || !bannerTitleEl) return;

  bannerSubEl.textContent = subtitle;
  bannerTitleEl.textContent = title;
  centerBannerEl.classList.remove('hidden');
  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    centerBannerEl.classList.add('hidden');
  }, duration);
}

export function showModal({ badge, title, desc, buttonText, onAction }) {
  const modalOverlayEl = document.getElementById('modal-overlay');
  const modalBadgeEl = document.getElementById('modal-badge');
  const modalTitleEl = document.getElementById('modal-title');
  const modalDescEl = document.getElementById('modal-desc');
  const modalActionBtn = document.getElementById('btn-modal-action');
  if (!modalOverlayEl) return;

  modalBadgeEl.textContent = badge;
  modalTitleEl.textContent = title;
  modalDescEl.innerHTML = desc;
  modalActionBtn.textContent = buttonText;
  modalOverlayEl.classList.remove('hidden');

  modalActionBtn.onclick = () => {
    sfx.init();
    modalOverlayEl.classList.add('hidden');
    onAction();
  };
}

export function createVfxController(scene, camera, viewportEl, worldLabelsEl, state) {
  function worldToScreen(vec3) {
    const projected = vec3.clone().project(camera);
    const rect = viewportEl.getBoundingClientRect();
    return {
      x: (projected.x * 0.5 + 0.5) * rect.width,
      y: (-projected.y * 0.5 + 0.5) * rect.height,
      visible: projected.z < 1,
    };
  }

  function spawnFloatingText(worldPos, text, color = '#fef08a') {
    const screen = worldToScreen(worldPos);
    if (!screen.visible) return;
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = `${screen.x}px`;
    el.style.top = `${screen.y}px`;
    el.style.color = color;
    worldLabelsEl.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function spawnRingEffect(pos, maxRadius, color = 0xfde047, duration = 0.28) {
    const geo = new THREE.RingGeometry(0.2, 0.55, 28).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.18, pos.z);
    scene.add(mesh);

    state.effects.push({
      mesh,
      age: 0,
      duration,
      maxRadius,
      update(dt) {
        this.age += dt;
        const t = Math.min(1, this.age / this.duration);
        const scale = 1 + t * (this.maxRadius * 1.85);
        this.mesh.scale.set(scale, 1, scale);
        this.mesh.material.opacity = 0.9 * (1 - t);
        return this.age >= this.duration;
      },
    });
  }

  function spawnCoinFeedArc(fromPos, toPos) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 8), mat);
    mesh.rotation.z = Math.PI / 2;
    scene.add(mesh);

    const start = fromPos.clone().setY(1.2);
    const end = toPos.clone().setY(1.3);

    state.effects.push({
      mesh,
      age: 0,
      duration: 0.22,
      update(dt) {
        this.age += dt;
        const t = Math.min(1, this.age / this.duration);
        this.mesh.position.lerpVectors(start, end, t);
        this.mesh.position.y += Math.sin(t * Math.PI) * 1.4;
        this.mesh.rotation.y += dt * 12;
        return this.age >= this.duration;
      },
    });
  }

  return {
    worldToScreen,
    spawnFloatingText,
    spawnRingEffect,
    spawnCoinFeedArc,
  };
}

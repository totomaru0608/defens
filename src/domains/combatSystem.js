import * as THREE from 'three';
import { STAGES, TOWER_TYPES } from '../stages.js';
import { RedEnemy, DroppedCoin, TowerProjectile } from '../entities.js';
import { sfx } from '../audio.js';
import { showBanner, showModal } from '../core/vfxManager.js';

export function createCombatSystem({ scene, camera, state, kingdomDomain, vfx, loadStage }) {
  function prepareWave(waveIdx) {
    const stageData = STAGES[state.stageIndex];
    state.waveIndex = waveIdx;
    state.waveTimer = 0;
    state.spawnQueue = [];

    const wave = stageData.waves[waveIdx];
    if (!wave) return;

    wave.groups.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        state.spawnQueue.push({
          type: group.type,
          spawnTime: group.delay + i * group.interval,
          spawned: false,
        });
      }
    });
    state.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);

    if (waveIdx > 0) {
      showBanner(`STAGE ${state.stageIndex + 1}`, `웨이브 ${waveIdx + 1} 몰려옵니다!`, 1500);
    }
  }

  function damageEnemy(enemy, amount, color = '#ffffff') {
    if (enemy.dead) return;
    const killed = enemy.takeDamage(amount);
    vfx.spawnFloatingText(enemy.position.clone().setY(1.8), `-${amount}`, color);

    if (killed) {
      state.defeatedStageEnemies += 1;
      sfx.playEnemyDefeat();
      vfx.spawnRingEffect(enemy.position, 1.4, 0xef4444, 0.22);

      const dropCount = enemy.def.isBoss ? 8 : Math.max(1, Math.round(enemy.coinReward / 6));
      const baseVal = Math.floor(enemy.coinReward / dropCount);
      const remainder = enemy.coinReward - baseVal * dropCount;

      for (let i = 0; i < dropCount; i++) {
        const val = i === 0 ? baseVal + remainder : baseVal;
        state.coinsList.push(new DroppedCoin(scene, enemy.position, val));
      }
    }
  }

  function triggerPlayerSkill() {
    const player = state.player;
    if (!player || state.mode !== 'playing' || player.skillTimer > 0) return;

    player.skillTimer = player.skillCooldown;
    player.triggerSwing();
    sfx.playSkill();

    vfx.spawnRingEffect(player.position, player.skillRadius, 0xfacc15, 0.38);
    vfx.spawnFloatingText(player.position.clone().setY(2.3), '⚡ 황금 충격파!', '#fde047');

    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.reachedCastle) return;
      if (enemy.position.distanceTo(player.position) <= player.skillRadius) {
        enemy.applySlow(0.35, 1.8);
        damageEnemy(enemy, player.skillDamage, '#fde047');
      }
    });
  }

  function updatePadsAndTowers(dt, elapsed) {
    for (const pad of state.pads) {
      pad.update(dt, elapsed);
      const distToPlayer = pad.position.distanceTo(state.player.position);

      if (distToPlayer < 2.45 && pad.level < pad.maxLevel && pad.feedCooldown <= 0) {
        const buildType = pad.level === 0 ? state.selectedTower : pad.towerType;
        const targetCost = pad.getCurrentTargetCost(buildType);
        const needed = targetCost - pad.investedCoins;

        if (needed > 0 && state.coins > 0) {
          const stepCoin = Math.min(5, needed, state.coins);
          state.coins -= stepCoin;
          pad.investedCoins += stepCoin;
          pad.feedCooldown = 0.065;
          sfx.playCoinFeed();
          vfx.spawnCoinFeedArc(state.player.position, pad.position);

          if (pad.investedCoins >= targetCost) {
            pad.constructOrUpgrade(buildType);
            sfx.playTowerBuilt();
            vfx.spawnRingEffect(pad.position, 2.8, 0x4ade80, 0.35);
            const tDef = TOWER_TYPES[pad.towerType];
            vfx.spawnFloatingText(pad.position.clone().setY(3.2), `${tDef.emoji} ${tDef.name} Lv.${pad.level}!`, '#4ade80');
          }
        }
      }

      if (pad.level > 0 && pad.fireTimer <= 0 && state.enemies.length > 0) {
        const stats = pad.getStats();
        let bestEnemy = null;
        let maxProgress = -1;
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.reachedCastle) continue;
          if (enemy.position.distanceTo(pad.position) <= stats.range && enemy.progress > maxProgress) {
            maxProgress = enemy.progress;
            bestEnemy = enemy;
          }
        }
        if (bestEnemy) {
          pad.fireTimer = stats.fireRate;
          if (pad.turretHead) {
            pad.turretHead.lookAt(bestEnemy.position.x, pad.turretHead.getWorldPosition(new THREE.Vector3()).y, bestEnemy.position.z);
          }
          sfx.playTowerShot(stats.id);
          const muzzlePos = pad.position.clone().setY(2.4 + pad.level * 0.3);
          state.projectiles.push(new TowerProjectile(scene, muzzlePos, bestEnemy, stats));
        }
      }
    }
  }

  function updateProjectilesAndEnemies(dt, elapsed) {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      proj.update(dt);
      if (!proj.hit) continue;

      const st = proj.stats;
      if (st.id === 'cannon' || st.id === 'wall') {
        const splash = st.splashRadius || 2.6;
        vfx.spawnRingEffect(proj.position, splash, st.id === 'wall' ? 0xfacc15 : 0xf97316, 0.26);
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.reachedCastle || enemy.position.distanceTo(proj.position) > splash) continue;
          if (st.id === 'wall') enemy.applySlow(st.slowFactor || 0.45, st.slowDuration || 2.4);
          damageEnemy(enemy, st.damage, st.id === 'wall' ? '#fde047' : '#fb923c');
        }
      } else if (st.id === 'frost') {
        vfx.spawnRingEffect(proj.position, 1.8, 0x38bdf8, 0.22);
        if (proj.targetEnemy && !proj.targetEnemy.dead) {
          proj.targetEnemy.applySlow(st.slowFactor, st.slowDuration);
          damageEnemy(proj.targetEnemy, st.damage, '#7dd3fc');
        }
      } else if (proj.targetEnemy && !proj.targetEnemy.dead) {
        damageEnemy(proj.targetEnemy, st.damage, '#fde047');
      }
      proj.destroy();
      state.projectiles.splice(i, 1);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemy.update(dt, elapsed, camera.position);

      if (!enemy.dead && !enemy.reachedCastle && enemy.position.distanceTo(state.player.position) < 1.25 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.1;
        state.player.hp = Math.max(0, state.player.hp - enemy.playerDamage);
        vfx.spawnFloatingText(state.player.position.clone().setY(2.2), `-${enemy.playerDamage}`, '#f87171');
        if (state.player.hp <= 0) {
          state.player.hp = state.player.maxHp;
          state.player.position.set(0, 0, 0);
          state.player.targetPos.set(0, 0, 0);
          vfx.spawnFloatingText(state.player.position.clone().setY(2.4), '🛡️ 수비대장 재정비!', '#60a5fa');
        }
      }

      if (enemy.reachedCastle) {
        state.castleHp = Math.max(0, state.castleHp - enemy.castleDamage);
        state.defeatedStageEnemies += 1;
        sfx.playCastleHit();
        vfx.spawnRingEffect(state.world.endPt, 3.2, 0xef4444, 0.35);
        vfx.spawnFloatingText(state.world.endPt.clone().setY(3.5), `🏰 성채 -${enemy.castleDamage}!`, '#ef4444');
        enemy.destroy();
        state.enemies.splice(i, 1);
        continue;
      }
      if (enemy.dead) {
        enemy.destroy();
        state.enemies.splice(i, 1);
      }
    }
  }

  function updateCombatTick(dt, elapsed) {
    state.waveTimer += dt;
    const stageMultiplier = 1 + state.stageIndex * 0.22;
    for (const item of state.spawnQueue) {
      if (!item.spawned && state.waveTimer >= item.spawnTime) {
        item.spawned = true;
        state.enemies.push(new RedEnemy(scene, item.type, state.world.roadCurve, stageMultiplier));
      }
    }

    const stageData = STAGES[state.stageIndex];
    if (state.spawnQueue.every((q) => q.spawned) && state.enemies.length === 0 && state.waveIndex < stageData.waves.length - 1) {
      prepareWave(state.waveIndex + 1);
    }

    if (state.player.attackTimer <= 0 && state.enemies.length > 0) {
      const nearest = state.enemies.find((e) => !e.dead && !e.reachedCastle && e.position.distanceTo(state.player.position) <= state.player.attackRange);
      if (nearest) {
        state.player.attackTimer = state.player.attackInterval;
        state.player.faceToward(nearest.position);
        state.player.triggerSwing();
        sfx.playSlash();
        const dmg = Math.round(state.player.attackDamage * kingdomDomain.getCombatMultiplier());
        vfx.spawnRingEffect(state.player.position, state.player.attackRange * 0.85, 0x60a5fa, 0.18);
        state.enemies.forEach((e) => {
          if (!e.dead && !e.reachedCastle && e.position.distanceTo(state.player.position) <= state.player.attackRange) {
            damageEnemy(e, dmg, '#93c5fd');
          }
        });
      }
    }

    updatePadsAndTowers(dt, elapsed);
    updateProjectilesAndEnemies(dt, elapsed);

    for (let i = state.coinsList.length - 1; i >= 0; i--) {
      const coin = state.coinsList[i];
      coin.update(dt, state.player.position);
      if (coin.collected) {
        state.coins += coin.value;
        sfx.playCoinPickup();
        vfx.spawnFloatingText(state.player.position.clone().setY(2.1), `+🪙${coin.value}`, '#fde047');
        coin.destroy();
        state.coinsList.splice(i, 1);
      }
    }

    for (let i = state.effects.length - 1; i >= 0; i--) {
      if (state.effects[i].update(dt)) {
        scene.remove(state.effects[i].mesh);
        state.effects.splice(i, 1);
      }
    }

    if (state.castleHp <= 0) {
      state.mode = 'defeat';
      showModal({
        badge: `STAGE ${state.stageIndex + 1} DEFEAT`,
        title: '🏰 성채가 함락되었습니다!',
        desc: '야수 군단이 성문을 돌파했습니다. 방어탑·성벽을 확충하고 다시 도전해 보세요!',
        buttonText: `STAGE ${state.stageIndex + 1} 다시 도전하기`,
        onAction: () => loadStage(state.stageIndex, false),
      });
    } else if (state.defeatedStageEnemies >= state.totalStageEnemies && state.enemies.length === 0) {
      state.coinsList.forEach((c) => {
        state.coins += c.value;
        c.destroy();
      });
      state.coinsList = [];
      sfx.playStageClear();

      if (state.stageIndex < STAGES.length - 1) {
        state.mode = 'stage_clear';
        showModal({
          badge: `STAGE ${state.stageIndex + 1} CLEAR!`,
          title: `🎉 ${STAGES[state.stageIndex].name} 방어 성공!`,
          desc: `다음 전장: <strong>STAGE ${state.stageIndex + 2} - ${STAGES[state.stageIndex + 1].name}</strong>`,
          buttonText: `다음 스테이지 출격 (STAGE ${state.stageIndex + 2})`,
          onAction: () => loadStage(state.stageIndex + 1, false),
        });
      } else {
        state.mode = 'victory';
        showModal({
          badge: `ALL ${STAGES.length} STAGES CLEARED!`,
          title: '👑 코인 건국 수비대 최종 승리!',
          desc: `모든 야수 군단을 물리치고 번영하는 왕국과 대성곽을 지켜냈습니다!`,
          buttonText: 'STAGE 1부터 다시 플레이',
          onAction: () => loadStage(0, false),
        });
      }
    }
  }

  return { prepareWave, damageEnemy, triggerPlayerSkill, updateCombatTick };
}

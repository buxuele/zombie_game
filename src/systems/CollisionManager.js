import { audio } from '../engine/Audio.js';
import { storage } from './Storage.js';
import { logger } from './Logger.js';

export class CollisionManager {
  static checkAABB(b1, b2) {
    if (!b1 || !b2) return false;
    return (
      b1.x < b2.x + b2.width &&
      b1.x + b1.width > b2.x &&
      b1.y < b2.y + b2.height &&
      b1.y + b1.height > b2.y
    );
  }

  static handleCoins(game) {
    const leader = game.horde.leader;
    if (!leader) return;

    for (const coin of game.level.coins) {
      if (!coin.alive) continue;

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, coin)) {
          coin.collect(game.particles, game.floatingText);
          const isGold = game.transformations.activeType === 'GOLD';
          const multiplier = isGold ? 2 : 1;
          game.sessionCoins += multiplier;
          storage.addCoins(multiplier);
          storage.updateMission('coins_collected', multiplier);
          break;
        }
      }
    }
  }

  static handleBrains(game) {
    for (const brain of game.level.brains) {
      if (!brain.alive) continue;

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, brain)) {
          brain.collect(game.particles, game.floatingText);
          game.sessionBrains += 1;
          storage.addBrains(1);
          storage.updateMission('civilians_eaten', 1);
          break;
        }
      }
    }
  }

  static handleMysteryBoxes(game, dt) {
    for (const box of game.level.mysteryBoxes) {
      if (!box.alive) continue;
      box.update(dt);

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, box)) {
          box.collect(game.particles, game.floatingText);
          const durationLevel = storage.getUpgradeLevel('transformDuration');
          game.transformations.activateRandom(durationLevel, game.floatingText);
          storage.updateMission('transforms_used', 1);
          logger.info(`跳跃顶开宝箱, 触发超能变身: ${game.transformations.currentDef.name}`);
          break;
        }
      }
    }
  }

  static handleCivilians(game) {
    const leader = game.horde.leader;
    if (!leader) return;

    const isGold = game.transformations.activeType === 'GOLD';
    const isTsunami = game.transformations.activeType === 'TSUNAMI';
    const isMech = game.transformations.activeType === 'MECH';
    const isDragon = game.transformations.activeType === 'DRAGON';

    for (const civ of game.level.civilians) {
      if (!civ.alive || civ.isBitten) continue;

      if (isGold && Math.abs(leader.x - civ.x) < 90) {
        civ.alive = false;
        game.particles.spawnCoinSparkle(civ.x + 15, civ.y + 20);
        game.sessionCoins += 5;
        storage.addCoins(5);
        game.floatingText.spawn(civ.x + 15, civ.y - 15, '+5 金币', '#f1c40f', 20);
        logger.info('黄金狂潮将平民转化为金币');
        continue;
      }

      const isAreaSwept =
        (isTsunami && civ.x < leader.x + 320) ||
        (isMech && civ.x > leader.x && civ.x < leader.x + 900) ||
        (isDragon && civ.x < leader.x + 280);

      if (isAreaSwept) {
        civ.bite(game.particles, game.floatingText, game.horde);
        game.sessionBrains += 1;
        storage.addBrains(1);
        storage.updateMission('civilians_eaten', 1);
        this.triggerFeverCombo(game, leader);
        continue;
      }

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, civ)) {
          civ.bite(game.particles, game.floatingText, game.horde);
          game.sessionBrains += 1;
          storage.addBrains(1);
          storage.updateMission('civilians_eaten', 1);
          this.triggerFeverCombo(game, leader);
          logger.info(`咬中并感染平民, 军团扩充至: ${game.horde.count + 1} 人`);
          break;
        }
      }
    }
  }

  static triggerFeverCombo(game, leader) {
    game.feverCombo++;
    if (game.feverCombo >= 8) {
      game.feverTimer = 5.0;
      game.feverCombo = 0;
      audio.playFever();
      game.floatingText.spawn(leader.x + 40, leader.y - 40, '狂热暴走 FEVER!', '#f1c40f', 32, 1.5);
      game.renderer.camera.addTrauma(0.5);
    }
  }

  static handleVehicles(game, dt) {
    const leader = game.horde.leader;
    if (!leader) return;

    const isFever = game.feverTimer > 0;
    const isGold = game.transformations.activeType === 'GOLD';
    const isTsunami = game.transformations.activeType === 'TSUNAMI';
    const isQuarterback = game.transformations.activeType === 'QUARTERBACK';
    const isMech = game.transformations.activeType === 'MECH';
    const isDragon = game.transformations.activeType === 'DRAGON';

    for (const v of game.level.vehicles) {
      if (!v.alive) continue;
      v.update(dt, game.particles, game.level);

      if (v.isFlipped) continue;

      if ((isMech && v.x > leader.x && v.x < leader.x + 900) || (isDragon && v.x < leader.x + 280) || isFever) {
        v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
        game.handleVehicleReward(v);
        game.activePushVehicle = null;
        game.horde.setPushing(false);
        continue;
      }

      if (isTsunami && v.x < leader.x + 320) {
        v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
        game.handleVehicleReward(v);
        game.activePushVehicle = null;
        game.horde.setPushing(false);
        continue;
      }

      if (isGold && this.checkAABB(leader, v)) {
        v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
        game.sessionCoins += v.config.coins * 2;
        storage.addCoins(v.config.coins * 2);
        game.sessionFlippedVehicles += 1;
        storage.updateMission('cars_flipped', 1);
        game.activePushVehicle = null;
        game.horde.setPushing(false);
        continue;
      }

      const hordeCount = game.horde.count;
      const canFlip = hordeCount >= v.required || isQuarterback;

      // Active crowd pushing / stacking state
      if (v.isPushing) {
        game.renderer.camera.addTrauma(0.08);

        const blockX = v.x - 42;
        if (leader.x > blockX) {
          leader.x = blockX;
          leader.vx = 0;
        }

        if (v.pushTimer <= 0) {
          if (v.willSucceed) {
            v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
            game.handleVehicleReward(v);
            game.activePushVehicle = null;
            game.horde.setPushing(false);
            logger.vehicle(`全员堆叠合力掀翻 ${v.config.name}! 逃出乘客受到感染!`);
          } else {
            game.timeScale = 0.35;
            game.slowMoTimer = 0.8;
            game.horde.zombies.forEach(z => {
              z.alive = false;
              game.particles.spawnAngelGhost(z.x + z.width / 2, z.y);
            });
            game.activePushVehicle = null;
            audio.playExplosion();
            logger.collision(`推挤失败, 军团被 ${v.config.name} 碾压覆灭!`);
          }
        }
        continue;
      }

      for (const z of game.horde.zombies) {
        if (!z.alive) continue;

        const roofY = v.y;
        const zombieFeetY = z.y + z.height;
        const isHorizontallyOver = (z.x + z.width >= v.x - 10 && z.x <= v.x + v.width + 10);

        // 1. High Jump Clean Vaulting
        if (isHorizontallyOver && zombieFeetY < roofY - 14) {
          continue;
        }

        // 2. Roof Platform Landing & Running
        if (isHorizontallyOver && zombieFeetY >= roofY - 14 && zombieFeetY <= roofY + 34 && z.vy >= -120) {
          z.standingOnPlatform = true;
          z.land(roofY - z.height, game.particles);
          continue;
        }

        // 3. Vehicle Body Collision & Front Bumper Push
        if (this.checkAABB(z, v) || (z.x + z.width >= v.x && z.x <= v.x + 30 && zombieFeetY > roofY + 10)) {
          z.x = Math.min(z.x, v.x - z.width);
          z.vx = 0;

          if (!v.isPushing) {
            v.startPushing(canFlip);
            game.activePushVehicle = v;
            game.horde.setPushing(true);
            if (canFlip) {
              logger.vehicle(`军团满编 ${game.horde.count}/${v.required} 人正在车头前堆积叠罗汉蓄力...`);
            } else {
              logger.vehicle(`军团仅有 ${game.horde.count}/${v.required} 人, 正在车前拼死推挤 ${v.config.name}...`);
            }
          }
          break;
        }
      }
    }
  }

  static handleBombs(game, dt) {
    const leader = game.horde.leader;
    if (!leader) return;

    const isTsunami = game.transformations.activeType === 'TSUNAMI';
    const isQuarterback = game.transformations.activeType === 'QUARTERBACK';
    const isMech = game.transformations.activeType === 'MECH';

    for (const bomb of game.level.bombs) {
      if (!bomb.alive) continue;
      bomb.update(dt, game.particles);

      if ((isMech && bomb.x > leader.x && bomb.x < leader.x + 900) || (isTsunami && bomb.x < leader.x + 320)) {
        bomb.explode(game.particles, game.floatingText, game.renderer.camera);
        continue;
      }

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, bomb)) {
          bomb.explode(game.particles, game.floatingText, game.renderer.camera);
          if (!isQuarterback && !isTsunami) {
            z.alive = false;
            game.particles.spawnAngelGhost(z.x + z.width / 2, z.y);
            logger.collision(`触碰地雷引爆! 损失僵尸, 剩余: ${game.horde.count} 人`);
          }
          break;
        }
      }
    }
  }
}

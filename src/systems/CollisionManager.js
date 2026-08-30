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

    for (const civ of game.level.civilians) {
      if (!civ.alive || civ.isBitten) continue;

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, civ)) {
          if (isGold) {
            civ.alive = false;
            game.particles.spawnCoinSparkle(civ.x + 15, civ.y + 20);
            game.sessionCoins += 5;
            storage.addCoins(5);
            game.floatingText.spawn(civ.x + 15, civ.y - 15, '+5 金币', '#f1c40f', 20);
            logger.info('黄金狂潮将平民转化为金币');
          } else {
            civ.bite(game.particles, game.floatingText, game.horde);
            game.sessionBrains += 1;
            storage.addBrains(1);
            storage.updateMission('civilians_eaten', 1);
            this.triggerFeverCombo(game, leader);
            logger.info(`咬中并感染平民, 军团扩充至: ${game.horde.count + 1} 人`);
          }
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

    const isGold = game.transformations.activeType === 'GOLD';
    const isTsunami = game.transformations.activeType === 'TSUNAMI';
    const isQuarterback = game.transformations.activeType === 'QUARTERBACK';
    const isMech = game.transformations.activeType === 'GIANT_MECH';
    const isDragon = game.transformations.activeType === 'DRAGON';
    const hasSuperPower = isMech || isDragon || isTsunami || isGold || isQuarterback;

    for (const v of game.level.vehicles) {
      if (!v.alive) continue;
      v.update(dt, game.particles, game.level);

      if (v.isFlipped) continue;

      const hordeCount = game.horde.count;

      // Active crowd pushing / stacking state
      if (v.isPushing) {
        game.renderer.camera.addTrauma(0.04);

        if (v.pushTimer <= 0) {
          const currentCount = game.horde.count;
          const isEligibleToFlip = (currentCount >= v.required) || hasSuperPower;

          if (v.willSucceed && isEligibleToFlip) {
            v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
            game.handleVehicleReward(v);
            game.activePushVehicle = null;
            game.horde.setPushing(false);
            logger.vehicle(`全员满编 ${currentCount}/${v.required} 人合力掀翻 ${v.config.name}! 逃出乘客受到感染!`);
          } else {
            const collidingZombie = game.horde.zombies.find(z => z.alive && z.x + z.width >= v.x && z.x <= v.x + 40);
            if (collidingZombie) {
              collidingZombie.alive = false;
              game.particles.spawnAngelGhost(collidingZombie.x + collidingZombie.width / 2, collidingZombie.y);
            }
            v.isPushing = false;
            v.willSucceed = false;
            game.activePushVehicle = null;
            game.horde.setPushing(false);
            audio.playExplosion();
            logger.collision(`人数不足 ${currentCount}/${v.required}, 撞击 ${v.config.name} 损失僵尸!`);
          }
        }
        continue;
      }

      for (const z of game.horde.zombies) {
        if (!z.alive) continue;

        const roofY = v.y;
        const zombieFeetY = z.y + z.height;
        const isHorizontallyOver = (z.x + z.width >= v.x && z.x <= v.x + v.width);

        // 1. Clean Vaulting over Roof (Airborne jumping above vehicle roof)
        if (isHorizontallyOver && zombieFeetY <= roofY + 18 && z.vy < 0) {
          continue;
        }

        // 2. Roof Platform Landing & Running (Walking on top of vehicle roof)
        if (isHorizontallyOver && zombieFeetY >= roofY - 18 && zombieFeetY <= roofY + 32 && z.vy >= -60) {
          z.standingOnPlatform = true;
          z.land(roofY - z.height, game.particles);
          continue;
        }

        // 3. Physical Contact Collision (Direct touch on lower bumper / vehicle body)
        const isDirectTouch = (
          this.checkAABB(z, v) &&
          zombieFeetY > roofY + 20
        );

        if (isDirectTouch) {
          if (hasSuperPower) {
            // Super transformation powers (Tsunami/Mech/Dragon/Quarterback/Gold) destroy vehicle on physical contact
            v.flip(game.gameSpeed, game.particles, game.floatingText, game.renderer.camera, game.level);
            if (isGold) {
              game.sessionCoins += v.config.coins * 2;
              storage.addCoins(v.config.coins * 2);
            } else {
              game.handleVehicleReward(v);
            }
            game.activePushVehicle = null;
            game.horde.setPushing(false);
            break;
          } else if (hordeCount >= v.required) {
            // Strict headcount required: Car (4), Bus (8), Tank (12), Airplane (16)
            z.x = Math.min(z.x, v.x - z.width);
            z.vx = 0;
            if (!v.isPushing) {
              v.startPushing(true);
              v.pushTimer = 0.18; // Quick punchy heave
              game.activePushVehicle = v;
              game.horde.setPushing(true);
              logger.vehicle(`军团满编 ${hordeCount}/${v.required} 人合力掀翻 ${v.config.name}...`);
            }
            break;
          } else {
            // Strictly insufficient headcount: CANNOT push or flip! Knock out colliding front zombie
            z.alive = false;
            game.particles.spawnAngelGhost(z.x + z.width / 2, z.y);
            audio.playPushMetal();
            logger.collision(`人数不足 ${hordeCount}/${v.required}, 撞击 ${v.config.name} 损失前排僵尸!`);
            break;
          }
        }
      }
    }
  }

  static handleBombs(game, dt) {
    const leader = game.horde.leader;
    if (!leader) return;

    const isTsunami = game.transformations.activeType === 'TSUNAMI';
    const isQuarterback = game.transformations.activeType === 'QUARTERBACK';
    const isMech = game.transformations.activeType === 'GIANT_MECH';

    for (const bomb of game.level.bombs) {
      if (!bomb.alive) continue;
      bomb.update(dt, game.particles);

      for (const z of game.horde.zombies) {
        if (z.alive && this.checkAABB(z, bomb)) {
          bomb.explode(game.particles, game.floatingText, game.renderer.camera);
          if (!isQuarterback && !isTsunami && !isMech) {
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

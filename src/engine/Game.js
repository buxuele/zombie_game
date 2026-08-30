import { Renderer } from './Renderer.js';
import { InputManager } from './Input.js';
import { ZombieHorde } from '../entities/ZombieHorde.js';
import { LevelGenerator } from '../systems/LevelGenerator.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { FloatingTextManager } from '../effects/FloatingText.js';
import { TransformationManager } from '../entities/Transformations.js';
import { storage } from '../systems/Storage.js';
import { audio } from './Audio.js';
import { logger } from '../systems/Logger.js';
import { biomeManager } from '../systems/BiomeManager.js';

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();
    this.transformations = new TransformationManager();
    this.level = new LevelGenerator(540);

    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    // Arcade floaty gravity & soaring jump impulse
    this.gravity = 800;
    this.jumpImpulse = 480;

    this.initialSpeed = 190;
    this.gameSpeed = 190;
    this.distance = 0;
    this.sessionCoins = 0;
    this.sessionBrains = 0;
    this.sessionFlippedVehicles = 0;

    this.horde = null;
    this.activePushVehicle = null;

    this.initInput();
  }

  initInput() {
    this.input.onPauseRequested = () => {
      if (this.isRunning) {
        this.togglePause();
      }
    };
    this.input.onMuteRequested = () => {
      const enabled = storage.toggleSound();
      audio.setSoundEnabled(enabled);
      logger.system(`声音切换为: ${enabled ? '开启' : '静音'}`);
      if (this.callbacks.onSoundToggled) {
        this.callbacks.onSoundToggled(enabled);
      }
    };
  }

  start() {
    audio.init();
    audio.startBgm();

    const startZombies = storage.getUpgradeLevel('startZombies');
    this.horde = new ZombieHorde(200, 540, startZombies);

    this.level.init();
    biomeManager.reset();
    this.particles.clear();
    this.floatingText.clear();

    this.distance = 0;
    this.sessionCoins = 0;
    this.sessionBrains = 0;
    this.sessionFlippedVehicles = 0;
    this.gameSpeed = this.initialSpeed;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;
    this.activePushVehicle = null;

    // Fixed 60Hz physics timestep & Hit-stop freeze frame
    this.fixedTimeStep = 1 / 60;
    this.accumulator = 0;
    this.hitStopTimer = 0;
    this.feverCombo = 0;
    this.feverTimer = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    logger.info(`游戏启动, 初始速度: ${this.initialSpeed} px/s, 军团初始人数: ${startZombies}`);

    requestAnimationFrame(this.loop.bind(this));
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      audio.stopBgm();
      logger.system('游戏已暂停');
    } else {
      audio.startBgm();
      this.lastTime = performance.now();
      logger.system('游戏继续运行');
      requestAnimationFrame(this.loop.bind(this));
    }
    if (this.callbacks.onPauseChanged) {
      this.callbacks.onPauseChanged(this.isPaused);
    }
  }

  triggerHitStop(duration = 0.05) {
    this.hitStopTimer = duration;
    if (this.renderer && this.renderer.camera) {
      this.renderer.camera.addTrauma(0.22);
    }
  }

  loop(currentTime) {
    if (!this.isRunning || this.isPaused) return;

    let rawDt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDt;
      rawDt *= 0.05; // Hit-stop micro freeze
    }

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= rawDt;
      rawDt *= this.timeScale;
    }

    this.accumulator += rawDt;

    // Deterministic 60Hz fixed physics step
    while (this.accumulator >= this.fixedTimeStep) {
      this.update(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }

    this.render();

    if (this.isRunning && !this.isPaused) {
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  update(dt) {
    if (!this.horde || this.horde.count === 0) {
      this.gameOver();
      return;
    }

    const leader = this.horde.leader;
    if (!leader) {
      this.gameOver();
      return;
    }

    if (!this.activePushVehicle) {
      this.distance += (this.gameSpeed * dt) / 10;
      this.gameSpeed = this.initialSpeed + Math.min(240, Math.floor(this.distance / 70) * 8);
    }

    if (this.input.consumeJumpPress()) {
      this.horde.jump(this.jumpImpulse);
    }

    if (this.input.consumeJumpRelease()) {
      this.horde.cutJump();
    }

    const isLevitating = this.transformations.activeType === 'UFO';

    this.transformations.update(dt, this.gameSpeed, this.horde, this.particles, this.renderer.camera, this.groundY);
    this.horde.update(dt, this.gameSpeed, this.gravity, this.level, this.input.isHoldingJump, this.particles, isLevitating);
    this.level.update(leader.x, dt, this.particles);

    for (const p of this.level.puddles) {
      if (Math.abs(leader.x - p.x) < 30 && leader.grounded) {
        if (Math.random() > 0.7) {
          this.particles.spawnWaterSplash(leader.x, 540);
          audio.playPuddleSplash();
        }
      }
    }

    this.updateCollisions(dt);

    // Dynamic weather atmosphere particles based on spatial biome
    const biome = leader.x < 7000 ? 'CITY' : (leader.x < 16500 ? 'BEACH' : 'DESERT');
    this.particles.spawnWeatherAtmosphere(leader.x, biome);

    // Audio underwater lowpass filter for Tsunami
    audio.setUnderwaterFilter(this.transformations.activeType === 'TSUNAMI');

    this.particles.update(dt, this.renderer.camera.renderX);
    this.floatingText.update(dt);
    this.renderer.camera.update(dt, leader.x, leader.y);

    if (this.callbacks.onHudUpdate) {
      this.callbacks.onHudUpdate({
        distance: Math.floor(this.distance),
        brains: this.sessionBrains,
        coins: this.sessionCoins,
        zombies: this.horde.count,
        speed: Math.floor(this.gameSpeed),
        transformActive: this.transformations.isActive,
        transformProgress: this.transformations.progress,
        transformExpiring: this.transformations.isExpiringSoon,
        transformName: this.transformations.currentDef ? this.transformations.currentDef.name : ''
      });
    }
  }

  updateCollisions(dt) {
    const leader = this.horde.leader;
    if (!leader) return;

    const isTsunami = this.transformations.activeType === 'TSUNAMI';
    const isMech = this.transformations.activeType === 'GIANT_MECH';
    const isQuarterback = this.transformations.activeType === 'QUARTERBACK';
    const isGold = this.transformations.activeType === 'GOLD';
    const isDragon = this.transformations.activeType === 'DRAGON';
    const isFever = this.feverTimer > 0;

    // 1. Coins (Physical Touch Collision Required)
    for (const coin of this.level.coins) {
      if (!coin.alive) continue;
      coin.update(dt);

      for (const z of this.horde.zombies) {
        if (z.alive && this.checkAABB(z, coin)) {
          coin.collect(this.particles, this.floatingText);
          this.sessionCoins += 1;
          storage.addCoins(1);
          storage.updateMission('coins_collected', 1);

          this.particles.spawnCurrencyAura(coin.x, coin.y, 'coin');

          this.particles.spawnFlyingCurrency(coin.x, coin.y, 'coin', () => {
            if (this.callbacks.onCurrencyPunch) this.callbacks.onCurrencyPunch('coin');
          });
          break;
        }
      }
    }

    // 2. Brains (Physical Touch Collision Required)
    for (const brain of this.level.brains) {
      if (!brain.alive) continue;
      brain.update(dt);

      for (const z of this.horde.zombies) {
        if (z.alive && this.checkAABB(z, brain)) {
          brain.collect(this.particles, this.floatingText);
          this.sessionBrains += 1;
          storage.addBrains(1);
          logger.info('高空跳跃物理触碰收集到粉色大脑');

          this.particles.spawnCurrencyAura(brain.x, brain.y, 'brain');

          this.particles.spawnFlyingCurrency(brain.x, brain.y, 'brain', () => {
            if (this.callbacks.onCurrencyPunch) this.callbacks.onCurrencyPunch('brain');
          });
          break;
        }
      }
    }

    // 3. Mystery Boxes (Physical Jump Bump required!)
    for (const box of this.level.mysteryBoxes) {
      if (!box.alive) continue;
      box.update(dt);

      for (const z of this.horde.zombies) {
        if (z.alive && this.checkAABB(z, box)) {
          box.collect(this.particles, this.floatingText);
          const durationLevel = storage.getUpgradeLevel('transformDuration');
          this.transformations.activateRandom(durationLevel, this.floatingText);
          storage.updateMission('transforms_used', 1);
          logger.info(`跳跃顶开宝箱, 触发超能变身: ${this.transformations.currentDef.name}`);
          break;
        }
      }
    }

    // 4. Civilians
    for (const civ of this.level.civilians) {
      if (!civ.alive || civ.isBitten) continue;

      if (isGold && Math.abs(leader.x - civ.x) < 90) {
        civ.alive = false;
        this.particles.spawnCoinSparkle(civ.x + 15, civ.y + 20);
        this.sessionCoins += 5;
        storage.addCoins(5);
        this.floatingText.spawn(civ.x + 15, civ.y - 15, '+5 金币', '#f1c40f', 20);
        logger.info('黄金狂潮将平民转化为金币');
        continue;
      }

      if ((isTsunami && civ.x < leader.x + 320) || (isMech && civ.x > leader.x && civ.x < leader.x + 900) || (isDragon && civ.x < leader.x + 280)) {
        civ.bite(this.particles, this.floatingText, this.horde);
        this.sessionBrains += 1;
        storage.addBrains(1);
        storage.updateMission('civilians_eaten', 1);

        this.feverCombo++;
        if (this.feverCombo >= 8) {
          this.feverTimer = 5.0;
          this.feverCombo = 0;
          audio.playFever();
          this.floatingText.spawn(leader.x + 40, leader.y - 40, '狂热暴走 FEVER!', '#f1c40f', 32, 1.5);
          this.renderer.camera.addTrauma(0.5);
        }
        continue;
      }

      for (const z of this.horde.zombies) {
        if (z.alive && this.checkAABB(z, civ)) {
          civ.bite(this.particles, this.floatingText, this.horde);
          this.sessionBrains += 1;
          storage.addBrains(1);
          storage.updateMission('civilians_eaten', 1);

          this.feverCombo++;
          if (this.feverCombo >= 8) {
            this.feverTimer = 5.0;
            this.feverCombo = 0;
            audio.playFever();
            this.floatingText.spawn(leader.x + 40, leader.y - 40, '狂热暴走 FEVER!', '#f1c40f', 32, 1.5);
            this.renderer.camera.addTrauma(0.5);
          }

          logger.info(`咬中并感染平民, 军团扩充至: ${this.horde.count + 1} 人`);
          break;
        }
      }
    }

    // 5. Vehicles Platforming & Crowd Stacking Heave-Flip
    for (const v of this.level.vehicles) {
      if (!v.alive) continue;
      v.update(dt, this.particles, this.level);

      if (v.isFlipped) continue;

      if ((isMech && v.x > leader.x && v.x < leader.x + 900) || (isDragon && v.x < leader.x + 280) || isFever) {
        v.flip(this.gameSpeed, this.particles, this.floatingText, this.renderer.camera, this.level);
        this.handleVehicleReward(v);
        this.activePushVehicle = null;
        this.horde.setPushing(false);
        continue;
      }

      if (isTsunami && v.x < leader.x + 320) {
        v.flip(this.gameSpeed, this.particles, this.floatingText, this.renderer.camera, this.level);
        this.handleVehicleReward(v);
        this.activePushVehicle = null;
        this.horde.setPushing(false);
        continue;
      }

      if (isGold && this.checkAABB(leader, v)) {
        v.flip(this.gameSpeed, this.particles, this.floatingText, this.renderer.camera, this.level);
        this.sessionCoins += v.config.coins * 2;
        storage.addCoins(v.config.coins * 2);
        this.sessionFlippedVehicles += 1;
        storage.updateMission('cars_flipped', 1);
        this.activePushVehicle = null;
        this.horde.setPushing(false);
        continue;
      }

      const hordeCount = this.horde.count;
      const canFlip = hordeCount >= v.required || isQuarterback;

      // Processing active crowd pushing / stacking state
      if (v.isPushing) {
        this.renderer.camera.addTrauma(0.08);

        // Hard physical block: lock zombies in front of vehicle during push struggle
        const blockX = v.x - 42;
        if (leader.x > blockX) {
          leader.x = blockX;
          leader.vx = 0;
        }

        if (v.pushTimer <= 0) {
          if (v.willSucceed) {
            // Collective heave-flip with full crowd roar!
            v.flip(this.gameSpeed, this.particles, this.floatingText, this.renderer.camera, this.level);
            this.handleVehicleReward(v);
            this.activePushVehicle = null;
            this.horde.setPushing(false);
            logger.vehicle(`全员堆叠合力掀翻 ${v.config.name}! 逃出乘客受到感染!`);
          } else {
            // Under-crewed crush in slow motion
            this.timeScale = 0.35;
            this.slowMoTimer = 0.8;
            this.horde.zombies.forEach(z => {
              z.alive = false;
              this.particles.spawnAngelGhost(z.x + z.width / 2, z.y);
            });
            this.activePushVehicle = null;
            audio.playExplosion();
            logger.collision(`推挤失败, 军团被 ${v.config.name} 碾压覆灭!`);
          }
        }
        continue;
      }

      for (const z of this.horde.zombies) {
        if (!z.alive) continue;

        const roofY = v.y;
        const zombieFeetY = z.y + z.height;
        const isHorizontallyOver = (z.x + z.width >= v.x - 10 && z.x <= v.x + v.width + 10);

        // 1. High Jump Clean Vaulting: If zombie is leaping comfortably above vehicle roof, let it fly cleanly over!
        if (isHorizontallyOver && zombieFeetY < roofY - 14) {
          continue;
        }

        // 2. Roof Platform Landing & Running: Land onto vehicle roof (Car, Bus, Tank, Airplane)
        if (isHorizontallyOver && zombieFeetY >= roofY - 14 && zombieFeetY <= roofY + 34 && z.vy >= -120) {
          z.standingOnPlatform = true;
          z.land(roofY - z.height, this.particles);
          continue;
        }

        // 3. Vehicle Body Collision & Front Bumper Push:
        if (this.checkAABB(z, v) || (z.x + z.width >= v.x && z.x <= v.x + 30 && zombieFeetY > roofY + 10)) {
          // Hard physical stop at front bumper
          z.x = Math.min(z.x, v.x - z.width);
          z.vx = 0;

          if (!v.isPushing) {
            v.startPushing(canFlip);
            this.activePushVehicle = v;
            this.horde.setPushing(true);
            if (canFlip) {
              logger.vehicle(`军团满编 ${this.horde.count}/${v.required} 人正在车头前堆积叠罗汉蓄力...`);
            } else {
              logger.vehicle(`军团仅有 ${this.horde.count}/${v.required} 人, 正在车前拼死推挤 ${v.config.name}...`);
            }
          }
          break;
        }
      }
    }

    // 6. Bombs
    for (const bomb of this.level.bombs) {
      if (!bomb.alive) continue;
      bomb.update(dt, this.particles);

      if ((isMech && bomb.x > leader.x && bomb.x < leader.x + 900) || (isTsunami && bomb.x < leader.x + 320)) {
        bomb.explode(this.particles, this.floatingText, this.renderer.camera);
        continue;
      }

      for (const z of this.horde.zombies) {
        if (z.alive && this.checkAABB(z, bomb)) {
          bomb.explode(this.particles, this.floatingText, this.renderer.camera);
          if (!isQuarterback && !isTsunami) {
            z.alive = false;
            this.particles.spawnAngelGhost(z.x + z.width / 2, z.y);
            logger.collision(`触碰地雷引爆! 损失僵尸, 剩余: ${this.horde.count} 人`);
          }
          break;
        }
      }
    }
  }

  handleVehicleReward(v) {
    this.sessionBrains += v.config.brains;
    this.sessionCoins += v.config.coins;
    this.sessionFlippedVehicles += 1;
    storage.addBrains(v.config.brains);
    storage.addCoins(v.config.coins);
    storage.updateMission('cars_flipped', 1);

    const bonusZombies = Math.min(3, Math.floor(v.config.brains / 4));
    for (let i = 0; i < bonusZombies; i++) {
      this.horde.addZombie(v.x + i * 20, 540 - 54);
    }
  }

  checkAABB(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  render() {
    this.renderer.clear();
    const cameraX = this.renderer.camera.renderX;
    const cameraY = this.renderer.camera.renderY;

    this.renderer.ctx.save();
    this.renderer.ctx.translate(0, cameraY);

    this.renderer.drawBackground(cameraX);
    this.level.draw(this.renderer.ctx, cameraX);

    // Dynamic environmental light cones
    this.renderer.drawStreetlightCones(cameraX);
    this.renderer.drawVehicleHeadlights(this.level.vehicles, cameraX);

    const isGold = this.transformations.activeType === 'GOLD';
    const isNinja = this.transformations.activeType === 'NINJA';
    const isQuarterback = this.transformations.activeType === 'QUARTERBACK';

    this.transformations.draw(this.renderer.ctx, cameraX, this.horde, 540);

    if (this.horde) {
      const hat = storage.data.equippedHat || 'none';
      this.horde.draw(this.renderer.ctx, cameraX, hat, isGold, isNinja, isQuarterback);
    }

    this.particles.draw(this.renderer.ctx, cameraX);
    this.floatingText.draw(this.renderer.ctx, cameraX);

    // Incoming Moving Traffic Warning Indicator
    this.renderer.drawIncomingTrafficWarnings(this.level.vehicles, cameraX);

    this.renderer.ctx.restore();

    // Screen space ambient transformation atmosphere
    this.renderer.drawAmbientTransformationAtmosphere(this.transformations.activeType);
  }

  gameOver() {
    if (!this.isRunning) return;
    this.isRunning = false;
    audio.stopBgm();
    audio.playGameOver();

    const isNewRecord = this.distance > storage.data.highScoreDistance;

    logger.info(`军团覆灭, 最终奔跑距离: ${Math.floor(this.distance)} m, 收集大脑: ${this.sessionBrains}, 金币: ${this.sessionCoins}`);

    storage.updateHighScore(this.distance);
    storage.updateMission('single_run_distance', Math.floor(this.distance), true);

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        distance: Math.floor(this.distance),
        brains: this.sessionBrains,
        coins: this.sessionCoins,
        vehicles: this.sessionFlippedVehicles,
        isNewRecord
      });
    }
  }
}

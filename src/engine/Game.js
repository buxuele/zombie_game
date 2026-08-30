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
import { CollisionManager } from '../systems/CollisionManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();
    this.transformations = new TransformationManager();
    this.level = new LevelGenerator(GAME_CONFIG.GROUND_Y);

    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    // Arcade floaty gravity & soaring jump impulse
    this.gravity = GAME_CONFIG.GRAVITY;
    this.jumpImpulse = GAME_CONFIG.JUMP_FORCE;

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

    // Dynamic adaptive background soundtrack switching based on active biome
    const activeRoadStyle = biomeManager.getRoadStyleAt(leader.x);
    audio.setBgmTheme(activeRoadStyle);

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

    // Process Game Entities & Physics Collisions via CollisionManager
    CollisionManager.handleCoins(this);
    CollisionManager.handleBrains(this);
    CollisionManager.handleMysteryBoxes(this, dt);
    CollisionManager.handleCivilians(this);
    CollisionManager.handleVehicles(this, dt);
    CollisionManager.handleBombs(this, dt);
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

    // Vehicle Headlights
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

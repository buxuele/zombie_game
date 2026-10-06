import { Zombie } from './Zombie.js';
import { audio } from '../engine/Audio.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class ZombieHorde {
  constructor(startX = 200, groundY = GAME_CONFIG.GROUND_Y, initialCount = 1) {
    this.groundY = groundY;
    this.zombies = [];
    this.maxZombies = 36;

    for (let i = 0; i < initialCount; i++) {
      const z = new Zombie(i, startX - i * 28, this.groundY - 54, i === 0);
      z.isSpawning = false;
      z.spawnScale = 1;
      this.zombies.push(z);
    }
  }

  get leader() {
    return this.zombies.find(z => z.alive) || null;
  }

  get count() {
    return this.zombies.filter(z => z.alive && !z.isFallingInPit).length;
  }

  get bounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const living = this.zombies.filter(z => z.alive && !z.isFallingInPit);
    if (living.length === 0) return { x: 0, y: 0, width: 0, height: 0, minX: 0, maxX: 0 };

    for (const z of living) {
      if (z.x < minX) minX = z.x;
      if (z.x + z.width > maxX) maxX = z.x + z.width;
      if (z.y < minY) minY = z.y;
      if (z.y + z.height > maxY) maxY = z.y + z.height;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      minX,
      maxX
    };
  }

  setPushing(isPushing) {
    this.zombies.forEach(z => {
      z.isPushing = isPushing;
      // 清除奔跑编队弹簧残余速度，避免切入推车队形时向外弹开
      z.vx = 0;
    });
  }

  addZombie(x, y, shirtColor = '#e74c3c', pantsColor = '#2980b9', accessory = 'none') {
    if (this.zombies.length >= this.maxZombies) return null;
    const leader = this.leader;
    const spawnX = leader ? Math.min(x || leader.x - 20, leader.x - 18) : 200;
    const spawnY = y || (this.groundY - 54);
    const newZombie = new Zombie(this.zombies.length, spawnX, spawnY, false, shirtColor, pantsColor, accessory);
    newZombie.targetScaleX = 1.3;
    newZombie.targetScaleY = 0.7;
    this.zombies.push(newZombie);
    return newZombie;
  }

  removeFrontZombie() {
    const leader = this.leader;
    if (leader) {
      leader.alive = false;
    }
  }

  jump(impulse) {
    const living = this.zombies.filter(z => z.alive && !z.isFallingInPit);
    if (living.length === 0) return;

    let jumpDispatched = false;

    living.forEach((z, index) => {
      z.cutJumpPending = false;
      if (index === 0) {
        jumpDispatched = z.jump(impulse);
      } else {
        const waveDelay = Math.min(
          index * GAME_CONFIG.JUMP_WAVE_STEP,
          GAME_CONFIG.JUMP_WAVE_MAX_DELAY
        );
        z.queueJump(waveDelay, impulse);
        jumpDispatched = true;
      }
    });

    if (jumpDispatched) {
      audio.playJump();
    }

    return jumpDispatched;
  }

  cutJump() {
    const living = this.zombies.filter(z => z.alive && !z.isFallingInPit);
    living.forEach((z) => {
      if (z.jumpQueued) {
        z.cutJumpPending = true;
      } else {
        z.cutJump(0.45);
      }
    });
  }

  arrangePushingFormation(living, leader, dt) {
    const visibleCount = Math.min(living.length, GAME_CONFIG.VEHICLE_PUSH_VISIBLE_COUNT);
    // 集结速度必须足够快，让玩家先看到抱紧，而不是先看到弹开再收拢
    const frontFollow = 1 - Math.exp(-34 * dt);
    const rearFollow = 1 - Math.exp(-20 * dt);

    living.forEach((z, index) => {
      if (index === 0) return;

      let targetX;
      let targetDepth;

      if (index < visibleCount) {
        // 两排肩并肩贴合车头，列距必须小于奔跑编队的 24px，才能呈现抱紧而非分散
        const rank = index - 1;
        const row = rank % 2;
        const col = Math.floor(rank / 2);
        targetX = leader.x - 22 - col * 20 + row * 4;
        targetDepth = (row === 0 ? -7 : 7) + Math.sin(leader.runTimer * 5 + index) * 1.2;
      } else {
        const rank = index - visibleCount;
        const row = rank % 2;
        const col = Math.floor(rank / 2);
        targetX = leader.x - 112 - col * 20 + row * 4;
        targetDepth = (row === 0 ? -7 : 7);
      }

      z.x += (targetX - z.x) * (index < visibleCount ? frontFollow : rearFollow);
      z.layerDepth = targetDepth;
      z.vx = 0;
    });
  }

  update(dt, gameSpeed, gravity, terrainManager, isHoldingJump, particleSystem, isLevitating = false) {
    const living = this.zombies.filter(z => z.alive);
    if (living.length === 0) return;

    const leader = this.leader;
    if (!leader) return;

    if (!leader.isPushing) {
      leader.x += gameSpeed * dt;
    } else {
      leader.x += (gameSpeed * 0.35) * dt;
      this.arrangePushingFormation(living, leader, dt);
    }

    if (isLevitating) {
      living.forEach(z => {
        z.grounded = false;
        z.y = Math.min(z.y, this.groundY - 140 + Math.sin(leader.runTimer * 3 + z.index) * 15);
        z.vy = 0;
      });
    }

    const totalCount = living.length;

    living.forEach((z, i) => {
      // All zombies run firmly grounded on the solid road surface
      const targetGroundY = this.groundY - 54;

      if (i > 0 && !z.isFallingInPit && !z.isPushing) {
        // Dynamic staggered 2-column wave formation with organic fluid spring breathing
        const col = Math.floor((i - 1) / 2);
        const row = (i - 1) % 2;

        // Fluid crowd breathing & bumping wave offset
        const swayX = Math.sin(leader.runTimer * 1.6 + i * 1.3) * 6;
        const swayY = (row === 0 ? -5 : 5) + Math.cos(leader.runTimer * 2.0 + i * 0.9) * 3;

        // Dynamic horizontal spacing: 24px per column
        const targetX = leader.x - 30 - (col * 24) + (row * 6) + swayX;

        const dx = targetX - z.x;
        const springK = 18;
        const damping = 0.82;
        z.vx = (z.vx + dx * springK * dt) * damping;
        z.x += (gameSpeed + z.vx) * dt;
        z.layerDepth = swayY;
      }

      const feetX = z.x + z.width / 2;
      const isOverSolidGround = terrainManager.isGroundAt(feetX);

      // Only check landing if zombie is falling downward (vy >= 0)
      if (!isLevitating) {
        // If zombie is above normal ground and not supported by a platform (like car roof), enable airborne falling
        if (z.y < targetGroundY && !z.standingOnPlatform) {
          z.grounded = false;
        }
        // Reset standingOnPlatform for this frame; collision loop in Game.js will re-assert if still on vehicle
        z.standingOnPlatform = false;

        if (!isOverSolidGround && z.y >= targetGroundY) {
          z.isFallingInPit = true;
          z.grounded = false;
        } else if (isOverSolidGround && z.y >= targetGroundY && !z.isFallingInPit && z.vy >= 0) {
          z.land(targetGroundY, particleSystem);
        }
      }

      z.update(dt, gameSpeed, gravity, targetGroundY, isHoldingJump, particleSystem);
    });

    this.zombies = this.zombies.filter(z => z.alive);
  }

  draw(ctx, cameraX, equippedHat = 'none', isGold = false, isNinja = false, isQuarterback = false) {
    // 1. Dynamic ground shadows pass (rendered directly on ground plane)
    for (const z of this.zombies) {
      z.drawGroundShadow(ctx, cameraX, this.groundY);
    }

    // 2. Y-sorted zombie bodies pass
    const sorted = [...this.zombies].sort((a, b) => (a.y + a.layerDepth) - (b.y + b.layerDepth));
    for (const z of sorted) {
      z.draw(ctx, cameraX, equippedHat, isGold, isNinja, isQuarterback);
    }
  }
}

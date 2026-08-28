import { Zombie } from './Zombie.js';
import { audio } from '../engine/Audio.js';

export class ZombieHorde {
  constructor(startX = 200, groundY = 540, initialCount = 1) {
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

    audio.playJump();

    living.forEach((z, index) => {
      if (index === 0) {
        z.jump(impulse);
      } else {
        z.queueJump(index * 0.02, impulse);
      }
    });
  }

  cutJump() {
    const living = this.zombies.filter(z => z.alive && !z.isFallingInPit);
    living.forEach((z, index) => {
      setTimeout(() => {
        if (z.alive) {
          z.cutJump(0.45);
        }
      }, index * 20);
    });
  }

  update(dt, gameSpeed, gravity, terrainManager, isHoldingJump, particleSystem, isLevitating = false) {
    const living = this.zombies.filter(z => z.alive);
    if (living.length === 0) return;

    const leader = this.leader;
    if (!leader) return;

    if (!leader.isPushing) {
      leader.x += gameSpeed * dt;
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

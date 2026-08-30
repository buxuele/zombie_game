import { audio } from '../engine/Audio.js';
import { assets } from '../engine/AssetLoader.js';

export class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.alive = true;
    this.animTimer = Math.random() * 10;
  }

  collect(particleSystem, floatingText) {
    if (!this.alive) return;
    this.alive = false;
    audio.playCoin();

    if (particleSystem) {
      particleSystem.spawnCoinSparkle(this.x + this.width / 2, this.y + this.height / 2);
    }
  }

  update(dt) {
    this.animTimer += dt * 6;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    const renderX = this.x - cameraX;
    const renderY = this.y;

    const scaleX = Math.abs(Math.cos(this.animTimer));

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);
    ctx.scale(Math.max(0.1, scaleX), 1);

    if (assets.isLoaded && assets.sprites.coin) {
      ctx.drawImage(assets.sprites.coin, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d68910';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(-2, -5, 4, 10);
    }

    ctx.restore();
  }
}

export class BrainCollectible {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 34;
    this.alive = true;
    this.bobTimer = Math.random() * 10;
  }

  collect(particleSystem, floatingText) {
    if (!this.alive) return;
    this.alive = false;
    audio.playBrain();

    if (particleSystem) {
      particleSystem.spawnInfectionBurst(this.x + this.width / 2, this.y + this.height / 2);
    }
    if (floatingText) {
      floatingText.spawn(this.x + this.width / 2, this.y - 15, '+1 大脑', '#ff4081', 20);
    }
  }

  update(dt) {
    this.bobTimer += dt * 5;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    const renderX = this.x - cameraX;
    const bob = Math.sin(this.bobTimer) * 5;
    const renderY = this.y + bob;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);

    ctx.shadowColor = '#ff4081';
    ctx.shadowBlur = 14;

    if (assets.isLoaded && assets.sprites.brain) {
      ctx.drawImage(assets.sprites.brain, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#ff4081';
      ctx.beginPath();
      ctx.ellipse(-6, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(6, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Bomb {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY - 36;
    this.width = 34;
    this.height = 36;
    this.groundY = groundY;
    this.alive = true;
    this.fuseTimer = 0;
  }

  explode(particleSystem, floatingText, camera) {
    if (!this.alive) return;
    this.alive = false;

    audio.playExplosion();

    if (particleSystem) {
      particleSystem.spawnBombExplosion(this.x + this.width / 2, this.y + this.height / 2);
    }
    if (camera) {
      camera.addTrauma(0.5);
    }
  }

  update(dt, particleSystem) {
    if (!this.alive) return;
    this.fuseTimer += dt;

    if (particleSystem && Math.random() > 0.3) {
      const fuseX = this.x + 24;
      const fuseY = this.y - 4;
      particleSystem.spawn(fuseX, fuseY, (Math.random() - 0.5) * 40, -Math.random() * 50 - 20, '#ffd700', 3, 1, 0.2, 50, 'spark');
    }
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    const renderX = this.x - cameraX;
    const renderY = this.y;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height);

    const isLateGameHard = this.x > 25000;

    // Bomb Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (assets.isLoaded && assets.sprites.bomb) {
      ctx.drawImage(assets.sprites.bomb, -this.width / 2, -this.height, this.width, this.height);
    } else {
      // High-contrast danger body (Bright Crimson Red in early/mid game for high visibility)
      const bodyColor = isLateGameHard ? '#2c3e50' : '#eb2f06';
      const stripeColor = isLateGameHard ? '#34495e' : '#f1c40f';
      const glowColor = isLateGameHard ? 'rgba(0,0,0,0)' : 'rgba(235, 47, 6, 0.35)';

      // Danger Halo Aura
      if (!isLateGameHard) {
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(0, -16, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bomb spherical body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -16, 15, 0, Math.PI * 2);
      ctx.fill();

      // Industrial hazard warning stripe across center
      ctx.fillStyle = stripeColor;
      ctx.fillRect(-12, -19, 24, 6);

      // Contrast border
      ctx.strokeStyle = isLateGameHard ? '#1e272e' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -16, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Bomb Cap
      ctx.fillStyle = '#2f3542';
      ctx.fillRect(-5, -34, 10, 5);

      // Flashing Fuse Spark
      const fuseFlash = Math.sin(this.fuseTimer * 12) > 0;
      ctx.fillStyle = fuseFlash ? '#ffa502' : '#ff4757';
      ctx.beginPath();
      ctx.arc(4, -38, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class MysteryBox {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY - 84;
    this.width = 42;
    this.height = 42;
    this.alive = true;
    this.bobTimer = Math.random() * 10;
  }

  collect(particleSystem, floatingText) {
    if (!this.alive) return;
    this.alive = false;
    audio.playTransform();

    if (particleSystem) {
      particleSystem.spawnInfectionBurst(this.x + this.width / 2, this.y + this.height / 2);
    }
  }

  update(dt) {
    this.bobTimer += dt * 4;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    const renderX = this.x - cameraX;
    const bob = Math.sin(this.bobTimer) * 6;
    const renderY = this.y + bob;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);

    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 16;

    if (assets.isLoaded && assets.sprites.mysteryBox) {
      ctx.drawImage(assets.sprites.mysteryBox, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.roundRect(-20, -20, 40, 40, 6);
      ctx.fill();

      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 24px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 2);
    }

    ctx.restore();
  }
}

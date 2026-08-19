import { audio } from '../engine/Audio.js';
import { assets } from '../engine/AssetLoader.js';
import { Civilian } from './Civilian.js';

export const VEHICLE_TYPES = {
  CAR: {
    type: 'CAR',
    name: '红色轿车',
    required: 4,
    width: 140,
    height: 60,
    color: '#e74c3c',
    roofColor: '#c0392b',
    brains: 4,
    coins: 20,
    survivors: 2
  },
  BUS: {
    type: 'BUS',
    name: '黄色校巴',
    required: 8,
    width: 220,
    height: 80,
    color: '#f1c40f',
    roofColor: '#d68910',
    brains: 8,
    coins: 40,
    survivors: 3
  },
  TANK: {
    type: 'TANK',
    name: '迷彩重型坦克',
    required: 12,
    width: 240,
    height: 85,
    color: '#27ae60',
    roofColor: '#1e8449',
    brains: 12,
    coins: 70,
    survivors: 3
  },
  AIRPLANE: {
    type: 'AIRPLANE',
    name: '客运飞机',
    required: 16,
    width: 300,
    height: 95,
    color: '#ecf0f1',
    roofColor: '#bdc3c7',
    brains: 16,
    coins: 100,
    survivors: 4
  }
};

export class Vehicle {
  constructor(x, groundY, vehicleTypeKey = 'CAR', isMoving = false) {
    this.config = VEHICLE_TYPES[vehicleTypeKey] || VEHICLE_TYPES.CAR;
    this.x = x;
    this.y = groundY - this.config.height;
    this.groundY = groundY;
    this.width = this.config.width;
    this.height = this.config.height;
    this.required = this.config.required;

    this.isFlipped = false;
    this.alive = true;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.vRot = 0;
    this.badgeBob = 0;

    // Moving dynamic traffic
    this.isMoving = isMoving;
    this.moveSpeed = isMoving ? 160 : 0;

    // Pushing struggle / stacking state
    this.isPushing = false;
    this.willSucceed = false;
    this.pushTimer = 0;
    this.coinShowerTimer = 0;

    // Suspension & chassis physics
    this.suspensionY = 0;
    this.chassisTilt = 0;
  }

  startPushing(willSucceed = false) {
    if (this.isPushing || this.isFlipped) return;
    this.isPushing = true;
    this.willSucceed = willSucceed;
    this.pushTimer = willSucceed ? 0.42 : 1.2;
    this.suspensionY = 6;
    this.chassisTilt = -0.08;
    audio.playPushMetal();
  }

  flip(gameSpeed, particleSystem, floatingText, camera, level = null) {
    if (this.isFlipped) return;
    this.isFlipped = true;
    this.isPushing = false;

    this.vx = gameSpeed * 1.5;
    this.vy = -580;
    this.vRot = 8.0;

    audio.playVehicleFlip();
    audio.playHordeRoar();

    if (particleSystem) {
      particleSystem.spawnVehicleExplosion(this.x + this.width / 2, this.y + this.height / 2);
      particleSystem.spawnVehicleDebris(this.x + this.width / 2, this.y + this.height / 2);
      particleSystem.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, '#f1c40f');
    }
    if (floatingText) {
      floatingText.spawn(this.x + this.width / 2, this.y - 30, `+${this.required} 齐心掀翻!`, '#f1c40f', 26);
    }
    if (camera) {
      camera.addTrauma(0.75);
    }

    // Spawn fleeing civilian passengers from the overturned vehicle!
    if (level && this.config.survivors > 0) {
      for (let i = 0; i < this.config.survivors; i++) {
        const survivorX = this.x + 60 + i * 36;
        level.civilians.push(new Civilian(survivorX, this.groundY));
      }
    }
  }

  update(dt, particleSystem, level) {
    this.badgeBob += dt * 5;

    if (this.isMoving && !this.isPushing && !this.isFlipped) {
      this.x -= this.moveSpeed * dt;
      if (particleSystem && Math.random() > 0.5) {
        particleSystem.spawn(this.x + this.width - 5, this.groundY - 12, 30, -10, '#bdc3c7', 4, 12, 0.25, 0, 'smoke');
      }
    }

    if (this.isPushing) {
      this.pushTimer -= dt;
      this.suspensionY = 4 + Math.sin(this.pushTimer * 36) * 3;
      this.chassisTilt = -0.06 + Math.sin(this.pushTimer * 28) * 0.02;

      if (particleSystem && Math.random() > 0.4) {
        particleSystem.spawn(this.x + 20, this.groundY - 4, -120 + Math.random() * 40, -40 - Math.random() * 40, '#f39c12', 2, 5, 0.18, 400, 'spark');
      }
    }

    if (this.isFlipped) {
      this.vy += 1200 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rotation += this.vRot * dt;

      this.coinShowerTimer += dt;
      if (particleSystem && this.coinShowerTimer > 0.08) {
        this.coinShowerTimer = 0;
        particleSystem.spawnCoinSparkle(this.x + Math.random() * this.width, this.y + Math.random() * this.height);
      }

      if (particleSystem && Math.random() > 0.4) {
        particleSystem.spawn(this.x + this.width / 2, this.y + this.height / 2, -50, -20, '#2b2d35', 10, 24, 0.4, -40, 'smoke');
      }

      if (this.y > 900) {
        this.alive = false;
      }
    }
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;

    const renderX = this.x - cameraX;
    const renderY = this.y;

    ctx.save();

    if (this.isPushing) {
      const shakeX = (Math.random() - 0.5) * 3;
      ctx.translate(renderX + this.width / 2 + shakeX, renderY + this.height + this.suspensionY);
      ctx.rotate(this.chassisTilt);
      ctx.translate(-this.width / 2, -this.height);
      this.drawVehicleBody(ctx, 0, 0);
      this.drawTopBadge(ctx);
    } else if (this.isFlipped) {
      ctx.translate(renderX + this.width / 2, renderY + this.height / 2);
      ctx.rotate(this.rotation);
      ctx.translate(-this.width / 2, -this.height / 2);
      this.drawVehicleBody(ctx, 0, 0);
    } else {
      ctx.translate(renderX, renderY);
      this.drawVehicleBody(ctx, 0, 0);
      this.drawTopBadge(ctx);
    }

    ctx.restore();
  }

  drawVehicleBody(ctx, ox, oy) {
    const c = this.config;
    const w = this.width;
    const h = this.height;

    if (!this.isFlipped) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(ox + w / 2, oy + h + 2, w * 0.48, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    let sprite = null;
    if (assets.isLoaded) {
      if (c.type === 'CAR') sprite = assets.sprites.car;
      else if (c.type === 'BUS') sprite = assets.sprites.bus;
      else if (c.type === 'TANK') sprite = assets.sprites.tank;
      else if (c.type === 'AIRPLANE') sprite = assets.sprites.plane;
    }

    if (sprite) {
      ctx.drawImage(sprite, ox, oy, w, h);
      return;
    }

    // Fallback vector drawing
    if (c.type === 'CAR') {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(ox, oy + 20, w, h - 20, 8);
      ctx.fill();

      ctx.fillStyle = c.roofColor;
      ctx.beginPath();
      ctx.moveTo(ox + 25, oy + 20);
      ctx.lineTo(ox + 45, oy);
      ctx.lineTo(ox + 95, oy);
      ctx.lineTo(ox + 115, oy + 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#85c1e9';
      ctx.fillRect(ox + 50, oy + 4, 40, 14);

      this.drawWheel(ctx, ox + 25, oy + h);
      this.drawWheel(ctx, ox + w - 25, oy + h);
    } else if (c.type === 'BUS') {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(ox, oy, w, h, 8);
      ctx.fill();

      ctx.fillStyle = '#15181e';
      ctx.fillRect(ox, oy + h - 25, w, 6);

      ctx.fillStyle = '#85c1e9';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(ox + 18 + i * 36, oy + 12, 26, 22);
      }

      this.drawWheel(ctx, ox + 40, oy + h);
      this.drawWheel(ctx, ox + w - 45, oy + h);
    } else if (c.type === 'TANK') {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(ox + 15, oy + 35, w - 30, h - 35, 6);
      ctx.fill();

      ctx.fillStyle = c.roofColor;
      ctx.beginPath();
      ctx.ellipse(ox + w * 0.45, oy + 28, 45, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(ox + w * 0.45, oy + 22, 100, 10);

      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.roundRect(ox, oy + h - 20, w, 20, 10);
      ctx.fill();
    } else if (c.type === 'AIRPLANE') {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.ellipse(ox + w / 2, oy + h * 0.55, w * 0.48, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.moveTo(ox + 10, oy + 25);
      ctx.lineTo(ox + 40, oy - 20);
      ctx.lineTo(ox + 70, oy + 25);
      ctx.closePath();
      ctx.fill();

      this.drawWheel(ctx, ox + w * 0.45, oy + h);
      this.drawWheel(ctx, ox + w * 0.75, oy + h);
    }
  }

  drawWheel(ctx, x, y) {
    ctx.fillStyle = '#1e222b';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTopBadge(ctx) {
    const badgeY = -24 + Math.sin(this.badgeBob) * 3;
    const badgeX = this.width / 2;

    ctx.save();
    ctx.translate(badgeX, badgeY);

    ctx.shadowColor = 'rgba(241, 196, 15, 0.8)';
    ctx.shadowBlur = 10;

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.roundRect(-22, -14, 44, 28, 8);
    ctx.fill();

    ctx.strokeStyle = '#d68910';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#15181e';
    ctx.font = `900 18px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.required}`, 0, 1);

    ctx.restore();
  }
}

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0;
    this.drag = 0.98;
    this.color = '#ffffff';
    this.size = 4;
    this.endSize = 0;
    this.alpha = 1;
    this.life = 1;
    this.maxLife = 1;
    this.type = 'circle'; // circle, square, smoke, spark, wind, shockwave
    this.rotation = 0;
    this.vRot = 0;
  }

  init(x, y, vx, vy, color, size, endSize, life, gravity = 0, type = 'circle') {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.endSize = endSize;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.alpha = 1;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.vy += this.gravity * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.vRot * dt;

    // Ground bounce physics for heavy debris (e.g. tires)
    if (this.type === 'tire' && this.y >= 540 - this.size && this.vy > 0) {
      this.y = 540 - this.size;
      this.vy = -this.vy * 0.62;
      this.vx *= 0.85;
      this.vRot *= 0.85;
    }

    const progress = 1 - (this.life / this.maxLife);
    this.alpha = Math.max(0, 1 - progress);
  }

  draw(ctx, cameraX) {
    if (!this.active) return;
    const renderX = this.x - cameraX;
    const progress = 1 - (this.life / this.maxLife);
    const currentSize = this.size + (this.endSize - this.size) * progress;
    if (currentSize <= 0.2) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.translate(renderX, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;
    if (this.type === 'circle' || this.type === 'smoke') {
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'square') {
      ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
    } else if (this.type === 'tire') {
      ctx.fillStyle = '#15181e';
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shrapnel') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(-currentSize, -currentSize * 0.6);
      ctx.lineTo(currentSize, -currentSize * 0.3);
      ctx.lineTo(currentSize * 0.4, currentSize * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'spark') {
      ctx.beginPath();
      ctx.moveTo(-currentSize * 1.5, 0);
      ctx.lineTo(currentSize * 1.5, 0);
      ctx.lineWidth = Math.max(1, currentSize * 0.6);
      ctx.strokeStyle = this.color;
      ctx.stroke();
    } else if (this.type === 'wind') {
      ctx.beginPath();
      ctx.moveTo(-currentSize * 2.5, 0);
      ctx.lineTo(currentSize * 2.5, 0);
      ctx.lineWidth = Math.max(1, currentSize * 0.4);
      ctx.strokeStyle = this.color;
      ctx.stroke();
    } else if (this.type === 'shockwave') {
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class FlyingCurrency {
  constructor(startX, startY, targetType = 'coin', onArrive = null) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.targetType = targetType; // 'coin' or 'brain'
    this.targetX = targetType === 'coin' ? 120 : 60; // Screen space coordinates
    this.targetY = 24;
    this.progress = 0;
    this.active = true;
    this.onArrive = onArrive;

    // Control point for Bezier arc
    this.controlX = startX - 80 + (Math.random() - 0.5) * 100;
    this.controlY = Math.min(startY - 120, 80);
    this.speed = 1.6;
  }

  update(dt, cameraX) {
    if (!this.active) return;
    this.progress += dt * this.speed;

    if (this.progress >= 1) {
      this.active = false;
      if (this.onArrive) this.onArrive(this.targetType);
      return;
    }

    const t = this.progress;
    const invT = 1 - t;

    // World to Screen Bezier interpolation
    const startScreenX = this.startX - cameraX;
    const startScreenY = this.startY;
    const ctrlScreenX = this.controlX - cameraX;

    this.screenX = (invT * invT * startScreenX) + (2 * invT * t * ctrlScreenX) + (t * t * this.targetX);
    this.screenY = (invT * invT * startScreenY) + (2 * invT * t * this.controlY) + (t * t * this.targetY);
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.screenX, this.screenY);

    if (this.targetType === 'coin') {
      ctx.shadowColor = '#f1c40f';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = '#ff4081';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff4081';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(maxParticles = 800) {
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle());
    }
    this.flyingCurrencies = [];
  }

  spawn(x, y, vx, vy, color, size, endSize, life, gravity = 0, type = 'circle') {
    const p = this.particles.find(p => !p.active);
    if (p) {
      p.init(x, y, vx, vy, color, size, endSize, life, gravity, type);
    }
  }

  spawnFlyingCurrency(x, y, type = 'coin', onArrive = null) {
    this.flyingCurrencies.push(new FlyingCurrency(x, y, type, onArrive));
  }

  spawnLandingDust(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.random() * Math.PI) + Math.PI;
      const speed = 50 + Math.random() * 90;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * (speed * 0.5);
      this.spawn(x + (Math.random() - 0.5) * 18, y, vx, vy, '#e0e6ed', 6, 14, 0.35 + Math.random() * 0.2, -40, 'smoke');
    }
  }

  spawnInfectionBurst(x, y) {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = Math.random() > 0.3 ? '#2ecc71' : '#a3e635';
      this.spawn(x, y, vx, vy, color, 6, 16, 0.45 + Math.random() * 0.3, 100, 'smoke');
    }
  }

  spawnVehicleDebris(x, y) {
    // 4 Bouncing rotating tires
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 180 + Math.random() * 160;
      const vx = Math.cos(angle) * speed;
      const vy = -Math.abs(Math.sin(angle) * speed) - 180;
      this.spawn(x + (Math.random() - 0.5) * 40, y, vx, vy, '#15181e', 12, 12, 2.2, 850, 'tire');
    }

    // 8 Shrapnel pieces
    const colors = ['#e74c3c', '#f1c40f', '#7f8c8d', '#bdc3c7'];
    for (let i = 0; i < 8; i++) {
      const vx = (Math.random() - 0.5) * 320;
      const vy = -120 - Math.random() * 260;
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(x, y, vx, vy, c, 10, 6, 1.8, 750, 'shrapnel');
    }
  }

  spawnVehicleExplosion(x, y) {
    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 280;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 60;
      const color = Math.random() > 0.4 ? '#f39c12' : '#e74c3c';
      this.spawn(x, y, vx, vy, color, 14, 30, 0.5 + Math.random() * 0.3, 80, 'smoke');
    }
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 100;
      this.spawn(x, y, vx, vy, '#2b2d35', 10, 36, 0.7 + Math.random() * 0.4, -60, 'smoke');
    }
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 340;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, '#ffd700', 4, 1, 0.4 + Math.random() * 0.2, 350, 'spark');
    }
  }

  spawnBombExplosion(x, y) {
    this.spawnVehicleExplosion(x, y);
  }

  spawnCoinSparkle(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, '#f1c40f', 5, 1, 0.35 + Math.random() * 0.2, 100, 'spark');
    }
  }

  spawnWaterSplash(x, y) {
    for (let i = 0; i < 14; i++) {
      const vx = (Math.random() - 0.2) * 180 + 70;
      const vy = -Math.random() * 220 - 60;
      const color = Math.random() > 0.5 ? '#3498db' : '#85c1e9';
      this.spawn(x, y, vx, vy, color, 8, 20, 0.45 + Math.random() * 0.3, 350, 'smoke');
    }
  }

  spawnWindTrail(x, y) {
    this.spawn(x, y, -260 - Math.random() * 80, (Math.random() - 0.5) * 15, 'rgba(255, 255, 255, 0.4)', 14, 2, 0.22, 0, 'wind');
  }

  spawnShockwave(x, y, color = '#f39c12') {
    this.spawn(x, y, 0, 0, color, 10, 180, 0.45, 0, 'shockwave');
  }

  spawnPushSparks(x, y) {
    for (let i = 0; i < 4; i++) {
      this.spawn(x, y, -Math.random() * 120 - 40, (Math.random() - 0.5) * 80, '#ffd700', 3, 1, 0.2, 200, 'spark');
    }
  }

  spawnLaserSparks(x, y) {
    for (let i = 0; i < 6; i++) {
      const vx = (Math.random() - 0.5) * 260;
      const vy = (Math.random() - 0.5) * 260;
      this.spawn(x, y, vx, vy, '#ff0055', 6, 1, 0.18, 0, 'spark');
    }
  }

  spawnWeatherAtmosphere(cameraX, sceneType = 'CITY') {
    if (Math.random() > 0.35) return;
    const spawnX = cameraX + 1000 + Math.random() * 200;
    const spawnY = Math.random() * 520;

    if (sceneType === 'CITY') {
      const neonColors = ['rgba(231, 76, 60, 0.6)', 'rgba(52, 152, 219, 0.6)', 'rgba(155, 89, 182, 0.6)'];
      const c = neonColors[Math.floor(Math.random() * neonColors.length)];
      this.spawn(spawnX, spawnY, -140 - Math.random() * 80, -20 + (Math.random() - 0.5) * 40, c, 2, 4, 3.0, 0, 'circle');
    } else if (sceneType === 'BEACH') {
      const seaColors = ['rgba(255, 255, 255, 0.5)', 'rgba(116, 185, 255, 0.5)'];
      const c = seaColors[Math.floor(Math.random() * seaColors.length)];
      this.spawn(spawnX, spawnY, -180 - Math.random() * 60, -10 + (Math.random() - 0.5) * 20, c, 2, 5, 2.5, 0, 'circle');
    } else if (sceneType === 'DESERT') {
      const sandColors = ['rgba(243, 156, 18, 0.6)', 'rgba(230, 126, 34, 0.5)'];
      const c = sandColors[Math.floor(Math.random() * sandColors.length)];
      this.spawn(spawnX, spawnY, -260 - Math.random() * 120, 10 + (Math.random() - 0.5) * 30, c, 3, 6, 2.0, 0, 'circle');
    }
  }

  spawnConfetti(width, height) {
    const colors = ['#f1c40f', '#2ecc71', '#ff4081', '#3498db', '#9b59b6', '#e74c3c'];
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.4;
      const vx = (Math.random() - 0.5) * 200;
      const vy = Math.random() * 160 + 40;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(x, y, vx, vy, color, 8, 8, 2.5 + Math.random() * 1.5, 60, 'square');
    }
  }

  update(dt, cameraX) {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.particles[i].update(dt);
      }
    }

    for (let i = this.flyingCurrencies.length - 1; i >= 0; i--) {
      this.flyingCurrencies[i].update(dt, cameraX);
      if (!this.flyingCurrencies[i].active) {
        this.flyingCurrencies.splice(i, 1);
      }
    }
  }

  draw(ctx, cameraX) {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.particles[i].draw(ctx, cameraX);
      }
    }

    // Flying currencies draw directly in screen space
    for (let i = 0; i < this.flyingCurrencies.length; i++) {
      this.flyingCurrencies[i].draw(ctx);
    }
  }

  clear() {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
    this.flyingCurrencies = [];
  }
}

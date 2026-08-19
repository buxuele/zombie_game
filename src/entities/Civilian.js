import { audio } from '../engine/Audio.js';
import { assets } from '../engine/AssetLoader.js';

export const CIVILIAN_PROFESSIONS = [
  { id: 'OFFICE', name: '上班族', shirt: '#2980b9', pants: '#2c3e50', hat: 'none' },
  { id: 'WORKER', name: '建筑工人', shirt: '#e67e22', pants: '#7f8c8d', hat: 'hardhat' },
  { id: 'TOURIST', name: '度假游客', shirt: '#e74c3c', pants: '#f39c12', hat: 'cap' },
  { id: 'REPORTER', name: '新闻记者', shirt: '#9b59b6', pants: '#34495e', hat: 'beret' }
];

export class Civilian {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY - 48;
    this.groundY = groundY;
    this.width = 34;
    this.height = 48;
    this.alive = true;
    this.isBitten = false;
    this.infectTimer = 0;
    this.hordeRef = null;

    const prof = CIVILIAN_PROFESSIONS[Math.floor(Math.random() * CIVILIAN_PROFESSIONS.length)];
    this.profession = prof.id;
    this.shirtColor = prof.shirt;
    this.pantsColor = prof.pants;
    this.hatType = prof.hat;

    this.animTimer = Math.random() * 10;
    this.panicSpeed = 30 + Math.random() * 40;
    this.panicBob = Math.random() * Math.PI;
  }

  bite(particleSystem, floatingText, horde) {
    if (this.isBitten) return;
    this.isBitten = true;
    this.infectTimer = 0.32;
    this.hordeRef = horde;

    audio.playBite();

    if (particleSystem) {
      particleSystem.spawnInfectionBurst(this.x + this.width / 2, this.y + this.height / 2);
    }
    if (floatingText) {
      floatingText.spawn(this.x + this.width / 2, this.y - 20, '+1 大脑', '#ff4081', 22);
    }
  }

  update(dt, particleSystem) {
    if (!this.alive) return;

    if (this.isBitten) {
      this.infectTimer -= dt;
      if (particleSystem && Math.random() > 0.4) {
        particleSystem.spawn(this.x + this.width / 2 + (Math.random() - 0.5) * 20, this.y + Math.random() * 40, (Math.random() - 0.5) * 40, -40, '#2ecc71', 4, 1, 0.2, 50, 'spark');
      }

      if (this.infectTimer <= 0) {
        this.alive = false;
        if (this.hordeRef) {
          this.hordeRef.addZombie(this.x, this.groundY - 48, this.shirtColor, this.pantsColor, this.hatType);
        }
      }
      return;
    }

    this.animTimer += dt * 9;
    this.x += this.panicSpeed * dt;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;

    const renderX = this.x - cameraX;
    const renderY = this.y;

    if (this.isBitten) {
      // Shuddering viral infection flash
      const shudderX = (Math.random() - 0.5) * 6;
      const shudderY = (Math.random() - 0.5) * 4;

      ctx.save();
      ctx.translate(renderX + this.width / 2 + shudderX, renderY + this.height + shudderY);

      // Viral green aura
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 20;

      this.drawChibiCivilian(ctx, true);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height);
    this.drawChibiCivilian(ctx, false);
    ctx.restore();
  }

  drawChibiCivilian(ctx, isInfected) {
    const skinColor = isInfected ? '#2ecc71' : '#f5cba7';
    const shirtColor = isInfected ? '#27ae60' : this.shirtColor;
    const pantsColor = this.pantsColor;

    // Running leg oscillation
    const legSwing = Math.sin(this.animTimer) * 7;
    const armSwing = Math.cos(this.animTimer) * 10;
    const headBob = Math.abs(Math.sin(this.animTimer * 1.5)) * 3;

    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-6, -14 + legSwing, 4, 14);
    ctx.fillRect(2, -14 - legSwing, 4, 14);

    // Torso Shirt
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(-8, -32, 16, 18, 4);
    ctx.fill();

    // Arms waving in panic
    ctx.fillStyle = skinColor;
    ctx.save();
    ctx.translate(-8, -28);
    ctx.rotate(-0.8 + armSwing * 0.05);
    ctx.fillRect(-3, 0, 4, 12);
    ctx.restore();

    ctx.save();
    ctx.translate(8, -28);
    ctx.rotate(0.8 - armSwing * 0.05);
    ctx.fillRect(-1, 0, 4, 12);
    ctx.restore();

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -38 - headBob, 10, 0, Math.PI * 2);
    ctx.fill();

    // Panic Hair
    ctx.fillStyle = '#6e2c00';
    ctx.beginPath();
    ctx.arc(0, -41 - headBob, 10, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Screaming Open Mouth
    ctx.fillStyle = '#922b21';
    ctx.beginPath();
    ctx.arc(3, -36 - headBob, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Wide Panicked Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -40 - headBob, 3, 0, Math.PI * 2);
    ctx.arc(4, -40 - headBob, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.arc(-2, -40 - headBob, 1.2, 0, Math.PI * 2);
    ctx.arc(4, -40 - headBob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Profession Hat
    if (this.hatType === 'hardhat') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, -44 - headBob, 11, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, -44 - headBob, 24, 3);
    } else if (this.hatType === 'cap') {
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.arc(0, -43 - headBob, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(0, -43 - headBob, 14, 3);
    } else if (this.hatType === 'beret') {
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.ellipse(0, -44 - headBob, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

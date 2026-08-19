import { audio } from '../engine/Audio.js';

export const TRANSFORMATION_TYPES = {
  TSUNAMI: {
    id: 'TSUNAMI',
    name: '海啸巨浪',
    color: '#3498db',
    duration: 10
  },
  GIANT_MECH: {
    id: 'GIANT_MECH',
    name: '巨型机甲',
    color: '#e74c3c',
    duration: 9
  },
  NINJA: {
    id: 'NINJA',
    name: '暗影武士',
    color: '#9b59b6',
    duration: 9
  },
  QUARTERBACK: {
    id: 'QUARTERBACK',
    name: '橄榄球僵尸',
    color: '#e67e22',
    duration: 8
  },
  UFO: {
    id: 'UFO',
    name: '外星飞碟',
    color: '#1abc9c',
    duration: 10
  },
  GOLD: {
    id: 'GOLD',
    name: '黄金狂潮',
    color: '#f1c40f',
    duration: 8
  },
  DRAGON: {
    id: 'DRAGON',
    name: '东方神龙',
    color: '#e74c3c',
    duration: 10
  },
  BALLOON: {
    id: 'BALLOON',
    name: '气球狂欢',
    color: '#ff4081',
    duration: 9
  }
};

export class TransformationManager {
  constructor() {
    this.activeType = null;
    this.timer = 0;
    this.maxDuration = 8;
    this.laserTimer = 0;
    this.ninjaSlashTimer = 0;
    this.wavePhase = 0;
    this.warningTickTimer = 0;
  }

  activateRandom(upgradeLevel = 1, floatingText) {
    const keys = Object.keys(TRANSFORMATION_TYPES);
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    const def = TRANSFORMATION_TYPES[selectedKey];

    this.activeType = def.id;
    this.maxDuration = def.duration + (upgradeLevel - 1) * 1.5;
    this.timer = this.maxDuration;
    this.laserTimer = 0;
    this.warningTickTimer = 0;

    audio.playTransform();

    if (floatingText) {
      floatingText.spawn(640, 200, `${def.name}!`, def.color, 32, 1.2);
    }
  }

  get isActive() {
    return this.activeType !== null && this.timer > 0;
  }

  get isExpiringSoon() {
    return this.isActive && this.timer <= 3.0;
  }

  get progress() {
    return this.isActive ? (this.timer / this.maxDuration) : 0;
  }

  get currentDef() {
    return this.activeType ? TRANSFORMATION_TYPES[this.activeType] : null;
  }

  update(dt, gameSpeed, horde, particleSystem, camera, groundY = 540) {
    if (!this.isActive) return;

    this.timer -= dt;
    this.wavePhase += dt * 8;

    // Warning heartbeat tick when < 3.0s
    if (this.timer <= 3.0) {
      this.warningTickTimer += dt;
      if (this.warningTickTimer >= 0.5) {
        this.warningTickTimer = 0;
        audio.playWarningTick();
      }
    }

    const leader = horde.leader;

    if (this.timer <= 0) {
      // Expiry shockwave burst to protect player
      if (leader && particleSystem) {
        particleSystem.spawnShockwave(leader.x + 20, leader.y + 20, '#3498db');
      }
      this.activeType = null;
      return;
    }

    if (!leader) return;

    if (this.activeType === 'TSUNAMI') {
      horde.zombies.forEach((z, idx) => {
        if (z.alive) {
          z.grounded = false;
          const surfY = groundY - 125 + Math.sin(this.wavePhase * 2 + idx * 0.5) * 12;
          z.y += (surfY - z.y) * Math.min(1, 10 * dt);
          z.vy = 0;
        }
      });
      if (particleSystem && Math.random() > 0.25) {
        particleSystem.spawnWaterSplash(leader.x + 90, groundY);
      }
    } else if (this.activeType === 'DRAGON') {
      horde.zombies.forEach((z, idx) => {
        if (z.alive) {
          z.grounded = false;
          const waveOffset = Math.sin(this.wavePhase * 2 - idx * 0.45) * 55;
          const dragonTargetY = groundY - 210 + waveOffset;
          z.y += (dragonTargetY - z.y) * Math.min(1, 10 * dt);
          z.vy = 0;
        }
      });
      if (particleSystem && Math.random() > 0.3) {
        particleSystem.spawn(leader.x + 120, leader.y + 10, 80 + Math.random() * 60, (Math.random() - 0.5) * 40, '#f1c40f', 6, 2, 0.25, 0, 'spark');
      }
    } else if (this.activeType === 'BALLOON') {
      horde.zombies.forEach((z, idx) => {
        if (z.alive) {
          z.grounded = false;
          const balloonTargetY = 110 + Math.sin(this.wavePhase * 1.5 + idx * 0.8) * 16;
          z.y += (balloonTargetY - z.y) * Math.min(1, 6 * dt);
          z.vy = 0;
        }
      });
    } else if (this.activeType === 'GIANT_MECH') {
      this.laserTimer += dt;
      if (this.laserTimer >= 0.12) {
        this.laserTimer = 0;
        audio.playLaser();
        if (camera) camera.addTrauma(0.2);
        if (particleSystem) {
          particleSystem.spawnLaserSparks(leader.x + 800, leader.y - 20);
        }
      }
    } else if (this.activeType === 'NINJA') {
      this.ninjaSlashTimer += dt;
    }
  }

  draw(ctx, cameraX, horde, groundY) {
    if (!this.isActive) return;

    const leader = horde.leader;
    if (!leader) return;

    const renderX = leader.x - cameraX;

    if (this.activeType === 'TSUNAMI') {
      this.drawTsunamiWave(ctx, renderX, groundY);
    } else if (this.activeType === 'DRAGON') {
      this.drawDragon(ctx, renderX, leader.y, horde, cameraX);
    } else if (this.activeType === 'BALLOON') {
      this.drawBalloons(ctx, horde, cameraX);
    } else if (this.activeType === 'GIANT_MECH') {
      this.drawGiantMech(ctx, renderX, leader.y, groundY);
    } else if (this.activeType === 'UFO') {
      this.drawUFO(ctx, renderX, leader.y);
    }
  }

  drawDragon(ctx, renderX, leaderY, horde, cameraX) {
    ctx.save();
    const living = horde.zombies.filter(z => z.alive);

    // 1. Dragon Serpentine Body Segments
    for (let i = living.length - 1; i >= 0; i--) {
      const z = living[i];
      const zx = z.x - cameraX + z.width / 2;
      const zy = z.y + z.height / 2;

      ctx.fillStyle = (i % 2 === 0) ? '#c0392b' : '#f39c12';
      ctx.beginPath();
      ctx.ellipse(zx, zy, 26, 20, Math.sin(this.wavePhase + i * 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Golden Scales
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(zx, zy - 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Dragon Glorious Head at Front
    const headX = renderX + 45;
    const headY = leaderY + 24;

    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(headX, headY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Horns
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(headX - 10, headY - 18);
    ctx.lineTo(headX - 25, headY - 45);
    ctx.lineTo(headX - 4, headY - 24);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(headX + 4, headY - 18);
    ctx.lineTo(headX + 18, headY - 45);
    ctx.lineTo(headX + 12, headY - 24);
    ctx.fill();

    // Glowing Eyes & Whiskers
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX + 10, headY - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(headX + 12, headY - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Whisker curls
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(headX + 18, headY + 6);
    ctx.quadraticCurveTo(headX + 45, headY + 16, headX + 35, headY + 32);
    ctx.stroke();

    ctx.restore();
  }

  drawBalloons(ctx, horde, cameraX) {
    ctx.save();
    const colors = ['#ff4081', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

    horde.zombies.forEach((z, i) => {
      if (!z.alive) return;
      const zx = z.x - cameraX + z.width / 2;
      const zy = z.y;
      const color = colors[i % colors.length];

      // Balloon string
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(zx, zy);
      ctx.lineTo(zx, zy - 28);
      ctx.stroke();

      // Helium Balloon Bulb
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(zx, zy - 46, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Balloon Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(zx - 6, zy - 52, 4, 8, -0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  drawTsunamiWave(ctx, renderX, groundY) {
    ctx.save();

    // 1. Deep Ocean Wave Body
    ctx.fillStyle = 'rgba(21, 67, 96, 0.88)';
    ctx.beginPath();
    ctx.moveTo(renderX - 240, groundY);

    const waveBack = -240;
    const waveFront = 180;
    const crestHeight = 210;

    for (let x = waveBack; x <= waveFront; x += 15) {
      const prog = (x - waveBack) / (waveFront - waveBack);
      const bob = Math.sin(this.wavePhase * 2 + x * 0.04) * 12;
      let wy;
      if (prog < 0.65) {
        wy = groundY - crestHeight * Math.sin(prog / 0.65 * (Math.PI * 0.5)) + bob;
      } else {
        const curlProg = (prog - 0.65) / 0.35;
        wy = groundY - crestHeight * (1 - curlProg * 0.6) + bob;
      }
      ctx.lineTo(renderX + x, wy);
    }

    ctx.lineTo(renderX + waveFront + 20, groundY);
    ctx.closePath();
    ctx.fill();

    // 2. Bright Cyan Surface Water Layer
    ctx.fillStyle = 'rgba(41, 128, 185, 0.85)';
    ctx.beginPath();
    ctx.moveTo(renderX - 220, groundY);

    for (let x = waveBack + 20; x <= waveFront - 10; x += 15) {
      const prog = (x - waveBack) / (waveFront - waveBack);
      const bob = Math.sin(this.wavePhase * 2 + x * 0.04 + 0.5) * 10;
      let wy;
      if (prog < 0.65) {
        wy = groundY - (crestHeight - 20) * Math.sin(prog / 0.65 * (Math.PI * 0.5)) + bob;
      } else {
        const curlProg = (prog - 0.65) / 0.35;
        wy = groundY - (crestHeight - 20) * (1 - curlProg * 0.5) + bob;
      }
      ctx.lineTo(renderX + x, wy);
    }

    ctx.lineTo(renderX + waveFront, groundY);
    ctx.closePath();
    ctx.fill();

    // 3. Frothing White Sea Crest & Crashing Surf Lip
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = waveBack + 40; x <= waveFront; x += 15) {
      const prog = (x - waveBack) / (waveFront - waveBack);
      const bob = Math.sin(this.wavePhase * 2 + x * 0.04) * 12;
      let wy;
      if (prog < 0.65) {
        wy = groundY - crestHeight * Math.sin(prog / 0.65 * (Math.PI * 0.5)) + bob;
      } else {
        const curlProg = (prog - 0.65) / 0.35;
        wy = groundY - crestHeight * (1 - curlProg * 0.6) + bob;
      }
      if (x === waveBack + 40) ctx.moveTo(renderX + x, wy);
      else ctx.lineTo(renderX + x, wy);
    }
    ctx.stroke();

    // 4. White Foam Spray Bubbles on Crest
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < 8; i++) {
      const fx = renderX + 40 + i * 16 + Math.sin(this.wavePhase + i) * 6;
      const fy = groundY - crestHeight + Math.cos(this.wavePhase * 2 + i) * 12 + (i > 4 ? (i - 4) * 14 : 0);
      ctx.beginPath();
      ctx.arc(fx, fy, 4 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawGiantMech(ctx, renderX, leaderY, groundY) {
    ctx.save();
    const mechX = renderX + 40;
    const mechY = groundY - 140;

    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.roundRect(mechX - 30, mechY - 50, 60, 90, 8);
    ctx.fill();

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(mechX - 20, mechY - 20, 40, 20);

    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(mechX + 18, mechY - 32, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 14 + Math.sin(this.wavePhase * 2) * 4;
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.9)';
    ctx.beginPath();
    ctx.moveTo(mechX + 24, mechY - 32);
    ctx.lineTo(mechX + 1100, mechY - 32);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(mechX + 24, mechY - 32);
    ctx.lineTo(mechX + 1100, mechY - 32);
    ctx.stroke();

    ctx.restore();
  }

  drawUFO(ctx, renderX, leaderY) {
    ctx.save();
    const ufoX = renderX + 40;
    const ufoY = leaderY - 100 + Math.sin(this.wavePhase) * 10;

    ctx.fillStyle = 'rgba(26, 188, 156, 0.25)';
    ctx.beginPath();
    ctx.moveTo(ufoX - 15, ufoY + 15);
    ctx.lineTo(ufoX - 90, ufoY + 220);
    ctx.lineTo(ufoX + 90, ufoY + 220);
    ctx.lineTo(ufoX + 15, ufoY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.ellipse(ufoX, ufoY, 50, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1abc9c';
    ctx.beginPath();
    ctx.arc(ufoX, ufoY - 4, 22, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }
}

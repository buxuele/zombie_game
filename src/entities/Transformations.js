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
          const surfY = groundY - 130 + Math.sin(this.wavePhase * 2.5 + idx * 0.5) * 14;
          z.y += (surfY - z.y) * Math.min(1, 12 * dt);
          z.vy = 0;
        }
      });
      if (particleSystem) {
        if (Math.random() > 0.2) {
          particleSystem.spawnWaterSplash(leader.x + 100, groundY);
        }
        if (Math.random() > 0.35) {
          particleSystem.spawnWaterFoam(leader.x + 120, groundY - 190);
        }
      }
    } else if (this.activeType === 'DRAGON') {
      horde.zombies.forEach((z, idx) => {
        if (z.alive) {
          z.grounded = false;
          const waveOffset = Math.sin(this.wavePhase * 2.2 - idx * 0.5) * 55;
          const dragonTargetY = groundY - 210 + waveOffset;
          z.y += (dragonTargetY - z.y) * Math.min(1, 10 * dt);
          z.vy = 0;
        }
      });
      if (particleSystem && Math.random() > 0.25) {
        particleSystem.spawnDragonSparkle(leader.x + 60 + Math.random() * 80, leader.y);
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
      if (particleSystem && Math.random() > 0.3) {
        particleSystem.spawnMechExhaust(leader.x - 20, groundY - 195);
      }
      if (this.laserTimer >= 0.12) {
        this.laserTimer = 0;
        audio.playLaser();
        if (camera) camera.addTrauma(0.2);
        if (particleSystem) {
          particleSystem.spawnLaserSparks(leader.x + 800, groundY - 165);
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

    // 1. Articulated Dragon Serpentine Body Segments
    for (let i = living.length - 1; i >= 0; i--) {
      const z = living[i];
      const zx = z.x - cameraX + z.width / 2;
      const zy = z.y + z.height / 2;
      const tilt = Math.sin(this.wavePhase * 2.2 - i * 0.5) * 0.35;

      ctx.save();
      ctx.translate(zx, zy);
      ctx.rotate(tilt);

      // Dorsal Fin
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.moveTo(-8, -20);
      ctx.lineTo(0, -32);
      ctx.lineTo(8, -20);
      ctx.closePath();
      ctx.fill();

      // Main Segment Body (Ruby Red with Gold Rim)
      ctx.fillStyle = (i % 2 === 0) ? '#c0392b' : '#e74c3c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Shimmering Dragon Scales
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, -8, 7, 0, Math.PI);
      ctx.fill();

      ctx.restore();
    }

    // 2. Dragon Glorious Head at Front
    const headX = renderX + 50;
    const headY = leaderY + 24;
    const jawOpen = Math.abs(Math.sin(this.wavePhase * 3)) * 8;

    ctx.save();
    ctx.translate(headX, headY);

    // Head Base
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dragon Crown Horns
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-26, -48);
    ctx.lineTo(-4, -24);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, -18);
    ctx.lineTo(20, -48);
    ctx.lineTo(12, -24);
    ctx.fill();

    // Snout and Jaws
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(8, -12, 28, 14, 4);
    ctx.fill();

    // Lower Jaw (Animated Chomping)
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.roundRect(8, 2 + jawOpen, 26, 10, 3);
    ctx.fill();

    // Sharp White Dragon Fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(18, 9);
    ctx.lineTo(22, 2);
    ctx.fill();

    // Glowing Ruby Eyes with Yellow Catchlight
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(6, -8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(8, -8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -10, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Long Flowing Golden Whiskers
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, -2);
    ctx.quadraticCurveTo(55, 6 + Math.sin(this.wavePhase * 3) * 10, 48, 28 + Math.cos(this.wavePhase * 3) * 12);
    ctx.stroke();

    ctx.restore();
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
    const stepBob = Math.sin(this.wavePhase * 3) * 6;

    // 1. Shoulder Dual Exhaust Smokestacks
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(mechX - 28, mechY - 65, 10, 20);
    ctx.fillRect(mechX + 18, mechY - 65, 10, 20);

    // Exhaust Pipe Metal Lips
    ctx.fillStyle = '#718093';
    ctx.fillRect(mechX - 30, mechY - 68, 14, 4);
    ctx.fillRect(mechX + 16, mechY - 68, 14, 4);

    // 2. Heavy Armored Torso Chassis
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.roundRect(mechX - 34, mechY - 50 + stepBob, 68, 90, 8);
    ctx.fill();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Chest Hazard Warning Stripes
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(mechX - 22, mechY - 15 + stepBob, 44, 18);
    ctx.fillStyle = '#15181e';
    for (let i = -20; i < 20; i += 10) {
      ctx.beginPath();
      ctx.moveTo(mechX + i, mechY - 15 + stepBob);
      ctx.lineTo(mechX + i + 6, mechY - 15 + stepBob);
      ctx.lineTo(mechX + i, mechY + 3 + stepBob);
      ctx.lineTo(mechX + i - 6, mechY + 3 + stepBob);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Pulsing Chest Laser Reactor Sphere
    const corePulse = 10 + Math.sin(this.wavePhase * 4) * 3;
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(mechX + 22, mechY - 32 + stepBob, corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Laser Reactor Core Inner Bright Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mechX + 22, mechY - 32 + stepBob, 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Laser Beam Blast with Core & Energy Ripples
    ctx.lineWidth = 18 + Math.sin(this.wavePhase * 3) * 6;
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.85)';
    ctx.beginPath();
    ctx.moveTo(mechX + 28, mechY - 32 + stepBob);
    ctx.lineTo(mechX + 1100, mechY - 32 + stepBob);
    ctx.stroke();

    // High-Voltage White Plasma Center Beam
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(mechX + 28, mechY - 32 + stepBob);
    ctx.lineTo(mechX + 1100, mechY - 32 + stepBob);
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

import { audio } from '../engine/Audio.js';
import { assets } from '../engine/AssetLoader.js';

export const TRANSFORMATION_TYPES = {
  TSUNAMI: {
    id: 'TSUNAMI',
    name: '海啸巨浪',
    color: '#3498db',
    duration: 10
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
    duration: 5
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
    } else if (this.activeType === 'UFO') {
      this.drawUFO(ctx, renderX, leader.y);
    }
  }

  drawDragon(ctx, renderX, leaderY, horde, cameraX) {
    ctx.save();
    const living = horde.zombies.filter(z => z.alive);
    if (living.length === 0) {
      ctx.restore();
      return;
    }

    // 1. Compute dragon spine nodes from living zombies
    const spine = living.map((z, idx) => ({
      x: z.x - cameraX + z.width / 2,
      y: z.y + z.height / 2,
      scale: Math.max(0.6, 1.0 - (idx / living.length) * 0.4)
    }));

    // Add extra tail extension
    if (spine.length > 0) {
      const tailBase = spine[spine.length - 1];
      const tailX = tailBase.x - 45;
      const tailY = tailBase.y + Math.sin(this.wavePhase * 2.5 - spine.length) * 20;
      spine.push({ x: tailX, y: tailY, scale: 0.4 });
    }

    // 2. Swirling Celestial Golden Dragon Aura
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.25)';
    ctx.lineWidth = 55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(spine[0].x + 30, spine[0].y);
    for (let i = 0; i < spine.length; i++) {
      ctx.lineTo(spine[i].x, spine[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Continuous Serpentine Main Dragon Body
    // Outer Crimson & Gold Trim
    ctx.save();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(spine[0].x + 20, spine[0].y);
    for (let i = 0; i < spine.length; i++) {
      ctx.lineTo(spine[i].x, spine[i].y);
    }
    ctx.stroke();

    // Inner Golden Scaled Core
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(spine[0].x + 20, spine[0].y);
    for (let i = 0; i < spine.length; i++) {
      ctx.lineTo(spine[i].x, spine[i].y);
    }
    ctx.stroke();

    // Dorsal Fiery Spines along the spine
    for (let i = 0; i < spine.length - 1; i++) {
      const p = spine[i];
      const nextP = spine[i + 1];
      const midX = (p.x + nextP.x) / 2;
      const midY = (p.y + nextP.y) / 2;
      const spineTilt = Math.sin(this.wavePhase * 2.8 - i * 0.7) * 0.4;

      ctx.save();
      ctx.translate(midX, midY - 18);
      ctx.rotate(spineTilt);
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(0, -18);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(0, -10);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. Sharp Imperial Dragon Talons / Claws
    const clawIndices = [Math.floor(spine.length * 0.25), Math.floor(spine.length * 0.75)];
    for (const cIdx of clawIndices) {
      if (cIdx < spine.length) {
        const node = spine[cIdx];
        const clawAnim = Math.sin(this.wavePhase * 3.0 + cIdx) * 8;
        ctx.save();
        ctx.translate(node.x, node.y + 14 + clawAnim);
        ctx.fillStyle = '#d35400';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        // 4 Talons
        ctx.fillStyle = '#ffffff';
        for (let a = -1.2; a <= 1.2; a += 0.8) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18 + 6);
          ctx.lineTo(Math.cos(a + 0.3) * 6, Math.sin(a + 0.3) * 6);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // 5. Majestic Dragon Head (Asset Sprite or Vector Fallback)
    const headNode = spine[0];
    const headX = headNode.x + 35;
    const headY = headNode.y - 12;

    if (assets.sprites.dragonHead) {
      ctx.save();
      const headSize = 135;
      const headBob = Math.sin(this.wavePhase * 2.5) * 6;
      ctx.translate(headX - 45, headY - 60 + headBob);
      ctx.drawImage(assets.sprites.dragonHead, 0, 0, headSize, headSize);
      ctx.restore();
    } else {
      // High-End Vector Dragon Head
      ctx.save();
      ctx.translate(headX, headY);
      const jawOpen = Math.abs(Math.sin(this.wavePhase * 3)) * 8;

      // Head Crown & Antlers
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-15, -15);
      ctx.lineTo(-35, -45);
      ctx.lineTo(-20, -25);
      ctx.lineTo(-10, -50);
      ctx.lineTo(0, -20);
      ctx.fill();

      // Dragon Skull Base
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.roundRect(-20, -25, 55, 38, 12);
      ctx.fill();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glowing Cyan Dragon Eyes
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.arc(8, -12, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, -14, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Snout & Upper Jaw
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.roundRect(10, -10, 36, 18, 5);
      ctx.fill();

      // Lower Jaw (Chomping)
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.roundRect(10, 8 + jawOpen, 32, 12, 4);
      ctx.fill();

      // Sharp White Fangs
      ctx.fillStyle = '#ffffff';
      for (let fx = 16; fx <= 36; fx += 10) {
        ctx.beginPath();
        ctx.moveTo(fx, 6);
        ctx.lineTo(fx + 4, 14);
        ctx.lineTo(fx + 8, 6);
        ctx.fill();
      }

      // Flowing Golden Whiskers
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.quadraticCurveTo(75, 10 + Math.sin(this.wavePhase * 3) * 14, 60, 40 + Math.cos(this.wavePhase * 3) * 15);
      ctx.stroke();

      ctx.restore();
    }

    // 6. Luminous Celestial Dragon Pearl (火龙珠)
    const pearlX = headX + 115;
    const pearlY = headY + Math.sin(this.wavePhase * 3.5) * 16;
    ctx.save();
    // Swirling Dragon Fire Aura
    ctx.fillStyle = 'rgba(243, 156, 18, 0.35)';
    ctx.beginPath();
    ctx.arc(pearlX, pearlY, 22, 0, Math.PI * 2);
    ctx.fill();
    // Pearl Sphere
    const pearlGrad = ctx.createRadialGradient(pearlX - 4, pearlY - 4, 2, pearlX, pearlY, 14);
    pearlGrad.addColorStop(0, '#ffffff');
    pearlGrad.addColorStop(0.4, '#f1c40f');
    pearlGrad.addColorStop(1, '#e67e22');
    ctx.fillStyle = pearlGrad;
    ctx.beginPath();
    ctx.arc(pearlX, pearlY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

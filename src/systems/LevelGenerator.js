import { Vehicle } from '../entities/Vehicle.js';
import { Civilian } from '../entities/Civilian.js';
import { Coin, BrainCollectible, Bomb, MysteryBox } from '../entities/Obstacle.js';

export class WarningBarrier {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY - 38;
    this.width = 28;
    this.height = 38;
  }

  draw(ctx, cameraX) {
    const rx = this.x - cameraX;
    ctx.save();
    ctx.translate(rx, this.y);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(4, 8, 20, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 14, 20, 6);
    ctx.fillRect(4, 26, 20, 6);

    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(2, 34, 24, 4);
    ctx.fillRect(6, 0, 4, 8);
    ctx.fillRect(18, 0, 4, 8);

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(14, 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Trampoline {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY - 16;
    this.groundY = groundY;
    this.width = 54;
    this.height = 16;
    this.springCompress = 0;
  }

  bounce() {
    this.springCompress = 8;
  }

  update(dt) {
    if (this.springCompress > 0) {
      this.springCompress = Math.max(0, this.springCompress - dt * 25);
    }
  }

  draw(ctx, cameraX) {
    const rx = this.x - cameraX;
    ctx.save();
    ctx.translate(rx, this.y + this.springCompress);

    // Diagonal Spring Legs
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(4, 16 - this.springCompress);
    ctx.lineTo(10, 2);
    ctx.lineTo(this.width - 10, 2);
    ctx.lineTo(this.width - 4, 16 - this.springCompress);
    ctx.stroke();

    // Red Elastic Bed
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(4, 0, this.width - 8, 5, 2);
    ctx.fill();

    // Golden Tension Stripe
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(12, 1.5, this.width - 24, 2);

    ctx.restore();
  }
}

export class LevelGenerator {
  constructor(groundY = 540) {
    this.groundY = groundY;
    this.platforms = [];
    this.vehicles = [];
    this.civilians = [];
    this.coins = [];
    this.brains = [];
    this.bombs = [];
    this.mysteryBoxes = [];
    this.puddles = [];
    this.manholes = [];
    this.barriers = [];
    this.trampolines = [];

    this.generatedDistance = 0;
    this.init();
  }

  init() {
    this.platforms = [
      { startX: -500, endX: 3200 }
    ];
    this.vehicles = [];
    this.civilians = [];
    this.coins = [];
    this.brains = [];
    this.bombs = [];
    this.mysteryBoxes = [];
    this.barriers = [];
    this.trampolines = [];
    this.puddles = [
      { x: 900, width: 80 },
      { x: 2200, width: 110 }
    ];
    this.manholes = [
      { x: 600 },
      { x: 1500 }
    ];
    this.generatedDistance = 3200;

    // Warmup runway
    this.civilians.push(new Civilian(500, this.groundY));
    this.civilians.push(new Civilian(550, this.groundY));

    // Comfortable reachable jump arc of coins
    for (let i = 0; i < 6; i++) {
      const arc = Math.sin((i / 5) * Math.PI) * 45;
      this.coins.push(new Coin(700 + i * 36, this.groundY - 45 - arc));
    }

    this.civilians.push(new Civilian(1050, this.groundY));
    this.civilians.push(new Civilian(1100, this.groundY));
    
    this.mysteryBoxes.push(new MysteryBox(1300, this.groundY - 80));
    this.vehicles.push(new Vehicle(1650, this.groundY, 'CAR'));

    this.trampolines.push(new Trampoline(1850, this.groundY));
    this.brains.push(new BrainCollectible(1950, this.groundY - 140));

    for (let i = 0; i < 8; i++) {
      const arc = Math.sin((i / 7) * Math.PI) * 45;
      this.coins.push(new Coin(2100 + i * 32, this.groundY - 45 - arc));
    }

    this.civilians.push(new Civilian(2450, this.groundY));
    this.vehicles.push(new Vehicle(2700, this.groundY, 'BUS'));
  }

  isGroundAt(worldX) {
    for (const plat of this.platforms) {
      if (worldX >= plat.startX && worldX <= plat.endX) {
        return true;
      }
    }
    return false;
  }

  update(leaderX, dt, particleSystem) {
    if (leaderX + 2400 > this.generatedDistance) {
      this.generateChunk(this.generatedDistance);
    }

    this.cleanup(leaderX - 1200);

    for (const civ of this.civilians) {
      civ.update(dt, particleSystem);
    }

    for (const tr of this.trampolines) {
      tr.update(dt);
    }
  }

  generateChunk(currentPlatformEnd) {
    const chunkLength = 1600 + Math.random() * 800;
    const hasPit = Math.random() > 0.45;
    let actualStart = currentPlatformEnd;

    if (hasPit) {
      const currentPlatformStart = currentPlatformEnd;
      // Controlled safe pit width
      const pitWidth = 80 + Math.floor(Math.random() * 18);
      
      this.barriers.push(new WarningBarrier(currentPlatformStart - 140, this.groundY));

      actualStart += pitWidth;
      
      const numCoins = 4;
      for (let i = 0; i < numCoins; i++) {
        const coinX = currentPlatformStart + (pitWidth / (numCoins + 1)) * (i + 1);
        const arcProgress = (i + 1) / (numCoins + 1);
        const coinY = this.groundY - 60 - Math.sin(arcProgress * Math.PI) * 45;
        this.coins.push(new Coin(coinX, coinY));
      }
    }

    const actualEnd = actualStart + chunkLength;
    this.platforms.push({ startX: actualStart, endX: actualEnd });
    this.generatedDistance = actualEnd;

    // Puddles and manholes
    if (Math.random() > 0.4) {
      this.puddles.push({ x: actualStart + 300 + Math.random() * 400, width: 70 + Math.random() * 60 });
    }
    if (Math.random() > 0.5) {
      this.manholes.push({ x: actualStart + 600 + Math.random() * 400 });
    }

    let cursorX = actualStart + 200;

    while (cursorX < actualEnd - 280) {
      const roll = Math.random();

      if (roll < 0.30) {
        const groupSize = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < groupSize; i++) {
          this.civilians.push(new Civilian(cursorX + i * 42, this.groundY));
        }
        cursorX += groupSize * 42 + 180;
      } else if (roll < 0.52) {
        const vehicleRoll = Math.random();
        let vType = 'CAR';
        let isMoving = (cursorX > 4500 && Math.random() > 0.6);

        if (cursorX > 8000 && vehicleRoll > 0.8) vType = 'AIRPLANE';
        else if (cursorX > 5500 && vehicleRoll > 0.55) vType = 'TANK';
        else if (cursorX > 3200 && vehicleRoll > 0.35) vType = 'BUS';

        this.vehicles.push(new Vehicle(cursorX, this.groundY, vType, isMoving));
        cursorX += 420;
      } else if (roll < 0.65) {
        // Trampoline launching pad
        this.trampolines.push(new Trampoline(cursorX, this.groundY));
        for (let i = 0; i < 5; i++) {
          const coinX = cursorX + 30 + i * 28;
          const coinY = this.groundY - 140 - Math.sin((i / 4) * Math.PI) * 50;
          this.coins.push(new Coin(coinX, coinY));
        }
        cursorX += 260;
      } else if (roll < 0.80) {
        // Reachable smooth coin waves
        const count = 6 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
          const coinX = cursorX + i * 36;
          const arc = Math.sin((i / (count - 1)) * Math.PI) * 45;
          this.coins.push(new Coin(coinX, this.groundY - 45 - arc));
        }
        cursorX += count * 36 + 140;
      } else if (roll < 0.88) {
        this.mysteryBoxes.push(new MysteryBox(cursorX, this.groundY - 80));
        cursorX += 300;
      } else if (roll < 0.94 && cursorX > 3500) {
        this.bombs.push(new Bomb(cursorX, this.groundY));
        cursorX += 320;
      } else {
        this.brains.push(new BrainCollectible(cursorX, this.groundY - 75));
        cursorX += 240;
      }
    }
  }

  cleanup(minX) {
    this.platforms = this.platforms.filter(p => p.endX >= minX);
    this.vehicles = this.vehicles.filter(v => v.x + v.width >= minX && v.alive);
    this.civilians = this.civilians.filter(c => c.x + c.width >= minX && c.alive);
    this.coins = this.coins.filter(c => c.x + c.width >= minX && !c.collected);
    this.brains = this.brains.filter(b => b.x + b.width >= minX && !b.collected);
    this.bombs = this.bombs.filter(b => b.x + b.width >= minX && b.alive);
    this.mysteryBoxes = this.mysteryBoxes.filter(m => m.x + m.width >= minX && !m.collected);
    this.puddles = this.puddles.filter(p => p.x + p.width >= minX);
    this.manholes = this.manholes.filter(m => m.x >= minX);
    this.barriers = this.barriers.filter(b => b.x + b.width >= minX);
    this.trampolines = this.trampolines.filter(t => t.x + t.width >= minX);
  }

  draw(ctx, cameraX) {
    for (const plat of this.platforms) {
      const renderX = plat.startX - cameraX;
      const width = plat.endX - plat.startX;
      const midX = (plat.startX + plat.endX) / 2;

      if (midX < 7000) {
        // Modern City Highway Asphalt (Seamless Dark Slate with top curb highlight)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#1c202a');
        roadGrad.addColorStop(0.12, '#151821');
        roadGrad.addColorStop(1, '#0e1017');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // 3px Curb Edge Top Highlight
        ctx.fillStyle = '#475569';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(renderX, this.groundY + 3, width, 1);

        // Glowing Center Yellow Dashes
        ctx.fillStyle = '#f1c40f';
        const dashWidth = 44;
        const dashGap = 44;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 4.5);
          }
        }
      } else if (midX < 9500) {
        // Tunnel Dark Concrete
        ctx.fillStyle = '#15181e';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(renderX, this.groundY, width, 4);
      } else if (midX < 16500) {
        // Beach Wooden Boardwalk & Golden Sand
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#a04000';
        ctx.fillRect(renderX, this.groundY, width, 8);

        ctx.fillStyle = '#784212';
        for (let dx = plat.startX; dx < plat.endX; dx += 24) {
          ctx.fillRect(dx - cameraX, this.groundY, 2, 180);
        }
      } else if (midX < 19000) {
        // Suspension Sea Bridge Steel Deck
        ctx.fillStyle = '#34495e';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(renderX, this.groundY, width, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(renderX, this.groundY + 45, width, 3);
      } else {
        // Golden Desert Sandstone Road
        ctx.fillStyle = '#c68a4c';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#e59866';
        ctx.fillRect(renderX, this.groundY, width, 6);
      }
    }

    // Draw Manholes
    for (const m of this.manholes) {
      const rx = m.x - cameraX;
      ctx.fillStyle = '#15181e';
      ctx.beginPath();
      ctx.ellipse(rx, this.groundY + 20, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a4253';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw Puddles
    for (const p of this.puddles) {
      const rx = p.x - cameraX;
      ctx.fillStyle = 'rgba(52, 152, 219, 0.35)';
      ctx.beginPath();
      ctx.ellipse(rx + p.width / 2, this.groundY + 3, p.width / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Warning Barriers
    for (const b of this.barriers) {
      b.draw(ctx, cameraX);
    }

    // Draw Trampolines
    for (const tr of this.trampolines) {
      tr.draw(ctx, cameraX);
    }

    for (const c of this.coins) c.draw(ctx, cameraX);
    for (const b of this.brains) b.draw(ctx, cameraX);
    for (const m of this.mysteryBoxes) m.draw(ctx, cameraX);
    for (const bomb of this.bombs) bomb.draw(ctx, cameraX);
    for (const civ of this.civilians) civ.draw(ctx, cameraX);
    for (const v of this.vehicles) v.draw(ctx, cameraX);
  }
}

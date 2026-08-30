import { Vehicle } from '../entities/Vehicle.js';
import { Civilian } from '../entities/Civilian.js';
import { Coin, Bomb, MysteryBox } from '../entities/Obstacle.js';
import { biomeManager } from './BiomeManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

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

export class LevelGenerator {
  constructor(groundY = GAME_CONFIG.GROUND_Y) {
    this.groundY = groundY;
    this.platforms = [];
    this.vehicles = [];
    this.civilians = [];
    this.coins = [];
    this.bombs = [];
    this.mysteryBoxes = [];
    this.puddles = [];
    this.manholes = [];
    this.barriers = [];

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
    this.bombs = [];
    this.mysteryBoxes = [];
    this.barriers = [];
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
    this.civilians.push(new Civilian(480, this.groundY));
    this.civilians.push(new Civilian(530, this.groundY));

    // Comfortable reachable jump arc of coins
    for (let i = 0; i < 6; i++) {
      const arc = Math.sin((i / 5) * Math.PI) * 45;
      this.coins.push(new Coin(680 + i * 36, this.groundY - 45 - arc));
    }

    this.civilians.push(new Civilian(960, this.groundY));
    this.civilians.push(new Civilian(1010, this.groundY));
    
    // First Car encounter: friendly 4-zombie push opportunity
    this.vehicles.push(new Vehicle(1180, this.groundY, 'CAR'));

    this.mysteryBoxes.push(new MysteryBox(1440, this.groundY - 80));

    this.civilians.push(new Civilian(1620, this.groundY));
    this.vehicles.push(new Vehicle(1820, this.groundY, 'CAR'));

    this.coins.push(new Coin(2060, this.groundY - 60));
    this.coins.push(new Coin(2096, this.groundY - 60));

    for (let i = 0; i < 8; i++) {
      const arc = Math.sin((i / 7) * Math.PI) * 45;
      this.coins.push(new Coin(2240 + i * 32, this.groundY - 45 - arc));
    }

    this.civilians.push(new Civilian(2600, this.groundY));
    this.civilians.push(new Civilian(2650, this.groundY));
    this.vehicles.push(new Vehicle(2850, this.groundY, 'BUS'));
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
      civ.update(dt, particleSystem, this);
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

      if (roll < 0.28) {
        const groupSize = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < groupSize; i++) {
          const civX = cursorX + i * 42;
          if (this.isGroundAt(civX)) {
            this.civilians.push(new Civilian(civX, this.groundY));
          }
        }
        cursorX += groupSize * 42 + 180;
      } else if (roll < 0.62) {
        // Vehicles: All parked solidly on the road waiting to be pushed/flipped
        const vehicleRoll = Math.random();
        let vType = 'CAR';

        if (cursorX > 8000 && vehicleRoll > 0.8) vType = 'AIRPLANE';
        else if (cursorX > 5500 && vehicleRoll > 0.55) vType = 'TANK';
        else if (cursorX > 3200 && vehicleRoll > 0.40) vType = 'BUS';
        else vType = 'CAR';

        this.vehicles.push(new Vehicle(cursorX, this.groundY, vType, false));

        // Occasionally spawn an extra car shortly after in early-to-mid zones for combo flips
        if (cursorX < 7000 && Math.random() > 0.65) {
          this.vehicles.push(new Vehicle(cursorX + 240, this.groundY, 'CAR', false));
          cursorX += 240;
        }

        cursorX += 380;
      } else if (roll < 0.78) {
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
        // Crisp coin trail
        const count = 5;
        for (let i = 0; i < count; i++) {
          this.coins.push(new Coin(cursorX + i * 36, this.groundY - 45));
        }
        cursorX += count * 36 + 140;
      }
    }
  }

  cleanup(minX) {
    this.platforms = this.platforms.filter(p => p.endX >= minX);
    this.vehicles = this.vehicles.filter(v => v.x + v.width >= minX && v.alive);
    this.civilians = this.civilians.filter(c => c.x + c.width >= minX && c.alive);
    this.coins = this.coins.filter(c => c.x + c.width >= minX && !c.collected);
    this.bombs = this.bombs.filter(b => b.x + b.width >= minX && b.alive);
    this.mysteryBoxes = this.mysteryBoxes.filter(m => m.x + m.width >= minX && !m.collected);
    this.puddles = this.puddles.filter(p => p.x + p.width >= minX);
    this.manholes = this.manholes.filter(m => m.x >= minX);
    this.barriers = this.barriers.filter(b => b.x + b.width >= minX);
  }

  draw(ctx, cameraX) {
    // 1. Draw High-Contrast Deep Abyss Chasms (Pits between platforms)
    this.drawPitsAndChasms(ctx, cameraX);

    for (const plat of this.platforms) {
      const renderX = plat.startX - cameraX;
      const width = plat.endX - plat.startX;
      const midX = (plat.startX + plat.endX) / 2;

      const roadStyle = biomeManager.getRoadStyleAt(midX);

      if (roadStyle === 'CITY' || roadStyle === 'CYBER') {
        // Modern City / Cyber Highway Asphalt
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, roadStyle === 'CYBER' ? '#0f1423' : '#1c202a');
        roadGrad.addColorStop(0.12, roadStyle === 'CYBER' ? '#0a0d18' : '#151821');
        roadGrad.addColorStop(1, '#080a10');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // 3px Curb Edge Top Highlight
        ctx.fillStyle = roadStyle === 'CYBER' ? '#00d2d3' : '#475569';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = roadStyle === 'CYBER' ? '#54a0ff' : '#64748b';
        ctx.fillRect(renderX, this.groundY + 3, width, 1);

        // Glowing Center Dashes
        ctx.fillStyle = roadStyle === 'CYBER' ? '#f368e0' : '#f1c40f';
        const dashWidth = 44;
        const dashGap = 44;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 4.5);
          }
        }
      } else if (roadStyle === 'TUNNEL') {
        // Tunnel Dark Concrete
        ctx.fillStyle = '#15181e';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(renderX, this.groundY, width, 4);
      } else if (roadStyle === 'BEACH') {
        // Beach Wooden Boardwalk & Golden Sand
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#a04000';
        ctx.fillRect(renderX, this.groundY, width, 8);

        ctx.fillStyle = '#784212';
        for (let dx = plat.startX; dx < plat.endX; dx += 24) {
          ctx.fillRect(dx - cameraX, this.groundY, 2, 180);
        }
      } else if (roadStyle === 'BRIDGE') {
        // Suspension Sea Bridge Steel Deck
        ctx.fillStyle = '#34495e';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(renderX, this.groundY, width, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(renderX, this.groundY + 45, width, 3);
      } else if (roadStyle === 'SCI_FI') {
        // Sci-Fi Tech Road
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#102a43');
        roadGrad.addColorStop(0.2, '#0b1d30');
        roadGrad.addColorStop(1, '#050c14');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        ctx.fillStyle = '#10ac84';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = '#1dd1a1';
        ctx.fillRect(renderX, this.groundY + 48, width, 2);
      } else if (roadStyle === 'FOREST') {
        // Deep Forest Mossy Asphalt
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#1e272e');
        roadGrad.addColorStop(0.2, '#151d23');
        roadGrad.addColorStop(1, '#0d1317');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        ctx.fillStyle = '#2ed573';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = '#f1c40f';
        const dashWidth = 40;
        const dashGap = 40;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 4);
          }
        }
      } else {
        // Golden Desert / Sunset Sandstone Road
        ctx.fillStyle = '#c68a4c';
        ctx.fillRect(renderX, this.groundY, width, 180);
        ctx.fillStyle = '#e59866';
        ctx.fillRect(renderX, this.groundY, width, 6);
      }

      // Draw Industrial Warning Hazard Stripes on Cliff Edges
      this.drawHazardStripes(ctx, plat, cameraX);
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

    for (const c of this.coins) c.draw(ctx, cameraX);
    for (const m of this.mysteryBoxes) m.draw(ctx, cameraX);
    for (const bomb of this.bombs) bomb.draw(ctx, cameraX);
    for (const civ of this.civilians) civ.draw(ctx, cameraX);
    for (const v of this.vehicles) v.draw(ctx, cameraX);
  }

  drawPitsAndChasms(ctx, cameraX) {
    for (let i = 0; i < this.platforms.length - 1; i++) {
      const p1 = this.platforms[i];
      const p2 = this.platforms[i + 1];
      const gapStart = p1.endX;
      const gapEnd = p2.startX;
      if (gapEnd <= gapStart) continue;

      const rStart = gapStart - cameraX;
      const rEnd = gapEnd - cameraX;
      const gapWidth = gapEnd - gapStart;

      // 1. Abyss Deep Void (Pitch-black deep chasm with glowing bottom danger hue)
      const chasmGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
      chasmGrad.addColorStop(0, '#000000');
      chasmGrad.addColorStop(0.3, '#080509');
      chasmGrad.addColorStop(1, '#800000');
      ctx.fillStyle = chasmGrad;
      ctx.fillRect(rStart, this.groundY, gapWidth, 180);

      // 2. Chasm Cliff Walls (Left and Right Vertical Structural Rockfaces)
      ctx.fillStyle = '#08080c';
      ctx.fillRect(rStart, this.groundY, 14, 180);
      ctx.fillRect(rEnd - 14, this.groundY, 14, 180);

      // 3. Danger warning laser glow at bottom of pit
      ctx.fillStyle = 'rgba(235, 47, 6, 0.35)';
      ctx.fillRect(rStart, this.groundY + 130, gapWidth, 50);

      ctx.strokeStyle = 'rgba(255, 71, 87, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rStart, this.groundY + 155);
      ctx.lineTo(rEnd, this.groundY + 155);
      ctx.stroke();
    }
  }

  drawHazardStripes(ctx, plat, cameraX) {
    const isLateGameHard = plat.startX > 25000;
    const stripeWidth = 42;
    const stripeHeight = 12;

    const yellowColor = isLateGameHard ? '#333333' : '#f1c40f';
    const blackColor = isLateGameHard ? '#151821' : '#111111';

    // Left cliff edge (end of platform)
    const rxLeft = plat.endX - stripeWidth - cameraX;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rxLeft, this.groundY, stripeWidth, stripeHeight);
    ctx.clip();

    ctx.fillStyle = yellowColor;
    ctx.fillRect(rxLeft, this.groundY, stripeWidth, stripeHeight);
    ctx.fillStyle = blackColor;
    for (let x = rxLeft - 20; x < rxLeft + stripeWidth + 20; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x + 8, this.groundY);
      ctx.lineTo(x - 4, this.groundY + stripeHeight);
      ctx.lineTo(x - 12, this.groundY + stripeHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Right cliff edge (start of platform)
    const rxRight = plat.startX - cameraX;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rxRight, this.groundY, stripeWidth, stripeHeight);
    ctx.clip();

    ctx.fillStyle = yellowColor;
    ctx.fillRect(rxRight, this.groundY, stripeWidth, stripeHeight);
    ctx.fillStyle = blackColor;
    for (let x = rxRight - 20; x < rxRight + stripeWidth + 20; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x + 8, this.groundY);
      ctx.lineTo(x - 4, this.groundY + stripeHeight);
      ctx.lineTo(x - 12, this.groundY + stripeHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Flashing Hazard LED beacon on cliff corners
    if (!isLateGameHard) {
      const now = Date.now() * 0.006;
      const flash = Math.sin(now) > 0;
      ctx.fillStyle = flash ? '#ff4757' : '#ffa502';
      ctx.beginPath();
      ctx.arc(plat.endX - cameraX - 4, this.groundY + 6, 4, 0, Math.PI * 2);
      ctx.arc(plat.startX - cameraX + 4, this.groundY + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

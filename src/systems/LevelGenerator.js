import { Vehicle } from '../entities/Vehicle.js';
import { Civilian } from '../entities/Civilian.js';
import { Coin, Bomb, MysteryBox } from '../entities/Obstacle.js';
import { biomeManager } from './BiomeManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

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
  }

  draw(ctx, cameraX) {
    // 1. Draw High-Contrast Deep Abyss Chasms (Pits between platforms)
    this.drawPitsAndChasms(ctx, cameraX);

    for (const plat of this.platforms) {
      const renderX = plat.startX - cameraX;
      const width = plat.endX - plat.startX;
      const midX = (plat.startX + plat.endX) / 2;

      const roadStyle = biomeManager.getRoadStyleAt(midX);

      if (roadStyle === 'CITY') {
        // High-Contrast Modern City Highway (Light Cold Slate Asphalt vs Dark Night Sky)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#334155');
        roadGrad.addColorStop(0.2, '#243042');
        roadGrad.addColorStop(1, '#18202c');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // 4px Dual-tone Aluminum Curb Top Highlight (Separates road from dark sky)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(renderX, this.groundY, width, 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(renderX, this.groundY + 2, width, 2);

        // Crisp White Lane Edge Stripe
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(renderX, this.groundY + 12, width, 2);

        // Vivid Traffic Gold Center Dashes
        ctx.fillStyle = '#facc15';
        const dashWidth = 44;
        const dashGap = 44;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 5);
          }
        }
      } else if (roadStyle === 'CYBER') {
        // High-Contrast Cyber Neon Expressway (Navy Steel Deck with Glowing Cyan & Hot Pink)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#273549');
        roadGrad.addColorStop(0.2, '#1a2436');
        roadGrad.addColorStop(1, '#0f1624');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Glowing Laser Aurora Curb
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(renderX, this.groundY, width, 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(renderX, this.groundY + 2, width, 2);

        // Cyber Magenta Center Dashes
        ctx.fillStyle = '#f43f5e';
        const dashWidth = 44;
        const dashGap = 44;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 5);
          }
        }
      } else if (roadStyle === 'TUNNEL') {
        // Industrial Heavy Duty Tunnel Concrete
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#2c3545');
        roadGrad.addColorStop(1, '#19202c');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Safety Amber Edge Guard
        ctx.fillStyle = '#f97316';
        ctx.fillRect(renderX, this.groundY, width, 4);

        // White Safety Line
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(renderX, this.groundY + 48, width, 3);
      } else if (roadStyle === 'BEACH') {
        // Deep Walnut Seaside Boardwalk (Dark Rich Wood contrasting with Bright Turquoise Ocean)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#3a2217');
        roadGrad.addColorStop(0.3, '#28160e');
        roadGrad.addColorStop(1, '#170c07');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Crisp White Seaside Barrier Curb
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(renderX, this.groundY + 3, width, 2);

        // Inlaid Teak Plank Slats
        ctx.fillStyle = '#140905';
        for (let dx = plat.startX; dx < plat.endX; dx += 26) {
          ctx.fillRect(dx - cameraX, this.groundY + 5, 2, 175);
        }

        // Center Inlaid Anti-Slip Track
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(renderX, this.groundY + 48, width, 3);
      } else if (roadStyle === 'BRIDGE') {
        // Suspension Sea Bridge Steel Deck
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#334155');
        roadGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Anti-Corrosion Vibrant Red Barrier
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(renderX, this.groundY, width, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(renderX, this.groundY + 5, width, 2);

        // Pure White Highway Guideline
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(renderX, this.groundY + 48, width, 3);
      } else if (roadStyle === 'SCI_FI') {
        // Sci-Fi Titanium Alloy Deck with Sky-Blue Mag-Rail (Contrasting with Deep Space)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#38465c');
        roadGrad.addColorStop(0.2, '#263244');
        roadGrad.addColorStop(1, '#161e2a');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Sky-Blue Pulsing Mag-Rail Curb
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(renderX, this.groundY, width, 2);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(renderX, this.groundY + 2, width, 2);

        // Cyan Holographic Guidance Line
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(renderX, this.groundY + 48, width, 3);
      } else if (roadStyle === 'FOREST') {
        // Pale Concrete Highway (Bright Light Gray Cut Through Dark Green Forest Canopy)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#475569');
        roadGrad.addColorStop(0.25, '#334155');
        roadGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // Vivid Moss & Amber Warning Curb
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(renderX, this.groundY, width, 2);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(renderX, this.groundY + 2, width, 2);

        // Sunny Amber Center Dashes
        ctx.fillStyle = '#fbbf24';
        const dashWidth = 40;
        const dashGap = 40;
        const startOffset = Math.floor(plat.startX / (dashWidth + dashGap)) * (dashWidth + dashGap);
        for (let dx = startOffset; dx < plat.endX; dx += dashWidth + dashGap) {
          if (dx >= plat.startX && dx + dashWidth <= plat.endX) {
            ctx.fillRect(dx - cameraX, this.groundY + 48, dashWidth, 5);
          }
        }
      } else {
        // Desert Blacktop Expressway (Deep Black Asphalt Slicing Through Golden/Sunset Sand)
        const roadGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 180);
        roadGrad.addColorStop(0, '#202632');
        roadGrad.addColorStop(0.25, '#141922');
        roadGrad.addColorStop(1, '#0b0e14');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(renderX, this.groundY, width, 180);

        // High-Contrast Golden Sandstone Curb
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(renderX, this.groundY, width, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(renderX, this.groundY + 3, width, 2);

        // Distinct Double Solid Yellow Highway Lines (Double Amber Striping)
        ctx.fillStyle = '#eab308';
        ctx.fillRect(renderX, this.groundY + 45, width, 2.5);
        ctx.fillRect(renderX, this.groundY + 51, width, 2.5);
      }

      // Draw Industrial Warning Hazard Stripes on Cliff Edges
      this.drawHazardStripes(ctx, plat, cameraX);
    }

    // Draw Manholes (High-contrast cast iron on slate asphalt)
    for (const m of this.manholes) {
      const rx = m.x - cameraX;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(rx, this.groundY + 20, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw Puddle Details (Bright water highlights)
    for (const p of this.puddles) {
      const rx = p.x - cameraX;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(rx + p.width / 2, this.groundY + 3, p.width / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(rx + p.width / 2 - 4, this.groundY + 2, p.width / 4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
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

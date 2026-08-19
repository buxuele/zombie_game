import { assets } from './AssetLoader.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt, targetX) {
    this.targetX = targetX - 220;
    this.x += (this.targetX - this.x) * Math.min(1, 10 * dt);

    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
      const shakePower = this.trauma * this.trauma;
      this.shakeX = (Math.random() * 2 - 1) * 20 * shakePower;
      this.shakeY = (Math.random() * 2 - 1) * 20 * shakePower;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  get renderX() {
    return this.x + this.shakeX;
  }

  get renderY() {
    return this.y + this.shakeY;
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();

    this.height = 720;
    this.width = 1280;
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspectRatio = w / h;

    this.canvas.width = Math.round(720 * aspectRatio);
    this.canvas.height = 720;
    this.width = this.canvas.width;
    this.height = 720;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(cameraX) {
    const worldX = cameraX;

    // Biome Spatial Layout:
    // 0 - 7000px (0-700m): City Sunset
    // 7000 - 10000px (700-1000m): Mountain Tunnel Transition (Dark mountain cavern, yellow ceiling lamps)
    // 10000 - 18000px (1000-1800m): Sunny Beach & Palms
    // 18000 - 21500px (1800-2150m): Sea Suspension Bridge Transition (Steel towers, ocean expanse)
    // 21500px+ (2150m+): Golden Desert & Pyramids

    // 1. Render Base Scenic Backgrounds with Alpha Cross-fade (Non-repeating Continuous Panorama)
    let cityAlpha = 0;
    let beachAlpha = 0;
    let desertAlpha = 0;

    if (worldX < 7000) {
      cityAlpha = 1.0;
    } else if (worldX < 8500) {
      cityAlpha = 1.0 - (worldX - 7000) / 1500;
    } else {
      cityAlpha = 0;
    }

    if (worldX >= 8500 && worldX < 10000) {
      beachAlpha = (worldX - 8500) / 1500;
    } else if (worldX >= 10000 && worldX < 18000) {
      beachAlpha = 1.0;
    } else if (worldX >= 18000 && worldX < 19500) {
      beachAlpha = 1.0 - (worldX - 18000) / 1500;
    } else {
      beachAlpha = 0;
    }

    if (worldX >= 19500 && worldX < 21500) {
      desertAlpha = (worldX - 19500) / 2000;
    } else if (worldX >= 21500) {
      desertAlpha = 1.0;
    }

    if (cityAlpha > 0.01) {
      const cityProgress = Math.min(1, Math.max(0, worldX / 7000));
      this.ctx.save();
      this.ctx.globalAlpha = cityAlpha;
      this.drawPanoramicBackground(assets.images.cityBg, cityProgress, 'CITY');
      this.ctx.restore();
    }

    if (beachAlpha > 0.01) {
      const beachProgress = Math.min(1, Math.max(0, (worldX - 10000) / 8000));
      this.ctx.save();
      this.ctx.globalAlpha = beachAlpha;
      this.drawPanoramicBackground(assets.images.beachBg, beachProgress, 'BEACH');
      this.ctx.restore();
    }

    if (desertAlpha > 0.01) {
      const desertProgress = Math.min(1, Math.max(0, ((worldX - 21500) % 20000) / 20000));
      this.ctx.save();
      this.ctx.globalAlpha = desertAlpha;
      this.drawPanoramicBackground(assets.images.desertBg, desertProgress, 'DESERT');
      this.ctx.restore();
    }

    // 2. Mountain Tunnel Segment (7000px to 10000px)
    if (cameraX >= 6400 && cameraX <= 10600) {
      this.drawMountainTunnel(cameraX);
    }

    // 3. Ocean Suspension Bridge Segment (18000px to 21500px)
    if (cameraX >= 17400 && cameraX <= 22000) {
      this.drawSuspensionBridge(cameraX);
    }
  }

  // Non-repeating High-Res Progressive Panoramic Window (Centered Framing & Sky Cropping)
  drawPanoramicBackground(img, progress, biomeType = 'CITY') {
    if (img && img.complete && img.naturalWidth > 0) {
      // Scale up to crop excess upper empty sky and bring vibrant cityscape into active running plane
      const panScale = 1.48;
      const drawH = this.height * panScale;
      const drawW = drawH * (img.naturalWidth / img.naturalHeight);
      const maxScrollX = Math.max(0, drawW - this.width);
      const maxScrollY = Math.max(0, drawH - this.height);

      const clampedProg = Math.max(0, Math.min(1, progress));
      const renderX = -clampedProg * maxScrollX;
      // Vertically center/crop: remove 75% of upper empty sky so buildings sit naturally behind the highway
      const renderY = -maxScrollY * 0.76;

      // Draw single full-bleed continuous panoramic image
      this.ctx.drawImage(img, renderX, renderY, drawW, drawH);
      return;
    }

    // High-End Flat Cartoon Vector Procedural Fallback (Clean, Zero AI artifact, Crisp Art)
    this.drawProceduralVectorBackground(progress * 1000, biomeType);
  }

  drawProceduralVectorBackground(offset, biomeType) {
    this.ctx.save();

    if (biomeType === 'CITY') {
      // 1. Sunset Sky Gradient
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, 540);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.35, '#3b0764');
      skyGrad.addColorStop(0.7, '#831843');
      skyGrad.addColorStop(1, '#f97316');
      this.ctx.fillStyle = skyGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Glowing Sunset Sun
      this.ctx.fillStyle = 'rgba(254, 215, 170, 0.85)';
      this.ctx.beginPath();
      this.ctx.arc(880, 240, 70, 0, Math.PI * 2);
      this.ctx.fill();

      // Distant Skyline Silhouette
      this.ctx.fillStyle = '#1e1b4b';
      const cityW = 600;
      const startX = -(offset % cityW);
      for (let cx = startX - cityW; cx < this.width + cityW; cx += cityW) {
        // Buildings
        this.ctx.fillRect(cx + 40, 260, 70, 280);
        this.ctx.fillRect(cx + 130, 200, 90, 340);
        this.ctx.fillRect(cx + 240, 280, 80, 260);
        this.ctx.fillRect(cx + 340, 160, 100, 380);
        this.ctx.fillRect(cx + 460, 240, 80, 300);

        // Tower spire
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 390, 160);
        this.ctx.lineTo(cx + 390, 100);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#1e1b4b';
        this.ctx.stroke();

        // Lit Windows
        this.ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
        for (let row = 0; row < 6; row++) {
          this.ctx.fillRect(cx + 150, 220 + row * 35, 12, 16);
          this.ctx.fillRect(cx + 180, 220 + row * 35, 12, 16);
          this.ctx.fillRect(cx + 360, 190 + row * 40, 14, 18);
          this.ctx.fillRect(cx + 400, 190 + row * 40, 14, 18);
        }
        this.ctx.fillStyle = '#1e1b4b';
      }
    } else if (biomeType === 'BEACH') {
      // 1. Tropical Sky Gradient
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, 540);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(0.85, '#bae6fd');
      skyGrad.addColorStop(1, '#fef08a');
      this.ctx.fillStyle = skyGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Ocean Sea
      this.ctx.fillStyle = '#0369a1';
      this.ctx.fillRect(0, 340, this.width, 200);
      this.ctx.fillStyle = '#0284c7';
      this.ctx.fillRect(0, 380, this.width, 160);

      // Palm Trees
      const beachW = 500;
      const startX = -(offset % beachW);
      for (let bx = startX - beachW; bx < this.width + beachW; bx += beachW) {
        this.ctx.fillStyle = '#0f172a';
        // Palm Trunk
        this.ctx.beginPath();
        this.ctx.moveTo(bx + 120, 540);
        this.ctx.quadraticCurveTo(bx + 140, 380, bx + 180, 260);
        this.ctx.lineWidth = 14;
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.stroke();

        // Palm Fronds
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          this.ctx.beginPath();
          this.ctx.moveTo(bx + 180, 260);
          this.ctx.quadraticCurveTo(bx + 180 + Math.cos(ang) * 60, 260 + Math.sin(ang) * 40 + 20, bx + 180 + Math.cos(ang) * 90, 260 + Math.sin(ang) * 70);
          this.ctx.lineWidth = 6;
          this.ctx.stroke();
        }
      }
    } else if (biomeType === 'DESERT') {
      // 1. Warm Amber Desert Twilight
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, 540);
      skyGrad.addColorStop(0, '#581c87');
      skyGrad.addColorStop(0.4, '#9a3412');
      skyGrad.addColorStop(0.8, '#ea580c');
      skyGrad.addColorStop(1, '#fef08a');
      this.ctx.fillStyle = skyGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Distant Pyramids
      const desertW = 700;
      const startX = -(offset % desertW);
      for (let dx = startX - desertW; dx < this.width + desertW; dx += desertW) {
        this.ctx.fillStyle = '#7c2d12';
        this.ctx.beginPath();
        this.ctx.moveTo(dx + 160, 540);
        this.ctx.lineTo(dx + 300, 240);
        this.ctx.lineTo(dx + 440, 540);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#9a3412';
        this.ctx.beginPath();
        this.ctx.moveTo(dx + 300, 240);
        this.ctx.lineTo(dx + 300, 540);
        this.ctx.lineTo(dx + 440, 540);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawMountainTunnel(cameraX) {
    const tStart = 7000;
    const tEnd = 10000;

    this.ctx.save();

    // 1. Mountain Rock Mass Background (Blocks out the sky completely inside the mountain!)
    const rStart = tStart - cameraX;
    const rEnd = tEnd - cameraX;

    if (rEnd > 0 && rStart < this.width) {
      const clampLeft = Math.max(0, rStart);
      const clampRight = Math.min(this.width, rEnd);

      if (clampRight > clampLeft) {
        // Deep Mountain Rock Wall
        this.ctx.fillStyle = '#11141a';
        this.ctx.fillRect(clampLeft, 0, clampRight - clampLeft, 540);

        // Mountain rock strata layers
        this.ctx.fillStyle = '#181c24';
        for (let i = 0; i < 6; i++) {
          this.ctx.fillRect(clampLeft, 60 + i * 80, clampRight - clampLeft, 8);
        }
      }
    }

    // 2. Repetitive Concrete Tunnel Arches & Volumetric Overhead Lights
    for (let x = tStart; x <= tEnd; x += 220) {
      const rx = x - cameraX;
      if (rx < -300 || rx > this.width + 300) continue;

      // Heavy Concrete Support Arch
      this.ctx.fillStyle = '#1e232d';
      this.ctx.beginPath();
      this.ctx.roundRect(rx, 0, 180, 540, [0, 0, 50, 0]);
      this.ctx.fill();

      this.ctx.fillStyle = '#2d3342';
      this.ctx.fillRect(rx, 0, 180, 48);

      // Yellow Warning Stripes along arch pillar
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.fillRect(rx + 150, 48, 8, 492);
      this.ctx.fillStyle = '#15181e';
      for (let sy = 50; sy < 540; sy += 30) {
        this.ctx.fillRect(rx + 150, sy, 8, 12);
      }

      // Volumetric Fluorescent Overhead Light Cone
      this.ctx.fillStyle = 'rgba(241, 196, 15, 0.18)';
      this.ctx.beginPath();
      this.ctx.moveTo(rx + 50, 48);
      this.ctx.lineTo(rx + 130, 48);
      this.ctx.lineTo(rx + 200, 540);
      this.ctx.lineTo(rx - 20, 540);
      this.ctx.closePath();
      this.ctx.fill();

      // Glowing Lamp Fixture
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(rx + 60, 42, 60, 6);
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.fillRect(rx + 55, 40, 70, 4);
    }

    // 3. Grand Mountain Entrance Portal
    const entranceRx = tStart - cameraX;
    if (entranceRx >= -400 && entranceRx <= this.width + 400) {
      // Natural rock mountain slope
      this.ctx.fillStyle = '#222733';
      this.ctx.beginPath();
      this.ctx.moveTo(entranceRx - 400, 540);
      this.ctx.lineTo(entranceRx, 0);
      this.ctx.lineTo(entranceRx + 120, 0);
      this.ctx.lineTo(entranceRx + 120, 540);
      this.ctx.closePath();
      this.ctx.fill();

      // Portal Arch Sign
      this.ctx.fillStyle = '#0f1318';
      this.ctx.fillRect(entranceRx - 30, 80, 140, 50);
      this.ctx.strokeStyle = '#f1c40f';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(entranceRx - 30, 80, 140, 50);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `900 18px 'Outfit', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('穿山隧道', entranceRx + 40, 105);
      this.ctx.font = `700 11px 'Outfit', sans-serif`;
      this.ctx.fillText('MOUNTAIN TUNNEL', entranceRx + 40, 122);
    }

    // 4. Sunny Beach Exit Portal
    const exitRx = tEnd - cameraX;
    if (exitRx >= -400 && exitRx <= this.width + 400) {
      this.ctx.fillStyle = '#222733';
      this.ctx.beginPath();
      this.ctx.moveTo(exitRx, 0);
      this.ctx.lineTo(exitRx + 400, 540);
      this.ctx.lineTo(exitRx - 100, 540);
      this.ctx.lineTo(exitRx - 100, 0);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#0f1318';
      this.ctx.fillRect(exitRx - 20, 80, 140, 50);
      this.ctx.strokeStyle = '#3498db';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(exitRx - 20, 80, 140, 50);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `900 18px 'Outfit', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('阳光海滩', exitRx + 50, 105);
      this.ctx.font = `700 11px 'Outfit', sans-serif`;
      this.ctx.fillText('COASTAL BEACH', exitRx + 50, 122);
    }

    this.ctx.restore();
  }

  drawSuspensionBridge(cameraX) {
    const bStart = 18000;
    const bEnd = 21500;

    this.ctx.save();

    // 1. Deep Blue Ocean Underneath the Bridge
    const brStart = bStart - cameraX;
    const brEnd = bEnd - cameraX;

    if (brEnd > 0 && brStart < this.width) {
      const clampL = Math.max(0, brStart);
      const clampR = Math.min(this.width, brEnd);

      if (clampR > clampL) {
        this.ctx.fillStyle = 'rgba(41, 128, 185, 0.4)';
        this.ctx.fillRect(clampL, 420, clampR - clampL, 120);

        // Ocean Wave crests under bridge
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.lineWidth = 2;
        for (let ox = clampL; ox < clampR; ox += 60) {
          this.ctx.beginPath();
          this.ctx.arc(ox + 30, 480, 25, Math.PI, 0);
          this.ctx.stroke();
        }
      }
    }

    // 2. Giant Red Golden Gate Style Suspension Towers (every 700px)
    for (let x = bStart + 350; x <= bEnd - 350; x += 700) {
      const rx = x - cameraX;
      if (rx < -400 || rx > this.width + 400) continue;

      // Concrete Pier Foundation in Sea
      this.ctx.fillStyle = '#7f8c8d';
      this.ctx.fillRect(rx - 30, 440, 60, 100);

      // Red Steel Tower Columns
      this.ctx.fillStyle = '#c0392b';
      this.ctx.fillRect(rx - 20, 0, 40, 540);

      // Cross Bracing Trusses
      this.ctx.fillStyle = '#a93226';
      this.ctx.fillRect(rx - 55, 80, 110, 20);
      this.ctx.fillRect(rx - 55, 240, 110, 20);
      this.ctx.fillRect(rx - 55, 400, 110, 20);

      // Main Suspension Catenary Cables
      this.ctx.strokeStyle = '#e74c3c';
      this.ctx.lineWidth = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(rx - 350, 80);
      this.ctx.quadraticCurveTo(rx, 390, rx + 350, 80);
      this.ctx.stroke();

      // Vertical Suspension Steel Cables
      this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.65)';
      this.ctx.lineWidth = 2.5;
      for (let vx = -330; vx <= 330; vx += 30) {
        const cableY = 80 + Math.pow(vx / 350, 2) * 310;
        this.ctx.beginPath();
        this.ctx.moveTo(rx + vx, cableY);
        this.ctx.lineTo(rx + vx, 540);
        this.ctx.stroke();
      }
    }

    // 3. Bridge Entrance & Desert Entrance Portals
    const entranceRx = bStart - cameraX;
    if (entranceRx >= -300 && entranceRx <= this.width + 300) {
      this.ctx.fillStyle = '#c0392b';
      this.ctx.fillRect(entranceRx - 20, 120, 140, 45);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `900 17px 'Outfit', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('跨海大桥', entranceRx + 50, 142);
      this.ctx.font = `700 10px 'Outfit', sans-serif`;
      this.ctx.fillText('SEA BRIDGE', entranceRx + 50, 156);
    }

    const exitRx = bEnd - cameraX;
    if (exitRx >= -300 && exitRx <= this.width + 300) {
      this.ctx.fillStyle = '#d35400';
      this.ctx.fillRect(exitRx - 20, 120, 140, 45);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `900 17px 'Outfit', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('沙漠绿洲', exitRx + 50, 142);
      this.ctx.font = `700 10px 'Outfit', sans-serif`;
      this.ctx.fillText('DESERT OASIS', exitRx + 50, 156);
    }

    this.ctx.restore();
  }

  drawAmbientTransformationAtmosphere(transformType) {
    if (!transformType || transformType === 'NONE') return;

    this.ctx.save();
    let ambientColor = null;

    if (transformType === 'TSUNAMI') {
      ambientColor = 'rgba(41, 128, 185, 0.22)';
    } else if (transformType === 'DRAGON') {
      ambientColor = 'rgba(192, 57, 43, 0.22)';
    } else if (transformType === 'BALLOON') {
      ambientColor = 'rgba(255, 64, 129, 0.18)';
    } else if (transformType === 'GIANT_MECH') {
      ambientColor = 'rgba(192, 57, 43, 0.20)';
    } else if (transformType === 'GOLD') {
      ambientColor = 'rgba(241, 196, 15, 0.18)';
    } else if (transformType === 'NINJA') {
      ambientColor = 'rgba(142, 68, 173, 0.20)';
    } else if (transformType === 'QUARTERBACK') {
      ambientColor = 'rgba(230, 126, 34, 0.20)';
    } else if (transformType === 'UFO') {
      ambientColor = 'rgba(26, 188, 156, 0.18)';
    }

    if (ambientColor) {
      this.ctx.fillStyle = ambientColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    this.ctx.restore();
  }

  drawIncomingTrafficWarnings(vehicles, cameraX) {
    if (!vehicles) return;

    for (const v of vehicles) {
      if (v.isMoving && v.alive && !v.isFlipped) {
        const distToScreen = v.x - (cameraX + this.width);
        if (distToScreen > 0 && distToScreen < 950) {
          const flash = Math.sin(performance.now() * 0.015) > 0;
          this.ctx.save();
          this.ctx.translate(this.width - 45, 540 - 55);

          // Red Hazard Warning Triangle
          this.ctx.fillStyle = flash ? '#e74c3c' : '#c0392b';
          this.ctx.beginPath();
          this.ctx.moveTo(0, -22);
          this.ctx.lineTo(24, 18);
          this.ctx.lineTo(-24, 18);
          this.ctx.closePath();
          this.ctx.fill();

          // Exclamation Mark
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(-2.5, -10, 5, 14);
          this.ctx.fillRect(-2.5, 8, 5, 5);

          this.ctx.restore();
        }
      }
    }
  }
}

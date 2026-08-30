import { assets } from './AssetLoader.js';
import { biomeManager } from '../systems/BiomeManager.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.zoom = 1.0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt, targetX, leaderY = 486) {
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
    // 1. Get smoothly crossfading visible zones
    const visibleZones = biomeManager.getRenderableZones(cameraX, this.width, assets);

    // 2. Base continuous sky gradient layer (guarantees vibrant background with zero black voids)
    for (const vz of visibleZones) {
      if (vz.alpha > 0.001) {
        this.ctx.save();
        this.ctx.globalAlpha = vz.alpha;
        const grad = this.ctx.createLinearGradient(0, 0, 0, 540);
        const colors = vz.skyGradient || ['#0f172a', '#1e1b4b', '#3b0764', '#1e1b4b'];
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.35, colors[1]);
        grad.addColorStop(0.7, colors[2]);
        grad.addColorStop(1, colors[3]);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
      }
    }

    // 3. Render panoramic background images with smooth Hermite alpha crossfade
    for (const vz of visibleZones) {
      if (vz.alpha > 0.001) {
        this.ctx.save();
        this.ctx.globalAlpha = vz.alpha;
        this.drawPanoramicBackground(vz.theme.img, vz.progress, vz.theme.roadStyle);
        this.ctx.restore();
      }
    }
  }

  // Non-repeating High-Res Progressive Panoramic Window (Framed to Road Baseline with Procedural Shapes)
  drawPanoramicBackground(img, progress, biomeType = 'CITY') {
    if (img && img.complete && img.naturalWidth > 0) {
      // Fit precisely to the road top baseline (Y=0 to 540) so the entire bottom landscape is 100% visible
      const drawH = 540;
      const drawW = drawH * (img.naturalWidth / img.naturalHeight);
      const maxScrollX = Math.max(0, drawW - this.width);
      const clampedProg = Math.max(0, Math.min(1, progress));
      const renderX = -clampedProg * maxScrollX;
      const renderY = 0;

      // Draw single full-bleed continuous panoramic image
      this.ctx.drawImage(img, renderX, renderY, drawW, drawH);
    } else {
      // High-End Flat Cartoon Vector Procedural Fallback (Clean, Zero AI artifact, Crisp Art)
      this.drawProceduralVectorBackground(progress * 1000, biomeType);
    }

    // Procedural Ground Transition Shapes at base (Y=440 to 540)
    this.drawProceduralGroundTransition(progress * 800, biomeType);
  }

  drawProceduralGroundTransition(offset, biomeType) {
    this.ctx.save();

    if (biomeType === 'CITY' || biomeType === 'CYBER') {
      // Multi-layered urban silhouettes sitting right above the road
      const segW = 400;
      const startX = -(offset % segW);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      for (let x = startX - segW; x < this.width + segW; x += segW) {
        this.ctx.fillRect(x + 20, 480, 50, 60);
        this.ctx.fillRect(x + 85, 450, 65, 90);
        this.ctx.fillRect(x + 165, 490, 45, 50);
        this.ctx.fillRect(x + 225, 440, 80, 100);
        this.ctx.fillRect(x + 320, 475, 55, 65);

        // Subtle warm lit window accents
        this.ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
        this.ctx.fillRect(x + 100, 465, 8, 10);
        this.ctx.fillRect(x + 120, 465, 8, 10);
        this.ctx.fillRect(x + 245, 455, 10, 12);
        this.ctx.fillRect(x + 270, 455, 10, 12);
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      }
    } else if (biomeType === 'BEACH' || biomeType === 'SUNSET') {
      // Coastal horizon gradient & gentle wave contour shapes
      const waveGrad = this.ctx.createLinearGradient(0, 480, 0, 540);
      waveGrad.addColorStop(0, 'rgba(14, 116, 144, 0.35)');
      waveGrad.addColorStop(1, 'rgba(6, 182, 212, 0.75)');
      this.ctx.fillStyle = waveGrad;

      this.ctx.beginPath();
      this.ctx.moveTo(0, 540);
      const waveStep = 60;
      for (let x = 0; x <= this.width + waveStep; x += waveStep) {
        const wy = 510 + Math.sin((x + offset) * 0.02) * 12;
        this.ctx.lineTo(x, wy);
      }
      this.ctx.lineTo(this.width, 540);
      this.ctx.closePath();
      this.ctx.fill();

      // Foam Crest line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let x = 0; x <= this.width + waveStep; x += waveStep) {
        const wy = 510 + Math.sin((x + offset) * 0.02) * 12;
        if (x === 0) this.ctx.moveTo(x, wy);
        else this.ctx.lineTo(x, wy);
      }
      this.ctx.stroke();
    } else {
      // Warm desert / forest rolling dune slope shapes
      const duneGrad = this.ctx.createLinearGradient(0, 460, 0, 540);
      duneGrad.addColorStop(0, 'rgba(120, 53, 15, 0.4)');
      duneGrad.addColorStop(1, 'rgba(180, 83, 9, 0.8)');
      this.ctx.fillStyle = duneGrad;

      this.ctx.beginPath();
      this.ctx.moveTo(0, 540);
      const duneStep = 80;
      for (let x = 0; x <= this.width + duneStep; x += duneStep) {
        const dy = 490 + Math.cos((x + offset * 0.7) * 0.015) * 18;
        this.ctx.lineTo(x, dy);
      }
      this.ctx.lineTo(this.width, 540);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
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

  drawAmbientTransformationAtmosphere(transformType) {
    if (!transformType || transformType === 'NONE') return;

    this.ctx.save();
    let ambientColor = null;

    if (transformType === 'TSUNAMI') {
      ambientColor = 'rgba(41, 128, 185, 0.22)';
    } else if (transformType === 'DRAGON') {
      ambientColor = 'rgba(192, 57, 43, 0.22)';
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

  drawVehicleHeadlights(vehicles, cameraX) {
    if (!vehicles) return;
    this.ctx.save();
    for (const v of vehicles) {
      if (!v.alive || v.isFlipped) continue;
      const rx = v.x - cameraX;
      if (rx < -300 || rx > this.width + 300) continue;

      // Moving traffic casts light towards left; stationary traffic casts light towards right
      const isMovingLeft = v.isMoving;
      const lightOriginX = isMovingLeft ? rx : rx + v.width;
      const lightOriginY = v.y + v.height * 0.72;
      const beamDir = isMovingLeft ? -1 : 1;
      const beamLength = isMovingLeft ? 260 : 200;

      const grad = this.ctx.createRadialGradient(
        lightOriginX, lightOriginY, 5,
        lightOriginX + beamDir * beamLength * 0.6, lightOriginY + 15, beamLength
      );
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.32)');
      grad.addColorStop(0.3, 'rgba(253, 224, 71, 0.15)');
      grad.addColorStop(1, 'rgba(253, 224, 71, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(lightOriginX, lightOriginY - 8);
      this.ctx.lineTo(lightOriginX + beamDir * beamLength, lightOriginY - 35);
      this.ctx.lineTo(lightOriginX + beamDir * beamLength, lightOriginY + 45);
      this.ctx.lineTo(lightOriginX, lightOriginY + 12);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawStreetlightCones(cameraX) {
    this.ctx.save();
    const lampSpacing = 680;
    const startIdx = Math.floor((cameraX - 200) / lampSpacing);
    const endIdx = Math.ceil((cameraX + this.width + 200) / lampSpacing);

    for (let i = startIdx; i <= endIdx; i++) {
      const lampX = i * lampSpacing - cameraX;
      const lampTopY = 320;
      const roadY = 540;

      // Volumetric soft warm down-cone
      const coneGrad = this.ctx.createLinearGradient(lampX, lampTopY, lampX, roadY);
      coneGrad.addColorStop(0, 'rgba(253, 224, 71, 0.14)');
      coneGrad.addColorStop(0.7, 'rgba(254, 240, 138, 0.08)');
      coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      this.ctx.fillStyle = coneGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(lampX, lampTopY);
      this.ctx.lineTo(lampX - 110, roadY);
      this.ctx.lineTo(lampX + 110, roadY);
      this.ctx.closePath();
      this.ctx.fill();

      // Streetlamp bulb glow
      this.ctx.fillStyle = '#fef08a';
      this.ctx.beginPath();
      this.ctx.arc(lampX, lampTopY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}

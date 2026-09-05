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
        this.drawPanoramicBackground(vz.theme.img, cameraX, vz.theme.roadStyle, vz.progress);
        this.ctx.restore();
      }
    }
  }

  // Active High-Res Seamless Parallax Panning (Zero Seam, Single-Plate Horizon Slide)
  drawPanoramicBackground(img, cameraX, biomeType = 'CITY', progress = 0) {
    const validImg = (img && img.complete && img.naturalWidth > 0) ? img : (assets?.images?.cityBg || null);
    if (validImg && validImg.complete && validImg.naturalWidth > 0) {
      const visibleHeight = 540; // Road surface baseline
      const naturalRatio = validImg.naturalWidth / validImg.naturalHeight;

      // Scale height and width to ensure smooth pan room without ever showing empty margins or repeating seam
      const minW = this.width * 1.35;
      const baseH = visibleHeight * 1.05;
      const drawW = Math.max(minW, baseH * naturalRatio * 1.25);
      const drawHFinal = drawW / naturalRatio;

      const maxPan = drawW - this.width;
      const clampProgress = Math.max(0, Math.min(1, progress));
      const renderX = -clampProgress * maxPan;
      const renderY = -Math.max(0, (drawHFinal - visibleHeight) * 0.5);

      this.ctx.drawImage(validImg, renderX, renderY, drawW, drawHFinal);
    } else {
      // High-End Flat Cartoon Vector Procedural Fallback
      this.drawProceduralVectorBackground(cameraX * 0.22, biomeType);
    }
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
    } else if (transformType === 'GOLD') {
      ambientColor = 'rgba(241, 196, 15, 0.18)';
    } else if (transformType === 'NINJA') {
      ambientColor = 'rgba(142, 68, 173, 0.20)';
    } else if (transformType === 'QUARTERBACK') {
      ambientColor = 'rgba(230, 126, 34, 0.20)';
    }

    if (ambientColor) {
      this.ctx.fillStyle = ambientColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    this.ctx.restore();
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
}

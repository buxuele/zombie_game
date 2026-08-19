import { logger } from '../systems/Logger.js';

export class AssetLoader {
  constructor() {
    this.images = {};
    this.sprites = {};
    this.isLoaded = false;
  }

  async loadAll() {
    try {
      // 1. Priority loading: Check custom user backgrounds folder first, then fallback to default
      const cityBg = await this.loadFirstAvailable([
        '/backgrounds/city.png',
        '/backgrounds/city.jpg',
        '/backgrounds/city.webp',
        '/images/city_bg.jpg'
      ]);

      const beachBg = await this.loadFirstAvailable([
        '/backgrounds/beach.png',
        '/backgrounds/beach.jpg',
        '/backgrounds/beach.webp',
        '/images/beach_bg.jpg'
      ]);

      const desertBg = await this.loadFirstAvailable([
        '/backgrounds/desert.png',
        '/backgrounds/desert.jpg',
        '/backgrounds/desert.webp',
        '/images/desert_bg.jpg'
      ]);

      this.images.cityBg = cityBg;
      this.images.beachBg = beachBg;
      this.images.desertBg = desertBg;

      const propsImg = await this.loadFirstAvailable(['/backgrounds/props.png', '/images/props.jpg']);
      const vehiclesImg = await this.loadFirstAvailable(['/backgrounds/vehicles.png', '/images/vehicles.jpg']);
      const zombiesImg = await this.loadFirstAvailable(['/backgrounds/zombies.png', '/images/zombies.jpg']);

      // Extract transparent sprites from white background
      if (propsImg && vehiclesImg && zombiesImg) {
        const propsCanvas = this.removeWhiteBackground(propsImg);
        const vehiclesCanvas = this.removeWhiteBackground(vehiclesImg);
        const zombiesCanvas = this.removeWhiteBackground(zombiesImg);

        // Vehicle Sprites
        const vw = vehiclesCanvas.width;
        const vh = vehiclesCanvas.height;
        this.sprites.car = this.extractSprite(vehiclesCanvas, vw * 0.03, vh * 0.28, vw * 0.42, vh * 0.20);
        this.sprites.bus = this.extractSprite(vehiclesCanvas, vw * 0.49, vh * 0.27, vw * 0.46, vh * 0.22);
        this.sprites.tank = this.extractSprite(vehiclesCanvas, vw * 0.03, vh * 0.52, vw * 0.43, vh * 0.22);
        this.sprites.plane = this.extractSprite(vehiclesCanvas, vw * 0.48, vh * 0.51, vw * 0.48, vh * 0.22);

        // Prop Sprites
        const pw = propsCanvas.width;
        const ph = propsCanvas.height;
        this.sprites.coin = this.extractSprite(propsCanvas, pw * 0.02, ph * 0.03, pw * 0.11, ph * 0.12);
        this.sprites.brain = this.extractSprite(propsCanvas, pw * 0.02, ph * 0.18, pw * 0.14, ph * 0.13);
        this.sprites.bomb = this.extractSprite(propsCanvas, pw * 0.02, ph * 0.35, pw * 0.12, ph * 0.15);
        this.sprites.mysteryBox = this.extractSprite(propsCanvas, pw * 0.02, ph * 0.55, pw * 0.12, ph * 0.15);
        this.sprites.civilian = this.extractSprite(propsCanvas, pw * 0.49, ph * 0.76, pw * 0.12, ph * 0.20);

        // Zombie Sprites
        const zw = zombiesCanvas.width;
        const zh = zombiesCanvas.height;
        this.sprites.zombieRun1 = this.extractSprite(zombiesCanvas, zw * 0.04, zh * 0.05, zw * 0.32, zh * 0.32);
        this.sprites.zombieRun2 = this.extractSprite(zombiesCanvas, zw * 0.04, zh * 0.58, zw * 0.32, zh * 0.32);
        this.sprites.zombieJump = this.extractSprite(zombiesCanvas, zw * 0.33, zh * 0.35, zw * 0.33, zh * 0.33);
        this.sprites.zombieGlide = this.extractSprite(zombiesCanvas, zw * 0.65, zh * 0.14, zw * 0.33, zh * 0.31);
        this.sprites.zombieLand = this.extractSprite(zombiesCanvas, zw * 0.64, zh * 0.68, zw * 0.33, zh * 0.29);
      }

      this.isLoaded = true;
      logger.system('全套多场景背景（街区/海滩/沙漠）与贴图就绪');
    } catch (e) {
      logger.system('贴图加载提示: ' + e.message + ', 启用矢量高精度渲染保底');
    }
  }

  async loadFirstAvailable(candidatePaths) {
    for (const src of candidatePaths) {
      try {
        const img = await this.loadImage(src);
        if (img && img.naturalWidth > 0) {
          return img;
        }
      } catch (e) {
        // Continue trying next candidate path
      }
    }
    return null;
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  removeWhiteBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      } else if (r > 215 && g > 215 && b > 215) {
        const avg = (r + g + b) / 3;
        const alphaFactor = (255 - avg) / 40;
        data[i + 3] = Math.floor(data[i + 3] * Math.min(1, Math.max(0, alphaFactor)));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  extractSprite(sourceCanvas, sx, sy, sw, sh) {
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = Math.max(1, Math.floor(sw));
    spriteCanvas.height = Math.max(1, Math.floor(sh));
    const ctx = spriteCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, spriteCanvas.width, spriteCanvas.height);
    return spriteCanvas;
  }
}

export const assets = new AssetLoader();

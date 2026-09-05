import { logger } from './Logger.js';
import { assets as globalAssets } from '../engine/AssetLoader.js';

export const THEME_SKY_GRADIENTS = {
  CITY: ['#0f172a', '#1e1b4b', '#3b0764', '#1e1b4b'],
  BEACH: ['#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd'],
  DESERT: ['#451a03', '#7c2d12', '#c2410c', '#ea580c'],
  SUNSET: ['#1e1b4b', '#4c0519', '#831843', '#f97316'],
  CYBER: ['#050814', '#0d1326', '#1a2238', '#0b0f19'],
  SCI_FI: ['#0a192f', '#0f2b48', '#173a5e', '#0b1d30'],
  FOREST: ['#061a14', '#0c2e24', '#134e3f', '#0a231b'],
  LOTUS: ['#042f2e', '#0f766e', '#14b8a6', '#2dd4bf'],
  CASTLE: ['#0284c7', '#38bdf8', '#7dd3fc', '#e0f2fe']
};

export class BiomeManager {
  constructor() {
    this.zones = [];
    this.zoneLengthMin = 6500;
    this.zoneLengthMax = 8000;
    this.transitionLength = 2200; // Smooth 2200px crossfade
    this.lastThemeId = null;
    this.generatedDistance = 0;
  }

  reset(passedAssets = null) {
    this.zones = [];
    this.lastThemeId = null;
    this.generatedDistance = 0;
    this.generateInitialZones(passedAssets || globalAssets);
  }

  getAvailableThemes(passedAssets = null) {
    const ast = passedAssets || globalAssets;
    if (ast && ast.backgrounds && ast.backgrounds.length > 0) {
      return ast.backgrounds;
    }
    return [
      { id: 'city', name: '大都会夜景', roadStyle: 'CITY', img: ast?.images?.cityBg },
      { id: 'beach', name: '热带海岸', roadStyle: 'BEACH', img: ast?.images?.beachBg },
      { id: 'desert', name: '黄金沙漠', roadStyle: 'DESERT', img: ast?.images?.desertBg }
    ];
  }

  generateInitialZones(passedAssets = null) {
    this.ensureDistance(25000, passedAssets || globalAssets);
  }

  ensureDistance(targetDistance, passedAssets = null) {
    const ast = passedAssets || globalAssets;
    const availableThemes = this.getAvailableThemes(ast);
    if (!availableThemes || availableThemes.length === 0) return;

    while (this.generatedDistance < targetDistance + 12000) {
      const candidates = availableThemes.filter(t => t.id !== this.lastThemeId);
      const chosenTheme = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : availableThemes[0];

      const isFirst = this.zones.length === 0;
      const zoneLen = this.zoneLengthMin + Math.floor(Math.random() * (this.zoneLengthMax - this.zoneLengthMin));

      let startX, mainStartX, mainEndX, endX;

      if (isFirst) {
        startX = 0;
        mainStartX = 0;
        mainEndX = zoneLen;
        endX = mainEndX + this.transitionLength;
        this.generatedDistance = mainEndX;
      } else {
        const prev = this.zones[this.zones.length - 1];
        startX = prev.mainEndX;
        mainStartX = startX + this.transitionLength;
        mainEndX = mainStartX + zoneLen;
        endX = mainEndX + this.transitionLength;
        this.generatedDistance = mainEndX;
      }

      const zone = {
        index: this.zones.length,
        theme: chosenTheme,
        startX,
        mainStartX,
        mainEndX,
        endX,
        transitionLength: this.transitionLength,
        roadStyle: chosenTheme.roadStyle || 'CITY',
        skyGradient: THEME_SKY_GRADIENTS[chosenTheme.roadStyle] || THEME_SKY_GRADIENTS.CITY
      };

      this.zones.push(zone);
      this.lastThemeId = chosenTheme.id;

      logger.system(`生成新生态区域 #${zone.index + 1}: ${chosenTheme.name} (${Math.floor(startX / 10)}m - ${Math.floor(endX / 10)}m)`);
    }
  }

  cleanup(minX) {
    this.zones = this.zones.filter(z => z.endX >= minX);
  }

  getRenderableZones(cameraX, viewportWidth, assets) {
    this.ensureDistance(cameraX + viewportWidth + 5000, assets);

    const visibleZones = [];

    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      if (cameraX > z.endX || cameraX + viewportWidth < z.startX) continue;

      let alpha = 1.0;

      // 1. Fade-in during entry transition
      if (z.index > 0 && cameraX < z.mainStartX) {
        const t = Math.max(0, Math.min(1, (cameraX - z.startX) / z.transitionLength));
        // Cubic Hermite smoothstep for silky smooth crossfade
        alpha = t * t * (3 - 2 * t);
      }
      // 2. Fade-out during exit transition
      else if (cameraX >= z.mainEndX) {
        const t = Math.max(0, Math.min(1, (cameraX - z.mainEndX) / z.transitionLength));
        alpha = 1.0 - (t * t * (3 - 2 * t));
      }

      const totalSpan = Math.max(1, z.endX - z.startX);
      const progress = Math.max(0, Math.min(1, (cameraX - z.startX) / totalSpan));

      if (alpha > 0.001) {
        visibleZones.push({
          zone: z,
          alpha,
          progress,
          theme: z.theme,
          skyGradient: z.skyGradient
        });
      }
    }

    return visibleZones;
  }

  getRoadStyleAt(worldX) {
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const nextZone = this.zones[i + 1];

      if (worldX >= z.startX) {
        if (nextZone) {
          // Switch road style at the exact midpoint of transition
          const switchX = z.mainEndX + z.transitionLength * 0.5;
          if (worldX < switchX) {
            return z.roadStyle;
          }
        } else {
          return z.roadStyle;
        }
      }
    }
    return 'CITY';
  }
}

export const biomeManager = new BiomeManager();

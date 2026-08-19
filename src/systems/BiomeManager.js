import { logger } from './Logger.js';
import { assets as globalAssets } from '../engine/AssetLoader.js';

export class BiomeManager {
  constructor() {
    this.zones = [];
    this.zoneLengthMin = 6000;
    this.zoneLengthMax = 7500;
    this.transitionLength = 1500;
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
    // Fallback theme list
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
      // Pick next theme: Strictly cannot pick the one that was just passed!
      const candidates = availableThemes.filter(t => t.id !== this.lastThemeId);
      const chosenTheme = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : availableThemes[0];

      const startX = this.generatedDistance;
      const zoneLen = this.zoneLengthMin + Math.floor(Math.random() * (this.zoneLengthMax - this.zoneLengthMin));
      const mainEndX = startX + zoneLen;
      const transEndX = mainEndX + this.transitionLength;

      // Choose transition structure (Mountain Tunnel, Suspension Sea Bridge, or Gateway Portal)
      const transTypes = ['TUNNEL', 'BRIDGE', 'PORTAL'];
      const transType = transTypes[this.zones.length % transTypes.length];

      const zone = {
        index: this.zones.length,
        theme: chosenTheme,
        startX,
        mainEndX,
        transStartX: mainEndX,
        transEndX,
        totalEndX: transEndX,
        transType,
        roadStyle: chosenTheme.roadStyle || 'CITY'
      };

      this.zones.push(zone);
      this.lastThemeId = chosenTheme.id;
      this.generatedDistance = transEndX;

      logger.system(`生成新生态区域 #${zone.index + 1}: ${chosenTheme.name} (${Math.floor(startX / 10)}m - ${Math.floor(transEndX / 10)}m), 过渡: ${transType}`);
    }
  }

  cleanup(minX) {
    this.zones = this.zones.filter(z => z.totalEndX >= minX);
  }

  getRenderableZones(cameraX, viewportWidth, assets) {
    this.ensureDistance(cameraX + viewportWidth + 5000, assets);
    const viewLeft = cameraX;
    const viewRight = cameraX + viewportWidth;

    const visibleZones = [];

    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      if (z.totalEndX < viewLeft || z.startX > viewRight) continue;

      let alpha = 1.0;
      const progress = Math.max(0, Math.min(1, (cameraX - z.startX) / (z.totalEndX - z.startX)));

      // If camera is in transition zone out of z
      if (cameraX >= z.transStartX && cameraX < z.transEndX) {
        alpha = Math.max(0, 1.0 - (cameraX - z.transStartX) / (z.transEndX - z.transStartX));
      } else if (cameraX < z.startX) {
        // Next zone fading in
        const prevZone = this.zones[i - 1];
        if (prevZone && cameraX >= prevZone.transStartX) {
          alpha = Math.min(1, (cameraX - prevZone.transStartX) / (prevZone.transEndX - prevZone.transStartX));
        }
      }

      visibleZones.push({
        zone: z,
        alpha,
        progress,
        theme: z.theme
      });
    }

    return visibleZones;
  }

  getRoadStyleAt(worldX) {
    for (const z of this.zones) {
      if (worldX >= z.startX && worldX < z.totalEndX) {
        // If in transition tunnel / bridge
        if (worldX >= z.transStartX) {
          if (z.transType === 'TUNNEL') return 'TUNNEL';
          if (z.transType === 'BRIDGE') return 'BRIDGE';
        }
        return z.roadStyle;
      }
    }
    return 'CITY';
  }

  getTransitions(cameraX, viewportWidth) {
    const activeTransitions = [];
    const minX = cameraX - 400;
    const maxX = cameraX + viewportWidth + 400;

    for (const z of this.zones) {
      if (z.transEndX >= minX && z.transStartX <= maxX) {
        activeTransitions.push({
          type: z.transType,
          startX: z.transStartX,
          endX: z.transEndX,
          fromTheme: z.theme,
          nextZoneIndex: z.index + 1
        });
      }
    }
    return activeTransitions;
  }
}

export const biomeManager = new BiomeManager();

const STORAGE_KEY = 'ZOMBIE_TSUNAMI_SAVE_V1';

const DEFAULT_DATA = {
  totalBrains: 0,
  totalCoins: 200,
  highScoreDistance: 0,
  upgrades: {
    startZombies: 1,      // 1 to 4
    magnetRadius: 1,      // 1 to 5
    transformDuration: 1  // 1 to 5
  },
  equippedHat: 'none',
  unlockedHats: ['none'],
  missions: [
    { id: 'flip_cars_1', title: '掀翻 3 辆轿车', target: 3, current: 0, reward: 150, type: 'cars_flipped', completed: false, claimed: false },
    { id: 'eat_civilians_1', title: '感染 15 名平民', target: 15, current: 0, reward: 200, type: 'civilians_eaten', completed: false, claimed: false },
    { id: 'run_distance_1', title: '单局奔跑达到 500 米', target: 500, current: 0, reward: 300, type: 'single_run_distance', completed: false, claimed: false },
    { id: 'collect_coins_1', title: '累计收集 200 枚金币', target: 200, current: 0, reward: 250, type: 'coins_collected', completed: false, claimed: false },
    { id: 'transform_1', title: '触发 2 次超能变身', target: 2, current: 0, reward: 350, type: 'transforms_used', completed: false, claimed: false }
  ],
  soundEnabled: true
};

export class Storage {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_DATA,
            ...parsed,
            upgrades: { ...DEFAULT_DATA.upgrades, ...(parsed.upgrades || {}) },
            unlockedHats: parsed.unlockedHats || DEFAULT_DATA.unlockedHats,
            missions: parsed.missions || DEFAULT_DATA.missions
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load storage, using defaults:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.warn('Failed to save storage:', e);
    }
  }

  addCoins(amount) {
    this.data.totalCoins += Math.max(0, amount);
    this.save();
  }

  spendCoins(amount) {
    if (this.data.totalCoins >= amount) {
      this.data.totalCoins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  addBrains(amount) {
    this.data.totalBrains += Math.max(0, amount);
    this.save();
  }

  updateHighScore(distance) {
    if (distance > this.data.highScoreDistance) {
      this.data.highScoreDistance = Math.floor(distance);
      this.save();
      return true;
    }
    return false;
  }

  getUpgradeLevel(key) {
    return this.data.upgrades[key] || 1;
  }

  setUpgradeLevel(key, level) {
    this.data.upgrades[key] = level;
    this.save();
  }

  equipHat(hatId) {
    this.data.equippedHat = hatId;
    this.save();
  }

  unlockHat(hatId) {
    if (!this.data.unlockedHats.includes(hatId)) {
      this.data.unlockedHats.push(hatId);
      this.save();
    }
  }

  isHatUnlocked(hatId) {
    return this.data.unlockedHats.includes(hatId);
  }

  toggleSound() {
    this.data.soundEnabled = !this.data.soundEnabled;
    this.save();
    return this.data.soundEnabled;
  }

  isSoundEnabled() {
    return this.data.soundEnabled;
  }

  getMissionProgress() {
    return this.data.missions;
  }

  updateMission(type, deltaValue, isAbsolute = false) {
    let changed = false;
    for (const mission of this.data.missions) {
      if (mission.type === type && !mission.completed) {
        if (isAbsolute) {
          if (deltaValue > mission.current) {
            mission.current = deltaValue;
            changed = true;
          }
        } else {
          mission.current += deltaValue;
          changed = true;
        }

        if (mission.current >= mission.target) {
          mission.current = mission.target;
          mission.completed = true;
          changed = true;
        }
      }
    }
    if (changed) {
      this.save();
    }
  }

  claimMissionReward(missionId) {
    const mission = this.data.missions.find(m => m.id === missionId);
    if (mission && mission.completed && !mission.claimed) {
      mission.claimed = true;
      this.addCoins(mission.reward);
      this.save();
      return mission.reward;
    }
    return 0;
  }
}

export const storage = new Storage();

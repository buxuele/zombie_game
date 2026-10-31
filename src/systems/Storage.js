const STORAGE_KEY = 'ZOMBIE_TSUNAMI_SAVE_V1';

// 本地调试默认静音，远程部署默认开启声音。
// 依据：本地反复调试时持续播放背景音乐会干扰排查，而线上首访用户应当直接听到声音。
// 该默认值只在首次进入、尚无存档时生效；玩家手动切换过的偏好不会被覆盖。
function isLocalDebugEnvironment() {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '' || host === '0.0.0.0';
}

function resolveDefaultSoundEnabled() {
  return !isLocalDebugEnvironment();
}

const RELIEF_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const DEFAULT_DATA = {
  totalCoins: 200,
  highScoreDistance: 0,
  lastReliefClaimAt: 0,
  hasSeenTutorial: false,
  upgrades: {
    startZombies: 1,      // 1 to 4
    feverDuration: 1,     // 1 to 5
    transformDuration: 1, // 1 to 5
    coinMultiplier: 1     // 1 to 5
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
  soundEnabled: resolveDefaultSoundEnabled()
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
      console.warn('读取本地存档失败，已回退到默认数据:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.warn('写入本地存档失败:', e);
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

  getReliefCooldownRemaining() {
    const elapsed = Date.now() - (this.data.lastReliefClaimAt || 0);
    return Math.max(0, RELIEF_COOLDOWN_MS - elapsed);
  }

  canClaimRelief() {
    return this.getReliefCooldownRemaining() === 0;
  }

  // 救济金每日只能领取一次，避免无限点击刷金币
  claimReliefFund(amount = 150) {
    if (!this.canClaimRelief()) return 0;
    this.data.lastReliefClaimAt = Date.now();
    this.data.totalCoins += amount;
    this.save();
    return amount;
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

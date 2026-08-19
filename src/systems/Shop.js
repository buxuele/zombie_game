import { storage } from './Storage.js';

export const HATS_CATALOG = [
  { id: 'none', name: '经典原生', price: 0, desc: '最纯粹的狂潮僵尸外观' },
  { id: 'top_hat', name: '绅士高帽', price: 150, desc: '优雅从容的深黑绅士礼帽' },
  { id: 'viking', name: '维京牛角盔', price: 300, desc: '狂暴维京战士的双角头盔' },
  { id: 'sombrero', name: '墨西哥宽檐帽', price: 450, desc: '洋溢欢快风情的金黄草帽' },
  { id: 'crown', name: '至尊皇冠', price: 600, desc: '闪耀帝王气场的纯金皇冠' },
  { id: 'space_helmet', name: '宇航员面罩', price: 800, desc: '高科技宇航全景防风面罩' }
];

export const UPGRADES_CATALOG = [
  {
    key: 'startZombies',
    name: '初始军团规模',
    desc: '游戏开始时直接拥有的僵尸数量',
    maxLevel: 4,
    prices: [0, 200, 500, 1000]
  },
  {
    key: 'magnetRadius',
    name: '金币磁力发生器',
    desc: '大幅扩大自动吸附金币与大脑的范围',
    maxLevel: 5,
    prices: [0, 100, 250, 500, 900]
  },
  {
    key: 'transformDuration',
    name: '超能变身增效',
    desc: '延长海啸、机甲与忍者等变身的持续时间',
    maxLevel: 5,
    prices: [0, 150, 350, 700, 1200]
  }
];

export class ShopUI {
  constructor(containerEl, onDataChanged) {
    this.container = containerEl;
    this.onDataChanged = onDataChanged;
    this.currentTab = 'upgrades';
  }

  setTab(tabName) {
    this.currentTab = tabName;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    if (this.currentTab === 'upgrades') {
      this.renderUpgrades();
    } else {
      this.renderHats();
    }
  }

  renderUpgrades() {
    for (const item of UPGRADES_CATALOG) {
      const currentLevel = storage.getUpgradeLevel(item.key);
      const isMax = currentLevel >= item.maxLevel;
      const nextPrice = isMax ? 0 : item.prices[currentLevel];
      const canAfford = storage.data.totalCoins >= nextPrice;

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      card.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-item-level">当前等级: 等级 ${currentLevel} / ${item.maxLevel}</div>
        </div>
        <div>
          ${
            isMax
              ? `<button class="btn btn-disabled">已达满级</button>`
              : `<button class="btn btn-gold btn-upgrade ${canAfford ? '' : 'btn-disabled'}">
                   升级 (${nextPrice} 金币)
                 </button>`
          }
        </div>
      `;

      if (!isMax) {
        const btn = card.querySelector('.btn-upgrade');
        btn.addEventListener('click', () => {
          if (storage.spendCoins(nextPrice)) {
            storage.setUpgradeLevel(item.key, currentLevel + 1);
            logger.shop(`成功升级 ${item.name} 至等级 ${currentLevel + 1}, 消耗 ${nextPrice} 金币`);
            this.render();
            if (this.onDataChanged) this.onDataChanged();
          }
        });
      }

      this.container.appendChild(card);
    }
  }

  renderHats() {
    const equipped = storage.data.equippedHat;

    for (const hat of HATS_CATALOG) {
      const isUnlocked = storage.isHatUnlocked(hat.id);
      const isEquipped = equipped === hat.id;
      const canAfford = storage.data.totalCoins >= hat.price;

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      let actionBtn = '';
      if (isEquipped) {
        actionBtn = `<button class="btn btn-disabled">已装配</button>`;
      } else if (isUnlocked) {
        actionBtn = `<button class="btn btn-primary btn-equip">装配</button>`;
      } else {
        actionBtn = `<button class="btn btn-gold btn-buy ${canAfford ? '' : 'btn-disabled'}">
                       购买 (${hat.price} 金币)
                     </button>`;
      }

      card.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${hat.name}</div>
          <div class="shop-item-desc">${hat.desc}</div>
        </div>
        <div>${actionBtn}</div>
      `;

      if (!isUnlocked) {
        const btn = card.querySelector('.btn-buy');
        if (btn) {
          btn.addEventListener('click', () => {
            if (storage.spendCoins(hat.price)) {
              storage.unlockHat(hat.id);
              storage.equipHat(hat.id);
              logger.shop(`成功购买并装配装扮: ${hat.name}, 消耗 ${hat.price} 金币`);
              this.render();
              if (this.onDataChanged) this.onDataChanged();
            }
          });
        }
      } else if (!isEquipped) {
        const btn = card.querySelector('.btn-equip');
        if (btn) {
          btn.addEventListener('click', () => {
            storage.equipHat(hat.id);
            logger.shop(`已切换装配装扮: ${hat.name}`);
            this.render();
            if (this.onDataChanged) this.onDataChanged();
          });
        }
      }

      this.container.appendChild(card);
    }
  }
}

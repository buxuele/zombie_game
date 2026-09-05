import { storage } from './Storage.js';
import { logger } from './Logger.js';
import { audio } from '../engine/Audio.js';

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
    desc: '开局直接拥有更多僵尸伙伴出征',
    maxLevel: 4,
    prices: [0, 200, 500, 1000],
    statCurrent: (lvl) => `开局军团: ${lvl} 只小僵尸`,
    statNext: (lvl) => `开局军团扩充至 ${lvl + 1} 只出征`
  },
  {
    key: 'feverDuration',
    name: '暴走狂热增幅',
    desc: '大幅延长连续感染触发的无敌狂热冲刺时间',
    maxLevel: 5,
    prices: [0, 150, 350, 650, 1100],
    statCurrent: (lvl) => `狂热时长: ${(4.0 + (lvl - 1) * 1.5).toFixed(1)} 秒`,
    statNext: (lvl) => `狂热时长增至 ${(4.0 + lvl * 1.5).toFixed(1)} 秒`
  },
  {
    key: 'transformDuration',
    name: '超能变身增效',
    desc: '延长海啸、机甲与神龙等变身技能持续时间',
    maxLevel: 5,
    prices: [0, 150, 350, 700, 1200],
    statCurrent: (lvl) => `变身时长加成: +${Math.round((lvl - 1) * 20)}%`,
    statNext: (lvl) => `变身时长加成增至 +${Math.round(lvl * 20)}%`
  },
  {
    key: 'coinMultiplier',
    name: '财源滚滚暴击',
    desc: '拾取路面金币有概率触发双倍暴击金币奖励',
    maxLevel: 5,
    prices: [0, 120, 280, 550, 950],
    statCurrent: (lvl) => `双倍金币概率: ${Math.round((lvl - 1) * 15)}%`,
    statNext: (lvl) => `双倍金币概率增至 ${Math.round(lvl * 15)}%`
  }
];

export class ShopUI {
  constructor(containerEl, onDataChanged) {
    this.container = containerEl;
    this.onDataChanged = onDataChanged;
    this.currentTab = 'upgrades';
    this.previewHat = storage.data.equippedHat || 'none';

    // Merchant mascot state
    this.merchantCanvas = document.getElementById('shop-merchant-canvas');
    this.merchantCtx = this.merchantCanvas ? this.merchantCanvas.getContext('2d') : null;
    this.speechEl = document.getElementById('shop-speech-text');
    this.walletEl = document.getElementById('shop-wallet-coins');
    this.reliefBtn = document.getElementById('btn-shop-relief');

    this.merchantAnimId = null;
    this.merchantBounce = 0;
    this.merchantJoy = 0;
    this.lastDialogueTime = Date.now();

    this.bindEvents();
  }

  bindEvents() {
    // Relief Fund Button
    if (this.reliefBtn) {
      this.reliefBtn.addEventListener('click', () => {
        const newTotal = storage.claimReliefFund(150);
        audio.playCoin();
        this.triggerMerchantJoy();
        const reliefQuotes = [
          '看你可怜，本掌柜私人赞助你150金币启动金。',
          '拿去拿去，这150金币给僵尸弟兄们买肉吃。',
          '掌柜今天心情好，赏你150金币，快去前线杀敌。'
        ];
        this.setSpeech(reliefQuotes[Math.floor(Math.random() * reliefQuotes.length)]);
        this.render();
        if (this.onDataChanged) this.onDataChanged();
      });
    }

    // Interactive Merchant Canvas Poke
    if (this.merchantCanvas) {
      this.merchantCanvas.style.cursor = 'pointer';
      this.merchantCanvas.addEventListener('click', () => {
        this.pokeMerchant();
      });
    }

    const merchantBar = document.getElementById('shop-merchant-bar');
    if (merchantBar) {
      merchantBar.addEventListener('click', (e) => {
        if (e.target !== this.merchantCanvas) {
          this.pokeMerchant();
        }
      });
    }
  }

  setTab(tabName) {
    this.currentTab = tabName;
    this.render();
  }

  setSpeech(text) {
    if (this.speechEl) {
      this.speechEl.textContent = text;
      this.speechEl.classList.remove('speech-pop');
      void this.speechEl.offsetWidth;
      this.speechEl.classList.add('speech-pop');
    }
    this.lastDialogueTime = Date.now();
  }

  triggerMerchantJoy() {
    this.merchantJoy = 1.2;
    this.merchantBounce = 10;
  }

  pokeMerchant() {
    this.merchantBounce = 12;
    audio.playCoin();
    const pokeQuotes = [
      '哎哟别摸我，想打折门儿都没有。',
      '概不赊账，除非你拿一卡车美味平民来换。',
      '戳我没用，快挑个神级基因带僵尸兄弟们冲锋。',
      '本掌柜童叟无欺，少一个铜板都不卖。',
      '外面的大巴车很沉，多升几级带小弟一起推。',
      '金币不够？那就去关卡里多咬几个人。'
    ];
    this.setSpeech(pokeQuotes[Math.floor(Math.random() * pokeQuotes.length)]);
  }

  updateWallet() {
    if (this.walletEl) {
      this.walletEl.textContent = storage.data.totalCoins.toLocaleString();
    }
  }

  startMerchantAnimation() {
    if (this.merchantAnimId) return;

    const tick = () => {
      this.drawMerchant();

      if (this.currentTab === 'hats') {
        this.drawFittingMannequin();
      }

      // Periodically rotate idle merchant quote
      if (Date.now() - this.lastDialogueTime > 7500) {
        const idleQuotes = [
          '客官里面请，全场神级基因，童叟无欺。',
          '刚从前线搜刮回来的好货，走过路过别错过。',
          '提升战力才是硬道理，多带几只小弟出征更威风。',
          '听说前面的重型坦克很硬，多升几级直接碾碎它。'
        ];
        this.setSpeech(idleQuotes[Math.floor(Math.random() * idleQuotes.length)]);
      }

      this.merchantAnimId = requestAnimationFrame(tick);
    };
    this.merchantAnimId = requestAnimationFrame(tick);
  }

  stopMerchantAnimation() {
    if (this.merchantAnimId) {
      cancelAnimationFrame(this.merchantAnimId);
      this.merchantAnimId = null;
    }
  }

  drawMerchant() {
    if (!this.merchantCtx || !this.merchantCanvas) return;
    const ctx = this.merchantCtx;
    const w = this.merchantCanvas.width;
    const h = this.merchantCanvas.height;
    const now = Date.now();

    ctx.clearRect(0, 0, w, h);

    if (this.merchantBounce > 0) {
      this.merchantBounce *= 0.88;
      if (this.merchantBounce < 0.1) this.merchantBounce = 0;
    }
    if (this.merchantJoy > 0) {
      this.merchantJoy -= 0.02;
    }

    const breathing = Math.sin(now * 0.005) * 1.8;
    const cx = w / 2;
    const cy = h / 2 + 10 - this.merchantBounce + breathing;

    ctx.save();
    ctx.translate(cx, cy);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Purple Waistcoat)
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.roundRect(-10, 2, 20, 16, 4);
    ctx.fill();

    // Golden buttons
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 6, 1.4, 0, Math.PI * 2);
    ctx.arc(0, 11, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Chibi Green Head
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.roundRect(-13, -20, 26, 22, [8, 8, 6, 6]);
    ctx.fill();

    // Greedy Hand Rubbing or Joy Hands
    if (this.merchantJoy > 0) {
      // Hands up in joy
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(-12, -2, 3.5, 0, Math.PI * 2);
      ctx.arc(12, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Greedy rubbing hands
      const rub = Math.sin(now * 0.01) * 3;
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(-3 + rub, 8, 3, 0, Math.PI * 2);
      ctx.arc(3 - rub, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, -11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.arc(5.5, -11, 2, 0, Math.PI * 2);
    ctx.fill();

    // Left Eye with Monocle (单片眼镜)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.arc(-4.5, -11, 2, 0, Math.PI * 2);
    ctx.fill();

    // Monocle Gold Frame
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-5, -11, 5, 0, Math.PI * 2);
    ctx.stroke();

    // Monocle Chain dangling
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.quadraticCurveTo(-9, 0, -8, 6);
    ctx.stroke();

    // Crafty Smirk Mouth
    ctx.strokeStyle = '#15181e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -3, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Dapper Top Hat on Merchant
    ctx.fillStyle = '#15181e';
    ctx.fillRect(-14, -22, 28, 3.5);
    ctx.fillRect(-9, -35, 18, 14);
    // Gold hat band
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-9, -24, 18, 3);

    ctx.restore();
  }

  drawFittingMannequin() {
    const canvas = document.getElementById('shop-fitting-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const now = Date.now();

    ctx.clearRect(0, 0, w, h);

    const bob = Math.sin(now * 0.004) * 1.5;
    const cx = w / 2;
    const cy = h - 22 + bob;

    ctx.save();
    ctx.translate(cx, cy);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red Shirt Torso
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(-10, -26, 20, 20, 4);
    ctx.fill();

    // Blue Pants
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(-8, -6, 6, 8);
    ctx.fillRect(2, -6, 6, 8);

    // Chibi Head
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(0, -38, 15, 0, Math.PI * 2);
    ctx.fill();

    // Cute Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -40, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(5.5, -40, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cute Mouth
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.arc(3, -32, 3.5, 0, Math.PI);
    ctx.fill();

    // Draw Previewed Hat
    this.drawHatOnCanvas(ctx, this.previewHat, -38);

    ctx.restore();
  }

  drawHatOnCanvas(ctx, hatId, headCenterY) {
    if (!hatId || hatId === 'none') return;

    if (hatId === 'top_hat') {
      ctx.fillStyle = '#15181e';
      ctx.fillRect(-15, headCenterY - 14, 30, 3.5);
      ctx.fillRect(-9, headCenterY - 30, 18, 16);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-9, headCenterY - 17, 18, 3);
    } else if (hatId === 'viking') {
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, headCenterY - 6, 15, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f39c12';
      // Left horn
      ctx.beginPath();
      ctx.moveTo(-13, headCenterY - 8);
      ctx.lineTo(-22, headCenterY - 20);
      ctx.lineTo(-10, headCenterY - 14);
      ctx.fill();
      // Right horn
      ctx.beginPath();
      ctx.moveTo(13, headCenterY - 8);
      ctx.lineTo(22, headCenterY - 20);
      ctx.lineTo(10, headCenterY - 14);
      ctx.fill();
    } else if (hatId === 'sombrero') {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.ellipse(0, headCenterY - 10, 24, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.arc(0, headCenterY - 14, 11, Math.PI, 0);
      ctx.fill();
    } else if (hatId === 'crown') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-12, headCenterY - 10);
      ctx.lineTo(-14, headCenterY - 22);
      ctx.lineTo(-6, headCenterY - 15);
      ctx.lineTo(0, headCenterY - 24);
      ctx.lineTo(6, headCenterY - 15);
      ctx.lineTo(14, headCenterY - 22);
      ctx.lineTo(12, headCenterY - 10);
      ctx.closePath();
      ctx.fill();
      // Rubies
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, headCenterY - 18, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (hatId === 'space_helmet') {
      ctx.fillStyle = 'rgba(236, 240, 241, 0.45)';
      ctx.strokeStyle = '#95a5a6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, headCenterY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  render() {
    this.updateWallet();
    this.container.innerHTML = '';
    this.startMerchantAnimation();

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

      // Build 5 level pills
      let pipsHtml = '<div class="shop-level-pips">';
      for (let i = 1; i <= item.maxLevel; i++) {
        pipsHtml += `<span class="pip ${i <= currentLevel ? 'active' : ''}"></span>`;
      }
      pipsHtml += '</div>';

      const statCurrText = item.statCurrent ? item.statCurrent(currentLevel) : `当前等级: 等级 ${currentLevel}`;
      const statNextText = isMax
        ? '已达终极形态'
        : (item.statNext ? item.statNext(currentLevel) : `下级消耗 ${nextPrice} 金币`);

      let actionBtnHtml = '';
      if (isMax) {
        actionBtnHtml = '<button class="btn btn-disabled">已达满级</button>';
      } else if (canAfford) {
        actionBtnHtml = `<button class="btn btn-gold btn-upgrade">升级 (${nextPrice} 金币)</button>`;
      } else {
        actionBtnHtml = `<button class="btn btn-gold btn-upgrade btn-need-coins">升级 (${nextPrice} 金币)</button>`;
      }

      card.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-stat-preview">${statCurrText} &rarr; <span class="stat-next">${statNextText}</span></div>
          ${pipsHtml}
        </div>
        <div class="shop-item-action">
          ${actionBtnHtml}
        </div>
      `;

      if (!isMax) {
        const btn = card.querySelector('.btn-upgrade');
        btn.addEventListener('click', () => {
          if (storage.data.totalCoins < nextPrice) {
            // Insufficient coins feedback
            audio.playBuyFail();
            card.classList.remove('shop-card-shake');
            void card.offsetWidth;
            card.classList.add('shop-card-shake');

            const diff = nextPrice - storage.data.totalCoins;
            const lackQuotes = [
              `咳咳，客官囊中羞涩呀，还差 ${diff} 金币呢。`,
              '金币不够还想白嫖，快去关卡里多捡点金币再来。',
              '哎呀差一点点，前线多吃两个人就够啦。',
              '兜里比脸还干净，本掌柜概不赊账哦。'
            ];
            this.setSpeech(lackQuotes[Math.floor(Math.random() * lackQuotes.length)]);
            return;
          }

          if (storage.spendCoins(nextPrice)) {
            storage.setUpgradeLevel(item.key, currentLevel + 1);
            if (logger && logger.shop) {
              logger.shop(`成功升级 ${item.name} 至等级 ${currentLevel + 1}, 消耗 ${nextPrice} 金币`);
            }
            audio.playUpgradeSuccess();
            this.triggerMerchantJoy();

            const successQuotes = [
              '哇咔咔，老板大气，这波战力直接爆表。',
              '成交，这一级升得太值了，前方坦克见你都得绕道。',
              '爽快，金币到手神力归你，合作愉快。',
              '绝了，你的僵尸军团现在强得可怕。'
            ];
            this.setSpeech(successQuotes[Math.floor(Math.random() * successQuotes.length)]);

            this.render();
            if (this.onDataChanged) this.onDataChanged();
          }
        });
      }

      this.container.appendChild(card);
    }
  }

  renderHats() {
    const equipped = storage.data.equippedHat || 'none';

    // Top Fitting Room Showcase
    const fittingWrap = document.createElement('div');
    fittingWrap.className = 'shop-fitting-banner';
    fittingWrap.innerHTML = `
      <canvas id="shop-fitting-canvas" width="100" height="90"></canvas>
      <div class="shop-fitting-info">
        <div class="shop-fitting-title">装扮试穿镜</div>
        <div class="shop-fitting-sub">点击下方装扮立即在魔镜中试穿预览，心仪即可一键装配</div>
      </div>
    `;
    this.container.appendChild(fittingWrap);

    for (const hat of HATS_CATALOG) {
      const isUnlocked = storage.isHatUnlocked(hat.id);
      const isEquipped = equipped === hat.id;
      const canAfford = storage.data.totalCoins >= hat.price;

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      let actionBtn = '';
      if (isEquipped) {
        actionBtn = '<button class="btn btn-disabled">已装配</button>';
      } else if (isUnlocked) {
        actionBtn = '<button class="btn btn-primary btn-equip">换上装扮</button>';
      } else if (canAfford) {
        actionBtn = `<button class="btn btn-gold btn-buy">购买 (${hat.price} 金币)</button>`;
      } else {
        actionBtn = `<button class="btn btn-gold btn-buy btn-need-coins">购买 (${hat.price} 金币)</button>`;
      }

      card.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${hat.name}</div>
          <div class="shop-item-desc">${hat.desc}</div>
        </div>
        <div class="shop-item-action">${actionBtn}</div>
      `;

      // Hover / Click to preview hat in fitting mirror
      card.addEventListener('mouseenter', () => {
        this.previewHat = hat.id;
      });
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.previewHat = hat.id;
        }
      });

      if (!isUnlocked) {
        const btn = card.querySelector('.btn-buy');
        if (btn) {
          btn.addEventListener('click', () => {
            this.previewHat = hat.id;
            if (storage.data.totalCoins < hat.price) {
              audio.playBuyFail();
              card.classList.remove('shop-card-shake');
              void card.offsetWidth;
              card.classList.add('shop-card-shake');
              const diff = hat.price - storage.data.totalCoins;
              this.setSpeech(`这顶帅气的帽子还差 ${diff} 金币，快去捡金币吧。`);
              return;
            }

            if (storage.spendCoins(hat.price)) {
              storage.unlockHat(hat.id);
              storage.equipHat(hat.id);
              this.previewHat = hat.id;
              if (logger && logger.shop) {
                logger.shop(`成功购买并装配装扮: ${hat.name}, 消耗 ${hat.price} 金币`);
              }
              audio.playUpgradeSuccess();
              this.triggerMerchantJoy();
              this.setSpeech(`客官太有品味了，戴上 ${hat.name} 走在路上回头率拉满。`);
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
            this.previewHat = hat.id;
            if (logger && logger.shop) {
              logger.shop(`已切换装配装扮: ${hat.name}`);
            }
            audio.playCoin();
            this.setSpeech(`已换上 ${hat.name}，英姿飒爽。`);
            this.render();
            if (this.onDataChanged) this.onDataChanged();
          });
        }
      }

      this.container.appendChild(card);
    }
  }
}

import { storage } from './Storage.js';
import { audio } from '../engine/Audio.js';

const CARD_PRIZES = [
  { icon: 'GOLD', label: '黄金', name: '特等奖 400 金币', coins: 400 },
  { icon: 'COIN', label: '金币', name: '一等奖 250 金币', coins: 250 },
  { icon: 'TSUNAMI', label: '海啸', name: '二等奖 180 金币', coins: 180 },
  { icon: 'ZOMBIE', label: '僵尸', name: '幸运奖 120 金币', coins: 120 }
];

export class ScratchCardGame {
  constructor(resultCanvas, coverCanvas, msgEl, walletEl, onDataChanged) {
    this.resultCanvas = resultCanvas;
    this.coverCanvas = coverCanvas;
    this.resultCtx = resultCanvas.getContext('2d');
    this.coverCtx = coverCanvas.getContext('2d');
    this.msgEl = msgEl;
    this.walletEl = walletEl;
    this.onDataChanged = onDataChanged;

    this.width = resultCanvas.width;
    this.height = resultCanvas.height;

    this.isScratching = false;
    this.isCompleted = false;
    this.currentSlots = [];
    this.revealedPercent = 0;

    this.initEvents();
    this.resetCard(false);
  }

  initEvents() {
    const scratch = (e) => {
      if (!this.isScratching || this.isCompleted) return;
      const rect = this.coverCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = ((clientX - rect.left) / rect.width) * this.width;
      const y = ((clientY - rect.top) / rect.height) * this.height;

      this.scratchAt(x, y);
    };

    this.coverCanvas.addEventListener('mousedown', (e) => {
      this.isScratching = true;
      scratch(e);
    });

    window.addEventListener('mouseup', () => {
      if (this.isScratching) {
        this.isScratching = false;
        this.checkProgress();
      }
    });

    this.coverCanvas.addEventListener('mousemove', scratch);

    this.coverCanvas.addEventListener('touchstart', (e) => {
      this.isScratching = true;
      scratch(e);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.isScratching) {
        this.isScratching = false;
        this.checkProgress();
      }
    });

    this.coverCanvas.addEventListener('touchmove', scratch, { passive: true });
  }

  scratchAt(x, y) {
    this.coverCtx.save();
    this.coverCtx.globalCompositeOperation = 'destination-out';
    this.coverCtx.beginPath();
    this.coverCtx.arc(x, y, 22, 0, Math.PI * 2);
    this.coverCtx.fill();
    this.coverCtx.restore();
  }

  resetCard(deductCost = true) {
    if (deductCost) {
      if (!storage.spendCoins(100)) {
        this.msgEl.textContent = '金币不足，需 100 金币';
        this.msgEl.style.color = '#e74c3c';
        return false;
      }
      if (this.onDataChanged) this.onDataChanged();
    }

    this.isCompleted = false;
    this.revealedPercent = 0;
    this.msgEl.textContent = '移动鼠标刮开灰色涂层';
    this.msgEl.style.color = '#f1c40f';
    this.updateWallet();

    // 1. Generate 3 slot items
    const isJackpot = Math.random() < 0.35;
    const isPair = Math.random() < 0.6;

    if (isJackpot) {
      const chosen = CARD_PRIZES[Math.floor(Math.random() * CARD_PRIZES.length)];
      this.currentSlots = [chosen, chosen, chosen];
    } else if (isPair) {
      const chosen = CARD_PRIZES[Math.floor(Math.random() * CARD_PRIZES.length)];
      const other = CARD_PRIZES.filter(p => p.icon !== chosen.icon)[0];
      this.currentSlots = [chosen, chosen, other];
    } else {
      this.currentSlots = [
        CARD_PRIZES[0],
        CARD_PRIZES[1],
        CARD_PRIZES[2]
      ];
    }

    // 2. Draw Result Canvas
    this.drawResultCanvas();

    // 3. Draw Silver Scratch Coating
    this.drawCoverCoating();

    return true;
  }

  drawResultCanvas() {
    const ctx = this.resultCtx;
    ctx.fillStyle = '#1e222b';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw 3 prize boxes
    const boxWidth = 90;
    const boxHeight = 110;
    const startX = 35;
    const gap = 20;

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (boxWidth + gap);
      const by = 45;

      ctx.fillStyle = '#252a36';
      ctx.strokeStyle = '#3e88f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.stroke();

      // Icon & Text
      const prize = this.currentSlots[i];
      ctx.fillStyle = '#f1c40f';
      ctx.font = `900 28px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prize.icon.substring(0, 1), bx + boxWidth / 2, by + 45);

      ctx.fillStyle = '#f3f5f9';
      ctx.font = `700 13px 'Outfit', sans-serif`;
      ctx.fillText(prize.label, bx + boxWidth / 2, by + 85);
    }
  }

  drawCoverCoating() {
    const ctx = this.coverCtx;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Silver metallic gradient coating
    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, '#7f8c8d');
    grad.addColorStop(0.5, '#bdc3c7');
    grad.addColorStop(1, '#95a5a6');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Decorative grid pattern & label
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    ctx.fillStyle = '#2c3e50';
    ctx.font = `900 18px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮奖区 刮开看大奖', this.width / 2, this.height / 2);

    ctx.restore();
  }

  checkProgress() {
    if (this.isCompleted) return;

    // Sample pixels to compute scratched percentage
    const imgData = this.coverCtx.getImageData(0, 0, this.width, this.height);
    let transparentPixels = 0;
    const totalPixels = imgData.data.length / 4;
    const step = 8; // sampling step for high performance

    for (let i = 3; i < imgData.data.length; i += 4 * step) {
      if (imgData.data[i] === 0) {
        transparentPixels++;
      }
    }

    const ratio = transparentPixels / (totalPixels / step);
    if (ratio > 0.45) {
      this.completeScratch();
    }
  }

  completeScratch() {
    if (this.isCompleted) return;
    this.isCompleted = true;

    // Clear entire cover coating
    this.coverCtx.clearRect(0, 0, this.width, this.height);

    // Check Match
    const [s1, s2, s3] = this.currentSlots;
    let rewardCoins = 0;

    if (s1.icon === s2.icon && s2.icon === s3.icon) {
      // 3 Match Jackpot
      rewardCoins = s1.coins;
      this.msgEl.textContent = `三连绝胜! 获得 ${s1.name}`;
      this.msgEl.style.color = '#2ecc71';
      audio.playCoin();
    } else if (s1.icon === s2.icon || s2.icon === s3.icon || s1.icon === s3.icon) {
      // 2 Match Minor Prize
      rewardCoins = 140;
      this.msgEl.textContent = '双连匹配! 获得 140 金币';
      this.msgEl.style.color = '#f1c40f';
      audio.playCoin();
    } else {
      rewardCoins = 40;
      this.msgEl.textContent = '鼓励奖 获得 40 金币';
      this.msgEl.style.color = '#9aa5b8';
      audio.playCoin();
    }

    if (rewardCoins > 0) storage.addCoins(rewardCoins);

    this.updateWallet();
    if (this.onDataChanged) this.onDataChanged();
  }

  updateWallet() {
    if (this.walletEl) {
      this.walletEl.textContent = `拥有: ${storage.data.totalCoins} 金币`;
    }
  }
}

import { storage } from './Storage.js';
import { audio } from '../engine/Audio.js';

export class MissionsUI {
  constructor(containerEl, onDataChanged) {
    this.container = containerEl;
    this.onDataChanged = onDataChanged;
  }

  render() {
    this.container.innerHTML = '';
    const missions = storage.getMissionProgress();
    const totalBrains = storage.data.totalBrains || 0;

    // Brain Trophy Milestone Showcase Header
    const trophyHeader = document.createElement('div');
    trophyHeader.className = 'trophy-showcase';
    trophyHeader.style.cssText = 'background: #1e222b; border: 1px solid #2d3342; border-radius: 12px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;';

    const trophyStage = totalBrains >= 500 ? '地球主宰传奇金杯' : (totalBrains >= 200 ? '狂暴天灾银杯' : (totalBrains >= 50 ? '丧尸领军铜杯' : '初出茅庐勋章'));
    const nextTarget = totalBrains >= 500 ? 1000 : (totalBrains >= 200 ? 500 : (totalBrains >= 50 ? 200 : 50));
    const trophyPercent = Math.min(100, Math.floor((totalBrains / nextTarget) * 100));

    trophyHeader.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #ffffff; font-size: 15px;">大脑里程碑奖杯: <span style="color: #ff4081;">${trophyStage}</span></div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">累计捕获大脑: ${totalBrains} / ${nextTarget} (${trophyPercent}%)</div>
        <div class="mission-progress-bar" style="margin-top: 8px; width: 260px;">
          <div class="mission-progress-fill" style="width: ${trophyPercent}%; background: #ff4081;"></div>
        </div>
      </div>
      <div style="font-size: 14px; color: #ff4081; font-weight: 700;">BRAIN TROPHY</div>
    `;
    this.container.appendChild(trophyHeader);

    for (const m of missions) {
      const card = document.createElement('div');
      card.className = 'mission-card';

      const percent = Math.min(100, Math.floor((m.current / m.target) * 100));

      let actionBtn = '';
      if (m.claimed) {
        actionBtn = `<button class="btn btn-disabled">已领取</button>`;
      } else if (m.completed) {
        actionBtn = `<button class="btn btn-primary btn-claim" data-id="${m.id}">领取 ${m.reward} 金币</button>`;
      } else {
        actionBtn = `<button class="btn btn-disabled">${m.reward} 金币</button>`;
      }

      card.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${m.title}</div>
          <div class="shop-item-desc">进度: ${m.current} / ${m.target} (${percent}%)</div>
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
        <div>${actionBtn}</div>
      `;

      if (m.completed && !m.claimed) {
        const btn = card.querySelector('.btn-claim');
        if (btn) {
          btn.addEventListener('click', () => {
            const reward = storage.claimMissionReward(m.id);
            if (reward > 0) {
              audio.playBrain();
              this.render();
              if (this.onDataChanged) this.onDataChanged();
            }
          });
        }
      }

      this.container.appendChild(card);
    }
  }
}

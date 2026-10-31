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
    const highScore = storage.data.highScoreDistance || 0;

    // Distance Trophy Milestone Showcase Header
    const trophyHeader = document.createElement('div');
    trophyHeader.className = 'trophy-showcase';

    const trophyStage = highScore >= 2000 ? '地球主宰传奇金杯' : (highScore >= 1000 ? '狂暴天灾银杯' : (highScore >= 400 ? '丧尸领军铜杯' : '初出茅庐勋章'));
    const nextTarget = highScore >= 2000 ? 5000 : (highScore >= 1000 ? 2000 : (highScore >= 400 ? 1000 : 400));
    const trophyPercent = Math.min(100, Math.floor((highScore / nextTarget) * 100));

    trophyHeader.innerHTML = `
      <div class="trophy-info">
        <div class="trophy-title">远征里程碑奖杯: <strong>${trophyStage}</strong></div>
        <div class="trophy-sub">最高奔跑纪录: ${highScore} / ${nextTarget} m，完成度 ${trophyPercent}%</div>
        <div class="mission-progress-bar trophy-bar">
          <div class="mission-progress-fill trophy-fill" style="width: ${trophyPercent}%;"></div>
        </div>
      </div>
      <div class="trophy-badge">远征奖杯</div>
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
              audio.playCoin();
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

import { Game } from './engine/Game.js';
import { storage } from './systems/Storage.js';
import { audio } from './engine/Audio.js';
import { logger } from './systems/Logger.js';
import { assets } from './engine/AssetLoader.js';
import { ShopUI } from './systems/Shop.js';
import { ScratchCardGame } from './systems/ScratchCard.js';
import { MissionsUI } from './systems/Missions.js';
import { biomeManager } from './systems/BiomeManager.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');
  
  // UI Overlays
  const hudOverlay = document.getElementById('hud-overlay');
  const mainMenuScreen = document.getElementById('main-menu-screen');
  const shopModal = document.getElementById('shop-modal');
  const scratchModal = document.getElementById('scratch-modal');
  const missionsModal = document.getElementById('missions-modal');
  const pauseModal = document.getElementById('pause-modal');
  const gameOverModal = document.getElementById('game-over-modal');

  // Log Drawer Elements
  const logDrawer = document.getElementById('log-console-drawer');
  const logEntriesList = document.getElementById('log-entries-list');
  const btnToggleLogMenu = document.getElementById('btn-toggle-log-menu');
  const btnCloseLogDrawer = document.getElementById('btn-close-log-drawer');

  // In-Game HUD Action Buttons
  const btnHudPause = document.getElementById('btn-hud-pause');
  const btnHudSound = document.getElementById('btn-hud-sound');
  const btnHudLog = document.getElementById('btn-hud-log');

  // HUD Elements
  const hudCoins = document.getElementById('hud-coins');
  const hudZombies = document.getElementById('hud-zombies');
  const hudDistance = document.getElementById('hud-distance');
  const transformBarContainer = document.getElementById('transform-bar-container');
  const transformTitle = document.getElementById('transform-title');
  const transformProgressFill = document.getElementById('transform-progress-fill');

  // Menu Elements
  const menuTotalCoins = document.getElementById('menu-total-coins');
  const menuHighScore = document.getElementById('menu-high-score');
  const btnToggleSoundMenu = document.getElementById('btn-toggle-sound-menu');
  const btnToggleSoundPause = document.getElementById('btn-toggle-sound-pause');

  // Game Over Elements
  const goDistance = document.getElementById('go-distance');
  const goCoins = document.getElementById('go-coins');
  const goVehicles = document.getElementById('go-vehicles');
  const goEvaluationBadge = document.getElementById('go-evaluation-badge');
  const goDeathReason = document.getElementById('go-death-reason');
  const goNewRecordBanner = document.getElementById('go-new-record-banner');
  const goMascotCanvas = document.getElementById('go-mascot-canvas');
  const goMascotHint = document.getElementById('go-mascot-hint');
  const btnOpenScratchGameover = document.getElementById('btn-open-scratch-gameover');

  // Interactive Dizzy Mascot on Game Over
  let mascotPokeCount = 0;
  let mascotBounce = 0;
  let mascotSpeech = '';
  let mascotSpeechTimer = 0;
  let mascotAnimId = null;

  const mascotQuotes = [
    '哎哟！别戳了，脑花都散了！',
    '刚才起跳如果多用点力就好了！',
    '谁把红绿灯立在路中间的？',
    '再来一口脑花，我还能掀翻卡车！',
    '下次出征记得多招揽几个小弟！',
    '今天天气不错，适合躺平休息。'
  ];

  function startMascotAnimation() {
    if (mascotAnimId) cancelAnimationFrame(mascotAnimId);
    let lastT = performance.now();

    function loop(now) {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (mascotBounce > 0) {
        mascotBounce = Math.max(0, mascotBounce - dt * 4);
      }
      if (mascotSpeechTimer > 0) {
        mascotSpeechTimer -= dt;
      }

      renderDizzyMascot(now);
      mascotAnimId = requestAnimationFrame(loop);
    }
    mascotAnimId = requestAnimationFrame(loop);
  }

  function stopMascotAnimation() {
    if (mascotAnimId) {
      cancelAnimationFrame(mascotAnimId);
      mascotAnimId = null;
    }
  }

  function renderDizzyMascot(timeMs) {
    if (!goMascotCanvas) return;
    const ctx = goMascotCanvas.getContext('2d');
    const w = goMascotCanvas.width;
    const h = goMascotCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const bounceY = Math.sin(mascotBounce * Math.PI) * 12;
    const centerX = w / 2;
    const centerY = h / 2 + 10 - bounceY;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 1. Shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 28 - bounceY * 0.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Knocked-down Zombie Body
    ctx.save();
    ctx.rotate(0.12 * Math.sin(timeMs * 0.004));

    // Red ragged shirt body
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(-16, 2, 32, 22, 6);
    ctx.fill();

    // Blue pants and floppy legs
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(-12, 20, 10, 8);
    ctx.fillRect(2, 20, 10, 8);

    // Cute Green Big Chibi Head
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.roundRect(-22, -26, 44, 30, [12, 12, 8, 8]);
    ctx.fill();

    // Cartoon Band-Aid across forehead
    ctx.save();
    ctx.translate(-4, -20);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#f5b041';
    ctx.fillRect(-8, -3, 16, 6);
    ctx.fillStyle = '#eb984e';
    ctx.fillRect(-2, -3, 4, 6);
    ctx.restore();

    // Dizzy Spinning Spiral Eyes
    const eyeSpin = timeMs * 0.008;
    // Left Eye
    ctx.save();
    ctx.translate(-10, -12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15181e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.5; a += 0.2) {
      const r = (a / (Math.PI * 3.5)) * 5;
      const ex = Math.cos(a + eyeSpin) * r;
      const ey = Math.sin(a + eyeSpin) * r;
      if (a === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.restore();

    // Right Eye
    ctx.save();
    ctx.translate(10, -12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15181e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.5; a += 0.2) {
      const r = (a / (Math.PI * 3.5)) * 5;
      const ex = Math.cos(a - eyeSpin) * r;
      const ey = Math.sin(a - eyeSpin) * r;
      if (a === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.restore();

    // Derpy Open Mouth with hanging pink tongue
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.ellipse(0, -2, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pink Tongue
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.arc(1, 2, 4, 0, Math.PI);
    ctx.fill();

    ctx.restore();

    // 3. Orbiting Dizzy Yellow Stars
    for (let i = 0; i < 3; i++) {
      const starAngle = timeMs * 0.005 + (i * Math.PI * 2) / 3;
      const starX = Math.cos(starAngle) * 26;
      const starY = -34 + Math.sin(starAngle) * 7;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(starX, starY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Speech Bubble when poked
    if (mascotSpeechTimer > 0 && mascotSpeech) {
      ctx.save();
      ctx.fillStyle = 'rgba(21, 24, 30, 0.95)';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.font = "700 11px 'Outfit', sans-serif";
      const textW = ctx.measureText(mascotSpeech).width;
      const bw = textW + 16;
      const bh = 22;
      const bx = -bw / 2;
      const by = -62;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // Little arrow pointing down
      ctx.beginPath();
      ctx.moveTo(-4, by + bh);
      ctx.lineTo(0, by + bh + 4);
      ctx.lineTo(4, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mascotSpeech, 0, by + bh / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  if (goMascotCanvas) {
    goMascotCanvas.addEventListener('click', () => {
      mascotPokeCount++;
      mascotBounce = 1.0;
      mascotSpeech = mascotQuotes[mascotPokeCount % mascotQuotes.length];
      mascotSpeechTimer = 2.2;
      if (goMascotHint) {
        goMascotHint.textContent = `已戳晕小僵尸 ${mascotPokeCount} 次`;
      }
      audio.playScoreRoll();
    });
  }

  function getGameOverEvaluation(stats) {
    const dist = stats.distance || 0;
    const vehicles = stats.vehicles || 0;

    let badge = 'C 落地成盒';
    let reason = '还没热身就被路障当场劝退，建议先去商店补钙。';

    if (dist >= 1200 || vehicles >= 10) {
      badge = 'SSS 绝世尸王';
      reason = `狂奔 ${dist} 米横扫全城，交警与保险公司全员连夜撤离！`;
    } else if (dist >= 800 || vehicles >= 6) {
      badge = 'SS 拆迁特遣队';
      reason = `沿途掀翻 ${vehicles} 辆载具，本市修车厂全员加班抢修！`;
    } else if (dist >= 500) {
      badge = 'A+ 街区破坏狂';
      reason = `狂暴突进 ${dist} 米，因速度过快惯性失控导致失足！`;
    } else if (dist >= 300) {
      badge = 'A 暴走先锋';
      reason = '跳得太高没看清落点，一头扎进了路面深坑。';
    } else if (dist >= 150) {
      badge = 'B 慢速尸体';
      reason = '遇到障碍时犹豫了一秒，惨遭小汽车倒车入库碾压。';
    }

    return { badge, reason };
  }

  function updateMenuStats() {
    menuTotalCoins.textContent = storage.data.totalCoins;
    menuHighScore.textContent = `${storage.data.highScoreDistance} m`;

    const soundText = storage.isSoundEnabled() ? '声音 开' : '声音 关';
    btnToggleSoundMenu.textContent = soundText;
    btnToggleSoundPause.textContent = soundText;
    if (btnHudSound) btnHudSound.textContent = soundText;
  }

  function showScreen(screen) {
    mainMenuScreen.style.display = 'none';
    shopModal.style.display = 'none';
    scratchModal.style.display = 'none';
    missionsModal.style.display = 'none';
    pauseModal.style.display = 'none';
    gameOverModal.style.display = 'none';

    if (screen !== gameOverModal) {
      stopMascotAnimation();
    }

    if (screen) {
      screen.style.display = 'flex';
    }
  }

  // Realtime Log Subscription
  logger.subscribe((entry) => {
    if (!logEntriesList) return;
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML = `
      <span class="log-time">${entry.time}</span>
      <span class="log-tag log-tag-${entry.category}">[${entry.category}]</span>
      <span class="log-msg">${entry.message}</span>
    `;
    logEntriesList.appendChild(row);
    if (logEntriesList.children.length > 50) {
      logEntriesList.removeChild(logEntriesList.firstChild);
    }
    logEntriesList.scrollTop = logEntriesList.scrollHeight;
  });

  function toggleLogDrawer() {
    const isShown = logDrawer.style.display === 'flex';
    logDrawer.style.display = isShown ? 'none' : 'flex';
    logger.system(`调试日志面板: ${isShown ? '关闭' : '展开'}`);
  }

  btnToggleLogMenu.addEventListener('click', toggleLogDrawer);
  if (btnHudLog) btnHudLog.addEventListener('click', toggleLogDrawer);
  btnCloseLogDrawer.addEventListener('click', () => {
    logDrawer.style.display = 'none';
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyL') {
      toggleLogDrawer();
    }
  });

  // Roll numbers in Game Over screen
  function animateRollNumber(element, targetValue, suffix = '', duration = 800) {
    const startTime = performance.now();
    function tick(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.floor(progress * targetValue);
      element.textContent = `${current}${suffix}`;
      if (progress < 1) {
        if (Math.random() > 0.4) audio.playScoreRoll();
        requestAnimationFrame(tick);
      } else {
        element.textContent = `${targetValue}${suffix}`;
      }
    }
    requestAnimationFrame(tick);
  }

  // Initialize UI Managers
  const shopUI = new ShopUI(
    document.getElementById('shop-list-container'),
    () => updateMenuStats()
  );

  const missionsUI = new MissionsUI(
    document.getElementById('missions-list-container'),
    () => updateMenuStats()
  );

  const scratchCardGame = new ScratchCardGame(
    document.getElementById('scratch-result-canvas'),
    document.getElementById('scratch-cover-canvas'),
    document.getElementById('scratch-result-message'),
    document.getElementById('scratch-wallet-coins'),
    () => updateMenuStats()
  );

  // Initialize Game Instance
  const game = new Game(canvas, {
    onHudUpdate: (stats) => {
      hudCoins.textContent = stats.coins;
      hudZombies.textContent = stats.zombies;
      hudDistance.textContent = `${stats.distance} m`;

      if (stats.transformActive) {
        transformBarContainer.style.display = 'flex';
        transformTitle.textContent = stats.transformName;
        transformProgressFill.style.width = `${Math.floor(stats.transformProgress * 100)}%`;

        if (stats.transformExpiring) {
          transformBarContainer.classList.add('transform-warning-pulse');
        } else {
          transformBarContainer.classList.remove('transform-warning-pulse');
        }
      } else {
        transformBarContainer.style.display = 'none';
        transformBarContainer.classList.remove('transform-warning-pulse');
      }
    },
    onCurrencyPunch: (type) => {
      const targetPill = hudCoins.parentElement;
      if (targetPill) {
        targetPill.classList.remove('hud-pill-punch');
        void targetPill.offsetWidth; // Trigger reflow
        targetPill.classList.add('hud-pill-punch');
      }
    },
    onPauseChanged: (isPaused) => {
      pauseModal.style.display = isPaused ? 'flex' : 'none';
      if (btnHudPause) {
        btnHudPause.textContent = isPaused ? '继续' : '暂停';
      }
    },
    onSoundToggled: (enabled) => {
      updateMenuStats();
    },
    onGameOver: (stats) => {
      hudOverlay.style.display = 'none';
      showScreen(gameOverModal);

      // Slot-machine animated number roll
      animateRollNumber(goDistance, stats.distance, ' m');
      animateRollNumber(goCoins, stats.coins);
      animateRollNumber(goVehicles, stats.vehicles);

      // Evaluation & Humorous Death Reason
      const evaluation = getGameOverEvaluation(stats);
      if (goEvaluationBadge) goEvaluationBadge.textContent = evaluation.badge;
      if (goDeathReason) goDeathReason.textContent = evaluation.reason;

      // New Record Flag
      if (goNewRecordBanner) {
        goNewRecordBanner.style.display = stats.isNewRecord ? 'block' : 'none';
      }

      // Reset Mascot Poke state and start animation
      mascotPokeCount = 0;
      mascotBounce = 0;
      mascotSpeech = '';
      mascotSpeechTimer = 0;
      if (goMascotHint) goMascotHint.textContent = '戳一下晕倒的小僵尸';
      startMascotAnimation();

      if (stats.isNewRecord) {
        game.particles.spawnConfetti(window.innerWidth, window.innerHeight);
      }

      updateMenuStats();
    }
  });
  window.game = game;

  // In-Game HUD Buttons
  if (btnHudPause) {
    btnHudPause.addEventListener('click', () => {
      game.togglePause();
    });
  }

  if (btnHudSound) {
    btnHudSound.addEventListener('click', () => {
      const enabled = storage.toggleSound();
      audio.setSoundEnabled(enabled);
      updateMenuStats();
    });
  }

  // Main Menu Buttons
  document.getElementById('btn-start-game').addEventListener('click', () => {
    showScreen(null);
    hudOverlay.style.display = 'block';
    game.start();
  });

  document.getElementById('btn-open-shop').addEventListener('click', () => {
    shopUI.render();
    showScreen(shopModal);
  });

  document.getElementById('btn-close-shop').addEventListener('click', () => {
    showScreen(mainMenuScreen);
    updateMenuStats();
  });

  // Shop Tabs
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      shopUI.setTab(tab.dataset.tab);
    });
  });

  // Scratch Card Modal
  document.getElementById('btn-open-scratch').addEventListener('click', () => {
    scratchCardGame.resetCard(false);
    showScreen(scratchModal);
  });

  document.getElementById('btn-close-scratch').addEventListener('click', () => {
    showScreen(mainMenuScreen);
    updateMenuStats();
  });

  document.getElementById('btn-buy-scratch').addEventListener('click', () => {
    scratchCardGame.resetCard(true);
  });

  // Scratch Card from Game Over
  if (btnOpenScratchGameover) {
    btnOpenScratchGameover.addEventListener('click', () => {
      stopMascotAnimation();
      scratchCardGame.resetCard(false);
      showScreen(scratchModal);
    });
  }

  // Missions Modal
  document.getElementById('btn-open-missions').addEventListener('click', () => {
    missionsUI.render();
    showScreen(missionsModal);
  });

  document.getElementById('btn-close-missions').addEventListener('click', () => {
    showScreen(mainMenuScreen);
    updateMenuStats();
  });

  // Sound Buttons
  btnToggleSoundMenu.addEventListener('click', () => {
    const enabled = storage.toggleSound();
    audio.setSoundEnabled(enabled);
    updateMenuStats();
  });

  btnToggleSoundPause.addEventListener('click', () => {
    const enabled = storage.toggleSound();
    audio.setSoundEnabled(enabled);
    updateMenuStats();
  });

  // Pause Menu Buttons
  document.getElementById('btn-resume-game').addEventListener('click', () => {
    game.togglePause();
  });

  document.getElementById('btn-quit-to-menu').addEventListener('click', () => {
    game.isRunning = false;
    game.isPaused = false;
    audio.stopBgm();
    hudOverlay.style.display = 'none';
    showScreen(mainMenuScreen);
    updateMenuStats();
  });

  // Game Over Buttons
  document.getElementById('btn-retry-game').addEventListener('click', () => {
    stopMascotAnimation();
    showScreen(null);
    hudOverlay.style.display = 'block';
    game.start();
  });

  document.getElementById('btn-go-to-shop').addEventListener('click', () => {
    stopMascotAnimation();
    shopUI.render();
    showScreen(shopModal);
  });

  document.getElementById('btn-go-to-menu').addEventListener('click', () => {
    stopMascotAnimation();
    showScreen(mainMenuScreen);
    updateMenuStats();
  });

  // Preload Assets and initialize dynamic biomes
  await assets.loadAll();
  biomeManager.reset();

  // Initial stats & log
  updateMenuStats();
  logger.system('僵尸狂潮 PC 全屏极速版系统就绪');
});

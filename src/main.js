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

  // Menu Mascot Canvas
  const menuMascotCanvas = document.getElementById('menu-mascot-canvas');

  // Pause Modal Elements
  const pauseMascotCanvas = document.getElementById('pause-mascot-canvas');
  const pauseStatHorde = document.getElementById('pause-stat-horde');
  const pauseStatDist = document.getElementById('pause-stat-dist');
  const pauseStatCoins = document.getElementById('pause-stat-coins');

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

  // Interactive Workout and Impatient Mascot on Pause Screen
  let pauseMascotPokeCount = 0;
  let pauseMascotBounce = 0;
  let pauseMascotSpeech = '';
  let pauseMascotSpeechTimer = 0;
  let pauseMascotAnimId = null;
  let pauseMascotMouseX = 110;
  let pauseMascotMouseY = 60;
  let isMouseOverPauseCanvas = false;

  const pauseMascotQuotes = [
    '老大快点继续，前方的金币山要被抢光啦！',
    '别歇了别歇了，我的丧尸小短腿快生锈了！',
    '报告长官，军团集结完毕，随时可以出击！',
    '别发呆啦，快带我们掀翻前方的重型坦克！',
    '手速别停，这一把我们必定冲进全服第一！',
    '戳我没用，快按继续游戏带我们冲锋！',
    '我已经热身完毕，就等老大一声令下啦！',
    '赶紧开冲，前面有香喷喷的美味大餐！'
  ];

  const pauseHookPhrases = [
    '前方发现满载幸存者的大巴，立即继续发起冲锋！',
    '当前军团状态绝佳，距离下一大生态场景仅剩最后冲刺！',
    '军团气势正旺，前方路面大批宝箱金币等待掠夺！',
    '再感染几名幸存者，即可积攒足够力量掀翻重型坦克！',
    '保持高能冲刺状态，本局极有希望刷新最高里程纪录！'
  ];

  function startPauseMascotAnimation() {
    if (pauseMascotAnimId) cancelAnimationFrame(pauseMascotAnimId);
    let lastT = performance.now();

    function loop(now) {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (pauseMascotBounce > 0) {
        pauseMascotBounce = Math.max(0, pauseMascotBounce - dt * 3.5);
      }
      if (pauseMascotSpeechTimer > 0) {
        pauseMascotSpeechTimer -= dt;
      }

      renderPauseMascot(now);
      pauseMascotAnimId = requestAnimationFrame(loop);
    }
    pauseMascotAnimId = requestAnimationFrame(loop);
  }

  function stopPauseMascotAnimation() {
    if (pauseMascotAnimId) {
      cancelAnimationFrame(pauseMascotAnimId);
      pauseMascotAnimId = null;
    }
  }

  function renderPauseMascot(timeMs) {
    if (!pauseMascotCanvas) return;
    const ctx = pauseMascotCanvas.getContext('2d');
    const w = pauseMascotCanvas.width;
    const h = pauseMascotCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cycle = timeMs * 0.007;
    const jogBounce = Math.abs(Math.sin(cycle)) * 5;
    const pokeBounce = Math.sin(pauseMascotBounce * Math.PI) * 16;
    const centerX = w / 2;
    const centerY = 74 - jogBounce - pokeBounce * 0.8;

    // 1. Soft Shadow on the ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(centerX, 102, 28 - jogBounce * 0.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);

    // Jogging tilt
    const bodyTilt = Math.sin(cycle) * 0.08;
    ctx.rotate(bodyTilt);

    // 2. Impatient High-Stepping Legs
    const legLiftLeft = Math.max(0, Math.sin(cycle)) * 8;
    const legLiftRight = Math.max(0, -Math.sin(cycle)) * 8;

    ctx.fillStyle = '#2980b9';
    // Left leg
    ctx.fillRect(-12, 14 - legLiftLeft, 8, 14 + legLiftLeft * 0.2);
    // Right leg
    ctx.fillRect(4, 14 - legLiftRight, 8, 14 + legLiftRight * 0.2);

    // Cute Shoes
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(-14, 26 - legLiftLeft, 10, 5);
    ctx.fillRect(4, 26 - legLiftRight, 10, 5);

    // 3. Torso
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.roundRect(-15, -4, 30, 20, 5);
    ctx.fill();

    // 4. Arms and Hands
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#27ae60';
    if (pauseMascotBounce > 0.15) {
      // Cheering or pleading hands raised up
      const waveArm = Math.sin(timeMs * 0.02) * 8;
      // Left arm raised
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-24 + waveArm, -20);
      ctx.stroke();
      // Right arm raised
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(24 - waveArm, -20);
      ctx.stroke();
    } else {
      // Jogging boxer swing arms
      const armSwingLeft = Math.sin(cycle) * 8;
      const armSwingRight = -Math.sin(cycle) * 8;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.lineTo(-22, 6 + armSwingLeft);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(14, 2);
      ctx.lineTo(22, 6 + armSwingRight);
      ctx.stroke();
    }

    // 5. Green Chibi Zombie Head
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.roundRect(-20, -32, 40, 30, [10, 10, 6, 6]);
    ctx.fill();

    // Backwards Cap
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(-21, -35, 42, 11, [8, 8, 2, 2]);
    ctx.fill();
    // Cap button
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, -36, 3, 0, Math.PI * 2);
    ctx.fill();
    // Cap visor facing backwards
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(16, -30, 8, 4);

    // 6. Eyes with Interactive Cursor Tracking
    const leftEyeX = -8;
    const rightEyeX = 8;
    const eyeY = -18;

    if (pauseMascotBounce > 0.4) {
      // Excited Gold Currency Eyes when poked
      ctx.fillStyle = '#f1c40f';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', leftEyeX, eyeY);
      ctx.fillText('$', rightEyeX, eyeY);
    } else {
      // Normal Big Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 6, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Eye pupil tracking
      let lookOffsetX = 0;
      let lookOffsetY = 0;
      if (isMouseOverPauseCanvas) {
        const dx = pauseMascotMouseX - centerX;
        const dy = pauseMascotMouseY - (centerY + eyeY);
        const dist = Math.hypot(dx, dy) || 1;
        lookOffsetX = Math.min(2.5, Math.max(-2.5, (dx / dist) * 2.5));
        lookOffsetY = Math.min(2.5, Math.max(-2.5, (dy / dist) * 2.5));
      } else {
        lookOffsetX = Math.sin(timeMs * 0.003) * 1.5;
      }

      ctx.fillStyle = '#15181e';
      ctx.beginPath();
      ctx.arc(leftEyeX + lookOffsetX, eyeY + lookOffsetY, 2.5, 0, Math.PI * 2);
      ctx.arc(rightEyeX + lookOffsetX, eyeY + lookOffsetY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Mouth with tiny fang and drool drop
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.ellipse(0, -7, 6, 4, 0, 0, Math.PI);
    ctx.fill();

    // Cute little white zombie fang
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -7, 2, 3);

    // Drool drop dangling from corner of mouth
    const droolY = -5 + Math.sin(cycle * 1.5) * 2;
    ctx.fillStyle = 'rgba(116, 185, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(4, droolY, 1.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8. Rotating Gold Coin next to Zombie
    const coinAngle = timeMs * 0.004;
    const coinScaleX = Math.cos(coinAngle);
    ctx.save();
    ctx.translate(34, 4 + Math.sin(cycle) * 3);
    ctx.scale(coinScaleX, 1);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // 9. Speech Bubble when poked
    if (pauseMascotSpeechTimer > 0 && pauseMascotSpeech) {
      ctx.save();
      ctx.fillStyle = 'rgba(21, 24, 30, 0.96)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.font = "700 11px 'Outfit', sans-serif";
      const textW = ctx.measureText(pauseMascotSpeech).width;
      const bw = textW + 16;
      const bh = 22;
      const bx = centerX - bw / 2;
      const by = 8;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // Triangle pointing down to head
      ctx.beginPath();
      ctx.moveTo(centerX - 4, by + bh);
      ctx.lineTo(centerX, by + bh + 5);
      ctx.lineTo(centerX + 4, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pauseMascotSpeech, centerX, by + bh / 2);
      ctx.restore();
    }
  }

  function updatePauseModalData() {
    if (!game) return;
    const livingZombies = game.horde ? game.horde.zombies.filter(z => z.alive).length : 1;
    const currentDist = game.horde && game.horde.leader ? Math.floor(game.horde.leader.x / 10) : 0;
    const currentCoins = game.coins || 0;

    if (pauseStatHorde) pauseStatHorde.textContent = `${livingZombies} 丧尸`;
    if (pauseStatDist) pauseStatDist.textContent = `${currentDist} m`;
    if (pauseStatCoins) pauseStatCoins.textContent = `${currentCoins}`;
  }

  if (pauseMascotCanvas) {
    pauseMascotCanvas.addEventListener('mousemove', (e) => {
      const rect = pauseMascotCanvas.getBoundingClientRect();
      pauseMascotMouseX = e.clientX - rect.left;
      pauseMascotMouseY = e.clientY - rect.top;
      isMouseOverPauseCanvas = true;
    });

    pauseMascotCanvas.addEventListener('mouseenter', () => {
      isMouseOverPauseCanvas = true;
    });

    pauseMascotCanvas.addEventListener('mouseleave', () => {
      isMouseOverPauseCanvas = false;
    });

    pauseMascotCanvas.addEventListener('click', () => {
      pauseMascotPokeCount++;
      pauseMascotBounce = 1.0;
      pauseMascotSpeech = pauseMascotQuotes[pauseMascotPokeCount % pauseMascotQuotes.length];
      pauseMascotSpeechTimer = 2.4;
      audio.playScoreRoll();
    });
  }

  // Interactive Leading Zombie Squad Mascot on Main Menu Screen
  let menuMascotPokeCount = 0;
  let menuMascotBounce = 0;
  let menuMascotSpeech = '';
  let menuMascotSpeechTimer = 0;
  let menuMascotAnimId = null;
  let isMouseOverMenuCanvas = false;

  const menuMascotQuotes = [
    '全员集合，目标掀翻全城汽车！',
    '冲破一万米，把金币通通带回家！',
    '别发呆啦，快按开始带我们冲锋！',
    '报告长官，全员已完成战前热身！',
    '这一把状态神勇，必定刷新最高纪录！',
    '吃饱喝足，今天我们要横扫整条街道！',
    '军团集结完毕，就等老大一声令下！'
  ];

  function startMenuMascotAnimation() {
    if (menuMascotAnimId) cancelAnimationFrame(menuMascotAnimId);
    let lastT = performance.now();

    function loop(now) {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (menuMascotBounce > 0) {
        menuMascotBounce = Math.max(0, menuMascotBounce - dt * 3.5);
      }
      if (menuMascotSpeechTimer > 0) {
        menuMascotSpeechTimer -= dt;
      }

      renderMenuMascot(now);
      menuMascotAnimId = requestAnimationFrame(loop);
    }
    menuMascotAnimId = requestAnimationFrame(loop);
  }

  function stopMenuMascotAnimation() {
    if (menuMascotAnimId) {
      cancelAnimationFrame(menuMascotAnimId);
      menuMascotAnimId = null;
    }
  }

  function renderMenuMascot(timeMs) {
    if (!menuMascotCanvas) return;
    const ctx = menuMascotCanvas.getContext('2d');
    const w = menuMascotCanvas.width;
    const h = menuMascotCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const speedMult = isMouseOverMenuCanvas ? 1.4 : 1.0;
    const hopY = Math.sin(menuMascotBounce * Math.PI) * 14;

    function drawMiniZombie(x, baseY, scale, phase, type) {
      ctx.save();
      ctx.translate(x, baseY - hopY);
      ctx.scale(scale, scale);

      const runCycle = (timeMs * 0.008 * speedMult) + phase;
      const legSwing = Math.sin(runCycle) * 14;
      const bodyBob = Math.abs(Math.sin(runCycle * 2)) * 3.5;
      const armSwing = -legSwing;

      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 4 + hopY * 0.4, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Back Leg
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-4 - legSwing * 0.3, -8 + bodyBob, 6, 12, 3);
      ctx.fill();

      // Back Arm
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(-10 - armSwing * 0.4, -20 + bodyBob, 5, 10, 2);
      ctx.fill();

      // Torso / Jacket
      ctx.fillStyle = type === 0 ? '#1e293b' : (type === 1 ? '#334155' : '#475569');
      ctx.beginPath();
      ctx.roundRect(-8, -24 + bodyBob, 16, 17, 4);
      ctx.fill();

      // Front Leg
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(0 + legSwing * 0.3, -8 + bodyBob, 6, 12, 3);
      ctx.fill();

      // Head
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(-11, -42 + bodyBob, 22, 19, 5);
      ctx.fill();

      // Headband for Leader
      if (type === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-11, -38 + bodyBob, 22, 4);
        const tailWave = Math.sin(runCycle * 1.5) * 3;
        ctx.fillRect(-15, -37 + bodyBob + tailWave, 5, 3);
      }

      // Flag for Scout
      if (type === 1) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, -12 + bodyBob);
        ctx.lineTo(8, -48 + bodyBob);
        ctx.stroke();
        const flagWave = Math.sin(runCycle * 2) * 2;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(8, -48 + bodyBob);
        ctx.lineTo(24, -43 + bodyBob + flagWave);
        ctx.lineTo(8, -38 + bodyBob);
        ctx.closePath();
        ctx.fill();
      }

      // Eyes
      const blink = Math.sin(timeMs * 0.002 + phase) > 0.96;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (blink) {
        ctx.fillRect(-2, -34 + bodyBob, 5, 2);
        ctx.fillRect(4, -34 + bodyBob, 5, 2);
      } else {
        ctx.arc(0, -33 + bodyBob, 3.5, 0, Math.PI * 2);
        ctx.arc(6, -33 + bodyBob, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(1.5, -33 + bodyBob, 1.8, 0, Math.PI * 2);
        ctx.arc(7.5, -33 + bodyBob, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(1, -27 + bodyBob, 6, 3, 1);
      ctx.fill();

      // Front Arm
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(6 + armSwing * 0.4, -20 + bodyBob, 5, 10, 2);
      ctx.fill();

      ctx.restore();
    }

    const groundBase = 92;
    drawMiniZombie(100, groundBase, 0.95, 2.1, 2);
    drawMiniZombie(180, groundBase, 1.18, 0.0, 0);
    drawMiniZombie(260, groundBase, 1.0, 1.2, 1);

    // Comic speech bubble
    if (menuMascotSpeechTimer > 0 && menuMascotSpeech) {
      ctx.save();
      ctx.fillStyle = 'rgba(21, 24, 30, 0.96)';
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.font = "700 12px 'Outfit', 'Noto Sans SC', sans-serif";
      const textW = ctx.measureText(menuMascotSpeech).width;
      const bw = textW + 20;
      const bh = 24;
      const bx = Math.max(10, Math.min(w - bw - 10, 180 - bw / 2));
      const by = 8;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(176, by + bh);
      ctx.lineTo(180, by + bh + 5);
      ctx.lineTo(184, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2ecc71';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(menuMascotSpeech, bx + bw / 2, by + bh / 2);
      ctx.restore();
    }
  }

  if (menuMascotCanvas) {
    menuMascotCanvas.addEventListener('mouseenter', () => {
      isMouseOverMenuCanvas = true;
    });
    menuMascotCanvas.addEventListener('mouseleave', () => {
      isMouseOverMenuCanvas = false;
    });
    menuMascotCanvas.addEventListener('click', () => {
      menuMascotPokeCount++;
      menuMascotBounce = 1.0;
      menuMascotSpeech = menuMascotQuotes[menuMascotPokeCount % menuMascotQuotes.length];
      menuMascotSpeechTimer = 2.5;
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

  let shopUI = null;

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
    if (screen !== pauseModal) {
      stopPauseMascotAnimation();
    }
    if (screen !== shopModal && shopUI) {
      shopUI.stopMerchantAnimation();
    }
    if (screen !== mainMenuScreen) {
      stopMenuMascotAnimation();
    }

    if (screen) {
      screen.style.display = 'flex';
      if (screen === mainMenuScreen) {
        startMenuMascotAnimation();
      }
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
    } else if ((e.code === 'Space' || e.code === 'Enter') && game && game.isPaused) {
      game.togglePause();
      e.preventDefault();
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
  shopUI = new ShopUI(
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
      if (isPaused) {
        updatePauseModalData();
        startPauseMascotAnimation();
      } else {
        stopPauseMascotAnimation();
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
    stopPauseMascotAnimation();
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
  showScreen(mainMenuScreen);
  updateMenuStats();
  logger.system('僵尸狂潮 PC 全屏极速版系统就绪');
});

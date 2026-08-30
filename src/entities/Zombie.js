import { audio } from '../engine/Audio.js';
import { logger } from '../systems/Logger.js';
import { assets } from '../engine/AssetLoader.js';

export class Zombie {
  constructor(index, x, y, isLeader = false, shirtColor = '#e74c3c', pantsColor = '#2980b9', accessory = 'none') {
    this.index = index;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 46;
    this.height = 54;
    this.isLeader = isLeader;
    this.alive = true;
    this.grounded = true;
    this.isFallingInPit = false;
    this.standingOnPlatform = false;

    // Inherited clothing palette
    this.shirtColor = shirtColor;
    this.pantsColor = pantsColor;
    this.accessory = accessory;

    // Depth layer for 3D Horde visual staggering
    this.layerDepth = (Math.random() - 0.5) * 10;
    this.depthScale = 0.94 + Math.random() * 0.12;
    this.brightness = 0.9 + Math.random() * 0.2;

    // Coyote time for cliff tolerance
    this.coyoteTimer = 0;

    // Secondary motion spring physics for hats and accessories
    this.hatSpringY = 0;
    this.hatVelocityY = 0;

    // Pushing state against vehicle
    this.isPushing = false;

    // Animation & Squash/Stretch
    this.runTimer = Math.random() * 10;
    this.scaleX = 1;
    this.scaleY = 1;
    this.targetScaleX = 1;
    this.targetScaleY = 1;
    this.bodyTilt = 0;
    this.airTime = 0;
    this.isGliding = false;
    this.airFlaps = 0;

    // Wave jump delay queue
    this.jumpDelayTimer = 0;
    this.jumpQueued = false;
    this.jumpImpulse = 0;

    // Phase and Step frequency offset for lively unsynchronized crowd animation
    this.phaseOffset = (index * 1.57) % (Math.PI * 2);
    this.stepFrequency = 0.94 + ((index * 7) % 5) * 0.03;

    // Pop-in animation
    this.spawnScale = 0.1;
    this.isSpawning = true;
  }

  queueJump(delaySeconds, impulse) {
    this.jumpDelayTimer = delaySeconds;
    this.jumpImpulse = impulse;
    this.jumpQueued = true;
  }

  jump(impulse) {
    if (!this.alive || this.isFallingInPit || this.isPushing) return;

    if (this.grounded || this.coyoteTimer > 0) {
      this.grounded = false;
      this.coyoteTimer = 0;
      this.vy = -impulse;
      this.targetScaleX = 0.75;
      this.targetScaleY = 1.35;
      this.scaleX = 0.75;
      this.scaleY = 1.35;
      this.airTime = 0;
      this.airFlaps = 0;
      this.hatVelocityY = -220; // Secondary motion: Hat pops upwards

      if (this.isLeader) {
        logger.jump(`领头僵尸起跳, 冲量: ${impulse.toFixed(0)}, 起跳高度: ${(540 - this.y - this.height).toFixed(0)}px`);
      }
    } else if (this.airFlaps < 1 && this.airTime > 0.12) {
      this.vy = -Math.max(360, impulse * 0.75);
      this.airFlaps++;
      this.targetScaleX = 0.8;
      this.targetScaleY = 1.28;
      audio.playJump();
      if (this.isLeader) {
        logger.jump('领头僵尸空中二次振翅蓄力');
      }
    }
  }

  cutJump(factor = 0.65) {
    if (!this.grounded && this.vy < -100) {
      this.vy *= factor;
    }
  }

  land(groundY, particleSystem) {
    if (this.alive && !this.isFallingInPit) {
      if (!this.grounded) {
        const fallSpeed = Math.abs(this.vy);
        const squashFactor = Math.min(1.35, 1.0 + fallSpeed / 1200);
        this.targetScaleX = squashFactor;
        this.targetScaleY = 0.72;
        this.scaleX = squashFactor;
        this.scaleY = 0.72;
        this.airTime = 0;
        this.bodyTilt = 0;
        this.hatVelocityY = 160; // Secondary motion: Hat compresses downwards

        if (particleSystem) {
          particleSystem.spawnLandingDust(this.x + this.width / 2, this.y + this.height);
        }

        if (this.isLeader) {
          logger.jump(`领头僵尸着陆, 高度: ${groundY.toFixed(0)}px`);
        }
      }
      this.grounded = true;
      this.coyoteTimer = 0;
      this.vy = 0;
      this.y = groundY;
      this.airFlaps = 0;
    }
  }

  update(dt, gameSpeed, gravity, effectiveGroundY, isHoldingJump, particleSystem) {
    if (!this.alive) return;

    // Hat secondary spring-damper simulation
    const hatK = 26;
    const hatDamping = 0.82;
    this.hatVelocityY += (-this.hatSpringY * hatK) * dt * 60;
    this.hatVelocityY *= hatDamping;
    this.hatSpringY += this.hatVelocityY * dt;

    if (this.isSpawning) {
      this.spawnScale += dt * 6;
      if (this.spawnScale >= 1) {
        this.spawnScale = 1;
        this.isSpawning = false;
      }
    }

    if (this.jumpQueued) {
      this.jumpDelayTimer -= dt;
      if (this.jumpDelayTimer <= 0) {
        this.jumpQueued = false;
        this.jump(this.jumpImpulse);
      }
    }

    // Pushing struggle against vehicle
    if (this.isPushing) {
      this.scaleX = 0.88 + Math.sin(this.runTimer * 32) * 0.12;
      this.scaleY = 1.1 + Math.cos(this.runTimer * 32) * 0.08;
      this.bodyTilt = 0.32;
      this.runTimer += dt * 24;
      return;
    }

    this.runTimer += dt * (gameSpeed / 180) * 16 * this.stepFrequency;

    if (!this.grounded || this.isFallingInPit) {
      this.airTime += dt;
      if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

      if (isHoldingJump && this.vy < 220 && this.airTime < 0.95 && !this.isFallingInPit) {
        this.vy += gravity * 0.32 * dt;
        this.isGliding = true;

        if (particleSystem && Math.random() > 0.35) {
          particleSystem.spawnWindTrail(this.x, this.y + this.height * 0.7);
        }
      } else {
        this.vy += gravity * dt;
        this.isGliding = false;
      }

      this.y += this.vy * dt;

      if (this.vy < 0) {
        this.bodyTilt = -0.18;
        this.targetScaleX = 0.85;
        this.targetScaleY = 1.2;
      } else {
        this.bodyTilt = 0.08;
        this.targetScaleX = 0.96;
        this.targetScaleY = 1.06;
      }
    } else {
      this.isGliding = false;
      this.coyoteTimer = 0.15;
      this.bodyTilt = 0.08 + Math.sin(this.runTimer + this.phaseOffset) * 0.04;
      this.targetScaleX = 1.0;
      this.targetScaleY = 1.0;
    }

    const lerpSpeed = 16 * dt;
    this.scaleX += (this.targetScaleX - this.scaleX) * Math.min(1, lerpSpeed);
    this.scaleY += (this.targetScaleY - this.scaleY) * Math.min(1, lerpSpeed);

    if (this.isFallingInPit && this.y > 800) {
      this.alive = false;
      logger.collision(`僵尸 #${this.index} 坠入断崖深渊`);
    }
  }

  drawGroundShadow(ctx, cameraX, groundY = 540) {
    if (!this.alive || this.isFallingInPit) return;
    const renderX = this.x - cameraX + this.width / 2;
    const heightAboveGround = Math.max(0, groundY - (this.y + this.height));
    const shadowFactor = Math.max(0.12, 1 - heightAboveGround / 350);
    const shadowRadiusX = 18 * shadowFactor;
    const shadowRadiusY = 4.5 * shadowFactor;
    const shadowAlpha = 0.25 * shadowFactor;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(renderX, groundY - 2, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
    ctx.fill();
    ctx.restore();
  }

  draw(ctx, cameraX, equippedHat = 'none', isGold = false, isNinja = false, isQuarterback = false) {
    if (!this.alive) return;

    const renderX = this.x - cameraX;
    const renderY = this.y + this.layerDepth;
    const currentScale = (this.isSpawning ? this.spawnScale : 1) * this.depthScale;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height);
    ctx.scale(this.scaleX * currentScale, this.scaleY * currentScale);
    ctx.rotate(this.bodyTilt);

    if (assets.isLoaded && !isGold && !isNinja && !isQuarterback) {
      let sprite = null;
      if (this.isPushing) {
        sprite = assets.sprites.zombieJump;
      } else if (!this.grounded) {
        if (this.isGliding || Math.abs(this.vy) < 80) {
          sprite = assets.sprites.zombieGlide;
        } else {
          sprite = assets.sprites.zombieJump;
        }
      } else {
        if (this.scaleX > 1.15) {
          sprite = assets.sprites.zombieLand;
        } else {
          const frame = Math.floor(((this.runTimer + this.phaseOffset) * 0.9) % 2);
          sprite = (frame === 0) ? assets.sprites.zombieRun1 : assets.sprites.zombieRun2;
        }
      }

      if (sprite) {
        ctx.drawImage(sprite, -this.width / 2, -this.height, this.width, this.height);
        this.drawHat(ctx, equippedHat, 0, isQuarterback, isNinja);
        ctx.restore();
        return;
      }
    }

    // Cute Friendly Zombie Tsunami Chibi Fallback
    let skinColor = '#2ecc71';
    let shirtColor = this.shirtColor || '#e74c3c';
    let pantsColor = this.pantsColor || '#2980b9';

    if (isGold) {
      skinColor = '#f1c40f';
      shirtColor = '#f39c12';
      pantsColor = '#b7950b';
    } else if (isNinja) {
      skinColor = '#2ecc71';
      shirtColor = '#1e222b';
      pantsColor = '#15181e';
    } else if (isQuarterback) {
      shirtColor = '#e67e22';
      pantsColor = '#ecf0f1';
    }

    const hatToDraw = (equippedHat && equippedHat !== 'none') ? equippedHat : this.accessory;

    let legPhase = 0;
    let bodyBob = 0;
    let armSwing = 0;

    if (this.grounded && !this.isFallingInPit) {
      legPhase = Math.sin(this.runTimer + this.phaseOffset);
      bodyBob = Math.abs(Math.cos(this.runTimer + this.phaseOffset)) * 4.5;
      armSwing = Math.sin(this.runTimer * 1.4 + this.phaseOffset) * 6;
    }

    // Dynamic High-Stepping Legs (Left & Right legs swing vigorously)
    ctx.fillStyle = pantsColor;
    const leg1Lift = Math.max(0, -legPhase * 4);
    const leg2Lift = Math.max(0, legPhase * 4);
    ctx.fillRect(-7 + legPhase * 6, -12 - leg1Lift, 5, 12);
    ctx.fillRect(2 - legPhase * 6, -12 - leg2Lift, 5, 12);

    // Torso (Vibrant shirt with lively bobbing)
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(-9, -32 - bodyBob, 18, 20, 5);
    ctx.fill();

    // Cute Round Chibi Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -42 - bodyBob, 16, 0, Math.PI * 2);
    ctx.fill();

    // Big Friendly Cartoon Eyes with Catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -44 - bodyBob, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(5.5, -44 - bodyBob, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4.5, -45 - bodyBob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Cute Animated Chomping Mouth
    const chompHeight = 5 + Math.sin(this.runTimer * 2 + this.phaseOffset) * 2;
    ctx.fillStyle = '#15181e';
    ctx.beginPath();
    ctx.arc(3, -36 - bodyBob, chompHeight, 0, Math.PI);
    ctx.fill();

    // White Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, -36 - bodyBob, 2.5, 2.5);
    ctx.fillRect(4.5, -36 - bodyBob, 2.5, 2.5);

    // Animated Flailing Zombie Arms (Swinging back and forth)
    ctx.fillStyle = skinColor;
    ctx.save();
    ctx.translate(4, -28 - bodyBob);
    ctx.rotate((armSwing * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(0, 0, 13, 5, 2.5);
    ctx.fill();
    ctx.restore();

    this.drawHat(ctx, hatToDraw, -bodyBob, isQuarterback, isNinja);
    ctx.restore();
  }

  drawHat(ctx, hatId = 'none', yOffset = 0, isQuarterback = false, isNinja = false) {
    if (hatId === 'none' && !isQuarterback && !isNinja) return;

    let headTopY = -this.height + yOffset + this.hatSpringY + (this.grounded ? Math.sin(this.runTimer * 2) * 1.2 : 0);

    if (isQuarterback) {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(0, headTopY + 10, 16, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, headTopY + 10, 16, Math.PI, 0);
      ctx.stroke();
      return;
    }

    if (isNinja) {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-15, headTopY + 4, 30, 4);
      ctx.beginPath();
      ctx.moveTo(-15, headTopY + 6);
      ctx.lineTo(-24 + Math.sin(this.runTimer * 2) * 4, headTopY + 8);
      ctx.lineTo(-26 + Math.sin(this.runTimer * 2) * 4, headTopY + 14);
      ctx.lineTo(-15, headTopY + 8);
      ctx.fill();
      return;
    }

    if (hatId === 'top_hat') {
      ctx.fillStyle = '#15181e';
      ctx.fillRect(-16, headTopY, 32, 4);
      ctx.fillRect(-10, headTopY - 18, 20, 18);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-10, headTopY - 4, 20, 4);
    } else if (hatId === 'viking') {
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, headTopY + 4, 15, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ecf0f1';
      ctx.beginPath();
      ctx.moveTo(-12, headTopY + 2);
      ctx.quadraticCurveTo(-22, headTopY - 10, -16, headTopY - 18);
      ctx.quadraticCurveTo(-14, headTopY - 6, -8, headTopY + 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, headTopY + 2);
      ctx.quadraticCurveTo(22, headTopY - 10, 16, headTopY - 18);
      ctx.quadraticCurveTo(14, headTopY - 6, 8, headTopY + 2);
      ctx.fill();
    } else if (hatId === 'sombrero') {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.ellipse(0, headTopY + 2, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8, headTopY - 14, 16, 14);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(-8, headTopY - 4, 16, 4);
    } else if (hatId === 'crown') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-14, headTopY + 2);
      ctx.lineTo(-14, headTopY - 10);
      ctx.lineTo(-7, headTopY - 4);
      ctx.lineTo(0, headTopY - 12);
      ctx.lineTo(7, headTopY - 4);
      ctx.lineTo(14, headTopY - 10);
      ctx.lineTo(14, headTopY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, headTopY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (hatId === 'space_helmet') {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
      ctx.strokeStyle = '#bdc3c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, headTopY + 10, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

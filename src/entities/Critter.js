export class Critter {
  constructor(x, groundY, type = 'RABBIT') {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY;
    this.type = type; // 'RABBIT' or 'CAT'
    this.width = type === 'RABBIT' ? 24 : 28;
    this.height = type === 'RABBIT' ? 22 : 20;

    this.vx = (Math.random() - 0.5) * 15;
    this.vy = 0;
    this.state = 'IDLE'; // 'IDLE' or 'STARTLED'
    this.idleTimer = Math.random() * 2;
    this.bouncePhase = Math.random() * Math.PI * 2;
    this.squashFactor = 0;
    this.sweatTimer = 0;
    this.rotAngle = 0;
    this.scaredHops = 0;
  }

  update(dt, leaderX, terrainManager) {
    this.bouncePhase += dt * 4;

    if (this.sweatTimer > 0) {
      this.sweatTimer -= dt;
    }

    if (this.squashFactor > 0) {
      this.squashFactor = Math.max(0, this.squashFactor - dt * 5);
    }

    // 1. Detect approaching zombie horde (Zero interference, only scared funny reaction)
    const distToZombies = this.x - leaderX;
    if (distToZombies < 260 && distToZombies > -100 && this.state === 'IDLE') {
      this.state = 'STARTLED';
      this.sweatTimer = 2.0;
      this.scaredHops = 3 + Math.floor(Math.random() * 3);

      if (this.type === 'RABBIT') {
        // Energetic big bunny bounce forward
        this.vy = -340 - Math.random() * 80;
        this.vx = 140 + Math.random() * 70;
      } else {
        // Cat puffed-up high vertical leap and somersault
        this.vy = -400 - Math.random() * 60;
        this.vx = 100 + Math.random() * 60;
        this.rotAngle = -0.3;
      }
    }

    // 2. State Actions
    if (this.state === 'IDLE') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.idleTimer = 1.5 + Math.random() * 2.5;
        // Occasional gentle hop in place
        if (Math.random() > 0.4) {
          this.vy = -120 - Math.random() * 40;
          this.vx = (Math.random() - 0.4) * 20;
        }
      }
    }

    // 3. Gravity and Physics
    this.vy += 850 * dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;

    if (this.state === 'STARTLED' && this.y < this.groundY - 10) {
      this.rotAngle += dt * 3.5;
    } else {
      this.rotAngle *= 0.85;
    }

    // 4. Ground Collision & Continuous Scared Bouncing
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.squashFactor = 0.8;

      if (this.state === 'STARTLED') {
        if (this.scaredHops > 0) {
          this.scaredHops--;
          // Continuous funny rabbit/cat bounces
          this.vy = this.type === 'RABBIT'
            ? -280 - Math.random() * 60
            : -320 - Math.random() * 50;
          this.vx = 120 + Math.random() * 60;
        } else {
          this.vx *= 0.8;
          if (Math.abs(this.vx) < 10) {
            this.state = 'IDLE';
            this.idleTimer = 2.0;
          }
        }
      } else {
        this.vy = 0;
        this.vx *= 0.7;
      }
    }
  }

  draw(ctx, cameraX) {
    const renderX = this.x - cameraX;
    if (renderX < -100 || renderX > 1380) return;

    const squashY = 1.0 - this.squashFactor * 0.25;
    const squashX = 1.0 + this.squashFactor * 0.25;

    ctx.save();
    ctx.translate(renderX, this.y);
    ctx.scale(squashX, squashY);
    ctx.rotate(this.rotAngle);

    // 1. Drop shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'RABBIT') {
      this.drawRabbit(ctx);
    } else {
      this.drawCat(ctx);
    }

    // 2. Funny Sweat Drop when startled
    if (this.sweatTimer > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.beginPath();
      ctx.arc(8, -this.height - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawRabbit(ctx) {
    // White chubby body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -9, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-11, -9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Cute Long Ears
    const earWiggle = Math.sin(this.bouncePhase * 2) * 0.15;
    // Left ear
    ctx.save();
    ctx.translate(2, -16);
    ctx.rotate(-0.1 + earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -6, 2.8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -6, 1.4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right ear
    ctx.save();
    ctx.translate(6, -16);
    ctx.rotate(0.15 - earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -6, 2.8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -6, 1.4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (this.state === 'STARTLED') {
      ctx.arc(6, -11, 2.2, 0, Math.PI * 2);
    } else {
      ctx.arc(6, -11, 1.6, 0, Math.PI * 2);
    }
    ctx.fill();

    // Pink nose
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(10, -8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCat(ctx) {
    // Orange chubby cat body
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(0, -8, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // White chest / belly
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.ellipse(3, -6, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute Triangle Ears
    ctx.fillStyle = '#ea580c';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(1, -15);
    ctx.lineTo(4, -22);
    ctx.lineTo(8, -15);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(8, -15);
    ctx.lineTo(12, -22);
    ctx.lineTo(15, -14);
    ctx.closePath();
    ctx.fill();

    // Upright Curly Cat Tail
    const tailWave = Math.sin(this.bouncePhase * 3) * 3;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    if (ctx.quadraticCurveTo) {
      ctx.quadraticCurveTo(-16 + tailWave, -18, -12, -22);
    } else {
      ctx.lineTo(-12, -22);
    }
    ctx.stroke();

    // Eye (Puffed startled eye when running)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    if (this.state === 'STARTLED') {
      ctx.arc(8, -11, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -11.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.arc(8, -11, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pink little nose
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(11, -8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

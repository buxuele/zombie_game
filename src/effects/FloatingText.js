class FloatingTextItem {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.text = '';
    this.color = '#ffffff';
    this.size = 20;
    this.life = 1;
    this.maxLife = 1;
    this.vy = -60;
  }

  init(x, y, text, color = '#ffffff', size = 20, life = 0.8) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vy = -70;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }
    this.y += this.vy * dt;
    this.vy *= 0.95;
  }

  draw(ctx, cameraX) {
    if (!this.active) return;
    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, 1 - progress);
    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x - cameraX, this.y);
    ctx.scale(scale, scale);

    ctx.font = `900 ${this.size}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black stroke shadow
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

export class FloatingTextManager {
  constructor(maxItems = 50) {
    this.items = [];
    for (let i = 0; i < maxItems; i++) {
      this.items.push(new FloatingTextItem());
    }
  }

  spawn(x, y, text, color = '#ffffff', size = 20, life = 0.8) {
    const item = this.items.find(i => !i.active);
    if (item) {
      item.init(x, y, text, color, size, life);
    }
  }

  update(dt) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) {
        this.items[i].update(dt);
      }
    }
  }

  draw(ctx, cameraX) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) {
        this.items[i].draw(ctx, cameraX);
      }
    }
  }

  clear() {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].active = false;
    }
  }
}

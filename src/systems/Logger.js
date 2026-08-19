export class Logger {
  constructor(maxLogs = 60) {
    this.logs = [];
    this.maxLogs = maxLogs;
    this.listeners = [];
  }

  log(category, message, data = null) {
    const time = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    const entry = { time, category, message, data };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to browser console
    const colorMap = {
      SYSTEM: 'color: #3498db',
      GAME: 'color: #2ecc71',
      JUMP: 'color: #f1c40f',
      VEHICLE: 'color: #e74c3c',
      SHOP: 'color: #9b59b6',
      COLLISION: 'color: #e67e22',
      ERROR: 'color: #ff0055; font-weight: bold'
    };
    const style = colorMap[category] || 'color: #9aa5b8';
    if (category === 'ERROR') {
      console.error(`[${time}] [${category}] ${message}`, data || '');
    } else {
      console.log(`%c[${time}] [${category}] ${message}`, style, data || '');
    }

    // Notify UI listeners
    for (const cb of this.listeners) {
      try {
        cb(entry, this.logs);
      } catch (e) {
        // ignore listener error
      }
    }
  }

  info(msg, data) { this.log('GAME', msg, data); }
  system(msg, data) { this.log('SYSTEM', msg, data); }
  jump(msg, data) { this.log('JUMP', msg, data); }
  shop(msg, data) { this.log('SHOP', msg, data); }
  vehicle(msg, data) { this.log('VEHICLE', msg, data); }
  collision(msg, data) { this.log('COLLISION', msg, data); }
  error(msg, data) { this.log('ERROR', msg, data); }

  subscribe(callback) {
    this.listeners.push(callback);
  }
}

export const logger = new Logger();

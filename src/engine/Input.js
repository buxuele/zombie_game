export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.isHoldingJump = false;
    this.jumpJustPressed = false;
    this.jumpJustReleased = false;

    this.onPauseRequested = null;
    this.onMuteRequested = null;

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!e.repeat) {
          this.jumpJustPressed = true;
          this.isHoldingJump = true;
        }
        e.preventDefault();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.onPauseRequested) this.onPauseRequested();
        e.preventDefault();
      } else if (e.code === 'KeyM') {
        if (this.onMuteRequested) this.onMuteRequested();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.isHoldingJump = false;
        this.jumpJustReleased = true;
        e.preventDefault();
      }
    });

    // Mouse Controls
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.jumpJustPressed = true;
        this.isHoldingJump = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isHoldingJump = false;
        this.jumpJustReleased = true;
      }
    });

    // Touch Controls
    this.canvas.addEventListener('touchstart', (e) => {
      this.jumpJustPressed = true;
      this.isHoldingJump = true;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      this.isHoldingJump = false;
      this.jumpJustReleased = true;
      e.preventDefault();
    }, { passive: false });
  }

  consumeJumpPress() {
    const res = this.jumpJustPressed;
    this.jumpJustPressed = false;
    return res;
  }

  consumeJumpRelease() {
    const res = this.jumpJustReleased;
    this.jumpJustReleased = false;
    return res;
  }
}

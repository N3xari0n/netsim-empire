// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Camera (pan/zoom)
// ═══════════════════════════════════════════════════════════

export class Camera {
  constructor(canvas) {
    this.canvas   = canvas;
    this.x        = 0;      // world offset
    this.y        = 0;
    this.zoom     = 1.0;
    this.minZoom  = 0.25;
    this.maxZoom  = 3.5;
    this._dragging = false;
    this._lastMX   = 0;
    this._lastMY   = 0;

    this._setupEvents();
    this.centerOn(0, 0);
  }

  centerOn(wx, wy) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.x = wx - w / (2 * this.zoom);
    this.y = wy - h / (2 * this.zoom);
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  applyTransform(ctx) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -this.x * this.zoom, -this.y * this.zoom);
  }

  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  zoomAt(screenX, screenY, delta) {
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * (1 - delta * 0.001)));
    const after = this.screenToWorld(screenX, screenY);
    this.x -= (after.x - before.x);
    this.y -= (after.y - before.y);
  }

  _setupEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', e => {
      if (e.button === 1 || e.button === 2 || e.altKey) {
        this._dragging = true;
        this._lastMX = e.clientX;
        this._lastMY = e.clientY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      const dx = (e.clientX - this._lastMX) / this.zoom;
      const dy = (e.clientY - this._lastMY) / this.zoom;
      this.x -= dx;
      this.y -= dy;
      this._lastMX = e.clientX;
      this._lastMY = e.clientY;
    });

    window.addEventListener('mouseup', () => { this._dragging = false; });

    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoomAt(e.clientX, e.clientY, e.deltaY);
    }, { passive: false });

    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Touch support
  setupTouch() {
    let lastDist = 0;
    this.canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (lastDist > 0) {
          const delta = (lastDist - dist) * 2;
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          this.zoomAt(cx, cy, delta);
        }
        lastDist = dist;
        e.preventDefault();
      }
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => { lastDist = 0; });
  }

  get isDragging() { return this._dragging; }
}

export default Camera;

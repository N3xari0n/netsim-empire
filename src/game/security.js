// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Security Module (DevTools + Fingerprint)
//  Developed by: #Drakmoor
// ═══════════════════════════════════════════════════════════

export class Security {
  constructor() {
    this.devToolsOpen = false;
    this._warningShown = false;
    this._checks = 0;

    this._initDevToolsDetection();
    this._initContextMenuBlock();
  }

  // ── Device Fingerprint ────────────────────────────────────

  static async getFingerprint() {
    const components = [];

    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d');
      canvas.width = 256; canvas.height = 64;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('NetSim🎮Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('NetSim🎮Fingerprint', 4, 17);
      components.push(canvas.toDataURL());
    } catch { components.push('canvas-unavailable'); }

    // Screen info
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(navigator.hardwareConcurrency || 0);
    components.push(navigator.maxTouchPoints || 0);

    // WebGL renderer
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      components.push(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no-webgl');
    } catch { components.push('no-webgl'); }

    // Hash all components
    const raw = components.join('|');
    const hash = await Security._sha256(raw);
    return hash;
  }

  static async _sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── DevTools Detection ────────────────────────────────────

  _initDevToolsDetection() {
    // Method 1: Window size diff (outer vs inner)
    const checkSize = () => {
      const threshold = 160;
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        this._onDevToolsOpen();
      }
    };

    // Method 2: debugger timing
    const checkDebugger = () => {
      const start = performance.now();
      // This line is intentional — it triggers a pause if DevTools is open
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        this._onDevToolsOpen();
      }
    };

    // Method 3: Console.log trick (image dimensions)
    const checkConsole = () => {
      const el = new Image();
      Object.defineProperty(el, 'id', {
        get: () => { this._onDevToolsOpen(); return ''; }
      });
      // Periodic check
      console.log('%c', el);
    };

    // Run size check periodically
    setInterval(checkSize, 2000);

    // Don't use debugger check in production as it's disruptive
    // Only use console + size checks
    setInterval(() => {
      if (!this._warningShown) {
        this._checks++;
      }
    }, 3000);
  }

  _onDevToolsOpen() {
    if (this._warningShown) return;
    this.devToolsOpen = true;
    this._warningShown = true;

    this._showSecurityWarning();

    // Reset after 10 seconds
    setTimeout(() => {
      this._warningShown = false;
      this._hideSecurityWarning();
    }, 10000);
  }

  _showSecurityWarning() {
    let overlay = document.getElementById('devtoolsWarning');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'devtoolsWarning';
      overlay.innerHTML = `
        <div class="dtw-content">
          <div class="dtw-icon">🛡️</div>
          <h2>SECURITY ALERT</h2>
          <p>Developer Tools has been detected!</p>
          <p class="dtw-sub">NetSim Empire is monitored for security. Unauthorized inspection, data extraction, or code manipulation is logged.</p>
          <p class="dtw-credits">Protected by #Drakmoor</p>
          <div id="dtwTimerText" class="dtw-timer">This warning will close in 10 seconds...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    // Start UI countdown
    const timerEl = document.getElementById('dtwTimerText');
    let timeLeft = 10;
    timerEl.textContent = `This warning will close in ${timeLeft} seconds...`;

    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        timerEl.textContent = `This warning will close in ${timeLeft} seconds...`;
      } else {
        clearInterval(this._timerInterval);
      }
    }, 1000);
  }

  _hideSecurityWarning() {
    const overlay = document.getElementById('devtoolsWarning');
    if (overlay) {
      overlay.style.display = 'none';
    }
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  // ── Block right-click context menu ────────────────────────

  _initContextMenuBlock() {
    document.addEventListener('contextmenu', e => {
      // Allow on canvas (used for deselect)
      if (e.target.id === 'gameCanvas') return;
      e.preventDefault();
    });

    // Block common shortcuts
    document.addEventListener('keydown', e => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        this._onDevToolsOpen();
      }
      // Block Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        this._onDevToolsOpen();
      }
      // Block Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        this._onDevToolsOpen();
      }
      // Block Ctrl+U (view source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    });
  }

  // ── Cookie Helpers ────────────────────────────────────────

  static setCookie(name, value, days = 30) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  static getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  static deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

export default Security;

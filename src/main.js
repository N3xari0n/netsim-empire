// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Main Entry Point & Game Loop v1.0
//  Developed by: N3xari0n × Ollama × AntiGravity
// ═══════════════════════════════════════════════════════════

import GameState from './game/gameState.js';
import Network from './game/network.js';
import TrafficSimulator from './game/traffic.js';
import EventsEngine from './game/events.js';
import ContractsManager from './game/contracts.js';
import TechTreeManager from './game/techTree.js';
import IPManager from './game/ipManager.js';
import CLI from './game/cli.js';
import Security from './game/security.js';
import SaveManager from './game/saveManager.js';
import CreditsStore from './game/creditsStore.js';
import TutorialManager from './game/tutorial.js';
import Camera from './engine/camera.js';
import Renderer, { isoProject, screenToGrid, TILE_W, TILE_H } from './engine/renderer.js';
import HUD from './ui/HUD.js';
import { DEVICE_TYPES, LINK_TYPES } from './entities/Node.js';
import { ALL_TECH } from './game/techTree.js';

// Expose for locked-tech tooltip
window._netSimTech = { ALL_TECH };

// ── Global Modal Close Logic ──────────────────────────────
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.close;
    document.getElementById(id)?.classList.add('hidden');
  });
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal && modal.id !== 'authScreen') modal.classList.add('hidden');
  });
});

// ────────────────────────────────────────────────────────────
//  System references
// ────────────────────────────────────────────────────────────
let network, traffic, events_, contracts, techTree;
let ipManager, cli, saveManager, creditsStore, tutorial;
let camera, renderer, hud, security;
let lastTime = 0;
let gameRunning = false;
let selectedNode = null;
let cableStartNode = null;
let pingStartNode = null;
let activeTool = 'select';
let activeCableType = 'ethernet';
let nodeToMove = null;

const canvas = document.getElementById('gameCanvas');

// ════════════════════════════════════════════════════════════
//  BOOTSTRAP v1.0 (Auth & Security)
// ════════════════════════════════════════════════════════════

initMatrixBackground();
initSecurity();

async function initSecurity() {
  security = new Security(); // Starts DevTools detection

  // Check session
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('API down');
    const data = await res.json();

    if (data.authenticated) {
      GameState.currentUser = data.user;
      document.getElementById('authScreen')?.classList.add('hidden');

      const savedMode = localStorage.getItem('netsimMode');
      if (savedMode) {
        startGame(savedMode);
      } else {
        initSplash();
      }
    } else {
      showAuthScreen();
    }
  } catch (e) {
    // If backend isn't running (e.g. static preview), fallback to offline
    console.warn('Backend unavailable, running in offline mode.');
    document.getElementById('authScreen')?.classList.add('hidden');

    const savedMode = localStorage.getItem('netsimMode');
    if (savedMode) {
      startGame(savedMode);
    } else {
      initSplash();
    }
  }
}

function showAuthScreen() {
  const authScreen = document.getElementById('authScreen');
  authScreen.classList.remove('hidden');

  // Tabs
  const formLog = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');
  const formReset = document.getElementById('resetPassForm');
  const errBox = document.getElementById('authError');
  const triggers = document.querySelectorAll('[data-target]');
  const forms = {
    login: formLog,
    register: formReg,
    resetPass: formReset
  };

  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.tagName === 'A') e.preventDefault();

      // Remove active from Main Tabs
      document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));

      // If clicking a physical tab, set it active
      if (btn.tagName === 'BUTTON' && btn.parentElement.classList.contains('auth-tabs')) {
        btn.classList.add('active');
      }

      Object.values(forms).forEach(f => { if (f) f.classList.add('hidden'); });
      const target = btn.dataset.target;
      if (forms[target]) forms[target].classList.remove('hidden');
      errBox.classList.add('hidden');
    });
  });

  // Reset Submit
  if (formReset) {
    formReset.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.classList.add('hidden');
      const username = document.getElementById('resetUser').value;
      const backupCode = document.getElementById('resetCode').value;
      const newPassword = document.getElementById('resetNewPass').value;

      const btn = formReset.querySelector('button');
      btn.textContent = 'VALIDATING OVERRIDE...';
      try {
        const res = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, backupCode, newPassword })
        });
        const data = await res.json();
        btn.textContent = 'RESET AUTHORITY';
        if (data.success) {
          errBox.textContent = data.message + ` (${data.codesRemaining} codes left)`;
          errBox.style.color = 'var(--green)';
          errBox.classList.remove('hidden');
          setTimeout(() => {
            errBox.style.color = '';
            document.querySelector('[data-target="login"]').click();
          }, 3000);
        } else {
          errBox.textContent = data.error;
          errBox.classList.remove('hidden');
        }
      } catch {
        errBox.textContent = 'Server error. Try again.';
        errBox.classList.remove('hidden');
        btn.textContent = 'RESET AUTHORITY';
      }
    });
  }

  // Policy Modal
  document.getElementById('linkPolicy').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('policyModal').classList.remove('hidden');
  });

  // Login Submit
  formLog.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        GameState.currentUser = data.user;
        authScreen.classList.add('hidden');
        initSplash();
      } else {
        errBox.textContent = data.error;
        errBox.classList.remove('hidden');
      }
    } catch {
      errBox.textContent = 'Server error. Try again.';
      errBox.classList.remove('hidden');
    }
  });

  // Register Submit
  formReg.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');

    // Fingerprint
    const btn = formReg.querySelector('button');
    btn.textContent = 'GENERATING FINGERPRINT...';
    btn.disabled = true;

    const fp = await Security.getFingerprint();

    const payload = {
      username: document.getElementById('regUser').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPass').value,
      fingerprint: fp,
      policy_accepted: document.getElementById('regPolicy').checked
    };

    btn.textContent = 'VERIFYING WITH CENTRAL SERVER...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        GameState.currentUser = data.user;
        authScreen.classList.add('hidden');

        // Push 12 Backup Codes to Modal instantly
        if (data.backupCodes) {
          const codeList = document.getElementById('backupCodesList');
          if (codeList) codeList.innerHTML = data.backupCodes.map(c => `<div>${c}</div>`).join('');
          document.getElementById('backupCodesDisplay')?.classList.remove('hidden');
        }

        initSplash();
      } else {
        errBox.textContent = data.error || data.details?.[0] || 'Registration failed';
        errBox.classList.remove('hidden');
        btn.textContent = 'CREATE IDENTITY';
        btn.disabled = false;
      }
    } catch {
      errBox.textContent = 'Server error. Authentication backend unreachable.';
      errBox.classList.remove('hidden');
      btn.textContent = 'CREATE IDENTITY';
      btn.disabled = false;
    }
  });
}

// ════════════════════════════════════════════════════════════
//  SPLASH SCREEN
// ════════════════════════════════════════════════════════════

function initMatrixBackground() {
  const splashCanvas = document.getElementById('splashCanvas');
  const sCtx = splashCanvas.getContext('2d');

  function resizeCanvas() {
    splashCanvas.width = window.innerWidth;
    splashCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Matrix rain
  const cols = Math.floor(splashCanvas.width / 18);
  const drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -80));
  const chars = '01アイウエオカキク /_#NETSIM';

  function drawMatrix() {
    // Only stop if game is fully running
    if (gameRunning) return;

    sCtx.fillStyle = 'rgba(5,8,16,0.07)';
    sCtx.fillRect(0, 0, splashCanvas.width, splashCanvas.height);
    sCtx.font = '14px "Share Tech Mono"';

    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const g = Math.random() > 0.97 ? '#00f5ff' : '#39ff14';
      sCtx.fillStyle = g;
      sCtx.fillText(ch, i * 18, drops[i] * 18);
      if (drops[i] * 18 > splashCanvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(drawMatrix);
  }
  drawMatrix();
}

function initSplash() {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.remove('hidden');

  // Button handlers
  document.getElementById('btnCampaign').onclick = () => startGame('campaign');
  document.getElementById('btnSandbox').onclick = () => startGame('sandbox');
  document.getElementById('btnTutorial').onclick = () => {
    document.getElementById('tutorialOverlay').classList.remove('hidden');
  };

  // Settings App Hooks
  const openSettings = () => document.getElementById('settingsModal').classList.remove('hidden');
  const btnSettings1 = document.getElementById('btnSettingsMenu');
  const btnSettings2 = document.getElementById('btnSettingsInGame');
  if (btnSettings1) btnSettings1.onclick = openSettings;
  if (btnSettings2) btnSettings2.onclick = openSettings;

  document.getElementById('btnRegenerateCodes')?.addEventListener('click', async () => {
    const pwd = document.getElementById('regenPassword').value;
    if (!pwd) return hud?.toast('Error', 'Input current password to regenerate keys.', 'red');

    const res = await fetch('/api/auth/settings/regenerate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const body = await res.json();
    if (body.success) {
      document.getElementById('regenPassword').value = '';
      const codeList = document.getElementById('backupCodesList');
      if (codeList) codeList.innerHTML = body.backupCodes.map(c => `<div>${c}</div>`).join('');
      document.getElementById('settingsModal').classList.add('hidden');
      document.getElementById('backupCodesDisplay').classList.remove('hidden');
    } else {
      hud?.toast('Authentication Refused', body.error, 'red');
    }
  });

  document.getElementById('btnDeleteRequest')?.addEventListener('click', async () => {
    const u = document.getElementById('delUsername').value;
    const p = document.getElementById('delPassword').value;
    if (!u || !p) return hud?.toast('Error', 'Fill all required identity fields', 'amber');

    const res = await fetch('/api/auth/settings/delete-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const body = await res.json();
    if (body.success) {
      alert('ACCOUNT FLAG RECEIVED. SESSION TERMINATED.');
      window.location.reload();
    } else {
      hud?.toast('Purge Failed', body.error, 'red');
    }
  });

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.onclick = async () => {
      await fetch('/api/auth/logout');
      location.reload();
    };
    if (!GameState.currentUser) btnLogout.style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════
//  GAME INITIALIZATION
// ════════════════════════════════════════════════════════════

async function startGame(mode) {
  localStorage.setItem('netsimMode', mode);
  document.getElementById('splash').classList.add('hidden');
  document.getElementById('gameUI').classList.remove('hidden');
  document.getElementById('modeVal').textContent = mode === 'campaign' ? 'Campaign' : 'Sandbox';

  if (!localStorage.getItem('netsim_perf_ack_v2')) {
    document.getElementById('perfAdvisoryModal')?.classList.remove('hidden');
    localStorage.setItem('netsim_perf_ack_v2', 'true');
  }

  GameState.reset();
  GameState.mode = mode;

  // Init Base Systems
  network = new Network();
  hud = new HUD();
  camera = new Camera(canvas);
  renderer = new Renderer(canvas, camera, network);
  traffic = new TrafficSimulator(network);
  contracts = new ContractsManager(hud);
  techTree = new TechTreeManager(hud);
  tutorial = new TutorialManager(hud);
  events_ = new EventsEngine(network, traffic, hud);

  // Init V1.0 Systems
  ipManager = new IPManager();
  cli = new CLI(network, ipManager, hud);
  saveManager = new SaveManager(network, ipManager);
  creditsStore = new CreditsStore(hud);

  // Setup Draggable UI components
  makeDraggable(document.getElementById('inspectorPanel'));
  makeDraggable(document.getElementById('cliPanel'));

  // Share network ref so events can access it
  GameState.network = network;
  GameState.renderer = renderer;
  GameState.camera = camera;
  GameState.ipManager = ipManager;
  GameState.contracts = contracts;

  // Load save OR initialize new
  let loaded = false;
  try {
    loaded = await saveManager.load();
  } catch (e) {
    console.warn('[SaveManager] Load failed:', e);
  }
  // Also try localStorage fallback regardless
  if (!loaded) {
    loaded = saveManager._loadLocal();
  }

  if (!loaded) {
    if (mode === 'sandbox') {
      placeSampleNetwork();
    } else {
      hud.logEvent('Welcome to NetSim Empire v1.0', 'info');
      hud.toast('🎯 Campaign Started', 'Accept contracts to begin.', 'info');
      // If it's a completely fresh start
      if (typeof tutorial !== 'undefined') tutorial.start();
    }
  } else {
    hud.toast('💾 Game Loaded', 'Session restored successfully.', 'success');
    hud.logEvent('Session restored from save data.', 'success');
  }

  // Restore IPs for any loaded nodes
  for (const node of network.nodes.values()) {
    if (!ipManager.getAssignment(node.id)) {
      ipManager.assignAuto(node, network);
    }
  }

  // Start auto-save (also saves to localStorage every cycle)
  saveManager.startAutoSave();

  // Load credits balance
  creditsStore.getBalance();

  // Position camera
  const centerIso = isoProject(10, 10);
  camera.centerOn(centerIso.x, centerIso.y);
  camera.zoom = 1.1;

  // UI bindings
  bindUI();
  hud.refreshToolbar();

  // Level-up event listener
  window.addEventListener('netsimLevelUp', (e) => {
    const lvl = e.detail.level;
    hud.toast('🎉 Level Up!', `You are now ${GameState.levelLabel}`, 'success');
    hud.logEvent(`LEVEL UP → ${GameState.levelLabel} (Level ${lvl})`, 'success');
  });

  // Clear matrix background
  const splashCanvas = document.getElementById('splashCanvas');
  const sCtx = splashCanvas?.getContext('2d');
  if (sCtx) sCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);

  // Start game loop
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function placeSampleNetwork() {
  const r = network.addNode('Router', 8, 8);
  const sw = network.addNode('Switch', 10, 8);
  const sv = network.addNode('Server', 12, 8);
  const p1 = network.addNode('PC', 9, 6);
  const p2 = network.addNode('PC', 11, 6);

  network.addLink(r.id, sw.id, 'ethernet');
  network.addLink(sw.id, sv.id, 'ethernet');
  network.addLink(sw.id, p1.id, 'ethernet');
  network.addLink(sw.id, p2.id, 'ethernet');

  GameState.clients = 2;
  hud.logEvent('Sandbox: Starter office network placed', 'success');
  hud.toast('🗺️ Sandbox Mode', 'Starter network placed.', 'info');
}

// ════════════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════════════

function gameLoop(now) {
  if (!gameRunning) return;
  const dt = Math.min(now - lastTime, 100);  // cap at 100ms
  lastTime = now;

  if (!GameState.paused) {
    GameState.totalTime += dt / 1000;
    traffic.update(dt);
    events_.update(dt);
    contracts.update(dt, network);
    if (typeof tutorial !== 'undefined') tutorial.update(network, activeTool);

    // Track downtime: if any node is offline, accumulate downtime proportionally
    const allNodes = [...network.nodes.values()];
    if (allNodes.length > 0) {
      const offlineCount = allNodes.filter(n => !n.online).length;
      if (offlineCount > 0) {
        GameState.downtime += (dt / 1000) * (offlineCount / allNodes.length);
      }
    }

    // Watchdog: Disconnected endpoints power down
    const ENDPOINTS = new Set(['PC', 'Laptop', 'Mobile']);
    for (const node of allNodes) {
      if (!node.rebooting && ENDPOINTS.has(node.type)) {
        if (node.links.length === 0 && node.online) {
          node.online = false;
        } else if (node.links.length > 0 && !node.online && node.health > 0) {
          node.online = true;
        }
      }
    }

    // Clients: scale with online nodes and completed contracts
    const baseClients = Math.floor(network.nodes.size * 5 + GameState.completedContracts.length * 15);
    if (baseClients > GameState.clients) {
      GameState.clients = Math.min(GameState.clients + 1, baseClients);
    }

    hud.update(dt);
    hud.updateMissionProgress(contracts);
  }

  renderer.render(dt / 1000);

  requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════════════════════
//  INPUT / CANVAS INTERACTION
// ════════════════════════════════════════════════════════════

function bindUI() {

  // ── Canvas mouse events ─────────────────────────────────

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = camera.screenToWorld(sx, sy);
    const grid = screenToGrid(sx, sy, camera);

    renderer.mouseWorld = world;
    renderer.hoverGrid = grid;

    // Ghost device preview
    if (['Mobile', 'Laptop', 'PC', 'Router', 'Switch', 'Server', 'Firewall', 'WiFiAP', 'LoadBalancer', 'IDS', 'CDN', 'CoreRouter', 'Hyperscaler'].includes(activeTool)) {
      const occupied = !!network.getNodeAt(grid.gridX, grid.gridY);
      renderer.ghostDevice = { type: activeTool, gridX: grid.gridX, gridY: grid.gridY, occupied };
    } else if (activeTool === 'move' && nodeToMove) {
      // Show ghost of the grabbed node — red if occupied, green if empty
      const tileNode = network.getNodeAt(grid.gridX, grid.gridY);
      const occupied = tileNode && tileNode.id !== nodeToMove.id;
      renderer.ghostDevice = { type: nodeToMove.type, gridX: grid.gridX, gridY: grid.gridY, occupied };
    } else {
      renderer.ghostDevice = null;
    }

    // Tooltip on hover
    const hoveredNode = network.getNodeAt(grid.gridX, grid.gridY);
    if (hoveredNode && activeTool === 'select') {
      const IP = ipManager.getAssignment(hoveredNode.id)?.ip || '-';
      const insp = hoveredNode.toInspect();
      insp.IP = IP; // Inject IP
      hud.showTooltip(e.clientX, e.clientY, insp);
    } else {
      hud.hideTooltip();
      // Check link hover
      const hoveredLink = getLinkAtScreen(sx, sy);
      if (hoveredLink && activeTool === 'select') {
        hud.showTooltip(e.clientX, e.clientY, hoveredLink.toInspect());
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hud.hideTooltip();
    renderer.ghostDevice = null;
  });

  canvas.addEventListener('click', e => {
    if (camera.isDragging) return;
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const grid = screenToGrid(sx, sy, camera);

    handleCanvasClick(grid.gridX, grid.gridY, sx, sy);
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    deselect();
  });

  // ── Tool Buttons ─────────────────────────────────────────

  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (btn.classList.contains('locked')) {
        hud.toast('🔒 Locked', 'Unlock this in the Tech Tree first!', 'warn');
        return;
      }
      setActiveTool(tool);
    });
  });

  document.querySelectorAll('.cable-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) {
        hud.toast('🔒 Locked', 'Unlock this cable in the Tech Tree!', 'warn');
        return;
      }
      document.querySelectorAll('.cable-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCableType = btn.dataset.cable;
    });
  });

  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GameState.activeLayer = btn.dataset.layer;
      hud.logEvent(`Layer view: ${btn.dataset.layer}`, 'info');
    });
  });

  // ── HUD Buttons ───────────────────────────────────────────

  document.getElementById('btnContracts').addEventListener('click', () => {
    const modal = document.getElementById('contractsModal');
    if (modal.classList.contains('hidden')) {
      hud.renderContractsModal(contracts);
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  });

  document.getElementById('btnTechTreeOpen').addEventListener('click', () => {
    const modal = document.getElementById('techTreeModal');
    if (modal.classList.contains('hidden')) {
      hud.renderTechTree(techTree);
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  });

  document.getElementById('btnPause').addEventListener('click', () => {
    GameState.paused = !GameState.paused;
    const btn = document.getElementById('btnPause');
    btn.textContent = GameState.paused ? '▶' : '⏸';
    btn.classList.toggle('active', GameState.paused);
    hud.toast(GameState.paused ? '⏸ Paused' : '▶ Resumed', '', 'info');
    hud.logEvent(GameState.paused ? 'Game paused' : 'Game resumed', 'info');
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) overlay.classList.toggle('hidden', !GameState.paused);
  });

  document.getElementById('btnTerminal').addEventListener('click', () => {
    cli.toggle();
  });

  document.getElementById('btnStore').addEventListener('click', () => {
    const modal = document.getElementById('creditsStoreModal');
    creditsStore.renderModal();
    modal.classList.remove('hidden');
  });

  document.getElementById('btnLeaderboard').addEventListener('click', async () => {
    const modal = document.getElementById('leaderboardModal');
    const tbody = document.getElementById('leaderboardList');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading intel...</td></tr>';
    modal.classList.remove('hidden');

    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      tbody.innerHTML = '';
      if (!data.leaderboard || data.leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data available.</td></tr>';
      } else {
        data.leaderboard.forEach((user, index) => {
          const isMe = GameState.currentUser && user.username === GameState.currentUser.username;
          tbody.innerHTML += `
            <tr style="${isMe ? 'background: rgba(0,245,255,0.1); font-weight:bold;' : ''}">
              <td style="padding:10px;">#${index + 1}</td>
              <td style="padding:10px;">${user.username} ${user.status === 'suspended' ? '<span style="color:red; font-size:10px;">[BANNED]</span>' : ''}</td>
              <td style="padding:10px; text-align:right; color:var(--green);">Lv.${user.level || 1} &mdash; ${Math.floor(user.xp).toLocaleString()} XP</td>
            </tr>
          `;
        });
      }
    } catch {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Offline.</td></tr>';
    }
  });

  document.getElementById('btnCreditsTop').addEventListener('click', () => {
    const modal = document.getElementById('creditsStoreModal');
    creditsStore.renderModal();
    modal.classList.remove('hidden');
  });


  // ── Speed Test Modal ───────────────────────────────────────
  document.getElementById('btnSpeedTest')?.addEventListener('click', () => {
    document.getElementById('speedTestModal').classList.remove('hidden');
    document.getElementById('speedTestBody').innerHTML = `
      <div style="text-align:center;padding:30px 0;color:var(--muted);">Click "Run Test" to begin diagnostics.</div>
    `;
    const btn = document.getElementById('btnRunSpeedTest');
    if (btn) {
      btn.textContent = '▶ Run Test';
      btn.disabled = false;
    }
  });

  document.getElementById('btnRunSpeedTest')?.addEventListener('click', () => {
    const btn = document.getElementById('btnRunSpeedTest');
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';

    const body = document.getElementById('speedTestBody');
    body.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--cyan);">Running diagnostic probe...</div>`;

    setTimeout(() => {
      let score = 0;
      let grade = 'F';
      const devices = network.nodes.size;
      const throughput = GameState.throughputMbps;
      const latency = GameState.latencyMs;
      const loss = GameState.packetLossRate;
      const uptime = GameState.uptimePct;

      if (devices > 5) score += 10;
      if (devices > 20) score += 10;
      if (devices > 50) score += 10;

      if (throughput > 100) score += 10;
      if (throughput > 1000) score += 20;
      if (throughput > 10000) score += 20;

      if (latency < 100 && latency > 0) score += 10;
      if (latency < 20 && latency > 0) score += 10;
      if (latency <= 5 && latency > 0) score += 10;

      if (loss < 5) score += 10;
      if (loss === 0) score += 10;

      if (uptime > 99) score += 10;
      if (uptime >= 99.99) score += 10;

      if (score >= 130) grade = 'S+';
      else if (score >= 100) grade = 'S';
      else if (score >= 80) grade = 'A';
      else if (score >= 60) grade = 'B';
      else if (score >= 40) grade = 'C';
      else grade = 'D';
      if (devices === 0) grade = 'F';

      const c = (grade.includes('S') || grade === 'A') ? 'var(--green)' :
        (grade === 'B' || grade === 'C') ? 'var(--amber)' : 'var(--red)';

      body.innerHTML = `
          <div style="text-align:center; font-size:48px; font-weight:800; color:${c}; margin-bottom:10px;">${grade}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:var(--panel-bg); padding:10px; border-radius:4px;">
              <div style="color:var(--muted); font-size:10px;">THROUGHPUT</div>
              <div style="font-size:14px; font-weight:600;">${throughput >= 1000 ? (throughput / 1000).toFixed(1) + ' Gbps' : throughput.toFixed(0) + ' Mbps'}</div>
            </div>
            <div style="background:var(--panel-bg); padding:10px; border-radius:4px;">
              <div style="color:var(--muted); font-size:10px;">LATENCY</div>
              <div style="font-size:14px; font-weight:600;">${latency.toFixed(1)} ms</div>
            </div>
            <div style="background:var(--panel-bg); padding:10px; border-radius:4px;">
              <div style="color:var(--muted); font-size:10px;">PACKET LOSS</div>
              <div style="font-size:14px; font-weight:600;">${loss.toFixed(1)}%</div>
            </div>
            <div style="background:var(--panel-bg); padding:10px; border-radius:4px;">
              <div style="color:var(--muted); font-size:10px;">INFRASTRUCTURE</div>
              <div style="font-size:14px; font-weight:600;">${devices} Nodes</div>
            </div>
          </div>
          <div style="margin-top:15px; text-align:center; font-size:10px; color:var(--muted);">
            Evaluation Score: ${score} / 150
          </div>
        `;
      btn.textContent = '🔄 Retest';
      btn.disabled = false;
    }, 1500);
  });

  // ── Store Modals Delegates ───────────────────────────────
  document.getElementById('creditsStoreModal').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-buy')) {
      const packId = e.target.dataset.packId;
      e.target.textContent = 'Processing...'; e.target.disabled = true;
      await creditsStore.purchase(packId);
      creditsStore.renderModal(); // refresh
    }
    if (e.target.classList.contains('btn-convert')) {
      const spendAmt = parseInt(e.target.dataset.spend);
      e.target.textContent = 'Converting...'; e.target.disabled = true;
      await creditsStore.spendCredits(spendAmt);
      creditsStore.renderModal();
    }
  });

  // ── Contracts Select  ─────────────────────────────────────
  document.getElementById('contractsList').addEventListener('click', e => {
    const btn = e.target.closest('[data-contract-id]');
    if (!btn) return;
    contracts.accept(btn.dataset.contractId, network);
    hud.renderContractsModal(contracts);
  });

  // ── Tech Tree Unlock  ─────────────────────────────────────
  document.getElementById('techTreeContent').addEventListener('click', e => {
    const node = e.target.closest('.tech-node');
    if (!node) return;
    const techId = node.dataset.techId;
    const status = node.classList.contains('unlocked') ? 'unlocked' :
      node.classList.contains('available') ? 'available' : 'locked';

    if (status === 'unlocked') {
      hud.toast('✅ Already Owned', 'This technology is already unlocked.', 'info');
    } else if (status === 'available') {
      techTree.unlock(techId);
      hud.renderContractsModal(contracts);
    } else {
      const { ALL_TECH } = window._netSimTech || {};
      const tech = ALL_TECH?.find(t => t.id === techId);
      const missing = tech?.prereq.filter(p => !GameState.unlockedTech.has(p)) || [];
      hud.toast('🔒 Locked', missing.length ? `Requires: ${missing.join(', ')}` : 'Prerequisites not met', 'warn');
    }
  });

  // ── Inspector buttons ─────────────────────────────────────
  document.getElementById('inspDelete').addEventListener('click', () => {
    if (selectedNode) {
      network.removeNode(selectedNode.id);
      ipManager.removeAssignment(selectedNode.id);
      hud.logEvent(`Deleted ${selectedNode.label}`, 'warning');
      deselect();
    }
  });

  document.getElementById('inspReboot')?.addEventListener('click', () => {
    if (selectedNode) {
      if (selectedNode.rebooting) {
        hud.toast('⏳ Processing', `${selectedNode.label} is currently being repaired. Please wait.`, 'warn');
        return;
      }

      const def = DEVICE_TYPES[selectedNode.type] || { cost: 500 };
      const cost = Math.max(10, Math.floor(def.cost * 0.30)); // 30% flat cost for repairs

      if (selectedNode.health >= selectedNode.healthMax && selectedNode.online) {
        hud.toast('✅ Safe', `${selectedNode.label} is healthy and online. No need to repair.`, 'info');
      } else {
        if (!GameState.spend(cost)) {
          hud.toast('💸 No Funds', `Repair requires $${cost.toLocaleString()}.`, 'danger');
          return;
        }

        const oldHealth = selectedNode.health;
        selectedNode.rebooting = true;
        selectedNode.online = false;
        network._invalidateCache(); // Disable all routing immediately
        hud.toast('🔧 Repairing', `Fixing ${selectedNode.label}... (Downtime: 5s, Cost: $${cost.toLocaleString()})`, 'info');
        hud.showInspector(selectedNode);

        setTimeout(() => {
          if (!network.nodes.has(selectedNode.id)) return; // Node got deleted

          selectedNode.rebooting = false;
          selectedNode.rebootCount++;
          selectedNode.repair(selectedNode.healthMax); // Changes .online back to true
          network._invalidateCache();

          hud.toast('✅ Repair Complete', `${selectedNode.label} is fully restored.`, 'success');
          hud.logEvent(`Repaired ${selectedNode.label}: ${oldHealth}→${selectedNode.healthMax} HP (Cost: $${cost})`, 'success');

          if (selectedNode && selectedNode.id === selectedNode.id && !document.getElementById('inspectorPanel').classList.contains('hidden')) {
            hud.showInspector(selectedNode);
          }
        }, 5000);
      }
    }
  });

  document.getElementById('inspCLI')?.addEventListener('click', () => {
    if (selectedNode) {
      cli.open();
      const input = document.getElementById('cliInput');
      if (input) {
        input.value = `ping ${selectedNode.id}`;
        input.focus();
      }
    }
  });

  // btnTerminal listener is already bound above (line ~510)
  // No duplicate needed here

  document.getElementById('btnExit')?.addEventListener('click', () => {
    localStorage.removeItem('netsimMode');
    location.reload();
  });

  // ── Mass Delete ────────────────────────────────────────────
  document.getElementById('btnMassDelete')?.addEventListener('click', () => {
    const nodeCount = network.nodes.size;
    if (nodeCount === 0) {
      hud.toast('⚠️ Empty', 'No devices to delete.', 'warn');
      return;
    }
    if (!confirm(`⚠️ Delete ALL ${nodeCount} devices and ${network.links.size} cables? This cannot be undone!`)) return;

    const ids = [...network.nodes.keys()];
    for (const id of ids) {
      ipManager.removeAssignment(id);
      network.removeNode(id);
    }
    deselect();
    hud.toast('💣 Mass Delete', `Removed ${nodeCount} devices.`, 'warning');
    hud.logEvent(`Mass delete: ${nodeCount} devices removed`, 'warning');
  });

  // ── Keyboard shortcuts ────────────────────────────────────
  window.addEventListener('keydown', e => {
    // Isolated Event Hook - Prevent shortcut overlaps
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.closest('[contenteditable]')) {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        cli.toggle();
      }
      return;
    }

    // Ignore physical holding limits for system menus
    if (e.repeat && !['Backspace', 'Delete'].includes(e.key)) return;

    switch (e.key) {
      case 'Escape': deselect(); cli.close(); break;
      case '`': case '~': cli.toggle(); break;
      case 'Delete':
      case 'Backspace':
        if (selectedNode) {
          network.removeNode(selectedNode.id);
          ipManager.removeAssignment(selectedNode.id);
          hud.logEvent(`Deleted ${selectedNode.label}`, 'warning');
          deselect();
        }
        break;
      case 'p': case 'P':
        GameState.paused = !GameState.paused;
        document.getElementById('btnPause').textContent = GameState.paused ? '\u25b6' : '\u23f8';
        document.getElementById('pauseOverlay')?.classList.toggle('hidden', !GameState.paused);
        hud.logEvent(GameState.paused ? 'Game paused' : 'Game resumed', 'info');
        break;
      case 'r': case 'R': setActiveTool('Router'); break;
      case 's': case 'S': setActiveTool('Switch'); break;
      case 'c': case 'C': setActiveTool('cable'); break;
      case 'v': case 'V': setActiveTool('select'); break;
      case 'd': case 'D': setActiveTool('delete'); break;
    }
  });

  window.addEventListener('resize', () => {
    if (renderer) renderer._resize();
  });

  // ── Auto-income ───────────────────────────────────────────
  setInterval(() => {
    if (!gameRunning || GameState.paused) return;
    if (network.links.size > 0) {
      const income = Math.floor(network.nodes.size * 10 * Math.max(1, GameState.clients) * 0.05);
      if (income > 0) {
        GameState.earn(income);
        GameState.gainXP(income / 100);
      }
    }
    if (GameState.packetLossRate > 5) {
      GameState.satisfaction = Math.max(0, GameState.satisfaction - 2);
    } else {
      GameState.satisfaction = Math.min(100, GameState.satisfaction + 1);
    }
  }, 5000);
}

// ════════════════════════════════════════════════════════════
//  CANVAS CLICK HANDLER
// ════════════════════════════════════════════════════════════

function handleCanvasClick(gridX, gridY, sx, sy) {
  const existingNode = network.getNodeAt(gridX, gridY);

  if (activeTool === 'cable') {
    if (existingNode) {
      if (!cableStartNode) {
        cableStartNode = existingNode;
        renderer.cableStart = existingNode;
        hud.logEvent(`Cable from: ${existingNode.label} (${existingNode.id})`, 'info');
      } else if (cableStartNode.id !== existingNode.id) {
        // ── Cable compatibility check ──
        const compat = _checkCableCompat(cableStartNode, existingNode, activeCableType);
        if (!compat.ok) {
          hud.toast('🚫 Incompatible', compat.reason, 'warn');
          hud.logEvent(compat.reason, 'warning');
          cableStartNode = null; renderer.cableStart = null;
          return;
        }
        // Distance-based cost: base cost * (1 + distance/3)
        const baseCost = LINK_TYPES[activeCableType]?.cost || 50;
        const dx = cableStartNode.gridX - existingNode.gridX;
        const dy = cableStartNode.gridY - existingNode.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cost = Math.ceil(baseCost * (1 + dist / 3));
        if (!GameState.spend(cost)) {
          hud.toast('💸 No Funds', `Cable costs $${cost} (${dist.toFixed(1)} tiles). Earn more from contracts!`, 'warn');
          hud.logEvent(`Insufficient funds for cable ($${cost} needed, have $${GameState.money})`, 'warning');
          cableStartNode = null; renderer.cableStart = null;
          return;
        }
        const link = network.addLink(cableStartNode.id, existingNode.id, activeCableType);
        if (link) {
          const ENDPOINTS = new Set(['PC', 'Laptop', 'Mobile']);
          if (ENDPOINTS.has(cableStartNode.type) && ENDPOINTS.has(existingNode.type)) {
            hud.logEvent(`Point-to-Point connection established: ${cableStartNode.label} ↔ ${existingNode.label}`, 'success');
            hud.toast('🔗 P2P Linked', `Endpoints connected directly via ${link.label}.`, 'info');
          } else {
            hud.logEvent(`Connected ${cableStartNode.label} ↔ ${existingNode.label} via ${link.label}`, 'success');
          }
        } else {
          GameState.earn(cost); // refund
          hud.toast('⚠️ Invalid', 'Cannot connect these nodes (duplicate or same node).', 'warn');
        }
        cableStartNode = null; renderer.cableStart = null;
      }
    } else {
      if (cableStartNode) { cableStartNode = null; renderer.cableStart = null; }
    }
    return;
  }

  if (activeTool === 'ping') {
    if (existingNode) {
      if (!pingStartNode) {
        pingStartNode = existingNode;
        existingNode.selected = true;
        hud.toast('📨 Message Origin', `Origin: ${existingNode.label}. Now click destination.`, 'info');
      } else if (pingStartNode.id !== existingNode.id) {
        pingStartNode.selected = false;
        sendMessageBetweenNodes(pingStartNode.id, existingNode.id, 'HTTP');
        pingStartNode = null;
      }
    } else {
      if (pingStartNode) { pingStartNode.selected = false; pingStartNode = null; }
    }
    return;
  }

  if (activeTool === 'move') {
    if (!nodeToMove) {
      if (existingNode) {
        nodeToMove = existingNode;
        existingNode.selected = true;
        hud.toast('✋ Node Grabbed', `Click empty space to drop ${existingNode.label} (${existingNode.id})`, 'info');
      }
    } else {
      if (!existingNode) {
        // Drop node
        nodeToMove.gridX = gridX;
        nodeToMove.gridY = gridY;
        nodeToMove.selected = false;
        nodeToMove = null;
        renderer.ghostDevice = null;
        network._pathCache.clear(); // Important: Links physically adapt, clear path cache
        hud.toast('✅ Relocated', 'Successfully moved!', 'success');
      } else if (existingNode.id === nodeToMove.id) {
        // Drop back to original
        nodeToMove.selected = false;
        nodeToMove = null;
        renderer.ghostDevice = null;
      } else {
        hud.toast('⚠️ Blocked', 'That coordinate is already occupied.', 'warn');
      }
    }
    return;
  }

  if (activeTool === 'delete') {
    if (existingNode) {
      network.removeNode(existingNode.id);
      ipManager.removeAssignment(existingNode.id);
      hud.logEvent(`Deleted ${existingNode.label}`, 'warning');
    } else {
      const link = getLinkAtScreen(sx, sy);
      if (link) {
        network.removeLink(link.id);
        hud.logEvent(`Removed ${link.label} cable`, 'warning');
      }
    }
    return;
  }



  const DEVICE_TOOLS = ['Mobile', 'Laptop', 'PC', 'Router', 'Switch', 'Server', 'Firewall', 'WiFiAP', 'LoadBalancer', 'IDS', 'CDN', 'CoreRouter', 'Hyperscaler'];
  if (DEVICE_TOOLS.includes(activeTool)) {
    if (existingNode) {
      hud.toast('⚠️ Occupied', 'There is already a device here.', 'warn');
      return;
    }

    const def = DEVICE_TYPES[activeTool];
    if (!def) return;
    if (gridX < 0 || gridY < 0 || gridX > 35 || gridY > 35) {
      hud.toast('⚠️ Out of bounds', 'Place devices within the grid.', 'warn');
      return;
    }

    if (!GameState.spend(def.cost)) {
      hud.toast('💸 Insufficient Funds', `${def.label} costs $${def.cost.toLocaleString()}`, 'warn');
      hud.logEvent(`Insufficient funds: ${def.label} costs $${def.cost.toLocaleString()} (have $${GameState.money.toLocaleString()})`, 'warning');
      return;
    }

    const node = network.addNode(activeTool, gridX, gridY);
    ipManager.assignAuto(node, network); // v1.0 Auto assign IP

    hud.logEvent(`Placed ${def.label} at (${gridX}, ${gridY}) — $${def.cost}`, 'info');
    GameState.gainXP(def.cost / 50);
    return;
  }

  if (activeTool === 'select') {
    if (existingNode) {
      selectNode(existingNode);
    } else {
      const link = getLinkAtScreen(sx, sy);
      if (link) {
        deselect();
        hud.showInspector(link);
      } else {
        deselect();
      }
    }
  }
}

// ════════════════════════════════════════════════════════════
//  SELECTION
// ════════════════════════════════════════════════════════════

function selectNode(node) {
  if (selectedNode) selectedNode.selected = false;
  selectedNode = node;
  node.selected = true;
  renderer.selectedNode = node;
  hud.showInspector(node);

  // Inject IP into inspector UI (HUD.js does its own update, we just append here safely)
  setTimeout(() => {
    const assign = ipManager.getAssignment(node.id);
    const ipStr = assign ? `${assign.ip}/${assign.cidr}` : 'Unassigned';
    const inspIP = document.getElementById('inspIP');
    if (inspIP) inspIP.textContent = ipStr;
  }, 10);
}

function deselect() {
  if (selectedNode) { selectedNode.selected = false; selectedNode = null; }
  renderer.selectedNode = null;
  renderer.cableStart = null;
  cableStartNode = null;
  if (pingStartNode) { pingStartNode.selected = false; pingStartNode = null; }
  if (nodeToMove) { nodeToMove.selected = false; nodeToMove = null; }
  hud.hideInspector();
  hud.hideTooltip();
}

function setActiveTool(tool) {
  activeTool = tool;
  GameState.activeTool = tool;

  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (tool !== 'cable') {
    cableStartNode = null;
    renderer.cableStart = null;
  }
  if (tool !== 'move') {
    if (nodeToMove) { nodeToMove.selected = false; nodeToMove = null; }
  }
  if (tool !== 'ping') {
    if (pingStartNode) { pingStartNode.selected = false; pingStartNode = null; }
  }

  if (tool === 'select') canvas.className = 'cursor-select';
  else if (tool === 'delete') canvas.className = 'cursor-delete';
  else if (tool === 'move' || tool === 'ping') canvas.className = 'cursor-move';
  else canvas.className = '';
}

// ════════════════════════════════════════════════════════════
//  LINK HIT TEST
// ════════════════════════════════════════════════════════════

function getLinkAtScreen(sx, sy) {
  const world = camera.screenToWorld(sx, sy);
  let closest = null;
  let minDist = 15 / camera.zoom;

  for (const link of network.links.values()) {
    const posA = isoProject(link.from.gridX, link.from.gridY);
    const posB = isoProject(link.to.gridX, link.to.gridY);
    const dist = pointToBezierDist(world.x, world.y, posA, posB);
    if (dist < minDist) {
      minDist = dist;
      closest = link;
    }
  }
  return closest;
}

function pointToBezierDist(px, py, posA, posB) {
  let minDist = Infinity;
  for (let t = 0; t <= 1; t += 0.1) {
    const cp1y = posA.y - 12;
    const cp2y = posB.y - 12;
    const bx = cubicBezier(t, posA.x, posA.x, posB.x, posB.x);
    const by = cubicBezier(t, posA.y, cp1y, cp2y, posB.y);
    const d = Math.hypot(px - bx, py - by);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function cubicBezier(t, p0, p1, p2, p3) {
  const m = 1 - t;
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
}

// ════════════════════════════════════════════════════════════
//  CABLE COMPATIBILITY TABLE
// ════════════════════════════════════════════════════════════

/*  Rules:
 *  - Ethernet (copper): connects any two devices EXCEPT two PCs directly
 *    (PCs need at least a Switch/Router in between)
 *  - Wireless: at least one end MUST be a WiFi AP
 *  - Fiber: at least one end must be infrastructure (Router, Switch, Server,
 *    Firewall, LoadBalancer, CDN) — no PC-to-PC fiber
 *  - 400G Fiber: both ends must be high-tier infrastructure
 *    (Server, LoadBalancer, CDN, Router)
 */

const INFRA_TYPES = new Set(['Router', 'Switch', 'Server', 'Firewall', 'LoadBalancer', 'IDS', 'CDN', 'CoreRouter', 'Hyperscaler']);
const HIGHTIER_INFRA = new Set(['Router', 'Server', 'LoadBalancer', 'CDN', 'CoreRouter', 'Hyperscaler']);

function _checkCableCompat(nodeA, nodeB, cableType) {
  const tA = nodeA.type;
  const tB = nodeB.type;

  if ((tA === 'Mobile' || tB === 'Mobile') && cableType !== 'wireless') {
    return { ok: false, reason: 'Mobile devices can only connect via Wireless links.' };
  }

  // Identify if this is a Point-to-Point endpoint connection
  const ENDPOINTS = new Set(['PC', 'Laptop', 'Mobile']);
  const isP2P = ENDPOINTS.has(tA) && ENDPOINTS.has(tB);

  switch (cableType) {
    case 'ethernet':
      // We specifically allow Point-to-Point Ethernet connection between endpoints!
      break;

    case 'wireless':
      if (tA !== 'WiFiAP' && tB !== 'WiFiAP')
        return { ok: false, reason: 'Wireless cables require at least one WiFi AP endpoint.' };
      break;

    case 'fiber':
      if (!INFRA_TYPES.has(tA) && !INFRA_TYPES.has(tB))
        return { ok: false, reason: 'Fiber requires at least one infrastructure device (Router, Switch, Server, etc).' };
      break;

    case 'fiber400':
      if (!HIGHTIER_INFRA.has(tA) || !HIGHTIER_INFRA.has(tB))
        return { ok: false, reason: '400G Fiber requires both endpoints to be high-tier (Router, Server, Load Balancer, CDN, Core Router, or Hyperscaler).' };
      break;

    case 'satellite':
      if (!INFRA_TYPES.has(tA) || !INFRA_TYPES.has(tB))
        return { ok: false, reason: 'Satellite links require both endpoints to be infrastructure devices.' };
      break;
  }

  return { ok: true };
}

// ════════════════════════════════════════════════════════════
//  MANUAL MESSAGE / PACKET SENDING
// ════════════════════════════════════════════════════════════

function sendMessageBetweenNodes(srcId, dstId, packetType = 'HTTP') {
  if (!network || !hud) return;
  const src = network.nodes.get(srcId);
  const dst = network.nodes.get(dstId);
  if (!src || !dst) { hud.toast('⚠️ Error', 'Source or destination node not found.', 'danger'); return; }
  if (!src.online) { hud.toast('🔴 Offline', `${src.label} is offline. Reboot it first.`, 'warn'); return; }
  if (!dst.online) { hud.toast('🔴 Offline', `${dst.label} is offline — cannot receive.`, 'warn'); return; }

  const path = network.findPath(srcId, dstId);
  if (!path) {
    hud.toast('❌ No Route', `No path exists from ${src.label} → ${dst.label}`, 'danger');
    hud.logEvent(`Send failed: No route ${src.label} → ${dst.label}`, 'warning');
    return;
  }

  const { PACKET_TYPES } = window._netSimPackets || {};
  let pktDef;
  if (PACKET_TYPES) {
    pktDef = PACKET_TYPES.find(p => p.type === packetType);
  }
  if (!pktDef) {
    pktDef = { type: packetType, color: '#00f5ff', size: 1, priority: 2, label: packetType };
  }

  // Emit along path
  traffic._emitPacketAlongPath(path, pktDef);
  traffic._totalSent++;

  hud.toast('📨 Message Sent', `${pktDef.type} packet: ${src.label} → ${dst.label} (${path.nodes.length} hops)`, 'success');
  hud.logEvent(`Sent ${pktDef.type}: ${src.label} → ${dst.label} (${path.nodes.length} hops, cost ${path.cost.toFixed(1)})`, 'info');
}

// Expose for the send-message modal
window._netSimSendMessage = sendMessageBetweenNodes;
window._netSimGetNetwork = () => network;
window._netSimHUD = hud;

// ════════════════════════════════════════════════════════════
//  UI DRAGGABLE HANDLER
// ════════════════════════════════════════════════════════════

function makeDraggable(el) {
  if (!el) return;
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  const header = el.querySelector('.drag-handle') || el;
  if (header !== el) header.style.cursor = 'grab';

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    if (header !== el) header.style.cursor = 'grabbing';
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    if (header !== el) header.style.cursor = 'grab';
  }
}

// ════════════════════════════════════════════════════════════
//  MULTI-SITE TELEPORT SYSTEM
// ════════════════════════════════════════════════════════════

window._netSimTeleportToClient = (contractId) => {
  if (GameState.activeSite !== 'home') return false;

  // Freeze Home Lab
  GameState.homeNetwork = network;
  GameState.homeIpManager = ipManager;
  saveManager.stopAutoSave();

  // Create isolated environment
  network = new Network();
  ipManager = new IPManager();
  GameState.activeSite = contractId;

  // Re-bind engine singletons
  GameState.network = network;
  GameState.ipManager = ipManager;
  renderer.network = network;
  traffic.network = network;
  events_.network = network;
  cli.network = network;
  cli.ipManager = ipManager;

  hud.toast('🚀 Teleporting...', 'Connecting to client environment.', 'warn');
  hud.logEvent(`Teleported to Client Site: ${contractId}`, 'warn');

  // Clear selection
  selectedNode = null;
  hud.hideInspector();
  return true;
};

window._netSimTeleportHome = () => {
  if (GameState.activeSite === 'home' || !GameState.homeNetwork) return false;

  // Restore Home Lab
  network = GameState.homeNetwork;
  ipManager = GameState.homeIpManager;
  GameState.activeSite = 'home';
  GameState.homeNetwork = null;
  GameState.homeIpManager = null;

  // Re-bind engine singletons
  GameState.network = network;
  GameState.ipManager = ipManager;
  renderer.network = network;
  traffic.network = network;
  events_.network = network;
  cli.network = network;
  cli.ipManager = ipManager;

  saveManager.startAutoSave();

  hud.toast('🏠 Returned', 'Reconnected to Home Lab.', 'success');
  hud.logEvent('Returned to base.', 'info');

  // Clear selection
  selectedNode = null;
  hud.hideInspector();
  return true;
};

// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Interactive Tutorial System v1.0
//  Expanded with Contracts walkthrough
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export class TutorialManager {
  constructor(ui) {
    this.ui = ui;
    this.active = false;
    this.step = 0;
    this.box = document.getElementById('tutorialBox');
    this.title = document.getElementById('tutTitle');
    this.body = document.getElementById('tutBody');
    this.skipBtn = document.getElementById('tutBtnSkip');

    // Track contract modal opened (set by HUD button listener)
    this._contractsOpened = false;

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => this.complete());
    }

    // Attempt to load status from local storage
    this.completed = localStorage.getItem('netsim_tutorial') === 'true';
  }

  start() {
    if (this.completed) return;
    this.active = true;
    this.step = 1;
    this.box.classList.remove('hidden');
    this.updateUI();
  }

  complete() {
    this.active = false;
    this.completed = true;
    localStorage.setItem('netsim_tutorial', 'true');
    this.box.classList.add('hidden');
    this.ui.toast('🎓 Tutorial Complete', 'You are now cleared for full operations. Expand your Empire!', 'success');
  }

  // Called externally when Contracts modal is opened
  notifyContractsOpened() {
    this._contractsOpened = true;
  }

  update(network, activeTool) {
    if (!this.active) return;

    switch (this.step) {
      case 1:
        // Needs to select PC tool
        if (activeTool === 'PC') {
          this.step = 2;
          this.updateUI();
        }
        break;

      case 2:
        // Needs to place a PC
        if (network.getNodesByType('PC').length > 0) {
          this.step = 3;
          this.updateUI();
        }
        break;

      case 3:
        // Needs to place a Server
        if (network.getNodesByType('Server').length > 0) {
          this.step = 4;
          this.updateUI();
        }
        break;

      case 4:
        // Needs to select Cable tool
        if (activeTool === 'cable') {
          this.step = 5;
          this.updateUI();
        }
        break;

      case 5:
        // Needs to connect nodes
        if (network.links.size > 0) {
          this.step = 6;
          this.updateUI();
        }
        break;

      case 6:
        // Needs to select SEND packet tool
        if (activeTool === 'ping') {
          this.step = 7;
          this.updateUI();
        }
        break;

      case 7:
        // Needs to SEND a packet
        if (GameState.totalPacketsSent > 0) {
          this.step = 8;
          this.updateUI();
        }
        break;

      case 8:
        // Needs to open Contracts modal
        if (this._contractsOpened) {
          this.step = 9;
          this.updateUI();
        }
        break;

      case 9:
        // Needs to accept a contract
        if (GameState.activeContracts.length > 0) {
          this.step = 10;
          this.updateUI();
        }
        break;

      case 10:
        // Needs to complete a contract (or have started building toward it)
        if (GameState.completedContracts.length > 0) {
          this.complete();
        }
        break;
    }
  }

  updateUI() {
    if (!this.active) return;
    switch (this.step) {
      case 1:
        this.title.textContent = 'Welcome, SysAdmin!';
        this.body.innerHTML = 'Let\'s build your very first network.<br><br>👉 Click the <b>🖥️ PC</b> button in the left <b>DEVICES</b> toolbar.';
        break;
      case 2:
        this.title.textContent = 'Deploy Hardware';
        this.body.innerHTML = 'Great! You have the PC tool selected.<br><br>👉 Now, <b>click anywhere</b> on the grid to drop your PC device.';
        break;
      case 3:
        this.title.textContent = 'Data Needs a Destination';
        this.body.innerHTML = 'Awesome! A PC alone cannot access the web.<br><br>👉 Select the <b>🗄️ Server</b> tool and drop it on the grid next to your PC.';
        break;
      case 4:
        this.title.textContent = 'Wiring the Network';
        this.body.innerHTML = 'Now we need to create a physical connection between them.<br><br>👉 Click the <b>🔗 Connect</b> cable icon in the toolbar (shortcut: <b>C</b>).';
        break;
      case 5:
        this.title.textContent = 'Terminate the Cable';
        this.body.innerHTML = '👉 With the Copper cable selected, <b>click your PC</b> and then <b>click your Server</b> to establish an Ethernet link.';
        break;
      case 6:
        this.title.textContent = 'Test the Connection';
        this.body.innerHTML = 'Traffic will automatically route, but to test if it is physically reachable, we use ping packets.<br><br>👉 Click the <b>📨 SEND</b> tool in the toolbar (shortcut: <b>G</b>).';
        break;
      case 7:
        this.title.textContent = 'Ping the Server';
        this.body.innerHTML = '👉 With the SEND tool active, <b>click your PC</b> first as the origin, and then <b>click your Server</b> as the destination.';
        break;
      case 8:
        this.title.textContent = '📋 Discover Contracts';
        this.body.innerHTML = 'Great work! Your first network is live. Now let\'s earn money through <b style="color:var(--amber);">Contracts</b> — missions from enterprise clients.<br><br>👉 Click the <b>📋 Contracts</b> button in the top navigation bar.';
        break;
      case 9:
        this.title.textContent = '🤝 Accept a Mission';
        this.body.innerHTML = 'Browse the available contracts. Each one has specific requirements you must build.<br><br>👉 Click <b style="color:var(--amber);">Accept Contract</b> on any available mission. You\'ll be teleported to the client\'s environment to build their network.';
        break;
      case 10:
        this.title.textContent = '🏗️ Complete the Contract';
        this.body.innerHTML = 'You\'re now in the client\'s isolated environment. Deploy the required devices and cables to fulfill the contract objectives.<br><br>Once all conditions are met, hold them for the required duration. You\'ll auto-return home with your reward!<br><br><small style="color:var(--muted);">Tip: Check the mission banner at the bottom for live progress.</small>';
        break;
    }
  }
}

export default TutorialManager;

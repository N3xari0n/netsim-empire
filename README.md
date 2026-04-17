<div align="center">

# 🌐 NETSIM EMPIRE

### *Build. Secure. Conquer.*

**The definitive UNIX-style network strategy simulation.**

---

<img src="https://img.shields.io/badge/Status-Active_Deployment-00f5ff?style=for-the-badge&logoColor=black">
<img src="https://img.shields.io/badge/Engine-Vanilla_JS-39ff14?style=for-the-badge&logoColor=black">
<img src="https://img.shields.io/badge/Backend-Node.js_+_SQLite-ffbf00?style=for-the-badge&logoColor=black">
<img src="https://img.shields.io/badge/Auth-Bcrypt_SHA256-ff2244?style=for-the-badge&logoColor=black">
<img src="https://img.shields.io/badge/Version-1.1-9d00ff?style=for-the-badge&logoColor=black">

</div>

---

## ⚡ What Is NetSim Empire?

NetSim Empire is a **highly-immersive, real-time multiplayer network strategy simulation** powered by Node.js and rendered entirely in the browser via HTML5 Canvas. You are dropped into an empty terminal with a single objective:

> **Architect global carrier-grade ISP networks from scratch.**

Deploy localized nodes, construct multi-layered defensive firewalls, survive DDoS storms, fulfill corporate contracts, and scale from a startup garage to a global hyperscaler — all through a specialized UNIX-like CLI interface and isometric grid engine.

---

## 🏗️ Core Systems

| System | Description |
|--------|-------------|
| **🗺️ Isometric Grid Engine** | Real-time 2.5D canvas with camera pan/zoom, ghost device previews, and animated packet routing |
| **📋 Contracts & Missions** | 20+ tiered contracts from enterprise clients — deploy isolated networks, meet SLA requirements, earn rewards |
| **🔬 Tech Tree** | 5-tier research progression unlocking Firewalls, WiFi APs, Load Balancers, CDNs, and Hyperscalers |
| **💻 CLI Terminal** | Full UNIX-style command interface — `ping`, `traceroute`, `config ip`, `contract connect`, and more |
| **🌐 Multi-Site Teleport** | Accept a contract and teleport to an isolated client environment to build their infrastructure |
| **⚡ Random Events** | DDoS attacks, hardware failures, cable cuts, ransomware, power outages — survive them all |
| **📊 Speed Test** | Evaluate your network with throughput, latency, packet loss, and infrastructure scoring (grades F → S+) |
| **🔥 Heatmap & Security Layers** | Toggle between Physical, Heatmap (thermal stress), and Security (cryptographic radar) views |
| **🏆 Global Leaderboard** | Compete against other operators for XP supremacy |
| **💳 Credits Store** | Support development through optional credit purchases (GCash / Maya integration) |

---

## 🔒 Security Architecture

- **Authentication**: Bcrypt-hashed passwords with strict SQL persistence
- **Recovery**: 12-layer backup code system — codes are one-time use and cryptographically generated
- **Anti-Cheat**: Device fingerprinting, VPN/proxy detection, single-account enforcement
- **Compliance**: Full data privacy agreement with account deletion support
- **Session**: Server-side session management with secure cookie handling

---

## 🛠️ Tech Stack

```
Frontend    → Vanilla HTML5 / CSS3 / ES Modules (zero frameworks)
Rendering   → HTML5 Canvas (isometric 2.5D engine)
Backend     → Node.js + Express.js
Database    → SQLite3 (better-sqlite3)
Auth        → bcrypt + express-session
Deployment  → Docker / Render / Any Node.js host
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/N3xari0n/netsim-empire.git
cd netsim-empire

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
# → http://localhost:3000
```

### Docker

```bash
docker build -t netsim-empire .
docker run -p 3000:3000 netsim-empire
```

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `C` | Cable / Connect tool |
| `D` | Delete tool |
| `G` | Send packet (ping) |
| `R` | Quick-place Router |
| `S` | Quick-place Switch |
| `P` | Pause / Resume |
| `~` | Open CLI terminal |
| `Esc` | Cancel current operation |

---

## 📁 Project Structure

```
netsim-empire/
├── index.html          # Main game interface
├── style.css           # Core stylesheet
├── style-v2.css        # Extended UI styles
├── main.js             # Express server entry
├── server/             # Backend (auth, DB, API routes)
├── src/
│   ├── main.js         # Game loop & input handler
│   ├── engine/         # Camera, Renderer (isometric canvas)
│   ├── entities/       # Node & Link definitions
│   ├── game/           # Core systems (contracts, tech tree, CLI, events, traffic)
│   └── ui/             # HUD controller
└── Dockerfile          # Container deployment
```

---

## ⚠️ Security Clearance

This public archive has been sanitized. All active production `.env` payloads and raw `/netsim.db` deployment shards are explicitly excluded to prevent cryptographic contamination.

---

<div align="center">

## 👥 Developed By

<table>
  <tr>
    <td align="center"><b><a href="https://github.com/N3xari0n">N3xari0n</a></b><br><sub>Lead Architect</sub></td>
    <td align="center"><b>×</b></td>
    <td align="center"><b>arrikusuz</b><br><sub>Systems Engineer</sub></td>
    <td align="center"><b>×</b></td>
    <td align="center"><b>Repzyu5</b><br><sub>Network Designer</sub></td>
  </tr>
</table>

---

<sub>NetSim Empire v1.1 — © 2026 N3xari0n × arrikusuz × Repzyu5. All rights reserved.</sub>

</div>

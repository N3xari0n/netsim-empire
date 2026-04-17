// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Renderer (Isometric Canvas 2D)
// ═══════════════════════════════════════════════════════════

import { DEVICE_TYPES, LINK_TYPES } from '../entities/Node.js';
import GameState from '../game/gameState.js';

const TILE_W = 80;
const TILE_H = 44;
const GRID_COLS = 40;
const GRID_ROWS = 40;

export function isoProject(gridX, gridY) {
  return {
    x: (gridX - gridY) * (TILE_W / 2),
    y: (gridX + gridY) * (TILE_H / 2),
  };
}

export function screenToGrid(sx, sy, camera) {
  // Invert iso projection
  const wx = sx / camera.zoom + camera.x;
  const wy = sy / camera.zoom + camera.y;
  const tileX = (wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2;
  const tileY = (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2;
  return { gridX: Math.round(tileX), gridY: Math.round(tileY) };
}

export class Renderer {
  constructor(canvas, camera, network) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.camera  = camera;
    this.network = network;
    this.time    = 0;
    this.selectedNode = null;
    this.cableStart   = null;
    this.hoverGrid = null;
    this.ghostDevice  = null;    // tool being placed
    // Defer resize until after CSS layout is computed
    requestAnimationFrame(() => this._resize());
    window.addEventListener('resize', () => this._resize());
    // ResizeObserver for reliable canvas sizing in CSS grid
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this._resize()).observe(canvas);
    }
  }

  _resize() {
    // Use the canvas's CSS layout size (it fills the grid cell via CSS)
    const w = this.canvas.offsetWidth  || window.innerWidth;
    const h = this.canvas.offsetHeight || window.innerHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
    }
  }

  render(dt) {
    this.time += dt;
    const { ctx, canvas, camera, network } = this;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    camera.applyTransform(ctx);
    this._drawGrid();
    this._drawLinks();
    this._drawNodes();
    this._drawPackets();
    if (this.ghostDevice) this._drawGhost();
    if (this.cableStart) this._drawCablePreview();
    camera.resetTransform(ctx);
  }

  // ── ISO Grid ─────────────────────────────────────────────

  _drawGrid() {
    const { ctx } = this;
    const layer = GameState.activeLayer;

    if (layer === 'heatmap') {
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    } else if (layer === 'security') {
      ctx.strokeStyle = 'rgba(0,255,0,0.05)';
    } else {
      ctx.strokeStyle = 'rgba(0,245,255,0.06)';
    }
    
    ctx.lineWidth = 0.5;

    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const iso = isoProject(col, row);
        this._drawTileOutline(iso.x, iso.y);
      }
    }
  }

  _drawTileOutline(cx, cy) {
    const { ctx } = this;
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.stroke();
  }

  // ── Links ─────────────────────────────────────────────────

  _drawLinks() {
    const { ctx, network, time } = this;
    const layer = GameState.activeLayer;

    for (const link of network.links.values()) {
      const posA = isoProject(link.from.gridX, link.from.gridY);
      const posB = isoProject(link.to.gridX,   link.to.gridY);

      const ax = posA.x, ay = posA.y;
      const bx = posB.x, by = posB.y;
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;

      // Utilization color
      let baseColor = link.color;
      let glowColor = link.glowColor;
      
      if (!link.online) { 
         baseColor = '#333'; glowColor = '#333'; 
      }
      else if (layer === 'security') {
         // Dull grey baseline, flashing red if attacked
         let underAttack = link.packets.some(p => p.malicious);
         if (underAttack) {
            baseColor = '#ff2244'; glowColor = '#ff2244';
         } else {
            baseColor = 'rgba(0,255,0,0.2)'; glowColor = 'transparent';
         }
      }
      else if (layer === 'heatmap') {
         const h = link.utilization;
         baseColor = `hsl(${120 - h * 120}, 100%, 55%)`;
         glowColor = baseColor;
      }
      else {
         if (link.utilization > 0.85) { baseColor = '#ff2244'; glowColor = '#ff4466'; }
         else if (link.utilization > 0.6)  { baseColor = '#ffb800'; glowColor = '#ffd040'; }
      }

      // Glow
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = layer === 'heatmap' ? 15 : (8 + Math.sin(time * 3 + link.id.charCodeAt(1)) * 3);

      // Draw cable
      ctx.beginPath();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth   = link.online ? (1.5 + link.utilization * 2) : 1;
      ctx.setLineDash(link.online ? [] : [6, 4]);
      ctx.moveTo(ax, ay);
      ctx.bezierCurveTo(ax, ay - 12, bx, by - 12, bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Utilization badge
      if (link.utilization > 0.1 && layer !== 'heatmap') {
        ctx.save();
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillStyle = link.utilization > 0.8 ? '#ff2244' : '#a0a0b0';
        ctx.textAlign = 'center';
        ctx.fillText(`${(link.utilization * 100).toFixed(0)}%`, midX, midY - 14);
        ctx.restore();
      }
    }
  }

  // ── Nodes ─────────────────────────────────────────────────

  _drawNodes() {
    const { ctx, network, time } = this;
    const layer = GameState.activeLayer;

    // Sort by Y for correct iso painter order
    const sorted = [...network.nodes.values()].sort((a, b) =>
      (a.gridX + a.gridY) - (b.gridX + b.gridY)
    );

    for (const node of sorted) {
      const iso = isoProject(node.gridX, node.gridY);
      node.glowPhase += 0.05;
      this._drawDevice(ctx, node, iso.x, iso.y, time, layer);
    }
  }

  _drawDevice(ctx, node, cx, cy, time, layer) {
    const glow = Math.sin(node.glowPhase) * 0.4 + 0.8;
    const sz = 24;
    const isOnline = node.online;
    const color    = isOnline ? node.color : '#444';

    ctx.save();

    // Selection ring
    if (node.selected) {
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.arc(cx, cy - sz/2, sz + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pulse anim on event
    if (node.pulseAnim > 0) {
      const r = sz + 20 * (1 - node.pulseAnim / 30);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,34,68,${node.pulseAnim / 30})`;
      ctx.lineWidth = 2;
      ctx.arc(cx, cy - sz/2, r, 0, Math.PI * 2);
      ctx.stroke();
      node.pulseAnim--;
    }

    // ISO Box (body)
    const body_h = sz;
    const body_w = sz * 1.4;
    const top_h  = sz * 0.5;

    // Top face
    ctx.beginPath();
    ctx.moveTo(cx,             cy - body_h - top_h);
    ctx.lineTo(cx + body_w/2,  cy - body_h - top_h/2);
    ctx.lineTo(cx,             cy - body_h);
    ctx.lineTo(cx - body_w/2,  cy - body_h - top_h/2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7 * glow;
    if (layer === 'heatmap') {
      const util = node.links.reduce((s, l) => s + l.utilization, 0) / Math.max(1, node.links.length);
      ctx.fillStyle = `hsl(${120 - util*120}, 100%, 50%)`;
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    // Front face (left)
    if (layer !== 'heatmap') {
      ctx.beginPath();
      ctx.moveTo(cx - body_w/2,  cy - body_h - top_h/2);
      ctx.lineTo(cx,             cy - body_h);
      ctx.lineTo(cx,             cy);
      ctx.lineTo(cx - body_w/2,  cy - top_h/2);
      ctx.closePath();
      ctx.fillStyle = shadeColor(color, -45);
      ctx.fill();

      // Front face (right)
      ctx.beginPath();
      ctx.moveTo(cx,             cy - body_h);
      ctx.lineTo(cx + body_w/2,  cy - body_h - top_h/2);
      ctx.lineTo(cx + body_w/2,  cy - top_h/2);
      ctx.lineTo(cx,             cy);
      ctx.closePath();
      ctx.fillStyle = shadeColor(color, -30);
      ctx.fill();
    }

    // LED Hardware Ports
    const linksCount = node.links.filter(l => l.online).length;
    if (linksCount > 0) {
      ctx.save();
      for (let i = 0; i < Math.min(linksCount, 4); i++) {
         const lx = cx + body_w/4 + (i * 5) - 8;
         const ly = cy - body_h/2 + (i * 2.5) - 4;
         ctx.beginPath();
         ctx.fillStyle = isOnline ? '#39ff14' : '#ff2244';
         ctx.shadowColor = ctx.fillStyle;
         ctx.shadowBlur  = isOnline ? 6 : 0;
         ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
         ctx.fill();
      }
      ctx.restore();
    }

    // Glow effect
    if (isOnline) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 12 * glow;
      ctx.beginPath();
      ctx.arc(cx, cy - body_h / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = glow * 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Offline X mark
    if (!isOnline && layer !== 'heatmap') {
      ctx.font      = '16px sans-serif';
      ctx.fillStyle = '#ff2244';
      ctx.textAlign = 'center';
      ctx.fillText('✖', cx, cy - body_h - 15);
    }
    
    // Security Rings
    if (layer === 'security' && (node.type === 'Firewall' || node.type === 'IDS')) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 10]);
      // Spin animation based on time
      ctx.ellipse(cx, cy - sz/2, sz * 2.5, sz * 1.25, 0, time * 3, time * 3 + Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.restore();

    // Health bar above device
    const hpPct = node.healthPct;
    const bw = 30;
    const bx = cx - bw/2;
    const by_pos = cy - body_h - top_h - 14;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by_pos, bw, 4);
    ctx.fillStyle = hpPct > 0.6 ? '#39ff14' : hpPct > 0.3 ? '#ffb800' : '#ff2244';
    ctx.fillRect(bx, by_pos, bw * hpPct, 4);

    // Icon
    ctx.font      = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = isOnline ? 1 : 0.4;
    ctx.fillText(node.icon, cx, cy - body_h/2 + 4);
    ctx.globalAlpha = 1;

    // Label
    ctx.font      = 'bold 9px "Rajdhani"';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(node.label, cx, cy + 14);

    ctx.restore();
  }

  // ── Packets ───────────────────────────────────────────────

  _drawPackets() {
    const { ctx, network } = this;
    const layer = GameState.activeLayer;

    // Normal traffic is hidden in Heatmap, but drawn securely in Security mode
    if (layer === 'heatmap') return;

    for (const link of network.links.values()) {
      if (!link.online) continue;
      const posA = isoProject(link.from.gridX, link.from.gridY);
      const posB = isoProject(link.to.gridX,   link.to.gridY);

      for (const pkt of link.packets) {
        // Bezier progress
        const t = pkt.progress;
        const cp1x = posA.x, cp1y = posA.y - 12;
        const cp2x = posB.x, cp2y = posB.y - 12;
        const px = cubicBezier(t, posA.x, cp1x, cp2x, posB.x);
        const py = cubicBezier(t, posA.y, cp1y, cp2y, posB.y);

        ctx.save();
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.arc(px, py - 8, pkt.malicious ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.fill();
        ctx.restore();

        // Plasma Comet Tail
        ctx.save();
        ctx.beginPath();
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = pkt.malicious ? 4 : 2;
        let tailGrad = ctx.createLinearGradient(px, py - 8, cubicBezier(Math.max(0, t - 0.1), posA.x, cp1x, cp2x, posB.x), cubicBezier(Math.max(0, t - 0.1), posA.y, cp1y, cp2y, posB.y) - 8);
        tailGrad.addColorStop(0, pkt.color);
        tailGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = tailGrad;
        
        for (let idx = 0; idx < 8; idx++) {
           const tailT = Math.max(0, t - (0.1 / 8) * idx);
           const tailX = cubicBezier(tailT, posA.x, cp1x, cp2x, posB.x);
           const tailY = cubicBezier(tailT, posA.y, cp1y, cp2y, posB.y);
           if (idx === 0) ctx.moveTo(tailX, tailY - 8);
           else ctx.lineTo(tailX, tailY - 8);
        }
        ctx.stroke();
        ctx.restore();

        // Networking Info Header above packet
        ctx.save();
        ctx.font = '8px var(--font-mono, monospace)';
        ctx.fillStyle = pkt.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(pkt.headerText || pkt.type, px, py - 16);
        ctx.restore();
      }
    }
  }

  // ── Ghost (placement preview) ─────────────────────────────

  _drawGhost() {
    const { ctx, ghostDevice: g } = this;
    if (!g) return;
    const iso = isoProject(g.gridX, g.gridY);
    const isOccupied = g.occupied;

    // Device icon preview
    ctx.save();
    ctx.globalAlpha = isOccupied ? 0.25 : 0.45;
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    const def = DEVICE_TYPES[g.type];
    ctx.fillText(def?.icon || '?', iso.x, iso.y - 16);
    ctx.restore();

    // Tile highlight: RED if occupied, GREEN if available
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle  = isOccupied ? '#ff2244' : '#39ff14';
    this._fillTile(iso.x, iso.y);
    ctx.restore();

    // Occupation indicator border
    if (isOccupied) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff2244';
      ctx.lineWidth = 2;
      this._strokeTile(iso.x, iso.y);
      ctx.restore();
    }
  }

  _strokeTile(cx, cy) {
    const { ctx } = this;
    const hw = TILE_W / 2 - 2;
    const hh = TILE_H / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(cx,     cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,     cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.stroke();
  }

  _fillTile(cx, cy) {
    const { ctx } = this;
    const hw = TILE_W / 2 - 2;
    const hh = TILE_H / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(cx,     cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,     cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();
  }

  // ── Cable preview ─────────────────────────────────────────

  _drawCablePreview() {
    const { ctx, cableStart } = this;
    if (!cableStart || !this.mouseWorld) return;
    const startIso = isoProject(cableStart.gridX, cableStart.gridY);

    ctx.save();
    ctx.strokeStyle = 'rgba(0,245,255,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(startIso.x, startIso.y);
    ctx.lineTo(this.mouseWorld.x, this.mouseWorld.y);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Helpers ───────────────────────────────────────────────

function cubicBezier(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

function shadeColor(hex, amount) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, Math.min(255, (n>>16) + amount));
  const g = Math.max(0, Math.min(255, ((n>>8)&0xFF) + amount));
  const b = Math.max(0, Math.min(255, (n&0xFF) + amount));
  return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
}

export { TILE_W, TILE_H, GRID_COLS, GRID_ROWS };
export default Renderer;

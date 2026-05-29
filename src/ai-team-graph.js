/**
 * ai-team-graph.js — Interactive Node Graph
 * Redesign 2026: Canvas 2D Force-Directed Graph — AI Team 6 Bots
 * 
 * Features:
 * - Force-directed spring layout with collision avoidance
 * - Mouse/touch drag nodes
 * - Click to expand detail card
 * - Responsive to container size
 * - Theme: Cyberpunk Glassmorphic
 */

class AITeamGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    this.nodes = [];
    this.edges = [];
    this.dragging = null;
    this.hovered = null;
    this.selected = null;
    this.animId = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    
    this.initNodes();
    this.initEdges();
    this.bindEvents();
    this.resize();
    this.start();
    
    window.addEventListener('resize', () => this.resize());
  }
  
  initNodes() {
    const bots = [
      { id: 'hermes',    label: 'Hermes',    icon: '🤖', role: 'หัวหน้าทีม · เลขา AI',       color: '#2DD4BF', desc: 'อยู่กับคุณตลอด 24 ชม. — คุยไทย จัดการไฟล์ เขียนสรุป HTML ส่ง Telegram' },
      { id: 'claude',    label: 'Claude Code', icon: '💻', role: 'นักพัฒนาเอก',               color: '#A78BFA', desc: 'เขียนโค้ดทั้งโปรเจกต์ — อ่าน spec แล้วสร้างเว็บ, API, tools ให้เลย' },
      { id: 'codex',     label: 'Codex CLI',  icon: '⚡', role: 'นักพัฒนาคู่',                color: '#60A5FA', desc: 'คู่หู Claude — ถนัดงานเร็ว, prototype, frontend ไว' },
      { id: 'gemini',    label: 'Gemini CLI',  icon: '🔍', role: 'นักวิจัย · วิเคราะห์',       color: '#FBBF24', desc: 'รีเสิร์ชตลาด วิเคราะห์คู่แข่ง หาโอกาส — เจนนี่' },
      { id: 'agy',       label: 'AGY',         icon: '⚙️', role: 'คุมระบบ · Automation',       color: '#34D399', desc: 'รัน process อัตโนมัติ — cron, deploy, monitor 24 ชม.' },
      { id: 'openclaw',  label: 'OpenClaw',    icon: '🔗', role: 'เชื่อมระบบภายนอก',          color: '#F472B6', desc: 'เชื่อม API, webhook, MCP servers — ทุกอย่างถึงกันหมด' },
      { id: 'vault',     label: 'Agent-Vault', icon: '📚', role: 'คลังความรู้กลาง',            color: '#F59E0B', desc: 'สมองรวม — AI ทุกตัวอ่าน-เขียนร่วมกัน ไม่มีใครลืมงาน' },
    ];
    
    const cx = this.container.clientWidth / 2 || 300;
    const cy = this.container.clientHeight / 2 || 250;
    const radius = Math.min(cx, cy) * 0.55;
    
    // Layout in a hexagonal ring around center
    const positions = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      positions.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }
    // Vault in center
    positions.push({ x: cx, y: cy });
    
    this.nodes = bots.map((b, i) => ({
      ...b,
      x: positions[i].x,
      y: positions[i].y,
      vx: 0,
      vy: 0,
      radius: i === 6 ? 28 : 22 // vault bigger
    }));
  }
  
  initEdges() {
    // Connect all bots to Vault (hub-spoke model)
    for (let i = 0; i < 6; i++) {
      this.edges.push({ from: i, to: 6, strength: 0.05 });
    }
    // Key partnerships
    this.edges.push({ from: 0, to: 1, strength: 0.03 }); // Hermes ↔ Claude
    this.edges.push({ from: 0, to: 2, strength: 0.03 }); // Hermes ↔ Codex
    this.edges.push({ from: 1, to: 2, strength: 0.04 }); // Claude ↔ Codex
    this.edges.push({ from: 0, to: 3, strength: 0.03 }); // Hermes ↔ Gemini
    this.edges.push({ from: 3, to: 4, strength: 0.03 }); // Gemini ↔ AGY
    this.edges.push({ from: 4, to: 5, strength: 0.03 }); // AGY ↔ OpenClaw
  }
  
  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width * this.dpr;
    this.height = rect.height * this.dpr;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  
  // ─── Physics ───
  simulate() {
    const dt = 0.016;
    const centerX = this.width / this.dpr / 2;
    const centerY = this.height / this.dpr / 2;
    
    for (const node of this.nodes) {
      // Center gravity (weak)
      if (node !== this.dragging) {
        node.vx += (centerX - node.x) * 0.0003;
        node.vy += (centerY - node.y) * 0.0003;
      }
      
      // Damping
      node.vx *= 0.92;
      node.vy *= 0.92;
      
      // Apply velocity
      node.x += node.vx * dt * 60;
      node.y += node.vy * dt * 60;
      
      // Boundary
      node.x = Math.max(node.radius, Math.min(this.width / this.dpr - node.radius, node.x));
      node.y = Math.max(node.radius, Math.min(this.height / this.dpr - node.radius, node.y));
    }
    
    // Spring edges
    for (const edge of this.edges) {
      const a = this.nodes[edge.from];
      const b = this.nodes[edge.to];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 120;
      const force = (dist - target) * edge.strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      if (a !== this.dragging) { a.vx += fx; a.vy += fy; }
      if (b !== this.dragging) { b.vx -= fx; b.vy -= fy; }
    }
    
    // Collision (node-node)
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = a.radius + b.radius + 8;
        
        if (dist < minDist) {
          const force = (minDist - dist) * 0.15;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (a !== this.dragging) { a.vx -= fx; a.vy -= fy; }
          if (b !== this.dragging) { b.vx += fx; b.vy += fy; }
        }
      }
    }
  }
  
  // ─── Render ───
  render() {
    const ctx = this.ctx;
    const w = this.width / this.dpr;
    const h = this.height / this.dpr;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw edges
    for (const edge of this.edges) {
      const a = this.nodes[edge.from];
      const b = this.nodes[edge.to];
      
      // Gradient line
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, this.hexToRgba(a.color, 0.25));
      grad.addColorStop(1, this.hexToRgba(b.color, 0.25));
      
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    
    // Draw nodes
    for (const node of this.nodes) {
      const isHovered = node === this.hovered;
      const isSelected = node === this.selected;
      const glow = isHovered || isSelected;
      
      // Glow ring
      if (glow) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(node.color, 0.08);
        ctx.fill();
      }
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      
      // Glassmorphic fill
      const fillGrad = ctx.createRadialGradient(node.x - 2, node.y - 2, 0, node.x, node.y, node.radius);
      fillGrad.addColorStop(0, this.hexToRgba(node.color, 0.2));
      fillGrad.addColorStop(1, 'rgba(13,17,23,0.85)');
      ctx.fillStyle = fillGrad;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = this.hexToRgba(node.color, glow ? 0.7 : 0.35);
      ctx.lineWidth = glow ? 2 : 1.2;
      ctx.stroke();
      
      // Icon
      ctx.font = `${node.radius * 0.8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.icon, node.x, node.y - 1);
      
      // Label
      ctx.font = `600 8px "IBM Plex Sans Thai", "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(230,237,243,0.9)';
      ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      
      // Role (only on hover/select)
      if (glow) {
        ctx.font = `7px "IBM Plex Sans Thai", "Inter", sans-serif`;
        ctx.fillStyle = this.hexToRgba(node.color, 0.7);
        ctx.fillText(node.role, node.x, node.y + node.radius + 24);
      }
    }
    
    // Detail card for selected node
    if (this.selected) {
      this.drawDetailCard(this.selected);
    }
  }
  
  drawDetailCard(node) {
    const ctx = this.ctx;
    const w = this.width / this.dpr;
    const h = this.height / this.dpr;
    
    // Card positioned at bottom-center
    const cardW = Math.min(320, w - 32);
    const cardH = 90;
    const cx = w / 2;
    const cy = h - cardH / 2 - 16;
    
    // Card background
    ctx.beginPath();
    this.roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
    ctx.fillStyle = 'rgba(13,17,23,0.9)';
    ctx.fill();
    ctx.strokeStyle = this.hexToRgba(node.color, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Top glow line
    ctx.beginPath();
    ctx.moveTo(cx - cardW / 2 + 10, cy - cardH / 2);
    ctx.lineTo(cx + cardW / 2 - 10, cy - cardH / 2);
    const lineGrad = ctx.createLinearGradient(cx - cardW / 2, 0, cx + cardW / 2, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.3, this.hexToRgba(node.color, 0.5));
    lineGrad.addColorStop(0.7, this.hexToRgba(node.color, 0.5));
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.stroke();
    
    // Content
    ctx.font = `600 9px "IBM Plex Sans Thai", "Inter", sans-serif`;
    ctx.fillStyle = node.color;
    ctx.textAlign = 'center';
    ctx.fillText(`${node.icon} ${node.label}`, cx, cy - cardH / 2 + 18);
    
    ctx.font = `7px "IBM Plex Sans Thai", "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(139,148,158,0.8)';
    ctx.textAlign = 'left';
    
    // Word-wrap description
    const desc = node.desc;
    const maxWidth = cardW - 24;
    const words = desc.split('');
    let line = '';
    let y = cy - cardH / 2 + 35;
    const lineHeight = 12;
    
    for (const char of words) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        ctx.fillText(line, cx - cardW / 2 + 12, y);
        y += lineHeight;
        line = char;
        if (y > cy + cardH / 2 - 10) break;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, cx - cardW / 2 + 12, y);
    
    // Close hint
    ctx.font = `6px "IBM Plex Sans Thai", "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(139,148,158,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('คลิกที่อื่นเพื่อปิด', cx, cy + cardH / 2 - 8);
  }
  
  roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  
  // ─── Events ───
  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };
    
    const findNode = (pos) => {
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const n = this.nodes[i];
        const dx = pos.x - n.x;
        const dy = pos.y - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 4) return n;
      }
      return null;
    };
    
    // Mouse
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      const node = findNode(pos);
      if (node) {
        this.dragging = node;
        this.selected = node;
      } else {
        this.selected = null;
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getPos(e);
      if (this.dragging) {
        this.dragging.x = pos.x;
        this.dragging.y = pos.y;
        this.dragging.vx = 0;
        this.dragging.vy = 0;
      }
      this.hovered = findNode(pos);
      this.canvas.style.cursor = this.hovered ? 'pointer' : 'default';
    });
    
    this.canvas.addEventListener('mouseup', () => { this.dragging = null; });
    this.canvas.addEventListener('mouseleave', () => { this.dragging = null; this.hovered = null; });
    
    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const pos = getPos(e);
      const node = findNode(pos);
      if (node) {
        this.dragging = node;
        this.selected = node;
      } else {
        this.selected = null;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.dragging) {
        const pos = getPos(e);
        this.dragging.x = pos.x;
        this.dragging.y = pos.y;
        this.dragging.vx = 0;
        this.dragging.vy = 0;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', () => { this.dragging = null; });
  }
  
  // ─── Animation Loop ───
  start() {
    let lastTime = 0;
    const loop = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      
      if (delta < 100) { // guard against tab-switch jumps
        this.simulate();
        this.render();
      }
      
      this.animId = requestAnimationFrame(loop);
    };
    
    this.animId = requestAnimationFrame(loop);
  }
  
  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.canvas.remove();
  }
}

// Auto-init when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ai-team-graph')) {
      new AITeamGraph('ai-team-graph');
    }
  });
} else {
  if (document.getElementById('ai-team-graph')) {
    new AITeamGraph('ai-team-graph');
  }
}

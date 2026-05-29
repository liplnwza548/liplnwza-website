/**
 * text-scramble.js — Terminal Text Decode Effect
 * Redesign 2026: Cyberpunk H1 scramble on page load
 * 
 * Features:
 * - Scrambles text on all H1 elements on page load
 * - Configurable character set (symbols + Thai + English)
 * - Pure vanilla JS, no dependencies
 * - Respects prefers-reduced-motion
 */

class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    this.original = el.textContent;
    this.resolve = null;
    this.queue = [];
  }
  
  setText(newText) {
    const oldText = this.el.textContent || '';
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise(resolve => this.resolve = resolve);
    this.queue.push({
      from: oldText,
      to: newText,
      start: performance.now(),
      length,
      resolve: this.resolve
    });
    if (!this.frameRequest) this.update();
    return promise;
  }
  
  update() {
    let now = performance.now();
    let incomplete = 0;
    
    for (let q of this.queue) {
      let elapsed = now - q.start;
      let progress = Math.min(elapsed / 800, 1);
      
      // Ease-out cubic
      progress = 1 - Math.pow(1 - progress, 3);
      
      let result = '';
      for (let i = 0; i < q.length; i++) {
        let char = q.to[i] || '';
        if (i < progress * q.length) {
          // Reveal actual character
          result += char;
        } else if (Math.random() < 0.3) {
          // Scramble
          result += this.chars[Math.floor(Math.random() * this.chars.length)];
        } else {
          result += q.to[i] || q.from[i] || ' ';
        }
      }
      
      this.el.textContent = result;
      
      if (progress >= 1) {
        this.el.textContent = q.to;
        if (q.resolve) q.resolve();
      } else {
        incomplete++;
      }
    }
    
    this.queue = this.queue.filter(q => {
      let elapsed = performance.now() - q.start;
      return elapsed / 800 < 1;
    });
    
    if (this.queue.length > 0) {
      this.frameRequest = requestAnimationFrame(() => this.update());
    } else {
      this.frameRequest = null;
    }
  }
}

// ─── Auto-init on page load ───
function init() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  
  // Only scramble H1 elements with data-scramble attribute
  const h1s = document.querySelectorAll('h1[data-scramble]');
  if (h1s.length === 0) return;
  
  h1s.forEach(h1 => {
    const scrambler = new TextScramble(h1);
    scrambler.setText(h1.textContent);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

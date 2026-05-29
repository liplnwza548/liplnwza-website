/**
 * knowledge-bg.js — Fragment Shader Background
 * Redesign 2026: Domain-warped flow-field noise, pure WebGL, zero Three.js
 * 
 * Features:
 * - Domain-warped simplex-like noise with 3 octaves
 * - Flow-field cyberpunk neon aesthetic
 * - devicePixelRatio capped at 1.5 for mobile power saving
 * - Visibility-aware animation (pauses when tab hidden)
 * - prefers-reduced-motion support
 * - Responsive: lighter on mobile
 */

const CANVAS_ID = 'knowledge-canvas';
const DPR_CAP = 1.5;

// ─── Fragment Shader (Domain-Warped Noise) ───
const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity; // 1.0 desktop, 0.5 mobile

// ─── Hash & Noise ───
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

// ─── Domain Warping ───
float domainWarp(vec2 p, float t) {
  vec2 q = vec2(
    fbm(p + vec2(0.0, t * 0.05)),
    fbm(p + vec2(t * 0.05, 5.2))
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.06),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.07)
  );
  return fbm(p + 4.0 * r);
}

void main() {
  vec2 uv = vUv;
  
  // Aspect-correct coordinates
  vec2 st = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  
  // Flow-field warp
  float t = uTime * 0.15;
  float n = domainWarp(st * 2.5, t);
  
  // Second warp layer with different frequency
  float n2 = domainWarp(st * 1.8 + vec2(3.0, 7.0), t * 0.7);
  
  // Mix layers
  float pattern = mix(n, n2, 0.4);
  
  // Edge glow: highlight areas where noise changes rapidly
  float edge = abs(pattern - 0.5) * 2.0;
  edge = smoothstep(0.3, 0.7, edge) * 0.3;
  
  // Base color: deep dark
  vec3 bg = vec3(0.02, 0.031, 0.051); // #05080D
  
  // Neon teal accent (#2DD4BF = rgb(0.176, 0.831, 0.749))
  vec3 neon = vec3(0.176, 0.831, 0.749);
  
  // Subtle purple accent for variety
  vec3 purple = vec3(0.545, 0.357, 0.984); // #8B5CF6
  
  // Mix colors based on noise pattern
  float colorMix = pattern * 0.5 + 0.5;
  vec3 flowColor = mix(neon, purple, colorMix * 0.3);
  
  // Apply flow with intensity (mobile-friendly)
  float flow = pattern * uIntensity * 0.12;
  float glow = edge * uIntensity * 0.08;
  
  vec3 color = bg + flowColor * (flow + glow);
  
  // Subtle vignette
  float vignette = 1.0 - length(vUv - 0.5) * 0.6;
  color *= vignette;
  
  // Ensure dark enough for text readability
  color = clamp(color, 0.0, 0.12);
  
  fragColor = vec4(color, 1.0);
}`;

// ─── WebGL Setup ───
let gl, program, animId = null, isVisible = true;
let startTime = performance.now();

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function setupQuad(gl, program) {
  // Fullscreen quad: 2 triangles covering clip space
  const vertices = new Float32Array([
    -1, -1,  -1, 1,  1, -1,
     1, -1,  -1, 1,  1, 1
  ]);
  
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  const aPos = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  return vbo;
}

function init(canvas) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  
  // Create WebGL2 context
  gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  
  if (!gl) {
    console.warn('WebGL2 not supported, falling back to dark background');
    canvas.style.display = 'none';
    return;
  }
  
  program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!program) {
    gl = null;
    return;
  }
  
  gl.useProgram(program);
  setupQuad(gl, program);
  
  // Set uniforms
  const uRes = gl.getUniformLocation(program, 'uResolution');
  const uIntensity = gl.getUniformLocation(program, 'uIntensity');
  const uTime = gl.getUniformLocation(program, 'uTime');
  
  // Size canvas
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
  gl.uniform2f(uRes, w, h);
  gl.uniform1f(uIntensity, isMobile ? 0.5 : 1.0);
  
  // Animation loop
  function render(now) {
    if (!gl || !program) return;
    
    const elapsed = (now - startTime) * 0.001;
    gl.uniform1f(uTime, prefersReduced ? 0 : elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    animId = requestAnimationFrame(render);
  }
  
  // Visibility handling
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible && !animId) {
      startTime = performance.now();
      animId = requestAnimationFrame(render);
    } else if (!isVisible && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });
  
  // Resize
  window.addEventListener('resize', () => {
    if (!gl) return;
    const dprR = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const wR = window.innerWidth * dprR;
    const hR = window.innerHeight * dprR;
    canvas.width = wR;
    canvas.height = hR;
    gl.viewport(0, 0, wR, hR);
    const uResR = gl.getUniformLocation(program, 'uResolution');
    const uIntR = gl.getUniformLocation(program, 'uIntensity');
    gl.uniform2f(uResR, wR, hR);
    gl.uniform1f(uIntR, window.innerWidth < 768 ? 0.5 : 1.0);
  });
  
  if (!prefersReduced) {
    animId = requestAnimationFrame(render);
  } else {
    // Draw one frame for reduced motion
    gl.uniform1f(uTime, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

// ─── Bootstrap ───
const canvas = document.getElementById(CANVAS_ID);
if (canvas) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(canvas));
  } else {
    init(canvas);
  }
}

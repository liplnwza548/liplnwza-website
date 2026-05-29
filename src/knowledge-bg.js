import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Configuration ---
const CANVAS_ID = 'knowledge-canvas';
const NEON_TEAL = 0x2DD4BF;
const DEEP_BG = 0x05080D;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 2500 : 10000;
const useBloom = !isMobile && !prefersReducedMotion;
const maxDPR = 1.5;

let scene, camera, renderer, composer;
let points, geometry, material;
let animationFrameId = null;
let clock;
let isPageVisible = true;

function init() {
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return;

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(DEEP_BG, 0.03);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(DEEP_BG, 1);

  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const radius = 2.5 + Math.random() * 3.5;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    scales[i] = 0.3 + Math.random() * 0.6;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, maxDPR) },
      uColor: { value: new THREE.Color(0.176, 0.831, 0.749) } // #2DD4BF neon teal
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aScale;
      varying vec3 vPosition;
      varying float vTime;
      void main() {
        vec3 pos = position;
        pos.x += sin(pos.y * 0.5 + uTime * 0.2) * 0.12;
        pos.y += cos(pos.x * 0.4 + uTime * 0.25) * 0.12;
        pos.z += sin(pos.z * 0.6 + uTime * 0.2) * 0.12;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (28.0 * aScale * uPixelRatio) / -mvPosition.z;
        vPosition = pos;
        vTime = uTime;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vPosition;
      varying float vTime;
      void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 1.5);
        vec3 color = uColor;
        color.r += sin(vPosition.x * 2.0 + vTime) * 0.04;
        color.g += cos(vPosition.y * 2.0 + vTime) * 0.04;
        gl_FragColor = vec4(color, alpha * 0.7);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  if (useBloom) {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.9, 0.5, 0.4
    );
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  startLoop();
  renderFrame();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  if (material) material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, maxDPR);
}

function onVisibility() {
  isPageVisible = !document.hidden;
  if (isPageVisible) startLoop();
  else stopLoop();
}

function startLoop() {
  if (prefersReducedMotion || animationFrameId !== null) return;
  clock.getDelta();
  loop();
}

function stopLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function renderFrame() {
  if (!renderer) return;
  const time = clock ? clock.getElapsedTime() : 0;
  if (material) material.uniforms.uTime.value = time;
  if (points) {
    points.rotation.y = time * 0.015;
    points.rotation.x = Math.sin(time * 0.08) * 0.08;
  }
  if (useBloom && composer) composer.render();
  else renderer.render(scene, camera);
}

function loop() {
  renderFrame();
  animationFrameId = requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

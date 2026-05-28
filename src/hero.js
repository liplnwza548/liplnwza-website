import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Configuration & Settings ---
const HERO_SECTION_ID = 'hero';
const CANVAS_ID = 'hero-canvas';
const TEAL_COLOR_HEX = 0x0A8F8F; // brand teal

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 5000 : 20000;
const useBloom = !isMobile && !prefersReducedMotion;
const maxDPR = 1.5;

let scene, camera, renderer, composer;
let points, geometry, material;
let animationFrameId = null;
let isHeroVisible = false;
let clock;

// Mouse Interaction Settings
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;
const easeFactor = 0.05;

// --- Initialize Scene ---
function init() {
  const container = document.getElementById(HERO_SECTION_ID);
  const canvas = document.getElementById(CANVAS_ID);
  if (!container || !canvas) return;

  clock = new THREE.Clock();

  // 1. Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050608, 0.05);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 7;

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050608, 1);

  // 4. Geometry
  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);

  // Distribute particles in a volumetric swarm / sphere-like shape
  for (let i = 0; i < particleCount; i++) {
    // Spherical distribution with some randomness
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    
    // Vary radius to create depth and thickness (swarm effect)
    const radius = 2.0 + Math.random() * 2.5;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Individual point scale factor
    scales[i] = 0.4 + Math.random() * 0.8;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  // 5. Shader Material for Elegant Soft Particles with sine wave noise displacement
  material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, maxDPR) },
      uColor: { value: new THREE.Color(0.039, 0.56, 0.56) } // #0A8F8F
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aScale;
      varying vec3 vPosition;
      varying float vTime;

      void main() {
        vec3 pos = position;

        // Subtle undulating waves on individual coordinates to look organic
        pos.x += sin(pos.y * 0.6 + uTime * 0.3) * 0.15;
        pos.y += cos(pos.x * 0.5 + uTime * 0.4) * 0.15;
        pos.z += sin(pos.z * 0.7 + uTime * 0.3) * 0.15;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Size attenuation based on distance
        gl_PointSize = (35.0 * aScale * uPixelRatio) / -mvPosition.z;
        vPosition = pos;
        vTime = uTime;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vPosition;
      varying float vTime;

      void main() {
        // Draw soft circular particles
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;

        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 1.8);

        // Add a very subtle color variation based on coordinates
        vec3 color = uColor;
        color.r += sin(vPosition.x * 2.0 + vTime) * 0.05;
        color.g += cos(vPosition.y * 2.0 + vTime) * 0.05;

        gl_FragColor = vec4(color, alpha * 0.85);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // 6. Points
  points = new THREE.Points(geometry, material);
  scene.add(points);

  // 7. Post-processing Bloom (only on desktop with animation)
  if (useBloom) {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,  // strength (not too harsh, matches clean/minimal vibe)
      0.6,  // radius
      0.35  // threshold (let dark segments stay deep dark)
    );

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
  }

  // 8. Event Listeners
  window.addEventListener('resize', onWindowResize);
  
  if (!isMobile) {
    window.addEventListener('pointermove', onPointerMove);
  }

  // Setup Lazy Initialization and Observability
  setupObserver();
  setupVisibilityTracker();

  // Initial single frame render for static state
  renderFrame();
}

// --- Interaction Handler ---
function onPointerMove(event) {
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  // Subtle rotation effect matching mouse coordinates
  targetX = (event.clientX - halfWidth) * 0.00015;
  targetY = (event.clientY - halfHeight) * 0.00015;
}

// --- Window Resize Handler ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));

  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  if (material) {
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, maxDPR);
  }

  if (prefersReducedMotion) {
    renderFrame();
  }
}

// --- Intersection Observer Setup ---
function setupObserver() {
  const heroSection = document.getElementById(HERO_SECTION_ID);
  if (!heroSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isHeroVisible = entry.isIntersecting;
      if (isHeroVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    });
  }, {
    threshold: 0.05
  });

  observer.observe(heroSection);
}

// --- Visibility API Tracker ---
function setupVisibilityTracker() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else if (isHeroVisible) {
      startLoop();
    }
  });
}

// --- Render Loop Control ---
function startLoop() {
  if (prefersReducedMotion) return; // Do not animate at all
  if (animationFrameId !== null) return;
  clock.getDelta(); // reset clock delta
  loop();
}

function stopLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// --- Main Render Frame ---
function renderFrame() {
  if (!renderer) return;

  const time = clock ? clock.getElapsedTime() : 0;
  
  if (material) {
    material.uniforms.uTime.value = time;
  }

  if (points) {
    // Slow constant auto-rotation
    points.rotation.y = time * 0.025;
    
    // Smoothly ease rotation towards target cursor values
    currentX += (targetX - currentX) * easeFactor;
    currentY += (targetY - currentY) * easeFactor;
    
    points.rotation.y += currentX;
    points.rotation.x = currentY;
  }

  if (useBloom && composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// --- Animation Loop ---
function loop() {
  renderFrame();
  animationFrameId = requestAnimationFrame(loop);
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

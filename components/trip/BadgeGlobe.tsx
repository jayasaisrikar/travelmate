'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';

const PREVIEW_SIZE = 280;
const EXPORT_WIDTH = 900;
const EXPORT_HEIGHT = 450;
const EXPORT_GLOBE_SIZE = 320;
const EXPORT_FRAMES = 18;
const EXPORT_DELAY_MS = 72;

type GlobeStage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rig: THREE.Group;
  halo: THREE.Mesh;
  cloudShell: THREE.Mesh;
  orbitRings: THREE.Group;
  stars: THREE.Points;
  dispose: () => void;
};

function createCirclePoints(radius: number, segments = 96) {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const theta = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
  }

  return points;
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createStarField(count: number, radius: number) {
  const random = createSeededRandom(23);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const jitter = 0.78 + random() * 0.72;
    const starRadius = radius * jitter;

    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * starRadius;
    positions[index * 3 + 1] = Math.sin(phi) * Math.sin(theta) * starRadius;
    positions[index * 3 + 2] = Math.cos(phi) * starRadius;

    const tint = random() > 0.7 ? 0xffd1dc : 0xe8f8ff;
    colors[index * 3] = ((tint >> 16) & 255) / 255;
    colors[index * 3 + 1] = ((tint >> 8) & 255) / 255;
    colors[index * 3 + 2] = (tint & 255) / 255;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });

  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -1;

  return { stars, geometry, material };
}

function createGlobeStage(canvas: HTMLCanvasElement, size: number, pixelRatio = 1): GlobeStage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7.1);

  const rig = new THREE.Group();
  scene.add(rig);

  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff1df, 2.5);
  keyLight.position.set(4.5, 5.2, 6.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x66d4ff, 1.5);
  rimLight.position.set(-4.5, 1.5, -2.2);
  scene.add(rimLight);

  const globeGeometry = new THREE.SphereGeometry(1.55, 48, 48);
  const globeMaterial = new THREE.MeshStandardMaterial({
    color: 0x13608f,
    roughness: 0.34,
    metalness: 0.16,
    emissive: 0x0d2440,
    emissiveIntensity: 0.52,
  });
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  rig.add(globe);

  const cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.59, 48, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf7fdff,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.1,
      emissive: 0xcfefff,
      emissiveIntensity: 0.12,
      depthWrite: false,
    })
  );
  cloudShell.rotation.z = 0.28;
  rig.add(cloudShell);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8fdcff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  rig.add(halo);

  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xc8f3ff,
    transparent: true,
    opacity: 0.24,
  });

  const lineRadii = [1.55, 1.2, 0.85];
  lineRadii.forEach((radius, index) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(createCirclePoints(radius));
    const line = new THREE.LineLoop(geometry, gridMaterial);
    line.rotation.x = index === 0 ? 0 : index === 1 ? Math.PI / 2.4 : Math.PI / 1.7;
    line.rotation.y = index === 1 ? Math.PI / 6 : -Math.PI / 4;
    rig.add(line);
  });

  const meridianCount = 5;
  for (let index = 0; index < meridianCount; index += 1) {
    const points = createCirclePoints(1.55);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineLoop(geometry, gridMaterial);
    line.rotation.y = (index / meridianCount) * Math.PI;
    line.rotation.x = Math.PI / 2;
    line.rotation.z = (index - 2) * 0.18;
    rig.add(line);
  }

  const orbitRings = new THREE.Group();
  const orbitBase = new THREE.Mesh(
    new THREE.TorusGeometry(2.16, 0.028, 14, 180),
    new THREE.MeshBasicMaterial({
      color: 0x9be7ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  orbitBase.rotation.x = Math.PI / 2.55;
  orbitBase.rotation.z = -0.72;
  orbitRings.add(orbitBase);

  const orbitAccent = new THREE.Mesh(
    new THREE.TorusGeometry(2.32, 0.016, 12, 200),
    new THREE.MeshBasicMaterial({
      color: 0xff6584,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  orbitAccent.rotation.x = Math.PI / 2.25;
  orbitAccent.rotation.z = 0.28;
  orbitRings.add(orbitAccent);
  rig.add(orbitRings);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.62, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  rig.add(glow);

  const starField = createStarField(36, 4.2);
  scene.add(starField.stars);

  return {
    renderer,
    scene,
    camera,
    rig,
    halo,
    cloudShell,
    orbitRings,
    stars: starField.stars,
    dispose: () => {
      globeGeometry.dispose();
      globeMaterial.dispose();
      cloudShell.geometry.dispose();
      (cloudShell.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      gridMaterial.dispose();
      orbitBase.geometry.dispose();
      (orbitBase.material as THREE.Material).dispose();
      orbitAccent.geometry.dispose();
      (orbitAccent.material as THREE.Material).dispose();
      (glow.material as THREE.Material).dispose();
      starField.geometry.dispose();
      starField.material.dispose();
      renderer.dispose();
    },
  };
}

function renderGlobe(stage: GlobeStage, timeSeconds: number) {
  stage.rig.rotation.y = timeSeconds * 0.48;
  stage.rig.rotation.x = -0.22 + Math.sin(timeSeconds * 0.7) * 0.07;
  stage.rig.rotation.z = Math.sin(timeSeconds * 0.35) * 0.03 - 0.04;
  stage.cloudShell.rotation.y = timeSeconds * 0.18 + 0.6;
  stage.halo.rotation.y = timeSeconds * 0.08;
  stage.orbitRings.rotation.z = Math.sin(timeSeconds * 0.45) * 0.09;
  stage.stars.rotation.y = timeSeconds * 0.02;
  stage.scene.children.forEach(child => {
    if (child instanceof THREE.DirectionalLight) {
      const offset = child.color.getHex() === 0xfff1df ? 0 : Math.PI / 2;
      child.position.x = Math.cos(timeSeconds * 0.45 + offset) * 5.2;
      child.position.y = 4.6 + Math.sin(timeSeconds * 0.37 + offset) * 0.7;
    }
  });
  stage.renderer.render(stage.scene, stage.camera);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const right = x + width;
  const bottom = y + height;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = '…';
  let output = text;

  while (output.length > 0 && ctx.measureText(`${output}${ellipsis}`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}${ellipsis}`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let line = '';

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const nextLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
    }

    line = word;

    if (lines.length === maxLines - 1) {
      const remaining = [line, ...words.slice(index + 1)].join(' ');
      lines.push(fitText(ctx, remaining, maxWidth));
      return lines;
    }
  }

  if (line) {
    lines.push(line);
  }

  if (lines.length > maxLines) {
    return [
      ...lines.slice(0, maxLines - 1),
      fitText(ctx, lines.slice(maxLines - 1).join(' '), maxWidth),
    ];
  }

  return lines;
}

function drawBadgeFrame(
  ctx: CanvasRenderingContext2D,
  globeCanvas: HTMLCanvasElement,
  destination: string,
  shareText: string,
  shareUrl: string,
  frameIndex: number
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const accentShift = frameIndex % 2 === 0 ? 0 : 1;

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#08182d');
  background.addColorStop(0.5, '#0d223c');
  background.addColorStop(1, '#06111f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.78, height * 0.4, 20, width * 0.78, height * 0.4, height * 0.55);
  glow.addColorStop(0, 'rgba(234,88,12, 0.34)');
  glow.addColorStop(0.35, 'rgba(244,63,94, 0.18)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const lineGlow = ctx.createLinearGradient(0, 0, width, 0);
  lineGlow.addColorStop(0, 'rgba(255,255,255,0.08)');
  lineGlow.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  lineGlow.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = lineGlow;
  ctx.fillRect(0, 0, width, height);

  const leftEdgeFade = ctx.createLinearGradient(0, 0, width * 0.6, 0);
  leftEdgeFade.addColorStop(0, '#08182d');
  leftEdgeFade.addColorStop(1, 'rgba(8,24,45,0)');
  ctx.fillStyle = leftEdgeFade;
  ctx.fillRect(0, 0, width, height);

  const pillWidth = Math.min(width * 0.32, 260);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  drawRoundedRect(ctx, 34, 34, pillWidth, 60, 18);
  ctx.fill();
  ctx.restore();

  const logoSize = 40;
  ctx.save();
  ctx.translate(52, 44);
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.roundRect(0, 0, logoSize, logoSize, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 17);
  ctx.quadraticCurveTo(17, 8, 22, 12);
  ctx.quadraticCurveTo(29, 18, 31, 8);
  ctx.stroke();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(9, 24);
  ctx.quadraticCurveTo(17, 15, 22, 19);
  ctx.quadraticCurveTo(29, 25, 31, 15);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#3a2540';
  ctx.font = '700 24px "Plus Jakarta Sans", "Arial", sans-serif';
  ctx.fillText('way', 104, 70);
  ctx.fillStyle = '#ea580c';
  ctx.fillText('flo', 140, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px "Plus Jakarta Sans", "Arial", sans-serif';
  const destinationLabel = destination || 'Your trip';
  ctx.fillText(fitText(ctx, destinationLabel, 380), 34, height - 92);

  ctx.font = '700 18px "Plus Jakarta Sans", "Arial", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  const shareLines = wrapText(ctx, shareText, 380, 2);
  shareLines.forEach((line, lineIndex) => {
    ctx.fillText(line, 34, height - 52 + lineIndex * 24);
  });

  ctx.font = '600 14px "Plus Jakarta Sans", "Arial", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.fillText(
    fitText(ctx, shareUrl ? shareUrl.replace(/^https?:\/\//, '') : 'wayflo trip', 380),
    34,
    height - 26
  );

  const globeSize = Math.floor(height * 0.78);
  const globeX = width - globeSize - 48;
  const globeY = Math.floor((height - globeSize) / 2) - 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(globeX + globeSize / 2, globeY + globeSize / 2, globeSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(globeCanvas, globeX, globeY, globeSize, globeSize);
  ctx.restore();

  const ringGradient = ctx.createLinearGradient(globeX, globeY, globeX + globeSize, globeY + globeSize);
  ringGradient.addColorStop(0, 'rgba(255,255,255,0.06)');
  ringGradient.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  ringGradient.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(globeX + globeSize / 2, globeY + globeSize / 2, globeSize / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();

  const accent = ctx.createRadialGradient(
    globeX + globeSize * 0.28,
    globeY + globeSize * 0.24,
    6,
    globeX + globeSize * 0.28,
    globeY + globeSize * 0.24,
    globeSize * 0.46
  );
  accent.addColorStop(0, `rgba(255,255,255,${0.2 + accentShift * 0.03})`);
  accent.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = accent;
  ctx.fillRect(globeX, globeY, globeSize, globeSize);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, height - 2, width, 2);
}

export function BadgeGlobeCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let animationFrame = 0;
    let disposed = false;
    const stage = createGlobeStage(canvas, PREVIEW_SIZE, Math.min(window.devicePixelRatio || 1, 2));

    const tick = (time: number) => {
      if (disposed) {
        return;
      }

      renderGlobe(stage, time / 1000);
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      stage.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}

export async function createBadgeGifFile({
  destination,
  shareText,
  shareUrl,
}: {
  destination: string;
  shareText: string;
  shareUrl: string;
}) {
  const globeCanvas = document.createElement('canvas');
  globeCanvas.width = EXPORT_GLOBE_SIZE;
  globeCanvas.height = EXPORT_GLOBE_SIZE;

  const stage = createGlobeStage(globeCanvas, EXPORT_GLOBE_SIZE, 1);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = EXPORT_WIDTH;
  frameCanvas.height = EXPORT_HEIGHT;
  const context = frameCanvas.getContext('2d');

  if (!context) {
    stage.dispose();
    throw new Error('Unable to render badge canvas.');
  }

  const gif = GIFEncoder({ auto: true, initialCapacity: EXPORT_WIDTH * EXPORT_HEIGHT * 2 });
  let palette: Uint8Array | null = null;

  for (let frameIndex = 0; frameIndex < EXPORT_FRAMES; frameIndex += 1) {
    const timeSeconds = (frameIndex / EXPORT_FRAMES) * Math.PI * 2;
    renderGlobe(stage, timeSeconds);
    drawBadgeFrame(context, globeCanvas, destination, shareText, shareUrl, frameIndex);

    const rgba = context.getImageData(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT).data;

    if (!palette) {
      palette = quantize(rgba, 256);
    }

    const indexed = applyPalette(rgba, palette);
    gif.writeFrame(indexed, EXPORT_WIDTH, EXPORT_HEIGHT, {
      palette,
      delay: EXPORT_DELAY_MS,
      dispose: 1,
    });
  }

  stage.dispose();
  gif.finish();

  const bytes = gif.bytes();

  return new File(
    [bytes],
    `wayflo-${destination ? destination.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'trip'}.gif`,
    { type: 'image/gif' }
  );
}

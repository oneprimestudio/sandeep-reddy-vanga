"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * One real object: a 35mm film strip wound into a helix.
 * Every pillar is a physical part of that strip:
 *   0 Writing  -> the frame  (script pages)
 *   1 Editing  -> the cut    (clips + splice mark)
 *   2 Sound    -> the track  (optical soundtrack edge, goes red + pulses)
 *   3 Theatre  -> the beam   (projector light through the reel)
 * Frames repeat 0,1,2,3,... so the active pillar's frames step forward and light up.
 */

const FRAMES = 40;
const R = 2.2; // helix radius
const FRAME_LEN = 1.05;
const STRIP_H = 0.96;
const PER_TURN = 13;
const STEP = (Math.PI * 2) / PER_TURN;
const RISE = (STRIP_H + 0.04) / PER_TURN;
const BARS_PER_FRAME = 24;
const RED = "#d92626";

function frameTexture(kind: number) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0f0f0f";
  g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#f4f4f4";
  if (kind === 0) {
    [34, 60, 86, 112].forEach((y, i) => g.fillRect(36, y, [180, 236, 140, 204][i], 8));
    g.fillStyle = RED;
    g.fillRect(36, 142, 10, 20);
  } else if (kind === 1) {
    g.fillRect(24, 70, 138, 60);
    g.globalAlpha = 0.4;
    g.fillRect(170, 70, 126, 60);
    g.globalAlpha = 1;
    g.fillStyle = RED;
    g.fillRect(164, 36, 4, 128);
  } else if (kind === 2) {
    for (let x = 20; x < 300; x += 8) {
      const h = 14 + Math.abs(Math.sin(x * 0.07) * Math.cos(x * 0.013)) * 120;
      g.fillRect(x, 100 - h / 2, 4, h);
    }
  } else {
    g.fillStyle = "rgba(217,38,38,.45)";
    g.beginPath();
    g.moveTo(160, 0);
    g.lineTo(270, 200);
    g.lineTo(50, 200);
    g.fill();
    g.fillStyle = "#f4f4f4";
    for (let r = 0; r < 3; r++)
      for (let x = 30 + (r % 2) * 14; x < 300; x += 28) {
        g.beginPath();
        g.arc(x, 128 + r * 24, 8, 0, 7);
        g.fill();
      }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* dark strip with sprocket holes cut out (alpha 0) */
function stripTexture() {
  const c = document.createElement("canvas");
  c.width = 420;
  c.height = 384;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a1a1a";
  g.fillRect(0, 0, 420, 384);
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 4; k++)
    for (const y of [12, 384 - 12 - 28]) {
      g.beginPath();
      g.roundRect(22 + k * 100, y, 44, 28, 6);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export default function CraftReel({ active }: { active: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const world = new THREE.Group();
    world.rotation.z = 0.14;
    scene.add(world);

    /* shared assets */
    const frameTex = [0, 1, 2, 3].map(frameTexture);
    const baseTex = stripTexture();
    const baseGeo = new THREE.PlaneGeometry(FRAME_LEN, STRIP_H);
    const imgGeo = new THREE.PlaneGeometry(0.8, 0.5);

    /* frames */
    const frames = Array.from({ length: FRAMES }, (_, f) => {
      const group = new THREE.Group();
      const baseMat = new THREE.MeshBasicMaterial({
        map: baseTex,
        transparent: true,
        alphaTest: 0.01,
        side: THREE.DoubleSide,
      });
      const imgMat = new THREE.MeshBasicMaterial({
        map: frameTex[f % 4],
        transparent: true,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      const img = new THREE.Mesh(imgGeo, imgMat);
      img.position.set(0, 0.04, 0.004);
      group.add(base, img);
      group.rotation.y = f * STEP;
      world.add(group);
      return { group, baseMat, imgMat, pop: 0, kind: f % 4 };
    });

    /* optical soundtrack: thin bars along the lower edge */
    const barCount = FRAMES * BARS_PER_FRAME;
    const barMat = new THREE.MeshBasicMaterial({ color: "#8a8a8a" });
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 1, 0.004), barMat, barCount);
    world.add(bars);

    /* projector beam through the middle of the reel */
    const beamH = FRAMES * RISE + 1.6;
    const beamMat = new THREE.MeshBasicMaterial({
      color: RED,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.08, beamH, 48, 1, true), beamMat);
    world.add(beam);

    /* sizing: always fit the helix width */
    const fit = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const need = 6.2 / (camera.aspect * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.position.set(0, 0.5, Math.max(9.5, need));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    /* pointer parallax */
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);

    const dummy = new THREE.Object3D();
    const grey = new THREE.Color("#8a8a8a");
    const red = new THREE.Color(RED);
    let sound = 0;
    let beamO = 0;
    let raf = 0;
    let last = performance.now();
    let time = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      const a = activeRef.current;
      const k = reduced ? 1 : 1 - Math.pow(0.001, dt); // frame-rate independent ease

      if (!reduced) world.rotation.y += dt * 0.2;
      world.rotation.x += ((mouse.y * 0.12) - world.rotation.x) * k * 0.5;
      camera.position.x += ((mouse.x * 0.5) - camera.position.x) * k * 0.4;
      camera.lookAt(0, 0, 0);

      frames.forEach((fr, f) => {
        fr.pop += ((fr.kind === a ? 1 : 0) - fr.pop) * k;
        const r = R + fr.pop * 0.38;
        const th = f * STEP;
        const y = (f - FRAMES / 2) * RISE;
        fr.group.position.set(Math.sin(th) * r, y, Math.cos(th) * r);
        fr.group.scale.setScalar(1 + fr.pop * 0.07);
        const o = 0.2 + 0.8 * fr.pop;
        fr.baseMat.opacity = o;
        fr.imgMat.opacity = o;
      });

      sound += ((a === 2 ? 1 : 0) - sound) * k;
      barMat.color.lerpColors(grey, red, sound);
      for (let j = 0; j < barCount; j++) {
        const s = j / BARS_PER_FRAME - 0.5;
        const th = s * STEP;
        const fi = Math.min(FRAMES - 1, Math.max(0, Math.round(s)));
        const r = R + frames[fi].pop * 0.38 + 0.012;
        const wave = Math.abs(Math.sin(j * 0.7 + time * (1.5 + 7 * sound)) * Math.cos(j * 0.13));
        const h = 0.02 + wave * (0.025 + sound * 0.05);
        dummy.position.set(Math.sin(th) * r, (s - FRAMES / 2 + 0.5) * RISE - 0.34 + h / 2, Math.cos(th) * r);
        dummy.rotation.set(0, th, 0);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        bars.setMatrixAt(j, dummy.matrix);
      }
      bars.instanceMatrix.needsUpdate = true;

      beamO += ((a === 3 ? 0.13 : 0) - beamO) * k;
      beamMat.opacity = beamO;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      frames.forEach((f) => {
        f.baseMat.dispose();
        f.imgMat.dispose();
      });
      [...frameTex, baseTex].forEach((t) => t.dispose());
      barMat.dispose();
      beamMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" />;
}

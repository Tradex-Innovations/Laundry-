'use client';

import {useEffect, useRef} from 'react';

type Leaf = {
  x: number; y: number; vx: number; vy: number;
  size: number; angle: number; spin: number; phase: number;
  age: number; life: number; opacity: number; tone: number;
};

/** A light, pointer-transparent foreground breeze for the Services gallery. */
export default function ServicesLeaves({paused}: {paused: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const motion = useRef(paused);
  const reset = useRef<() => void>(() => {});
  useEffect(() => {motion.current = paused; reset.current();}, [paused]);

  useEffect(() => {
    const surface = canvas.current;
    const stage = surface?.parentElement;
    const context = surface?.getContext('2d');
    if (!surface || !stage || !context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leaves: Leaf[] = [];
    const pointer = {x: -1000, y: -1000, vx: 0, vy: 0};
    let width = 1, height = 1, ratio = 1, frame = 0, previous = 0;
    let inside = false, visible = false, lastMove = 0, lastSpawn = 0, lastBreeze = 0;
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    const blocked = () => motion.current || reduced.matches || document.hidden;

    function addLeaf(x: number, y: number, trail = false) {
      if (leaves.length >= 28) return;
      leaves.push({
        x, y, vx: trail ? pointer.vx * .075 + random(-17, 17) : random(12, 32),
        vy: trail ? pointer.vy * .05 + random(-35, -12) : random(7, 19),
        size: random(trail ? 15 : 19, trail ? 25 : 32),
        angle: random(-Math.PI, Math.PI), spin: random(-1.25, 1.25), phase: random(0, Math.PI * 2),
        age: trail ? .06 : .32, life: random(4.5, 7.5), opacity: random(.48, .8), tone: Math.floor(random(0, 3)),
      });
    }

    function paint() {
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      context!.clearRect(0, 0, width, height);
      for (const leaf of leaves) {
        const fade = Math.min(1, leaf.age / .35, (leaf.life - leaf.age) / 1.5);
        const tumble = Math.cos(leaf.age * 2.1 + leaf.phase);
        const half = leaf.size / 2;
        context!.save();
        context!.translate(leaf.x, leaf.y);
        context!.rotate(leaf.angle);
        context!.scale(.25 + Math.abs(tumble) * .75, 1);
        context!.globalAlpha = Math.max(0, fade) * leaf.opacity;
        const palette = [['#46634b', '#a4b486'], ['#71824f', '#c6cc9b'], ['#71806a', '#b7c4a5']][leaf.tone];
        const shade = context!.createLinearGradient(-half * .65, 0, half * .65, half * .3);
        shade.addColorStop(0, palette[tumble < 0 ? 1 : 0]);
        shade.addColorStop(.52, palette[1]);
        shade.addColorStop(1, palette[0]);
        context!.fillStyle = shade;
        context!.beginPath();
        context!.moveTo(0, -half);
        context!.bezierCurveTo(half * 1.1, -half * .35, half * .9, half * .65, 0, half);
        context!.bezierCurveTo(-half * .7, half * .4, -half * .9, -half * .5, 0, -half);
        context!.fill();
        context!.strokeStyle = '#e5e9cc99'; context!.lineWidth = .65;
        context!.beginPath(); context!.moveTo(0, -half * .8);
        context!.quadraticCurveTo(half * .15, 0, 0, half * 1.15);
        for (const side of [-1, 1]) for (const y of [-.3, .1, .45]) {
          context!.moveTo(0, half * (y + .18));
          context!.lineTo(side * half * .43, half * (y - .1));
        }
        context!.stroke(); context!.restore();
      }
    }

    function animate(now: number) {
      frame = 0;
      if (blocked() || !visible) return;
      const dt = Math.min((now - previous) / 1000 || .016, .04);
      previous = now;
      if (inside && leaves.length < 12 && now - lastBreeze > 700) {
        addLeaf(random(-10, width * .15), random(height * .22, height * .82)); lastBreeze = now;
      }
      for (let index = leaves.length - 1; index >= 0; index--) {
        const leaf = leaves[index];
        leaf.age += dt;
        if (leaf.age >= leaf.life || leaf.y > height + 45 || leaf.x > width + 60 || leaf.x < -80) {leaves.splice(index, 1); continue;}
        const dx = leaf.x - pointer.x, dy = leaf.y - pointer.y, distance = Math.hypot(dx, dy);
        if (inside && distance < 150) {
          const influence = (1 - distance / 150) * dt;
          leaf.vx += (dx / Math.max(distance, 1) * 65 + pointer.vx * .1) * influence;
          leaf.vy += (dy / Math.max(distance, 1) * 45 + pointer.vy * .07) * influence;
        }
        leaf.vx += (18 - leaf.vx) * dt * .18; leaf.vy += dt * 3.5;
        leaf.x += (leaf.vx + Math.sin(leaf.age * 1.8 + leaf.phase) * 10) * dt;
        leaf.y += (leaf.vy + Math.cos(leaf.age * 1.2 + leaf.phase) * 5) * dt;
        leaf.angle += leaf.spin * dt;
      }
      pointer.vx *= Math.exp(-dt * 5); pointer.vy *= Math.exp(-dt * 5);
      paint();
      if (inside || leaves.length) frame = requestAnimationFrame(animate);
    }

    function wake() {
      if (!frame && visible && !blocked() && (inside || leaves.length)) {
        previous = performance.now(); frame = requestAnimationFrame(animate);
      }
    }

    function enter(event: PointerEvent) {
      if (blocked() || event.pointerType === 'touch') return;
      inside = true;
      const rect = stage!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top;
      pointer.vx = pointer.vy = 0; lastMove = performance.now();
      if (!leaves.length) {
        // A few already-floating leaves make the breeze visible as the cursor arrives.
        for (let i = 0; i < 9; i++) addLeaf(random(width * .04, width * .96), random(height * .22, height * .88));
      }
      paint(); wake();
    }

    function move(event: PointerEvent) {
      if (blocked() || event.pointerType === 'touch') return;
      if (!inside) enter(event);
      const rect = stage!.getBoundingClientRect(), now = performance.now();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const dx = x - pointer.x, dy = y - pointer.y, dt = Math.max((now - lastMove) / 1000, .016);
      pointer.vx = Math.max(-800, Math.min(800, dx / dt)); pointer.vy = Math.max(-800, Math.min(800, dy / dt));
      if (Math.hypot(dx, dy) > 5 && now - lastSpawn > 85) {
        addLeaf(x + random(-14, 14), y + random(-10, 10), true); lastSpawn = now;
      }
      pointer.x = x; pointer.y = y; lastMove = now;
      wake();
    }

    function leave() {
      inside = false; pointer.x = pointer.y = -1000; pointer.vx = pointer.vy = 0;
      leaves.forEach(leaf => {leaf.life = Math.min(leaf.life, leaf.age + 1.6);});
    }

    function clear() {
      cancelAnimationFrame(frame); frame = 0; leaves.length = 0; inside = false;
      pointer.x = pointer.y = -1000; paint();
    }

    function resize() {
      width = stage!.clientWidth; height = stage!.clientHeight; ratio = Math.min(devicePixelRatio || 1, 1.5);
      surface!.width = Math.round(width * ratio); surface!.height = Math.round(height * ratio);
      paint(); wake();
    }

    const intersection = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; if (!visible) clear(); else wake();});
    const size = new ResizeObserver(resize);
    intersection.observe(stage); size.observe(stage); resize();
    stage.addEventListener('pointerenter', enter, {passive: true});
    stage.addEventListener('pointermove', move, {passive: true});
    stage.addEventListener('pointerleave', leave, {passive: true});
    stage.addEventListener('pointercancel', leave, {passive: true});
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('blur', leave);
    reduced.addEventListener('change', clear);
    reset.current = clear;
    return () => {
      reset.current = () => {}; clear(); intersection.disconnect(); size.disconnect();
      stage.removeEventListener('pointerenter', enter); stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave); stage.removeEventListener('pointercancel', leave);
      document.removeEventListener('visibilitychange', clear); window.removeEventListener('blur', leave);
      reduced.removeEventListener('change', clear);
    };
  }, []);

  return <canvas ref={canvas} className="gallery-leaves" aria-hidden="true" />;
}

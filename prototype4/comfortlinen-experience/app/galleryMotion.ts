export type GalleryMotion = {position: number; velocity: number};
export type GalleryProjection = {
  width: number; centre: number; flat: number; radius: number;
  cardWidth: number; cardHeight: number; xCentre: number; rawCentre: number;
  scale: number; speed: number; paused: boolean;
  time: number; travel: number; phase: number;
};

/** Exact critically damped spring: consistent on 60 Hz and high-refresh displays. */
export function advanceGallery(state: GalleryMotion, target: number, dt: number): GalleryMotion {
  const omega = 16;
  const error = state.position - target;
  const impulse = state.velocity + omega * error;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (error + impulse * dt) * decay,
    velocity: (state.velocity - omega * impulse * dt) * decay,
  };
}

const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Mirrors the linen shader so front-facing selection targets follow the moving cloth. */
export function projectGalleryPoint(localX: number, localY: number, p: GalleryProjection) {
  let x = p.xCentre + localX * p.cardWidth * p.scale;
  const rawY = p.rawCentre - localY * p.cardHeight * p.scale;
  if (p.paused) return {x, y: rawY, z: 0, alpha: 1, facing: 1};
  const distance = rawY - p.centre;
  // Waves travel along the material, rather than restarting on every recycled card.
  const materialY = (rawY - p.centre + p.travel) / p.cardHeight;
  const wave = Math.sin(localX * 4.6 + materialY * 1.25 - p.time * .8 + p.phase)
    + Math.sin(localX * 8.8 - materialY * .65 - p.time * 1.1 + p.phase) * .28;
  const turnStart = p.flat + Math.sin(localX * 2.6 + p.time * .6 + p.phase) * p.cardHeight * .055;
  const turnRadius = p.radius * (1 + .14 * Math.sin(localX * 3.2 - p.time * .5 + p.phase));
  const angle = Math.max(0, Math.abs(distance) - turnStart) / turnRadius;
  const curl = Math.min(angle, Math.PI);
  const depth = turnRadius * (1 - Math.cos(curl));
  const turn = smoothstep(0, 1.1, angle);
  const edge = Math.sin(localX * Math.PI) ** 2;
  const amplitude = p.cardHeight * (.012 + Math.abs(p.speed) * .028) * (.18 + turn * .82 + edge * .35);
  const ripple = wave * amplitude;
  const twist = localX * p.cardHeight * .1 * turn * Math.sin(p.time * .6 + materialY * .3 + p.phase);
  const bow = Math.cos(localX * Math.PI) * Math.sin(curl) ** 2 * p.cardHeight * .055;
  const y = p.centre + Math.sign(distance) * (Math.min(Math.abs(distance), turnStart) + turnRadius * Math.sin(curl) - bow) + ripple;
  const z = -depth + ripple * 2 + twist;
  x = p.width / 2 + (x - p.width / 2) * (1 - depth / p.radius * .055);
  x += wave * turn * p.cardWidth * .006;
  return {x, y, z, alpha: 1 - smoothstep(2.65, 3.3, angle), facing: Math.cos(curl)};
}

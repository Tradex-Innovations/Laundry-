'use client';

import {useEffect, useRef, type RefObject} from 'react';
import * as THREE from 'three';
import {advanceGallery, projectGalleryPoint, type GalleryProjection} from './galleryMotion';
import type {GalleryItem} from './ServicesGallery';

type Props = {
  items: GalleryItem[];
  paused: boolean;
  section: RefObject<HTMLElement | null>;
  onSelect: (index: number) => void;
  onReady: (supported: boolean) => void;
};

const SLOT_COUNT = 20;
const wrap = (value: number, length: number) => ((value % length) + length) % length;
const clamp = THREE.MathUtils.clamp;

/** Native scrolling carries two gently billowing linen strips through the gallery. */
export default function ServicesGalleryCanvas({items, paused, section, onSelect, onReady}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = useRef<number[]>([]);
  const motion = useRef(paused);
  const invalidate = useRef<() => void>(() => {});
  useEffect(() => {motion.current = paused; invalidate.current();}, [paused]);

  useEffect(() => {
    const element = host.current;
    if (!element || !section.current) return;
    const stage = element.parentElement!;
    let renderer: THREE.WebGLRenderer;
    try {renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});}
    catch {onReady(false); return;}
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 4000);
    camera.position.z = 1000;
    const textures: THREE.CanvasTexture[] = [];
    let disposed = false, loaded = false, frame = 0, lastTime = 0;
    let width = 1, height = 1, target = 0, current = 0, velocity = 0, speed = 0, clothTime = 0;
    let columns = 2, cardWidth = 1, cardHeight = 1, rowStep = 1, headerBottom = 240;
    let active = false, hovered = -1, centre = 1, flat = 1, radius = 1, bottomReserve = 70;

    const slots = Array.from({length: SLOT_COUNT}, () => {
      const geometry = new THREE.PlaneGeometry(1, 1, 32, 64);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          map: {value: null}, viewport: {value: new THREE.Vector2(1, 1)},
          card: {value: new THREE.Vector2(1, 1)}, origin: {value: new THREE.Vector2()},
          centre: {value: 0}, flatRange: {value: 1}, radius: {value: 1}, scale: {value: 1},
          speed: {value: 0}, paused: {value: 0},
          flowTime: {value: 0}, travel: {value: 0}, columnPhase: {value: 0},
        },
        transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide, forceSinglePass: true,
        vertexShader: `
          uniform vec2 viewport; uniform vec2 card; uniform vec2 origin;
          uniform float centre; uniform float flatRange; uniform float radius;
          uniform float scale; uniform float speed; uniform float paused;
          uniform float flowTime; uniform float travel; uniform float columnPhase;
          varying vec2 vUv; varying float vFade; varying float vBend; varying float vFacing; varying vec3 vSurface;
          void main(){
            vUv=uv; vFade=1.; vBend=0.; vFacing=1.;
            float z=0.;
            float x=origin.x+position.x*card.x*scale;
            float y=origin.y-position.y*card.y*scale;
            if(paused<.5){
              float distance=y-centre;
              float materialY=(y-centre+travel)/card.y;
              float wave=sin(position.x*4.6+materialY*1.25-flowTime*.8+columnPhase)
                +sin(position.x*8.8-materialY*.65-flowTime*1.1+columnPhase)*.28;
              float turnStart=flatRange+sin(position.x*2.6+flowTime*.6+columnPhase)*card.y*.055;
              float turnRadius=radius*(1.+.14*sin(position.x*3.2-flowTime*.5+columnPhase));
              float angle=max(0.,abs(distance)-turnStart)/turnRadius;
              float curl=min(angle,3.14159265);
              float depth=turnRadius*(1.-cos(curl));
              float turn=smoothstep(0.,1.1,angle);
              float edgeSin=sin(position.x*3.14159265);
              float edge=edgeSin*edgeSin;
              float amplitude=card.y*(.012+abs(speed)*.028)*(.18+turn*.82+edge*.35);
              float ripple=wave*amplitude;
              float twist=position.x*card.y*.1*turn*sin(flowTime*.6+materialY*.3+columnPhase);
              float curlSin=sin(curl);
              float bow=cos(position.x*3.14159265)*curlSin*curlSin*card.y*.055;
              y=centre+sign(distance)*(min(abs(distance),turnStart)+turnRadius*sin(curl)-bow)+ripple;
              x=viewport.x*.5+(x-viewport.x*.5)*(1.-depth/radius*.055)+wave*turn*card.x*.006;
              z=-depth+ripple*2.+twist;
              vFade=1.-smoothstep(2.65,3.3,angle); vBend=depth/radius*.5; vFacing=cos(curl);
            }
            vSurface=vec3(x-viewport.x*.5,viewport.y*.5-y,z);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(vSurface,1.);
          }`,
        fragmentShader: `
          uniform sampler2D map; uniform float speed;
          varying vec2 vUv; varying float vFade; varying float vBend; varying float vFacing; varying vec3 vSurface;
          void main(){
            vec4 c=texture2D(map,vUv);
            float shift=abs(speed)*vBend*.0003;
            if(shift>.00001){c.r=texture2D(map,vUv+vec2(shift,0.)).r;c.b=texture2D(map,vUv-vec2(shift,0.)).b;}
            // Keep front labels legible over the returning image; rear labels stay quiet.
            if(vUv.y<164./901.){
              float front=smoothstep(-.05,.18,vFacing);
              c.rgb=mix(vec3(.84,.855,.80),c.rgb,c.a);
              float veil=.86*(1.-smoothstep(.52,.92,vUv.x));
              c.a=mix(c.a*.12,max(c.a,veil),front);
            }
            float alpha=c.a*vFade;
            if(alpha<.02) discard;
            // The reverse remains textured; gentle shading makes its depth legible.
            float underside=1.-smoothstep(-.22,.12,vFacing);
            float edgeShade=(1.-abs(vFacing))*.12;
            vec3 clothNormal=cross(dFdx(vSurface),dFdy(vSurface));
            clothNormal*=inversesqrt(max(dot(clothNormal,clothNormal),.000001));
            float clothLight=.93+.07*abs(dot(clothNormal,normalize(vec3(-.18,.35,1.))));
            c.rgb=mix(c.rgb,c.rgb*vec3(.79,.83,.78),underside*.72)*(1.-edgeShade)*clothLight;
            gl_FragColor=vec4(c.rgb,alpha);
            #include <colorspace_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false; scene.add(mesh);
      return {geometry, material, mesh, scale: 1, row: NaN, item: -1};
    });

    async function makeTexture(item: GalleryItem) {
      const image = new Image(); image.src = `/media/${item.image}`;
      await image.decode(); await document.fonts.ready;
      if (disposed) return;
      const canvas = document.createElement('canvas'); canvas.width = 1400;
      const imageHeight = Math.round(canvas.width / 1.9), captionHeight = 164;
      canvas.height = imageHeight + captionHeight;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(canvas.width / image.width, imageHeight / image.height);
      const sw = canvas.width / scale, sh = imageHeight / scale;
      ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, canvas.width, imageHeight);
      ctx.fillStyle = '#25382e'; ctx.font = '500 52px "DM Sans", sans-serif';
      ctx.fillText(item.name, 0, imageHeight + 60, canvas.width - 70);
      ctx.font = '400 42px "DM Sans", sans-serif';
      ctx.fillText(item.short, 0, imageHeight + 111, canvas.width - 70);
      ctx.strokeStyle = '#25382e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, canvas.height - 5); ctx.lineTo(canvas.width, canvas.height - 5); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(1355, imageHeight + 95); ctx.lineTo(1380, imageHeight + 120);
      ctx.moveTo(1380, imageHeight + 96); ctx.lineTo(1380, imageHeight + 120); ctx.lineTo(1356, imageHeight + 120); ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      textures.push(texture); return texture;
    }

    let itemTextures: (THREE.CanvasTexture | undefined)[] = [];
    Promise.all(items.map(makeTexture)).then(result => {
      if (disposed) return;
      itemTextures = result; loaded = true; measure(); onReady(true);
    }).catch(() => {if (!disposed) onReady(false);});

    function wake() {
      if (!frame && loaded && active && !document.hidden) {lastTime = performance.now(); frame = requestAnimationFrame(animate);}
    }

    function measure() {
      width = element!.clientWidth; height = element!.clientHeight;
      if (!width || !height) return;
      const mobile = width < 700;
      columns = mobile || items.length === 1 ? 1 : 2;
      const wallWidth = Math.min(width * (mobile ? .88 : .82), 1680);
      const gap = mobile ? 0 : width * .026;
      cardWidth = (wallWidth - gap * (columns - 1)) / columns;
      if (columns === 1 && !mobile) cardWidth = Math.min(width * .51, 790);
      cardHeight = cardWidth * (1 / 1.9 + 164 / 1400);
      rowStep = cardHeight + (mobile ? 32 : 42);
      headerBottom = stage.querySelector('.gallery-filters')!.getBoundingClientRect().bottom - element!.getBoundingClientRect().top + 8;
      bottomReserve = mobile ? 135 : 66;
      centre = headerBottom + (height - headerBottom - bottomReserve) * .53;
      flat = Math.min(cardHeight * .43, (height - headerBottom - bottomReserve) * .3);
      radius = Math.max(85, (height - headerBottom - bottomReserve) * .24);
      element!.style.setProperty('--gallery-mask-top', `${headerBottom}px`);
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.6));
      renderer.setSize(width, height, false);
      camera.left = -width / 2; camera.right = width / 2; camera.top = height / 2; camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      slots.forEach(slot => {slot.material.uniforms.viewport.value.set(width, height); slot.material.uniforms.card.value.set(cardWidth, cardHeight);});
      readScroll(); current = target; velocity = speed = 0;
      if (loaded) draw(0);
    }

    function readScroll() {
      const rect = section.current!.getBoundingClientRect();
      const wasActive = active;
      active = rect.top < height && rect.bottom > 0;
      document.documentElement.dataset.galleryActive = String(rect.top <= 0 && rect.bottom >= height);
      target = clamp(-rect.top, 0, Math.max(0, rect.height - height));
      if (!wasActive || motion.current || !active) {current = target; velocity = speed = 0;}
      if (motion.current && loaded && active && !document.hidden) draw(0);
      else wake();
    }

    function draw(dt: number) {
      if (!loaded) return false;
      const rows = SLOT_COUNT / columns;
      const firstRow = Math.floor(current / rowStep) - Math.floor(rows / 2);
      const gap = columns === 2 ? width * .026 : 0;
      const totalWidth = cardWidth * columns + gap * (columns - 1);
      let hoverMoving = false;
      for (let rowOffset = 0; rowOffset < rows; rowOffset++) for (let column = 0; column < columns; column++) {
        const row = firstRow + rowOffset;
        // Ring slots preserve a visible row's mesh, texture and hover state at recycling boundaries.
        const slotIndex = wrap(row, rows) * columns + column;
        const slot = slots[slotIndex];
        const itemIndex = wrap(row * columns + column, items.length);
        const rawCentre = centre + row * rowStep - current;
        if (slot.row !== row) {slot.row = row; slot.scale = 1; if (hovered === slotIndex) hovered = -1;}
        const nextScale = hovered === slotIndex && !motion.current ? 1.009 : 1;
        slot.scale = motion.current ? 1 : THREE.MathUtils.lerp(slot.scale, nextScale, 1 - Math.exp(-12 * dt));
        hoverMoving ||= Math.abs(slot.scale - nextScale) > .00005;
        const p: GalleryProjection = {
          width, centre, flat, radius, cardWidth, cardHeight, rawCentre,
          xCentre: (width - totalWidth) / 2 + cardWidth / 2 + column * (cardWidth + gap),
          scale: slot.scale, speed, paused: motion.current, time: clothTime, travel: current, phase: column * 1.65,
        };
        const u = slot.material.uniforms;
        u.map.value = itemTextures[itemIndex]; u.origin.value.set(p.xCentre, rawCentre);
        u.centre.value = centre; u.flatRange.value = flat; u.radius.value = radius;
        u.scale.value = slot.scale; u.speed.value = speed; u.paused.value = Number(motion.current);
        u.flowTime.value = clothTime; u.travel.value = current; u.columnPhase.value = p.phase;
        slot.mesh.renderOrder = 10 - Math.abs(rawCentre - centre) / rowStep;
        const button = targets.current[slotIndex];
        slot.mesh.visible = motion.current
          ? rawCentre + cardHeight / 2 > headerBottom && rawCentre - cardHeight / 2 < height
          : Math.abs(rawCentre - centre) < flat + radius * 1.14 * 3.3 + cardHeight * .65;
        if (!slot.mesh.visible) {if (button) {button.hidden = true; button.tabIndex = -1;} continue;}
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        // Only front-facing areas receive click targets; the returning underside is visual depth.
        for (let step = 0; step <= 16; step++) {
          const along = step / 16 - .5;
          for (const [x, y] of [[-.5, along], [0, along], [.5, along], [along, -.5], [along, .5]]) {
            const point = projectGalleryPoint(x, y, p);
            if (point.alpha > .7 && point.facing > .12) {minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);}
          }
        }
        if (button) {
          const top = Math.max(minY, headerBottom + 8), bottom = Math.min(maxY, height - bottomReserve);
          const visible = bottom - top > 32 && Number.isFinite(minX);
          button.hidden = !visible; button.tabIndex = visible ? 0 : -1;
          if (slot.item !== itemIndex) {
            slot.item = itemIndex;
            button.setAttribute('aria-label', `${items[itemIndex].name}. ${items[itemIndex].short}`);
            selected.current[slotIndex] = items[itemIndex].index;
          }
          if (visible) {
            button.style.transform = `translate3d(${minX.toFixed(2)}px,${top.toFixed(2)}px,0)`;
            button.style.width = `${(maxX - minX).toFixed(2)}px`; button.style.height = `${(bottom - top).toFixed(2)}px`;
            button.style.zIndex = String(Math.round(slot.mesh.renderOrder * 10));
          }
        }
      }
      renderer.render(scene, camera); return hoverMoving;
    }

    function animate(now: number) {
      frame = 0;
      if (!active || document.hidden || disposed) return;
      const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
      if (motion.current) {current = target; velocity = speed = 0;}
      else {
        clothTime += dt;
        const next = advanceGallery({position: current, velocity}, target, dt);
        current = next.position; velocity = next.velocity;
        speed = THREE.MathUtils.lerp(speed, clamp(velocity / 2200, -.65, .65), 1 - Math.exp(-10 * dt));
      }
      const settling = !motion.current && (Math.abs(target - current) > .03 || Math.abs(velocity) > .3 || Math.abs(speed) > .0004);
      if (!settling) {current = target; velocity = speed = 0;}
      const hoverMoving = draw(dt);
      // A slow breeze keeps the visible linen alive; pause and hidden sections stop the loop.
      if (!motion.current || settling || hoverMoving) frame = requestAnimationFrame(animate);
    }

    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener('scroll', readScroll, {passive: true});
    const visibility = () => {if (!document.hidden) {readScroll(); current = target; velocity = speed = 0; if (loaded) draw(0);}};
    document.addEventListener('visibilitychange', visibility);
    const hover = (event: PointerEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-gallery-slot]');
      const next = button ? Number(button.dataset.gallerySlot) : -1;
      if (hovered !== next) {hovered = next; wake();}
    };
    const leave = () => {hovered = -1; wake();};
    stage.addEventListener('pointermove', hover, {passive: true}); stage.addEventListener('pointerleave', leave);
    invalidate.current = () => {current = target; velocity = speed = 0; if (loaded) {draw(0); wake();}};
    measure();
    return () => {
      disposed = true; invalidate.current = () => {};
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', readScroll); document.removeEventListener('visibilitychange', visibility);
      stage.removeEventListener('pointermove', hover); stage.removeEventListener('pointerleave', leave);
      delete document.documentElement.dataset.galleryActive;
      slots.forEach(slot => {slot.geometry.dispose(); slot.material.dispose();}); textures.forEach(texture => texture.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [items, section, onReady]);

  return <>
    <div ref={host} className="gallery-canvas" aria-hidden="true" />
    <div className="gallery-targets">
      {Array.from({length: SLOT_COUNT}, (_, index) => <button
        key={index} ref={element => {targets.current[index] = element;}}
        data-gallery-slot={index} className="gallery-target" hidden
        onClick={() => onSelect(selected.current[index])}
      ><span>Explore service</span></button>)}
    </div>
  </>;
}

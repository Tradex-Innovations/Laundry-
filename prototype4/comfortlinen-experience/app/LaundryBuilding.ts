import * as THREE from 'three';

/** An original architectural concept, modelled in metres around a planted pond. */
export function createLaundryBuilding(scene: THREE.Scene, grain: THREE.Texture, onTextureReady: () => void) {
  const building = new THREE.Group();
  scene.add(building);
  const textures: THREE.Texture[] = [];
  const cream = new THREE.MeshStandardMaterial({color: '#e5ddc5', roughness: .86, bumpMap: grain, bumpScale: .025});
  const plaster = new THREE.MeshStandardMaterial({color: '#f0eadc', roughness: .82});
  const timber = new THREE.MeshStandardMaterial({color: '#9b9a76', roughness: .92});
  const roof = new THREE.MeshStandardMaterial({color: '#586960', roughness: .73, metalness: .22});
  const frame = new THREE.MeshStandardMaterial({color: '#394e49', roughness: .55, metalness: .45});
  const silver = new THREE.MeshStandardMaterial({color: '#a5b6b1', roughness: .34, metalness: .65});
  const dark = new THREE.MeshStandardMaterial({color: '#203b3b', roughness: .35, metalness: .22});

  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material = cream) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    return mesh;
  }
  function cylinder(radius: number, length: number, x: number, y: number, z: number, material: THREE.Material, front = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
    mesh.position.set(x, y, z);
    if (front) mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    return mesh;
  }

  // Raised dry ground, a limestone plinth and a path beside the reflective pond.
  const meadow = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({color: '#89976b', roughness: 1}));
  meadow.position.set(0, -.82, -11); meadow.scale.set(18, 1.38, 10.8); meadow.receiveShadow = true; building.add(meadow);
  box(21.8, .52, 10.2, 0, .45, -9.2);
  box(20, .12, 8.8, 0, .76, -9, plaster);
  for (let i = 0; i < 7; i++) box(2.7, .18, 1.04, 3.2, .33, -3.9 + i * 1.19, plaster);

  // A low, working laundry hall. Its front windows reveal the equipment inside.
  box(.3, 4.6, 7.6, -9.5, 3.03, -9);
  box(.3, 4.6, 7.6, 9.5, 3.03, -9);
  box(19, 4.6, .28, 0, 3.03, -12.8);
  box(19, .65, .28, 0, 1.04, -5.2);
  box(19, .7, .32, 0, 5.01, -5.2);
  box(6.5, 3.35, .28, 6.25, 3.04, -5.2);
  box(19, .12, 7.6, 0, .82, -9, plaster);
  box(18.5, 2.8, .14, 0, 2.2, -8.8, plaster);

  // Triangular end walls under one continuous pitched roof.
  const gable = new THREE.Shape();
  gable.moveTo(-3.8, 0); gable.lineTo(0, 1.95); gable.lineTo(3.8, 0); gable.closePath();
  for (const x of [-9.5, 9.5]) {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, {depth: .28, bevelEnabled: false}), cream);
    mesh.rotation.y = Math.PI / 2; mesh.position.set(x - .14, 5.33, -9); mesh.castShadow = true; building.add(mesh);
  }
  const rise = 1.95, run = 4.25, slope = rise / run, roofAngle = Math.atan(slope);
  const roofLength = Math.hypot(run, rise);
  box(20.4, .18, roofLength, 0, 6.305, -6.875, roof).rotation.x = roofAngle;
  box(20.4, .18, roofLength, 0, 6.305, -11.125, roof).rotation.x = -roofAngle;
  box(20.5, .12, .24, 0, 7.33, -9, frame);
  box(20.5, .16, .14, 0, 5.3, -4.72, frame);
  box(20.5, .16, .14, 0, 5.3, -13.28, frame);
  const seamGeometry = new THREE.BoxGeometry(.028, .035, roofLength);
  const seams = new THREE.InstancedMesh(seamGeometry, roof, 58);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 58; i++) {
    const front = i < 29;
    dummy.position.set(-9.9 + (i % 29) * .705, 6.41, front ? -6.875 : -11.125);
    dummy.rotation.set(front ? roofAngle : -roofAngle, 0, 0); dummy.updateMatrix(); seams.setMatrixAt(i, dummy.matrix);
  }
  building.add(seams);

  // Solar modules: real roof-mounted geometry, with original photovoltaic cell texture.
  const panelCanvas = document.createElement('canvas'); panelCanvas.width = 512; panelCanvas.height = 448;
  const ctx = panelCanvas.getContext('2d')!;
  ctx.fillStyle = '#b4c7c9'; ctx.fillRect(0, 0, 512, 448);
  ctx.fillStyle = '#142c3b'; ctx.fillRect(6, 6, 500, 436);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
    const x = 11 + col * 82, y = 11 + row * 53.4;
    const gradient = ctx.createLinearGradient(x, y, x + 79, y + 50);
    gradient.addColorStop(0, '#244d66'); gradient.addColorStop(1, '#142e45');
    ctx.fillStyle = gradient; ctx.fillRect(x, y, 79, 50);
    ctx.fillStyle = 'rgba(160,194,205,.27)';
    for (let line = 1; line < 5; line++) ctx.fillRect(x, y + line * 10, 79, .7);
    ctx.fillStyle = 'rgba(193,211,211,.5)'; ctx.fillRect(x + 26, y, .8, 50); ctx.fillRect(x + 53, y, .8, 50);
  }
  const panelTexture = new THREE.CanvasTexture(panelCanvas); panelTexture.colorSpace = THREE.SRGBColorSpace; panelTexture.anisotropy = 4; textures.push(panelTexture);
  const panelMaterial = new THREE.MeshStandardMaterial({map: panelTexture, roughness: .3, metalness: .38});
  const panels = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.12, 1.83), panelMaterial, 16);
  const panelFrames = new THREE.InstancedMesh(new THREE.BoxGeometry(2.17, .085, 1.88), silver, 16);
  for (let i = 0; i < 16; i++) {
    const z = -7.94 + Math.floor(i / 8) * 1.92;
    const y = 7.28 - (z + 9) * slope + .2;
    dummy.position.set(-8.05 + (i % 8) * 2.3, y, z); dummy.rotation.set(roofAngle, 0, 0); dummy.updateMatrix(); panelFrames.setMatrixAt(i, dummy.matrix);
    dummy.position.y += .045; dummy.position.z += .022;
    dummy.rotation.x = roofAngle - Math.PI / 2; dummy.updateMatrix(); panels.setMatrixAt(i, dummy.matrix);
  }
  panelFrames.castShadow = true; panels.receiveShadow = true; building.add(panelFrames, panels);

  // Warm front glazing with fine mullions. Glass is transparent so the laundry reads clearly.
  const glass = new THREE.MeshPhysicalMaterial({color: '#89a9a4', transparent: true, opacity: .17, roughness: .12, metalness: .22, depthWrite: false});
  box(12, 3.27, .035, -3, 3.02, -5.13, glass).castShadow = false;
  for (const x of [-9, -6.6, -4.2, -1.8, .6, 3]) box(.065, 3.35, .09, x, 3.02, -5.07, frame);
  for (const y of [1.36, 4.68]) box(12.1, .07, .09, -3, y, -5.07, frame);
  box(.055, 2.9, .09, 1.85, 2.87, -5.05, frame);
  box(.05, .48, .09, 2.1, 2.8, -4.96, silver);
  box(.05, .48, .09, 1.6, 2.8, -4.96, silver);

  // Three industrial washers and folded clean linen, seen through the glass.
  for (const x of [-7.7, -5.2, -2.7]) {
    box(1.95, 2.55, 1.45, x, 2.1, -6.4, plaster);
    box(1.8, .33, .06, x, 3.16, -5.65, silver);
    box(.6, .13, .025, x - .35, 3.17, -5.61, dark);
    cylinder(.64, .075, x, 2.06, -5.63, silver, true);
    cylinder(.53, .08, x, 2.06, -5.56, dark, true);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.57, .055, 8, 36), silver); rim.position.set(x, 2.06, -5.49); building.add(rim);
    box(.48, .3, .08, x - .09, 1.9, -5.48, cream).rotation.z = .25;
    cylinder(.06, .03, x + .6, 3.18, -5.6, dark, true);
  }
  for (const x of [-.75, .55]) {
    for (const y of [1.17, 2, 2.83]) {
      box(1.05, .055, .75, x, y, -6.35, timber);
      for (let layer = 0; layer < 3; layer++) box(.82, .12, .58, x, y + .1 + layer * .13, -6.3, plaster);
    }
    for (const side of [-.5, .5]) box(.045, 2.6, .045, x + side, 2.1, -6.7, frame);
  }

  // Understated signage and timber detailing distinguish this from a generic warehouse.
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1280; signCanvas.height = 420;
  const sign = signCanvas.getContext('2d')!;
  sign.fillStyle = '#e8e2cf'; sign.fillRect(0, 0, signCanvas.width, signCanvas.height);
  const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace; signTexture.anisotropy = 4; textures.push(signTexture);
  const signImage = new Image();
  let signDisposed = false;
  signImage.onload = () => {
    if (signDisposed) return;
    const fit = Math.min((signCanvas.width - 96) / signImage.naturalWidth, (signCanvas.height - 48) / signImage.naturalHeight);
    const width = signImage.naturalWidth * fit, height = signImage.naturalHeight * fit;
    sign.drawImage(signImage, (signCanvas.width - width) / 2, (signCanvas.height - height) / 2, width, height);
    signTexture.needsUpdate = true;
    onTextureReady();
  };
  signImage.src = '/brand/comfortlinen-green.png';
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.25, 5.25 * 420 / 1280), new THREE.MeshStandardMaterial({map: signTexture, roughness: 1}));
  signMesh.position.set(6.15, 3.78, -5.035); building.add(signMesh);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(.065, 1.43, .065), timber, 44);
  for (let i = 0; i < 44; i++) {dummy.position.set(3.17 + i * .141, 2.07, -5.015); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); slats.setMatrixAt(i, dummy.matrix);}
  slats.castShadow = true; building.add(slats);
  box(6.9, .13, 1.3, 6.2, 4.76, -4.78, roof);
  for (const x of [3.05, 9.38]) box(.08, 3.9, .08, x, 2.75, -4.2, frame);

  // Rainwater collection and linen moving on an outdoor drying line.
  const tankMaterial = new THREE.MeshStandardMaterial({color: '#8e9d80', roughness: .6});
  cylinder(.68, 2.5, -10.5, 1.84, -8, tankMaterial);
  cylinder(.72, .1, -10.5, 3.13, -8, frame);
  box(.1, 4.5, .1, -9.85, 2.95, -5, frame);
  box(.7, .1, .1, -10.15, .72, -5, frame);
  for (const x of [10.2, 13.7]) box(.065, 3.75, .065, x, 1.95, -7, timber);
  box(3.55, .025, .025, 11.95, 3.82, -7, frame);
  return {textures, dispose: () => {signDisposed = true; signImage.onload = null; signImage.removeAttribute('src');}};
}

export function createSunset(scene: THREE.Scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(85, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {zenith: {value: new THREE.Color('#c8d7cf')}, horizon: {value: new THREE.Color('#f3d7ba')}, below: {value: new THREE.Color('#b4bda0')}},
    vertexShader: `varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 zenith;uniform vec3 horizon;uniform vec3 below;varying vec3 vWorld;
      void main(){float h=normalize(vWorld).y;vec3 c=mix(horizon,zenith,smoothstep(0.,.65,h));c=mix(c,below,(1.-smoothstep(-.35,0.,h)));gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.65, 48, 32), new THREE.MeshBasicMaterial({color: '#ffe4ab', fog: false, toneMapped: false}));
  sun.position.set(-20, 7.2, -34); scene.add(sun);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
  glow.addColorStop(0, 'rgba(255,221,162,.55)'); glow.addColorStop(.3, 'rgba(255,211,145,.25)'); glow.addColorStop(1, 'rgba(255,205,145,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 256, 256);
  const glowTexture = new THREE.CanvasTexture(canvas); glowTexture.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTexture, transparent: true, depthWrite: false, toneMapped: false, fog: false}));
  halo.position.copy(sun.position); halo.position.z += .2; halo.scale.set(21, 21, 1); scene.add(halo);
  return {texture: glowTexture, sun, halo};
}

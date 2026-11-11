'use client';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {createLaundryBuilding, createSunset} from './LaundryBuilding';

type Props={entered:boolean; paused:boolean; holding:boolean; onReady:(supported:boolean)=>void};

/** An original solar-roof laundry landscape, rendered and animated in real time. */
export default function ExperienceScene({entered,paused,holding,onReady}:Props){
 const host=useRef<HTMLDivElement>(null);
 const invalidate=useRef<()=>void>(()=>{});
 const state=useRef({entered,paused,holding});
 useEffect(()=>{state.current={entered,paused,holding};invalidate.current()},[entered,paused,holding]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onReady(false);return;}
  let viewportWidth=element.clientWidth||innerWidth,viewportHeight=element.clientHeight||innerHeight;
  const mobile=viewportWidth<760;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.6));
  renderer.setSize(viewportWidth,viewportHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFShadowMap;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e5dac1');scene.fog=new THREE.Fog('#e5dac1',30,77);
  const camera=new THREE.PerspectiveCamera(49,viewportWidth/viewportHeight,.1,200);
  scene.add(new THREE.HemisphereLight('#f7e5ce','#657b65',2.25));
  const sun=new THREE.DirectionalLight('#ffd2a0',3.2);sun.position.set(-18,12,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.normalBias=.025;scene.add(sun);
  const fill=new THREE.DirectionalLight('#dbe7e3',1.1);fill.position.set(8,6,-7);scene.add(fill);

  // Fine natural grain gives the building and linen a tactile surface.
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;
  const ctx=textureCanvas.getContext('2d')!;const noise=ctx.createImageData(256,256);
  let seed=7348;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<noise.data.length;i+=4){const c=150+random()*65;noise.data[i]=noise.data[i+1]=noise.data[i+2]=c;noise.data[i+3]=255}ctx.putImageData(noise,0,0);
  const grain=new THREE.CanvasTexture(textureCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(5,5);
  const sage=new THREE.MeshStandardMaterial({color:'#a7ad81',roughness:.9,bumpMap:grain,bumpScale:.06});
  const darkStone=new THREE.MeshStandardMaterial({color:'#7e8d64',roughness:1,bumpMap:grain,bumpScale:.1});
  const laundry=createLaundryBuilding(scene,grain,()=>invalidate.current());
  const sunset=createSunset(scene);
  // The distant tree-covered hills sit below the low evening sun.
  for(let i=0;i<9;i++){const hill=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:i%2?'#a0ad8d':'#b5b99b',roughness:1}));hill.position.set(-36+i*9,-2.5,-34-random()*10);hill.scale.set(10+random()*5,3+random()*3,7);scene.add(hill);}

  const waterShader={uniforms:{color:{value:new THREE.Color('#b5c8ad')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:{value:0},pressure:{value:0},rippleOrigin:{value:new THREE.Vector2(0,2)}},
   vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;vUv=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    #include <logdepthbuf_vertex>
    }`,
   fragmentShader:`uniform vec3 color;uniform sampler2D tDiffuse;uniform float time;uniform float pressure;uniform vec2 rippleOrigin;varying vec4 vUv;varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    void main(){
     #include <logdepthbuf_fragment>
     vec2 p=vWorld.xz;float distanceToRipple=length(p-rippleOrigin);
     float wave=sin(p.x*3.5+p.y*2.1+time*.75)*.0015+sin(p.y*7.0-time*.65)*.0008;
     float ripple=sin(distanceToRipple*8.0-time*3.3)*exp(-distanceToRipple*.15)*pressure*.005;
     vec4 uv=vUv;uv.xy+=vec2(wave+ripple,wave*.6-ripple*.4)*uv.w;
     vec3 reflection=texture2DProj(tDiffuse,uv).rgb;
     float shimmer=pow(max(0.0,sin(p.x*4.0+p.y*8.0+time*.5)),22.0)*.018;
     gl_FragColor=vec4(mix(reflection,vec3(.52,.58,.44),.15)+shimmer,1.0);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`};
  const water=new Reflector(new THREE.PlaneGeometry(140,140),{textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,clipBias:.003,multisample:0,shader:waterShader});
  water.rotation.x=-Math.PI/2;water.position.y=.015;scene.add(water);
  const waterMat=water.material as THREE.ShaderMaterial;

  // Natural banks and stones.
  for(let i=0;i<18;i++){const geo=new THREE.SphereGeometry(1,32,24);const pos=geo.attributes.position;for(let j=0;j<pos.count;j++){const n=.94+Math.sin(pos.getX(j)*5+pos.getY(j)*3)*Math.sin(pos.getZ(j)*4)*.09;pos.setXYZ(j,pos.getX(j)*n,pos.getY(j)*n,pos.getZ(j)*n)}geo.computeVertexNormals();const rock=new THREE.Mesh(geo,i%3?darkStone:sage);const side=i%2?-1:1;rock.position.set(side*(9+random()*5),.1+random()*.2,5-random()*20);rock.scale.set(1+random()*1.7,.45+random()*.7,.8+random());rock.castShadow=true;rock.receiveShadow=true;scene.add(rock);}
  // Instanced leaves keep the small botanical garden inexpensive to render.
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.33,.22,-.3,.65,0,1);leafShape.bezierCurveTo(.3,.65,.33,.22,0,0);
  const leafGeometry=new THREE.ShapeGeometry(leafShape,6);const lp=leafGeometry.attributes.position;for(let i=0;i<lp.count;i++)lp.setZ(i,Math.sin(lp.getY(i)*Math.PI)*.13);leafGeometry.computeVertexNormals();
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#748359',side:THREE.DoubleSide,roughness:.8});
  const trees=[[-12,-4,6.4],[-15,-10,8],[-13,-19,7.5],[12,-2,6.5],[16,-10,8],[14,-19,7.5],[-8,-23,7],[6,-24,7],[-14,3,4.3],[14,3,4.5]];
  const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,trees.length*9*36);const dummy=new THREE.Object3D();
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:'#6f8358',roughness:1}),trees.length*7);
  let leafIndex=0,crownIndex=0;
  const bark=new THREE.MeshStandardMaterial({color:'#79745b',roughness:1});
  trees.forEach(([x,z,height],treeIndex)=>{
   const points=[new THREE.Vector3(x,.3,z),new THREE.Vector3(x+.2,height*.4,z+.15),new THREE.Vector3(x-.2,height*.75,z-.12),new THREE.Vector3(x+.15,height,z)];
   const trunk=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.14,8,false),bark);trunk.castShadow=true;scene.add(trunk);
   for(let j=0;j<7;j++){
    const angle=j*2.4,radius=j===0?0:1.05;
    dummy.position.set(x+Math.cos(angle)*radius,height*.72+(j===0?1.05:Math.sin(j)*.5),z+Math.sin(angle)*radius);
    dummy.rotation.set(.1*j,.3*j,.2*j);dummy.scale.set(1.2,1.35+random()*.3,1.15);dummy.updateMatrix();crowns.setMatrixAt(crownIndex,dummy.matrix);
    crowns.setColorAt(crownIndex,new THREE.Color().setHSL(.22+random()*.04,.22,.43+random()*.1));crownIndex++;
   }
   for(let j=0;j<9;j++){const angle=j*2.4;const base=new THREE.Vector3(x,height*.4+j*.08,z);const tip=new THREE.Vector3(x+Math.cos(angle)*1.5,height*.65+j*.1,z+Math.sin(angle)*1.5);scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base,base.clone().lerp(tip,.6).add(new THREE.Vector3(0,.25,0)),tip]),6,.045,5,false),bark));
    for(let k=0;k<36;k++){const a=random()*Math.PI*2,r=.55+random()*.95;dummy.position.copy(tip).add(new THREE.Vector3(Math.cos(a)*r,(random()-.35)*1.9,Math.sin(a)*r));dummy.rotation.set(random()*2,random()*Math.PI*2,random()*2-1);dummy.scale.setScalar(.26+random()*.27);dummy.updateMatrix();leaves.setMatrixAt(leafIndex,dummy.matrix);leaves.setColorAt(leafIndex,new THREE.Color().setHSL(.21+random()*.05,.25+random()*.15,.33+random()*.22));leafIndex++;}
   }
   const bank=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),treeIndex%2?sage:darkStone);bank.position.set(x,-.2,z);bank.scale.set(3.1,.85,2.6);bank.receiveShadow=true;scene.add(bank);
  });leaves.count=leafIndex;leaves.castShadow=true;crowns.castShadow=true;crowns.receiveShadow=true;scene.add(leaves,crowns);
  const grasses=new THREE.InstancedMesh(leafGeometry,new THREE.MeshStandardMaterial({color:'#82966a',roughness:1,side:THREE.DoubleSide}),180);
  for(let i=0;i<180;i++){const side=i%2?-1:1;dummy.position.set(side*(9.5+random()*3.5),.12,-15+random()*20);dummy.rotation.set(-.3+random()*.6,random()*6.28,side*(random()-.5));dummy.scale.set(.1+random()*.18,.4+random()*.85,1);dummy.updateMatrix();grasses.setMatrixAt(i,dummy.matrix)}scene.add(grasses);

  // Linen suspended in the breeze: the brand's material lives in the world.
  const clothGeo=new THREE.PlaneGeometry(2.45,2.5,32,38);const clothBase=new Float32Array(clothGeo.attributes.position.array);
  const clothMat=new THREE.MeshPhysicalMaterial({color:'#fffdf1',roughness:.68,side:THREE.DoubleSide,sheen:1,sheenColor:new THREE.Color('#f0edce'),bumpMap:grain,bumpScale:.025});
  const cloth=new THREE.Mesh(clothGeo,clothMat);cloth.position.set(11.95,2.57,-7);cloth.castShadow=true;scene.add(cloth);
  const petals=new THREE.InstancedMesh(leafGeometry,new THREE.MeshStandardMaterial({color:'#d4d8b8',roughness:.8,side:THREE.DoubleSide}),38);
  const petalData=Array.from({length:38},()=>({x:(random()-.5)*24,y:random()*12,z:8-random()*27,s:.12+random()*.16,phase:random()*6.28}));scene.add(petals);

  let frame=0,last=0,time=0,pressure=0,intro=0,progress=0,targetProgress=0,drag=0,dragTarget=0,downX=0,dragging=false,previousPaused=false,previousEntered=false;
  const pointer=new THREE.Vector2(),look=new THREE.Vector3();
  const cameraStops=[new THREE.Vector3(2.2,7.4,20),new THREE.Vector3(-.6,.7,9),new THREE.Vector3(-8,4.7,7),new THREE.Vector3(10,9.8,9),new THREE.Vector3(2.2,7.4,20),new THREE.Vector3(-7,6,12)];
  const lookStops=[new THREE.Vector3(0,6.8,-7),new THREE.Vector3(-.5,.3,-6),new THREE.Vector3(0,2.5,-7),new THREE.Vector3(0,5,-8),new THREE.Vector3(0,6.8,-7),new THREE.Vector3(0,3.5,-8)];
  const points=[0,.78,1.45,2.55,3.6,6.6];
  const pointerMove=(e:PointerEvent)=>{pointer.set(THREE.MathUtils.clamp((e.clientX/viewportWidth-.5)*2,-1,1),THREE.MathUtils.clamp((e.clientY/viewportHeight-.5)*2,-1,1));waterMat.uniforms.rippleOrigin.value.set(pointer.x*8,3-pointer.y*7);if(dragging)dragTarget=THREE.MathUtils.clamp((e.clientX-downX)/viewportWidth,-.4,.4);};
  const pointerDown=(e:PointerEvent)=>{if((e.target as HTMLElement).closest('button,a,input,select,textarea,dialog'))return;dragging=true;downX=e.clientX};
  const pointerUp=()=>{dragging=false;dragTarget=0};
  const scroll=()=>{targetProgress=scrollY/viewportHeight;progress=targetProgress;const gallery=document.getElementById('services');const rect=gallery?.getBoundingClientRect();if(rect&&rect.top<=0&&rect.bottom>=viewportHeight)return;draw()};
  const resize=()=>{viewportWidth=element.clientWidth||innerWidth;viewportHeight=element.clientHeight||innerHeight;camera.aspect=viewportWidth/viewportHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,viewportWidth<760?1.25:1.6));renderer.setSize(viewportWidth,viewportHeight,false);scroll()};
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(element);
  window.addEventListener('pointermove',pointerMove,{passive:true});window.addEventListener('pointerdown',pointerDown,{passive:true});window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerUp);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',resize);
  function draw(){
   let index=points.findIndex((p,i)=>i<points.length-1&&progress>=p&&progress<points[i+1]);if(index<0)index=points.length-2;
   const mix=THREE.MathUtils.smoothstep(progress,points[index],points[index+1]);
   camera.position.lerpVectors(cameraStops[index],cameraStops[index+1],mix);
   look.lerpVectors(lookStops[index],lookStops[index+1],mix);
   camera.position.z+=(1-intro)*7;
   if(viewportWidth<760){camera.position.z+=25;camera.position.y+=6;look.y+=2.4;}
   if(!state.current.paused){camera.position.x+=pointer.x*.32+drag*6;camera.position.y-=pointer.y*.13;look.x+=drag*2;}
   camera.lookAt(look);
   sunset.sun.position.x=viewportWidth<760?-10:-20;sunset.halo.position.x=sunset.sun.position.x;
   (scene.fog as THREE.Fog).near=viewportWidth<760?50:30;(scene.fog as THREE.Fog).far=viewportWidth<760?110:77;
   const cp=clothGeo.attributes.position;
   for(let i=0;i<cp.count;i++){const x=clothBase[i*3],y=clothBase[i*3+1];const release=(1.25-y)/2.5;cp.setXYZ(i,x+Math.sin(y*2+time*.5)*.05*release,y,Math.sin(x*5+time*.7)*.1+Math.sin(y*1.9+time*.8)*(.15+pressure*.2)*release)}cp.needsUpdate=true;clothGeo.computeVertexNormals();
   waterMat.uniforms.time.value=time;waterMat.uniforms.pressure.value=.2+pressure*2;
   leaves.rotation.z=Math.sin(time*.3)*.006;grasses.rotation.z=Math.sin(time*.5)*.008;
   petalData.forEach((p,i)=>{dummy.position.set(p.x+Math.sin(time*.16+p.phase)*1.3+pressure*Math.sin(p.phase+time)*.8,(p.y-time*.15+120)%12,p.z+Math.sin(time*.2+p.phase));dummy.rotation.set(time*.17+p.phase,time*.13+p.phase,Math.sin(time*.2+p.phase));dummy.scale.setScalar(p.s);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix)});petals.instanceMatrix.needsUpdate=true;
   renderer.render(scene,camera);
  }
  function animate(now:number){frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;if(document.hidden||document.documentElement.dataset.galleryActive==='true')return;
   if(!state.current.paused)time+=dt;
   intro=state.current.paused?1:THREE.MathUtils.lerp(intro,state.current.entered?1:0,.028);
   progress=THREE.MathUtils.lerp(progress,targetProgress,state.current.paused?1:.055);
   pressure=THREE.MathUtils.lerp(pressure,state.current.holding?1:0,.045);drag=THREE.MathUtils.lerp(drag,dragTarget,.04);
   if(!state.current.paused||previousPaused!==state.current.paused||previousEntered!==state.current.entered||Math.abs(progress-targetProgress)>.001||Math.abs(pressure-(state.current.holding?1:0))>.001)draw();
   previousPaused=state.current.paused;previousEntered=state.current.entered;
  }
  invalidate.current=()=>{if(state.current.paused)intro=1;draw()};
  progress=targetProgress=scrollY/viewportHeight;draw();onReady(true);frame=requestAnimationFrame(animate);
  const restore=()=>{if(!document.hidden){progress=targetProgress=scrollY/viewportHeight;draw()}};document.addEventListener('visibilitychange',restore);
  return()=>{invalidate.current=()=>{};cancelAnimationFrame(frame);sizeObserver.disconnect();window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerdown',pointerDown);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',pointerUp);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',restore);water.dispose();grain.dispose();laundry.dispose();laundry.textures.forEach(t=>t.dispose());sunset.texture.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Sprite){if(o instanceof THREE.Mesh)geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()};
 },[onReady]);
 return <div ref={host} className="world-canvas" aria-hidden="true"/>;
}

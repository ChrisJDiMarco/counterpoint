import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const AMBER = 0xffc477, BLUE = 0x83dff7, GOLD = 0xbfa477;
const v = (x,y,z) => new THREE.Vector3(x,y,z);
export const nodeName = i => `${'ABC'[Math.floor(i/4)]}${i%4+1}`;
const center = i => v((i%4-1.5)*2.5,.18,(Math.floor(i/4)-1)*2.5);
export function beadPosition(bead){const p=center(bead.node);p.y=.43;if(bead.entry==='N')p.z-=1.03;else p.x-=1.03;return p;}

export function createScene(container, callbacks={}){
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0b171b,.018);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0b171b,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D board. Drag to orbit; scroll to zoom. Use the switch buttons for keyboard play.');
 const camera=new THREE.PerspectiveCamera(37,1,.1,120);camera.position.set(11.4,15.6,15.5);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.085;controls.target.set(0,-.05,0);controls.minDistance=10;controls.maxDistance=29;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.025;controls.enablePan=true;
 const pmrem=new THREE.PMREMGenerator(renderer), env=new RoomEnvironment();
 scene.environment=pmrem.fromScene(env,.035).texture;scene.environmentIntensity=.62;env.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc5edf2,0x183335,1.5));
 const key=new THREE.DirectionalLight(0xffe6c0,4.2);key.position.set(-4,12,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});key.shadow.bias=-.0003;key.shadow.normalBias=.02;scene.add(key);
 const rim=new THREE.DirectionalLight(0x9de5f7,2.6);rim.position.set(6,5,-7);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xe1b677,.9);fill.position.set(-9,3,-2);scene.add(fill);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.3,.5,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
 const metal=new THREE.MeshStandardMaterial({color:GOLD,metalness:.83,roughness:.28});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x314346,metalness:.8,roughness:.35});
 const teal=new THREE.MeshPhysicalMaterial({color:0x173a40,metalness:.4,roughness:.35,clearcoat:.7,clearcoatRoughness:.3});
 const baseMat=new THREE.MeshPhysicalMaterial({color:0x103137,metalness:.5,roughness:.42,clearcoat:.8,clearcoatRoughness:.35});
 const black=new THREE.MeshStandardMaterial({color:0x101e23,metalness:.5,roughness:.46});
 const railMat=new THREE.MeshStandardMaterial({color:0x867e68,metalness:.78,roughness:.36});
 const routeMat=new THREE.MeshStandardMaterial({color:0xd5c8a8,metalness:.75,roughness:.24,emissive:0x75684b,emissiveIntensity:.15});
 const stage=new THREE.Group();scene.add(stage);
 function mesh(geo,mat,pos,parent=stage){const m=new THREE.Mesh(geo,mat);if(pos)m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,r,mat,pos,parent=stage){return mesh(new RoundedBoxGeometry(w,h,d,3,r),mat,pos,parent);}
 function cylinder(r,h,mat,pos,parent=stage){return mesh(new THREE.CylinderGeometry(r,r,h,64),mat,pos,parent);}
 function ring(r,t,mat,pos,parent=stage){const m=mesh(new THREE.TorusGeometry(r,t,8,64),mat,pos,parent);m.rotation.x=Math.PI/2;return m;}
 function curve(points){return new THREE.CatmullRomCurve3(points,false,'centripetal',.5);}
 function tube(points,r,mat,parent=stage){const c=Array.isArray(points)?curve(points):points;return mesh(new THREE.TubeGeometry(c,Math.max(16,Math.ceil(c.getLength()*7)),r,8,false),mat,null,parent);}
 function textSprite(text,color='#9fbaaf',size=1){const canvas=document.createElement('canvas');const c=canvas.getContext('2d');const font='500 48px -apple-system, sans-serif';c.font=font;canvas.width=Math.ceil(c.measureText(text).width+28);canvas.height=96;c.font=font;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,canvas.width/2,48);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,opacity:.9}));s.scale.set(size,size*96/canvas.width,1);return s;}
 function flatText(text,pos,size=1,color='#a6ad93'){const s=textSprite(text,color,size);s.position.copy(pos);stage.add(s);return s;}
 box(11.6,.45,8.9,.3,baseMat,v(0,-.29,0));box(11.64,.07,8.94,.3,metal,v(0,-.54,0));box(11.35,.22,8.68,.22,black,v(0,-.69,0));
 box(11.18,.06,8.48,.22,teal,v(0,-.035,0));
 for(const x of [-4.9,4.9])for(const z of [-3.6,3.6]){cylinder(.43,.48,darkMetal,v(x,-1.04,z));ring(.39,.03,metal,v(x,-1.2,z));cylinder(.085,.025,metal,v(x,.017,z));}
 const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x02080b,metalness:.12,roughness:.88}),v(0,-1.32,0),scene);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 // Fine perimeter inlay and instrument engraving.
 for(const z of [-4.1,4.1])tube([v(-5.1,.015,z),v(5.1,.015,z)],.008,railMat);
 flatText('C O U N T E R P O I N T',v(0,.04,3.92),2.7,'#bdac86');
 flatText('I  ·  I I  ·  I I I',v(0,.04,-4.0),1.6,'#8caaab');
 const switchGroups=[],hitTargets=[],routeGroups=[],selectionRings=[],legalRings=[];
 const notchGeo=new THREE.BoxGeometry(.016,.024,.065);const notches=new THREE.InstancedMesh(notchGeo,metal,12*28);let ni=0;const dummy=new THREE.Object3D();
 for(let i=0;i<12;i++){
  const p=center(i),g=new THREE.Group();g.position.copy(p);stage.add(g);switchGroups.push(g);
  cylinder(.78,.14,darkMetal,v(0,-.04,0),g);ring(.73,.034,metal,v(0,.055,0),g);cylinder(.655,.105,black,v(0,.045,0),g);
  const face=cylinder(.607,.042,teal.clone(),v(0,.113,0),g);face.userData.node=i;hitTargets.push(face);ring(.59,.012,metal,v(0,.143,0),g);
  for(let j=0;j<28;j++){let a=j/28*Math.PI*2;dummy.position.set(p.x+Math.sin(a)*.685,p.y+.04,p.z+Math.cos(a)*.685);dummy.rotation.set(0,a,0);dummy.updateMatrix();notches.setMatrixAt(ni++,dummy.matrix);}
  const straight=new THREE.Group(),turned=new THREE.Group();g.add(straight,turned);
  tube([v(0,.17,-.61),v(0,.17,.61)],.03,routeMat,straight);
  tube([v(-.61,.16,0),v(-.23,.16,0),v(0,.24,0),v(.23,.16,0),v(.61,.16,0)],.03,routeMat,straight);
  tube(new THREE.QuadraticBezierCurve3(v(0,.17,-.61),v(0,.17,0),v(.61,.17,0)),.03,routeMat,turned);
  tube(new THREE.QuadraticBezierCurve3(v(-.61,.17,0),v(0,.17,0),v(0,.17,.61)),.03,routeMat,turned);
  turned.visible=false;routeGroups.push({straight,turned});
  const sel=ring(.82,.018,new THREE.MeshBasicMaterial({color:AMBER,transparent:true,opacity:.9}),v(0,.015,0),g);sel.visible=false;selectionRings.push(sel);
  const legal=ring(.79,.007,new THREE.MeshBasicMaterial({color:0x91b6ae,transparent:true,opacity:.18}),v(0,.0,0),g);legalRings.push(legal);
  const label=textSprite(nodeName(i),'#d5dccc',.55);label.position.set(.43,.47,-.50);g.add(label);
 }
 stage.add(notches);
 // Tracks use a lower return deck. Each loop remains a single game step.
 for(let i=0;i<12;i++){
  const p=center(i),col=i%4,row=Math.floor(i/4);
  if(col<3){tube([v(p.x+.77,.17,p.z),v(p.x+1.73,.17,p.z)],.037,railMat);}
  else{tube([v(p.x+.77,.17,p.z),v(5.25,.17,p.z),v(5.96,-.82,p.z),v(5.6,-.97,p.z),v(-5.6,-.97,p.z),v(-5.96,-.82,p.z),v(-5.25,.17,p.z),v(-4.52,.17,p.z)],.04,railMat);}
  if(row<2){tube([v(p.x,.17,p.z+.77),v(p.x,.17,p.z+1.73)],.037,railMat);}
  else{tube([v(p.x,.17,p.z+.77),v(p.x,.17,3.9),v(p.x,-1.1,4.7),v(p.x,-1.15,4.3),v(p.x,-1.15,-4.3),v(p.x,-1.1,-4.7),v(p.x,.17,-3.9),v(p.x,.17,-3.27)],.035,darkMetal);}
  // Tiny directional chevrons on incoming lanes.
  for(const entry of ['N','W']){const bp=beadPosition({node:i,entry});const arrow=new THREE.Mesh(new THREE.ConeGeometry(.055,.12,3),metal);arrow.rotation.set(Math.PI/2,0,entry==='W'?-Math.PI/2:0);arrow.position.copy(bp);arrow.position.y=.19;if(entry==='W'){arrow.rotation.set(0,0,-Math.PI/2);arrow.position.x+=.21;}else{arrow.rotation.set(Math.PI/2,0,0);arrow.position.z+=.21;}stage.add(arrow);}
 }
 for(let r=0;r<3;r++){flatText(`↻ ${'ABC'[r]}`,v(-5.42,.18,(r-1)*2.5),.57,'#91a5a0');flatText(`${'ABC'[r]} ↻`,v(5.42,.18,(r-1)*2.5),.57,'#91a5a0');}
 const goals=[];
 for(const color of ['amber','blue'])for(let r=0;r<3;r++){
  const node=r*4+(color==='amber'?0:2),p=beadPosition({node,entry:'W'});p.y=.16;
  cylinder(.32,.055,black,p);const mat=new THREE.MeshStandardMaterial({color:color==='amber'?AMBER:BLUE,metalness:.62,roughness:.24,emissive:color==='amber'?AMBER:BLUE,emissiveIntensity:.35});
  const halo=ring(.275,.027,mat,v(p.x,.22,p.z));ring(.34,.009,metal,v(p.x,.195,p.z));
  goals.push({node,color,halo});
 }
 const beadMeshes=new Map(),previewGroup=new THREE.Group();stage.add(previewGroup);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.5)');gradient.addColorStop(.2,'rgba(255,255,255,.18)');gradient.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);const glowMap=new THREE.CanvasTexture(glowCanvas);
 function makeBead(bead){const g=new THREE.Group(),color=bead.color==='amber'?AMBER:BLUE;
  const core=mesh(bead.color==='amber'?new THREE.SphereGeometry(.115,24,16):new THREE.OctahedronGeometry(.15,0),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:3.0,metalness:.1,roughness:.2}),null,g);
  mesh(new THREE.SphereGeometry(.21,32,24),new THREE.MeshPhysicalMaterial({color,metalness:.12,roughness:.09,transmission:.35,thickness:.25,transparent:true,opacity:.72,clearcoat:1,envMapIntensity:2}),null,g);
  ring(.23,.015,new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.18}),v(0,-.12,0),g);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(1.1,1.1,1);g.add(glow);
  const light=new THREE.PointLight(color,.5,1.8,2);light.position.y=.15;g.add(light);stage.add(g);beadMeshes.set(bead.id,{g,core,glow});return g;
 }
 function clearPreview(){for(const child of [...previewGroup.children]){previewGroup.remove(child);child.geometry?.dispose();child.material?.dispose();}selectionRings.forEach(r=>r.visible=false);}
 let current=null,selected=null,hovered=null,allowed=[],animating=false,reduced=false,motion=null,cameraMotion=null,resizeObserver;
 function setState(state,legal=[]){current=state;allowed=legal;for(let i=0;i<12;i++){routeGroups[i].straight.visible=!state.switches[i];routeGroups[i].turned.visible=!!state.switches[i];hitTargets[i].material.color.set(legal.includes(i)?0x173c42:0x0b2229);legalRings[i].material.opacity=legal.includes(i)?.23:.025;}
  for(const b of state.beads){const g=beadMeshes.get(b.id)?.g||makeBead(b);g.position.copy(beadPosition(b));}
  for(const goal of goals){const lit=state.beads.some(b=>b.color===goal.color&&b.node===goal.node&&b.entry==='W');goal.halo.material.emissiveIntensity=lit?2.1:.3;}
 }
 function stepCurve(b,next,switchValue){const p=center(b.node),start=beadPosition(b),end=beadPosition(next);const east=switchValue?b.entry==='N':b.entry==='W';const points=[start];
  if(switchValue){if(east)points.push(v(p.x,.43,p.z-.4),v(p.x+.12,.43,p.z-.12),v(p.x+.4,.43,p.z));else points.push(v(p.x-.4,.43,p.z),v(p.x-.12,.43,p.z+.12),v(p.x,.43,p.z+.4));}
  else points.push(v(p.x,.43,p.z));
  if(east&&b.node%4===3){points.push(v(5.25,.43,p.z),v(5.98,-.65,p.z),v(5.5,-.75,p.z),v(-5.5,-.75,p.z),v(-5.98,-.65,p.z),v(-5.25,.43,p.z));}
  if(!east&&Math.floor(b.node/4)===2){points.push(v(p.x,.43,3.9),v(p.x,-.87,4.7),v(p.x,-.93,4.3),v(p.x,-.93,-4.3),v(p.x,-.87,-4.7),v(p.x,.43,-3.9));}
  points.push(end);return curve(points);
 }
 function preview(next,node){clearPreview();selected=node;if(node===null)return;selectionRings[node].visible=true;selectionRings[node].material.color.set(current.turn==='amber'?AMBER:BLUE);
  for(const b of current.beads){const n=next.beads.find(x=>x.id===b.id),color=b.color==='amber'?AMBER:BLUE;
   const ghost=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.28,depthWrite:false}));ghost.position.copy(beadPosition(n));previewGroup.add(ghost);
   const points=stepCurve(b,n,next.switches[b.node]).getPoints(100);const geo=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color,transparent:true,opacity:.4,dashSize:.09,gapSize:.08,depthWrite:false}));line.computeLineDistances();previewGroup.add(line);
  }
 }
 async function animateMove(before,after,node){clearPreview();selected=null;animating=true;routeGroups[node].straight.visible=!after.switches[node];routeGroups[node].turned.visible=!!after.switches[node];
  const paths=before.beads.map(b=>({id:b.id,path:stepCurve(b,after.beads.find(n=>n.id===b.id),after.switches[b.node])}));
  if(reduced){setState(after,[]);animating=false;return;}
  await new Promise(resolve=>{motion={start:performance.now(),duration:1050,paths,node,resolve};});animating=false;setState(after,[]);
 }
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDown=null;
 function intersect(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(hitTargets,false)[0]?.object.userData.node??null;}
 renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};});
 renderer.domElement.addEventListener('pointerup',e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)<6&&!animating){const node=intersect(e);if(node!==null)callbacks.onSelect?.(node);}pointerDown=null;});
 renderer.domElement.addEventListener('pointermove',e=>{const node=intersect(e);if(node!==hovered){hovered=node;renderer.domElement.style.cursor=node!==null?'pointer':'grab';callbacks.onHover?.(node);}});
 renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;callbacks.onHover?.(null);});
 function resize(){const {width,height}=container.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height);}
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
 function view(name='perspective'){const aspect=container.clientWidth/container.clientHeight;const scale=aspect<1.25?1.18:1;const pos=name==='top'?v(0,21.8*scale,.01):v(9.5*scale,14.3*scale,13.7*scale);if(reduced){camera.position.copy(pos);controls.target.set(0,0,0);controls.update();}else cameraMotion={start:performance.now(),from:camera.position.clone(),target:controls.target.clone(),to:pos};}
 view();
 function frame(now){requestAnimationFrame(frame);const t=now*.001;
  if(cameraMotion){const f=Math.min(1,(now-cameraMotion.start)/700),s=f*f*(3-2*f);camera.position.lerpVectors(cameraMotion.from,cameraMotion.to,s);controls.target.copy(cameraMotion.target).multiplyScalar(1-s);if(f===1)cameraMotion=null;}
  if(motion){const f=Math.min(1,(now-motion.start)/motion.duration),e=f*f*(3-2*f);for(const a of motion.paths){beadMeshes.get(a.id).g.position.copy(a.path.getPointAt(e));}switchGroups[motion.node].position.y=.18+Math.sin(f*Math.PI)*.05;if(f===1){const done=motion.resolve;motion=null;done();}}
  for(const [id,b] of beadMeshes){b.core.rotation.y=reduced?0:t*.32;b.glow.material.opacity=reduced?.55:.56+Math.sin(t*1.5+id.charCodeAt(1))*.1;}
  for(let i=0;i<12;i++){if(i!==selected){selectionRings[i].visible=i===hovered;selectionRings[i].material.color.set(allowed.includes(i)?0xd1c295:0x5f8291);selectionRings[i].material.opacity=.5;}else selectionRings[i].material.opacity=reduced?.9:.75+Math.sin(t*3)*.2;}
  controls.update();composer.render();
 }
 requestAnimationFrame(frame);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();callbacks.onError?.('The 3D graphics context was interrupted. Relaunch Counterpoint to restore the board.');});
 return {setState,preview,clearPreview:()=>{selected=null;clearPreview();},animateMove,view,setReducedMotion(value){reduced=value;},projectNode(i){const p=center(i).clone();p.y=.4;p.project(camera);const r=renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},getCamera(){return camera.position.toArray();},getRendererInfo(){return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
}

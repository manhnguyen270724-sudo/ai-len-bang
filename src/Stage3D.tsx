import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import type { Student, Group } from './core';
import { chasePhase, runnerPosition, REVEAL_SECONDS } from './choreography';
import { Stage, type Concept } from './Scene';

type Props = {
  concept: Concept;
  students: Student[];
  running: boolean;
  selected: string[];
  groups: Group[];
};

const PALETTE = ['#845ec2', '#d65db1', '#ff6f91', '#ff9671', '#ffc75f', '#00c9a7', '#4d80e4'];
const SKIN_TONES = ['#fedac2', '#fcd0b3', '#f5c19d', '#e0aa85'];
const HAIR_COLORS = ['#2c2420', '#4a3728', '#6a4935', '#242132', '#8c593e'];

function createSphere(parent: T.Object3D, color: string | number, r: number, x = 0, y = 0, z = 0, roughness = 0.5, metalness = 0.1) {
  const mesh = new T.Mesh(
    new T.SphereGeometry(r, 20, 16),
    new T.MeshStandardMaterial({ color, roughness, metalness })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBox(parent: T.Object3D, color: string | number, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, roughness = 0.6) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(sx, sy, sz),
    new T.MeshStandardMaterial({ color, roughness })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCylinder(parent: T.Object3D, color: string | number, rt: number, rb: number, h: number, seg = 24, x = 0, y = 0, z = 0, roughness = 0.5) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(rt, rb, h, seg),
    new T.MeshStandardMaterial({ color, roughness })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createTorus(parent: T.Object3D, color: string | number, r: number, tube: number, x = 0, y = 0, z = 0, roughness = 0.4) {
  const mesh = new T.Mesh(
    new T.TorusGeometry(r, tube, 12, 48),
    new T.MeshStandardMaterial({ color, roughness })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Procedural Chibi Student Character
function buildChibiCharacter(index: number, avatar?: Student['avatar']) {
  const root = new T.Group();
  const skin = SKIN_TONES[index % SKIN_TONES.length];
  const hairColor = HAIR_COLORS[index % HAIR_COLORS.length];
  const uniformColor = PALETTE[index % PALETTE.length];
  const isFemale = avatar === 'female' || (avatar === undefined && index % 2 === 1);

  // Body container (for squash/stretch bobbing)
  const body = new T.Group();
  root.add(body);

  // Torso / Jacket
  const torso = createCylinder(body, uniformColor, 0.22, 0.26, 0.42, 16, 0, 0.62, 0);
  torso.scale.set(1.05, 1, 0.85);

  // White inner shirt collar & school tie
  createBox(body, '#ffffff', 0.12, 0.12, 0.05, 0, 0.77, 0.13, 0.3);
  createBox(body, '#e74c3c', 0.05, 0.16, 0.03, 0, 0.68, 0.145, 0.4);

  // Cute backpack strapped on back
  const backpack = createBox(body, PALETTE[(index + 3) % PALETTE.length], 0.28, 0.32, 0.16, 0, 0.64, -0.16, 0.7);
  createBox(backpack, '#ffffff', 0.18, 0.1, 0.04, 0, -0.05, -0.09, 0.5); // pocket

  // Head
  const headGroup = new T.Group();
  headGroup.position.set(0, 1.15, 0.02);
  body.add(headGroup);

  // Cute rounded chibi head
  const headMesh = createSphere(headGroup, skin, 0.34, 0, 0, 0, 0.5);
  headMesh.scale.set(1.08, 0.96, 0.98);

  // Cheeks (blush)
  for (const side of [-1, 1]) {
    const blush = createSphere(headGroup, '#ff8fa3', 0.065, side * 0.22, -0.05, 0.27, 0.8);
    blush.scale.set(1, 0.6, 0.3);
  }

  // Large expressive eyes with white catchlight reflections
  const eyebrows: T.Mesh[] = [];
  for (const side of [-1, 1]) {
    // Dark anime eye
    const eye = createSphere(headGroup, '#1c1b29', 0.055, side * 0.125, 0.02, 0.31, 0.2);
    eye.scale.set(0.9, 1.25, 0.5);

    // Cute specular highlight reflection dot
    const catchlight = createSphere(headGroup, '#ffffff', 0.02, side * 0.135 - 0.015, 0.045, 0.332, 0.1);
    catchlight.scale.set(1, 1, 0.5);

    // Eyebrow
    const brow = createBox(headGroup, hairColor, 0.08, 0.025, 0.02, side * 0.125, 0.11, 0.315);
    eyebrows.push(brow);
  }

  // Cute tiny nose & smiling mouth
  createSphere(headGroup, '#df987d', 0.02, 0, -0.04, 0.34, 0.4);
  const mouth = createSphere(headGroup, '#994444', 0.035, 0, -0.11, 0.315, 0.4);
  mouth.scale.set(1, 0.5, 0.3);

  // Hair styling
  if (isFemale) {
    if (index % 2 === 0) {
      // Twin high buns / puffs with colorful hair ties
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.06, -0.04, 0.6);
      hairBase.scale.set(1.12, 1.05, 1.05);
      // Front bangs
      const bangs = createSphere(headGroup, hairColor, 0.22, 0, 0.17, 0.24, 0.6);
      bangs.scale.set(1.3, 0.45, 0.6);
      for (const side of [-1, 1]) {
        // Bun
        createSphere(headGroup, hairColor, 0.14, side * 0.32, 0.25, -0.05, 0.6);
        // Ribbon / Hair tie
        createTorus(headGroup, PALETTE[(index + 1) % PALETTE.length], 0.09, 0.025, side * 0.3, 0.24, -0.05);
      }
    } else {
      // Sleek bob with bangs & flower hairpin
      const hairBase = createSphere(headGroup, hairColor, 0.37, 0, 0.04, -0.06, 0.6);
      hairBase.scale.set(1.15, 1.1, 1.12);
      createSphere(headGroup, hairColor, 0.24, 0, 0.16, 0.24, 0.6); // bangs
      // Cute hairpin
      const pin = createSphere(headGroup, '#ffd166', 0.05, 0.28, 0.16, 0.25, 0.3);
      createSphere(pin, '#ef476f', 0.025, 0, 0, 0.035);
    }
  } else {
    if (index % 2 === 0) {
      // Anime spiky hairstyle
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.06, -0.04, 0.6);
      hairBase.scale.set(1.12, 1.05, 1.05);
      // Spikes
      for (let s = 0; s < 5; s++) {
        const a = (s - 2) * 0.28;
        const spike = createCone(headGroup, hairColor, 0.08, 0.18, Math.sin(a) * 0.24, 0.36, Math.cos(a) * 0.12);
        spike.rotation.z = -a * 0.7;
        spike.rotation.x = 0.2;
      }
    } else {
      // Clean side-part + stylish DJ headphones around neck
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.05, -0.04, 0.6);
      hairBase.scale.set(1.1, 1.04, 1.05);
      // Headphone band around neck
      const band = createTorus(body, '#333647', 0.28, 0.035, 0, 0.86, 0.02);
      band.rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        createCylinder(body, '#ef476f', 0.09, 0.09, 0.08, 16, side * 0.26, 0.88, 0.02);
      }
    }
  }

  // Limbs
  const limbs: T.Group[] = [];

  // Arms
  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const armPivot = new T.Group();
    armPivot.position.set(side * 0.28, 0.78, 0);
    body.add(armPivot);
    arms.push(armPivot);
    limbs.push(armPivot);

    // Sleeve
    createCylinder(armPivot, uniformColor, 0.075, 0.075, 0.24, 12, 0, -0.12, 0);
    // Hand
    createSphere(armPivot, skin, 0.065, 0, -0.26, 0);
  }

  // Legs & Sneakers
  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const legPivot = new T.Group();
    legPivot.position.set(side * 0.13, 0.42, 0);
    body.add(legPivot);
    legs.push(legPivot);
    limbs.push(legPivot);

    // Pants / Skirt legs
    createCylinder(legPivot, '#3a3f58', 0.075, 0.07, 0.26, 12, 0, -0.13, 0);
    // Sneaker: white rubber sole + colored shoe body
    const shoe = createBox(legPivot, uniformColor, 0.13, 0.1, 0.22, 0, -0.32, 0.05);
    createBox(shoe, '#ffffff', 0.14, 0.04, 0.23, 0, -0.035, 0); // sole
    createSphere(shoe, '#ffffff', 0.06, 0, -0.01, 0.09); // white toe cap
  }

  return { root, body, headGroup, eyebrows, mouth, arms, legs, limbs };
}

function createCone(parent: T.Object3D, color: string | number, r: number, h: number, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(new T.ConeGeometry(r, h, 12), new T.MeshStandardMaterial({ color, roughness: 0.5 }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// 1. High-Craft UFO Mascot
function buildUFO() {
  const root = new T.Group();

  // Lower thruster dish
  const lowerDish = createSphere(root, '#6c5ce7', 1.25, 0, 0, 0, 0.3, 0.4);
  lowerDish.scale.set(1.3, 0.24, 1.3);

  // Middle metallic hull rim
  const rim = createTorus(root, '#a29bfe', 1.45, 0.18, 0, 0.08, 0, 0.2);
  rim.rotation.x = Math.PI / 2;

  // Orbiting lights along rim
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const lightBall = createSphere(
      root,
      i % 2 ? '#55efc4' : '#ffeaa7',
      0.085,
      Math.cos(angle) * 1.45,
      0.09,
      Math.sin(angle) * 1.45,
      0.2,
      0.8
    );
    const m = lightBall.material as T.MeshStandardMaterial;
    m.emissive = new T.Color(i % 2 ? '#00b894' : '#fdcb6e');
    m.emissiveIntensity = 0.9;
  }

  // Upper cockpit rim & glass bubble dome
  const domeMat = new T.MeshPhysicalMaterial({
    color: '#81ecec',
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    transmission: 0.8,
    thickness: 0.5,
  });
  const dome = new T.Mesh(new T.SphereGeometry(0.72, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
  dome.position.set(0, 0.18, 0);
  dome.scale.set(1, 0.85, 1);
  root.add(dome);

  // Inside dome: Cute tiny green alien pilot!
  const alien = new T.Group();
  alien.position.set(0, 0.3, 0);
  root.add(alien);
  // Head & Eyes
  createSphere(alien, '#2ecc71', 0.22, 0, 0.15, 0, 0.4);
  for (const s of [-1, 1]) {
    createSphere(alien, '#1e272e', 0.065, s * 0.09, 0.18, 0.16, 0.2);
    createSphere(alien, '#ffffff', 0.02, s * 0.1 - 0.01, 0.2, 0.2, 0.1); // catchlight
    // Antenna
    const ant = createCylinder(alien, '#27ae60', 0.015, 0.015, 0.15, 8, s * 0.1, 0.36, 0);
    ant.rotation.z = -s * 0.35;
    createSphere(alien, '#f1c40f', 0.035, s * 0.15, 0.44, 0);
  }

  // Underbelly reactor beam nozzle
  const nozzle = createCylinder(root, '#00cec9', 0.45, 0.55, 0.18, 24, 0, -0.15, 0, 0.3);
  const nozzleMat = nozzle.material as T.MeshStandardMaterial;
  nozzleMat.emissive = new T.Color('#00cec9');
  nozzleMat.emissiveIntensity = 0.8;

  return root;
}

// 2. High-Craft Hoàng Thượng (Cat) Mascot
function buildCat() {
  const root = new T.Group();

  // Luxurious royal velvet cushion
  const cushion = createCylinder(root, '#b83b5e', 1.4, 1.5, 0.32, 32, 0, 0.16, 0, 0.7);
  createTorus(cushion, '#f08a5d', 1.48, 0.065, 0, 0.08, 0);

  // Cat Body (chubby, soft ginger cat)
  const catBody = new T.Group();
  catBody.position.set(0, 0.4, 0);
  root.add(catBody);

  const furColor = '#f39c12';
  const whiteBelly = '#fff5e4';

  const bodySphere = createSphere(catBody, furColor, 0.82, 0, 0.55, 0, 0.7);
  bodySphere.scale.set(1.05, 0.95, 0.92);

  // White fluffy chest patch
  const chest = createSphere(catBody, whiteBelly, 0.52, 0, 0.55, 0.48, 0.8);
  chest.scale.set(0.85, 1, 0.4);

  // Head
  const head = new T.Group();
  head.position.set(0, 1.35, 0.2);
  catBody.add(head);

  const headSphere = createSphere(head, furColor, 0.62, 0, 0, 0, 0.7);
  headSphere.scale.set(1.12, 0.92, 0.95);

  // White cheeks & muzzle
  const muzzle = createSphere(head, whiteBelly, 0.28, 0, -0.12, 0.45, 0.8);
  muzzle.scale.set(1.3, 0.75, 0.6);

  // Tiny pink heart nose
  createSphere(head, '#e84393', 0.06, 0, -0.06, 0.65, 0.4);

  // Big cute feline eyes (amber/green with slit pupil)
  for (const s of [-1, 1]) {
    const eye = createSphere(head, '#2ed573', 0.11, s * 0.24, 0.08, 0.54, 0.2);
    eye.scale.set(0.9, 1.1, 0.4);
    // Slit pupil
    const pupil = createBox(head, '#2f3542', 0.03, 0.16, 0.05, s * 0.24, 0.08, 0.59);
    pupil.scale.set(1, 1, 0.5);
    // Catchlight
    createSphere(head, '#ffffff', 0.035, s * 0.26 - 0.02, 0.12, 0.61, 0.1);
  }

  // Pointy ears with soft pink interior
  for (const s of [-1, 1]) {
    const ear = createCone(head, furColor, 0.28, 0.48, s * 0.44, 0.52, -0.05);
    ear.rotation.z = -s * 0.32;
    ear.rotation.x = -0.15;
    const innerEar = createCone(ear, '#ff9999', 0.18, 0.38, 0, -0.02, 0.06);
    innerEar.scale.set(0.85, 0.85, 0.5);
  }

  // Golden Royal Crown with jewels
  const crown = createCylinder(head, '#ffd700', 0.22, 0.28, 0.24, 6, 0, 0.64, 0.05, 0.3);
  const crownMat = crown.material as T.MeshStandardMaterial;
  crownMat.metalness = 0.8;
  crownMat.roughness = 0.25;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    createSphere(crown, i % 2 ? '#e84118' : '#00a8ff', 0.045, Math.cos(a) * 0.22, 0.14, Math.sin(a) * 0.22);
  }

  // Big Royal Front Paw with pink toe beans (userData.paw for capture animation)
  const paw = new T.Group();
  paw.position.set(-0.62, 0.85, 0.55);
  catBody.add(paw);

  const armMesh = createCylinder(paw, furColor, 0.2, 0.24, 0.65, 16, 0, -0.3, 0);
  armMesh.rotation.z = 0.2;
  const pawMitt = createSphere(paw, whiteBelly, 0.26, 0.05, -0.65, 0.12, 0.7);
  pawMitt.scale.set(1.15, 0.85, 1.25);
  // Pink toe bean pads!
  createSphere(pawMitt, '#ff7675', 0.1, 0, -0.15, 0.08); // main pad
  for (let b = 0; b < 3; b++) {
    const ba = (b - 1) * 0.15;
    createSphere(pawMitt, '#ff7675', 0.05, ba, -0.14, 0.22);
  }
  root.userData.paw = paw;

  // Swishing long tail
  const tail = new T.Group();
  tail.position.set(0.68, 0.3, -0.5);
  catBody.add(tail);
  createTorus(tail, furColor, 0.45, 0.12, 0, 0.25, 0);
  createSphere(tail, whiteBelly, 0.15, 0.45, 0.35, 0); // white tail tip
  root.userData.tail = tail;

  return root;
}

// 3. High-Craft Cơn Lốc Deadline Mascot
function buildStorm() {
  const root = new T.Group();

  // Swirling tornado vortex rings
  const rings: T.Mesh[] = [];
  const ringCount = 11;
  for (let i = 0; i < ringCount; i++) {
    const fraction = i / ringCount;
    const r = 0.25 + fraction * 1.35;
    const y = 0.15 + fraction * 2.8;
    const swirl = createTorus(root, i % 2 ? '#74b9ff' : '#a29bfe', r, 0.11 + fraction * 0.05, 0, y, 0, 0.4);
    swirl.rotation.x = Math.PI / 2;
    (swirl.material as T.MeshStandardMaterial).transparent = true;
    (swirl.material as T.MeshStandardMaterial).opacity = 0.68 + (1 - fraction) * 0.3;
    rings.push(swirl);
    root.userData[`ring${i}`] = swirl;
  }

  // Floating deadline artifacts spinning in vortex:
  // 1. Exam/Test papers with red "A+" or "10"
  for (let p = 0; p < 8; p++) {
    const paper = createBox(root, '#ffffff', 0.28, 0.38, 0.02, 0, 0, 0, 0.8);
    // Red mark on paper
    createBox(paper, '#e84118', 0.08, 0.04, 0.03, 0.06, 0.1, 0.015);
    root.userData[`paper${p}`] = paper;
  }

  // 2. Flying red alarm clocks with bells
  for (let c = 0; c < 3; c++) {
    const clock = new T.Group();
    root.add(clock);
    createCylinder(clock, '#d63031', 0.18, 0.18, 0.08, 20, 0, 0, 0, 0.3);
    createCylinder(clock, '#ffffff', 0.15, 0.15, 0.09, 20, 0, 0, 0, 0.3); // face
    for (const s of [-1, 1]) {
      createSphere(clock, '#f1c40f', 0.07, s * 0.14, 0.16, 0); // bells
    }
    root.userData[`clock${c}`] = clock;
  }

  // 3. Cute paper airplanes
  for (let a = 0; a < 3; a++) {
    const plane = createCone(root, '#ffeaa7', 0.14, 0.4, 0, 0, 0);
    plane.rotation.x = Math.PI / 2;
    root.userData[`plane${a}`] = plane;
  }

  return root;
}

export function Stage3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const [failed, setFailed] = useState(false);
  latest.current = props;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, el.clientWidth / (el.clientHeight || 1), 0.1, 100);
    camera.position.set(0, 7.8, 14.2);
    camera.lookAt(0, 1.2, 0);

    const isUFO = props.concept === 'ufo';
    const isCat = props.concept === 'cat';

    // Cinematic Atmosphere & Fog
    scene.fog = new T.FogExp2(isUFO ? '#161933' : isCat ? '#f9ede3' : '#dff0ec', isUFO ? 0.024 : 0.02);

    // Dynamic Lighting
    const hemiLight = new T.HemisphereLight(
      isUFO ? '#c3caff' : isCat ? '#fff8e7' : '#e0f7f6',
      isUFO ? '#30264e' : isCat ? '#c89e7e' : '#8fa9a3',
      isUFO ? 2.4 : 2.2
    );
    scene.add(hemiLight);

    const sun = new T.DirectionalLight(isUFO ? '#e0e7ff' : '#fff5eb', 3.4);
    sun.position.set(-5, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    // Warm / Accent Rim Light
    const rimLight = new T.PointLight(isUFO ? '#a29bfe' : isCat ? '#ff7675' : '#74b9ff', 16, 22);
    rimLight.position.set(5, 5, -4);
    scene.add(rimLight);

    // Multi-Layered Floating Island Diorama
    const islandGroup = new T.Group();
    islandGroup.position.set(0, -0.4, 0);
    scene.add(islandGroup);

    // Upper platform
    const topMat = new T.MeshStandardMaterial({
      color: isUFO ? '#48436c' : isCat ? '#eacbb0' : '#a2cfc4',
      roughness: 0.8,
    });
    const island = new T.Mesh(new T.CylinderGeometry(6.4, 6.1, 0.65, 64), topMat);
    island.receiveShadow = true;
    island.castShadow = true;
    islandGroup.add(island);

    // Stylized glowing platform rim
    const rimMesh = createTorus(islandGroup, isUFO ? '#8274b5' : isCat ? '#ffecd9' : '#d2f3ec', 6.35, 0.08, 0, 0.32, 0);
    rimMesh.rotation.x = Math.PI / 2;

    // Sub-island rock base taper
    const subRock = createCylinder(islandGroup, isUFO ? '#2a2744' : isCat ? '#be987b' : '#699e94', 5.9, 2.2, 1.8, 32, 0, -1.15, 0, 0.9);
    subRock.receiveShadow = true;

    // Thematic Scenery Around Island
    if (isUFO) {
      // Cosmic Starfield
      const starGeo = new T.BufferGeometry();
      const starPos: number[] = [];
      for (let i = 0; i < 220; i++) {
        starPos.push(
          Math.sin(i * 47.1) * 25,
          2 + ((i * 19) % 120) / 8,
          -6 - Math.abs(Math.cos(i * 13)) * 20
        );
      }
      starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
      scene.add(new T.Points(starGeo, new T.PointsMaterial({ color: '#f5e6ff', size: 0.075 })));

      // Distant Planet with Saturn Ring
      const planet = createSphere(scene, '#9b59b6', -6, 5.5, -8, 1.1, 0.4);
      const pRing = createTorus(planet, '#e8d5f5', 1.9, 0.12, 0, 0, 0);
      pRing.rotation.x = 1.2;

      // Floating space crystal shards around island
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const crystal = createCone(scene, '#00cec9', 0.22, 0.8, Math.sin(a) * 7.5, 0.2, Math.cos(a) * 6);
        (crystal.material as T.MeshStandardMaterial).emissive = new T.Color('#00cec9');
        (crystal.material as T.MeshStandardMaterial).emissiveIntensity = 0.5;
      }
    } else if (isCat) {
      // Floating yarn balls & cozy cat scratch trees
      for (let i = 0; i < 3; i++) {
        const yarn = createSphere(scene, PALETTE[i * 2], 0.35, -4.5 + i * 4.2, 0.25, 2.4, 0.8);
        createTorus(yarn, '#ffffff', 0.36, 0.02, 0, 0, 0);
      }
      // Cat Tree in background
      const tree = new T.Group();
      tree.position.set(-4.6, 0, -3.2);
      createCylinder(tree, '#d4a373', 0.2, 0.2, 2.2, 16, 0, 1.1, 0, 0.8);
      createCylinder(tree, '#faedcd', 0.8, 0.8, 0.15, 24, 0, 2.2, 0);
      scene.add(tree);
    } else {
      // Storm: Low-poly school clocktower & floating stationery
      const school = new T.Group();
      school.position.set(-4.5, 0, -3.8);
      createBox(school, '#f7f1e3', 2.8, 2.2, 1.2, 0, 1.1, 0, 0.7);
      const roof = new T.Mesh(new T.ConeGeometry(2.1, 1.1, 4), new T.MeshStandardMaterial({ color: '#34495e' }));
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 2.7, 0);
      school.add(roof);
      // Clock on tower
      createCylinder(school, '#ffffff', 0.35, 0.35, 0.08, 24, 0, 1.6, 0.62);
      scene.add(school);
    }

    // Mascots
    const mascot = isUFO ? buildUFO() : isCat ? buildCat() : buildStorm();
    mascot.position.set(0, 3.8, -2.1);
    if (isCat) {
      mascot.scale.setScalar(1.22);
      mascot.position.set(0, 0, -2.6);
    }
    if (!isUFO && !isCat) {
      mascot.scale.setScalar(1.15);
      mascot.position.set(0, 0.2, -2.4);
    }
    scene.add(mascot);

    // Glowing Animated Tractor Beam for UFO
    const beamMat = new T.MeshBasicMaterial({
      color: '#55efc4',
      transparent: true,
      opacity: 0.18,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const beam = new T.Mesh(new T.ConeGeometry(1.65, 4.4, 48, 1, true), beamMat);
    beam.position.set(0, 1.9, -2.1);
    beam.visible = isUFO;
    scene.add(beam);

    const beamLight = new T.PointLight('#55efc4', 12, 8);
    beamLight.position.set(0, 2.2, -2.1);
    beamLight.visible = isUFO;
    scene.add(beamLight);

    // Visible Chibi Characters
    const visible = props.students.slice(0, 24);
    const extras = props.students.filter(
      (s) => props.selected.includes(s.id) && !visible.some((v) => v.id === s.id)
    );
    let slot = visible.length - 1;
    for (const extra of extras) {
      while (slot >= 0 && props.selected.includes(visible[slot].id)) slot--;
      if (slot < 0) break;
      visible[slot--] = extra;
    }

    const actors = visible.map((student, i) => {
      const studentIndex = props.students.findIndex((s) => s.id === student.id);
      const actor = buildChibiCharacter(studentIndex, student.avatar);
      const cols = Math.min(8, props.students.length);
      const row = Math.floor(i / 8);
      const col = i % 8;
      const home = new T.Vector3((col - (cols - 1) / 2) * 1.15, 0, 0.4 + row * 1.55);
      actor.root.position.copy(home);
      scene.add(actor.root);

      // HTML Name Label Badge
      const label = document.createElement('span');
      label.className = 'actor-label';
      label.textContent = student.name.split(' ').slice(-2).join(' ');
      label.title = student.name;
      el.appendChild(label);

      return { ...actor, home, student, label };
    });

    // Grouping Docks
    const docks = props.groups.slice(0, 24).map((g, i) => {
      const angle = (i / Math.min(props.groups.length, 24)) * Math.PI * 2;
      const point = new T.Vector3(Math.sin(angle) * 4.4, 0, Math.cos(angle) * 3.5);
      const dock = createTorus(scene, PALETTE[i % PALETTE.length], 0.58, 0.08, point.x, 0.03, point.z);
      dock.rotation.x = Math.PI / 2;
      return { g, point };
    });

    // Resize Observer
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.z = w / h < 1.3 ? 18.2 : 14.2;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let started = performance.now();
    let wasRunning = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const projected = new T.Vector3();
    let lastLabelUpdate = 0;

    // Render Animation Loop (60 FPS)
    renderer.setAnimationLoop((now) => {
      if (document.hidden) return;
      const state = latest.current;
      if (state.running && !wasRunning) started = now;
      wasRunning = state.running;

      const elapsed = (now - started) / 1000;
      const t = reduce.matches ? 0 : now / 1000;
      const phase = chasePhase(elapsed);
      const revealing = state.running && phase.reveal && !reduce.matches;

      // Identify target student for dramatic camera & mascot lock
      const targetActor = actors.find((a) => state.selected.includes(a.student.id));
      const targetIndex = targetActor ? props.students.findIndex((s) => s.id === targetActor.student.id) : 0;
      const target = runnerPosition(targetIndex, REVEAL_SECONDS);

      // Camera Choreography:
      // 1. Idle: Gentle floating diorama sway
      // 2. Chase (0-8s): Pull back slightly and track action
      // 3. Reveal (8-10s): Cinematic zoom towards the captured student!
      if (!reduce.matches) {
        if (revealing) {
          const camTargetX = target.x * 0.45;
          const camTargetZ = target.z + 5.8;
          camera.position.x = T.MathUtils.lerp(camera.position.x, camTargetX, 0.06);
          camera.position.y = T.MathUtils.lerp(camera.position.y, 4.6, 0.06);
          camera.position.z = T.MathUtils.lerp(camera.position.z, camTargetZ, 0.06);
          camera.lookAt(target.x * 0.8, 1.8 + phase.lift * 1.5, target.z);
        } else if (state.running) {
          camera.position.x = Math.sin(t * 0.4) * 0.9;
          camera.position.y = T.MathUtils.lerp(camera.position.y, 8.4, 0.04);
          camera.position.z = T.MathUtils.lerp(camera.position.z, 15.6, 0.04);
          camera.lookAt(0, 1.2, 0);
        } else {
          // Living diorama gentle orbit
          const camX = Math.sin(t * 0.25) * 1.2;
          const camZ = 14.2 + Math.cos(t * 0.25) * 0.6;
          camera.position.x = T.MathUtils.lerp(camera.position.x, camX, 0.05);
          camera.position.y = T.MathUtils.lerp(camera.position.y, 7.8, 0.05);
          camera.position.z = T.MathUtils.lerp(camera.position.z, camZ, 0.05);
          camera.lookAt(0, 1.1, 0);
        }
      }

      // Mascot Movement & Animations
      const patrol = new T.Vector3(
        Math.sin(elapsed * 1.15) * 3.6,
        isUFO ? 4.1 : isCat ? 0 : 0.25,
        -2.4 + Math.cos(elapsed * 0.95) * 1.3
      );
      const destination = new T.Vector3(
        target.x + (isCat ? 0.88 : 0),
        isUFO ? 4.2 : isCat ? 0 : 0.25,
        target.z + (isCat ? -0.3 : 0)
      );

      if (state.running && !reduce.matches) {
        mascot.position.copy(patrol);
        if (revealing) {
          const arrival = new T.Vector3(
            Math.sin(REVEAL_SECONDS * 1.15) * 3.6,
            patrol.y,
            -2.4 + Math.cos(REVEAL_SECONDS * 0.95) * 1.3
          );
          mascot.position.copy(arrival).lerp(destination, phase.approach);
          mascot.position.y += phase.lift * (isUFO ? 1.6 : isCat ? 1.2 : 1.9);
        }
      } else {
        mascot.position.set(Math.sin(t * 0.6) * 0.45, isUFO ? 3.8 : isCat ? 0 : 0.3, -2.6);
      }

      // Mascot-Specific Flourishes
      if (isUFO) {
        mascot.rotation.z = Math.sin(t * 1.8) * 0.08;
        mascot.rotation.y = t * 1.2; // spin rim lights
        beam.visible = revealing && phase.approach > 0.75;
        beamLight.visible = beam.visible;
        beam.position.set(target.x, mascot.position.y - 2.1, target.z);
        beamLight.position.set(target.x, 2.2, target.z);
        beamMat.opacity = 0.22 + Math.sin(t * 12) * 0.08;
      } else if (isCat) {
        mascot.rotation.y = revealing ? 0 : Math.sin(t * 0.8) * 0.25;
        const paw = mascot.userData.paw as T.Group;
        if (paw) {
          paw.rotation.z = revealing ? -phase.lift * 0.75 : Math.sin(t * 3) * 0.12;
          paw.rotation.x = revealing ? phase.lift * 0.3 : 0;
        }
        const tail = mascot.userData.tail as T.Group;
        if (tail) tail.rotation.z = Math.sin(t * 2.5) * 0.25;
      } else {
        mascot.rotation.y = t * 3.2;
        // Animate flying deadline paper sheets in the storm
        for (let p = 0; p < 8; p++) {
          const paper = mascot.userData[`paper${p}`] as T.Mesh;
          if (paper) {
            const pa = t * 3 + p * 0.8;
            const pr = 0.7 + Math.sin(p) * 0.45;
            paper.position.set(Math.cos(pa) * pr, 0.4 + p * 0.32, Math.sin(pa) * pr);
            paper.rotation.set(pa * 1.4, pa, p);
          }
        }
        // Clocks & planes
        for (let c = 0; c < 3; c++) {
          const clk = mascot.userData[`clock${c}`] as T.Group;
          if (clk) {
            const ca = t * 2.2 + c * 2.1;
            clk.position.set(Math.sin(ca) * 1.35, 1.1 + c * 0.5, Math.cos(ca) * 1.35);
            clk.rotation.y = t * 4;
          }
        }
      }

      // Actors (Students) Animation & Movement
      actors.forEach((actor, i) => {
        const studentIndex = props.students.findIndex((s) => s.id === actor.student.id);
        const chosen = state.selected.includes(actor.student.id);

        actor.root.position.copy(actor.home);
        actor.root.rotation.set(0, Math.sin(t * 0.7 + i) * 0.15, 0);
        actor.root.scale.setScalar(1);

        // Eyebrows reaction: tilt up in panic when running!
        actor.eyebrows.forEach((brow, bi) => {
          brow.rotation.z = state.running ? (bi === 0 ? 0.35 : -0.35) : 0;
        });

        if (state.running && !reduce.matches) {
          const path = runnerPosition(studentIndex, chosen && revealing ? REVEAL_SECONDS : elapsed);
          actor.root.position.set(path.x, 0, path.z);
          const ahead = runnerPosition(
            studentIndex,
            Math.min(elapsed, chosen && revealing ? REVEAL_SECONDS : Infinity) + 0.04
          );
          actor.root.rotation.y = Math.atan2(ahead.x - path.x, ahead.z - path.z);
        }

        if (state.groups.length) {
          const dock = docks.find((d) => d.g.members.some((s) => s.id === actor.student.id));
          if (dock) {
            const memberIndex = dock.g.members.findIndex((s) => s.id === actor.student.id);
            const angle = memberIndex * 2.4;
            const point = new T.Vector3(
              dock.point.x + Math.sin(angle) * 0.48,
              0,
              dock.point.z + Math.cos(angle) * 0.48
            );
            if (!state.running) actor.root.position.copy(point);
            else if (revealing) {
              const path = runnerPosition(studentIndex, REVEAL_SECONDS);
              actor.root.position.set(path.x, 0, path.z).lerp(point, phase.lift);
              actor.root.position.y = Math.sin(phase.lift * Math.PI) * 0.7;
            }
          }
        } else if (revealing && chosen) {
          // Dramatic lift-off capture sequence
          const caught = runnerPosition(studentIndex, REVEAL_SECONDS);
          const offset = state.selected.indexOf(actor.student.id) * 0.35;
          const targetLift = new T.Vector3(
            target.x + offset,
            isUFO ? 4.8 : isCat ? 2.8 : 4.2,
            target.z + 0.25
          );
          actor.root.position.set(caught.x, 0, caught.z).lerp(targetLift, phase.lift);

          // Zero-g floating limb flailing
          actor.arms.forEach((arm, ai) => {
            arm.rotation.x = -Math.PI * 0.75 + Math.sin(t * 12 + ai) * 0.35;
          });
          actor.legs.forEach((leg, li) => {
            leg.rotation.x = Math.sin(t * 10 + li * Math.PI) * 0.4;
          });

          if (!isUFO && !isCat) {
            // Storm spin
            actor.root.position.x += Math.sin(phase.lift * 16) * phase.lift * 0.45;
            actor.root.rotation.y = phase.lift * 15;
            actor.root.rotation.z = Math.sin(phase.lift * 10) * 0.4;
          }
          if (isUFO) {
            actor.root.scale.setScalar(1 - phase.lift * 0.65);
          }
        }

        // Cartoon Run & Idle Physics
        if (!reduce.matches) {
          const active = state.running;
          // Bobbing & squash
          actor.root.position.y += Math.abs(Math.sin(t * (active ? 18 : 2.5) + i)) * (active ? 0.15 : 0.03);
          actor.root.rotation.z += active ? Math.sin(t * 14 + i) * 0.09 : 0;

          // Limbs run cycle
          if (!(revealing && chosen)) {
            actor.limbs.forEach((limb, k) => {
              limb.rotation.x = Math.sin(t * (active ? 22 : 2.5) + i + k * Math.PI) * (active ? 0.88 : 0.08);
            });
          }
        }

        // Project 3D coordinate to 2D HTML Label
        if (now - lastLabelUpdate > 35) {
          projected.copy(actor.root.position).add(new T.Vector3(0, 1.7, 0)).project(camera);
          const screenX = (projected.x * 0.5 + 0.5) * el.clientWidth;
          const screenY = (-projected.y * 0.5 + 0.5) * el.clientHeight;
          actor.label.style.transform = `translate(-50%, -50%) translate(${screenX}px, ${screenY}px)`;
          actor.label.style.opacity = projected.z < 1 ? '1' : '0';
          actor.label.classList.toggle('picked', chosen && revealing);
        }
      });

      if (now - lastLabelUpdate > 35) lastLabelUpdate = now;
      renderer.render(scene, camera);
    });

    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('webglcontextlost', lost);

      const geometries = new Set<T.BufferGeometry>();
      const materials = new Set<T.Material>();
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Points) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      actors.forEach((a) => a.label.remove());
      renderer.domElement.remove();
    };
  }, [
    props.concept,
    props.students.map((s) => s.id + ':' + s.name + ':' + s.avatar).join('|'),
    props.groups.map((g) => g.id).join('|'),
    props.selected.join('|'),
  ]);

  if (failed)
    return (
      <>
        <Stage {...props} />
        <p className="webgl-note">Thiết bị không hỗ trợ 3D. Đang dùng sân chơi 2D.</p>
      </>
    );

  return (
    <div className={`stage stage-3d world-${props.concept}`}>
      <div className="three-host" ref={host} />
      <div className="scene-caption">
        <span className="live-dot" />
        {props.running ? 'CUỘC PHIÊU LƯU BẮT ĐẦU' : 'VŨ TRỤ 3D · SẴN SÀNG KHÁM PHÁ'}
      </div>
      <div className="world-tag">
        {props.concept === 'ufo'
          ? 'TRẠM KHÔNG GIAN 07'
          : props.concept === 'cat'
            ? 'VƯƠNG QUỐC HOÀNG THƯỢNG'
            : 'HỌC VIỆN DEADLINE'}
        <span>✦</span>
      </div>
      <div className="stage-note">
        {props.students.length > 24
          ? `24 nhân vật đại diện · ${props.students.length} sinh viên tham gia`
          : 'Một lớp học nhỏ. Một cuộc phiêu lưu lớn.'}
        <span>✦</span>
      </div>
      {!props.students.length && (
        <div className="stage-empty">Thêm danh sách để sân chơi sống động nhé!</div>
      )}
    </div>
  );
}
